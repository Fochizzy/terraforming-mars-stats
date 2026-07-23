# Phase 5 — Games Library, Game Detail, and Replay

Create a coherent Games area and move single-game replay out of aggregate Insights.

> **Source authority:** `TM_Stats_Redesign_Integrated_Full_Implementation_Guide_2026-07-19_Expanded_Step_4_3(5).docx`, Phase 5.
>
> **Preservation rule:** The source steps, their order, their dependencies, and their stop conditions are unchanged. The stage headings in this Markdown file only divide each source step into smaller reviewable checkpoints using the guide’s existing `Read → Inspect → Plan → Implement → Test → Render/Review → Document → Commit → Handoff` process.

## Status

Phase 5 is **planned and not started** unless `docs/REDESIGN_STATE.md` and a later explicit owner assignment say otherwise. This file does not authorize implementation, migration, production mutation, push, deployment, or work on a later phase.

## Recommended agent and effort

| Field | Recommendation |
| --- | --- |
| Preferred execution | Split phase |
| Recommended configuration | Codex GPT-5.6 Sol - Extra High for data/routes; Claude Sonnet 5 - High for replay UI |
| Acceptable alternate | Either agent may lead after the data contract is committed |
| Independent reviewer | Claude Opus 4.8 - xhigh for final replay-state review |
| Handoff sensitivity | High |
| Recommended handoff pattern | Codex first commits game library, detail queries, and capability states. Claude then builds the replay experience against those contracts. Codex closes with regression tests. |

| Stop rule | Complete only this phase or its explicitly assigned substep. Commit, write the handoff file, and stop before beginning the next phase. |
| --- | --- |

## Outcome of this phase

Canonical /games, game detail, and game replay routes with honest partial-data behavior.

## Why this phase comes now

Replay analyzes one game, while Global, Group, and Individual Insights analyze many games.

## Prerequisites

- Log a Game workflow is stable.

- Games and replay data capabilities are documented.

- The expanded Step 4.3 has passed independent closure audit and its canonical repository contract is committed.

- The pre-v2/post-v2 compatibility adapter or views and parser-version selection rules are documented.

## Inspect before editing

- Current Saved Games page

- Game draft and finalized game repositories

- Import evidence components

- GamePaceReplay

- Generation snapshot and event models

- Existing game detail drawers or links

- Versioned live-site capture sources, parser runs, canonical events, placements, map detections, unsupported evidence, and expansion facts

- Historical confirmation provenance and parser coverage

## Do not do in this phase

- Do not treat a missing v2 parser run as parser failure, confirmed absence, or zero activity.

- Do not reparse raw logs when trustworthy canonical parser output for the selected parser version already exists.

- Do not invent generation snapshots.

- Do not enable replay metrics without data.

- Do not expose unsupported delete or edit actions.

## Expanded working sequence

The source step order is preserved. Each row is a bounded implementation assignment and must end with its own validation, documentation, clean commit, and handoff.

| Source step | Bounded execution result | Stop condition |
| --- | --- | --- |
| 5.1 — Create the Games library | Canonical /games route; Drafts, finalized, and imported games; Search and filters; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 5.2 — Create game detail | Metadata; Players; Corporations; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 5.3 — Create single-game replay | Previous/next generation; Play/pause; Scrubber; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 5.4 — Add supported metric modes | Score; Cards Played; Terraform Rating; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| 5.5 — Handle missing replay data | Keep final summary visible.; Explain which event data is unavailable.; Do not reconstruct a curve from final totals. | Commit and hand off this source step; do not begin the next source heading. |
| 5.6 — Retire embedded replay | Remove GamePaceReplay from mixed Insights only after the new route works.; Add links from games and analytics evidence. | Commit and hand off this source step; do not begin the next source heading. |
| 5.7 — Integrate production graphics into games | Integrate production graphics into games | Commit and hand off this source step; do not begin the next source heading. |
| 5.8 — Add cards-bought and TR timelines | Show a generation table on Game Detail with each player's cards bought, TR snapshot, and TR gain where derivable.; Add Cards Bought as a replay metric using grouped bars or player small multiples, with cumulative count available as a secondary mode.; Use the existing Terraform Rating replay mode for the newly recorded snapshots and render a stepped line for each player.; and the remaining source-defined items | Commit and hand off this source step; do not begin the next source heading. |
| Source heading — Identity, evidence, and historical-game privacy | Use the centralized public player-name resolver for every public player label.; After a successful claim, show the registered username or an approved public handle; never fall back to first name, last name, full name, email, authentication ID, normalized personal name, or private aliases.; Keep original import evidence and private claim-matching data behind authenticated and authorized boundaries.; and the remaining source-defined items | Apply and validate this source contract at this exact position before continuing. |

## Step 5.1 — Create the Games library

### Source-defined scope

- Canonical /games route
- Drafts, finalized, and imported games
- Search and filters
- Edit draft, view, replay, and delete where supported

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing games library, draft/finalized repositories, canonical capture adapter, game detail readers, replay components, parser-version selection, evidence access, route compatibility, and tests that already serve any part of this step.
- Identify separately what is supported for draft, finalized, legacy-only, v2-backed, partial, unsupported, conflicting, and unavailable games.
- Begin with the phase inspection list, especially:
  - Current Saved Games page
  - Game draft and finalized game repositories
  - Import evidence components
  - GamePaceReplay
  - Generation snapshot and event models
  - Existing game detail drawers or links
  - Versioned live-site capture sources, parser runs, canonical events, placements, map detections, unsupported evidence, and expansion facts
  - Historical confirmation provenance and parser coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the canonical game reader, parser-version/provenance selection, authorization, route parameters, edit/delete support, evidence boundary, and missing-data state before building presentation.
