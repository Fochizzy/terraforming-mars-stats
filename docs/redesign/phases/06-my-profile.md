# Phase 6 — Registration Claim and My Profile

> **Source authority:** `TM_Stats_Redesign_Integrated_Full_Implementation_Guide_2026-07-19_Expanded_Step_4_3(5).docx`, Phase 6.
>
> **Preservation rule:** The source steps, their order, their dependencies, and their stop conditions are unchanged. The stage headings in this Markdown file only divide each source step into smaller reviewable checkpoints using the guide’s existing `Read → Inspect → Plan → Implement → Test → Render/Review → Document → Commit → Handoff` process.

## Status

Phase 6 is **planned and not started** unless `docs/REDESIGN_STATE.md` and a later explicit owner assignment say otherwise. This file does not authorize implementation, migration, production mutation, push, deployment, or work on a later phase.

## Recommended agent and effort

| Field | Recommendation |
| --- | --- |
| Preferred execution | Split critical phase |
| Architecture and privacy plan | Claude Opus 4.8 - xhigh effort |
| Typed implementation | Codex GPT-5.6 Sol - Extra High - Standard |
| Independent review | Claude Opus 4.8 - max effort - fresh session |
| Handoff sensitivity | Critical |
| Pattern | Claude specifies candidate, privacy, and transaction contracts; Codex implements and tests; Claude independently audits claim safety and public-name leakage. |

## Outcome of this phase

A registration-time guest identity claim flow, centralized public player-name resolver, privacy-safe historical identity presentation, and a focused My Profile workspace for account identity, activity, groups, drafts, recent games, and shortcuts.

## Why this phase comes here

Phase 4 creates or reuses claimable unlinked guests but deliberately does not claim accounts. Registration and onboarding must complete the claim lifecycle before public profile, leaderboard, search, comparison, and analytics surfaces expand further.

## Prerequisites

- Phase 4 is complete and the claimable guest contract is validated.

- Any required identity schema, alias, normalization, RLS, or claim-function migration has separate explicit authorization and independent review.

- Current authentication, registration, username, full-name, group-membership, player-link, and active-group behavior is audited.

- Public player serializers and display-name resolution paths are inventoried.

## Required claim lifecycle

1.  The registrant supplies the approved username and personal-name registration data.

2.  The server searches eligible unlinked guest identities by normalized username and by normalized first name plus last name using separate matching rules.

3.  The protected registration flow shows only the minimum candidate information needed for the authenticated registrant to distinguish legitimate candidates.

4.  A textual match is only a candidate. The registrant explicitly confirms one candidate or declines all candidates.

5.  The server revalidates authentication, candidate identity, match rules, group requirements, and unlinked status at submission time.

6.  The claim transaction links the existing player ID to the authenticated account, preserves all historical game references and statistics, and adds or preserves group membership.

7.  The flow handles duplicate submission, concurrent claims, deleted candidates, already-claimed candidates, authorization failures, and post-registration continuation.

8.  Public presentation switches to the registered username through the centralized resolver without rewriting historical game relationships.

## Public-name privacy standard

| Non-negotiable | A claimed player's full name must not appear publicly anywhere. Public pages and payloads use the registered username or an approved public handle. Private names are used only inside authorized registration, matching, correction, and audit boundaries. |
| --- | --- |

- Private fields include first name, last name, full name, normalized personal-name values, private aliases, registration name, and imported private personal-name evidence.

- Public surfaces include profiles, leaderboards, game history, game detail, insights, comparisons, search, activity, APIs, RPCs, public views, metadata, titles, URLs, structured data, image alt text, exports, hydration, browser source, logs, telemetry, analytics events, and user-visible errors.

- Do not return full profile records when only username is needed. Use explicit column selection and public DTOs.

- Do not hide a private name with CSS or remove it after hydration; exclude it from the payload entirely.

- When username is unavailable, use a neutral privacy-safe fallback. Never fall back to a personal name, email, or authentication identifier.

## My Profile scope

- Show registered username as the public identity and private personal-name fields only in clearly private account-edit contexts when product requirements permit.

- Show linked player, current group, role, group switcher, account actions, games, finalized games, drafts, recent activity, leaderboard position when available, compact data status, and links to Individual Insights, Compare, Improvement, Leaderboard, and Games.

- Move deep style, head-to-head, map, score-source, and efficiency analytics to Individual Insights rather than duplicating them on Profile.

- Preserve authorization, account recovery, confirmation return paths, group membership, and recent-game links.

