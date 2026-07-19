-- Phase 4, Step 4.3 remediation — defence in depth for the preserved private
-- evidence introduced by 20260719223000.
--
-- private.player_legacy_identities is already unreachable from the Data API: it
-- lives in the `private` schema (not an exposed PostgREST schema) and every
-- client-role grant is revoked. Enabling RLS with no policies adds a third,
-- deny-all layer and matches the posture of its sibling table
-- private.player_private_identities.
--
-- The resulting `rls_enabled_no_policy` advisor notice is INFO and is the
-- intended deny-all state, not a finding.
--
-- Rollback:
--   alter table private.player_legacy_identities disable row level security;

alter table private.player_legacy_identities enable row level security;

do $postcondition$
begin
  if not (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private' and c.relname = 'player_legacy_identities'
  ) then
    raise exception 'STOP: RLS is not enabled on private.player_legacy_identities';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'private' and tablename = 'player_legacy_identities'
  ) then
    raise exception 'STOP: unexpected policy exists on private.player_legacy_identities';
  end if;

  if has_table_privilege('authenticated', 'private.player_legacy_identities', 'SELECT')
     or has_table_privilege('anon', 'private.player_legacy_identities', 'SELECT') then
    raise exception 'STOP: preserved private evidence is reachable by a client role';
  end if;
end
$postcondition$;
