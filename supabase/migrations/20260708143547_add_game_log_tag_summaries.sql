create table public.game_log_tag_summaries (
  id uuid primary key default gen_random_uuid(),
  game_log_import_id uuid not null references public.game_log_imports(id) on delete cascade,
  player_name text not null,
  normalized_player_name text not null,
  tag_code text not null,
  tag_count integer not null default 0,
  played_card_count integer not null default 0,
  matched_card_count integer not null default 0,
  unresolved_card_count integer not null default 0,
  total_tag_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_log_import_id, normalized_player_name, tag_code),
  check (
    tag_code in (
      'building',
      'space',
      'power',
      'science',
      'jovian',
      'earth',
      'plant',
      'microbe',
      'animal',
      'city',
      'event'
    )
  ),
  check (tag_count >= 0),
  check (played_card_count >= 0),
  check (matched_card_count >= 0),
  check (unresolved_card_count >= 0),
  check (total_tag_count >= 0)
);

create index game_log_tag_summaries_import_player_idx
on public.game_log_tag_summaries (
  game_log_import_id,
  normalized_player_name
);

alter table public.game_log_tag_summaries enable row level security;

create policy "members read game log tag summaries"
on public.game_log_tag_summaries for select
using (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_tag_summaries.game_log_import_id
      and public.can_read_game(gli.game_id)
  )
);

create policy "editors manage game log tag summaries"
on public.game_log_tag_summaries for all
using (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_tag_summaries.game_log_import_id
      and public.can_edit_game(gli.game_id)
  )
)
with check (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_tag_summaries.game_log_import_id
      and public.can_edit_game(gli.game_id)
  )
);;
