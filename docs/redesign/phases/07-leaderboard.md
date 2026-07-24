# Phase 7 — Leaderboard

Extract formal rankings from Group Insights into a dedicated, explainable destination.

> **Source authority:** The latest explicit user decision from the analytics-decisions session on 2026-07-21 supersedes the Word guide only where the guide names weighted score as the overall ranking method or a carried-forward metric. The Word guide remains authoritative for Phase 7's route, six-step sequence, dashboard composition, placement analysis, filters, privacy, validation, handoff process, and stop conditions.
>
> **Preservation rule:** The source steps, their order, dependencies, and stop conditions are unchanged. The stage headings below only divide each source step into smaller reviewable checkpoints using the established `Read → Inspect → Plan → Implement → Test → Render/Review → Document → Commit → Handoff` process.
>
> **Decision effect:** Overall leaderboard rank is now seasonal ELO. The existing GroupDashboard weighted-score calculation is a retirement target, not a calculation to reuse or preserve as a leaderboard metric.

> **SUPERSEDED IN PLACE by owner ruling R-14 (2026-07-23) — wins-based eligibility.**
> This document previously required **"minimum-wins eligibility"**. That was wrong **in
> kind**, not merely in value: the eligibility rule counts **games played**, not wins.
> The affected site now **points at** the rule instead of restating it —
> `docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md` → "Universal
> eligibility floor and per-metric display gates (owner ruling R-14, 2026-07-23)", whose
> ruling text is recorded as **R-14** in `docs/redesign/DECISIONS.md`. **No threshold
> value is restated here; the contract holds the number** (process rule P-2,
> `docs/redesign/MASTER-RULES.md`).
>
> **Corrected in this document:** the win point differential item under
> `Acceptance checklist`.
>
> **Deliberately not corrected.** (1) `Cross-cutting contract — Win point differential
> analysis` still reads "Require a visible minimum number of qualifying wins". R-14 allows
> **per-metric** thresholds above the games-played floor, and whether a win-margin metric's
> own threshold may be counted in qualifying wins is exactly **open analytics question
> Q-1** — correcting it would require inventing the mechanism Q-1 defers, so it was left
> untouched. (2) This document's `Minimum games` filter field and its `minimum-games`
> filter references are **games-based and already correct** — they are population filters,
> not the eligibility rule. (3) The `qualifying-win aggregation` test line asserts an
> aggregation property, not eligibility.
>
> The pre-correction wording is retained in git history rather than in a per-site banner —
> a deliberate departure from per-site marking, recorded in the handoff.

## Status

Phase 7 is **planned and not started** unless `docs/REDESIGN_STATE.md` and a later explicit owner assignment say otherwise.

This methodology decision:

- defines Phase 7's ranking approach ahead of implementation;
- does not authorize Phase 7 implementation;
- does not authorize schema, view, RPC, RLS, query, migration, backfill, production-data, Storage, push, deployment, or other production work; and
- does not resolve the deferred values and presentation choices listed below.

## Superseding ranking decision

The following rules replace the Word guide's weighted-score ranking assumptions.

### Canonical overall ranking

- The overall leaderboard rank is an **ELO rating**, not a weighted-score composite.
- The existing GroupDashboard weighted-score calculation must not be carried forward as the ranking basis.
- Weighted score must not remain as a leaderboard metric column or metric-ranking mode.
- Per-metric rankings remain separate and continue to include supported measures such as win rate, average score, average placement, win point differential, and points per generation.
- The Phase 7 acceptance criterion is **one canonical ELO rating calculation exists**, replacing the former weighted-score criterion.

### Opponent-weighted ELO behavior

- Use an AsoBrain-style opponent-weighted ELO approach through the standard ELO expected-score term.
- Beating a higher-rated opponent produces a larger gain than beating a lower-rated opponent.
- Losing to a lower-rated opponent produces a larger loss than losing to a higher-rated opponent.
- The opponent-strength term is the reason ELO replaces weighted score: the overall ranking must account for who was at the table.

### Multiplayer decomposition

For a game containing `N` ranked players:

- compare each player with every other player in the game;
- assign a pairwise result of `1` against a player who finished lower;
- assign a pairwise result of `0` against a player who finished higher;
- assign a pairwise result of `0.5` when the two players have an equal finish;
- calculate every pairwise expectation from the players' **pre-game** ratings;
- sum the player's pairwise ELO changes; and
- normalize the per-game K contribution by table size, using division by `N - 1` as the approved behavior so larger tables do not create proportionally larger rating swings.

The table-size normalization factor must be centralized and configuration-adjustable. All players' post-game ratings must be derived from the same pre-game rating snapshot; do not update one player and then use that changed value while processing another player from the same game.

### Pure ELO

- Use pure ELO, not Glicko-2.
- Do not introduce rating deviation, volatility, uncertainty intervals, or a Glicko provisional model.
- The visible **Confidence** marker is sample-based reliability information derived from games played and provisional status. It is not a statistical uncertainty estimate.

### Visibility and provisional state

- A player appears after the player's first eligible game.
- There is no hidden provisional period.
- A low-game rating remains visible and is marked provisional through the Confidence presentation.
- The exact provisional threshold, minimum-history threshold, and Confidence cutoffs remain deferred and must be approved before their dependent behavior is finalized.

### Seasonal rating scopes

Run the same canonical ELO engine in two independent scopes:

1. **Quarter rating**
   - hard-resets to `1500` at each calendar-quarter boundary;
   - includes only games inside that calendar quarter; and
   - is recomputed chronologically from the quarter baseline.

2. **Year rating**
   - hard-resets to `1500` at each calendar-year boundary;
   - includes all eligible games inside that calendar year; and
   - is an independent chronological replay of the year's games, not an average or continuation of the four quarter ratings.

