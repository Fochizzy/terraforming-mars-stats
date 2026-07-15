create table if not exists public.domain_text_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('award','card','corporation','milestone','player','resource')),
  entity_id uuid not null,
  alias_text text not null,
  normalized_alias_text text not null,
  source text not null check (source in ('catalog','confirmed_ocr','manual')),
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  confirmed_by_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, normalized_alias_text)
);

create table if not exists public.game_log_ocr_attempts (
  id uuid primary key default gen_random_uuid(),
  game_log_import_id uuid not null references public.game_log_imports(id) on delete cascade,
  engine text not null,
  engine_version text,
  preprocessing_variant text not null default 'original',
  raw_ocr_text text not null,
  corrected_ocr_text text not null,
  average_confidence numeric check (average_confidence is null or average_confidence between 0 and 1),
  correction_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(correction_summary) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.game_log_ocr_corrections (
  id uuid primary key default gen_random_uuid(),
  ocr_attempt_id uuid not null references public.game_log_ocr_attempts(id) on delete cascade,
  line_index integer not null check (line_index >= 0),
  entity_type text not null check (entity_type in ('award','card','corporation','milestone','player','resource')),
  original_text text not null,
  canonical_entity_id uuid,
  canonical_text text,
  method text not null check (method in ('exact','alias','fuzzy','manual','none')),
  decision text not null check (decision in ('auto_accept','needs_review','unresolved','confirmed','rejected')),
  match_score numeric not null default 0 check (match_score between 0 and 1),
  score_margin numeric not null default 0 check (score_margin between 0 and 1),
  suggestions jsonb not null default '[]'::jsonb check (jsonb_typeof(suggestions) = 'array'),
  confirmed_by_user_id uuid references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (ocr_attempt_id, line_index, entity_type)
);

create index if not exists game_log_ocr_attempts_import_idx on public.game_log_ocr_attempts(game_log_import_id, created_at desc);
create index if not exists game_log_ocr_corrections_review_idx on public.game_log_ocr_corrections(decision, created_at) where decision in ('needs_review','unresolved');

alter table public.domain_text_aliases enable row level security;
alter table public.game_log_ocr_attempts enable row level security;
alter table public.game_log_ocr_corrections enable row level security;

create policy "members can read domain aliases" on public.domain_text_aliases for select to authenticated using (true);
create policy "users can read editable import OCR attempts" on public.game_log_ocr_attempts for select to authenticated using (
  exists (select 1 from public.game_log_imports gli where gli.id = game_log_import_id and public.can_edit_game(gli.game_id))
);
create policy "users can read editable import OCR corrections" on public.game_log_ocr_corrections for select to authenticated using (
  exists (
    select 1 from public.game_log_ocr_attempts attempt
    join public.game_log_imports gli on gli.id = attempt.game_log_import_id
    where attempt.id = ocr_attempt_id and public.can_edit_game(gli.game_id)
  )
);

create or replace function public.get_ocr_domain_dictionary(p_game_log_import_id uuid)
returns table(entity_type text, entity_id uuid, canonical_name text, aliases text[])
language sql
security definer
set search_path = ''
as $$
  with import_game as (
    select gli.game_id from public.game_log_imports gli
    where gli.id = p_game_log_import_id and public.can_edit_game(gli.game_id)
  ), entries as (
    select 'card'::text, c.id, c.card_name from public.cards c
    union all select 'corporation', c.id, c.name from public.corporations c
    union all select 'milestone', m.id, m.name from public.milestones m
    union all select 'award', a.id, a.name from public.awards a
    union all
    select 'player', p.id, p.display_name
    from import_game ig
    join public.game_players gp on gp.game_id = ig.game_id
    join public.players p on p.id = gp.player_id
  )
  select e.column1, e.column2, e.column3,
    coalesce(array_agg(dta.alias_text order by dta.occurrence_count desc) filter (where dta.id is not null), '{}'::text[])
  from entries e
  left join public.domain_text_aliases dta on dta.entity_type=e.column1 and dta.entity_id=e.column2
  group by e.column1,e.column2,e.column3;
$$;

create or replace function public.confirm_ocr_domain_correction(p_correction_id uuid, p_entity_id uuid, p_canonical_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_row public.game_log_ocr_corrections%rowtype;
begin
  select c.* into v_row
  from public.game_log_ocr_corrections c
  join public.game_log_ocr_attempts a on a.id=c.ocr_attempt_id
  join public.game_log_imports gli on gli.id=a.game_log_import_id
  where c.id=p_correction_id and public.can_edit_game(gli.game_id)
  for update;
  if not found then raise exception 'correction not found or not editable' using errcode='42501'; end if;

  update public.game_log_ocr_corrections set
    canonical_entity_id=p_entity_id,
    canonical_text=p_canonical_text,
    method='manual', decision='confirmed',
    confirmed_by_user_id=auth.uid(), confirmed_at=now()
  where id=p_correction_id;

  insert into public.domain_text_aliases(entity_type,entity_id,alias_text,normalized_alias_text,source,confirmed_by_user_id)
  values(v_row.entity_type,p_entity_id,v_row.original_text,lower(regexp_replace(trim(v_row.original_text),'[^a-zA-Z0-9]+',' ','g')),'confirmed_ocr',auth.uid())
  on conflict(entity_type,normalized_alias_text) do update set
    entity_id=excluded.entity_id, alias_text=excluded.alias_text,
    occurrence_count=public.domain_text_aliases.occurrence_count+1,
    updated_at=now(), confirmed_by_user_id=auth.uid();
end;
$$;

grant execute on function public.get_ocr_domain_dictionary(uuid) to authenticated;
grant execute on function public.confirm_ocr_domain_correction(uuid,uuid,text) to authenticated;
