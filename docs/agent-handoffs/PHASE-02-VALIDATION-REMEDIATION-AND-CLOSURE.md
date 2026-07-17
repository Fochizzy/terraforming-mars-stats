# Phase 2 Validation Remediation and Closure Handoff

## Status

Completed in the repository on 2026-07-17. This separately assigned closure
remediates the Step 2.6 Merger always-available Prelude blocker without
amending Step 2.6's scope. Phase 2 is formally complete in the repository.
The production migration and historical-policy package are intentionally
unapplied and remain separately owner-gated.

## Assignment and authority

Resolve the Merger availability blocker only: preserve the established rule
that Merger is an additional guaranteed Prelude option and every player still
chooses exactly two Preludes. Do not start the next task, change a production
route, touch the original worktree, push, deploy, mutate Supabase, apply a
migration, run a historical backfill, or alter production Storage.

Reviewed in the required order: the explicit assignment; `AGENTS.md`;
`CLAUDE.md`; `docs/REDESIGN_STATE.md`; the Phase 2 file; `DECISIONS.md`; the
Step 2.6 handoff; `MASTER-RULES.md`; `MASTER-PLAN.md`; applicable inventories,
capability, migration, and component records; source and tests at each changed
boundary; and the Word master guide by the document-review workflow. The guide
added no conflicting requirement. The original repository was not changed;
direct Git preflight there was blocked by its ownership protection and was not
overridden persistently.

## Preflight and commits

- Directory: `C:\Users\izzyh\Documents\Terraforming Mars Redesign`
- Branch: `redesign/tm-stats-dashboard-rebuild`
- Base commit: `ca4913275d8efaa26febe2303b64f59d47372069` (Step 2.6)
- Completion commit: recorded in the final completion report because a commit
  cannot contain its own final hash.
- Worktree was clean before the assignment. Final status is checked after the
  completion commit.

## Implemented repository contract

- An owner-managed `group_settings.default_guaranteed_merger_offer` defaults to
  `true` and applies only when a future game snapshot is created.
- Games carry nullable `guaranteed_merger_offer` and
  `guaranteed_merger_offer_source`. `true`, `false`, and unknown remain distinct;
  editing an existing game preserves its saved snapshot instead of silently
  rereading today's group default.
- The group settings form explains the guaranteed additional option, the setup
  form provides an accessible On/Off/Unknown override, and review/finalization
  surface the saved value and provenance. Players still choose only two.
- Historical attribution is a separately reviewable policy: only legacy
  `null`/`null` snapshots for a selected group may be set to
  `true`/`historical_policy`. Explicit records are never overwritten.

## Identity, import evidence, and reconciliation

- Canonical Merger identities are the stable source IDs `promo:P39` and legacy
  `promo:merger`, normalized in code. The migration dynamically seeds catalog
  aliases only when matching `cards.source_card_id` or `preludes.code` rows are
  present; it does not match final display names or assert a deployed UUID.
- Import evidence accepts only those identities and attributes a player only by
  exact normalized in-game name or one confirmed alias. Ambiguous and
  unresolved actors remain reviewable states. It does not infer an actor from
  player order, corporation, score, or partial evidence.
- The existing raw-log/OCR import path does not write a full parsed event
  grammar. The new pure evidence contract consumes resolved event-shaped input
  when it exists and does not fabricate records from absent data.
- Reconciliation categories preserve verified, manual, ambiguous, unresolved,
  conflicting, partial, and missing coverage rather than overwriting a
  selection or treating an absent `card_played` event as variant-off evidence.

## Analytics and canonical formulas

- `calculateMergerPreludeAvailability` reports usage, known availability, and
  selection given availability from the saved game snapshot and reviewable
  selection evidence.
- A guaranteed `true` snapshot contributes an offer observation for every
  eligible player-game. A `false` snapshot contributes no guaranteed offer.
  Unknown is not coerced to false; a confirmed selection in an unknown game is
  recorded as availability known with an unknown source.
