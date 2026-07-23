# Phase 11 — Compare Baseline

Create the dedicated multi-entity comparison workflow promised by the current navigation.

> **Source authority:** `TM_Stats_Redesign_Integrated_Full_Implementation_Guide_2026-07-19_Expanded_Step_4_3(5).docx`, Phase 11.
>
> **Preservation rule:** The source steps, their order, their dependencies, and their stop conditions are unchanged. The stage headings in this Markdown file only divide each source step into smaller reviewable checkpoints using the guide’s existing `Read → Inspect → Plan → Implement → Test → Render/Review → Document → Commit → Handoff` process.

## Status

Phase 11 is **planned and not started** unless `docs/REDESIGN_STATE.md` and a later explicit owner assignment say otherwise. This file does not authorize implementation, migration, production mutation, push, deployment, or work on a later phase.

## Recommended agent and effort

| Field | Recommendation |
| --- | --- |
| Preferred execution | Split phase |
| Recommended configuration | Claude Opus 4.8 - xhigh for comparison architecture; Codex GPT-5.6 Sol - Extra High for implementation |
| Acceptable alternate | Claude Sonnet 5 - xhigh can implement UI after contracts are approved |
| Independent reviewer | Claude Opus 4.8 - xhigh independent comparison-semantics review |
| Handoff sensitivity | Critical |
| Recommended handoff pattern | Claude first specifies common denominators and URL contracts. Codex implements and tests. Claude reviews incompatible-scope handling and visual comparability. |

| Stop rule | Complete only this phase or its explicitly assigned substep. Commit, write the handoff file, and stop before beginning the next phase. |
| --- | --- |

## Outcome of this phase

Shareable player and group comparisons using canonical metrics and aligned denominators.

## Why this phase comes now

Large comparisons should not be repeatedly embedded in Individual and Group pages.

## Prerequisites

- Player and group scopes are stable.

- Canonical formatters and comparison-safe metrics exist.

## Inspect before editing

- Current Head-to-Head Lens

- Weighted Leaderboard Comparison

- Player score averages

- Style rows

- Map rows

- Group summaries

- Existing selectors and search components

## Do not do in this phase

- Do not implement every entity type yet.

- Do not compare incompatible subsets silently.

- Do not create Compare-specific duplicate calculations.

## Expanded working sequence

The source step order is preserved. Each row is a bounded implementation assignment and must end with its own validation, documentation, clean commit, and handoff.

| Source step | Bounded execution result | Stop condition |
| --- | --- | --- |
| 11.1 — Implement comparison setup | Type selector; Searchable entity selectors; Two to five entities; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 11.2 — Implement player comparison | Overview; Scoring; Styles; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 11.3 — Implement group comparison | Games; Win rate; Score; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 11.4 — Apply comparison rules | Common scope; Visible sample sizes; Raw values before normalized differences; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 11.5 — Test URL and responsive behavior | Deep links; Refresh restoration; Mobile selector sheet; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 11.6 — Use production graphics in Compare | Use production graphics in Compare | Commit and hand off this source step; do not begin the next source heading. |
| 11.7 — Compare card acquisition and TR progression | Add aligned Cards Bought and Terraforming Rating comparison modes for players and groups.; Use the same filters, generation eligibility, normalization method, chart scales, and coverage thresholds for every compared entity.; Show difference by generation and phase, final TR difference, cumulative cards-bought difference, and supporting game samples.; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| Source heading — Comparison identity privacy | Use the centralized public player-name resolver for every public player label.; After a successful claim, show the registered username or an approved public handle; never fall back to first name, last name, full name, email, authentication ID, normalized personal name, or private aliases.; Keep original import evidence and private claim-matching data behind authenticated and authorized boundaries.; and the remaining source-defined items | Apply and validate this source contract at this exact position before continuing. |

## Step 11.1 — Implement comparison setup

### Source-defined scope

- Type selector
- Searchable entity selectors
- Two to five entities
- Clear selection
- Reorder or swap
- Shareable URL

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Current Head-to-Head Lens
  - Weighted Leaderboard Comparison
  - Player score averages
  - Style rows
  - Map rows
  - Group summaries
  - Existing selectors and search components
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Align compared entities to one scope, filter set, date range, metric definition, and compatible coverage contract.
- Expose the eligible denominator for every entity; do not compare values produced from incompatible samples without an explicit warning.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Type selector
  - [ ] Searchable entity selectors
  - [ ] Two to five entities
  - [ ] Clear selection
  - [ ] Reorder or swap
  - [ ] Shareable URL
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
- Verify URL state, selection synchronization, table alternatives, and mobile reflow for the comparison surface.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.

