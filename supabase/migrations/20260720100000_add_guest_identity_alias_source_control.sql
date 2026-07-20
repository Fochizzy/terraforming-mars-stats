-- Phase 4, Step 4.3 remediation (H5): route every first-and-last-name guest
-- creation path through the privacy-safe guest RPC without recording false
-- import evidence.
--
-- `player_import_aliases.source_type` is constrained to
-- ('game_log', 'screenshot_ocr') — alias rows are import evidence. The roster
-- page (/group/players) and Manual Entry's new-player references now create
-- guests through resolve_import_guest_identity, and those creations are NOT
-- import evidence, so this migration adds `p_record_import_alias` (default
-- true) to skip the alias insert for non-import callers. Every existing
-- caller omits the parameter and keeps today's behavior byte-for-byte.
-- Future-import matching for roster-created guests still works through
-- `private.player_private_identities`, which the RPC's candidate search
-- already unions with the alias table.
--
-- GATED: prepared and executable-tested, NOT applied to production. The
-- deployed function this replaces was applied as ledger version
-- 20260719191911 (repo file 20260718212339_remediate_guest_identity_privacy_boundary.sql).
--
-- Repeat-safe: both drops are IF EXISTS and the create is a full definition,
-- so re-running this file converges to the same state.

drop function if exists public.resolve_import_guest_identity(
  uuid, text, text, text, text, uuid, boolean
);
drop function if exists public.resolve_import_guest_identity(
  uuid, text, text, text, text, uuid, boolean, boolean
);

