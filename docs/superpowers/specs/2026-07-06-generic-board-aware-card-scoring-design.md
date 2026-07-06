# Generic Board-Aware Card Scoring Engine Design

**Goal:** Extend the Terraforming Mars hosted import flow with a reusable board-aware scoring engine that can evaluate explicit repo rules for board-dependent VP cards and board-derived awards across all three official maps, using the exported log as the primary source and targeted board screenshot confirmation as a narrow secondary source.

## Product Decisions

1. The exported game log remains the primary source of truth for tile placement, milestone claims, funded awards, and explicit award results.
2. The board screenshot is a secondary source used only to answer targeted unresolved board queries, not to replace the log or perform broad autonomous board parsing.
3. The engine should be generic at the board-query and rule-shape level, but the actual supported cards and awards remain explicit repo rules rather than OCR-derived formula discovery.
4. Board-dependent cards and board-dependent awards should use the same shared board evidence context so they can request the same space confirmations and explain unresolved gaps consistently.
5. Milestones remain log-authoritative and are not part of the board-scoring engine.
6. When board evidence is incomplete, the importer must surface review and manual follow-up instead of guessing a score.
7. Review-to-draft navigation must continue to use transient in-app state rather than URL params.

## Scope

1. Add a shared board evidence context built from parsed log events, supported map geometry, and optional targeted screenshot confirmations.
2. Add generic board-aware rule payloads for card and award evaluation.
3. Route board-aware card results through the import card-scoring flow so proved values contribute to card totals and unresolved values remain reviewable.
4. Route board-aware award backfill or cross-check logic through the same board evidence context without disturbing existing explicit award-result imports.
5. Support all three official maps: `tharsis`, `hellas`, and `elysium`.

## Out of Scope

1. No generic OCR formula discovery for arbitrary cards.
2. No full-board screenshot parser that invents placements or owners without targeted queries.
3. No milestone inference from board screenshots.
4. No silent overwriting of explicit parsed award results with screenshot guesses.
5. No URL-based jump state.

## Real-Evidence Constraints

1. The current real evidence already contains trustworthy placement events and setup/play lines in the exported log, so the log should stay first.
2. The current board screenshot evidence is useful for confirming final occupancy on a small set of requested spaces, but it is not a safe source for full ownership inference.
3. The first supported board-aware card family should include cards like `Commercial District`, `Commercial Harbor`, and `Capital`, because they depend on the final board around a placed tile.
4. The board-aware engine should also be usable by map-specific awards when explicit award results are absent and the board can safely prove the outcome.

## Architecture

### 1. Board Snapshot Layer

1. Keep [`src/lib/imports/build-import-board-snapshot.ts`](C:\Users\izzyh\Documents\Terraforming Mars\src\lib\imports\build-import-board-snapshot.ts) as the log-first reconstruction of final occupied spaces.
2. Continue storing per-space occupant facts such as:
   - `spaceId`
   - `tileKind`
   - `ownerPlayerName`
   - `sourceCardName`
   - `sourceType`
   - `confidence`
   - `notes`
3. Expand this layer only as needed to support generic board queries, not to encode card-specific scoring logic.

### 2. Board Evidence Context

1. Add a new shared board evidence context builder under `src/lib/imports/`.
2. The context should combine:
   - the board snapshot
   - supported map geometry and neighbor lookups
   - optional screenshot confirmations keyed by `spaceId`
   - helper functions for typed board queries
3. The context should answer questions like:
   - what occupies `spaceId`
   - what neighbors a `spaceId` has on a given map
   - whether a space is confirmed `city`, `ocean`, `greenery`, `occupied_other`, `empty`, or `unknown`
   - which placed tile was linked to a specific played card
4. The context should return structured proof states rather than booleans so callers can distinguish:
   - proved
   - partially proved
   - review needed
   - conflict

### 3. Generic Board Query Primitives

1. The engine should expose reusable primitives instead of hard-coding `Commercial District`-style logic in one function.
2. Initial query primitives should include:
   - `resolvePlacedTileByCard(cardName, playerName)`
   - `countAdjacentMatchingTiles(spaceId, tileKinds[])`
   - `countOwnedMatchingTiles(playerName, tileKinds[])`
   - `classifySpace(spaceId)`
   - `getSpacesInRegion(regionId)`
3. These primitives should carry:
   - proved numeric result when complete
   - requested unresolved `spaceIds`
   - explanatory notes
   - conflict state when evidence disagrees

### 4. Rule Registry

1. Add a board-aware rule registry with explicit repo-defined rules.
2. The registry should be generic in shape, but curated in membership.
3. Card rules should declare:
   - target card name
   - where the scoring tile comes from
   - which board query primitive to run
   - how points are derived
   - how unresolved evidence should be described
4. Award rules should declare:
   - target award name
   - map id
   - board query primitive or aggregate
   - when explicit award results should win over board derivation

## Rule Shapes

### Board-Aware Card Rules

1. The first generic card rule shape should be:
   - `adjacent_tile_count_from_placed_tile`
2. This covers:
   - `Commercial District`: adjacent cities to the city tile placed by the card
   - `Capital`: adjacent oceans to the city tile placed by the card
   - `Commercial Harbor`: adjacent oceans to the city tile placed by the card
