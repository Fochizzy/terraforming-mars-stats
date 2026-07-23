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

**The EXPAND step is applied.** Migration `20260722160000` was applied to
production on 2026-07-23 as ledger `20260723082917`. **`ID-READER-DEPLOY` is now
the active gate** — the moved reader is still undeployed and nothing in
production calls the new function.

## Current objective

Preserve the source-bound import-identity design and close the remaining
release sequence safely: deploy and verify the compatible reader only under a
new explicit assignment, then drop the deployed 7-argument resolver, and apply
the legacy-matcher contraction only after its separate gate is authorized. The
expand half of that sequence is done; every remaining step is still gated.

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
- **Production applied `add_non_import_guest_identity_creator` as ledger version
  `20260723082917` from repository migration `20260722160000` on 2026-07-23 at
  08:29:17Z** — the EXPAND half of the `ID-READER-CLIENT` repair, and the first
  schema-affecting production write of the redesign effort. **No deploy of any
  kind accompanied it.** Verified read-only immediately afterwards: exactly one
  overload of `public.create_or_reuse_guest_identity` exists, and its ACL is
  `{postgres=X/postgres,service_role=X/postgres}` — no `authenticated`, no
  `anon`, and no surviving `PUBLIC` grant. It dropped, altered and revoked
  nothing pre-existing; the deployed 7-argument `resolve_import_guest_identity`
  is untouched. Record:
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-EXPAND-APPLIED.md`.
- Production ledger attestation is now **115 entries with head `20260723082917
  add_non_import_guest_identity_creator`**, and **these values were read live**
  by the applying session, both before and after the apply. The pre-apply read
  returned 114 with head `20260723014849`, **confirming the 2026-07-23
  transcribed reconciliation below was correct** and that production had not
  moved in between. Exactly one ledger entry was added.
- The prior attestation was **114 entries with head `20260723014849
  repair_snapshot_player_ids`**, reconciled on 2026-07-23. Production applied
  that migration ~01:48Z on 2026-07-23 as the data half of the live-site
  saved-game player-label release, and for one day this lineage held **no
  record of it in any form** — no file, no ledger-map entry, no documentation
  row — while the attestation still read 113 with head `20260722153233`. The
  drift is closed: `20260723014849` is registered **production-only** with
  provenance, deliberately without carrying its file, because it defines no
  database object and so leaves no stale definition here for a redesign deploy
  or `db diff` to reproduce. That is the condition the ledger #106 carry existed
  to fix, and it is absent. Derived hazard would be `neutral`; a production-only
  entry carries no declaration. **The attested values were not read from
  production by the reconciling session** — they are transcribed from the
  canonical `DEPLOY-STATE.md` on the production lineage, where an authorized
  session recorded two independent live reads on 2026-07-23. Re-attest live
  before any production-sensitive action.
- **The expand apply of `20260722160000` had its ledger precondition satisfied
  by that reconciliation, and the apply has since been authorized and performed**
  (see the entry above). The precondition required the attested ledger to match
  production, and it was false by exactly one migration; a worker session
  stopped on it. The live pre-apply read then confirmed the reconciliation exact.
- The independent audit's **FAIL** on the `ID-READER-CLIENT` expand work is
  answered. `FINDING-1` (the divergent candidate-counting and auto-selection
  predicates) and `FINDING-2` (`p_requesting_user_id` declared last and
  defaulted) are remediated, executably proven, and **merged** into
  `redesign/tm-stats-dashboard-rebuild` on 2026-07-23. `FINDING-4` /
  `DRAFT-NAME-RESIDUE` remains open and untouched.
- A **targeted re-audit** of that merged remediation was run on 2026-07-23 and
  returned **FAIL** on one MEDIUM documentation defect and three LOW items. It
  found the SQL and TypeScript remediation itself correct and complete. All four
  findings are now addressed and the FAIL is answered; two of them were proven
  vacuous test gaps and now carry mutation-proven assertions. The re-audit left
  no handoff in this repository — its verdict reached the follow-up session as
  the assignment text, and every defect was independently re-derived from code
  before being corrected. `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-COVERAGE-AND-SIGNATURE-RECORDS.md`
  is the record.
- **Both independent audits are now on the repository record.** Both were
  read-only and forbidden from writing to the repository they audited, so
  neither report was ever committed and their findings survived only indirectly
  through the remediation handoffs.
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-INDEPENDENT-AUDIT-TRAIL.md`
  records each audit's target, verdict, findings, cleared properties, and stated
  limits, so the closure audit can establish what was independently audited and
  what was cleared. Evidence class **[PRIOR]** — it records the audits rather
  than re-proving them, and changes no finding's disposition.

