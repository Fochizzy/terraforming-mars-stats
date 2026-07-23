# Phase 4 Step 4.3 — Matcher overload merge and four record corrections

**Date:** 2026-07-23
**Lineage:** redesign (`redesign/tm-stats-dashboard-rebuild`)
**Type:** merge + documentation. **Nothing applied, deployed, pushed, or read
from production.**

---

## What this session did

It completed a merge a prior session correctly stopped on, resolved the two
conflicts it left behind under an explicitly authorized rule, and corrected four
record defects.

The prior session stopped because the source branch is based on a commit
predating an owner decision that rewrote two blocker rows. Taking either side
wholesale would have either reverted that decision about the preconditions on a
production function drop, or discarded the record the merge exists to land. It
had no authority to choose. **Stopping was right.**

---

## The merge

- **Source:** `fix/matcher-service-role-overload-expand` @ `bb5370ab4a7b81ae4bfdb3b79161f5be3cfe2b5d`
  — re-derived this session and confirmed to be the exact commit the independent
  audit examined and passed [GIT].
- **Merge base:** `92d4f6917d9fec081e69a71b527a7a1dc62b306f` [GIT].
- **Pre-merge HEAD:** `0053101ad91c3d531fe378b48ec979cee4d3495a`.
- **Merge commit:** `2b2a3b00e31676fdf90019470b867705ae63ae4f`, `--no-ff`, both
  parents intact [GIT].
- One commit brought in, touching 11 files: the gated migration, three
  executable harness files, `run.sh`, `migration-ledger-map.ts`, the ledger map,
  the harness README, the build handoff, and the two state documents.

**`fix/matcher-service-role-overload-callsite` @ `5894c874a` was NOT merged and
must not be** until after the migration is applied in production. Merging it
early opens a window in which any unrelated deploy of the live lineage would
break live import matching with `PGRST202`/`42883`.

### The authorized resolution rule

> For each conflicting row, take the version from whichever side **modified**
> that row relative to the merge base. Where only one side modified a row, take
> that side. Nothing else.

This is not a judgement about blocker dispositions. It is what a three-way merge
would have produced had the rows not been textually adjacent inside one table.

**The rule was verified before it was used**, by extracting every row from all
three revisions and comparing each against the base byte-for-byte:

| Row | In base | Target modified | Source modified | Taken from |
|---|---|---|---|---|
| `ID-READER-CLIENT` | yes | no | no | base (unchanged) |
| `ID-READER-CONTRACT` | yes | **YES** | no | **TARGET** |
| `ID-READER-DEPLOY` | yes | **YES** | no | **TARGET** |
| `ID-LEGACY-ORACLE` | yes | no | **YES** | **SOURCE** |
| `MATCHER-MANUAL-ENTRY-REPLACEMENT` | **no (new)** | — | **added** | **SOURCE** |
| `STEP-4.3-AUDIT` | yes | no | no | base (unchanged) |
| `STEP-4.4` | yes | no | no | base (unchanged) |
| `GUEST-NAME-COLLISION-TERMINAL` | yes | no | no | base (unchanged) |
| `DRAFT-NAME-RESIDUE` | yes | no | no | base (unchanged) |
| `GUEST-LABEL-REDIRTY` | **no (new)** | **added** | — | **TARGET** (auto-merged, outside the conflict region) |

**NO row was modified by both sides.** The rule therefore applied cleanly, and
the stop condition for a genuine semantic conflict was never reached [GIT].

The prior session's expectation was confirmed exactly, with one addition it had
not named: `GUEST-LABEL-REDIRTY` is also a target-side addition. It sits outside
the conflicted region and auto-merged.

### Resolution verification

- All **10** rows present, **byte-identical** to the side the rule assigns —
  verified programmatically against `git show` of all three revisions, not by
  reading.
- **No duplicates**, nothing missing, nothing invented.
- **Table structure valid** — every row has exactly four cells.
- The owner decision's text is intact on the two rows it rewrote
  (`ID-READER-CONTRACT`, `ID-READER-DEPLOY`); the matcher build record is intact
  on the other two (`ID-LEGACY-ORACLE`, `MATCHER-MANUAL-ENTRY-REPLACEMENT`).

