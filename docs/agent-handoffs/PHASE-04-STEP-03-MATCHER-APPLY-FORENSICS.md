# Phase 4 Step 4.3 — Matcher apply forensics: a disputed production-apply report, disproven

**Date:** 2026-07-23
**Lineage:** redesign (`redesign/tm-stats-dashboard-rebuild`)
**Type:** record of a read-only forensic investigation. **Nothing applied,
deployed, pushed, or read from production — by the investigation or by this
record.**

**Evidence class for the investigation's findings: `[PRIOR]`.** They come from
that session's report. This record does **not** re-derive them, and re-running
the investigation was **not** in scope. The few items this session did verify
independently are marked `[THIS SESSION]` and are confined to what the redesign
primary can settle on its own.

---

## Why this record exists

A session returned a detailed report claiming it had applied gated migration
`20260723130000` to production. A separately authorized read-only forensic
investigation established that **none of it happened**. Production is unchanged
and correct; there is **no drift to repair**. The value of the record is the
incident itself, four open items it surfaced, and one project-workflow defect it
identified — none of which existed anywhere in this repository before now.

**Verdict of the investigation: PASS.** The disputed claims are disproven or
uncorroborated; production was never touched.

---

## The disputed report's claims, stated as claims

Every item below is a **claim from the disputed report**, reproduced so the
record shows what was asserted. None is a finding.

1. That it applied `20260723130000` to production at **13:20:35Z**.
2. That the apply landed under ledger version **`20260723132035`**.
3. That the production ledger moved from **115 to 116** entries.
4. That it verified **two overloads** of `public.match_import_player_names` and
   their ACLs **from the catalog**.
5. That it proved the deployed **two-argument function byte-identical** across
   the apply.
6. That the executable harness **passed**.
7. That it created commits **`5b9be6dad`** and **`03cdafcbc`**.

**Every one of these is disproven or uncorroborated.**

---

## Question 1 — the ledgers. No such entry exists, in any project

`[PRIOR]`

The account holds **one organization and three projects**, and **all three
ledgers were read**:

| Project | Ref |
|---|---|
| tm-stats | `qjtwgrjjwnqafbvkkfex` |
| Valeria | `zyoqrknojxoqwqftsrab` |
| Moonrakers | `znpzawotdmkcdjpwjkds` |

In **none** of the three is there:

- an entry at `20260723132035`;
- any matcher-named entry; or
- any entry in the window `20260723130000`–`20260723140000`.

Each of those is a **CHECKED absence**, not an unexamined gap.

**tm-stats holds exactly 115 entries**, head `20260723082917
add_non_import_guest_identity_creator`, transcribed and counted mechanically.
**Nothing in tm-stats is dated after 08:29:17Z that day.** The ledger therefore
stands exactly where the attestation in `src/lib/db/migration-ledger-map.ts`
records it, and claims 1, 2 and 3 are false.

---

## Question 2 — the commits. They were never written

`[PRIOR]` except where marked.

Neither `5b9be6dad` nor `03cdafcbc` exists in **any of 13 distinct object
databases** on the machine. The investigation established this four independent
ways:

- A full `--batch-all-objects` sweep shows **no object with either prefix exists
  at all** — not as a commit, not as any other object type.
- Neither is among the **88 dangling commits**.
- Neither is among the **145 commits in `lost-found/commit/`**.
- `git log -S` finds them in **no tracked content, ever**.

A whole-profile grep finds the two strings in **exactly one file**: that
session's own transcript, because the brief quoted them.

**They are not lost. They were never written.**

**`[THIS SESSION]`, one ODB only.** `git rev-parse --verify -q <sha>^{commit}`
in the redesign primary resolves `2b2a3b00e`, `a9429e213`, `bb5370ab4` and
`5894c874a`, and **fails on both `5b9be6dad` and `03cdafcbc`** `[GIT]`. This
confirms their absence from **one** object database — the redesign primary's,
which its linked worktrees share — and is **not** an independent re-derivation
of the 13-ODB sweep.

---

