create table if not exists public.game_player_midgame_preludes (
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  prelude_id uuid not null references public.preludes(id) on delete cascade,
  primary key (game_player_id, prelude_id)
);

comment on table public.game_player_midgame_preludes is
  'Preludes a player played after the opening prelude phase (Valley Trust, Board of Directors, New Partner). Starting preludes live in game_player_preludes.';

alter table public.game_player_midgame_preludes enable row level security;

drop policy if exists "members read game player midgame preludes"
  on public.game_player_midgame_preludes;
create policy "members read game player midgame preludes"
on public.game_player_midgame_preludes for select
using (public.can_read_game_player(game_player_id));

drop policy if exists "editors manage game player midgame preludes"
  on public.game_player_midgame_preludes;
create policy "editors manage game player midgame preludes"
on public.game_player_midgame_preludes for all
using (public.can_edit_game_player(game_player_id))
with check (public.can_edit_game_player(game_player_id));;
