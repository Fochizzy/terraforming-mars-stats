# Phase 4 Step 4.3 — F-01 completion (production execution)

- Executed at: 2026-07-19
- Production project: `qjtwgrjjwnqafbvkkfex`
- Mode: **authorized production execution**
- Authorization: the user approved fixing the residual F-01 leak and selected the
  hybrid approach (preserve privately + restrict column privileges).

This report covers the completion of finding F-01 only. It does not supersede the
placement backfill reports in
`docs/redesign/reports/phase-04-step-03-placement/`.

## Finding

The first F-01 pass (ledger `20260719191911`) moved
`public.player_private_identities` into the `private` schema and neutralized
`public.players.display_name` to `Guest XXXXXXXX`. Re-verification found that
pass **materially incomplete**:

- `private.player_private_identities` holds **0 rows**. The private table was
  built but never populated.
- The actual personal-name data lives in `public.players.full_name`, which
  remained readable by every group member.

`public.players` carries the RLS policy `members can read players`
(`is_group_member(group_id)`) and granted column-level SELECT to `anon` and
`authenticated`. Verified by impersonating a real authenticated group member
(`a6149ac0-…`) inside a rolled-back transaction:

```
unlinked_rows_visible: 6   full_names_readable: 6   usernames_readable: 6
```

All 28 player rows carry `full_name`/`username`. For the 22 linked rows the
values are an **exact denormalized copy** of `public.user_profiles`, whose own RLS
restricts rows to `user_id = auth.uid()` — so the copy bypassed that boundary for
all **4 distinct real people**.

Contract basis (`docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`):
"full name" and "normalized full name" are private personal-name data, barred
from public APIs and public database views; hiding a private name visually, or
sending it to the browser without rendering it, is explicitly insufficient.

## Applied migrations (ledger)

> **Correction (2026-07-20, audit finding B3):** this table originally
> recorded the repo *filename* timestamps as the ledger versions. The actual
> production ledger versions — re-verified read-only against
> `supabase_migrations.schema_migrations` — are `20260719203944` and
> `20260719204250` (`apply_migration` stamps the apply-time version; the SQL
> is byte-identical to the repo files). The follow-up view fix below was
> likewise applied as ledger version `20260719205420`, not `20260719230000`.
> The full mapping lives in
> `docs/redesign/reference/MIGRATION-LEDGER-MAP.md`.

| Ledger version | Name | Repo file |
| --- | --- | --- |
| `20260719203944` | `isolate_player_personal_names_from_data_api` | `20260719223000_…` |
| `20260719204250` | `enable_rls_on_player_legacy_identities` | `20260719223500_…` |

## Changes

| Measure | Value |
| --- | ---: |
| Rows preserved in `private.player_legacy_identities` | 6 |
| Preserved rows retaining `legacy_full_name` | 6 |
| Rows mutated in `public.players` | 0 |
| Player rows total (unchanged) | 28 |
| Player rows still retaining `full_name` data | 28 |
| Value mismatches between preserved and source | 0 |

- Only unlinked rows are preserved; linked players are excluded because their
  values are exactly reproducible from `public.user_profiles`, and copying them
  would widen the personal-data surface for no benefit.
- No personal data was destroyed. The contract requires separating private
  evidence from public presentation, not deleting it.
- Table-level SELECT on `public.players` was revoked from `anon`/`authenticated`
  and re-granted per column, excluding `full_name` and `username`. A column-level
  REVOKE alone is insufficient: a table-level grant implicitly covers every
  column.

`private.player_private_identities` was **not** used as the destination. Its
`created_by_user_id` is `NOT NULL` referencing `auth.users`, and no creator is
recorded anywhere — `public.groups` has no creator column and the
`player_import_aliases` rows carry `identity_mode = NULL` — so populating it
would have required fabricating provenance, which the project rules forbid.

## Postconditions

| Check | Result |
| --- | --- |
| `authenticated` can read `players.full_name` | no |
| `anon` can read `players.full_name` | no |
| `authenticated` can read `players.username` | no |
| `authenticated` can read `players.display_name` | yes |
| `authenticated`/`anon` can read `private.player_legacy_identities` | no |
| RLS enabled on `private.player_legacy_identities` (deny-all, 0 policies) | yes |
| Original attack (member selects `full_name`) | `ERROR 42501 permission denied` |
| Copy-then-read (`set display_name = full_name`) | `ERROR 42501 permission denied` |
| Legitimate member read of `players` | 23 rows, 23 `display_name` |
| ELO leaderboard entries | 4 (equals pre-change baseline) |
| Placement remediation intact (typed tile events) | 1500 |
| Objective aliases intact | 7 |

