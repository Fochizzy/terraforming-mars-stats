# CRITICAL security finding — RLS disabled on 22 public backup tables

**Independent of the data-capture-hardening-v2 release. Do not bundle. No
production change has been made. Awaiting an explicit, separate decision.**

## Finding

Supabase's database linter reports `rls_disabled_in_public` on **22** tables in
the `public` schema. Read-only verification against production
(`qjtwgrjjwnqafbvkkfex`) on 2026-07-18 confirmed the exposure:

- RLS enabled on these 22 tables: **0 / 22**
- Readable by `anon`: **22 / 22**
- Readable by `authenticated`: **22 / 22**

The `anon` key is the public publishable key shipped to every browser. Because
PostgREST exposes the `public` schema and RLS is off with an `anon` SELECT grant,
these backup tables are effectively readable via the REST API
(`GET /rest/v1/<table>`) by anyone with the public key. Several hold personal /
group data.

### Affected tables

Personal / group data (highest concern):
`mig_backup_players`, `mig_backup_group_members`, `mig_backup_group_settings`,
`mig_backup_groups`, `mig_backup_games`, `mig_backup_game_players`,
`mig_backup_player_import_aliases`, `mig_backup_james_merge_players`,
`mig_backup_james_merge_members`, `mig_backup_james_merge_group`,
`mig_backup_james_merge_settings`, `mig_backup_james_merge_games`,
`mig_backup_james_merge_game_players`, `mig_backup_james_merge_aliases`,
`mig_backup_gm20260712_players`, `mig_backup_gmdel20260712_players`,
`mig_backup_gmdel20260712_groups`, `mig_backup_gmdel20260712_group_members`,
`mig_backup_gmdel20260712_games`, `mig_backup_gmdel20260712_aliases`.

Other: `_cards_hadronikle_backup`, `mig_backup_game_log_tag_coverage_20260714`.

### Dependency check (read-only)

No view/materialized view, no `public` routine, and no foreign key from a live
table references any of these tables (all three checks returned 0). They are
orphaned migration backups. Locking them down will not break the app or
analytics.

## Why not silently enable RLS

Per the guidance, enabling RLS blindly can block required access. Here:

- Enabling RLS **with no policy** blocks `anon`/`authenticated` but still allows
  the table owner and `service_role` (which has `BYPASSRLS`) to read — so
  restores/admin keep working. That is the safe intent for backups.
- Because nothing depends on these tables, the risk of enabling RLS is low. The
  residual question is purely a retention decision (keep locked-down vs drop),
  which belongs to the owner — hence a separate proposal rather than a silent
  change.

## Remediation options (choose one; owner decision)

- **A — Lock down (recommended, non-destructive).** Enable RLS (no policies) and
  `REVOKE` `anon`/`authenticated` on all 22. Defense in depth: RLS blocks row
  access and the revoke removes REST exposure entirely. Data retained; owner /
  `service_role` retain access. Candidate migration:
  [`supabase/security/proposal_lock_down_backup_tables.sql`](../supabase/security/proposal_lock_down_backup_tables.sql)
  (kept **out** of `supabase/migrations/` so it is not applied with the capture
  release).
- **B — Drop the backups.** If the migration backups are past their retention
  window, drop them. Destructive; requires explicit owner confirmation and,
  ideally, an off-database archive first. Not scripted here.

Option A is reversible and preserves the data; recommend A now, with B as a
follow-up once retention is confirmed.

## Broader advisor review (separate, mostly pre-existing — for awareness)

The linter also reports, unrelated to the capture release:

- `rls_enabled_no_policy` ×2 — includes `game_mechanic_capture_deployments`
  (intended: operational marker, service-role/definer only).
- `security_definer_view` ×1, `rls_policy_always_true` ×1,
  `sensitive_columns_exposed` ×1 — review recommended, out of scope here.
- `function_search_path_mutable` ×2 — set a fixed `search_path` on those two
  functions. (All capture functions in this release already pin
  `search_path = public`.)
- `anon_security_definer_function_executable` ×27,
  `authenticated_security_definer_function_executable` ×33 — audit which
  security-definer RPCs are intentionally client-executable; revoke any that are
  not. (The capture writer is `SECURITY INVOKER`, revoked from public/anon.)
- `auth_leaked_password_protection` and `auth_insufficient_mfa_options` — Supabase
  Auth configuration hardening (enable leaked-password protection; add an MFA
  option).

These are listed for completeness and are not addressed by this release.

## Requested decision

Approve **Option A** (lock-down migration) as a standalone change, or direct
Option B (drop). Until then, no change is made. The capture release
(data-capture-hardening-v2) proceeds independently of this finding.
