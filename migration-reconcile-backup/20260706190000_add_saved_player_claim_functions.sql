create or replace function public.normalize_claim_player_name(input text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', ' ', 'g'));
$$;

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
    select normalize_claim_player_name(full_name) as normalized_full_name
    from public.user_profiles
    where user_id = auth.uid()
  )
  select
    p.id as player_id,
    p.display_name as player_name,
    p.group_id,
    g.name as group_name,
    case
      when normalize_claim_player_name(p.display_name) = me.normalized_full_name then 'exact'
      when normalize_claim_player_name(p.display_name) like me.normalized_full_name || '%' then 'partial'
      when me.normalized_full_name like normalize_claim_player_name(p.display_name) || '%' then 'partial'
      else null
    end as match_reason,
    normalize_claim_player_name(p.display_name) = me.normalized_full_name as exact_match
  from me
  join public.players p
    on p.linked_user_id is null
  join public.groups g
    on g.id = p.group_id
  where
    me.normalized_full_name <> ''
    and (
      normalize_claim_player_name(p.display_name) = me.normalized_full_name
      or normalize_claim_player_name(p.display_name) like me.normalized_full_name || '%'
      or me.normalized_full_name like normalize_claim_player_name(p.display_name) || '%'
    )
  order by exact_match desc, group_name, player_name;
$$;

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
  on conflict (group_id, user_id) do nothing;

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
$$;
