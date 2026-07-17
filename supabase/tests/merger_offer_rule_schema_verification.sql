select
  column_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'group_settings' and column_name = 'default_guaranteed_merger_offer')
    or (
      table_name = 'games'
      and column_name in ('guaranteed_merger_offer', 'guaranteed_merger_offer_source')
    )
  )
order by table_name, ordinal_position;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conname = 'games_guaranteed_merger_offer_source_check';

select policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('group_settings', 'games', 'prelude_card_aliases')
order by tablename, policyname;

select
  p.code as canonical_prelude_code,
  c.source_card_id,
  pca.identity_kind
from public.prelude_card_aliases pca
join public.preludes p on p.id = pca.prelude_id
join public.cards c on c.id = pca.card_id
where lower(p.code) = 'merger'
order by c.source_card_id;
