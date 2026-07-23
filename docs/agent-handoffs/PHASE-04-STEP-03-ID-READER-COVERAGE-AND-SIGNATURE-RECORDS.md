# Phase 4, Step 4.3 — ID-READER re-audit FAIL answered: signature record corrected, two vacuous branches now asserted

**Outcome: the targeted re-audit's FAIL is answered. Findings A, B, C, and D are
resolved; the terminal multiple-match state is RECORDED and deliberately NOT
fixed. Migration `20260722160000` remains gated and unapplied, the reader remains
undeployed, and Step 4.3 is NOT complete. No migration SQL was changed, no `src/`
file was changed, nothing was deployed, applied, pushed, or merged, and no
production system was read or written.**

Evidence classes are tagged inline: `[GIT] [REPO] [PROJECT-DOC] [PRIOR]
[INFERENCE] [UNVERIFIED]`. No `[LIVE]`/`[PROVIDER]` claim appears — no production
read was authorized or performed.

Base `redesign/tm-stats-dashboard-rebuild` re-derived at **`60300532f`**, level
with `origin` (0 ahead / 0 behind); base worktree clean before branching; task
branch `fix/id-reader-coverage-and-signature-records` in a fresh worktree at
`C:/tmp/tm-id-reader-coverage` with a real `npm ci` [GIT].

---

## 0. The re-audit left no handoff in this repository

The assignment names a targeted re-audit handoff in `docs/agent-handoffs/` as its
specification. **No such file exists** on this branch or any other: no filename
matches `*RE*AUDIT*`, no document records findings A-D or a mutation table, and
the base commit `60300532f` describes the re-audit as the *next* step and
explicitly not authorized in that session [GIT]. The audit worktree
`C:/tmp/tm-id-reader-reaudit` is clean and detached at the same commit, which is
consistent with an audit that committed nothing.

The re-audit's verdict therefore reached this session only as the assignment
text. That is a weaker record than a committed handoff, so **nothing was
inherited**: each of the four defects was independently re-derived from code
before being corrected (§1), and both coverage claims were re-proven by mutation
rather than accepted (§4, §5). This document is now the durable record.

---

## 1. Step 0 — every defect independently verified before correction

| Item | Claim | Verified against | Still present? |
|---|---|---|---|
| **A** | The active handoff states a signature the migration does not create | `20260722160000_add_non_import_guest_identity_creator.sql:113-122` vs `PHASE-04-STEP-03-ID-READER-CLIENT-EXPAND-BUILT-LOCAL.md` §1b | **YES** — file creates `(uuid, uuid, text, text, text, text, uuid, boolean)`; handoff said `(uuid, text, text, text, text, uuid, boolean, uuid)` |
| **B** | Release-sequence sub-headings and cross-reference are stale after renumbering | `docs/CURRENT_STATUS.md` "Next work item" | **YES** — sub-headings `2a`/`2b` sit under item **3**, and the rollback sentence pointed at "item 3 below" from inside item 3 |
| **C** | Multiple-candidate rejection asserted nowhere | `non-import-guest-identity-after.sql`, whole file | **YES** — no section reaches the `v_candidate_count > 1` branch |
| **D** | Revalidation's unlinked-only clause asserted nowhere | same | **YES** — no section passes a non-null `p_selected_player_id` |
| **run.sh comments** | Two comment blocks still assert the refuted causal claim | `run.sh:30-34` and `:74-79` | **YES** — both |

Nothing was found already correct, so nothing was left alone on that basis.

---

## 2. FINDING A (MEDIUM) — RESOLVED

`docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CLIENT-EXPAND-BUILT-LOCAL.md` is
in the first contiguous `Latest handoff` group in `docs/REDESIGN_STATE.md`
(`:1839` before this change) and is therefore published to the Claude Project
[REPO]. It stated in the present tense, with no supersession notice, that the
migration creates a signature that exists nowhere.

**Why that is MEDIUM and not cosmetic.** A session authoring the CONTRACT drop or
an expand rollback from this document would emit
`drop function if exists public.create_or_reuse_guest_identity(uuid, text, text, text, text, uuid, boolean, uuid)`.
`drop ... if exists` against a signature nothing ever created **succeeds
silently**. The function survives while the session records it as dropped
[INFERENCE, from PostgreSQL `DROP FUNCTION IF EXISTS` semantics].

Corrections, all in that one file:

1. **§1b signature** corrected to the shipped
   `(uuid, uuid, text, text, text, text, uuid, boolean)`.
2. **§1b verbatim-transcription claim** corrected. It said the candidate search
   *and* the selected-player revalidation were both transcribed verbatim from
   `20260720100000` lines 87-163. Only the revalidation is (its lines 137-163);
   `eaab0654` deliberately rebuilt the candidate search as a single materialised
   `v_candidate_ids` [REPO, migration header `:65-87`]. Both corrections are
   marked as corrections rather than silently overwritten, so the record of what
   the original session believed is preserved.
