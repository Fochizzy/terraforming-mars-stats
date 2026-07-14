-- The "block uploading the same game twice" guard filtered game_log_imports by
-- the full raw log text with PostgREST `.eq('raw_log_text', ...)`, which places
-- the entire (multi-KB) exported log in the request URL. A large export pushes
-- the URL past the Supabase/Cloudflare edge length limit, so the gateway returns
-- a bare 400 "Bad Request" before PostgREST runs -- surfacing as an unexplained
-- "Bad Request" when confirming an import draft. Match through an RPC instead so
-- the log travels in the POST body rather than the URL.
create or replace function public.find_duplicate_game_log_import(
  p_group_id uuid,
  p_raw_log_text text
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.game_log_imports gli
    join public.games g on g.id = gli.game_id
    where gli.raw_log_text = p_raw_log_text
      and g.group_id = p_group_id
  );
$$;

grant execute on function public.find_duplicate_game_log_import(uuid, text) to authenticated;;
