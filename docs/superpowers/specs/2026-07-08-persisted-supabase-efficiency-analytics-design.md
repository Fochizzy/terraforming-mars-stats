# Persisted Supabase Efficiency Analytics Design

Date: 2026-07-08

## Goal

Add Supabase-backed efficiency, map, award, milestone, tag, profile, and global winning statistics. These metrics must be stored and pulled from Supabase, not recomputed only in React or kept as device-local state.

The feature should make profile and global analytics answer better questions:

1. Who converts games into points most efficiently?
2. Who performs best on each map?
3. Which corporations, styles, tags, milestones, and awards actually correlate with winning?
4. Which players fund awards profitably?
5. Which score sources drive each player's wins?
6. How much does player count, generation count, and map choice change the expected score?

## Product Rules

1. Supabase is the system of record for raw facts and derived metric snapshots.
2. The UI should query prepared Supabase rows for profile, group, and global analytics.
3. Client code may format and sort already-fetched data, but it should not be the only place where meaningful analytics are calculated.
4. Global statistics must use only groups with `global_analytics_enabled = true`.
5. Global statistics must stay aggregate-only and must not expose named players across groups.
6. Manual finalized game data remains authoritative for official results.
7. Imported game logs, card tag summaries, and screenshot evidence enrich analytics when available, but missing optional evidence must show coverage instead of being treated as zero.
8. Every profile and global ranking should carry sample size or coverage data where missing optional inputs could mislead.

## Approved Approach

Use persisted metric snapshot tables plus refreshed Supabase summary tables.

This is more durable than view-only analytics because the user explicitly wants the additional statistics stored in Supabase. It also keeps the UI simpler: profile, group, and global sections can read prepared metrics instead of rebuilding them from raw events on every render. Existing `analytics` views may remain as compatibility or read layers, but the new efficiency, map, tag, award, milestone, profile, and global summaries should be persisted in tables.

## Data Sources

The metric layer should derive from existing Supabase facts:

1. `games`: map, player count, generation count, finalized status, group, played date
2. `game_players`: player result, corporation, placement, score breakdown
3. `game_milestones`: milestone winner
4. `game_awards`: award funder, first place, second place
5. `game_log_imports`: import coverage and confidence metadata
6. `game_log_events`: generation events, played cards, milestone claims, award funding, award results, tile placements, resources
7. `game_log_tag_summaries`: played-card tag counts and tag evidence coverage
8. reference tables such as `maps`, `corporations`, `milestones`, `awards`, `style_definitions`, and cards

## Persisted Tables

### `public.game_player_metric_snapshots`

One row per player per finalized game.

Store:

1. `game_id`
2. `game_player_id`
3. `group_id`
4. `player_id`
5. `map_id`
6. `corporation_id`
7. `player_count`
8. `generation_count`
9. `placement`
10. `is_winner`
11. `total_points`
12. `points_per_generation`
13. `normalized_efficiency`
14. `expected_score`
15. `score_delta_vs_expected`
16. `cities_points_per_generation`
17. `greenery_points_per_generation`
18. `card_points_per_generation`
19. `tr_points_per_generation`
20. `milestone_points_per_generation`
21. `award_points_per_generation`
22. `card_points_per_played_card`
23. `played_card_count`
24. `matched_played_card_count`
25. `unresolved_played_card_count`
26. `total_tag_count`
27. score-source share fields for TR, cards, cities, greeneries, milestones, and awards
28. `win_margin_points`
29. `loss_gap_points`
30. `close_game`
31. `created_at`
32. `updated_at`

`points_per_generation` is `total_points / generation_count`.

`normalized_efficiency` compares a player's result against an expected score baseline for the same player count, generation count, and when possible map.

### `public.game_player_tag_metric_snapshots`

One row per player, game, and tag when imported card evidence is available.

Store:

1. `game_id`
2. `game_player_id`
3. `group_id`
4. `player_id`
5. `map_id`
6. `tag_code`
7. `tag_count`
8. `tag_share`
9. `total_tag_count`
10. `played_card_count`
11. `matched_card_count`
12. `unresolved_card_count`
13. `tag_evidence_coverage`
14. `is_winner`
15. `total_points`
16. `points_per_generation`
17. `created_at`
18. `updated_at`

This table supports best tag lane, tag win rate, tag efficiency, and tag coverage without reparsing imports.

### `public.game_milestone_metric_snapshots`

One row per milestone claim.

Store:

1. `game_id`
2. `game_milestone_id`
3. `group_id`
4. `map_id`
5. `milestone_id`
6. `winner_game_player_id`
7. `winner_player_id`
8. `winner_final_placement`
9. `winner_total_points`
10. `winner_points_per_generation`
11. `winner_won_game`
12. `claimed_generation_number`
13. `claimed_timing_bucket`
14. `player_count`
15. `generation_count`
16. `created_at`
17. `updated_at`