No all-time ELO scope is approved in Phase 7. A future all-time scope may reuse the same engine over an unbounded window only after a separate decision.

### Deterministic replay and no future leakage

- Each rating scope is a deterministic chronological replay over its own period.
- Order games by played date, then by stable game ID as the tie-breaker.
- Import order, insert order, database row order, and later correction-processing order must not change the result.
- A rating “as of” date `D` uses only eligible games whose played date is on or before `D` within the selected period.
- Every update uses only the pre-game ratings available at that point in the replay.
- Quarter and year boundaries must use one fixed project timezone. The timezone remains `[TIMEZONE TO PIN]` until explicitly decided.

### Rating exclusions

- Point margin does not scale ELO changes.
- Win point differential remains a separate descriptive metric and ranking mode.
- Do not double-count margin by using it in both ELO and win-differential analysis.
- Do not add AsoBrain's large-ladder top cap or a “#1 is always reachable” mechanic.
- Do not soft-carry ratings across quarter or year boundaries.

### Centralized configuration

Centralize and document:

- starting rating: `1500`;
- K-factor;
- table-size normalization behavior;
- any later approved ELO scale or AsoBrain-parity parameter;
- provisional and minimum-history thresholds after approval;
- Confidence cutoffs after approval;
- fixed period timezone after approval; and
- any display precision or refresh policy required by the final implementation contract.

Do not scatter these values across queries, components, SQL, tests, or route loaders. Exact AsoBrain K-factor and parity values were not retrieved and must not be guessed.

## Deferred decisions that remain open

| Deferred item | Why it matters | Required disposition |
| --- | --- | --- |
| Provisional threshold | Controls when Confidence stops showing provisional status | Explicit owner decision before final eligibility and Confidence behavior |
| Minimum-history threshold | Controls eligibility language and any minimum-games filter defaults | Explicit owner decision before final ranking eligibility behavior |
| Confidence cutoffs and labels | Defines sample-based reliability categories | Explicit owner decision before final UI copy and tests |
| Phase 7 / Phase 17 boundary details | Prevents duplicate opponent-adjustment products | Preserve the boundary in this file; resolve any overlapping formula before implementation |
| Equal-ELO ranking tie-break | Required for deterministic displayed rank order | Explicit owner decision before final ranking sort contract |
| Missing-data handling | Defines treatment of missing date, placement, player, or completion evidence | Explicit owner decision before rating inclusion/exclusion is finalized |
| Refresh copy and timing | Defines when users are told ratings were recomputed | Explicit owner decision before methodology and status copy is finalized |
| Default headline scope | Determines whether Quarter or Year opens first | Explicit owner decision before final URL defaults and navigation behavior |
| Period timezone | Determines quarter/year boundaries | Pin one fixed timezone before period-boundary implementation is accepted |

Until these decisions are recorded, implementation must expose the unresolved dependency rather than silently choosing a value.

## Recommended agent and effort

| Field | Recommendation |
| --- | --- |
| Preferred execution | Codex |
| Recommended configuration | GPT-5.6 Sol — Extra High — Standard |
| Acceptable alternate | Claude Opus 4.8 — xhigh effort |
| Independent reviewer | Claude Opus 4.8 — xhigh for ELO math, period semantics, eligibility, and presentation review |
| Handoff sensitivity | Critical |
| Recommended handoff pattern | Codex implements one canonical deterministic ELO engine, repository outputs, and tests. Claude independently reviews pairwise decomposition, table-size normalization, resets, no-future-leakage behavior, eligibility, privacy, and methodology copy. |

| Stop rule | Complete only this phase or its explicitly assigned substep. Commit, write the handoff file, and stop before beginning the next phase. |
| --- | --- |

## Outcome of this phase

A dedicated `/leaderboard` destination with:

- seasonal quarter and year ELO overall rankings;
- supported per-metric rankings;
- placement analysis;
- filters and shareable state;
- sample-based Confidence presentation;
- visible eligibility and methodology;
- synchronized ranking, player detail, and supporting evidence; and
- a compact Group Insights preview rather than a second full leaderboard.

## Why this phase comes now

A leaderboard is a formal ranking product with its own population, chronology, opponent-strength model, eligibility rules, scope, and methodology. It must not remain embedded as an unexplained subsection of Group Insights.

## Prerequisites

- Phase 6 public player-name resolution and privacy-safe player DTOs are complete and accepted.
- Finalized-game inputs required by ELO are inventoried, including stable player IDs, played date, completion eligibility, finishing order, and equal-finish semantics.
- Existing group and player filters are available through the canonical analytics filter and URL-state contracts.
- The current GroupDashboard ranking rows and weighted-score implementation are identified so they can be retired safely rather than copied into the new leaderboard.
- The project has one documented source of truth for winner, placement, and tied-finish behavior.
- Deferred decisions required by a substep are explicitly resolved before that dependent behavior is accepted.

## Inspect before editing

- GroupDashboard leaderboard rows and top-player preview behavior.
- Existing weighted-score formula, tests, consumers, exports, and labels that must be retired from ranking use.
- Existing win-rate, score, placement, score-differential, and win-differential calculations.
- Finalized-game repository outputs and stable player IDs.
- Played-date storage, date parsing, corrections, and current timezone conventions.
- Winner, rank, placement, tied-first, and equal-finish semantics.
- Current player-search, group, map, player-count, date, and minimum-sample filters.
- Existing focus-player highlighting and public player-name resolver.
- Current ranking tests, data refresh behavior, cache behavior, and URL state.
- Phase 17 planning documents to ensure ELO ranking does not absorb the separate opponent-adjusted margin and board-intelligence work.

## Do not do in this phase