## Required tests

- Exact username candidate, exact private-name candidate, multiple candidates, partial suggestion, no candidate, decline all, and continue without claim.

- Successful claim preserves the original player ID, historical games, statistics, evidence, corporations, Preludes, scores, styles, and card records.

- Duplicate and concurrent claim submissions are safe; already-linked, deleted, inaccessible, and changed candidates are handled.

- Claim candidate enumeration is unavailable to unauthenticated or unrelated users.

- Known test full names are absent from all public pages and payloads, including historical games and metadata.

- Missing username uses a neutral fallback and never exposes private name.

- Profile authorization, group switching, recent games, drafts, direct links, mobile-width responsive behavior, and keyboard navigation work.

## Expanded working sequence

The source step order is preserved. Each row is a bounded implementation assignment and must end with its own validation, documentation, clean commit, and handoff.

| Source step | Bounded execution result | Stop condition |
| --- | --- | --- |
| 6.1 - Identity and public-data-boundary audit | Audit schema, registration inputs, claim functions, normalization, RLS, public serializers, metadata, exports, hydration, logs, and historical display-name usage. | Commit and hand off this substep; do not begin the next row. |
| 6.2 - Registration candidate lookup and confirmation | Protected candidate search by username and private personal name; explicit confirmation, decline, no-candidate, and multiple-candidate states. | Commit and hand off this substep; do not begin the next row. |
| 6.3 - Claim transaction and group effects | Concurrency-safe linking of the existing player ID, group membership, active-group behavior, and post-registration continuation. | Commit and hand off this substep; do not begin the next row. |
| 6.4 - Public player-name resolver and historical identity switch | One typed resolver used by profiles, games, leaderboards, insights, comparison, search, exports, and metadata. | Commit and hand off this substep; do not begin the next row. |
| 6.5 - My Profile redesign | Identity and account actions, linked player status, groups, activity, recent games, drafts, data status, and shortcuts without duplicating deep analytics. | Commit and hand off this substep; do not begin the next row. |
| 6.6 - Integration validation and closure | End-to-end claim, privacy, authorization, historical data, public payload, profile, and regression validation. | Commit and hand off this substep; do not begin the next row. |

## Phase 6 working sequence

| Step | Scope |
| --- | --- |
| 6.1 - Identity and public-data-boundary audit | Audit schema, registration inputs, claim functions, normalization, RLS, public serializers, metadata, exports, hydration, logs, and historical display-name usage. |
| 6.2 - Registration candidate lookup and confirmation | Protected candidate search by username and private personal name; explicit confirmation, decline, no-candidate, and multiple-candidate states. |
| 6.3 - Claim transaction and group effects | Concurrency-safe linking of the existing player ID, group membership, active-group behavior, and post-registration continuation. |
| 6.4 - Public player-name resolver and historical identity switch | One typed resolver used by profiles, games, leaderboards, insights, comparison, search, exports, and metadata. |
| 6.5 - My Profile redesign | Identity and account actions, linked player status, groups, activity, recent games, drafts, data status, and shortcuts without duplicating deep analytics. |
| 6.6 - Integration validation and closure | End-to-end claim, privacy, authorization, historical data, public payload, profile, and regression validation. |

## Step 6.1 — Identity and public-data-boundary audit

### Source-defined scope

- Audit schema, registration inputs, claim functions, normalization, RLS, public serializers, metadata, exports, hydration, logs, and historical display-name usage.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing authentication, registration, onboarding, player-link, group-membership, public-name, profile, serializer, RPC, RLS, migration, metadata, export, logging, and test paths that already serve any part of this substep.
- Identify the precise public/server/private boundary and every actor allowed to read, match, confirm, or mutate identity data.
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the authenticated actor, candidate eligibility, normalized matching rule, minimum candidate disclosure, confirmation state, server revalidation, transaction boundary, concurrency behavior, and failure behavior before editing.
- Define explicit public and private DTOs with explicit column selection. Private first name, last name, full name, aliases, normalized matching values, email, and authentication identifiers must never be included in public/client contracts.
- Preserve the existing player ID, historical games, statistics, evidence, group membership, active-group behavior, account recovery, and post-registration continuation.
- Use the centralized public player-name resolver. A missing username must resolve to the neutral privacy-safe fallback, never to a personal name or identifier.
- Treat schema, function, RLS, migration, and production actions as separately authorized work. Stop rather than improvising an unauthorized data-boundary change.
- Use stable player IDs for relationships and the centralized public-name resolver for presentation.
- Exclude private names, aliases, normalized matching values, email, and authentication identifiers from public/client payloads rather than hiding them after serialization.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Audit schema, registration inputs, claim functions, normalization, RLS, public serializers, metadata, exports, hydration, logs, and historical display-name usage.
- Reuse the existing authentication, registration, player, group, public-name, and profile repositories and server boundaries before creating replacements.
- Keep private candidate matching and claim validation on the server. Do not expose a general candidate-enumeration endpoint or trust client-supplied eligibility.
- Preserve route compatibility, recovery/confirmation return paths, group switching, direct links, and the responsive single-website information architecture.
- Keep candidate lookup, explicit confirmation, claim mutation, public-name resolution, and profile presentation as separate typed responsibilities.

