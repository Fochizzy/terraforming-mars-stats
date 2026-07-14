-- Restore read access for the import coverage analytics view and keep future
-- analytics views aligned with the rest of the exposed analytics schema.
grant select on table analytics.import_coverage to authenticated;
alter default privileges in schema analytics
grant select on tables to authenticated;
