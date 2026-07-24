# Phase 10 — Group Insights Baseline

Create a coherent group analytics destination after separating Leaderboard and global metrics.

> **Source authority:** `TM_Stats_Redesign_Integrated_Full_Implementation_Guide_2026-07-19_Expanded_Step_4_3(5).docx`, Phase 10.
>
> **Preservation rule:** The source steps, their order, their dependencies, and their stop conditions are unchanged. The stage headings in this Markdown file only divide each source step into smaller reviewable checkpoints using the guide’s existing `Read → Inspect → Plan → Implement → Test → Render/Review → Document → Commit → Handoff` process.

> **SUPERSEDED IN PLACE by owner ruling R-14 (2026-07-23) — wins-based eligibility.**
> This document previously required **"minimum-wins eligibility"**. That was wrong **in
> kind**, not merely in value: the eligibility rule counts **games played**, not wins.
> The affected sites now **point at** the rule instead of restating it —
> `docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md` → "Universal
> eligibility floor and per-metric display gates (owner ruling R-14, 2026-07-23)", whose
> ruling text is recorded as **R-14** in `docs/redesign/DECISIONS.md`. **No threshold
> value is restated here; the contract holds the number** (process rule P-2,
> `docs/redesign/MASTER-RULES.md`).
>
> **Corrected in this document:** `Step 10.2 — Implement Overview` and `Step 10.3 —
> Implement Members`, each under `Stage B — Define the bounded contract`.
>
> The pre-correction wording is retained in git history rather than in a per-site banner —
> a deliberate departure from per-site marking, recorded in the handoff. **The per-metric
> threshold mechanism above the floor is open analytics question Q-1** and is deliberately
> **not** specified here.

## Status

Phase 10 is **planned and not started** unless `docs/REDESIGN_STATE.md` and a later explicit owner assignment say otherwise. This file does not authorize implementation, migration, production mutation, push, deployment, or work on a later phase.

## Recommended agent and effort

| Field | Recommendation |
| --- | --- |
| Preferred execution | Codex |
| Recommended configuration | GPT-5.6 Sol - Extra High - Standard |
| Acceptable alternate | Claude Opus 4.8 - xhigh effort |
| Independent reviewer | Claude Opus 4.8 - xhigh for group-scope and chemistry-preparation review |
| Handoff sensitivity | High |
| Recommended handoff pattern | Codex separates group, global, and leaderboard ownership. Claude reviews whether the page answers group performance questions without scope leakage. |

| Stop rule | Complete only this phase or its explicitly assigned substep. Commit, write the handoff file, and stop before beginning the next phase. |
| --- | --- |

## Outcome of this phase

Group overview, members, matchups, lineups, scoring, styles, objectives, games, and data quality.

## Why this phase comes now

Group analysis should answer how the group performs and what group-specific interaction explains it.

## Prerequisites

- Leaderboard migration is complete.

- Group data and member queries are documented.

## Inspect before editing

- GroupDashboard

- HeadToHeadLensFrame

- LineupEffectsPanel

- Group interaction rows

- Group score-source averages

- Group styles

- FinalTerraformingActionTable

- Group games

- Coverage components

## Do not do in this phase

- Do not re-embed the full Leaderboard.

- Do not mix global summaries into group metrics.

- Do not call residual differences chemistry without a model.

## Expanded working sequence

The source step order is preserved. Each row is a bounded implementation assignment and must end with its own validation, documentation, clean commit, and handoff.

