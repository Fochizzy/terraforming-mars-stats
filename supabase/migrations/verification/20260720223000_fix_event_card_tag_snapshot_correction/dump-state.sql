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

\echo '=== game_milestone_metric_snapshots ==='
select game_id, game_milestone_id, milestone_id, winner_game_player_id, updated_at
from public.game_milestone_metric_snapshots
order by game_id, game_milestone_id;

\echo '=== game_award_metric_snapshots ==='
select game_id, game_award_id, award_id, funded_by_game_player_id, winner_game_player_id, updated_at
from public.game_award_metric_snapshots
order by game_id, game_award_id;

\echo '=== rebuild_marker count by kind (expect exactly one base + one additional per successful migration run that touched >=1 game; zero of either on a run that touched no games) ==='
select kind, count(*) as call_count
from public._rebuild_marker
group by kind
order by kind;

\echo '=== rebuild_metric_summaries() live definition (must be byte-identical to the pre-migration baseline once the migration transaction has committed) ==='
select pg_get_functiondef('public.rebuild_metric_summaries()'::regprocedure) as def;

\echo '=== rebuild_metric_summaries() ACL (must remain owner-only: no public/anon/authenticated) ==='
select proacl::text as acl from pg_proc where oid = 'public.rebuild_metric_summaries()'::regprocedure;

\echo '=== refresh_game_metric_snapshots_internal(uuid, boolean) ACL (must remain unchanged: authenticated + owner only) ==='
select proacl::text as acl from pg_proc where oid = 'public.refresh_game_metric_snapshots_internal(uuid, boolean)'::regprocedure;
