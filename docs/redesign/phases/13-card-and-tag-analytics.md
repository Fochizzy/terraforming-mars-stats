# Phase 13 — Card and Tag Analytics

Build canonical card and tag modules reusable across all supported scopes.

> **Source authority:** `TM_Stats_Redesign_Integrated_Full_Implementation_Guide_2026-07-19_Expanded_Step_4_3(5).docx`, Phase 13.
>
> **Preservation rule:** The source steps, their order, their dependencies, and their stop conditions are unchanged. The stage headings in this Markdown file only divide each source step into smaller reviewable checkpoints using the guide’s existing `Read → Inspect → Plan → Implement → Test → Render/Review → Document → Commit → Handoff` process.

## Status

Phase 13 is **planned and not started** unless `docs/REDESIGN_STATE.md` and a later explicit owner assignment say otherwise. This file does not authorize implementation, migration, production mutation, push, deployment, or work on a later phase.

## Recommended agent and effort

| Field | Recommendation |
| --- | --- |
| Preferred execution | Split phase |
| Recommended configuration | Codex GPT-5.6 Sol - Extra High for analytics; Claude Sonnet 5 - High for coordinated graphics |
| Acceptable alternate | Codex may lead end to end if the UI recipe is already approved |
| Independent reviewer | Claude Opus 4.8 - xhigh for statistical-language review |
| Handoff sensitivity | High |
| Recommended handoff pattern | Codex commits canonical card/tag transformations and sample rules. Claude composes synchronized graphics and asset use. Codex reruns calculation tests. |

| Stop rule | Complete only this phase or its explicitly assigned substep. Commit, write the handoff file, and stop before beginning the next phase. |
| --- | --- |

## Outcome of this phase

Unified Tag Analytics plus card impact, loss correlation, usage, timing, and evidence where data exists.

## Why this phase comes now

The supplied redesign material contains several overlapping card and tag dashboards that should share calculations and selection state.

## Prerequisites

- Global, Individual, Group, and Compare shells exist.

- Tag and card data capabilities are audited.

## Inspect before editing

- Existing tag distributions and outcomes

- Global tag metrics

- Card appearance and key-card data

- Victory impact and loss-correlation logic

- Most-played card outcomes

- Tag assets

- Supporting game queries

## Do not do in this phase

- Do not claim cards or tags cause outcomes.

- Do not add timing analytics without timing events.

- Do not allow one-game leaders to dominate supported summaries.

## Expanded working sequence

The source step order is preserved. Each row is a bounded implementation assignment and must end with its own validation, documentation, clean commit, and handoff.

| Source step | Bounded execution result | Stop condition |
| --- | --- | --- |
| 13.1 — Build unified Tag Analytics | Performance overview; Results; Wins; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 13.2 — Synchronize tag selection | Selector; Overview chart; Distribution chart; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 13.3 — Build card analytics | Global Card Insight; Victory Impact; Loss Correlation; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 13.4 — Add comparison modes | Card comparison; Tag comparison; Only after canonical modules are tested | Commit and hand off this source step; do not begin the next source heading. |
| 13.5 — Add reliability and evidence | Sample thresholds; Denominators; Low-sample badges; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 13.6 — Integrate Supabase tag graphics | Use the production tag graphic in the tag selector, overview chart labels, distribution header, table rows, detail views, filter chips, and Compare.; Resolve tags by the canonical ID or slug identified in Phase 0, not by display text.; Use a consistent compact icon size and preserve the original aspect ratio.; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |

## Step 13.1 — Build unified Tag Analytics

### Source-defined scope

- Performance overview
- Results
- Wins
- Win rate
- Baseline
- Delta
- Average count
- Maximum count
- Share
- Count distribution
- Intensity outcomes
- Minimum sample
- Best supported count
- Table
- Insights
- Games

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Existing tag distributions and outcomes
  - Global tag metrics
  - Card appearance and key-card data
  - Victory impact and loss-correlation logic
  - Most-played card outcomes
  - Tag assets
  - Supporting game queries
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
  - [ ] Performance overview
  - [ ] Results
  - [ ] Wins
  - [ ] Win rate
  - [ ] Baseline
  - [ ] Delta
  - [ ] Average count
  - [ ] Maximum count
  - [ ] Share
  - [ ] Count distribution
  - [ ] Intensity outcomes
  - [ ] Minimum sample
  - [ ] Best supported count
  - [ ] Table
  - [ ] Insights
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

