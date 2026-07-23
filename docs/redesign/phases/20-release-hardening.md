# Phase 20 — Legacy Cleanup and Release Hardening

Remove duplication only after replacements are proven, then complete accessibility, responsive, performance, and release validation.

> **Source authority:** `TM_Stats_Redesign_Integrated_Full_Implementation_Guide_2026-07-19_Expanded_Step_4_3(5).docx`, Phase 20.
>
> **Preservation rule:** The source steps, their order, their dependencies, and their stop conditions are unchanged. The stage headings in this Markdown file only divide each source step into smaller reviewable checkpoints using the guide’s existing `Read → Inspect → Plan → Implement → Test → Render/Review → Document → Commit → Handoff` process.

## Status

Phase 20 is **planned and not started** unless `docs/REDESIGN_STATE.md` and a later explicit owner assignment say otherwise. This file does not authorize implementation, migration, production mutation, push, deployment, or work on a later phase.

## Recommended agent and effort

| Field | Recommendation |
| --- | --- |
| Preferred execution | Codex implementation plus independent Claude release and privacy review |
| Recommended configuration | Codex GPT-5.6 Sol - Extra High - Standard |
| Acceptable alternate | Claude Opus 4.8 - xhigh or max for cleanup execution |
| Independent reviewer | Claude Opus 4.8 - max effort - fresh session with the full public-surface privacy audit |
| Handoff sensitivity | Critical |
| Recommended handoff pattern | The implementer commits cleanup first. Claude performs a read-only Level 5 release, security, accessibility, and private-name leakage audit. Findings become a separate bounded fix task before final closure. |

| Stop rule | Complete only this phase or its explicitly assigned substep. Commit, write the handoff file, and stop before beginning the next phase. |
| --- | --- |

## Outcome of this phase

A clean route map, no hidden legacy copies, full regression coverage, documented limitations, and a production-ready build.

## Why this phase comes now

Final cleanup too early would risk losing working analytics; final cleanup too late would leave duplicate logic and inconsistent navigation.

## Prerequisites

- All target pages and domain modules are functional.

- Redirects and replacement evidence links are tested.

- Live-site v2 deployment marker/cutoff, schema capability detection, compatibility adapter telemetry, and parser-version support

- Historical expansion-fact preservation checks and immutable Step 4.3 reports

- Separate live-site backup-table security remediation status

## Inspect before editing

- /profile

- /insights

- /group

- /saved-games

- Navigation and legacy redirects

- Duplicate utilities and title-string hacks

- Bundle and query performance

- Accessibility and responsive test coverage

## Do not do in this phase

- Do not bundle the 22 backup-table security findings into redesign cleanup without a separate production-security authorization.

- Do not remove pre-v2 compatibility or force a v2-only cutover without verified deployment and reconciliation evidence.

- Do not delete code still imported by target routes.

- Do not remove legacy redirects.

- Do not suppress failing tests or console warnings.

- Do not ship hidden duplicate dashboards.

## Expanded working sequence

The source step order is preserved. Each row is a bounded implementation assignment and must end with its own validation, documentation, clean commit, and handoff.

| Source step | Bounded execution result | Stop condition |
| --- | --- | --- |
| 20.1 — Remove legacy duplication | Old route rendering; Dead aliases; Unused imports; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 20.2 — Verify accessibility | Headings; Labels; Focus; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 20.3 — Verify responsive behavior | 1440px; 1024px; 768px; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 20.4 — Profile performance | Memoization; No recalculation on hover; Lazy charts and drawers; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 20.5 — Run full regression | npm test; npx tsc --noEmit; npm run lint; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 20.6 — Produce final documentation | Route list; Page/view list; Component list; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 20.7 — Validate production asset integration | Verify every tag, point-source, and corporation graphic resolves through the shared Supabase layer.; Check public or signed URL behavior in production-like builds and confirm RLS does not expose protected storage.; Check image dimensions, cumulative layout shift, lazy loading, caching, dark-theme contrast, fallback rendering, alt text, and keyboard-accessible surrounding controls.; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| Source heading — Validate win point differential analytics | Confirm one canonical formula is used across Individual, Group, Global, Compare, Leaderboard, Improvement, and Competition.; Verify multiplayer runner-up selection, tie handling, incomplete games, minimum-wins eligibility, close/decisive thresholds, and group/global aggregation weighting.; Compare displayed samples and supporting games against repository-level fixtures or known records.; and the remaining source-defined items | Apply and validate this source contract at this exact position before continuing. |
| 20.9 — Validate per-generation cards bought and TR analytics | Verify one canonical storage/query contract is used by Log a Game, imports, Game Detail, Replay, Global, Individual, Group, Compare, and Improvement.; Test explicit zero versus missing, generation ordering, duplicates, partial games, games of different lengths, TR checkpoint labels, legal decreases, corrections, and RLS.; Verify cards-bought bars, TR stepped lines, selected-generation details, filters, URL state, evidence tables, and accessible summaries remain synchronized.; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 20.10 — Validate identity privacy and public data boundaries | Search the repository for public use of full_name, first_name, last_name, display_name, normalized personal-name values, private aliases, select(*), complete profile records, and direct player-name fallbacks.; Use known test personal names to inspect public pages, page source, hydration, APIs, RPCs, views, metadata, titles, URLs, structured data, exports, logs, telemetry, and analytics events.; Verify every public player label uses the centralized resolver and resolves claimed players to username or a neutral fallback.; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |

## Step 20.1 — Remove legacy duplication

### Source-defined scope

- Old route rendering
- Dead aliases
- Unused imports
- Hidden desktop/mobile duplicates
- Duplicate calculations
- Stale links
- Obsolete CSS

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the accepted implementation, baseline commands, route matrix, asset layer, analytics utilities, privacy boundaries, migration/ledger records, handoffs, known warnings, and release evidence relevant to this verification step.
- Reproduce the current baseline before cleanup so every claimed improvement or regression is measured against a recorded starting point.
- Begin with the phase inspection list, especially:
  - /profile
  - /insights
  - /group
  - /saved-games
  - Navigation and legacy redirects
  - Duplicate utilities and title-string hacks
  - Bundle and query performance
  - Accessibility and responsive test coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the exact verification population, browsers/viewports, routes, datasets, commands, performance thresholds, accessibility checks, privacy scans, and accepted warnings before changing code.
