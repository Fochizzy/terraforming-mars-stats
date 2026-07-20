-- Close the private-name confirmation oracle in match_import_player_names.
--
-- The deployed function returns a fine-grained `match_reason`
-- ('display_name_exact', 'full_name_exact', 'alias_exact',
-- 'display_name_partial', 'full_name_partial', 'username_partial',
-- 'username_exact') together with a `match_score` that maps 1:1 onto it.
--
-- Because the function is SECURITY DEFINER, any caller who may import into a
-- group can submit candidate strings and read back which private field
-- matched. That confirms `players.full_name` and stored alias texts field by
-- field, defeating the Data API revokes that made those columns unreadable
-- (20260719192054 / 20260719203944). The reason and the score are two views of
-- the same signal, so both must be coarsened; coarsening only the reason would
-- leave the oracle fully intact behind the score.
--
-- Internal ranking is deliberately unchanged. The fine-grained precedence still
-- decides WHICH player is returned, so no caller sees a different match than
-- before. Only the disclosed classification is coarsened, to 'exact' or
-- 'partial'. Unmatched names continue to return no row, which is how the UI
-- already derives its "none" state.
--
-- Candidate input is now bounded, because the oracle was also batch-queryable
-- and the names x candidates cross join is unbounded work.
--
-- Preserved from the deployed definition: SECURITY DEFINER with
-- `search_path = ''` and fully schema-qualified references, the
-- `public.is_group_member(p_group_id)` authorization gate, public-name
-- resolution through `private.resolve_public_player_name`, and the
-- cross-group candidate pool that mirrors the import resolution dropdown.

create or replace function public.match_import_player_names(
  p_group_id uuid,
  p_imported_names text[]
)
returns table(
  imported_name text,
  player_id uuid,
  public_name text,
  is_linked boolean,
  -- Coarse classification only: 'exact' | 'partial'. Never the matched field.
  match_reason text,
  -- Coarse rank only: 2 = exact, 1 = partial. Never the fine-grained score.
  match_score integer
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_max_names        constant integer := 64;
  v_max_name_length  constant integer := 128;
  v_submitted        integer;
  v_longest          integer;
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'The selected group is not available for import.'
      using errcode = '42501';
  end if;

  select
    coalesce(pg_catalog.array_length(p_imported_names, 1), 0),
    coalesce(pg_catalog.max(pg_catalog.length(n.name)), 0)
  into v_submitted, v_longest
  from pg_catalog.unnest(coalesce(p_imported_names, array[]::text[])) as n(name);

  if v_submitted > v_max_names then
    raise exception 'Too many names submitted (% of at most %).',
      v_submitted, v_max_names
      using errcode = '22023';
  end if;

  if v_longest > v_max_name_length then
    raise exception 'A submitted name exceeds % characters.', v_max_name_length
      using errcode = '22023';
  end if;

  return query
  with names as (
    select distinct
      pg_catalog.btrim(n.name) as imported_name,
      public.normalize_claim_player_name(n.name) as norm,
      pg_catalog.regexp_replace(
        pg_catalog.lower(coalesce(n.name, '')), '[^a-z0-9]+', '', 'g'
      ) as compact
    from pg_catalog.unnest(coalesce(p_imported_names, array[]::text[])) as n(name)
    where pg_catalog.btrim(coalesce(n.name, '')) <> ''
  ),
  candidates as (
    select
      p.id,
      p.linked_user_id is not null as is_linked,
      public.normalize_claim_player_name(p.display_name) as norm_display,
      public.normalize_claim_player_name(p.full_name) as norm_full,
      public.normalize_claim_player_name(up.username) as norm_username,
      pg_catalog.regexp_replace(
        pg_catalog.lower(coalesce(up.username, '')), '[^a-z0-9]+', '', 'g'
      ) as compact_username,
      (
        select pg_catalog.count(*)
        from public.game_players gp
        where gp.player_id = p.id
      ) as games_played
    from public.players p
    left join public.user_profiles up on up.user_id = p.linked_user_id
    -- Match across every group the caller plays in, mirroring the candidate
    -- pool, so a player known from another group is still recognised.
    where p.group_id in (
      select gm.group_id
      from public.group_members gm
      where gm.user_id = (select auth.uid())
    )
  ),
  scored as (
    select
      n.imported_name,
      c.id,
      c.is_linked,
      c.games_played,
      -- Fine-grained rank is retained internally so the SAME player is chosen
      -- as before. It is never emitted.
      s.internal_rank,
      case when s.internal_rank >= 250 then 'exact' else 'partial' end
        as coarse_reason,
      case when s.internal_rank >= 250 then 2 else 1 end
        as coarse_score
    from names n
    cross join candidates c
    cross join lateral (
      select v.internal_rank
      from (values
        (400, c.norm_display <> '' and c.norm_display = n.norm),
        (350, c.norm_full <> '' and c.norm_full = n.norm),
        (300, c.norm_username <> ''
              and (c.norm_username = n.norm or c.compact_username = n.compact)),
        (250, exists (
          select 1
          from public.player_import_aliases a
          where a.player_id = c.id
            and a.group_id = p_group_id
            and a.normalized_alias = n.norm
        )),
        (200, pg_catalog.length(n.norm) >= 3 and c.norm_display <> ''
              and (c.norm_display like n.norm || ' %'
                or n.norm like c.norm_display || ' %')),
        (175, pg_catalog.length(n.norm) >= 3 and c.norm_full <> ''
              and (c.norm_full like n.norm || ' %'
                or n.norm like c.norm_full || ' %')),
        (150, pg_catalog.length(n.norm) >= 3 and c.norm_username <> ''
              and (c.norm_username like n.norm || ' %'
                or n.norm like c.norm_username || ' %'))
      ) as v(internal_rank, matched)
      where v.matched
    ) as s
  )
  select distinct on (sc.imported_name)
    sc.imported_name,
    sc.id,
    private.resolve_public_player_name(sc.id),
    sc.is_linked,
    sc.coarse_reason,
    sc.coarse_score
  from scored sc
  order by sc.imported_name, sc.internal_rank desc, sc.games_played desc, sc.id;
end;
$function$;

comment on function public.match_import_player_names(uuid, text[]) is
  'Resolves imported player names to public identities for import review. '
  'Discloses only a coarse match classification (exact/partial) and never '
  'which private field matched, so it cannot be used to confirm private '
  'personal names or stored alias texts. Candidate input is bounded.';
