# Hybrid Card Score Import Design

**Goal:** Extend the Terraforming Mars web import flow so imported logs and screenshots can automatically calculate endgame VP from cards using curated rules first, OCR-derived card-rule parsing as a fallback, and explicit user review for any partial or ambiguous result.

## Product Rules

1. Imported evidence is treated as authoritative when it includes a pasted game log plus screenshots the user provides for endgame and board state.
2. Card scoring must prefer explicit curated rules stored in the repo over OCR-derived rules.
3. OCR-derived rule parsing is only used when a played card has no curated scoring rule.
4. OCR-derived rules may be cached by card so repeated imports do not re-read the same card image every time.
5. High-confidence calculated card points may prefill the draft automatically.
6. Partial, ambiguous, or unsupported card scoring must never silently invent points.
7. Any card with incomplete or uncertain scoring must surface in the import review flow with a plain-language reason and require user confirmation or manual correction.
8. The import flow must still succeed when card scoring fails for some or all cards.

## Scope

1. Extend the web import pipeline that currently parses logs, reads screenshots, and builds a reviewable draft.
2. Add support for calculated card-point scoring from:
   - resource-on-card VP cards such as animals and microbes
   - tag-count and similar formula-driven VP cards
   - board-state or opponent-state dependent VP cards when screenshots and parsed evidence are sufficient
3. Keep the work inside the current import and draft review experience rather than creating a separate scoring tool.
4. Add a new review surface for card-score calculations, unresolved cards, and OCR-rule fallbacks.
5. Introduce a cached rule-resolution layer for cards so curated and OCR-derived rules can be reused across imports.

## Out of Scope

1. This design does not auto-promote user-confirmed edits into curated rules in the first version.
2. This design does not require removing existing manual score entry fields from `/log-game`.
3. This design does not attempt to make arbitrary low-quality photo OCR reliable; screenshot-assisted evidence remains the intended path.
4. This design does not require perfect first-pass coverage for every VP card, as long as unsupported or partial cards are surfaced clearly for review.

## User Experience

### Web Import Inputs

1. The web import form continues to accept the pasted exported log.
2. The current endgame screenshot upload remains available for score-row extraction.
3. Add support for one or more board-state screenshots as separate import evidence for card scoring and board-dependent rule evaluation.
4. The form copy should explain that board screenshots help auto-calculate card VP that depends on board layout, adjacencies, or opponent state.

### Import Review

1. Keep the existing review sections for parsed events, player resolution, and screenshot score candidates.
2. Add a `Calculated Card Scoring` review section grouped by player.
3. For each player, show:
   - auto-scored cards with their calculated points and evidence source
   - cards pending review with a concise reason
   - unsupported cards that still need manual handling
4. Example review reasons:
   - `Need board screenshot confirmation for adjacency.`
   - `OCR found multiple plausible VP formulas on this card.`
   - `Missing evidence for opponent tag count.`
   - `Card rule is not curated and OCR confidence is too low to auto-fill.`
5. Fully resolved cards are accepted by default.
6. Partial or ambiguous cards remain visible until the user confirms or overrides them.

### Draft Prefill Behavior

1. Auto-calculated card scoring should prefill only the portions of `playerScores` that are supported with high confidence.
2. Supported subfields such as `cardPointsAnimals`, `cardPointsMicrobes`, and `cardPointsJovian` should continue to prefill individually when they can be derived cleanly.
3. `cardPointsTotal` should only be auto-filled from calculated card scoring when the scorer can account for the full supported card total without unresolved gaps.
4. When only a subset of cards is resolved, the draft should preserve the confirmed subset and keep the unresolved remainder in review rather than collapsing everything into one guessed total.

## Rule Resolution Strategy

1. Resolve scoring rules per card, not per import.
2. Rule source priority:
   - curated in-repo rule definition
   - cached OCR-derived rule for the card
   - fresh OCR/card-image rule parse fallback
3. Curated rules are the trusted source of truth whenever present.
4. OCR-derived rules must include normalized metadata:
   - card id
   - rule source type
   - normalized scoring formula
   - confidence score
   - human-readable explanation
   - parse timestamp
5. OCR-derived rules with low confidence may be kept as review evidence, but they must not become auto-fill rules.
6. Unsupported cards should return a structured `unsupported` result rather than throwing.

## Evidence Extraction Strategy

1. Keep `parseGameLog` focused on extracting raw events and score hints from the imported log.
2. Add a separate evidence-derivation layer that translates imported events and screenshots into card-specific scoring evidence.
3. Evidence derivation should combine:
   - played-card events from the imported log
   - resource add/remove events on cards
   - player tag counts inferred from played cards
   - opponent-state or board-state signals extracted from screenshots when needed
