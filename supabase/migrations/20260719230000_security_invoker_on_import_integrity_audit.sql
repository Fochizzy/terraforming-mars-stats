-- Phase 4, Step 4.3 — close the pre-existing RLS bypass on the import
-- integrity audit view.
--
-- public.game_log_import_integrity_audit selects from game_log_imports,
-- game_log_events and game_log_tag_summaries with no tenant filter. It was
-- created without `security_invoker`, so it executed with the privileges of its
-- owner (postgres) and bypassed the querying user's RLS entirely. Both `anon`
-- and `authenticated` hold SELECT on it.
--
-- Measured against production before the change:
--   * signed-out `anon`      saw 42 view rows; its RLS permits 0 base rows
--   * an ordinary member     saw 42 view rows; their RLS permits 39 base rows
--
-- So the view disclosed import integrity metadata — game ids, parse status,
-- parser version, input/output sha256 and validation errors — for every import
-- in the system, to unauthenticated callers holding only the public anon key.
--
-- Supabase reported this as the single security advisor ERROR
-- (`security_definer_view`). It was previously recorded as "pre-existing and
-- unrelated" to the F-01 remediation, which was accurate as to origin but
-- understated the impact.
--
-- Setting security_invoker makes the view evaluate under the caller's
-- privileges, so the existing RLS on the underlying tables applies. Verified in
-- a rolled-back transaction against production: anon drops to 0 rows and the
-- member drops to exactly the 39 rows their RLS already permits.
--
-- No application code reads this view; its only other reference is the
-- migration that created it (20260715032000_prevent_future_game_log_backfills).
--
-- Rollback:
--   alter view public.game_log_import_integrity_audit set (security_invoker = false);

alter view public.game_log_import_integrity_audit set (security_invoker = true);

do $postcondition$
declare
  v_options text;
begin
  select array_to_string(c.reloptions, ',')
  into v_options
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'game_log_import_integrity_audit';

  if v_options is null or v_options not like '%security_invoker=true%' then
    raise exception 'STOP: security_invoker is not enabled on game_log_import_integrity_audit (reloptions: %)',
      coalesce(v_options, '(none)');
  end if;
end
$postcondition$;
