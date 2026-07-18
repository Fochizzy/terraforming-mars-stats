# Phase 4, Step 4.3 upstream catalog and map reconstruction handoff to Claude

Date: 2026-07-18  
Branch: `redesign/tm-stats-dashboard-rebuild`  
Worktree baseline: `cc03d145f36893b600182ba4db8132d6492be57d`  
Status: active and incomplete; do not call Step 4.3 complete yet

## Current explicit assignment

Continue only Phase 4, Step 4.3. The user expanded the step with these requirements:

1. build imported maps from ordered game-log tile evidence;
2. recognize every current special tile, including Moon tiles;
3. keep randomized objectives independent from map inference;
4. check `https://terraforming-mars.herokuapp.com/cards#~trbgpcseCmalt` for new cards automatically;
5. make the existing Cards page update from that shared catalog automatically; and
6. store all card and tile reference data in Supabase.

Venus/Colonies analytics and new board statistics may follow after this step. Do not begin Phase 4 Step 4.4, Step 4.5, or Phase 5. Do not push or deploy unless the user explicitly expands authority.

## Required project reading

Re-read in the documented authority order before editing:

1. the current user assignment;
2. `docs/REDESIGN_STATE.md`;
3. `docs/redesign/PHASE-04-GAME-LOGGING-EXPERIENCE.md` and the exact Step 4.3 prompt;
4. `docs/redesign/DECISIONS.md`;
5. this handoff and the previous Step 4.3 handoff;
6. `docs/redesign/MASTER-RULES.md`; and
7. `docs/redesign/MASTER-PLAN.md`.

Preserve the existing dirty worktree. It contains the large in-progress Step 4.3 implementation and must not be reset or overwritten.

## Live Supabase work already completed

Project: `tm-stats` / `qjtwgrjjwnqafbvkkfex`.

Two migrations were applied successfully:

- remote version `20260718154209`, `sync_upstream_cards_and_tile_catalog`;
- remote version `20260718154932`, `reconcile_upstream_card_identities`.

Their local files are:

- `supabase/migrations/20260718114500_sync_upstream_cards_and_tile_catalog.sql`;
- `supabase/migrations/20260718120000_reconcile_upstream_card_identities.sql`.

The first migration:

- creates `public.terraforming_mars_tile_types`;
- seeds all 45 current upstream `TileType` values, numeric IDs `0..44`;
- includes all 42 special types and all 7 Moon types;
- enables RLS and grants authenticated read access only;
- adds `cards.last_synced_at`; and
- removes unsafe NOT NULL/default-zero behavior from deployed card global-effect columns when those columns exist, so future unproven effects can remain null.

The second migration is deliberately non-deleting and reversible:

- adds `cards.is_catalog_visible` and `cards.superseded_by_card_id`;
- preserves 53 identity-mismatch rows as audit evidence;
- links each to its one exact historical retained identity; and
- hides only those superseded rows from current catalog consumers.

An attempted direct deletion of the 53 new duplicate rows was rejected by the production safety reviewer. No rows were deleted. Do not retry deletion. The reversible supersession model is the accepted safe state.

One first attempt of the reconciliation migration failed on unsupported `min(uuid)` and rolled back transactionally. The local migration was corrected to `(array_agg(uuid))[1]`, retested, and then applied successfully.

## Live upstream sync and verified database state

The live upstream Cards site is client-rendered. There is no stable JSON endpoint. The implementation:

1. reads `/cards` to discover `main.js`;
2. discovers numeric webpack dependencies from the runtime instead of hard-coding chunk `756`;
3. scans candidate chunks for a generated `JSON.parse('...')` payload without evaluating JavaScript;
4. validates a card-array shape and minimum size;
5. preserves each exact raw manifest record in `cards.sync_metadata.upstream.rawManifest`;
6. upserts normalized lookup fields while preserving curated existing metadata and effect evidence;
7. keeps source records absent upstream rather than deleting them; and
8. writes a `catalog_snapshots` row after successful card and tile upserts.

The publisher was run twice. The corrected final snapshot is:

