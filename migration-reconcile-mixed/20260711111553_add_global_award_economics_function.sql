create or replace function public.get_global_award_economics()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with outcomes as (
  select
    a.id as award_id,
    a.name as award_name,
    count(*)::int as funded_count,
    (count(*) filter (
      where ga.winner_game_player_id = ga.funded_by_game_player_id
    ))::int as funder_won_count,
    (count(*) filter (
      where ga.winner_game_player_id <> ga.funded_by_game_player_id
    ))::int as sniped_count,
    round(
      (count(*) filter (
        where ga.winner_game_player_id = ga.funded_by_game_player_id
      ))::numeric / count(*),
      4
    ) as funder_won_rate
  from public.game_awards ga
  join public.games g on g.id = ga.game_id and g.status = 'finalized'
  join public.awards a on a.id = ga.award_id
  where ga.place = 1
  group by a.id, a.name
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
  join public.games g on g.id = ga.game_id and g.status = 'finalized'
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

revoke all on function public.get_global_award_economics() from public;
grant execute on function public.get_global_award_economics() to authenticated;;
