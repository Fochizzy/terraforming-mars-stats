# TM Stats Data Capability Audit

- Audit date: 2026-07-16
- Phase: Phase 0, Step 0.3
- Branch: redesign/tm-stats-dashboard-rebuild
- Audit baseline: 46dbc3254

This document audits the repository as it exists. Product labels and redesign
requirements are not treated as evidence that data is recorded. In particular,
the statements in MASTER-RULES.md and DECISIONS.md that the game log supports
cards bought and per-generation Terraforming Rating describe the intended
product contract; neither value is persisted by the current schema, form,
finalization path, or import path.

The classifications used below are exactly:

- Available now
- Derivable from current data
- Requires query or repository work
- Requires a database view or RPC
- Requires new persisted fields or tables
- Not currently possible from recorded data
- Requires further verification

## 1. Executive summary

The current application has a sound finalized-game core. It persists groups,
members, players, game setup, final score components, placement, winners,
corporations, Preludes, maps, promo configuration, milestones, awards, declared styles,
inferred styles, selected key cards, raw import evidence, and several persisted
summary tables. Existing analytics views provide leaderboards, head-to-head
results, score-source summaries, interactions, trends, styles, and coverage.

The current repository does not persist card acquisition. There are no current
fields, generation rows, form inputs, or import writers for Cards Purchased,
Cards Seen, research offers, draft receipts, effect draws, all cards entering
hand, or cards remaining at game end. Cards Played has a generic event shape and
derived tag-summary shape, but the application has no verified production writer
for those events. Therefore:

- Cards Purchased must not be equated with selected key cards or played cards.
- Cards Seen must not be inferred from Cards Purchased.
- Total hand acquisitions must not be reconstructed by summing hand-size
  snapshots.
- Per-generation values must not be reconstructed from final totals.
- Final Terraforming Rating must not be inferred from game_players.tr_points;
  that column is the final score contribution from TR, not the player's final TR.

The repository also lacks exact production snapshots, engine timelines,
canonical board coordinates, durable recommendations, improvement goals, and
goal progress. A free-text board_space field exists on generic import events,
but there is no verified writer, coordinate model, or historical coverage.
Final city and greenery point totals cannot support spatial board-control
analytics.

Canonical win point differential is exactly derivable from existing final
scores and winner flags. Its production implementations need correction and
centralization: the analytics view compares a winner with the next placement,
while persisted metric refresh compares the winner with every other player.
Both return zero for a tied first, but neither explicitly implements “winner
score minus highest non-winning score” with a separate tied-first policy.

All outcome relationships in this document are observational associations.
Nothing in the recorded data supports causal claims about cards, corporations,
Preludes, styles, or other choices causing a result.

### Capability posture

| Data posture | Current reality |
| --- | --- |
| Persisted raw data | Groups, memberships, players, game setup/status, final player score rows, reference selections, raw import text, OCR/evidence metadata, and optional generic import events. |
| Persisted derived data | Placement/winner fields, inferred styles, game/player metric snapshots, map/player summaries, global summaries, tag summaries, and import coverage/hashes. |
| Runtime-derived data | Form totals/ranks, some score-source display values, insight prose, replay series, and repository mappings. |
| Inferred from incomplete information | game_player_inferred_styles is a score-channel heuristic; game-pace actor identity is read from payload.actor; invalid event generations are currently clamped to the final generation; score-source nulls are sometimes converted to zero. |
| Unsupported data | Card acquisition/opportunity coverage, per-generation TR, final TR, production/engine states, canonical spatial board data, recommendation history, and improvement-goal progress. |

## 2. Current schema and repository overview

### Core persisted schema

The source of truth for the core schema is
supabase/migrations/20260703120000_create_core_tables.sql.

| Area | Exact tables and material columns | Grain |
| --- | --- | --- |
| Groups | groups(id, name, created_at); group_members(id, group_id, user_id, role, created_at); group_settings(group_id, default_map_id, global_analytics_enabled, image_reference_mode) | Group, user-in-group, and group settings |
| Players | players(id, group_id, linked_user_id, display_name, normalized_display_name, created_at) | Saved player in one group |
| Games | games(id, group_id, played_on, map_id, player_count, generation_count, source_game_id, status, catalog_snapshot_id, finalized_at/by, notes, timestamps) | Game |
| Final player results | game_players(id, game_id, player_id, corporation_id, placement, is_winner, total_points, final_megacredits, cities_points, greenery_points, card_points_total, card_points_microbes, card_points_animals, card_points_jovian, tr_points, milestone_points, award_points, other_card_points) | Player in game |
| Revision evidence | game_revisions(id, game_id, editor_user_id, revision_note, snapshot, created_at) | Saved revision snapshot |

The reference catalog in
supabase/migrations/20260703123000_create_reference_catalog.sql and later
catalog migrations includes expansions, maps, promo_sets, cards, corporations,
preludes, milestones, awards, catalog_snapshots, catalog_overrides, and
style_definitions. Relationship tables include game_expansions,
game_promo_sets, game_player_preludes, map_milestones, map_awards,
game_milestones, game_awards, game_player_declared_styles,
game_player_inferred_styles, and
game_player_key_cards. Cards later gain required_expansion_codes,
gameplay_tags, printed_victory_points, and victory_points_kind. Catalog card
identity does not establish that a card was offered, acquired, or played in a
particular game.

The authenticated Card Database may read the complete current `cards` catalog
through the server-only reference repository, including stable `cards.id`, card
number/name/type/expansion, promo membership, required expansions, stored art
paths, tags, and printed/dynamic VP metadata. This is reference data only: it
does not establish card selection, availability, play, or outcome evidence.

### Import, event, OCR, and storage records

The import schema is defined across
supabase/migrations/20260704030147_add_game_log_imports_and_evidence_storage.sql,
20260704090000_extend_game_import_review_schema.sql,
20260704100000_add_import_coverage_analytics.sql,
20260706153000_support_hybrid_card_score_imports.sql,
20260708013631_fix_replace_game_log_events_conflict_target.sql,
20260715032000_prevent_future_game_log_backfills.sql,
20260715043000_add_domain_aware_ocr_corrections.sql, and
20260715113501_restore_ocr_confirmation_function.sql.

- game_log_imports stores raw_log_text, source metadata, parser/status fields,
  line/unparsed counts, screenshot metadata/path, hashes, validation errors, and
  parse/finalization timestamps.
- game_log_events can store generation_number, event_order, event_type, card_id,
  resource_type, resource_amount, tile_type, board_space, confidence, raw_line,
  payload,
  and a nullable game_player_id.
- game_result_screenshot_imports stores screenshot-derived evidence and extracted
  fields, but the current web import action does not write this table.
- player_import_aliases and OCR attempt/correction/domain tables preserve
  resolution and correction evidence.
- tm-import-evidence is a private Storage bucket. Its records are screenshot
  evidence, not structured gameplay facts. tm-card-full and tm-card-thumbs are
  public catalog-image buckets and are mentioned here only to distinguish
  storage objects from gameplay records.

The current saveGameLogImport function in src/lib/db/game-import-repo.ts stores
raw evidence as a saved draft with all lines initially unparsed. The import
server action in src/app/(app)/log-game/import/page.tsx creates a setup-only
draft through src/lib/imports/build-import-draft.ts. It does not parse or persist
card acquisition, TR snapshots, scores, or board events. No current application
call to replace_game_log_events was found.

### Analytics views and persisted metrics

supabase/migrations/20260703130000_create_analytics_views.sql defines:

- analytics.player_game_results
- analytics.group_leaderboard
- analytics.group_score_source_averages
- analytics.player_score_source_averages
- analytics.head_to_head
- analytics.group_style_performance
- analytics.player_style_performance
- analytics.group_interactions
- analytics.player_interactions
- analytics.lineup_effects
- analytics.player_trends
- analytics.style_agreement
- analytics.data_coverage
- analytics.player_data_coverage
- analytics.global_corporation_performance

The import migrations add analytics.import_coverage and
public.game_log_import_integrity_audit.

supabase/migrations/20260708142459_add_persisted_metric_snapshots.sql adds
game_player_metric_snapshots, game_log_tag_summaries,
game_player_tag_metric_snapshots, game_milestone_metric_snapshots,
game_award_metric_snapshots, player_metric_summaries,
player_map_metric_summaries, and global summaries by map, corporation, style,
tag, milestone, award, player count, and generation count.

These snapshot rows are derived from finalized totals. points_per_generation and
the score-source per-generation values divide a final total by the game's final
generation_count. They are rates, not generation snapshots. Milestone claim and
award funding generation fields exist, but the refresh function currently writes
null because the source timing is not recorded.

The refresh pipeline is:

1. src/features/games/finalize-game.ts validates and builds the final payload.
2. src/lib/db/game-draft-repo.ts writes the game and related rows.
3. src/lib/db/metric-refresh-repo.ts calls refresh_game_metric_snapshots.
4. refresh_game_metric_snapshots_internal rebuilds the game's snapshots and then
   rebuild_metric_summaries rebuilds aggregate summaries.