- [ ] Performance overview
- [ ] Results
- [ ] Wins
- [ ] Win rate
- [ ] Baseline
- [ ] Delta
- [ ] Average count
- [ ] Maximum count
- [ ] Share
- [ ] Count distribution
- [ ] Intensity outcomes
- [ ] Minimum sample
- [ ] Best supported count
- [ ] Table
- [ ] Insights
- [ ] Games
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 13.2 — Synchronize tag selection

### Source-defined scope

- Selector
- Overview chart
- Distribution chart
- Table row
- Insight text
- URL state

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Existing tag distributions and outcomes
  - Global tag metrics
  - Card appearance and key-card data
  - Victory impact and loss-correlation logic
  - Most-played card outcomes
  - Tag assets
  - Supporting game queries
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
  - [ ] Selector
  - [ ] Overview chart
  - [ ] Distribution chart
  - [ ] Table row
  - [ ] Insight text
  - [ ] URL state
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

- [ ] Selector
- [ ] Overview chart
- [ ] Distribution chart
- [ ] Table row
- [ ] Insight text
- [ ] URL state
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 13.3 — Build card analytics

### Source-defined scope

- Global Card Insight
- Victory Impact
- Loss Correlation
- Most Played in Wins
- Helpful/harmful personal signals
- Most-Played Outcomes
- Usage vs performance
- Timing when supported

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Existing tag distributions and outcomes
  - Global tag metrics
  - Card appearance and key-card data
  - Victory impact and loss-correlation logic
  - Most-played card outcomes
  - Tag assets
  - Supporting game queries
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
  - [ ] Global Card Insight
  - [ ] Victory Impact
  - [ ] Loss Correlation
  - [ ] Most Played in Wins
  - [ ] Helpful/harmful personal signals
  - [ ] Most-Played Outcomes
  - [ ] Usage vs performance
  - [ ] Timing when supported
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

- [ ] Global Card Insight
- [ ] Victory Impact
- [ ] Loss Correlation
- [ ] Most Played in Wins
- [ ] Helpful/harmful personal signals
- [ ] Most-Played Outcomes
- [ ] Usage vs performance
- [ ] Timing when supported
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 13.4 — Add comparison modes

### Source-defined scope

- Card comparison
- Tag comparison
- Only after canonical modules are tested

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Existing tag distributions and outcomes
  - Global tag metrics
  - Card appearance and key-card data
  - Victory impact and loss-correlation logic
  - Most-played card outcomes
  - Tag assets
  - Supporting game queries
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
  - [ ] Card comparison
  - [ ] Tag comparison
  - [ ] Only after canonical modules are tested
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

- [ ] Card comparison
- [ ] Tag comparison
- [ ] Only after canonical modules are tested
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 13.5 — Add reliability and evidence

### Source-defined scope

- Sample thresholds
- Denominators
- Low-sample badges
- Supporting games
- Methodology

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Existing tag distributions and outcomes
  - Global tag metrics
  - Card appearance and key-card data
  - Victory impact and loss-correlation logic
  - Most-played card outcomes
  - Tag assets
  - Supporting game queries
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
  - [ ] Sample thresholds
  - [ ] Denominators
  - [ ] Low-sample badges
  - [ ] Supporting games
  - [ ] Methodology
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

- [ ] Sample thresholds
- [ ] Denominators
- [ ] Low-sample badges
- [ ] Supporting games
- [ ] Methodology
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 13.6 — Integrate Supabase tag graphics

### Source-defined scope

- Use the production tag graphic in the tag selector, overview chart labels, distribution header, table rows, detail views, filter chips, and Compare.
- Resolve tags by the canonical ID or slug identified in Phase 0, not by display text.
- Use a consistent compact icon size and preserve the original aspect ratio.
- Display the tag name alongside the graphic in controls and data tables.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - Existing tag distributions and outcomes
  - Global tag metrics
  - Card appearance and key-card data
  - Victory impact and loss-correlation logic
  - Most-played card outcomes
  - Tag assets
  - Supporting game queries
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
  - [ ] Use the production tag graphic in the tag selector, overview chart labels, distribution header, table rows, detail views, filter chips, and Compare.
  - [ ] Resolve tags by the canonical ID or slug identified in Phase 0, not by display text.
  - [ ] Use a consistent compact icon size and preserve the original aspect ratio.
  - [ ] Display the tag name alongside the graphic in controls and data tables.
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

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test successful lookup, missing record, malformed path, accessible name, responsive sizing, and fallback rendering.

### Step completion gate