### Step completion gate

- [ ] Type selector
- [ ] Searchable entity selectors
- [ ] Two to five entities
- [ ] Clear selection
- [ ] Reorder or swap
- [ ] Shareable URL
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 11.2 — Implement player comparison

### Source-defined scope

- Overview
- Scoring
- Styles
- Conditions
- Competition
- Aligned games, win rate, score, placement, points per generation, sources, maps, head-to-head, differential
- Aligned average and median win point differential
- Closest win, largest win, close-win rate, decisive-win rate, and qualifying-win sample
- Win-margin distributions on a shared scale and supporting-game drill-down

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Current Head-to-Head Lens
  - Weighted Leaderboard Comparison
  - Player score averages
  - Style rows
  - Map rows
  - Group summaries
  - Existing selectors and search components
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Align compared entities to one scope, filter set, date range, metric definition, and compatible coverage contract.
- Expose the eligible denominator for every entity; do not compare values produced from incompatible samples without an explicit warning.
- Define the eligible encounter set, opponent or lineup identity, tie treatment, minimum sample, and scope filters before calculating the result.
- Do not treat repeated games from one player or lineup as independent evidence without showing the distribution and sample.
- Use the canonical winning score minus highest opponent score formula only for qualifying wins and keep tied-first outcomes separate.
- Show qualifying wins and total games, enforce minimum-wins eligibility, and aggregate from qualifying game-level margins.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Overview
  - [ ] Scoring
  - [ ] Styles
  - [ ] Conditions
  - [ ] Competition
  - [ ] Aligned games, win rate, score, placement, points per generation, sources, maps, head-to-head, differential
  - [ ] Aligned average and median win point differential
  - [ ] Closest win, largest win, close-win rate, decisive-win rate, and qualifying-win sample
  - [ ] Win-margin distributions on a shared scale and supporting-game drill-down
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
- Verify URL state, selection synchronization, table alternatives, and mobile reflow for the comparison surface.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test multiplayer runner-up selection, two-player games, tied first, missing scores, threshold boundaries, filtered samples, and aggregation weighting.

### Step completion gate

- [ ] Overview
- [ ] Scoring
- [ ] Styles
- [ ] Conditions
- [ ] Competition
- [ ] Aligned games, win rate, score, placement, points per generation, sources, maps, head-to-head, differential
- [ ] Aligned average and median win point differential
- [ ] Closest win, largest win, close-win rate, decisive-win rate, and qualifying-win sample
- [ ] Win-margin distributions on a shared scale and supporting-game drill-down
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 11.3 — Implement group comparison

### Source-defined scope

- Games
- Win rate
- Score
- Placement
- Member count
- Average and median win point differential
- Close-win and decisive-win shares
- Score sources
- Styles
- Conditions
- Overlapping-member warning

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Current Head-to-Head Lens
  - Weighted Leaderboard Comparison
  - Player score averages
  - Style rows
  - Map rows
  - Group summaries
  - Existing selectors and search components
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Align compared entities to one scope, filter set, date range, metric definition, and compatible coverage contract.
- Expose the eligible denominator for every entity; do not compare values produced from incompatible samples without an explicit warning.
- Use the canonical winning score minus highest opponent score formula only for qualifying wins and keep tied-first outcomes separate.
- Show qualifying wins and total games, enforce minimum-wins eligibility, and aggregate from qualifying game-level margins.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Games
  - [ ] Win rate
  - [ ] Score
  - [ ] Placement
  - [ ] Member count
  - [ ] Average and median win point differential
  - [ ] Close-win and decisive-win shares
  - [ ] Score sources
  - [ ] Styles
  - [ ] Conditions
  - [ ] Overlapping-member warning
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
- Verify URL state, selection synchronization, table alternatives, and mobile reflow for the comparison surface.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test multiplayer runner-up selection, two-player games, tied first, missing scores, threshold boundaries, filtered samples, and aggregation weighting.

### Step completion gate