3. Additional card rule shapes can be added later without changing the board evidence context contract.

### Board-Aware Award Rules

1. Awards should remain separate from card scoring, but use the same board evidence context.
2. Example shapes:
   - count matching owned tiles
   - count owned tiles in a map region
   - count spaces meeting a map-specific adjacency or area rule
3. Explicit parsed award results still take precedence when present.

## Map Support

1. The engine must support `tharsis`, `hellas`, and `elysium`.
2. Map geometry should remain explicit repo data, not screenshot-derived.
3. Map-specific award rules should be keyed by `mapId`.
4. Reserved or named spaces such as `Noctis City` handling should remain encoded in map definitions or rule metadata, not hidden in card-specific branches.

## Screenshot Confirmation Flow

1. Board-aware rules run in two passes:
   - first pass: log-only board context
   - second pass: log plus targeted screenshot confirmations for unresolved spaces
2. The screenshot reader should only be asked about spaces the rules actually need.
3. If requested spaces remain `unknown`, `inconclusive`, or `conflict`, the result must stay review-only.
4. The engine should never request broad "read the whole board" confirmation.

## Integration With Card Scoring

1. Extend [`src/lib/imports/card-scoring/card-scoring-types.ts`](C:\Users\izzyh\Documents\Terraforming Mars\src\lib\imports\card-scoring\card-scoring-types.ts) with board-aware rule payloads and board-review metadata.
2. Extend [`src/lib/imports/card-scoring/calculate-import-card-scores.ts`](C:\Users\izzyh\Documents\Terraforming Mars\src\lib\imports\card-scoring\calculate-import-card-scores.ts) so it can consume:
   - existing resource/tag/self-tile evidence
   - shared board evidence context
   - board-aware rules
3. Proved board-aware card scores should land in normal card-scoring summaries.
4. Unresolved board-aware card scores should become pending review items with enough metadata to support manual follow-up.
5. The existing curated board item flow can remain temporarily as an adapter, but the end state is that board-aware card VP is produced by the main card-scoring engine.

## Integration With Awards

1. Existing parsed `award_funded` and `award_result` events remain authoritative inputs.
2. If `award_result` is present, it should be imported as-is and the board-aware layer may only produce consistency notes or no-op confirmation.
3. If `award_result` is absent and the award rule is board-derivable, the engine may attempt to prove first and second place from the board evidence context.
4. If proof is incomplete, the importer should surface review-needed award items rather than inventing winners.

## Review UX

1. Import review should present unresolved board-aware cards and awards with:
   - item label
   - player or funded-by player
   - reason
   - evidence summary
   - `Fill manually` action
2. The saved draft flow should continue to jump to the relevant score area and highlight the unresolved item without modifying the URL.
3. The language should explicitly say the value was not read or not fully proved and still needs manual entry.

## Failure Rules

1. If a card cannot be linked safely to a placed scoring tile, it becomes review-needed.
2. If a required adjacent or regional space is unresolved after targeted screenshot confirmation, it becomes review-needed.
3. If screenshot confirmation conflicts with log reconstruction, it becomes review-needed with conflict notes.
4. If an award result is explicit in the log, board inference must not replace it.

## Code Surfaces

1. `src/lib/imports/build-import-board-snapshot.ts`
2. New board evidence context helpers under `src/lib/imports/`
3. `src/lib/imports/board-space-maps.ts`
4. `src/lib/imports/read-board-screenshot-space-confirmations.ts`
5. `src/lib/imports/card-scoring/card-scoring-types.ts`
6. `src/lib/imports/card-scoring/calculate-import-card-scores.ts`
7. `src/lib/imports/card-scoring/score-card-from-evidence.ts`
8. Existing import review and draft-prefill builders

## TDD Rollout

1. Red tests for generic board query primitives on all three maps.
2. Red tests for board-aware card rules:
   - `Commercial District`
   - `Capital`
   - `Commercial Harbor`
3. Red tests for two-pass resolution:
   - log-only partial proof
   - targeted screenshot confirmation completes proof
   - targeted screenshot confirmation remains inconclusive
4. Red tests for award consumption of the same board evidence context.
5. Red tests that milestone import behavior remains unchanged and log-authoritative.
6. Green implementation in minimal slices, followed by refactor after each slice stays green.

## Testing Strategy

1. Unit tests for board context and query primitives.
2. Unit tests for board-aware rule registry evaluation.
3. Unit tests for card-scoring integration and pending review output.
4. Unit tests for award backfill and explicit-result precedence.
5. UI tests for unresolved review items and jump/highlight behavior.
6. Verification should include focused Vitest, `npx.cmd tsc --noEmit --pretty false`, and `git diff --check` on touched files.

## Acceptance Criteria

1. The engine can score supported board-aware cards from explicit repo rules without card-specific imperative branches scattered through the importer.
2. `Commercial District`, `Capital`, and `Commercial Harbor` can all be handled through the same generic board-aware rule shape.
3. The engine can request only the unresolved spaces it needs from the board screenshot confirmer.
4. Board-aware awards can consume the same evidence context without changing milestone behavior.
5. Unresolved or conflicting board evidence stays review-only and supports manual-fill jump/highlight.
6. All three official maps remain supported through explicit map data and rule metadata.
