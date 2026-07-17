# Phase 2, Step 2.6 - Analytics Foundation Integration Validation Handoff

## Status

Completed as a validation step on 2026-07-17. Phase 2 is not formally complete
because the validation identified a Merger availability blocker that needs a
separately assigned Phase 2 Validation Remediation and Closure task.

## Assignment and scope

Validate only the completed Phase 2 analytics foundation and the completed
corporation-logo replacement/remapping dependency. Do not begin a production
page migration, feature work, schema, SQL, RPC, Storage, Supabase, route,
navigation, dependency, or deployment change.

## Authority and documents reviewed

Reviewed in the assigned authority order: the explicit Step 2.6 assignment;
`AGENTS.md`; `CLAUDE.md`; `docs/REDESIGN_STATE.md`; the Phase 2 file;
`DECISIONS.md`; `MASTER-RULES.md`; `MASTER-PLAN.md`; `PAGE-ARCHITECTURE.md`;
`DATA-CAPABILITIES.md`; `ANALYTICS-INVENTORY.md`; `ASSET-INVENTORY.md`;
`MIGRATION-MATRIX.md`; `COMPONENT-MIGRATION-MATRIX.md`; the Step 2.0 through
2.5 handoffs; the corporation-logo handoff; every file currently under
`docs/redesign/assets/corporation-logos/`; and the Word master guide using the
document-review workflow. The Word guide added no conflicting requirement.

## Preflight

- Branch: `redesign/tm-stats-dashboard-rebuild`.
- Redesign worktree: clean before work.
- Step 2.5 completion commit: `5183528f0`.
- Corporation-logo replacement/remapping completion commit: `1064e2b74`.
- Step 2.5 handoff and corporation-logo handoff existed and agree with Git and
  state records.
- The original repository was inspected read-only with a command-local Git safe
  directory override. It was already dirty on
  `move-score-profile-below-insights-lab`; this Step 2.6 work did not touch it.
- No prior Step 2.6 handoff/commit existed. The Phase file's opening status was
  stale about Step 2.5, while its substep table, state file, and handoffs were
  correct; this documentation drift is corrected here.

## Files inspected

- All Phase 2 contracts and their focused tests under `src/lib/analytics/`.
- The server-only finalized-game repository and its tests under
  `src/lib/db/analytics/`.
- Phase 1 evidence table and data-state foundations.
- Corporation asset resolver, registry, reference reader, and asset tests.
- Cards route/catalog implementation and tests; no Phase 2 change touched it.
- The Phase 2, data-capability, asset, migration, component-migration, and
  corporation-logo reconciliation records listed above.

## Files changed

- `src/lib/analytics/analytics-foundation.integration.test.tsx`
- `docs/REDESIGN_STATE.md`
- `docs/redesign/phases/02-analytics-foundation.md`
- `docs/redesign/DATA-CAPABILITIES.md`
- `docs/redesign/MASTER-PLAN.md`
- this handoff

`DECISIONS.md` is unchanged: validation made no new product decision.

## Validation matrix

| Area | Result |
| --- | --- |
| Contract composition | Pass. URL filters and non-sample selection reach typed repository metadata; normalized records feed only the canonical Win Point Differential utility; typed metric evidence reaches a Phase 1 accessible table. |
| Missing-data integrity | Pass for the validated path. Explicit zero remains observed, missing scores remain missing, partial records remain partial, unavailable capability remains unavailable, and query failure remains an error. No new `?? 0`/`|| 0` coercion was added. Existing legacy coercions remain deferred. |
| Formula integrity | Pass. The integration uses the versioned sole-winner utility; tied first remains indeterminate. It adds no Cards Purchased/Seen/Drawn/Received/Played/Remaining inference. |
| Repository/query behavior | Pass for the approved source slice. It remains authenticated server-only, RLS-preserving, validated before broad reads, deterministically ordered, batched, and error-redacted. No client DB coupling or N+1 behavior was introduced. |
| Corporation logos | Pass. Reconciliation artifacts contain 116 stable id+code mappings, 112 valid content-addressed 800x800 tiles, four intentional shared tiles, no missing IDs/codes, and complete rollback evidence. The registry and resolver use identity plus `logo_path`, with a text fallback. |
| Glossary | Compatible. This worktree has no standalone existing Glossary route or implementation to remove; Phase 2 changed no route, deep link, definition, or shared content surface. Cross-linking was not started. |
| Card Database | Compatible. `/cards` remains the existing protected promo catalog route; its component, search/filter/browse behavior, assets, and deep link were unchanged. |
| Merger variant | Blocker. The current model cannot represent guaranteed availability, a game rule snapshot, historical always-on attribution, canonical identity reconciliation, verified play/actor coverage, or an availability-aware denominator. |

## Tests and exact results

- `npx.cmd vitest run src/lib/analytics/analytics-foundation.integration.test.tsx` - 1 file / 2 tests passed.
- Focused Phase 2, repository, asset, evidence-table, and catalog command - 23 files / 246 tests passed.
- `npm.cmd test` - 103 files / 556 tests passed.
- `npx.cmd tsc --noEmit` - passed with no errors.
- `npm.cmd run lint` - passed with the four baseline warnings: three
  `no-img-element` warnings in `score-profile-panel.tsx`, one unused
  `normalizeProfileHeadToHeadRow` warning in `analytics-repo.ts`, plus the
  existing `next lint` deprecation notice.
- `npm.cmd run build` - passed; 23/23 pages generated, with the same warnings.
- `git diff --check` and final diff/status inspection are required before the
  focused commit.

## Corporation-logo reconciliation

The remap manifest has 116 unique corporation id+code rows, 112 unique valid
content-addressed proposed object names, zero invalid tile dimensions, and four
intentional shared tiles. It joins completely to the rollback manifest and the
pre-change corporation export. The pre-change storage/reconciliation records
show the original 116 PNG objects and preserve the old missing/unreferenced
state for rollback audit. The production handoff records the post-change 116
resolvable / zero-broken reconciliation and confirms only `logo_path` changed.
No Storage or database action was performed in this validation.

## Merger blocker and exact remediation boundary

Do not rank raw Merger selection counts directly with randomly offered Preludes.
The separate closure task must first decide and model: a group-level default
copied into a game-level immutable rule snapshot; the historical always-on
attribution policy; one stable Merger catalog identity and any duplicate-card
reconciliation; selected/played actor evidence; complete, partial, and
unresolved log coverage; and an availability-aware denominator. It must treat
the absence of a `card_played` event as unknown availability, never as variant
off. That task may require a new approved persisted fact, migration, backfill
policy, and reader; none is authorized or implemented here.

## Deferred items and confirmations

- Existing legacy analytics/UI null-to-zero and error-to-empty heuristics remain
  explicitly deferred migration work.
- No secrets, environment file, service-role key, dependency, migration, SQL,
  view, function, RPC, schema, production data, Storage mutation, push, or
  deployment occurred.
- No future phase or remediation implementation was started.

## Repository state

- Branch: `redesign/tm-stats-dashboard-rebuild`
- Commit: this focused Step 2.6 commit; its final hash is reported in the
  completion response because a commit cannot contain its own final hash.
- Worktree: clean after commit.

## Exact next approved action

Only a separately assigned **Phase 2 Validation Remediation and Closure** task
may proceed. Phase 2 remains incomplete until that task resolves and validates
the Merger availability blocker. Do not begin it from this handoff.