| Source step | Bounded execution result | Stop condition |
| --- | --- | --- |
| 10.1 — Create group views | Overview; Members; Chemistry; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 10.2 — Implement Overview | Games; Active players; Win rate; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 10.3 — Implement Members | Player; Games; Win rate; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 10.4 — Migrate matchup and lineup modules | Head-to-head rows; HeadToHeadLensFrame; LineupEffectsPanel; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 10.5 — Migrate scoring and endgame modules | Score-source averages; Style performance; Style agreement; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 10.6 — Add games and data quality | Sortable group game history; Compact coverage badge; Dedicated Data Quality view or drawer | Commit and hand off this source step; do not begin the next source heading. |
| 10.7 — Use production graphics in Group Insights | Use production graphics in Group Insights | Commit and hand off this source step; do not begin the next source heading. |
| 10.8 — Add group card-acquisition and TR pace | Compare member cards-bought curves and TR progression using aligned generation scales and visible qualifying-game counts.; Show group median and member ranges rather than only a single average when enough observations exist.; Add filters for exact generation or normalized phase and link outlier observations to source games.; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| Source heading — Member identity privacy | Use the centralized public player-name resolver for every public player label.; After a successful claim, show the registered username or an approved public handle; never fall back to first name, last name, full name, email, authentication ID, normalized personal name, or private aliases.; Keep original import evidence and private claim-matching data behind authenticated and authorized boundaries.; and the remaining source-defined items | Apply and validate this source contract at this exact position before continuing. |

## Step 10.1 — Create group views

### Source-defined scope

- Overview
- Members
- Chemistry
- Matchups & Lineups
- Scoring & Styles
- Cards, Tags & Pairings
- Conditions & Tempo
- Objectives & Endgame
- Games
- Data Quality

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GroupDashboard
  - HeadToHeadLensFrame
  - LineupEffectsPanel
  - Group interaction rows
  - Group score-source averages
  - Group styles
  - FinalTerraformingActionTable
  - Group games
  - Coverage components
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

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Overview
  - [ ] Members
  - [ ] Chemistry
  - [ ] Matchups & Lineups
  - [ ] Scoring & Styles
  - [ ] Cards, Tags & Pairings
  - [ ] Conditions & Tempo
  - [ ] Objectives & Endgame
  - [ ] Games
  - [ ] Data Quality
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

- [ ] Overview
- [ ] Members
- [ ] Chemistry
- [ ] Matchups & Lineups
- [ ] Scoring & Styles
- [ ] Cards, Tags & Pairings
- [ ] Conditions & Tempo
- [ ] Objectives & Endgame
- [ ] Games
- [ ] Data Quality
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 10.2 — Implement Overview

### Source-defined scope

- Games
- Active players
- Win rate
- Average score
- Average placement
- Average and median win point differential across qualifying group wins
- Close-win and decisive-win shares
- Leader preview
- Closest rivalry
- Trend
- Confidence

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GroupDashboard
  - HeadToHeadLensFrame
  - LineupEffectsPanel
  - Group interaction rows
  - Group score-source averages
  - Group styles
  - FinalTerraformingActionTable
  - Group games
  - Coverage components
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
  - [ ] Active players
  - [ ] Win rate
  - [ ] Average score
  - [ ] Average placement
  - [ ] Average and median win point differential across qualifying group wins
  - [ ] Close-win and decisive-win shares
  - [ ] Leader preview
  - [ ] Closest rivalry
  - [ ] Trend
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
- [ ] Active players
- [ ] Win rate
- [ ] Average score
- [ ] Average placement
- [ ] Average and median win point differential across qualifying group wins
- [ ] Close-win and decisive-win shares
- [ ] Leader preview
- [ ] Closest rivalry
- [ ] Trend
- [ ] Confidence
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 10.3 — Implement Members

### Source-defined scope

- Player
- Games
- Win rate
- Placement
- Score
- Points per generation
- Difference versus personal overall
- Average win point differential with qualifying-win count
- Individual link

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GroupDashboard
  - HeadToHeadLensFrame
  - LineupEffectsPanel
  - Group interaction rows
  - Group score-source averages
  - Group styles
  - FinalTerraformingActionTable
  - Group games
  - Coverage components
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
  - [ ] Player
  - [ ] Games
  - [ ] Win rate
  - [ ] Placement
  - [ ] Score
  - [ ] Points per generation
  - [ ] Difference versus personal overall
  - [ ] Average win point differential with qualifying-win count
  - [ ] Individual link
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

- [ ] Player
- [ ] Games
- [ ] Win rate
- [ ] Placement
- [ ] Score
- [ ] Points per generation
- [ ] Difference versus personal overall
- [ ] Average win point differential with qualifying-win count
- [ ] Individual link
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 10.4 — Migrate matchup and lineup modules

