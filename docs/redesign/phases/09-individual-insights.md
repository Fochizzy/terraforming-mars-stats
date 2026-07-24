# Phase 9 — Individual Insights Baseline

Create the selected-player analytics workspace and migrate current personal analysis into clear views.

> **Source authority:** `TM_Stats_Redesign_Integrated_Full_Implementation_Guide_2026-07-19_Expanded_Step_4_3(5).docx`, Phase 9.
>
> **Preservation rule:** The source steps, their order, their dependencies, and their stop conditions are unchanged. The stage headings in this Markdown file only divide each source step into smaller reviewable checkpoints using the guide’s existing `Read → Inspect → Plan → Implement → Test → Render/Review → Document → Commit → Handoff` process.

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
> **Corrected in this document:** `Step 9.2 — Implement Overview` → `Stage B — Define the
> bounded contract`.
>
> **NOT corrected, and readers must not build from it unaltered.** The
> `Copy-ready agent execution prompt` section, under `INDIVIDUAL WIN DIFFERENTIAL`, still
> reads "Hide or qualify these when the minimum-wins threshold is not met." It is
> **carried source text** governed by this file's Preservation rule above, so it was left
> **verbatim** rather than rewritten. It conflicts with R-14 **twice**: the gate is
> games-played, not wins; and under R-14 a result below a present threshold is **hidden,
> not shown flagged as low-sample**, so "or qualify" is superseded too. **Whether carried
> source text may be corrected in place is an owner question and has not been decided.**
>
> The pre-correction wording is retained in git history rather than in a per-site banner —
> a deliberate departure from per-site marking, recorded in the handoff. **The per-metric
> threshold mechanism above the floor is open analytics question Q-1** and is deliberately
> **not** specified here; sites in this document reading "when the player has enough
> qualifying wins" were therefore left untouched as Q-1-dependent.

## Status

Phase 9 is **planned and not started** unless `docs/REDESIGN_STATE.md` and a later explicit owner assignment say otherwise. This file does not authorize implementation, migration, production mutation, push, deployment, or work on a later phase.

## Recommended agent and effort

| Field | Recommendation |
| --- | --- |
| Preferred execution | Codex |
| Recommended configuration | GPT-5.6 Sol - Extra High - Standard |
| Acceptable alternate | Claude Sonnet 5 - xhigh effort |
| Independent reviewer | Claude Opus 4.8 - xhigh for information hierarchy and scope review |
| Handoff sensitivity | High |
| Recommended handoff pattern | Codex migrates player-scoped analytics and URL state. Claude reviews the combined dashboard and evidence flow without changing formulas. |

| Stop rule | Complete only this phase or its explicitly assigned substep. Commit, write the handoff file, and stop before beginning the next phase. |
| --- | --- |

## Outcome of this phase

A player-scoped route with overview, player selection, filters, recent evidence, and homes for all detailed analytics.

## Why this phase comes now

My Profile should not remain the primary location for deep analysis.

## Prerequisites

- Player scope and URL state exist.

- Profile redesign provides navigation to this page.

## Inspect before editing

- ProfileDashboard

- StyleEffectivenessPanel

- ScoreProfilePanel

- ScoreSourceRadar

- ScoreSourceList

- Player map and efficiency metrics

- Head-to-head rows

- Trend data

- Recent games

- Player coverage

## Do not do in this phase

- Do not add unsupported metrics.

- Do not duplicate global or group calculations.

- Do not remove legacy rendering until numerical comparisons pass.

## Expanded working sequence

The source step order is preserved. Each row is a bounded implementation assignment and must end with its own validation, documentation, clean commit, and handoff.

| Source step | Bounded execution result | Stop condition |
| --- | --- | --- |
| 9.1 — Create player views | Overview; Scoring Identity; Play Style; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 9.2 — Implement Overview | Games; Wins; Win rate; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 9.3 — Persist player context | Selected player in URL; Current group; Player selector; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 9.4 — Migrate existing personal modules | Move current metrics into correct view shells.; Compare old and new values.; Keep traceability to recent games. | Commit and hand off this source step; do not begin the next source heading. |
| 9.5 — Add filters carefully | Player; Group; Date range; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 9.6 — Use production graphics in Individual Insights | Use production graphics in Individual Insights | Commit and hand off this source step; do not begin the next source heading. |
| 9.7 — Add player temporal summary | Show average cards bought per generation, cumulative purchase pace, average TR gain per generation, final TR, and early/mid/late TR pace when sample size supports them.; Add a compact linked cards-bought and TR progression preview on Overview with links to Engine Development and Game State & Tempo.; Let users open the qualifying games and exact generation observations behind outliers.; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| Source heading — Selected-player identity privacy | Use the centralized public player-name resolver for every public player label.; After a successful claim, show the registered username or an approved public handle; never fall back to first name, last name, full name, email, authentication ID, normalized personal name, or private aliases.; Keep original import evidence and private claim-matching data behind authenticated and authorized boundaries.; and the remaining source-defined items | Apply and validate this source contract at this exact position before continuing. |

