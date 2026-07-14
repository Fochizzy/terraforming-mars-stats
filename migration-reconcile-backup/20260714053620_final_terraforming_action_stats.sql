-- Finds the last terraforming-related action in each imported game log and
-- compares the acting player's win rate in those games against their imported
-- results in the selected scope.
create or replace function public.get_final_terraforming_action_stats(
  scope text default 'personal',
  target_group_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with scoped_games as (
  select g.id, g.group_id
  from games g
  where g.status = 'finalized'
    and (
      scope = 'global'
      or (
        scope = 'personal'
        and exists (
          select 1
          from game_players gp_self
          join players p_self on p_self.id = gp_self.player_id
          where gp_self.game_id = g.id
            and p_self.linked_user_id = auth.uid()
        )
      )
      or (
        scope = 'group'
        and target_group_id is not null
        and g.group_id = target_group_id
        and public.can_read_game(g.id)
      )
    )
),
latest_imports as (
  select distinct on (gli.game_id)
    gli.id as game_log_import_id,
    gli.game_id
  from game_log_imports gli
  join scoped_games sg on sg.id = gli.game_id
  where btrim(gli.raw_log_text) <> ''
  order by gli.game_id, gli.created_at desc, gli.id desc
),
player_results as (
  select
    gp.game_id,
    gp.player_id,
    p.display_name as player_name,
    gp.is_winner
  from latest_imports li
  join game_players gp on gp.game_id = li.game_id
  join players p on p.id = gp.player_id
),
terraforming_events as (
  select
    li.game_id,
    gle.event_order,
    coalesce(gle.payload->>'actor', '') as actor,
    case
      when gle.event_type = 'tile_placed'
        and lower(coalesce(gle.tile_type, '')) = 'greenery'
        then 'oxygen'
      when gle.event_type = 'tile_placed'
        and lower(coalesce(gle.tile_type, '')) = 'ocean'
        then 'ocean'
      else lower(coalesce(gle.payload->>'parameterType', gle.resource_type, ''))
    end as action_type,
    gle.raw_line
  from latest_imports li
  join game_log_events gle on gle.game_log_import_id = li.game_log_import_id
  where (
      gle.event_type = 'global_parameter_changed'
      and lower(coalesce(gle.payload->>'parameterType', gle.resource_type, '')) in (
        'ocean',
        'oxygen',
        'temperature'
      )
    )
    or (
      gle.event_type = 'tile_placed'
      and lower(coalesce(gle.tile_type, '')) in ('greenery', 'ocean')
    )
),
ranked_terraforming_events as (
  select
    te.*,
    row_number() over (
      partition by te.game_id
      order by te.event_order desc
    ) as action_rank
  from terraforming_events te
),
resolved_final_actions as (
  select
    rte.game_id,
    pr.player_id,
    rte.action_type,
    pr.is_winner
  from ranked_terraforming_events rte
  join scoped_games sg on sg.id = rte.game_id
  join lateral (
    select candidates.player_id
    from (
      select pia.player_id, 1 as preference
      from player_import_aliases pia
      where pia.group_id = sg.group_id
        and pia.source_type = 'game_log'
        and pia.normalized_alias = btrim(
          regexp_replace(lower(rte.actor), '[^a-z0-9]+', ' ', 'g')
        )
      union all
      select p.id as player_id, 2 as preference
      from players p
      where p.group_id = sg.group_id
        and p.normalized_display_name = btrim(
          regexp_replace(lower(rte.actor), '[^a-z0-9]+', ' ', 'g')
        )
    ) candidates
    order by candidates.preference
    limit 1
  ) resolved on true
  join player_results pr
    on pr.game_id = rte.game_id
   and pr.player_id = resolved.player_id
  where rte.action_rank = 1
),
player_baselines as (
  select
    pr.player_id,
    pr.player_name,
    count(*)::int as imported_games,
    (count(*) filter (where pr.is_winner))::int as overall_wins,
    round(
      (count(*) filter (where pr.is_winner))::numeric / nullif(count(*), 0),
      4
    ) as overall_win_rate
  from player_results pr
  group by pr.player_id, pr.player_name
),
player_final_actions as (
  select
    rfa.player_id,
    count(*)::int as final_action_games,
    (count(*) filter (where rfa.is_winner))::int as final_action_wins,
    round(
      (count(*) filter (where rfa.is_winner))::numeric / nullif(count(*), 0),
      4
    ) as final_action_win_rate
  from resolved_final_actions rfa
  group by rfa.player_id
),
action_type_counts as (
  select
    rfa.player_id,
    rfa.action_type,
    count(*)::int as action_count
  from resolved_final_actions rfa
  group by rfa.player_id, rfa.action_type
),
ranked_action_types as (
  select
    atc.*,
    row_number() over (
      partition by atc.player_id
      order by atc.action_count desc, atc.action_type
    ) as action_type_rank
  from action_type_counts atc
)
select coalesce(
  jsonb_agg(
    jsonb_build_object(
      'player_id', pb.player_id,
      'player_name', pb.player_name,
      'imported_games', pb.imported_games,
      'overall_wins', pb.overall_wins,
      'overall_win_rate', pb.overall_win_rate,
      'final_action_games', pfa.final_action_games,
      'final_action_wins', pfa.final_action_wins,
      'final_action_rate',
        round(pfa.final_action_games::numeric / nullif(pb.imported_games, 0), 4),
      'final_action_win_rate', pfa.final_action_win_rate,
      'win_rate_delta',
        case
          when pfa.final_action_win_rate is not null and pb.overall_win_rate is not null
            then round(pfa.final_action_win_rate - pb.overall_win_rate, 4)
          else null
        end,
      'most_common_action_type', rat.action_type,
      'most_common_action_count', rat.action_count
    )
    order by
      pfa.final_action_games desc,
      pfa.final_action_win_rate desc nulls last,
      pb.imported_games desc,
      pb.player_name
  ),
  '[]'::jsonb
)
from player_final_actions pfa
join player_baselines pb on pb.player_id = pfa.player_id
left join ranked_action_types rat
  on rat.player_id = pfa.player_id
 and rat.action_type_rank = 1;
$$;

revoke all on function public.get_final_terraforming_action_stats(text, uuid) from public;
grant execute on function public.get_final_terraforming_action_stats(text, uuid) to authenticated;
