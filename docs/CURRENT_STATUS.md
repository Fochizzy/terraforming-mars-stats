# TM Stats Current Status

Last updated: 2026-07-23

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
- The independent audit's **FAIL** on the `ID-READER-CLIENT` expand work is
  answered. `FINDING-1` (the divergent candidate-counting and auto-selection
  predicates) and `FINDING-2` (`p_requesting_user_id` declared last and
  defaulted) are remediated, executably proven, and **merged** into
  `redesign/tm-stats-dashboard-rebuild` on 2026-07-23. `FINDING-4` /
  `DRAFT-NAME-RESIDUE` remains open and untouched.

## In progress

- No product implementation, migration, deployment, or production operation is
  currently authorized by this status document.
- Authoritative branch: `redesign/tm-stats-dashboard-rebuild`.
- The compatible source-bound redesign reader is not deployed.
- Migration `20260722160000` remains **gated and unapplied**; merging the
  remediation changed neither fact.
- **Known harness coverage gap, open and deliberately not fixed.**
  `supabase/tests/executable/match-oracle-post-contraction.sql` is referenced by
  nothing, so the coarsened `match_import_player_names` disclosure and its
  candidate-input bound are asserted nowhere: a regression re-widening the
  disclosed `match_reason` / `match_score`, or removing the input bound, would
  pass `run.sh` clean. The previously recorded reason for excluding
  `20260720120000` from the replay was **refuted** by measurement. Evidence class
  **[PRIOR]** — measured in
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md` §4,
  not re-verified since. The closure audit must account for it; wiring the file
  in requires separate authorization. Full record in `docs/REDESIGN_STATE.md`.
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

1. **done locally and merged, not applied** — the remaining redesign call site is
   corrected. Gated `20260720100000` is retired as a no-op tombstone and new
   gated `20260722160000` adds a service_role-only replacement authorized on an
   explicit requesting-user id. Both are unapplied. The remediation answering the
   audit FAIL is merged into `redesign/tm-stats-dashboard-rebuild` as of
   2026-07-23;
2. **next: a targeted re-audit of the remediated work, before the expand gate.**
   The prior independent audit returned FAIL; its `FINDING-1` and `FINDING-2`
   remediations have not themselves been independently audited. This re-audit is
   not authorized by this document and needs its own explicit assignment. It must
   account for the recorded harness coverage gap above: `run.sh` exit 0 does not
   cover the coarsened `match_import_player_names` disclosure or its
   candidate-input bound;
3. apply `20260722160000` under explicit authority and the per-mutation
   protocol. Two preconditions a session executing this step must not have to
   derive from context:

   **2a. Rollback SQL for the expand step.** The migration creates exactly one
   object, so its reversal is a single statement:

   ```sql
   drop function if exists public.create_or_reuse_guest_identity(
     uuid, uuid, text, text, text, text, uuid, boolean
   );
   ```

   Nothing else references it: it is new and additive, and the deployed
   7-argument `resolve_import_guest_identity` is left untouched. This rollback
   is valid only in the window between applying the migration and deploying the
   moved reader (item 3 below). Once that reader is live it depends on this
   function, and reversal becomes a deploy rollback rather than a migration
   rollback.

   **2b. Apply-time ledger bookkeeping.** The apply tool stamps the UTC apply
   time over the filename version, so this file will almost certainly NOT land
   as ledger `20260722160000`. Five recent applies on this lineage already
   drifted that way — `20260722012658` landed as `20260722132159`,
   `20260720120000` as `20260722144034`. Version is the wrong join key for a
   renamed apply; the pairing is by NAME. Immediately after the apply, in the
   same session:

   - read the ledger version the apply actually produced;
   - register the pairing under the key
     `add_non_import_guest_identity_creator` in
     `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME`, and add the
     file-to-ledger entry to `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION`, both in
     `src/lib/db/migration-ledger-map.ts`;
   - remove `20260722160000` from `GATED_UNAPPLIED` in the same file;
   - re-attest the production ledger (entry count and head) and record the
     result on the canonical `DEPLOY-STATE.md`;
   - run `npx.cmd vitest run src/lib/db/migration-ledger-map.test.ts`.
4. deploy and production-verify the moved redesign reader under explicit
   authority;
5. only then author and apply the CONTRACT drop of the deployed 7-argument
   `resolve_import_guest_identity`, after a fresh zero-caller re-sweep;
6. separately authorize and apply contraction migration `20260722012707` only
   after reader verification; and
7. run a fresh closure audit before any Step 4.4 assignment.

## Known blockers

| ID | Requirement | Current status | Blocking |
|---|---|---|---|
| ID-READER-CLIENT | `createOrReuseGuestPlayerByPersonalName` must not call the revoked RPC as `authenticated` | **Resolved LOCALLY 2026-07-22, remediated after an independent audit returned FAIL, and MERGED into `redesign/tm-stats-dashboard-rebuild` on 2026-07-23; migration still unapplied, reader still undeployed. Not independently re-audited since the remediation.** Gated `20260720100000` retired as a no-op tombstone, so its `authenticated` re-grant can never be applied. New gated `20260722160000` adds service_role-only `create_or_reuse_guest_identity`, authorized on an explicit server-verified `p_requesting_user_id` and writing no import alias; both non-import call paths moved to the admin client. The audit's HIGH finding — the candidate-counting and auto-selection predicates disagreed about claimed players, so a same-name collision could auto-select a claimed player and fail with `P0002` — was reproduced and fixed in the unapplied file: the predicate is now evaluated once into `v_candidate_ids` and both uses derive from it. `p_requesting_user_id` was also made required, matching the four applied gateways. Executably proven and mutation-proven on a disposable cluster. **Closed out 2026-07-23**: probe P1 was re-run against the tightened clause 8b it had never been re-run against and still fails there with `P0002` (harness exit 3), so the remediation is proven at the current file state, not merely at the state the probe was originally run against. See `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md` and `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md` | Redesign deploy |
| ID-READER-CONTRACT | Drop the deployed 7-argument `resolve_import_guest_identity` | Not authored, not authorized. The expand half is additive and leaves the function in place; the drop is valid only after `20260722160000` is applied, the moved reader is deployed and production-verified, and a fresh zero-caller re-sweep passes | Step 4.3 closure |
| ID-READER-DEPLOY | Compatible source-bound reader must be deployed and production-verified | Not authorized or deployed | Legacy contraction |
| ID-LEGACY-ORACLE | Retire authenticated execution of `match_import_player_names` with migration `20260722012707` | Gated and unapplied; interim coarsening remains live | Step 4.3 closure |
| STEP-4.3-AUDIT | Fresh independent closure audit | Not completed after the current production boundary. It must also account for the recorded harness coverage gap: `run.sh` exit 0 does not cover the coarsened `match_import_player_names` disclosure or its candidate-input bound. A targeted re-audit of the merged `ID-READER-CLIENT` remediation is the evidenced next step and is separately unauthorized | Step 4.3 closure |
| STEP-4.4 | Explicit assignment for final review, finalization, and draft safety | Not authorized | Step 4.4 start |
| DRAFT-NAME-RESIDUE | A typed personal name must not survive into a Log-a-Game draft snapshot or its hydration payload after the seat that introduced it is removed | **Recorded, NOT fixed and NOT investigated.** Independent-audit FINDING-4, pre-existing and untouched by the ID-READER-CLIENT work: removing a manually added player's seat may leave records keyed by that seat's reference unpruned, so a typed first/last name could persist in the stored draft and be returned on hydration. This would breach the "private names must be excluded from payloads, not merely hidden" rule in `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`. **End-to-end reachability is INFERRED, not executed** — no failing test, captured payload, or stored draft was produced, so severity is unconfirmed. It lives in the wizard/draft subsystem, not the identity RPCs, and needs its own scoped assignment; it must not be fixed inside an identity task. See `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md` | Nothing today |

## Important repository and production evidence

- Full state: `docs/REDESIGN_STATE.md`
- Current phase contract: `docs/redesign/phases/04-log-a-game.md`
- Current production apply record:
  `docs/agent-handoffs/GUEST-IDENTITY-ORACLE-REVOKE-APPLY.md`
- Source-bound local implementation:
  `docs/agent-handoffs/PHASE-04-STEP-03-IMPORT-IDENTITY-SOURCE-BOUND-MATCHING-IMPLEMENTED-LOCAL.md`
- Latest remediation:
  `docs/agent-handoffs/PHASE-04-STEP-03-IMPORT-IDENTITY-MATCHING-REGRESSION-REMEDIATION.md`
- `ID-READER-CLIENT` audit remediation, its closeout, and the integration that
  merged them onto this branch:
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md`,
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md`,
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-INTEGRATION.md`
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