- For each displayed metric or event stream, record the source, player ordering, generation alignment, capability requirement, and whether explicit zero, absent, partial, unsupported, or not applicable is possible.
- Reuse canonical events, placements, expansion facts, generation snapshots, public player-name resolution, asset resolution, and saved-game compatibility behavior established by earlier phases.
- Do not reparse raw logs when trustworthy canonical output exists and do not reconstruct a timeline, board state, player attribution, or metric from final totals.
- Preserve draft/finalized meaning, stable game and player IDs, group authorization, private evidence boundaries, and direct-link behavior.
- Preserve the existing persistence meaning, authorization boundary, stable identifiers, and explicit save/finalize lifecycle.
- Define repeated submission, stale draft, partial failure, retry, and unsaved-navigation behavior before changing controls.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Canonical /games route
  - [ ] Drafts, finalized, and imported games
  - [ ] Search and filters
  - [ ] Edit draft, view, replay, and delete where supported
- Reuse existing game, draft, canonical-capture, player-name, asset, and evidence repositories before creating replacements.
- Preserve `/games`, compatibility routes, game-detail and replay ownership, authenticated group scope, stable identifiers, and the responsive single-website information architecture.
- Keep library filters, selected game, selected generation, replay metric, transient hover, detail evidence, and persisted URL state as separate typed responsibilities.
- Add progressive disclosure for evidence, coverage, methodology, and unavailable data rather than fabricating complete replay or detail content.
- Keep the selected generation as the single interaction anchor for controls, graphics, player summaries, event annotations, and accessible output.
- Disable unsupported metric modes instead of reconstructing a timeline from final totals.

### Stage D — Integration, evidence, and user-interface review

- Verify the step against draft, finalized, imported, legacy-only, v2-backed, partial, unsupported, conflicting, inaccessible, and missing-game states.
- Show source version, provenance, coverage, confidence/review status, and private-evidence access only where the source contract permits them.
- Inspect desktop, tablet, and narrow layouts, keyboard interaction, visible focus, replay controls, text summaries, table alternatives, and reduced motion.
- Review query count, canonical adapter reuse, asset batching, rendering cost, and repeated event or evidence reads.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test previous/next, play/pause, reset, speed, keyboard control, selected-generation persistence, and partial-data states.

### Step completion gate

- [ ] Canonical /games route
- [ ] Drafts, finalized, and imported games
- [ ] Search and filters
- [ ] Edit draft, view, replay, and delete where supported
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 5.2 — Create game detail

### Source-defined scope

- Metadata
- Players
- Corporations
- Preludes
- Placements
- Scores
- Breakdown
- Milestones
- Awards
- Styles
- Cards
- Catalog expansion metadata only where applicable; no game-level expansion filter
- Notes
- Evidence
- Coverage

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing games library, draft/finalized repositories, canonical capture adapter, game detail readers, replay components, parser-version selection, evidence access, route compatibility, and tests that already serve any part of this step.
- Identify separately what is supported for draft, finalized, legacy-only, v2-backed, partial, unsupported, conflicting, and unavailable games.
- Begin with the phase inspection list, especially:
  - Current Saved Games page
  - Game draft and finalized game repositories
  - Import evidence components
  - GamePaceReplay
  - Generation snapshot and event models
  - Existing game detail drawers or links
  - Versioned live-site capture sources, parser runs, canonical events, placements, map detections, unsupported evidence, and expansion facts
  - Historical confirmation provenance and parser coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the canonical game reader, parser-version/provenance selection, authorization, route parameters, edit/delete support, evidence boundary, and missing-data state before building presentation.
- For each displayed metric or event stream, record the source, player ordering, generation alignment, capability requirement, and whether explicit zero, absent, partial, unsupported, or not applicable is possible.
- Reuse canonical events, placements, expansion facts, generation snapshots, public player-name resolution, asset resolution, and saved-game compatibility behavior established by earlier phases.
- Do not reparse raw logs when trustworthy canonical output exists and do not reconstruct a timeline, board state, player attribution, or metric from final totals.
- Preserve draft/finalized meaning, stable game and player IDs, group authorization, private evidence boundaries, and direct-link behavior.
- Name the states supported, absent, unknown, partial, unavailable, not applicable, explicit zero, and insufficient sample separately.
- Do not use convenience defaults that convert missing evidence into zero, false, or confirmed absence.
- Require canonical map, space, placement, ownership, attribution, provenance, and coverage fields before enabling spatial analysis.
- Do not infer coordinates, ownership, actor, or board completion from final totals or incomplete events.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Metadata
  - [ ] Players
  - [ ] Corporations
  - [ ] Preludes
  - [ ] Placements
  - [ ] Scores
  - [ ] Breakdown
  - [ ] Milestones
  - [ ] Awards
  - [ ] Styles
  - [ ] Cards
  - [ ] Catalog expansion metadata only where applicable; no game-level expansion filter
  - [ ] Notes
  - [ ] Evidence
  - [ ] Coverage
- Reuse existing game, draft, canonical-capture, player-name, asset, and evidence repositories before creating replacements.
- Preserve `/games`, compatibility routes, game-detail and replay ownership, authenticated group scope, stable identifiers, and the responsive single-website information architecture.
- Keep library filters, selected game, selected generation, replay metric, transient hover, detail evidence, and persisted URL state as separate typed responsibilities.
- Add progressive disclosure for evidence, coverage, methodology, and unavailable data rather than fabricating complete replay or detail content.
- Link summary values to the supporting games and preserve the active entity, scope, and filters when opening detail evidence.
- Distinguish direct evidence from derived interpretation and show unavailable evidence explicitly.

