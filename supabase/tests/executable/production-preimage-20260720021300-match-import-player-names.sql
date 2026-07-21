-- Modelled pre-image of production ledger entry 20260720021300
-- (`add_import_player_name_matching_rpc`), which created the SECURITY DEFINER
-- RPC public.match_import_player_names and has NO migration file on this
-- branch (see src/lib/db/migration-ledger-map.ts →
-- PRODUCTION_ONLY_ENTRY_PROVENANCE).
--
-- WHY THIS FILE EXISTS
-- The gated contraction 20260720120000 is a `create or replace` of that
-- function. Without a predecessor the harness CREATED it instead of REPLACING
-- it, so the contraction was never actually exercised as a contraction. This
-- file installs the deployed predecessor first, so that:
--   * the gated migration is a true REPLACE (a signature or return-shape
--     mismatch fails loudly instead of silently defining a new function);
--   * the disclosed classification can be asserted BEFORE and AFTER; and
--   * ACL preservation across `create or replace` is observable.
--
-- WHAT IT IS, EXACTLY
-- This is a MODEL, reconstructed from repository-local evidence only. No
-- production system was read to produce it. Its evidence is the deployed
-- definition documented in the header of
-- supabase/migrations/20260720120000_coarsen_import_name_match_reasons.sql
-- and in docs/agent-handoffs/PHASE-04-STEP-03-THIRD-REMEDIATION-PARTIAL-HANDOFF.md:
--   * fine-grained match_reason values 'display_name_exact', 'full_name_exact',
--     'username_exact', 'alias_exact', 'display_name_partial',
--     'full_name_partial', 'username_partial';
--   * a match_score of 400/350/300/250/200/175/150 mapping 1:1 onto them;
--   * internal ranking retained unchanged by the contraction, so the rank
--     values in the gated migration ARE the deployed scores;
--   * SECURITY DEFINER with search_path = '' and schema-qualified references,
--     the public.is_group_member gate, public-name resolution through
--     private.resolve_public_player_name, and the cross-group candidate pool,
--     all listed as "preserved from the deployed definition";
--   * no candidate-input bound, which the contraction adds ("Candidate input
--     is now bounded").
--
-- LIMITATION
-- Fidelity is asserted only for the surface the contraction changes: the
-- signature, the return shape, the ACL, the disclosed classification, and the
-- absence of an input bound. This file is NOT a byte-faithful copy of the
-- deployed function and must never be treated as one, promoted into
-- supabase/migrations/, or used as evidence about production. It is confined
-- to the disposable executable harness.

create or replace function public.match_import_player_names(
  p_group_id uuid,
  p_imported_names text[]
)
returns table(
  imported_name text,
  player_id uuid,
  public_name text,
  is_linked boolean,
  -- Fine-grained: names the private field that matched. This IS the oracle
  -- that 20260720120000 closes.
  match_reason text,
  -- Maps 1:1 onto match_reason, so it is a parallel oracle.
  match_score integer
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'The selected group is not available for import.'
      using errcode = '42501';
  end if;

  -- Deliberately unbounded: the deployed predecessor accepted any candidate
  -- array. The contraction adds the bound.
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
      s.rank,
      s.reason
    from names n
    cross join candidates c
    cross join lateral (
      select v.rank, v.reason
      from (values
        (400, 'display_name_exact',
              c.norm_display <> '' and c.norm_display = n.norm),
        (350, 'full_name_exact',
              c.norm_full <> '' and c.norm_full = n.norm),
        (300, 'username_exact',
              c.norm_username <> ''
              and (c.norm_username = n.norm or c.compact_username = n.compact)),
        (250, 'alias_exact', exists (
          select 1
          from public.player_import_aliases a
          where a.player_id = c.id
            and a.group_id = p_group_id
            and a.normalized_alias = n.norm
        )),
        (200, 'display_name_partial',
              pg_catalog.length(n.norm) >= 3 and c.norm_display <> ''
              and (c.norm_display like n.norm || ' %'
                or n.norm like c.norm_display || ' %')),
        (175, 'full_name_partial',
              pg_catalog.length(n.norm) >= 3 and c.norm_full <> ''
              and (c.norm_full like n.norm || ' %'
                or n.norm like c.norm_full || ' %')),
        (150, 'username_partial',
              pg_catalog.length(n.norm) >= 3 and c.norm_username <> ''
              and (c.norm_username like n.norm || ' %'
                or n.norm like c.norm_username || ' %'))
      ) as v(rank, reason, matched)
      where v.matched
    ) as s
  )
  select distinct on (sc.imported_name)
    sc.imported_name,
    sc.id,
    private.resolve_public_player_name(sc.id),
    sc.is_linked,
    sc.reason,
    sc.rank
  from scored sc
  order by sc.imported_name, sc.rank desc, sc.games_played desc, sc.id;
end;
$function$;

comment on function public.match_import_player_names(uuid, text[]) is
  'Modelled pre-image of production ledger entry 20260720021300 for the '
  'executable harness only. Discloses the fine-grained matched field.';

-- Deployed-style ACL for a SECURITY DEFINER import RPC. The gated
-- contraction re-defines the body with `create or replace` and grants
-- nothing, so a post-contraction call as `authenticated` proves the ACL
-- survived the replacement.
revoke execute on function public.match_import_player_names(uuid, text[]) from public;
revoke execute on function public.match_import_player_names(uuid, text[]) from anon;
grant execute on function public.match_import_player_names(uuid, text[]) to authenticated;
grant execute on function public.match_import_player_names(uuid, text[]) to service_role;
