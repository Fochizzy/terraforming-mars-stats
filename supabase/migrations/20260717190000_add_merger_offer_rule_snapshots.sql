-- Phase 2 Merger always-available Prelude remediation.
-- Historical games deliberately remain NULL/NULL until the separately approved,
-- group-scoped historical-policy statement is executed after a dry run.

alter table public.group_settings
  add column if not exists default_guaranteed_merger_offer boolean not null default true;

alter table public.games
  add column if not exists guaranteed_merger_offer boolean,
  add column if not exists guaranteed_merger_offer_source text;

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'games_guaranteed_merger_offer_source_check'
  ) then
    alter table public.games
      add constraint games_guaranteed_merger_offer_source_check
      check (
        (guaranteed_merger_offer is null and guaranteed_merger_offer_source is null)
        or (guaranteed_merger_offer is null and guaranteed_merger_offer_source = 'unknown')
        or (
          guaranteed_merger_offer is not null
          and guaranteed_merger_offer_source in (
            'group_default',
            'manual_override',
            'historical_policy',
            'import_metadata'
          )
        )
      );
  end if;
end;
$constraints$;

create index if not exists games_group_guaranteed_merger_offer_idx
on public.games (group_id, guaranteed_merger_offer)
where status = 'finalized';

-- A stable catalog relationship prevents imported card aliases from becoming
-- separate Prelude selections. There is intentionally no display-name join.
create table if not exists public.prelude_card_aliases (
  prelude_id uuid not null references public.preludes(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  identity_kind text not null check (identity_kind in ('canonical', 'accepted_alias')),
  created_at timestamptz not null default now(),
  primary key (prelude_id, card_id)
);

create unique index if not exists prelude_card_aliases_card_id_unique_idx
on public.prelude_card_aliases (card_id);

alter table public.prelude_card_aliases enable row level security;

drop policy if exists "authenticated users read prelude card aliases"
on public.prelude_card_aliases;

create policy "authenticated users read prelude card aliases"
on public.prelude_card_aliases
for select
to authenticated
using (true);

-- The catalog importer currently uses promo:P39 for Merger. A legacy
-- promo:merger source identity is accepted only when that exact catalog row
-- exists. The production dry run must report both bindings before use.
insert into public.prelude_card_aliases (prelude_id, card_id, identity_kind)
select
  preludes.id,
  cards.id,
  case
    when lower(cards.source_card_id) = 'promo:p39' then 'canonical'
    else 'accepted_alias'
  end
from public.preludes preludes
join public.cards cards
  on lower(cards.source_card_id) in ('promo:p39', 'promo:merger')
where lower(preludes.code) = 'merger'
on conflict (prelude_id, card_id) do update
set identity_kind = excluded.identity_kind;
