-- B-05: restore/tighten authenticated EXECUTE on the saved-player claim RPC
-- family.
--
-- list_claimable_player_profiles() and claim_player_profile(uuid) have never
-- been granted EXECUTE to `authenticated` since their creation
-- (20260706190000 / 20260708210555). Every other RPC in this codebase gets an
-- explicit `revoke ... from public; grant ... to authenticated` pair at
-- creation (see get_player_usernames, get_elo_leaderboard), but that pair was
-- omitted for these two across every migration that ever touched them
-- (20260706190000, 20260708210555, 20260710205230, 20260712115539,
-- 20260714160000 -- the last of which grants authenticated to
-- get_player_usernames/get_elo_leaderboard in the same file while recreating
-- these two with no grant at all). This is an omission present since
-- creation, not a later revoke: production currently shows EXECUTE granted
-- only to postgres/service_role, which is exactly what `CREATE FUNCTION`
-- with no grant statement produces on this project's default privileges.
--
-- Both functions already gate access with `auth.uid() is null` and validate
-- claim candidacy internally (see claim_player_profile's
-- `list_claimable_player_profiles()` membership check), so the missing grant
-- is not a security boundary anything relies on -- it only makes the RPC
-- unreachable for every real signed-in caller via the Data API. Confirmed via
-- production logs: repeated "permission denied for function
-- list_claimable_player_profiles" through 2026-07-20, from the saved-player
-- auto-claim flow (resolveSavedPlayerAutoClaim), the manual claim page
-- (/claim-player), and the group roster "probably you" highlight.
--
-- claim_player_profiles_by_name() took the opposite path: it already grants
-- EXECUTE to authenticated (correctly -- the app does call it as
-- authenticated from claimAllExactPlayerProfiles), but it also grants EXECUTE
-- to PUBLIC and to anon, which Supabase's own security advisor flags
-- (anon_security_definer_function_executable /
-- authenticated_security_definer_function_executable). The function's
-- internal `auth.uid() is null` check already blocks anonymous callers, but
-- no caller in this codebase needs anon access, so it is tightened here as
-- defense in depth alongside the two missing grants above.

revoke all on function public.list_claimable_player_profiles() from public;
grant execute on function public.list_claimable_player_profiles() to authenticated;

revoke all on function public.claim_player_profile(uuid) from public;
grant execute on function public.claim_player_profile(uuid) to authenticated;

revoke all on function public.claim_player_profiles_by_name() from public;
revoke execute on function public.claim_player_profiles_by_name() from anon;
grant execute on function public.claim_player_profiles_by_name() to authenticated;
