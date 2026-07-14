alter table public.players
  add column if not exists username text,
  add column if not exists full_name text;;
