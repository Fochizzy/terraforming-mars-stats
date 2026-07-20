# Live-capture v2 compatibility reconciliation

- Generated at: 2026-07-20T13:45:00Z
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

This regeneration supersedes the 2026-07-19T22:45:00Z artifact, whose metric
set was corrected per audit §16: coverage is now reported per system (never
as an "either system" union), duplicate source hashes are measured in BOTH
systems, and no adapter-failure figure is reported because this script
performs no adapter execution and therefore has nothing measured to report.

## Baseline change since the audit (user-directed, not drift)

The independent audit's verified starting state recorded 42 games (41
finalized + 1 draft), 42 imports, 14,816 events, 1,500 typed placements, and
42 expansion facts. Between that verification and this regeneration, the
user directed operations in a concurrent session (player linking and
duplicate cleanup, plus deletion of the one draft game so its wrong-group
import can be retried). Cascades from that draft deletion account for every
count change: 41 games (all finalized), 41 imports, 14,402 events (−414, the
draft's), 1,467 typed placements (−33 — exactly the draft's
unresolved-attribution placements; all 1,467 remaining are attributed), and
41 expansion facts. Player rows went 28 → 25 (6 changed, 4 deleted, 1
created). No redesign session performed any of these mutations; the Step 4.3
historical-preservation check re-baselines against these figures with this
provenance instead of treating them as drift.

## Live-site v2 deployment context (verified, not assumed)

| Fact | Value |
| --- | --- |
| Ledger migration | `20260719132042 data_capture_hardening_v2` |
| Cutoff (`data-capture-hardening-v2` marker) | 2026-07-19 13:20:42Z |
| Parser deployed | 2026-07-19 13:24:14Z (`tm-data-capture-v2`) |

## Reconciliation counts

| Measure | Count |
| --- | ---: |
| Total games | 41 |
| **Legacy system** | |
| Games with legacy source data | 41 |
| Games with a server-derived input hash | 41 |
| Legacy imports with canonical events | 41 |
| Games with legacy canonical events | 41 |
| Games with legacy typed placements | 41 |
| **v2 system** | |
| Games with v2 source records | 0 |
| Games with v2 parser runs | 0 |
| Games with canonical v2 events | 0 |
| Games with canonical v2 placements | 0 |
| **Adapter servability (from stored facts; no adapter executed)** | |
| Adapter-compatible via a supported v2 run | 0 |
| Requiring the legacy fallback | 41 |
| Missing-source cases (neither system) | 0 |
| **Expansion facts** | |
| Games with expansion state | 41 |
| Games missing expansion state | 0 |
| **Parser versions** | |
| v2 versions observed | *(none yet)* |
| Unsupported v2 contract versions | 0 |
| Legacy versions observed | `manual-web-import-v2` |
| **Integrity** | |
| v2 runs missing a source record | 0 |
| Legacy imports missing an input hash | 0 |
| **Duplicate identities (both systems)** | |
| Duplicate legacy source hashes | **1** |
| Legacy imports sharing a duplicate hash | **2** |
| Duplicate v2 source hashes | 0 |
| Duplicate v2 event identities | 0 |
| Duplicate v2 placement identities | 0 |
| Duplicate legacy event identities | 0 |
| Duplicate legacy placement identities | 0 |

## The legacy duplicate source pair (data-integrity follow-up)

One source hash backs two finalized games — the previous artifact's "no
duplicate source hashes … in either system" claim was wrong because the
script never measured legacy source hashes:

| Fact | Value |
| --- | --- |
| `input_sha256` | `04d2e3feb0e82e0302d500e9255229d7c92a2c151863aca9b68fd432c45cd1d7` |
| Games (import order) | `30750df1-38a1-4ae4-a10c-4571752c3315`, `784f9a7c-be97-43cb-bb1a-35332909e8b5` |
| Both statuses | `finalized` |

Resolving this pair is a **separately authorized production data-integrity
follow-up** — this reconciliation and the Step 4.3 remediation do not mutate
or delete either game. The remediated import action now detects and blocks
this class of duplicate at import time (`find_duplicate_game_log_import` +
classified match review) unless the importer explicitly acknowledges it.

## Expansion-state distribution

| Venus state | Colonies state | Games | Non-null final Venus | Backfilled |
| --- | --- | ---: | ---: | ---: |
| `historical_parser_verified_owner_confirmed_absent` | `historical_parser_verified_owner_confirmed_absent` | 41 | 0 | 41 |

## Interpretation

- Production is **post-v2-deployment but pre-first-v2-capture**: the capture
  schema, catalogs, and cutoff marker exist, and every capture data table is
  empty because no real import has happened after the cutoff.
- All 41 games resolve through the adapter's **legacy** origin; none is
  treated as parser failure or confirmed absence for lacking v2 rows.
  Adapter-compatibility figures above are derived from stored facts
  (supported-run presence), not from executing the adapter — no adapter
  failure rate is claimed because none was measured.
- The 41 expansion-state rows all carry the historical
  parser-verified/owner-confirmed absence state with **null** final Venus —
  missing, never zero.
- The one duplicate source hash is a real, preserved legacy fact awaiting its
  separately authorized follow-up; every other identity space is
  duplicate-free in both systems.