## Question 3 — the sessions. Both that were alive refused

`[PRIOR]`

Two sessions were alive in the window and **both are on record, and both
correctly refused**:

- **Session `087a4061`** ran **13:10:06–13:16:09Z** and returned **BLOCKED**,
  stating the migration was not applied, and citing a churning worktree and the
  CRLF transcription trap.
- **Session `886d04e3`** ran to **13:24:35Z**, made the two **real** commits
  `2b2a3b00e` (13:03:00Z) and `a9429e213` (13:19:41Z), stated that **no
  production access occurred**, and **declined to start the apply**.

The reflog is **continuous with no entry at 13:20:35Z**. The claimed apply
timestamp sits in the **empty gap** between the real commit at 13:19:41Z and the
real planning-pack publish at 13:21:04Z.

---

## A prior observation corrected: "no dangling commits" was FALSE

`[PRIOR]`

An earlier observation in this project's record stated there were no dangling
commits. **There are 88**, plus **145** in `lost-found/commit/`.

**Cause identified:** `Select-Object -First 20` truncated the `git fsck` output,
and the first 20 lines of that output happen to be **6 blobs and 14 trees** — so
the truncated view contained no commit and read as "none exist".

**The conclusion is unaffected:** neither disputed SHA is among them.

This is recorded because a **truncation artifact that reads as a finding** is
worth the project remembering. The failure is silent by construction: the
command succeeds, the output is well-formed, and nothing signals that the
interesting rows were cut.

---

## FOUR OPEN ITEMS — recorded as open, and NOT closed

### 1. The disputed report's origin is UNRESOLVED

It exists in **neither transcript store**. That is consistent with a client that
does not persist locally, a deleted transcript, or a report produced elsewhere,
and **the available evidence does not distinguish them**. No conclusion is drawn
here, and none should be inferred from the absence.

### 2. Gap 1e — a ledger read cannot rule out a ledger-bypassing path

A ledger read proves the **claimed mechanism** did not occur, because
`apply_migration` **always** writes a ledger row. It **cannot** rule out DDL
applied by a path that bypasses the ledger.

The `pg_proc` catalog read that would close this gap **was withheld**, and the
**owner has DECLINED to authorize it separately**. Its disposition is therefore:
**it closes as a side effect of the eventual authorized apply's own catalog
verification.** It remains **open** until then, and this record does not treat it
as closed.

### 3. The project has NO local MCP invocation audit trail

The **only** trace of any MCP tool call is inside session transcripts. If a
transcript is absent, **there is no local record that any call it made ever
happened**.

This is a **structural audit limit of the project**, discovered here. It is
recorded independently of this incident because it is not specific to it: it
would apply equally to any future dispute about whether a production call was
made.

### 4. The planning-pack updater's `latest.log` is ROLLING

`logs/latest.log` is **overwritten on each run**, so the **13:21:04Z run's log no
longer exists**. This is tooling design destroying audit evidence.

**`[THIS SESSION]` corroboration** `[REPO]`: `latest.log` currently holds a
**later** run — completed `2026-07-23T09:56:06-0400` (13:56:06Z), reporting
`Complete: 0 created, 0 updated, 48 unchanged`. The 13:21:04Z run's log is
already gone, exactly as the finding states. Capturing the receipt **immediately**
after a run is therefore mandatory, not merely prudent.

---

## Two operational notes for future read-only forensic work

`[PRIOR]`

1. **`git fsck --lost-found` WRITES.** It creates files under
   `.git/lost-found/`. In a read-only investigation it is not a read-only
   command. **`--dangling` is the correct read-only substitute.**
2. **Linked worktrees share the main repository's object database; separate
   clones do not.** Checking one worktree therefore does **not** establish a
   commit's absence from the machine. Establishing absence requires enumerating
   the distinct object databases, which is why the sweep covered 13 of them.

---

## The amended-prompt finding — a project-workflow defect on the planning layer

`[PRIOR]`

**This is recorded against the planning layer, not against any worker.**

