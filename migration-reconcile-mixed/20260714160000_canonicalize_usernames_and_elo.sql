-- People are identified publicly by username. Full names remain stored only as
-- private matching evidence for claiming an unlinked profile.
create or replace function public.get_player_usernames(p_player_ids uuid[])
returns table (player_id uuid, username text)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as player_id,
    coalesce(nullif(btrim(up.username), ''), nullif(btrim(p.username), '')) as username
  from public.players p
  left join public.user_profiles up on up.user_id = p.linked_user_id
  where p.id = any(p_player_ids)
    and coalesce(nullif(btrim(up.username), ''), nullif(btrim(p.username), '')) is not null;
$$;

revoke all on function public.get_player_usernames(uuid[]) from public;
grant execute on function public.get_player_usernames(uuid[]) to authenticated;

-- Rate one canonical username across all per-group player rows. Legacy rows
-- inherit a username only when every username stored for that exact historical
-- roster label agrees; otherwise the identities stay separate.
create or replace function public.get_elo_leaderboard()
returns table (
  player_id uuid,
  player_name text,
  elo_rating integer,
  games_played integer,
  wins integer,
  win_rate numeric,
  average_win_margin numeric,
  last_change numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  game_record record;
  left_row record;
  right_row record;
  left_rating numeric;
  right_rating numeric;
  left_expected numeric;
  left_actual numeric;
  margin_multiplier numeric;
  rating_delta numeric;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  create temporary table if not exists elo_identity_map (
    player_id uuid primary key,
    identity_key text not null,
    representative_player_id uuid not null,
    username text not null
  ) on commit drop;
  truncate elo_identity_map;

  insert into elo_identity_map (
    player_id,
    identity_key,
    representative_player_id,
    username
  )
   with source_players as (
     select distinct
       p.id as player_id,
       p.linked_user_id,
       normalize_claim_player_name(p.display_name) as normalized_legacy_name,
       coalesce(
         nullif(btrim(up.username), ''),
         nullif(btrim(p.username), '')
       ) as canonical_username,
       p.display_name
     from public.players p
     join public.game_players gp on gp.player_id = p.id
     join public.games g on g.id = gp.game_id and g.status = 'finalized'
     left join public.user_profiles up on up.user_id = p.linked_user_id
   ), username_by_legacy_name as (
     select
       normalized_legacy_name,
       min(canonical_username) as canonical_username
     from source_players
     where canonical_username is not null
       and normalized_legacy_name <> ''
     group by normalized_legacy_name
     having count(distinct lower(canonical_username)) = 1
   ), identities as (
     select
       source_players.player_id,
       case
         when coalesce(
           source_players.canonical_username,
           username_by_legacy_name.canonical_username
         ) is not null then 'username:' || lower(coalesce(
           source_players.canonical_username,
           username_by_legacy_name.canonical_username
         ))
         when source_players.linked_user_id is not null
           then 'user:' || source_players.linked_user_id::text
         else 'legacy-name:' || source_players.normalized_legacy_name
       end as identity_key,
       coalesce(
         source_players.canonical_username,
         username_by_legacy_name.canonical_username,
         nullif(split_part(btrim(source_players.display_name), ' ', 1), ''),
         'Unclaimed player'
       ) as username
     from source_players
     left join username_by_legacy_name using (normalized_legacy_name)
   ), canonical as (
    select
      identities.*,
      first_value(identities.player_id) over (
        partition by identities.identity_key
        order by identities.player_id::text
      ) as representative_player_id
    from identities
  )
  select
    canonical.player_id,
    canonical.identity_key,
    canonical.representative_player_id,
    canonical.username
  from canonical;

  create temporary table if not exists elo_work (
    identity_key text primary key,
    player_id uuid not null,
    name text not null,
    rating numeric not null default 1500,
    played integer not null default 0,
    won integer not null default 0,
    win_margin_total numeric not null default 0,
    win_margin_games integer not null default 0,
    latest_change numeric not null default 0
  ) on commit drop;
  truncate elo_work;

  insert into elo_work (identity_key, player_id, name)
  select distinct on (eim.identity_key)
    eim.identity_key,
    eim.representative_player_id,
    eim.username
  from elo_identity_map eim
  order by eim.identity_key, eim.username;

  for game_record in
    select g.id, g.played_on
    from public.games g
    where g.status = 'finalized'
    order by g.played_on, g.created_at, g.id
  loop
    create temporary table if not exists elo_game_delta (
      identity_key text primary key,
      delta numeric not null default 0
    ) on commit drop;
    truncate elo_game_delta;

    insert into elo_game_delta (identity_key)
    select distinct eim.identity_key
    from public.game_players gp
    join elo_identity_map eim on eim.player_id = gp.player_id
    where gp.game_id = game_record.id;

    for left_row in
      select
        eim.identity_key,
        gp.placement,
        gp.total_points,
        gp.is_winner
      from public.game_players gp
      join elo_identity_map eim on eim.player_id = gp.player_id
      where gp.game_id = game_record.id
    loop
      update elo_work
      set played = played + 1,
          won = won + case when left_row.is_winner then 1 else 0 end
      where identity_key = left_row.identity_key;

      if left_row.is_winner then
        update elo_work
        set win_margin_total = win_margin_total + greatest(
              left_row.total_points - coalesce((
                select max(gp2.total_points)
                from public.game_players gp2
                join elo_identity_map eim2 on eim2.player_id = gp2.player_id
                where gp2.game_id = game_record.id
                  and eim2.identity_key <> left_row.identity_key
              ), left_row.total_points),
              0
            ),
            win_margin_games = win_margin_games + 1
        where identity_key = left_row.identity_key;
      end if;

      for right_row in
        select eim.identity_key, gp.placement, gp.total_points
        from public.game_players gp
        join elo_identity_map eim on eim.player_id = gp.player_id
        where gp.game_id = game_record.id
          and eim.identity_key > left_row.identity_key
      loop
        select rating into left_rating
        from elo_work where identity_key = left_row.identity_key;
        select rating into right_rating
        from elo_work where identity_key = right_row.identity_key;

        left_expected := 1 / (1 + power(10, (right_rating - left_rating) / 400));
        left_actual := case
          when left_row.placement < right_row.placement then 1
          when left_row.placement > right_row.placement then 0
          else 0.5
        end;
        margin_multiplier := 1 + least(
          ln(1 + abs(left_row.total_points - right_row.total_points)) / 4,
          0.75
        );
        rating_delta := (24 * margin_multiplier * (left_actual - left_expected)) /
          greatest((
            select count(distinct eim3.identity_key) - 1
            from public.game_players gp3
            join elo_identity_map eim3 on eim3.player_id = gp3.player_id
            where gp3.game_id = game_record.id
          ), 1);

        update elo_game_delta
        set delta = delta + rating_delta
        where identity_key = left_row.identity_key;
        update elo_game_delta
        set delta = delta - rating_delta
        where identity_key = right_row.identity_key;
      end loop;
    end loop;

    update elo_work ew
    set rating = ew.rating + egd.delta,
        latest_change = egd.delta
    from elo_game_delta egd
    where ew.identity_key = egd.identity_key;
  end loop;

  return query
  select
    ew.player_id,
    ew.name,
    round(ew.rating)::integer,
    ew.played,
    ew.won,
    round(ew.won::numeric / nullif(ew.played, 0), 4),
    round(ew.win_margin_total / nullif(ew.win_margin_games, 0), 2),
    round(ew.latest_change, 2)
  from elo_work ew
  where ew.played > 0
  order by ew.rating desc, ew.won desc, ew.played desc, ew.name;
end;
$$;

revoke all on function public.get_elo_leaderboard() from public;
grant execute on function public.get_elo_leaderboard() to authenticated;

-- Claiming is the only feature that compares full names. Candidate/result
-- labels remain usernames, so full names never leak into the roster or stats.
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
  ), candidates as (
    select
      p.id,
      p.group_id,
      g.name as group_name,
      coalesce(
        nullif(btrim(p.username), ''),
        nullif(split_part(btrim(p.display_name), ' ', 1), ''),
        'Unclaimed player'
      ) as public_username,
      normalize_claim_player_name(p.full_name) as normalized_player_full_name,
      normalize_claim_player_name(p.username) as normalized_player_username,
      normalize_claim_player_name(p.display_name) as normalized_legacy_name,
      me.normalized_full_name,
      me.normalized_username
    from me
    join public.players p on p.linked_user_id is null
    join public.groups g on g.id = p.group_id
  ), matched as (
    select
      candidates.*,
      (
        normalized_full_name <> '' and (
          normalized_player_full_name = normalized_full_name
          or normalized_legacy_name = normalized_full_name
        )
      ) or (
        normalized_username <> '' and (
          normalized_player_username = normalized_username
          or normalized_legacy_name = normalized_username
        )
      ) as is_exact,
      normalized_full_name <> '' and (
        normalized_player_full_name like normalized_full_name || '%'
        or normalized_full_name like normalized_player_full_name || '%'
        or normalized_legacy_name like normalized_full_name || '%'
        or normalized_full_name like normalized_legacy_name || '%'
      ) as is_partial
    from candidates
  )
  select
    matched.id,
    matched.public_username,
    matched.group_id,
    matched.group_name,
    case when matched.is_exact then 'exact' else 'partial' end,
    matched.is_exact
  from matched
  where matched.is_exact or matched.is_partial
  order by matched.is_exact desc, matched.group_name, matched.public_username;
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
  v_username text;
