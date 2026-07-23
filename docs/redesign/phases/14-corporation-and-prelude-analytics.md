# Phase 14 — Corporation and Prelude Analytics

Create reusable corporation, Prelude, and pairing analytics for global, group, player, and comparison contexts.

> **Source authority:** `TM_Stats_Redesign_Integrated_Full_Implementation_Guide_2026-07-19_Expanded_Step_4_3(5).docx`, Phase 14.
>
> **Preservation rule:** The source steps, their order, their dependencies, and their stop conditions are unchanged. The stage headings in this Markdown file only divide each source step into smaller reviewable checkpoints using the guide’s existing `Read → Inspect → Plan → Implement → Test → Render/Review → Document → Commit → Handoff` process.

## Status

Phase 14 is **planned and not started** unless `docs/REDESIGN_STATE.md` and a later explicit owner assignment say otherwise. This file does not authorize implementation, migration, production mutation, push, deployment, or work on a later phase.

## Recommended agent and effort

| Field | Recommendation |
| --- | --- |
| Preferred execution | Split phase |
| Recommended configuration | Codex GPT-5.6 Sol - Extra High for smoothing and queries; Claude Sonnet 5 - High for visuals |
| Acceptable alternate | Claude Opus 4.8 - xhigh may plan the confidence model |
| Independent reviewer | Claude Opus 4.8 - xhigh for raw-versus-adjusted review |
| Handoff sensitivity | Critical |
| Recommended handoff pattern | The formula and prior settings must be committed before UI work. The second agent reviews low-sample behavior and supported-leader logic. |

| Stop rule | Complete only this phase or its explicitly assigned substep. Commit, write the handoff file, and stop before beginning the next phase. |
| --- | --- |

## Outcome of this phase

Entity rankings, raw and adjusted pairings, detail evidence, fit, and comparison.

## Why this phase comes now

Corporation and Prelude analysis appears in several briefs and should not be separately reimplemented per page.

## Prerequisites

- Canonical scope and reliability rules exist.

- Pairing and entity queries are audited.

## Inspect before editing

- CorporationPreludePairingsPanel

- Global corporation metrics

- Player corporation and Prelude rows

- Pairing detail data

- Existing smoothing or confidence rules

- Supporting games

## Do not do in this phase

- Do not invent a new adjusted formula if one already exists.

- Do not hide raw one-game results; qualify them.

- Do not duplicate entity calculations across pages.

## Expanded working sequence

The source step order is preserved. Each row is a bounded implementation assignment and must end with its own validation, documentation, clean commit, and handoff.

| Source step | Bounded execution result | Stop condition |
| --- | --- | --- |
| 14.1 — Build pairing rankings | Raw win rate; Adjusted win rate; Games; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 14.2 — Define adjustment method | Locate canonical method first.; If absent, use documented configurable smoothing.; Test prior mean, prior weight, ties, and nulls. | Commit and hand off this source step; do not begin the next source heading. |
| 14.3 — Build corporation and Prelude summaries | Games; Win rate; Score; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 14.4 — Add details and evidence | Detail drawer/page; Trend when sample supports it; Recent games; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 14.5 — Expand Compare | Corporation; Prelude; Pairing comparison using canonical data | Commit and hand off this source step; do not begin the next source heading. |
| 14.6 — Integrate Supabase corporation logos | Use production corporation logos in rankings, cards, selectors, tables, pairings, player summaries, details, supporting games, and Compare.; Resolve logos using canonical corporation IDs or slugs.; Preserve logo aspect ratios and support transparent assets on dark surfaces.; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |

## Step 14.1 — Build pairing rankings

### Source-defined scope

