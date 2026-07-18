-- PROPOSAL ONLY — do not apply without explicit owner approval.
--
-- Deliberately placed outside supabase/migrations/ so it is NOT applied with
-- the data-capture-hardening-v2 release. This locks down the 22 orphaned public
-- backup tables that currently have RLS disabled and are anon/authenticated
-- readable (see docs/rls-backup-tables-security-finding.md). Non-destructive:
-- enables RLS with no policies (owner and service_role retain access via
-- BYPASSRLS) and revokes anon/authenticated grants (removes REST exposure).
--
-- Verified read-only: no view, routine, or foreign key depends on these tables.

do $lockdown$
declare
  t text;
  backup_tables text[] := array[
    'mig_backup_player_import_aliases', 'mig_backup_games', 'mig_backup_game_players',
    'mig_backup_gmdel20260712_aliases', '_cards_hadronikle_backup', 'mig_backup_groups',
    'mig_backup_group_members', 'mig_backup_group_settings', 'mig_backup_players',
    'mig_backup_gm20260712_players', 'mig_backup_james_merge_games',
    'mig_backup_james_merge_game_players', 'mig_backup_james_merge_players',
    'mig_backup_james_merge_group', 'mig_backup_james_merge_aliases',
    'mig_backup_james_merge_members', 'mig_backup_james_merge_settings',
    'mig_backup_gmdel20260712_groups', 'mig_backup_gmdel20260712_players',
    'mig_backup_gmdel20260712_games', 'mig_backup_gmdel20260712_group_members',
    'mig_backup_game_log_tag_coverage_20260714'
  ];
begin
  foreach t in array backup_tables loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on public.%I from anon', t);
      execute format('revoke all on public.%I from authenticated', t);
      raise notice 'locked down public.%', t;
    else
      raise notice 'skipped missing table public.%', t;
    end if;
  end loop;
end;
$lockdown$;
