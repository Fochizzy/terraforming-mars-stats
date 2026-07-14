create or replace function public.sync_current_user_played_group_memberships()
returns table (
  group_id uuid,
  group_name text,
  role public.group_role
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return;
  end if;

  insert into public.group_members (group_id, user_id, role)
  select distinct
    p.group_id,
    v_user_id,
    'editor'::public.group_role
  from public.players p
  where p.linked_user_id = v_user_id
  on conflict on constraint group_members_group_id_user_id_key do nothing;

  return query
  select
    gm.group_id,
    g.name as group_name,
    gm.role
  from public.group_members gm
  join public.groups g
    on g.id = gm.group_id
  where gm.user_id = v_user_id
  order by gm.created_at asc, g.name asc;
end;
$$;
