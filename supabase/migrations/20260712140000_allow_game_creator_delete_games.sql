-- A game's creator could become unable to delete (or even see) their own game
-- once they were no longer a member of its group -- e.g. drafts stranded in a
-- group after a membership reshuffle, or drafts that have no game_players yet so
-- is_linked_game_participant never matches. In that state the RLS DELETE policy
-- silently removed 0 rows, so deleteSavedGame() failed but the games row stayed
-- in Supabase. Guarantee the creator can always read and delete their own game.

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
$$;