### Stage D — Integration, evidence, and user-interface review

- Verify unauthenticated, unrelated-user, stale-candidate, already-claimed, deleted-candidate, duplicate-submit, and concurrent-submit behavior.
- Inspect public pages and serialized payloads rather than relying on CSS or rendered labels to prove privacy.
- For profile or confirmation UI, inspect desktop and narrow layouts, keyboard order, visible focus, error recovery, live-region feedback, and safe back/continue behavior.
- Review query and RPC grants, security-definer search paths, RLS, explicit selects, metadata, exports, logs, telemetry, analytics events, and user-visible errors.
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

- [ ] Audit schema, registration inputs, claim functions, normalization, RLS, public serializers, metadata, exports, hydration, logs, and historical display-name usage.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 6.2 — Registration candidate lookup and confirmation

### Source-defined scope

- Protected candidate search by username and private personal name; explicit confirmation, decline, no-candidate, and multiple-candidate states.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing authentication, registration, onboarding, player-link, group-membership, public-name, profile, serializer, RPC, RLS, migration, metadata, export, logging, and test paths that already serve any part of this substep.
- Identify the precise public/server/private boundary and every actor allowed to read, match, confirm, or mutate identity data.
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the authenticated actor, candidate eligibility, normalized matching rule, minimum candidate disclosure, confirmation state, server revalidation, transaction boundary, concurrency behavior, and failure behavior before editing.
- Define explicit public and private DTOs with explicit column selection. Private first name, last name, full name, aliases, normalized matching values, email, and authentication identifiers must never be included in public/client contracts.
- Preserve the existing player ID, historical games, statistics, evidence, group membership, active-group behavior, account recovery, and post-registration continuation.
- Use the centralized public player-name resolver. A missing username must resolve to the neutral privacy-safe fallback, never to a personal name or identifier.
- Treat schema, function, RLS, migration, and production actions as separately authorized work. Stop rather than improvising an unauthorized data-boundary change.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Protected candidate search by username and private personal name; explicit confirmation, decline, no-candidate, and multiple-candidate states.
- Reuse the existing authentication, registration, player, group, public-name, and profile repositories and server boundaries before creating replacements.
- Keep private candidate matching and claim validation on the server. Do not expose a general candidate-enumeration endpoint or trust client-supplied eligibility.
- Preserve route compatibility, recovery/confirmation return paths, group switching, direct links, and the responsive single-website information architecture.
- Keep candidate lookup, explicit confirmation, claim mutation, public-name resolution, and profile presentation as separate typed responsibilities.

### Stage D — Integration, evidence, and user-interface review

- Verify unauthenticated, unrelated-user, stale-candidate, already-claimed, deleted-candidate, duplicate-submit, and concurrent-submit behavior.
- Inspect public pages and serialized payloads rather than relying on CSS or rendered labels to prove privacy.
- For profile or confirmation UI, inspect desktop and narrow layouts, keyboard order, visible focus, error recovery, live-region feedback, and safe back/continue behavior.
- Review query and RPC grants, security-definer search paths, RLS, explicit selects, metadata, exports, logs, telemetry, analytics events, and user-visible errors.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.

### Step completion gate

- [ ] Protected candidate search by username and private personal name; explicit confirmation, decline, no-candidate, and multiple-candidate states.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 6.3 — Claim transaction and group effects

### Source-defined scope

