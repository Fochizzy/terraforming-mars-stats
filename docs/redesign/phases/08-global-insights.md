# Phase 8 — Global Insights Baseline

Create a globally scoped analytics destination using existing persisted global metrics.

> **Source authority:** `TM_Stats_Redesign_Integrated_Full_Implementation_Guide_2026-07-19_Expanded_Step_4_3(5).docx`, Phase 8.
>
> **Preservation rule:** The source steps, their order, their dependencies, and their stop conditions are unchanged. The stage headings in this Markdown file only divide each source step into smaller reviewable checkpoints using the guide’s existing `Read → Inspect → Plan → Implement → Test → Render/Review → Document → Commit → Handoff` process.

## Status

Phase 8 is **planned and not started** unless `docs/REDESIGN_STATE.md` and a later explicit owner assignment say otherwise. This file does not authorize implementation, migration, production mutation, push, deployment, or work on a later phase.

## Recommended agent and effort

| Field | Recommendation |
| --- | --- |
| Preferred execution | Split phase |
| Recommended configuration | Codex GPT-5.6 Sol - High for global queries; Claude Sonnet 5 - High for dashboard composition |
| Acceptable alternate | Claude Sonnet 5 - xhigh may lead if data contracts are already stable |
| Independent reviewer | Codex GPT-5.6 Sol - High for scope-leakage review |
| Handoff sensitivity | High |
| Recommended handoff pattern | Codex commits globally scoped repository outputs first. Claude composes the coordinated dashboard. Codex confirms no group data is mislabeled global. |

| Stop rule | Complete only this phase or its explicitly assigned substep. Commit, write the handoff file, and stop before beginning the next phase. |
| --- | --- |

## Outcome of this phase

Global overview, tempo and conditions, and baseline entity summaries separated from group and player data.

## Why this phase comes now

The existing Insights page mixes several scopes; global data needs its own route and language.

## Prerequisites

- Global repository capabilities are known.

- Shared filters and page components are available.

## Inspect before editing

- GlobalMetricBoard

- GlobalSummaryBoard

- CorporationMetaPanel

- AwardMapSummary

- MapPerformanceList

- Global map, corporation, style, tag, milestone, award, player-count, and generation queries

## Do not do in this phase

- Do not display group metrics as global.

- Do not imply unsupported date or filter support.

- Do not hard-code game-length boundaries.

## Expanded working sequence

The source step order is preserved. Each row is a bounded implementation assignment and must end with its own validation, documentation, clean commit, and handoff.

| Source step | Bounded execution result | Stop condition |
| --- | --- | --- |
| 8.1 — Create global views | Overview; Tempo & Conditions; Cards; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 8.2 — Implement Overview | Games; Maps; Corporations; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 8.3 — Implement Tempo & Conditions baseline | Table-size metrics; Generation distribution; Game-length categories when centrally defined; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 8.4 — Migrate existing global summaries | Refactor rather than simply stack old cards.; Use shared sections, KPIs, and tables. | Commit and hand off this source step; do not begin the next source heading. |
| 8.5 — Add honest incomplete views | Tabs not yet implemented should show a clear partial or planned state, not mock values. | Commit and hand off this source step; do not begin the next source heading. |
| 8.6 — Use production graphics in Global Insights | Use production graphics in Global Insights | Commit and hand off this source step; do not begin the next source heading. |
| 8.7 — Add global card-acquisition and TR pace | Add average and median cards bought per player by generation, cumulative cards-bought curves, and early/mid/late purchase intensity when coverage supports them.; Add global TR progression and TR gain by generation using game-level/player-level observations with documented weighting.; Provide exact-generation and normalized-phase modes. Do not compare generation 12 directly with shorter games without explicit eligibility rules.; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| Source heading — Public evidence and identity privacy | Use the centralized public player-name resolver for every public player label.; After a successful claim, show the registered username or an approved public handle; never fall back to first name, last name, full name, email, authentication ID, normalized personal name, or private aliases.; Keep original import evidence and private claim-matching data behind authenticated and authorized boundaries.; and the remaining source-defined items | Apply and validate this source contract at this exact position before continuing. |

## Step 8.1 — Create global views

### Source-defined scope

