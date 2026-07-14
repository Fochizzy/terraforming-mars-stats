create table public.game_log_imports (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id),
  raw_log_text text not null default '',
  detected_source text not null default 'manual_web_import',
  parser_version text not null default 'manual-web-import-v1',
  parse_status text not null default 'saved_as_draft',
  confidence_summary jsonb not null default '{}'::jsonb,
  line_count integer not null default 0,
  unparsed_line_count integer not null default 0,
  screenshot_object_path text,
  screenshot_original_name text,
  screenshot_mime_type text,
  screenshot_size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index game_log_imports_game_id_created_at_idx
on public.game_log_imports (game_id, created_at desc);

alter table public.game_log_imports enable row level security;

create policy "members read game log imports"
on public.game_log_imports for select
using (public.can_read_game(game_id));

create policy "editors manage game log imports"
on public.game_log_imports for all
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

insert into storage.buckets (id, name, public)
values ('tm-import-evidence', 'tm-import-evidence', false)
on conflict (id) do nothing;

create policy "members read import evidence objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'tm-import-evidence'
  and exists (
    select 1
    from public.games g
    where g.id::text = (storage.foldername(name))[1]
      and public.is_group_member(g.group_id)
  )
);

create policy "editors upload import evidence objects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'tm-import-evidence'
  and exists (
    select 1
    from public.games g
    where g.id::text = (storage.foldername(name))[1]
      and public.can_edit_group(g.group_id)
  )
);

create policy "editors delete import evidence objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'tm-import-evidence'
  and exists (
    select 1
    from public.games g
    where g.id::text = (storage.foldername(name))[1]
      and public.can_edit_group(g.group_id)
  )
);
