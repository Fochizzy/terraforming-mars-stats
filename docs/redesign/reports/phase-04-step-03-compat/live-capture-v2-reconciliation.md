# Live-capture v2 compatibility reconciliation

- Generated at: 2026-07-19T22:45:00Z
- Production project: `qjtwgrjjwnqafbvkkfex`
- Mode: **read-only** · Writes performed: **0**
- Queries: `supabase/verification/live-capture-v2-reconciliation.sql`
- Machine-readable twin: `live-capture-v2-reconciliation.json`

This is the third, separate immutable Step 4.3 artifact, alongside the
historical placement dry run (`../phase-04-step-03-placement/placement-backfill-dry-run.*`)
and the production backfill execution report
(`../phase-04-step-03-placement/placement-backfill-production.*`). None of the
three overwrites another; regenerate this one by re-running its documented
queries, never by editing the file.

## Live-site v2 deployment context (verified, not assumed)

| Fact | Value |
| --- | --- |
| Ledger migration | `20260719132042 data_capture_hardening_v2` |
| Cutoff (`data-capture-hardening-v2` marker) | 2026-07-19 13:20:42Z |
| Parser deployed | 2026-07-19 13:24:14Z (`tm-data-capture-v2`) |

## Reconciliation counts

| Measure | Count |
| --- | ---: |
| Total games | 42 |
| Games with legacy import data | 42 |
| Games with **legacy-only** import data (no v2 run) | 42 |
| Games with v2 source records | 0 |
| Games with v2 parser runs | 0 |
| Games with canonical v2 events | 0 |
| Games with canonical v2 placements | 0 |
| Games with expansion state | 42 |
| Games missing expansion state | 0 |
| v2 runs missing a source record | 0 |
| Legacy imports missing a server-derived input hash | 0 |
| Duplicate v2 source hashes | 0 |
| Duplicate v2 event identities | 0 |
| Duplicate v2 placement identities | 0 |
| Duplicate legacy event identities | 0 |
| Unsupported v2 contract versions observed | 0 |
| Adapter failures observed | 0 |

Parser versions observed — v2 capture runs: *(none yet)* · legacy imports:
`manual-web-import-v2` (all 42 historical imports were created by the live
site's importer before the v2 cutoff).

## Expansion-state distribution

| Venus state | Colonies state | Games | Non-null final Venus | Backfilled |
| --- | --- | ---: | ---: | ---: |
| `historical_parser_verified_owner_confirmed_absent` | `historical_parser_verified_owner_confirmed_absent` | 42 | 0 | 42 |

## Interpretation

- Production is **post-v2-deployment but pre-first-v2-capture**: the capture
  schema, catalogs, and cutoff marker exist, and every capture data table is
  empty because no real import has happened after the cutoff (the deployment's
  throwaway verification game was removed by that process).
- All 42 historical games resolve through the adapter's **legacy** origin;
  none of them is treated as parser failure or confirmed absence for lacking
  v2 rows.
- The 42 expansion-state rows all carry the historical
  parser-verified/owner-confirmed absence state with **null** final Venus —
  missing, never zero.
- No duplicate source hashes or event/placement identities exist in either
  system, and no unsupported v2 contract version has appeared.
- Adapter failure handling (missing schema, missing runs, rerun selection,
  unsupported versions, duplicate identities, pre-split `review_state`
  absence) is executable-tested in the repository
  (`src/lib/db/game-capture-compat-repo.test.ts`,
  `src/lib/imports/live-capture/map-live-capture.test.ts`); this report
  performed no production adapter execution.
