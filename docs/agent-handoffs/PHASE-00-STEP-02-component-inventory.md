# Phase 0 Step 0.2 Component Inventory Handoff

## Status

Completed on 2026-07-16.

## Branch and baseline

- Branch: `redesign/tm-stats-dashboard-rebuild`
- Starting revision: `a9be6a0c4`
- Starting working tree: clean
- Production application changes: none
- Database, query, formula, schema, asset, and style changes: none

The primary repository checkout was on another branch with unrelated changes.
The audit was therefore completed in the existing clean worktree at
`C:\Users\izzyh\Documents\Terraforming Mars Redesign`, which was already attached
to the required redesign branch. The other checkout was not switched, cleaned, or
modified.

## Completed scope

- Read all repository/redesign instructions required by the task and verified the
  Step 0.1 handoff/commit before editing.
- Re-inspected the current route map and every meaningful React component under
  `src/app`, `src/components`, and `src/features`.
- Inventoried 59 components: 16 route/layout components, 6 shared components, and
  37 feature components.
- Traced current routes/parents, scope, runtime boundaries, props, repositories,
  server actions, hooks/helpers, shared types, tests, CSS, and assets.
- Identified multi-route components, duplicate analytics responsibilities, unused
  components, unusually large files, and migration-sensitive coupling.
- Recommended future destinations, actions, phases, risks, retirement conditions,
  and migration order without moving or changing any production component.
- Stopped before Step 0.3; no data capability was classified.

## Files inspected

### Required instructions and prior audit

- `AGENTS.md`
- `CLAUDE.md`
- `docs/redesign/MASTER-RULES.md`
- `docs/redesign/PAGE-ARCHITECTURE.md`
- `docs/redesign/phases/00-repository-audit.md`
- `docs/redesign/CURRENT-ROUTE-MAP.md`
- `docs/redesign/BASELINE-VALIDATION.md`
- `docs/REDESIGN_STATE.md`
- `docs/redesign/DECISIONS.md`
- `docs/agent-handoffs/PHASE-00-STEP-01-route-inventory.md`

### Components, tests, styles, and assets

- Every non-test `.tsx` file under `src/app`, `src/components`, and `src/features`.
  The exact 59 inventoried files are the source paths in
  `docs/redesign/COMPONENT-MIGRATION-MATRIX.md`.
- `src/components/ui/step-heading.tsx` and
  `src/components/ui/select-chevron.tsx` were inspected but excluded from the
  component count as tiny wizard-only helpers.
- All 54 `.test.ts`, `.test.tsx`, and `.spec.ts` files under `src` and `tests` were
  scanned; direct and parent-level component tests are cited in the matrix.
- `src/app/globals.css`
- `src/components/layout/app-shell.module.css`
- `src/components/charts/chart-frame.module.css`
- `src/features/insights/score-profile-panel.module.css`
- Local component assets under `assets/` and `public/`, including the banner,
  authentication background, and leaderboard laurels.

### Related repositories, actions, hooks, types, and helpers

- `src/lib/db/analytics-repo.ts`
- `src/lib/db/final-terraforming-action-repo.ts`
- `src/lib/db/game-draft-repo.ts`
- `src/lib/db/game-import-repo.ts`
- `src/lib/db/game-pace-repo.ts`
- `src/lib/db/group-context-repo.ts`
- `src/lib/db/group-settings-repo.ts`
- `src/lib/db/log-game-player-resolution.ts`
- `src/lib/db/ocr-correction-repo.ts`
- `src/lib/db/player-repo.ts`
- `src/lib/db/reference-repo.ts`
- `src/lib/db/user-profile-repo.ts`
- `src/lib/imports/build-import-draft.ts`
- `src/lib/imports/normalize-player-alias.ts`
- `src/lib/ocr/browser-tesseract.ts`
- `src/lib/supabase/browser.ts`
- `src/lib/supabase/server.ts`
- `src/lib/theme/tokens.ts`
- `src/lib/validation/group-settings.ts`
- `src/lib/validation/log-game.ts`
- `src/features/games/finalize-game.ts`
- `src/features/games/log-game/use-log-game-draft.ts`
- `src/features/insights/build-insight-cards.ts`
- `src/features/styles/infer-style.ts`
- Inline server actions in the log-game, import, group players, group settings,
  and group switcher components.

## Files changed

- Created `docs/redesign/COMPONENT-MIGRATION-MATRIX.md`.
- Updated `docs/REDESIGN_STATE.md`.
- Created `docs/agent-handoffs/PHASE-00-STEP-02-component-inventory.md`.