## Step 9.1 — Create player views

### Source-defined scope

- Overview
- Scoring Identity
- Play Style
- Engine Development
- Cards & Tags
- Corporations & Preludes
- Game State & Tempo
- Competition
- Board Control
- Objectives & Endgame
- Games

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - ProfileDashboard
  - StyleEffectivenessPanel
  - ScoreProfilePanel
  - ScoreSourceRadar
  - ScoreSourceList
  - Player map and efficiency metrics
  - Head-to-head rows
  - Trend data
  - Recent games
  - Player coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Use stable player IDs for relationships and the centralized public-name resolver for presentation.
- Exclude private names, aliases, normalized matching values, email, and authentication identifiers from public/client payloads rather than hiding them after serialization.
- Require canonical map, space, placement, ownership, attribution, provenance, and coverage fields before enabling spatial analysis.
- Do not infer coordinates, ownership, actor, or board completion from final totals or incomplete events.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Overview
  - [ ] Scoring Identity
  - [ ] Play Style
  - [ ] Engine Development
  - [ ] Cards & Tags
  - [ ] Corporations & Preludes
  - [ ] Game State & Tempo
  - [ ] Competition
  - [ ] Board Control
  - [ ] Objectives & Endgame
  - [ ] Games
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
- Inspect route payloads, DTOs, RPCs, views, metadata, exports, hydration, logs, telemetry, analytics events, and user-visible errors for leakage.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Run known-test-name payload scans and verify neutral fallback behavior when username is unavailable.
- Test map variants, unresolved spaces, unattributed placements, replacements/removals, partial coverage, and no-coordinate fallbacks.

### Step completion gate

- [ ] Overview
- [ ] Scoring Identity
- [ ] Play Style
- [ ] Engine Development
- [ ] Cards & Tags
- [ ] Corporations & Preludes
- [ ] Game State & Tempo
- [ ] Competition
- [ ] Board Control
- [ ] Objectives & Endgame
- [ ] Games
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 9.2 — Implement Overview

### Source-defined scope

- Games
- Wins
- Win rate
- Average score
- Average placement
- Average win point differential
- Median win point differential
- Closest and largest win
- Close-win and decisive-win rates
- Points per generation
- Score versus expected if supported
- Recent form
- Best score source
- Best tag lane
- Best condition
- Win margin trend and distribution when the player has enough qualifying wins
- Confidence

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - ProfileDashboard
  - StyleEffectivenessPanel
  - ScoreProfilePanel
  - ScoreSourceRadar
  - ScoreSourceList
  - Player map and efficiency metrics
  - Head-to-head rows
  - Trend data
  - Recent games
  - Player coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Use the canonical winning score minus highest opponent score formula only for qualifying wins and keep tied-first outcomes separate.
- Show qualifying wins and total games, apply the eligibility rules recorded for owner ruling R-14 in `docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md`, and aggregate from qualifying game-level margins.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Games
  - [ ] Wins
  - [ ] Win rate
  - [ ] Average score
  - [ ] Average placement
  - [ ] Average win point differential
  - [ ] Median win point differential
  - [ ] Closest and largest win
  - [ ] Close-win and decisive-win rates
  - [ ] Points per generation
  - [ ] Score versus expected if supported
  - [ ] Recent form
  - [ ] Best score source
  - [ ] Best tag lane
  - [ ] Best condition
  - [ ] Win margin trend and distribution when the player has enough qualifying wins
  - [ ] Confidence
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
- Test multiplayer runner-up selection, two-player games, tied first, missing scores, threshold boundaries, filtered samples, and aggregation weighting.

### Step completion gate

- [ ] Games
- [ ] Wins
- [ ] Win rate
- [ ] Average score
- [ ] Average placement
- [ ] Average win point differential
- [ ] Median win point differential
- [ ] Closest and largest win
- [ ] Close-win and decisive-win rates
- [ ] Points per generation
- [ ] Score versus expected if supported
- [ ] Recent form
- [ ] Best score source
- [ ] Best tag lane
- [ ] Best condition
- [ ] Win margin trend and distribution when the player has enough qualifying wins
- [ ] Confidence
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 9.3 — Persist player context

### Source-defined scope

- Selected player in URL
- Current group
- Player selector
- Preserve compatible filters across views

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - ProfileDashboard
  - StyleEffectivenessPanel
  - ScoreProfilePanel
  - ScoreSourceRadar
  - ScoreSourceList
  - Player map and efficiency metrics
  - Head-to-head rows
  - Trend data
  - Recent games
  - Player coverage
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
  - [ ] Selected player in URL
  - [ ] Current group
  - [ ] Player selector
  - [ ] Preserve compatible filters across views
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