- Treat completed formulas, URL contracts, route ownership, identity rules, asset sources, and missing-data semantics as protected. Open a new blocker instead of silently redefining them during release cleanup.
- Distinguish required cleanup from optional polish, pre-existing failure from introduced failure, and repository evidence from production/deployment evidence.
- Preserve production boundaries: no migration, backfill, RLS, Storage, push, deployment, or data mutation without separate explicit authorization.
- Require reproducible evidence for every deletion, performance claim, accessibility claim, privacy claim, and release-readiness verdict.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Old route rendering
  - [ ] Dead aliases
  - [ ] Unused imports
  - [ ] Hidden desktop/mobile duplicates
  - [ ] Duplicate calculations
  - [ ] Stale links
  - [ ] Obsolete CSS
- Remove or change only behavior proven redundant, unreachable, unsafe, inaccessible, or inconsistent with an accepted contract.
- Preserve canonical routes, compatibility links, stable identifiers, authentication, group scope, public identity, data provenance, and the responsive single-website information architecture.
- Keep cleanup commits focused so regression causes remain attributable and reversible.
- Update final documentation and evidence as part of the same bounded step; do not rely on chat history as release state.

### Stage D — Integration, evidence, and user-interface review

- Verify every affected route in the agreed browser and viewport matrix and inspect the actual rendered result rather than relying only on generated screenshots.
- Compare test, typecheck, lint, build, accessibility, performance, privacy, and route results with the recorded baseline.
- Review bundle/query/render cost, asset caching, server/client boundaries, hydration payloads, logs, telemetry, metadata, and error output.
- Treat this as verification and cleanup: do not reopen accepted analytical definitions or information architecture without a newly recorded blocker and owner decision.
- Treat this as verification and cleanup: do not reopen completed analytical definitions or redesign accepted information architecture without a newly recorded blocker.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.

### Step completion gate

- [ ] Old route rendering
- [ ] Dead aliases
- [ ] Unused imports
- [ ] Hidden desktop/mobile duplicates
- [ ] Duplicate calculations
- [ ] Stale links
- [ ] Obsolete CSS
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 20.2 — Verify accessibility

### Source-defined scope

- Headings
- Labels
- Focus
- Keyboard tabs and tables
- Chart summaries
- aria-sort
- aria-live
- Drawer focus
- Non-color meaning
- Reduced motion
- Contrast

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the accepted implementation, baseline commands, route matrix, asset layer, analytics utilities, privacy boundaries, migration/ledger records, handoffs, known warnings, and release evidence relevant to this verification step.
- Reproduce the current baseline before cleanup so every claimed improvement or regression is measured against a recorded starting point.
- Begin with the phase inspection list, especially:
  - /profile
  - /insights
  - /group
  - /saved-games
  - Navigation and legacy redirects
  - Duplicate utilities and title-string hacks
  - Bundle and query performance
  - Accessibility and responsive test coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the exact verification population, browsers/viewports, routes, datasets, commands, performance thresholds, accessibility checks, privacy scans, and accepted warnings before changing code.
- Treat completed formulas, URL contracts, route ownership, identity rules, asset sources, and missing-data semantics as protected. Open a new blocker instead of silently redefining them during release cleanup.
- Distinguish required cleanup from optional polish, pre-existing failure from introduced failure, and repository evidence from production/deployment evidence.
- Preserve production boundaries: no migration, backfill, RLS, Storage, push, deployment, or data mutation without separate explicit authorization.
- Require reproducible evidence for every deletion, performance claim, accessibility claim, privacy claim, and release-readiness verdict.
- Require canonical map, space, placement, ownership, attribution, provenance, and coverage fields before enabling spatial analysis.
- Do not infer coordinates, ownership, actor, or board completion from final totals or incomplete events.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Headings
  - [ ] Labels
  - [ ] Focus
  - [ ] Keyboard tabs and tables
  - [ ] Chart summaries
  - [ ] aria-sort
  - [ ] aria-live
  - [ ] Drawer focus
  - [ ] Non-color meaning
  - [ ] Reduced motion
  - [ ] Contrast
- Remove or change only behavior proven redundant, unreachable, unsafe, inaccessible, or inconsistent with an accepted contract.
- Preserve canonical routes, compatibility links, stable identifiers, authentication, group scope, public identity, data provenance, and the responsive single-website information architecture.
- Keep cleanup commits focused so regression causes remain attributable and reversible.
- Update final documentation and evidence as part of the same bounded step; do not rely on chat history as release state.

### Stage D — Integration, evidence, and user-interface review

- Verify every affected route in the agreed browser and viewport matrix and inspect the actual rendered result rather than relying only on generated screenshots.
- Compare test, typecheck, lint, build, accessibility, performance, privacy, and route results with the recorded baseline.
- Review bundle/query/render cost, asset caching, server/client boundaries, hydration payloads, logs, telemetry, metadata, and error output.
- Treat this as verification and cleanup: do not reopen accepted analytical definitions or information architecture without a newly recorded blocker and owner decision.
- Treat this as verification and cleanup: do not reopen completed analytical definitions or redesign accepted information architecture without a newly recorded blocker.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test map variants, unresolved spaces, unattributed placements, replacements/removals, partial coverage, and no-coordinate fallbacks.

### Step completion gate

- [ ] Headings
- [ ] Labels
- [ ] Focus
- [ ] Keyboard tabs and tables
- [ ] Chart summaries
- [ ] aria-sort
- [ ] aria-live
- [ ] Drawer focus
- [ ] Non-color meaning
- [ ] Reduced motion
- [ ] Contrast
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 20.3 — Verify responsive behavior

### Source-defined scope