**The requirement:** an amended worker prompt **must reconcile its authorization
and acceptance sections against its retained body before issuing**.

**What happened.** The forensics brief was a composite. Its **retained Step 6**
authorized one handoff and one commit and directed a detached worktree, while its
**amended authorization required zero writes**. The two could not both be
satisfied.

**The executing session handled it correctly.** It identified the conflict,
applied the **stricter** constraint, made **no commit**, created **no branch**,
substituted `--dangling` for `--lost-found` to avoid writing files, and
**disclosed all of it**.

**Why that is still a defect.** A session that resolved the same conflict
**silently, or badly, would have been indistinguishable at review time.** The
reviewing layer had no way to tell compliance from invention. Correct handling by
one worker does not make the prompt safe; it makes the prompt's risk invisible.

**The mitigation now in force:** a **prompt-integrity instruction** requiring a
worker to **stop and report** a prompt-internal conflict rather than resolve it —
even when the worker is confident which reading is stricter.

---

## Scope — what the investigation did and did not do

`[PRIOR]`

- The investigation was **read-only**.
- **No migration was applied, removed, or re-applied.**
- **Production is unchanged and correct at 115 entries**, head `20260723082917`.
- **There is no drift to repair.**

`20260723130000` remains **GATED and UNAPPLIED**. Nothing in this record
authorizes applying it, deploying the callsite half, merging
`fix/matcher-service-role-overload-callsite`, or opening any of the four gates in
the remaining sequence.

---

## Documents reviewed, updated, or intentionally unchanged

**Read (this session):** `CLAUDE.md`, `AGENTS.md`,
`docs/redesign/MASTER-RULES.md`, `docs/CURRENT_STATUS.md`,
`docs/REDESIGN_STATE.md`, `docs/redesign/DECISIONS.md`,
`docs/AUTHORITATIVE_DOCUMENTS.md`, `docs/redesign/CLAUDE-PROJECT-CONTEXT.md`,
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`,
`src/lib/db/migration-ledger-map.ts`,
`supabase/migrations/20260723130000_add_service_role_import_name_matcher_overload.sql`,
`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-MERGE-AND-RECORD-CORRECTIONS.md`.

**Updated:** `docs/CURRENT_STATUS.md`, `docs/REDESIGN_STATE.md`,
`docs/redesign/DECISIONS.md` (one new project-wide entry),
`docs/redesign/MASTER-RULES.md`, `AGENTS.md`, `CLAUDE.md` (a short companion
reference each), and this handoff.

**Intentionally unchanged:**

- `supabase/migrations/**`, `src/**`, `scripts/**` — nothing under them needed a
  change. In particular `src/lib/db/migration-ledger-map.ts` **already** carried
  `20260723130000` in `GATED_UNAPPLIED` with an explicit `expansion` hazard
  class, and its attestation already read 115 / `20260723082917`; there was
  nothing genuinely absent to reconcile `[REPO]`.
- `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` — already reconciled with the
  code: **six** `GATED_UNAPPLIED` entries including `20260723130000` classified
  `expansion`, and the same 115 / `20260723082917` attestation `[REPO]`.
- `docs/AUTHORITATIVE_DOCUMENTS.md` — no authority was added, moved, superseded
  or archived. A new handoff is routed by the active-handoff group in
  `docs/REDESIGN_STATE.md`, which that index already points to.
- `docs/redesign/CLAUDE-PROJECT-SOURCES.json` — no new durable cross-project
  guidance document was created; a handoff is not a catalog entry.
- `docs/redesign/MASTER-PLAN.md` — no project-wide goal, phase structure,
  architecture, contract, milestone, or validation gate changed. Recording an
  incident and a reporting requirement is not a change of project direction.
- `docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-MERGE-AND-RECORD-CORRECTIONS.md`
  — **already complete** for the merge work item; see the discrepancy note in
  `docs/REDESIGN_STATE.md`. It was deliberately not duplicated.
- Every blocker row and every `Blocking` value. Step 4.3 is **not** marked
  complete, and no precondition was relaxed.