- [ ] Selected player in URL
- [ ] Current group
- [ ] Player selector
- [ ] Preserve compatible filters across views
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 9.4 — Migrate existing personal modules

### Source-defined scope

- Move current metrics into correct view shells.
- Compare old and new values.
- Keep traceability to recent games.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - ProfileDashboard
  - StyleEffectivenessPanel
  - ScoreProfilePanel
  - ScoreSourceRadar
  - ScoreSourceList
  - Player map and efficiency metrics
  - Head-to-head rows
  - Trend data
  - Recent games
  - Player coverage
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
  - [ ] Move current metrics into correct view shells.
  - [ ] Compare old and new values.
  - [ ] Keep traceability to recent games.
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

### Step completion gate

- [ ] Move current metrics into correct view shells.
- [ ] Compare old and new values.
- [ ] Keep traceability to recent games.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 9.5 — Add filters carefully

### Source-defined scope

- Player
- Group
- Date range
- Map
- Player count
- Catalog expansion metadata only where applicable; no game-level expansion filter
- Generation range
- Minimum sample
- Finalized only - only when supported

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - ProfileDashboard
  - StyleEffectivenessPanel
  - ScoreProfilePanel
  - ScoreSourceRadar
  - ScoreSourceList
  - Player map and efficiency metrics
  - Head-to-head rows
  - Trend data
  - Recent games
  - Player coverage
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
  - [ ] Player
  - [ ] Group
  - [ ] Date range
  - [ ] Map
  - [ ] Player count
  - [ ] Catalog expansion metadata only where applicable; no game-level expansion filter
  - [ ] Generation range
  - [ ] Minimum sample
  - [ ] Finalized only - only when supported
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

- [ ] Player
- [ ] Group
- [ ] Date range
- [ ] Map
- [ ] Player count
- [ ] Catalog expansion metadata only where applicable; no game-level expansion filter
- [ ] Generation range
- [ ] Minimum sample
- [ ] Finalized only - only when supported
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 9.6 — Use production graphics in Individual Insights

### Source-defined scope

- Complete the source-defined work named by this step without expanding its scope.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - ProfileDashboard
  - StyleEffectivenessPanel
  - ScoreProfilePanel
  - ScoreSourceRadar
  - ScoreSourceList
  - Player map and efficiency metrics
  - Head-to-head rows
  - Trend data
  - Recent games
  - Player coverage
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

## Step 9.7 — Add player temporal summary

### Source-defined scope

- Show average cards bought per generation, cumulative purchase pace, average TR gain per generation, final TR, and early/mid/late TR pace when sample size supports them.
- Add a compact linked cards-bought and TR progression preview on Overview with links to Engine Development and Game State & Tempo.
- Let users open the qualifying games and exact generation observations behind outliers.
- Use the selected player corporation logo in recent games and corporation or pairing analysis.
- Use point-source graphics throughout Scoring Identity and score breakdown summaries.
- Use tag graphics in tag lanes, tag outcomes, and filters.
- Use shared components instead of page-specific image lookup.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - ProfileDashboard
  - StyleEffectivenessPanel
  - ScoreProfilePanel
  - ScoreSourceRadar
  - ScoreSourceList
  - Player map and efficiency metrics
  - Head-to-head rows
  - Trend data
  - Recent games
  - Player coverage
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
- Use stable player IDs for relationships and the centralized public-name resolver for presentation.
- Exclude private names, aliases, normalized matching values, email, and authentication identifiers from public/client payloads rather than hiding them after serialization.
- Keep recommendation rules deterministic, thresholded, evidence-backed, and non-causal.
- Require a comparison baseline, eligible-game count, coverage, uncertainty, and supporting games before emitting a recommendation.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Show average cards bought per generation, cumulative purchase pace, average TR gain per generation, final TR, and early/mid/late TR pace when sample size supports them.
  - [ ] Add a compact linked cards-bought and TR progression preview on Overview with links to Engine Development and Game State & Tempo.
  - [ ] Let users open the qualifying games and exact generation observations behind outliers.
  - [ ] Use the selected player corporation logo in recent games and corporation or pairing analysis.
  - [ ] Use point-source graphics throughout Scoring Identity and score breakdown summaries.
  - [ ] Use tag graphics in tag lanes, tag outcomes, and filters.
  - [ ] Use shared components instead of page-specific image lookup.
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
- Inspect route payloads, DTOs, RPCs, views, metadata, exports, hydration, logs, telemetry, analytics events, and user-visible errors for leakage.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test successful lookup, missing record, malformed path, accessible name, responsive sizing, and fallback rendering.
- Test out-of-order records, duplicate generations, different game lengths, partial timelines, explicit zero, missing values, and filter propagation.
- Run known-test-name payload scans and verify neutral fallback behavior when username is unavailable.
- Test threshold edges, conflicting signals, merged root causes, insufficient evidence, and stable recommendation ordering.

