-- GATED / UNAPPLIED contraction migration.
-- Retires the authenticated free-form matcher after the source-bound path ships.

revoke execute on function public.match_import_player_names(uuid, text[]) from public;
revoke execute on function public.match_import_player_names(uuid, text[]) from anon;
revoke execute on function public.match_import_player_names(uuid, text[]) from authenticated;

comment on function public.match_import_player_names(uuid, text[]) is
  'Legacy service-only compatibility matcher. Client execution is retired by the gated source-bound import identity rollout.';