These application writes are sequential, not one database transaction. A
refresh failure can therefore leave finalized source rows present while summary
rows are stale.

### Exact noncore table and column catalog

The exact capability-relevant columns after the later local ALTER statements
are:

- game_log_imports: id, game_id, created_by_user_id, raw_log_text,
  detected_source, parser_version, parse_status, confidence_summary, line_count,
  unparsed_line_count, screenshot_object_path, screenshot_original_name,
  screenshot_mime_type, screenshot_size_bytes, input_sha256, output_sha256,
  validation_errors, parsed_at, finalized_at, created_at, updated_at.
- game_log_events: id, game_log_import_id, game_player_id, generation_number,
  event_order, event_type, card_id, resource_type, resource_amount, tile_type,
  board_space, confidence_level, line_classification, raw_line, payload,
  created_at.
- game_result_screenshot_imports: id, game_id, game_log_import_id,
  storage_object_path, original_name, mime_type, file_size_bytes,
  ocr_engine_version, parse_status, detected_layout, confidence_summary,
  extracted_fields, evidence_kind, display_order, created_by_user_id, created_at,
  parsed_at.
- player_import_aliases: id, group_id, player_id, source_type, alias_text,
  normalized_alias, created_at.
- card_scoring_rule_cache: card_id, source_type, confidence, human_summary,
  rule_payload, ocr_engine_version, created_at, updated_at.
- domain_text_aliases: id, entity_type, entity_id, alias_text,
  normalized_alias_text, source, occurrence_count, confirmed_by_user_id,
  created_at, updated_at.
- game_log_ocr_attempts: id, game_log_import_id, engine, engine_version,
  preprocessing_variant, raw_ocr_text, corrected_ocr_text, average_confidence,
  correction_summary, created_at.
- game_log_ocr_corrections: id, ocr_attempt_id, line_index, entity_type,
  original_text, canonical_entity_id, canonical_text, method, decision,
  match_score, score_margin, suggestions, confirmed_by_user_id, confirmed_at,
  created_at.
- game_player_metric_snapshots: id, game_id, game_player_id, group_id, player_id,
  map_id, corporation_id, player_count, generation_count, placement, is_winner,
  total_points, points_per_generation, normalized_efficiency, expected_score,
  score_delta_vs_expected, cities_points_per_generation,
  greenery_points_per_generation, card_points_per_generation,
  tr_points_per_generation, milestone_points_per_generation,
  award_points_per_generation, card_points_per_played_card, played_card_count,
  matched_played_card_count, unresolved_played_card_count, total_tag_count,
  tr_score_share, card_score_share, cities_score_share, greenery_score_share,
  milestone_score_share, award_score_share, win_margin_points, loss_gap_points,
  close_game, created_at, updated_at.
- game_log_tag_summaries: id, game_log_import_id, game_player_id, player_name,
  normalized_player_name, tag_code, tag_count, played_card_count,
  matched_card_count, unresolved_card_count, total_tag_count,
  tag_evidence_coverage, created_at, updated_at.
- game_player_tag_metric_snapshots: id, game_id, game_player_id, group_id,
  player_id, map_id, tag_code, tag_count, tag_share, total_tag_count,
  played_card_count, matched_card_count, unresolved_card_count,
  tag_evidence_coverage, is_winner, total_points, points_per_generation,
  created_at, updated_at.
- game_milestone_metric_snapshots: id, game_id, game_milestone_id, group_id,
  map_id, milestone_id, winner_game_player_id, winner_player_id,
  winner_final_placement, winner_total_points, winner_points_per_generation,
  winner_won_game, claimed_generation_number, claimed_timing_bucket,
  player_count, generation_count, created_at, updated_at.
- game_award_metric_snapshots: id, game_id, game_award_id, group_id, map_id,
  award_id, place, funded_by_game_player_id, funder_player_id,
  winner_game_player_id, winner_player_id, winner_final_placement,
  winner_total_points, winner_points_per_generation, winner_won_game,
  funder_final_placement, funder_won_game, funder_award_points,
  funder_award_roi, funded_generation_number, funded_timing_bucket,
  funder_got_first_place, funder_got_second_place, funder_missed_award,
  player_count, generation_count, created_at, updated_at.
- player_metric_summaries: group_id, player_id, games_played, wins, win_rate,
  average_score, average_placement, average_points_per_generation,
  average_normalized_efficiency, average_expected_score,
  average_score_delta_vs_expected, average_win_margin, average_loss_gap,
  close_game_count, close_game_wins, close_game_win_rate, best_score_source,
  tr_score_share, card_score_share, cities_score_share, greenery_score_share,
  milestone_score_share, award_score_share, best_tag_lane,
  tag_evidence_coverage, milestones_claimed, milestone_winner_win_rate,
  average_milestone_claimed_generation, awards_funded,
  funded_awards_won_first, funded_awards_won_second, funded_awards_missed,
  average_award_roi, created_at, updated_at.
- player_map_metric_summaries: group_id, player_id, map_id, games_played, wins,
  win_rate, average_points, average_generations, average_points_per_generation,
  average_normalized_efficiency, average_score_delta_vs_expected,
  best_score_source_on_map, best_tag_lane_on_map, map_rank_for_player,
  created_at, updated_at.
- global_map_metric_summaries: map_id, player_count, games_played, average_points,
  average_generations, average_points_per_generation,
  average_normalized_efficiency, expected_score_baseline,
  highest_win_rate_corporation_id, highest_efficiency_style_code, best_tag_lane,
  created_at, updated_at.
- global_corporation_metric_summaries: id, corporation_id, map_id, player_count,
  games_played, wins, win_rate, average_points, average_points_per_generation,
  average_normalized_efficiency, created_at, updated_at.
- global_style_metric_summaries: id, style_code, map_id, player_count,
  games_played, wins, win_rate, average_points, average_points_per_generation,
  average_normalized_efficiency, created_at, updated_at.
- global_tag_metric_summaries: id, tag_code, map_id, player_count, games_played,
  wins, win_rate, average_points, average_points_per_generation,
  average_normalized_efficiency, average_tag_count, created_at, updated_at.
- global_milestone_metric_summaries: id, milestone_id, map_id, player_count,
  games_played, winner_wins, milestone_winner_win_rate,
  average_winner_points_per_generation, average_claimed_generation, created_at,
  updated_at.
- global_award_metric_summaries: id, award_id, map_id, player_count,
  games_played, funder_wins, funder_success_rate, winner_wins,
  award_winner_win_rate, average_award_roi, winner_funder_mismatch_rate,
  average_funded_generation, created_at, updated_at.
- global_player_count_metric_summaries: player_count, games_played,
  average_points, average_generations, average_points_per_generation,
  expected_score_baseline, created_at, updated_at.
- global_generation_metric_summaries: generation_count, games_played,
  average_points, average_points_per_generation, expected_score_baseline,
  created_at, updated_at.

Later catalog columns that matter to this audit are
players.normalized_display_name;
cards.required_expansion_codes/gameplay_tags/printed_victory_points/
victory_points_kind; and required_expansion_codes on corporations and Preludes.

### RPC inventory and schema drift

The exact locally defined function inventory is: can_edit_game,
can_edit_game_player, can_edit_group, can_read_game, can_read_game_player,
can_read_player, claim_player_profile, confirm_game_log_ocr_correction,
confirm_ocr_domain_correction, derive_game_log_import_metadata,
derive_game_log_tag_coverage, finalize_game_log_import,
get_ocr_domain_dictionary, handle_new_auth_user, is_group_member,
is_group_owner, list_claimable_player_profiles, metric_normalized_label,
metric_timing_bucket, normalize_claim_player_name, normalize_ocr_domain_text,
rebuild_metric_summaries, refresh_all_metric_snapshots,
refresh_game_metric_snapshots, refresh_game_metric_snapshots_internal,
replace_game_log_events, replace_game_log_tag_summaries, and
validate_game_log_import.

src/lib/db/final-terraforming-action-repo.ts calls
get_final_terraforming_action_stats, but no local migration or test defines that
RPC. Four remote_history_placeholder migrations contain no SQL. The final-action
RPC and any other remote-only objects therefore require verification against the
linked database before implementation work.

### Exact current derived calculations

- placement_score = 1 - ((placement - 1) / max(player_count - 1, 1)).
- Analytics-view winner margin = winner total minus the next placement's maximum
  total, with tied first forced to zero.
- Analytics-view loss gap = next higher placement total minus player total.
- signed_differential = positive winner margin or negative loss gap, with tied
  first zero.
- Leaderboard weighted score = 0.5 times win rate + 0.3 times average
  placement_score + 0.2 times average signed differential divided by 20 and
  clamped to the interval -1 to 1.
- points_per_generation and each score-source per-generation rate = final total
  divided by final generation_count.
- expected_score fallback order = other finalized games with the same map,
  player count, and generation count; then same player count and generation
  count; then same player count.
