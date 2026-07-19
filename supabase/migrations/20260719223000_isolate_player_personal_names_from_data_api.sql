-- Phase 4, Step 4.3 remediation — completion of finding F-01.
--
-- Finding
-- -------
-- public.players.full_name holds private personal-name material, and
-- public.players is readable by every group member through the Data API (RLS
-- policy "members can read players" => is_group_member(group_id)) with
-- column-level SELECT granted to anon and authenticated. The value is an exact
-- denormalized copy of public.user_profiles.full_name, whose own RLS correctly
-- restricts rows to user_id = auth.uid(); the copy therefore bypassed that
-- boundary. Verified against production by impersonating a real authenticated
-- group member, who could read all 6 unlinked players' full_name and username.
--
-- The authoritative contract
-- (docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md) lists "full
-- name" and "normalized full name" as private personal-name data, bars it from
-- public APIs and public database views, and states that sending a private name
-- to the browser without rendering it is not sufficient.
--
-- public.players.username is additionally restricted here as defence in depth.
-- It is NOT itself a private-name violation: all 6 unlinked rows carry a
-- registered public username, and the contract makes the registered username
-- the public identity. It is restricted because no client code reads it and
-- because, on an unclaimed row, it asserts an identity association that the
-- contract requires an explicit claim to confirm.
--
-- Deliberately NOT changed
-- ------------------------
-- public.get_elo_leaderboard, public.get_player_usernames and
-- public.list_claimable_player_profiles use
--   coalesce(nullif(btrim(up.username),''), nullif(btrim(p.username),''))
-- as a public display fallback. Replacing that fallback with a neutral label was
-- built and executable-tested, and was rejected: the 6 unlinked rows are
-- unclaimed duplicates of the 4 registered users, so the leaderboard currently
-- merges them into the correct identity by username. Neutral per-UUID labels
-- broke that merge and split the ELO leaderboard from 4 entries to 6, double
-- counting two real people. The fallback surfaces a registered PUBLIC username,
-- not a private personal name, so no privacy gain justified that regression.
--
-- These functions are SECURITY DEFINER and therefore unaffected by the column
-- privilege change below; executable testing confirmed the leaderboard still
-- returns exactly its 4 baseline entries after this migration.
--
-- Rollback
-- --------
--   grant select on public.players to anon, authenticated;
--   drop table private.player_legacy_identities;

-- ---------------------------------------------------------------------------
-- 1. Preserve the guest personal-name evidence behind the private boundary
-- ---------------------------------------------------------------------------
-- Contract: "Do not destroy private source evidence solely to prevent public
-- display. Separate private evidence from public presentation."
--
-- Only unlinked rows are preserved. Linked players are excluded because their
-- values are exactly reproducible from public.user_profiles, and copying them
-- would widen the personal-data surface for no benefit.

create table if not exists private.player_legacy_identities (
  player_id uuid primary key references public.players (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  legacy_full_name text,
  legacy_username text,
  captured_at timestamptz not null default now(),
  capture_source text not null
);

revoke all on private.player_legacy_identities from public;
revoke all on private.player_legacy_identities from anon;
revoke all on private.player_legacy_identities from authenticated;

comment on table private.player_legacy_identities is
  'Private preservation of pre-remediation public.players.full_name/username for '
  'unlinked players. Not reachable from the Data API. Linked players are excluded '
  'because their values are exactly reproducible from public.user_profiles.';

insert into private.player_legacy_identities (
  player_id, group_id, legacy_full_name, legacy_username, capture_source
)
select
  p.id,
  p.group_id,
  nullif(btrim(p.full_name), ''),
  nullif(btrim(p.username), ''),
  'public.players columns preserved by Step 4.3 F-01 remediation'
from public.players p
where p.linked_user_id is null
on conflict (player_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Remove client read access to the private columns
-- ---------------------------------------------------------------------------
-- Revoking table-level SELECT and re-granting per column is required: a
-- table-level grant implicitly covers every column, so a column-level REVOKE
-- alone would not restrict access.
--
-- Referencing a column in any expression requires SELECT on that column, so this
-- also closes the copy-then-read path (UPDATE players SET display_name =
-- full_name). INSERT/UPDATE/DELETE grants are intentionally left untouched; row
-- access remains governed by the existing RLS policies.

revoke select on public.players from anon;
revoke select on public.players from authenticated;

grant select (
  id, group_id, linked_user_id, display_name, created_at, normalized_display_name
) on public.players to anon;

grant select (
  id, group_id, linked_user_id, display_name, created_at, normalized_display_name
) on public.players to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Postconditions
-- ---------------------------------------------------------------------------

do $postcondition$
declare
  v_unlinked int;
  v_preserved int;
begin
  select count(*) into v_unlinked from public.players where linked_user_id is null;
  select count(*) into v_preserved from private.player_legacy_identities;

  if v_preserved <> v_unlinked then
    raise exception 'STOP: preserved % legacy identities for % unlinked players',
      v_preserved, v_unlinked;
  end if;

  if exists (
    select 1
    from public.players p
    join private.player_legacy_identities l on l.player_id = p.id
    where p.linked_user_id is null
      and (l.legacy_full_name is distinct from nullif(btrim(p.full_name), '')
        or l.legacy_username is distinct from nullif(btrim(p.username), ''))
  ) then
    raise exception 'STOP: preserved legacy identity values do not match public.players';
  end if;

  if has_column_privilege('anon', 'public.players', 'full_name', 'SELECT')
     or has_column_privilege('anon', 'public.players', 'username', 'SELECT')
     or has_column_privilege('authenticated', 'public.players', 'full_name', 'SELECT')
     or has_column_privilege('authenticated', 'public.players', 'username', 'SELECT') then
    raise exception 'STOP: private columns are still selectable by a client role';
  end if;

  if not (has_column_privilege('authenticated', 'public.players', 'id', 'SELECT')
      and has_column_privilege('authenticated', 'public.players', 'display_name', 'SELECT')
      and has_column_privilege('authenticated', 'public.players', 'group_id', 'SELECT')
      and has_column_privilege('authenticated', 'public.players', 'linked_user_id', 'SELECT')
      and has_column_privilege('authenticated', 'public.players', 'created_at', 'SELECT')
      and has_column_privilege('authenticated', 'public.players', 'normalized_display_name', 'SELECT')) then
    raise exception 'STOP: public player columns are no longer readable by authenticated';
  end if;

  if has_table_privilege('authenticated', 'private.player_legacy_identities', 'SELECT')
     or has_table_privilege('anon', 'private.player_legacy_identities', 'SELECT') then
    raise exception 'STOP: preserved private evidence is reachable by a client role';
  end if;
end
$postcondition$;