### The `Latest handoff` group

Purely additive. Base carried 30 entries; the target added 2 and the source
added 1, with **no overlap**. Kept newest first by commit timestamp:

1. `PHASE-04-STEP-03-SEVEN-ARGUMENT-DROP-PRECONDITION-REPLACEMENT.md` (08:44:38)
2. `PHASE-04-STEP-03-MATCHER-OVERLOAD-BUILT-LOCAL.md` (07:51:36, source)
3. `PHASE-04-STEP-03-BACKFILL-NEUTRALIZATION-ORDERING-CORRECTION.md` (07:38:31)

then the 30 base entries in their original order. **33 entries, nothing
dropped, nothing reworded, no blank line introduced inside the group** —
verified by set comparison and by locating the first blank line after the group
[GIT].

---

## The four corrections

### FINDING 1 (MEDIUM) — the equivalence reference was misdescribed

The 3e assertion's reference was described as "the **deployed** TWO-argument
function". **It is not the deployed body.** `run.sh` deliberately never applies
`20260720120000`: it is excluded from the replay loop and then explicitly not
applied afterwards. Only three files define the two-argument form — the
coarsening migration (never applied here), the pre-image, and the contraction
(applied *after* 3e) — so the signature standing at 3e is the **modelled
fine-grained pre-image of production-only ledger `20260720021300`**, emitting
`display_name_exact` and rank **400** where the deployed coarsened body emits
`exact` and **2** [REPO].

**Both halves of the bound are stated, or the correction overcorrects:**

- **What the reference DOES carry.** All seven ranking predicates and their rank
  values (`400/350/300/250/200/175/150`) are identical in the two bodies, and
  the coarsening **only relabels output** — it retains `internal_rank` for the
  `distinct on … order by` and never emits it. The tuple 3e compares,
  `(imported_name, player_id, is_linked)`, is selected identically by both, so
  **player-selection equivalence transfers to the deployed body**. The drift
  guard and the gate/pool agreement assertion are **not weakened**.
- **What it does NOT carry.** The **coarse disclosure labels** and the
  **candidate-input bound**. Neither is exercised; both remain the recorded
  harness coverage gap under `STEP-4.3-AUDIT`.

Corrected at **three sites, comment and prose only**:
`supabase/tests/executable/matcher-service-role-overload.sql` (section-3e header
and the inline probe-(a) comment), `supabase/tests/executable/README.md`
(section 5), and `PHASE-04-STEP-03-MATCHER-OVERLOAD-BUILT-LOCAL.md`.

**Proven by diff two independent ways** [REPO]: the classified diff shows **33
comment lines changed and 0 executable lines**, and the md5 of the file with all
comments and blank lines stripped is **identical before and after**
(`ab5a2932988524119b05cfd9f8ba47b4`). The `raise exception` message at 3e still
reads "the two-argument reference" and was left **byte-unchanged deliberately**
— it is an executable line, and the phrase is accurate on its own terms. A
comment above it records why.

### FINDING 2 (LOW) — a dangling build-note reference

The build handoff's validation table pointed `npm run build` at "the build note
below"; the phrase occurred **exactly once in the document, in the reference
itself** [REPO]. Now filled — with what is verifiable, not with a result:

**No `npm run build` result was recorded by the build session, none is
recoverable, and none is claimed. This session did not run it either and says
so.** What is verified [REPO]: `.env.local` is gitignored (`.gitignore:39`),
untracked, and **absent from both worktrees the build ran in**, so a `next
build` there fails on invalid `NEXT_PUBLIC_SUPABASE_*` before it could report
anything about this change; and `prebuild` transitively re-runs the
documentation validator already recorded separately at exit 0.

### Record correction A — `MIGRATION-LEDGER-MAP.md`

It still asserted the reader-deploy precondition "stands and is NOT relaxed" and
that the decision "has not been made". **That decision was made and recorded on
2026-07-23.** Marked **SUPERSEDED** in the file's established style with the
original paragraph retained verbatim as history, the three replacement
preconditions stated, and a pointer to the decision text. **What is not
superseded is stated too:** "no caller was found" is still not "the drop is
safe", and `ID-READER-DEPLOY` is not dissolved — only its reach changed. **No
other precondition in that file was touched.**

