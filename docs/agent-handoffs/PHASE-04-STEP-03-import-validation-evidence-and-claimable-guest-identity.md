# Phase 4 · Step 4.3 — Import Validation, Evidence, and Claimable Guest Identity (remediation handoff)

## Status

**Step 4.3 is ACTIVE.** The bounded remediation of the independent closure
audit's blocker and high findings (F-01 – F-10) is **repository-complete** across
six focused commits, and the **four gated production mutation groups are now
applied and verified** (user approved "apply all four" on 2026-07-19). Do not
mark Step 4.3 complete — that requires a fresh independent read-only audit. Do
not begin Step 4.4.

Baseline HEAD: `b0deed8c` · Remediation commits: `cfafd823` → (see final commit
adding this update).

| Commit | Scope |
| --- | --- |
| `cfafd823` | F-01 guest-identity privacy boundary |
| `183913327` | F-02 / F-03 / F-07 durable canonical placement + identifier integrity |
| `6b1ae565` | F-04 trusted Venus option evidence into the production import action |
| `d74f18399` | F-05 off-reserve ocean evidence + F-06 objective aliases |
| `6e6e1859` | F-08 dry-run report + F-09 fixtures + executable migration tests |

## Import parsing, board reconstruction, map detection, objectives

- The server import action (`src/app/(app)/log-game/import/page.tsx`) parses
  ordered tile actions, reconstructs the board, resolves player identities on
  the server, detects the map independently with the confirmed objective
  configuration, validates objectives by scope, builds canonical log events, and
  persists the objective configuration, tile actions, board, and conflicts.
- Tile parsing retains original grid `row/position` (`parse-terraforming-mars-tile-actions.ts`)
  and both flat (`at NN` / `mNN`) and grid (`on row R position P`) formats.
- Map detection (`detect-import-board-map-independent.ts`) matches placed oceans
  against each map's reserved-ocean fingerprint. **F-05**: a pure resolver
  (`resolve-off-reserve-ocean-evidence.ts`) links a play of a source-backed
  ocean-exception card (Artificial Lake 116, Small Comet Pf37, Central Reservoir
  UP09, Subterranean Sea U015 at pinned upstream commit
  `7a6f98f09ac2a558969c092d317c313806af7b73`) to the first subsequent ocean
  placement by the same normalized actor, and the detector excludes exactly
  those verified spaces from the fingerprint via one `oceanMissedFor` helper.
  Missing/ambiguous evidence stays ambiguous — no count is guessed.

## Guest identity and privacy (F-01)

- `player_private_identities` moves to the `private` schema; direct
  anon/authenticated access is revoked. Executable test confirms an ordinary
  `authenticated` member cannot select it or `player_import_aliases`.
- Unlinked public labels are neutralized to `Guest XXXXXXXX`; the public
  name resolver returns the registered username for linked players and a neutral
  label for every unlinked player. Personal names never become public display
  labels.
- The browser receives only public candidate fields
  (`id/isAccessible/isLinked/publicName`). Guest reuse, ambiguity, and duplicate
  detection resolve server-side in the guarded SECURITY DEFINER
  `resolve_import_guest_identity`; `list_import_player_identity_candidates`
  returns only public data. Original import evidence (raw source text, normalized
  matching value) stays in `game_log_imports.confidence_summary`, which is
  RLS-gated to `can_read_game`/`can_edit_game` — an authorized boundary, never a
  public payload.
- Registration-time claiming remains deferred and unimplemented.

### F-01 residual leak found after the first remediation (2026-07-19)

Re-verification against production found that the first F-01 pass was
**materially incomplete**. It moved `player_private_identities` (which holds
**0 rows**) into `private` and neutralized `players.display_name`, but the actual
personal-name data lives in `public.players.full_name`, which remained readable
by every group member.

Evidence, by impersonating a real authenticated group member
(`a6149ac0-…`) in a rolled-back transaction:

```
unlinked_rows_visible: 6   full_names_readable: 6   usernames_readable: 6
```

`public.players` carries the RLS policy `members can read players`
(`is_group_member(group_id)`) plus column-level SELECT for `anon` and
`authenticated`. For the 22 linked players the values are an exact denormalized
copy of `public.user_profiles`, whose own RLS restricts rows to
`user_id = auth.uid()` — so the copy bypassed that boundary for all
**4 distinct real people**. This violates the contract's bar on private
personal-name data in public APIs and database views, and its rule that sending
a private name to the browser without rendering it is not sufficient.

