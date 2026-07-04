select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'game_log_imports',
    'game_log_events',
    'game_result_screenshot_imports',
    'player_import_aliases'
  )
order by table_name, ordinal_position;
