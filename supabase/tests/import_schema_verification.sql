select
  'column' as schema_item_type,
  table_name,
  column_name as schema_item_name
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'game_log_imports',
    'game_log_events',
    'game_result_screenshot_imports',
    'player_import_aliases'
  )

union all

select
  'constraint' as schema_item_type,
  tc.table_name,
  tc.constraint_name as schema_item_name
from information_schema.table_constraints tc
where tc.table_schema = 'public'
  and tc.table_name in (
    'game_log_imports',
    'game_log_events',
    'game_result_screenshot_imports',
    'player_import_aliases'
  )
  and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')

union all

select
  'index' as schema_item_type,
  schemaname as table_name,
  indexname as schema_item_name
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'game_log_events_import_order_idx',
    'game_result_screenshot_imports_game_id_created_at_idx',
    'player_import_aliases_group_player_idx'
  )

order by table_name, schema_item_type, schema_item_name;
