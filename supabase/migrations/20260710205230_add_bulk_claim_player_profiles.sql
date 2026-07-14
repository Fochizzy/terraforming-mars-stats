create or replace function public.claim_player_profiles_by_name()
returns table (
  group_id uuid,
  group_name text,
  player_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_normalized_full_name text;
begin
  if v_user_id is null then
    raise exception 'Not signed in.';
  end if;

  select normalize_claim_player_name(full_name)
  into v_normalized_full_name
  from public.user_profiles
  where user_id = v_user_id;

  if v_normalized_full_name is null or v_normalized_full_name = '' then
    return;
  end if;

  create temporary table _claimed_player_profiles (
    player_id uuid,
    group_id uuid,
    display_name text
  ) on commit drop;

  with updated as (
    update public.players p
    set linked_user_id = v_user_id
    where p.linked_user_id is null
      and normalize_claim_player_name(p.display_name) = v_normalized_full_name
    returning p.id, p.group_id, p.display_name
  )
  insert into _claimed_player_profiles (player_id, group_id, display_name)
  select updated.id, updated.group_id, updated.display_name
  from updated;

  if not exists (select 1 from _claimed_player_profiles) then
    return;
  end if;

  insert into public.group_members (group_id, user_id, role)
  select cp.group_id, v_user_id, 'editor'
  from _claimed_player_profiles cp
  on conflict on constraint group_members_group_id_user_id_key do nothing;

  update public.user_profiles up
  set
    last_active_group_id = coalesce(
      up.last_active_group_id,
      (select cp.group_id from _claimed_player_profiles cp order by cp.group_id limit 1)
    ),
    updated_at = now()
  where up.user_id = v_user_id;

  return query
  select cp.group_id, g.name, cp.display_name
  from _claimed_player_profiles cp
  join public.groups g on g.id = cp.group_id
  order by g.name;
end;
$$;;
