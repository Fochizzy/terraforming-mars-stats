select
  to_regclass('public.expansions') is null as expansions_removed,
  to_regclass('public.group_default_expansions') is null as group_defaults_removed,
  to_regclass('public.game_expansions') is null as game_relations_removed,
  pg_get_viewdef('analytics.group_interactions'::regclass, true)
    not ilike '%expansion%' as group_interactions_clean,
  pg_get_viewdef('analytics.player_interactions'::regclass, true)
    not ilike '%expansion%' as player_interactions_clean;
