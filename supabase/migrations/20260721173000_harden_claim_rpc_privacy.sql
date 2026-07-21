-- Ledger #106 remediation: close the private-name enumeration oracle and the
-- cross-group partial-match claim path in the saved-player claim RPCs.
--
-- SCOPE: the bodies of exactly three existing functions. No object is created,
-- dropped or renamed, and no grant is touched. `authenticated` keeps EXECUTE on
-- all three. That grant is deliberate (production ledger
-- `20260720221937 grant_authenticated_claim_rpc_execute`) and the live claim
-- flow -- /claim-player, the auth-completion auto-claim in completeAuthSession,
-- and the roster "probably you" highlight -- depends on it. The defect is what
-- the bodies disclose and what they accept, not who may call them.
--
-- The three deployed bodies this replaces were read read-only from production
-- `pg_get_functiondef` on 2026-07-21 and are preserved verbatim in
-- `supabase/tests/claim-rpc-privacy/production-preimage-claim-rpcs.sql`, so the
-- executable test exercises a genuine CREATE OR REPLACE of the deployed
-- predecessors rather than a fresh CREATE.
--
-- What was wrong (verified against those deployed definitions):
--
--   1. `list_claimable_player_profiles` matched partial names with a
--      bidirectional prefix `like`:
--        normalized_player_full_name like normalized_full_name || '%'
--        or normalized_full_name like normalized_player_full_name || '%'
--      (and the same pair against the player's normalized display name). The
--      caller controls both sides -- `user_profiles.full_name` is theirs to
--      edit -- so a one-character full name returned every unlinked player in
--      the database whose name starts with that character, across every group,
--      with no cardinality bound. Walking the input space enumerated the
--      unclaimed-player set.
--
--   2. Its returned label fell back to `split_part(btrim(p.display_name), ' ', 1)`
--      -- the guest's private first name -- whenever the player row had no
--      username. `GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` names first name, last
--      name and full name as private personal-name data and forbids any of them
--      as a public fallback; a neutral placeholder is required instead.
--
--   3. `claim_player_profile` revalidated by asking whether the target appeared
--      in `list_claimable_player_profiles()` -- which included the partial rows.
--      Any prefix match was therefore directly claimable, in any group. The
--      check also ran before the target row was locked, so two concurrent
--      claims could both pass it.
--
-- What this establishes:
--
--   * Exact whole normalized name/username matching only. No `like`, no
--     substring, no prefix in any matching predicate.
--   * A minimum normalized-input length (3), so a one- or two-character profile
--     value matches nothing rather than matching whoever is named that.
--   * A bounded result set (10), so the RPC cannot be read as a directory.
--   * A public label that is a username or the neutral 'Unclaimed player'
--     placeholder -- never a personal name or any part of one.
--   * No group label in the candidate list. The caller is not a member of that
--     group yet, group names in this deployment can carry private-name
--     concatenations, and the live reader already drops the value (see
--     player-claim-repo.ts). Null keeps the row shape without inventing a label.
--   * `claim_player_profile` revalidates eligibility itself, from the row it has
--     locked, with no dependency on the candidate-list function.
--   * `claim_player_profiles_by_name` keeps its exact matching and gains the
--     same length floor, the same cardinality bound, and row locks taken before
--     any link is written.
--
-- The two thresholds are written as literals rather than shared helpers so this
-- migration adds no new database object and no new grant.
--
-- Deliberately NOT changed (would require a client change and separate
-- authorization): `claim_player_profiles_by_name` still links matching profiles
-- without a per-profile confirmation. The privacy contract's "a textual match
-- must not automatically claim a player" therefore remains only partly
-- satisfied; this bounds that path instead of removing it. Recorded as residual
-- work in the handoff.

create or replace function public.list_claimable_player_profiles()
returns table (
  player_id uuid,
  player_name text,
  group_id uuid,
  group_name text,
  match_reason text,
  exact_match boolean
)
language sql
security definer
set search_path to 'public'
as $function$
  with me as (
    select
      -- A normalized value shorter than 3 characters is discarded here, so it
      -- can never reach a comparison. The two arms stay independent: a usable
      -- username still matches when the full name is too short, and vice versa.
      case
        when length(normalize_claim_player_name(up.full_name)) >= 3
        then normalize_claim_player_name(up.full_name)
        else ''
      end as normalized_full_name,
      case
        when length(normalize_claim_player_name(up.username)) >= 3
        then normalize_claim_player_name(up.username)
        else ''
      end as normalized_username
    from public.user_profiles up
    where up.user_id = auth.uid()
      and auth.uid() is not null
  ), candidates as (
    select
      p.id,
      p.group_id,
      -- Public identity only. A registered or guest username is the approved
      -- public handle; everything else is the neutral placeholder. The personal
      -- name fallback that used to sit between them
      -- (split_part(display_name, ' ', 1)) is gone.
      coalesce(nullif(btrim(p.username), ''), 'Unclaimed player') as public_username
    from me
    join public.players p
      on p.linked_user_id is null
     and (
       (
         me.normalized_full_name <> ''
         and (
           normalize_claim_player_name(p.full_name) = me.normalized_full_name
           or normalize_claim_player_name(p.display_name) = me.normalized_full_name
         )
       )
       or (
         me.normalized_username <> ''
         and (
           normalize_claim_player_name(p.username) = me.normalized_username
           or normalize_claim_player_name(p.display_name) = me.normalized_username
         )
       )
     )
  )
  select
    candidates.id,
    candidates.public_username,
    candidates.group_id,
    -- Not a member of this group yet, so no group label is disclosed.
    null::text,
    -- Every surviving row is a whole-value match, so the reason column can only
    -- say so. It still carries no alias, name or score text.
    'exact'::text,
    true
  from candidates
  order by candidates.public_username, candidates.id
  limit 10;
$function$;

create or replace function public.claim_player_profile(p_player_id uuid)
returns table (group_id uuid, group_name text, player_name text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_player public.players%rowtype;
  v_username text;
  v_normalized_full_name text;
  v_normalized_username text;
  v_is_eligible boolean;
begin
  if v_user_id is null then
    raise exception 'Not signed in.';
  end if;

  -- Independent revalidation at submission time. This deliberately does not
  -- call list_claimable_player_profiles(): the claim gate must not inherit
  -- whatever that function currently chooses to surface, and it re-reads the
  -- caller's own profile now rather than trusting a page-load result.
  select
    up.username,
    case
      when length(normalize_claim_player_name(up.full_name)) >= 3
      then normalize_claim_player_name(up.full_name)
      else ''
    end,
    case
      when length(normalize_claim_player_name(up.username)) >= 3
      then normalize_claim_player_name(up.username)
      else ''
    end
  into v_username, v_normalized_full_name, v_normalized_username
  from public.user_profiles up
  where up.user_id = v_user_id;

  if not found then
    raise exception 'That saved player profile is not claimable for this account.';
  end if;

  -- Lock first, then judge. The deployed order (judge, then lock) let two
  -- concurrent claims both pass eligibility before either took the row.
  select * into v_player
  from public.players
  where id = p_player_id
  for update;

  if not found then
    raise exception 'That saved player profile no longer exists.';
  end if;

  v_is_eligible :=
    v_player.linked_user_id is null
    and (
      (
        v_normalized_full_name <> ''
        and (
          normalize_claim_player_name(v_player.full_name) = v_normalized_full_name
          or normalize_claim_player_name(v_player.display_name) = v_normalized_full_name
        )
      )
      or (
        v_normalized_username <> ''
        and (
          normalize_claim_player_name(v_player.username) = v_normalized_username
          or normalize_claim_player_name(v_player.display_name) = v_normalized_username
        )
      )
    );

  if not v_is_eligible then
    -- One message for every ineligible reason -- already linked, name does not
    -- match, input below the floor. Distinguishing them would rebuild the
    -- oracle one error string at a time.
    raise exception 'That saved player profile is not claimable for this account.';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_player.group_id, v_user_id, 'editor')
   on conflict on constraint group_members_group_id_user_id_key do nothing;

  -- The historical player id is preserved: this links the existing row, it
  -- never creates a replacement.
  update public.players
  set linked_user_id = v_user_id
  where id = v_player.id;

  update public.user_profiles
  set last_active_group_id = v_player.group_id, updated_at = now()
  where user_id = v_user_id;

  return query
  select g.id, g.name, v_username
  from public.groups g
  where g.id = v_player.group_id;
end;
$function$;

create or replace function public.claim_player_profiles_by_name()
returns table (group_id uuid, group_name text, player_name text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_normalized_full_name text;
  v_normalized_username text;
  v_username text;
  v_candidate_count integer;
begin
  if v_user_id is null then
    raise exception 'Not signed in.';
  end if;

  select
    case
      when length(normalize_claim_player_name(full_name)) >= 3
      then normalize_claim_player_name(full_name)
      else ''
    end,
    case
      when length(normalize_claim_player_name(username)) >= 3
      then normalize_claim_player_name(username)
      else ''
    end,
    username
  into v_normalized_full_name, v_normalized_username, v_username
  from public.user_profiles
  where user_id = v_user_id;

  if not found then
    return;
  end if;

  if v_normalized_full_name = '' and v_normalized_username = '' then
    return;
  end if;

  create temporary table _claimed_player_profiles (
    player_id uuid,
    group_id uuid
  ) on commit drop;

  -- Select and lock the matching rows before anything is written, so a
  -- concurrent claim of the same profile blocks here instead of racing the
  -- update below.
  insert into _claimed_player_profiles (player_id, group_id)
  select p.id, p.group_id
  from public.players p
  where p.linked_user_id is null
    and (
      (v_normalized_full_name <> '' and (
        normalize_claim_player_name(p.full_name) = v_normalized_full_name
        or normalize_claim_player_name(p.display_name) = v_normalized_full_name
      ))
      or (v_normalized_username <> '' and (
        normalize_claim_player_name(p.username) = v_normalized_username
        or normalize_claim_player_name(p.display_name) = v_normalized_username
      ))
    )
  order by p.id
  for update;

  select count(*) into v_candidate_count from _claimed_player_profiles;

  if v_candidate_count = 0 then
    return;
  end if;

  -- Above the cap this stops being one person's history and becomes a bulk link
  -- of unrelated people who share a common name. Claim nothing and return
  -- nothing; the caller (resolveSavedPlayerAutoClaim) already treats an empty
  -- result as "needs manual claim".
  if v_candidate_count > 10 then
    return;
  end if;

  update public.players p
  set linked_user_id = v_user_id
  from _claimed_player_profiles cp
  where p.id = cp.player_id
    and p.linked_user_id is null;

  insert into public.group_members (group_id, user_id, role)
  select cp.group_id, v_user_id, 'editor'
  from _claimed_player_profiles cp
  on conflict on constraint group_members_group_id_user_id_key do nothing;

  update public.user_profiles up
  set
    last_active_group_id = coalesce(
      up.last_active_group_id,
      (select cp.group_id from _claimed_player_profiles cp order by cp.group_id limit 1)
    ),
    updated_at = now()
  where up.user_id = v_user_id;

  return query
  select cp.group_id, g.name, v_username
  from _claimed_player_profiles cp
  join public.groups g on g.id = cp.group_id
  order by g.name;
end;
$function$;