3. **Dated supersession notice** added at the top, matching the treatment
   `PHASE-04-STEP-03-GUEST-IDENTITY-OVERLOAD-DESIGN-SCOPING.md:3-28` already
   carries: same "SUPERSEDED IN PART — superseded by commit `eaab0654`
   (2026-07-22); this notice added 2026-07-23" opening, same routing to the
   current authority, same fenced shipped signature, same "the migration and the
   remediation handoff win" closing.
4. **§4 discrepancy 3** — a further stale statement found by the §1c sweep, stale
   for a different reason than the signature change. It said the design handoff
   "exists only on `design/guest-identity-overload-scoping` and is not merged
   into `redesign/tm-stats-dashboard-rebuild`". It was merged as `8e331cffb` and
   is present at HEAD [GIT]. Given a dated **Resolved 2026-07-23** paragraph in
   the same style §6 and §9 of that document already use for their own
   follow-ups; the original discrepancy text is left intact above it.

Nothing else in the file was rewritten. Sections 2, 3, 5, 6, 7, 8 and 9 remain
the record of what those sessions did. The §2 proof table's "8-key payload"
phrase was checked and is **not** stale: it describes the *pre-change reader's*
payload against the deployed 7-argument resolver, which is what
`non-import-guest-identity-before.sql:13,51,64` still asserts [REPO].

---

## 3. FINDING B (LOW) — RESOLVED

In `docs/CURRENT_STATUS.md` the apply step is item **3** of the release sequence,
but its two preconditions were still labelled `2a` and `2b`, and the
rollback-validity sentence read "valid only in the window between applying the
migration and deploying the moved reader (item 3 below)" — pointing at itself,
when the reader deploy is item **4**.

Relabelled `3a`/`3b` and repointed to item 4. **Numbering only**: the recorded
rollback SQL, its `drop function if exists` argument list, the apply-time ledger
bookkeeping, and every precondition are byte-unchanged.

---

## 4. FINDING C (LOW, coverage) — RESOLVED and MUTATION-PROVEN

**The gap.** Section 8 of `non-import-guest-identity-after.sql` builds a two-row
same-name collision, but only **one** row is an eligible candidate — the other is
claimed, and claimed players are excluded from the candidate set — so section 8
exercises the *exactly-one* path. Nothing reached the `v_candidate_count > 1`
rejection.

**What was added.** Section 10: two UNLINKED players in one group carrying the
same normalized personal name, then a call with `p_selected_player_id => null`
and `p_create_new => true` (true on purpose, so a pass cannot come from the
confirm-creation guard raising `22023` first and masking the branch). Asserts
`P0003`, that the call created no player row, that no third identity row appeared,
and that no import alias was written. Section 10a first proves the fixture really
is a two-eligible-candidate state, so a pass cannot be vacuous. Runs inside
`begin; … rollback;` like section 8, leaving no residue for `assertions.sql` or
the fixture bridge.

**Mutation probe M7** — auto-select whenever the count is one or more:

```
-  if p_selected_player_id is null and v_candidate_count = 1 then
+  if p_selected_player_id is null and v_candidate_count >= 1 then
```

Harness **exit 3**, failing at the new assertion:

```
psql:.../non-import-guest-identity-after.sql:557: ERROR:  ID-READER MULTI FAIL:
two eligible candidates and no explicit selection must raise P0003; instead the
call resolved to e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1 with state
existing_unlinked_guest
```

The mutated function silently picked the lowest-ordered of two same-name guests.
Before this section the same mutation left the harness at exit 0.

---

## 5. FINDING D (LOW, coverage, privacy-adjacent) — RESOLVED and MUTATION-PROVEN

**The gap.** `p.linked_user_id is null` in the selected-player revalidation
(`20260722160000:235`) is the sole barrier stopping an explicitly supplied
**CLAIMED** player id from being returned by this function and labelled
`existing_unlinked_guest` — a registered account handed back as a reusable guest,
against the "a successful claim preserves the existing player ID … after claim,
the registered username is the public identity" contract in
`GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` [PROJECT-DOC]. Nothing asserted it.

**What was added.** Section 11: a claimed player whose private identity row was
retained through the claim and carries the queried normalized name, selected
explicitly. Section 11a first proves every revalidation conjunct **except** the
unlinked-only clause is satisfied, so the refusal can only come from that clause.
11b asserts `P0002` and that the refusal wrote nothing — no player row, no
identity row. 11c asserts the claimed player was neither relinked nor stripped
and gained no import alias. Rolls back.