- 1440px
- 1024px
- 768px
- 390px
- No page overflow
- Mobile nav
- Log Game actions
- Tables
- Charts
- Sheets

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the accepted implementation, baseline commands, route matrix, asset layer, analytics utilities, privacy boundaries, migration/ledger records, handoffs, known warnings, and release evidence relevant to this verification step.
- Reproduce the current baseline before cleanup so every claimed improvement or regression is measured against a recorded starting point.
- Begin with the phase inspection list, especially:
  - /profile
  - /insights
  - /group
  - /saved-games
  - Navigation and legacy redirects
  - Duplicate utilities and title-string hacks
  - Bundle and query performance
  - Accessibility and responsive test coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the exact verification population, browsers/viewports, routes, datasets, commands, performance thresholds, accessibility checks, privacy scans, and accepted warnings before changing code.
- Treat completed formulas, URL contracts, route ownership, identity rules, asset sources, and missing-data semantics as protected. Open a new blocker instead of silently redefining them during release cleanup.
- Distinguish required cleanup from optional polish, pre-existing failure from introduced failure, and repository evidence from production/deployment evidence.
- Preserve production boundaries: no migration, backfill, RLS, Storage, push, deployment, or data mutation without separate explicit authorization.
- Require reproducible evidence for every deletion, performance claim, accessibility claim, privacy claim, and release-readiness verdict.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] 1440px
  - [ ] 1024px
  - [ ] 768px
  - [ ] 390px
  - [ ] No page overflow
  - [ ] Mobile nav
  - [ ] Log Game actions
  - [ ] Tables
  - [ ] Charts
  - [ ] Sheets
- Remove or change only behavior proven redundant, unreachable, unsafe, inaccessible, or inconsistent with an accepted contract.
- Preserve canonical routes, compatibility links, stable identifiers, authentication, group scope, public identity, data provenance, and the responsive single-website information architecture.
- Keep cleanup commits focused so regression causes remain attributable and reversible.
- Update final documentation and evidence as part of the same bounded step; do not rely on chat history as release state.

### Stage D — Integration, evidence, and user-interface review

- Verify every affected route in the agreed browser and viewport matrix and inspect the actual rendered result rather than relying only on generated screenshots.
- Compare test, typecheck, lint, build, accessibility, performance, privacy, and route results with the recorded baseline.
- Review bundle/query/render cost, asset caching, server/client boundaries, hydration payloads, logs, telemetry, metadata, and error output.
- Treat this as verification and cleanup: do not reopen accepted analytical definitions or information architecture without a newly recorded blocker and owner decision.
- Treat this as verification and cleanup: do not reopen completed analytical definitions or redesign accepted information architecture without a newly recorded blocker.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.

### Step completion gate

- [ ] 1440px
- [ ] 1024px
- [ ] 768px
- [ ] 390px
- [ ] No page overflow
- [ ] Mobile nav
- [ ] Log Game actions
- [ ] Tables
- [ ] Charts
- [ ] Sheets
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 20.4 — Profile performance

### Source-defined scope

- Memoization
- No recalculation on hover
- Lazy charts and drawers
- No hidden duplicate rendering
- No request per row
- Server aggregation
- Stale-request cancellation
- Bundle impact

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the accepted implementation, baseline commands, route matrix, asset layer, analytics utilities, privacy boundaries, migration/ledger records, handoffs, known warnings, and release evidence relevant to this verification step.
- Reproduce the current baseline before cleanup so every claimed improvement or regression is measured against a recorded starting point.
- Begin with the phase inspection list, especially:
  - /profile
  - /insights
  - /group
  - /saved-games
  - Navigation and legacy redirects
  - Duplicate utilities and title-string hacks
  - Bundle and query performance
  - Accessibility and responsive test coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the exact verification population, browsers/viewports, routes, datasets, commands, performance thresholds, accessibility checks, privacy scans, and accepted warnings before changing code.
- Treat completed formulas, URL contracts, route ownership, identity rules, asset sources, and missing-data semantics as protected. Open a new blocker instead of silently redefining them during release cleanup.
- Distinguish required cleanup from optional polish, pre-existing failure from introduced failure, and repository evidence from production/deployment evidence.
- Preserve production boundaries: no migration, backfill, RLS, Storage, push, deployment, or data mutation without separate explicit authorization.
- Require reproducible evidence for every deletion, performance claim, accessibility claim, privacy claim, and release-readiness verdict.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Memoization
  - [ ] No recalculation on hover
  - [ ] Lazy charts and drawers
  - [ ] No hidden duplicate rendering
  - [ ] No request per row
  - [ ] Server aggregation
  - [ ] Stale-request cancellation
  - [ ] Bundle impact
- Remove or change only behavior proven redundant, unreachable, unsafe, inaccessible, or inconsistent with an accepted contract.
- Preserve canonical routes, compatibility links, stable identifiers, authentication, group scope, public identity, data provenance, and the responsive single-website information architecture.
- Keep cleanup commits focused so regression causes remain attributable and reversible.
- Update final documentation and evidence as part of the same bounded step; do not rely on chat history as release state.

### Stage D — Integration, evidence, and user-interface review

- Verify every affected route in the agreed browser and viewport matrix and inspect the actual rendered result rather than relying only on generated screenshots.
- Compare test, typecheck, lint, build, accessibility, performance, privacy, and route results with the recorded baseline.
- Review bundle/query/render cost, asset caching, server/client boundaries, hydration payloads, logs, telemetry, metadata, and error output.
- Treat this as verification and cleanup: do not reopen accepted analytical definitions or information architecture without a newly recorded blocker and owner decision.
- Treat this as verification and cleanup: do not reopen completed analytical definitions or redesign accepted information architecture without a newly recorded blocker.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.

### Step completion gate

- [ ] Memoization
- [ ] No recalculation on hover
- [ ] Lazy charts and drawers
- [ ] No hidden duplicate rendering
- [ ] No request per row
- [ ] Server aggregation
- [ ] Stale-request cancellation
- [ ] Bundle impact
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 20.5 — Run full regression

### Source-defined scope