- [ ] Use the production tag graphic in the tag selector, overview chart labels, distribution header, table rows, detail views, filter chips, and Compare.
- [ ] Resolve tags by the canonical ID or slug identified in Phase 0, not by display text.
- [ ] Use a consistent compact icon size and preserve the original aspect ratio.
- [ ] Display the tag name alongside the graphic in controls and data tables.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Card Acquisition and Conversion dashboard — carried forward

>  **Provenance:** this section is REPO-NATIVE, not derived from the Word guide. It was
>  already present in `docs/redesign/phases/13-card-and-tag-analytics.md` and is carried forward here because
>  the Word-derived expansion contains none of it — no mention of purchase conversion,
>  cards seen, hand utilization, end-hand carryover, purchase pace, seen pace, purchased
>  hand share, or cards purchased. Verbatim; nothing rewritten.

### User question

How does a player's card acquisition behavior relate to game outcomes?

### KPI strip

- Cards purchased per game
- Cards seen per game
- Purchase conversion
- Purchased hand share
- Hand utilization
- End-hand carryover
- Eligible games
- Data coverage

### Primary graphics

1. Cards purchased versus win rate
2. Cards seen versus win rate
3. Purchase conversion versus outcome

### Supporting graphics

- Purchase pace by generation
- Seen pace by generation
- Outcome distribution by purchase range
- Corporation and Prelude comparison
- Game-length and player-count comparison
- Individual versus group and global baselines

### Required outcome measures

- Win rate
- Average score
- Median score
- Average placement
- Win-point differential
- Overall point differential

### Statistical requirements

- Show game counts for every range.
- Use data-derived ranges or quantiles when appropriate.
- Preserve an exact-value table.
- Provide raw descriptive results.
- Add adjusted analysis only when supported.
- Do not imply causation.
- Do not average per-game percentages without labeling the aggregation method.

### Data-quality states

Support:

- Full coverage
- Partial coverage
- Purchase-only coverage
- Seen-only coverage
- No eligible data
- Low sample

### Accessibility

- Provide table alternatives.
- Do not communicate ranges through color alone.
- Include formulas and denominators.
- Make chart selections keyboard accessible.


## Copy-ready agent execution prompt

> Perform Phase 13 only: create canonical reusable Card Analytics and Unified Tag Analytics modules for Global, Individual, Group, and Compare scopes.
>
> Merge Tag Outcomes and Tag Distribution into one coordinated selected-tag experience. Include performance overview, baseline delta, result volume, average and maximum count, count distribution, outcome by intensity, minimum sample, best supported count, sortable table, deterministic insights, and supporting games. Synchronize selection across selector, charts, table, insights, and URL.
>
> Build card modules for victory impact, loss correlation, most-played cards in wins, personal helpful/harmful signals, most-played outcomes, usage versus performance, and timing only when card-event timing exists.
>
> Use association language, show denominators and samples, qualify low samples, and prevent one-game leaders from becoming supported leaders. Reuse one calculation layer across scopes and add tests.
> PRODUCTION GRAPHICS
> Use the existing Supabase tag graphics throughout Unified Tag Analytics. Resolve by canonical tag ID or slug and use the shared TagGraphic component in selectors, charts, tables, detail panels, chips, and Compare. Do not create local replacements.
> CARD AND TAG DASHBOARD COMPOSITION
> Build a synchronized selected-tag dashboard with icon selector, ranked performance bars, count distribution, outcome-by-intensity chart, table, insights, and supporting games.
> Build card analytics with ranked outcome panels, baseline markers, timing or usage distributions when supported, and detail evidence.
> Use Supabase tag graphics in selectors, labels, legends, table rows, and details.

## Acceptance checklist

- [ ] One canonical Tag Analytics module exists.

- [ ] Selection is synchronized.

- [ ] Card analytics are evidence based.

- [ ] Timing is only shown when available.

- [ ] Samples and denominators are visible.

- [ ] Scope reuse is proven by tests.

- [ ] All visible tag graphics come from the audited Supabase source of truth.

- [ ] Card and Tag dashboards synchronize selection across graphics, tables, insights, evidence, and URL state.

- [ ] Supabase tag graphics are used consistently and missing assets preserve layout.

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

- Phase 13 may be marked complete only after every source step above has its own accepted handoff and the phase acceptance checklist passes as one integrated system.
- A later phase must not begin automatically. The final handoff identifies only the next possible separately authorized phase or remediation task.
- Any formula, migration, authorization rule, public-data contract, or URL-state change requires the independent review specified by the Word guide.
- Production migration, backfill, RLS mutation, Storage change, push, or deployment remains prohibited unless a separate explicit authorization and evidence record exists.
