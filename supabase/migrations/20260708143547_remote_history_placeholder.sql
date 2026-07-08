-- This migration version exists in the linked Supabase project's remote
-- migration history, but the original SQL file was not present in local git
-- history, branches, or sibling worktrees when the live analytics branch was
-- reconciled.
--
-- Keep this no-op placeholder so Supabase CLI can compare migration history
-- without mutating the remote ledger.

do $$
begin
  null;
end $$;