### Stage D — Integration, evidence, and user-interface review

- Verify the step against draft, finalized, imported, legacy-only, v2-backed, partial, unsupported, conflicting, inaccessible, and missing-game states.
- Show source version, provenance, coverage, confidence/review status, and private-evidence access only where the source contract permits them.
- Inspect desktop, tablet, and narrow layouts, keyboard interaction, visible focus, replay controls, text summaries, table alternatives, and reduced motion.
- Review query count, canonical adapter reuse, asset batching, rendering cost, and repeated event or evidence reads.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test every distinct missing-data state and confirm labels, calculations, tables, and URL filters preserve the distinction.
- Test map variants, unresolved spaces, unattributed placements, replacements/removals, partial coverage, and no-coordinate fallbacks.

### Step completion gate

- [ ] Metadata
- [ ] Players
- [ ] Corporations
- [ ] Preludes
- [ ] Placements
- [ ] Scores
- [ ] Breakdown
- [ ] Milestones
- [ ] Awards
- [ ] Styles
- [ ] Cards
- [ ] Catalog expansion metadata only where applicable; no game-level expansion filter
- [ ] Notes
- [ ] Evidence
- [ ] Coverage
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 5.3 — Create single-game replay

### Source-defined scope

- Previous/next generation
- Play/pause
- Scrubber
- Speed
- Reset
- Selected generation
- Player summaries
- Events and final result

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing games library, draft/finalized repositories, canonical capture adapter, game detail readers, replay components, parser-version selection, evidence access, route compatibility, and tests that already serve any part of this step.
- Identify separately what is supported for draft, finalized, legacy-only, v2-backed, partial, unsupported, conflicting, and unavailable games.
- Begin with the phase inspection list, especially:
  - Current Saved Games page
  - Game draft and finalized game repositories
  - Import evidence components
  - GamePaceReplay
  - Generation snapshot and event models
  - Existing game detail drawers or links
  - Versioned live-site capture sources, parser runs, canonical events, placements, map detections, unsupported evidence, and expansion facts
  - Historical confirmation provenance and parser coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the canonical game reader, parser-version/provenance selection, authorization, route parameters, edit/delete support, evidence boundary, and missing-data state before building presentation.
- For each displayed metric or event stream, record the source, player ordering, generation alignment, capability requirement, and whether explicit zero, absent, partial, unsupported, or not applicable is possible.
- Reuse canonical events, placements, expansion facts, generation snapshots, public player-name resolution, asset resolution, and saved-game compatibility behavior established by earlier phases.
- Do not reparse raw logs when trustworthy canonical output exists and do not reconstruct a timeline, board state, player attribution, or metric from final totals.
- Preserve draft/finalized meaning, stable game and player IDs, group authorization, private evidence boundaries, and direct-link behavior.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Previous/next generation
  - [ ] Play/pause
  - [ ] Scrubber
  - [ ] Speed
  - [ ] Reset
  - [ ] Selected generation
  - [ ] Player summaries
  - [ ] Events and final result
- Reuse existing game, draft, canonical-capture, player-name, asset, and evidence repositories before creating replacements.
- Preserve `/games`, compatibility routes, game-detail and replay ownership, authenticated group scope, stable identifiers, and the responsive single-website information architecture.
- Keep library filters, selected game, selected generation, replay metric, transient hover, detail evidence, and persisted URL state as separate typed responsibilities.
- Add progressive disclosure for evidence, coverage, methodology, and unavailable data rather than fabricating complete replay or detail content.
- Keep the selected generation as the single interaction anchor for controls, graphics, player summaries, event annotations, and accessible output.
- Disable unsupported metric modes instead of reconstructing a timeline from final totals.

### Stage D — Integration, evidence, and user-interface review

- Verify the step against draft, finalized, imported, legacy-only, v2-backed, partial, unsupported, conflicting, inaccessible, and missing-game states.
- Show source version, provenance, coverage, confidence/review status, and private-evidence access only where the source contract permits them.
- Inspect desktop, tablet, and narrow layouts, keyboard interaction, visible focus, replay controls, text summaries, table alternatives, and reduced motion.
- Review query count, canonical adapter reuse, asset batching, rendering cost, and repeated event or evidence reads.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test previous/next, play/pause, reset, speed, keyboard control, selected-generation persistence, and partial-data states.

### Step completion gate

- [ ] Previous/next generation
- [ ] Play/pause
- [ ] Scrubber
- [ ] Speed
- [ ] Reset
- [ ] Selected generation
- [ ] Player summaries
- [ ] Events and final result
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 5.4 — Add supported metric modes

### Source-defined scope

- Score
- Cards Played
- Terraform Rating
- Engine Value
- Disable unsupported modes

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing games library, draft/finalized repositories, canonical capture adapter, game detail readers, replay components, parser-version selection, evidence access, route compatibility, and tests that already serve any part of this step.
- Identify separately what is supported for draft, finalized, legacy-only, v2-backed, partial, unsupported, conflicting, and unavailable games.
- Begin with the phase inspection list, especially:
  - Current Saved Games page
  - Game draft and finalized game repositories
  - Import evidence components
  - GamePaceReplay
  - Generation snapshot and event models
  - Existing game detail drawers or links
  - Versioned live-site capture sources, parser runs, canonical events, placements, map detections, unsupported evidence, and expansion facts
  - Historical confirmation provenance and parser coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the canonical game reader, parser-version/provenance selection, authorization, route parameters, edit/delete support, evidence boundary, and missing-data state before building presentation.