- Overview
- Tempo & Conditions
- Cards
- Tags
- Corporations & Preludes
- Objectives & Endgame
- Board Intelligence

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GlobalMetricBoard
  - GlobalSummaryBoard
  - CorporationMetaPanel
  - AwardMapSummary
  - MapPerformanceList
  - Global map, corporation, style, tag, milestone, award, player-count, and generation queries
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
  - [ ] Overview
  - [ ] Tempo & Conditions
  - [ ] Cards
  - [ ] Tags
  - [ ] Corporations & Preludes
  - [ ] Objectives & Endgame
  - [ ] Board Intelligence
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

- [ ] Overview
- [ ] Tempo & Conditions
- [ ] Cards
- [ ] Tags
- [ ] Corporations & Preludes
- [ ] Objectives & Endgame
- [ ] Board Intelligence
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 8.2 — Implement Overview

### Source-defined scope

- Games
- Maps
- Corporations
- Common map
- Common corporation
- Common style
- Common tag
- Typical player count
- Typical game length
- Coverage
- Global win margin statistics when final-score coverage supports them
- Average and median winner-to-runner-up differential
- Close-win and decisive-win shares
- Win margin distribution and trend by period

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GlobalMetricBoard
  - GlobalSummaryBoard
  - CorporationMetaPanel
  - AwardMapSummary
  - MapPerformanceList
  - Global map, corporation, style, tag, milestone, award, player-count, and generation queries
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
- Use the canonical winning score minus highest opponent score formula only for qualifying wins and keep tied-first outcomes separate.
- Show qualifying wins and total games, enforce minimum-wins eligibility, and aggregate from qualifying game-level margins.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Games
  - [ ] Maps
  - [ ] Corporations
  - [ ] Common map
  - [ ] Common corporation
  - [ ] Common style
  - [ ] Common tag
  - [ ] Typical player count
  - [ ] Typical game length
  - [ ] Coverage
  - [ ] Global win margin statistics when final-score coverage supports them
  - [ ] Average and median winner-to-runner-up differential
  - [ ] Close-win and decisive-win shares
  - [ ] Win margin distribution and trend by period
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
- Test every distinct missing-data state and confirm labels, calculations, tables, and URL filters preserve the distinction.
- Test multiplayer runner-up selection, two-player games, tied first, missing scores, threshold boundaries, filtered samples, and aggregation weighting.

### Step completion gate

- [ ] Games
- [ ] Maps
- [ ] Corporations
- [ ] Common map
- [ ] Common corporation
- [ ] Common style
- [ ] Common tag
- [ ] Typical player count
- [ ] Typical game length
- [ ] Coverage
- [ ] Global win margin statistics when final-score coverage supports them
- [ ] Average and median winner-to-runner-up differential
- [ ] Close-win and decisive-win shares
- [ ] Win margin distribution and trend by period
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 8.3 — Implement Tempo & Conditions baseline

### Source-defined scope

- Table-size metrics
- Generation distribution
- Game-length categories when centrally defined
- Map performance

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GlobalMetricBoard
  - GlobalSummaryBoard
  - CorporationMetaPanel
  - AwardMapSummary
  - MapPerformanceList
  - Global map, corporation, style, tag, milestone, award, player-count, and generation queries
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Table-size metrics
  - [ ] Generation distribution
  - [ ] Game-length categories when centrally defined
  - [ ] Map performance
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

### Step completion gate

- [ ] Table-size metrics
- [ ] Generation distribution
- [ ] Game-length categories when centrally defined
- [ ] Map performance
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 8.4 — Migrate existing global summaries

### Source-defined scope

- Refactor rather than simply stack old cards.
- Use shared sections, KPIs, and tables.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GlobalMetricBoard
  - GlobalSummaryBoard
  - CorporationMetaPanel
  - AwardMapSummary
  - MapPerformanceList
  - Global map, corporation, style, tag, milestone, award, player-count, and generation queries
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Refactor rather than simply stack old cards.
  - [ ] Use shared sections, KPIs, and tables.
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

### Step completion gate

- [ ] Refactor rather than simply stack old cards.
- [ ] Use shared sections, KPIs, and tables.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 8.5 — Add honest incomplete views

### Source-defined scope

