create extension if not exists pgcrypto;

alter table public.game_log_imports
  add column if not exists input_sha256 text,
  add column if not exists parsed_at timestamptz,
  add column if not exists finalized_at timestamptz,
  add column if not exists validation_errors jsonb not null default '[]'::jsonb,
  add column if not exists output_sha256 text;

create or replace function public.derive_game_log_import_metadata()
returns trigger
language plpgsql
set search_path = public, extensions
as $function$
begin
  new.input_sha256 := encode(digest(coalesce(new.raw_log_text, ''), 'sha256'), 'hex');
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists derive_game_log_import_metadata_before_write
on public.game_log_imports;

create trigger derive_game_log_import_metadata_before_write
before insert or update of raw_log_text
on public.game_log_imports
for each row
execute function public.derive_game_log_import_metadata();

create or replace function public.derive_game_log_tag_coverage()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.played_card_count := greatest(coalesce(new.played_card_count, 0), 0);
  new.matched_card_count := greatest(coalesce(new.matched_card_count, 0), 0);
  new.unresolved_card_count := greatest(coalesce(new.unresolved_card_count, 0), 0);
  new.total_tag_count := greatest(coalesce(new.total_tag_count, 0), 0);
  new.matched_card_count := least(new.matched_card_count, new.played_card_count);
  new.unresolved_card_count := new.played_card_count - new.matched_card_count;
  new.tag_evidence_coverage := case
    when new.played_card_count = 0 then 0
    else round(new.matched_card_count::numeric / new.played_card_count, 4)
  end;
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists derive_game_log_tag_coverage_before_write
on public.game_log_tag_summaries;

create trigger derive_game_log_tag_coverage_before_write
before insert or update of played_card_count, matched_card_count,
  unresolved_card_count, tag_evidence_coverage
on public.game_log_tag_summaries
for each row
execute function public.derive_game_log_tag_coverage();

do $constraints$
begin
  if not exists (select 1 from pg_constraint where conname = 'game_log_imports_line_count_nonnegative') then
    alter table public.game_log_imports add constraint game_log_imports_line_count_nonnegative check (line_count >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'game_log_imports_unparsed_line_count_valid') then
    alter table public.game_log_imports add constraint game_log_imports_unparsed_line_count_valid check (unparsed_line_count >= 0 and unparsed_line_count <= line_count);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'game_log_imports_validation_errors_array') then
    alter table public.game_log_imports add constraint game_log_imports_validation_errors_array check (jsonb_typeof(validation_errors) = 'array');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'game_log_imports_input_sha256_format') then
    alter table public.game_log_imports add constraint game_log_imports_input_sha256_format check (input_sha256 is null or input_sha256 ~ '^[0-9a-f]{64}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'game_log_imports_output_sha256_format') then
    alter table public.game_log_imports add constraint game_log_imports_output_sha256_format check (output_sha256 is null or output_sha256 ~ '^[0-9a-f]{64}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'game_log_tag_summaries_matched_not_above_played') then
    alter table public.game_log_tag_summaries add constraint game_log_tag_summaries_matched_not_above_played check (matched_card_count <= played_card_count);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'game_log_tag_summaries_unresolved_reconciles') then
    alter table public.game_log_tag_summaries add constraint game_log_tag_summaries_unresolved_reconciles check (unresolved_card_count = played_card_count - matched_card_count);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'game_log_tag_summaries_coverage_reconciles') then
    alter table public.game_log_tag_summaries add constraint game_log_tag_summaries_coverage_reconciles check (
      tag_evidence_coverage = case when played_card_count = 0 then 0::numeric else round(matched_card_count::numeric / played_card_count::numeric, 4) end
    );
  end if;
end;
$constraints$;