- For each displayed metric or event stream, record the source, player ordering, generation alignment, capability requirement, and whether explicit zero, absent, partial, unsupported, or not applicable is possible.
- Reuse canonical events, placements, expansion facts, generation snapshots, public player-name resolution, asset resolution, and saved-game compatibility behavior established by earlier phases.
- Do not reparse raw logs when trustworthy canonical output exists and do not reconstruct a timeline, board state, player attribution, or metric from final totals.
- Preserve draft/finalized meaning, stable game and player IDs, group authorization, private evidence boundaries, and direct-link behavior.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Score
  - [ ] Cards Played
  - [ ] Terraform Rating
  - [ ] Engine Value
  - [ ] Disable unsupported modes
- Reuse existing game, draft, canonical-capture, player-name, asset, and evidence repositories before creating replacements.
- Preserve `/games`, compatibility routes, game-detail and replay ownership, authenticated group scope, stable identifiers, and the responsive single-website information architecture.
- Keep library filters, selected game, selected generation, replay metric, transient hover, detail evidence, and persisted URL state as separate typed responsibilities.
- Add progressive disclosure for evidence, coverage, methodology, and unavailable data rather than fabricating complete replay or detail content.

### Stage D — Integration, evidence, and user-interface review

- Verify the step against draft, finalized, imported, legacy-only, v2-backed, partial, unsupported, conflicting, inaccessible, and missing-game states.
- Show source version, provenance, coverage, confidence/review status, and private-evidence access only where the source contract permits them.
- Inspect desktop, tablet, and narrow layouts, keyboard interaction, visible focus, replay controls, text summaries, table alternatives, and reduced motion.
- Review query count, canonical adapter reuse, asset batching, rendering cost, and repeated event or evidence reads.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.

### Step completion gate

- [ ] Score
- [ ] Cards Played
- [ ] Terraform Rating
- [ ] Engine Value
- [ ] Disable unsupported modes
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 5.5 — Handle missing replay data

### Source-defined scope

- Keep final summary visible.
- Explain which event data is unavailable.
- Do not reconstruct a curve from final totals.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing games library, draft/finalized repositories, canonical capture adapter, game detail readers, replay components, parser-version selection, evidence access, route compatibility, and tests that already serve any part of this step.
- Identify separately what is supported for draft, finalized, legacy-only, v2-backed, partial, unsupported, conflicting, and unavailable games.
- Begin with the phase inspection list, especially:
  - Current Saved Games page
  - Game draft and finalized game repositories
  - Import evidence components
  - GamePaceReplay
  - Generation snapshot and event models
  - Existing game detail drawers or links
  - Versioned live-site capture sources, parser runs, canonical events, placements, map detections, unsupported evidence, and expansion facts
  - Historical confirmation provenance and parser coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the canonical game reader, parser-version/provenance selection, authorization, route parameters, edit/delete support, evidence boundary, and missing-data state before building presentation.
- For each displayed metric or event stream, record the source, player ordering, generation alignment, capability requirement, and whether explicit zero, absent, partial, unsupported, or not applicable is possible.
- Reuse canonical events, placements, expansion facts, generation snapshots, public player-name resolution, asset resolution, and saved-game compatibility behavior established by earlier phases.
- Do not reparse raw logs when trustworthy canonical output exists and do not reconstruct a timeline, board state, player attribution, or metric from final totals.
- Preserve draft/finalized meaning, stable game and player IDs, group authorization, private evidence boundaries, and direct-link behavior.
- Name the states supported, absent, unknown, partial, unavailable, not applicable, explicit zero, and insufficient sample separately.
- Do not use convenience defaults that convert missing evidence into zero, false, or confirmed absence.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Keep final summary visible.
  - [ ] Explain which event data is unavailable.
  - [ ] Do not reconstruct a curve from final totals.
- Reuse existing game, draft, canonical-capture, player-name, asset, and evidence repositories before creating replacements.
- Preserve `/games`, compatibility routes, game-detail and replay ownership, authenticated group scope, stable identifiers, and the responsive single-website information architecture.
- Keep library filters, selected game, selected generation, replay metric, transient hover, detail evidence, and persisted URL state as separate typed responsibilities.
- Add progressive disclosure for evidence, coverage, methodology, and unavailable data rather than fabricating complete replay or detail content.
- Keep the selected generation as the single interaction anchor for controls, graphics, player summaries, event annotations, and accessible output.
- Disable unsupported metric modes instead of reconstructing a timeline from final totals.

### Stage D — Integration, evidence, and user-interface review

- Verify the step against draft, finalized, imported, legacy-only, v2-backed, partial, unsupported, conflicting, inaccessible, and missing-game states.
- Show source version, provenance, coverage, confidence/review status, and private-evidence access only where the source contract permits them.
- Inspect desktop, tablet, and narrow layouts, keyboard interaction, visible focus, replay controls, text summaries, table alternatives, and reduced motion.
- Review query count, canonical adapter reuse, asset batching, rendering cost, and repeated event or evidence reads.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test previous/next, play/pause, reset, speed, keyboard control, selected-generation persistence, and partial-data states.
- Test every distinct missing-data state and confirm labels, calculations, tables, and URL filters preserve the distinction.

### Step completion gate

- [ ] Keep final summary visible.
- [ ] Explain which event data is unavailable.
- [ ] Do not reconstruct a curve from final totals.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 5.6 — Retire embedded replay

### Source-defined scope

- Remove GamePaceReplay from mixed Insights only after the new route works.
- Add links from games and analytics evidence.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing games library, draft/finalized repositories, canonical capture adapter, game detail readers, replay components, parser-version selection, evidence access, route compatibility, and tests that already serve any part of this step.
- Identify separately what is supported for draft, finalized, legacy-only, v2-backed, partial, unsupported, conflicting, and unavailable games.
- Begin with the phase inspection list, especially:
  - Current Saved Games page
  - Game draft and finalized game repositories
  - Import evidence components
  - GamePaceReplay
  - Generation snapshot and event models
  - Existing game detail drawers or links
  - Versioned live-site capture sources, parser runs, canonical events, placements, map detections, unsupported evidence, and expansion facts
  - Historical confirmation provenance and parser coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the canonical game reader, parser-version/provenance selection, authorization, route parameters, edit/delete support, evidence boundary, and missing-data state before building presentation.