- snapshot ID `a63ac3f9-4725-49f5-a967-04899ad52c19`;
- 996 upstream cards discovered and synchronized;
- 45 tile definitions synchronized.

Final live verification:

- 1,143 total retained card rows;
- 1,090 visible catalog rows;
- 53 superseded audit rows with `superseded_by_card_id`;
- 996 visible rows retain exact raw upstream manifests;
- 0 visible duplicate-name groups;
- 45 tile types;
- 42 special tile types;
- 7 Moon tile types.

The existing Cards page already reads `listCardLookupRecords()` from Supabase and builds type/expansion filters dynamically. `src/lib/db/reference-repo.ts` now filters `is_catalog_visible = true`, so the Cards page automatically reflects visible synchronized data without a Phase 5 UI redesign.

Automation is defined in `.github/workflows/sync-terraforming-mars-catalog.yml` and runs daily plus `workflow_dispatch`. It needs repository secrets `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the branch that owns scheduled workflows. The service-role credential is server/automation-only. The workflow is not active until the change is merged/pushed; no push or deploy occurred here.

## New catalog implementation files

- `scripts/catalog/terraforming-mars-upstream.ts`
- `scripts/catalog/terraforming-mars-upstream.test.ts`
- `scripts/catalog/sync-terraforming-mars-upstream.ts`
- `scripts/catalog/sync-terraforming-mars-upstream.test.ts`
- `.github/workflows/sync-terraforming-mars-catalog.yml`
- `supabase/migrations/20260718114500_sync_upstream_cards_and_tile_catalog.sql`
- `supabase/migrations/20260718120000_reconcile_upstream_card_identities.sql`
- `supabase/tests/upstream-card-tile-catalog-migration.test.ts`
- `supabase/tests/reconcile-upstream-card-identities-migration.test.ts`
- `package.json` adds `catalog:sync:upstream`.

Use `npm.cmd run catalog:sync:upstream` for a live, non-writing dry run. Publishing requires `-- --publish` plus server credentials.

## Tile parsing and board reconstruction already implemented

The current upstream tile registry was audited at upstream commit `7a6f98f09ac2a558969c092d317c313806af7b73`.

New files:

- `src/lib/imports/terraforming-mars-tile-types.ts`
- `src/lib/imports/terraforming-mars-tile-types.test.ts`
- `src/lib/imports/parse-terraforming-mars-tile-actions.ts`
- `src/lib/imports/parse-terraforming-mars-tile-actions.test.ts`
- `src/lib/imports/build-imported-board-state.ts`
- `src/lib/imports/build-imported-board-state.test.ts`

Behavior already covered by focused tests:

- all 45 current labels resolve, including every special and Moon tile;
- both current `at NN` and historical `on row R position P` formats parse;
- Moon IDs remain a distinct `mNN` board layer;
- placement and removal actions retain source line order;
- canonical tile code/name, raw tile label, board, actor, and format are retained;
- unknown future labels remain visible with `isKnownTileType: false`;
- final board state is reconstructed from ordered actions; and
- placement/removal conflicts remain reviewable instead of being discarded.

`src/lib/imports/build-terraforming-mars-log-events.ts` now supports optional tile actions and emits `tile_placed` / `tile_removed` events into existing `board_space` and `tile_type` RPC fields. The import server does not pass tile actions yet; that is an immediate next task.

## Map and randomized-objective work in progress

New modules:

- `src/lib/imports/objective-configuration.ts`
- `src/lib/imports/detect-import-board-map-independent.ts`
- `src/lib/imports/detect-import-board-map-independent.test.ts`
- existing `map-ocean-fingerprints.ts` and tests are still present.

The independent detector enforces:

- board geometry/ocean evidence is the map signal;
- randomized objectives are never used to infer a map;
- confirmed board-defined objectives may disambiguate identical or sparse ocean evidence;
- Hollandia is supported when randomized objectives are confirmed;
- Hollandia plus board-defined objectives is a conflict; and
- no unresolved evidence silently defaults to Tharsis.

`src/features/imports/web-import-page.tsx` is partially converted:

- imports the independent detector;
- parses tile actions and reconstructs board state;
- stores an explicit objective-configuration state with default `unknown`;
- allows global milestone/award correction options in randomized mode;
- exposes all maps, including Hollandia;
- adds the required objective-setup selector;
- shows tile-action/space/unknown/conflict counts; and
- validates random objectives against global objective catalogs.

This client integration is incomplete and has not been tested end to end.

`src/app/(app)/log-game/import/page.tsx` still uses the old objective-only `detectImportMapFromObjectiveEvidence`, still rejects randomized maps/objectives, and does not pass tile actions to `buildTerraformingMarsLogEvents`. Convert this server path before trusting the UI or allowing saves.

`src/lib/imports/build-import-draft.ts` and `src/lib/validation/log-game.ts` were just extended with `objectiveConfiguration`, but call sites and tests have not been repaired yet.

## Immediate next implementation steps

1. Finish the authoritative server conversion in `src/app/(app)/log-game/import/page.tsx`:
   - parse `tileActionSet` from `values.exportedGameLog`;
   - build the reconstructed board;
   - call `detectImportBoardMapIndependent` with `values.objectiveConfiguration`;
   - require objective configuration not `unknown` before save;
   - allow every map, including Hollandia;
   - reject only true detector conflicts or a confident detected-map mismatch;
   - validate randomized objectives against `allMilestones` / `allAwards` and board-defined objectives against map relationships;
   - pass `tileActionSet.actions` to `buildTerraformingMarsLogEvents`; and
   - persist objective configuration, ordered tile actions, reconstructed board, unknown count, and conflicts in `confidenceSummary`.
2. Repair `LogGameDraftInput` call sites. Manual entry should explicitly use `board_defined`; imported legacy/unknown evidence should remain `unknown` until reviewed. Do not simply erase the field to make TypeScript pass.
3. Add `allAwards` and `allMilestones` to reference-catalog test fixtures. Derive them from relationship fixtures where possible.
4. Confirm all randomized objective options are visible in the wizard/import review and server revalidation uses the same scope.
5. Decide whether to retire the older objective-only detector or keep it only as historical test coverage. Do not leave the active server using it.
6. Add privacy-sanitized real export fixtures for current flat IDs and historical grid coordinates; label synthetic random-objective fixtures as synthetic.
7. Complete the required governance docs and capability matrices described below.
8. Only after code and docs stabilize, inspect and apply the separately authorized guest-identity/privacy migration.

## Current TypeScript failures

`npx.cmd tsc --noEmit` currently fails. The errors are bounded and expected from the partial integration:

- missing required `objectiveConfiguration` in:
  - `src/app/(app)/log-game/page.tsx`;
  - `src/features/games/log-game/log-game-draft.test.ts`;
  - `src/features/games/log-game/log-game-wizard.test.tsx` helper typing;
  - `src/lib/db/game-draft-repo.test.ts`;
  - `src/lib/db/log-game-player-resolution.test.ts` helper typing.
- missing `allAwards` / `allMilestones` in fixtures in:
  - `src/features/imports/log-game-import-shell.test.tsx`;
  - `src/features/imports/web-import-page.test.tsx`;
  - `src/lib/imports/detect-import-board-map.test.ts`;
  - `src/lib/imports/parse-terraforming-mars-log.test.ts`;
  - `src/lib/imports/parse-terraforming-mars-played-entities.test.ts`;
  - `src/lib/imports/parse-terraforming-mars-result-pdf.test.ts`.

`git diff --check` reported line-ending warnings only; no whitespace errors were shown.

## Focused tests already passing

These were run successfully during this handoff period:

```text
npm.cmd test -- scripts/catalog/terraforming-mars-upstream.test.ts scripts/catalog/sync-terraforming-mars-upstream.test.ts
  2 files, 8 tests passed

