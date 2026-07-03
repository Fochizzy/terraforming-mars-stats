alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_settings enable row level security;
alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.game_revisions enable row level security;

create function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
  );
$$;

create function public.can_edit_group(target_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'editor')
  );
$$;

create function public.is_group_owner(target_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  );
$$;

create function public.can_read_game(target_game_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.games g
    where g.id = target_game_id
      and public.is_group_member(g.group_id)
  );
$$;

create function public.can_edit_game(target_game_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.games g
    where g.id = target_game_id
      and public.can_edit_group(g.group_id)
  );
$$;

create function public.can_read_game_player(target_game_player_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.game_players gp
    join public.games g on g.id = gp.game_id
    where gp.id = target_game_player_id
      and public.is_group_member(g.group_id)
  );
$$;

create function public.can_edit_game_player(target_game_player_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.game_players gp
    join public.games g on g.id = gp.game_id
    where gp.id = target_game_player_id
      and public.can_edit_group(g.group_id)
  );
$$;

create policy "members can read groups"
on public.groups for select
using (public.is_group_member(id));

create policy "members can read group memberships"
on public.group_members for select
using (public.is_group_member(group_id));

create policy "owners manage group memberships"
on public.group_members for all
using (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  )
);

create policy "members can read settings"
on public.group_settings for select
using (public.is_group_member(group_id));

create policy "owners manage settings"
on public.group_settings for all
using (
  public.is_group_owner(group_settings.group_id)
)
with check (
  public.is_group_owner(group_settings.group_id)
);

create policy "members can read players"
on public.players for select
using (public.is_group_member(group_id));

create policy "editors manage players"
on public.players for all
using (public.can_edit_group(group_id))
with check (public.can_edit_group(group_id));

create policy "members can read games"
on public.games for select
using (public.is_group_member(group_id));

create policy "editors can write games"
on public.games for all
using (public.can_edit_group(group_id))
with check (public.can_edit_group(group_id));

create policy "members can read game players"
on public.game_players for select
using (
  exists (
    select 1 from public.games g
    where g.id = game_players.game_id
      and public.is_group_member(g.group_id)
  )
);

create policy "editors can write game players"
on public.game_players for all
using (
  exists (
    select 1 from public.games g
    where g.id = game_players.game_id
      and public.can_edit_group(g.group_id)
  )
)
with check (
  exists (
    select 1 from public.games g
    where g.id = game_players.game_id
      and public.can_edit_group(g.group_id)
  )
);