The copy-then-read path is closed because referencing a column in any expression
requires SELECT on that column.

## Rejected alternative — neutral-label rewrite of the display fallback

`get_elo_leaderboard`, `get_player_usernames` and
`list_claimable_player_profiles` use

```sql
coalesce(nullif(btrim(up.username), ''), nullif(btrim(p.username), ''))
```

as a public display fallback. Replacing it with
`private.resolve_public_player_name(p.id)` was implemented and executable-tested,
then **rejected**:

- Baseline ELO leaderboard: **4** entries, 0 neutral labels.
- With the rewrite: **6** entries, 2 neutral labels.

All 6 unlinked rows are unclaimed duplicates of the 4 registered users (each
`username` matches a registered `user_profiles.username`), so the leaderboard
currently merges them into the correct identity by username. Neutral per-UUID
labels broke that merge and double counted two real people, fragmenting their ELO
history.

The fallback surfaces a registered **public** username — which the contract
designates as the public identity — not a private personal name. No privacy gain
justified the regression, so the functions were left unchanged. They are SECURITY
DEFINER and therefore unaffected by the column privilege change; the leaderboard
was re-verified at exactly its 4 baseline entries after the migration.

## Validation

- `npx vitest run --no-file-parallelism` — 166 files / 874 tests passed.
- `npx tsc --noEmit` — clean (exit 0).
- `npm run lint` — exit 0 with the four documented baseline warnings.
- Executable migration testing was performed against the real production schema
  inside `begin … rollback` transactions, after first proving rollback is honored
  (a temp table created in-transaction did not survive). Forward application,
  double application (idempotency: 6 rows, not 12), postcondition assertions and
  functional RPC behaviour were all exercised before any commit, and residue
  checks confirmed the pre-mutation state was restored each time.
- Security advisors: **0 ERROR** after the follow-up fix below (96 lints: 26 INFO,
  70 WARN). The single remaining new INFO is `rls_enabled_no_policy` on
  `private.player_legacy_identities` — the intended deny-all state, matching its
  sibling `private.player_private_identities`.

## Follow-up: RLS bypass on the import integrity audit view

The advisor ERROR `security_definer_view
public.game_log_import_integrity_audit` was initially recorded as "pre-existing
and unrelated". That was accurate as to origin but **understated the impact**, so
it was investigated and fixed rather than carried forward.

The view selects from `game_log_imports`, `game_log_events` and
`game_log_tag_summaries` with no tenant filter, and was created without
`security_invoker`, so it executed as its owner (`postgres`) and bypassed the
caller's RLS. Both `anon` and `authenticated` hold SELECT on it.

Measured against production before the change:

| Caller | View rows | Rows their RLS permits |
| --- | ---: | ---: |
| signed-out `anon` | 42 | 0 |
| ordinary member | 42 | 39 |

So import integrity metadata — game ids, parse status, parser version,
input/output sha256 and validation errors — was readable for **every import in
the system** by an unauthenticated caller holding only the public anon key.

Fixed by ledger migration `20260719205420`
(`security_invoker_on_import_integrity_audit`; repo file
`20260719230000_…` — see the correction note above). Verified after: `anon` returns
**0** rows, the member returns exactly **39** (equal to their base-table
permission), `service_role` still returns 42, and the advisor ERROR count is
**0**. No application code reads this view; its only other reference is the
migration that created it.

## Note on suite flakiness (resolved)

`npm test` (plain `vitest run`, file-parallel) intermittently failed 2 tests in
`src/features/imports/log-game-import-shell.test.tsx` with a `findByText`
timeout, while the same file passed in isolation and the suite passed
166/166 serialized.

Cause: the test drove a full exported game log through `user.type`, which enters
text one character at a time and re-parses the log on every keystroke; under
parallel load the subsequent `findByText` exceeded its timeout. Replaced with
`user.click` + `user.paste`, which produces a single change event and also
matches how a user actually supplies an exported log. The full suite now passes
166 files / 874 tests in default parallel mode, and faster (15.9s vs 21.7s).