- Do not preserve, recreate, or rename weighted score as the overall ranking basis.
- Do not carry weighted score forward as a metric-ranking column.
- Do not implement Glicko-2, rating deviation, volatility, or a statistical Confidence interval.
- Do not scale ELO updates by point margin, win point differential, corporation, map, game length, or any unapproved performance modifier.
- Do not add a large-ladder top cap, rank compression, or “#1 always reachable” mechanic.
- Do not soft-carry a prior quarter or year rating into the next period.
- Do not create an all-time rating scope without a later explicit decision.
- Do not hide players until they leave provisional status.
- Do not invent the K-factor, provisional threshold, minimum-history threshold, Confidence cutoffs, default scope, equal-rating tie-break, missing-data policy, refresh copy, or period timezone.
- Do not fabricate placement distributions.
- Do not remove the Group Insights preview until `/leaderboard` works and its replacement link is verified.
- Do not begin Phase 17 opponent-adjusted margins, expected-score analysis outside the ranking engine, or board intelligence.

## Canonical ELO calculation contract

For player `i` against player `j`, using their ratings immediately before the game:

```text
expected(i, j) = 1 / (1 + 10 ^ ((rating(j) - rating(i)) / 400))
```

For an `N`-player game:

```text
pairwise_result(i, j) = 1.0 when i finishes above j
pairwise_result(i, j) = 0.5 when i and j have an equal finish
pairwise_result(i, j) = 0.0 when i finishes below j

game_delta(i) = K / (N - 1) * Σ(pairwise_result(i, j) - expected(i, j))
new_rating(i) = pre_game_rating(i) + game_delta(i)
```

Contract requirements:

- `K` is centralized configuration.
- The approved starting rating is `1500`.
- Division by `N - 1` is the approved table-size normalization behavior and must remain configurable through one central contract.
- Every `expected(i, j)` value uses the same pre-game rating snapshot.
- Apply all game deltas simultaneously after every player's delta is calculated.
- Equal finish means `0.5` for that pair regardless of whether the tie is for first or another placement.
- The engine consumes finishing order, not point margin.
- Quarter and year calculations call the same engine with different bounded game windows and separate `1500` resets.
- Do not silently change the ELO formula or rating scale in a UI component, SQL view, test fixture, or period-specific adapter.

## Expanded working sequence

The original six source steps remain in the same order. Each row is a bounded assignment and must end with validation, documentation, a clean focused commit, and a handoff.

| Source step | Bounded execution result | Stop condition |
| --- | --- | --- |
| 7.1 — Create overall ranking | Canonical deterministic quarter/year ELO engine and overall ranking surface | Commit and hand off Step 7.1; do not begin Step 7.2 |
| 7.2 — Add metric rankings | Supported non-weighted-score metric rankings alongside ELO | Commit and hand off Step 7.2; do not begin Step 7.3 |
| 7.3 — Add placement analysis | Real placement rates and distributions or honest unavailable states | Commit and hand off Step 7.3; do not begin Step 7.4 |
| 7.4 — Add filters | Canonical filters plus seasonal ELO scope and period state | Commit and hand off Step 7.4; do not begin Step 7.5 |
| 7.5 — Add methodology | Visible ELO, eligibility, tie, missing-data, scope, and refresh methodology | Commit and hand off Step 7.5; do not begin Step 7.6 |
| 7.6 — Clean Group Insights | Compact top-player preview and verified Leaderboard link after migration | Commit and hand off Step 7.6; stop for Phase 7 closure review |

## Step 7.1 — Create overall ranking

### Source-defined scope, revised by the ELO decision

- Rank
- Player
- ELO rating
- Rating scope and period
- Games
- Wins
- Win rate
- Average placement
- Score or differential
- Confidence
- Current-user highlight

### Stage A — Preflight and existing-contract inspection

- Confirm Phase 6 and every required earlier dependency are complete, committed, documented, and accurately represented in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, worktree state, and exact review range.
- Read `AGENTS.md`, `CLAUDE.md`, `docs/redesign/MASTER-RULES.md`, `docs/redesign/DECISIONS.md`, `docs/REDESIGN_STATE.md`, this phase file, the latest relevant handoff, and the public-name privacy contract.
- Locate all existing leaderboard rows, weighted-score code, sorting, focus-player logic, repository outputs, refresh paths, and tests.
- Trace the complete finalized-game input needed for ELO: game ID, played date, eligible completion state, stable player ID, and finishing order including equal finishes.
- Identify how corrected or late-imported games are represented so deterministic replay can ignore insertion order.
- Compare current date handling with the unresolved fixed period-timezone requirement.
- Return a pre-edit report containing:
  - the weighted-score retirement map;
  - the proposed canonical ELO module and repository boundaries;
  - every ELO input and its evidence source;
  - unresolved decisions that block implementation or acceptance;
  - expected files to change; and
  - the exact targeted tests to add.
- Do not edit until missing ranking inputs, conflicting placement semantics, or unresolved authority are recorded and assigned.

### Stage B — Define the bounded ELO contract

- Define one typed ELO configuration contract containing the approved `1500` baseline, K-factor placeholder or approved value, and table-size normalization behavior.
- Define one typed eligible-game input containing stable game ID, played date, player IDs, and comparable finishing outcomes.
- Define quarter and year period-window functions that use the same fixed timezone after it is approved.
- Define deterministic ordering by played date and stable game ID.
- Define rating-as-of behavior that truncates the replay at the requested date without reading later games.
- Define pairwise outcomes for higher, lower, and equal finishes.
- Define simultaneous per-game updates from one pre-game snapshot.
- Define separate quarter and year outputs; the year output must not derive from quarter results.
- Define the ranking row separately from the per-metric ranking row.
- Define Confidence as games-played/provisional presentation, not ELO uncertainty.
- Define the first-game visibility rule.
- Record the unresolved equal-ELO display tie-break, missing-data policy, provisional thresholds, Confidence cutoffs, period timezone, and default headline scope. Do not choose them implicitly.
- Keep public player labels resolved through the centralized privacy-safe player-name contract.

