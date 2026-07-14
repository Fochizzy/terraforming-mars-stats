create or replace view analytics.player_key_cards
with (security_invoker = true) as
select
  g.group_id,
  g.id as game_id,
  g.played_on,
  p.id as player_id,
  p.display_name as player_name,
  c.id as card_id,
  c.card_name,
  coalesce(c.thumbnail_path, c.full_image_path, c.image_url) as thumbnail_url,
  coalesce(c.full_image_path, c.image_url) as full_image_url,
  gp.is_winner
from public.game_player_key_cards gpk
join public.game_players gp on gp.id = gpk.game_player_id
join public.games g on g.id = gp.game_id
join public.players p on p.id = gp.player_id
join public.cards c on c.id = gpk.card_id
where g.status = 'finalized';

grant select on analytics.player_key_cards to authenticated;

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
  gp.is_winner,
  coalesce(c.thumbnail_path, c.full_image_path, c.image_url) as thumbnail_url,
  coalesce(c.full_image_path, c.image_url) as full_image_url
from analytics.game_log_event_facts f
join public.cards c on c.id = f.card_id
join public.game_players gp
  on gp.game_id = f.game_id
 and gp.player_id = f.player_id
where f.event_type = 'card_played'
  and f.card_id is not null
  and f.player_id is not null;

grant select on analytics.player_card_outcomes to authenticated;;