- [ ] Games
- [ ] Win rate
- [ ] Score
- [ ] Placement
- [ ] Member count
- [ ] Average and median win point differential
- [ ] Close-win and decisive-win shares
- [ ] Score sources
- [ ] Styles
- [ ] Conditions
- [ ] Overlapping-member warning
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 11.4 — Apply comparison rules

### Source-defined scope

- Common scope
- Visible sample sizes
- Raw values before normalized differences
- Lower-is-better placement labels
- Direct matchup separated from overall performance
- Win point differential separated from overall point differential and direct head-to-head score differential

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Current Head-to-Head Lens
  - Weighted Leaderboard Comparison
  - Player score averages
  - Style rows
  - Map rows
  - Group summaries
  - Existing selectors and search components
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Align compared entities to one scope, filter set, date range, metric definition, and compatible coverage contract.
- Expose the eligible denominator for every entity; do not compare values produced from incompatible samples without an explicit warning.
- Define the eligible encounter set, opponent or lineup identity, tie treatment, minimum sample, and scope filters before calculating the result.
- Do not treat repeated games from one player or lineup as independent evidence without showing the distribution and sample.
- Use the canonical winning score minus highest opponent score formula only for qualifying wins and keep tied-first outcomes separate.
- Show qualifying wins and total games, enforce minimum-wins eligibility, and aggregate from qualifying game-level margins.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Common scope
  - [ ] Visible sample sizes
  - [ ] Raw values before normalized differences
  - [ ] Lower-is-better placement labels
  - [ ] Direct matchup separated from overall performance
  - [ ] Win point differential separated from overall point differential and direct head-to-head score differential
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
- Verify URL state, selection synchronization, table alternatives, and mobile reflow for the comparison surface.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test multiplayer runner-up selection, two-player games, tied first, missing scores, threshold boundaries, filtered samples, and aggregation weighting.

### Step completion gate

- [ ] Common scope
- [ ] Visible sample sizes
- [ ] Raw values before normalized differences
- [ ] Lower-is-better placement labels
- [ ] Direct matchup separated from overall performance
- [ ] Win point differential separated from overall point differential and direct head-to-head score differential
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 11.5 — Test URL and responsive behavior

### Source-defined scope

- Deep links
- Refresh restoration
- Mobile selector sheet
- Keyboard selection
- Empty and insufficient-data states

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Current Head-to-Head Lens
  - Weighted Leaderboard Comparison
  - Player score averages
  - Style rows
  - Map rows
  - Group summaries
  - Existing selectors and search components
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
  - [ ] Deep links
  - [ ] Refresh restoration
  - [ ] Mobile selector sheet
  - [ ] Keyboard selection
  - [ ] Empty and insufficient-data states
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

- [ ] Deep links
- [ ] Refresh restoration
- [ ] Mobile selector sheet
- [ ] Keyboard selection
- [ ] Empty and insufficient-data states
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 11.6 — Use production graphics in Compare

### Source-defined scope

- Complete the source-defined work named by this step without expanding its scope.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Current Head-to-Head Lens
  - Weighted Leaderboard Comparison
  - Player score averages
  - Style rows
  - Map rows
  - Group summaries
  - Existing selectors and search components
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Align compared entities to one scope, filter set, date range, metric definition, and compatible coverage contract.
- Expose the eligible denominator for every entity; do not compare values produced from incompatible samples without an explicit warning.
- Resolve assets through the audited shared asset layer by stable ID or canonical slug; do not construct storage URLs in presentation code.
- Define informative versus decorative alternative text, fixed sizing or aspect-ratio behavior, and the shared missing-asset fallback.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Complete the named source step.
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
- Verify URL state, selection synchronization, table alternatives, and mobile reflow for the comparison surface.
- Check dark-surface legibility, transparent-image handling, compact labels, cache behavior, and prevention of per-row asset requests.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test successful lookup, missing record, malformed path, accessible name, responsive sizing, and fallback rendering.

### Step completion gate

- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 11.7 — Compare card acquisition and TR progression

### Source-defined scope