### Stage C — Implement the source step

Implement the approved source requirements in this order:

- [ ] Rank
- [ ] Player
- [ ] ELO rating
- [ ] Quarter/year scope and selected period
- [ ] Games
- [ ] Wins
- [ ] Win rate
- [ ] Average placement
- [ ] Score or differential
- [ ] Confidence
- [ ] Current-user highlight

Implementation requirements:

- Create one canonical ELO engine outside presentation JSX.
- Recompute each requested period deterministically from eligible games in that period.
- Start every quarter and year replay at `1500`.
- Use pre-game ratings for all pairwise expectations and apply deltas simultaneously.
- Normalize multiplayer game impact by table size through the central configuration.
- Make the quarter and year results independent.
- Expose a rating-as-of input only through canonical validated URL or repository state if that behavior is included in the assigned substep.
- Show players after their first eligible game and mark low-history rows through Confidence rather than hiding them.
- Remove weighted score from the overall ranking DTO, table, chart, detail panel, export, URL metric state, and methodology copy.
- Preserve current-user highlighting with text or another non-color cue.
- Preserve group scope, authorization, stable IDs, direct links, responsive website behavior, and public-name privacy.

### Stage D — Integration, evidence, and interface review

- Verify quarter and year ratings use the same engine but different windows and resets.
- Verify a year's rating is not an average, merge, or continuation of quarter ratings.
- Verify an upset changes ratings more than the expected favorite winning, with the same K and pre-game ratings.
- Verify larger tables do not create unnormalized rating swings.
- Verify point margin cannot change an ELO result when finishing order is unchanged.
- Verify late import or row insertion order cannot change a replay result.
- Show rating scope, period, games played, provisional/Confidence state, and last refresh or as-of context wherever users could otherwise misread the number.
- Provide loading, empty, unavailable, partial, excluded-game, and unresolved-methodology states without converting them to `1500`, zero, or a completed rating.
- Inspect desktop, tablet, and narrow layouts; keyboard operation; visible focus; row selection; text/table alternatives; and current-user highlighting.

### Stage E — Validation, documentation, commit, and handoff

Add focused tests for:

- equal-rating expected score;
- favorite win versus upset change magnitude;
- two-player win, loss, and tie;
- three-, four-, and five-player pairwise decomposition;
- equal finishes at multiple placement levels;
- `N - 1` table-size normalization;
- one pre-game snapshot and simultaneous game updates;
- deterministic ordering by played date and game ID;
- import/insert-order independence;
- rating-as-of cutoff with no future leakage;
- quarter reset to `1500`;
- year reset to `1500`;
- independent year recomputation rather than quarter averaging;
- period-boundary behavior after the timezone is pinned;
- unchanged ELO when only point margin changes;
- first-game visibility;
- provisional/Confidence behavior after thresholds are approved;
- public-name privacy and neutral fallback; and
- absence of weighted score from the new ranking contract.

Then:

