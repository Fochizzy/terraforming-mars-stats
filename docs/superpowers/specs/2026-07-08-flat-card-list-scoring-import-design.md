# Flat Card List Scoring Import Design

Date: 2026-07-08

## Goal

Make imported Terraforming Mars logs easier to finish by letting the user paste one flat whole-game list of scoring cards, automatically assigning those cards back to players when the imported log proves ownership, learning new scoring rules from OCR when needed, and exposing `Fix rule` in both the website import flow and the app.

## Product Rules

1. The user may optionally paste one flat card list for the whole game during import review.
2. The pasted list is supplemental evidence for endgame card scoring, not a replacement for the imported game log.
3. The app should automatically assign a pasted card to a player only when the imported log proves ownership through explicit played-card evidence.
4. The app must not guess card ownership from weak heuristics when the log does not prove it.
5. When a pasted card resolves to a card with a known scoring rule, that rule should be reused immediately.
6. When a pasted card resolves to a card without a known scoring rule, the app should OCR the card image once, normalize the rule if possible, and cache high-confidence results.
7. Any signed-in user can use `Fix rule`, and their saved correction becomes the global reusable rule for future imports.
8. Newly auto-saved OCR rules should remain visible as auditable review items during the current import, even when they do not block progress.
9. Ambiguous OCR results, ambiguous card matches, duplicate card rows, and ambiguous owner assignment must stay reviewable instead of being silently accepted.

## Recommended Approach

Use a flat pasted list plus exact log assignment plus review fallback.

Why this approach fits:

1. The current imported logs already contain high-signal ownership lines like `Izzy played Project Workshop`, which are strong enough to assign cards safely.
2. A single pasted list is faster for the user than per-player entry.
3. The existing rule cache and OCR scoring pipeline can be reused instead of creating a separate scoring system.
4. Review remains narrow and trustworthy because the app only automates what it can prove.

## User Flow

### Website Import

1. The user uploads or pastes the normal import evidence as they do today.
2. The import review UI exposes a new optional textarea for `Scoring Card List`.
3. The user pastes one card name per line for the whole game.
4. The server normalizes those lines, resolves them against the card catalog, and tries to assign them back to players from parsed `card_played` log events.
5. The review panel shows:
   - auto-assigned and auto-scored cards
   - cards that were assigned but still need a scoring-rule review
   - cards that matched the catalog but still need owner review
   - lines that could not be matched cleanly to one card
   - newly learned OCR rules that were auto-saved for reuse
6. The user can fix unresolved items, including `Fix rule`, before confirming the import-backed draft.

### App Review

1. The same import-backed review data should be available inside the app.
2. The app should surface the same unresolved card rows and the same `Fix rule` action instead of forcing the user back to the website.
3. A rule correction saved in the app updates the current review result and the shared global rule cache, just like a website correction.

## Card Resolution And Owner Assignment

### Input Shape

1. The flat card list accepts one logical card entry per line.
2. Blank lines should be ignored.
3. Leading bullets, extra spacing, and simple pasted formatting noise should be stripped during normalization.

### Catalog Matching

1. Try exact normalized card-name matching first.
2. Reuse any conservative alias handling already present in the catalog/import stack.
3. If a line maps to multiple plausible cards, mark it as `Needs card match review`.
4. If a line maps to no catalog card, keep the original text and mark it for review instead of dropping it.

### Owner Assignment

1. After a line resolves to a catalog card, inspect parsed log events for `player played CardName`.
2. If exactly one player in the imported log played that card, assign the pasted card to that player automatically.
3. If the card never appears in parsed played-card events, mark it as `Needs owner review`.
4. If the pasted list repeats the same resolved card and the log does not clearly prove separate ownership instances, mark those rows as `Needs duplicate review`.
5. Do not use turn order, nearby event text, or fuzzy ownership guesses in the first milestone.

## Scoring Rule Learning

### Known Rules

1. Reuse curated scoring rules first.
2. Reuse cached card scoring rules second.
3. Only fall back to OCR when no curated or cached rule exists for that card.

### OCR For New Cards

1. OCR should read the canonical card image already linked from the catalog, not the user-pasted text.
2. OCR should attempt to normalize the rule into the existing rule payload shapes:
   - `resource_count`
   - `tag_count`
   - `tile_count`
   - `adjacent_tile_count_from_placed_tile`
   - `none`
3. A resolved OCR rule counts as high-confidence only when the parser returns exactly one normalized scoring rule with confidence `>= 0.85`.
4. If OCR produces one clear high-confidence rule, save it immediately and use it for the current import.
5. If OCR detects conflicting formulas, unclear VP text, or a lower-confidence outcome, mark the card as `Needs rule review`.
6. `No scoring` OCR outcomes should stay reviewable in this milestone instead of being auto-saved globally.

