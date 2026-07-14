-- Per-result card play outcomes: one row for each (finalized game, player,
-- card) the player was logged playing, carrying whether that player won. The
-- dashboard aggregates these into "most-played cards" leaderboards and win
-- rates, both group-wide (global) and for a single focused player (personal).
create or replace view analytics.player_card_outcomes
with (security_invoker = true) as
select distinct
  f.group_id,
  f.game_id,
  f.played_on,
  f.player_id,
  f.player_name,
  f.card_id,
  c.card_name,
  gp.is_winner
from analytics.game_log_event_facts f
join public.cards c on c.id = f.card_id
join public.game_players gp
  on gp.game_id = f.game_id
 and gp.player_id = f.player_id
where f.event_type = 'card_played'
  and f.card_id is not null
  and f.player_id is not null;

grant select on analytics.player_card_outcomes to authenticated;;
