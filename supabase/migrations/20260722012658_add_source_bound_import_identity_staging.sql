-- GATED / UNAPPLIED expansion migration.
-- Introduces service-only, source-bound import identity resolution. This file
-- must ship and prove healthy before the separate contraction migration revokes
-- authenticated access to the legacy free-form matcher.

create table if not exists private.import_identity_staging (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  source_player_texts text[] not null,
  parser_identity text not null,
  source_format text not null,
  game_id uuid references public.games(id) on delete cascade,
  game_log_import_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  constraint import_identity_staging_source_count_check
    check (cardinality(source_player_texts) between 1 and 5),
  constraint import_identity_staging_parser_check
    check (nullif(btrim(parser_identity), '') is not null),
  constraint import_identity_staging_source_format_check
    check (nullif(btrim(source_format), '') is not null),
  constraint import_identity_staging_expiry_check
    check (expires_at > created_at),
  constraint import_identity_staging_import_fk
    foreign key (game_id, game_log_import_id)
    references public.game_log_imports(game_id, id)
    on delete cascade
);

alter table private.import_identity_staging enable row level security;
revoke all on private.import_identity_staging from public;
revoke all on private.import_identity_staging from anon;
revoke all on private.import_identity_staging from authenticated;
revoke all on private.import_identity_staging from service_role;

create index if not exists import_identity_staging_expires_at_idx
  on private.import_identity_staging (expires_at);
create index if not exists import_identity_staging_game_id_idx
  on private.import_identity_staging (game_id)
  where game_id is not null;

-- Production COUNT-only preflight found zero normalized registered-username
-- collision groups. This index closes the race between that preflight and use.
create unique index if not exists user_profiles_normalized_username_key
  on public.user_profiles ((private.normalize_guest_username(username)))
  where nullif(private.normalize_guest_username(username), '') is not null;

