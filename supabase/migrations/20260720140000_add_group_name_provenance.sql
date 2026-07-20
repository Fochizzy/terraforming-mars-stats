-- Step 4.3 B-04 remediation: additive schema support for group-name
-- provenance. PREPARED ONLY — not applied to production by this change, and
-- not yet wired into application code (the accompanying code-only reader fix
-- resolves every ordinary display from the roster and ignores this table
-- entirely; it does not require these columns to exist).
--
-- Why: public.groups currently has only (id, name, created_at) — no way to
-- tell a user-authored custom name apart from a name the app auto-generated
-- from the roster, or from a historical name of unknown origin. That is what
-- makes every existing row conservatively "unknown provenance" today. This
-- migration adds the columns needed to record and later trust that
-- distinction; it does not itself reclassify any existing row.
--
-- Follow-up (separately authorized, not part of this migration):
--   1. Update `renameGroup` (src/lib/db/group-settings-repo.ts) to set
--      name_source = 'custom', custom_name = <input>, renamed_at = now(),
--      renamed_by = auth.uid() on every explicit rename.
--   2. Update `resolveOrCreateImportGroup`'s group insert/update
--      (src/lib/db/import-group-repo.ts) to set name_source = 'auto_generated',
--      auto_name_version = 2 (the public-label scheme) instead of leaving the
--      conservative default.
--   3. Update the canonical resolver (src/lib/db/group-label-resolution.ts)
--      to prefer custom_name verbatim when name_source = 'custom', and to
--      keep deriving from the roster otherwise — never trusting `name` or
--      `custom_name` when name_source = 'legacy_unknown'.
--   4. Run the Stage B data-cleanup pass (see cleanup plan in the Step 4.3
--      B-04 handoff) to reclassify legacy_unknown rows where deterministically
--      possible, then re-verify zero unsafe labels remain in ordinary reads.

alter table public.groups
  add column if not exists name_source text not null default 'legacy_unknown',
  add column if not exists custom_name text,
  add column if not exists auto_name_version smallint,
  add column if not exists renamed_at timestamptz,
  add column if not exists renamed_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'groups_name_source_check'
      and conrelid = 'public.groups'::regclass
  ) then
    alter table public.groups
      add constraint groups_name_source_check
      check (name_source in ('custom', 'auto_generated', 'legacy_unknown'));
  end if;
end $$;

-- custom_name only ever holds a value when it is explicitly attributed to a
-- user-authored rename; every other provenance leaves it null.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'groups_custom_name_requires_source'
      and conrelid = 'public.groups'::regclass
  ) then
    alter table public.groups
      add constraint groups_custom_name_requires_source
      check (custom_name is null or name_source = 'custom');
  end if;
end $$;

comment on column public.groups.name_source is
  'Provenance of groups.name: custom (user-authored via an explicit rename, safe to display verbatim), auto_generated (built by the app from public roster labels), legacy_unknown (predates this column — conservative default; never assumed safe for ordinary display).';
comment on column public.groups.custom_name is
  'The user-authored name, populated only when name_source = custom. Null for auto_generated and legacy_unknown rows.';
comment on column public.groups.auto_name_version is
  'Naming scheme version for auto_generated rows: 1 = raw players.display_name concatenation (retired, unsafe — this is the B-04 defect), 2 = public-roster-label concatenation (current, safe). Null for custom/legacy_unknown rows.';
comment on column public.groups.renamed_at is
  'When name_source last became custom. Null until the first explicit rename under the provenance scheme.';
comment on column public.groups.renamed_by is
  'auth.users.id of the member who performed the rename that set name_source = custom. Null until the first explicit rename under the provenance scheme.';

-- RLS / grants: intentionally unchanged. public.groups keeps its existing
-- row-level policies ("members can read groups" via is_group_member(id),
-- "members manage groups" via can_edit_group(id)) and existing table-level
-- grants to anon/authenticated/service_role/postgres. The new columns are
-- exposed to exactly the same audience `name` already is today — this
-- migration adds no new access and removes none. Ordinary-display safety is
-- enforced at the application layer (the canonical resolver never selects
-- these columns for public display), the same code-discipline pattern
-- already used for players.display_name before its own column-level
-- restriction shipped. If the owner later wants that same DB-level
-- enforcement here (REVOKE column-level SELECT on name/custom_name from
-- anon/authenticated, expose only via a SECURITY DEFINER RPC), that is a
-- separate, higher-blast-radius follow-up — not part of this additive
-- proposal.