- For each displayed metric or event stream, record the source, player ordering, generation alignment, capability requirement, and whether explicit zero, absent, partial, unsupported, or not applicable is possible.
- Reuse canonical events, placements, expansion facts, generation snapshots, public player-name resolution, asset resolution, and saved-game compatibility behavior established by earlier phases.
- Do not reparse raw logs when trustworthy canonical output exists and do not reconstruct a timeline, board state, player attribution, or metric from final totals.
- Preserve draft/finalized meaning, stable game and player IDs, group authorization, private evidence boundaries, and direct-link behavior.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Remove GamePaceReplay from mixed Insights only after the new route works.
  - [ ] Add links from games and analytics evidence.
- Reuse existing game, draft, canonical-capture, player-name, asset, and evidence repositories before creating replacements.
- Preserve `/games`, compatibility routes, game-detail and replay ownership, authenticated group scope, stable identifiers, and the responsive single-website information architecture.
- Keep library filters, selected game, selected generation, replay metric, transient hover, detail evidence, and persisted URL state as separate typed responsibilities.
- Add progressive disclosure for evidence, coverage, methodology, and unavailable data rather than fabricating complete replay or detail content.
- Link summary values to the supporting games and preserve the active entity, scope, and filters when opening detail evidence.
- Distinguish direct evidence from derived interpretation and show unavailable evidence explicitly.
- Keep the selected generation as the single interaction anchor for controls, graphics, player summaries, event annotations, and accessible output.
- Disable unsupported metric modes instead of reconstructing a timeline from final totals.

### Stage D — Integration, evidence, and user-interface review

- Verify the step against draft, finalized, imported, legacy-only, v2-backed, partial, unsupported, conflicting, inaccessible, and missing-game states.
- Show source version, provenance, coverage, confidence/review status, and private-evidence access only where the source contract permits them.
- Inspect desktop, tablet, and narrow layouts, keyboard interaction, visible focus, replay controls, text summaries, table alternatives, and reduced motion.
- Review query count, canonical adapter reuse, asset batching, rendering cost, and repeated event or evidence reads.

### Stage E — Validation, documentation, commit, and handoff