npm.cmd test -- scripts/catalog/terraforming-mars-upstream.test.ts scripts/catalog/sync-terraforming-mars-upstream.test.ts supabase/tests/upstream-card-tile-catalog-migration.test.ts
  3 files, 9 tests passed

npm.cmd test -- scripts/catalog/sync-terraforming-mars-upstream.test.ts supabase/tests/reconcile-upstream-card-identities-migration.test.ts supabase/tests/upstream-card-tile-catalog-migration.test.ts
  3 files, 6 tests passed

npm.cmd test -- src/lib/imports/terraforming-mars-tile-types.test.ts src/lib/imports/parse-terraforming-mars-tile-actions.test.ts src/lib/imports/build-imported-board-state.test.ts
  3 files, 12 tests passed

npm.cmd test -- src/lib/imports/build-terraforming-mars-log-events.test.ts src/lib/imports/parse-terraforming-mars-tile-actions.test.ts src/lib/imports/build-imported-board-state.test.ts
  3 files, 9 tests passed

npm.cmd test -- src/lib/imports/detect-import-board-map-independent.test.ts src/lib/imports/parse-terraforming-mars-tile-actions.test.ts
  2 files, 10 tests passed

npm.cmd run catalog:sync:upstream
  dry run: 996 cards, 45 tiles
