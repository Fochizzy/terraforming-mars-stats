# Phase 17 — Competition, Opponent Adjustment, and Board Intelligence

Complete opponent and spatial analytics with transparent methods and real geometry.

> **Source authority:** `TM_Stats_Redesign_Integrated_Full_Implementation_Guide_2026-07-19_Expanded_Step_4_3(5).docx`, Phase 17.
>
> **Preservation rule:** The source steps, their order, their dependencies, and their stop conditions are unchanged. The stage headings in this Markdown file only divide each source step into smaller reviewable checkpoints using the guide’s existing `Read → Inspect → Plan → Implement → Test → Render/Review → Document → Commit → Handoff` process.

## Status

Phase 17 is **planned and not started** unless `docs/REDESIGN_STATE.md` and a later explicit owner assignment say otherwise. This file does not authorize implementation, migration, production mutation, push, deployment, or work on a later phase.

## Recommended agent and effort

| Field | Recommendation |
| --- | --- |
| Preferred execution | Split phase |
| Recommended configuration | Claude Opus 4.8 - max for opponent-adjustment and board architecture; Codex GPT-5.6 Sol - Extra High for implementation |
| Acceptable alternate | Claude Opus 4.8 - xhigh when max is unavailable |
| Independent reviewer | Opposite agent at Level 5 for leakage, geometry, and accessibility review |
| Handoff sensitivity | Critical |
| Recommended handoff pattern | Claude defines the transparent model and spatial capability contract. Codex implements queries, views, and tests. Claude verifies target leakage and invented-board safeguards. |

| Stop rule | Complete only this phase or its explicitly assigned substep. Commit, write the handoff file, and stop before beginning the next phase. |
| --- | --- |

## Outcome of this phase

Head-to-head, heatmaps, trends, opponent adjustment, board control, and aggregate board intelligence.

## Why this phase comes now

Competitive and board analytics are analytically distinct but both require careful denominator and capability handling.

## Prerequisites

- Opponent and board capabilities are audited.

- Compare and Individual Competition views exist.

- Canonical Step 4.3 placements, map detections, parser provenance, and coverage are available through the repository adapter.

## Inspect before editing

- Head-to-head repositories

- Score differential and trend data

- Opponent rating availability

- Tile events

- Coordinates

- Map geometry

- Board ownership and scoring data

- Existing board heatmap or map components

- game_capture_board_placements and redesign canonical placement mappings

- game_capture_map_detections, map candidates, exceptions, conflict state, and evidence

- placement attribution, ownership state, row/position, upstream space IDs, and coverage

## Do not do in this phase

- Do not silently combine incompatible parser versions or include unsupported placements as confirmed board state.

- Do not default an unknown map to Tharsis or fabricate tile ownership/player attribution.

- Do not use outcome leakage in expected-performance models.

- Do not draw invented boards.

- Do not show a heatmap with too little qualifying data.

- Do not use color as the only signal.

## Expanded working sequence

The source step order is preserved. Each row is a bounded implementation assignment and must end with its own validation, documentation, clean commit, and handoff.

| Source step | Bounded execution result | Stop condition |
| --- | --- | --- |
| 17.1 — Build Head-to-Head | Opponent table; Direct record; Score differential; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 17.2 — Build Matchup Heatmap conditionally | Only enough qualifying opponents; Exact cell values; Sample tooltip; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 17.3 — Build transparent opponent adjustment | Raw margin; Expected margin; Adjusted margin; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 17.4 — Build Board Control | Tile distribution; Supported cities; Board points per tile; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 17.5 — Build Board Intelligence conditionally | Real geometry; Placement frequency/share/percentile/comparison; Hot/cold spaces; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |

## Step 17.1 — Build Head-to-Head

### Source-defined scope

