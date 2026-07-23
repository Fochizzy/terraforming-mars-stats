-- GATED / UNAPPLIED expansion migration. NOT applied to production.
--
-- EXPAND phase of the ID-READER-CLIENT repair. Additive only: it creates one
-- new function and leaves the deployed 7-argument
-- public.resolve_import_guest_identity(uuid, text, text, text, text, uuid,
-- boolean) completely untouched. Dropping that function is the separate,
-- separately-authorized CONTRACT phase, and must happen only after the reader
-- below is deployed and verified in production.
--
-- WHAT THIS ADDS
--
-- public.create_or_reuse_guest_identity — a NON-import, source-unbound guest
-- reuse-or-create for the two non-import product paths:
--   * /group/players — the roster "add player" server action;
--   * the Log-a-Game manual-entry resolver's new-player branch.
-- Neither path has a parsed import behind it, so neither may record import
-- evidence.
--
-- It supersedes gated migration 20260720100000, which is now a no-op tombstone.
-- See that file for why it was retired.
--
-- THREE DELIBERATE DIFFERENCES from the body it is derived from
-- (20260720100000, itself derived from the deployed 20260718212339):
--
--   1. AUTHORIZATION. The gate reads an explicit, server-verified
--      `p_requesting_user_id` checked against public.group_members, NOT
--      `auth.uid()` / public.is_group_member. `auth.uid()` is NULL under
--      service_role, so an auth.uid()-gated function is uncallable by a
--      service-role caller — and the user-session route is closed, because
--      production revoked `authenticated` EXECUTE on the deployed resolver
--      (ledger 20260722153233). This mirrors the four applied source-bound
--      gateways in 20260722012658, which take the same explicit argument for
--      the same reason.
--
--      SECURITY COST, STATED PLAINLY: the database now trusts the application
--      to pass a truthful requesting-user id. With auth.uid() an authorization
--      bypass was structurally impossible; here a server-side defect that
--      passes an attacker-influenced id would be a full bypass. That is why
--      this function is service_role ONLY (below) and why the caller resolves
--      the id from the server session, never from client input.
--
--   2. ATTRIBUTION. `created_by_user_id` is populated from
--      `p_requesting_user_id` instead of `(select auth.uid())`. The column is
--      `not null references auth.users(id)`
--      (20260718050924_claimable_guest_identity_privacy.sql), so under
--      service_role the old expression violated NOT NULL.
--
--   3. NO IMPORT EVIDENCE. There is NO insert into
--      public.player_import_aliases on ANY branch. This is the non-import
--      path; `player_import_aliases.source_type` is constrained to import
--      sources, so an alias row here would assert a game-log origin that does
--      not exist. Future import matching still works, because the candidate
--      search already unions private.player_private_identities.
--
-- The candidate search and the selected-player revalidation are transcribed
-- VERBATIM from 20260720100000 (its lines 87-163). They read evidence and
-- create none, so they introduce no provenance.
--
-- A DISTINCT NAME, NOT AN OVERLOAD. The existing signature ends in five
-- defaulted parameters, so PostgreSQL forces an appended parameter to have a
-- default too ("input parameters after one with a default value must also have
-- defaults"). With both overloads present, an old-style call is then ambiguous
-- (42725) — reproduced in a disposable cluster during design. A distinct name
-- removes that hazard entirely.
--
-- GRANTS: service_role ONLY. `authenticated` is never granted; the revokes
-- below are defensive, and the `public` revoke is load-bearing because
-- CREATE FUNCTION grants EXECUTE to PUBLIC by default.
--
-- Repeat-safe: `create or replace` plus unconditional revokes/grants, so
-- re-running converges to the same state.

create or replace function public.create_or_reuse_guest_identity(
  p_group_id uuid,
  p_identity_mode text,
  p_guest_username text default null,
  p_guest_first_name text default null,
  p_guest_last_name text default null,
  p_selected_player_id uuid default null,
  p_create_new boolean default false,
  p_requesting_user_id uuid default null
)
returns table (
  player_id uuid,
  public_name text,
  resolution_state text,
  normalized_imported_value text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_first_name text;
  v_last_name text;
  v_normalized_value text;
  v_candidate_count integer := 0;
  v_player_id uuid;
  v_display_name text;
begin
  -- AUTH: gate on the explicit server-verified requesting-user id, never
  -- auth.uid(). Same failure message and SQLSTATE as the resolver this
  -- replaces, so the caller's error surface is unchanged.
  if p_requesting_user_id is null or not exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_requesting_user_id
  ) then
    raise exception 'The selected group is not available.' using errcode = '42501';
  end if;

  if p_identity_mode = 'username' then
    v_username := nullif(btrim(regexp_replace(coalesce(p_guest_username, ''), '[[:space:]]+', ' ', 'g')), '');
    v_normalized_value := private.normalize_guest_username(v_username);
    if v_username is null or v_normalized_value = '' then
      raise exception 'Enter a guest username using letters or numbers.' using errcode = '22023';
    end if;
  elsif p_identity_mode = 'personal_name' then
    v_first_name := nullif(btrim(regexp_replace(coalesce(p_guest_first_name, ''), '[[:space:]]+', ' ', 'g')), '');
    v_last_name := nullif(btrim(regexp_replace(coalesce(p_guest_last_name, ''), '[[:space:]]+', ' ', 'g')), '');
    v_normalized_value := private.normalize_private_personal_name(v_first_name, v_last_name);
    if v_first_name is null or v_last_name is null or v_normalized_value = '' then
      raise exception 'Enter both a first and last name.' using errcode = '22023';
    end if;
  else
    raise exception 'Choose username or first and last name.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_group_id::text || ':' || p_identity_mode || ':' || v_normalized_value,
      0
    )
  );

  select count(*)::integer
  into v_candidate_count
  from (
    select ppi.player_id
    from private.player_private_identities ppi
    join public.players p on p.id = ppi.player_id
    where ppi.group_id = p_group_id
      and p.linked_user_id is null
      and (
        (p_identity_mode = 'username' and ppi.normalized_guest_username = v_normalized_value)
        or
        (p_identity_mode = 'personal_name' and ppi.normalized_personal_name = v_normalized_value)
      )
    union
    select pia.player_id
    from public.player_import_aliases pia
    join public.players p on p.id = pia.player_id
    where pia.group_id = p_group_id
      and p.linked_user_id is null
      and pia.normalized_alias = v_normalized_value
      and (pia.identity_mode = p_identity_mode or pia.identity_mode is null)
  ) candidates;

  if p_selected_player_id is null and v_candidate_count = 1 then
    select candidate.player_id
    into p_selected_player_id
    from (
      select ppi.player_id
      from private.player_private_identities ppi
      where ppi.group_id = p_group_id
        and (
          (p_identity_mode = 'username' and ppi.normalized_guest_username = v_normalized_value)
          or
          (p_identity_mode = 'personal_name' and ppi.normalized_personal_name = v_normalized_value)
        )
      union
      select pia.player_id
      from public.player_import_aliases pia
      join public.players p on p.id = pia.player_id
      where pia.group_id = p_group_id
        and p.linked_user_id is null
        and pia.normalized_alias = v_normalized_value
        and (pia.identity_mode = p_identity_mode or pia.identity_mode is null)
    ) candidate
    limit 1;
  end if;

  if p_selected_player_id is not null then
    if not exists (
      select 1
      from public.players p
      where p.id = p_selected_player_id
        and p.group_id = p_group_id
        and p.linked_user_id is null
        and (
          exists (
            select 1
            from private.player_private_identities ppi
            where ppi.player_id = p.id
              and (
                (p_identity_mode = 'username' and ppi.normalized_guest_username = v_normalized_value)
                or
                (p_identity_mode = 'personal_name' and ppi.normalized_personal_name = v_normalized_value)
              )
          )
          or exists (
            select 1
            from public.player_import_aliases pia
            where pia.player_id = p.id
              and pia.group_id = p_group_id
              and pia.normalized_alias = v_normalized_value
              and (pia.identity_mode = p_identity_mode or pia.identity_mode is null)
          )
        )
    ) then
      raise exception 'The selected guest identity is unavailable or no longer matches.' using errcode = 'P0002';
    end if;

    insert into private.player_private_identities (
      player_id, group_id, identity_mode, guest_username, guest_first_name,
      guest_last_name, normalized_guest_username, normalized_personal_name,
      created_by_user_id
    )
    select
      p_selected_player_id, p_group_id, p_identity_mode,
      case when p_identity_mode = 'username' then v_username end,
      case when p_identity_mode = 'personal_name' then v_first_name end,
      case when p_identity_mode = 'personal_name' then v_last_name end,
      case when p_identity_mode = 'username' then v_normalized_value end,
      case when p_identity_mode = 'personal_name' then v_normalized_value end,
      p_requesting_user_id
    where not exists (
      select 1 from private.player_private_identities ppi
      where ppi.player_id = p_selected_player_id
    );

    -- NO public.player_import_aliases insert. This path is non-import.

    return query select
      p_selected_player_id,
      coalesce(private.resolve_public_player_name(p_selected_player_id), 'Player'),
      'existing_unlinked_guest'::text,
      v_normalized_value;
    return;
  end if;

  if v_candidate_count > 1 then
    raise exception 'Multiple guest identities match. Select one explicitly.' using errcode = 'P0003';
  end if;
  if not p_create_new then
    raise exception 'Confirm creation of the new guest identity.' using errcode = '22023';
  end if;

  v_player_id := gen_random_uuid();
  v_display_name := private.neutral_unlinked_player_label(v_player_id);

  insert into public.players (id, group_id, linked_user_id, display_name)
  values (v_player_id, p_group_id, null, v_display_name);

  insert into private.player_private_identities (
    player_id, group_id, identity_mode, guest_username, guest_first_name,
    guest_last_name, normalized_guest_username, normalized_personal_name,
    created_by_user_id
  ) values (
    v_player_id, p_group_id, p_identity_mode,
    case when p_identity_mode = 'username' then v_username end,
    case when p_identity_mode = 'personal_name' then v_first_name end,
    case when p_identity_mode = 'personal_name' then v_last_name end,
    case when p_identity_mode = 'username' then v_normalized_value end,
    case when p_identity_mode = 'personal_name' then v_normalized_value end,
    p_requesting_user_id
  );

  -- NO public.player_import_aliases insert. This path is non-import.

  return query select
    v_player_id,
    v_display_name,
    'newly_created_unlinked_guest'::text,
    v_normalized_value;
end;
$$;

revoke execute on function public.create_or_reuse_guest_identity(
  uuid, text, text, text, text, uuid, boolean, uuid
) from public;
revoke execute on function public.create_or_reuse_guest_identity(
  uuid, text, text, text, text, uuid, boolean, uuid
) from anon;
revoke execute on function public.create_or_reuse_guest_identity(
  uuid, text, text, text, text, uuid, boolean, uuid
) from authenticated;
grant execute on function public.create_or_reuse_guest_identity(
  uuid, text, text, text, text, uuid, boolean, uuid
) to service_role;

comment on function public.create_or_reuse_guest_identity(
  uuid, text, text, text, text, uuid, boolean, uuid
) is
  'Service-only NON-import guest reuse-or-create. Authorizes on an explicit server-verified p_requesting_user_id against group_members, stamps created_by_user_id from it, and records NO player_import_aliases row because this path has no imported source.';
