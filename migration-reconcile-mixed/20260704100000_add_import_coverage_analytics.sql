create or replace view analytics.import_coverage
with (security_invoker = true) as
select
  g.group_id,
  gli.game_id,
  gli.line_count,
  gli.unparsed_line_count,
  coalesce(
    nullif(gli.confidence_summary ->> 'ignoredLineCount', '')::integer,
    0
  ) as ignored_filler_lines,
  count(distinct gsi.id) as screenshot_count,
  coalesce(
    bool_or(gsi.extracted_fields ? 'playerRows'),
    false
  ) as has_score_source_breakdown
from public.game_log_imports gli
join public.games g
  on g.id = gli.game_id
left join public.game_result_screenshot_imports gsi
  on gsi.game_id = gli.game_id
group by
  g.group_id,
  gli.game_id,
  gli.confidence_summary,
  gli.line_count,
  gli.unparsed_line_count;
