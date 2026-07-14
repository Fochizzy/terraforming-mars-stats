-- Add the missing objective-detail statistics used by clickable milestone and
-- award dialogs. Existing award outcome columns keep their order; new fields
-- append after funder_won_rate so current consumers remain compatible.

create or replace view analytics.group_award_outcomes
with (security_invoker = true) as
with funded_awards as (
  select
    g.group_id,
    a.id as award_id,
    a.name as award_name,
    ga.game_id,
    ga.funded_by_game_player_id,
    bool_or(funder_gp.is_winner) as funder_game_won,
    bool_or(
      ga.place = 1
      and ga.winner_game_player_id = ga.funded_by_game_player_id
    ) as funder_first_place,
    bool_or(
      ga.place = 2
      and ga.winner_game_player_id = ga.funded_by_game_player_id
    ) as funder_second_place
  from public.game_awards ga
  join public.games g on g.id = ga.game_id and g.status = 'finalized'
  join public.awards a on a.id = ga.award_id
  join public.game_players funder_gp on funder_gp.id = ga.funded_by_game_player_id
  group by
    g.group_id,
    a.id,
    a.name,
    ga.game_id,
    ga.funded_by_game_player_id
)
select
  group_id,
  award_id,
  award_name,
  count(*)::int as funded_count,
  (count(*) filter (where funder_first_place))::int as funder_won_count,
  (count(*) filter (where not funder_first_place))::int as sniped_count,
  round(
    (count(*) filter (where funder_first_place))::numeric / count(*),
    4
  ) as funder_won_rate,
  (count(*) filter (where funder_game_won))::int as funder_game_won_count,
  round(
    (count(*) filter (where funder_game_won))::numeric / count(*),
    4
  ) as funder_game_won_rate,
  (count(*) filter (where funder_first_place))::int as funder_first_place_count,
  round(
    (count(*) filter (where funder_first_place))::numeric / count(*),
    4
  ) as funder_first_place_rate,
  (count(*) filter (where funder_second_place))::int as funder_second_place_count,
  round(
    (count(*) filter (where funder_second_place))::numeric / count(*),
    4
  ) as funder_second_place_rate
from funded_awards
group by group_id, award_id, award_name;

create or replace view analytics.player_award_funding_outcomes
with (security_invoker = true) as
with funded_awards as (
  select
    g.group_id,
    funder.id as funder_player_id,
    funder.display_name as funder_player_name,
    a.id as award_id,
    a.name as award_name,
    ga.game_id,
    ga.funded_by_game_player_id,
    bool_or(funder_gp.is_winner) as funder_game_won,
    bool_or(
      ga.place = 1
      and ga.winner_game_player_id = ga.funded_by_game_player_id
    ) as funder_first_place,
    bool_or(
      ga.place = 2
      and ga.winner_game_player_id = ga.funded_by_game_player_id
    ) as funder_second_place
  from public.game_awards ga
  join public.games g on g.id = ga.game_id and g.status = 'finalized'
  join public.awards a on a.id = ga.award_id
  join public.game_players funder_gp on funder_gp.id = ga.funded_by_game_player_id
  join public.players funder on funder.id = funder_gp.player_id
  group by
    g.group_id,
    funder.id,
    funder.display_name,
    a.id,
    a.name,
    ga.game_id,
    ga.funded_by_game_player_id
)
select
  group_id,
  funder_player_id,
  funder_player_name,
  award_id,
  award_name,
  count(*)::int as funded_count,
  (count(*) filter (where funder_game_won))::int as funder_game_won_count,
  round(
    (count(*) filter (where funder_game_won))::numeric / count(*),
    4
  ) as funder_game_won_rate,
  (count(*) filter (where funder_first_place))::int as funder_first_place_count,
  round(
    (count(*) filter (where funder_first_place))::numeric / count(*),
    4
  ) as funder_first_place_rate,
  (count(*) filter (where funder_second_place))::int as funder_second_place_count,
  round(
    (count(*) filter (where funder_second_place))::numeric / count(*),
    4
  ) as funder_second_place_rate
from funded_awards
group by group_id, funder_player_id, funder_player_name, award_id, award_name;

