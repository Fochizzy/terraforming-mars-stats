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
grant execute on function public.get_card_win_stats(uuid) to authenticated;;
