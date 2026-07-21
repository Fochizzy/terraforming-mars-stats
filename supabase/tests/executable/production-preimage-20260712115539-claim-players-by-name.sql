-- Modelled pre-image of production ledger entry 20260712115539
-- (`claim_players_by_name_and_username`), which created the SECURITY DEFINER
-- RPC public.claim_player_profiles_by_name() and has NO migration file on this
-- branch (see src/lib/db/migration-ledger-map.ts →
-- PRODUCTION_ONLY_LEDGER_VERSIONS).
--
-- WHY THIS FILE EXISTS
-- 20260720190000_grant_authenticated_claim_rpc_execute.sql revokes and grants
-- EXECUTE on three claim RPCs. Two of them are created by repo migrations; the
-- third, claim_player_profiles_by_name(), is not created by any repo migration
-- before that point, so without a predecessor the replay aborts with
--   ERROR: function public.claim_player_profiles_by_name() does not exist
-- This file installs the missing predecessor immediately before the grant, so
-- that:
--   * the grant migration replays as it did in production, against all three
--     functions rather than two;
--   * its `revoke ... from public` / `revoke ... from anon` actually remove
--     something, making the post-replay ACL a proof rather than an inherited
--     default; and
--   * 20260721173000_harden_claim_rpc_privacy is a true REPLACE of an existing
--     function, so a signature or return-shape mismatch fails loudly instead of
--     silently defining a new one.
--
-- WHAT IT IS, EXACTLY
-- The BODY is copied from repository-local evidence only: the
-- claim_player_profiles_by_name() definition in
-- supabase/migrations/20260721173000_harden_claim_rpc_privacy.sql. Its fidelity
-- to production was CONFIRMED by a read-only hash comparison on 2026-07-21 —
-- md5(prosrc) = b68036b3cec2ab8259889b48d64a7e67, length 2925, identical on
-- both sides — so this is the currently deployed body, not an approximation.
-- Signature, return shape, language, SECURITY DEFINER and search_path match the
-- deployed function.
--
-- The BODY IS DELIBERATELY THE CURRENT ONE, NOT THE JULY-12 ORIGINAL. What
-- ledger 20260712115539 actually created matched names with a bidirectional
-- prefix `like`, which ledger #106 (20260721201734) removed as an enumeration
-- oracle. That retired body is not reintroduced into this repository, not even
-- as a test fixture. The consequence is a stated limitation: the harness does
-- not exercise the #106 hardening as a behavioural before/after on THIS
-- function. It still exercises it as a genuine REPLACE, and the other two claim
-- RPCs are unaffected.
--
-- The ACL below models the state the grant migration was written against, which
-- that migration's own header records: EXECUTE granted to PUBLIC and to anon
-- alongside authenticated. Modelling the pre-grant ACL rather than the current
-- one is what makes the post-replay ACL assertion meaningful.
--
-- LIMITATION
-- Fidelity is asserted only for the surface the grant migration touches: the
-- signature, the return shape, and the ACL — plus the body, which is
-- hash-confirmed as stated above. This file is a TEST FIXTURE. It must never be
-- promoted into supabase/migrations/, must never be applied to production, and
-- must never be cited as evidence about production: the authoritative record of
-- what production holds is a read-only introspection, not this file.

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

comment on function public.claim_player_profiles_by_name() is
  'Modelled pre-image of production ledger entry 20260712115539 for the '
  'executable harness only. Body is the currently deployed definition; the ACL '
  'models the pre-grant state 20260720190000 was written against.';

-- Pre-grant ACL, as recorded in the header of
-- 20260720190000_grant_authenticated_claim_rpc_execute.sql: EXECUTE to PUBLIC
-- and to anon alongside authenticated. The grant migration removes the first
-- two and keeps the third, so the post-replay ACL proves the revokes ran.
grant execute on function public.claim_player_profiles_by_name() to public;
grant execute on function public.claim_player_profiles_by_name() to anon;
grant execute on function public.claim_player_profiles_by_name() to authenticated;
grant execute on function public.claim_player_profiles_by_name() to service_role;