- Opponent table
- Direct record
- Score differential
- Placement differential
- Repeat trend
- Minimum games
- Opponent detail
- Games
- Keep three differential concepts distinct: win point differential versus the runner-up in wins, overall point differential versus average opponents across all games, and direct head-to-head differential versus one selected opponent.
- Allow the opponent detail to show the player's win margins in victories over that opponent without replacing the direct score differential.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Head-to-head repositories
  - Score differential and trend data
  - Opponent rating availability
  - Tile events
  - Coordinates
  - Map geometry
  - Board ownership and scoring data
  - Existing board heatmap or map components
  - game_capture_board_placements and redesign canonical placement mappings
  - game_capture_map_detections, map candidates, exceptions, conflict state, and evidence
  - placement attribution, ownership state, row/position, upstream space IDs, and coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Define the eligible encounter set, opponent or lineup identity, tie treatment, minimum sample, and scope filters before calculating the result.
- Do not treat repeated games from one player or lineup as independent evidence without showing the distribution and sample.
- Use the canonical winning score minus highest opponent score formula only for qualifying wins and keep tied-first outcomes separate.
- Show qualifying wins and total games, enforce minimum-wins eligibility, and aggregate from qualifying game-level margins.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Opponent table
  - [ ] Direct record
  - [ ] Score differential
  - [ ] Placement differential
  - [ ] Repeat trend
  - [ ] Minimum games
  - [ ] Opponent detail
  - [ ] Games
  - [ ] Keep three differential concepts distinct: win point differential versus the runner-up in wins, overall point differential versus average opponents across all games, and direct head-to-head differential versus one selected opponent.
  - [ ] Allow the opponent detail to show the player's win margins in victories over that opponent without replacing the direct score differential.
- Reuse existing repositories, components, formatters, chart frames, asset components, evidence links, and tests before creating replacements.
- Preserve authentication, group scope, route compatibility, stable identifiers, direct links, and the responsive single-website information architecture.
- Keep transient hover, selected detail, filters, and persisted URL state separate so one interaction cannot silently change another contract.
- Add progressive disclosure for detail and methodology rather than duplicating the same metric in multiple equal-weight panels.
- Link summary values to the supporting games and preserve the active entity, scope, and filters when opening detail evidence.
- Distinguish direct evidence from derived interpretation and show unavailable evidence explicitly.

### Stage D — Integration, evidence, and user-interface review

- Verify the step works in every source-authorized scope and that shared filters, selection, legends, tables, details, and evidence remain synchronized.
- Show sample size, eligible denominator, coverage, confidence, and methodology wherever a result could otherwise be overinterpreted.
- Provide a useful empty, loading, error, unavailable, partial, and low-sample state without converting those states into zero.
- For visual work, inspect desktop, tablet, and narrow layouts, keyboard interaction, visible focus, reduced motion, non-color meaning, text summary, and table alternative.
- Review query count, rendering cost, cache behavior, and repeated asset or repository calls before accepting the composition.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test multiplayer runner-up selection, two-player games, tied first, missing scores, threshold boundaries, filtered samples, and aggregation weighting.

### Step completion gate

- [ ] Opponent table
- [ ] Direct record
- [ ] Score differential
- [ ] Placement differential
- [ ] Repeat trend
- [ ] Minimum games
- [ ] Opponent detail
- [ ] Games
- [ ] Keep three differential concepts distinct: win point differential versus the runner-up in wins, overall point differential versus average opponents across all games, and direct head-to-head differential versus one selected opponent.
- [ ] Allow the opponent detail to show the player's win margins in victories over that opponent without replacing the direct score differential.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 17.2 — Build Matchup Heatmap conditionally

### Source-defined scope

- Only enough qualifying opponents
- Exact cell values
- Sample tooltip
- Accessible table alternative
- View all for large sets

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Head-to-head repositories
  - Score differential and trend data
  - Opponent rating availability
  - Tile events
  - Coordinates
  - Map geometry
  - Board ownership and scoring data
  - Existing board heatmap or map components
  - game_capture_board_placements and redesign canonical placement mappings
  - game_capture_map_detections, map candidates, exceptions, conflict state, and evidence
  - placement attribution, ownership state, row/position, upstream space IDs, and coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Define the eligible encounter set, opponent or lineup identity, tie treatment, minimum sample, and scope filters before calculating the result.
- Do not treat repeated games from one player or lineup as independent evidence without showing the distribution and sample.
- Require canonical map, space, placement, ownership, attribution, provenance, and coverage fields before enabling spatial analysis.
- Do not infer coordinates, ownership, actor, or board completion from final totals or incomplete events.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Only enough qualifying opponents
  - [ ] Exact cell values
  - [ ] Sample tooltip
  - [ ] Accessible table alternative
  - [ ] View all for large sets
