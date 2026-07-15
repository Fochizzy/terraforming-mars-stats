create extension if not exists pgcrypto;

create or replace function public.normalize_ocr_domain_text(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $function$
  select trim(regexp_replace(
    regexp_replace(
      translate(lower(coalesce(p_value, '')), '|01', 'loi'),
      '[^a-z0-9]+', ' ', 'g'
    ),
    '\s+', ' ', 'g'
  ));
$function$;

alter table public.game_log_ocr_attempts
  add column if not exists engine_name text,
  add column if not exists engine_version text,
  add column if not exists preprocessing_variant text not null default 'original',
  add column if not exists region_type text not null default 'full_image',
  add column if not exists raw_ocr_text text not null default '',
  add column if not exists mean_confidence numeric,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $repair_attempts$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'game_log_ocr_attempts'
      and column_name = 'engine'
  ) then
    execute $sql$
      update public.game_log_ocr_attempts
      set engine_name = coalesce(nullif(engine_name, ''), nullif(engine, ''), 'unknown')
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'game_log_ocr_attempts'
      and column_name = 'average_confidence'
  ) then
    execute $sql$
      update public.game_log_ocr_attempts
      set mean_confidence = coalesce(mean_confidence, average_confidence)
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'game_log_ocr_attempts'
      and column_name = 'correction_summary'
  ) then
    execute $sql$
      update public.game_log_ocr_attempts
      set metadata = case
        when metadata = '{}'::jsonb then correction_summary
        else metadata
      end
      where correction_summary is not null
    $sql$;
  end if;
end;
$repair_attempts$;

update public.game_log_ocr_attempts
set engine_name = coalesce(nullif(engine_name, ''), 'unknown'),
    metadata = coalesce(metadata, '{}'::jsonb),
    preprocessing_variant = coalesce(nullif(preprocessing_variant, ''), 'original'),
    region_type = coalesce(nullif(region_type, ''), 'full_image'),
    raw_ocr_text = coalesce(raw_ocr_text, '');

alter table public.game_log_ocr_attempts
  alter column engine_name set not null,
  alter column metadata set not null,
  alter column preprocessing_variant set not null,
  alter column region_type set not null,
  alter column raw_ocr_text set not null;

alter table public.game_log_ocr_corrections
  add column if not exists game_log_import_id uuid references public.game_log_imports(id) on delete cascade,
  add column if not exists ocr_attempt_id uuid references public.game_log_ocr_attempts(id) on delete cascade,
  add column if not exists event_order integer,
  add column if not exists entity_type text,
  add column if not exists original_ocr_text text,
  add column if not exists normalized_ocr_text text,
  add column if not exists canonical_entity_id uuid,
  add column if not exists canonical_text text,
  add column if not exists correction_method text,
  add column if not exists decision text,
  add column if not exists match_score numeric not null default 0,
  add column if not exists score_margin numeric not null default 0,
  add column if not exists suggestions jsonb not null default '[]'::jsonb,
  add column if not exists confirmed_by_user_id uuid references auth.users(id),
  add column if not exists confirmed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $repair_corrections$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'game_log_ocr_corrections'
      and column_name = 'line_index'
  ) then
    execute $sql$
      update public.game_log_ocr_corrections
      set event_order = coalesce(event_order, line_index)
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'game_log_ocr_corrections'
      and column_name = 'original_text'
  ) then
    execute $sql$
      update public.game_log_ocr_corrections
      set original_ocr_text = coalesce(nullif(original_ocr_text, ''), original_text)
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'game_log_ocr_corrections'
      and column_name = 'method'
  ) then
    execute $sql$
      update public.game_log_ocr_corrections
      set correction_method = coalesce(nullif(correction_method, ''), method)
    $sql$;
  end if;
end;
$repair_corrections$;

update public.game_log_ocr_corrections corrections
set game_log_import_id = coalesce(corrections.game_log_import_id, attempts.game_log_import_id)
from public.game_log_ocr_attempts attempts
where corrections.ocr_attempt_id = attempts.id
  and corrections.game_log_import_id is null;

