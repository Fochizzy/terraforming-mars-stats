# Phase 18 — Objectives, Endgame, and Group Chemistry

Complete milestone, award, finishing, and group-specific expected-performance analysis.

> **Source authority:** `TM_Stats_Redesign_Integrated_Full_Implementation_Guide_2026-07-19_Expanded_Step_4_3(5).docx`, Phase 18.
>
> **Preservation rule:** The source steps, their order, their dependencies, and their stop conditions are unchanged. The stage headings in this Markdown file only divide each source step into smaller reviewable checkpoints using the guide’s existing `Read → Inspect → Plan → Implement → Test → Render/Review → Document → Commit → Handoff` process.

## Status

Phase 18 is **planned and not started** unless `docs/REDESIGN_STATE.md` and a later explicit owner assignment say otherwise. This file does not authorize implementation, migration, production mutation, push, deployment, or work on a later phase.

## Recommended agent and effort

| Field | Recommendation |
| --- | --- |
| Preferred execution | Split phase |
| Recommended configuration | Claude Opus 4.8 - max for chemistry and objective methodology; Codex GPT-5.6 Sol - Extra High for implementation |
| Acceptable alternate | Claude Opus 4.8 - xhigh when max is unavailable |
| Independent reviewer | Opposite agent at Level 5 for formula and causal-language review |
| Handoff sensitivity | Critical |
| Recommended handoff pattern | Claude defines expected-performance and conversion semantics. Codex implements them. Claude independently reviews uncertainty, denominators, and the meaning of chemistry residuals. |

| Stop rule | Complete only this phase or its explicitly assigned substep. Commit, write the handoff file, and stop before beginning the next phase. |
| --- | --- |

## Outcome of this phase

Objective economics, final actions, finishing impact, distributions, and transparent chemistry residuals.

## Why this phase comes now

These analyses require careful definitions because attempt data, funding events, and expected-performance baselines may be incomplete.

## Prerequisites

- Objective and final-action data capabilities are confirmed.

- Group baseline and member metrics are stable.

- Persisted canonical milestone and award catalogue aliases, map context, source evidence, and parser provenance

- Canonical objective events and unresolved/unsupported objective evidence

## Inspect before editing

- Milestone claims and eligibility data

- Award funding and wins

- FinalTerraformingActionTable

- Final action repository

- Map assets

- Group distributions

- Expected-performance inputs

## Do not do in this phase

- Do not treat missing objective events as proof that no objective activity occurred without authoritative coverage.

- Do not fuzzy-match unresolved printed objective text or bypass the persisted canonical alias catalogue.

- Do not imply attempt data when only claims exist.

- Do not invent map-linked award values.

- Do not call correlation causation.

- Do not call an unexplained residual chemistry.

## Expanded working sequence

The source step order is preserved. Each row is a bounded implementation assignment and must end with its own validation, documentation, clean commit, and handoff.

| Source step | Bounded execution result | Stop condition |
| --- | --- | --- |
| 18.1 — Build milestone analytics | Eligibility/attempt only when recorded; Claims; Wins; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 18.2 — Build award analytics | Funding; Wins; First-place conversion; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 18.3 — Expand final actions | Distribution; Player finishing impact; Frequency; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 18.4 — Build group distributions | Score distribution; Placement distribution; Outliers; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 18.5 — Define group chemistry transparently | Expected performance model; Actual minus expected; Member effects; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |

## Step 18.1 — Build milestone analytics

### Source-defined scope

- Eligibility/attempt only when recorded
- Claims
- Wins
- Conversion
- Timing
- Players
- Corporations
- Maps
- Games

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Milestone claims and eligibility data
  - Award funding and wins
  - FinalTerraformingActionTable
  - Final action repository
  - Map assets
  - Group distributions
  - Expected-performance inputs
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

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Eligibility/attempt only when recorded
  - [ ] Claims
  - [ ] Wins
  - [ ] Conversion
  - [ ] Timing
  - [ ] Players
  - [ ] Corporations
  - [ ] Maps
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

### Step completion gate

- [ ] Eligibility/attempt only when recorded
- [ ] Claims
- [ ] Wins
- [ ] Conversion
- [ ] Timing
- [ ] Players
- [ ] Corporations
- [ ] Maps
- [ ] Games
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 18.2 — Build award analytics

### Source-defined scope

- Funding
- Wins
- First-place conversion
- Award VP
- Distribution
- Timing
- Map
- Corporation
- Confidence
- Games

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Milestone claims and eligibility data
  - Award funding and wins
  - FinalTerraformingActionTable
  - Final action repository
  - Map assets
  - Group distributions
  - Expected-performance inputs
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
  - [ ] Funding
  - [ ] Wins
  - [ ] First-place conversion
  - [ ] Award VP
  - [ ] Distribution
  - [ ] Timing
  - [ ] Map
  - [ ] Corporation
  - [ ] Confidence
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

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.

### Step completion gate

- [ ] Funding
- [ ] Wins
- [ ] First-place conversion
- [ ] Award VP
- [ ] Distribution
- [ ] Timing
- [ ] Map
- [ ] Corporation
- [ ] Confidence
- [ ] Games
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 18.3 — Expand final actions

### Source-defined scope