`claimed_generation_number` should come from parsed `milestone_claimed` events when the import evidence can resolve it. If timing cannot be resolved, the row is still useful and the timing fields stay null.

### `public.game_award_metric_snapshots`

One row per award result row. Because `game_awards` stores first and second place rows, this table should preserve each place while also making funder outcomes easy to query.

Store:

1. `game_id`
2. `game_award_id`
3. `group_id`
4. `map_id`
5. `award_id`
6. `place`
7. `funded_by_game_player_id`
8. `funder_player_id`
9. `winner_game_player_id`
10. `winner_player_id`
11. `winner_final_placement`
12. `winner_total_points`
13. `winner_points_per_generation`
14. `winner_won_game`
15. `funder_final_placement`
16. `funder_won_game`
17. `funder_award_points`
18. `funder_award_roi`
19. `funded_generation_number`
20. `funded_timing_bucket`
21. `funder_got_first_place`
22. `funder_got_second_place`
23. `funder_missed_award`
24. `player_count`
25. `generation_count`
26. `created_at`
27. `updated_at`

`funder_award_roi` should use award points earned minus the award funding cost where cost can be inferred or set by rules. If the cost differs by ruleset or timing and cannot be resolved, keep the raw point outcome and mark ROI coverage accordingly.

### `public.player_metric_summaries`

One row per group and player.

Store profile-ready values:

1. games played
2. wins
3. win rate
4. average score
5. average placement
6. average points per generation
7. average normalized efficiency
8. average expected score
9. average score delta vs expected
10. average win margin
11. average loss gap
12. close-game count
13. close-game wins
14. close-game win rate
15. best score source
16. score source shares
17. best tag lane
18. tag evidence coverage
19. milestones claimed
20. milestone winner win rate
21. average milestone claimed generation
22. awards funded
23. funded awards won first
24. funded awards won second
25. funded awards missed
26. average award ROI
27. created or refreshed timestamp

### `public.player_map_metric_summaries`

One row per group, player, and map.

Store:

1. `group_id`
2. `player_id`
3. `map_id`
4. `games_played`
5. `wins`
6. `win_rate`
7. `average_points`
8. `average_generations`
9. `average_points_per_generation`
10. `average_normalized_efficiency`
11. `average_score_delta_vs_expected`
12. `best_score_source_on_map`
13. `best_tag_lane_on_map`
14. `map_rank_for_player`
15. `created_at`
16. `updated_at`

This directly satisfies average points per map and average points per generation per map.

### Global Summary Tables

Global rows should include only opted-in groups and should never expose cross-group named players.

Recommended tables:

1. `public.global_corporation_metric_summaries`
2. `public.global_style_metric_summaries`
3. `public.global_tag_metric_summaries`
4. `public.global_map_metric_summaries`
5. `public.global_milestone_metric_summaries`
6. `public.global_award_metric_summaries`
7. `public.global_player_count_metric_summaries`
8. `public.global_generation_metric_summaries`

`global_map_metric_summaries` should store:

1. `map_id`
2. optional `player_count`
3. `games_played`
4. `average_points`
5. `average_generations`
6. `average_points_per_generation`
7. `average_normalized_efficiency`
8. `expected_score_baseline`
9. `highest_win_rate_corporation_id`
10. `highest_efficiency_style_code`
11. `best_tag_lane`
12. `created_at`
13. `updated_at`

## Refresh Model

Add a database refresh function such as:

`public.refresh_game_metric_snapshots(p_game_id uuid)`

It should:

1. delete and rebuild metric snapshots for the specified finalized game
2. use existing game, player, milestone, award, event, and tag-summary facts
3. recompute player and player-map summary rows affected by the game
4. recompute global summary rows only when the game's group is opted into global analytics
5. keep all writes transactional so partial refreshes do not leave mixed old and new metrics

For first implementation, call this function after finalization and after import evidence is confirmed or re-saved. A broader scheduled or manual rebuild function can be added later:

`public.refresh_all_metric_snapshots()`

## Metrics To Calculate

### Efficiency

1. points per generation
2. normalized efficiency
3. expected score
4. score delta vs expected
5. card points per generation
6. city points per generation
7. greenery points per generation
8. TR points per generation
9. milestone points per generation
10. award points per generation
11. card points per played card
12. tag evidence coverage

### Map Metrics

1. average points per map
2. average generations per map
3. average points per generation per map
4. win rate per map
5. normalized efficiency per map
6. strongest and weakest maps for each player
7. global map expected score baseline
8. best corporation, style, and tag lane per map

### Score Shape

1. percent of score from TR
2. percent of score from cards
3. percent of score from cities
4. percent of score from greeneries
5. percent of score from milestones
6. percent of score from awards
7. best score source
8. score-source profile by map

### Milestones