update public.game_log_ocr_corrections
set original_ocr_text = coalesce(nullif(original_ocr_text, ''), canonical_text, ''),
    normalized_ocr_text = coalesce(
      nullif(normalized_ocr_text, ''),
      public.normalize_ocr_domain_text(coalesce(original_ocr_text, canonical_text, ''))
    ),
    correction_method = coalesce(nullif(correction_method, ''), 'none'),
    decision = coalesce(nullif(decision, ''), 'unresolved'),
    suggestions = coalesce(suggestions, '[]'::jsonb),
    updated_at = coalesce(updated_at, created_at, now());

alter table public.game_log_ocr_corrections
  alter column game_log_import_id set not null,
  alter column entity_type set not null,
  alter column original_ocr_text set not null,
  alter column normalized_ocr_text set not null,
  alter column correction_method set not null,
  alter column decision set not null,
  alter column suggestions set not null,
  alter column updated_at set not null;

do $constraints$
begin
  if not exists (select 1 from pg_constraint where conname = 'game_log_ocr_attempts_mean_confidence_check') then
    alter table public.game_log_ocr_attempts
      add constraint game_log_ocr_attempts_mean_confidence_check
      check (mean_confidence is null or mean_confidence between 0 and 1);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_log_ocr_attempts_metadata_object_check') then
    alter table public.game_log_ocr_attempts
      add constraint game_log_ocr_attempts_metadata_object_check
      check (jsonb_typeof(metadata) = 'object');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_log_ocr_corrections_entity_type_check') then
    alter table public.game_log_ocr_corrections
      add constraint game_log_ocr_corrections_entity_type_check
      check (entity_type in ('award', 'card', 'corporation', 'milestone', 'player', 'resource'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_log_ocr_corrections_method_check') then
    alter table public.game_log_ocr_corrections
      add constraint game_log_ocr_corrections_method_check
      check (correction_method in ('exact', 'alias', 'fuzzy', 'manual', 'none'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_log_ocr_corrections_decision_check') then
    alter table public.game_log_ocr_corrections
      add constraint game_log_ocr_corrections_decision_check
      check (decision in ('auto_accept', 'needs_review', 'unresolved', 'confirmed', 'rejected'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_log_ocr_corrections_match_score_check') then
    alter table public.game_log_ocr_corrections
      add constraint game_log_ocr_corrections_match_score_check
      check (match_score between 0 and 1);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_log_ocr_corrections_score_margin_check') then
    alter table public.game_log_ocr_corrections
      add constraint game_log_ocr_corrections_score_margin_check
      check (score_margin between 0 and 1);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'game_log_ocr_corrections_suggestions_array_check') then
    alter table public.game_log_ocr_corrections
      add constraint game_log_ocr_corrections_suggestions_array_check
      check (jsonb_typeof(suggestions) = 'array');
  end if;
end;
$constraints$;

create index if not exists game_log_ocr_attempts_import_idx
on public.game_log_ocr_attempts(game_log_import_id, created_at desc);

create index if not exists game_log_ocr_corrections_import_review_idx
on public.game_log_ocr_corrections(game_log_import_id, decision, created_at);

alter table public.domain_text_aliases enable row level security;
alter table public.game_log_ocr_attempts enable row level security;
alter table public.game_log_ocr_corrections enable row level security;

drop policy if exists "domain_text_aliases_read_authenticated"
on public.domain_text_aliases;

drop policy if exists "members can read domain aliases"
on public.domain_text_aliases;

create policy "domain_text_aliases_read_authenticated"
on public.domain_text_aliases
for select
to authenticated
using (true);

drop policy if exists "game_log_ocr_attempts_game_access"
on public.game_log_ocr_attempts;

drop policy if exists "users can read editable import OCR attempts"
on public.game_log_ocr_attempts;

create policy "game_log_ocr_attempts_game_access"
on public.game_log_ocr_attempts
for all
to authenticated
using (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_ocr_attempts.game_log_import_id
      and public.can_edit_game(gli.game_id)
  )
)
with check (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_ocr_attempts.game_log_import_id
      and public.can_edit_game(gli.game_id)
  )
);

drop policy if exists "game_log_ocr_corrections_game_access"
on public.game_log_ocr_corrections;

drop policy if exists "users can read editable import OCR corrections"
on public.game_log_ocr_corrections;

create policy "game_log_ocr_corrections_game_access"
on public.game_log_ocr_corrections
for all
to authenticated
using (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_ocr_corrections.game_log_import_id
      and public.can_edit_game(gli.game_id)
  )
)
with check (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_ocr_corrections.game_log_import_id
      and public.can_edit_game(gli.game_id)
  )
);

create or replace function public.get_ocr_domain_dictionary(p_game_log_import_id uuid)
returns table(entity_type text, entity_id uuid, canonical_name text, aliases text[])
language sql
security definer
set search_path = ''
as $function$
  with import_game as (
    select gli.game_id
    from public.game_log_imports gli
    where gli.id = p_game_log_import_id
      and public.can_edit_game(gli.game_id)
  ), entries(entity_type, entity_id, canonical_name) as (
    select 'card'::text, c.id, c.card_name from public.cards c
    union all
    select 'corporation', c.id, c.name from public.corporations c
    union all
    select 'milestone', m.id, m.name from public.milestones m
    union all
    select 'award', a.id, a.name from public.awards a
    union all
    select 'player', p.id, p.display_name
    from import_game ig
    join public.game_players gp on gp.game_id = ig.game_id
    join public.players p on p.id = gp.player_id
  )
  select e.entity_type,
         e.entity_id,
         e.canonical_name,
         coalesce(
           array_agg(dta.alias_text order by dta.occurrence_count desc)
             filter (where dta.id is not null),
           '{}'::text[]
         ) as aliases
  from entries e
  left join public.domain_text_aliases dta
    on dta.entity_type = e.entity_type
   and dta.entity_id = e.entity_id
  group by e.entity_type, e.entity_id, e.canonical_name;
$function$;

create or replace function public.confirm_game_log_ocr_correction(
  p_correction_id uuid,
  p_canonical_entity_id uuid,
  p_canonical_text text,
  p_save_alias boolean default true
)
returns public.game_log_ocr_corrections
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_row public.game_log_ocr_corrections%rowtype;
begin
  update public.game_log_ocr_corrections
  set canonical_entity_id = p_canonical_entity_id,
      canonical_text = p_canonical_text,
      correction_method = 'manual',
      decision = 'confirmed',
      confirmed_by_user_id = auth.uid(),
      confirmed_at = now(),
      updated_at = now()
  where id = p_correction_id
  returning * into v_row;

  if not found then
    raise exception 'OCR correction % does not exist', p_correction_id using errcode = 'P0002';
  end if;

  if p_save_alias and p_canonical_entity_id is not null then
    insert into public.domain_text_aliases (
      entity_type,
      entity_id,
      alias_text,
      normalized_alias_text,
      source,
      occurrence_count,
      confirmed_by_user_id
    )
    values (
      v_row.entity_type,
      p_canonical_entity_id,
      v_row.original_ocr_text,
      public.normalize_ocr_domain_text(v_row.original_ocr_text),
      'confirmed_ocr',
      1,
      auth.uid()
    )
    on conflict (entity_type, normalized_alias_text) do update
    set entity_id = excluded.entity_id,
        alias_text = excluded.alias_text,
        source = 'confirmed_ocr',
        occurrence_count = public.domain_text_aliases.occurrence_count + 1,
        confirmed_by_user_id = auth.uid(),
        updated_at = now();
  end if;

  return v_row;
end;
$function$;

revoke execute on function public.confirm_game_log_ocr_correction(uuid, uuid, text, boolean) from public;
revoke execute on function public.confirm_game_log_ocr_correction(uuid, uuid, text, boolean) from anon;
grant execute on function public.confirm_game_log_ocr_correction(uuid, uuid, text, boolean) to authenticated;
grant execute on function public.get_ocr_domain_dictionary(uuid) to authenticated;
