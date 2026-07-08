# Saved Game Player Corrections Design

**Date:** 2026-07-08
**Goal:** Let a user reopen an existing saved game and correct its players, including finalized games, without creating duplicate games or losing revision history.

## Decision

Ship a saved-games picker that routes into the existing `/log-game/review` wizard by `gameId`, and allow both draft and finalized games to reopen in place.

This keeps the correction flow inside the current game-edit surface, avoids inventing a second editor, and preserves the existing `games` plus `game_revisions` model. Finalized games stay finalized when corrected. They do not become drafts and they do not clone into new game rows.

## User Flow

1. A signed-in user opens `/log-game`.
2. The page still shows the existing web import entry flow.
3. The page also exposes a secondary action to review saved games.
4. Choosing that action opens the shared `/log-game/review` page without a `gameId`.
5. When `/log-game/review` has no `gameId`, it shows a recent saved-games picker for the active group.
6. The picker lists both `draft` and `finalized` games with enough context to identify the right row.
7. Choosing a draft opens that game in the current wizard as a resumable draft.
8. Choosing a finalized game opens that same game in the current wizard as an in-place correction session.
9. The user updates the player list and any dependent scoring fields that need to change.
10. Saving a finalized correction writes back to the same `gameId`, replaces persisted finalized rows, and appends a new revision snapshot.

## Saved Games Picker

The picker should live on `/log-game/review` when no `gameId` is present.

Each row should show:

- game status
- played-on date
- last updated timestamp
- player count
- a concise player summary

Each row should expose a clear action label:

- drafts: `Resume Draft`
- finalized games: `Correct Players`

The picker should be scoped to the active group only. It should not expose games from other groups.

## Finalized Reopen Behavior

Reopening a finalized game should load the latest saved revision snapshot for that game, not a draft copy and not a newly created game.

When the user saves finalized corrections:

- the same `gameId` stays in use
- the `games.status` value remains `finalized`
- `game_players` and related finalized detail rows are rebuilt from the corrected form
- a new `game_revisions` snapshot is inserted so the correction is traceable
- analytics continue to reflect the corrected finalized game after normal revalidation

The finalized correction mode should not offer a draft-demotion path. The current `Save Draft Setup` action should be replaced or hidden when editing a finalized game. The finalized edit mode should instead offer a single save action such as `Save Finalized Changes`.

## Data Loading

Today `getDraftGameForm(...)` only allows reopening draft games. That loading path should be broadened into a saved-game form loader that:

- accepts a `gameId` and `groupId`
- confirms the game belongs to the active group
- allows both `draft` and `finalized` statuses
- returns the latest revision snapshot plus the current game status

The review page should use that loader for both draft resume and finalized correction entry.

## Player Correction Safety

Changing players has to clear or reject stale references across the full saved form, not just the visible selected-player list.

When a player is removed or replaced, the corrected state must not keep orphaned references inside:

- `playerScores`
- `playerSelections`
- `playerStyles`
- milestone winners
- award funders
- award first-place winners
- award second-place winners

The correction flow should prefer pruning stale references as soon as the selected-player list changes, so the form state stays internally consistent before save. Validation should still enforce that every milestone and award reference points to a currently selected player.

## Validation Rules

The existing review flow already validates player count, corporations, preludes, score fields, milestone rows, and award rows. This feature should add or tighten validation for two cases:

1. milestone and award references must resolve only to currently selected players
2. hidden data for removed players must not survive into the final save payload

These checks should apply to both reopened drafts and reopened finalized games.

## Page Structure

`/log-game` remains the landing page for starting a new log via web import.

`/log-game/review` becomes a dual-mode route:

- without `gameId`: show the saved-games picker
- with `gameId`: show the existing wizard hydrated from the saved game

This avoids adding a new route just for corrections and keeps all reopen logic behind the existing review page.

## Testing

Add focused coverage for:

1. the saved-games picker rendering recent draft and finalized rows
2. selecting a finalized row and hydrating the review wizard from the saved revision snapshot
3. hiding or replacing draft-save behavior when the reopened game is finalized
4. clearing stale player-linked state when a selected player is removed or swapped
5. rejecting milestone or award references that target players no longer selected
6. saving finalized corrections in place under the same `gameId`

Repository-level tests should cover the broadened saved-game loader, and UI tests should cover the route behavior plus finalized edit mode.

## Out Of Scope

This feature does not add:

- finalized revision diff viewing
- finalized game deletion
- cross-group game browsing
- a separate game-history dashboard beyond the minimal saved-games picker
- partial field-level merge tooling for conflicting edits

## Implementation Notes

The narrowest change set is:

1. add a small saved-games query for the active group
2. broaden the saved-game loader to support both statuses
3. teach the review page to render the picker when no `gameId` is present
4. add finalized-edit mode to the existing wizard actions
5. prune and validate stale player references when selections change

This keeps the work aligned with the current architecture and avoids introducing a parallel correction system.