## Review UX

### Shared Review Model

The website and the app should use the same review payload and rule-editing actions, even if the layouts differ.

Each unresolved or auditable row should show:

1. card name
2. assigned player when known
3. rule source: curated, cached OCR, new OCR, or user-corrected
4. current human-readable scoring summary
5. the reason the row needs review, when applicable
6. available actions such as `Fix rule`, `Choose player`, `Choose card`, or `Mark no scoring`

### Fix Rule

`Fix rule` should open a lightweight rule editor that lets the user:

1. choose the scoring mode
2. edit rule numbers such as `pointsPerSet` and `setSize`
3. choose a category such as animals, microbes, Jovian, or other
4. mark the card as `no scoring`

Saving a corrected rule should:

1. update the current import review result immediately
2. replace the reusable cached rule for that card
3. mark the rule as user-corrected in the saved metadata

### Review States

1. `Resolved`
   - card matched
   - owner proved from log
   - scoring rule available
   - points calculated
2. `Needs owner review`
   - card matched
   - owner not safely provable from the log
3. `Needs rule review`
   - owner known
   - rule still unresolved or low-confidence
4. `Needs card match review`
   - pasted text could not be matched to exactly one card
5. `Needs duplicate review`
   - repeated resolved card rows could not be safely disambiguated
6. `Auto-saved new rule`
   - OCR saved a high-confidence reusable rule during this import
7. `User-corrected rule`
   - a signed-in user overrode the OCR or prior cached rule

## Saved Data

### Import Evidence

Persist the raw pasted flat card list as part of the import evidence so review can resume across navigation and across web/app surfaces.

### Review Payload

Persist enough structured review data to rebuild:

1. resolved card matches
2. owner assignments
3. unresolved rows and their reasons
4. learned or corrected rule summaries shown to the user

### Rule Cache

Keep using `card_scoring_rule_cache` as the authoritative reusable rule store.

Extend it with audit-oriented metadata for corrected rules, such as:

1. reviewer user id
2. reviewed timestamp
3. whether the current rule was manually corrected
4. the source the rule originally came from

The cache should still have one authoritative row per card.

## Data And Permission Boundaries

1. Any signed-in user can save a corrected global rule.
2. The product intentionally favors speed over privileged moderation for this first milestone.
3. The UI should label corrected rules clearly so later users can tell the rule was human-edited.
4. This milestone does not need a separate approval queue or moderator role.

## Primary Code Surfaces

1. `src/features/imports/import-review-panel.tsx`
2. `src/features/imports/import-card-scoring-panel.tsx`
3. `src/features/imports/web-import-page.tsx`
4. `src/app/(app)/log-game/import/page.tsx`
5. new shared `Fix rule` editor and pasted-card-list review components under `src/features/imports/` so both web import and app review can reuse the same logic
6. `src/lib/imports/build-import-review-model.ts`
7. `src/lib/imports/parse-game-log.ts`
8. new pasted-card-list parsing and assignment helpers under `src/lib/imports/`
9. `src/lib/imports/card-scoring/resolve-card-scoring-rule.ts`
10. `src/lib/imports/card-scoring/calculate-import-card-scores.ts`
11. `src/lib/imports/card-scoring/parse-ocr-card-rule.ts`
12. `src/lib/db/card-scoring-rule-cache-repo.ts`
13. `src/lib/db/reference-repo.ts`
14. a new Supabase migration extending persisted import evidence and `card_scoring_rule_cache` audit metadata for pasted-card-list and rule-correction support

## Out Of Scope

1. heuristic owner assignment from turn order or vague nearby log context
2. photo-based OCR of a handwritten or photographed card list
3. moderation roles or approval workflows for corrected rules
4. broad expansion of OCR beyond scoring-rule extraction for unresolved catalog cards

## Test Coverage

Tests should cover:

1. parsing the flat pasted card list into normalized candidate lines
2. exact card-name resolution from pasted lines
3. exact owner assignment from log rows like `Izzy played Project Workshop`
4. refusing owner guesses when the log does not prove ownership
5. duplicate pasted-card detection
6. reusing curated rules without OCR
7. reusing cached OCR rules without rereading the card image
8. OCR learning and auto-saving for unseen cards with high-confidence rules
9. unresolved OCR rule results staying in review
10. `Fix rule` updating both the current import result and the shared cache
11. corrected rules appearing in both website import review and app review
12. keeping existing screenshot-assisted score import and hybrid card scoring behavior intact

## Explicit Constraint

This milestone should optimize for safe acceleration:

1. use the log when the log proves something
2. use OCR when OCR can clearly learn a rule
3. send everything uncertain to review
4. let users teach the system once so future imports get easier