- npm test
- npx tsc --noEmit
- npm run lint
- npm run build
- npm run test:e2e

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the accepted implementation, baseline commands, route matrix, asset layer, analytics utilities, privacy boundaries, migration/ledger records, handoffs, known warnings, and release evidence relevant to this verification step.
- Reproduce the current baseline before cleanup so every claimed improvement or regression is measured against a recorded starting point.
- Begin with the phase inspection list, especially:
  - /profile
  - /insights
  - /group
  - /saved-games
  - Navigation and legacy redirects
  - Duplicate utilities and title-string hacks
  - Bundle and query performance
  - Accessibility and responsive test coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the exact verification population, browsers/viewports, routes, datasets, commands, performance thresholds, accessibility checks, privacy scans, and accepted warnings before changing code.
- Treat completed formulas, URL contracts, route ownership, identity rules, asset sources, and missing-data semantics as protected. Open a new blocker instead of silently redefining them during release cleanup.
- Distinguish required cleanup from optional polish, pre-existing failure from introduced failure, and repository evidence from production/deployment evidence.
- Preserve production boundaries: no migration, backfill, RLS, Storage, push, deployment, or data mutation without separate explicit authorization.
- Require reproducible evidence for every deletion, performance claim, accessibility claim, privacy claim, and release-readiness verdict.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] npm test
  - [ ] npx tsc --noEmit
  - [ ] npm run lint
  - [ ] npm run build
  - [ ] npm run test:e2e
- Remove or change only behavior proven redundant, unreachable, unsafe, inaccessible, or inconsistent with an accepted contract.
- Preserve canonical routes, compatibility links, stable identifiers, authentication, group scope, public identity, data provenance, and the responsive single-website information architecture.
- Keep cleanup commits focused so regression causes remain attributable and reversible.
- Update final documentation and evidence as part of the same bounded step; do not rely on chat history as release state.

### Stage D — Integration, evidence, and user-interface review

- Verify every affected route in the agreed browser and viewport matrix and inspect the actual rendered result rather than relying only on generated screenshots.
- Compare test, typecheck, lint, build, accessibility, performance, privacy, and route results with the recorded baseline.
- Review bundle/query/render cost, asset caching, server/client boundaries, hydration payloads, logs, telemetry, metadata, and error output.
- Treat this as verification and cleanup: do not reopen accepted analytical definitions or information architecture without a newly recorded blocker and owner decision.
- Treat this as verification and cleanup: do not reopen completed analytical definitions or redesign accepted information architecture without a newly recorded blocker.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.

### Step completion gate

- [ ] npm test
- [ ] npx tsc --noEmit
- [ ] npm run lint
- [ ] npm run build
- [ ] npm run test:e2e
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 20.6 — Produce final documentation

### Source-defined scope

- Route list
- Page/view list
- Component list
- Reused/retired components
- Formulas
- Database changes
- Data gaps
- Redirects
- Accessibility
- Screenshots
- Performance
- Tests
- Limitations

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the accepted implementation, baseline commands, route matrix, asset layer, analytics utilities, privacy boundaries, migration/ledger records, handoffs, known warnings, and release evidence relevant to this verification step.
- Reproduce the current baseline before cleanup so every claimed improvement or regression is measured against a recorded starting point.
- Begin with the phase inspection list, especially:
  - /profile
  - /insights
  - /group
  - /saved-games
  - Navigation and legacy redirects
  - Duplicate utilities and title-string hacks
  - Bundle and query performance
  - Accessibility and responsive test coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the exact verification population, browsers/viewports, routes, datasets, commands, performance thresholds, accessibility checks, privacy scans, and accepted warnings before changing code.
- Treat completed formulas, URL contracts, route ownership, identity rules, asset sources, and missing-data semantics as protected. Open a new blocker instead of silently redefining them during release cleanup.
- Distinguish required cleanup from optional polish, pre-existing failure from introduced failure, and repository evidence from production/deployment evidence.
- Preserve production boundaries: no migration, backfill, RLS, Storage, push, deployment, or data mutation without separate explicit authorization.
- Require reproducible evidence for every deletion, performance claim, accessibility claim, privacy claim, and release-readiness verdict.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Route list
  - [ ] Page/view list
  - [ ] Component list
  - [ ] Reused/retired components
  - [ ] Formulas
  - [ ] Database changes
  - [ ] Data gaps
  - [ ] Redirects
  - [ ] Accessibility
  - [ ] Screenshots
  - [ ] Performance
  - [ ] Tests
  - [ ] Limitations
- Remove or change only behavior proven redundant, unreachable, unsafe, inaccessible, or inconsistent with an accepted contract.
- Preserve canonical routes, compatibility links, stable identifiers, authentication, group scope, public identity, data provenance, and the responsive single-website information architecture.
- Keep cleanup commits focused so regression causes remain attributable and reversible.
- Update final documentation and evidence as part of the same bounded step; do not rely on chat history as release state.

### Stage D — Integration, evidence, and user-interface review

- Verify every affected route in the agreed browser and viewport matrix and inspect the actual rendered result rather than relying only on generated screenshots.
- Compare test, typecheck, lint, build, accessibility, performance, privacy, and route results with the recorded baseline.
- Review bundle/query/render cost, asset caching, server/client boundaries, hydration payloads, logs, telemetry, metadata, and error output.
- Treat this as verification and cleanup: do not reopen accepted analytical definitions or information architecture without a newly recorded blocker and owner decision.
- Treat this as verification and cleanup: do not reopen completed analytical definitions or redesign accepted information architecture without a newly recorded blocker.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.

### Step completion gate

- [ ] Route list
- [ ] Page/view list
- [ ] Component list
- [ ] Reused/retired components
- [ ] Formulas
- [ ] Database changes
- [ ] Data gaps
- [ ] Redirects
- [ ] Accessibility
- [ ] Screenshots
- [ ] Performance
- [ ] Tests
- [ ] Limitations
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 20.7 — Validate production asset integration

### Source-defined scope

