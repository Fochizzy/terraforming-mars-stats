-- Add `totalGames` (distinct finalized games in scope) to get_selection_stats so
-- the UI can show playrate = plays / totalGames for corporations, preludes and
-- cards. Each of those is a unique copy per game, so plays <= games and the
-- ratio is a clean 0-100%. The personal scope divides by the caller's games and
-- the global scope by every recorded game, which the Insights view renders as
-- adjacent "personal" and "global" playrate columns.
create or replace function public.get_selection_stats(scope text default 'global')
returns jsonb
language sql
stable
security definer
set search_path = public
as $function$
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
tag_summary_player_links as (
  select
    gli.game_id,
    resolved.player_id,
    ts.tag_code,
    ts.tag_count
  from game_log_tag_summaries ts
  join game_log_imports gli on gli.id = ts.game_log_import_id
  join games g on g.id = gli.game_id
  join lateral (
    select candidates.player_id
    from (
      select pia.player_id, 1 as preference
      from player_import_aliases pia
      where pia.group_id = g.group_id
        and pia.source_type = 'game_log'
        and pia.normalized_alias = ts.normalized_player_name
      union all
      select p.id as player_id, 2 as preference
      from players p
      where p.group_id = g.group_id
        and p.normalized_display_name = ts.normalized_player_name
    ) candidates
    order by candidates.preference
    limit 1
  ) resolved on true
),
corp_stats as (
  select
    c.name as corporation_name,
    count(*) as plays,
    round(avg(case when ce.is_winner then 1 else 0 end)::numeric, 3) as win_rate,
    round(avg(ce.placement)::numeric, 2) as avg_placement,
    count(*) filter (where ce.placement = 1) as first_place_finishes,
    count(*) filter (where ce.placement = 2) as second_place_finishes,
    count(*) filter (where ce.placement >= 3) as third_plus_finishes,
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
prelude_base as (
  select e.*, pre.name as prelude_name
  from enriched e
  join game_player_preludes gpp on gpp.game_player_id = e.id
  join preludes pre on pre.id = gpp.prelude_id
),
prelude_stats as (
  select
    pb.prelude_name,
    count(*) as plays,
    round(avg(case when pb.is_winner then 1 else 0 end)::numeric, 3) as win_rate,
    round(avg(pb.placement)::numeric, 2) as avg_placement,
    count(*) filter (where pb.placement = 1) as first_place_finishes,
    count(*) filter (where pb.placement = 2) as second_place_finishes,
    count(*) filter (where pb.placement >= 3) as third_plus_finishes,
    round(avg(pb.total_points)::numeric, 1) as avg_points,
    round(avg(pb.tr_points)::numeric, 1) as avg_tr_points,
    round(avg(pb.card_points_total)::numeric, 1) as avg_card_points,
    round(avg(pb.card_points_microbes)::numeric, 1) as avg_microbe_points,
    round(avg(pb.card_points_animals)::numeric, 1) as avg_animal_points,
    round(avg(pb.card_points_jovian)::numeric, 1) as avg_jovian_points,
    round(avg(pb.greenery_points)::numeric, 1) as avg_greenery_points,
    round(avg(pb.cities_points)::numeric, 1) as avg_cities_points,
    round(avg(pb.milestone_points)::numeric, 1) as avg_milestone_points,
    round(avg(pb.award_points)::numeric, 1) as avg_award_points,
    round(avg(pb.milestones_won)::numeric, 2) as avg_milestones_won,
    round(avg(pb.awards_won)::numeric, 2) as avg_awards_won
  from prelude_base pb
  group by pb.prelude_name
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
  join game_player_preludes gpp on gpp.game_player_id = ce.id
  join preludes pre on pre.id = gpp.prelude_id
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
award_funding as (
  select
    a.name as award_name,
    count(*) as funded_count,
    count(*) filter (
      where ga.place = 1 and ga.winner_game_player_id = ga.funded_by_game_player_id
    ) as funder_won_count
  from game_awards ga
  join enriched e on e.id = ga.funded_by_game_player_id
  join awards a on a.id = ga.award_id
  group by a.name
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
  (select count(distinct game_id) from player_results)
);
$function$;

revoke all on function public.get_selection_stats(text) from public;
grant execute on function public.get_selection_stats(text) to authenticated;