- Concurrency-safe linking of the existing player ID, group membership, active-group behavior, and post-registration continuation.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing authentication, registration, onboarding, player-link, group-membership, public-name, profile, serializer, RPC, RLS, migration, metadata, export, logging, and test paths that already serve any part of this substep.
- Identify the precise public/server/private boundary and every actor allowed to read, match, confirm, or mutate identity data.
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the authenticated actor, candidate eligibility, normalized matching rule, minimum candidate disclosure, confirmation state, server revalidation, transaction boundary, concurrency behavior, and failure behavior before editing.
- Define explicit public and private DTOs with explicit column selection. Private first name, last name, full name, aliases, normalized matching values, email, and authentication identifiers must never be included in public/client contracts.
- Preserve the existing player ID, historical games, statistics, evidence, group membership, active-group behavior, account recovery, and post-registration continuation.
- Use the centralized public player-name resolver. A missing username must resolve to the neutral privacy-safe fallback, never to a personal name or identifier.
- Treat schema, function, RLS, migration, and production actions as separately authorized work. Stop rather than improvising an unauthorized data-boundary change.
- Use stable player IDs for relationships and the centralized public-name resolver for presentation.
- Exclude private names, aliases, normalized matching values, email, and authentication identifiers from public/client payloads rather than hiding them after serialization.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Concurrency-safe linking of the existing player ID, group membership, active-group behavior, and post-registration continuation.
- Reuse the existing authentication, registration, player, group, public-name, and profile repositories and server boundaries before creating replacements.
- Keep private candidate matching and claim validation on the server. Do not expose a general candidate-enumeration endpoint or trust client-supplied eligibility.
- Preserve route compatibility, recovery/confirmation return paths, group switching, direct links, and the responsive single-website information architecture.
- Keep candidate lookup, explicit confirmation, claim mutation, public-name resolution, and profile presentation as separate typed responsibilities.

### Stage D — Integration, evidence, and user-interface review

- Verify unauthenticated, unrelated-user, stale-candidate, already-claimed, deleted-candidate, duplicate-submit, and concurrent-submit behavior.
- Inspect public pages and serialized payloads rather than relying on CSS or rendered labels to prove privacy.
- For profile or confirmation UI, inspect desktop and narrow layouts, keyboard order, visible focus, error recovery, live-region feedback, and safe back/continue behavior.
- Review query and RPC grants, security-definer search paths, RLS, explicit selects, metadata, exports, logs, telemetry, analytics events, and user-visible errors.
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

- [ ] Concurrency-safe linking of the existing player ID, group membership, active-group behavior, and post-registration continuation.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 6.4 — Public player-name resolver and historical identity switch

### Source-defined scope

- One typed resolver used by profiles, games, leaderboards, insights, comparison, search, exports, and metadata.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing authentication, registration, onboarding, player-link, group-membership, public-name, profile, serializer, RPC, RLS, migration, metadata, export, logging, and test paths that already serve any part of this substep.
- Identify the precise public/server/private boundary and every actor allowed to read, match, confirm, or mutate identity data.
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the authenticated actor, candidate eligibility, normalized matching rule, minimum candidate disclosure, confirmation state, server revalidation, transaction boundary, concurrency behavior, and failure behavior before editing.
- Define explicit public and private DTOs with explicit column selection. Private first name, last name, full name, aliases, normalized matching values, email, and authentication identifiers must never be included in public/client contracts.
- Preserve the existing player ID, historical games, statistics, evidence, group membership, active-group behavior, account recovery, and post-registration continuation.
- Use the centralized public player-name resolver. A missing username must resolve to the neutral privacy-safe fallback, never to a personal name or identifier.
- Treat schema, function, RLS, migration, and production actions as separately authorized work. Stop rather than improvising an unauthorized data-boundary change.
- Use stable player IDs for relationships and the centralized public-name resolver for presentation.
- Exclude private names, aliases, normalized matching values, email, and authentication identifiers from public/client payloads rather than hiding them after serialization.
- Require canonical map, space, placement, ownership, attribution, provenance, and coverage fields before enabling spatial analysis.
- Do not infer coordinates, ownership, actor, or board completion from final totals or incomplete events.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] One typed resolver used by profiles, games, leaderboards, insights, comparison, search, exports, and metadata.
- Reuse the existing authentication, registration, player, group, public-name, and profile repositories and server boundaries before creating replacements.
- Keep private candidate matching and claim validation on the server. Do not expose a general candidate-enumeration endpoint or trust client-supplied eligibility.
- Preserve route compatibility, recovery/confirmation return paths, group switching, direct links, and the responsive single-website information architecture.
- Keep candidate lookup, explicit confirmation, claim mutation, public-name resolution, and profile presentation as separate typed responsibilities.