create or replace function public.get_award_economics(scope text default 'personal')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with scoped_games as (
  select g.id
  from public.games g
  where g.status = 'finalized'
    and (
      scope = 'global'
      or g.id in (
        select gp.game_id
        from public.game_players gp
        join public.players p on p.id = gp.player_id
        where p.linked_user_id = auth.uid()
      )
    )
),
funded_awards as (
  select
    a.id as award_id,
    a.name as award_name,
    ga.game_id,
    ga.funded_by_game_player_id,
    bool_or(funder_gp.is_winner) as funder_game_won,
    bool_or(
      ga.place = 1
      and ga.winner_game_player_id = ga.funded_by_game_player_id
    ) as funder_first_place,
    bool_or(
      ga.place = 2
      and ga.winner_game_player_id = ga.funded_by_game_player_id
    ) as funder_second_place
  from public.game_awards ga
  join scoped_games sg on sg.id = ga.game_id
  join public.awards a on a.id = ga.award_id
  join public.game_players funder_gp on funder_gp.id = ga.funded_by_game_player_id
  group by a.id, a.name, ga.game_id, ga.funded_by_game_player_id
),
outcomes as (
  select
    award_id,
    award_name,
    count(*)::int as funded_count,
    (count(*) filter (where funder_first_place))::int as funder_won_count,
    (count(*) filter (where not funder_first_place))::int as sniped_count,
    round(
      (count(*) filter (where funder_first_place))::numeric / count(*),
      4
    ) as funder_won_rate,
    (count(*) filter (where funder_game_won))::int as funder_game_won_count,
    round(
      (count(*) filter (where funder_game_won))::numeric / count(*),
      4
    ) as funder_game_won_rate,
    (count(*) filter (where funder_first_place))::int as funder_first_place_count,
    round(
      (count(*) filter (where funder_first_place))::numeric / count(*),
      4
    ) as funder_first_place_rate,
    (count(*) filter (where funder_second_place))::int as funder_second_place_count,
    round(
      (count(*) filter (where funder_second_place))::numeric / count(*),
      4
    ) as funder_second_place_rate
  from funded_awards
  group by award_id, award_name
),
matrix as (
  select
    funder.id as funder_player_id,
    funder.display_name as funder_player_name,
    winner.id as winner_player_id,
    winner.display_name as winner_player_name,
    a.id as award_id,
    a.name as award_name,
    count(*)::int as first_place_awards
  from public.game_awards ga
  join scoped_games sg on sg.id = ga.game_id
  join public.awards a on a.id = ga.award_id
  join public.game_players funder_gp on funder_gp.id = ga.funded_by_game_player_id
  join public.players funder on funder.id = funder_gp.player_id
  join public.game_players winner_gp on winner_gp.id = ga.winner_game_player_id
  join public.players winner on winner.id = winner_gp.player_id
  where ga.place = 1
  group by
    funder.id,
    funder.display_name,
    winner.id,
    winner.display_name,
    a.id,
    a.name
)
select jsonb_build_object(
  'outcomes',
  (select coalesce(
    jsonb_agg(to_jsonb(o) order by o.funded_count desc, o.award_name),
    '[]'::jsonb
  ) from outcomes o),
  'matrix',
  (select coalesce(
    jsonb_agg(
      to_jsonb(m)
      order by m.funder_player_name, m.winner_player_name, m.award_name
    ),
    '[]'::jsonb
  ) from matrix m)
);
$$;

revoke all on function public.get_award_economics(text) from public;
grant execute on function public.get_award_economics(text) to authenticated;

