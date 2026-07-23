# Phase 4 Step 4.3 - ID-READER-CLIENT independent audit trail

Evidence class: [PRIOR]. Both audits were conducted read-only by fresh independent sessions that were explicitly forbidden from writing to this repository. Their full reports were therefore never committed and exist only in the owner's session record. This document records their targets, verdicts, findings, and cleared properties so the repository can answer what was audited and what was found. It is not a substitute for the reports and does not reproduce their evidence.

## Audit 1 - full independent audit

Target commit: 7a1f11eca. Scope: twelve questions covering the non-import guest identity expand work - the new service_role-only function, the retirement of gated migration 20260720100000, and the move of both non-import call paths.

Verdict: FAIL.

Findings:

- FINDING-1, HIGH. The candidate-counting query filtered out players with a non-null linked_user_id; the auto-selection query below it did not. Counting could report one candidate while selection drew from a larger set and chose a claimed player, which the revalidation then rejected with P0002. Deterministic, with no recovery path exposed to the user, for any personal name shared by an unlinked guest and an already-claimed player in the same group. Reproduced on a disposable cluster. Inherited verbatim from the deployed predecessor and therefore not a regression, but newly created here and covered by no assertion.
- FINDING-2, LOW. The requesting-user argument was declared with a default, diverging from the four applied source-bound gateways where the equivalent argument is required. Fail-closed, but an omitted argument produced a runtime authorization failure rather than a signature error, and a probe showed the explicit null-guard clause was not independently load-bearing.
- FINDING-3, LOW. The recorded release sequence omitted the rollback SQL for the expand step and the apply-time ledger bookkeeping step, both of which a session executing that step would otherwise have to derive from context.
- FINDING-4, MODERATE, pre-existing and out of scope. A typed personal name can survive into a draft snapshot and hydration payload when a manually added player's seat is removed without pruning the records keyed by that reference. Untouched by the work under audit; reachability inferred rather than executed. Tracked as DRAFT-NAME-RESIDUE.

Cleared by this audit, against that commit: authorization enforced on every path reaching a write; no client-supplied value able to reach the requesting-user argument; no player_import_aliases row written on any branch; the migration additive, repeat-safe, and free of order dependence; the grant model service_role only with PUBLIC removed; the retired tombstone genuinely inert; privacy and neutral-label guarantees intact; ledger registration and hazard classification consistent in both directions; and the expand/contract ordering correct.

Method: seven mutation probes constructed by the auditor, run on disposable clusters, each reverted with reversion proven.

## Audit 2 - targeted re-audit

Target commit: 60300532f. Range audited: 7a1f11eca..60300532f. Scope: nine questions, with the FINDING-2 signature change as the primary target, because changing a function's signature changes its identity and every surface naming it had to follow.

Verdict: FAIL.

Findings:

- FINDING A, MEDIUM. An active, published handoff still stated the superseded signature in the present tense with no supersession notice, while its sibling design document had received both an in-place correction and a dated authority notice. Consequence: a session authoring the contraction drop or a rollback from that document would emit a drop statement naming a signature that does not exist, which succeeds silently against nothing - the function survives while the session records it as dropped.
- FINDING B, LOW. The release sequence's sub-headings retained their pre-renumbering labels and its rollback-validity cross-reference pointed at the step being performed rather than the next one.
- FINDING C, LOW, coverage. The multiple-candidate rejection was asserted nowhere: a mutation auto-selecting whenever the candidate count was one or more left the harness green.
- FINDING D, LOW, coverage, privacy-adjacent. The revalidation's unlinked-only restriction was asserted nowhere: a mutation removing it left the harness green, and the function would return a claimed player's id and public name labelled as an existing unlinked guest. Latent, because neither call site passes an explicit selection.

Also established, and recorded separately as GUEST-NAME-COLLISION-TERMINAL: the multiple-match rejection is terminal for both product paths, because neither call site offers a disambiguation UI and both pass a null explicit selection. A user whose personal name collides with two or more unlinked guests in the same group can never add that roster entry. Inherited from the deployed resolver, not introduced here. The natural fix is a disambiguation UI, which would pass an explicit selection and thereby activate the path FINDING D guards - so FINDING D's assertion must be in place before any such UI ships.

Cleared by this audit: every executable surface followed the signature change, specifically the create statement, all three revokes, the grant, the comment, both harness call sites, the regprocedure-qualified assertions, the TypeScript RPC argument names, the recorded rollback SQL, and the migration ledger map; exactly one overload exists with no stale sibling; the default PUBLIC EXECUTE is removed from the current signature and that removal is load-bearing; the candidate predicate is genuinely single-sourced rather than duplicated; all four candidate cases behave correctly and none silently creates a duplicate or links a claimed player; the required argument is fail-closed when omitted, null, or naming a non-member; nothing cleared by Audit 1 was disturbed; and the rollback SQL and ledger bookkeeping added for FINDING-3 are correct and sufficient.

Method: nine mutation probes constructed independently by the auditor without reliance on any previously recorded mutation test, run on disposable clusters, with byte-identity of the working tree proven by tree hash after every probe.

## Where each finding was answered

Audit 1 findings 1 through 3 were remediated on fix/id-reader-candidate-predicate and merged as 07a81c19e. Audit 2 findings A through D were remediated on fix/id-reader-coverage-and-signature-records. FINDING-4 is recorded as DRAFT-NAME-RESIDUE and is not fixed. The terminal multiple-match state is recorded as GUEST-NAME-COLLISION-TERMINAL and is not fixed.

## What neither audit could reach

Neither audit was authorized to read production. Every statement either made about a currently deployed definition, ACL, or row is [PRIOR] or [UNVERIFIED]. In particular, the recorded discrepancy over whether service_role holds EXECUTE on the deployed seven-argument resolver remains unsettled and requires an authorized production ACL read, which the recorded decision makes a precondition of the contraction step.

Neither audit covered the recorded harness coverage gap on the coarsened matcher, which is owner-gated and remains open: a regression re-widening the disclosed match reason or score, or removing the candidate-input bound, would pass the executable harness clean.