- Raw win rate
- Adjusted win rate
- Games
- Wins
- Score
- Placement
- Generations
- Confidence
- Player distribution
- Final action where available

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - CorporationPreludePairingsPanel
  - Global corporation metrics
  - Player corporation and Prelude rows
  - Pairing detail data
  - Existing smoothing or confidence rules
  - Supporting games
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Translate every item in the source-defined scope into an explicit typed contract before presentation work begins.
- For every metric or state, record the source query, scope, denominator, eligibility, tie behavior, filter behavior, sorting behavior, and missing-versus-zero behavior.
- Reuse the canonical analytics scope, URL state, formatting, confidence, sample-size, capability, asset, and public-identity layers established by earlier phases.
- Keep calculations outside presentation JSX and keep one calculation/query path for every value reused across global, group, player, game, or comparison contexts.
- Mark unsupported or partial capabilities honestly. Do not create a field, formula, event, coordinate, identity fact, or historical value that the repository cannot support.
- Fix the ranking population, eligibility threshold, sort direction, tie behavior, and stable secondary ordering before rendering.
- Keep raw values, adjusted values, sample size, and confidence as separate fields rather than compressing them into one score.
- Locate and document the existing canonical method before creating any utility or query.
- Keep the raw result visible beside the adjusted result and record every configurable prior, weight, threshold, and exclusion.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Raw win rate
  - [ ] Adjusted win rate
  - [ ] Games
  - [ ] Wins
  - [ ] Score
  - [ ] Placement
  - [ ] Generations
  - [ ] Confidence
  - [ ] Player distribution
  - [ ] Final action where available
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
- Test ties, threshold boundaries, low samples, null metrics, filter changes, and deterministic ordering.
- Test raw-versus-adjusted separation, prior behavior, ties, nulls, repeatability, and sample-size transitions.

### Step completion gate

- [ ] Raw win rate
- [ ] Adjusted win rate
- [ ] Games
- [ ] Wins
- [ ] Score
- [ ] Placement
- [ ] Generations
- [ ] Confidence
- [ ] Player distribution
- [ ] Final action where available
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 14.2 — Define adjustment method

### Source-defined scope

- Locate canonical method first.
- If absent, use documented configurable smoothing.
- Test prior mean, prior weight, ties, and nulls.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - CorporationPreludePairingsPanel
  - Global corporation metrics
  - Player corporation and Prelude rows
  - Pairing detail data
  - Existing smoothing or confidence rules
  - Supporting games
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
- Name the states supported, absent, unknown, partial, unavailable, not applicable, explicit zero, and insufficient sample separately.
- Do not use convenience defaults that convert missing evidence into zero, false, or confirmed absence.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Locate canonical method first.
  - [ ] If absent, use documented configurable smoothing.
  - [ ] Test prior mean, prior weight, ties, and nulls.
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
- Test every distinct missing-data state and confirm labels, calculations, tables, and URL filters preserve the distinction.

### Step completion gate

- [ ] Locate canonical method first.
- [ ] If absent, use documented configurable smoothing.
- [ ] Test prior mean, prior weight, ties, and nulls.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 14.3 — Build corporation and Prelude summaries

### Source-defined scope

- Games
- Win rate
- Score
- Placement
- Period delta
- Player use
- Map
- Table size
- Tags
- Scoring composition
- Confidence

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - CorporationPreludePairingsPanel
  - Global corporation metrics
  - Player corporation and Prelude rows
  - Pairing detail data
  - Existing smoothing or confidence rules
  - Supporting games
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
  - [ ] Games
  - [ ] Win rate
  - [ ] Score
  - [ ] Placement
  - [ ] Period delta
  - [ ] Player use
  - [ ] Map
  - [ ] Table size
  - [ ] Tags
  - [ ] Scoring composition
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

### Step completion gate

- [ ] Games
- [ ] Win rate
- [ ] Score
- [ ] Placement
- [ ] Period delta
- [ ] Player use
- [ ] Map
- [ ] Table size
- [ ] Tags
- [ ] Scoring composition
- [ ] Confidence
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 14.4 — Add details and evidence

### Source-defined scope

- Detail drawer/page
- Trend when sample supports it
- Recent games
- Entity links

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - CorporationPreludePairingsPanel
  - Global corporation metrics
  - Player corporation and Prelude rows
  - Pairing detail data
  - Existing smoothing or confidence rules
  - Supporting games
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
  - [ ] Detail drawer/page
  - [ ] Trend when sample supports it
  - [ ] Recent games
  - [ ] Entity links
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

- [ ] Detail drawer/page
- [ ] Trend when sample supports it
- [ ] Recent games
- [ ] Entity links
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 14.5 — Expand Compare

### Source-defined scope