- Verify every tag, point-source, and corporation graphic resolves through the shared Supabase layer.
- Check public or signed URL behavior in production-like builds and confirm RLS does not expose protected storage.
- Check image dimensions, cumulative layout shift, lazy loading, caching, dark-theme contrast, fallback rendering, alt text, and keyboard-accessible surrounding controls.
- Remove duplicate URL builders, local placeholder mappings, and page-specific asset fetches.
- Document missing production asset records without replacing them with fabricated graphics.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the accepted implementation, baseline commands, route matrix, asset layer, analytics utilities, privacy boundaries, migration/ledger records, handoffs, known warnings, and release evidence relevant to this verification step.
- Reproduce the current baseline before cleanup so every claimed improvement or regression is measured against a recorded starting point.
- Begin with the phase inspection list, especially:
  - /profile
  - /insights
  - /group
  - /saved-games
  - Navigation and legacy redirects
  - Duplicate utilities and title-string hacks
  - Bundle and query performance
  - Accessibility and responsive test coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the exact verification population, browsers/viewports, routes, datasets, commands, performance thresholds, accessibility checks, privacy scans, and accepted warnings before changing code.
- Treat completed formulas, URL contracts, route ownership, identity rules, asset sources, and missing-data semantics as protected. Open a new blocker instead of silently redefining them during release cleanup.
- Distinguish required cleanup from optional polish, pre-existing failure from introduced failure, and repository evidence from production/deployment evidence.
- Preserve production boundaries: no migration, backfill, RLS, Storage, push, deployment, or data mutation without separate explicit authorization.
- Require reproducible evidence for every deletion, performance claim, accessibility claim, privacy claim, and release-readiness verdict.
- Resolve assets through the audited shared asset layer by stable ID or canonical slug; do not construct storage URLs in presentation code.
- Define informative versus decorative alternative text, fixed sizing or aspect-ratio behavior, and the shared missing-asset fallback.
- Name the states supported, absent, unknown, partial, unavailable, not applicable, explicit zero, and insufficient sample separately.
- Do not use convenience defaults that convert missing evidence into zero, false, or confirmed absence.
- Require canonical map, space, placement, ownership, attribution, provenance, and coverage fields before enabling spatial analysis.
- Do not infer coordinates, ownership, actor, or board completion from final totals or incomplete events.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Verify every tag, point-source, and corporation graphic resolves through the shared Supabase layer.
  - [ ] Check public or signed URL behavior in production-like builds and confirm RLS does not expose protected storage.
  - [ ] Check image dimensions, cumulative layout shift, lazy loading, caching, dark-theme contrast, fallback rendering, alt text, and keyboard-accessible surrounding controls.
  - [ ] Remove duplicate URL builders, local placeholder mappings, and page-specific asset fetches.
  - [ ] Document missing production asset records without replacing them with fabricated graphics.
- Remove or change only behavior proven redundant, unreachable, unsafe, inaccessible, or inconsistent with an accepted contract.
- Preserve canonical routes, compatibility links, stable identifiers, authentication, group scope, public identity, data provenance, and the responsive single-website information architecture.
- Keep cleanup commits focused so regression causes remain attributable and reversible.
- Update final documentation and evidence as part of the same bounded step; do not rely on chat history as release state.

### Stage D — Integration, evidence, and user-interface review

- Verify every affected route in the agreed browser and viewport matrix and inspect the actual rendered result rather than relying only on generated screenshots.
- Compare test, typecheck, lint, build, accessibility, performance, privacy, and route results with the recorded baseline.
- Review bundle/query/render cost, asset caching, server/client boundaries, hydration payloads, logs, telemetry, metadata, and error output.
- Treat this as verification and cleanup: do not reopen accepted analytical definitions or information architecture without a newly recorded blocker and owner decision.
- Check dark-surface legibility, transparent-image handling, compact labels, cache behavior, and prevention of per-row asset requests.
- Treat this as verification and cleanup: do not reopen completed analytical definitions or redesign accepted information architecture without a newly recorded blocker.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test successful lookup, missing record, malformed path, accessible name, responsive sizing, and fallback rendering.
- Test every distinct missing-data state and confirm labels, calculations, tables, and URL filters preserve the distinction.
- Test map variants, unresolved spaces, unattributed placements, replacements/removals, partial coverage, and no-coordinate fallbacks.

### Step completion gate

- [ ] Verify every tag, point-source, and corporation graphic resolves through the shared Supabase layer.
- [ ] Check public or signed URL behavior in production-like builds and confirm RLS does not expose protected storage.
- [ ] Check image dimensions, cumulative layout shift, lazy loading, caching, dark-theme contrast, fallback rendering, alt text, and keyboard-accessible surrounding controls.
- [ ] Remove duplicate URL builders, local placeholder mappings, and page-specific asset fetches.
- [ ] Document missing production asset records without replacing them with fabricated graphics.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step source unnumbered — Validate win point differential analytics

### Source-defined scope

- Confirm one canonical formula is used across Individual, Group, Global, Compare, Leaderboard, Improvement, and Competition.
- Verify multiplayer runner-up selection, tie handling, incomplete games, minimum-wins eligibility, close/decisive thresholds, and group/global aggregation weighting.
- Compare displayed samples and supporting games against repository-level fixtures or known records.
- Verify all win-margin charts and tables remain synchronized under filters and use accessible labels and alternatives.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the accepted implementation, baseline commands, route matrix, asset layer, analytics utilities, privacy boundaries, migration/ledger records, handoffs, known warnings, and release evidence relevant to this verification step.
- Reproduce the current baseline before cleanup so every claimed improvement or regression is measured against a recorded starting point.
- Begin with the phase inspection list, especially:
  - /profile
  - /insights
  - /group
  - /saved-games
  - Navigation and legacy redirects
  - Duplicate utilities and title-string hacks
  - Bundle and query performance
  - Accessibility and responsive test coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the exact verification population, browsers/viewports, routes, datasets, commands, performance thresholds, accessibility checks, privacy scans, and accepted warnings before changing code.