**Fixed** by `20260719223000_isolate_player_personal_names_from_data_api.sql` and
`20260719223500_enable_rls_on_player_legacy_identities.sql`:

- the 6 unlinked rows' `full_name`/`username` are preserved in
  `private.player_legacy_identities` (private schema, all client grants revoked,
  RLS enabled deny-all) rather than destroyed — the contract requires separating
  private evidence from public presentation, not deleting it;
- table-level SELECT on `public.players` is revoked from `anon`/`authenticated`
  and re-granted per column, excluding `full_name` and `username`. A column-level
  REVOKE alone is insufficient because a table-level grant implicitly covers
  every column;
- because referencing a column in any expression requires SELECT on it, this also
  closes the copy-then-read path (`update players set display_name = full_name`),
  verified to fail with `permission denied`.

Post-fix verification: the original attack now returns
`ERROR: 42501 permission denied for table players`; legitimate reads still return
23 rows with 23 `display_name`s; `players` data is intact (28 rows, all
`full_name` values retained privately).

`private.player_private_identities` was **not** used as the destination:
its `created_by_user_id` is `NOT NULL` referencing `auth.users`, and no creator
is recorded anywhere (`groups` has no creator column; the alias rows carry
`identity_mode = NULL`), so populating it would have required fabricating
provenance.

**Deliberately not changed.** `get_elo_leaderboard`, `get_player_usernames` and
`list_claimable_player_profiles` use
`coalesce(nullif(btrim(up.username),''), nullif(btrim(p.username),''))` as a
public display fallback. Replacing it with a neutral label was built and
executable-tested, then rejected: all 6 unlinked rows are unclaimed duplicates of
the 4 registered users, so the leaderboard currently merges them into the correct
identity by username, and neutral per-UUID labels split the ELO leaderboard from
**4 entries to 6**, double counting two real people. The fallback surfaces a
registered *public* username — the contract's designated public identity — not a
private personal name, so no privacy gain justified that regression. These
functions are SECURITY DEFINER and are unaffected by the column privilege change;
the leaderboard was re-verified at exactly its 4 baseline entries afterwards.

## Canonical placement and identifier integrity (F-02 / F-03 / F-07)

- `game_log_events` gains typed placement columns (`map_id`,
  `placement_action/board/format`, `source_space_id`, `board_row/position`,
  `source_line_number`, `ownership_state`, `owner_player_id`,
  `owner_game_player_id`). The event builder emits a deterministic
  `event_identity`, stable `player_id` from confirmed resolutions, original
  flat/grid source ids, provenance, and `ownership_state = 'unknown'` with null
  owners — the actor is never treated as ownership.
- **F-03**: one shared confidence contract (`game-log-event-contract.ts`,
  `high/medium/low/reviewed`) threads through the parsers; the migration adds
  `reviewed` to the live `game_log_events_confidence_level_valid` constraint
  (verified: production has exactly that one confidence constraint).
- **F-07**: `replace_game_log_events` is a hardened SECURITY DEFINER RPC with
  `can_edit_game` authorization and validation of player/game-player/owner/
  colony/map/event-type/event-identity; direct authenticated access to
  `player_import_aliases` is revoked. A 23-row canonical colony catalogue backs
  `colony_id`.

## Venus and Colonies (F-04)

- The result-PDF parser recognizes the base and Venus global-parameter layouts;
  a Venus contribution column becomes trusted Venus **option** evidence
  (`source: result_pdf_global_parameters`, `venusNext: true`) passed into the
  expansion parser by the production action.
- Colonies presence is never inferred from missing PDF data. The final Venus
  scale is **not** interpolated from movement lines — it stays null unless a
  trusted value is present (durable no-interpolation rule; the accepted PDF does
  not print it).

## Schema, RLS, migrations

Three prepared migrations (files committed; **not applied to production**):

- `20260718212339_remediate_guest_identity_privacy_boundary.sql`
- `20260718212340_harden_game_log_event_contract.sql`
- `20260718212342_add_objective_catalog_aliases.sql`

Every migration assumption was verified against live production read-only, and
all three apply cleanly in the executable harness.

## Executable migration tests