- Reuse existing repositories, components, formatters, chart frames, asset components, evidence links, and tests before creating replacements.
- Preserve authentication, group scope, route compatibility, stable identifiers, direct links, and the responsive single-website information architecture.
- Keep transient hover, selected detail, filters, and persisted URL state separate so one interaction cannot silently change another contract.
- Add progressive disclosure for detail and methodology rather than duplicating the same metric in multiple equal-weight panels.

### Stage D — Integration, evidence, and user-interface review

- Verify the step works in every source-authorized scope and that shared filters, selection, legends, tables, details, and evidence remain synchronized.
- Show sample size, eligible denominator, coverage, confidence, and methodology wherever a result could otherwise be overinterpreted.
- Provide a useful empty, loading, error, unavailable, partial, and low-sample state without converting those states into zero.
- For visual work, inspect desktop, tablet, and narrow layouts, keyboard interaction, visible focus, reduced motion, non-color meaning, text summary, and table alternative.
- Review query count, rendering cost, cache behavior, and repeated asset or repository calls before accepting the composition.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test map variants, unresolved spaces, unattributed placements, replacements/removals, partial coverage, and no-coordinate fallbacks.

### Step completion gate

- [ ] Only enough qualifying opponents
- [ ] Exact cell values
- [ ] Sample tooltip
- [ ] Accessible table alternative
- [ ] View all for large sets
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 17.3 — Build transparent opponent adjustment

### Source-defined scope

- Raw margin
- Expected margin
- Adjusted margin
- Opponent strength
- Pre-game features only
- Simple baseline if data is insufficient

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Head-to-head repositories
  - Score differential and trend data
  - Opponent rating availability
  - Tile events
  - Coordinates
  - Map geometry
  - Board ownership and scoring data
  - Existing board heatmap or map components
  - game_capture_board_placements and redesign canonical placement mappings
  - game_capture_map_detections, map candidates, exceptions, conflict state, and evidence
  - placement attribution, ownership state, row/position, upstream space IDs, and coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Locate and document the existing canonical method before creating any utility or query.
- Keep the raw result visible beside the adjusted result and record every configurable prior, weight, threshold, and exclusion.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Raw margin
  - [ ] Expected margin
  - [ ] Adjusted margin
  - [ ] Opponent strength
  - [ ] Pre-game features only
  - [ ] Simple baseline if data is insufficient
- Reuse existing repositories, components, formatters, chart frames, asset components, evidence links, and tests before creating replacements.
- Preserve authentication, group scope, route compatibility, stable identifiers, direct links, and the responsive single-website information architecture.
- Keep transient hover, selected detail, filters, and persisted URL state separate so one interaction cannot silently change another contract.
- Add progressive disclosure for detail and methodology rather than duplicating the same metric in multiple equal-weight panels.

### Stage D — Integration, evidence, and user-interface review

- Verify the step works in every source-authorized scope and that shared filters, selection, legends, tables, details, and evidence remain synchronized.
- Show sample size, eligible denominator, coverage, confidence, and methodology wherever a result could otherwise be overinterpreted.
- Provide a useful empty, loading, error, unavailable, partial, and low-sample state without converting those states into zero.
- For visual work, inspect desktop, tablet, and narrow layouts, keyboard interaction, visible focus, reduced motion, non-color meaning, text summary, and table alternative.
- Review query count, rendering cost, cache behavior, and repeated asset or repository calls before accepting the composition.
- Require an independent formula and low-sample review before the step is accepted.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test raw-versus-adjusted separation, prior behavior, ties, nulls, repeatability, and sample-size transitions.

### Step completion gate

- [ ] Raw margin
- [ ] Expected margin
- [ ] Adjusted margin
- [ ] Opponent strength
- [ ] Pre-game features only
- [ ] Simple baseline if data is insufficient
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 17.4 — Build Board Control

### Source-defined scope

