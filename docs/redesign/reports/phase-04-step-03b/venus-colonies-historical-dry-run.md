# Phase 4 Step 4.3B Venus Next / Colonies historical verification

- Generated at: 2026-07-18T19:39:18.704Z
- Historical cutoff: 2026-07-18T00:00:00.000Z
- Mode: read-only production dry run
- Production schema ready: no
- Production write performed: no

## Counts

| Measure | Count |
| --- | ---: |
| Total historical games | 42 |
| Eligible games | 42 |
| Games with retained parseable logs | 42 |
| Games without retained logs | 0 |
| Parser-confirmed Venus absence | 42 |
| Parser-confirmed Colonies absence | 42 |
| Unexpected Venus presence | 0 |
| Unexpected Colonies presence | 0 |
| Unexpected Venus events | 0 |
| Unexpected Colony events | 0 |
| Incomplete evidence | 0 |
| Unsupported patterns | 0 |
| Conflicting evidence | 0 |
| Parser exceptions | 0 |
| Duplicate events | 0 |
| Unresolved player associations | 0 |
| Already populated | 0 |
| Planned writes | 42 |

## Review gate

Games requiring review: none

The dry run writes no game changes. A write is permitted only when every review
and unexpected-result counter is zero, the migration has been applied, and the
separate confirmation token is supplied. Rows are inserted only for games below
the fixed cutoff that do not already have a game-expansion fact row.

## Write verification

Not run.