## In progress

- No product implementation, migration, deployment, or production operation is
  currently authorized by this status document.
- Authoritative branch: `redesign/tm-stats-dashboard-rebuild`.
- The compatible source-bound redesign reader is **not deployed**. This is now
  the active gate, `ID-READER-DEPLOY`, and it requires a new explicit
  assignment.
- Migration `20260722160000` is **APPLIED** (ledger `20260723082917`,
  2026-07-23). Applying it authorized nothing further: it did not authorize the
  reader deploy, the `ID-READER-CONTRACT` drop, or contraction `20260722012707`.
  Nothing in production calls the function it added.
- **The production ACL read on `resolve_import_guest_identity` is outstanding.**
  It is the stated precondition of the CONTRACT step and was deliberately **not**
  performed by the expand session, which held no authorization for it.
- `GATED_UNAPPLIED` now holds **five** entries; `20260722160000` left it on
  2026-07-23 and is recorded as renamed drift instead.
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
2. **done 2026-07-23 — the targeted re-audit of the remediated work ran before
   the expand gate and returned FAIL.** It confirmed the SQL and TypeScript
   remediation of `FINDING-1` and `FINDING-2` correct and complete, and failed on
   one MEDIUM documentation defect (an active handoff stating a function
   signature that does not exist) plus three LOW items (release-sequence
   numbering, and two branches asserted nowhere). All four are addressed; the
   two coverage gaps now carry assertions proven to fail under the exact
   mutations that previously left the harness at exit 0. The recorded harness
   coverage gap above is **unchanged and still open** — `run.sh` exit 0 still
   does not cover the coarsened `match_import_player_names` disclosure or its
   candidate-input bound, and wiring that in was deliberately not done;
3. **DONE 2026-07-23 — `20260722160000` was applied** under explicit
   single-mutation authority and the per-mutation protocol, landing as ledger
   `20260723082917`. Pre-apply ledger 114 / `20260723014849`, post-apply 115.
   Exactly one entry added, exactly one overload created, ACL verified
   `{postgres,service_role}` only. The apply-time bookkeeping in 3b below was
   completed in the same session. **No deploy occurred**, and no second
   production statement was issued. The two notes below are retained because
   they remain live operational facts, not because the step is outstanding:

   **3a. Rollback SQL for the expand step.** The migration creates exactly one
   object, so its reversal is a single statement:

   ```sql
   drop function if exists public.create_or_reuse_guest_identity(
     uuid, uuid, text, text, text, text, uuid, boolean
   );
   ```

   Nothing else references it: it is new and additive, and the deployed
   7-argument `resolve_import_guest_identity` is left untouched. This rollback
   is valid only in the window between applying the migration and deploying the
   moved reader (item 4 below). Once that reader is live it depends on this
   function, and reversal becomes a deploy rollback rather than a migration
   rollback.

   **3b. Apply-time ledger bookkeeping — COMPLETED 2026-07-23.** The apply tool
   stamped the UTC apply time over the filename version, exactly as predicted:
   the file landed as ledger `20260723082917`, **not** `20260722160000`. Version
   is the wrong join key for a renamed apply; the pairing is by NAME. All of the
   following were done in the applying session:

   - read the ledger version the apply actually produced — `20260723082917`;
   - registered the pairing under the key
     `add_non_import_guest_identity_creator` in
     `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME`, and the file-to-ledger
     entry in `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION`, both in
     `src/lib/db/migration-ledger-map.ts`;
   - removed `20260722160000` from `GATED_UNAPPLIED` in the same file;
   - re-attested the production ledger live (115 entries, head
     `20260723082917`) and recorded it on the canonical `DEPLOY-STATE.md`;
   - ran `npx.cmd vitest run src/lib/db/migration-ledger-map.test.ts` — passing.
4. **ACTIVE GATE — `ID-READER-DEPLOY`.** Deploy and production-verify the moved
   redesign reader under explicit authority. Not authorized; not started;
   **applying the expand did not authorize it**;
5. only then author and apply the CONTRACT drop of the deployed 7-argument
   `resolve_import_guest_identity`, after a fresh zero-caller re-sweep. **Its
   precondition — a production ACL read on that resolver — is outstanding and
   was deliberately not performed by the expand session**;
6. separately authorize and apply contraction migration `20260722012707` only
   after reader verification; and
7. run a fresh closure audit before any Step 4.4 assignment.