```

Full `npm test`, lint, build, and final typecheck have not passed yet. Do not create a completion commit until all required validation succeeds.

## Reference-catalog gaps that remain explicit

The live database currently has the seven abbreviated objectives needed by existing supported fixed boards, but the earlier audit found seven upstream expansion milestones missing from the local/live objective catalog:

- Hoverlord;
- Networker;
- Purifier;
- One Giant Step;
- Lunarchitect;
- Risktaker;
- Tunneler.

Do not invent IDs or aliases. Keep these as explicit catalog gaps until an exact source-backed objective sync/migration is approved and implemented.

The user said Venus/Colonies may be addressed after this step. Do not start unrelated analytics now.

## Required documentation before Step 4.3 can close

Add the requested durable sections:

- `docs/redesign/MASTER-RULES.md`
  - `Upstream Terraforming Mars source-authority contract`
  - `Export-format governance`
  - `Map and objective interpretation`
- `docs/redesign/DATA-CAPABILITIES.md`
  - real/sanitized fixture matrix;
  - map capability matrix for every supported map;
  - board-defined versus randomized objectives;
  - current/historical/partial/malformed formats;
  - language support marked evidence-based, never fabricated.
- `docs/redesign/DECISIONS.md`
  - upstream exports and rulebooks as authority;
  - map signal precedence;
  - randomized objectives never infer a map;
  - shared Supabase catalog and automatic Cards-page update contract.
- `docs/REDESIGN_STATE.md`
  - current live migrations/snapshots;
  - active blockers and next step.
- `docs/redesign/MASTER-PLAN.md`
  - update only durable project-wide catalog/map architecture, not temporary debugging notes.

Create the final Step 4.3 handoff only after required tests, typecheck, lint, build, docs, and the exact scoped diff are complete.

## Identity/privacy migration remains unapplied

`supabase/migrations/20260718050924_claimable_guest_identity_privacy.sql` and its test are still local/untracked. Despite earlier user authorization to apply it, it was not applied in this continuation. The live migration list ends with the two catalog migrations above; there is no `claimable_guest_identity_privacy` entry.

Before applying it:

1. read the entire SQL and static test;
2. run its focused tests;
3. verify interaction with the new tile event types/codes;
4. apply with the Supabase migration tool;
5. run focused live verification; and
6. re-run security and performance advisors.

Do not run a production identity backfill.

## Tooling caveat

The Windows sandbox ACL helper currently prevents `apply_patch` from updating existing files (`apply deny-read ACLs`). New files can be added with `apply_patch`. Existing-file changes in this session were made as explicit unified diff files under `.tmp/`, then checked with `git apply --check` and applied with `git apply`. Some hunks required at least one context line even when the removed block matched exactly.

Remove the `.tmp/` patch artifacts before final completion. Do not delete other untracked Step 4.3 work.

## Stop conditions

Do not:

- reset or clean this worktree;
- delete the 53 superseded catalog audit rows;
- expose a service-role key to browser code;
- treat absent upstream card effects as zero;
- infer randomized objectives from map defaults;
- infer a map from randomized objectives;
- invent aliases, cards, objectives, tiles, or analytics;
- apply the identity migration without the checks above;
- begin another redesign step; or
- push/deploy without explicit user authority.
