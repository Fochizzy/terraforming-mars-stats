alter table public.cards
  add column if not exists is_catalog_visible boolean not null default true;

alter table public.cards
  add column if not exists superseded_by_card_id uuid references public.cards(id) on delete set null;

create index if not exists cards_catalog_visible_name_idx
  on public.cards (card_name)
  where is_catalog_visible;

comment on column public.cards.is_catalog_visible is
  'False keeps a historical or duplicate source row as audit evidence while excluding it from current catalog consumers.';

comment on column public.cards.superseded_by_card_id is
  'Current retained card identity when an automatic source sync encounters a one-to-one historical identity mismatch.';

-- The first upstream sync exposed 53 one-to-one historical identity mismatches:
-- one newly inserted upstream row and one pre-existing row with the same name.
-- Preserve both rows, link the new row to the retained identity, and make only
-- the duplicate invisible. This is intentionally reversible and deletes no data.
with upstream_rows as (
  select id, lower(card_name) as normalized_name
  from public.cards
  where last_synced_at = '2026-07-18T15:42:48.813Z'::timestamptz
),
historical_rows as (
  select id, lower(card_name) as normalized_name
  from public.cards
  where last_synced_at is null
),
one_to_one_matches as (
  select upstream_rows.id as upstream_id, (array_agg(historical_rows.id))[1] as retained_id
  from upstream_rows
  join historical_rows using (normalized_name)
  group by upstream_rows.id
  having count(*) = 1
)
update public.cards as cards
set
  is_catalog_visible = false,
  superseded_by_card_id = matches.retained_id,
  sync_metadata = cards.sync_metadata || jsonb_build_object(
    'catalogIdentityReconciliation',
    jsonb_build_object(
      'status', 'superseded-one-to-one-historical-identity',
      'reconciledAt', now()
    )
  )
from one_to_one_matches as matches
where cards.id = matches.upstream_id;
