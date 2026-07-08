create or replace function public.can_read_game(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.games g
    where g.id = target_game_id
      and (
        public.is_group_member(g.group_id)
        or (
          g.status = 'finalized'
          and exists (
            select 1
            from public.game_players gp_self
            join public.players p_self on p_self.id = gp_self.player_id
            where gp_self.game_id = g.id
              and p_self.linked_user_id = auth.uid()
          )
        )
      )
  );
$$;

create or replace function public.can_read_game_player(target_game_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.game_players gp
    where gp.id = target_game_player_id
      and public.can_read_game(gp.game_id)
  );
$$;

create or replace function public.can_read_player(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.players p
    where p.id = target_player_id
      and (
        p.linked_user_id = auth.uid()
        or exists (
          select 1
          from public.game_players gp_target
          join public.games g on g.id = gp_target.game_id
          join public.game_players gp_self on gp_self.game_id = g.id
          join public.players p_self on p_self.id = gp_self.player_id
          where gp_target.player_id = p.id
            and g.status = 'finalized'
            and p_self.linked_user_id = auth.uid()
        )
      )
  );
$$;

drop policy if exists "linked participants read finalized games" on public.games;
create policy "linked participants read finalized games"
on public.games for select
using (public.can_read_game(id));

drop policy if exists "linked participants read finalized game players" on public.game_players;
create policy "linked participants read finalized game players"
on public.game_players for select
using (public.can_read_game(game_id));

drop policy if exists "linked users read claimed and shared players" on public.players;
create policy "linked users read claimed and shared players"
on public.players for select
using (public.can_read_player(id));
