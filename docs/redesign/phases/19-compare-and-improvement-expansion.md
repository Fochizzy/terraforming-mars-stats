# Phase 19 — Compare and Improvement Expansion

Connect all completed domain analytics to the comparison and coaching workflows.

> **Source authority:** `TM_Stats_Redesign_Integrated_Full_Implementation_Guide_2026-07-19_Expanded_Step_4_3(5).docx`, Phase 19.
>
> **Preservation rule:** The source steps, their order, their dependencies, and their stop conditions are unchanged. The stage headings in this Markdown file only divide each source step into smaller reviewable checkpoints using the guide’s existing `Read → Inspect → Plan → Implement → Test → Render/Review → Document → Commit → Handoff` process.

## Status

Phase 19 is **planned and not started** unless `docs/REDESIGN_STATE.md` and a later explicit owner assignment say otherwise. This file does not authorize implementation, migration, production mutation, push, deployment, or work on a later phase.

## Recommended agent and effort

| Field | Recommendation |
| --- | --- |
| Preferred execution | Codex |
| Recommended configuration | GPT-5.6 Sol - Extra High - Standard |
| Acceptable alternate | Claude Opus 4.8 - xhigh effort |
| Independent reviewer | Claude Opus 4.8 - xhigh for cross-module consistency review |
| Handoff sensitivity | High |
| Recommended handoff pattern | Codex integrates canonical modules into Compare and Improvement. Claude checks that no duplicate formulas or unsupported progress claims were introduced. |

| Stop rule | Complete only this phase or its explicitly assigned substep. Commit, write the handoff file, and stop before beginning the next phase. |
| --- | --- |

## Outcome of this phase

More entity comparison types, evidence-linked recommendations, and honest progress tracking.

## Why this phase comes now

Compare and Improvement should reuse canonical domain modules after those modules are stable.

## Prerequisites

- Phases 13-18 domain modules are complete.

- Recommendation persistence decision is documented.

## Inspect before editing

- Compare route and selectors

- Improvement recommendation rules

- Completed card, tag, corporation, scoring, style, engine, condition, opponent, board, and objective modules

- Persistence schema or migration capability

## Do not do in this phase

- Do not create separate formulas for Compare.

- Do not store progress only in browser memory while implying server persistence.

- Do not mark a goal achieved from one game.

## Expanded working sequence

The source step order is preserved. Each row is a bounded implementation assignment and must end with its own validation, documentation, clean commit, and handoff.

| Source step | Bounded execution result | Stop condition |
| --- | --- | --- |
| 19.1 — Expand comparison types | Corporations; Preludes; Pairings; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 19.2 — Add comparison interpretation | Difference highlights; Shared strengths; Distinctive traits; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 19.3 — Expand recommendation sources | Cards; Tags; Pairings; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 19.4 — Expand root-cause categories | Scoring efficiency; Engine development; Style selection; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 19.5 — Add progress only with persistence | Add progress only with persistence | Commit and hand off this source step; do not begin the next source heading. |
| 19.6 — Expand temporal Compare and Improvement | Enable cards-bought and TR timeline comparison for supported entities using the canonical modules from Phase 16.; Allow Improvement goals to target measurable temporal metrics such as early TR gain or late card-purchase share only when persistence and sufficient future observations exist.; Progress views must compare a documented baseline window with a later window and show complete timeline counts.; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |

## Step 19.1 — Expand comparison types

### Source-defined scope

- Corporations
- Preludes
- Pairings
- Cards
- Tags
- Maps
- Table sizes
- Game lengths
- Specific games

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Compare route and selectors
  - Improvement recommendation rules
  - Completed card, tag, corporation, scoring, style, engine, condition, opponent, board, and objective modules
  - Persistence schema or migration capability
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
  - [ ] Corporations
  - [ ] Preludes
  - [ ] Pairings
  - [ ] Cards
  - [ ] Tags
  - [ ] Maps
  - [ ] Table sizes
  - [ ] Game lengths
  - [ ] Specific games
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

- [ ] Corporations
- [ ] Preludes
- [ ] Pairings
- [ ] Cards
- [ ] Tags
- [ ] Maps
- [ ] Table sizes
- [ ] Game lengths
- [ ] Specific games
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 19.2 — Add comparison interpretation

### Source-defined scope

