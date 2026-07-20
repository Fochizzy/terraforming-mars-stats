-- Faithful schema-only reconstruction of the remote-only production ledger
-- migration 20260711232834 (add_find_duplicate_game_log_import), captured
-- read-only from the deployed function definition and ACL on 2026-07-19.
-- Production skips this file by version (the ledger already records it);
-- clean-baseline replays gain the function the import action now calls.
-- Precedent: 20260712114538_add_player_username_full_name.sql.
--
-- Deployed ACL: PUBLIC execute (function default) plus explicit
-- anon/authenticated/service_role — reproduced exactly; tightening it would
-- be a schema change this reconstruction is not authorized to make.

create or replace function public.find_duplicate_game_log_import(
  p_group_id uuid,
  p_raw_log_text text
)
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.game_log_imports gli
    join public.games g on g.id = gli.game_id
    where gli.raw_log_text = p_raw_log_text
      and g.group_id = p_group_id
  );
$$;

grant execute on function public.find_duplicate_game_log_import(uuid, text) to anon;
grant execute on function public.find_duplicate_game_log_import(uuid, text) to authenticated;
grant execute on function public.find_duplicate_game_log_import(uuid, text) to service_role;