- Distribution
- Player finishing impact
- Frequency
- Action win rate
- Overall win rate
- Delta
- Generation
- Detail
- Games

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Milestone claims and eligibility data
  - Award funding and wins
  - FinalTerraformingActionTable
  - Final action repository
  - Map assets
  - Group distributions
  - Expected-performance inputs
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
  - [ ] Distribution
  - [ ] Player finishing impact
  - [ ] Frequency
  - [ ] Action win rate
  - [ ] Overall win rate
  - [ ] Delta
  - [ ] Generation
  - [ ] Detail
  - [ ] Games
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

- [ ] Distribution
- [ ] Player finishing impact
- [ ] Frequency
- [ ] Action win rate
- [ ] Overall win rate
- [ ] Delta
- [ ] Generation
- [ ] Detail
- [ ] Games
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 18.4 — Build group distributions

### Source-defined scope

- Score distribution
- Placement distribution
- Outliers
- Trend

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Milestone claims and eligibility data
  - Award funding and wins
  - FinalTerraformingActionTable
  - Final action repository
  - Map assets
  - Group distributions
  - Expected-performance inputs
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
  - [ ] Score distribution
  - [ ] Placement distribution
  - [ ] Outliers
  - [ ] Trend
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

- [ ] Score distribution
- [ ] Placement distribution
- [ ] Outliers
- [ ] Trend
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 18.5 — Define group chemistry transparently

### Source-defined scope

- Expected performance model
- Actual minus expected
- Member effects
- Lineup balance
- Context strengths/weaknesses
- Uncertainty

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Milestone claims and eligibility data
  - Award funding and wins
  - FinalTerraformingActionTable
  - Final action repository
  - Map assets
  - Group distributions
  - Expected-performance inputs
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
  - [ ] Expected performance model
  - [ ] Actual minus expected
  - [ ] Member effects
  - [ ] Lineup balance
  - [ ] Context strengths/weaknesses
  - [ ] Uncertainty
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

- [ ] Expected performance model
- [ ] Actual minus expected
- [ ] Member effects
- [ ] Lineup balance
- [ ] Context strengths/weaknesses
- [ ] Uncertainty
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Copy-ready agent execution prompt

**SUPERSEDED IN PART — READ THIS BEFORE PASTING THE PROMPT BELOW.** Owner ruling **R-15**
(2026-07-23, recorded in `docs/redesign/DECISIONS.md`) supersedes this block's instruction
to implement **a transparent Group Chemistry model**, and its instruction to define and
test that model's **expected-performance baseline** before labelling a metric Group
Chemistry. R-15 finds that the Group-Chemistry expected-performance model has **no
canonical definition anywhere** and is **not** supplied by the ELO rating — a model of how
players perform **together** is a different object from a rating **per player** — and rules
that it **gives way**.

**Not superseded, and not to be conflated with it.** **Opponent-adjusted margin** survives
under the same ruling, because ELO supplies the per-opponent rating it requires. R-15
states plainly that the two are different objects; this note supersedes neither that metric
nor any other analytic in the block.

**Also carried in this block, and NOT ruled.** **Award Funding ROI** stands against
`docs/redesign/CANONICAL-ANALYTICS-DEFINITIONS.md`'s exclusion of award calculations. That
conflict is **open analytics question Q-7**, expressly not discussed and not ruled, and
**nothing here decides it** (process rule P-1, `docs/redesign/MASTER-RULES.md`).

**The block below is retained verbatim as carried source text**, governed by this file's
Preservation rule above, and is deliberately **not** rewritten. **On the Group Chemistry
point it must not be executed as written.**

> Perform Phase 18 only: implement Milestone & Award Economics, Award Funding ROI, Objective Conversion, Final Terraforming Actions, Finishing Impact, group score/placement distributions, and a transparent Group Chemistry model.
>
> Use only recorded eligibility, attempt, claim, funding, win, scoring, map, and final-action data. Do not imply attempts or map location metrics exist when they do not. Expand the current FinalTerraformingActionTable into distribution, player finishing impact, action frequency, action win rate, overall win rate, delta, average finish generation, detail, and supporting games.
>
> Before labeling a metric Group Chemistry, define and test the expected-performance baseline, inputs, exclusions, uncertainty, and residual interpretation. Show expected, actual, actual-minus-expected, member effects, lineup balance, context strengths, and context weaknesses. Use association language and visible samples.
> OBJECTIVE, ENDGAME, AND CHEMISTRY VISUALS
> Combine milestone/award funnels, conversion bars, timing distributions, final-action breakdown, player impact, expected-versus-actual group comparison, and supporting games.
> Use consistent selected player, objective, map, and date context across all graphics.

## Acceptance checklist

- [ ] Unsupported or conflicting objective text remains unresolved rather than silently reclassified.

- [ ] Objective analytics use persisted verified aliases and preserve original printed evidence.

- [ ] Objectives use explicit definitions.

- [ ] Final actions show denominators.

- [ ] Map data is real.

- [ ] Group distributions are available.

- [ ] Chemistry is modeled and qualified.

- [ ] Tests cover formulas and missing data.

- [ ] Objectives, endgame, and group chemistry use complementary conversion, timing, distribution, and comparison graphics.

- [ ] Selected objective, player, map, and date context remain synchronized.

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

- Phase 18 may be marked complete only after every source step above has its own accepted handoff and the phase acceptance checklist passes as one integrated system.
- A later phase must not begin automatically. The final handoff identifies only the next possible separately authorized phase or remediation task.
- Any formula, migration, authorization rule, public-data contract, or URL-state change requires the independent review specified by the Word guide.
- Production migration, backfill, RLS mutation, Storage change, push, or deployment remains prohibited unless a separate explicit authorization and evidence record exists.