### Step completion gate

- [ ] Show average cards bought per generation, cumulative purchase pace, average TR gain per generation, final TR, and early/mid/late TR pace when sample size supports them.
- [ ] Add a compact linked cards-bought and TR progression preview on Overview with links to Engine Development and Game State & Tempo.
- [ ] Let users open the qualifying games and exact generation observations behind outliers.
- [ ] Use the selected player corporation logo in recent games and corporation or pairing analysis.
- [ ] Use point-source graphics throughout Scoring Identity and score breakdown summaries.
- [ ] Use tag graphics in tag lanes, tag outcomes, and filters.
- [ ] Use shared components instead of page-specific image lookup.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Cross-cutting contract — Selected-player identity privacy

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
>  already present in `docs/redesign/phases/09-individual-insights.md`, verified word-identical to the
>  published copy, and is carried forward here because the Word-derived expansion does
>  not contain it. Verbatim; nothing rewritten.

Include the selected player's:

- Purchase pace
- Seen pace
- Purchase conversion
- Purchased hand share
- Hand utilization
- End-hand carryover
- Outcome ranges
- Generation timeline
- Group and global comparisons

Show eligible games, coverage, and low-sample warnings.


## Copy-ready agent execution prompt

> Perform Phase 9 only: build /insights/individual as the main selected-player analytics workspace. Persist the selected player and compatible filters in the URL.
>
> Create views for Overview; Scoring Identity; Play Style; Engine Development; Cards & Tags; Corporations & Preludes; Game State & Tempo; Competition; Board Control; Objectives & Endgame; Games. Fully implement Overview using current verified player metrics and recent games. Migrate existing personal components into the correct view shells without adding unsupported analytics.
>
> Compare every migrated value with the old implementation. Keep recent games and evidence links. Omit or disable filters not honored by the repositories. Do not delete legacy rendering until the migrated values and interactions pass tests.
> PRODUCTION GRAPHICS
> Integrate Supabase corporation logos, tag graphics, and point-source graphics into Individual Insights through the shared components. Keep text labels, sample information, and numeric values visible.
> INDIVIDUAL INSIGHTS DASHBOARD COMPOSITION
> Build a coordinated player overview with KPI strip, scoring composition, performance trend, selected strength/weakness insight, and recent-game evidence.
> Selections from score sources, styles, corporations, tags, maps, and opponents must update related charts, tables, detail drawers, and URL state.
> Use corporation logos in game and pairing context and point-source/tag graphics in scoring and tag analysis.
> INDIVIDUAL WIN DIFFERENTIAL
> - In Individual Overview add average and median win point differential, closest and largest win, close-win and decisive-win rates, qualifying-win count, margin distribution, recent win-margin trend, and supporting-game drill-down. Hide or qualify these when the minimum-wins threshold is not met.
> Player temporal summary
> Add a compact cards-bought and TR progression summary using the new player-by-generation data.
> Show average purchase pace, cumulative cards bought, TR gain, final TR, phase splits, coverage, and supporting games. Link deeper analysis to Engine Development and Game State & Tempo.
> Keep cards bought distinct from cards played and keep missing generations distinct from explicit zero purchases.

## Acceptance checklist

- [ ] Individual route is truly player scoped.

- [ ] Player and filters are shareable.

- [ ] Overview is functional.

- [ ] Existing personal values agree.

- [ ] Recent games provide evidence.

- [ ] Profile no longer needs deep analytics.

- [ ] Individual Insights uses production graphics through the shared resolver.

- [ ] Individual Overview combines performance, scoring, trend, insights, and recent-game evidence in one coherent dashboard.

- [ ] Selected entities and metrics synchronize across related charts, tables, details, and URL state.

- [ ] Player win point differential shows the runner-up gap, qualifying-win sample, distribution, and links to supporting games.

- [ ] Player temporal summaries use the new generation data, display coverage, and link to supporting games.

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

- Phase 9 may be marked complete only after every source step above has its own accepted handoff and the phase acceptance checklist passes as one integrated system.
- A later phase must not begin automatically. The final handoff identifies only the next possible separately authorized phase or remediation task.
- Any formula, migration, authorization rule, public-data contract, or URL-state change requires the independent review specified by the Word guide.
- Production migration, backfill, RLS mutation, Storage change, push, or deployment remains prohibited unless a separate explicit authorization and evidence record exists.