create or replace function public.validate_game_log_import(p_game_log_import_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_import public.game_log_imports%rowtype;
  v_errors jsonb := '[]'::jsonb;
  v_event_count integer;
  v_summary_count integer;
  v_output text;
begin
  select * into v_import from public.game_log_imports where id = p_game_log_import_id for update;
  if not found then raise exception 'game log import % does not exist', p_game_log_import_id using errcode='P0002'; end if;

  select count(*) into v_event_count from public.game_log_events where game_log_import_id = p_game_log_import_id;
  select count(*) into v_summary_count from public.game_log_tag_summaries where game_log_import_id = p_game_log_import_id;

  if btrim(v_import.raw_log_text) = '' then v_errors := v_errors || jsonb_build_array('raw_log_text_empty'); end if;
  if v_import.line_count <= 0 then v_errors := v_errors || jsonb_build_array('line_count_not_positive'); end if;
  if v_import.parse_status in ('log_parsed','log_parsed_score_extracted','parsed','finalized') and v_event_count = 0 then
    v_errors := v_errors || jsonb_build_array('parsed_import_has_no_events');
  end if;
  if exists (
    select 1 from public.game_log_tag_summaries
    where game_log_import_id=p_game_log_import_id
      and (matched_card_count > played_card_count
        or unresolved_card_count <> played_card_count - matched_card_count
        or tag_evidence_coverage <> case when played_card_count=0 then 0::numeric else round(matched_card_count::numeric/played_card_count::numeric,4) end)
  ) then v_errors := v_errors || jsonb_build_array('tag_summary_reconciliation_failed'); end if;
  if exists (
    select 1 from public.game_log_events
    where game_log_import_id=p_game_log_import_id and (raw_line='' or event_type='' or event_order < 0)
  ) then v_errors := v_errors || jsonb_build_array('invalid_event_fields'); end if;

  select coalesce(string_agg(event_order::text || ':' || event_type || ':' || coalesce(card_id::text,'') || ':' || raw_line, E'\n' order by event_order),'')
    || E'\n--summaries--\n' ||
    coalesce((select string_agg(normalized_player_name || ':' || tag_code || ':' || tag_count::text || ':' || played_card_count::text || ':' || matched_card_count::text, E'\n' order by normalized_player_name, tag_code)
              from public.game_log_tag_summaries where game_log_import_id=p_game_log_import_id),'')
  into v_output
  from public.game_log_events where game_log_import_id=p_game_log_import_id;

  update public.game_log_imports
  set validation_errors=v_errors,
      output_sha256=encode(extensions.digest(v_output,'sha256'),'hex'),
      parsed_at=case when v_event_count > 0 then coalesce(parsed_at,now()) else parsed_at end,
      parse_status=case when jsonb_array_length(v_errors)>0 then 'validation_failed' else parse_status end
  where id=p_game_log_import_id;

  return jsonb_build_object('valid',jsonb_array_length(v_errors)=0,'errors',v_errors,'event_count',v_event_count,'summary_count',v_summary_count);
end;
$function$;

create or replace function public.finalize_game_log_import(p_game_log_import_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_result jsonb;
begin
  v_result := public.validate_game_log_import(p_game_log_import_id);
  if not (v_result->>'valid')::boolean then
    raise exception 'game log import % failed validation: %', p_game_log_import_id, v_result->'errors' using errcode='23514';
  end if;
  update public.game_log_imports
  set parse_status='finalized', finalized_at=now(), validation_errors='[]'::jsonb
  where id=p_game_log_import_id;
  return v_result || jsonb_build_object('finalized',true);
end;
$function$;

create or replace view public.game_log_import_integrity_audit as
select
  gli.id as game_log_import_id,
  gli.game_id,
  gli.parse_status,
  gli.parser_version,
  gli.input_sha256,
  gli.output_sha256,
  gli.validation_errors,
  count(distinct gle.id)::integer as event_count,
  count(distinct glts.id)::integer as summary_count,
  jsonb_array_length(gli.validation_errors) = 0
    and gli.input_sha256 is not null
    and gli.line_count >= gli.unparsed_line_count
    and (gli.parse_status not in ('log_parsed','log_parsed_score_extracted','parsed','finalized') or count(distinct gle.id) > 0)
    as is_consistent
from public.game_log_imports gli
left join public.game_log_events gle on gle.game_log_import_id = gli.id
left join public.game_log_tag_summaries glts on glts.game_log_import_id = gli.id
group by gli.id;

update public.game_log_imports set raw_log_text = raw_log_text;

update public.game_log_tag_summaries set played_card_count = played_card_count;

select public.validate_game_log_import(id)
from public.game_log_imports;
