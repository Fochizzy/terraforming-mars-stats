# Phase 4, Step 4.3 - Pre-Remediation State Reconciliation

## Status

**BLOCKED.** Step 4.3 is not closed. Step 4.4 is **NOT STARTED** and must not
begin under this handoff.

## Purpose

Reconcile the redesign lineage's current-state documentation with the locally
integrated tree and the production facts established by prior independent
read-only sessions. This is documentation-only preparation for the approved
import-identity remediation. It does not authorize the remediation build or
any production action.

This handoff supersedes stale **current-state** claims in older handoffs without
altering their historical record.

## Evidence hierarchy

Use evidence in this order:

1. live system evidence
2. provider evidence
3. local Git graph and tracked tree
4. documentation

Production facts in this handoff are **last independently verified
2026-07-21 and must be re-read live before any production-sensitive action**.
This reconciliation did not access production and did not re-derive those
facts.

## Local repository state

- **Evidence class: local Git.** Branch:
  redesign/tm-stats-dashboard-rebuild.
- **Evidence class: local Git.** Preflight starting HEAD:
  5597817fc6790fa4831ff968629ff49c81f16705 (docs(decisions): record import
  identity classification and source-bound matching design).
- **Evidence class: local Git metadata.** Concurrent commit
  572c88c11779146dcef5c86bc9cf71298e47f91b (chore: ignore .codex,
  test-results, and loose zip archives) landed after preflight and became
  the immediate pre-commit parent of this task commit.
- No tracked uncommitted changes existed at start. The expected untracked
  .codex/, test-results/, and loose .zip paths appeared in the preflight
  status and stopped appearing after that concurrent ignore commit. This
  task did not read, modify, stage, or clean those paths.

## Integrated commit and merge matrix

| Work | Implementation evidence | Integration evidence | Current result |
| --- | --- | --- | --- |
| WS1 Layer A: bidirectional ledger gate and hazard classification | 850953cc8; hazard correction 2c583a7a3 | merge 4160eb565 | integrated |
| Ledger #106 carry | d2679c569 | merge c5021a52f | integrated |
| Option (e): claim-RPC grant and replay-safety reconciliation | 7290fcf9c | merge 0d90d40c3 | integrated |

All three integration commits are ancestors of the pre-commit HEAD.

## Locally verified completed work

- **Evidence class: local tracked tree.** WS1 Layer A's bidirectional
  completeness failure (LEDGER_INCOMPLETE) and explicit hazard declaration
  failure (CLASSIFICATION_MISSING) are present in
  src/lib/db/migration-ledger-map.ts.
- **Evidence class: local tracked tree.** The ledger #106 file
  supabase/migrations/20260721173000_harden_claim_rpc_privacy.sql is present.
- **Evidence class: local tracked tree.** The six claim-RPC revoke lines are
  absent from
  supabase/migrations/20260718050924_claimable_guest_identity_privacy.sql.
- **Evidence class: local tracked tree.** The grant migration
  supabase/migrations/20260720190000_grant_authenticated_claim_rpc_execute.sql
  is present and grants the three exact claim-RPC signatures to authenticated.
- **Evidence class: local tracked tree.** The production-predecessor model is
  supabase/tests/executable/production-preimage-20260712115539-claim-players-by-name.sql;
  it is not under supabase/migrations/.
- **Evidence class: local tracked tree.** The ledger snapshot records 110
  entries with head 20260721201734 harden_claim_rpc_privacy. Name-keyed drift
  maps repo file version 20260721173000 to ledger version 20260721201734.
- **Evidence class: local Git/documentation tree.** No Step 4.4 handoff or
  Step 4.4 commit exists; the phase/state records keep Step 4.3 blocked and
  Step 4.4 not started.

## Confirmed findings recorded without re-adjudication

### A. Production matcher and ledger

**Evidence class: prior independent live read-only evidence, last verified
2026-07-21; live re-read required before production-sensitive action.**

