-- Per-card win statistics for the card detail dialog: how the signed-in user
-- performs with a card versus everyone. SECURITY DEFINER + auth.uid() mirror
-- get_award_economics:
--   personal -> games a player linked to the caller "had" the card
--   global   -> every finalized game anyone "had" the card
-- "Had the card" pools two evidence sources, deduped per (game, player): a
-- logged card_played event (imported logs) and a flagged key card. Either is
-- enough, so games without an imported log still count when the card was
-- flagged. Only aggregated counts are returned; the caller derives win rates.
create or replace function public.get_card_win_stats(p_card_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with evidence as (
  select game_id, player_id, is_winner
  from analytics.player_card_outcomes
  where card_id = p_card_id
  union
  select game_id, player_id, is_winner
  from analytics.player_key_cards
  where card_id = p_card_id
),
mine as (
  select p.id
  from public.players p
  where p.linked_user_id = auth.uid()
)
select jsonb_build_object(
  'personalGames',
  (count(*) filter (where e.player_id in (select id from mine)))::int,
  'personalWins',
  (count(*) filter (
    where e.player_id in (select id from mine) and e.is_winner
  ))::int,
  'globalGames',
  count(*)::int,
  'globalWins',
  (count(*) filter (where e.is_winner))::int
)
from evidence e;
$$;

revoke all on function public.get_card_win_stats(uuid) from public;
grant execute on function public.get_card_win_stats(uuid) to authenticated;
