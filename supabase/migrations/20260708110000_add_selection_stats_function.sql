-- Aggregated corporation/prelude selection statistics.
-- SECURITY DEFINER so the "global" scope can aggregate across every group's
-- finalized games; only aggregated, non-identifying numbers are returned.
-- scope = 'personal' restricts to players linked to the calling user.
create or replace function public.get_selection_stats(scope text default 'global')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with base as (
  select gp.*
  from game_players gp
  join games g on g.id = gp.game_id
  where g.status is distinct from 'draft'
    and gp.corporation_id is not null
    and (
      scope = 'global'
      or gp.player_id in (
        select p.id from players p where p.linked_user_id = auth.uid()
      )
    )
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
    b.*,
    coalesce(mc.milestones_won, 0) as milestones_won,
    coalesce(ac.awards_won, 0) as awards_won
  from base b
  left join milestone_counts mc on mc.game_player_id = b.id
  left join award_counts ac on ac.game_player_id = b.id
),
corp_stats as (
  select
    c.name as corporation_name,
    count(*) as plays,
    round(avg(case when e.is_winner then 1 else 0 end)::numeric, 3) as win_rate,
    round(avg(e.total_points)::numeric, 1) as avg_points,
    round(avg(e.tr_points)::numeric, 1) as avg_tr_points,
    round(avg(e.card_points_total)::numeric, 1) as avg_card_points,
    round(avg(e.card_points_microbes)::numeric, 1) as avg_microbe_points,
    round(avg(e.card_points_animals)::numeric, 1) as avg_animal_points,
    round(avg(e.card_points_jovian)::numeric, 1) as avg_jovian_points,
    round(avg(e.greenery_points)::numeric, 1) as avg_greenery_points,
    round(avg(e.cities_points)::numeric, 1) as avg_cities_points,
    round(avg(e.milestone_points)::numeric, 1) as avg_milestone_points,
    round(avg(e.award_points)::numeric, 1) as avg_award_points,
    round(avg(e.milestones_won)::numeric, 2) as avg_milestones_won,
    round(avg(e.awards_won)::numeric, 2) as avg_awards_won
  from enriched e
  join corporations c on c.id = e.corporation_id
  group by c.name
),
prelude_base as (
  select e.*, pr.name as prelude_name
  from enriched e
  join game_player_preludes gpp on gpp.game_player_id = e.id
  join preludes pr on pr.id = gpp.prelude_id
),
prelude_stats as (
  select
    pb.prelude_name,
    count(*) as plays,
    round(avg(case when pb.is_winner then 1 else 0 end)::numeric, 3) as win_rate,
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
    pb.prelude_name,
    count(*) as plays,
    round(avg(case when pb.is_winner then 1 else 0 end)::numeric, 3) as win_rate,
    round(avg(pb.total_points)::numeric, 1) as avg_points
  from prelude_base pb
  join corporations c on c.id = pb.corporation_id
  group by c.name, pb.prelude_name
),
corp_tag_stats as (
  select
    c.name as corporation_name,
    ts.tag_code,
    round(avg(ts.tag_count)::numeric, 1) as avg_tag_count
  from enriched e
  join corporations c on c.id = e.corporation_id
  join players p on p.id = e.player_id
  join game_log_imports gli on gli.game_id = e.game_id
  join game_log_tag_summaries ts
    on ts.game_log_import_id = gli.id
    and ts.normalized_player_name = p.normalized_display_name
  group by c.name, ts.tag_code
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
  (select coalesce(jsonb_agg(to_jsonb(ct) order by ct.corporation_name, ct.avg_tag_count desc), '[]'::jsonb) from corp_tag_stats ct)
);
$$;

revoke all on function public.get_selection_stats(text) from public;
grant execute on function public.get_selection_stats(text) to authenticated;