- Add aligned Cards Bought and Terraforming Rating comparison modes for players and groups.
- Use the same filters, generation eligibility, normalization method, chart scales, and coverage thresholds for every compared entity.
- Show difference by generation and phase, final TR difference, cumulative cards-bought difference, and supporting game samples.
- Prefer small multiples or overlaid stepped lines with a limited number of entities. Do not create unreadable overlays for five entities.
- Align corporation logos, tag graphics, and point-source graphics across compared entities.
- Use consistent image dimensions so graphics do not distort row height or chart alignment.
- Do not use graphics as the only way to identify an entity or metric.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Current Head-to-Head Lens
  - Weighted Leaderboard Comparison
  - Player score averages
  - Style rows
  - Map rows
  - Group summaries
  - Existing selectors and search components
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Align compared entities to one scope, filter set, date range, metric definition, and compatible coverage contract.
- Expose the eligible denominator for every entity; do not compare values produced from incompatible samples without an explicit warning.
- Resolve assets through the audited shared asset layer by stable ID or canonical slug; do not construct storage URLs in presentation code.
- Define informative versus decorative alternative text, fixed sizing or aspect-ratio behavior, and the shared missing-asset fallback.
- Preserve exact generation, normalized phase, checkpoint semantics, and complete-versus-partial coverage as separate concepts.
- Keep explicit zero separate from missing, preserve legal decreases, and never interpolate an unsupported generation value.
- Name the states supported, absent, unknown, partial, unavailable, not applicable, explicit zero, and insufficient sample separately.
- Do not use convenience defaults that convert missing evidence into zero, false, or confirmed absence.
- Keep recommendation rules deterministic, thresholded, evidence-backed, and non-causal.
- Require a comparison baseline, eligible-game count, coverage, uncertainty, and supporting games before emitting a recommendation.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Add aligned Cards Bought and Terraforming Rating comparison modes for players and groups.
  - [ ] Use the same filters, generation eligibility, normalization method, chart scales, and coverage thresholds for every compared entity.
  - [ ] Show difference by generation and phase, final TR difference, cumulative cards-bought difference, and supporting game samples.
  - [ ] Prefer small multiples or overlaid stepped lines with a limited number of entities. Do not create unreadable overlays for five entities.
  - [ ] Align corporation logos, tag graphics, and point-source graphics across compared entities.
  - [ ] Use consistent image dimensions so graphics do not distort row height or chart alignment.
  - [ ] Do not use graphics as the only way to identify an entity or metric.
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
- Verify URL state, selection synchronization, table alternatives, and mobile reflow for the comparison surface.
- Check dark-surface legibility, transparent-image handling, compact labels, cache behavior, and prevention of per-row asset requests.
- Synchronize selected generation across chart, table, summary, evidence, and URL state without combining unlike measures on an ambiguous dual axis.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test successful lookup, missing record, malformed path, accessible name, responsive sizing, and fallback rendering.
- Test out-of-order records, duplicate generations, different game lengths, partial timelines, explicit zero, missing values, and filter propagation.
- Test every distinct missing-data state and confirm labels, calculations, tables, and URL filters preserve the distinction.
- Test threshold edges, conflicting signals, merged root causes, insufficient evidence, and stable recommendation ordering.

### Step completion gate

- [ ] Add aligned Cards Bought and Terraforming Rating comparison modes for players and groups.
- [ ] Use the same filters, generation eligibility, normalization method, chart scales, and coverage thresholds for every compared entity.
- [ ] Show difference by generation and phase, final TR difference, cumulative cards-bought difference, and supporting game samples.
- [ ] Prefer small multiples or overlaid stepped lines with a limited number of entities. Do not create unreadable overlays for five entities.
- [ ] Align corporation logos, tag graphics, and point-source graphics across compared entities.
- [ ] Use consistent image dimensions so graphics do not distort row height or chart alignment.
- [ ] Do not use graphics as the only way to identify an entity or metric.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Cross-cutting contract — Comparison identity privacy

- Use the centralized public player-name resolver for every public player label.
- After a successful claim, show the registered username or an approved public handle; never fall back to first name, last name, full name, email, authentication ID, normalized personal name, or private aliases.
- Keep original import evidence and private claim-matching data behind authenticated and authorized boundaries.
- Exclude private personal-name fields from public repository outputs, route loaders, client DTOs, hydration data, APIs, RPCs, metadata, exports, logs, telemetry, and analytics events.
- Preserve the existing player ID and historical game relationships when public presentation changes after claim.

### Required application across the phase

