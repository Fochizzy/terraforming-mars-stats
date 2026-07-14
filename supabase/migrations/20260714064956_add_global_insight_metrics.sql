-- Global insight metrics for the Global Statistics page. The function returns
-- one JSON payload so the page can render the seven top-level meta lenses
-- without issuing one RPC per section.

create or replace function public.get_global_insight_metrics()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with player_results as (
  select
    g.id as game_id,
    g.group_id,
    g.map_id,
    g.player_count,
    g.generation_count,
    gp.id as game_player_id,
    gp.player_id,
    p.display_name as player_name,
    gp.placement,
    gp.is_winner,
    gp.total_points,
    gp.tr_points
  from games g
  join game_players gp on gp.game_id = g.id
  join players p on p.id = gp.player_id
  where g.status = 'finalized'
),
baseline as (
  select
    count(distinct game_id)::int as total_games,
    count(*)::int as player_results,
    coalesce(
      round(avg((case when is_winner then 1 else 0 end)::numeric), 4),
      0
    ) as baseline_win_rate,
    coalesce(round(avg(total_points::numeric), 3), 0) as average_score,
    coalesce(round(avg(generation_count::numeric), 3), 0) as average_generation
  from player_results
),
latest_imports as (
  select distinct on (gli.game_id)
    gli.id as game_log_import_id,
    gli.game_id,
    g.group_id
  from game_log_imports gli
  join games g on g.id = gli.game_id and g.status = 'finalized'
  where btrim(gli.raw_log_text) <> ''
  order by gli.game_id, gli.created_at desc, gli.id desc
),
log_events as (
  select
    li.game_id,
    li.group_id,
    gle.game_log_import_id,
    gle.event_order,
    gle.event_type,
    gle.card_id,
    gle.tile_type,
    gle.resource_type,
    gle.payload,
    coalesce(
      max(gle.generation_number) over (
        partition by gle.game_log_import_id
        order by gle.event_order
        rows between unbounded preceding and current row
      ),
      1
    ) as generation_number
  from latest_imports li
  join game_log_events gle on gle.game_log_import_id = li.game_log_import_id
),
resolved_log_events as (
  select
    le.*,
    resolved.player_id,
    resolved.player_name
  from log_events le
  left join lateral (
    select candidates.player_id, candidates.player_name
    from (
      select
        pia.player_id,
        p.display_name as player_name,
        1 as preference
      from player_import_aliases pia
      join players p on p.id = pia.player_id
      where pia.group_id = le.group_id
        and pia.source_type = 'game_log'
        and pia.normalized_alias = btrim(
          regexp_replace(
            lower(coalesce(le.payload->>'actor', '')),
            '[^a-z0-9]+',
            ' ',
            'g'
          )
        )

      union all

      select
        p.id as player_id,
        p.display_name as player_name,
        2 as preference
      from players p
      where p.group_id = le.group_id
        and p.normalized_display_name = btrim(
          regexp_replace(
            lower(coalesce(le.payload->>'actor', '')),
            '[^a-z0-9]+',
            ' ',
            'g'
          )
        )
    ) candidates
    order by candidates.preference
    limit 1
  ) resolved on true
),
corporation_entries as (
  select
    pr.*,
    c.name as label
  from player_results pr
  join lateral (
    select gpc.corporation_id
    from game_player_corporations gpc
    where gpc.game_player_id = pr.game_player_id

    union all

    select gp.corporation_id
    from game_players gp
    where gp.id = pr.game_player_id
      and gp.corporation_id is not null
      and not exists (
        select 1
        from game_player_corporations gpc
        where gpc.game_player_id = pr.game_player_id
      )
  ) corporation_selections on true
  join corporations c on c.id = corporation_selections.corporation_id
),
prelude_entries as (
  select
    pr.*,
    pre.name as label
  from player_results pr
  join game_player_preludes gpp on gpp.game_player_id = pr.game_player_id
  join preludes pre on pre.id = gpp.prelude_id
),
tag_entries as (
  select
    pr.*,
    upper(ts.tag_code) as label
  from game_log_tag_summaries ts
  join latest_imports li on li.game_log_import_id = ts.game_log_import_id
  join players p
    on p.group_id = li.group_id
   and p.normalized_display_name = ts.normalized_player_name
  join player_results pr
    on pr.game_id = li.game_id
   and pr.player_id = p.id
  where ts.tag_count > 0
),
card_player_timing as (
  select
    rle.game_id,
    rle.player_id,
    rle.card_id,
    min(rle.generation_number) as first_generation
  from resolved_log_events rle
  where rle.event_type = 'card_played'
    and rle.card_id is not null
    and rle.player_id is not null
  group by rle.game_id, rle.player_id, rle.card_id
),
card_entries as (
  select
    pr.*,
    c.card_name as label
  from card_player_timing cpt
  join player_results pr
    on pr.game_id = cpt.game_id
   and pr.player_id = cpt.player_id
  join cards c on c.id = cpt.card_id
),
selection_signals as (
  select
    'Corporation'::text as source_type,
    label,
    count(*)::int as sample_size,
    (count(*) filter (where is_winner))::int as wins,
    round(avg((case when is_winner then 1 else 0 end)::numeric), 4) as win_rate,
    round(avg(total_points::numeric), 3) as average_score
  from corporation_entries
  group by label

  union all

  select
    'Prelude'::text as source_type,
    label,
    count(*)::int as sample_size,
    (count(*) filter (where is_winner))::int as wins,
    round(avg((case when is_winner then 1 else 0 end)::numeric), 4) as win_rate,
    round(avg(total_points::numeric), 3) as average_score
  from prelude_entries
  group by label

  union all

  select
    'Card'::text as source_type,
    label,
    count(*)::int as sample_size,
    (count(*) filter (where is_winner))::int as wins,
    round(avg((case when is_winner then 1 else 0 end)::numeric), 4) as win_rate,
    round(avg(total_points::numeric), 3) as average_score
  from card_entries
  group by label

  union all

  select
    'Tag'::text as source_type,
    label,
    count(*)::int as sample_size,
    (count(*) filter (where is_winner))::int as wins,
    round(avg((case when is_winner then 1 else 0 end)::numeric), 4) as win_rate,
    round(avg(total_points::numeric), 3) as average_score
  from tag_entries
  group by label
),
meta_ranked as (
  select
    ss.*,
    b.baseline_win_rate,
    round(ss.win_rate - b.baseline_win_rate, 4) as win_rate_delta,
    row_number() over (
      order by ss.win_rate - b.baseline_win_rate desc, ss.sample_size desc, ss.label
    ) as over_rank,
    row_number() over (
      order by ss.win_rate - b.baseline_win_rate asc, ss.sample_size desc, ss.label
    ) as under_rank
  from selection_signals ss
  cross join baseline b
  where ss.sample_size >= 3
),
meta_signal_output as (
  select
    'overperformer'::text as direction,
    over_rank as sort_order,
    *
  from meta_ranked
  where over_rank <= 4 and win_rate_delta > 0

  union all

  select
    'dragger'::text as direction,
    10 + under_rank as sort_order,
    *
  from meta_ranked
  where under_rank <= 4 and win_rate_delta < 0
),
tempo_rows as (
  select
    case
      when generation_count <= 9 then 'short'
      when generation_count <= 11 then 'standard'
      else 'long'
    end as bucket,
    case
      when generation_count <= 9 then 'Short games'
      when generation_count <= 11 then 'Standard games'
      else 'Long games'
    end as label,
    count(distinct game_id)::int as games,
    count(*)::int as player_results,
    (count(*) filter (where is_winner))::int as wins,
    round(avg((case when is_winner then 1 else 0 end)::numeric), 4) as win_rate,
    round(avg(total_points::numeric), 3) as average_score,
    round(avg(total_points::numeric / nullif(generation_count, 0)), 3) as average_points_per_generation,
    round(avg(generation_count::numeric), 3) as average_generation
  from player_results
  group by
    case
      when generation_count <= 9 then 'short'
      when generation_count <= 11 then 'standard'
      else 'long'
    end,
    case
      when generation_count <= 9 then 'Short games'
      when generation_count <= 11 then 'Standard games'
      else 'Long games'
    end
),
terraforming_events as (
  select
    rle.game_id,
    rle.player_id,
    rle.player_name,
    case
      when rle.event_type = 'tile_placed'
        and lower(coalesce(rle.tile_type, '')) = 'greenery'
        then 'oxygen'
      when rle.event_type = 'tile_placed'
        and lower(coalesce(rle.tile_type, '')) = 'ocean'
        then 'ocean'
      when lower(coalesce(rle.payload->>'parameterType', rle.resource_type, '')) = 'temperature'
        then 'heat'
      else lower(coalesce(rle.payload->>'parameterType', rle.resource_type, ''))
    end as parameter_type
  from resolved_log_events rle
  where rle.player_id is not null
    and (
      (
        rle.event_type = 'global_parameter_changed'
        and lower(coalesce(rle.payload->>'parameterType', rle.resource_type, '')) in (
          'ocean',
          'oxygen',
          'temperature',
          'heat'
        )
      )
      or (
        rle.event_type = 'tile_placed'
        and lower(coalesce(rle.tile_type, '')) in ('greenery', 'ocean')
      )
    )
),
terraforming_totals as (
  select count(*)::int as total_actions
  from terraforming_events
),
terraforming_rows as (
  select
    te.player_id,
    te.player_name,
    count(*)::int as total_actions,
    (count(*) filter (where te.parameter_type = 'heat'))::int as heat_actions,
    (count(*) filter (where te.parameter_type = 'oxygen'))::int as oxygen_actions,
    (count(*) filter (where te.parameter_type = 'ocean'))::int as ocean_actions,
    round(count(*)::numeric / nullif(tt.total_actions, 0), 4) as action_share
  from terraforming_events te
  cross join terraforming_totals tt
  group by te.player_id, te.player_name, tt.total_actions
),
milestone_objectives as (
  select
    'milestone'::text as objective_type,
    ms.name as label,
    count(*)::int as actions,
    null::int as sniped_actions,
    (count(*) filter (where gp.is_winner))::int as wins,
    round(avg((case when gp.is_winner then 1 else 0 end)::numeric), 4) as win_rate,
    round(
      count(*)::numeric / nullif((select total_games from baseline), 0),
      4
    ) as conversion_rate,
    null::numeric as sniped_rate
  from game_milestones gm
  join games g on g.id = gm.game_id and g.status = 'finalized'
  join milestones ms on ms.id = gm.milestone_id
  join game_players gp on gp.id = gm.winner_game_player_id
  group by ms.name
),
funded_awards as (
  select
    a.name as award_name,
    ga.game_id,
    ga.award_id,
    ga.funded_by_game_player_id,
    bool_or(funder_gp.is_winner) as funder_game_won,
    bool_or(
      ga.place = 1
      and ga.winner_game_player_id = ga.funded_by_game_player_id
    ) as funder_first_place
  from game_awards ga
  join games g on g.id = ga.game_id and g.status = 'finalized'
  join awards a on a.id = ga.award_id
  join game_players funder_gp on funder_gp.id = ga.funded_by_game_player_id
  group by a.name, ga.game_id, ga.award_id, ga.funded_by_game_player_id
),
award_objectives as (
  select
    'award'::text as objective_type,
    award_name as label,
    count(*)::int as actions,
    (count(*) filter (where not funder_first_place))::int as sniped_actions,
    (count(*) filter (where funder_game_won))::int as wins,
    round(avg((case when funder_game_won then 1 else 0 end)::numeric), 4) as win_rate,
    round(
      count(*)::numeric / nullif((select total_games from baseline), 0),
      4
    ) as conversion_rate,
    round(
      (count(*) filter (where not funder_first_place))::numeric / nullif(count(*), 0),
      4
    ) as sniped_rate
  from funded_awards
  group by award_name
),
objective_rows as (
  select * from milestone_objectives
  union all
  select * from award_objectives
),
map_rows as (
  select
    'map'::text as category,
    coalesce(m.name, 'Unknown Map') as label,
    count(distinct pr.game_id)::int as games,
    count(*)::int as player_results,
    round(avg(pr.total_points::numeric), 3) as average_score,
    round(avg(pr.generation_count::numeric), 3) as average_generation,
    null::numeric as win_rate
  from player_results pr
  left join maps m on m.id = pr.map_id
  group by coalesce(m.name, 'Unknown Map')
),
table_size_rows as (
  select
    'tableSize'::text as category,
    concat(player_count, '-player tables') as label,
    count(distinct game_id)::int as games,
    count(*)::int as player_results,
    round(avg(total_points::numeric), 3) as average_score,
    round(avg(generation_count::numeric), 3) as average_generation,
    round(avg((case when is_winner then 1 else 0 end)::numeric), 4) as win_rate
  from player_results
  group by player_count
),
map_table_rows as (
  select * from map_rows
  union all
  select * from table_size_rows
),
opening_combo_entries as (
  select
    pr.game_player_id,
    pr.is_winner,
    pr.total_points,
    coalesce(c.name, 'Unknown corporation') as corporation_name,
    coalesce(prelude_sets.prelude_label, 'No Prelude') as prelude_label
  from player_results pr
  left join lateral (
    select gpc.corporation_id
    from game_player_corporations gpc
    where gpc.game_player_id = pr.game_player_id

    union all

    select gp.corporation_id
    from game_players gp
    where gp.id = pr.game_player_id
      and gp.corporation_id is not null
      and not exists (
        select 1
        from game_player_corporations gpc
        where gpc.game_player_id = pr.game_player_id
      )
  ) corporation_selections on true
  left join corporations c on c.id = corporation_selections.corporation_id
  left join lateral (
    select string_agg(pre.name, ' + ' order by pre.name) as prelude_label
    from game_player_preludes gpp
    join preludes pre on pre.id = gpp.prelude_id
    where gpp.game_player_id = pr.game_player_id
  ) prelude_sets on true
),
opening_combo_stats as (
  select
    corporation_name,
    prelude_label,
    concat_ws(' | ', corporation_name, prelude_label) as label,
    count(*)::int as plays,
    (count(*) filter (where is_winner))::int as wins,
    round(avg((case when is_winner then 1 else 0 end)::numeric), 4) as win_rate,
    round(avg(total_points::numeric), 3) as average_score,
    round(coalesce(stddev_samp(total_points::numeric), 0), 3) as score_deviation
  from opening_combo_entries
  group by corporation_name, prelude_label
),
opening_combo_ranked as (
  select
    *,
    row_number() over (
      order by win_rate desc, plays desc, average_score desc, label
    ) as best_rank,
    row_number() over (
      order by win_rate asc, plays desc, average_score asc, label
    ) as trap_rank,
    row_number() over (
      order by score_deviation desc, plays desc, label
    ) as variance_rank
  from opening_combo_stats
  where plays >= 3
),
opening_combo_output as (
  select 'best'::text as signal_type, best_rank as sort_order, *
  from opening_combo_ranked
  where best_rank <= 3

  union all

  select 'trap'::text as signal_type, 10 + trap_rank as sort_order, *
  from opening_combo_ranked
  where trap_rank <= 3

  union all

  select 'highVariance'::text as signal_type, 20 + variance_rank as sort_order, *
  from opening_combo_ranked
  where variance_rank <= 3
),
card_timing_stats as (
  select
    c.card_name,
    count(*) filter (where cpt.first_generation <= 5) as early_plays,
    count(*) filter (where cpt.first_generation > 5) as late_plays,
    count(*) filter (where cpt.first_generation <= 5 and pr.is_winner) as early_wins,
    count(*) filter (where cpt.first_generation > 5 and pr.is_winner) as late_wins,
    round(
      avg((case when pr.is_winner then 1 else 0 end)::numeric)
        filter (where cpt.first_generation <= 5),
      4
    ) as early_win_rate,
    round(
      avg((case when pr.is_winner then 1 else 0 end)::numeric)
        filter (where cpt.first_generation > 5),
      4
    ) as late_win_rate
  from card_player_timing cpt
  join player_results pr
    on pr.game_id = cpt.game_id
   and pr.player_id = cpt.player_id
  join cards c on c.id = cpt.card_id
  group by c.card_name
),
card_timing_rows as (
  select
    card_name,
    early_plays::int as early_plays,
    late_plays::int as late_plays,
    early_wins::int as early_wins,
    late_wins::int as late_wins,
    early_win_rate,
    late_win_rate,
    round(early_win_rate - late_win_rate, 4) as win_rate_delta
  from card_timing_stats
  where early_plays >= 2
    and late_plays >= 2
    and early_win_rate is not null
    and late_win_rate is not null
)
select jsonb_build_object(
  'summary',
  (select to_jsonb(b) from baseline b),
  'metaSignals',
  (select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'direction', direction,
        'sourceType', source_type,
        'label', label,
        'sampleSize', sample_size,
        'wins', wins,
        'winRate', win_rate,
        'baselineWinRate', baseline_win_rate,
        'winRateDelta', win_rate_delta,
        'averageScore', average_score
      )
      order by sort_order, source_type, label
    ),
    '[]'::jsonb
  ) from meta_signal_output),
  'tempoProfile',
  (select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'bucket', bucket,
        'label', label,
        'games', games,
        'playerResults', player_results,
        'wins', wins,
        'winRate', win_rate,
        'averageScore', average_score,
        'averagePointsPerGeneration', average_points_per_generation,
        'averageGeneration', average_generation
      )
      order by case bucket when 'short' then 1 when 'standard' then 2 else 3 end
    ),
    '[]'::jsonb
  ) from tempo_rows),
  'terraformingShare',
  (select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'playerId', player_id,
        'playerName', player_name,
        'totalActions', total_actions,
        'heatActions', heat_actions,
        'oxygenActions', oxygen_actions,
        'oceanActions', ocean_actions,
        'actionShare', action_share
      )
      order by total_actions desc, action_share desc, player_name
    ),
    '[]'::jsonb
  ) from (select * from terraforming_rows order by total_actions desc, player_name limit 12) tr),
  'objectiveConversion',
  (select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'objectiveType', objective_type,
        'label', label,
        'actions', actions,
        'snipedActions', sniped_actions,
        'wins', wins,
        'winRate', win_rate,
        'conversionRate', conversion_rate,
        'snipedRate', sniped_rate
      )
      order by actions desc, objective_type, label
    ),
    '[]'::jsonb
  ) from (select * from objective_rows order by actions desc, label limit 12) objectives),
  'mapTableMeta',
  (select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'category', category,
        'label', label,
        'games', games,
        'playerResults', player_results,
        'averageScore', average_score,
        'averageGeneration', average_generation,
        'winRate', win_rate
      )
      order by category, games desc, label
    ),
    '[]'::jsonb
  ) from (select * from map_table_rows order by category, games desc, label limit 16) map_table),
  'openingCombos',
  (select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'signalType', signal_type,
        'label', label,
        'corporationName', corporation_name,
        'preludeLabel', prelude_label,
        'plays', plays,
        'wins', wins,
        'winRate', win_rate,
        'averageScore', average_score,
        'scoreDeviation', score_deviation
      )
      order by sort_order, label
    ),
    '[]'::jsonb
  ) from opening_combo_output),
  'cardTiming',
  (select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'cardName', card_name,
        'earlyPlays', early_plays,
        'latePlays', late_plays,
        'earlyWins', early_wins,
        'lateWins', late_wins,
        'earlyWinRate', early_win_rate,
        'lateWinRate', late_win_rate,
        'winRateDelta', win_rate_delta
      )
      order by abs(win_rate_delta) desc, early_plays + late_plays desc, card_name
    ),
    '[]'::jsonb
  ) from (select * from card_timing_rows order by abs(win_rate_delta) desc, early_plays + late_plays desc, card_name limit 10) timing)
);
$$;