- Treat completed formulas, URL contracts, route ownership, identity rules, asset sources, and missing-data semantics as protected. Open a new blocker instead of silently redefining them during release cleanup.
- Distinguish required cleanup from optional polish, pre-existing failure from introduced failure, and repository evidence from production/deployment evidence.
- Preserve production boundaries: no migration, backfill, RLS, Storage, push, deployment, or data mutation without separate explicit authorization.
- Require reproducible evidence for every deletion, performance claim, accessibility claim, privacy claim, and release-readiness verdict.
- Keep recommendation rules deterministic, thresholded, evidence-backed, and non-causal.
- Require a comparison baseline, eligible-game count, coverage, uncertainty, and supporting games before emitting a recommendation.
- Require canonical map, space, placement, ownership, attribution, provenance, and coverage fields before enabling spatial analysis.
- Do not infer coordinates, ownership, actor, or board completion from final totals or incomplete events.
- Use the canonical winning score minus highest opponent score formula only for qualifying wins and keep tied-first outcomes separate.
- Show qualifying wins and total games, enforce minimum-wins eligibility, and aggregate from qualifying game-level margins.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Confirm one canonical formula is used across Individual, Group, Global, Compare, Leaderboard, Improvement, and Competition.
  - [ ] Verify multiplayer runner-up selection, tie handling, incomplete games, minimum-wins eligibility, close/decisive thresholds, and group/global aggregation weighting.
  - [ ] Compare displayed samples and supporting games against repository-level fixtures or known records.
  - [ ] Verify all win-margin charts and tables remain synchronized under filters and use accessible labels and alternatives.
- Remove or change only behavior proven redundant, unreachable, unsafe, inaccessible, or inconsistent with an accepted contract.
- Preserve canonical routes, compatibility links, stable identifiers, authentication, group scope, public identity, data provenance, and the responsive single-website information architecture.
- Keep cleanup commits focused so regression causes remain attributable and reversible.
- Update final documentation and evidence as part of the same bounded step; do not rely on chat history as release state.
- Link summary values to the supporting games and preserve the active entity, scope, and filters when opening detail evidence.
- Distinguish direct evidence from derived interpretation and show unavailable evidence explicitly.

### Stage D — Integration, evidence, and user-interface review

- Verify every affected route in the agreed browser and viewport matrix and inspect the actual rendered result rather than relying only on generated screenshots.
- Compare test, typecheck, lint, build, accessibility, performance, privacy, and route results with the recorded baseline.
- Review bundle/query/render cost, asset caching, server/client boundaries, hydration payloads, logs, telemetry, metadata, and error output.
- Treat this as verification and cleanup: do not reopen accepted analytical definitions or information architecture without a newly recorded blocker and owner decision.
- Treat this as verification and cleanup: do not reopen completed analytical definitions or redesign accepted information architecture without a newly recorded blocker.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test threshold edges, conflicting signals, merged root causes, insufficient evidence, and stable recommendation ordering.
- Test map variants, unresolved spaces, unattributed placements, replacements/removals, partial coverage, and no-coordinate fallbacks.
- Test multiplayer runner-up selection, two-player games, tied first, missing scores, threshold boundaries, filtered samples, and aggregation weighting.

### Step completion gate

- [ ] Confirm one canonical formula is used across Individual, Group, Global, Compare, Leaderboard, Improvement, and Competition.
- [ ] Verify multiplayer runner-up selection, tie handling, incomplete games, minimum-wins eligibility, close/decisive thresholds, and group/global aggregation weighting.
- [ ] Compare displayed samples and supporting games against repository-level fixtures or known records.
- [ ] Verify all win-margin charts and tables remain synchronized under filters and use accessible labels and alternatives.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 20.9 — Validate per-generation cards bought and TR analytics

### Source-defined scope

- Verify one canonical storage/query contract is used by Log a Game, imports, Game Detail, Replay, Global, Individual, Group, Compare, and Improvement.
- Test explicit zero versus missing, generation ordering, duplicates, partial games, games of different lengths, TR checkpoint labels, legal decreases, corrections, and RLS.
- Verify cards-bought bars, TR stepped lines, selected-generation details, filters, URL state, evidence tables, and accessible summaries remain synchronized.
- Confirm production queries have appropriate indexes and avoid one query per player or generation.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the accepted implementation, baseline commands, route matrix, asset layer, analytics utilities, privacy boundaries, migration/ledger records, handoffs, known warnings, and release evidence relevant to this verification step.
- Reproduce the current baseline before cleanup so every claimed improvement or regression is measured against a recorded starting point.
- Begin with the phase inspection list, especially:
  - /profile
  - /insights
  - /group
  - /saved-games
  - Navigation and legacy redirects
  - Duplicate utilities and title-string hacks
  - Bundle and query performance
  - Accessibility and responsive test coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the exact verification population, browsers/viewports, routes, datasets, commands, performance thresholds, accessibility checks, privacy scans, and accepted warnings before changing code.
- Treat completed formulas, URL contracts, route ownership, identity rules, asset sources, and missing-data semantics as protected. Open a new blocker instead of silently redefining them during release cleanup.
- Distinguish required cleanup from optional polish, pre-existing failure from introduced failure, and repository evidence from production/deployment evidence.
- Preserve production boundaries: no migration, backfill, RLS, Storage, push, deployment, or data mutation without separate explicit authorization.
- Require reproducible evidence for every deletion, performance claim, accessibility claim, privacy claim, and release-readiness verdict.
- Preserve exact generation, normalized phase, checkpoint semantics, and complete-versus-partial coverage as separate concepts.
- Keep explicit zero separate from missing, preserve legal decreases, and never interpolate an unsupported generation value.
- Name the states supported, absent, unknown, partial, unavailable, not applicable, explicit zero, and insufficient sample separately.
- Do not use convenience defaults that convert missing evidence into zero, false, or confirmed absence.
- Keep recommendation rules deterministic, thresholded, evidence-backed, and non-causal.
- Require a comparison baseline, eligible-game count, coverage, uncertainty, and supporting games before emitting a recommendation.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Verify one canonical storage/query contract is used by Log a Game, imports, Game Detail, Replay, Global, Individual, Group, Compare, and Improvement.
  - [ ] Test explicit zero versus missing, generation ordering, duplicates, partial games, games of different lengths, TR checkpoint labels, legal decreases, corrections, and RLS.
  - [ ] Verify cards-bought bars, TR stepped lines, selected-generation details, filters, URL state, evidence tables, and accessible summaries remain synchronized.
  - [ ] Confirm production queries have appropriate indexes and avoid one query per player or generation.
