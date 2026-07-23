-- GATED / UNAPPLIED expansion migration. NOT applied to production.
--
-- EXPAND half of the 2026-07-22 owner amendment "interim service-role re-gate of
-- the import matcher" (docs/redesign/DECISIONS.md). Additive only: it creates ONE
-- new overload and leaves the deployed two-argument
-- public.match_import_player_names(uuid, text[]) completely untouched — body,
-- comment, and ACL alike. The two-argument function is the rollback target and
-- must keep serving the currently deployed Worker until the moved reader is
-- deployed and verified. Revoking `authenticated` EXECUTE from it is the
-- separate, separately-authorized contraction 20260722012707, which is still
-- gated and which this file does not perform, imply, or authorize.
--
-- WHAT THIS ADDS
--
-- public.match_import_player_names(p_group_id, p_requesting_user_id,
-- p_imported_names) — the same matcher, authorized from an explicit
-- server-verified requesting-user id instead of auth.uid(), granted to
-- service_role only, so the application's admin client can call it once the
-- contraction closes the `authenticated` route.
--
-- ---------------------------------------------------------------------------
-- 1. THE NEW PARAMETER CARRIES NO DEFAULT, AND ITS POSITION ENFORCES THAT
-- ---------------------------------------------------------------------------
--
-- `p_requesting_user_id uuid` — never `... default null`. A default makes EVERY
-- existing two-argument call ambiguous (42725) the moment this migration
-- applies, while the deployed Worker is still making exactly those calls. That
-- would turn the expand step into a live outage, which is precisely what the
-- amendment's mandatory ordering exists to prevent.
--
-- Measured on a disposable PostgreSQL 18 cluster, both directions:
--
--   no default   positional 2-arg call -> the 2-arg function;
--                NAMED 2-arg call (the PostgREST shape) -> the 2-arg function;
--                NAMED 3-arg call -> this function. No ambiguity.
--   default null positional 2-arg call -> ERROR: function ... is not unique (42725);
--                NAMED 2-arg call      -> ERROR: function ... is not unique (42725).
--
-- The guest-identity hazard recorded in DECISIONS.md ("an appended parameter is
-- forced to carry a default") does NOT apply here, and the reason is a property
-- of the BASE signature: (p_group_id uuid, p_imported_names text[]) has no
-- default on either parameter, so an added parameter is not forced to default.
--
-- POSITION TWO IS LOAD-BEARING, not merely a consistency choice. It matches the
-- four applied source-bound gateways of 20260722012658, which each declare
-- `p_requesting_user_id uuid` with no default immediately after their scope
-- argument. It also makes the defaulted form IMPOSSIBLE rather than merely
-- forbidden: a defaulted parameter may not be followed by a non-defaulted one,
-- so `p_requesting_user_id uuid default null` in this position fails at CREATE
-- time with 42P13 ("input parameters after one with a default value must also
-- have defaults") instead of applying and breaking live calls. Measured on the
-- same cluster. Do not move this parameter to the end, and do not give it a
-- default; the first change silently removes that protection and the second is
-- then accepted.
--
-- Both TypeScript call paths pass parameters by name, so position is not a
-- caller constraint.
--
-- ---------------------------------------------------------------------------
-- 2. BOTH IDENTITY PREDICATES ARE CONVERTED — THE GATE AND THE CANDIDATE POOL
-- ---------------------------------------------------------------------------
--
-- The deployed body derives the caller's identity TWICE, through two different
-- mechanisms, and they must move together:
--
--   THE GATE, at the top of the body:
--     if not public.is_group_member(p_group_id) then ...
--   `public.is_group_member` is itself SECURITY DEFINER and reads auth.uid()
--   internally (20260703121500_create_core_rls.sql), so the dependency is
--   INVISIBLE at the call site, which reads like a pure function of p_group_id.
--
--   THE CANDIDATE POOL, inside the `candidates` CTE:
--     where p.group_id in (
--       select gm.group_id from public.group_members gm
--       where gm.user_id = (select auth.uid())
--     )
--
-- Under service_role auth.uid() is NULL, so converting only ONE of them is
-- broken in two different ways:
--   * pool converted, gate left      -> 42501 on every call. Loud.
--   * gate converted, pool left      -> authorizes correctly, then matches an
--                                       EMPTY pool: zero rows, NO error. Silent,
--                                       and indistinguishable from "nobody
--                                       matched". This is the dangerous one.
-- Both are converted below and each is marked. There are exactly two: the rest
-- of the body reads no caller identity — `private.resolve_public_player_name`
-- and `public.normalize_claim_player_name` are pure functions of their
-- arguments, and `a.group_id = p_group_id` in the alias branch is a scope
-- derived from an argument, not from the caller.
--
-- ---------------------------------------------------------------------------
-- 3. A NULL REQUESTING USER IS REJECTED EXPLICITLY, IN SQL
-- ---------------------------------------------------------------------------
--
-- Without the explicit check below, a null id yields an empty candidate pool and
-- therefore zero rows with no error — measured. Composed with a caller that
-- degrades to null on a failed session read, that produces: every imported
-- player shown unmatched, an audit line recording a successful match of zero,
-- and nothing in the error path. The SQL check is the load-bearing half of the
-- mitigation because it holds even if a future caller is written carelessly;
-- the caller's fail-closed resolver is the other half.
--
-- ---------------------------------------------------------------------------
-- 4. THE SECURITY COST, STATED PLAINLY
-- ---------------------------------------------------------------------------
--
-- The database now trusts the application to pass a truthful requesting-user id.
-- With auth.uid() an authorization bypass was structurally impossible; here a
-- server-side defect that passes an attacker-influenced id is a full bypass.
-- That is why this function is granted to service_role ONLY and why the caller
-- resolves the id from the server session and never accepts it as an argument.
-- This is the same accepted trust model as the four applied gateways of
-- 20260722012658 and public.create_or_reuse_guest_identity (20260722160000), but
-- newly load-bearing on a MATCHING function, which the amendment records.
--
-- WHAT THIS DOES NOT DO. It does not close the import enumeration oracle. The
-- candidate names still arrive from the browser through the analyze server
-- action, so the probe survives, unrate-limited. The contraction it unblocks
-- RE-GATES the two-argument matcher to service_role; it does not close it and
-- does not remove free-form matching, which continues under service_role on the
-- manual-entry paths that have no designed replacement. Source-bound matching
-- remains the durable contract.
--
-- ---------------------------------------------------------------------------
-- 5. THE BODY IS DUPLICATED, DELIBERATELY, AND THE DUPLICATION IS GUARDED
-- ---------------------------------------------------------------------------
--
-- Everything below except the two identity predicates and the null guard is
-- transcribed from the two-argument body as coarsened by 20260720120000
-- (applied to production as ledger 20260722144034): the bounds, the internal
-- fine-grained ranking, the coarse exact/partial disclosure, the cross-group
-- pool, and the deterministic ordering.
--
-- Factoring the shared body into a private helper would avoid drift, but it
-- requires `create or replace`-ing the LIVE two-argument function during the
-- expand step — exactly what the amendment's ordering forbids. Duplication
-- confines this migration's blast radius to a brand-new object, at the cost of a
-- duplicated body for the length of the deploy window, after which the
-- two-argument function is dead code.
--
-- The drift that duplication risks is guarded EXECUTABLY, not by convention:
-- supabase/tests/executable/matcher-service-role-overload.sql asserts that the
-- two functions select the SAME (imported_name, player_id, is_linked) for the
-- same inputs when their identity sources agree. Fold this into a shared helper
-- when the two-argument function is retired.
--
-- Repeat-safe: `create or replace` plus unconditional revokes/grants, so
-- re-running converges to the same state.

create or replace function public.match_import_player_names(
  p_group_id uuid,
  p_requesting_user_id uuid,
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
  -- NULL GUARD (see header §3). This must come first and must RAISE. Falling
  -- through to the membership test would also fail closed — `gm.user_id = null`
  -- is NULL, so the gate below rejects a null id on its own — but it would do so
  -- with the 42501 the application reads as "not a member of that group", and it
  -- would leave the candidate pool's own null behaviour (zero rows, no error)
  -- one careless edit away. A missing requesting user is a caller defect, not an
  -- authorization outcome, so it gets its own SQLSTATE.
  if p_requesting_user_id is null then
    raise exception 'A requesting user is required.'
      using errcode = '22023';
  end if;

  -- IDENTITY PREDICATE 1 of 2 — THE GATE (see header §2).
  -- public.is_group_member(p_group_id) is deliberately NOT used: it reads
  -- auth.uid(), which is NULL under service_role, so it would reject every call
  -- this overload exists to serve. Same message and SQLSTATE as the
  -- two-argument function, so the caller's error surface is unchanged.
  if not exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_requesting_user_id
  ) then
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
    -- IDENTITY PREDICATE 2 of 2 — THE CANDIDATE POOL (see header §2).
    -- CHANGED from `(select auth.uid())` to the explicit requesting user. Same
    -- predicate shape and the same cross-group pool, so a player known from
    -- another group is still recognised; only the identity source moves. This
    -- predicate and the gate above MUST derive from the same argument — that
    -- agreement is what the executable equivalence assertion measures.
    where p.group_id in (
      select gm.group_id
      from public.group_members gm
      where gm.user_id = p_requesting_user_id
    )
  ),
  scored as (
    select
      n.imported_name,
      c.id,
      c.is_linked,
      c.games_played,
      -- Fine-grained rank is retained internally so the SAME player is chosen
      -- as by the two-argument function. It is never emitted.
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

-- GRANTS: service_role ONLY, on the NEW signature only. The `public` revoke is
-- load-bearing because CREATE FUNCTION grants EXECUTE to PUBLIC by default; the
-- `anon` and `authenticated` revokes are defensive. Nothing here names
-- (uuid, text[]) — the two-argument function's ACL is not touched.
revoke execute on function public.match_import_player_names(uuid, uuid, text[]) from public;
revoke execute on function public.match_import_player_names(uuid, uuid, text[]) from anon;
revoke execute on function public.match_import_player_names(uuid, uuid, text[]) from authenticated;
grant execute on function public.match_import_player_names(uuid, uuid, text[]) to service_role;

comment on function public.match_import_player_names(uuid, uuid, text[]) is
  'Service-role-only import name matcher. The authorization gate AND the candidate '
  'pool both derive from the explicit server-verified p_requesting_user_id, because '
  'auth.uid() is NULL under service_role; a null id is rejected outright rather than '
  'degrading to an empty pool. Discloses only a coarse exact/partial classification. '
  'Interim re-gate per the 2026-07-22 amendment: it does NOT close the import '
  'enumeration oracle, and source-bound matching remains the durable contract.';