- Apply this contract to every relevant query, repository DTO, server component, client payload, visual label, table, detail surface, export, metadata path, test, and handoff in the phase.
- Validate it during each bounded source step rather than postponing it to final closure.
- Record any unsupported surface or data gap explicitly; do not imply completion through styling or fallback text.
- Align compared entities to one scope, filter set, date range, metric definition, and compatible coverage contract.
- Expose the eligible denominator for every entity; do not compare values produced from incompatible samples without an explicit warning.
- Use stable player IDs for relationships and the centralized public-name resolver for presentation.
- Exclude private names, aliases, normalized matching values, email, and authentication identifiers from public/client payloads rather than hiding them after serialization.
- Verify URL state, selection synchronization, table alternatives, and mobile reflow for the comparison surface.
- Inspect route payloads, DTOs, RPCs, views, metadata, exports, hydration, logs, telemetry, analytics events, and user-visible errors for leakage.
- Run known-test-name payload scans and verify neutral fallback behavior when username is unavailable.

## Card acquisition comparison — carried forward

>  **Provenance:** this section is REPO-NATIVE, not derived from the Word guide. It was
>  already present in `docs/redesign/phases/11-compare.md`, verified word-identical to the
>  published copy, and is carried forward here because the Word-derived expansion does
>  not contain it. Verbatim; nothing rewritten.

Support aligned comparison of:

- Cards purchased per game
- Cards seen per game
- Purchase conversion
- Purchased hand share
- Hand utilization
- End-hand carryover
- Purchase pace
- Seen pace
- Outcome associations

Only compare entities with compatible coverage, scope, and filters.

Show the eligible-game denominator for each compared entity.


## Copy-ready agent execution prompt

> Perform Phase 11 only: build /compare version one with Player Comparison and Group Comparison. Persist comparison type, entity IDs, group, filters, selected metric, and view in the URL.
>
> Support two to five entities with searchable selectors, clear selection, reordering or swapping, and shareable links. Reuse canonical player and group metrics; do not create new calculations only for Compare.
>
> For players, implement Overview, Scoring, Styles, Conditions, and Competition using current verified data. For groups, align games, win rate, score, placement, member count, score sources, styles, and supported conditions. Warn when compared groups overlap in membership if the repository can determine it.
>
> Use common denominators, show sample sizes, distinguish direct head-to-head from general performance, and explain lower-is-better metrics. Test deep links, URL restoration, mobile selection, keyboard operation, and insufficient data.
> PRODUCTION GRAPHICS
> Use the shared Supabase graphics components in Compare. Align image sizing across compared entities and never make an image the sole identifier or accessible label.
> COMPARE DASHBOARD COMPOSITION
> Use aligned small multiples, dumbbell charts, diverging delta bars, shared-scale trend lines, and a comparison table rather than independent entity cards.
> Keep entity order, colors, logos/icons, filters, and metric scales consistent across the whole page.
> Selecting an entity or metric must update all relevant graphics and the evidence drawer.
> COMPARE WIN DIFFERENTIAL
> - Compare average and median win point differential, closest and largest win, close/decisive rates, qualifying wins, and distributions on shared scales. Keep win margin separate from direct head-to-head, overall point differential, and adjusted margin.
> Temporal comparison
> Add player and group comparison modes for cards bought by generation and TR progression.
> Align filters, generation eligibility, normalization, scales, samples, and partial-data treatment across entities.
> Show exact values, phase differences, final TR, cumulative cards bought, and supporting games without using dual axes.

## Acceptance checklist

- [ ] Player and group comparison work.

- [ ] URLs are shareable.

- [ ] Metrics use common scopes.

- [ ] Sample sizes are visible.

- [ ] Direct matchup is distinct.

- [ ] No Compare-only calculation duplicates exist.

- [ ] Compare aligns production graphics and preserves accessible text identification.

- [ ] Compare uses aligned scales and coordinated comparison graphics, not separate entity report cards.

- [ ] Entity order, colors, assets, filters, and metric definitions remain consistent across the page.

- [ ] Compare uses identical win-margin definitions, thresholds, eligibility, and shared chart scales for every entity.

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

- Phase 11 may be marked complete only after every source step above has its own accepted handoff and the phase acceptance checklist passes as one integrated system.
- A later phase must not begin automatically. The final handoff identifies only the next possible separately authorized phase or remediation task.
- Any formula, migration, authorization rule, public-data contract, or URL-state change requires the independent review specified by the Word guide.
- Production migration, backfill, RLS mutation, Storage change, push, or deployment remains prohibited unless a separate explicit authorization and evidence record exists.
