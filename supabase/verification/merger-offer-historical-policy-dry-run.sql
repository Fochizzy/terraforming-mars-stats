-- Read-only production dry run for the approved always-available Merger policy.
-- Before execution, replace <TARGET_GROUP_UUID> with the reviewed group UUID.
-- Do not run the UPDATE from the production package without owner approval.

begin read only;

select set_config(
  'app.merger_historical_group_id',
  '<TARGET_GROUP_UUID>',
  true
);

with target as (
  select current_setting('app.merger_historical_group_id')::uuid as group_id
),
manual_merger_selections as (
  select distinct gp.game_id, gp.id as game_player_id
  from public.game_player_preludes gpp
  join public.game_players gp on gp.id = gpp.game_player_id
  join public.preludes p on p.id = gpp.prelude_id
  where lower(p.code) = 'merger'
),
resolved_merger_plays as (
  select distinct gli.game_id, gle.game_player_id
  from public.game_log_events gle
  join public.game_log_imports gli on gli.id = gle.game_log_import_id
  join public.prelude_card_aliases pca on pca.card_id = gle.card_id
  join public.preludes p on p.id = pca.prelude_id
  where gle.event_type = 'card_played'
    and lower(p.code) = 'merger'
    and gle.game_player_id is not null
),
unresolved_merger_plays as (
  select distinct gli.game_id, gle.id as game_log_event_id
  from public.game_log_events gle
  join public.game_log_imports gli on gli.id = gle.game_log_import_id
  join public.prelude_card_aliases pca on pca.card_id = gle.card_id
  join public.preludes p on p.id = pca.prelude_id
  where gle.event_type = 'card_played'
    and lower(p.code) = 'merger'
    and gle.game_player_id is null
),
scoped_games as (
  select g.*
  from public.games g
  join target on target.group_id = g.group_id
)
select
  count(*) filter (where true) as total_eligible_historical_games,
  count(*) filter (where guaranteed_merger_offer is true) as already_marked_enabled,
  count(*) filter (where guaranteed_merger_offer is false) as marked_disabled,
  count(*) filter (where guaranteed_merger_offer is null) as unknown_or_unrecorded,
  count(*) filter (
    where guaranteed_merger_offer is null
      and guaranteed_merger_offer_source is null
  ) as would_change,
  count(*) filter (
    where guaranteed_merger_offer is not null
      or guaranteed_merger_offer_source is not null
  ) as excluded,
  count(*) filter (
    where guaranteed_merger_offer is false
      or (
        guaranteed_merger_offer is true
        and guaranteed_merger_offer_source <> 'historical_policy'
      )
  ) as conflicting_records,
  count(*) filter (
    where exists (
      select 1 from public.game_log_imports gli where gli.game_id = scoped_games.id
    )
  ) as games_with_imported_logs,
  count(*) filter (
    where exists (
      select 1 from resolved_merger_plays rmp where rmp.game_id = scoped_games.id
    )
  ) as games_with_detected_merger_plays,
  count(*) filter (
    where exists (
      select 1 from manual_merger_selections mms where mms.game_id = scoped_games.id
    )
  ) as games_with_manual_merger_selections,
  count(*) filter (
    where exists (
      select 1 from unresolved_merger_plays ump where ump.game_id = scoped_games.id
    )
  ) as games_with_unresolved_actor_mappings
from scoped_games;

-- The catalog gate must bind every accepted source identity to exactly one
-- canonical Prelude before the application treats imported evidence as Merger.
select
  lower(c.source_card_id) as source_card_identity,
  count(*) as mapped_card_rows,
  min(p.code) as canonical_prelude_code,
  count(distinct p.id) as canonical_prelude_count
from public.cards c
left join public.prelude_card_aliases pca on pca.card_id = c.id
left join public.preludes p on p.id = pca.prelude_id
where lower(c.source_card_id) in ('promo:p39', 'promo:merger')
group by lower(c.source_card_id)
order by source_card_identity;

rollback;
