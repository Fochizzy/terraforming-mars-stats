# Phase 4 · Step 4.3 — Import Validation, Evidence, and Claimable Guest Identity (remediation handoff)

## Status

**Step 4.3 is ACTIVE.** The bounded remediation of the independent closure
audit's blocker and high findings (F-01 – F-10) is **repository-complete** across
five focused commits. The **production migrations and the historical placement
backfill are prepared, executable-tested, and dry-run analyzed, but are NOT yet
applied to production** — they are gated on explicit per-mutation authorization.
Do not mark Step 4.3 complete. Do not begin Step 4.4.

Baseline HEAD: `b0deed8c` · Remediation commits: `cfafd823` → `6e6e1859`.

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

**No production mutation has occurred in this remediation.** The private
identity table is still in `public` (0 rows), the objective aliases are absent
(0/7), the typed placement columns and colony catalogue do not yet exist, and no
placement is backfilled. All four mutation groups are prepared and gated.

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

1. Apply the four gated production mutation groups, each with the required
   protocol (exact SQL, affected tables, expected rows, rollback, re-run
   preflight, stop conditions): (1) privacy migration `212339`; (2) event
   contract migration `212340`; (3) objective alias migration `212342`; (4) the
   1500-row placement backfill (after `212340`), producing its separate
   production report.
2. Run the post-mutation postconditions and the idempotency re-check.
3. Reconcile `docs/REDESIGN_STATE.md` and this handoff with the applied state.
4. **Request a fresh independent read-only Phase 4 Step 4.3 closure audit.** Do
   not self-approve Step 4.3 and do not begin Step 4.4 until that audit returns
   PASS (or PASS WITH NON-BLOCKING FINDINGS) and explicitly permits Step 4.4.