- run targeted tests before the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`;
- record commands, exit codes, test counts, warnings, skipped checks, environment limits, and pre-existing failures;
- capture and inspect responsive screenshots for the implemented route;
- update state, decisions, capability documents, and the immutable Step 7.1 handoff;
- document exact configuration values and unresolved placeholders;
- commit only Step 7.1; and
- stop before Step 7.2.

### Step 7.1 completion gate

- [ ] One canonical pure-ELO engine exists.
- [ ] Starting rating is `1500` through centralized configuration.
- [ ] Multiplayer outcomes use pairwise finishing-order comparisons.
- [ ] Pairwise deltas are normalized by table size.
- [ ] Every game uses one pre-game rating snapshot and simultaneous updates.
- [ ] Quarter and year scopes hard-reset and recompute independently.
- [ ] Chronological replay is deterministic and import-order independent.
- [ ] Rating-as-of behavior has no future leakage when exposed.
- [ ] Margin is excluded from ELO.
- [ ] Players appear after the first eligible game.
- [ ] Confidence is sample-based and is not represented as Glicko uncertainty.
- [ ] Weighted score is absent from the new overall ranking contract.
- [ ] Public player labels use the centralized resolver.
- [ ] Deferred decisions were resolved explicitly or remain visible blockers; none were guessed.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] Step 7.2 has not begun.

## Step 7.2 — Add metric rankings

### Source-defined scope, revised by the ELO decision

- Win rate
- Average score
- Average placement
- Score differential
- Points per generation
- Recent form if supported
- Average win point differential
- Median win point differential
- Largest and closest qualifying win
- Close-win and decisive-win rates

Weighted score is intentionally absent. ELO remains the canonical overall ranking rather than a weighted-score metric mode.

### Stage A — Preflight and existing-contract inspection

- Verify the accepted Step 7.1 commit, handoff, ELO configuration, and ranking-row contract.
- Confirm the worktree is clean or every unrelated file is documented.
- Inspect each existing metric formula, denominator, filter path, eligibility rule, format, and test.
- Confirm win point differential uses the canonical winner-to-highest-opponent margin and is not confused with ELO, overall point differential, loss deficit, or head-to-head differential.
- Identify unsupported metrics before designing the switcher.
- Search for weighted-score options or labels that would accidentally remain in metric selection.

### Stage B — Define the metric-ranking contract

For each supported metric, define:

- canonical formula owner;
- direction of better performance;
- denominator and sample;
- required eligibility threshold;
- tie and missing-data behavior;
- filter compatibility;
- sort behavior and stable secondary ordering;
- display unit and formatter;
- supporting-game evidence; and
- whether the metric is available, partial, or unavailable.

Keep ELO-specific opponent weighting inside the ELO engine. Do not reinterpret ordinary metrics as ELO inputs or use ELO to adjust their displayed raw values.

### Stage C — Implement the source step

Implement the supported metric rankings in this order:

- [ ] Win rate
- [ ] Average score
- [ ] Average placement
- [ ] Score differential
- [ ] Points per generation
- [ ] Recent form if supported
- [ ] Average win point differential
- [ ] Median win point differential
- [ ] Largest and closest qualifying win
- [ ] Close-win and decisive-win rates

Implementation requirements:

- Keep the overall ELO ranking and metric-ranking modes visually and semantically distinct.
- Do not include weighted score in the metric switcher, URL state, table, chart, export, or methodology.
- Show sample sizes and eligibility for every metric.
- Use lower-is-better labels for placement.
- Preserve qualifying-win counts and total games for win-differential rankings.
- Keep win margin separate from ELO and do not use it to scale ratings.
- Synchronize selected player across ranking, distribution, detail, and supporting-game evidence.

### Stage D — Integration, evidence, and interface review

- Verify switching metrics does not mutate the selected ELO scope or period unexpectedly.
- Verify player order, units, direction labels, and samples update coherently.
- Verify unavailable or insufficient metrics remain explicit and do not fall back to ELO or zero.
- Pair win-differential ranking with a distribution or box plot and selected-player detail containing median, closest win, largest win, close/decisive rates, trend, and supporting games when data supports them.
- Review desktop, tablet, and narrow layouts and accessible ranking-table alternatives.

### Stage E — Validation, documentation, commit, and handoff

- Test metric selection and URL restoration.
- Test lower-is-better sorting.
- Test null metrics, ties, stable secondary ordering, low samples, threshold boundaries, and filtered populations.
- Test multiplayer runner-up selection, tied-first outcomes, missing scores, and qualifying-win aggregation.
- Test that weighted score is unavailable as a ranking metric.
- Run targeted and applicable full checks, record exact results, update state and handoff documents, commit only Step 7.2, and stop.

### Step 7.2 completion gate

- [ ] All supported non-weighted-score metric rankings use canonical formulas.
- [ ] Weighted score is not present as a ranking metric.
- [ ] ELO remains the overall ranking and is not conflated with descriptive metrics.
- [ ] Samples, eligibility, direction, ties, and missing data are visible.
- [ ] Win point differential remains separate from ELO and other differential metrics.
- [ ] Selected-player evidence stays synchronized.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] Step 7.3 has not begun.

## Step 7.3 — Add placement analysis

### Source-defined scope

- First-place rate
- Top-two rate
- Podium rate
- Lower-place rate
- Player distribution

### Stage A — Preflight and existing-contract inspection

- Verify Step 7.2 is accepted and committed.
- Inspect canonical placement, rank, tie, player-count, and eligibility data.
- Confirm whether top-two and podium definitions vary by table size and record the existing product convention.
- Determine whether real placement distributions can be queried for every intended population.
- Do not use ELO as a substitute for missing placement evidence.

### Stage B — Define the placement contract

- Define the denominator for each placement rate.
- Define tied-placement handling without silently promoting or demoting a player.
- Define table-size compatibility for top-two, podium, and lower-place categories.
- Define player-distribution bins and minimum-sample behavior.
- Define interaction with Quarter/Year scope, group, player count, map, and other filters.
- Keep placement statistics descriptive and separate from the ELO update calculation, while using the same canonical finishing-order evidence.

### Stage C — Implement the source step

Implement in the original order:

- [ ] First-place rate
- [ ] Top-two rate
- [ ] Podium rate
- [ ] Lower-place rate
- [ ] Player distribution

- Use real repository data and canonical tie semantics.
- Synchronize selected player with ranking and detail panels.
- Show unavailable or partial states when the repository cannot support a requested distribution.
- Do not fabricate bins from averages or final scores.

### Stage D — Integration, evidence, and interface review

- Verify placement analysis respects the same eligible population and filters as the active view.
- Verify selecting a player in the ELO ranking highlights the same player in placement analysis and detail.
- Show denominator, game count, table-size context, and tie handling.
- Inspect accessible summaries and table alternatives.

### Stage E — Validation, documentation, commit, and handoff

- Test first, top-two, podium, lower-place, and distribution calculations.
- Test ties, different table sizes, missing placement, incomplete games, filtered populations, and insufficient samples.
- Run targeted and applicable full checks, update documentation and the Step 7.3 handoff, commit only this step, and stop.

### Step 7.3 completion gate

- [ ] First-place rate is real and tested.
- [ ] Top-two rate is real and tested.
- [ ] Podium rate is real and tested.
- [ ] Lower-place rate is real and tested.
- [ ] Player distribution is real or honestly unavailable.
- [ ] Tie and table-size semantics are visible.
- [ ] Placement analysis stays separate from ELO methodology while using the same canonical finish evidence.
- [ ] Step 7.4 has not begun.

## Step 7.4 — Add filters

### Original source-defined scope

- Group
- Date range if supported
- Minimum games
- Player count
- Map
- Player search

### ELO additions required by the decision

- Rating scope: Quarter or Year
- Selected calendar quarter or year
- As-of date if exposed

### Stage A — Preflight and existing-contract inspection

- Verify Step 7.3 is accepted and committed.
- Inspect canonical analytics URL-state parsers and serializers.
- Inspect existing group, date, minimum-games, player-count, map, and player-search filters.
- Identify which filters are valid for ELO, descriptive metric rankings, placement analysis, or all three.
- Confirm the default headline scope remains unresolved and is not silently encoded.
- Confirm the period timezone is pinned before accepting quarter/year boundary behavior.

### Stage B — Define the filter and URL contract

- Keep rating scope, selected period, as-of date, descriptive date range, group, player count, map, minimum games, selected metric, selected player, and search state as distinct typed fields.
- Quarter ELO must remain bound to one calendar quarter.
- Year ELO must remain bound to one calendar year.
- An arbitrary date range must not silently redefine the approved seasonal ELO window.
- If an as-of date is supported, constrain it to the selected quarter or year and replay only through that date.
- Define which filters cause a full ELO replay and which affect only descriptive metric views.
- Preserve valid state across view changes and reject invalid combinations safely.
- Do not let a minimum-games filter hide the first-game visibility rule without explicit copy explaining that the user changed the population filter.

### Stage C — Implement the source step

Implement the original filter requirements in order:

- [ ] Group
- [ ] Date range if supported
- [ ] Minimum games
- [ ] Player count
- [ ] Map
- [ ] Player search

Then implement the required ELO state:

- [ ] Quarter/Year rating scope
- [ ] Selected quarter or year
- [ ] As-of date if supported

- Persist meaningful state in the URL.
- Keep ELO period state independent from descriptive metric date filtering.
- Preserve selected player where still eligible and clear it predictably when no longer present.
- Provide active-filter labels and reset behavior.

### Stage D — Integration, evidence, and interface review

- Verify direct links and refresh restoration.
- Verify quarter/year changes trigger deterministic recomputation from the correct baseline.
- Verify filters do not accidentally reuse a rating computed for another population or period.
- Verify invalid periods, out-of-window as-of dates, and unsupported filter combinations produce safe feedback.
- Inspect responsive control layout, keyboard operation, focus, and screen-reader labels.

### Stage E — Validation, documentation, commit, and handoff

- Test URL parse/serialize round trips.
- Test quarter/year period selection and boundary cases after timezone approval.
- Test as-of date truncation and no-future-leakage behavior if exposed.
- Test group, minimum games, player count, map, search, and supported date filtering.
- Test invalid values, reset behavior, refresh restoration, direct links, and selected-player consistency.
- Run targeted and applicable full checks, update documents and the Step 7.4 handoff, commit only this step, and stop.

### Step 7.4 completion gate

- [ ] Original source filters are implemented where supported.
- [ ] Quarter/Year and selected-period state are explicit and shareable.
- [ ] ELO period windows cannot be silently replaced by arbitrary date ranges.
- [ ] As-of behavior has no future leakage when supported.
- [ ] Default headline scope and period timezone were explicitly decided rather than guessed.
- [ ] URL state restores deterministically.
- [ ] Step 7.5 has not begun.

## Step 7.5 — Add methodology

### Source-defined scope

- Formula components
- Eligibility
- Ties
- Missing data
- Scope
- Last refresh

### Stage A — Preflight and existing-contract inspection

- Verify Steps 7.1 through 7.4 are accepted, committed, documented, and reproducible.
- Collect the final ELO configuration, period timezone, eligibility rules, Confidence thresholds, tie rules, missing-data rules, default scope, and refresh behavior from approved decisions and implementation evidence.
- Compare UI copy with executable tests and repository behavior.
- Identify every surface where a user could confuse ELO with win margin, weighted score, Glicko uncertainty, or Phase 17 opponent-adjusted analysis.

### Stage B — Define the methodology disclosure

The methodology must explain, in accessible language:

- starting rating `1500`;
- standard ELO expected score;
- opponent-rating effect;
- multiplayer pairwise decomposition;
- equal-finish result of `0.5`;
- table-size normalization;
- one pre-game snapshot and simultaneous updates;
- K-factor and configuration ownership;
- quarter and year hard resets;
- independent year recomputation;
- deterministic ordering by played date and game ID;
- rating-as-of no-future-leakage behavior;
- exclusion of point margin;
- first-game visibility;
- provisional and Confidence meaning;
- ranking eligibility and minimum-history rules after approval;
- equal-ELO display tie-break after approval;
- missing and excluded game behavior after approval;
- selected scope, period timezone, and as-of context;
- last refresh or recomputation timing; and
- the explicit omission of Glicko-2, all-time rating, soft carry, and large-ladder top cap.

### Stage C — Implement the source step

Implement the original methodology categories in order:

- [ ] Formula components
- [ ] Eligibility
- [ ] Ties
- [ ] Missing data
- [ ] Scope
- [ ] Last refresh

- Place a concise summary near the ranking and provide progressive disclosure for full methodology.
- Keep formula documentation synchronized with the canonical implementation.
- Explain that Confidence is sample-based, not a statistical rating interval.
- Explain that margin is excluded from ELO and remains in separate point-differential metrics.
- Explain that Year is not an average of quarters.
- Show unresolved methodology as unresolved; do not publish placeholder values as decisions.

### Stage D — Integration, evidence, and interface review

- Verify every displayed scope and metric links to or exposes the correct methodology.
- Verify the methodology remains readable at narrow widths and is keyboard accessible.
- Verify text, tooltip, table, export, metadata, and accessible descriptions use consistent names.
- Ask the independent reviewer to reproduce representative ratings from raw game inputs and compare them with the UI.

### Stage E — Validation, documentation, commit, and handoff

- Add tests that compare methodology labels and configuration with executable behavior.
- Add representative worked-fixture tests for heads-up, multiplayer, ties, resets, and as-of replay.
- Test visibility of samples, provisional state, scope, period, and refresh context.
- Test that weighted score, Glicko terminology, margin scaling, all-time scope, soft carry, and top-cap claims are absent.
- Run targeted and applicable full checks, update decisions/state/capabilities and the Step 7.5 handoff, commit only this step, and stop.

### Step 7.5 completion gate

- [ ] Formula components are visible and match executable ELO behavior.
- [ ] Eligibility is explicit and uses approved thresholds.
- [ ] Tie handling is explicit for both game results and displayed ranking order.
- [ ] Missing-data behavior is explicit and tested.
- [ ] Quarter/Year scope, period, timezone, and as-of meaning are visible.
- [ ] Last refresh or recomputation context is visible.
- [ ] Confidence is correctly described as sample-based.
- [ ] Margin exclusion and Phase 17 boundary are clear.
- [ ] No unresolved decision was silently converted into product behavior.
- [ ] Step 7.6 has not begun.

## Step 7.6 — Clean Group Insights

### Source-defined scope

- Replace the full ranking with a top-player preview and **View Leaderboard** link after migration.

### Stage A — Preflight and existing-contract inspection

- Verify the dedicated Leaderboard route and Steps 7.1 through 7.5 are accepted and working.
- Identify every Group Insights ranking consumer, weighted-score label, ranking query, deep link, and test.
- Confirm the compact preview's scope and period so it cannot imply a different ranking from the destination.

### Stage B — Define the preview contract

- The preview uses the canonical ELO output; it does not retain the weighted-score ranking.
- The preview shows enough scope and period context to explain the result.
- The preview must not duplicate the full Leaderboard's metric switching, placement analysis, or methodology.
- The link preserves compatible group, scope, period, and selected-player context.
- Group Insights remains group scoped and does not become the owner of the formal ranking product.

### Stage C — Implement the source step

- [ ] Replace the full Group Insights ranking with a compact top-player preview.
- [ ] Add and verify the **View Leaderboard** link.
- [ ] Remove weighted-score ranking labels and obsolete full-table behavior from Group Insights.
- [ ] Preserve any unrelated group analytics and existing route compatibility.

### Stage D — Integration, evidence, and interface review

- Verify the preview and full Leaderboard agree for the same scope, period, population, and as-of context.
- Verify direct navigation and back navigation preserve compatible state.
- Verify responsive behavior, keyboard access, current-user highlighting, and public-name privacy.

### Stage E — Validation, documentation, commit, and handoff

- Add regression tests for preview data, scope, period, link state, authorization, and removal of the full embedded ranking.
- Verify no weighted-score ranking survives in Group Insights.
- Run targeted and applicable full checks, update documentation and the Step 7.6 handoff, commit only this step, and stop for Phase 7 closure review.

### Step 7.6 completion gate

- [ ] Group Insights contains only a compact ELO preview.
- [ ] **View Leaderboard** opens the canonical route with compatible context.
- [ ] Group Insights no longer owns or duplicates the full ranking product.
- [ ] Weighted-score ranking behavior is retired from Group Insights.
- [ ] Phase 8 has not begun.

## Cross-cutting contract — Win point differential analysis

- Add a dedicated metric mode for Average Win Point Differential using the canonical winner-to-runner-up margin.
- Require a visible minimum number of qualifying wins and show both qualifying wins and total games.
- Pair the ranking with a margin distribution or box plot and selected-player detail containing median, closest win, largest win, close/decisive rates, recent trend, and supporting games when supported.
- Keep Overall Point Differential and Average Loss Deficit as separate optional metric rankings with distinct labels and formulas.
- Never use point margin to scale ELO updates.
- Do not label ELO as win differential or treat win differential as opponent-adjusted ELO.

## Cross-phase boundary — Phase 7 versus Phase 17

Phase 7 owns:

- the ELO rating used for formal leaderboard rank;
- opponent-strength weighting required by the ELO expected-score term;
- deterministic seasonal rating replay; and
- ELO methodology and ranking evidence.

Phase 17 retains:

- opponent-adjusted margins;
- expected-score analysis outside the formal ELO ranking product;
- competition-context analysis;
- opponent-rating analytical modules; and
- board intelligence and spatial analysis.

Do not move Phase 17's broader opponent-adjustment, causal interpretation, or board work into Phase 7. Shared low-level rating inputs may be reused, but formulas, outputs, labels, and product questions must remain distinct.

## Cross-cutting contract — Public player labels and leaderboard privacy

- Use the centralized public player-name resolver for every player label.
- After a successful claim, show the registered username or an approved public handle.
- Never fall back to first name, last name, full name, email, authentication ID, normalized personal name, or private aliases.
- Keep original import evidence and private claim-matching data behind authenticated and authorized boundaries.
- Exclude private personal-name fields from repository outputs, route loaders, client DTOs, hydration data, APIs, RPCs, views, metadata, exports, logs, telemetry, analytics events, and user-visible errors.
- Preserve the same stable player ID and historical game relationships when public presentation changes after claim.
- Run known-test-name payload scans and verify neutral fallback behavior when username is unavailable.

## Leaderboard dashboard composition

- Combine a ranked horizontal-bar view or accessible ranking table with placement analysis, metric switching, focus-player detail, and methodology.
- Synchronize selected player across ELO ranking, metric rankings, placement analysis, detail, and supporting-game evidence.
- Keep rating scope, selected period, selected metric, filters, and selected player visible and shareable.
- Use corporation logos only where they clarify selected game or player context; an image must never be the sole accessible identifier.
- Show sample, provisional/Confidence state, period, and methodology before inviting users to overinterpret small rating differences.
- Use progressive disclosure rather than a long stack of equal-weight cards.
- Provide accessible tables and text summaries for charted rankings and distributions.

## Copy-ready agent execution prompt

Complete only the explicitly assigned Phase 7 substep. Build a dedicated `/leaderboard` route and preserve the six-step sequence in this file. Do not begin a later substep or phase.

Treat the 2026-07-21 ranking decision as authoritative: overall rank is seasonal pure ELO, not weighted score. Retire the existing GroupDashboard weighted-score calculation as the ranking basis and do not carry weighted score forward as a metric column or metric mode.

Use one canonical ELO engine with a `1500` starting rating, centralized K-factor, standard opponent expected score, multiplayer pairwise finishing-order decomposition, `0.5` for equal finishes, table-size normalization by `N - 1`, one pre-game rating snapshot, and simultaneous per-game updates. Point margin must not affect ELO.

Run independent Quarter and Year scopes. Each hard-resets to `1500` at its calendar boundary. Year is a full chronological replay of the year's games and is not an average or continuation of quarter ratings. Order games by played date and stable game ID. Rating-as-of date must replay only through that date. Import or insertion order must not affect results. Use the single approved period timezone; do not invent it.

Players appear after their first eligible game. Low-history ratings remain visible with sample-based provisional/Confidence presentation. Do not implement Glicko-2, a hidden provisional period, a large-ladder top cap, soft carry, all-time scope, or margin-scaled rating changes.

Resolve or preserve as explicit blockers the deferred provisional thresholds, minimum-history rules, Confidence cutoffs, equal-rating tie-break, missing-data handling, refresh copy, default headline scope, and period timezone. Do not guess any value.

Keep per-metric rankings, placement analysis, filters, methodology, win point differential, privacy-safe player labels, and the Group Insights preview required by the Word guide. Keep ELO distinct from win margin and Phase 17 opponent-adjusted analysis.

Before editing, return a preflight report with the input-data contract, weighted-score retirement map, expected files, deferred decisions, and test plan. After the bounded substep, run targeted and applicable full checks, update state/decision/capability/handoff documents, create one focused commit, leave the worktree clean, and stop.

## Acceptance checklist

- [ ] Dedicated `/leaderboard` works.
- [ ] One canonical ELO rating calculation exists.
- [ ] Weighted score is retired as the overall ranking basis.
- [ ] Weighted score is not carried forward as a leaderboard metric column or mode.
- [ ] ELO uses opponent-weighted expected score and pure-ELO behavior.
- [ ] Multiplayer games use pairwise finishing-order decomposition.
- [ ] Equal finishes use a pairwise result of `0.5`.
- [ ] Per-game K impact is normalized by table size through centralized configuration.
- [ ] Every game update uses one pre-game rating snapshot and simultaneous deltas.
- [ ] Quarter ratings hard-reset to `1500` and include only that quarter.
- [ ] Year ratings hard-reset to `1500` and independently replay the full year.
- [ ] No all-time scope, soft carry, Glicko-2 fields, or large-ladder top cap was added.
- [ ] Deterministic replay uses played date and stable game ID.
- [ ] Rating-as-of behavior has no future leakage when supported.
- [ ] Import or insertion order cannot change ratings.
- [ ] Point margin is excluded from ELO.
- [ ] Players appear after their first eligible game.
- [ ] Confidence is sample-based and provisional ratings remain visible.
- [ ] Deferred thresholds, tie-breaks, missing-data rules, default scope, refresh copy, and timezone were explicitly decided or remain visible blockers.
- [ ] Per-metric rankings remain available alongside ELO.
- [ ] Current user is clearly highlighted with a non-color cue.
- [ ] Methodology is visible and matches executable behavior.
- [ ] Placement analysis is real or honestly unavailable.
- [ ] Ranking, metric selection, placement analysis, focus-player detail, and methodology form one coordinated dashboard.
- [ ] Player selection is synchronized across the ranking and supporting graphics.
- [ ] Win point differential uses the canonical runner-up margin, visible samples, the eligibility rules recorded for owner ruling R-14 in `docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md`, and tested tie handling.
- [ ] ELO and Phase 17 opponent-adjusted analysis remain distinct.
- [ ] Public player labels use the centralized resolver and private names are absent from public/client contracts.
- [ ] Group Insights no longer owns the full leaderboard.

## Required agent handoff

Record:

- branch, base commit, final commit, and clean-worktree state;
- assigned Phase 7 substep and stop boundary;
- files created, modified, moved, or retired;
- existing repositories, components, formatters, and tests reused;
- weighted-score consumers removed or retained only for non-ranking historical compatibility, with rationale;
- ELO formula, starting rating, K-factor, rating scale, normalization behavior, and configuration owner;
- multiplayer pairwise outcome rules and simultaneous-update behavior;
- quarter/year period functions, fixed timezone, reset behavior, selected scope, and as-of behavior;
- chronological ordering and insertion-order-independence evidence;
- eligibility, provisional threshold, Confidence cutoffs, equal-rating tie-break, and missing-data policy;
- confirmation that point margin does not affect ELO;
- Phase 7 / Phase 17 boundary;
- public-name resolver and payload privacy evidence;
- repository, query, schema, migration, RPC, RLS, environment, and production status;
- targeted and full commands, exit codes, test counts, warnings, skipped checks, and duration where useful;
- desktop, tablet, and narrow screenshots for UI work;
- known limitations and unresolved decisions; and
- the exact next bounded action.

Explicitly state:

- whether any schema, migration, RLS, production-data, Storage, push, or deployment action occurred;
- whether any known private test name appeared in rendered output or serialized payloads;
- whether weighted score remains anywhere in the leaderboard or Group Insights ranking path; and
- whether the implementation session is requesting independent review rather than self-approving critical methodology.

## Phase-level closure rule

- Phase 7 may be marked complete only after every source step has an accepted handoff and the integrated acceptance checklist passes.
- The completely implemented rating engine and methodology require the independent reviewer specified above.
- An unresolved period timezone, ELO configuration value, eligibility rule, Confidence cutoff, equal-rating tie-break, missing-data policy, or default headline scope prevents full Phase 7 closure when that value affects shipped behavior.
- A later phase must not begin automatically.
- Any formula, migration, authorization rule, public-data contract, or URL-state change requires the independent review required by the project rules.
- Production migration, backfill, RLS mutation, Storage change, push, or deployment remains prohibited unless separately and explicitly authorized and evidenced.