- Difference highlights
- Shared strengths
- Distinctive traits
- Direct matchup context
- Sample warnings
- Export where supported

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Compare route and selectors
  - Improvement recommendation rules
  - Completed card, tag, corporation, scoring, style, engine, condition, opponent, board, and objective modules
  - Persistence schema or migration capability
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

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Difference highlights
  - [ ] Shared strengths
  - [ ] Distinctive traits
  - [ ] Direct matchup context
  - [ ] Sample warnings
  - [ ] Export where supported
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

- [ ] Difference highlights
- [ ] Shared strengths
- [ ] Distinctive traits
- [ ] Direct matchup context
- [ ] Sample warnings
- [ ] Export where supported
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 19.3 — Expand recommendation sources

### Source-defined scope

- Cards
- Tags
- Pairings
- Scoring
- Styles
- Engine
- Game state
- Conditions
- Opponents
- Board
- Objectives
- Final actions

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Compare route and selectors
  - Improvement recommendation rules
  - Completed card, tag, corporation, scoring, style, engine, condition, opponent, board, and objective modules
  - Persistence schema or migration capability
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Keep recommendation rules deterministic, thresholded, evidence-backed, and non-causal.
- Require a comparison baseline, eligible-game count, coverage, uncertainty, and supporting games before emitting a recommendation.
- Require canonical map, space, placement, ownership, attribution, provenance, and coverage fields before enabling spatial analysis.
- Do not infer coordinates, ownership, actor, or board completion from final totals or incomplete events.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Cards
  - [ ] Tags
  - [ ] Pairings
  - [ ] Scoring
  - [ ] Styles
  - [ ] Engine
  - [ ] Game state
  - [ ] Conditions
  - [ ] Opponents
  - [ ] Board
  - [ ] Objectives
  - [ ] Final actions
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
- Test threshold edges, conflicting signals, merged root causes, insufficient evidence, and stable recommendation ordering.
- Test map variants, unresolved spaces, unattributed placements, replacements/removals, partial coverage, and no-coordinate fallbacks.

### Step completion gate

- [ ] Cards
- [ ] Tags
- [ ] Pairings
- [ ] Scoring
- [ ] Styles
- [ ] Engine
- [ ] Game state
- [ ] Conditions
- [ ] Opponents
- [ ] Board
- [ ] Objectives
- [ ] Final actions
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 19.4 — Expand root-cause categories

### Source-defined scope

- Scoring efficiency
- Engine development
- Style selection
- Tempo
- Map preparation
- Opponent preparation
- Board conversion
- Objective timing
- Award risk

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Compare route and selectors
  - Improvement recommendation rules
  - Completed card, tag, corporation, scoring, style, engine, condition, opponent, board, and objective modules
  - Persistence schema or migration capability
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
  - [ ] Scoring efficiency
  - [ ] Engine development
  - [ ] Style selection
  - [ ] Tempo
  - [ ] Map preparation
  - [ ] Opponent preparation
  - [ ] Board conversion
  - [ ] Objective timing
  - [ ] Award risk
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

- [ ] Scoring efficiency
- [ ] Engine development
- [ ] Style selection
- [ ] Tempo
- [ ] Map preparation
- [ ] Opponent preparation
- [ ] Board conversion
- [ ] Objective timing
- [ ] Award risk
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 19.5 — Add progress only with persistence

### Source-defined scope

- Complete the source-defined work named by this step without expanding its scope.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Compare route and selectors
  - Improvement recommendation rules
  - Completed card, tag, corporation, scoring, style, engine, condition, opponent, board, and objective modules
  - Persistence schema or migration capability
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Keep recommendation rules deterministic, thresholded, evidence-backed, and non-causal.
- Require a comparison baseline, eligible-game count, coverage, uncertainty, and supporting games before emitting a recommendation.

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

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test threshold edges, conflicting signals, merged root causes, insufficient evidence, and stable recommendation ordering.

### Step completion gate

- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 19.6 — Expand temporal Compare and Improvement

### Source-defined scope