- normalized_efficiency = total_points / expected_score when expected_score is
  non-null and nonzero.
- score_delta_vs_expected = total_points - expected_score.
- Score share = source points / total_points, with a zero-total guard.
- card_points_per_played_card = final card_points_total / played_card_count when
  played_card_count is positive.
- Snapshot winner margin = winner total minus max total of every other player; a
  co-winner is therefore included.
- close_game = absolute relevant win margin or loss gap at most five points.
- metric_timing_bucket divides the game into early/mid/late thirds, but current
  milestone/award timing inputs are null.
- Inferred player style is a runtime heuristic based on final Jovian/card versus
  city/greenery score channels.
- Award ROI = 5 for funded first or 2 for funded second, otherwise 0, minus a
  fixed funding cost of 8.

These calculations are exact implementations of their present SQL/code
definitions, but several are approximations or product heuristics rather than
directly observed game facts.

### Database types and consumers

There is no generated Supabase Database type in the repository. The server and
browser clients are created without a Database generic. Database row shapes are
handwritten in src/lib/db/analytics-repo.ts, reference-repo.ts,
game-import-repo.ts, game-pace-repo.ts, final-terraforming-action-repo.ts, and
related repositories. This creates silent schema-drift risk.

Current primary consumers are:

- src/app/(app)/group/page.tsx and src/features/analytics/group-dashboard.tsx
- src/app/(app)/profile/page.tsx and src/features/analytics/profile-dashboard.tsx
- src/app/(app)/insights/page.tsx and src/features/insights/insights-dashboard.tsx
- src/app/(app)/log-game/page.tsx and src/features/games/log-game/*
- src/app/(app)/log-game/import/page.tsx and src/features/imports/*
- src/app/(app)/cards/page.tsx and src/features/cards/promo-set-browser.tsx

### Capability register

Each row below includes its source, consumer, grain, null/history/import
behavior, exactness, joins, authorization, limitations, future work, phase, and
confidence. “Historical” means the schema can hold the value; actual production
row coverage was not queried in this documentation-only audit.

| Capability | Classification | Evidence and current consumers | Grain, null/history/import, exactness | Joins, scope, limitations, future work, phase, confidence |
| --- | --- | --- | --- | --- |
| Players | Available now | players.id/group_id/linked_user_id/display_name/normalized_display_name; src/lib/db/player-repo.ts and log-game-player-resolution.ts; group players and log form | One saved player per group; required names; historical rows exist where games reference them; imports resolve names but do not create gameplay facts; exact identity is group-local unless linked_user_id connects accounts | Join group_members/groups and game_players; member/shared-finalized-game RLS applies; aliases can be ambiguous. Preserve group identity rules. Phase 1/4. High |
| Groups and memberships | Available now | groups, group_members.role, group_settings; group-context-repo.ts and group-settings-repo.ts; AppShell, switcher, settings | Group/user grain; role is non-null; historical membership changes are not versioned; imports use the active group | All analytics must join through games.group_id or players.group_id. Current policies make every member effectively write-capable despite persisted roles. Revisit authorization in Phase 2/20. High |
| Games and status | Available now | games.status draft/finalized plus setup columns; game-draft-repo.ts; log form and all dashboards | Game grain; generation_count/player_count required, map optional; imports create drafts, not finalized structured games; exact for recorded fields | Join groups/maps/game promos. Finalized-only views exclude drafts. Preserve draft/finalized semantics in Phase 4. High |
| Final scores | Available now | game_players.total_points and score components; finalize-game.ts, game-draft-repo.ts, analytics-repo.ts; group/profile/insights | Player-game final snapshot; total and most components non-null, four card subcomponents nullable; historical finalized rows have totals, but default zero can mask unrecorded components; current imports do not populate scores; exact as user-entered final values | Join game_players to games/players. Member and linked-player RLS applies. Add reconciliation and coverage, not invented zeroes, in Phase 2/4/15. High |
| Placement and winners | Available now | game_players.placement/is_winner; finalize-game.ts ranks by total then final MC and preserves ties; analytics.player_game_results | Player-game; non-null after finalization; historical finalized rows contain values; imports do not; exact under current tiebreak logic | Self-join game_players for tie context. Explicit first-place tie presentation remains required. Phase 2/7. High |
| Canonical win point differential | Derivable from current data | game_players.total_points/is_winner/placement; analytics.player_game_results.win_differential_points; game_player_metric_snapshots.win_margin_points; group/profile/insights | Winner-game result; null for non-winners. Historical finalized games suffice; imports only after structured finalization. Exact source data, but existing formulas are not the canonical tied-first implementation | Self-join to highest non-winning score and separately flag tied first. Decide whether tied-first margin is null, zero with tie flag, or excluded. Centralize/test in Phase 2, consume Phase 7-13. High |
| Overall point differential | Requires further verification | analytics.player_game_results.signed_differential currently means distance to the adjacent placement; persisted win/loss gaps exist; analytics inventory requests “overall point differential” without a definition | Player-game; current value is exact for adjacent-placement definition, but may not match intended metric. Historical games suffice once defined; imports do not currently finalize | Requires a decision on opponent/table baseline and tie behavior before selecting joins. Define in Phase 2; expose Phase 7-13. Medium |
| Selected key cards | Available now | game_player_key_cards(game_player_id, card_id); log-game schema/form, game-draft-repo.ts; key-card and coverage panels | Player-game-card selection; absence may mean none or unrecorded; historical field coverage varies; current imports do not populate it; exact as a user-selected salient card, not an acquisition or play event | Join cards/game_players/games. Same catalog card can appear for multiple players/games; unique constraint prevents duplicate selection for one player-game. Keep semantically separate in Phase 4/13. High |
| Cards purchased | Requires new persisted fields or tables | No column/table/form/repository/import field. game_player_key_cards and card_played evidence are not purchases | No current grain; historical/current imported games do not contain it; missing cannot be distinguished from zero; unavailable, not estimated | Add player-generation aggregate or event records, coverage/source metadata, validation, and import mapping in Phase 2/4. High |
| Cards played | Requires query or repository work | game_log_events.event_type/card_id/generation_number/game_player_id; game_log_tag_summaries.played_card_count; game-pace-repo.ts reads card_played; replay/tag metrics are consumers | Potential individual event and derived counts. No verified production event writer; tag-summary writer has no current app consumer. Historical/import coverage unknown; missing and zero are not reliably distinct; exact only if event stream is complete | Join event to import/game/player/card. Current replay identifies actor from payload.actor and can count duplicate events; add writer, dedupe/event identity, coverage, and tests in Phase 4/5/13. Medium |
| Cards remaining in hand at game end | Requires new persisted fields or tables | No schema/form/repository/import source | Needed player-game final snapshot; historical/imported values unavailable; missing versus zero impossible; not estimable from other fields | Add nullable nonnegative snapshot plus coverage/provenance in Phase 2/4. Do not derive from acquisitions minus plays without complete discard/transfer events. High |
| Cards purchased by player and generation | Requires new persisted fields or tables | No source. games.generation_count is only the final game count | Needed player-generation count or events; no history/import coverage; missing versus explicit zero impossible; generation totals must not be reconstructed | Add unique player-generation records or purchase events, reconciliation, source coverage, RLS, and import mapping in Phase 2/4. High |
| Terraforming Rating by player and generation | Requires new persisted fields or tables | No source. No TR field exists in game_log_events or form. tr_points is a final score component | Needed player-generation snapshot/event; no history/import coverage; missing versus zero impossible; generation chronology cannot be reconstructed | Add explicit TR snapshot/event data with generation uniqueness and provenance in Phase 2/4; timeline use Phase 9/16. High |
| Final Terraforming Rating | Requires new persisted fields or tables | No source. game_players.tr_points must not be used | Needed player-game final snapshot; no history/import coverage; missing versus zero impossible | Add an explicit final_tr or derive only from a complete verified last TR snapshot. Capture Phase 4, analyze Phase 15/16. High |
| Tags | Available now | cards.gameplay_tags; game_log_tag_summaries and game_player_tag_metric_snapshots; global_tag_metric_summaries; reference-repo.ts/analytics-repo.ts; insights | Catalog-card tags and optional player-game derived counts. Catalog tags are exact labels; performance metrics depend on complete card_played matching. Historical event coverage unknown; current imports do not write events | Join events/card_id/cards and player/game. Global rows only represent opted-in groups. Add explicit event coverage and avoid treating zero summary as complete in Phase 2/13. Medium |
| Corporations | Available now | corporations catalog; game_players.corporation_id; reference-repo.ts; log form and analytics | Player-game reference, nullable; historical coverage is measured; imports do not populate it; exact when selected | Join corporation/catalog. Intrinsic required-expansion metadata is catalog identity, not a game fact. Global aggregate access is authenticated and opt-in-group sourced. Phase 4/14. High |
| Preludes | Available now | preludes and game_player_preludes; reference-repo.ts; log form and analytics | Player-game-prelude relationship; zero rows mean missing or unrecorded rather than proof that Prelude was disabled; historical coverage varies; imports do not populate it; exact when recorded | Join through game_players. Preserve optional recorded identity and missing coverage in Phase 2/4/14. High |
| Corporation–Prelude pairings | Available now | analytics.group_interactions/player_interactions derive interaction_type corporation_prelude from corporation and aggregated Prelude names; corporation-prelude-pairings-panel.tsx | Player-game pairing; current view emits a display label, not typed corporation/prelude IDs. Historical exactness follows corp/Prelude coverage; imports do not populate | Join game_players, corporations, game_player_preludes, preludes, games. Multi-Prelude text parsing is fragile; add typed view/repository output in Phase 2/14. Medium |
| Score sources | Available now | game_players final score columns; group/player score-source views; analytics-repo.ts; score profile/DNA/group/profile panels | Player-game final snapshot and aggregate averages. Nullable optional card subtypes are coalesced to zero by SQL/repository in some paths; historical totals exist but component coverage varies; imports do not populate | Join game/player. Add source-level observed flags and one canonical source list in Phase 2/4/15. High for stored totals, Medium for optional-source averages |
| Player styles | Available now | style_definitions, game_player_declared_styles, game_player_inferred_styles(confidence); infer-style.ts; style analytics panels | Player-game-style. Declared rows are exact user labels; inferred rows are persisted heuristic classifications from final score channels, not observed play. History/import coverage varies | Join game_player/styles; compare declared/inferred only with confidence. The board_control inferred label is not spatial board analytics. Review model/wording Phase 2/15. High |
| Maps | Available now | maps, games.map_id, group_settings.default_map_id, map_milestones/map_awards; reference-repo.ts and analytics summaries | Game reference, nullable; historical coverage measured; import draft may infer setup but current save does not finalize it; exact when selected | Join map catalog/game. Global aggregates include opted-in groups. Phase 4/8/14. High |
| Gameplay expansion configuration | Retired in Phase 4, Step 4.2 | the gameplay expansion tables, form fields, repositories, and analytics dimension were intentionally removed | No current or historical game-expansion grain remains in the application database | Do not recreate gameplay tracking from intrinsic catalog expansion metadata. Promo sets, catalog snapshots, player count, and map remain separate facts. High |
| Recorded generations | Available now | games.generation_count; generation summary tables; group/profile/insights | One final count per game; required and nonzero. Historical finalized games contain it; setup-only imports may stage a value but do not produce analytics. Exact as entered | Join games to results. It is a denominator, not proof of generation-level observations. Phase 4/8-13. High |
| Elapsed game length | Requires new persisted fields or tables | games.played_on is a date; created/finalized timestamps reflect app workflow, not necessarily play duration | Needed game duration/timestamps; historical/import values unavailable; missing versus zero impossible | Add explicit started_at/ended_at or duration with provenance in Phase 2/4/16. Do not infer from created_at/finalized_at. High |
| Milestones | Available now | milestones, map_milestones, game_milestones, game_milestone_metric_snapshots; log form and analytics | Game-milestone claimant and points. Claimed_generation_number exists only in derived snapshot and refresh writes null. Historical claims may exist; current imports do not populate | Join game, milestone, game_player/player, map. Timing analytics require new source timing data. Capture Phase 4; outcomes Phase 18. High for final claim, Low for timing |
| Awards | Available now | awards, map_awards, game_awards, game_award_metric_snapshots; log form and analytics | Game-award funder and placements. funded_generation_number exists only in derived snapshot and refresh writes null. Historical final rows may exist; imports do not populate | Join game, award, funder/winner/runner-up. ROI is a fixed derived formula, not causal. Capture Phase 4; outcomes Phase 18. High for final result, Low for timing |
| Final terraforming actions | Requires further verification | final-terraforming-action-repo.ts calls get_final_terraforming_action_stats; group page consumes it and converts errors to an empty list; no defining migration/test exists | Handwritten RPC result appears aggregate, but source grain, null semantics, history, import coverage, and exactness are unverified | Verify linked DB function, source tables, security, definition, and tests before Phase 18. Do not interpret empty UI as zero activity. Low |
| Head-to-head results | Available now | analytics.head_to_head and analytics-repo.ts; group/profile dashboards and head-to-head lenses | Ordered player pair aggregate from finalized placement/score; ties are represented by neither side winning. Historical finalized games suffice; imports do not | Self-join player_game_results within group/game. Group/member and linked-player RLS applies. Add eligibility/sample labels in Phase 2/7/11. High |
| Opponent-adjusted performance | Requires a database view or RPC | Opponent identities and outcomes exist in games/game_players/head_to_head, but no rating, expected result, or adjusted model exists | Would be player-game and player-period/model output. Historical finalized games can support a defined observational model; imports cannot until finalized. Null/zero depends on model eligibility | Approve rating/model, time leakage rules, minimum games, group/global scope, and versioning; implement server-side in Phase 2/7/19. Never describe adjustment as causal. Medium |
| Production snapshots | Requires new persisted fields or tables | No resource-production columns or events; resource_type/amount generic events do not define production state and have no writer | Needed player-generation-resource snapshot; no historical/import coverage; missing versus zero impossible | Define resources, snapshot timing, provenance, and uniqueness in Phase 2/4; consume Phase 16. High |
| Engine-development timelines | Requires new persisted fields or tables | No engine-state model. Final score components and generic events cannot reconstruct state | Needed chronological player state/events; no history/import coverage; unavailable | Define only after production, tags, cards, TR, and resource coverage; Phase 2 schema decision, Phase 4 capture, Phase 16 analysis. High |
| Board coordinates | Requires new persisted fields or tables | game_log_events.board_space is unconstrained text and has no verified writer; no map-space catalog or coordinate columns | Potential event text, not canonical coordinate. Historical/import coverage unknown and current imports do not populate; null/zero not applicable | Add map-aware space identity/coordinate model, validation, and provenance in Phase 2/4/17. High |
| Tile placement events | Requires query or repository work | game_log_events event_type/tile_type/board_space/generation_number can represent an event; game-pace-repo.ts reads tile_placed but ignores board_space | Potential individual event; no verified production writer, actor linkage is payload text, generation can be clamped, duplicate identity absent, history/import coverage unknown | Repair event writer/player linkage, add event/opportunity identity, coordinate validation, coverage, and tests in Phase 4/5/17. Medium |
| Board-control analytics | Not currently possible from recorded data | Final city/greenery points and the inferred style label are not coordinates or control events | No spatial grain; historical/import data cannot support adjacency, occupancy, control, or placement sequence; unavailable | Requires real coordinate/placement events first. Do not market final score-channel proxies as board control. Phase 17 after Phase 2/4 capture work. High |
| Recommendation persistence | Requires new persisted fields or tables | build-insight-cards.ts creates runtime prose only; no recommendation table/status/history | No durable grain; no history/import relevance; null versus zero not applicable | Define recommendation, evidence snapshot, model/version, scope, lifecycle, and acknowledgement fields in Phase 2/12/19. High |
| Improvement goals and progress | Requires new persisted fields or tables | No goals, targets, progress observations, or repository methods | Needed user/player-goal and observation grain; no historical data | Add ownership, group/player scope, metric definition/version, baseline, target, dates, status, and progress evidence in Phase 12/19. High |
| Replay timelines | Requires query or repository work | game-pace-repo.ts reads award_funded/card_played/milestone_claimed/tile_placed from game_log_events; game-pace-replay.tsx consumes up to 12 replays | Runtime player-generation series from individual events. Current logic clamps missing/invalid generation to final generation and derives actor from payload.actor; event history/import coverage unverified | Persist reliable events/player IDs, keep missing generations missing, add coverage/dedupe/tests, and query beyond current newest-import/last-20-game limits in Phase 4/5. Medium |
| Imported-game evidence and basic coverage | Available now | game_log_imports, tm-import-evidence objects, OCR records, analytics.import_coverage, game_log_import_integrity_audit; import UI evidence summary | Import/game evidence and metadata. Raw text/screenshot records distinguish absent paths; line counts/hashes are exact metadata, extracted content may be uncertain | Join import to game/group and storage prefix. Private bucket/member policies apply. Preserve immutable evidence/provenance in Phase 4/20. High |
| Imported structured gameplay coverage | Requires further verification | game_log_events and screenshot extracted_fields can hold structured evidence, but current web path saves raw draft only and no event writer is called | Potential event/field grain; actual remote/historical rows were not queried. Missing event rows do not mean zero events; exactness depends on parser confidence | Verify production row counts and remote functions, then implement parser/review/finalization coverage labels in Phase 4/5. Medium |

## 3. Fully supported capabilities

“Available now” means a current persisted source and read/write path exists for
the stated scope. It does not mean every historical row is complete.

- Identity and grouping: players, groups, memberships, and group settings.
- Finalized-game core: setup/status, final scores, placement, winners, recorded
  generation count, maps, promo configuration, corporations, and
  Preludes.
- Final selections/results: key-card selections, declared/inferred styles,
  milestones, awards, and corporation–Prelude relationships.
- Current aggregate read models: score-source summaries, head-to-head results,
  leaderboards, interactions, trends, map/corporation/style summaries, and basic
  import/field coverage.
- Import evidence: raw log text, screenshot object references, OCR/correction
  evidence, hashes, line counts, and import status.

The qualifier matters. Optional references and score subcomponents have variable
coverage, imports do not currently populate finalized gameplay rows, and several
summary tables can be stale after a failed refresh.

## 4. Derivable capabilities

Canonical win point differential is the principal exact derivation requested by
the redesign that current finalized rows can support without new source fields:

1. Identify a finalized game and its first-place player row or rows.
2. Detect whether first place is tied.
3. Find max(total_points) among rows where is_winner is false.
4. For a non-tied winner, subtract that score from the winner score.
5. For tied first, apply an explicitly approved policy and expose the tie flag.
6. Return null for non-winners and for games with no non-winning player.

Existing formulas must not be silently reused as the canonical definition.
analytics.player_game_results selects the next placement, and the snapshot
refresh compares with all other players. The latter includes co-winners.

Several other current analytics are persisted or view-derived rather than raw:
winner/placement, inferred styles, expected score, normalized efficiency,
score-share metrics, aggregate win rates, and head-to-head totals. Expected score
uses contextual fallbacks based on map, player count, and generations; it is not
opponent-adjusted. Inferred style is a heuristic. Both must be described as
observational or inferred, never causal.

## 5. Query or database-view work required

### Repository/query work

- Cards Played needs a verified event writer, player linkage, deduplication,
  source coverage, repository read model, and tests before its current generic
  event rows can support analytics.
- Tile placement and replay need the same event repairs. Missing generation must
  remain missing; it must not be moved to the final generation.
- Corporation–Prelude analytics should return typed corporation and Prelude IDs,
  not force the UI to parse a display label.
- Canonical sole-winner Win Point Differential now has a versioned Step 2.4
  definition and a Step 2.5 finalized-game source adapter. Existing consumers
  still need later parity migrations; tied-first remains indeterminate.
- Score-source queries must preserve null optional fields instead of converting
  unrecorded values to zero.

### Database view or RPC work

- Opponent-adjusted performance needs an approved, versioned model and server-side
  implementation. Existing head-to-head outcomes are suitable inputs, but no
  current rating exists.
- Card acquisition range/outcome analytics will need eligible-game views after
  the source data is added. Views must expose both raw counts and coverage flags,
  not only percentages.
- Global analytics must continue to exclude groups where
  group_settings.global_analytics_enabled is false.

## 6. New persisted data required

New persisted sources are required before the redesign can honestly support:

- Cards Purchased, Cards Seen, all acquisition sources, research offers, draft
  receipts, effect draws, end-hand cards, and full opportunity-source coverage.
- Per-player/per-generation TR and explicit final TR.
- Exact game duration.
- Production/resource snapshots and engine-state timelines.
- Canonical map spaces/coordinates and complete tile-placement events.
- Durable recommendations, recommendation evidence/version, improvement goals,
  and progress observations.

Phase 2 should approve the data model and coverage semantics. Phase 4 should add
reviewable capture/import/finalization. This audit does not prescribe or create a
migration.

## 7. Unsupported capabilities

Current recorded data cannot support:

- Spatial board control, adjacency, control areas, or placement sequence.
- Historical card acquisition/conversion metrics where no source events or
  generation counts were captured.
- Historical final TR or TR timelines from tr_points.
- Historical engine/production timelines from final score totals.
- Causal claims about any input and outcomes.

The free-text board_space event column is not a canonical coordinate system.
The inferred style label board_control and final city/greenery points are not
substitutes for spatial evidence.

## Dedicated Card Acquisition and Conversion audit

### Canonical formulas and eligibility

- Purchase Conversion = Cards Purchased / Cards Seen.
- Purchased Share of Hand Acquisitions = Cards Purchased / Total Cards Entering
  Hand From All Sources.
- Hand Utilization = Cards Played / Total Cards Entering Hand From All Sources.
- End-Hand Carryover = Cards Remaining at Game End / Total Cards Entering Hand
  From All Sources.
- Purchase Pace = Cards Purchased / Recorded Generations.
- Seen Pace = Cards Seen / Recorded Generations.

A rate is unavailable when its denominator is missing or zero. Missing source
coverage is never converted to zero. A zero numerator is valid only when the
source was explicitly observed and recorded as zero.

For any aggregation spanning games, publish both:

1. Ratio of totals: sum(numerator) / sum(denominator) across eligible games.
2. Median per-game rate: median(numerator_game / denominator_game) across the
   same eligible games.

These labels must be visible. Do not average per-game percentages silently.

Cards Seen counts genuine opportunities, not unique card names. A purchase of an
already-seen offered card does not create a second seen opportunity. A genuinely
new presentation of the same named card may count again. This requires an
opportunity/event identity; catalog card_id alone cannot deduplicate it.

### Metric-by-metric audit

| Metric | Classification | Current persistence, paths, forms, consumers | Grain, count/snapshot/event, identity and duplicate risk | History/import/null/exactness | Required work, joins, phase, confidence |
| --- | --- | --- | --- | --- | --- |
| 1. Cards purchased per player per game | Requires new persisted fields or tables | Not persisted. No field in core/import/metric tables, log-game schema, finalize-game.ts, game-draft-repo.ts, game-import-repo.ts, or import form | Required player-game count derived from purchase events or generation rows. No current card/opportunity identity. Same card cannot be assessed | Historical and current imported games: unavailable. Missing versus zero not distinguishable. Not estimated | Add events or nullable generation aggregates plus source coverage and reconciliation; join game_player/game/player/card when identities exist. Phase 2/4. High |
| 2. Cards purchased per player and generation | Requires new persisted fields or tables | Not persisted; generation_count is only a game total | Required player-generation count or individual purchase event. Duplicate generation rows must be prevented; event IDs needed for replay-safe import | No historical/import coverage; missing versus zero impossible; unavailable | Add unique game_player_id + generation_number aggregate or events with acquisition_source=purchase, provenance, coverage. Phase 2/4. High |
| 3. Cards seen per player per game | Requires new persisted fields or tables | Not persisted. No opportunity fields or coverage dimension exists | Required player-game opportunity count from individual presentation events or source-complete aggregates. card_id is optional in generic events and cannot identify one presentation | No historical/import coverage; missing must not become zero; unavailable. Purchased counts cannot be used | Add opportunity records/IDs, source kind, card identity when known, and coverage by source. Phase 2/4. High |
| 4. Cards seen per player and generation | Requires new persisted fields or tables | Not persisted | Required player-generation opportunity count/event. Repeat named cards count only for genuinely distinct presentations; event identity is mandatory | No historical/import coverage; null/zero impossible; unavailable | Add generation-aware opportunity events/aggregates with unique import identity and source coverage. Phase 2/4. High |
| 5. Cards drawn through effects | Requires new persisted fields or tables | No specific event type/writer/form/import mapping. Generic event_type/payload could hold it but has no contract | Prefer individual hand-entry event with source=effect_draw; count aggregate acceptable when identity unavailable. Same named card can enter more than once across distinct events | No verified history/import coverage; missing/zero not distinguishable; unavailable | Define hand-entry source taxonomy, card/opportunity identity, actor, generation, provenance and coverage. Phase 2/4. High |
| 6. Cards offered during research | Requires new persisted fields or tables | No research-offer source | Individual offer opportunity or player-generation count. Offered card identity may be recorded; purchase must link to offer to prevent double-counting seen | No history/import coverage; missing/zero impossible; unavailable | Add research_offer events with offer/research-round identity and coverage. Phase 2/4. High |
| 7. Cards received during drafting | Requires new persisted fields or tables | Drafting configuration and draft receipts are not persisted | Individual draft opportunity/receipt or player-generation count. The same named card in different passes is distinct only when genuinely presented again | No history/import coverage; missing/zero impossible; unavailable | Add drafting-enabled configuration plus draft round/pass/opportunity identity and coverage. Phase 2/4. High |
| 8. Cards entering hand from all sources | Requires new persisted fields or tables | No acquisition ledger or complete source counts | Player-game total derived from nonduplicate hand-entry events. It is not a sum of hand-size snapshots. Unique logical event identity is absent | No history/import coverage; missing/zero impossible; unavailable | Define exhaustive source taxonomy, event IDs, transfers/discards policy, coverage completeness, reconciliation. Phase 2/4. High |
| 9. Cards played | Requires query or repository work | game_log_events can carry event_type=card_played and card_id; game_log_tag_summaries has played_card_count; game-pace-repo.ts reads events; no current event writer or log form was found | Potential individual event plus derived counts. Same card name may be played by different players/games; duplicate imports can double count because no stable source_event_id is present. Unique catalog identity may be available as card_id, physical/logical instance identity is not | Historical/production coverage unverified; current web imports do not populate events. Empty rows do not distinguish zero from unrecorded. Exact only for complete, deduped streams | Implement writer/player linkage/source event identity/coverage, query and tests. Join import-game-player-card. Phase 4/5/13. Medium |
| 10. Cards remaining in hand at game end | Requires new persisted fields or tables | No final hand-size snapshot/form/import field | Required player-game final snapshot count; individual identities optional but useful. Do not derive from acquired minus played without complete discard/transfer data | No history/import coverage; missing/zero impossible; unavailable | Add nullable final snapshot, observed flag, provenance and optional card identities. Phase 2/4. High |
| 11. Purchase conversion | Not currently possible from recorded data | Neither Cards Purchased nor Cards Seen is persisted | Player-game ratio, then ratio-of-totals and median per-game. Opportunity dedupe governs denominator | Historical/imported values unavailable; denominator missing is not zero; no estimate permitted | Add metrics 1-4 first; implement eligible-game view/RPC with coverage/source filters Phase 2/4, analyze Phase 8-13. High |
| 12. Purchased share of hand acquisitions | Not currently possible from recorded data | Purchased and total hand-entry sources are absent | Player-game ratio and two labeled cross-game aggregations. A purchased card is one hand-entry event, not a second acquisition | No history/import coverage; missing denominator unavailable; no estimate | Add purchase and complete hand-entry ledger/coverage first, then view/RPC Phase 8-13. High |
| 13. Hand utilization | Not currently possible from recorded data | Complete acquisitions absent; played events unverified | Player-game ratio and two labeled aggregations. Do not treat repeated hand snapshots as acquisitions | No reliable history/import coverage; missing/zero unresolved; no estimate | Add complete acquisition sources and verified play events, then eligible-game view/RPC Phase 8-13. High |
| 14. End-hand carryover | Not currently possible from recorded data | Acquisition denominator and final hand snapshot absent | Player-game ratio and two labeled aggregations. Final hand is a snapshot, acquisitions are events/counts | No history/import coverage; missing/zero unresolved; no estimate | Add complete acquisition ledger and final snapshot, then view/RPC Phase 8-13. High |
| 15. Purchase pace | Not currently possible from recorded data | games.generation_count exists; purchase numerator does not | Player-game count per recorded generation. Final generation count is exact as entered but does not provide a timeline | No historical/import numerator; missing purchase count cannot become zero | Add purchase data, require positive observed generation denominator, then view/repo Phase 8-13. High |
| 16. Seen pace | Not currently possible from recorded data | games.generation_count exists; seen numerator does not | Player-game opportunities per recorded generation. Must use source-complete seen count | No historical/import seen coverage; missing cannot become zero | Add seen opportunities/source coverage, then view/repo Phase 8-13. High |
| 17. Win rate by purchase-volume range | Not currently possible from recorded data | Outcome sources exist in game_players/player_game_results; purchase axis absent | Range aggregate over eligible player-games. A player-game enters one range; range rules/version must be explicit | Historical/import purchase axis absent. Outcomes exact for finalized games; association observational | Add purchase data, define fixed or data-derived ranges, eligible counts, ratio-of-totals where relevant, confidence/sample flags. Phase 8/10/13. High |
| 18. Win rate by cards-seen range | Not currently possible from recorded data | Outcome sources exist; Cards Seen axis absent | Range aggregate over source-complete player-games; seen opportunities can repeat only as genuine events | No historical/import seen coverage; no estimate. Observational only | Add opportunity/coverage data and versioned range view/RPC. Phase 8/10/13. High |
| 19. Win rate by purchase-conversion range | Not currently possible from recorded data | Outcomes exist; both conversion sources absent | Range aggregate of eligible per-game conversion. Do not group games with missing/zero seen denominator. Also expose ratio-of-totals and median per-game at summary scope | No historical/import conversion coverage; unavailable. Observational only | Add purchase/seen data, eligibility and range/version rules, minimum sample and uncertainty. Phase 8/10/13. High |
| 20. Final score, placement, and win-point differential for each range | Not currently possible from recorded data | total_points/placement/is_winner exist; range axes do not. Canonical win margin is derivable but needs tie policy | Player-game outcomes grouped by separately versioned purchase, seen, or conversion range. Report count, mean/median score, placement distribution/mean, and winner margin eligibility | Historical outcome values exist; acquisition axes do not. Imports do not currently finalize either. Exact only after complete axis data; observational | Add source metrics, canonical margin view, range/coverage joins and context filters. Phase 2 then Phase 8-13. High |

For every metric above, the required authorization join is
card fact/event -> game_player -> game -> group, with player/card joins where an
identity exists. Group analytics must be member-scoped; global analytics must
select only opted-in groups. A current cards.id identifies a catalog entry, not
a physical/logical card instance or one presentation opportunity. No current
acquisition row has an opportunity ID, hand-entry ID, or stable imported
source-event ID. Metrics 11-20 inherit the duplication and identity quality of
their source metrics: a named card may count more than once only when distinct
recorded events genuinely present, acquire, or play it; it must not be recounted
because it remains visible or remains in hand.

### Context adjustment requirements

Raw descriptive results must remain available. Adjusted results may be added only
after sample size and coverage support them, and must be labeled as observational
associations. Required context dimensions and current support are:

| Adjustment/context | Current source | Required treatment |
| --- | --- | --- |
| Generation count | games.generation_count | Use as a denominator/context band only; never reconstruct generation events from it. |
| Game length | No elapsed duration; generation count only | Keep generation count separate from elapsed time. Add explicit duration before time-based adjustment. |
| Player count | games.player_count | Stratify or model; avoid pooling structurally different table sizes without disclosure. |
| Drafting | No explicit persisted drafting flag found | Add game configuration and coverage before adjustment. Do not infer it from catalog metadata or promo selections. |
| Corporation | game_players.corporation_id | Include unknown/missing separately; do not treat unrecorded as a baseline corporation. |
| Prelude | game_player_preludes | Distinguish no-Prelude configuration from missing player Prelude data. Handle multiple Preludes explicitly. |
| Player strength | Finalized player history exists; no rating | Define time-aware rating using only information available before each game; avoid future-data leakage. |
| Opponent strength | Opponent identities/results exist; no rating | Requires approved view/RPC/model and minimum history. Report model/version and uncertainty. |

Range boundaries must be versioned and displayed. If data-derived quantiles are
used, comparisons across filters or time periods must disclose that boundaries
changed. Every chart/table must show eligible player-games, eligible games,
coverage percentage, and low-sample status.

## 8. Historical and imported-game coverage

### Historical application records

The repository proves schema capability, not production completeness. No live
Supabase data was changed or queried for this step. Therefore actual counts,
oldest populated dates, and coverage percentages require later read-only
verification.

- Required core game/player totals should exist for finalized records created by
  the current workflow.
- Optional map, corporation, Prelude, style, key-card, and optional card-score
  fields may be missing.
- Non-null score columns with database/form defaults can contain zero where older
  workflows did not record a component; zero is not automatically proof of an
  observed zero.
- Persisted metric snapshots were introduced after the core schema. The migration
  defines refresh functions, but repository evidence does not prove every older
  game was refreshed successfully or remains current.
- Milestone/award generation timing is not backfillable from final claim rows.
- No historical card acquisition, per-generation TR, final TR, production,
  engine, or coordinate backfill can be created from final totals.

### Imported records

The current web import flow persists raw text and optional screenshot evidence,
then creates a reviewable setup-only draft. It does not populate scores,
corporations, Preludes, styles, key cards, card events, card acquisition,
generation TR, production, or coordinates.

The schema can hold generic events and screenshot extracted_fields, and older or
remote processes may have populated them. Because no current application writer
and no linked-database row audit were found, their actual coverage is
unverified. A missing event row means “not recorded,” not “zero.”

Future imports must carry field-level and opportunity-source coverage, parser
version, confidence, provenance, and stable source-event IDs. Cards Seen coverage
must distinguish at least:

- Full opportunity coverage
- Research-only coverage
- Draft-only coverage
- Purchased-card coverage only
- Partial event coverage
- No Cards Seen coverage

Purchased-card coverage is not Cards Seen coverage.

### Merger always-available Prelude variant (Phase 2 remediation)

The user-confirmed house rule gives every player Merger as an additional Prelude
option while still limiting selections to two. The remediation introduces an
owner-managed group default and a nullable, provenance-bearing game snapshot;
the snapshot, not the current group setting, is authoritative for analytics.
`true`, `false`, and unknown are separate states. Existing historical games
remain unknown until the separately gated, group-scoped historical-policy
backfill is approved and applied.

`game_player_preludes` stores manual selection only. Imported evidence is
reviewable: accepted stable source-card identities map to one canonical Merger
Prelude, actor identity resolves by exact in-game name then confirmed alias, and
ambiguous/unresolved actors remain unresolved. A missing event does not mean the
variant was off, a player rejected Merger, or the log was complete.

The typed calculation defines usage, availability, and selection-given-
availability rates separately. Games with the saved guaranteed rule provide the
Merger availability denominator; non-Merger random offers are never fabricated.
The local migration, schema verification, dry-run counts, idempotent backfill,
and rollback procedure are in
`PHASE-02-MERGER-OFFER-PRODUCTION-PACKAGE.md`. No production audit, schema
change, or backfill has been executed.

## 9. Null-versus-zero risks

The highest current risks are:

1. analytics-repo.ts toNumber converts null, undefined, and invalid numeric input
   to zero for non-nullable mapped fields.
2. The score-source views coalesce nullable microbe, animal, Jovian, and other
   card points to zero before averaging.
3. Several core score components have database defaults of zero, so old rows may
   not prove the value was explicitly observed.
4. Absence of a relationship row can mean “none,” “feature not in use,” or
   “unrecorded” for Preludes, styles, key cards, milestones, awards,
   and events.
5. The group page converts final-action RPC failure to an empty result, making
   unavailable data look like no activity.
6. Profile persisted-metric read failures are converted to empty persisted rows,
   while group reads throw; the scopes have inconsistent missing/error behavior.
7. Current replay construction omits players with no card events and clamps
   missing/invalid event generations to the final generation.

Any new observational count needs both a nullable value and coverage/provenance
that establishes whether zero was observed. Recommended pattern:

- null value + not-observed coverage = unavailable
- zero value + observed coverage = explicitly observed zero
- positive value + partial coverage = lower-bound/partial, clearly labeled
- positive value + full coverage = eligible exact count

Phase 2, Step 2.3 implements the shared TypeScript contracts for this pattern:
metric results, samples, eligibility, coverage evaluation, denominator state,
and minimum-sample state. The current repository and UI heuristics listed above
remain deferred migration work; Step 2.3 did not refactor existing queries,
schema, migrations, or production pages.

Phase 2, Step 2.4 adds pure versioned definitions and calculation utilities for
the approved card-acquisition rates and sole-winner win-point differential. It
does not make card-acquisition facts historically available: until an authorized
repository can supply recorded source facts and their exact coverage, those
rates remain capability-unavailable or non-exact. The tied-first numeric
win-point-differential policy remains unresolved.

Phase 2, Step 2.5 adds typed, authenticated repository operations for bounded
group pages and single RLS-readable finalized games. They preserve stable IDs,
winner/tie evidence, final scores, explicit zero, missing fields, returned-page
coverage, and native/imported provenance, then feed the Step 2.4 differential
through a pure adapter. This source slice does not make card acquisition,
per-generation TR, replay generations, score-source coverage, or global
analytics newly available. Production-wide source population remains
unverified, and the legacy broad analytics consumers remain deferred.

## 10. Authorization and group-scoping risks

- Core and analytics access is group-scoped through membership and shared
  finalized-player access. Future event/snapshot tables must inherit access
  through games and game_players rather than trusting a client-supplied group ID.
- group_members.role persists owner/editor/viewer, but
  20260704034500_make_group_members_equally_privileged.sql makes all members
  effectively write-capable through can_edit_group. Product labels must not imply
  role enforcement that RLS does not provide.
- Analytics views use security_invoker, which is appropriate only if underlying
  table policies remain complete.
- Global summary rows are readable by authenticated users and are rebuilt from
  groups opted in via global_analytics_enabled. New global card analytics must
  enforce the same opt-in during source selection, not only in the UI.
- Snapshot refresh uses security-definer functions with explicit authorization;
  refresh-all is service-role only. Security-definer functions in the exposed
  public schema require continued execute revocation and search_path review.
- tm-import-evidence is private and path-scoped by game ID. Evidence object access
  does not itself authorize derived facts unless the linked game/group checks
  also pass.
- Future recommendation and goal rows need explicit ownership, linked-player
  scope, group visibility, and delete/update policies.
- Handwritten database types and remote-only placeholders increase the chance
  that RLS-sensitive columns/functions differ from the repository's assumptions.

## 11. Recommended schema and query work by phase

| Phase | Recommended data work |
| --- | --- |
| Phase 1 — Shared components | No schema work. Establish shared missing/zero, coverage, sample, and formula display primitives. |
| Phase 2 — Analytics foundation | Approve canonical formulas; define card opportunity/acquisition taxonomy, event identity, coverage, TR/final-TR, duration, production, board coordinates, rating methodology, and generated database types. Centralize canonical win margin and overall differential. |
| Phase 3 — Navigation/routes | No data mutation. Preserve existing authorization/group context. |
| Phase 4 — Log a Game | Add reviewable writers/forms/import mapping for approved card, TR, timing, production, and board sources. Preserve old games without fabrication; add missing/zero/partial/dedup tests and transactional finalization strategy. |
| Phase 5 — Game detail/replay | Repair event actor linkage, stable event IDs, missing generation behavior, coordinate reads, and replay coverage. |
| Phase 6 — My Profile | Consume coverage-aware player read models; no profile-only formula forks. |
| Phase 7 — Leaderboard | Use centralized tie-aware placement/margin and approved opponent adjustment with eligibility. |
| Phase 8 — Global Insights | Add opted-in global eligible-game views for card counts/rates and context segments; show both aggregation methods. |
| Phase 9 — Individual Insights | Add player generation timelines, personal rates, coverage, group/global baselines, and time-aware strength context. |
| Phase 10 — Group Insights | Add group/member distributions and context-adjusted observational comparisons only when supported. |
| Phase 11 — Compare | Compare only compatible scopes/coverage; expose denominators and range versions. |
| Phase 12 — Improvement | Add recommendation evidence/version and goal/progress persistence; require minimum samples and non-causal wording. |
| Phase 13 — Card and Tag Analytics | Build acquisition/conversion range views and exact-value tables after capture coverage exists; validate tags against complete play events. |
| Phase 14 — Corporation/Prelude | Return typed pairing dimensions and distinguish missing from no-Prelude configuration. |
| Phase 15 — Scoring/style | Preserve optional score-source nulls; version/label inferred style heuristics. |
| Phase 16 — Engine/tempo | Use real TR, duration, production, and engine snapshots; do not reconstruct from final totals. |
| Phase 17 — Competition/board | Require canonical coordinates and placement events before spatial analytics. |
| Phase 18 — Objectives/endgame | Add milestone/award timing sources and verify the final-action RPC before use. |
| Phase 19 — Compare/improvement expansion | Add versioned opponent/player-strength adjustment and longitudinal goal analysis. |
| Phase 20 — Release hardening | Verify production coverage, RLS/role behavior, global opt-in, remote schema parity, refresh freshness, and backfill exclusions. |

## 12. Blocking questions

These questions block the affected future capability, not completion of this
audit:

1. Will card acquisition use individual immutable events, per-generation
   aggregates, or a hybrid? How will totals reconcile?
2. What stable opportunity/source-event identity prevents duplicate import and
   links a purchase to the offer already counted as seen?
3. Which source categories constitute full Cards Seen coverage, especially
   starting offers, drafting, inspected cards, and effects that reveal but do not
   put a card into hand?
4. Does Total Cards Entering Hand include every initially kept/purchased starting
   card, transfers, replacements, and cards that enter then immediately leave?
5. How is explicit “drafting disabled” distinguished from missing drafting
   configuration?
6. What is the tied-first canonical win-point-differential value: null/excluded,
   zero with an explicit tie flag, or another separately reported result?
7. What exactly is “overall point differential”: adjacent placement, table
   average, winner, median opponent, or another baseline?
8. What is the authoritative final TR and per-generation TR capture source?
9. Is elapsed game duration required, and if so, what clock/source is
   authoritative?
10. What opponent/player-strength model, population, time window, minimum history,
    and no-future-leakage rules are approved?
11. Does get_final_terraforming_action_stats exist in the linked database, what
    tables feed it, and what RLS/execute grants apply?
12. Are any production game_log_events, game_result_screenshot_imports, tag
    summaries, or metric snapshots populated by processes absent from this
    repository?
13. What minimum sample and coverage thresholds govern each card range and
    adjusted result?
14. Should owner/editor/viewer roles become materially different, or is equal
    member write access intentional?
15. What historical rows are eligible for honest backfill, and which must remain
    permanently “not recorded”?

## Audit evidence and verification limits

The audit inspected all Supabase migrations; all database repositories and their
direct tests; log-game validation, form, finalization, import, OCR, replay,
analytics, and insight paths; SQL verification tests; route/component/state
documentation; redesign decisions and analytics inventory; and the latest Phase
0 handoff.

No production application code was modified. No migration was created or run.
No Supabase data or Storage object was read, written, or changed. The audit did
not begin asset inventory. Local SQL tests are primarily schema/object
verification and do not prove production row coverage or every formula result.
Application tests were not rerun because the change is documentation-only and
the recorded baseline is healthy.

---

# Phase 4, Step 4.3 addendum — import catalog, map, tile, and objective capability (2026-07-18)

This addendum records the Step 4.3 import catalog, map-detection, tile, and
objective capabilities. It follows the same evidence-based rule as the Phase 0
audit: only formats, maps, tiles, and languages actually parsed and tested are
claimed as supported. Nothing here is fabricated to match a product label.

## Fixture matrix (real / sanitized / synthetic)

| Fixture | Location | Kind | Status |
| --- | --- | --- | --- |
| Real result PDF text layer | Two real result PDFs in the operator's Downloads (recorded in the prior Step 4.3 handoff) | Real, private | Parser verified against them; **not committed** to the repository |
| Result-PDF builder helper | `src/lib/imports/fixtures/build-test-pdf.ts` | Synthetic generator | Committed |
| Current flat-ID tile logs (`at NN`, Moon `mNN`) | Inline in `parse-terraforming-mars-tile-actions.test.ts`, `build-imported-board-state.test.ts`, `build-terraforming-mars-log-events.test.ts` | Synthetic | Committed, passing |
| Retained real current flat-ID export | `src/lib/imports/fixtures/retained-real-negative-game-2026-07-15.txt` | Real, privacy-sanitized | Committed; 704 lines and 43 flat-ID placement/removal lines |
| Historical grid tile logs (`on row R position P`) | Inline in the tile-action and board-state tests | Synthetic | Committed, passing |
| Ocean-fingerprint map cases (real placed-ocean sets) | `detect-import-board-map.test.ts`, `detect-import-board-map-independent.test.ts` | Ocean sets validated against real logs/fingerprints | Committed, passing |
| Randomized-objective evidence | `detect-import-board-map*.test.ts` | Synthetic (labelled) | Committed, passing |

The committed privacy-sanitized retained export closes the real-fixture gap for
current flat-ID coordinates and also serves as the Venus/Colonies negative
integration corpus. A privacy-sanitized retained historical-grid export is not
available; historical-grid support remains backed by the evidence-verified
private source and committed synthetic tests.

## Map capability matrix

Eleven maps exist in production. Ten have complete fixed objective sets (exactly
five milestones and five awards each, all relationship foreign keys resolving);
Hollandia has zero fixed relationships and is randomized-only. Every map has an
ocean-reserved-space fingerprint (`map-ocean-fingerprints.ts`).

| Map | Fixed objectives | Ocean fingerprint | Board-defined import | Randomized import | Notes |
| --- | --- | --- | --- | --- | --- |
| Tharsis | Yes (5/5) | Yes | Supported | Supported | Never used as a silent default |
| Hellas | Yes (5/5) | Yes | Supported | Supported | |
| Elysium | Yes (5/5) | Yes | Supported | Supported | |
| Amazonis Planitia | Yes (5/5) | Yes | Supported | Supported | Printed objective aliases pending (see gaps) |
| Arabia Terra | Yes (5/5) | Yes | Supported | Supported | |
| Terra Cimmeria | Yes (5/5) | Yes | Supported | Supported | Board identical to Terra Cimmeria Nova; objectives disambiguate |
| Terra Cimmeria Nova | Yes (5/5) | Yes | Supported | Supported | Board identical to Terra Cimmeria; objectives disambiguate |
| Vastitas Borealis | Yes (5/5) | Yes | Supported | Supported | |
| Vastitas Borealis Nova | Yes (5/5) | Yes | Supported | Supported | |
| Utopia Planitia | Yes (5/5) | Yes | Supported | Supported | |
| Hollandia | No (0/0) | Yes (`randomizedUnsupported: true`) | Conflict — rejected | Supported | Supported only with confirmed randomized objectives |

## Board-defined versus randomized objectives

- `board_defined` — the game used its map's fixed milestone and award set.
  Objectives are validated against the confirmed map's relationship set. Manual
  Entry is always `board_defined`.
- `randomized_limited` / `randomized_full` / `randomized_unspecified` — the game
  used randomized objectives. Objectives are validated against the global
  canonical objective catalog, never a single map's set, and are never used to
  infer the map. Hollandia requires this mode.
- `unknown` — the importer has not confirmed the setup. A draft may hold this
  state during review, but a save is rejected until it is confirmed.

The exported log does not state which setup was used, so it is an explicit
importer input; it is never inferred from the detected map.

## Format support (current / historical / partial / malformed)

| Format | Support | Evidence |
| --- | --- | --- |
| Current flat space IDs (`... placed an ocean tile at 34`) | Supported | Tile-action parser + tests |
| Moon spaces (`... at m05`) | Supported as a distinct Moon board layer | Tile-action parser + tests |
| Historical grid coordinates (`... on row 5 position 3`) | Supported | Tile-action parser + tests |
| Removals (`... removed a tile at NN`) | Supported, order-preserving | Board-state reconstruction + tests |
| Unknown / future tile labels | Retained visible as `isKnownTileType: false` | Tile-type registry + tests |
| Partial evidence (missing oceans or objectives) | Detector returns `ambiguous`/`missing`; importer confirms the map | Independent detector + tests |
| Malformed / conflicting placements | Retained as reviewable board conflicts, not discarded | `build-imported-board-state.ts` conflicts + tests |

## Language support

Support is evidence-based and currently **English only**. The log and result
parsers key on English tokens (`Good luck ...!`, `Generation N`, `... placed ...
tile ...`, `... removed ...`, `... claimed ... milestone`, `... funded ...
award`, `... played ...`). No other language is parsed or tested, so no other
language is claimed as supported. Additional languages must be added with real
evidence, never assumed.

## Tile catalog

The tile parser resolves 45 canonical tile labels from
`terraforming-mars-tile-types.ts`, audited at upstream commit
`7a6f98f09ac2a558969c092d317c313806af7b73`: three standard Mars tiles (greenery,
ocean, city) plus 42 special tiles, seven of which are Moon-board tiles. The
Supabase `public.terraforming_mars_tile_types` table stores the same 45 upstream
`TileType` values (numeric IDs 0..44) with authenticated read-only access; the
live catalog snapshot recorded 45 tile types. Unknown future labels are never
collapsed into a known tile.

## Explicit gaps

- Seven upstream expansion milestones (Hoverlord, Networker, Purifier, One Giant
  Step, Lunarchitect, Risktaker, Tunneler) are absent from the objective catalog.
  A randomized game that used one cannot resolve it until a separately approved,
  source-backed objective sync inserts it. No ID or alias is invented.
- A committed privacy-sanitized retained historical-grid export is not available.
- Objective-alias reference data (printed short forms such as `Amazonis
  Engineer` -> `A. Engineer`) remains a separately gated data-only migration.

# Phase 4, Step 4.3B addendum ? Venus Next and Colonies import capability (2026-07-18)

## Evidence and state matrix

| Capability | Trusted evidence | Stored result | Current support |
| --- | --- | --- | --- |
| Venus Next presence | Explicit exported option, supported Venus movement, or trusted final Venus scale | Detection state plus canonical events/final scale when available | Repository implemented; production schema gated |
| Colonies presence | Explicit exported option, Colony setup, construction, trade, or supported track movement | Detection state plus canonical Colony events | Repository implemented; production schema gated |
| Complete log with no supported events | Both complete-game terminators and zero mechanic events | `confirmed_absent` (No), per user clarification | Implemented and tested |
| Incomplete log | Missing one or both complete-game terminators | `incomplete_evidence` | Implemented and tested |
| Unsupported/conflicting wording | Potential mechanic line without a supported pattern, or contradictory evidence | `unsupported_log_pattern` / `conflicting_evidence` | Implemented and tested; never coerced to absent |
| Related expansion card only | Card play/name without a mechanic action | No presence evidence | Retained real negative fixture verifies this |
| Historical retained log | Same parser plus owner-confirmed historical absence | `historical_parser_verified_owner_confirmed_absent` | Read-only production dry run: 42/42 |
| Historical missing log | Owner confirmation without parser coverage | `historical_owner_confirmed_absent` | Implemented; production dry run found 0 such games |

## Canonical grain and coverage

`game_expansion_facts` is one row per game and preserves detection provenance,
parser version, source coverage, source-log association, optional final Venus
scale, and derived event counts. `game_log_events` is the individual-event grain
and preserves stable player ID when attributed, generation, deterministic event
identity, Venus steps, canonical colony ID, payment/source details, confidence,
raw evidence, parser version, and provenance. Missing before/after/final Venus
values remain null. This specific parser-derived evidence does not restore the
retired generic gameplay-expansion configuration dimension.

Migration `20260718185155_add_venus_colonies_import_facts.sql` and its RLS/static
tests exist in the repository. Production currently lacks the table/columns;
therefore current live consumers cannot query these facts until separately
authorized migration application and backfill verification.

## Historical production dry run

The fixed cutoff is `2026-07-18T00:00:00.000Z`. The read-only run found 42 total
historical games, 42 retained complete logs, 42 parser-confirmed Venus absences,
42 parser-confirmed Colonies absences, zero events, and zero incomplete,
unsupported, conflicting, exception, duplicate, or unresolved results. It plans
42 insert-only rows and performed no production write. Machine/human reports are
in `docs/redesign/reports/phase-04-step-03b/`.
