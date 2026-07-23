# Phase 4 Step 4.3 — ID-READER-CLIENT expand: remediation after an independent audit FAIL

Date: 2026-07-22
Branch: `fix/id-reader-candidate-predicate`
Base: `redesign/tm-stats-dashboard-rebuild` @ `7a1f11eca`
Worktree: `C:\tmp\tm-id-reader-fix`

Local remediation only. **No production read and no production write.** No
Supabase MCP call, no `execute_sql`, no `list_migrations`, no `apply_migration`,
no wrangler, no `/api/deploy-info`, no production logs, no direct database
connection. No deploy, no migration application, no backfill, no grant, no
revoke, no push, no merge. Step 4.3 remains **blocked** and is **not** complete.
No blocker other than `ID-READER-CLIENT` changed disposition, and a new
recorded-only blocker was added.

---

## 1. Why this task existed

An independent read-only audit of the ID-READER-CLIENT expand work returned
**FAIL** on one HIGH finding and two LOW findings, plus a fourth pre-existing
finding to be recorded rather than fixed.

`20260722160000` is gated and unapplied and
`public.create_or_reuse_guest_identity` exists in no environment, so every
correction was made **in place in the unapplied file** — the established
convention on this lineage — instead of being stacked as a corrective
migration. No applied migration and no deployed function was modified.

### Discrepancy: the audit handoff does not exist as a repository file

The assignment named the audit handoff as authority #2 and located it in
`docs/agent-handoffs/`. It is not there, and it is not on any local or remote
ref:

- `grep -rl "FINDING-1" docs/` → no match [REPO]
- no `docs/agent-handoffs/*` file matching `id-reader.*(audit|review)` on any
  ref under `refs/heads` or `refs/remotes` [GIT]
- the audit's own worktree, `C:\tmp\tm-id-reader-audit`, is clean at the same
  commit `7a1f11eca` with no untracked files [GIT]

