-- Phase 4, Step 4.3: keep import/claim matching data private while preserving
-- the stable public.players ID used by every historical game relation.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to authenticated;

create or replace function private.normalize_guest_username(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      lower(btrim(regexp_replace(coalesce(input, ''), '[[:space:]]+', ' ', 'g'))),
      '[^a-z0-9]+',
      '-',
      'g'
    ),
    '-'
  );
$$;

create or replace function private.normalize_private_personal_name(
  first_name text,
  last_name text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      lower(
        concat_ws(
          ' ',
          nullif(btrim(regexp_replace(coalesce(first_name, ''), '[[:space:]]+', ' ', 'g')), ''),
          nullif(btrim(regexp_replace(coalesce(last_name, ''), '[[:space:]]+', ' ', 'g')), '')
        )
      ),
      '[^[:alnum:]]+',
      ' ',
      'g'
    )
  );
$$;

create table public.player_private_identities (
  player_id uuid primary key references public.players(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  identity_mode text not null check (identity_mode in ('username', 'personal_name')),
  guest_username text,
  guest_first_name text,
  guest_last_name text,
  normalized_guest_username text,
  normalized_personal_name text,
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_private_identities_group_player_fk
    foreign key (group_id, player_id)
    references public.players(group_id, id)
    on delete cascade,
  constraint player_private_identities_mode_fields_check check (
    (
      (
        guest_username is null
        and normalized_guest_username is null
      )
      or
      (
        nullif(btrim(guest_username), '') is not null
        and normalized_guest_username = private.normalize_guest_username(guest_username)
        and nullif(normalized_guest_username, '') is not null
      )
    )
    and
    (
      (
        guest_first_name is null
        and guest_last_name is null
        and normalized_personal_name is null
      )
      or
      (
        nullif(btrim(guest_first_name), '') is not null
        and nullif(btrim(guest_last_name), '') is not null
        and normalized_personal_name = private.normalize_private_personal_name(
          guest_first_name,
          guest_last_name
        )
        and nullif(normalized_personal_name, '') is not null
      )
    )
    and (
      (identity_mode = 'username' and guest_username is not null)
      or
      (identity_mode = 'personal_name' and guest_first_name is not null and guest_last_name is not null)
    )
  )
);

create unique index player_private_identities_group_username_idx
on public.player_private_identities (group_id, normalized_guest_username)
where normalized_guest_username is not null;

create index player_private_identities_group_personal_name_idx
on public.player_private_identities (group_id, normalized_personal_name)
where normalized_personal_name is not null;

alter table public.player_private_identities enable row level security;

create policy "members read private player identities"
on public.player_private_identities
for select
to authenticated
using (
  public.is_group_member(group_id)
  and exists (
    select 1
    from public.players p
    where p.id = player_private_identities.player_id
      and p.group_id = player_private_identities.group_id
      and p.linked_user_id is null
  )
);

create policy "members create private player identities"
on public.player_private_identities
for insert
to authenticated
with check (
  public.is_group_member(group_id)
  and created_by_user_id = (select auth.uid())
  and exists (
    select 1
    from public.players p
    where p.id = player_private_identities.player_id
      and p.group_id = player_private_identities.group_id
      and p.linked_user_id is null
  )
);

revoke all on public.player_private_identities from public;
revoke all on public.player_private_identities from anon;
revoke all on public.player_private_identities from authenticated;
grant select, insert on public.player_private_identities to authenticated;

-- A display label is not an identity key. The existing display-label unique
-- index remains in place for manual-entry compatibility; the creation RPC
-- disambiguates the rare cross-mode label collision without using that label
-- for guest identity matching.

alter table public.player_import_aliases
add column if not exists identity_mode text;

alter table public.player_import_aliases
drop constraint if exists player_import_aliases_identity_mode_check;

alter table public.player_import_aliases
add constraint player_import_aliases_identity_mode_check
check (identity_mode is null or identity_mode in ('username', 'personal_name'));

alter table public.player_import_aliases
drop constraint if exists player_import_aliases_group_id_source_type_normalized_alias_key;

create unique index player_import_aliases_legacy_unique_idx
on public.player_import_aliases (group_id, source_type, normalized_alias)
where identity_mode is null;

create unique index player_import_aliases_username_unique_idx
on public.player_import_aliases (group_id, normalized_alias)
where identity_mode = 'username';

create unique index player_import_aliases_personal_name_unique_idx
on public.player_import_aliases (group_id, player_id, normalized_alias)
where identity_mode = 'personal_name';

-- Player aliases can contain private personal-name evidence. Direct reads of
-- the shared OCR alias dictionary therefore exclude player rows. Authorized
-- OCR review still receives game-scoped player aliases through its guarded RPC.
drop policy if exists "domain_text_aliases_read_authenticated"
on public.domain_text_aliases;
drop policy if exists "members can read domain aliases"
on public.domain_text_aliases;

create policy "authenticated read non-player domain aliases"
on public.domain_text_aliases
for select
to authenticated
using (entity_type <> 'player');

create or replace function private.resolve_public_player_name(p_player_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p.linked_user_id is null then
      coalesce(nullif(btrim(p.display_name), ''), 'Player')
    else
      coalesce(nullif(btrim(up.username), ''), 'Player')
  end
  from public.players p
  left join public.user_profiles up on up.user_id = p.linked_user_id
  where p.id = p_player_id;
$$;

revoke all on function private.normalize_guest_username(text) from public;
revoke all on function private.normalize_private_personal_name(text, text) from public;
revoke all on function private.resolve_public_player_name(uuid) from public;
grant execute on function private.normalize_guest_username(text) to authenticated;
grant execute on function private.normalize_private_personal_name(text, text) to authenticated;
grant execute on function private.resolve_public_player_name(uuid) to authenticated;

create or replace function public.get_public_player_names(p_player_ids uuid[])
returns table (
  player_id uuid,
  public_name text,
  is_linked boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    coalesce(private.resolve_public_player_name(p.id), 'Player') as public_name,
    p.linked_user_id is not null as is_linked
  from public.players p
  where p.id = any(coalesce(p_player_ids, '{}'::uuid[]))
  order by p.created_at, p.id;
$$;

revoke execute on function public.get_public_player_names(uuid[]) from public;
revoke execute on function public.get_public_player_names(uuid[]) from anon;
grant execute on function public.get_public_player_names(uuid[]) to authenticated;

create or replace function public.resolve_import_guest_identity(
  p_group_id uuid,
  p_identity_mode text,
  p_guest_username text default null,
  p_guest_first_name text default null,
  p_guest_last_name text default null,
  p_selected_player_id uuid default null,
  p_create_new boolean default false
)
returns table (
  player_id uuid,
  public_name text,
  resolution_state text,
  normalized_imported_value text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_username text;
  v_first_name text;
  v_last_name text;
  v_normalized_value text;
  v_candidate_count integer := 0;
  v_player_id uuid;
  v_display_attempt integer := 1;
  v_display_base text;
  v_display_name text;
begin
  if (select auth.uid()) is null or not public.is_group_member(p_group_id) then
    raise exception 'The selected group is not available for import.' using errcode = '42501';
  end if;

  if p_identity_mode = 'username' then
    v_username := nullif(btrim(regexp_replace(coalesce(p_guest_username, ''), '[[:space:]]+', ' ', 'g')), '');
    v_normalized_value := private.normalize_guest_username(v_username);

    if v_username is null or v_normalized_value = '' then
      raise exception 'Enter a guest username using letters or numbers.' using errcode = '22023';
    end if;
  elsif p_identity_mode = 'personal_name' then
    v_first_name := nullif(btrim(regexp_replace(coalesce(p_guest_first_name, ''), '[[:space:]]+', ' ', 'g')), '');
    v_last_name := nullif(btrim(regexp_replace(coalesce(p_guest_last_name, ''), '[[:space:]]+', ' ', 'g')), '');
    v_normalized_value := private.normalize_private_personal_name(v_first_name, v_last_name);

    if v_first_name is null or v_last_name is null or v_normalized_value = '' then
      raise exception 'Enter both a first and last name.' using errcode = '22023';
    end if;
  else
    raise exception 'Choose username or first and last name.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_group_id::text || ':' || p_identity_mode || ':' || v_normalized_value,
      0
    )
  );

  select count(*)::integer
  into v_candidate_count
  from public.player_private_identities ppi
  join public.players p on p.id = ppi.player_id
  where ppi.group_id = p_group_id
    and p.linked_user_id is null
    and (
      (p_identity_mode = 'username' and ppi.normalized_guest_username = v_normalized_value)
      or
      (p_identity_mode = 'personal_name' and ppi.normalized_personal_name = v_normalized_value)
    );

  if p_selected_player_id is not null then
    if not exists (
      select 1
      from public.player_private_identities ppi
      join public.players p on p.id = ppi.player_id
      where ppi.player_id = p_selected_player_id
        and ppi.group_id = p_group_id
        and p.linked_user_id is null
        and (
          (p_identity_mode = 'username' and ppi.normalized_guest_username = v_normalized_value)
          or
          (p_identity_mode = 'personal_name' and ppi.normalized_personal_name = v_normalized_value)
        )
    ) and not exists (
      select 1
      from public.players p
      where p.id = p_selected_player_id
        and p.group_id = p_group_id
        and p.linked_user_id is null
        and not exists (
          select 1
          from public.player_private_identities ppi
          where ppi.player_id = p.id
        )
        and p.normalized_display_name = case
          when p_identity_mode = 'username'
            then replace(v_normalized_value, '-', ' ')
          else v_normalized_value
        end
    ) then
      raise exception 'The selected guest identity is unavailable or no longer matches.' using errcode = 'P0002';
    end if;

    insert into public.player_private_identities (
      player_id,
      group_id,
      identity_mode,
      guest_username,
      guest_first_name,
      guest_last_name,
      normalized_guest_username,
      normalized_personal_name,
      created_by_user_id
    )
    select
      p_selected_player_id,
      p_group_id,
      p_identity_mode,
      case when p_identity_mode = 'username' then v_username end,
      case when p_identity_mode = 'personal_name' then v_first_name end,
      case when p_identity_mode = 'personal_name' then v_last_name end,
      case when p_identity_mode = 'username' then v_normalized_value end,
      case when p_identity_mode = 'personal_name' then v_normalized_value end,
      (select auth.uid())
    where not exists (
      select 1
      from public.player_private_identities ppi
      where ppi.player_id = p_selected_player_id
    );

    insert into public.player_import_aliases (
      group_id,
      player_id,
      source_type,
      identity_mode,
      alias_text,
      normalized_alias
    ) values (
      p_group_id,
      p_selected_player_id,
      'game_log',
      p_identity_mode,
      case
        when p_identity_mode = 'username' then v_username
        else concat_ws(' ', v_first_name, v_last_name)
      end,
      v_normalized_value
    )
    on conflict do nothing;

    return query
    select
      p_selected_player_id,
      coalesce(private.resolve_public_player_name(p_selected_player_id), 'Player'),
      'existing_unlinked_guest'::text,
      v_normalized_value;
    return;
  end if;

  if v_candidate_count > 1 then
    raise exception 'Multiple guest identities match. Select one explicitly.' using errcode = 'P0003';
  end if;

  if v_candidate_count = 1 then
    raise exception 'An existing guest identity matches. Confirm that player before continuing.' using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.players p
    where p.group_id = p_group_id
      and p.linked_user_id is null
      and not exists (
        select 1
        from public.player_private_identities ppi
        where ppi.player_id = p.id
      )
      and p.normalized_display_name = case
        when p_identity_mode = 'username'
          then replace(v_normalized_value, '-', ' ')
        else v_normalized_value
      end
  ) then
    raise exception 'A legacy guest identity matches. Confirm that player before continuing.' using errcode = '23505';
  end if;

  if not p_create_new then
    raise exception 'Confirm creation of the new guest identity.' using errcode = '22023';
  end if;

  v_display_base := case
    when p_identity_mode = 'username' then v_username
    else concat_ws(' ', v_first_name, v_last_name)
  end;
  v_display_name := v_display_base;

  while exists (
    select 1
    from public.players p
    where p.group_id = p_group_id
      and p.normalized_display_name = btrim(
        regexp_replace(lower(v_display_name), '[^a-z0-9]+', ' ', 'g')
      )
  ) loop
    v_display_name := format(
      '%s (%s%s)',
      v_display_base,
      case when p_identity_mode = 'username' then 'username' else 'guest' end,
      case when v_display_attempt = 1 then '' else ' ' || v_display_attempt::text end
    );
    v_display_attempt := v_display_attempt + 1;
  end loop;

  insert into public.players (group_id, linked_user_id, display_name)
  values (p_group_id, null, v_display_name)
  returning id into v_player_id;

  insert into public.player_private_identities (
    player_id,
    group_id,
    identity_mode,
    guest_username,
    guest_first_name,
    guest_last_name,
    normalized_guest_username,
    normalized_personal_name,
    created_by_user_id
  ) values (
    v_player_id,
    p_group_id,
    p_identity_mode,
    case when p_identity_mode = 'username' then v_username end,
    case when p_identity_mode = 'personal_name' then v_first_name end,
    case when p_identity_mode = 'personal_name' then v_last_name end,
    case when p_identity_mode = 'username' then v_normalized_value end,
    case when p_identity_mode = 'personal_name' then v_normalized_value end,
    (select auth.uid())
  );

  insert into public.player_import_aliases (
    group_id,
    player_id,
    source_type,
    identity_mode,
    alias_text,
    normalized_alias
  ) values (
    p_group_id,
    v_player_id,
    'game_log',
    p_identity_mode,
    v_display_name,
    v_normalized_value
  )
  on conflict do nothing;

  return query
  select
    v_player_id,
    coalesce(private.resolve_public_player_name(v_player_id), 'Player'),
    'newly_created_unlinked_guest'::text,
    v_normalized_value;
end;
$$;

revoke execute on function public.resolve_import_guest_identity(
  uuid, text, text, text, text, uuid, boolean
) from public;
revoke execute on function public.resolve_import_guest_identity(
  uuid, text, text, text, text, uuid, boolean
) from anon;
grant execute on function public.resolve_import_guest_identity(
  uuid, text, text, text, text, uuid, boolean
) to authenticated;

-- Registration-time claiming remains deferred. Disable the legacy full-name
-- matcher so unrelated callers cannot enumerate private claim candidates.
revoke execute on function public.list_claimable_player_profiles() from public;
revoke execute on function public.list_claimable_player_profiles() from anon;
revoke execute on function public.list_claimable_player_profiles() from authenticated;
revoke execute on function public.claim_player_profile(uuid) from public;
revoke execute on function public.claim_player_profile(uuid) from anon;
revoke execute on function public.claim_player_profile(uuid) from authenticated;

-- Preserve the existing analytics contract while resolving every visible
-- claimed-player name from the current registered username.
create or replace view analytics.player_game_results
with (security_invoker = true) as
select
  g.group_id,
  g.id as game_id,
  g.played_on,
  g.map_id,
  g.player_count,
  g.generation_count,
  gp.id as game_player_id,
  p.id as player_id,
  coalesce(private.resolve_public_player_name(p.id), 'Player') as player_name,
  gp.placement,
  gp.is_winner,
  gp.total_points,
  gp.final_megacredits,
  gp.cities_points,
  gp.greenery_points,
  gp.card_points_total,
  gp.card_points_microbes,
  gp.card_points_animals,
  gp.card_points_jovian,
  gp.other_card_points,
  gp.tr_points,
  gp.milestone_points,
  gp.award_points,
  same_place.same_place_count,
  case
    when gp.card_points_microbes is not null
      and gp.card_points_animals is not null
      and gp.card_points_jovian is not null
    then true
    else false
  end as has_full_card_breakdown,
  declared_styles.primary_style_code as declared_primary_style_code,
  declared_styles.modifier_style_codes as declared_modifier_style_codes,
  (declared_styles.primary_style_code is not null) as has_declared_style,
  inferred_styles.primary_style_code as inferred_primary_style_code,
  inferred_styles.primary_confidence as inferred_style_confidence,
  coalesce(key_cards.key_card_count, 0) as key_card_count,
  lineups.lineup_key,
  lineups.lineup_label,
  lineups.opponent_count,
  case
    when gp.placement = 1 and same_place.same_place_count > 1 then 0
    when gp.placement = 1 then gp.total_points - coalesce(comparison.comparison_points, gp.total_points)
    else null
  end as win_differential_points,
  case
    when gp.placement = 1 then null
    else coalesce(comparison.comparison_points, gp.total_points) - gp.total_points
  end as loss_gap_points,
  case
    when gp.placement = 1 and same_place.same_place_count > 1 then 0
    when gp.placement = 1 then gp.total_points - coalesce(comparison.comparison_points, gp.total_points)
    else -1 * (coalesce(comparison.comparison_points, gp.total_points) - gp.total_points)
  end as signed_differential_points,
  1 - ((gp.placement - 1)::numeric / greatest(g.player_count - 1, 1)) as placement_score
from public.games g
join public.game_players gp on gp.game_id = g.id
join public.players p on p.id = gp.player_id
left join lateral (
  select count(*)::int as same_place_count
  from public.game_players gp_same
  where gp_same.game_id = g.id
    and gp_same.placement = gp.placement
) same_place on true
left join lateral (
  select
    case
      when gp.placement = 1 then min(gp_other.placement)
      else max(gp_other.placement)
    end as comparison_placement
  from public.game_players gp_other
  where gp_other.game_id = g.id
    and (
      (gp.placement = 1 and gp_other.placement > gp.placement)
      or
      (gp.placement > 1 and gp_other.placement < gp.placement)
    )
) comparison_target on true
left join lateral (
  select gp_other.total_points as comparison_points
  from public.game_players gp_other
  where gp_other.game_id = g.id
    and gp_other.placement = comparison_target.comparison_placement
  order by gp_other.total_points desc, gp_other.final_megacredits desc
  limit 1
) comparison on true
left join lateral (
  select
    max(sd.code) filter (where gpds.is_primary) as primary_style_code,
    coalesce(
      array_agg(sd.code order by sd.name) filter (where not gpds.is_primary),
      array[]::text[]
    ) as modifier_style_codes
  from public.game_player_declared_styles gpds
  join public.style_definitions sd on sd.id = gpds.style_definition_id
  where gpds.game_player_id = gp.id
) declared_styles on true
left join lateral (
  select
    max(sd.code) filter (where gpis.is_primary) as primary_style_code,
    max(gpis.confidence) filter (where gpis.is_primary) as primary_confidence
  from public.game_player_inferred_styles gpis
  join public.style_definitions sd on sd.id = gpis.style_definition_id
  where gpis.game_player_id = gp.id
) inferred_styles on true
left join lateral (
  select count(*)::int as key_card_count
  from public.game_player_key_cards gpk
  where gpk.game_player_id = gp.id
) key_cards on true
left join lateral (
  select
    string_agg(op.id::text, ',' order by op.id::text) as lineup_key,
    string_agg(
      coalesce(private.resolve_public_player_name(op.id), 'Player'),
      ', '
      order by coalesce(private.resolve_public_player_name(op.id), 'Player')
    ) as lineup_label,
    count(*)::int as opponent_count
  from public.game_players gp_other
  join public.players op on op.id = gp_other.player_id
  where gp_other.game_id = g.id
    and gp_other.player_id <> gp.player_id
) lineups on true
where g.status = 'finalized';

-- The existing final-action RPC is also a player-name serializer. Keep the
-- public signature, move privileged reads into the private schema, preserve
-- the historical players.id, and emit only the centralized public name.
create or replace function private.get_final_terraforming_action_stats(
  scope text default 'personal',
  target_group_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with scoped_games as (
  select g.id, g.group_id
  from public.games g
  where g.status = 'finalized'
    and (select auth.uid()) is not null
    and (
      scope = 'global'
      or (
        scope = 'personal'
        and exists (
          select 1
          from public.game_players gp_self
          join public.players p_self on p_self.id = gp_self.player_id
          where gp_self.game_id = g.id
            and p_self.linked_user_id = (select auth.uid())
        )
      )
      or (
        scope = 'group'
        and target_group_id is not null
        and g.group_id = target_group_id
        and public.can_read_game(g.id)
      )
    )
),
latest_imports as (
  select distinct on (gli.game_id)
    gli.id as game_log_import_id,
    gli.game_id
  from public.game_log_imports gli
  join scoped_games sg on sg.id = gli.game_id
  where btrim(gli.raw_log_text) <> ''
  order by gli.game_id, gli.created_at desc, gli.id desc
),
player_results as (
  select
    gp.game_id,
    gp.player_id as source_player_id,
    p.id as identity_id,
    coalesce(private.resolve_public_player_name(p.id), 'Player') as player_name,
    gp.is_winner
  from latest_imports li
  join public.game_players gp on gp.game_id = li.game_id
  join public.players p on p.id = gp.player_id
),
terraforming_events as (
  select
    li.game_id,
    gle.event_order,
    coalesce(gle.payload->>'actor', '') as actor,
    case
      when gle.event_type = 'tile_placed'
        and lower(coalesce(gle.tile_type, '')) = 'greenery'
        then 'oxygen'
      when gle.event_type = 'tile_placed'
        and lower(coalesce(gle.tile_type, '')) = 'ocean'
        then 'ocean'
      else lower(coalesce(gle.payload->>'parameterType', gle.resource_type, ''))
    end as action_type
  from latest_imports li
  join public.game_log_events gle on gle.game_log_import_id = li.game_log_import_id
  where (
      gle.event_type = 'global_parameter_changed'
      and lower(coalesce(gle.payload->>'parameterType', gle.resource_type, '')) in (
        'ocean',
        'oxygen',
        'temperature'
      )
    )
    or (
      gle.event_type = 'tile_placed'
      and lower(coalesce(gle.tile_type, '')) in ('greenery', 'ocean')
    )
),
ranked_terraforming_events as (
  select
    te.*,
    row_number() over (
      partition by te.game_id
      order by te.event_order desc
    ) as action_rank
  from terraforming_events te
),
resolved_final_actions as (
  select
    rte.game_id,
    pr.identity_id,
    rte.action_type,
    pr.is_winner
  from ranked_terraforming_events rte
  join scoped_games sg on sg.id = rte.game_id
  join lateral (
    select candidates.player_id
    from (
      select pia.player_id, 1 as preference
      from public.player_import_aliases pia
      where pia.group_id = sg.group_id
        and pia.source_type = 'game_log'
        and replace(pia.normalized_alias, '-', ' ') = btrim(
          regexp_replace(lower(rte.actor), '[^a-z0-9]+', ' ', 'g')
        )
      union all
      select p.id as player_id, 2 as preference
      from public.players p
      where p.group_id = sg.group_id
        and p.normalized_display_name = btrim(
          regexp_replace(lower(rte.actor), '[^a-z0-9]+', ' ', 'g')
        )
    ) candidates
    order by candidates.preference
    limit 1
  ) resolved on true
  join player_results pr
    on pr.game_id = rte.game_id
   and pr.source_player_id = resolved.player_id
  where rte.action_rank = 1
),
player_baselines as (
  select
    pr.identity_id,
    max(pr.player_name) as player_name,
    count(distinct pr.game_id)::int as imported_games,
    count(distinct pr.game_id) filter (where pr.is_winner)::int as overall_wins,
    round(
      count(distinct pr.game_id) filter (where pr.is_winner)::numeric
        / nullif(count(distinct pr.game_id), 0),
      4
    ) as overall_win_rate
  from player_results pr
  group by pr.identity_id
),
player_final_actions as (
  select
    rfa.identity_id,
    count(distinct rfa.game_id)::int as final_action_games,
    count(distinct rfa.game_id) filter (where rfa.is_winner)::int as final_action_wins,
    round(
      count(distinct rfa.game_id) filter (where rfa.is_winner)::numeric
        / nullif(count(distinct rfa.game_id), 0),
      4
    ) as final_action_win_rate
  from resolved_final_actions rfa
  group by rfa.identity_id
),
action_type_counts as (
  select
    rfa.identity_id,
    rfa.action_type,
    count(distinct rfa.game_id)::int as action_count
  from resolved_final_actions rfa
  group by rfa.identity_id, rfa.action_type
),
ranked_action_types as (
  select
    atc.*,
    row_number() over (
      partition by atc.identity_id
      order by atc.action_count desc, atc.action_type
    ) as action_type_rank
  from action_type_counts atc
)
select coalesce(
  jsonb_agg(
    jsonb_build_object(
      'player_id', pb.identity_id,
      'player_name', pb.player_name,
      'imported_games', pb.imported_games,
      'overall_wins', pb.overall_wins,
      'overall_win_rate', pb.overall_win_rate,
      'final_action_games', pfa.final_action_games,
      'final_action_wins', pfa.final_action_wins,
      'final_action_rate',
        round(pfa.final_action_games::numeric / nullif(pb.imported_games, 0), 4),
      'final_action_win_rate', pfa.final_action_win_rate,
      'win_rate_delta',
        case
          when pfa.final_action_win_rate is not null and pb.overall_win_rate is not null
            then round(pfa.final_action_win_rate - pb.overall_win_rate, 4)
          else null
        end,
      'most_common_action_type', rat.action_type,
      'most_common_action_count', rat.action_count
    )
    order by
      pfa.final_action_games desc,
      pfa.final_action_win_rate desc nulls last,
      pb.imported_games desc,
      pb.player_name
  ),
  '[]'::jsonb
)
from player_final_actions pfa
join player_baselines pb on pb.identity_id = pfa.identity_id
left join ranked_action_types rat
  on rat.identity_id = pfa.identity_id
 and rat.action_type_rank = 1;
$$;

revoke all on function private.get_final_terraforming_action_stats(text, uuid) from public;
grant execute on function private.get_final_terraforming_action_stats(text, uuid) to authenticated;

create or replace function public.get_final_terraforming_action_stats(
  scope text default 'personal',
  target_group_id uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_final_terraforming_action_stats(scope, target_group_id);
$$;

revoke execute on function public.get_final_terraforming_action_stats(text, uuid) from public;
revoke execute on function public.get_final_terraforming_action_stats(text, uuid) from anon;
grant execute on function public.get_final_terraforming_action_stats(text, uuid) to authenticated;

-- OCR review is protected evidence review. It may return authorized aliases,
-- but its canonical player label still follows the public-name resolver so a
-- claimed player's old personal-name display label is never the fallback.
create or replace function public.get_ocr_domain_dictionary(
  p_game_log_import_id uuid
)
returns table (
  entity_type text,
  entity_id uuid,
  canonical_name text,
  aliases text[]
)
language sql
security definer
set search_path = ''
as $$
  with import_game as (
    select gli.game_id
    from public.game_log_imports gli
    where gli.id = p_game_log_import_id
      and public.can_edit_game(gli.game_id)
  ), entries(entity_type, entity_id, canonical_name) as (
    select 'card'::text, c.id, c.card_name from public.cards c
    union all
    select 'corporation', c.id, c.name from public.corporations c
    union all
    select 'milestone', m.id, m.name from public.milestones m
    union all
    select 'award', a.id, a.name from public.awards a
    union all
    select
      'player',
      p.id,
      coalesce(private.resolve_public_player_name(p.id), 'Player')
    from import_game ig
    join public.game_players gp on gp.game_id = ig.game_id
    join public.players p on p.id = gp.player_id
  )
  select
    e.entity_type,
    e.entity_id,
    e.canonical_name,
    coalesce(
      array_agg(dta.alias_text order by dta.occurrence_count desc)
        filter (where dta.id is not null),
      '{}'::text[]
    ) as aliases
  from entries e
  left join public.domain_text_aliases dta
    on dta.entity_type = e.entity_type
   and dta.entity_id = e.entity_id
  group by e.entity_type, e.entity_id, e.canonical_name;
$$;

revoke execute on function public.get_ocr_domain_dictionary(uuid) from public;
revoke execute on function public.get_ocr_domain_dictionary(uuid) from anon;
grant execute on function public.get_ocr_domain_dictionary(uuid) to authenticated;

-- The restored OCR function is SECURITY DEFINER, so it must enforce the edit
-- boundary itself instead of relying on table RLS.
create or replace function public.confirm_game_log_ocr_correction(
  p_correction_id uuid,
  p_canonical_entity_id uuid,
  p_canonical_text text,
  p_save_alias boolean default true
)
returns public.game_log_ocr_corrections
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.game_log_ocr_corrections%rowtype;
begin
  select correction.*
  into v_row
  from public.game_log_ocr_corrections correction
  join public.game_log_imports gli
    on gli.id = correction.game_log_import_id
  where correction.id = p_correction_id
    and public.can_edit_game(gli.game_id)
  for update of correction;

  if not found then
    raise exception 'OCR correction % is unavailable or not editable', p_correction_id
      using errcode = '42501';
  end if;

  update public.game_log_ocr_corrections
  set canonical_entity_id = p_canonical_entity_id,
      canonical_text = p_canonical_text,
      correction_method = 'manual',
      decision = 'confirmed',
      confirmed_by_user_id = auth.uid(),
      confirmed_at = now(),
      updated_at = now()
  where id = p_correction_id
  returning * into v_row;

  if p_save_alias and p_canonical_entity_id is not null then
    insert into public.domain_text_aliases (
      entity_type,
      entity_id,
      alias_text,
      normalized_alias_text,
      source,
      occurrence_count,
      confirmed_by_user_id
    ) values (
      v_row.entity_type,
      p_canonical_entity_id,
      v_row.original_ocr_text,
      public.normalize_ocr_domain_text(v_row.original_ocr_text),
      'confirmed_ocr',
      1,
      auth.uid()
    )
    on conflict (entity_type, normalized_alias_text) do update
    set entity_id = excluded.entity_id,
        alias_text = excluded.alias_text,
        source = 'confirmed_ocr',
        occurrence_count = public.domain_text_aliases.occurrence_count + 1,
        confirmed_by_user_id = auth.uid(),
        updated_at = now();
  end if;

  return v_row;
end;
$$;

revoke execute on function public.confirm_game_log_ocr_correction(uuid, uuid, text, boolean) from public;
revoke execute on function public.confirm_game_log_ocr_correction(uuid, uuid, text, boolean) from anon;
grant execute on function public.confirm_game_log_ocr_correction(uuid, uuid, text, boolean) to authenticated;