### Note (2026-07-23): steps 4–6 span TWO distinct expand/contract pairs

Recorded as a clarification. The sequence above is **not** restructured,
renumbered, or relaxed. "Deploy and verify the compatible reader" has been used
across this project's records for two different gates:

- **the guest-identity pair** — expand `20260722160000` (applied, ledger
  `20260723082917`), whose contraction is step 5, the **drop of the deployed
  7-argument `resolve_import_guest_identity`**; and
- **the matcher pair** — expand `20260722012658` (applied, ledger
  `20260722132159`), whose contraction is step 6, **migration
  `20260722012707`**.

They share step 4's reader-deploy gate but have different contractions and
different supporting evidence. Satisfying one does not satisfy the other. The
full comparison, with evidence, is in
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md` →
"'Deploy and verify the compatible reader' names TWO different gates".

**Step 6 is genuinely deploy-gated, and this is evidenced [GIT]/[REPO].** At
production source commit `865df0108f2f7b9df000ad3aeb8fcd394e6242a5`,
`src/lib/db/import-player-resolution-repo.ts:223` calls
`supabase.rpc('match_import_player_names', …)` through
`createSupabaseServerClient()`, which `src/lib/supabase/server.ts:5` builds from
`@supabase/ssr` with the publishable key and the request cookies — a
user-session client, so a signed-in caller executes as **`authenticated`**.
Migration `20260722012707` revokes exactly that grant. Applying it against the
current deployment would break live import matching.

**Step 5's reader dependency is, by contrast, currently unsupported by any
found caller — and the precondition is left standing anyway.** See the
`ID-READER-CONTRACT` blocker row below and the pending owner decision
registered under "Pending owner decisions".

## Known blockers

| ID | Requirement | Current status | Blocking |
|---|---|---|---|
| ID-READER-CLIENT | `createOrReuseGuestPlayerByPersonalName` must not call the revoked RPC as `authenticated` | **Resolved LOCALLY 2026-07-22, remediated after an independent audit returned FAIL, and MERGED into `redesign/tm-stats-dashboard-rebuild` on 2026-07-23; **migration APPLIED 2026-07-23 as ledger `20260723082917`, reader still undeployed**. Re-audited 2026-07-23: the targeted re-audit found the SQL and TypeScript remediation correct and complete and returned FAIL on documentation and coverage only; all four of its findings are addressed and its FAIL is answered.** Gated `20260720100000` retired as a no-op tombstone, so its `authenticated` re-grant can never be applied. New gated `20260722160000` adds service_role-only `create_or_reuse_guest_identity`, authorized on an explicit server-verified `p_requesting_user_id` and writing no import alias; both non-import call paths moved to the admin client. The audit's HIGH finding — the candidate-counting and auto-selection predicates disagreed about claimed players, so a same-name collision could auto-select a claimed player and fail with `P0002` — was reproduced and fixed in the unapplied file: the predicate is now evaluated once into `v_candidate_ids` and both uses derive from it. `p_requesting_user_id` was also made required, matching the four applied gateways. Executably proven and mutation-proven on a disposable cluster. **Closed out 2026-07-23**: probe P1 was re-run against the tightened clause 8b it had never been re-run against and still fails there with `P0002` (harness exit 3), so the remediation is proven at the current file state, not merely at the state the probe was originally run against. See `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md` and `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md` | Redesign deploy |
| ID-READER-CONTRACT | Drop the deployed 7-argument `resolve_import_guest_identity` | Not authored, not authorized. The expand half is applied (ledger `20260723082917`) and is additive, so the function is still in place. The drop is valid only after the moved reader is deployed and production-verified and a fresh zero-caller re-sweep passes. **Its stated precondition — a production ACL read on `resolve_import_guest_identity` — is OUTSTANDING**: the expand session was explicitly forbidden from making that read and did not make it. **Finding recorded 2026-07-23, disposition UNCHANGED: no reader on any lineage was found that calls this function.** Swept at production source commit `865df0108f2f7b9df000ad3aeb8fcd394e6242a5` (zero `src/` occurrences; the only hits are `DEPLOY-STATE.md` prose), at rollback target `d12e33ad0` (zero `src/` occurrences), and at `redesign/…` `44eed2e21` (comments, the ledger map, and a test asserting the RPC is **not** called). Positive control on the same commit finds `.rpc(` in fourteen `src/` files and finds `match_import_player_names`, so the absence is real, not a broken search [GIT]. **The sweep does NOT cover** database-internal callers since the expand landed, edge functions as deployed, consumers outside this repository, or whether the swept commit is what production actually serves (that commit is **[PRIOR]** from the canonical ledger; the authenticated `/api/deploy-info` confirmation is itself recorded there as outstanding). **"No caller was found" is not "the drop is safe": the reader-deploy precondition is NOT relaxed and remains in force.** Changing it is an owner decision and has not been made — see "Pending owner decisions". Two preconditions are real regardless of that decision: the authorized production ACL and signature read above, and a fresh production-side catalog sweep for database-internal callers. Detail: `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` | Step 4.3 closure |
| ID-READER-DEPLOY | Compatible source-bound reader must be deployed and production-verified | **ACTIVE GATE as of 2026-07-23.** Not authorized or deployed. The database side is now ready — `create_or_reuse_guest_identity` exists and is `service_role`-only — but nothing in production calls it, and applying the expand granted no deploy authority | Legacy contraction |
| ID-LEGACY-ORACLE | Retire authenticated execution of `match_import_player_names` with migration `20260722012707` | Gated and unapplied; interim coarsening remains live | Step 4.3 closure |
| STEP-4.3-AUDIT | Fresh independent closure audit | Not completed after the current production boundary. It must also account for the recorded harness coverage gap: `run.sh` exit 0 does not cover the coarsened `match_import_player_names` disclosure or its candidate-input bound. A targeted re-audit of the merged `ID-READER-CLIENT` remediation is the evidenced next step and is separately unauthorized | Step 4.3 closure |
| STEP-4.4 | Explicit assignment for final review, finalization, and draft safety | Not authorized | Step 4.4 start |
| GUEST-NAME-COLLISION-TERMINAL | A user must be able to add a roster entry whose typed first/last name matches two or more unlinked guests already in the group | **Recorded 2026-07-23, NOT fixed. Inherited, not introduced.** When two or more UNLINKED players in a group carry the same normalized personal name, `create_or_reuse_guest_identity` raises `P0003` ("Multiple guest identities match. Select one explicitly.") and there is no way to satisfy it: the sole call site `createOrReuseGuestPlayerByPersonalName` (`src/lib/db/import-player-identity-repo.ts:118`) hard-codes `p_selected_player_id: null` and accepts no selection from its callers, and neither product path — `/group/players` (`src/app/(app)/group/players/page.tsx:31`) nor the Log-a-Game manual-entry resolver (`src/lib/db/log-game-player-resolution.ts:84`) — offers a disambiguation UI. No code in `src/` handles `P0003`, so it falls through `throw error` as a raw database failure. The state is therefore **terminal**: that roster entry can never be added [REPO]. It is inherited from the deployed resolver this function is derived from and is not a regression introduced by the `ID-READER-CLIENT` work. Reachable because the personal-name index is NON-unique per group (`20260718050924:111-113`) and personal_name is the only mode either non-import path uses. **Coupled to the coverage added on 2026-07-23**: the natural fix is a disambiguation UI, which would pass an explicit `p_selected_player_id` and thereby activate the revalidation path that section 11 of `non-import-guest-identity-after.sql` guards — the clause stopping an explicitly selected CLAIMED player from being returned as `existing_unlinked_guest`. That assertion must remain in place before any such UI ships. Fixing this is a product decision needing its own assignment; see `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-COVERAGE-AND-SIGNATURE-RECORDS.md`. **Classification CONTESTED as of 2026-07-23, and deliberately NOT changed here.** The phase contract's Step 4.3 scope requires that the importer be able to "select an existing unlinked guest" and "resolve an ambiguous match explicitly", and the terminal `P0003` state makes neither possible — which reads as a contract non-conformance against the "Blocking" value in this row. Whether it is one is an owner adjudication; registered as **PD-3** under "Pending owner decisions", where it interacts with **PD-2** | Nothing today; user-facing dead end |
| DRAFT-NAME-RESIDUE | A typed personal name must not survive into a Log-a-Game draft snapshot or its hydration payload after the seat that introduced it is removed | **Recorded, NOT fixed and NOT investigated.** Independent-audit FINDING-4, pre-existing and untouched by the ID-READER-CLIENT work: removing a manually added player's seat may leave records keyed by that seat's reference unpruned, so a typed first/last name could persist in the stored draft and be returned on hydration. This would breach the "private names must be excluded from payloads, not merely hidden" rule in `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`. **End-to-end reachability is INFERRED, not executed** — no failing test, captured payload, or stored draft was produced, so severity is unconfirmed. It lives in the wizard/draft subsystem, not the identity RPCs, and needs its own scoped assignment; it must not be fixed inside an identity task. See `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md` | Nothing today |

## Pending owner decisions

Registered 2026-07-23 by a documentation-only reconciliation. Each is stated
neutrally: what is established, what is not, and who must decide. **None is
resolved here, none is recommended, and none authorizes work.** They are
decisions, not blockers, and no blocker's disposition was changed to record
them.

### PD-1 — Build the three-argument `match_import_player_names` overload, or not?

**Established [PROJECT-DOC].** `docs/redesign/DECISIONS.md` §"Phase 4 Step 4.3 -
AMENDMENT: interim service-role re-gate of the import matcher" records an
explicit owner decision of 2026-07-22 adopting a 3-argument overload that takes
an explicit requesting-user id, derives both the authorization gate and the
candidate pool from it instead of `auth.uid()`, and is granted to `service_role`
only; both live call sites move to the server-side admin client, after which the
2-argument overload's `authenticated` grant is revoked. Its stated purpose is to
unblock the contraction "without first designing a replacement for the
manual-entry path". That same entry states it "Defines the design; does not
authorize implementation."

**Established [REPO].** No such overload exists. Every
`create or replace function public.match_import_player_names(` in
`supabase/migrations/` — on this branch and on every other local and remote ref
checked — declares the 2-argument `(p_group_id uuid, p_imported_names text[])`
signature, in `20260720120000` only. No migration anywhere in the repository
creates a 3-argument overload.

**Not established.** Why it does not exist. Two possibilities were examined and
could **not** be distinguished from the repository record:

1. the amendment was **superseded** by later work without any record being
   written; or
2. it was **adopted and simply never built**.

The decision text's own "does not authorize implementation" clause is
consistent with (2), but it is not proof of it, and no evidence for (1) was
found either. **This is an inference boundary, not a conclusion.**

**Decision required of the owner.** Whether to build the overload, retire the
amendment, or leave it dormant. **`docs/redesign/DECISIONS.md` was deliberately
not edited**: recording an implementation-status question about a decision is
not the same as amending the decision, and amending it is the owner's act.

### PD-2 — May Step 4.3 close with `ID-LEGACY-ORACLE` still open?

**Established [PROJECT-DOC].** The phase contract
`docs/redesign/phases/04-log-a-game.md` states exactly one closure criterion for
this step — "Step 4.3 is closed only after a fresh independent read-only audit
passes" — and mentions no deployment, no migration, and no contraction as a
condition of closure.

**Established [PROJECT-DOC].** The state files list `ID-LEGACY-ORACLE` (retire
authenticated execution of `match_import_player_names` via `20260722012707`) in
the "Blocking: Step 4.3 closure" column of the blocker table above, and
`docs/REDESIGN_STATE.md` carries the same ordering.

**Established [PROJECT-DOC].** `docs/AUTHORITATIVE_DOCUMENTS.md` ranks
`docs/CURRENT_STATUS.md` and `docs/REDESIGN_STATE.md` **above** the assigned
phase file (positions 2 and 3 of its authority order). The phase contract
therefore does **not** simply win this conflict on authority grounds.

**Not established.** Which reading governs. The documents genuinely do not
resolve it: the higher-ranked documents add a closure condition the phase
contract does not state, and nothing in the record says whether that addition
was intended to amend the contract or merely to sequence the work.

**Decision required of the owner**, before any closure audit is commissioned —
because the audit's scope depends on the answer.

### PD-3 — Is `GUEST-NAME-COLLISION-TERMINAL` a Step 4.3 contract non-conformance?

**Established [PROJECT-DOC].** The phase contract's "Step 4.3 guest identity
scope" requires that Step 4.3 allow the importer to "select an existing unlinked
guest" and to "resolve an ambiguous match explicitly".

**Established [REPO], as already recorded in the blocker row.** In the terminal
`P0003` state, neither is possible: the sole call site hard-codes
`p_selected_player_id: null` and accepts no selection, neither product path
offers a disambiguation UI, and no code in `src/` handles `P0003`.

**The tension.** Those two facts read together suggest a contract
non-conformance, while the blocker is currently classified as blocking
**"Nothing today; user-facing dead end"**.

**Recorded as CONTESTED. The blocker is NOT reclassified here**, and its
disposition, its "Blocking" value, and its recorded coupling to the
`non-import-guest-identity-after.sql` §11 assertion are all unchanged.
Reclassification would change what gates Step 4.3 closure, which is
**the owner's adjudication**, taken together with PD-2 — the two interact,
because both turn on what Step 4.3 must satisfy before it may close.

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
