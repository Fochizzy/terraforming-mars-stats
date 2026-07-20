# A-01 — Extended analytics silently render empty when queries fail or time out

Investigation and code-only remediation candidate, prepared 2026-07-20 on
`fix/extended-analytics-timeouts` (base `release/step-43-production-compatibility`
@ `e0e24f269`). Production access was read-only throughout; zero database
mutations were made. **Not deployed.**

## Reproduced symptom

Live production screenshots (individual-scope Insights, Overall/cross-group
sections) showed:

- Real per-player metrics rendering correctly (Insight Cards, Expanded
  Individual Metrics — both backed by RPCs/other data paths).
- Every group-scoped extended-analytics card (Table Size, Game Length, Map
  Performance, Lineup Effects, Milestone Economics, Award Economics,
  Most-Played Card Outcomes, Tag Outcomes, Game Pace Replay, Board Heatmap)
  showing the generic "will appear after finalized games are logged" copy —
  for a player with real, finalized game history.
- The player-comparison "Tag profiles" / "Preferred corporations and
  Preludes" cards showing "0 games" and permanent "will appear after..."
  messaging for both compared players.

## Root causes (two, independent)

### 1. Promise.all all-or-nothing amplification (the primary A-01 cause)

`getExtendedGroupAnalytics`, `getOverallExtendedAnalytics`
(`src/lib/db/extended-analytics-repo.ts`) and `getOverallGroupAnalytics`
(`src/lib/db/analytics-repo.ts`) each fan out 6–15 independent
`analytics.<view>` reads via a single `Promise.all`. If **any one** view call
rejects — most commonly a statement timeout — the whole batch rejects, the
caller's `getOverallAnalytics` rejects, and the top-level
`loadInsightsDataOrDefault` in `src/app/(app)/insights/insights-page.tsx`
substitutes a fully-empty fallback object. Every section fed by that object
renders as if there were zero finalized games, even though most of the
individual queries in the batch succeeded and had real rows.

Confirmed with `pg_stat_statements` on production (project `qjtwgrjjwnqafbvkkfex`):

| View | mean exec | max exec | calls (sampled window) |
|---|---|---|---|
| `analytics.player_card_outcomes` | ~1.4–5.6s | up to 7.99s | hundreds |
| `analytics.game_tile_placements` | ~2.4–3.0s | up to 7.99s | hundreds |
| `analytics.player_tag_outcomes` | ~1.4–2.2s | up to 7.9s | hundreds |

The `authenticated` role's statement timeout is 8s. Max-exec values clustering
at 7.5–8.0s, combined with real `"canceling statement due to statement
timeout"` (57014) entries in the same log window, confirm these three views
are intermittently exceeding the timeout under real production load — not a
one-off or tooling artifact.

These three views already went through one optimization pass
(`20260713120000`–`20260713121000`): each is now backed by a
`SECURITY DEFINER stable` `..._for_caller()` function that checks group
membership once per game instead of via per-row RLS. That cut latency from the
~10–13s the DB previously needed (per prior investigation) down to the
1.4–5.6s mean seen today — a real improvement, but not enough headroom under
load, because the function is opaque to the query planner: PostgREST's
`group_id`/`event_type` filters can't be pushed inside it, so the function
must fully materialize every visible event before the outer query filters it
down. This residual performance gap is **not fixed in this candidate** — see
"Not included" below.

Grants and RLS were audited and are correct (SELECT is `authenticated`-only
on all three views, no anon exposure, no missing grants). This is a
performance/error-handling problem, not a privilege problem.

### 2. `PlayerComparisonSummary` leaderboard wiring bug (independent, always-on)

