# Curated Board Evidence Import Design

**Goal:** Extend the Terraforming Mars hosted import flow so curated board-dependent VP cards and placement-based awards can be proven from the exported log first, confirmed or narrowly backfilled from the board screenshot when needed, and surfaced for manual review when evidence is incomplete.

## Product Decisions

1. The exported game log is the primary source of truth for who placed which tile on which space.
2. The board screenshot is a secondary evidence source used only to confirm final occupancy or fill narrow curated gaps.
3. The first version is curated only. It must not attempt generic board parsing or OCR-derived card-rule discovery.
4. The first version should cover the cards and award patterns present in this evidence plus closely related query shapes that can be implemented reliably.
5. When the importer cannot fully prove a board-dependent card or award outcome, it must prefill only the proven portion and route the rest into review.
6. Review should let the user jump into the saved draft and highlight the unresolved card or score field without encoding that jump state in the URL.

## Scope

1. Reconstruct final board occupancy from imported log placement events.
2. Add a narrow board-screenshot confirmation layer for curated spaces and tile queries.
3. Add a curated rule registry for board-dependent card VP and placement-based award evaluation.
4. Extend import review so unresolved board-dependent items are visible, explainable, and actionable.
5. Add jump-and-highlight behavior from import review into the draft score entry flow for unresolved manual follow-up.

## Out of Scope

1. No generic full-board image parser in this pass.
2. No OCR-based card text or formula discovery in this pass.
3. No attempt to infer hidden or ambiguous tile ownership from the screenshot alone.
4. No silent overwriting of user-confirmed manual values when board proof is partial.
5. No URL query params or fragment identifiers for review jump state.

## Real-Evidence Boundaries

1. The imported log already contains tile placements such as `city tile at 14`, `Mining Area tile at 21`, `Restricted Area tile at 10`, `Noctis City` followed by `city tile at 31`, and award funding events such as `funded Miner award`.
2. That means the first implementation should treat the log as the main board reconstruction source and only ask the screenshot to resolve targeted questions the log cannot fully settle.
3. Some played cards in this evidence are important because they place named or generic tiles that later affect adjacency, occupancy, or awards even when they are not themselves VP cards.
4. Placement-based awards should stay log-authoritative when explicit award results already exist. Board evidence is only needed for curated backfill or cross-check behavior when those results are missing or suspect.

## Board Evidence Model

1. Add a dedicated board-evidence snapshot builder under `src/lib/imports/`.
2. The snapshot should normalize final space state for each occupied space:
   - `spaceId`
   - `tileKind` such as `city`, `greenery`, `ocean`, or named special tile
   - `ownerPlayerName`
   - `sourceType` such as `log_explicit`, `log_inferred`, or `screenshot_confirmed`
   - `sourceCardName` when a placement can be linked to a card
   - `confidence`
   - `notes` for unresolved linkage or conflicts
3. The snapshot builder should consume parsed placement events rather than reparsing the raw log in multiple places.
4. When a named tile placement appears directly in the log, it should be captured as explicit evidence.
5. When the log shows a generic placement immediately after a card play that clearly created it, the builder may link that placement to the card as inferred evidence.
6. When multiple plausible source cards or actions could explain the same placement, the builder must leave the linkage unresolved instead of guessing.

## Screenshot Authority Rules

1. The screenshot confirmer should answer narrow curated questions, not attempt full autonomous board understanding.
2. Allowed screenshot uses:
   - confirm whether a specific space is occupied in the final board state
   - confirm the visible tile class on a specific curated space when the log linkage is incomplete
   - confirm a small set of adjacent spaces needed for a curated card or award query
   - flag a mismatch when the screenshot appears to contradict the reconstructed log snapshot
3. Disallowed screenshot uses:
   - invent a missing placement when the space identity itself is unknown
   - choose among multiple plausible owners when color or label evidence is weak
   - replace a clear log placement with a contradictory guess
   - auto-score an uncurated rule
4. If screenshot confirmation is inconclusive, the item remains review-needed.

## Curated Rule Registry

1. Add a curated registry of board-dependent scoring rules under `src/lib/imports/`.
2. Each rule should declare:
   - target type: `card` or `award`
   - target name
   - required evidence queries
   - how to compute a proved value
   - how to describe unresolved gaps
   - where the result should land in the draft or review model
3. The first batch should prioritize:
   - adjacency-to-city style VP cards such as `Commercial District`
   - board-dependent cards in this evidence or close siblings that use the same space-adjacency query shape
   - placement-based awards whose winner can be derived from occupied spaces on a supported map