- Remove or change only behavior proven redundant, unreachable, unsafe, inaccessible, or inconsistent with an accepted contract.
- Preserve canonical routes, compatibility links, stable identifiers, authentication, group scope, public identity, data provenance, and the responsive single-website information architecture.
- Keep cleanup commits focused so regression causes remain attributable and reversible.
- Update final documentation and evidence as part of the same bounded step; do not rely on chat history as release state.
- Link summary values to the supporting games and preserve the active entity, scope, and filters when opening detail evidence.
- Distinguish direct evidence from derived interpretation and show unavailable evidence explicitly.
- Keep the selected generation as the single interaction anchor for controls, graphics, player summaries, event annotations, and accessible output.
- Disable unsupported metric modes instead of reconstructing a timeline from final totals.

### Stage D — Integration, evidence, and user-interface review

- Verify every affected route in the agreed browser and viewport matrix and inspect the actual rendered result rather than relying only on generated screenshots.
- Compare test, typecheck, lint, build, accessibility, performance, privacy, and route results with the recorded baseline.
- Review bundle/query/render cost, asset caching, server/client boundaries, hydration payloads, logs, telemetry, metadata, and error output.
- Treat this as verification and cleanup: do not reopen accepted analytical definitions or information architecture without a newly recorded blocker and owner decision.
- Synchronize selected generation across chart, table, summary, evidence, and URL state without combining unlike measures on an ambiguous dual axis.
- Treat this as verification and cleanup: do not reopen completed analytical definitions or redesign accepted information architecture without a newly recorded blocker.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test out-of-order records, duplicate generations, different game lengths, partial timelines, explicit zero, missing values, and filter propagation.
- Test previous/next, play/pause, reset, speed, keyboard control, selected-generation persistence, and partial-data states.
- Test every distinct missing-data state and confirm labels, calculations, tables, and URL filters preserve the distinction.
- Test threshold edges, conflicting signals, merged root causes, insufficient evidence, and stable recommendation ordering.

### Step completion gate

- [ ] Verify one canonical storage/query contract is used by Log a Game, imports, Game Detail, Replay, Global, Individual, Group, Compare, and Improvement.
- [ ] Test explicit zero versus missing, generation ordering, duplicates, partial games, games of different lengths, TR checkpoint labels, legal decreases, corrections, and RLS.
- [ ] Verify cards-bought bars, TR stepped lines, selected-generation details, filters, URL state, evidence tables, and accessible summaries remain synchronized.
- [ ] Confirm production queries have appropriate indexes and avoid one query per player or generation.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 20.10 — Validate identity privacy and public data boundaries

### Source-defined scope

- Search the repository for public use of full_name, first_name, last_name, display_name, normalized personal-name values, private aliases, select(*), complete profile records, and direct player-name fallbacks.
- Use known test personal names to inspect public pages, page source, hydration, APIs, RPCs, views, metadata, titles, URLs, structured data, exports, logs, telemetry, and analytics events.
- Verify every public player label uses the centralized resolver and resolves claimed players to username or a neutral fallback.
- Verify historical games retain the same player ID and no pre-claim private personal name remains public.
- Verify unauthenticated and unrelated users cannot enumerate claim candidates or private evidence.
- Verify migration and backfill packages are separately authorized, dry-run, reversible, and independently reviewed.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the accepted implementation, baseline commands, route matrix, asset layer, analytics utilities, privacy boundaries, migration/ledger records, handoffs, known warnings, and release evidence relevant to this verification step.
- Reproduce the current baseline before cleanup so every claimed improvement or regression is measured against a recorded starting point.
- Begin with the phase inspection list, especially:
  - /profile
  - /insights
  - /group
  - /saved-games
  - Navigation and legacy redirects
  - Duplicate utilities and title-string hacks
  - Bundle and query performance
  - Accessibility and responsive test coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the exact verification population, browsers/viewports, routes, datasets, commands, performance thresholds, accessibility checks, privacy scans, and accepted warnings before changing code.
- Treat completed formulas, URL contracts, route ownership, identity rules, asset sources, and missing-data semantics as protected. Open a new blocker instead of silently redefining them during release cleanup.
- Distinguish required cleanup from optional polish, pre-existing failure from introduced failure, and repository evidence from production/deployment evidence.
- Preserve production boundaries: no migration, backfill, RLS, Storage, push, deployment, or data mutation without separate explicit authorization.
- Require reproducible evidence for every deletion, performance claim, accessibility claim, privacy claim, and release-readiness verdict.
- Use stable player IDs for relationships and the centralized public-name resolver for presentation.
- Exclude private names, aliases, normalized matching values, email, and authentication identifiers from public/client payloads rather than hiding them after serialization.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Search the repository for public use of full_name, first_name, last_name, display_name, normalized personal-name values, private aliases, select(*), complete profile records, and direct player-name fallbacks.
  - [ ] Use known test personal names to inspect public pages, page source, hydration, APIs, RPCs, views, metadata, titles, URLs, structured data, exports, logs, telemetry, and analytics events.
  - [ ] Verify every public player label uses the centralized resolver and resolves claimed players to username or a neutral fallback.
  - [ ] Verify historical games retain the same player ID and no pre-claim private personal name remains public.
  - [ ] Verify unauthenticated and unrelated users cannot enumerate claim candidates or private evidence.
  - [ ] Verify migration and backfill packages are separately authorized, dry-run, reversible, and independently reviewed.
