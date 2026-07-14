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
        g.created_by_user_id = auth.uid()
        or public.is_group_member(g.group_id)
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

create or replace function public.can_delete_game(target_game_id uuid)
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
        g.created_by_user_id = auth.uid()
        or public.is_group_member(g.group_id)
        or public.is_linked_game_participant(g.id)
      )
  );
$$;;
