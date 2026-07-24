# Phase 12 — Improvement Baseline

Create an evidence-based improvement product using transparent deterministic rules.

> **Source authority:** `TM_Stats_Redesign_Integrated_Full_Implementation_Guide_2026-07-19_Expanded_Step_4_3(5).docx`, Phase 12.
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
> **Corrected in this document:** `Step 12.2 — Create deterministic rules` → `Stage B —
> Define the bounded contract`.
>
> **NOT corrected, and readers must not build from it unaltered.** The
> `Copy-ready agent execution prompt` section, under `IMPROVEMENT WIN DIFFERENTIAL RULES`,
> still reads "only above the minimum-wins threshold". It is **carried source text**
> governed by this file's Preservation rule above, so it was left **verbatim** rather than
> rewritten. **Whether carried source text may be corrected in place is an owner question
> and has not been decided.**
>
> The pre-correction wording is retained in git history rather than in a per-site banner —
> a deliberate departure from per-site marking, recorded in the handoff. **The per-metric
> threshold mechanism above the floor is open analytics question Q-1** and is deliberately
> **not** specified here; sites in this document reading "when the player has enough
> qualifying wins" were therefore left untouched as Q-1-dependent.

## Status

Phase 12 is **planned and not started** unless `docs/REDESIGN_STATE.md` and a later explicit owner assignment say otherwise. This file does not authorize implementation, migration, production mutation, push, deployment, or work on a later phase.

## Recommended agent and effort

| Field | Recommendation |
| --- | --- |
| Preferred execution | Split phase |
| Recommended configuration | Claude Opus 4.8 - max for recommendation methodology; Codex GPT-5.6 Sol - Extra High for implementation |
| Acceptable alternate | Claude Opus 4.8 - xhigh when max is unavailable |
| Independent reviewer | Opposite agent at Level 5 in a fresh session |
| Handoff sensitivity | Critical |
| Recommended handoff pattern | Claude designs deterministic rules and evidence requirements. Codex implements typed rules and tests. Claude then audits causal language, thresholds, and traceability. |

| Stop rule | Complete only this phase or its explicitly assigned substep. Commit, write the handoff file, and stop before beginning the next phase. |
| --- | --- |

## Outcome of this phase

Improvement overview, recommendations, focus areas, evidence, and honest persistence behavior.

## Why this phase comes now

Recommendations must be traceable to stable analytics rather than generated free-form commentary.

## Prerequisites

- Individual Insights baseline is stable.

- Metric definitions, samples, and baselines are known.

## Inspect before editing

- Current player efficiency metrics

- Score versus expected

- Points per generation

- Best score source

- Best tag lane

- Map and style performance

- Head-to-head

- Lineup effects

- Awards

- Close-game metrics

- Persistence and migration capabilities

## Do not do in this phase

- Do not claim causation.

- Do not rank recommendations without sample thresholds.

- Do not imply action-plan persistence if none exists.

- Do not duplicate the underlying metric calculations.

## Expanded working sequence

The source step order is preserved. Each row is a bounded implementation assignment and must end with its own validation, documentation, clean commit, and handoff.

| Source step | Bounded execution result | Stop condition |
| --- | --- | --- |
| 12.1 — Create recommendation types | Category; Title; Summary; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 12.2 — Create deterministic rules | Only use known metrics and baselines.; Require minimum samples.; Link each result to evidence.; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 12.3 — Merge root causes | Group related findings into scoring efficiency, style selection, map preparation, opponent preparation, game length, objectives, consistency. | Commit and hand off this source step; do not begin the next source heading. |
| 12.4 — Build views | Overview; Recommendations; Focus Areas; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 12.5 — Use careful language | Use careful language | Commit and hand off this source step; do not begin the next source heading. |
| 12.6 — Add evidence rules for cards bought and TR pace | Create deterministic recommendations only when the player has enough complete timelines and a meaningful benchmark.; Potential evidence patterns include slow early TR growth, unusually late card purchasing, high card acquisition with low later score conversion, or strong TR pace that is not reflected in final placement.; Treat these as associations and experiments, not causal diagnoses. Link every statement to the timeline, benchmark, sample, and supporting games.; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |

## Step 12.1 — Create recommendation types

### Source-defined scope

