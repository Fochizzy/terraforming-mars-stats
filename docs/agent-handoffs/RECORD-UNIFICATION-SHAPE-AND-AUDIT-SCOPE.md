# RECORD-UNIFICATION-SHAPE-AND-AUDIT-SCOPE — two blocking owner decisions recorded: the unification shape, and the Step 4.3 closure-audit scope. A shape, not a design; nothing built

**Headline.** Two owner decisions had been outstanding and **blocking**. The **unification
shape** gates the entire identity build and carries three recorded dependents — where
guest usernames live, whether an email attaches to an existing row or a new entity, and the
shared username uniqueness namespace D-36 requires. The **Step 4.3 audit scope** was
recorded as following the PD-2 answer, which R-6 gave, while the phase contract states a
criterion and no scope at all. Both are now recorded as **D-50–D-59** and **C-9–C-12**.
This work item **builds nothing, writes no schema, and starts no migration.**

## Header — the eight facts

1. **Title.** Recorded the unification shape and the Step 4.3 closure-audit scope:
   D-50–D-59, C-9–C-12, plus one pointer in the phase contract. Documentation only.
2. **Date.** 2026-07-24.
3. **Branch.** `redesign/tm-stats-dashboard-rebuild` (redesign lineage).
4. **Worktree.** `C:\Users\izzyh\Documents\Terraforming Mars Redesign` — the redesign
   primary, a git *linked* worktree (git-dir `…/worktrees/Terraforming-Mars-Redesign`) and
   the tree the planning-pack updater reads. **No worktree was created.**
5. **Base commit.** `d5dc8b155333020fc8f2ac3fd7412d1bb8b04cce` (`d5dc8b155`,
   `ALIGN-PHASES-TO-IDENTITY-MODEL`). **Clean tree at start [GIT].** The brief's expected
   base `7349c87e` is an **ancestor** of this HEAD, so the advance is not a stop condition.
6. **Category.** Documentation and record only. It is **NOT** schema, a migration, a table
   definition, a column list, a constraint, SQL, code, a deploy, a production write, a
   push/merge, or a phase advance. It **amends no existing decision, ruling, or finding.**
7. **Authorization held.** The `RECORD-UNIFICATION-SHAPE-AND-AUDIT-SCOPE` brief: read-only
   git and repository inspection; editing `docs/redesign/DECISIONS.md` for the brief's
   sections 5–8 only; **one** pointer in `docs/redesign/phases/04-log-a-game.md` beside the
   closure criterion; editing `docs/REDESIGN_STATE.md` to register this handoff and record
   the outcome; creating ONE handoff; exactly ONE commit **made with the Bash tool**;
   reporting the publish receipt.
8. **Authorization NOT held, and what did NOT occur.** **No schema, migration, table
   definition, column list, constraint or SQL written anywhere** — the entity, its columns
   and its constraints are **not named beyond what the shape states**. **Whether
   `user_profiles` folds or survives was NOT decided** — it is recorded as build-time
   detail. **The operative audit scope statement was NOT authored** — the principle is
   recorded and the statement deferred. **No build, backfill, or migration begun.** The
   closure criterion in `04-log-a-game.md` was **not altered**, and no other phase-document
   content was touched. **No decision's content restated anywhere; no line-number citation
   added.** Analytics Q-1, Q-2, Q-3, Q-7 and Q-8 were **not resolved**;
   `MATCHER-MANUAL-ENTRY-REPLACEMENT` was **not** reclassified; `ID-READER-CONTRACT` was
   **not** assigned a destination. No more than one commit. **No push, merge, deploy,
   migration apply, rebase, force-push, or history rewrite. No production read or write of
   any kind** — no Supabase MCP, no `execute_sql`, no `list_migrations`, no
   `apply_migration`, no Cloudflare, no `wrangler`, no `/api/deploy-info`, no production
   SQL. The updater was **not** run manually and `sync_installed_updater.py` was not run in
   any mode. `src/**`, `supabase/**`, `scripts/**`, every `.bat`, the updater and its hook
   were not touched.

## Numbering — derived, not assumed