begin
  if v_user_id is null then
    raise exception 'Not signed in.';
  end if;

  select
    normalize_claim_player_name(full_name),
    normalize_claim_player_name(username),
    username
  into v_normalized_full_name, v_normalized_username, v_username
  from public.user_profiles
  where user_id = v_user_id;

  create temporary table _claimed_player_profiles (
    player_id uuid,
    group_id uuid
  ) on commit drop;

  with updated as (
    update public.players p
    set linked_user_id = v_user_id
    where p.linked_user_id is null
      and (
        (v_normalized_full_name <> '' and (
          normalize_claim_player_name(p.full_name) = v_normalized_full_name
          or normalize_claim_player_name(p.display_name) = v_normalized_full_name
        ))
        or (v_normalized_username <> '' and (
          normalize_claim_player_name(p.username) = v_normalized_username
          or normalize_claim_player_name(p.display_name) = v_normalized_username
        ))
      )
    returning p.id, p.group_id
  )
  insert into _claimed_player_profiles (player_id, group_id)
  select updated.id, updated.group_id from updated;

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
  select cp.group_id, g.name, v_username
  from _claimed_player_profiles cp
  join public.groups g on g.id = cp.group_id
  order by g.name;
end;
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
  v_username text;
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

  select * into v_player
  from public.players
  where id = p_player_id
  for update;

  if not found then
    raise exception 'That saved player profile no longer exists.';
  end if;

  select username into v_username
  from public.user_profiles
  where user_id = v_user_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_player.group_id, v_user_id, 'editor')
   on conflict on constraint group_members_group_id_user_id_key do nothing;

  update public.players
  set linked_user_id = v_user_id
  where id = v_player.id;

  update public.user_profiles
  set last_active_group_id = v_player.group_id, updated_at = now()
  where user_id = v_user_id;

  return query
  select g.id, g.name, v_username
  from public.groups g
  where g.id = v_player.group_id;
end;
$$;