4. Cards that mainly matter because they place evidence-producing tiles, such as named area or city placements, should be modeled as board-evidence producers even if they are not direct VP targets.
5. Each curated rule must be explicit repo logic, not a free-text formula parser.

## Query Shapes for the First Slice

1. `adjacentCityCount(spaceId)` for cards like `Commercial District`.
2. `spaceOccupant(spaceId)` and `tileKindAt(spaceId)` for named-space or reserved-space checks.
3. `placedTileByCard(cardName, playerName)` for cards whose score depends on the specific tile they created.
4. `ownedTilesInAwardRegion(playerName, regionId)` or equivalent map-specific region queries for supported placement-based awards.
5. `cityCountByPlayer`, `greeneryCountByPlayer`, or other simple board aggregates only when the award or curated rule truly depends on them and they are derivable from the reconstructed board.

## Award Handling

1. Existing parsed award events remain the first-class source for funded-award presence.
2. If a funded award already has an explicit parsed result, the importer should keep that result and may only use board evidence as a consistency check.
3. If a funded award is board-dependent and its winner is missing or ambiguous, the curated award rule may attempt to prove the outcome from the board snapshot.
4. If the outcome cannot be proven safely, the importer should create a review item instead of assigning award points automatically.

## Review Model Changes

1. Extend the import review model with a dedicated curated board evidence section grouped by player.
2. Each review item should include:
   - `targetType`
   - `targetName`
   - `playerName`
   - `status` such as `scored`, `partial`, `review_needed`, or `conflict`
   - `provedValue` when available
   - `reason`
   - `evidenceSummary`
   - `jumpTarget`
3. Example reasons:
   - `Commercial District was played, but its placed space could not be linked from the log.`
   - `Adjacent city count is incomplete because board confirmation for spaces 30 and 31 was inconclusive.`
   - `Miner award was funded, but the supported board query could not prove the winner.`
4. Review items should remain visible even when some other score evidence already exists so the user can see exactly what was and was not auto-read.

## Draft Prefill Rules

1. Proven curated card VP may contribute to `cardPointsTotal` only when the relevant card result is fully proved.
2. Proven placement-based award results may contribute to `awardPoints` only when the funded award winner is fully proved or explicitly parsed already.
3. Partial results should store the evidence and reason but must not invent a numeric remainder.
4. If the importer can prove some board-dependent items and not others, it should prefill the proved subset and leave the unresolved subset for review.

## Jump and Highlight Behavior

1. The import review UI should expose a `Fill manually` action for unresolved curated board items.
2. That action should navigate into the saved draft flow and focus the relevant player score area.
3. The unresolved item should be highlighted with copy that makes it clear the card or award was not read and still needs manual entry.
4. Jump state should be carried through in-app saved draft state, session storage, or equivalent local transient state, not through the URL.
5. The highlight should clear after the user interacts or after the draft view stabilizes so it does not become permanent UI clutter.

## Code Surfaces

1. `src/lib/imports/build-import-review-model.ts`
2. `src/lib/imports/build-import-draft.ts`
3. Existing import parser files that already emit tile placement and award events
4. New board-evidence helpers under `src/lib/imports/`
5. `src/features/imports/import-review-panel.tsx`
6. The draft score-entry flow under `src/features/games/log-game/`

## Testing Strategy

1. Unit tests for board snapshot reconstruction from parsed placement events:
   - explicit named tile placements
   - generic city or greenery placements linked to the triggering card when safe
   - unresolved linkage when multiple explanations are possible
2. Unit tests for curated board queries:
   - adjacent city counts
   - space occupancy lookups
   - award-region or board aggregate queries for supported awards
3. Screenshot confirmation tests:
   - confirm a targeted curated space from the real board screenshot fixture
   - return inconclusive when the image does not safely answer the query
   - surface conflicts when screenshot evidence disagrees with log reconstruction
4. Import review model tests:
   - fully proved curated item becomes `scored`
   - partially proved item becomes `review_needed`
   - award cross-check stays review-only when the winner is not provable
5. UI tests:
   - unresolved curated board items render in import review
   - `Fill manually` stores jump state without modifying the URL
   - the draft score view highlights the intended unresolved item

## Acceptance Criteria

1. The importer can reconstruct the final board snapshot from the exported log for the real evidence game.
2. A curated board-dependent card such as `Commercial District` can be scored automatically when the log and targeted board confirmation fully prove its adjacency count.
3. Cards or awards that cannot be fully proved are surfaced for manual review with a plain-language reason.
4. Proven board-dependent results prefill the draft without inventing unresolved values.
5. The review flow can jump into the draft and visibly highlight the unresolved card or score field without using a URL-based mechanism.