The audit therefore reported in chat only. This was **not** treated as a stop,
because the assignment (authority #1, which outranks the audit handoff) states
each finding in full, and because it independently required that the audit's
claims be re-derived from the code and its reproduction be reproduced first.
Everything below is derived from the code and from executed measurements, not
inherited from the audit. Where the assignment's description of a finding was
checkable against the code, it checked out.

---

## 2. FINDING-1 (HIGH) — RESOLVED

### 2.1 What the defect was

In `20260722160000`, the candidate-**counting** query and the
auto-**selection** query eleven lines below it applied different predicates:

| | `ppi` branch filters `p.linked_user_id is null`? | `pia` branch filters it? |
|---|---|---|
| counting query (pre-fix lines 138–159) | **yes** (joins `public.players`) | yes |
| selection query (pre-fix lines 161–183) | **no** (no join to `public.players` at all) | yes |

So the count could report one candidate while the selection drew from a strictly
larger set and picked an already-claimed player, which the revalidation
immediately below then rejected.

### 2.2 Independent reproduction, before any fix

Reproduced on a disposable PostgreSQL 18 cluster built by the project harness
through both applies of the unmodified `20260722160000`. Fixture: group
`22222222-…`, one **unlinked** guest and one **already-claimed** player
(`linked_user_id` not null) whose retained private identity row carried the same
normalized personal name. Sentinel names only.

Measured [REPO, executed]:

| Measurement | Result |
|---|---|
| candidate-**counting** query rows | **1** |
| auto-**selection** query rows | **2** |
| row `limit 1` actually returned | the **claimed** player (`cccccccc-…`, `picked_row_is_a_claimed_player = t`) |
| `create_or_reuse_guest_identity(...)` | **SQLSTATE `P0002`** — `The selected guest identity is unavailable or no longer matches.` |
| unlinked guests with that name afterwards | 1 (the rejected call wrote nothing) |

The failure is a denial of legitimate reuse, not a privacy breach: the
revalidation still refused to hand back a claimed player. But the guest that
*should* have been reused was unreachable.

### 2.3 Why the state is reachable

`private.player_private_identities` indexes `normalized_guest_username`
**uniquely** per group but `normalized_personal_name` **non-uniquely**
(`20260718050924:107-113`) [REPO]. So two rows in one group may share a
normalized personal name, and a claim preserves the claimed player's private
identity row. `personal_name` is also the **only** mode either non-import call
site uses — `createOrReuseGuestPlayerByPersonalName` hard-codes
`p_identity_mode: 'personal_name'` [REPO]. The collision is therefore in the
directly reachable path, not a theoretical one.

### 2.4 The fix, and why it cannot drift again

The predicate is no longer duplicated — it is **evaluated once** and both uses
derive from the single result:

```sql
select coalesce(array_agg(candidate.player_id order by candidate.player_id), '{}'::uuid[])
into v_candidate_ids
from ( <the one predicate> ) candidate;

v_candidate_count := cardinality(v_candidate_ids);

if p_selected_player_id is null and v_candidate_count = 1 then
  p_selected_player_id := v_candidate_ids[1];
end if;
```

There is no second query left to disagree with the first, so the two questions
cannot be answered from different predicates. Making them merely textually
identical was rejected: two queries that must agree is the root cause, and
duplicating the filter resets the same trap.

This is also the shape of the **applied** sibling
`public.resolve_staged_import_player_identity` (`20260722012658`), which
aggregates candidates into a `uuid[]` and takes its count from `cardinality()`
[REPO]. The new function now matches its already-shipped sibling rather than
diverging from it.

A secondary hazard disappears with it: the old `limit 1` had no `ORDER BY`, so
which row it returned was plan-dependent. The array is ordered, and element
`[1]` is read **only** when there is exactly one element.

### 2.5 Behaviour in all four candidate cases

Derived from the post-fix body and consistent with
`GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` and the 2026-07-22 DECISIONS entry:

| Case | Behaviour | Duplicate created? | Claimed player linked? |
|---|---|---|---|
| exactly one unlinked candidate | auto-selects it, revalidation passes, returns `existing_unlinked_guest` with the existing player id | no | no |
| multiple unlinked candidates | no auto-selection; raises `P0003` "Multiple guest identities match. Select one explicitly." | no | no |
| zero unlinked candidates, a claimed same-name player present | the claimed player is **not** a candidate; creates a new unlinked guest (`newly_created_unlinked_guest`), or raises `22023` if `p_create_new` is false | no — there was no guest to duplicate | no |
| zero candidates at all | identical to the previous row | no | no |

An explicitly supplied `p_selected_player_id` is still revalidated, and that
revalidation retains `p.linked_user_id is null`, so passing a claimed player's
id is refused with `P0002`. Preserving the existing player id on reuse is what
the privacy contract requires; none of the four cases silently creates a
duplicate or links a claimed player.

---

## 3. FINDING-2 (LOW) — RESOLVED

`p_requesting_user_id` was declared **last and defaulted**, diverging from the
four applied gateways in `20260722012658`
(`stage_import_player_identity_evidence`, `attach_import_identity_staging`,
`discard_import_identity_staging`, `resolve_staged_import_player_identity`),
each of which declares `p_requesting_user_id uuid` **required**, immediately
after its scope argument, with defaults only at the tail [REPO].

It was made required and repositioned to second, giving
`(uuid, uuid, text, text, text, text, uuid, boolean)`. This mirrors
`resolve_staged_import_player_identity(p_staging_id, p_requesting_user_id,
p_source_player_ordinal, p_identity_mode, …5 defaults)` exactly, so PostgreSQL's
"parameters after a defaulted one must also have defaults" rule is satisfied
without an awkward signature.

Every signature-dependent surface was updated in the same change:

- the three `revoke execute` statements, the `grant execute`, and the
  `comment on function` (all signature-qualified) in the migration;
- the `regprocedure` literal and all four positional calls in
  `non-import-guest-identity-after.sql`;
- the two positional calls (K1, K7) in `assertions.sql`.

**No TypeScript change was required.** Both call sites pass parameters by name —
there is exactly one RPC issuing site,
`createOrReuseGuestPlayerByPersonalName`, and `log-game-player-resolution.ts`
reaches the database only through it — so parameter order is not a caller
constraint, and the existing unit test asserts an order-independent payload
object. No unit test needed extending.

`src/lib/db/migration-ledger-map.ts`, `MIGRATION-LEDGER-MAP.md` and
`REDESIGN_STATE.md` describe the function but never state its signature, so none
needed a signature edit.

The body's explicit `p_requesting_user_id is null` disjunct is **retained but now
labelled in-file as redundant**: `gm.user_id = null` is NULL, so the membership
test alone already yields no rows and fails closed. The audit's probe finding
that this clause is not independently load-bearing is correct, and the comment
now says so, so no future reader mistakes it for the protection itself.

### Residual

An earlier, never-applied revision of this same file declared the old ordering.
No `drop function` for it is carried, deliberately: it exists in no durable
environment, and adding a DROP would falsify this file's `expansion`
classification in `migration-ledger-map.ts`, which the expand/contract release
gate depends on. A local cluster that applied the earlier revision must be
rebuilt; the harness builds a fresh cluster every run, so it is unaffected. This
is recorded in the migration header.

`docs/agent-handoffs/PHASE-04-STEP-03-GUEST-IDENTITY-OVERLOAD-DESIGN-SCOPING.md`
still shows the superseded argument order. It is a historical design record and
was outside this task's permitted file set; it is superseded by this handoff and
by the migration itself.

**RESOLVED 2026-07-23** by
`docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md`: that
file's five signature sites now carry the shipped order and it opens with a dated
notice pointing here. "Superseded by a handoff" was not sufficient on its own —
a future session reading the scoping document directly would still have taken the
wrong signature from it.

---

## 4. Executable proof and mutation testing

A collision proof (section 8) and a signature proof (section 9) were added to
`supabase/tests/executable/non-import-guest-identity-after.sql`. Section 8 runs
inside an explicit transaction and **rolls back**, leaving no residue for
`assertions.sql` or the fixture bridge. Sentinel names only; no private name,
alias, or identifying value appears in any output.

Every added assertion was mutation-tested. Each probe mutated the file, ran the
harness, and then restored from a pristine copy; reversion was proven by
`sha256sum`, not asserted.

| Probe | Mutation | Result | Caught by |
|---|---|---|---|
| **P1** | reintroduce the two-query divergence | harness **exit 3** — `ID-READER COLLISION FAIL: the call errored with sqlstate P0002 (The selected guest identity is unavailable or no longer matches.) -- this is the candidate-predicate divergence…` | **8b** (the core proof) |
| **P2** | make the fixture's "claimed" player unlinked | harness **exit 3** — `ID-READER COLLISION FAIL: fixture is not the collision state (unlinked 2, claimed 0)` | **8a** (vacuity guard) |
| **P3** | reuse branch also spawns a spare unlinked guest | harness **exit 3** — `ID-READER COLLISION FAIL: 2 unlinked guests carry this name; reuse must not create a duplicate` | **8c** |
| **P4** | reuse branch writes a `player_import_aliases` row | harness **exit 3** — `ID-READER AFTER FAIL: reuse branch wrote 1 import alias row(s)` | **pre-existing section 7**, *not* 8d |
| **P5** | resurrect the trailing-defaulted overload | harness **exit 3** — `ID-READER SIGNATURE FAIL: a call omitting p_requesting_user_id resolved; the argument is not required` | **9** |

Reversion after every probe:
`d4ba3dbe…` (migration) and `c95224ef…` (proof file), byte-identical to the
pristine copies.

Two probes were themselves corrected rather than accepted:

- P3 initially collided with a `players` display-name unique index and failed at
  8b instead of 8c; it was rewritten to use the neutral label helper so it
  produces a genuine silent duplicate. **8c is independently load-bearing only
  after that correction.**
- P4 initially named a column `player_import_aliases` does not have.

**One added clause is NOT independently load-bearing and is labelled as such.**
Probe P4 showed that section **8d** (the collision fixture's no-import-alias
check) is fully subsumed by section 7's alias assertion, which runs first on the
same code path, so 8d was never reached. It is retained as an explicitly
commented redundancy guard, not presented as proof. Section **9b** is likewise a
vacuity/ambiguity guard subsumed by section 9 under P5. Neither is claimed as
independent evidence — flagging them is the same discipline the audit applied to
the null-guard clause.

---

## 5. FINDING-3 (LOW) — RESOLVED

The recorded release sequence in `docs/CURRENT_STATUS.md` invoked the
per-mutation protocol but omitted two things the executing session would have
had to derive. Both are now steps in the sequence, not footnotes:

- **2a — rollback SQL for the expand step.** A single
  `drop function if exists public.create_or_reuse_guest_identity(uuid, uuid,
  text, text, text, text, uuid, boolean);`, valid only in the window between the
  apply and the reader deploy, with the reason stated.
- **2b — apply-time ledger bookkeeping.** This lineage's applies land under the
  UTC apply time rather than the filename version (five already have, e.g.
  `20260722012658` → `20260722132159`, `20260720120000` → `20260722144034`), so
  the sequence now requires registering the pairing **by NAME** under
  `add_non_import_guest_identity_creator` in
  `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME`, adding the entry to
  `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION`, removing `20260722160000` from
  `GATED_UNAPPLIED`, re-attesting the ledger, and re-running the ledger-map test
  — all immediately after the apply.

---

## 6. `run.sh` header — CORRECTED, comment-only

The header claimed the second half applies "every migration in
`GATED_UNAPPLIED`" and that "none of these is applied to production". Both are
false [REPO]:

- `20260722012658` **is** applied (ledger `20260722132159`) and is not in
  `GATED_UNAPPLIED`, yet is excluded from the history replay and applied in the
  deferred half — so the BEFORE/AFTER matcher pair can pin its pre-image and
  then restore the shipped matcher on one database;
- `20260720120000` **is** applied (ledger `20260722144034`), is likewise not in
  `GATED_UNAPPLIED`, and is excluded from the replay and then never applied at
  all, because `MATCH_PREIMAGE` already installs the matcher it would coarsen.

The header, the variable-block comment, and the mid-file banner now describe
what the script actually does, including that the half-1 baseline models
production **minus** those two applied migrations. Behaviour was not changed.

**Proven, not asserted:** stripping comments and blank lines from the pre- and
post-change files yields **155 executable lines each and a zero-line diff**.

Some `echo` labels below the banner still read "gated" for the applied pair.
They were left alone because changing them would alter the script's stdout, and
the correction was required to be comment-only; the header now states that it is
authoritative over those labels.

**RESOLVED 2026-07-23** by
`docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md`, which
was not comment-only. Nothing in the repository asserts on `run.sh` stdout —
verified across `package.json`, CI, tests, snapshots and hooks — so the labels
now name each file's real production status and its deferral reason, and
`20260720120000` gained the explicit label it never had. Executable logic is
still unchanged: 116 non-comment, non-blank, **non-echo** lines before and after,
with a zero-line diff.

---

## 7. FINDING-4 — RECORDED, NOT FIXED

Registered as blocker **`DRAFT-NAME-RESIDUE`** in `docs/CURRENT_STATUS.md` and
in `docs/REDESIGN_STATE.md`: a typed personal name may survive into a Log-a-Game
draft snapshot and its hydration payload when a manually added player's seat is
removed without pruning the records keyed by that seat's reference — which would
breach the "private names must be excluded from payloads, not merely hidden
visually" rule in `GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`.

Recorded with its severity and with the explicit statement that **end-to-end
reachability is inferred, not executed** — no failing test, captured payload, or
stored draft was produced, so its severity is unconfirmed.

It was **not fixed and not investigated**. The wizard, the players step, the
draft validation, and the draft repository were not opened or modified. It needs
its own scoped assignment.

---

## 8. Files changed

| File | Change |
|---|---|
| `supabase/migrations/20260722160000_add_non_import_guest_identity_creator.sql` | single-source candidate predicate; `p_requesting_user_id` required and repositioned; 5 signature-qualified statements updated; header corrected (the candidate search is no longer a verbatim transcription) and null-guard redundancy documented |
| `supabase/tests/executable/non-import-guest-identity-after.sql` | signature updated in the `regprocedure` literal and 4 calls; new section 8 (collision, rolled back) and section 9 (required-argument signature) |
| `supabase/tests/executable/assertions.sql` | K1 and K7 calls updated to the new argument order |
| `supabase/tests/executable/run.sh` | header, variable-block and banner comments corrected — **comment-only**, zero-line executable diff |
| `docs/CURRENT_STATUS.md` | release-sequence steps 2a/2b added; `ID-READER-CLIENT` row updated; `DRAFT-NAME-RESIDUE` row added |
| `docs/REDESIGN_STATE.md` | current-substep line updated; new remediation section; new handoff at the head of the active handoff group |
| `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md` | this handoff (new) |

`src/lib/db/import-player-identity-repo.ts`, its test, and
`src/lib/db/migration-ledger-map.ts` were reviewed and deliberately left
unchanged — named-parameter calls make the reorder caller-transparent, and
neither the ledger map nor its markdown records a signature.

---

## 9. Canonical documents reviewed

- `docs/CURRENT_STATUS.md` — read and updated
- `docs/REDESIGN_STATE.md` — read and updated
- `docs/redesign/DECISIONS.md` — read; "Non-import guest identity creation:
  accepted requesting-user trust model and retirement of 20260720100000" governs
  this function. **Intentionally unchanged**: no durable decision changed. The
  decision's own scope section already limits it to the local build.
- `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` — read; the fix
  is checked against it in section 2.5. Intentionally unchanged.
- `docs/redesign/MASTER-RULES.md`, `CLAUDE.md` — read; intentionally unchanged.
- `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` — read; records no
  signature, and was outside the permitted file set. Intentionally unchanged.
- `docs/redesign/MASTER-PLAN.md` — reviewed for the post-work check. **No
  update**: this is a defect remediation inside an already-approved substep. It
  changes no goal, boundary, phase structure, durable architecture, analytics
  semantics, validation gate, or documented current phase.
- `docs/redesign/CLAUDE-PROJECT-SOURCES.json` — checked; task handoffs are not
  catalogued there (zero `agent-handoffs` entries), so no change.

---

## 10. What is NOT authorized by this work

Unchanged and still requiring new explicit owner authorization: applying
`20260722160000`; deploying and verifying the moved reader; the CONTRACT drop of
the 7-argument `resolve_import_guest_identity`; the authorized production ACL
read for the `service_role` EXECUTE discrepancy; contraction `20260722012707`;
the tile-attribution backfill; guest re-neutralization; the closure audit; the
owner smoke tests; Step 4.4; and any work on `DRAFT-NAME-RESIDUE`.

Pushing or merging this branch is **not** authorized.