Existing identifiers were enumerated across `docs/`: the highest were **D-49** and
**C-8**. The new entries therefore run **D-50 – D-59** and **C-9 – C-12**. They are
recorded in a **new dated top-level section** rather than inside the identity design
record, so that record's heading range (`D-1–D-49`) stays accurate and untouched.

## Why this existed

The unification shape had three dependents recorded against it and blocked the identity
build; the audit scope had been recorded as following an answer that R-6 had since given,
while the phase contract states a criterion and no scope. Both sat only in owner
conversation. Recording them lets a session that was not present act without re-deriving
either.

---

# WHAT WAS RECORDED — `docs/redesign/DECISIONS.md`

New section "Phase 4 Step 4.3 — the unification shape and the closure-audit scope
(D-50–D-59, C-9–C-12), 2026-07-24", opening with an explicit statement that it records a
**shape, not a design**.

## The unification shape — chosen (D-50–D-54)

- **D-50** — a **new per-person profile entity** is introduced, holding the identity that
  belongs to a **person** rather than to a **participation**: username, optional alias,
  email when attached, PIN state, and the pseudonym assigned on deletion.
- **D-51** — **`public.players` is demoted to participation**, keeping `group_id` and
  gaining a reference to the profile entity; one row per person per group, which is what
  `group_id NOT NULL` always meant.
- **D-52** — **every existing inbound foreign key to `players(id)` remains valid**,
  recorded as a **PROPERTY TO PRESERVE** rather than a benefit claimed, and naming the
  dependants that keep referencing participation. **A build that breaks any of them has
  departed from this shape.**
- **D-53** — the **shared username namespace lives on the profile entity**, which is what
  makes **D-36** expressible.
- **D-54** — the change is **additive and follows expand/contract**, governed by the
  project's own expand/contract rules.

Recorded alongside, and deliberately **not** decisions: **`user_profiles`' fate is
build-time detail, explicitly not decided here**; and **the cost** — a join on every
identity read and a one-profile-row-per-person backfill, trivial at the D-25 transition
scope, which is an argument for doing it now rather than at a hundred users.

## Why not the alternative (D-55)

- **D-55** — **the merge into one profile table is rejected**, for a **structural** reason
  rather than a preference: `players` is group-scoped, so merging makes the profile carry
  `group_id` and a person in three groups becomes three profiles, contradicting **D-9**.
  Making it work would require un-scoping `players` first, touching every dependant listed
  at D-52. Recorded **so the fork is not revisited**.

## The closure-audit scope — the principle (D-56–D-59)

- **D-56** — the audit is **scoped to the work delivered, not to the phase contract as
  written**, and measures against the decisions governing Step 4.3 **at audit time**.
- **D-57** — it **explicitly includes R-8's override**, so an auditor does not **fail the
  build for doing what the owner ruled it should do**.
- **D-58** — it **explicitly excludes the Phase 5 entry gates** that **R-6** moved out of
  Step 4.3 closure.
- **D-59** — the **operative scope statement is authored when the audit is commissioned**
  and is **deferred here**, because the identity build does not exist yet and is now a
  schema migration; an audit cannot enumerate what it will examine before the thing exists.

## Consequences (C-9–C-12)

- **C-9** — the identity build **is now a schema migration** and its shape changed; a
  session picking up the recorded plan must **not start at the writers**.
- **C-10** — the **backfill is a production write**, needing its own per-action
  authorization, dry run, expected row count and rollback. None exists; none created here.
- **C-11** — **X-3 now has a target** (the feasibility finding, disambiguated from the
  unrelated X-3 in the audit-session records): it checks the profile entity, and **must
  fail CLOSED**.
- **C-12** — **D-36 becomes expressible**; the obstruction is removed, not implemented.

# WHAT WAS RECORDED — `docs/redesign/phases/04-log-a-game.md`

**One pointer only**, placed after the closure-criterion paragraph, naming where the audit
scope is now recorded and stating that nothing about the scope is restated there. **The
criterion is byte-unchanged** — the file's diff carries **zero deletions** and eight
inserted lines.

