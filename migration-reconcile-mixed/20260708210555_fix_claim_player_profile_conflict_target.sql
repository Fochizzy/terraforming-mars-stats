create or replace function public.claim_player_profile(p_player_id uuid)
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
  v_player public.players%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not signed in.';
  end if;

  if not exists (
    select 1
    from public.list_claimable_player_profiles() candidate
    where candidate.player_id = p_player_id
  ) then
    raise exception 'That saved player profile is not claimable for this account.';
  end if;

  select *
  into v_player
  from public.players
  where id = p_player_id
  for update;

  if not found then
    raise exception 'That saved player profile no longer exists.';
  end if;

  if v_player.linked_user_id is not null and v_player.linked_user_id <> v_user_id then
    raise exception 'That saved player profile is already linked.';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_player.group_id, v_user_id, 'editor')
  on conflict on constraint group_members_group_id_user_id_key do nothing;

  update public.players
  set linked_user_id = v_user_id
  where id = v_player.id;

  update public.user_profiles
  set
    last_active_group_id = v_player.group_id,
    updated_at = now()
  where user_id = v_user_id;

  return query
  select
    g.id as group_id,
    g.name as group_name,
    v_player.display_name as player_name
  from public.groups g
  where g.id = v_player.group_id;
end;
$$;;
