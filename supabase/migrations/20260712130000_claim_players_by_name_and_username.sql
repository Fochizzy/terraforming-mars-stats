-- Players can be created in the log-game flow under either a real name or a
-- username/handle (e.g. "Revloki"). Claiming previously matched a roster
-- player's display_name against the signing-in account's full_name ONLY, so a
-- player entered as a username was never offered to that account at claim time.
--
-- Match display_name against BOTH the account's full_name and its username.
-- full_name keeps its existing exact-or-prefix behavior (e.g. "James" vs
-- "James Hodnett"); username matches exactly, since a handle is a single label.

create or replace function public.list_claimable_player_profiles()
returns table (
  player_id uuid,
  player_name text,
  group_id uuid,
  group_name text,
  match_reason text,
  exact_match boolean
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select
      normalize_claim_player_name(full_name) as normalized_full_name,
      normalize_claim_player_name(username) as normalized_username
    from public.user_profiles
    where user_id = auth.uid()
  ),
  candidates as (
    select
      p.id as player_id,
      p.display_name as player_name,
      p.group_id,
      g.name as group_name,
      normalize_claim_player_name(p.display_name) as normalized_display_name,
      me.normalized_full_name,
      me.normalized_username
    from me
    join public.players p
      on p.linked_user_id is null
    join public.groups g
      on g.id = p.group_id
  )
  select
    player_id,
    player_name,
    group_id,
    group_name,
    case
      when normalized_full_name <> ''
        and normalized_display_name = normalized_full_name then 'exact'
      when normalized_username <> ''
        and normalized_display_name = normalized_username then 'exact'
      when normalized_full_name <> ''
        and normalized_display_name like normalized_full_name || '%' then 'partial'
      when normalized_full_name <> ''
        and normalized_full_name like normalized_display_name || '%' then 'partial'
      else null
    end as match_reason,
    (
      (normalized_full_name <> '' and normalized_display_name = normalized_full_name)
      or (normalized_username <> '' and normalized_display_name = normalized_username)
    ) as exact_match
  from candidates
  where
    (
      normalized_full_name <> ''
      and (
        normalized_display_name = normalized_full_name
        or normalized_display_name like normalized_full_name || '%'
        or normalized_full_name like normalized_display_name || '%'
      )
    )
    or (
      normalized_username <> ''
      and normalized_display_name = normalized_username
    )
  order by exact_match desc, group_name, player_name;
$$;

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
  v_normalized_username text;
begin
  if v_user_id is null then
    raise exception 'Not signed in.';
  end if;

  select
    normalize_claim_player_name(full_name),
    normalize_claim_player_name(username)
  into v_normalized_full_name, v_normalized_username
  from public.user_profiles
  where user_id = v_user_id;

  if coalesce(v_normalized_full_name, '') = ''
    and coalesce(v_normalized_username, '') = '' then
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
      and (
        (v_normalized_full_name <> ''
          and normalize_claim_player_name(p.display_name) = v_normalized_full_name)
        or (v_normalized_username <> ''
          and normalize_claim_player_name(p.display_name) = v_normalized_username)
      )
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
$$;
