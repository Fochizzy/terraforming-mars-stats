-- Roll back only rows written by the approved historical-policy backfill.
-- Never use this as a schema rollback after new application writes exist.

begin;

select set_config(
  'app.merger_historical_group_id',
  '<TARGET_GROUP_UUID>',
  true
);

with reverted as (
  update public.games g
  set
    guaranteed_merger_offer = null,
    guaranteed_merger_offer_source = null
  where g.group_id = current_setting('app.merger_historical_group_id')::uuid
    and g.guaranteed_merger_offer is true
    and g.guaranteed_merger_offer_source = 'historical_policy'
  returning g.id
)
select count(*) as reverted_game_count from reverted;

commit;