- Add focused unit, repository, component, route, interaction, accessibility, and integration tests that prove the source-defined behavior.
- Run the targeted tests first, then the applicable full checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`.
- Record exact commands, exit codes, test counts, warnings, skipped checks, environment limitations, and whether any failure predates the step.
- Capture and inspect screenshots at the required responsive widths when the step changes user-visible UI.
- Update `docs/REDESIGN_STATE.md`, relevant decision/capability documents, and one immutable handoff file with formulas, queries, files, tests, screenshots, limitations, and the exact next action.
- Commit only this bounded step, leave the worktree clean or fully documented, and stop before beginning the next step.
- Test previous/next, play/pause, reset, speed, keyboard control, selected-generation persistence, and partial-data states.

### Step completion gate

- [ ] Remove GamePaceReplay from mixed Insights only after the new route works.
- [ ] Add links from games and analytics evidence.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Step 5.7 — Integrate production graphics into games

### Source-defined scope

- Complete the source-defined work named by this step without expanding its scope.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing games library, draft/finalized repositories, canonical capture adapter, game detail readers, replay components, parser-version selection, evidence access, route compatibility, and tests that already serve any part of this step.
- Identify separately what is supported for draft, finalized, legacy-only, v2-backed, partial, unsupported, conflicting, and unavailable games.
- Begin with the phase inspection list, especially:
  - Current Saved Games page
  - Game draft and finalized game repositories
  - Import evidence components
  - GamePaceReplay
  - Generation snapshot and event models
  - Existing game detail drawers or links
  - Versioned live-site capture sources, parser runs, canonical events, placements, map detections, unsupported evidence, and expansion facts
  - Historical confirmation provenance and parser coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the canonical game reader, parser-version/provenance selection, authorization, route parameters, edit/delete support, evidence boundary, and missing-data state before building presentation.
- For each displayed metric or event stream, record the source, player ordering, generation alignment, capability requirement, and whether explicit zero, absent, partial, unsupported, or not applicable is possible.
- Reuse canonical events, placements, expansion facts, generation snapshots, public player-name resolution, asset resolution, and saved-game compatibility behavior established by earlier phases.
- Do not reparse raw logs when trustworthy canonical output exists and do not reconstruct a timeline, board state, player attribution, or metric from final totals.
- Preserve draft/finalized meaning, stable game and player IDs, group authorization, private evidence boundaries, and direct-link behavior.
- Resolve assets through the audited shared asset layer by stable ID or canonical slug; do not construct storage URLs in presentation code.
- Define informative versus decorative alternative text, fixed sizing or aspect-ratio behavior, and the shared missing-asset fallback.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Complete the named source step.
- Reuse existing game, draft, canonical-capture, player-name, asset, and evidence repositories before creating replacements.
- Preserve `/games`, compatibility routes, game-detail and replay ownership, authenticated group scope, stable identifiers, and the responsive single-website information architecture.
- Keep library filters, selected game, selected generation, replay metric, transient hover, detail evidence, and persisted URL state as separate typed responsibilities.
- Add progressive disclosure for evidence, coverage, methodology, and unavailable data rather than fabricating complete replay or detail content.

### Stage D — Integration, evidence, and user-interface review

- Verify the step against draft, finalized, imported, legacy-only, v2-backed, partial, unsupported, conflicting, inaccessible, and missing-game states.
- Show source version, provenance, coverage, confidence/review status, and private-evidence access only where the source contract permits them.
- Inspect desktop, tablet, and narrow layouts, keyboard interaction, visible focus, replay controls, text summaries, table alternatives, and reduced motion.
- Review query count, canonical adapter reuse, asset batching, rendering cost, and repeated event or evidence reads.
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

## Step 5.8 — Add cards-bought and TR timelines

### Source-defined scope

- Show a generation table on Game Detail with each player's cards bought, TR snapshot, and TR gain where derivable.
- Add Cards Bought as a replay metric using grouped bars or player small multiples, with cumulative count available as a secondary mode.
- Use the existing Terraform Rating replay mode for the newly recorded snapshots and render a stepped line for each player.
- When a generation is selected, show per-player cards bought, TR, change from prior generation, and relevant recorded events in one synchronized detail panel.
- Keep Score, Cards Played, Cards Bought, Terraform Rating, and Engine Value semantically distinct.
- Do not combine Cards Bought and TR on one dual-axis chart. Use a metric switcher or linked stacked panels.
- Show partial-data gaps rather than interpolating missing generations.
- Use corporation logos in player identity panels and game summaries.
- Use point-source graphics in score breakdowns, legends, and replay metric summaries.
- Use tag graphics when game tags or tag-derived summaries are shown.
- Do not block game detail when an asset is unavailable; use the shared fallback.

### Stage A — Preflight and existing-contract inspection

- Confirm the required prior phase or prior substep is complete, committed, documented, and represented accurately in `docs/REDESIGN_STATE.md`.
- Confirm the current branch, starting commit, clean or fully documented worktree, and the exact review range before editing.
- Read the master rules, decisions, current phase file, latest relevant handoff, and the shared standards referenced by this source step.
- Locate the existing games library, draft/finalized repositories, canonical capture adapter, game detail readers, replay components, parser-version selection, evidence access, route compatibility, and tests that already serve any part of this step.
- Identify separately what is supported for draft, finalized, legacy-only, v2-backed, partial, unsupported, conflicting, and unavailable games.
- Begin with the phase inspection list, especially:
  - Current Saved Games page
  - Game draft and finalized game repositories
  - Import evidence components
  - GamePaceReplay
  - Generation snapshot and event models
  - Existing game detail drawers or links
  - Versioned live-site capture sources, parser runs, canonical events, placements, map detections, unsupported evidence, and expansion facts
  - Historical confirmation provenance and parser coverage
- Return a concise pre-edit report identifying what will be reused, what is genuinely missing, the expected files to change, and any unsupported data capability.
- Do not edit until any ambiguity about formula ownership, source data, authorization, privacy, or missing-data semantics is resolved or recorded as a blocker.

### Stage B — Define the bounded contract

- Define the canonical game reader, parser-version/provenance selection, authorization, route parameters, edit/delete support, evidence boundary, and missing-data state before building presentation.
- For each displayed metric or event stream, record the source, player ordering, generation alignment, capability requirement, and whether explicit zero, absent, partial, unsupported, or not applicable is possible.
- Reuse canonical events, placements, expansion facts, generation snapshots, public player-name resolution, asset resolution, and saved-game compatibility behavior established by earlier phases.
- Do not reparse raw logs when trustworthy canonical output exists and do not reconstruct a timeline, board state, player attribution, or metric from final totals.
- Preserve draft/finalized meaning, stable game and player IDs, group authorization, private evidence boundaries, and direct-link behavior.
- Resolve assets through the audited shared asset layer by stable ID or canonical slug; do not construct storage URLs in presentation code.
- Define informative versus decorative alternative text, fixed sizing or aspect-ratio behavior, and the shared missing-asset fallback.
- Preserve exact generation, normalized phase, checkpoint semantics, and complete-versus-partial coverage as separate concepts.
- Keep explicit zero separate from missing, preserve legal decreases, and never interpolate an unsupported generation value.
- Use stable player IDs for relationships and the centralized public-name resolver for presentation.
- Exclude private names, aliases, normalized matching values, email, and authentication identifiers from public/client payloads rather than hiding them after serialization.
- Name the states supported, absent, unknown, partial, unavailable, not applicable, explicit zero, and insufficient sample separately.
- Do not use convenience defaults that convert missing evidence into zero, false, or confirmed absence.

### Stage C — Implement the source step

- Implement the source requirements in the exact order shown below; these are not optional examples:
  - [ ] Show a generation table on Game Detail with each player's cards bought, TR snapshot, and TR gain where derivable.
  - [ ] Add Cards Bought as a replay metric using grouped bars or player small multiples, with cumulative count available as a secondary mode.
  - [ ] Use the existing Terraform Rating replay mode for the newly recorded snapshots and render a stepped line for each player.
  - [ ] When a generation is selected, show per-player cards bought, TR, change from prior generation, and relevant recorded events in one synchronized detail panel.
  - [ ] Keep Score, Cards Played, Cards Bought, Terraform Rating, and Engine Value semantically distinct.
  - [ ] Do not combine Cards Bought and TR on one dual-axis chart. Use a metric switcher or linked stacked panels.
  - [ ] Show partial-data gaps rather than interpolating missing generations.
  - [ ] Use corporation logos in player identity panels and game summaries.
  - [ ] Use point-source graphics in score breakdowns, legends, and replay metric summaries.
  - [ ] Use tag graphics when game tags or tag-derived summaries are shown.
  - [ ] Do not block game detail when an asset is unavailable; use the shared fallback.
- Reuse existing game, draft, canonical-capture, player-name, asset, and evidence repositories before creating replacements.
- Preserve `/games`, compatibility routes, game-detail and replay ownership, authenticated group scope, stable identifiers, and the responsive single-website information architecture.
- Keep library filters, selected game, selected generation, replay metric, transient hover, detail evidence, and persisted URL state as separate typed responsibilities.
- Add progressive disclosure for evidence, coverage, methodology, and unavailable data rather than fabricating complete replay or detail content.
- Link summary values to the supporting games and preserve the active entity, scope, and filters when opening detail evidence.
- Distinguish direct evidence from derived interpretation and show unavailable evidence explicitly.
- Keep the selected generation as the single interaction anchor for controls, graphics, player summaries, event annotations, and accessible output.
- Disable unsupported metric modes instead of reconstructing a timeline from final totals.

### Stage D — Integration, evidence, and user-interface review

- Verify the step against draft, finalized, imported, legacy-only, v2-backed, partial, unsupported, conflicting, inaccessible, and missing-game states.
- Show source version, provenance, coverage, confidence/review status, and private-evidence access only where the source contract permits them.
- Inspect desktop, tablet, and narrow layouts, keyboard interaction, visible focus, replay controls, text summaries, table alternatives, and reduced motion.
- Review query count, canonical adapter reuse, asset batching, rendering cost, and repeated event or evidence reads.
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
- Test previous/next, play/pause, reset, speed, keyboard control, selected-generation persistence, and partial-data states.
- Run known-test-name payload scans and verify neutral fallback behavior when username is unavailable.
- Test every distinct missing-data state and confirm labels, calculations, tables, and URL filters preserve the distinction.

### Step completion gate

- [ ] Show a generation table on Game Detail with each player's cards bought, TR snapshot, and TR gain where derivable.
- [ ] Add Cards Bought as a replay metric using grouped bars or player small multiples, with cumulative count available as a secondary mode.
- [ ] Use the existing Terraform Rating replay mode for the newly recorded snapshots and render a stepped line for each player.
- [ ] When a generation is selected, show per-player cards bought, TR, change from prior generation, and relevant recorded events in one synchronized detail panel.
- [ ] Keep Score, Cards Played, Cards Bought, Terraform Rating, and Engine Value semantically distinct.
- [ ] Do not combine Cards Bought and TR on one dual-axis chart. Use a metric switcher or linked stacked panels.
- [ ] Show partial-data gaps rather than interpolating missing generations.
- [ ] Use corporation logos in player identity panels and game summaries.
- [ ] Use point-source graphics in score breakdowns, legends, and replay metric summaries.
- [ ] Use tag graphics when game tags or tag-derived summaries are shown.
- [ ] Do not block game detail when an asset is unavailable; use the shared fallback.
- [ ] No source step, formula, process, route, or persistence meaning was reordered or replaced.
- [ ] Missing, unsupported, partial, unavailable, and explicit-zero states remain distinct.
- [ ] Reused code and newly introduced code are listed in the handoff.
- [ ] Targeted and applicable full validation results are recorded.
- [ ] The next source step has not begun.

## Cross-cutting contract — Identity, evidence, and historical-game privacy

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

## Carried constraint — player labelling on game surfaces

> **Provenance:** this section is REPO-NATIVE, not derived from the Word guide. It was
> written against this repository with `[GIT]` and `[PROJECT-DOC]` evidence and is carried
> forward here because the Word-derived expansion does not contain it. The cross-cutting
> identity contract above governs what may be *shown*; this governs which *source* a label
> is read from. They are different failures and both apply.

### Status

A **design constraint on unbuilt work**, not an open defect and not a blocker.
It is deliberately not filed as one. Nothing on this lineage exhibits the
failure below, because no surface on this lineage labels a saved game at all:
`src/features/games/saved-games-page.tsx`, the shared implementation behind
`/games` and `/saved-games`, selects only
`id, played_on, status, player_count, generation_count, updated_at` and renders
no player name. The constraint becomes live the moment the Games Library, game
detail, or replay surface gains player labelling.

### The three rules

Any code on this lineage that produces a player label for a game must:

1. **Label a finalized game from the authoritative roster (`game_players`), not
   from the frozen `game_revisions.snapshot`.** A draft has no `game_players`
   rows yet and legitimately keeps the snapshot.
2. **Preserve snapshot ordering only where the snapshot and the roster agree.**
   This keeps healthy games listing exactly as before rather than resequencing
   them.
3. **Never render an unresolved uuid-shaped entry as itself.** It must resolve
   to an explicit unknown-player label. A non-uuid name typed into a draft
   before its player row existed may still be shown.

### Why the rules exist

`game_revisions.snapshot` is frozen at save time, so its `selectedPlayerIds` go
stale whenever the roster rows beneath them are merged, superseded, or deleted.
On the production lineage the 2026-07-20 group collapse/split and guest cleanup
left thirteen finalized games' snapshots naming superseded player rows; two of
those rows had been deleted outright, so nothing resolved them, and the label
fallback returned the whole uuid — the list rendered raw uuids where player
names belong. The rules above are the shape of the fix that removed that class
of failure, not merely that one incident.

Rule 3 is the durable one. The 2026-07-20 data is repaired, but any future
roster merge, split, or cleanup can re-open the same gap between a frozen
snapshot and a live roster; rules 1 and 2 close the common path and rule 3
bounds the residual.

### Evidence

- **[GIT]** `c7d6c203a` — *"fix(saved-games): stop rendering raw player ids as
  names"*, `src/lib/db/game-draft-repo.ts` and its test. It is **not** an
  ancestor of this branch; it reaches
  `fix/live-compare-data-remove-declared-style` and
  `fix/saved-game-label-orphan-snapshot-ids` only.
- **[PROJECT-DOC]** The canonical `DEPLOY-STATE.md` on the production lineage,
  section *"Saved-game player-label release — 2026-07-23 01:58Z"*, which
  records the bug, the code half (`c7d6c203a`), the data half (ledger
  `20260723014849 repair_snapshot_player_ids`), and the post-deploy
  saved-games-list smoke test. Read it with
  `git show fix/live-compare-data-remove-declared-style:DEPLOY-STATE.md`.
- **[PROJECT-DOC]** `docs/REDESIGN_STATE.md`, the 2026-07-23 correction
  under the production-only registration section, which records why an earlier
  statement that this lineage *"still labels finalized saved games from
  `game_revisions.snapshot`"* was false.

### This is not a missing merge

`c7d6c203a` sits on the production lineage. **If this lineage ever merges that
lineage, the fix arrives with it**, already applied to
`src/lib/db/game-draft-repo.ts`. The constraint therefore governs **net-new
labelling code written on this lineage** — a new Games Library listing, game
detail header, or replay roster — and must not be read as an outstanding
cherry-pick, backport, or merge obligation. Do not carry the commit across on
the strength of this document.

### Related observation, outside this phase

`getPlayerName` in `src/features/analytics/group-dashboard.tsx` falls back to
the `playerId` itself (`…?.playerName ?? playerId`) when a player has no
matching leaderboard row, and is called once for the Persisted Efficiency
"Top Player" tile on Group Insights. That is a different surface and a
different data path from anything in this phase, and its reachability in live
data has not been tested, but it is the same class of hazard rule 3 addresses.
Recorded here so a future implementer sees the pattern; it belongs to Group
Insights, not to Phase 5, and no blocker was opened for it. **[REPO]**

### Centralized resolution already available

`resolvePublicPlayerName` in `src/lib/player-identity/public-player-name.ts`
already falls back to the `PUBLIC_PLAYER_FALLBACK` constant rather than to an
id, and `getPublicPlayerNames` / `buildPublicPlayerNameMap` in
`src/lib/db/public-player-name-repo.ts` resolve ids through the
`get_public_player_names` RPC, which gates every id on `can_read_player` /
`is_group_member`. New labelling code should resolve through those rather than
introduce a second fallback path. The privacy contract in
`docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` continues to
govern which identity may be shown.

## Copy-ready agent execution prompt

> Perform Phase 5 only: create a canonical Games area with /games, /games/[gameId], and /games/[gameId]/replay. Preserve backward compatibility from /saved-games.
>
> Refactor Saved Games into a searchable, filterable library of drafts, finalized games, and imports. Create a game-detail page that renders only data actually available for that game. Move GamePaceReplay to a dedicated game route and build replay controls around real generation snapshots and events.
>
> Support Score, Cards Played, Terraform Rating, and Engine Value only when the imported data supports those metrics. Use stepped lines for discrete generation changes. When snapshots are missing, show a structured unavailable state and final-game summary instead of inventing a timeline.
>
> Remove embedded replay from general Insights only after the new route is functional and tested.
> PRODUCTION GRAPHICS
> Use the shared Supabase asset components in game detail and replay: corporation logos for player identity, point-source graphics for score breakdowns and legends, and tag graphics where tags are shown. Missing assets must use the shared fallback and must not block the page.
> COMBINED GAME DETAIL AND REPLAY
> Compose game detail as metadata and KPI summary, player/corporation identity row, score-source breakdown, objectives, and evidence sections.
> Compose Replay around one dominant stepped progression chart, synchronized player panels, timeline controls, event annotations, and selected-generation detail.
> Use production corporation and point-source graphics in identity, legends, and summaries.
> Per-generation replay requirements
> Use the new cards-bought count and TR snapshot records in Game Detail and Replay.
> Add Cards Bought as a grouped-bar or small-multiple replay metric and render TR as stepped lines. Synchronize selected generation, player summaries, events, and accessible table output.
> Keep Cards Played, Cards Bought, Score, TR, and Engine Value distinct; do not interpolate missing values or use an ambiguous dual axis.

## Acceptance checklist

- [ ] Replay uses canonical events and placements when available and preserves parser-version provenance.

- [ ] Legacy-only, v2-backed, unsupported, partial, and conflicting games render through the same canonical contract.

- [ ] Games library is canonical.

- [ ] Game detail works.

- [ ] Replay is single-game scoped.

- [ ] Missing data is handled honestly.

- [ ] Legacy saved-game links work.

- [ ] Routing, filtering, detail, and replay tests pass.

- [ ] Game detail and replay use production graphics without blocking on missing assets.

- [ ] Game detail and replay present coordinated identity, score, event, timeline, and evidence graphics rather than disconnected cards.

- [ ] Replay selection and timeline controls synchronize the chart, player summaries, annotations, and detail panel.

- [ ] Game Detail and Replay expose the new cards-bought and TR records with accurate generation alignment.

- [ ] Selected-generation details, chart focus, and accessible table summaries remain synchronized.

- [ ] Missing generation values are shown as gaps or unavailable cells, not fabricated continuity.

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

- Phase 5 may be marked complete only after every source step above has its own accepted handoff and the phase acceptance checklist passes as one integrated system.
- A later phase must not begin automatically. The final handoff identifies only the next possible separately authorized phase or remediation task.
- Any formula, migration, authorization rule, public-data contract, or URL-state change requires the independent review specified by the Word guide.
- Production migration, backfill, RLS mutation, Storage change, push, or deployment remains prohibited unless a separate explicit authorization and evidence record exists.
