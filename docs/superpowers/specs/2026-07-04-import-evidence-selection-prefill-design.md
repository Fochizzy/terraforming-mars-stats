# Import Evidence Selection Prefill Design

**Goal:** Remove expansion and promo tracking from the user-facing game logging flow, keep corporation and prelude entry optional, and automatically prefill those selections from uploaded game-log evidence when a draft came from web import.

## Product Rules

1. Users no longer choose expansions or promo sets while logging a game.
2. Users no longer manage default expansions or promo sets in group settings.
3. Corporation and prelude fields stay editable, but neither is required to save or finalize a game.
4. Imported drafts should automatically prefill corporation and prelude choices when the uploaded log contains a confident match.
5. Auto-filled corporation and prelude values must never overwrite an existing manual choice.
6. If the log is incomplete or ambiguous, the app leaves the field blank instead of guessing.
7. Existing stored expansion and promo data remains tolerated for backward compatibility, but new UX no longer depends on it.

## UX Changes

### Log Game

1. Remove the `Expansions` and `Promo Sets` sections from the `Game Setup` card.
2. Keep the current player selection card, but update its copy so corporation and prelude entry is clearly optional.
3. Show the full corporation and prelude catalogs in the player selectors instead of filtering those lists by expansion or promo choices.
4. Continue saving any corporation and prelude values the user enters manually.
5. Any other catalog picker that currently depends on expansion or promo selection, including key-card selection in the style step, should also fall back to the full catalog.

### Web Import Handoff

1. The web import form still captures the exported game log and optional screenshot exactly as it does today.
2. After the import draft is created and reopened in `/log-game`, the wizard should prefill blank corporation and prelude fields from the saved imported log evidence when matches are found.
3. The imported evidence summary remains visible so the user can compare the prefilled selections against the saved raw log.

### Group Settings and Insights

1. Remove the default expansion and default promo controls from group settings.
2. Remove expansion-focused wording from the insights UI where it is still presented as an active tracked dimension.
3. Historical backend data may remain in place, but the product should stop advertising expansion tracking as part of the active workflow.

## Detection Strategy

1. Add a pure import parser that reads raw exported log text line by line and tries to extract:
   - one corporation per participant
   - up to three preludes per participant
2. Detection matches imported participant names first, then maps the result into `playerSelections` for the resolved saved player ids.
3. Detection matches corporation and prelude names against the full catalog using normalized exact-name comparison first, with conservative alias handling only where the current catalog already provides an unambiguous match surface.
4. If a participant has multiple conflicting corporation matches, leave `corporationId` blank.
5. If a participant has conflicting or excessive prelude matches, keep only the unambiguous detected set up to three cards; otherwise leave the affected prelude slots blank.
6. This change only uses uploaded game-log text. Screenshot OCR is out of scope.

## Draft Merge Behavior

1. Imported-draft prefill should happen when `/log-game` loads a draft that has saved import evidence.
2. The prefill merge fills only missing corporation and prelude fields for already selected players.
3. Existing saved `playerSelections` always win over inferred values.
4. Manual drafts without import evidence continue to load with blank optional corporation and prelude fields.
5. This page-load merge lets both newly created imports and older saved imports benefit from the parser without requiring a schema migration.

## Validation and Finalization

1. `playerSelections` stays in the draft schema, but missing corporation or prelude data is no longer a blocking review error.
2. Finalization still writes corporation and prelude rows when values exist.
3. Finalization must succeed when some or all players have no corporation or prelude selection.
4. Existing legacy `expansionCodes` and `promoSetSlugs` can remain in the shape temporarily for compatibility, but review, option visibility, and success paths must stop depending on them.

## Implementation Boundaries

1. No database migration is required for this change.
2. Existing historical games, analytics rows, and legacy draft payloads should continue to load.
3. This design does not remove legacy expansion or promo columns from storage yet; it removes product dependence on them first.
4. The change should stay focused on:
   - log-game setup UI
   - group settings UI
   - import-evidence-to-player-selection prefill
   - finalize-game validation
   - insights copy or filtering where expansion tracking is still exposed

## Primary Code Surfaces

1. `src/features/games/log-game/setup-step.tsx`
2. `src/features/games/log-game/players-step.tsx`
3. `src/features/games/log-game/log-game-wizard.tsx`
4. `src/features/games/log-game/style-step.tsx`
5. `src/features/games/log-game/reference-filters.ts`
6. `src/features/games/log-game/use-log-game-draft.ts`
7. `src/features/games/finalize-game.ts`
8. `src/app/(app)/log-game/page.tsx`
9. `src/app/(app)/log-game/import/page.tsx`
10. `src/features/groups/group-settings-form.tsx`
11. `src/app/(app)/group/settings/page.tsx`
12. `src/lib/validation/group-settings.ts`
13. `src/lib/db/group-settings-repo.ts`
14. `src/lib/imports/build-import-draft.ts`
15. New import parser and merge helpers under `src/lib/imports/`

## Testing

1. Wizard tests confirm expansion and promo controls are gone and corporation/prelude fields remain editable.
2. Wizard or merge-helper tests confirm imported evidence prefills blank player selections on draft load.
3. Merge tests confirm manual corporation or prelude choices are not overwritten by inferred values.
4. Parser tests cover:
   - successful corporation detection
   - successful prelude detection
   - ambiguous corporation lines
   - ambiguous or excessive prelude matches
   - missing evidence
5. Finalize-game tests confirm missing corporation and missing prelude data no longer block finalization.
6. Group settings tests confirm expansion and promo defaults are no longer rendered or submitted.
7. Insights tests confirm expansion-tracking copy or cards are no longer exposed in the active UI.

## Open Constraint Chosen Explicitly

1. Corporation and prelude prefill is intentionally conservative.
2. The app should skip uncertain matches rather than invent a selection.
3. Users remain the final authority because every prefilled value stays editable before save or finalize.