- Remove or change only behavior proven redundant, unreachable, unsafe, inaccessible, or inconsistent with an accepted contract.
- Preserve canonical routes, compatibility links, stable identifiers, authentication, group scope, public identity, data provenance, and the responsive single-website information architecture.
- Keep cleanup commits focused so regression causes remain attributable and reversible.
- Update final documentation and evidence as part of the same bounded step; do not rely on chat history as release state.
- Link summary values to the supporting games and preserve the active entity, scope, and filters when opening detail evidence.
- Distinguish direct evidence from derived interpretation and show unavailable evidence explicitly.

### Stage D — Integration, evidence, and user-interface review

- Verify every affected route in the agreed browser and viewport matrix and inspect the actual rendered result rather than relying only on generated screenshots.
- Compare test, typecheck, lint, build, accessibility, performance, privacy, and route results with the recorded baseline.
- Review bundle/query/render cost, asset caching, server/client boundaries, hydration payloads, logs, telemetry, metadata, and error output.
- Treat this as verification and cleanup: do not reopen accepted analytical definitions or information architecture without a newly recorded blocker and owner decision.
- Inspect route payloads, DTOs, RPCs, views, metadata, exports, hydration, logs, telemetry, analytics events, and user-visible errors for leakage.
- Treat this as verification and cleanup: do not reopen completed analytical definitions or redesign accepted information architecture without a newly recorded blocker.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Run known-test-name payload scans and verify neutral fallback behavior when username is unavailable.

### Step completion gate

- [ ] Search the repository for public use of full_name, first_name, last_name, display_name, normalized personal-name values, private aliases, select(*), complete profile records, and direct player-name fallbacks.
- [ ] Use known test personal names to inspect public pages, page source, hydration, APIs, RPCs, views, metadata, titles, URLs, structured data, exports, logs, telemetry, and analytics events.
- [ ] Verify every public player label uses the centralized resolver and resolves claimed players to username or a neutral fallback.
- [ ] Verify historical games retain the same player ID and no pre-claim private personal name remains public.
- [ ] Verify unauthenticated and unrelated users cannot enumerate claim candidates or private evidence.
- [ ] Verify migration and backfill packages are separately authorized, dry-run, reversible, and independently reviewed.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Copy-ready agent execution prompt

> Perform Phase 20 only: final legacy cleanup and production hardening after every replacement destination is working.
>
> Remove duplicate legacy rendering, dead aliases, unused imports, hidden alternate layouts, duplicate calculations, title-string hacks, stale links, and obsolete CSS. Preserve redirects for bookmarked URLs and do not delete code still used by target routes.
>
> Complete an accessibility audit covering semantic headings, labels, visible focus, keyboard tabs/tables/charts, screen-reader summaries, aria-sort, aria-live, drawer focus, non-color meaning, reduced motion, and WCAG AA contrast. Test 1440px, 1024px, 768px, and 390px with no page-level overflow.
>
> Profile expensive transformations, chart rendering, hidden duplicate trees, query fan-out, stale requests, and bundle size. Run the complete test, type-check, lint, build, and end-to-end suites. Resolve every redesign-introduced failure and warning.
>
> Return final route, page, view, component, formula, database, data-gap, redirect, accessibility, responsive, performance, test, and limitation documentation.
> PRODUCTION GRAPHICS
> Audit and harden all Supabase production graphics. Verify URL access, RLS, caching, layout stability, responsive sizing, alt behavior, fallbacks, dark-theme rendering, and removal of duplicated asset lookup logic.
> FINAL VISUAL QUALITY GATE
> Review every completed dashboard for hierarchy, coordinated interactions, asset consistency, chart appropriateness, readable labels, accessibility, responsive composition, and performance.
> Remove redundant charts, decorative graphics, duplicate legends, N+1 asset requests, and hidden duplicate mobile/desktop render trees.
> Capture final screenshots for every primary page and major dashboard view at desktop, tablet, and mobile widths.
> FINAL WIN DIFFERENTIAL VALIDATION
> - Validate one canonical win point differential formula across all destinations. Regression-test multiplayer runner-up selection, ties, incomplete scores, minimum wins, close/decisive thresholds, aggregate weighting, synchronized filters, accessible summaries, and supporting-game traceability.
> Per-generation tracking hardening
> Validate the complete card-purchase and TR timeline pipeline from manual entry and imports through repositories, queries, dashboards, Compare, Improvement, and accessibility output.
> Check null-versus-zero, ordering, duplicates, partial timelines, game-length normalization, TR decreases, RLS, query performance, responsive graphics, and source-game traceability.
> Remove duplicate timeline calculations or page-specific adapters and document the final data contract.

## Acceptance checklist

- [ ] Historical absence facts, null final Venus values, and immutable reports remain intact.

- [ ] Release validation covers production before and after live-site v2 deployment, including missing-run and unsupported states.

- [ ] All eight primary pages are functional.

- [ ] Legacy routes redirect safely.

- [ ] No hidden duplicate analytics remain.

- [ ] Global, group, player, compare, improvement, leaderboard, and game scopes are separated.

- [ ] Accessibility and responsive reviews pass.

- [ ] Full tests and production build pass.

- [ ] Production asset loading, RLS, caching, fallbacks, accessibility, and layout stability pass final QA.

- [ ] Every primary dashboard passes the combined-dashboard visual quality review at desktop, tablet, and mobile sizes.

- [ ] No redundant, decorative, inaccessible, or unsynchronized graphics remain.

- [ ] Win point differential definitions, samples, thresholds, weighting, and tie handling are consistent and tested across every destination.

- [ ] Per-generation cards bought and TR semantics, coverage, calculations, graphics, imports, and tests are consistent across every destination.

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

- Phase 20 may be marked complete only after every source step above has its own accepted handoff and the phase acceptance checklist passes as one integrated system.
- A later phase must not begin automatically. The final handoff identifies only the next possible separately authorized phase or remediation task.
- Any formula, migration, authorization rule, public-data contract, or URL-state change requires the independent review specified by the Word guide.
- Production migration, backfill, RLS mutation, Storage change, push, or deployment remains prohibited unless a separate explicit authorization and evidence record exists.
