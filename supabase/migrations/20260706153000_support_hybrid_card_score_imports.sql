alter table public.game_result_screenshot_imports
drop constraint if exists game_result_screenshot_imports_import_id_unique;

alter table public.game_result_screenshot_imports
add column if not exists evidence_kind text not null default 'endgame_score',
add column if not exists display_order integer not null default 0;

alter table public.game_result_screenshot_imports
drop constraint if exists game_result_screenshot_imports_evidence_kind_check;

alter table public.game_result_screenshot_imports
add constraint game_result_screenshot_imports_evidence_kind_check
check (evidence_kind in ('endgame_score', 'board_state'));

create unique index if not exists game_result_screenshot_imports_import_kind_order_idx
on public.game_result_screenshot_imports (
  game_log_import_id,
  evidence_kind,
  display_order
);

create table if not exists public.card_scoring_rule_cache (
  card_id uuid primary key references public.cards(id) on delete cascade,
  source_type text not null check (source_type in ('curated', 'ocr')),
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1),
  human_summary text not null,
  rule_payload jsonb not null default '{}'::jsonb,
  ocr_engine_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.card_scoring_rule_cache enable row level security;

create policy "authenticated users read card scoring rule cache"
on public.card_scoring_rule_cache for select
to authenticated
using (true);

create policy "authenticated users manage card scoring rule cache"
on public.card_scoring_rule_cache for all
to authenticated
using (true)
with check (true);