- Tile distribution
- Supported cities
- Board points per tile
- Timing
- Bonuses
- Adjacency
- Map selector

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Head-to-head repositories
  - Score differential and trend data
  - Opponent rating availability
  - Tile events
  - Coordinates
  - Map geometry
  - Board ownership and scoring data
  - Existing board heatmap or map components
  - game_capture_board_placements and redesign canonical placement mappings
  - game_capture_map_detections, map candidates, exceptions, conflict state, and evidence
  - placement attribution, ownership state, row/position, upstream space IDs, and coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Require canonical map, space, placement, ownership, attribution, provenance, and coverage fields before enabling spatial analysis.
- Do not infer coordinates, ownership, actor, or board completion from final totals or incomplete events.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Tile distribution
  - [ ] Supported cities
  - [ ] Board points per tile
  - [ ] Timing
  - [ ] Bonuses
  - [ ] Adjacency
  - [ ] Map selector
- Reuse existing repositories, components, formatters, chart frames, asset components, evidence links, and tests before creating replacements.
- Preserve authentication, group scope, route compatibility, stable identifiers, direct links, and the responsive single-website information architecture.
- Keep transient hover, selected detail, filters, and persisted URL state separate so one interaction cannot silently change another contract.
- Add progressive disclosure for detail and methodology rather than duplicating the same metric in multiple equal-weight panels.

### Stage D — Integration, evidence, and user-interface review

- Verify the step works in every source-authorized scope and that shared filters, selection, legends, tables, details, and evidence remain synchronized.
- Show sample size, eligible denominator, coverage, confidence, and methodology wherever a result could otherwise be overinterpreted.
- Provide a useful empty, loading, error, unavailable, partial, and low-sample state without converting those states into zero.
- For visual work, inspect desktop, tablet, and narrow layouts, keyboard interaction, visible focus, reduced motion, non-color meaning, text summary, and table alternative.
- Review query count, rendering cost, cache behavior, and repeated asset or repository calls before accepting the composition.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test map variants, unresolved spaces, unattributed placements, replacements/removals, partial coverage, and no-coordinate fallbacks.

### Step completion gate

- [ ] Tile distribution
- [ ] Supported cities
- [ ] Board points per tile
- [ ] Timing
- [ ] Bonuses
- [ ] Adjacency
- [ ] Map selector
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 17.5 — Build Board Intelligence conditionally

### Source-defined scope

- Real geometry
- Placement frequency/share/percentile/comparison
- Hot/cold spaces
- Clustering
- Generation expansion
- Hex detail
- Coverage

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Head-to-head repositories
  - Score differential and trend data
  - Opponent rating availability
  - Tile events
  - Coordinates
  - Map geometry
  - Board ownership and scoring data
  - Existing board heatmap or map components
  - game_capture_board_placements and redesign canonical placement mappings
  - game_capture_map_detections, map candidates, exceptions, conflict state, and evidence
  - placement attribution, ownership state, row/position, upstream space IDs, and coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Name the states supported, absent, unknown, partial, unavailable, not applicable, explicit zero, and insufficient sample separately.
- Do not use convenience defaults that convert missing evidence into zero, false, or confirmed absence.
- Require canonical map, space, placement, ownership, attribution, provenance, and coverage fields before enabling spatial analysis.
- Do not infer coordinates, ownership, actor, or board completion from final totals or incomplete events.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Real geometry
  - [ ] Placement frequency/share/percentile/comparison
  - [ ] Hot/cold spaces
  - [ ] Clustering
  - [ ] Generation expansion
  - [ ] Hex detail
  - [ ] Coverage
- Reuse existing repositories, components, formatters, chart frames, asset components, evidence links, and tests before creating replacements.
- Preserve authentication, group scope, route compatibility, stable identifiers, direct links, and the responsive single-website information architecture.
- Keep transient hover, selected detail, filters, and persisted URL state separate so one interaction cannot silently change another contract.
- Add progressive disclosure for detail and methodology rather than duplicating the same metric in multiple equal-weight panels.
- Link summary values to the supporting games and preserve the active entity, scope, and filters when opening detail evidence.
- Distinguish direct evidence from derived interpretation and show unavailable evidence explicitly.

### Stage D — Integration, evidence, and user-interface review

