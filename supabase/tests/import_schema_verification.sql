select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'game_log_imports'
order by ordinal_position;
