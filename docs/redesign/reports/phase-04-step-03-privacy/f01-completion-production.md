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

| Ledger version | Name | Repo file |
| --- | --- | --- |
| `20260719223000` | `isolate_player_personal_names_from_data_api` | `20260719223000_…` |
| `20260719223500` | `enable_rls_on_player_legacy_identities` | `20260719223500_…` |

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
- Security advisors: 96 lints, **1 ERROR** — `security_definer_view
  public.game_log_import_integrity_audit` — pre-existing and unrelated. No new
  finding is attributable to this remediation.

## Note on suite flakiness

Running `npm test` (plain `vitest run`, file-parallel) intermittently fails 2
tests in `src/features/imports/log-game-import-shell.test.tsx` with a
`findByText` timeout under load. The same file passes 2/2 in isolation, and the
full suite passes 166/166 with `--no-file-parallelism`, which is the documented
validation command. This is execution-environment flakiness, not a regression.
