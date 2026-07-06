# Import Player Confirmation Design

Date: 2026-07-05

## Goal

Speed up web-import draft creation by auto-suggesting player matches from the current group roster, showing every imported player in a quick confirm list before the draft is created, and letting the user correct any wrong match from a ranked dropdown.

## Product Decision

The import review flow should always show one row per imported player when the signed-in user has an active group roster.

Each row should:

1. show the imported name on the left
2. preselect the most likely roster player on the right
3. expose a dropdown ordered by likely matches first, then the rest of the roster
4. explain why the current suggestion was chosen
5. mark weaker or tied suggestions as review-needed instead of silently treating them as certain

The user should be able to confirm the whole list with one button if every row has a selected player and no duplicate player is selected across rows.

## Match Sources

Candidate matching should consider:

1. roster `players.display_name`
2. linked `user_profiles.full_name`
3. linked `user_profiles.username`
4. saved `player_import_aliases`
5. conservative partial matches from the same name sources

The roster remains the source of truth for the selected `player_id`.

## Ranking Rules

Candidates should be ranked by match strength in this order:

1. exact roster display-name match
2. exact linked full-name match
3. exact linked username match
4. exact saved alias match
5. token-prefix partial match, such as `James H` matching `James Hodnett`
6. weaker fallback roster candidates

If two candidates have the same strength, the tie should be broken by higher group `games_played`.

If both strength and `games_played` are tied, the row should still preselect the top alphabetical candidate, but it must be marked as needing review.

## Partial Matching

Partial matching should stay conservative.

Examples:

1. `James H` can suggest `James Hodnett`
2. `Friday Mar` can suggest `Friday Mars`
3. `James` can suggest `James Hodnett` or `James Seckler`

Partial matches should never be treated as silently trusted exact matches.

## Confirmation Flow

`Analyze Import Evidence` should return a richer review model that includes ranked candidates per imported name.

`Confirm Import Draft` should submit the user-confirmed imported-name to player-id map back to the server.

The server must use that confirmed map directly when building the draft instead of recomputing its own player selection from scratch.

## Alias Learning

When the user confirms a non-exact imported name for a player, the app should save that imported name as a future alias for the relevant source:

1. `game_log` when the name came from the participant list
2. `screenshot_ocr` when the name came from screenshot score candidates

Exact roster-name, full-name, or username matches should not create new aliases.

## Data Boundaries

`user_profiles.full_name` and `user_profiles.username` are private by RLS, so import matching should load them through the server-side admin path when available.

If the service-role key is unavailable, the matcher should fall back to roster display names plus saved aliases instead of failing the import flow.

## Out Of Scope

This milestone should not auto-create new players from ambiguous imported names.

If the current group has no roster players, the matcher can surface no candidates and require roster setup first rather than inventing new players automatically.

## Test Coverage

Tests should cover:

1. exact roster display-name matches
2. exact linked full-name matches
3. exact linked username matches
4. exact alias matches
5. token-prefix partial matches
6. tie-breaking by `games_played`
7. true ties that still require review
8. confirm-list dropdown overrides
9. duplicate selected-player blocking
10. alias reuse on later imports