- Category
- Title
- Summary
- Impact
- Confidence
- Effort
- Recurrence
- Priority
- Sample
- Evidence metric
- Games
- Related dashboard
- Status when supported

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Current player efficiency metrics
  - Score versus expected
  - Points per generation
  - Best score source
  - Best tag lane
  - Map and style performance
  - Head-to-head
  - Lineup effects
  - Awards
  - Close-game metrics
  - Persistence and migration capabilities
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
  - [ ] Category
  - [ ] Title
  - [ ] Summary
  - [ ] Impact
  - [ ] Confidence
  - [ ] Effort
  - [ ] Recurrence
  - [ ] Priority
  - [ ] Sample
  - [ ] Evidence metric
  - [ ] Games
  - [ ] Related dashboard
  - [ ] Status when supported
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
- Test threshold edges, conflicting signals, merged root causes, insufficient evidence, and stable recommendation ordering.
- Test map variants, unresolved spaces, unattributed placements, replacements/removals, partial coverage, and no-coordinate fallbacks.

### Step completion gate

- [ ] Category
- [ ] Title
- [ ] Summary
- [ ] Impact
- [ ] Confidence
- [ ] Effort
- [ ] Recurrence
- [ ] Priority
- [ ] Sample
- [ ] Evidence metric
- [ ] Games
- [ ] Related dashboard
- [ ] Status when supported
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 12.2 — Create deterministic rules

### Source-defined scope

- Only use known metrics and baselines.
- Require minimum samples.
- Link each result to evidence.
- Use win point differential only when the player has enough qualifying wins and the rule adds information beyond win rate.
- Potential evidence patterns include many close wins, declining win margins, weak margins in a specific condition, or improved margins after a focus period.
- Do not frame a small win margin as a failure when the player is consistently winning, and do not infer cause from margin alone.
- Write tests for each rule.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Current player efficiency metrics
  - Score versus expected
  - Points per generation
  - Best score source
  - Best tag lane
  - Map and style performance
  - Head-to-head
  - Lineup effects
  - Awards
  - Close-game metrics
  - Persistence and migration capabilities
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
  - [ ] Only use known metrics and baselines.
  - [ ] Require minimum samples.
  - [ ] Link each result to evidence.
  - [ ] Use win point differential only when the player has enough qualifying wins and the rule adds information beyond win rate.
  - [ ] Potential evidence patterns include many close wins, declining win margins, weak margins in a specific condition, or improved margins after a focus period.
  - [ ] Do not frame a small win margin as a failure when the player is consistently winning, and do not infer cause from margin alone.
  - [ ] Write tests for each rule.
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

- [ ] Only use known metrics and baselines.
- [ ] Require minimum samples.
- [ ] Link each result to evidence.
- [ ] Use win point differential only when the player has enough qualifying wins and the rule adds information beyond win rate.
- [ ] Potential evidence patterns include many close wins, declining win margins, weak margins in a specific condition, or improved margins after a focus period.
- [ ] Do not frame a small win margin as a failure when the player is consistently winning, and do not infer cause from margin alone.
- [ ] Write tests for each rule.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 12.3 — Merge root causes

### Source-defined scope

- Group related findings into scoring efficiency, style selection, map preparation, opponent preparation, game length, objectives, consistency.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Current player efficiency metrics
  - Score versus expected
  - Points per generation
  - Best score source
  - Best tag lane
  - Map and style performance
  - Head-to-head
  - Lineup effects
  - Awards
  - Close-game metrics
  - Persistence and migration capabilities
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
  - [ ] Group related findings into scoring efficiency, style selection, map preparation, opponent preparation, game length, objectives, consistency.
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

- [ ] Group related findings into scoring efficiency, style selection, map preparation, opponent preparation, game length, objectives, consistency.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 12.4 — Build views

### Source-defined scope

- Overview
- Recommendations
- Focus Areas
- Evidence
- Action Plan/Progress/History only when persistence exists

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Current player efficiency metrics
  - Score versus expected
  - Points per generation
  - Best score source
  - Best tag lane
  - Map and style performance
  - Head-to-head
  - Lineup effects
  - Awards
  - Close-game metrics
  - Persistence and migration capabilities
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
  - [ ] Overview
  - [ ] Recommendations
  - [ ] Focus Areas
  - [ ] Evidence
  - [ ] Action Plan/Progress/History only when persistence exists
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
- Test threshold edges, conflicting signals, merged root causes, insufficient evidence, and stable recommendation ordering.