### Source-defined scope

- Head-to-head rows
- HeadToHeadLensFrame
- LineupEffectsPanel
- Interaction rows

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GroupDashboard
  - HeadToHeadLensFrame
  - LineupEffectsPanel
  - Group interaction rows
  - Group score-source averages
  - Group styles
  - FinalTerraformingActionTable
  - Group games
  - Coverage components
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

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Head-to-head rows
  - [ ] HeadToHeadLensFrame
  - [ ] LineupEffectsPanel
  - [ ] Interaction rows
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

- [ ] Head-to-head rows
- [ ] HeadToHeadLensFrame
- [ ] LineupEffectsPanel
- [ ] Interaction rows
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 10.5 — Migrate scoring and endgame modules

### Source-defined scope

- Score-source averages
- Style performance
- Style agreement
- Final actions
- Milestones
- Awards

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GroupDashboard
  - HeadToHeadLensFrame
  - LineupEffectsPanel
  - Group interaction rows
  - Group score-source averages
  - Group styles
  - FinalTerraformingActionTable
  - Group games
  - Coverage components
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
  - [ ] Score-source averages
  - [ ] Style performance
  - [ ] Style agreement
  - [ ] Final actions
  - [ ] Milestones
  - [ ] Awards
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

- [ ] Score-source averages
- [ ] Style performance
- [ ] Style agreement
- [ ] Final actions
- [ ] Milestones
- [ ] Awards
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 10.6 — Add games and data quality

### Source-defined scope

- Sortable group game history
- Compact coverage badge
- Dedicated Data Quality view or drawer

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GroupDashboard
  - HeadToHeadLensFrame
  - LineupEffectsPanel
  - Group interaction rows
  - Group score-source averages
  - Group styles
  - FinalTerraformingActionTable
  - Group games
  - Coverage components
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
  - [ ] Sortable group game history
  - [ ] Compact coverage badge
  - [ ] Dedicated Data Quality view or drawer
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

- [ ] Sortable group game history
- [ ] Compact coverage badge
- [ ] Dedicated Data Quality view or drawer
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 10.7 — Use production graphics in Group Insights

### Source-defined scope

- Complete the source-defined work named by this step without expanding its scope.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GroupDashboard
  - HeadToHeadLensFrame
  - LineupEffectsPanel
  - Group interaction rows
  - Group score-source averages
  - Group styles
  - FinalTerraformingActionTable
  - Group games
  - Coverage components
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

## Step 10.8 — Add group card-acquisition and TR pace

### Source-defined scope

- Compare member cards-bought curves and TR progression using aligned generation scales and visible qualifying-game counts.
- Show group median and member ranges rather than only a single average when enough observations exist.
- Add filters for exact generation or normalized phase and link outlier observations to source games.
- Use corporation logos in member results, pairings, recent games, and comparison panels.
- Use tag and point-source graphics in group scoring, styles, cards, tags, and pairings.
- Keep all asset lookup scoped through the shared resolver.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - GroupDashboard
  - HeadToHeadLensFrame
  - LineupEffectsPanel
  - Group interaction rows
  - Group score-source averages
  - Group styles
  - FinalTerraformingActionTable
  - Group games
  - Coverage components
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
- Keep recommendation rules deterministic, thresholded, evidence-backed, and non-causal.
- Require a comparison baseline, eligible-game count, coverage, uncertainty, and supporting games before emitting a recommendation.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Compare member cards-bought curves and TR progression using aligned generation scales and visible qualifying-game counts.
  - [ ] Show group median and member ranges rather than only a single average when enough observations exist.
  - [ ] Add filters for exact generation or normalized phase and link outlier observations to source games.
  - [ ] Use corporation logos in member results, pairings, recent games, and comparison panels.
  - [ ] Use tag and point-source graphics in group scoring, styles, cards, tags, and pairings.
  - [ ] Keep all asset lookup scoped through the shared resolver.
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
- Test threshold edges, conflicting signals, merged root causes, insufficient evidence, and stable recommendation ordering.