`docs/redesign/DECISIONS.md` was not changed because this audit records
recommendations and unresolved questions; it does not approve a new product or
analytics definition.

## Inventory findings

### Shared components

- `AppShell` is used by all nine protected pages.
- `GroupSwitcher` is used by eight protected pages.
- `ChartFrame` is imported by 11 analytics/insights component files.
- `GlobalMetricBoard` and `GlobalSummaryBoard` both reach `/group` and `/insights`.
- `MapPerformanceList` reaches `/profile` and `/group`.
- `CoverageBadge` reaches group, profile, and insights dashboards.
- `ResetPinForm` is shared by two route wrappers.
- `PromoSetBrowser` reaches `/cards` and `InsightsDashboard`, although insights
  currently supplies empty catalog arrays.

### Duplicate or overlapping responsibilities

Thirteen overlap clusters are documented in the matrix:

1. Score profile versus scoring DNA
2. Corporation performance versus corporation meta
3. Card outcomes versus key-card analytics
4. Style effectiveness versus play-style analytics
5. Group comparison versus lineup effects
6. Leaderboard ranking versus placement analysis
7. Head-to-head analytics
8. Global analytics ownership
9. Optional-data coverage
10. Map performance
11. Efficiency summaries
12. Promo catalog placement
13. PIN recovery wrappers/request entries

Notable specifics:

- Four score-source presentations use inconsistent source sets; the radar omits
  `Other Card`, while the DNA/list/legacy chart use ten sources.
- `LineupEffectsPanel` is a tested, richer component but is not referenced; two
  simpler lineup renderers remain active.
- There is no dedicated current card-outcomes component. Key cards are captured in
  the log form, dashboards show coverage, and the promo browser is only a catalog.
- There is no dedicated leaderboard component or route; ranking and placement are
  distributed across group, insights, profile, and prose-card builders.
- `/reset-pin` and `/auth/reset-pin` are duplicate page wrappers for one form.

### High-risk components and supporting dependencies

- `src/features/insights/insights-dashboard.tsx` — 1,016-line client mega-dashboard
- `src/lib/db/analytics-repo.ts` — 2,365-line shared analytics dependency
- `LogGamePage` + `LogGameWizard` + `finalize-game.ts`
- `CorporationMetaPanel`
- `CorporationPreludePairingsPanel`
- `ScoreProfilePanel` and its 397-line CSS module
- `GroupDashboard`
- `ProfilePage` + `ProfileDashboard`
- `GamePaceReplay` + `game-pace-repo.ts`
- `FinalTerraformingActionTable`
- `ChartFrame` + `HeadToHeadLensFrame`
- `WebImportPage` + the import page server action
- `AwardMapSummary`

## Validation

Documentation validation for this step:

- Verified the branch remained `redesign/tm-stats-dashboard-rebuild`.
- Verified the worktree was clean before the first Step 0.2 edit.
- Verified the matrix contains exactly 59 unique component source rows.
- Verified every non-test `.tsx` file under the requested source directories is
  either inventoried or explicitly excluded as one of the two tiny helpers.
- Verified every source path in the matrix exists.
- Verified the changed-file set is documentation-only.
- Ran `git diff --check` after the documentation edits.

Application tests, type checking, linting, build, Playwright, and screenshots were
not rerun because Step 0.2 changed documentation only. The healthy baseline remains
recorded in `docs/redesign/BASELINE-VALIDATION.md`.

## Open questions and blockers

No blocker prevents completion of Step 0.2. Open questions deferred to approved
future steps include:

- Final URLs/ownership for Players, Groups, Group Members, and Group Settings.
- Promo-only versus full-card reference ownership at `/cards`.
- Shared typed lookup and real production assets for score sources, corporations,
  tags, point sources, and maps.
- Canonical score-source set and missing-versus-zero presentation.
- Pairing-specific versus generic score-channel context.
- Leaderboard eligibility/ranking methodology and separation from placement.
- Whether to adopt or replace the unused `LineupEffectsPanel`.
- Error/unavailable states for final-action and global summary reads.
- Detailed phase acceptance criteria: Phase 1-20 files are currently empty.

These are not Step 0.2 blockers and were not resolved by assumption.

## Next action

Begin Phase 0 Step 0.3, Data Capability Audit, only when explicitly assigned. Do
not move or refactor components as part of that handoff.