- Corporation
- Prelude
- Pairing comparison using canonical data

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - CorporationPreludePairingsPanel
  - Global corporation metrics
  - Player corporation and Prelude rows
  - Pairing detail data
  - Existing smoothing or confidence rules
  - Supporting games
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
  - [ ] Corporation
  - [ ] Prelude
  - [ ] Pairing comparison using canonical data
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

- [ ] Corporation
- [ ] Prelude
- [ ] Pairing comparison using canonical data
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 14.6 — Integrate Supabase corporation logos

### Source-defined scope

- Use production corporation logos in rankings, cards, selectors, tables, pairings, player summaries, details, supporting games, and Compare.
- Resolve logos using canonical corporation IDs or slugs.
- Preserve logo aspect ratios and support transparent assets on dark surfaces.
- Use the corporation name beside the logo except where the graphic is explicitly decorative.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing implementation, repository queries, types, calculations, routes, components, tests, and styling that already serve any part of this step.
- Begin with the phase inspection list, especially:
  - CorporationPreludePairingsPanel
  - Global corporation metrics
  - Player corporation and Prelude rows
  - Pairing detail data
  - Existing smoothing or confidence rules
  - Supporting games
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
  - [ ] Use production corporation logos in rankings, cards, selectors, tables, pairings, player summaries, details, supporting games, and Compare.
  - [ ] Resolve logos using canonical corporation IDs or slugs.
  - [ ] Preserve logo aspect ratios and support transparent assets on dark surfaces.
  - [ ] Use the corporation name beside the logo except where the graphic is explicitly decorative.
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

- [ ] Use production corporation logos in rankings, cards, selectors, tables, pairings, player summaries, details, supporting games, and Compare.
- [ ] Resolve logos using canonical corporation IDs or slugs.
- [ ] Preserve logo aspect ratios and support transparent assets on dark surfaces.
- [ ] Use the corporation name beside the logo except where the graphic is explicitly decorative.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Copy-ready agent execution prompt

> Perform Phase 14 only: create reusable Corporation, Prelude, and Corporation + Prelude Pairing analytics for global, group, player, and comparison scopes.
>
> Refactor and reuse CorporationPreludePairingsPanel and existing repositories. Show raw win rate, confidence-adjusted win rate, games, wins, average score, average placement, average generations, confidence, player distribution, final-action context when available, and supporting games.
>
> Locate an existing adjustment method before introducing one. If none exists, implement a documented configurable smoothing method in one tested utility. Keep raw one-game 100% results visible but mark them experimental and exclude them from supported-leader conclusions.
>
> Build corporation and Prelude summaries using only available metrics, detail evidence, and comparison modes. Add unit tests for adjustments, confidence, ties, nulls, filters, and sorting.
> PRODUCTION GRAPHICS
> Use the existing Supabase corporation logos throughout corporation and pairing analytics. Resolve by canonical corporation ID or slug and use the shared CorporationLogo component in selectors, rankings, tables, player panels, details, supporting games, and Compare.
> CORPORATION AND PRELUDE DASHBOARD COMPOSITION
> Build logo-rich ranked panels, pairing matrix or comparison chart, scoring composition, condition splits, trend, and supporting games.
> Synchronize corporation or pairing selection across charts, table, detail drawer, and Compare links.
> Use production corporation logos from Supabase everywhere an entity is visually identified.

## Acceptance checklist

- [ ] Entity analytics reuse one calculation layer.

- [ ] Raw and adjusted values are distinct.

- [ ] Experimental samples are visible but qualified.

- [ ] Details link to games.

- [ ] Compare uses canonical modules.

- [ ] Tests cover adjustment and confidence.

- [ ] All visible corporation logos come from the audited Supabase source of truth.

- [ ] Corporation and Prelude dashboards combine ranking, pairing, composition, conditions, trends, and evidence.

- [ ] Corporation logos are resolved from Supabase through one shared layer.

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

- Phase 14 may be marked complete only after every source step above has its own accepted handoff and the phase acceptance checklist passes as one integrated system.
- A later phase must not begin automatically. The final handoff identifies only the next possible separately authorized phase or remediation task.
- Any formula, migration, authorization rule, public-data contract, or URL-state change requires the independent review specified by the Word guide.
- Production migration, backfill, RLS mutation, Storage change, push, or deployment remains prohibited unless a separate explicit authorization and evidence record exists.
