\echo '=== game_log_tag_summaries (root) ==='
select game_log_import_id, game_player_id, normalized_player_name, tag_code, tag_count, total_tag_count, played_card_count, matched_card_count, unresolved_card_count, updated_at
from public.game_log_tag_summaries
order by game_log_import_id, normalized_player_name, tag_code;

\echo '=== game_player_metric_snapshots ==='
select game_id, game_player_id, total_tag_count, played_card_count, matched_played_card_count, unresolved_played_card_count, updated_at
from public.game_player_metric_snapshots
order by game_id, game_player_id;

\echo '=== game_player_tag_metric_snapshots ==='
select game_id, game_player_id, tag_code, tag_count, total_tag_count, played_card_count, matched_card_count, unresolved_card_count, updated_at
from public.game_player_tag_metric_snapshots
order by game_id, game_player_id, tag_code;

\echo '=== rebuild_marker count ==='
select count(*) as rebuild_call_count from public._rebuild_marker;