- Tabs not yet implemented should show a clear partial or planned state, not mock values.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GlobalMetricBoard
  - GlobalSummaryBoard
  - CorporationMetaPanel
  - AwardMapSummary
  - MapPerformanceList
  - Global map, corporation, style, tag, milestone, award, player-count, and generation queries
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

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Tabs not yet implemented should show a clear partial or planned state, not mock values.
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
- Test every distinct missing-data state and confirm labels, calculations, tables, and URL filters preserve the distinction.

### Step completion gate

- [ ] Tabs not yet implemented should show a clear partial or planned state, not mock values.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 8.6 — Use production graphics in Global Insights

### Source-defined scope

- Complete the source-defined work named by this step without expanding its scope.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GlobalMetricBoard
  - GlobalSummaryBoard
  - CorporationMetaPanel
  - AwardMapSummary
  - MapPerformanceList
  - Global map, corporation, style, tag, milestone, award, player-count, and generation queries
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
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

## Step 8.7 — Add global card-acquisition and TR pace

### Source-defined scope

- Add average and median cards bought per player by generation, cumulative cards-bought curves, and early/mid/late purchase intensity when coverage supports them.
- Add global TR progression and TR gain by generation using game-level/player-level observations with documented weighting.
- Provide exact-generation and normalized-phase modes. Do not compare generation 12 directly with shorter games without explicit eligibility rules.
- Expose complete and partial timeline counts and allow filters to update both card-acquisition and TR graphics together.
- Use corporation logos in rankings, selectors, tables, detail panels, and entity links.
- Use tag graphics in tag summaries, charts, tables, and filter chips.
- Use point-source graphics in scoring composition, legends, and KPI summaries.
- Keep graphics paired with readable text labels.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GlobalMetricBoard
  - GlobalSummaryBoard
  - CorporationMetaPanel
  - AwardMapSummary
  - MapPerformanceList
  - Global map, corporation, style, tag, milestone, award, player-count, and generation queries
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
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
  - [ ] Add average and median cards bought per player by generation, cumulative cards-bought curves, and early/mid/late purchase intensity when coverage supports them.
  - [ ] Add global TR progression and TR gain by generation using game-level/player-level observations with documented weighting.
  - [ ] Provide exact-generation and normalized-phase modes. Do not compare generation 12 directly with shorter games without explicit eligibility rules.
  - [ ] Expose complete and partial timeline counts and allow filters to update both card-acquisition and TR graphics together.
  - [ ] Use corporation logos in rankings, selectors, tables, detail panels, and entity links.
  - [ ] Use tag graphics in tag summaries, charts, tables, and filter chips.
  - [ ] Use point-source graphics in scoring composition, legends, and KPI summaries.
  - [ ] Keep graphics paired with readable text labels.
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

- [ ] Add average and median cards bought per player by generation, cumulative cards-bought curves, and early/mid/late purchase intensity when coverage supports them.
- [ ] Add global TR progression and TR gain by generation using game-level/player-level observations with documented weighting.
- [ ] Provide exact-generation and normalized-phase modes. Do not compare generation 12 directly with shorter games without explicit eligibility rules.
- [ ] Expose complete and partial timeline counts and allow filters to update both card-acquisition and TR graphics together.
- [ ] Use corporation logos in rankings, selectors, tables, detail panels, and entity links.
- [ ] Use tag graphics in tag summaries, charts, tables, and filter chips.
- [ ] Use point-source graphics in scoring composition, legends, and KPI summaries.
- [ ] Keep graphics paired with readable text labels.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Cross-cutting contract — Public evidence and identity privacy

- Use the centralized public player-name resolver for every public player label.
- After a successful claim, show the registered username or an approved public handle; never fall back to first name, last name, full name, email, authentication ID, normalized personal name, or private aliases.
- Keep original import evidence and private claim-matching data behind authenticated and authorized boundaries.
- Exclude private personal-name fields from public repository outputs, route loaders, client DTOs, hydration data, APIs, RPCs, metadata, exports, logs, telemetry, and analytics events.
- Preserve the existing player ID and historical game relationships when public presentation changes after claim.

### Required application across the phase