`supabase/tests/executable/run.sh` (disposable native PostgreSQL 18 cluster, no
Docker) replays the full 40-migration history and asserts: 23 colonies + 7
aliases seeded; `reviewed` accepted / bad confidence rejected; event-type,
event-identity, typed-placement, and colony-id constraints enforced;
authenticated cannot read the private tables; alias migration idempotent;
deterministic-id rollback leaves unrelated aliases intact. Result:
`ALL EXECUTABLE MIGRATION TESTS PASSED`.

## Dry run and backfill

- **Dry run (done, read-only, zero writes):**
  `docs/redesign/reports/phase-04-step-03-placement/placement-backfill-dry-run.{json,md}`.
  From real production analysis: 42 games, 42 retained logs, 1500 placements
  (1400 flat / 100 grid), **1467 attributed / 33 unresolved**, maps Elysium
  19/698 · Hellas 13/437 · Tharsis 10/365, 0 ambiguous/unsupported/unknown maps,
  42 Venus + 42 Colonies absences.
- **Backfill (NOT run):** updates exactly the 1500 existing tile-event rows with
  typed fields, resolving 1467 attributions and preserving 33 as null. It
  requires migration `20260718212340` applied first, a re-run preflight that
  still matches, and separate authorization. Its production report is a separate
  immutable artifact (`placement-backfill-production.{json,md}`) that must not
  overwrite the dry run.

## Fixtures (F-09)

`src/lib/imports/fixtures/` with `FIXTURES.md` manifest: a sanitized real
flat/negative export, a new sanitized real **grid** export
(`retained-real-grid-placement-2026-07-08.txt`, zero residual real names), and
the source-backed pinned upstream Venus/Colonies fragment. **Documented gap:** no
real Venus/Colonies-positive export exists in local artifacts (0 Venus tokens;
`colony` mentions are card names), so none is fabricated — the pinned upstream
fragment is the authoritative positive corpus until a real export is provided.

## Test results

- `npx tsc --noEmit`: clean.
- `npx vitest run --no-file-parallelism`: **166 files / 874 tests passed.**
  (`log-game-import-shell.test.tsx` is load-flaky under full parallelism but
  passes in isolation; run single-threaded — see `flaky-import-shell-test`.)
- `next lint`: exit 0 with the four pre-existing baseline warnings.
- `next build`: 32/32 pages, `ƒ Middleware` present.
- `git diff --check`: clean.
- Executable migration tests: passed.

## Production status

**All four gated production mutation groups are applied and verified**
(2026-07-19, user-approved). Live ledger: `20260719191911` privacy,
`20260719192054` event contract, `20260719192148` objective aliases (SQL
byte-identical to the committed repo files; ledger versions differ from
filenames — expected drift). Verified live: `player_private_identities` is in the
`private` schema and `authenticated` cannot select it or `player_import_aliases`;
6 unlinked `display_name` + generated `normalized_display_name` neutralized; 22
linked players unchanged; 23 colonies; 7 objective aliases; `game_log_events` has
the 11 typed columns with `reviewed` confidence and validated placement/colony
constraints. Placement backfill: 1500 tile events fully typed, 1467 player + 1467
game-player attributions, 33 unresolved (null), 100 grid / 1400 flat, 0 owner
fields, non-tile events untouched, 42 games unchanged, idempotency re-run zero
diffs. Security advisors show no new regression attributable to the remediation
(the one ERROR, `security_definer_view public.game_log_import_integrity_audit`,
is pre-existing and unrelated). No application push or deployment occurred.
Reports: `docs/redesign/reports/phase-04-step-03-placement/` (separate dry-run
and production artifacts).

## Limitations

- Registration-time claiming is out of scope and unimplemented.
- Final Venus scale is preserved only from trusted evidence; the accepted PDF
  does not print it, so it stays null.
- Neutral labels apply to **all** unlinked players (including username guests),
  so the import roster dropdown cannot distinguish guests by name; guests are
  resolved by entering a username/personal name (server-side matching) — a
  deliberate privacy trade-off.
- No real Venus/Colonies-positive export fixture exists (documented in
  `FIXTURES.md`).

## Exact next action

Repository remediation and all four production mutation groups are complete and
verified (see Production status). The exact next action is to **run a fresh
independent read-only Phase 4 Step 4.3 closure audit.** Do not self-approve Step
4.3 and do not begin Step 4.4 until that audit returns PASS (or PASS WITH
NON-BLOCKING FINDINGS) and explicitly permits Step 4.4. No application push or
deployment is authorized.