### Step completion gate

- [ ] Compare member cards-bought curves and TR progression using aligned generation scales and visible qualifying-game counts.
- [ ] Show group median and member ranges rather than only a single average when enough observations exist.
- [ ] Add filters for exact generation or normalized phase and link outlier observations to source games.
- [ ] Use corporation logos in member results, pairings, recent games, and comparison panels.
- [ ] Use tag and point-source graphics in group scoring, styles, cards, tags, and pairings.
- [ ] Keep all asset lookup scoped through the shared resolver.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Cross-cutting contract — Member identity privacy

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
>  already present in `docs/redesign/phases/10-group-insights.md`, verified word-identical to the
>  published copy, and is carried forward here because the Word-derived expansion does
>  not contain it. Verbatim; nothing rewritten.

Include:

- Group-level purchase distributions
- Member comparisons
- Purchase conversion versus outcomes
- Cards seen versus outcomes
- Purchase pace by generation
- Lineup and context differences
- Group, player, and global baselines

Only show context-adjusted comparisons when the data supports them.


## Copy-ready agent execution prompt

> Perform Phase 10 only: build /insights/group using current group-scoped analytics. Create views for Overview; Members; Chemistry; Matchups & Lineups; Scoring & Styles; Cards, Tags & Pairings; Conditions & Tempo; Objectives & Endgame; Games; Data Quality.
>
> Implement Overview, Members, Matchups & Lineups, Scoring & Styles, Objectives & Endgame baseline, Games, and Data Quality. Migrate HeadToHeadLensFrame, LineupEffectsPanel, group interaction rows, score-source averages, styles, FinalTerraformingActionTable, and group games.
>
> Do not embed the full Leaderboard or mix global metrics into group analysis. Move Optional Data Coverage to a compact badge, drawer, or Data Quality view. Keep chemistry as an unimplemented or clearly defined future view until a transparent expected-performance model exists.
> PRODUCTION GRAPHICS
> Integrate Supabase corporation logos, tag graphics, and point-source graphics into Group Insights through the shared resolver. Use consistent dimensions across member rows, charts, pairings, and game evidence.
> GROUP INSIGHTS DASHBOARD COMPOSITION
> Combine member ranking, expected-versus-actual comparison, score and placement distributions, chemistry or lineup effects, context strengths, and supporting games.
> Use shared player selection across member charts, matchup panels, score-source graphics, and game evidence. Avoid a long stack of equal-weight cards.
> GROUP WIN DIFFERENTIAL
> - In Group Overview and Members add group and member average and median win point differential, qualifying-win counts, close/decisive shares, and a game-level margin distribution. Do not average member averages unless equal-player weighting is intentional and clearly labeled.
> Group temporal analytics
> Add member and group-level cards-bought pace and TR progression using the canonical generation records.
> Use aligned scales, median/range summaries, exact-generation and normalized-phase modes, visible samples, and source-game links.
> Do not average member averages without documenting equal-member weighting.

## Acceptance checklist

- [ ] Group route is group scoped.

- [ ] Leaderboard is only a preview.

- [ ] Members and lineups work.

- [ ] Scoring and endgame data remain available.

- [ ] Games provide traceability.

- [ ] Data quality is supporting infrastructure.

- [ ] Group Insights uses production graphics with aligned dimensions and text labels.

- [ ] Group Overview combines member, chemistry, distribution, context, and evidence analysis with a clear hierarchy.

- [ ] Group graphics use shared selections and do not duplicate the full Leaderboard.

- [ ] Group win margin aggregates use qualifying game-level margins, display member-level samples, and avoid averaging player averages without an explicit weighting choice.

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

- Phase 10 may be marked complete only after every source step above has its own accepted handoff and the phase acceptance checklist passes as one integrated system.
- A later phase must not begin automatically. The final handoff identifies only the next possible separately authorized phase or remediation task.
- Any formula, migration, authorization rule, public-data contract, or URL-state change requires the independent review specified by the Word guide.
- Production migration, backfill, RLS mutation, Storage change, push, or deployment remains prohibited unless a separate explicit authorization and evidence record exists.