- Verify the step works in every source-authorized scope and that shared filters, selection, legends, tables, details, and evidence remain synchronized.
- Show sample size, eligible denominator, coverage, confidence, and methodology wherever a result could otherwise be overinterpreted.
- Provide a useful empty, loading, error, unavailable, partial, and low-sample state without converting those states into zero.
- For visual work, inspect desktop, tablet, and narrow layouts, keyboard interaction, visible focus, reduced motion, non-color meaning, text summary, and table alternative.
- Review query count, rendering cost, cache behavior, and repeated asset or repository calls before accepting the composition.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test every distinct missing-data state and confirm labels, calculations, tables, and URL filters preserve the distinction.
- Test map variants, unresolved spaces, unattributed placements, replacements/removals, partial coverage, and no-coordinate fallbacks.

### Step completion gate

- [ ] Real geometry
- [ ] Placement frequency/share/percentile/comparison
- [ ] Hot/cold spaces
- [ ] Clustering
- [ ] Generation expansion
- [ ] Hex detail
- [ ] Coverage
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Copy-ready agent execution prompt

> Perform Phase 17 only: implement Head-to-Head, Matchup Heatmap, Score Delta Trend, transparent Opponent-Adjusted Performance, Board Control, and Board Intelligence.
>
> Reuse current head-to-head data. Show direct records, score and placement differentials, repeat trends, minimum-game filtering, opponent details, and supporting games. Render a heatmap only when enough opponents qualify and provide an accessible table alternative.
>
> For opponent adjustment, prevent target leakage. Use only pre-game or independently available features. Document raw margin, expected margin, adjusted margin, opponent strength, model scope, samples, and limitations. If data is insufficient, use a simpler labeled benchmark.
>
> For board analytics, use actual tile events and real map geometry. Do not draw an invented board. Provide useful fallbacks when coordinates are missing. Add tests for calculations, filters, insufficient data, accessibility, and multiple map layouts.
> COMPETITION AND BOARD DASHBOARD COMPOSITION
> Competition should pair matchup matrix or ranked opponent bars with score-delta trend, adjusted-performance view, opponent detail, and game evidence.
> Board Intelligence should make the real board heatmap dominant, with a right-side analytical rail, hot/cold rankings, tile distribution, placement timing, and hex detail.
> Provide accessible table alternatives and never invent board geometry.
> COMPETITION DIFFERENTIAL DEFINITIONS
> - Keep win point differential versus runner-up, overall point differential versus average opponents, direct head-to-head differential, and opponent-adjusted margin as distinct metrics in types, labels, tooltips, and methodology. Add tests preventing these concepts from being conflated.

## Acceptance checklist

- [ ] Unattributed, unresolved, replacement, removal, neutral, and exception placements retain their real semantics.

- [ ] Board analytics use canonical placements and map detections with explicit parser-version and coverage filters.

- [ ] Competition is traceable to games.

- [ ] Opponent adjustment is transparent.

- [ ] Heatmaps have accessible alternatives.

- [ ] Competition labels and tooltips never conflate win margin, average-opponent differential, adjusted margin, or direct head-to-head differential.

- [ ] Board geometry is real.

- [ ] Missing spatial data has a fallback.

- [ ] No outcome leakage exists.

- [ ] Competition and Board Intelligence each have a dominant primary graphic plus coordinated supporting analysis and evidence.

- [ ] Board layouts use real geometry and provide accessible alternatives.

## Required agent handoff

- Summarize the implementation and the user-visible result.

- List every file created, modified, moved, or retired.

- List existing components and repository functions reused.

- Explain any analytics calculation added or changed.

- Report database, query, schema, migration, or environment changes.

- Report tests and commands run, including failures that predated the phase.

- Provide desktop and mobile screenshots when UI work was performed.

- List unresolved data gaps, assumptions, risks, and recommended next work.

## Phase-level closure rule

- Phase 17 may be marked complete only after every source step above has its own accepted handoff and the phase acceptance checklist passes as one integrated system.
- A later phase must not begin automatically. The final handoff identifies only the next possible separately authorized phase or remediation task.
- Any formula, migration, authorization rule, public-data contract, or URL-state change requires the independent review specified by the Word guide.
- Production migration, backfill, RLS mutation, Storage change, push, or deployment remains prohibited unless a separate explicit authorization and evidence record exists.