create or replace function private.import_identity_player_matches(
  p_group_id uuid,
  p_player_id uuid,
  p_source_text text,
  p_identity_mode text,
  p_guest_username text default null,
  p_guest_first_name text default null,
  p_guest_last_name text default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with values_to_match as (
    select
      nullif(btrim(regexp_replace(coalesce(p_source_text, ''), '[[:space:]]+', ' ', 'g')), '') as source_exact,
      private.normalize_guest_username(p_source_text) as source_username,
      private.normalize_private_personal_name(p_source_text, null) as source_personal,
      private.normalize_guest_username(p_guest_username) as entered_username,
      private.normalize_private_personal_name(p_guest_first_name, p_guest_last_name) as entered_personal,
      nullif(btrim(regexp_replace(coalesce(p_guest_first_name, ''), '[[:space:]]+', ' ', 'g')), '') as entered_first,
      nullif(btrim(regexp_replace(coalesce(p_guest_last_name, ''), '[[:space:]]+', ' ', 'g')), '') as entered_last,
      nullif(btrim(regexp_replace(concat_ws(' ', p_guest_first_name, p_guest_last_name), '[[:space:]]+', ' ', 'g')), '') as entered_full
  )
  select exists (
    select 1
    from public.players p
    cross join values_to_match v
    left join public.user_profiles up on up.user_id = p.linked_user_id
    left join private.player_private_identities ppi on ppi.player_id = p.id
    where p.id = p_player_id
      and p.group_id = p_group_id
      and v.source_exact is not null
      and (
        (
          p_identity_mode = 'username'
          and v.entered_username <> ''
          and v.source_username = v.entered_username
          and (
            private.normalize_guest_username(up.username) = v.entered_username
            or (p.linked_user_id is null and ppi.normalized_guest_username = v.entered_username)
            or (p.linked_user_id is null and exists (
              select 1 from public.player_import_aliases pia
              where pia.player_id = p.id and pia.group_id = p_group_id
                and pia.identity_mode = 'username'
                and pia.normalized_alias = v.entered_username
            ))
          )
        )
        or (
          p_identity_mode = 'personal_name'
          and v.entered_first is not null and v.entered_last is not null
          and v.source_exact in (v.entered_first, v.entered_last, v.entered_full)
          and (
            private.normalize_private_personal_name(up.full_name, null) = v.entered_personal
            or (p.linked_user_id is null and ppi.normalized_personal_name = v.entered_personal)
            or (p.linked_user_id is null and exists (
              select 1 from public.player_import_aliases pia
              where pia.player_id = p.id and pia.group_id = p_group_id
                and pia.identity_mode = 'personal_name'
                and pia.normalized_alias = v.entered_personal
            ))
          )
        )
        or (
          p_identity_mode = 'existing_player'
          and (
            private.normalize_guest_username(up.username) = v.source_username
            or private.normalize_private_personal_name(up.full_name, null) = v.source_personal
            or (p.linked_user_id is null and (
              ppi.normalized_guest_username = v.source_username
              or ppi.normalized_personal_name = v.source_personal
              or exists (
                select 1 from public.player_import_aliases pia
                where pia.player_id = p.id and pia.group_id = p_group_id
                  and pia.normalized_alias in (v.source_username, v.source_personal)
              )
            ))
          )
        )
      )
  );
$$;

revoke all on function private.import_identity_player_matches(uuid, uuid, text, text, text, text, text) from public;
revoke all on function private.import_identity_player_matches(uuid, uuid, text, text, text, text, text) from anon;
revoke all on function private.import_identity_player_matches(uuid, uuid, text, text, text, text, text) from authenticated;
revoke all on function private.import_identity_player_matches(uuid, uuid, text, text, text, text, text) from service_role;

create or replace function public.stage_import_player_identity_evidence(
  p_group_id uuid,
  p_requesting_user_id uuid,
  p_source_player_texts text[],
  p_parser_identity text,
  p_source_format text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  delete from private.import_identity_staging where expires_at <= now();

  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = p_requesting_user_id
  ) then
    return null;
  end if;
  if cardinality(coalesce(p_source_player_texts, '{}'::text[])) not between 1 and 5
     or exists (
       select 1 from unnest(coalesce(p_source_player_texts, '{}'::text[])) value
       where nullif(btrim(value), '') is null or length(value) > 512
     )
     or nullif(btrim(p_parser_identity), '') is null
     or nullif(btrim(p_source_format), '') is null then
    return null;
  end if;

  insert into private.import_identity_staging (
    group_id, created_by_user_id, source_player_texts, parser_identity, source_format
  ) values (
    p_group_id, p_requesting_user_id, p_source_player_texts,
    btrim(p_parser_identity), btrim(p_source_format)
  ) returning id into v_id;
  return v_id;
exception when others then
  return null;
end;
$$;

create or replace function public.attach_import_identity_staging(
  p_staging_id uuid,
  p_requesting_user_id uuid,
  p_game_id uuid,
  p_game_log_import_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.import_identity_staging where expires_at <= now();
  update private.import_identity_staging s
  set game_id = p_game_id, game_log_import_id = p_game_log_import_id
  where s.id = p_staging_id
    and s.created_by_user_id = p_requesting_user_id
    and s.game_id is null
    and exists (
      select 1 from public.games g
      join public.game_log_imports gli on gli.game_id = g.id
      where g.id = p_game_id and gli.id = p_game_log_import_id
        and g.group_id = s.group_id
        and g.created_by_user_id = p_requesting_user_id
        and gli.created_by_user_id = p_requesting_user_id
    );
  return found;
exception when others then
  return false;
end;
$$;

create or replace function public.discard_import_identity_staging(
  p_staging_id uuid,
  p_requesting_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.import_identity_staging
  where id = p_staging_id and created_by_user_id = p_requesting_user_id;
  return found;
exception when others then
  return false;
end;
$$;

create or replace function public.resolve_staged_import_player_identity(
  p_staging_id uuid,
  p_requesting_user_id uuid,
  p_source_player_ordinal integer,
  p_identity_mode text,
  p_guest_username text default null,
  p_guest_first_name text default null,
  p_guest_last_name text default null,
  p_selected_player_id uuid default null,
  p_create_new boolean default false
)
returns table (
  outcome text,
  player_id uuid,
  public_label text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_source_text text;
  v_candidate_ids uuid[] := '{}'::uuid[];
  v_candidate_id uuid;
  v_candidate_count integer := 0;
  v_source_exact text;
  v_username text;
  v_first_name text;
  v_last_name text;
  v_normalized text;
  v_player_id uuid;
  v_display_name text;
begin
  delete from private.import_identity_staging where expires_at <= now();
  select s.group_id, s.source_player_texts[p_source_player_ordinal]
  into v_group_id, v_source_text
  from private.import_identity_staging s
  where s.id = p_staging_id
    and s.created_by_user_id = p_requesting_user_id
    and s.expires_at > now()
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = s.group_id and gm.user_id = p_requesting_user_id
    );

  if v_group_id is null or nullif(btrim(v_source_text), '') is null then
    return query select 'unavailable'::text, null::uuid, null::text;
    return;
  end if;

  v_source_exact := nullif(btrim(regexp_replace(v_source_text, '[[:space:]]+', ' ', 'g')), '');
  v_username := nullif(btrim(regexp_replace(coalesce(p_guest_username, ''), '[[:space:]]+', ' ', 'g')), '');
  v_first_name := nullif(btrim(regexp_replace(coalesce(p_guest_first_name, ''), '[[:space:]]+', ' ', 'g')), '');
  v_last_name := nullif(btrim(regexp_replace(coalesce(p_guest_last_name, ''), '[[:space:]]+', ' ', 'g')), '');

  if p_identity_mode not in ('existing_player', 'username', 'personal_name') then
    return query select 'invalid_source_match'::text, null::uuid, null::text;
    return;
  elsif p_identity_mode = 'username' then
    v_normalized := private.normalize_guest_username(v_username);
    if v_username is null or v_normalized = ''
       or private.normalize_guest_username(v_source_text) <> v_normalized then
      return query select 'invalid_source_match'::text, null::uuid, null::text;
      return;
    end if;
  elsif p_identity_mode = 'personal_name' then
    v_normalized := private.normalize_private_personal_name(v_first_name, v_last_name);
    if v_first_name is null or v_last_name is null or v_normalized = ''
       or v_source_exact not in (v_first_name, v_last_name, concat_ws(' ', v_first_name, v_last_name)) then
      return query select 'invalid_source_match'::text, null::uuid, null::text;
      return;
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_group_id::text || ':' || p_identity_mode || ':' || coalesce(v_normalized, v_source_exact), 0
    )
  );

  select coalesce(array_agg(p.id order by p.id), '{}'::uuid[])
  into v_candidate_ids
  from public.players p
  where p.group_id = v_group_id
    and private.import_identity_player_matches(
      v_group_id, p.id, v_source_text, p_identity_mode,
      v_username, v_first_name, v_last_name
    );
  v_candidate_count := cardinality(v_candidate_ids);

  if p_selected_player_id is null
     and p_identity_mode = 'personal_name'
     and v_source_exact in (v_first_name, v_last_name)
     and v_source_exact <> concat_ws(' ', v_first_name, v_last_name) then
    return query select 'ambiguous'::text, null::uuid, null::text;
    return;
  end if;

  if p_selected_player_id is not null then
    select p.id into v_candidate_id
    from public.players p
    where p.id = p_selected_player_id
    for update;

    if v_candidate_id is null or not private.import_identity_player_matches(
      v_group_id, v_candidate_id, v_source_text, p_identity_mode,
      v_username, v_first_name, v_last_name
    ) then
      return query select 'unavailable'::text, null::uuid, null::text;
      return;
    end if;
    v_player_id := v_candidate_id;
  elsif v_candidate_count = 1 then
    v_candidate_id := v_candidate_ids[1];
    select p.id into v_player_id
    from public.players p
    where p.id = v_candidate_id
    for update;

    if v_player_id is null or not private.import_identity_player_matches(
      v_group_id, v_player_id, v_source_text, p_identity_mode,
      v_username, v_first_name, v_last_name
    ) then
      return query select 'unavailable'::text, null::uuid, null::text;
      return;
    end if;
  elsif v_candidate_count > 1 then
    return query select 'ambiguous'::text, null::uuid, null::text;
    return;
  elsif not p_create_new or p_identity_mode = 'existing_player' then
    return query select 'unresolved'::text, null::uuid, null::text;
    return;
  else
    if p_identity_mode = 'username' and exists (
      select 1 from public.user_profiles up
      where private.normalize_guest_username(up.username) = v_normalized
    ) then
      return query select 'unavailable'::text, null::uuid, null::text;
      return;
    end if;

    v_player_id := gen_random_uuid();
    v_display_name := private.neutral_unlinked_player_label(v_player_id);
    insert into public.players (id, group_id, linked_user_id, display_name)
    values (v_player_id, v_group_id, null, v_display_name);

    insert into private.player_private_identities (
      player_id, group_id, identity_mode, guest_username, guest_first_name,
      guest_last_name, normalized_guest_username, normalized_personal_name,
      created_by_user_id
    ) values (
      v_player_id, v_group_id, p_identity_mode,
      case when p_identity_mode = 'username' then v_username end,
      case when p_identity_mode = 'personal_name' then v_first_name end,
      case when p_identity_mode = 'personal_name' then v_last_name end,
      case when p_identity_mode = 'username' then v_normalized end,
      case when p_identity_mode = 'personal_name' then v_normalized end,
      p_requesting_user_id
    );

    insert into public.player_import_aliases (
      group_id, player_id, source_type, identity_mode, alias_text, normalized_alias
    ) values (
      v_group_id, v_player_id, 'game_log', p_identity_mode,
      case when p_identity_mode = 'username' then v_username else concat_ws(' ', v_first_name, v_last_name) end,
      v_normalized
    ) on conflict do nothing;
  end if;

  return query select
    'resolved'::text,
    v_player_id,
    coalesce(private.resolve_public_player_name(v_player_id), 'Player');
exception when others then
  return query select 'unavailable'::text, null::uuid, null::text;
end;
$$;

create or replace function private.delete_finalized_import_identity_staging()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'finalized' and old.status is distinct from new.status then
    delete from private.import_identity_staging where game_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists delete_finalized_import_identity_staging on public.games;
create trigger delete_finalized_import_identity_staging
after update of status on public.games
for each row execute function private.delete_finalized_import_identity_staging();

revoke all on function private.delete_finalized_import_identity_staging() from public;
revoke all on function private.delete_finalized_import_identity_staging() from anon;
revoke all on function private.delete_finalized_import_identity_staging() from authenticated;
revoke all on function private.delete_finalized_import_identity_staging() from service_role;

revoke execute on function public.stage_import_player_identity_evidence(uuid, uuid, text[], text, text) from public;
revoke execute on function public.stage_import_player_identity_evidence(uuid, uuid, text[], text, text) from anon;
revoke execute on function public.stage_import_player_identity_evidence(uuid, uuid, text[], text, text) from authenticated;
grant execute on function public.stage_import_player_identity_evidence(uuid, uuid, text[], text, text) to service_role;

revoke execute on function public.attach_import_identity_staging(uuid, uuid, uuid, uuid) from public;
revoke execute on function public.attach_import_identity_staging(uuid, uuid, uuid, uuid) from anon;
revoke execute on function public.attach_import_identity_staging(uuid, uuid, uuid, uuid) from authenticated;
grant execute on function public.attach_import_identity_staging(uuid, uuid, uuid, uuid) to service_role;

revoke execute on function public.discard_import_identity_staging(uuid, uuid) from public;
revoke execute on function public.discard_import_identity_staging(uuid, uuid) from anon;
revoke execute on function public.discard_import_identity_staging(uuid, uuid) from authenticated;
grant execute on function public.discard_import_identity_staging(uuid, uuid) to service_role;

revoke execute on function public.resolve_staged_import_player_identity(uuid, uuid, integer, text, text, text, text, uuid, boolean) from public;
revoke execute on function public.resolve_staged_import_player_identity(uuid, uuid, integer, text, text, text, text, uuid, boolean) from anon;
revoke execute on function public.resolve_staged_import_player_identity(uuid, uuid, integer, text, text, text, text, uuid, boolean) from authenticated;
grant execute on function public.resolve_staged_import_player_identity(uuid, uuid, integer, text, text, text, text, uuid, boolean) to service_role;

comment on table private.import_identity_staging is
  'Short-lived server-parsed import player evidence. Direct access is denied; service-only gateways enforce ownership, bounds, expiry, and source binding.';
comment on function public.resolve_staged_import_player_identity(uuid, uuid, integer, text, text, text, text, uuid, boolean) is
  'Service-only source-bound matcher. Returns one uniform public-safe row and never accepts arbitrary source-name arrays.';