**Why it is asserted although it is latent.** Neither non-import call site passes
an explicit selection: `import-player-identity-repo.ts:118` hard-codes
`p_selected_player_id: null` [REPO], so today the branch is reachable only by a
direct service-role call. It is asserted because the natural fix for the terminal
state in §7 is a disambiguation UI, and such a UI would pass an explicit
selection — turning this dormant path live. That reasoning is recorded in the
section's own comment so a future reader does not delete it as dead coverage.

**Mutation probe M8** — remove the unlinked-only clause from the revalidation:

```
       where p.id = p_selected_player_id
         and p.group_id = p_group_id
-        and p.linked_user_id is null
         and (
```

Harness **exit 3**, failing at the new assertion:

```
psql:.../non-import-guest-identity-after.sql:717: ERROR:  ID-READER
CLAIMED-SELECT FAIL: an explicitly selected CLAIMED player must be refused with
P0002; instead the call returned f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1 with state
existing_unlinked_guest — a registered account was handed back as a reusable
guest
```

Before this section the same mutation left the harness at exit 0.

**Both probes reverted, byte-identity proven by tree hash** [GIT]:

| Point | `git write-tree` | migration blob |
|---|---|---|
| before any mutation | `cf186f51536cf401212693b8643d1699ec1e7dab` | `0d0ae105dd9305b345ab215e1f9b63b4c971740c` |
| after reverting M7 | `cf186f51536cf401212693b8643d1699ec1e7dab` | `0d0ae105dd9305b345ab215e1f9b63b4c971740c` |
| after reverting M8 | `cf186f51536cf401212693b8643d1699ec1e7dab` | `0d0ae105dd9305b345ab215e1f9b63b4c971740c` |

`git diff HEAD -- supabase/migrations/` is empty and `git status` shows the
migration unmodified. There is **no non-reverted change under
`supabase/migrations/`**. No probe was committed.

All fixtures use sentinel names only (`Zzmulti`, `Zzclaimed`, `Zzfixture`) and
sentinel UUIDs. No personal name, alias, or identifying value appears in any test
file, assertion message, or harness output.

---

## 6. run.sh comments corrected — comment-only, coverage decision NOT acted on

Two comment blocks in `supabase/tests/executable/run.sh` still asserted that
replaying `20260720120000` "would coarsen the very pre-image the contraction
proof measures against". `docs/REDESIGN_STATE.md` records that causal claim as
**refuted by measurement** [PRIOR, measured in
`PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md` §4.2: probes read
`finegrained=f` before `MATCH_PREIMAGE` and `finegrained=t` after; four full
harness runs, including one with the file replayed in the loop and one with it
applied in the deferred half, all exit 0].

Both now state what was measured: `MATCH_PREIMAGE` runs after the replay loop and
unconditionally installs the fine-grained predecessor over whatever the loop
left, so the exclusion is **inconsequential rather than necessary**. The second
block additionally records the real, still-open gap — that
`match-oracle-post-contraction.sql` is referenced by nothing — and that closing it
needs its own authorization.

**Proven comment-only** [REPO]: filtering the diff to non-`#` lines returns
nothing, and the 156 non-comment, non-blank lines of the file are identical
before and after (`diff` exit 0). The `echo` label at the `COARSEN_MIGRATION`
position is an executable line and was **not** touched.

**Deliberately NOT done**, per the assignment and because the decision is the
owner's: `match-oracle-post-contraction.sql` was not wired into `run.sh`, the
replayed migration set is unchanged, and the measurement experiments were not
re-run.

---

## 7. Terminal multiple-match state — RECORDED, NOT fixed

Re-derived here rather than inherited [REPO]:

- `create_or_reuse_guest_identity` raises `P0003` whenever two or more eligible
  candidates match and no explicit selection is supplied
  (`20260722160000:288-290`);
- the **sole** call site, `createOrReuseGuestPlayerByPersonalName`
  (`src/lib/db/import-player-identity-repo.ts:110-119`), hard-codes
  `p_selected_player_id: null` and its input type is `{firstName, groupId,
  lastName}` — callers cannot supply a selection;
- both product paths go through it: `/group/players`
  (`src/app/(app)/group/players/page.tsx:31`) and the Log-a-Game manual-entry
  resolver (`src/lib/db/log-game-player-resolution.ts:84`). Neither offers a
  disambiguation UI;
- no code in `src/` matches `P0003`, so it falls through `throw error`
  (`import-player-identity-repo.ts:127`) as a raw database failure.

So a user whose typed first/last name collides with two or more unlinked guests
in the group **can never add that roster entry**. The state is reachable because
the personal-name index is non-unique per group (`20260718050924:111-113`) and
`personal_name` is the only mode either non-import path uses.