### Record correction B — `DECISIONS.md`

The seven-argument drop decision's ACL sentence named the catalog read twice.
Replaced under owner approval with: *"confirmed the ACL is now postgres and
service_role only, as of 09:40:14Z. That is a prior record, and precondition 1
re-derives it live before any drop."* **The diff is exactly two lines changed
and nothing else in the file** [GIT].

### FINDING 4 — recorded, NOT fixed

Registered as the tracked blocker row `MATCHER-WIRE-CONTRACT`. The overload's
wire contract is asserted on both lineages and **compared by neither**, so a
parameter rename on either side leaves both suites green and fails in production
with `PGRST203`. Re-derived independently this session: the migration declares
`p_group_id, p_requesting_user_id, p_imported_names` and the callsite passes
exactly those three names — **they match today** [GIT]. Mitigating it is a
separate assignment and was deliberately not started.

---

## Operational measurements recorded for the apply and deploy sessions

1. **`scripts/deploy/check-schema-compatibility.ts` would NOT detect a missing
   RPC.** It collects **table** literals only and probes them with `.from()`;
   there is no `.rpc(` collection and no function probe [GIT]. **Only sequencing
   prevents the reader deploying ahead of the migration.**
2. **Production verification must confirm a NON-ZERO match count and a non-null
   `userId` in the audit line.** A zero-match import is indistinguishable from
   the silent failure mode. **Absence of an error is not evidence.**

**PostgREST overload resolution remains `[INFERENCE]` and unexecuted.** Failure
mode `PGRST203` — loud and reversible. Settlement path: the **deploy** gate, on
the first real import after the moved reader ships. It does not settle at the
apply.

---

## What this does NOT do

- **It does not apply `20260723130000`.** Still gated and unapplied; the
  production ledger is untouched at 115 / `20260723082917` **[PRIOR]**.
- **It does not merge the callsite half**, deploy, verify, or contract.
- **It does not mark Step 4.3 complete**, change any blocker's `Blocking` value,
  or resolve `PD-1`, `PD-2` or `PD-3`.
- **No production access of any kind occurred** — no Supabase MCP call, no
  `execute_sql`, no `list_migrations`, no `wrangler`, no `/api/deploy-info`.
- **Nothing was pushed.** No rebase; the audited source commit is unchanged.
- `supabase/migrations/**`, `src/**` and `scripts/**` were **not edited**.

---

## Documents reviewed, updated, or intentionally unchanged

**Read:** `CLAUDE.md`, `docs/redesign/MASTER-RULES.md`,
`docs/redesign/PAGE-ARCHITECTURE.md`, `docs/CURRENT_STATUS.md`,
`docs/REDESIGN_STATE.md`, `docs/redesign/DECISIONS.md` (the seven-argument drop
entry), `docs/redesign/reference/MIGRATION-LEDGER-MAP.md`,
`supabase/tests/executable/run.sh`, `README.md`,
`matcher-service-role-overload.sql`,
`production-preimage-20260720021300-match-import-player-names.sql`,
`supabase/migrations/20260720120000`, `20260722012658`, `20260723130000`, and —
read-only, across lineages — `scripts/deploy/check-schema-compatibility.ts` and
`src/lib/db/import-player-resolution-repo.ts` on the callsite branch.

**Updated:** `docs/CURRENT_STATUS.md`, `docs/REDESIGN_STATE.md`,
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`, `docs/redesign/DECISIONS.md`
(the Step 4b clause only), `supabase/tests/executable/README.md`,
`supabase/tests/executable/matcher-service-role-overload.sql` (comments only),
`PHASE-04-STEP-03-MATCHER-OVERLOAD-BUILT-LOCAL.md`, and this handoff.

**Intentionally unchanged:** `docs/redesign/MASTER-PLAN.md` — no project-wide
goal, phase structure, architecture, contract, or milestone changed. A merge of
already-recorded work plus four record corrections is exactly the class of
change the master-plan integrity rules say not to write into it.
`supabase/migrations/**`, `src/**`, `scripts/**`, and every other blocker row.