create function public.resolve_import_guest_identity(
  p_group_id uuid,
  p_identity_mode text,
  p_guest_username text default null,
  p_guest_first_name text default null,
  p_guest_last_name text default null,
  p_selected_player_id uuid default null,
  p_create_new boolean default false,
  p_record_import_alias boolean default true
)
returns table (
  player_id uuid,
  public_name text,
  resolution_state text,
  normalized_imported_value text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_first_name text;
  v_last_name text;
  v_normalized_value text;
  v_candidate_count integer := 0;
  v_player_id uuid;
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
  from (
    select ppi.player_id
    from private.player_private_identities ppi
    join public.players p on p.id = ppi.player_id
    where ppi.group_id = p_group_id
      and p.linked_user_id is null
      and (
        (p_identity_mode = 'username' and ppi.normalized_guest_username = v_normalized_value)
        or
        (p_identity_mode = 'personal_name' and ppi.normalized_personal_name = v_normalized_value)
      )
    union
    select pia.player_id
    from public.player_import_aliases pia
    join public.players p on p.id = pia.player_id
    where pia.group_id = p_group_id
      and p.linked_user_id is null
      and pia.normalized_alias = v_normalized_value
      and (pia.identity_mode = p_identity_mode or pia.identity_mode is null)
  ) candidates;

  if p_selected_player_id is null and v_candidate_count = 1 then
    select candidate.player_id
    into p_selected_player_id
    from (
      select ppi.player_id
      from private.player_private_identities ppi
      where ppi.group_id = p_group_id
        and (
          (p_identity_mode = 'username' and ppi.normalized_guest_username = v_normalized_value)
          or
          (p_identity_mode = 'personal_name' and ppi.normalized_personal_name = v_normalized_value)
        )
      union
      select pia.player_id
      from public.player_import_aliases pia
      join public.players p on p.id = pia.player_id
      where pia.group_id = p_group_id
        and p.linked_user_id is null
        and pia.normalized_alias = v_normalized_value
        and (pia.identity_mode = p_identity_mode or pia.identity_mode is null)
    ) candidate
    limit 1;
  end if;

  if p_selected_player_id is not null then
    if not exists (
      select 1
      from public.players p
      where p.id = p_selected_player_id
        and p.group_id = p_group_id
        and p.linked_user_id is null
        and (
          exists (
            select 1
            from private.player_private_identities ppi
            where ppi.player_id = p.id
              and (
                (p_identity_mode = 'username' and ppi.normalized_guest_username = v_normalized_value)
                or
                (p_identity_mode = 'personal_name' and ppi.normalized_personal_name = v_normalized_value)
              )
          )
          or exists (
            select 1
            from public.player_import_aliases pia
            where pia.player_id = p.id
              and pia.group_id = p_group_id
              and pia.normalized_alias = v_normalized_value
              and (pia.identity_mode = p_identity_mode or pia.identity_mode is null)
          )
        )
    ) then
      raise exception 'The selected guest identity is unavailable or no longer matches.' using errcode = 'P0002';
    end if;

    insert into private.player_private_identities (
      player_id, group_id, identity_mode, guest_username, guest_first_name,
      guest_last_name, normalized_guest_username, normalized_personal_name,
      created_by_user_id
    )
    select
      p_selected_player_id, p_group_id, p_identity_mode,
      case when p_identity_mode = 'username' then v_username end,
      case when p_identity_mode = 'personal_name' then v_first_name end,
      case when p_identity_mode = 'personal_name' then v_last_name end,
      case when p_identity_mode = 'username' then v_normalized_value end,
      case when p_identity_mode = 'personal_name' then v_normalized_value end,
      (select auth.uid())
    where not exists (
      select 1 from private.player_private_identities ppi
      where ppi.player_id = p_selected_player_id
    );

    if p_record_import_alias then
      insert into public.player_import_aliases (
        group_id, player_id, source_type, identity_mode, alias_text, normalized_alias
      ) values (
        p_group_id, p_selected_player_id, 'game_log', p_identity_mode,
        case when p_identity_mode = 'username' then v_username else concat_ws(' ', v_first_name, v_last_name) end,
        v_normalized_value
      ) on conflict do nothing;
    end if;

    return query select
      p_selected_player_id,
      coalesce(private.resolve_public_player_name(p_selected_player_id), 'Player'),
      'existing_unlinked_guest'::text,
      v_normalized_value;
    return;
  end if;

  if v_candidate_count > 1 then
    raise exception 'Multiple guest identities match. Select one explicitly.' using errcode = 'P0003';
  end if;
  if not p_create_new then
    raise exception 'Confirm creation of the new guest identity.' using errcode = '22023';
  end if;

  v_player_id := gen_random_uuid();
  v_display_name := private.neutral_unlinked_player_label(v_player_id);

  insert into public.players (id, group_id, linked_user_id, display_name)
  values (v_player_id, p_group_id, null, v_display_name);

  insert into private.player_private_identities (
    player_id, group_id, identity_mode, guest_username, guest_first_name,
    guest_last_name, normalized_guest_username, normalized_personal_name,
    created_by_user_id
  ) values (
    v_player_id, p_group_id, p_identity_mode,
    case when p_identity_mode = 'username' then v_username end,
    case when p_identity_mode = 'personal_name' then v_first_name end,
    case when p_identity_mode = 'personal_name' then v_last_name end,
    case when p_identity_mode = 'username' then v_normalized_value end,
    case when p_identity_mode = 'personal_name' then v_normalized_value end,
    (select auth.uid())
  );

  if p_record_import_alias then
    insert into public.player_import_aliases (
      group_id, player_id, source_type, identity_mode, alias_text, normalized_alias
    ) values (
      p_group_id, v_player_id, 'game_log', p_identity_mode,
      case when p_identity_mode = 'username' then v_username else concat_ws(' ', v_first_name, v_last_name) end,
      v_normalized_value
    ) on conflict do nothing;
  end if;

  return query select
    v_player_id,
    v_display_name,
    'newly_created_unlinked_guest'::text,
    v_normalized_value;
end;
$$;

revoke execute on function public.resolve_import_guest_identity(
  uuid, text, text, text, text, uuid, boolean, boolean
) from public;
revoke execute on function public.resolve_import_guest_identity(
  uuid, text, text, text, text, uuid, boolean, boolean
) from anon;
grant execute on function public.resolve_import_guest_identity(
  uuid, text, text, text, text, uuid, boolean, boolean
) to authenticated;
grant execute on function public.resolve_import_guest_identity(
  uuid, text, text, text, text, uuid, boolean, boolean
) to service_role;