---

## Evidence — commands run this session (read-only except the named edits) [GIT]

```
$ git rev-parse --abbrev-ref HEAD      -> redesign/tm-stats-dashboard-rebuild
$ git rev-parse HEAD                   -> d5dc8b155333020fc8f2ac3fd7412d1bb8b04cce
$ git rev-parse --git-dir              -> .../worktrees/Terraforming-Mars-Redesign
$ git status --porcelain=v1            -> (clean at start)
$ git merge-base --is-ancestor 7349c87e HEAD   -> 0 (expected base is an ancestor)
```

Mechanical proofs run before commit: highest `D-`/`C-` identifiers enumerated across
`docs/`; `git diff` over the phase document showing **zero deletions** and the criterion
line still present verbatim; a DDL/SQL scan over every added line returning **no**
`create`/`alter`/`drop` statement, column definition, constraint, or code block; and a
line-number-citation scan returning none. Evidence class **[OWNER-DECISION]** for the
decisions; **[REPO]/[GIT]** for the mechanical checks.

## Files changed

- `docs/redesign/DECISIONS.md` — the new dated section carrying D-50–D-59 and C-9–C-12.
- `docs/redesign/phases/04-log-a-game.md` — one pointer; criterion byte-unchanged.
- `docs/REDESIGN_STATE.md` — the outcome note and this handoff's registration.
- `docs/agent-handoffs/RECORD-UNIFICATION-SHAPE-AND-AUDIT-SCOPE.md` — this handoff.

## Documents reviewed / updated / intentionally NOT changed

- **Read:** `docs/redesign/DECISIONS.md` (identifier series, the identity record, the
  ruling series); `docs/redesign/phases/04-log-a-game.md` (closure criterion);
  `docs/REDESIGN_STATE.md`.
- **Updated:** the four files above.
- **Intentionally unchanged, each against its own rule:**
  - `supabase/**` — the brief forbids writing schema or migration; this records a shape.
  - `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` — the governing contract;
    amending it is a separate owner act.
  - `docs/CURRENT_STATUS.md` — not in the authorized edit set; no blocker, release,
    migration or next-action state changed by a recording task.
  - `docs/redesign/MASTER-RULES.md`, `docs/redesign/MASTER-PLAN.md` — no governance rule or
    durable direction changed.
  - **Every phase document except the single pointer in `04`** — forbidden.
  - `RECORD-IDENTITY-FEASIBILITY-FINDINGS.md` — X-3 and F-1 are **cited**, not edited.
  - `docs/AUTHORITATIVE_DOCUMENTS.md`, `docs/redesign/CLAUDE-PROJECT-SOURCES.json` — no
    authority routing changed and no new catalogued source.

## Known limitations and deliberately-retained statements

- This is a **shape**, not a design. **Nothing here is buildable as written**: the entity
  has no name, no columns and no constraints, and deliberately so.
- **`user_profiles`' fate is unresolved** and is the first thing a schema-reading session
  must settle.
- **The operative audit scope statement does not exist** and is deferred to commissioning.
- **C-10's preconditions do not exist** — no dry run, expected row count, or rollback has
  been written for the backfill.
- **X-3 still fails open** and is still defined in no committed migration; C-11 gives it a
  target, not a fix.

## Production and external effects

**None.** No production or external system was read or written. After the commit the
post-commit planning-pack hook is expected to fire in this (the updater's) tree and
republish; that automatic run is expected behaviour, and its receipt belongs in the updater
log and the task report, not in a canonical document.

## Next approved action, and what is NOT approved

- **Next (separate assignments, not started):** a schema-reading session to settle
  `user_profiles`' fate and design the entity; the expand/contract migration sequence under
  D-54; the backfill under C-10's preconditions with its own authorization; the
  `is_username_available` repair under C-11; and the operative audit scope statement when
  the audit is commissioned.
- **NOT approved by this record:** writing any schema, migration or SQL; beginning the
  build or backfill; deciding `user_profiles`' fate; authoring the operative audit scope;
  any push, merge, deploy, migration apply, or production write.