- Guaranteed-variant, random-offer, other-approved, and unknown sources remain
  distinct. Random-offer selection metrics stay unavailable when an independent
  random-offer denominator is absent; raw Merger selections are not ranked as
  though random availability were captured.
- The canonical registry, capability declaration, inventory, and definition
  document contain the formula/version and required-field contracts.

## Migration and production package

- Local migration:
  `supabase/migrations/20260717190000_add_merger_offer_rule_snapshots.sql`.
  It adds group/game facts, constraints, a finalized-game index, and the
  RLS-readable canonical-alias table. It contains no update of historical games.
- Local verification:
  `supabase/tests/merger_offer_rule_schema_verification.sql` and its static
  Vitest coverage verify the columns, constraints, RLS preservation, no
  historical update, mapping guard, and backfill idempotency intent.
- Review-only operational package:
  `supabase/verification/merger-offer-historical-policy-dry-run.sql`,
  `merger-offer-historical-policy-backfill.sql`, and
  `merger-offer-historical-policy-rollback.sql`, documented in
  `docs/redesign/PHASE-02-MERGER-OFFER-PRODUCTION-PACKAGE.md`.
  The dry run reports target, eligible, already-attributed, explicit-conflict,
  mapping, detected-log, manual, and unresolved-actor counts before any action.
  A missing mapping or explicit conflict is a stop condition. No command from
  this package was run against a linked or production database.

## Files changed

- Snapshot/default/persistence/UI: `src/lib/merger/`,
  `src/lib/db/group-settings-repo.ts`, `src/lib/db/game-draft-repo.ts`,
  `src/lib/validation/`, `src/features/groups/`, `src/features/games/`, and the
  group/log-game pages with their focused tests.
- Import/reconciliation: `src/lib/imports/build-import-draft.ts`,
  `src/lib/imports/merger-play-evidence.ts`, and tests.
- Analytics: `src/lib/analytics/merger-prelude-analytics.ts`, canonical and
  capability registries, exports, and tests.
- Migration/package: the migration, schema test, static migration test, and
  verification SQL listed above.
- Documentation: state, decisions, master plan, Phase 2 plan, canonical
  definitions, data capability, analytics inventory, migration matrix,
  component matrix, and this handoff.

No dependency, production route, navigation, legacy consumer, environment
file, original-worktree file, remote, deployment, or production Supabase/
Storage resource was changed.

## Validation

| Check | Result |
| --- | --- |
| Focused Merger path | Passed: snapshot, import-evidence, availability, migration, draft, import-draft, group-settings, and wizard tests: 8 files, 23 tests. |
| Full `npm.cmd test` | Passed: 107 test files, 572 tests. |
| `npx.cmd tsc --noEmit` | Passed with no errors. |
| `npm.cmd run lint` | Passed with four unchanged baseline warnings: three `no-img-element` warnings in `score-profile-panel.tsx`, one unused `normalizeProfileHeadToHeadRow` warning in `analytics-repo.ts`, plus the existing Next lint deprecation notice. |
| `npm.cmd run build` | Passed: 23/23 pages generated, with the same baseline warnings. |
| Migration/evidence/snapshot/analytics tests | Included in the full run; they cover source-ID aliases, exact/alias/unresolved actors, nullable snapshot semantics, availability denominators, unknown source behavior, and no historical update in the migration. |
| Diff review | `git diff --check` and staged/final status review are required immediately before and after the focused commit. |

## Limitations, rollback, and next action

No local catalog database rows or production group UUID were available, so the
repository does not claim a live alias binding, dry-run count, or backfill
result. That is an external owner-gated execution step, not a repository
blocker. Rollback is scoped to records changed by the historical policy
(`true` with `historical_policy` provenance) and does not touch explicit
snapshots.

The exact next action is **Glossary and Card Database Preservation and Glossary
Cross-Linking**. It may begin only when explicitly assigned. Do not begin it as
part of Phase 2 closure.