`GroupAnalytics.leaderboardRows` is *intentionally* always empty for the
Overall/cross-group scope (`getOverallGroupAnalytics`'s doc comment: "the
leaderboard / score / coverage / head-to-head / trend fields stay empty
because the dashboard sources those from the focus bundle in Overall scope").
`src/features/insights/insights-dashboard.tsx` correctly computes a real,
populated `overallLeaderboardRows` from `focusPeople[].bundle.performance`
for its own leaderboard table — but `PlayerComparisonSummary` was passed the
raw `overallAnalytics` object instead, whose `leaderboardRows` is always `[]`
by design. Every comparison showed "0 games" for both players regardless of
whether any query failed. This is unrelated to timeouts.

## array_agg error — unresolved, not attributed to A-01

One `"array_agg" is an aggregate function` Postgres error appeared in the
production log window under investigation, with no accompanying query text.
It sits in a ~30-second cluster of `permission denied for function
list_claimable_player_profiles` errors and other clearly manual/tooling
traffic (matching the pattern `DEPLOY-STATE.md` already attributes to a prior
session's schema-probe script). Every `array_agg` usage found in migrations
and in `pg_stat_statements` (introspection queries, `player_card_outcomes`
migration bodies) is well-formed. Classified **unresolved — insufficient
correlation**; do not attribute to A-01 without further evidence.

## Remediation implemented (code-only)

1. `extended-analytics-repo.ts`: `getExtendedGroupAnalytics` and
   `getOverallExtendedAnalytics` now settle each of their per-view fetches
   independently (`settleExtendedFetch`) instead of failing the whole
   `Promise.all`. A failed fetch degrades to `[]` for that field alone and is
   recorded by key in a new `unavailableSections: string[]` field on
   `ExtendedGroupAnalytics` (optional, defaults to unset/empty — existing
   callers unaffected).
2. `analytics-repo.ts`: `getOverallGroupAnalytics`'s 6-view fan-out gets the
   same treatment, with a matching optional `unavailableSections` on
   `GroupAnalytics`.
3. `insights-dashboard.tsx`: fixed the leaderboard wiring bug —
   `PlayerComparisonSummary` now receives `overallLeaderboardRows` grafted
   into its `analytics` prop instead of the always-empty raw one.
4. `player-comparison-summary.tsx`: `TagProfileCard` and `PairingCard` now
   render a distinct "temporarily unavailable" message (not the generic
   "will appear after..." copy) when `unavailableSections` shows their
   backing query failed, while still rendering any sibling data that
   succeeded. No internal schema/query details are exposed to the client —
   only a generic unavailability message.

### Not included in this candidate (flagged for a follow-up)

- The other ~10 extended-analytics section components (Board Heatmap, Card
  Outcomes, Tag Outcomes, Milestone Economics, Award Economics, Game Pace
  Replay, Table Size, Game Length, Map Performance, Lineup Effects) still
  render generic "not logged yet" copy on failure. The data layer now
  exposes `unavailableSections` for all of them; wiring the same
  unavailable-vs-empty distinction into each section component is
  mechanical and low-risk, but out of scope for this bounded pass.
  `PlayerComparisonSummary` was fixed end-to-end as the concrete example
  (this is what the screenshots directly evidenced) and to prove the
  pattern with a regression test.
- A database-side fix (parameterizing `player_card_outcomes_for_caller()` /
  `player_tag_outcomes_for_caller()` / a new `game_tile_placements_for_caller()`
  to accept the group scope and push filters in, avoiding full
  materialization) would close the residual timeout gap directly. This is a
  SECURITY DEFINER function *signature* change with dependent-view
  recreation — higher risk, needs its own clean-baseline/upgrade/repeat
  validation pass. **No migration is included in this candidate** — see the
  owner decisions in the final report.

## Validation

- `npx tsc --noEmit` — clean.
- `npx vitest run --no-file-parallelism` — full suite; see final report for
  counts.
- `npm run lint` — clean (only pre-existing warnings, none touching changed
  files' new code).
- `npm run build` — succeeds.
- `npm run check:schema` — `Schema OK: all 51 referenced tables exist`.
- `git diff --check` — clean.
