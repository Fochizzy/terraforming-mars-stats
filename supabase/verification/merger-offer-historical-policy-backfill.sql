-- Separately gated mutating command. Do not execute without recorded owner
-- approval, a successful dry run, and a reviewed target-group UUID.

begin;

select set_config(
  'app.merger_historical_group_id',
  '<TARGET_GROUP_UUID>',
  true
);

with changed as (
  update public.games g
  set
    guaranteed_merger_offer = true,
    guaranteed_merger_offer_source = 'historical_policy'
  where g.group_id = current_setting('app.merger_historical_group_id')::uuid
    and g.guaranteed_merger_offer is null
    and g.guaranteed_merger_offer_source is null
  returning g.id
)
select count(*) as changed_game_count from changed;

-- Stopping condition: the count above must equal the prior dry-run
-- `would_change` count. Otherwise ROLLBACK and investigate the drift.

commit;
