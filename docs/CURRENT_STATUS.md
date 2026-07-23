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
- Tooling only, **integrated**: `fix/deploy-state-planning-pack-sync` is merged
  into `redesign/tm-stats-dashboard-rebuild` — both branches are at
  `944bdad0d`. The planning pack reads `DEPLOY-STATE` from
  `fix/live-compare-data-remove-declared-style` through Git instead of an
  untracked working-tree cache, and the ordinary desktop launcher and scheduled
  task now work with **no `--source-manifest` override**. The
  "until it is merged … fail closed" limitation recorded here and in the handoff
  described the pre-merge state and no longer applies. Handoff:
  `docs/agent-handoffs/DEPLOY-STATE-PLANNING-PACK-GIT-SOURCE.md`.
- Do not merge `fix/planning-pack-deploy-state-source` (`52373ff79`). It is a
  superseded parallel attempt at the same repair; see `docs/REDESIGN_STATE.md`.

## Next work item

No next product action is automatically authorized. A new explicit assignment
must define and authorize the release continuation. The currently evidenced
sequence is:

1. **done locally, not applied** — the remaining redesign call site is corrected.
   Gated `20260720100000` is retired as a no-op tombstone and new gated
   `20260722160000` adds a service_role-only replacement authorized on an
   explicit requesting-user id. Both are unapplied;
2. apply `20260722160000` under explicit authority and the per-mutation
   protocol;
3. deploy and production-verify the moved redesign reader under explicit
   authority;
4. only then author and apply the CONTRACT drop of the deployed 7-argument
   `resolve_import_guest_identity`, after a fresh zero-caller re-sweep;
5. separately authorize and apply contraction migration `20260722012707` only
   after reader verification; and
6. run a fresh closure audit before any Step 4.4 assignment.

## Known blockers

| ID | Requirement | Current status | Blocking |
|---|---|---|---|
| ID-READER-CLIENT | `createOrReuseGuestPlayerByPersonalName` must not call the revoked RPC as `authenticated` | **Resolved LOCALLY 2026-07-22; migration unapplied, reader undeployed.** Gated `20260720100000` retired as a no-op tombstone, so its `authenticated` re-grant can never be applied. New gated `20260722160000` adds service_role-only `create_or_reuse_guest_identity`, authorized on an explicit server-verified `p_requesting_user_id` and writing no import alias; both non-import call paths moved to the admin client. Executably proven on a disposable cluster. See `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CLIENT-EXPAND-BUILT-LOCAL.md` | Redesign deploy |
| ID-READER-CONTRACT | Drop the deployed 7-argument `resolve_import_guest_identity` | Not authored, not authorized. The expand half is additive and leaves the function in place; the drop is valid only after `20260722160000` is applied, the moved reader is deployed and production-verified, and a fresh zero-caller re-sweep passes | Step 4.3 closure |
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