- Production ledger: 110 entries, head 20260721201734
  harden_claim_rpc_privacy.
- The #106 hardening is applied. The repo file is version 20260721173000,
  applied under ledger version 20260721201734; reconcile by **name**, not
  version.
- public.match_import_player_names(uuid, text[]) is SECURITY DEFINER;
  authenticated has EXECUTE, with no anon or PUBLIC; it accepts an unbounded
  caller-supplied text[]; and it returns field-identifying match_reason plus a
  1:1 match_score.
- **Verdict: CONFIRMED LIVE private-name enumeration oracle.** Two independent
  read-only sessions reached this conclusion. This handoff records that verdict
  and does **not** re-open, re-audit, or re-adjudicate the question.
- 20260720120000_coarsen_import_name_match_reasons is absent from the
  production ledger and insufficient as a closure. It hides which private
  field matched but still confirms that a supplied private full name or stored
  alias belongs to a real identity. It remains unapplied and unauthorized and
  must not be applied as a closure.

### B. WS2

**Evidence class: prior independent live/deployment read-only evidence, last
verified 2026-07-21; live re-read required before production-sensitive
action.**

The broad privacy-reader move is not unstarted. Its reader half shipped on the
live-site lineage and is deployed. The deployed reader bounds its own input and
tolerates both fine-grained and coarse match values, so a future contraction
does not require a frontend-first step. The only remaining WS2 issue is the
confirmed oracle and its replacement.

### C. 20260718050924

**Evidence class: local ledger mapping plus prior independent production
read-only evidence, last verified 2026-07-21.**

20260718050924_claimable_guest_identity_privacy is not gated. Its content is
applied as ledger 20260718181600 under renamed drift. It must never be applied
to production under any protocol.

### D. Approved remediation design

**Evidence class: approved governance record.**

docs/redesign/DECISIONS.md, under "Phase 4 Step 4.3 - Import identity
classification and source-bound matching," records identity classification,
exact source-bound matching with no fuzzy/prefix matching, the uniform response
set, the server-only matcher boundary, and save-time revalidation. This handoff
references that decision and does not duplicate or alter it.

## Stale premises corrected

| Stale premise | Correct current state |
| --- | --- |
| WS1 Layer A not started / blocked by no runtime-verifiable stamp | Layer A is integrated; that former stamp blocker is obsolete. |
| Ledger has 105 or 108 entries / head 20260721081355 | Ledger snapshot is 110 entries / head 20260721201734. |
| Ledger #106 is unknown or undocumented | It is harden_claim_rpc_privacy, carried locally as 20260721173000, applied under 20260721201734, and mapped by name. |
| WS2 not started or not delivered | Its reader half is deployed; the confirmed oracle and replacement are the remaining issue. |
| 20260718050924 is gated and should be applied | It is applied under renamed drift, is not gated, and must never be applied. |
| 20260720120000 must ship with WS2 or closes the oracle | It is unapplied, insufficient as a closure, and unauthorized for application as one. |
| The next action is immediately a closure audit | The approved import-identity fix and ordered production-gated work come first. |

## Remaining Step 4.3 blockers, in order

1. Build the approved import-identity fix, then obtain independent review,
   then apply under expand/contract only with separate authorization.
2. Run the tile-attribution backfill **before** guest re-neutralization. Two of
   the 114 rows resolve only through the unlinked guest's display_name.
3. Perform guest re-neutralization.
4. Apply the remaining gated migrations 20260719234500, 20260720100000,
   and 20260720110000 under the per-mutation protocol and separate
   authorization.
5. Then run the fresh independent closure audit.

## Boundaries

- Step 4.3 remains **BLOCKED**.
- Step 4.4 is **NOT STARTED** and prohibited under this handoff.
- No import-identity implementation, oracle audit, closure audit, migration,
  source/test edit, production read/write, push, merge, deploy, or apply is
  authorized or performed here.
- Production facts must be refreshed live under a separately authorized
  production-sensitive action before they are relied on operationally.