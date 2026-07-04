create policy "owners manage groups"
on public.groups for update
using (public.is_group_owner(id))
with check (public.is_group_owner(id));

alter table public.expansions enable row level security;
alter table public.maps enable row level security;
alter table public.promo_sets enable row level security;
alter table public.group_default_expansions enable row level security;
alter table public.group_default_promo_sets enable row level security;
alter table public.game_expansions enable row level security;
alter table public.game_promo_sets enable row level security;

create policy "authenticated users read expansions"
on public.expansions for select to authenticated
using (true);

create policy "authenticated users read maps"
on public.maps for select to authenticated
using (true);

create policy "authenticated users read promo sets"
on public.promo_sets for select to authenticated
using (true);

create policy "members read default expansions"
on public.group_default_expansions for select
using (public.is_group_member(group_id));

create policy "owners manage default expansions"
on public.group_default_expansions for all
using (public.is_group_owner(group_id))
with check (public.is_group_owner(group_id));

create policy "members read default promo sets"
on public.group_default_promo_sets for select
using (public.is_group_member(group_id));

create policy "owners manage default promo sets"
on public.group_default_promo_sets for all
using (public.is_group_owner(group_id))
with check (public.is_group_owner(group_id));

create policy "members read game expansions"
on public.game_expansions for select
using (
  exists (
    select 1
    from public.games g
    where g.id = game_expansions.game_id
      and public.is_group_member(g.group_id)
  )
);

create policy "editors manage game expansions"
on public.game_expansions for all
using (
  exists (
    select 1
    from public.games g
    where g.id = game_expansions.game_id
      and public.can_edit_group(g.group_id)
  )
)
with check (
  exists (
    select 1
    from public.games g
    where g.id = game_expansions.game_id
      and public.can_edit_group(g.group_id)
  )
);

create policy "members read game promo sets"
on public.game_promo_sets for select
using (
  exists (
    select 1
    from public.games g
    where g.id = game_promo_sets.game_id
      and public.is_group_member(g.group_id)
  )
);

create policy "editors manage game promo sets"
on public.game_promo_sets for all
using (
  exists (
    select 1
    from public.games g
    where g.id = game_promo_sets.game_id
      and public.can_edit_group(g.group_id)
  )
)
with check (
  exists (
    select 1
    from public.games g
    where g.id = game_promo_sets.game_id
      and public.can_edit_group(g.group_id)
  )
);