- Enable cards-bought and TR timeline comparison for supported entities using the canonical modules from Phase 16.
- Allow Improvement goals to target measurable temporal metrics such as early TR gain or late card-purchase share only when persistence and sufficient future observations exist.
- Progress views must compare a documented baseline window with a later window and show complete timeline counts.
- Baseline period
- Current period
- Target
- Sample
- Change
- Confidence
- Evidence games
- Sufficient observations before achievement

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Compare route and selectors
  - Improvement recommendation rules
  - Completed card, tag, corporation, scoring, style, engine, condition, opponent, board, and objective modules
  - Persistence schema or migration capability
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
- Preserve exact generation, normalized phase, checkpoint semantics, and complete-versus-partial coverage as separate concepts.
- Keep explicit zero separate from missing, preserve legal decreases, and never interpolate an unsupported generation value.
- Keep recommendation rules deterministic, thresholded, evidence-backed, and non-causal.
- Require a comparison baseline, eligible-game count, coverage, uncertainty, and supporting games before emitting a recommendation.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Enable cards-bought and TR timeline comparison for supported entities using the canonical modules from Phase 16.
  - [ ] Allow Improvement goals to target measurable temporal metrics such as early TR gain or late card-purchase share only when persistence and sufficient future observations exist.
  - [ ] Progress views must compare a documented baseline window with a later window and show complete timeline counts.
  - [ ] Baseline period
  - [ ] Current period
  - [ ] Target
  - [ ] Sample
  - [ ] Change
  - [ ] Confidence
  - [ ] Evidence games
  - [ ] Sufficient observations before achievement
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
- Verify URL state, selection synchronization, table alternatives, and mobile reflow for the comparison surface.
- Synchronize selected generation across chart, table, summary, evidence, and URL state without combining unlike measures on an ambiguous dual axis.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test out-of-order records, duplicate generations, different game lengths, partial timelines, explicit zero, missing values, and filter propagation.
- Test threshold edges, conflicting signals, merged root causes, insufficient evidence, and stable recommendation ordering.

### Step completion gate

- [ ] Enable cards-bought and TR timeline comparison for supported entities using the canonical modules from Phase 16.
- [ ] Allow Improvement goals to target measurable temporal metrics such as early TR gain or late card-purchase share only when persistence and sufficient future observations exist.
- [ ] Progress views must compare a documented baseline window with a later window and show complete timeline counts.
- [ ] Baseline period
- [ ] Current period
- [ ] Target
- [ ] Sample
- [ ] Change
- [ ] Confidence
- [ ] Evidence games
- [ ] Sufficient observations before achievement
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Copy-ready agent execution prompt

> Perform Phase 19 only: expand Compare and Improvement by reusing the completed canonical domain modules.
>
> Enable comparison types only when their underlying modules are complete: corporations, Preludes, pairings, cards, tags, maps, table sizes, game-length categories, and specific games. Add difference highlights, shared strengths, distinctive traits, direct matchup context, sample warnings, shareable URLs, and supported export.
>
> Expand the deterministic recommendation engine to consume completed card, tag, pairing, scoring, style, engine, game-state, condition, opponent, board, milestone, award, and final-action metrics. Merge root causes and link every recommendation to evidence and related dashboards.
>
> Inspect persistence. If action plans and progress are not stored server-side, propose an explicit migration and do not imply persistence. Progress must include baseline, current period, target, sample size, change, confidence, and evidence. Do not mark achievement from one improved game.
> COMPARE AND IMPROVEMENT EXPANSION
> Reuse canonical domain visualizations and calculations. Do not build page-specific copies.
> Ensure newly enabled entity types use consistent assets, scales, interactions, evidence links, and responsive patterns.
> Temporal expansion
> Reuse the canonical Card Acquisition Pace and TR Progression modules in expanded Compare and Improvement views.
> Permit goals based on temporal metrics only with persistent baselines, later observations, samples, and coverage. Do not mark success from one game.
> Keep recommendations and progress evidence linked to exact games and generations.

## Acceptance checklist

- [ ] Compare reuses domain modules.

- [ ] New comparison types are capability gated.

- [ ] Recommendations link to evidence.

- [ ] Root causes are merged.

- [ ] Progress is statistically cautious.

- [ ] Persistence claims are accurate.

- [ ] Expanded Compare and Improvement reuse canonical visuals, calculations, assets, and evidence links.

- [ ] No domain module is duplicated solely for these pages.

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

- Phase 19 may be marked complete only after every source step above has its own accepted handoff and the phase acceptance checklist passes as one integrated system.
- A later phase must not begin automatically. The final handoff identifies only the next possible separately authorized phase or remediation task.
- Any formula, migration, authorization rule, public-data contract, or URL-state change requires the independent review specified by the Word guide.
- Production migration, backfill, RLS mutation, Storage change, push, or deployment remains prohibited unless a separate explicit authorization and evidence record exists.
