# Phase 4, Step 4.3B — Venus Next and Colonies production-gate handoff

Date: 2026-07-18
Branch: `redesign/tm-stats-dashboard-rebuild`
Starting checkpoint: `c9e92f6d2`

## Status

Step 4.3B is complete in the repository and has stopped at the required
production boundary. The migration and historical backfill are prepared,
reviewed, tested, and dry-run against production, but neither was applied.

Step 4.3 remains active until the production gate is resolved. Step 4.4 was not
started. No push or deployment occurred.

Implementation commits:

- `aeebf8b7` — future-import parser, typed events, game-level facts, RLS
  migration, fixtures, and import-path persistence;
- `cef2ff1d` — historical verifier, gated backfill script, and first read-only
  production reports;
- `41bc1221` — correct zero-change verification for a later rerun; and
- `e88fc25f` — before/after fingerprints proving unrelated historical game data
  remains unchanged during an authorized backfill.

## User clarification applied

For a complete exported log, zero supported Venus events records Venus Next as
`confirmed_absent` (No), and zero supported Colony events records Colonies as
`confirmed_absent` (No). A partial log remains `incomplete_evidence`; an
unsupported or conflicting log retains that explicit state.

No manual Venus/Colonies setup, tracker, action, correction, activation, or
deactivation control was added. `confirmed_absent` is already the persisted No /
inactive state. This preserves the assignment's prohibition on manual expansion
fields and does not restore generic gameplay expansion tracking or
`expansionCodes`.

## Parser and event contract

Parser identity:

`terraforming-mars-venus-colonies-v1`

The parser uses exact current upstream messages verified at source commit
`7a6f98f09ac2a558969c092d317c313806af7b73`:

- Venus scale increases/decreases, Rotator Impacts, and World Government;
- Colony setup, construction, trade (resource/card/free variants), and supported
  track movement;
- generation context, stable player ID when explicitly attributable, canonical
  Colony IDs, payment/source details, deterministic event identity, confidence,
  raw evidence, and provenance.

World Government movement remains unattributed and never infers player TR.
Missing before/after/final Venus values remain null. Related Colony/Venus card
names alone never establish expansion presence.

## Fixtures

- `src/lib/imports/fixtures/upstream-venus-colonies-action-fragment.txt` —
  source-backed positive fixture covering setup, construction, trade, track,
  attributed Venus, World Government, and Rotator Impacts.
- `src/lib/imports/fixtures/retained-real-negative-game-2026-07-15.txt` — 704-line
  privacy-sanitized retained real export. It includes related card names and 43
  flat-ID tile placement/removal lines but no Venus/Colony mechanic action.
- `scripts/imports/create-sanitized-retained-log-fixture.ts` — reproducible
  sanitizer; the private source is not committed.

## Schema and RLS

Prepared migration:

`supabase/migrations/20260718185155_add_venus_colonies_import_facts.sql`

It adds:

- `public.game_expansion_facts`, one row per game, containing explicit Venus and
  Colonies detection states, provenance, parser version, source coverage,
  source-log association, nullable final Venus scale, derived counts, and
  backfill metadata;
- typed `game_log_events` columns for stable player ID, Colony ID, event
  identity, parameter movement, source entity, parser version, and provenance;
- deterministic event uniqueness and supporting indexes; and
- an invoker-security replacement for `replace_game_log_events` that preserves
  both old and new fields.

`game_expansion_facts` has RLS enabled, no anonymous table grant, an authenticated
read policy through `can_read_game`, and authenticated writes through
`can_edit_game`. No new view was required.

Static migration coverage:

`supabase/tests/venus-colonies-import-facts-migration.test.ts`

Docker Desktop is not running, so a local `supabase db reset` / executable SQL
migration test was unavailable. Production was not used as a migration test.

## Historical production-parser dry run

Fixed cutoff:

`2026-07-18T00:00:00.000Z`

Read-only command executed:

`node --env-file=.env.local --import tsx scripts/imports/verify-venus-colonies-history.ts`

Results:

| Measure | Count |
| --- | ---: |
| Total historical games | 42 |
| Games with retained complete logs | 42 |
| Games without retained logs | 0 |
| Parser-confirmed Venus absence | 42 |
| Parser-confirmed Colonies absence | 42 |
| Unexpected Venus/Colonies presence | 0 |
| Unexpected Venus/Colony events | 0 |
| Incomplete evidence | 0 |
| Unsupported patterns | 0 |
| Conflicting evidence | 0 |
| Parser exceptions | 0 |
| Duplicate events | 0 |
| Unresolved player associations | 0 |
| Planned insert-only rows | 42 |

Reports:

- `docs/redesign/reports/phase-04-step-03b/venus-colonies-historical-dry-run.json`
- `docs/redesign/reports/phase-04-step-03b/venus-colonies-historical-dry-run.md`

The reports contain aggregate data and game IDs only; no player names or raw log
lines are emitted. Production reported `schemaReady: false` and
`writePerformed: false`.

## Backfill safety

The authorized-write path is default-off and requires both `--write` and the
exact confirmation token. It:

- inserts only games below the fixed cutoff that lack a fact row;
- never upserts or overwrites explicit future-style facts;
- creates no historical event rows and leaves final Venus scale null;
- fails closed on any parser/review blocker;
- verifies expected versus actual persisted rows;
- verifies a second plan contains zero writes, including a later independent
  rerun; and
- fingerprints `games`, imports/events, players, objectives, promo sets,
  Prelude/style/key-card rows, revisions, and result-screenshot records before
  and after the insert, aborting verification if any unrelated data changes.

## Production state and exact next action

The production migration ledger does not contain this migration, and
`public.game_expansion_facts` is absent. No schema or data mutation occurred.

If and only if the user explicitly authorizes production execution:

1. Apply only migration name `add_venus_colonies_import_facts` with the connected
   Supabase migration tool using the exact reviewed migration SQL. Do **not** run
   a broad `supabase db push`; unrelated pending migrations exist.
2. Rerun the read-only command above. Require `schemaReady: true`, 42 eligible
   rows (unless production legitimately changed after the cutoff audit), and all
   blocker counters at zero.
3. Run exactly:

   `node --env-file=.env.local --import tsx scripts/imports/verify-venus-colonies-history.ts --write --confirm=APPLY_PHASE_04_STEP_03B_BACKFILL`

4. Verify expected equals actual, unrelated-data fingerprints match, no event
   rows were created, and a second invocation reports zero newly inserted rows.
5. Update state/handoff with live migration ledger and post-write evidence, mark
   Step 4.3 complete, and set the next action to await explicit Step 4.4
   assignment.

## Verification

Final repository validation after implementation:

- full Vitest suite: 164 files / 862 tests passed;
- `npx.cmd tsc --noEmit`: passed;
- `npm.cmd run lint`: exit 0 with four pre-existing warnings only;
- `npm.cmd run build`: passed, 32/32 pages, middleware present;
- production historical dry run: 42/42, zero blockers, no write; and
- diff whitespace checks: passed.

Known limitation: executable local migration validation remains unavailable
until Docker Desktop is running. Final production application and post-write
verification remain intentionally unperformed pending explicit authorization.

## Scope boundary

The separately gated objective-alias data migration was not implemented or
applied. No Step 4.4/4.5/Phase 5 work, deployment, push, generic expansion
tracking, analytics formula, or unrelated cleanup was performed.
