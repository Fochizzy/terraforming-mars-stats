-- Break the award funder/winner matrix down by award so per-award cards can
-- show who funded and who won each award, not just aggregate counts.
-- Existing columns keep their order; award columns append at the end so
-- create or replace remains valid.

create or replace view analytics.award_funder_winner_matrix
with (security_invoker = true) as
select
  g.group_id,
  funder.id as funder_player_id,
  funder.display_name as funder_player_name,
  winner.id as winner_player_id,
  winner.display_name as winner_player_name,
  count(*)::int as first_place_awards,
  a.id as award_id,
  a.name as award_name
from public.game_awards ga
join public.games g on g.id = ga.game_id and g.status = 'finalized'
join public.awards a on a.id = ga.award_id
join public.game_players funder_gp on funder_gp.id = ga.funded_by_game_player_id
join public.players funder on funder.id = funder_gp.player_id
join public.game_players winner_gp on winner_gp.id = ga.winner_game_player_id
join public.players winner on winner.id = winner_gp.player_id
where ga.place = 1
group by
  g.group_id,
  funder.id,
  funder.display_name,
  winner.id,
  winner.display_name,
  a.id,
  a.name;

grant usage on schema analytics to authenticated;
grant select on all tables in schema analytics to authenticated;
;
