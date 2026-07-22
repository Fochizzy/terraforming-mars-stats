# TM Stats Current Status

Last updated: 2026-07-22

This is the concise current-work router. `docs/REDESIGN_STATE.md` retains the
full project history and detailed state. Update both files in the same change
whenever the current phase, release boundary, next work item, or production
migration state changes.

## Current phase

Phase 4, Step 4.3 - Import Validation, Evidence Review, and Claimable Guest
Identity. The step remains **blocked at its release boundary**. Step 4.4 has not
started.

## Current objective

Preserve the source-bound import-identity design and close the remaining
release sequence safely: make the redesign reader compatible with the current
production grants, deploy and verify that compatible reader only under a new
explicit assignment, and apply the legacy-matcher contraction only after its
separate gate is authorized.

## Completed and executably verified

- The source-bound import-identity replacement was built locally and remediated
  after independent review.
- Production applied `add_source_bound_import_identity_staging` as ledger
  version `20260722132159` from repository migration `20260722012658`.
- Production applied the interim reason-coarsening migration as ledger version
  `20260722144034` from repository migration `20260720120000`.
- Production revoked `authenticated` execution of
  `resolve_import_guest_identity` as ledger version `20260722153233`; the
  post-apply ACL and one-target-only change were independently verified.
- Production ledger attestation is 113 entries with head `20260722153233` in
  the latest apply record.

## In progress

- No product implementation, migration, deployment, or production operation is
  currently authorized by this status document.
- Authoritative branch: `redesign/tm-stats-dashboard-rebuild`.
- The compatible source-bound redesign reader is not deployed.
- Tooling only, not merged: `fix/deploy-state-planning-pack-sync` makes the
  planning pack read `DEPLOY-STATE` from
  `fix/live-compare-data-remove-declared-style` instead of an untracked
  working-tree cache. Until it is merged the desktop updater and its scheduled
  task fail closed unless `--source-manifest` is supplied. Handoff:
  `docs/agent-handoffs/DEPLOY-STATE-PLANNING-PACK-GIT-SOURCE.md`.

## Next work item

No next product action is automatically authorized. A new explicit assignment
must define and authorize the release continuation. The currently evidenced
sequence is:

1. correct and verify the remaining redesign call site that still uses an
   authenticated user-session client after the production revoke;
2. deploy and verify the compatible redesign reader under explicit authority;
3. separately authorize and apply contraction migration `20260722012707` only
   after reader verification; and
4. run a fresh closure audit before any Step 4.4 assignment.

## Known blockers

| ID | Requirement | Current status | Blocking |
|---|---|---|---|
| ID-READER-CLIENT | `createOrReuseGuestPlayerByPersonalName` must not call the revoked RPC as `authenticated` | Follow-up identified; not fixed or deployed | Redesign deploy |
| ID-READER-DEPLOY | Compatible source-bound reader must be deployed and production-verified | Not authorized or deployed | Legacy contraction |
| ID-LEGACY-ORACLE | Retire authenticated execution of `match_import_player_names` with migration `20260722012707` | Gated and unapplied; interim coarsening remains live | Step 4.3 closure |
| STEP-4.3-AUDIT | Fresh independent closure audit | Not completed after the current production boundary | Step 4.3 closure |
| STEP-4.4 | Explicit assignment for final review, finalization, and draft safety | Not authorized | Step 4.4 start |

## Important repository and production evidence

- Full state: `docs/REDESIGN_STATE.md`
- Current phase contract: `docs/redesign/phases/04-log-a-game.md`
- Current production apply record:
  `docs/agent-handoffs/GUEST-IDENTITY-ORACLE-REVOKE-APPLY.md`
- Source-bound local implementation:
  `docs/agent-handoffs/PHASE-04-STEP-03-IMPORT-IDENTITY-SOURCE-BOUND-MATCHING-IMPLEMENTED-LOCAL.md`
- Latest remediation:
  `docs/agent-handoffs/PHASE-04-STEP-03-IMPORT-IDENTITY-MATCHING-REGRESSION-REMEDIATION.md`
- Migration/ledger map: `docs/redesign/reference/MIGRATION-LEDGER-MAP.md`
- Deploy and production-write ledger: `DEPLOY-STATE.md` on
  `fix/live-compare-data-remove-declared-style`, read with
  `git show fix/live-compare-data-remove-declared-style:DEPLOY-STATE.md`. Every
  filesystem copy is a factless pointer stub.

## Rules

- This file routes work; it does not authorize a migration, deploy, push,
  production read/write, new phase, or next substep.
- Do not treat remediation or documentation claims as executable proof.
- Require executable repository evidence before marking a finding resolved.
- Record production evidence separately from local test evidence.
- When documentation conflicts with code, migrations, tests, or production
  evidence, report the contradiction and reconcile the current documents before
  implementation.
- Do not modify unrelated application or production rows during verification.