It is **inherited** from the deployed resolver this function is derived from, not
a regression introduced by the `ID-READER-CLIENT` work — but it is a real
unrecoverable user-facing state and was written down nowhere. It is now tracked
as blocker `GUEST-NAME-COLLISION-TERMINAL` in `docs/CURRENT_STATUS.md` and
recorded in `docs/REDESIGN_STATE.md`, in both places with its **FINDING D
coupling**: the natural fix is a disambiguation UI, which would pass an explicit
selection and thereby activate the path §5's assertion guards, so that assertion
must be in place before any such UI ships.

**Not fixed.** No UI was designed or built and neither call site was changed.
That is a product decision requiring its own assignment.

---

## 8. Validation

| Check | Result |
|---|---|
| `npm.cmd ci` | exit 0 (real install; the harness needs `tsx` from `node_modules`) |
| `bash supabase/tests/executable/run.sh` — baseline, before any edit | exit 0, `ALL EXECUTABLE MIGRATION TESTS PASSED` |
| `bash supabase/tests/executable/run.sh` — with the new assertions | exit 0, `ALL EXECUTABLE MIGRATION TESTS PASSED` |
| Mutation probe **M7** | exit **3**, failing at the new section 10 |
| Mutation probe **M8** | exit **3**, failing at the new section 11 |
| `bash supabase/tests/executable/run.sh` — final file state | exit 0, `ALL EXECUTABLE MIGRATION TESTS PASSED` |
| `npx.cmd tsc --noEmit` | exit 0 |
| `npx.cmd vitest run --no-file-parallelism` | see the task report for exact counts |
| `npm.cmd run lint` | exit 0 |
| `npm.cmd run validate:claude-context -- --require-maintenance` | see the task report |
| `git diff --check` | clean |
| `npm.cmd run build` | **NOT RUN** — deliberately skipped. No file in scope is read by the Next.js build, and a fresh worktree has no `.env.local`, so a build failure there is an environment artifact rather than a signal. Not claimed as passing |

---

## 9. Discrepancies recorded

1. **The re-audit handoff does not exist.** Authority #2 of the assignment could
   not be located in `docs/agent-handoffs/` or anywhere else in the repository
   [GIT]. Working code and committed documents were treated as the stronger
   evidence throughout, and every finding was re-derived before correction. This
   is not a blocker for the corrections themselves — each defect was
   independently confirmed — but the re-audit's own reasoning, scope, and any
   finding it may have raised and dismissed are unavailable to future sessions.
2. **The migration file's working-tree line endings changed across the probes.**
   `git checkout --` re-applied the CRLF smudge filter, so the working-tree bytes
   differ from the pre-probe state while the tracked content is identical
   (`git write-tree` and the blob hash match exactly, `git diff HEAD` is empty).
   The committed content is unchanged; the final harness run at the final file
   state passes, confirming functional identity.
3. **`docs/REDESIGN_STATE.md` still contains, inside the dated 2026-07-23
   integration section, the sentence "Next step: a targeted re-audit … It is not
   authorized here."** That is left as the historical record of what that session
   said, in line with this project's practice of not rewriting dated sections.
   The newer section above it, and the "Current substep" block, both record that
   the re-audit has since run.

---

## 10. Canonical documents reviewed

- `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` — reviewed. The
  new section 11 assertion directly protects its claimed-identity rule; no change
  required to the contract itself.
- `docs/redesign/DECISIONS.md` — reviewed, **intentionally unchanged** and
  outside this task's permitted file set. No durable decision was made here; the
  terminal multiple-match state is recorded as a tracked item, not decided.
- `docs/CURRENT_STATUS.md`, `docs/REDESIGN_STATE.md` — **updated** with the
  outcome, the new blocker, and the active handoff entry.
- `docs/redesign/MASTER-RULES.md`, `CLAUDE.md` — reviewed; no change required.
  Nothing here changes project-wide direction, so
  `docs/redesign/MASTER-PLAN.md` was reviewed and **intentionally unchanged**.
- `docs/redesign/CLAUDE-PROJECT-SOURCES.json` — reviewed; no new durable
  cross-project guidance document was created, so no catalog entry was added.

---

## 11. What is NOT done, and still needs its own authorization

- **Merging or pushing this branch.** Nothing was pushed or merged.
- **The harness coverage decision on the coarsened matcher.** Unchanged and open.
- **A disambiguation UI** for the terminal multiple-match state.
- **Correcting the structural ledger-map note** at
  `src/lib/db/migration-ledger-map.ts:360`. Still BLOCKED and untouched.
- **Applying `20260722160000`**, the reader deploy and its production
  verification, and the CONTRACT drop.
- **The production ACL read** for the `service_role` EXECUTE discrepancy.
- `FINDING-4` / `DRAFT-NAME-RESIDUE`, contraction `20260722012707`, the tile
  backfill, guest re-neutralization, the closure audit, the owner smoke tests,
  and Step 4.4 — all untouched and unchanged in disposition.

Step 4.3 is **not** complete and is not marked complete.