1. milestone claim count
2. milestone winner win rate
3. milestone points per generation
4. average claimed generation when imported log timing is available
5. early, mid, or late claim bucket
6. milestone performance by map
7. global milestone win correlation

### Awards

1. awards funded
2. funded awards won first
3. funded awards won second
4. funded awards missed
5. award funder success rate
6. average award ROI
7. funder won game rate
8. winner and funder mismatch rate
9. funded generation when imported log timing is available
10. global award win correlation

### Tags

1. total tags played
2. tag count by tag type
3. tag share
4. best tag lane
5. tag win rate
6. tag points or card points context when enough evidence exists
7. tag performance by map
8. global tag lane win rate

### Global Winning Statistics

1. corporation win rate
2. corporation normalized efficiency
3. style win rate
4. style normalized efficiency
5. map average score
6. map average points per generation
7. tag lane win rate
8. milestone winner win rate
9. award funder success rate
10. award winner win rate
11. player-count expected score baseline
12. generation-count expected score baseline
13. close-game win patterns

## Profile UI Additions

Add sections to `My Profile` that read from Supabase summaries:

1. Efficiency
   - points per generation
   - normalized efficiency
   - score delta vs expected
2. Map Performance
   - best map
   - weakest map
   - average points per map
   - average points per generation per map
3. Score Shape
   - score-source shares
   - best score source
4. Tag Lanes
   - best tag lane
   - tag evidence coverage
5. Award Funding
   - funded, won first, won second, missed
   - average award ROI
6. Milestone Tempo
   - milestones claimed
   - average claim generation when available
   - milestone winner win rate
7. Close Games
   - close-game count
   - close-game win rate

## Group And Insights UI Additions

Add Supabase-backed cards and charts for:

1. group points per generation leaderboard
2. group normalized efficiency leaderboard
3. map comparison chart
4. score source efficiency chart
5. award ROI table
6. milestone timing and conversion table
7. tag lane comparison
8. player count and generation count baselines

## Global UI Additions

Add a global stats surface that uses opted-in aggregate rows:

1. Global Map Meta
   - average points by map
   - average points per generation by map
   - expected score baseline by map
2. Global Winning Lanes
   - top corporation by win rate and efficiency
   - top style by win rate and efficiency
   - top tag lane by win rate
3. Milestone and Award Meta
   - milestones most associated with wins
   - awards with highest funder success
   - awards most often won by someone other than the funder
4. Game Length Baselines
   - expected score by player count
   - expected score by generation count
   - expected score by map plus player count

## Permissions And RLS

All new public tables should enable Row Level Security.

Rules:

1. Group-scoped metric tables are readable by users who can read the underlying group/game.
2. Summary tables are readable by group members for their group.
3. Editors who can edit a game can trigger or write refresh results for that game through controlled functions.
4. Global summary rows are readable by authenticated users, but only aggregate rows are exposed.
5. Refresh functions should avoid service-role-only assumptions in client paths and should use policies or controlled RPC boundaries that fit existing group edit permissions.

## Data Quality

Every metric that relies on imported evidence should include coverage:

1. played-card coverage
2. matched-card coverage
3. unresolved-card count
4. tag evidence coverage
5. milestone timing coverage
6. award timing coverage
7. score-source breakdown coverage

If timing evidence is absent, the metric should still exist, but timing-dependent values should be null and the UI should label the gap.

## Testing

Add tests for:

1. Supabase migration schema verification for all metric snapshot and summary tables
2. refresh function rebuilding one finalized game's player metric snapshots
3. points per generation calculation
4. average points per map calculation
5. average points per generation per map calculation
6. normalized efficiency against same player-count and generation-count baselines
7. award funder first, second, and missed outcomes
8. milestone winner win correlation
9. tag metric snapshots from `game_log_tag_summaries`
10. global summaries excluding non-opted-in groups
11. analytics repo mapping functions for profile, map, and global metric rows
12. profile dashboard rendering new Supabase-backed sections
13. insights dashboard rendering map, efficiency, award, milestone, and tag metrics

## Out Of Scope

1. Predictive recommendations based on live in-progress games.
2. Hidden-hand reconstruction from imported logs.
3. Arbitrary photo OCR beyond the existing supported screenshot import path.
4. Exposing named global player leaderboards across groups.
5. Perfect causal claims. The UI should describe correlations, rates, and efficiency, not pretend it has proven why a player won.

## Implementation Notes

1. Prefer database calculations for persisted snapshots and summaries.
2. Keep existing `analytics` views for compatibility, but add repository functions that read from the new persisted Supabase metric tables.
3. Avoid duplicating raw facts. Snapshot tables should store derived values and references to the base rows that produced them.
4. Use indexes on group, player, map, game, corporation, tag, milestone, award, player count, and generation count fields used by dashboards.
5. Use `numeric` for ratios and efficiency fields, rounded consistently at query or display boundaries.
6. Include a full rebuild path so old finalized games can receive metrics after the migration lands.