create or replace function public.get_selection_stats(scope text default 'global')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with player_results as (
  select gp.*
  from game_players gp
  join games g on g.id = gp.game_id
  where g.status is distinct from 'draft'
    and (
      scope = 'global'
      or gp.player_id in (
        select p.id from players p where p.linked_user_id = auth.uid()
      )
    )
),
corporation_entries as (
  select
    pr.id,
    pr.game_id,
    pr.player_id,
    corporation_selections.corporation_id,
    pr.placement,
    pr.is_winner,
    pr.total_points,
    pr.final_megacredits,
    pr.cities_points,
    pr.greenery_points,
    pr.card_points_total,
    pr.card_points_microbes,
    pr.card_points_animals,
    pr.card_points_jovian,
    pr.tr_points,
    pr.milestone_points,
    pr.award_points,
    pr.other_card_points,
    pr.created_at
  from player_results pr
  join lateral (
    select gpc.corporation_id
    from game_player_corporations gpc
    where gpc.game_player_id = pr.id

    union all

    select pr.corporation_id
    where pr.corporation_id is not null
      and not exists (
        select 1
        from game_player_corporations gpc
        where gpc.game_player_id = pr.id
      )
  ) corporation_selections on true
),
milestone_counts as (
  select gm.winner_game_player_id as game_player_id, count(*) as milestones_won
  from game_milestones gm
  where gm.winner_game_player_id is not null
  group by 1
),
award_counts as (
  select ga.winner_game_player_id as game_player_id, count(*) as awards_won
  from game_awards ga
  where ga.place = 1 and ga.winner_game_player_id is not null
  group by 1
),
enriched as (
  select
    pr.*,
    coalesce(mc.milestones_won, 0) as milestones_won,
    coalesce(ac.awards_won, 0) as awards_won
  from player_results pr
  left join milestone_counts mc on mc.game_player_id = pr.id
  left join award_counts ac on ac.game_player_id = pr.id
),
corporation_enriched as (
  select
    ce.*,
    coalesce(mc.milestones_won, 0) as milestones_won,
    coalesce(ac.awards_won, 0) as awards_won
  from corporation_entries ce
  left join milestone_counts mc on mc.game_player_id = ce.id
  left join award_counts ac on ac.game_player_id = ce.id
),
prelude_entries as (
  select game_player_id, prelude_id
  from game_player_preludes

  union

  select game_player_id, prelude_id
  from game_player_midgame_preludes
),
tag_summary_player_links as (
  select
    g.id as game_id,
    p.id as player_id,
    ts.tag_code,
    ts.tag_count
  from game_log_tag_summaries ts
  join game_log_imports gli on gli.id = ts.game_log_import_id
  join games g on g.id = gli.game_id and g.status is distinct from 'draft'
  join players p
    on p.group_id = g.group_id
   and p.normalized_display_name = ts.normalized_player_name
),
corp_stats as (
  select
    c.name as corporation_name,
    count(*) as plays,
    count(*) filter (where ce.placement = 1) as first_place_finishes,
    count(*) filter (where ce.placement = 2) as second_place_finishes,
    count(*) filter (where ce.placement >= 3) as third_plus_finishes,
    round(avg(ce.placement)::numeric, 2) as avg_placement,
    round(avg(case when ce.is_winner then 1 else 0 end)::numeric, 3) as win_rate,
    round(avg(ce.total_points)::numeric, 1) as avg_points,
    round(avg(ce.tr_points)::numeric, 1) as avg_tr_points,
    round(avg(ce.card_points_total)::numeric, 1) as avg_card_points,
    round(avg(ce.card_points_microbes)::numeric, 1) as avg_microbe_points,
    round(avg(ce.card_points_animals)::numeric, 1) as avg_animal_points,
    round(avg(ce.card_points_jovian)::numeric, 1) as avg_jovian_points,
    round(avg(ce.greenery_points)::numeric, 1) as avg_greenery_points,
    round(avg(ce.cities_points)::numeric, 1) as avg_cities_points,
    round(avg(ce.milestone_points)::numeric, 1) as avg_milestone_points,
    round(avg(ce.award_points)::numeric, 1) as avg_award_points,
    round(avg(ce.milestones_won)::numeric, 2) as avg_milestones_won,
    round(avg(ce.awards_won)::numeric, 2) as avg_awards_won
  from corporation_enriched ce
  join corporations c on c.id = ce.corporation_id
  group by c.name
),
prelude_stats as (
  select
    p.name as prelude_name,
    count(*) as plays,
    count(*) filter (where pr.placement = 1) as first_place_finishes,
    count(*) filter (where pr.placement = 2) as second_place_finishes,
    count(*) filter (where pr.placement >= 3) as third_plus_finishes,
    round(avg(pr.placement)::numeric, 2) as avg_placement,
    round(avg(case when pr.is_winner then 1 else 0 end)::numeric, 3) as win_rate,
    round(avg(pr.total_points)::numeric, 1) as avg_points,
    round(avg(pr.tr_points)::numeric, 1) as avg_tr_points,
    round(avg(pr.card_points_total)::numeric, 1) as avg_card_points,
    round(avg(pr.card_points_microbes)::numeric, 1) as avg_microbe_points,
    round(avg(pr.card_points_animals)::numeric, 1) as avg_animal_points,
    round(avg(pr.card_points_jovian)::numeric, 1) as avg_jovian_points,
    round(avg(pr.greenery_points)::numeric, 1) as avg_greenery_points,
    round(avg(pr.cities_points)::numeric, 1) as avg_cities_points,
    round(avg(pr.milestone_points)::numeric, 1) as avg_milestone_points,
    round(avg(pr.award_points)::numeric, 1) as avg_award_points,
    round(avg(pr.milestones_won)::numeric, 2) as avg_milestones_won,
    round(avg(pr.awards_won)::numeric, 2) as avg_awards_won
  from enriched pr
  join prelude_entries pe on pe.game_player_id = pr.id
  join preludes p on p.id = pe.prelude_id
  group by p.name
),
pair_stats as (
  select
    c.name as corporation_name,
    pre.name as prelude_name,
    count(*) as plays,
    round(avg(case when ce.is_winner then 1 else 0 end)::numeric, 3) as win_rate,
    round(avg(ce.total_points)::numeric, 1) as avg_points
  from corporation_enriched ce
  join corporations c on c.id = ce.corporation_id
  join prelude_entries pe on pe.game_player_id = ce.id
  join preludes pre on pre.id = pe.prelude_id
  group by c.name, pre.name
),
corp_tag_stats as (
  select
    c.name as corporation_name,
    tsl.tag_code,
    round(avg(tsl.tag_count)::numeric, 1) as avg_tag_count
  from corporation_enriched ce
  join corporations c on c.id = ce.corporation_id
  join tag_summary_player_links tsl
    on tsl.game_id = ce.game_id
   and tsl.player_id = ce.player_id
  group by c.name, tsl.tag_code
),
award_funding_base as (
  select
    a.name as award_name,
    ga.game_id,
    ga.award_id,
    ga.funded_by_game_player_id,
    bool_or(e.is_winner) as funder_game_won,
    bool_or(
      ga.place = 1
      and ga.winner_game_player_id = ga.funded_by_game_player_id
    ) as funder_first_place,
    bool_or(
      ga.place = 2
      and ga.winner_game_player_id = ga.funded_by_game_player_id
    ) as funder_second_place
  from game_awards ga
  join enriched e on e.id = ga.funded_by_game_player_id
  join awards a on a.id = ga.award_id
  group by a.name, ga.game_id, ga.award_id, ga.funded_by_game_player_id
),
award_funding as (
  select
    award_name,
    count(*) as funded_count,
    count(*) filter (where funder_first_place) as funder_won_count,
    count(*) filter (where funder_game_won) as funder_game_won_count,
    round(
      (count(*) filter (where funder_game_won))::numeric / count(*),
      4
    ) as funder_game_won_rate,
    count(*) filter (where funder_first_place) as funder_first_place_count,
    round(
      (count(*) filter (where funder_first_place))::numeric / count(*),
      4
    ) as funder_first_place_rate,
    count(*) filter (where funder_second_place) as funder_second_place_count,
    round(
      (count(*) filter (where funder_second_place))::numeric / count(*),
      4
    ) as funder_second_place_rate
  from award_funding_base
  group by award_name
),
card_plays as (
  select distinct e.id as game_player_id, e.is_winner, f.card_id
  from enriched e
  join analytics.game_log_event_facts f
    on f.game_id = e.game_id
   and f.player_id = e.player_id
  where f.event_type = 'card_played' and f.card_id is not null
),
card_stats as (
  select
    c.card_name,
    count(*) as plays,
    round(avg(case when cp.is_winner then 1 else 0 end)::numeric, 3) as win_rate_when_played
  from card_plays cp
  join cards c on c.id = cp.card_id
  group by c.card_name
),
tag_win_stats as (
  select
    tsl.tag_code,
    round(avg(tsl.tag_count) filter (where e.is_winner)::numeric, 1) as avg_tags_in_wins,
    round(avg(tsl.tag_count) filter (where not e.is_winner)::numeric, 1) as avg_tags_in_losses,
    count(*) as samples
  from enriched e
  join tag_summary_player_links tsl
    on tsl.game_id = e.game_id
   and tsl.player_id = e.player_id
  group by tsl.tag_code
),
baseline as (
  select round(avg(case when e.is_winner then 1 else 0 end)::numeric, 3) as win_rate
  from enriched e
)
select jsonb_build_object(
  'corporations',
  (select coalesce(jsonb_agg(to_jsonb(cs) order by cs.plays desc, cs.corporation_name), '[]'::jsonb) from corp_stats cs),
  'preludes',
  (select coalesce(jsonb_agg(to_jsonb(ps) order by ps.plays desc, ps.prelude_name), '[]'::jsonb) from prelude_stats ps),
  'pairs',
  (select coalesce(jsonb_agg(to_jsonb(pp) order by pp.plays desc, pp.corporation_name), '[]'::jsonb)
   from (select * from pair_stats order by plays desc limit 100) pp),
  'corporationTags',
  (select coalesce(jsonb_agg(to_jsonb(ct) order by ct.corporation_name, ct.avg_tag_count desc), '[]'::jsonb) from corp_tag_stats ct),
  'awardFunding',
  (select coalesce(jsonb_agg(to_jsonb(af) order by af.funded_count desc, af.award_name), '[]'::jsonb) from award_funding af),
  'cards',
  (select coalesce(jsonb_agg(to_jsonb(cd) order by cd.plays desc, cd.card_name), '[]'::jsonb)
   from (select * from card_stats order by plays desc limit 150) cd),
  'tagWins',
  (select coalesce(jsonb_agg(to_jsonb(tw) order by tw.tag_code), '[]'::jsonb) from tag_win_stats tw),
  'baselineWinRate',
  (select coalesce((select win_rate from baseline), 0)),
  'totalGames',
  (select count(distinct game_id) from enriched)
);
$$;

revoke all on function public.get_selection_stats(text) from public;
grant execute on function public.get_selection_stats(text) to authenticated;

grant usage on schema analytics to authenticated;
grant select on all tables in schema analytics to authenticated;