revoke all on function public.get_global_insight_metrics() from public;
grant execute on function public.get_global_insight_metrics() to authenticated;

-- Backfill profile-model fields introduced for richer imported-log analytics:
-- source/target attribution for removal events, resource-vs-production deltas,
-- and generation numbers on every event after a generation marker.

set lock_timeout = '5s';
set statement_timeout = '60s';

with inferred_generations as (
  select
    gle.id,
    max(gle.generation_number) filter (
      where gle.event_type = 'generation_started'
    ) over (
      partition by gle.game_log_import_id
      order by gle.event_order
      rows between unbounded preceding and current row
    ) as inferred_generation_number
  from public.game_log_events gle
)
update public.game_log_events gle
set generation_number = inferred.inferred_generation_number
from inferred_generations inferred
where gle.id = inferred.id
  and gle.generation_number is null
  and inferred.inferred_generation_number is not null;

with resource_events as (
  select
    gle.id,
    gle.card_id,
    gle.event_order,
    gle.game_log_import_id,
    gle.payload,
    gle.raw_line,
    gle.resource_type,
    lower(coalesce(gle.payload ->> 'operation', '')) = 'removed' as is_removed,
    regexp_match(
      gle.raw_line,
      '^\s*(.+?)\s+removed\s+\d+\s+([A-Za-z][A-Za-z -]*?)\s+from\s+(.+?)\s*$',
      'i'
    ) as targeted_removal_match
  from public.game_log_events gle
  where gle.event_type = 'resource_changed'
),
resolved_events as (
  select
    resource_events.id,
    case
      when lower(coalesce(resource_events.payload ->> 'deltaKind', '')) = 'production'
        then 'production'
      when lower(coalesce(resource_events.payload ->> 'resourceDeltaKind', '')) = 'production'
        then 'production'
      when coalesce(resource_events.resource_type, '') ~* '\mproduction\M'
        then 'production'
      when coalesce(resource_events.raw_line, '') ~* '\mproduction\M'
        then 'production'
      else 'resource'
    end as delta_kind,
    nullif(
      btrim(
        regexp_replace(
          regexp_replace(
            coalesce(
              resource_events.resource_type,
              resource_events.payload ->> 'resourceType',
              'resource'
            ),
            '[-_]+',
            ' ',
            'g'
          ),
          '\s*\mproduction\M\s*',
          ' ',
          'gi'
        )
      ),
      ''
    ) as resource_track,
    case
      when resource_events.is_removed then coalesce(
        resource_events.payload ->> 'sourcePlayerName',
        resource_events.payload ->> 'sourcePlayer',
        resource_events.payload ->> 'sourceActor',
        resource_events.payload ->> 'attacker',
        case
          when resource_events.targeted_removal_match is not null
            then btrim(resource_events.targeted_removal_match[1])
          else prior_card.payload ->> 'actor'
        end
      )
      else null
    end as source_player_name,
    case
      when resource_events.is_removed then coalesce(
        resource_events.payload ->> 'targetPlayerName',
        resource_events.payload ->> 'affectedPlayer',
        resource_events.payload ->> 'targetPlayer',
        resource_events.payload ->> 'target',
        resource_events.payload ->> 'opponent',
        resource_events.payload ->> 'removedFrom',
        case
          when resource_events.targeted_removal_match is not null
            then btrim(resource_events.targeted_removal_match[3])
          else resource_events.payload ->> 'actor'
        end
      )
      else null
    end as target_player_name,
    case
      when resource_events.is_removed then coalesce(
        resource_events.payload ->> 'affectedPlayer',
        case
          when resource_events.targeted_removal_match is not null
            then btrim(resource_events.targeted_removal_match[3])
          else null
        end
      )
      else null
    end as affected_player
  from resource_events
  left join lateral (
    select prior.payload
    from public.game_log_events prior
    where prior.game_log_import_id = resource_events.game_log_import_id
      and prior.event_type = 'card_played'
      and prior.event_order < resource_events.event_order
      and (
        (
          resource_events.card_id is not null
          and prior.card_id = resource_events.card_id
        )
        or (
          nullif(
            btrim(
              regexp_replace(
                lower(coalesce(prior.payload ->> 'cardName', '')),
                '[^a-z0-9]+',
                ' ',
                'g'
              )
            ),
            ''
          ) = nullif(
            btrim(
              regexp_replace(
                lower(coalesce(resource_events.payload ->> 'cardName', '')),
                '[^a-z0-9]+',
                ' ',
                'g'
              )
            ),
            ''
          )
        )
      )
    order by prior.event_order desc
    limit 1
  ) prior_card on true
)
update public.game_log_events gle
set
  payload = jsonb_strip_nulls(
    coalesce(gle.payload, '{}'::jsonb)
    || jsonb_build_object('deltaKind', resolved.delta_kind)
    || case
      when resolved.source_player_name is not null
        then jsonb_build_object('sourcePlayerName', resolved.source_player_name)
      else '{}'::jsonb
    end
    || case
      when resolved.target_player_name is not null
        then jsonb_build_object('targetPlayerName', resolved.target_player_name)
      else '{}'::jsonb
    end
    || case
      when resolved.affected_player is not null
        then jsonb_build_object('affectedPlayer', resolved.affected_player)
      else '{}'::jsonb
    end
  ),
  resource_type = coalesce(resolved.resource_track, gle.resource_type)
from resolved_events resolved
where gle.id = resolved.id
  and (
    gle.payload is distinct from jsonb_strip_nulls(
      coalesce(gle.payload, '{}'::jsonb)
      || jsonb_build_object('deltaKind', resolved.delta_kind)
      || case
        when resolved.source_player_name is not null
          then jsonb_build_object('sourcePlayerName', resolved.source_player_name)
        else '{}'::jsonb
      end
      || case
        when resolved.target_player_name is not null
          then jsonb_build_object('targetPlayerName', resolved.target_player_name)
        else '{}'::jsonb
      end
      || case
        when resolved.affected_player is not null
          then jsonb_build_object('affectedPlayer', resolved.affected_player)
        else '{}'::jsonb
      end
    )
    or gle.resource_type is distinct from coalesce(
      resolved.resource_track,
      gle.resource_type
    )
  );
