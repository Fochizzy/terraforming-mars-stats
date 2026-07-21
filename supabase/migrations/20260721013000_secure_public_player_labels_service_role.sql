-- Secure public player-label resolution for the service-role import path.
--
-- Incident 2026-07-21 (01:12:38Z / 01:14:59Z): Confirm Import Draft failed
-- with `permission denied for schema private` (SQLSTATE 42501).
-- `resolveOrCreateImportGroup` resolves roster labels through
-- `public.get_public_player_names` using the service-role client, but the
-- function was SECURITY INVOKER and its body references
-- `private.resolve_public_player_name`; `service_role` holds neither USAGE on
-- schema `private` nor EXECUTE on that resolver, so name resolution failed at
-- the schema check. `authenticated` holds both grants, which is why every
-- interactive read of the same RPC kept working.
--
-- Fix: convert the RPC to a hardened SECURITY DEFINER function. Schema
-- `private` stays closed to `service_role` and `anon`; only this function's
-- definer context (postgres) reaches the resolver, so no role gains any
-- direct private-schema access.
--
-- Public-data contract (unchanged): each returned row exposes only
--   player_id   - a uuid the caller already supplied
--   public_name - linked player: canonical username; unlinked: neutral guest label
--   is_linked   - whether a linked account exists
-- Never full name, roster display_name, email, or import aliases. The private
-- resolver is the single source of that label and cannot be bypassed or
-- widened through this function's output columns.
--
-- Caller-visibility contract:
--   service_role  - any requested player. It already reads public.players and
--                   public.user_profiles directly, so this widens nothing.
--   authenticated - exactly the players its RLS could already see. SECURITY
--                   DEFINER bypasses row policies, so the two SELECT policies
--                   on public.players ("linked users read claimed and shared
--                   players" and "members can read players") are mirrored
--                   verbatim below via public.can_read_player /
--                   public.is_group_member. If those policies ever change,
--                   change this predicate in the same migration.
--   anon / public - no EXECUTE.

create or replace function public.get_public_player_names(p_player_ids uuid[])
returns table(player_id uuid, public_name text, is_linked boolean)
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  -- Bound the input: the app batches roster/group lookups far below this, so
  -- anything larger is a bug or abuse, not a legitimate request.
  if coalesce(array_length(p_player_ids, 1), 0) > 2000 then
    raise exception 'get_public_player_names: too many player ids (max 2000)';
  end if;

  return query
  select
    p.id,
    coalesce(private.resolve_public_player_name(p.id), 'Player'),
    p.linked_user_id is not null
  from public.players p
  where p.id = any(coalesce(p_player_ids, '{}'::uuid[]))
    and (
      auth.role() = 'service_role'
      or public.can_read_player(p.id)
      or public.is_group_member(p.group_id)
    )
  order by p.created_at, p.id;
end;
$$;

alter function public.get_public_player_names(uuid[]) owner to postgres;

revoke all on function public.get_public_player_names(uuid[]) from public;
revoke all on function public.get_public_player_names(uuid[]) from anon;
grant execute on function public.get_public_player_names(uuid[]) to authenticated;
grant execute on function public.get_public_player_names(uuid[]) to service_role;

comment on function public.get_public_player_names(uuid[]) is
  'Batch player_id -> public label (username or neutral guest label) + is_linked. '
  'SECURITY DEFINER so the service-role import path can resolve labels without '
  'any grant on schema private; authenticated callers are limited to players '
  'their RLS could already see via the mirrored policy predicate.';