### Step completion gate

- [ ] Overview
- [ ] Recommendations
- [ ] Focus Areas
- [ ] Evidence
- [ ] Action Plan/Progress/History only when persistence exists
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 12.5 — Use careful language

### Source-defined scope

- Complete the source-defined work named by this step without expanding its scope.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Current player efficiency metrics
  - Score versus expected
  - Points per generation
  - Best score source
  - Best tag lane
  - Map and style performance
  - Head-to-head
  - Lineup effects
  - Awards
  - Close-game metrics
  - Persistence and migration capabilities
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

### Step completion gate

- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 12.6 — Add evidence rules for cards bought and TR pace

### Source-defined scope

- Create deterministic recommendations only when the player has enough complete timelines and a meaningful benchmark.
- Potential evidence patterns include slow early TR growth, unusually late card purchasing, high card acquisition with low later score conversion, or strong TR pace that is not reflected in final placement.
- Treat these as associations and experiments, not causal diagnoses. Link every statement to the timeline, benchmark, sample, and supporting games.
- Do not recommend buying fewer or more cards solely from count data without context such as generation, score conversion, hand usage, corporation, and game length.
- Associated with
- Within this sample
- Below benchmark
- Consider testing
- Do not use proves, guarantees, always, or never

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Current player efficiency metrics
  - Score versus expected
  - Points per generation
  - Best score source
  - Best tag lane
  - Map and style performance
  - Head-to-head
  - Lineup effects
  - Awards
  - Close-game metrics
  - Persistence and migration capabilities
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Preserve exact generation, normalized phase, checkpoint semantics, and complete-versus-partial coverage as separate concepts.
- Keep explicit zero separate from missing, preserve legal decreases, and never interpolate an unsupported generation value.
- Keep recommendation rules deterministic, thresholded, evidence-backed, and non-causal.
- Require a comparison baseline, eligible-game count, coverage, uncertainty, and supporting games before emitting a recommendation.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Create deterministic recommendations only when the player has enough complete timelines and a meaningful benchmark.
  - [ ] Potential evidence patterns include slow early TR growth, unusually late card purchasing, high card acquisition with low later score conversion, or strong TR pace that is not reflected in final placement.
  - [ ] Treat these as associations and experiments, not causal diagnoses. Link every statement to the timeline, benchmark, sample, and supporting games.
  - [ ] Do not recommend buying fewer or more cards solely from count data without context such as generation, score conversion, hand usage, corporation, and game length.
  - [ ] Associated with
  - [ ] Within this sample
  - [ ] Below benchmark
  - [ ] Consider testing
  - [ ] Do not use proves, guarantees, always, or never
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

- [ ] Create deterministic recommendations only when the player has enough complete timelines and a meaningful benchmark.
- [ ] Potential evidence patterns include slow early TR growth, unusually late card purchasing, high card acquisition with low later score conversion, or strong TR pace that is not reflected in final placement.
- [ ] Treat these as associations and experiments, not causal diagnoses. Link every statement to the timeline, benchmark, sample, and supporting games.
- [ ] Do not recommend buying fewer or more cards solely from count data without context such as generation, score conversion, hand usage, corporation, and game length.
- [ ] Associated with
- [ ] Within this sample
- [ ] Below benchmark
- [ ] Consider testing
- [ ] Do not use proves, guarantees, always, or never
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Card acquisition improvement signals — carried forward

>  **Provenance:** this section is REPO-NATIVE, not derived from the Word guide. It was
>  already present in `docs/redesign/phases/12-improvement.md`, verified word-identical to the
>  published copy, and is carried forward here because the Word-derived expansion does
>  not contain it. Verbatim; nothing rewritten.

Allow recommendations based on:

- Purchase pace
- Purchase conversion
- Purchased hand share
- Hand utilization
- End-hand carryover
- Cards seen relative to outcomes

Only generate recommendations when minimum sample and data-coverage
requirements are met.

Every recommendation must include:

- Supporting games
- Comparison baseline
- Eligible-game count
- Coverage level
- Uncertainty
- Observational, non-causal wording


## Copy-ready agent execution prompt

