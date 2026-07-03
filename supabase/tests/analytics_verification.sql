select table_schema, table_name
from information_schema.views
where table_schema = 'analytics'
order by table_name;
