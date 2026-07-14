create or replace function public.can_edit_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
  );
$$;

drop policy if exists "owners manage group memberships" on public.group_members;
create policy "members manage group memberships"
on public.group_members for all
using (public.can_edit_group(group_members.group_id))
with check (public.can_edit_group(group_members.group_id));

drop policy if exists "owners manage settings" on public.group_settings;
create policy "members manage settings"
on public.group_settings for all
using (public.can_edit_group(group_settings.group_id))
with check (public.can_edit_group(group_settings.group_id));

drop policy if exists "owners manage groups" on public.groups;
create policy "members manage groups"
on public.groups for update
using (public.can_edit_group(id))
with check (public.can_edit_group(id));

drop policy if exists "owners manage default expansions" on public.group_default_expansions;
create policy "members manage default expansions"
on public.group_default_expansions for all
using (public.can_edit_group(group_id))
with check (public.can_edit_group(group_id));

drop policy if exists "owners manage default promo sets" on public.group_default_promo_sets;
create policy "members manage default promo sets"
on public.group_default_promo_sets for all
using (public.can_edit_group(group_id))
with check (public.can_edit_group(group_id));
