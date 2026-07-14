create or replace function public.is_linked_game_participant(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.game_players gp
      join public.players p on p.id = gp.player_id
      where gp.game_id = target_game_id
        and p.linked_user_id = auth.uid()
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
        public.is_group_member(g.group_id)
        or public.is_linked_game_participant(g.id)
      )
  );
$$;

drop policy if exists "linked participants delete games" on public.games;
create policy "linked participants delete games"
on public.games for delete to authenticated
using (public.can_delete_game(id));

drop policy if exists "linked participants delete import evidence objects" on storage.objects;
create policy "linked participants delete import evidence objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'tm-import-evidence'
  and exists (
    select 1
    from public.games g
    where g.id::text = (storage.foldername(name))[1]
      and public.can_delete_game(g.id)
  )
);;