### Stage D — Integration, evidence, and user-interface review

- Verify unauthenticated, unrelated-user, stale-candidate, already-claimed, deleted-candidate, duplicate-submit, and concurrent-submit behavior.
- Inspect public pages and serialized payloads rather than relying on CSS or rendered labels to prove privacy.
- For profile or confirmation UI, inspect desktop and narrow layouts, keyboard order, visible focus, error recovery, live-region feedback, and safe back/continue behavior.
- Review query and RPC grants, security-definer search paths, RLS, explicit selects, metadata, exports, logs, telemetry, analytics events, and user-visible errors.
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

- [ ] One typed resolver used by profiles, games, leaderboards, insights, comparison, search, exports, and metadata.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 6.5 — My Profile redesign

### Source-defined scope

- Identity and account actions, linked player status, groups, activity, recent games, drafts, data status, and shortcuts without duplicating deep analytics.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing authentication, registration, onboarding, player-link, group-membership, public-name, profile, serializer, RPC, RLS, migration, metadata, export, logging, and test paths that already serve any part of this substep.
- Identify the precise public/server/private boundary and every actor allowed to read, match, confirm, or mutate identity data.
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the authenticated actor, candidate eligibility, normalized matching rule, minimum candidate disclosure, confirmation state, server revalidation, transaction boundary, concurrency behavior, and failure behavior before editing.
- Define explicit public and private DTOs with explicit column selection. Private first name, last name, full name, aliases, normalized matching values, email, and authentication identifiers must never be included in public/client contracts.
- Preserve the existing player ID, historical games, statistics, evidence, group membership, active-group behavior, account recovery, and post-registration continuation.
- Use the centralized public player-name resolver. A missing username must resolve to the neutral privacy-safe fallback, never to a personal name or identifier.
- Treat schema, function, RLS, migration, and production actions as separately authorized work. Stop rather than improvising an unauthorized data-boundary change.
- Use stable player IDs for relationships and the centralized public-name resolver for presentation.
- Exclude private names, aliases, normalized matching values, email, and authentication identifiers from public/client payloads rather than hiding them after serialization.
- Preserve the existing persistence meaning, authorization boundary, stable identifiers, and explicit save/finalize lifecycle.
- Define repeated submission, stale draft, partial failure, retry, and unsaved-navigation behavior before changing controls.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Identity and account actions, linked player status, groups, activity, recent games, drafts, data status, and shortcuts without duplicating deep analytics.
- Reuse the existing authentication, registration, player, group, public-name, and profile repositories and server boundaries before creating replacements.
- Keep private candidate matching and claim validation on the server. Do not expose a general candidate-enumeration endpoint or trust client-supplied eligibility.
- Preserve route compatibility, recovery/confirmation return paths, group switching, direct links, and the responsive single-website information architecture.
- Keep candidate lookup, explicit confirmation, claim mutation, public-name resolution, and profile presentation as separate typed responsibilities.
- Link summary values to the supporting games and preserve the active entity, scope, and filters when opening detail evidence.
- Distinguish direct evidence from derived interpretation and show unavailable evidence explicitly.

### Stage D — Integration, evidence, and user-interface review

- Verify unauthenticated, unrelated-user, stale-candidate, already-claimed, deleted-candidate, duplicate-submit, and concurrent-submit behavior.
- Inspect public pages and serialized payloads rather than relying on CSS or rendered labels to prove privacy.
- For profile or confirmation UI, inspect desktop and narrow layouts, keyboard order, visible focus, error recovery, live-region feedback, and safe back/continue behavior.
- Review query and RPC grants, security-definer search paths, RLS, explicit selects, metadata, exports, logs, telemetry, analytics events, and user-visible errors.
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

- [ ] Identity and account actions, linked player status, groups, activity, recent games, drafts, data status, and shortcuts without duplicating deep analytics.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 6.6 — Integration validation and closure

### Source-defined scope