4. The evidence layer should describe what it knows per card, not just per player.
5. When evidence is missing, the scorer should return a structured explanation of the gap instead of guessing.

## Scoring Engine Behavior

1. Score cards one card at a time.
2. Each card evaluation should return one of:
   - `scored`
   - `partial`
   - `ambiguous`
   - `unsupported`
3. `scored` means the rule and evidence were sufficient to compute a trusted point total.
4. `partial` means the rule is known but one or more evidence inputs are missing.
5. `ambiguous` means OCR or evidence produced conflicting interpretations and the system cannot safely auto-fill.
6. `unsupported` means the card rule is still unknown or not usable.
7. Aggregate player card scoring from the individual card results.
8. Only high-confidence `scored` results may change draft values automatically.
9. Partial and ambiguous results must be preserved for review with their reasons and any known partial totals.

## Cache Strategy

1. Cache rule resolution by normalized `card_id`.
2. Cache entries should distinguish `curated` from `ocr` sources.
3. Cached OCR entries should store enough normalized structure to evaluate future imports without re-reading the card image.
4. Cache writes should only occur for valid card ids and normalized formulas.
5. Low-confidence OCR parses should not be promoted to trusted auto-fill cache entries.
6. The cache should support future re-parsing if OCR logic improves, so entries should keep source and timestamp metadata rather than collapsing to a raw number.

## Data and File Boundaries

1. Keep raw log parsing in the current import parser files.
2. Add a dedicated scoring service layer under `src/lib/imports/` for:
   - deriving card-scoring evidence
   - resolving scoring rules
   - evaluating a card against evidence
   - summarizing review output
3. Keep OCR image reading separate from rule evaluation so OCR failures do not contaminate scoring logic.
4. Keep UI review rendering inside the existing import review feature components.

## Primary Code Surfaces

1. `src/app/(app)/log-game/import/page.tsx`
2. `src/features/imports/web-import-page.tsx`
3. `src/features/imports/import-review-panel.tsx`
4. `src/lib/imports/build-import-draft.ts`
5. `src/lib/imports/build-import-review-model.ts`
6. `src/lib/imports/parse-game-log.ts`
7. `src/lib/imports/read-endgame-screenshot.ts`
8. `src/lib/imports/parse-endgame-score-screenshot.ts`
9. New scoring helpers under `src/lib/imports/`
10. Card catalog and card metadata read paths under `src/lib/db/reference-repo.ts` and the catalog import scripts if richer card-rule metadata is needed

## Review and Conflict Policy

1. If calculated card scoring disagrees with screenshot score rows or pasted score hints, the review model should surface the disagreement explicitly.
2. High-confidence agreement should be shown as confirmation evidence, not hidden.
3. When the scorer cannot prove the full card total, it must not overwrite a user-confirmed manual value.
4. The user remains the final authority for partial-coverage cards and ambiguous OCR-derived rules.

## Failure Handling

1. A failure to resolve one card rule must not block the rest of the import.
2. A failure to read a board screenshot must degrade to review-needed status for any dependent cards.
3. A failure in OCR rule parsing must fall back to `unsupported` or `ambiguous`, not to guessed points.
4. The import draft should still save even if all advanced card scoring is skipped.

## Testing

1. Unit tests for curated rule evaluation should cover:
   - animals
   - microbes
   - Jovian or tag-count formulas
   - board-dependent VP rules
   - opponent-dependent VP rules
2. OCR-rule parsing tests should cover:
   - clean recognizable rule text
   - noisy OCR text
   - conflicting OCR outcomes
   - low-confidence parses that must stay review-only
3. Evidence-derivation tests should prove the scorer can build card evidence from:
   - played-card log events
   - resource add/remove log events
   - screenshot-derived board-state evidence
4. Import integration tests should prove:
   - supported cards prefill draft scores
   - partial cards create review items
   - unsupported cards do not invent points
   - cached OCR-derived rules prevent repeated parsing on later imports
5. UI tests should prove the new review panel shows auto-scored cards, pending cards, and reasons before draft confirmation.

## Acceptance Criteria

1. A user can paste a log and attach screenshots, then receive auto-calculated card scoring for supported VP cards.
2. Curated rules always win over OCR-derived rules.
3. OCR-derived card rules may fill the gap for uncurated cards and be cached by card.
4. Partial or ambiguous cards are routed into review instead of silently changing the score.
5. The current import flow still works when no additional card scoring evidence is available.
6. The user can see exactly which card points were calculated, which were not, and why.
