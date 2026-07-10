-- Tracks how often players explicitly played the Merger prelude in imported
-- game logs, and compares those log-backed games against their non-Merger
-- imported results. If a finalized imported log does not mention Merger for a
-- player, that player's result is counted as non-Merger.
create or replace function public.get_merger_impact_stats(target_group_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with latest_imports as (
  select distinct on (gli.game_id)
    gli.id as game_log_import_id,
    gli.game_id
  from game_log_imports gli
  join games g on g.id = gli.game_id
  where g.group_id = target_group_id
    and g.status = 'finalized'
    and btrim(gli.raw_log_text) <> ''
  order by gli.game_id, gli.created_at desc, gli.id desc
),
player_results as (
  select
    gp.id as game_player_id,
    gp.game_id,
    gp.player_id,
    p.display_name as player_name,
    gp.is_winner
  from latest_imports li
  join game_players gp on gp.game_id = li.game_id
  join players p on p.id = gp.player_id
),
merger_mentions as (
  select distinct
    li.game_id,
    resolved.player_id
  from latest_imports li
  join games g on g.id = li.game_id
  join game_log_events gle on gle.game_log_import_id = li.game_log_import_id
  join lateral (
    select candidates.player_id
    from (
      select pia.player_id, 1 as preference
      from player_import_aliases pia
      where pia.group_id = g.group_id
        and pia.source_type = 'game_log'
        and pia.normalized_alias = btrim(
          regexp_replace(lower(coalesce(gle.payload->>'actor', '')), '[^a-z0-9]+', ' ', 'g')
        )
      union all
      select p.id as player_id, 2 as preference
      from players p
      where p.group_id = g.group_id
        and p.normalized_display_name = btrim(
          regexp_replace(lower(coalesce(gle.payload->>'actor', '')), '[^a-z0-9]+', ' ', 'g')
        )
    ) candidates
    order by candidates.preference
    limit 1
  ) resolved on true
  where gle.event_type = 'card_played'
    and btrim(
      regexp_replace(lower(coalesce(gle.payload->>'cardName', '')), '[^a-z0-9]+', ' ', 'g')
    ) = 'merger'
),
result_flags as (
  select
    pr.*,
    exists (
      select 1
      from merger_mentions mm
      where mm.game_id = pr.game_id
        and mm.player_id = pr.player_id
    ) as played_merger
  from player_results pr
),
player_stats as (
  select
    rf.player_id,
    rf.player_name,
    count(*)::int as imported_games,
    (count(*) filter (where rf.played_merger))::int as merger_games,
    (count(*) filter (where rf.played_merger and rf.is_winner))::int as merger_wins,
    round(
      (count(*) filter (where rf.played_merger))::numeric / count(*),
      4
    ) as merger_play_rate,
    round(
      (count(*) filter (where rf.played_merger and rf.is_winner))::numeric /
        nullif(count(*) filter (where rf.played_merger), 0),
      4
    ) as merger_win_rate,
    (count(*) filter (where not rf.played_merger))::int as non_merger_games,
    (count(*) filter (where not rf.played_merger and rf.is_winner))::int as non_merger_wins,
    round(
      (count(*) filter (where not rf.played_merger and rf.is_winner))::numeric /
        nullif(count(*) filter (where not rf.played_merger), 0),
      4
    ) as non_merger_win_rate
  from result_flags rf
  group by rf.player_id, rf.player_name
)
select coalesce(
  jsonb_agg(
    to_jsonb(ps) || jsonb_build_object(
      'win_rate_delta',
      case
        when ps.merger_games > 0 and ps.non_merger_games > 0
          then round(ps.merger_win_rate - ps.non_merger_win_rate, 4)
        else null
      end
    )
    order by ps.merger_games desc, ps.imported_games desc, ps.player_name
  ),
  '[]'::jsonb
)
from player_stats ps;
$$;

revoke all on function public.get_merger_impact_stats(uuid) from public;
grant execute on function public.get_merger_impact_stats(uuid) to authenticated;