- End-to-end claim, privacy, authorization, historical data, public payload, profile, and regression validation.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing authentication, registration, onboarding, player-link, group-membership, public-name, profile, serializer, RPC, RLS, migration, metadata, export, logging, and test paths that already serve any part of this substep.
- Identify the precise public/server/private boundary and every actor allowed to read, match, confirm, or mutate identity data.
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the authenticated actor, candidate eligibility, normalized matching rule, minimum candidate disclosure, confirmation state, server revalidation, transaction boundary, concurrency behavior, and failure behavior before editing.
- Define explicit public and private DTOs with explicit column selection. Private first name, last name, full name, aliases, normalized matching values, email, and authentication identifiers must never be included in public/client contracts.
- Preserve the existing player ID, historical games, statistics, evidence, group membership, active-group behavior, account recovery, and post-registration continuation.
- Use the centralized public player-name resolver. A missing username must resolve to the neutral privacy-safe fallback, never to a personal name or identifier.
- Treat schema, function, RLS, migration, and production actions as separately authorized work. Stop rather than improvising an unauthorized data-boundary change.
- Use stable player IDs for relationships and the centralized public-name resolver for presentation.
- Exclude private names, aliases, normalized matching values, email, and authentication identifiers from public/client payloads rather than hiding them after serialization.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] End-to-end claim, privacy, authorization, historical data, public payload, profile, and regression validation.
- Reuse the existing authentication, registration, player, group, public-name, and profile repositories and server boundaries before creating replacements.
- Keep private candidate matching and claim validation on the server. Do not expose a general candidate-enumeration endpoint or trust client-supplied eligibility.
- Preserve route compatibility, recovery/confirmation return paths, group switching, direct links, and the responsive single-website information architecture.
- Keep candidate lookup, explicit confirmation, claim mutation, public-name resolution, and profile presentation as separate typed responsibilities.

### Stage D — Integration, evidence, and user-interface review

- Verify unauthenticated, unrelated-user, stale-candidate, already-claimed, deleted-candidate, duplicate-submit, and concurrent-submit behavior.
- Inspect public pages and serialized payloads rather than relying on CSS or rendered labels to prove privacy.
- For profile or confirmation UI, inspect desktop and narrow layouts, keyboard order, visible focus, error recovery, live-region feedback, and safe back/continue behavior.
- Review query and RPC grants, security-definer search paths, RLS, explicit selects, metadata, exports, logs, telemetry, analytics events, and user-visible errors.
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

- [ ] End-to-end claim, privacy, authorization, historical data, public payload, profile, and regression validation.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Copy-ready phase prompt

> Complete only the explicitly assigned Phase 6 substep. Treat registration claim, public-name privacy, and stable player identity as authorization-sensitive work.
>
> Read the current state, Phase 6 specification, decisions, privacy guide, Phase 4 closure handoff, authentication and profile repositories, migrations, claim functions, RLS, and public serializers. Return a preflight report before editing.
>
> Search candidates by registered username and private first-plus-last name using separate normalized rules. Never auto-claim a textual match. Require explicit confirmation and server-side revalidation. Link the existing player ID; do not copy history to a replacement player. Preserve group membership, active-group behavior, and continuation.
>
> Implement one centralized public player-name resolver. After claim, public presentation uses username or a neutral fallback. Private names and aliases must be absent from public/client payloads, metadata, exports, hydration, logs, telemetry, and analytics events.
>
> Do not create or apply migrations, RLS changes, or production actions without separate authorization. Add transaction, authorization, concurrency, privacy, payload, historical identity, profile, and regression tests. Commit one bounded substep, update documentation and handoff, leave the worktree clean, and stop.

## Acceptance checklist

- Registration presents candidates but never auto-claims.

- The server revalidates eligibility and prevents duplicate or concurrent ownership.

- Successful claim preserves the original player ID and all historical relationships.

- Public presentation switches to username without rewriting games.

- Private names are absent from public and client contracts.

- Missing username never falls back to private personal name.

- My Profile is identity and activity focused and does not duplicate deep analytics.

- Authorization, group membership, active group, recovery, and continuation remain correct.

- Any migration or production action is separately authorized, reversible, and independently reviewed.

## Required agent handoff

- Record branch, base commit, final commit, schema and migration state, candidate rules, normalization, RLS, claim transaction, concurrency behavior, public resolver, public/private DTOs, historical identity behavior, tests, payload scans, screenshots, limitations, and exact next action.

- Explicitly state whether any known private test name appeared in public rendered output or serialized payloads.

## Phase-level closure rule

- Phase 6 may be marked complete only after every source step above has its own accepted handoff and the phase acceptance checklist passes as one integrated system.
- A later phase must not begin automatically. The final handoff identifies only the next possible separately authorized phase or remediation task.
- Any formula, migration, authorization rule, public-data contract, or URL-state change requires the independent review specified by the Word guide.
- Production migration, backfill, RLS mutation, Storage change, push, or deployment remains prohibited unless a separate explicit authorization and evidence record exists.