- Apply this contract to every relevant query, repository DTO, server component, client payload, visual label, table, detail surface, export, metadata path, test, and handoff in the phase.
- Validate it during each bounded source step rather than postponing it to final closure.
- Record any unsupported surface or data gap explicitly; do not imply completion through styling or fallback text.
- Use stable player IDs for relationships and the centralized public-name resolver for presentation.
- Exclude private names, aliases, normalized matching values, email, and authentication identifiers from public/client payloads rather than hiding them after serialization.
- Inspect route payloads, DTOs, RPCs, views, metadata, exports, hydration, logs, telemetry, analytics events, and user-visible errors for leakage.
- Run known-test-name payload scans and verify neutral fallback behavior when username is unavailable.

## Card acquisition integration — carried forward

>  **Provenance:** this section is REPO-NATIVE, not derived from the Word guide. It was
>  already present in `docs/redesign/phases/08-global-insights.md` and is carried forward here because
>  the Word-derived expansion contains none of it — no mention of purchase conversion,
>  cards seen, hand utilization, end-hand carryover, purchase pace, seen pace, purchased
>  hand share, or cards purchased. Verbatim; nothing rewritten.

Include aggregate Cards Purchased, Cards Seen, Purchase Conversion, and
outcome associations under the Cards analysis area.

Support filtering by:

- Game length
- Generation count
- Player count
- Drafting
- Corporation
- Prelude

Show eligible-game counts and data coverage for every result.


## Copy-ready agent execution prompt

> Perform Phase 8 only: build /insights/global using verified globally scoped repositories. Create view tabs for Overview; Tempo & Conditions; Cards; Tags; Corporations & Preludes; Objectives & Endgame; Board Intelligence.
>
> Fully implement the Overview and Tempo & Conditions baseline using current global maps, corporations, styles, tags, milestones, awards, player-count, and generation metrics. Refactor GlobalMetricBoard, GlobalSummaryBoard, CorporationMetaPanel, AwardMapSummary, and other global components into a coordinated page rather than stacking them unchanged.
>
> Do not mix group or player metrics into global analysis. Do not expose filters that queries cannot honor. Centralize any game-length classification. Unimplemented domain views must show an honest partial-data or upcoming state without mock statistics.
> PRODUCTION GRAPHICS
> Integrate Supabase production graphics into Global Insights. Use corporation logos, tag graphics, and point-source graphics through the shared resolver in rankings, selectors, charts, legends, tables, KPIs, and details. Never build page-specific storage URLs.
> GLOBAL INSIGHTS DASHBOARD COMPOSITION
> Do not stack legacy global components unchanged. Build a combined overview with KPI strip, meta composition, tempo/condition distribution, ranked entity panels, trend or comparison graphics, and evidence tables.
> Use corporation logos, tag graphics, and point-source graphics in entity labels, legends, selectors, cards, and detail panels through the shared asset resolver.
> GLOBAL WIN DIFFERENTIAL
> - When global final-score coverage supports it, add average and median winner-to-runner-up differential, close-win and decisive-win shares, a game-level margin distribution, and period trend. Aggregate qualifying game margins directly rather than averaging player averages.
> Global temporal analytics
> Use the new per-generation records to add global cards-bought pace and Terraforming Rating progression to Tempo & Conditions.
> Provide exact-generation and normalized-phase modes, documented aggregation weighting, visible coverage, synchronized filters, and accessible summaries.
> Do not fill missing values, average player averages without labeling the method, or imply that more purchased cards caused better outcomes.

## Acceptance checklist

- [ ] Global route uses global data only.

- [ ] Global win point differential is calculated from game-level winner margins and does not average player averages.

- [ ] Existing global values remain numerically consistent.

- [ ] Overview and conditions are functional.

- [ ] Partial views are honest.

- [ ] Loading, empty, and error states work.

- [ ] Filters match query capability.

- [ ] Global Insights uses production corporation, tag, and point-source graphics consistently.

- [ ] Global Overview and Tempo & Conditions use combined dashboard layouts rather than stacking legacy components unchanged.

- [ ] Corporation, tag, and point-source graphics resolve through the shared Supabase layer in every relevant visual.

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

- Phase 8 may be marked complete only after every source step above has its own accepted handoff and the phase acceptance checklist passes as one integrated system.
- A later phase must not begin automatically. The final handoff identifies only the next possible separately authorized phase or remediation task.
- Any formula, migration, authorization rule, public-data contract, or URL-state change requires the independent review specified by the Word guide.
- Production migration, backfill, RLS mutation, Storage change, push, or deployment remains prohibited unless a separate explicit authorization and evidence record exists.
