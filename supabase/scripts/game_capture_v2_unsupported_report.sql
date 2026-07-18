-- Sanitized operational report for data-capture-hardening-v2. Read-only.
-- Surfaces NEW unsupported parser patterns and coverage breakdowns WITHOUT
-- exposing raw log lines or player names. Run against production to decide
-- forward-fix parser work. Raw evidence stays in the editor-only
-- game_capture_unsupported_evidence table and is never emitted here.

-- 1. Unsupported patterns by reason + normalized pattern (no raw evidence).
select
  reason,
  coalesce(normalized_pattern, '(none)') as normalized_pattern,
  parser_version,
  count(*) as occurrences,
  count(distinct game_id) as games_affected
from public.game_capture_unsupported_evidence
group by reason, normalized_pattern, parser_version
order by occurrences desc, reason;

-- 2. Coverage state breakdown across parser runs.
select coverage_state, parser_version, count(*) as runs
from public.game_capture_parser_runs
group by coverage_state, parser_version
order by parser_version, coverage_state;

-- 3. Games by parser version (latest run per game).
with latest as (
  select distinct on (game_id) game_id, parser_version, coverage_state
  from public.game_capture_parser_runs
  order by game_id, parser_ran_at desc
)
select parser_version, coverage_state, count(*) as games
from latest
group by parser_version, coverage_state
order by parser_version, coverage_state;

-- 4. Canonical event mix (category/type counts).
select event_category, event_type, count(*) as events
from public.game_capture_events
group by event_category, event_type
order by events desc;
