-- Reconstructed schema for the already-applied production migration
-- 20260718200536_add_venus_colonies_import_facts.
--
-- This migration was applied to production before the repository migration set
-- was reconciled, so the local repository never contained it even though the
-- live database does (verified via `supabase migration list` / production
-- migration history). The checked-in 20260718204000_add_game_mechanic_capture
-- migration depends on public.game_expansion_facts existing, so without this
-- file a clean baseline (`supabase db reset`) fails.
--
-- The definition below is a faithful, schema-only reconstruction of the live
-- table verified by read-only introspection of production
-- (information_schema.columns + pg_constraint + pg_policies) on 2026-07-18.
-- It is intentionally idempotent and schema-only: the production migration also
-- ran a one-time owner-confirmed historical backfill of 42 games; that data
-- already exists in production and must not be recreated here (there are no
-- games to backfill on a fresh baseline, and re-running it on production is not
-- authorized). Because production already records version 20260718200536 in its
-- migration history, `supabase db push` treats this file as already applied and
-- will not re-run it against production.

create table if not exists public.game_expansion_facts (
  game_id uuid primary key references public.games(id) on delete cascade,
  source_game_log_import_id uuid,
  venus_next_state text not null,
  colonies_state text not null,
  detection_provenance jsonb not null default '{}'::jsonb,
  parser_version text,
  source_coverage jsonb not null default '{}'::jsonb,
  final_venus_scale smallint,
  venus_event_count integer not null default 0,
  colony_built_count integer not null default 0,
  colony_trade_count integer not null default 0,
  backfill_version text,
  backfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Canonical state + value constraints, added defensively so a reconstructed
-- baseline matches the live check catalogue exactly. The historical states are
-- part of production's approved provenance vocabulary.
do $reconcile$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_expansion_facts'::regclass
      and conname = 'game_expansion_facts_venus_state_check'
  ) then
    alter table public.game_expansion_facts
      add constraint game_expansion_facts_venus_state_check
      check (venus_next_state in (
        'confirmed_present', 'confirmed_absent', 'incomplete_evidence',
        'unsupported_log_pattern', 'conflicting_evidence',
        'historical_parser_verified_owner_confirmed_absent',
        'historical_owner_confirmed_absent'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_expansion_facts'::regclass
      and conname = 'game_expansion_facts_colonies_state_check'
  ) then
    alter table public.game_expansion_facts
      add constraint game_expansion_facts_colonies_state_check
      check (colonies_state in (
        'confirmed_present', 'confirmed_absent', 'incomplete_evidence',
        'unsupported_log_pattern', 'conflicting_evidence',
        'historical_parser_verified_owner_confirmed_absent',
        'historical_owner_confirmed_absent'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_expansion_facts'::regclass
      and conname = 'game_expansion_facts_final_venus_scale_check'
  ) then
    alter table public.game_expansion_facts
      add constraint game_expansion_facts_final_venus_scale_check
      check (
        final_venus_scale is null
        or (final_venus_scale >= 0 and final_venus_scale <= 30 and mod(final_venus_scale::integer, 2) = 0)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_expansion_facts'::regclass
      and conname = 'game_expansion_facts_nonnegative_counts_check'
  ) then
    alter table public.game_expansion_facts
      add constraint game_expansion_facts_nonnegative_counts_check
      check (venus_event_count >= 0 and colony_built_count >= 0 and colony_trade_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_expansion_facts'::regclass
      and conname = 'game_expansion_facts_source_import_check'
  ) then
    alter table public.game_expansion_facts
      add constraint game_expansion_facts_source_import_check
      foreign key (game_id, source_game_log_import_id)
      references public.game_log_imports (game_id, id)
      on delete set null (source_game_log_import_id);
  end if;
end;
$reconcile$;

alter table public.game_expansion_facts enable row level security;

drop policy if exists "members read game expansion facts" on public.game_expansion_facts;
drop policy if exists "editors manage game expansion facts" on public.game_expansion_facts;

create policy "members read game expansion facts"
on public.game_expansion_facts for select
to authenticated
using (public.can_read_game(game_id));

create policy "editors manage game expansion facts"
on public.game_expansion_facts for all
to authenticated
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

-- Aggregate expansion facts are group-scoped data: authenticated only, no anon.
revoke all on public.game_expansion_facts from anon;
grant select, insert, update, delete on public.game_expansion_facts to authenticated;