**SUPERSEDED IN PART — READ THIS BEFORE PASTING THE PROMPT BELOW.** Owner ruling **R-14**
(2026-07-23) supersedes the minimum-wins eligibility instruction carried inside the block,
under `IMPROVEMENT WIN DIFFERENTIAL RULES`, which permits recommendation rules to use win
point differential only above the minimum-wins threshold. The governing eligibility rules
are `docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md` → "Universal
eligibility floor and per-metric display gates (owner ruling R-14, 2026-07-23)", whose
ruling text is recorded as **R-14** in `docs/redesign/DECISIONS.md`. **No threshold value
is restated here; the contract holds the number** (process rule P-2,
`docs/redesign/MASTER-RULES.md`).

What R-14 changes for that instruction:

- a **universal eligibility floor counted in games played** applies in addition, and it is
  **not** a wins count — below it a profile does not appear in analytics at all, so no
  recommendation may be produced for it;
- **above the floor, thresholds are per-metric**, and the mechanism by which a metric
  declares its own threshold is **open analytics question Q-1**, so "the minimum-wins
  threshold" names no settled value; and
- a threshold is a **display gate, not a labelling rule** — below a present threshold a
  result is **hidden**, not shown flagged as low-sample.

**Surfaced, not resolved.** R-14 separately records that the **Win Point Differential
metric keeps its own minimum-wins gate**, as a per-metric threshold distinct from the
universal games-played floor, and that its value **is not yet set**. Whether that gate or
the floor governs the rules in this block is therefore an **owner question that is not
decided here** (process rule P-1, `docs/redesign/MASTER-RULES.md`).

**The block below is retained verbatim as carried source text**, governed by this file's
Preservation rule above, and is deliberately **not** rewritten. **On this point it must
not be executed as written.**

> Perform Phase 12 only: build /improvement version one with a deterministic, typed recommendation engine. Do not use free-form generated AI commentary as the source of recommendations.
>
> Implement Overview, Recommendations, Focus Areas, and Evidence. Add Action Plan, Progress, and History only if real server persistence exists or after an explicitly approved migration.
>
> Each recommendation must include category, impact, confidence, effort, recurrence, priority, sample size, evidence metric, evidence game IDs, related dashboard, and status when supported. Initial rules may use verified points per generation, score versus expected, score sources, tags, maps, styles, head-to-head, lineups, awards, close-game performance, and trends.
>
> Require known denominators, baselines, and minimum samples. Merge duplicate root causes. Use non-causal language and link every recommendation to evidence. Add unit tests for rule triggering, exclusions, priority, sample handling, and root-cause merging.
> IMPROVEMENT DASHBOARD COMPOSITION
> Combine priority recommendations, impact-versus-effort visualization, focus-area grouping, progress trend, and evidence detail.
> Every visual recommendation must link to the source metric and supporting games. Use graphics only to clarify evidence, not to imply unsupported precision.
> IMPROVEMENT WIN DIFFERENTIAL RULES
> - Recommendation rules may use win point differential only above the minimum-wins threshold and must show the exact baseline, thresholds, confidence, qualifying games, and supporting evidence. Do not infer causation or treat a close win as a failure by itself.
> Temporal recommendation evidence
> Add carefully gated deterministic rules using cards-bought timing and TR progression only when sample, coverage, and benchmark requirements are met.
> Link every recommendation to exact generation evidence and source games. Use association language and proposed experiments, not causal claims.
> Never infer card cost or waste from purchase count alone, and never prescribe more or fewer purchases without relevant conversion context.

## Acceptance checklist

- [ ] Improvement is a real destination.

- [ ] Recommendations are deterministic.

- [ ] Every recommendation has evidence and sample size.

- [ ] Low confidence is visible.

- [ ] No unsupported causal claim is made.

- [ ] Persistence behavior is truthful.

- [ ] Improvement combines recommendation priority, focus areas, evidence, and progress without implying unsupported precision.

- [ ] Every recommendation graphic links to the underlying metric and supporting games.

- [ ] Any win-margin recommendation shows qualifying wins, thresholds, baseline, confidence, and the exact supporting games.

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

- Phase 12 may be marked complete only after every source step above has its own accepted handoff and the phase acceptance checklist passes as one integrated system.
- A later phase must not begin automatically. The final handoff identifies only the next possible separately authorized phase or remediation task.
- Any formula, migration, authorization rule, public-data contract, or URL-state change requires the independent review specified by the Word guide.
- Production migration, backfill, RLS mutation, Storage change, push, or deployment remains prohibited unless a separate explicit authorization and evidence record exists.
