# Phase 4 Step 4.3 — planning-layer assignment defects, recorded

**Date:** 2026-07-23
**Lineage:** redesign (`redesign/tm-stats-dashboard-rebuild`)
**Type:** record of defects found in **assigning briefs** during the matcher
overload sequence. **Nothing applied, deployed, pushed, or read from production —
by the work recorded here or by this record.**

---

## What this document is, and what it is not

This records **sixteen defects in how the planning layer writes assignments**,
plus **one open question for the owner**. They accumulated across the
guest-identity and matcher work items of 2026-07-22 and 2026-07-23, the last four
in the two-part brief of the correction that closed the thirteenth.

Three things it is deliberately not:

- **It is not a record of worker error.** In every case below a worker caught the
  defect and stopped, reported, or applied the stricter reading. The defects are in
  the instructions, not in the execution.
- **It does not name or grade individual sessions.** Which session received which
  brief is not the useful fact and is not recorded.
- **It is not a change of any disposition.** No blocker moved, Step 4.3 is not
  complete, and nothing here authorizes work.

The reason to write it down is narrow and practical: **none of this was written
down anywhere**, so each defect stayed available to be committed again, and several
already were. Items 5, 9, 13 and 15 are the same defect four times over; item 8 is
its class's second instance; item 12 is its class's second instance; item 14 is
item 1's.

Evidence class **`[PRIOR]`** throughout except where marked. The defects are
recorded from the reports and briefs of the sequence; this document does not
re-derive the underlying work.

---

## The sixteen defects

### 1. Amended-prompt reconciliation

A composite brief's **retained body** directed a detached worktree and authorized
one handoff and one commit, while its **amended authorization** required zero
writes. The two could not both be satisfied.

The executing session identified the conflict, applied the **stricter** constraint,
wrote nothing, and disclosed it — and was then reviewed against only half the
brief.

**Why it is a defect even though it was handled correctly.** A session that
resolved the same conflict silently, or badly, would have been
**indistinguishable at review time**. Correct handling by one worker does not make
the prompt safe; it makes the prompt's risk invisible.

**Mitigation now in force.** The **PROMPT-INTEGRITY INSTRUCTION**: a worker must
**stop and report** a prompt-internal conflict rather than resolve it, even when
confident which reading is stricter.

### 2. Fingerprint versus ingestion

The planning layer treated the planning pack's **source snapshot fingerprint** as
evidence of Google Drive or repository freshness.

It is neither. It is evidence only of **what the external Claude Project has
ingested**. Drive can advance through several publishes while the fingerprint
appears static, because ingestion timing is not controlled from here.

**Check to apply.** Any conclusion about repository or Drive freshness must be
**derived from the repository by a worker**, never inferred from a fingerprint.

### 3. Unsatisfiable path prohibition

Briefs prohibited touching the **main checkout directory**. That directory holds
the **shared object database** for every linked worktree, so any fetch or push from
any worktree necessarily writes there. The prohibition could not be satisfied by
any session that did the work it was assigned.

**Check to apply.** Prohibitions must name the **working tree, branch, and
lineage** — not a filesystem path. A path-shaped prohibition in a repository with
linked worktrees prohibits either nothing or everything, depending on how literally
it is read.

### 4. Unsatisfiable hard stop

An apply brief required a **115-entry ledger** and, in the same step, made **"any
matcher-named entry"** a hard stop. That ledger necessarily contains two
long-standing matcher-named entries — `20260720021300
add_import_player_name_matching_rpc` and `20260722144034
coarsen_import_name_match_reasons` — so the expected-good state violated the stop
condition by construction.

The session stopped and quoted both passages rather than guessing which was meant.
The clause was corrected: the governing predicate is an entry naming the matcher
**overload**.

**Check to apply.** For every hard stop, **confirm the expected-good state
satisfies it** before issuing.

### 5. Under-specified file list

An apply brief named `src/lib/db/migration-ledger-map.ts` but **not**
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`, after a prior session had
reported the two as reconciled **with each other**. The brief's forbidden list then
barred editing the omitted file, so the applying session could not close the gap
even having seen it. The result was a document asserting 115 / `20260723082917`
beside an executable source of truth reading 116 / `20260723151221`.

**Check to apply.** When a change makes a fact stale, **enumerate every document
that asserts that fact** and name each as updated or explicitly unchanged. For
ledger state that set is at minimum: the `.ts`, the `.md`, `REDESIGN_STATE`,
`CURRENT_STATUS`, and `DEPLOY-STATE`.

### 6. Leaked verification baseline

An apply brief printed the **expected `md5` and length** of the two-argument
function inside the instruction to verify it. A report returning those values then
proves less than it appears to, because the values were available without the
check.

**Check to apply.** **Ask for the value; compare it at review.** Do not publish the
baseline in the prompt.

### 7. Transport truncation

**Five consecutive sends** of a brief were truncated in transit at five different
offsets — one mid-word, one mid-prohibition. Receiving sessions stopped and
**reconstructed nothing**, which was correct: a silently truncated prohibition list
reads as a shorter prohibition list.

**Mitigations now in force.** A **BRIEF INTEGRITY CHECK** section inventory, an
explicit `=== END OF BRIEF ===` marker, delivery in **labelled parts with per-part
receipt confirmation**, and **file delivery as a fallback** when the chat path
keeps failing.

**Observed limit of the mitigation.** Detection works; **resend does not
automatically follow**. In the delivery of the brief that produced this document,
two parts truncated and the first two resends re-sent parts that were already
whole, while the actually-truncated part went unsent both times. Detection tells
the planning layer *that* something is missing; the receipt confirmation names
*which* part, and the resend must match that name.

### 8. False premise about document content

A brief asserted that the apply handoff **recorded gap 1e as CLOSED**. That handoff
contains no occurrence of "gap" or "1e" at all. What existed was a **pre-registered
auto-close rule in a different document** — a materially different thing, and the
difference changed what the corrective work had to do.

This was the **second instance of the class**. An earlier brief asserted that a
merge work item was **absent from the canonical record** when its handoff was
already at the **head of the active handoff group**.

**Check to apply.** A brief must not assert what a document says **without the
assertion having been verified against the document**.

### 9. Under-specified file list, repeat

A brief scoped the correction of the gap 1e auto-close rule but **omitted the
document the rule originates in** from its authorized edit list. Executed as
written, it would have corrected three sites and left the **origin** still
asserting the rule — manufacturing exactly the fork the remediation exists to
close.

**Same class as item 5, one work item later.** That recurrence is the reason both
are recorded separately rather than merged into one entry.

### 10. Working-tree publish hazard — corroborated by two independent sessions

**RECORDED AS AN OPEN HAZARD. NO FIX IS APPLIED, AND NONE IS RECOMMENDED AS
DECIDED.**

**The mechanism.** The planning-pack updater reads **twenty-four of its
twenty-five** catalogued documents **from the filesystem**, and one
(`DEPLOY-STATE`) **from Git** via `git show`. The post-commit hook fires on **any**
commit or merge in the redesign primary. Consequently, when a commit fires the hook
while another session has **uncommitted** edits in that tree, those uncommitted
mid-flight edits are published to Google Drive.

**It occurred at least twice in this sequence** — once on a merge and once on a
following commit — with **two canonical documents dirty throughout**. It was
identified **independently by two sessions that had no contact with each other**,
one describing the mechanism as the updater reading the working tree rather than
committed content. The published pack consequently held repository content
existing in **no commit**, and was internally inconsistent: one document published
carrying uncommitted edits, another published **without** an edit that landed
seconds later.

**Note the direction.** This is **not the pack lagging Git**. It is the pack going
**sideways** from Git. Ordinary staleness is recoverable by republishing. This is
not: if the uncommitted work is later revised or abandoned, Drive permanently
carries content that **never existed in history**.

**This is the same defect class already fixed once.** `DEPLOY-STATE` was converted
to a Git source precisely because a filesystem read was publishing a file no
session could commit to. The structural weakness still exists for the other
twenty-four sources; **it rarely bites only because the tree is usually clean.**

**It strengthens the one-writer-at-a-time rule for a reason the project has not
previously recorded:** that rule protects **publish integrity**, not merely merge
safety. Two sessions in one tree can corrupt what Drive holds without either one
making a bad commit.

**What is verified:**

- the catalogued split of **twenty-four filesystem sources plus one Git source**;
- that the tree was **dirty with two modified canonical documents**;
- that the hook **fired and ran the updater on both occasions**.

**What is NOT verified, and each needs its own read-only investigation:**

1. whether the updater has a **clean-tree guard** that would refuse to publish from
   a dirty tree;
2. whether the tree was dirty **at the exact moment each hook fired**.

### 11. Skill and brief conflict

**Ten project skills** were committed to the repository mid-sequence. Skills are
**model-invoked and load automatically**, so a worker may operate under
instructions the review layer has not seen and did not write.

The PROMPT-INTEGRITY INSTRUCTION covered conflicts **within** a brief but said
nothing about a conflict **between a brief and a loaded skill** — under which a
worker would be silently choosing between two authorities, which is the same
failure mode as item 1 with a wider blast radius.

**Mitigation now in force.** The instruction is **extended to skills**, and briefs
require the worker to **report which skills loaded**.

**Still open.** The skills themselves remain **unaudited and uncatalogued**;
reviewing them against the project's rules is an **open owner item** and is not
done here.

### 12. Brief staleness from concurrent work

**Twice**, a brief pinned an **expected HEAD** as a hard-stop condition, and that
HEAD **moved between authoring and delivery** because other authorized work landed
in the same tree in the interval. Both times the receiving session **hard-stopped
rather than proceeding against a moved base**.

**The pin is not the defect** — it is what made the staleness visible, and it
worked. The defect is **issuing a HEAD-pinned brief for a tree in which other work
is in flight**.

**Check to apply.** Confirm **no other work item is active in the target tree**
before issuing, and **re-derive the pin immediately before delivery**.

### 13. Under-specified file list, third instance — a file authorized for one item only

**Added 2026-07-23** by the correction that closed it.

The remediation of 2026-07-23 that corrected the matcher apply's record was
authorized over
`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-APPLY-FORENSICS.md` **for one named
item only**, and its sweep for claims falsified by the apply was scoped to **three
other files**. The forensics handoff's own **Scope** section was therefore never
reached.

It went on asserting, in the present tense, that production was **"unchanged and
correct at 115 entries"** with head `20260723082917`, that `20260723130000`
**"remains GATED and UNAPPLIED"**, and that **four** gates remained — all three
falsified by the 15:12:21Z apply **that the very same commit was recording**. The
commit that brought the record to the applied state left the record's own forensic
source contradicting it, roughly forty lines below an edit it did make in that
file.

**Same class as items 5 and 9, and the third instance in three consecutive work
items** (item 15 is a fourth, in the brief that closed this one)**.** Item 5 named
the `.ts` and not the `.md`. Item 9 scoped a rule's correction and omitted the
document the rule originates in. This one put the file **on** the authorized list
and still left most of it out of scope. The general form: **a file can be named in
the authorization and still be under-specified within itself.**

**Checks to apply — two, because item 5's check would not have caught this.**

1. When a brief authorizes a file **for a named item**, say explicitly whether the
   **rest of that file** is in scope. "Authorized for item 4b" and "authorized"
   are different permissions and must not be written the same way.
2. Item 5's enumeration — *every document that asserts the now-stale fact* — must
   also be run **inside** each authorized file. A file-level list cannot surface
   this defect, because the file is already on it. The unit of enumeration is the
   **claim**, not the filename.

**A note on how it was found.** Not by review of the remediation, which read as
complete and internally consistent. It surfaced only when a later reader followed
the record's own cross-reference from the corrected documents back to the
forensics source and found the two disagreeing.

### 14. A brief self-contradictory between its forbidden list and its own gate

**Added 2026-07-23** by the amendment that resolved it.

The brief that assigned this scope correction **forbade editing
`docs/REDESIGN_STATE.md`** and, in the same brief, **mandated
`validate:claude-context --require-maintenance`** as the pre-commit gate. That
validator requires, unconditionally in maintenance mode, that
`docs/REDESIGN_STATE.md` appear in the change set
(`scripts/validate-claude-project-context.mjs:489`) **`[REPO]`**. The gate could
not pass without editing the file the same brief forbade editing.

The executing session **stopped at the red gate**, made no commit, and did not
edit the forbidden file; the amendment then authorized it narrowly.

**Same shape as item 1** — a brief two of whose provisions cannot both be
satisfied — one work item later, and again caught by item 1's mitigation: stop and
report rather than resolve.

**Check to apply.** Before issuing, **run each mandated gate against the forbidden
list.** A gate that requires a write to a forbidden path is a contradiction the
worker cannot resolve without violating one half of the brief.

### 15. Coupled-document failure, a FOURTH time — the closing brief committing the defect it closed

**Added 2026-07-23** by the amendment that resolved it.

The same brief authorized changing the **defect count in the defects file** but
not in `docs/REDESIGN_STATE.md`, **which carries the same count**, and its
forbidden list then barred the second file. Executed as written, it would have
moved the defects file to a new count while `REDESIGN_STATE` still asserted the
old one — **manufacturing the very two-file disagreement this work item exists to
close, in the brief closing it.** (The count is in fact a coupled fact across at
least three files: the defects file, `REDESIGN_STATE`, and `CURRENT_STATUS`.)

**This is the fourth instance of the class of items 5, 9 and 13**, and the
sharpest of them: the other three under-specified a file list while the subject
was some other correction; this one under-specified it while the work item's
entire subject **was** coupled-document consistency.

**Check to apply.** Item 5's enumeration — every document asserting the now-stale
fact — must be run **before the authorization is written**, so that the
authorized-file set and the stale-fact set are the same set. When they differ, the
brief is internally guaranteed to leave a disagreement.

### 16. A file-count miscount carried between brief parts

**Added 2026-07-23** by the amendment that corrected it.

The brief's authorization-routing section referred to **"the four files in
section 5"** when that section named **three**. The miscount carried forward from
the assigning conversation. Its operative effect was nil — the routing rule is
independent of the count — but in a work item about under-specified file lists, a
brief that miscounts its own file list is worth the record.

**Check to apply.** A cross-reference to another section's list should **name the
list, not a count of it.** "The files named in §5" cannot fall out of sync with
§5; "the four files in §5" can, and did.

---

## Open question for the owner — recorded, not resolved

`docs/redesign/DOCUMENT-OWNERSHIP-MAP.md` **does not exist** — no file, no history,
no ref — yet an audit brief instructed a session to run a **coverage layer against
it**.

Whether it was **planned and never built**, or the **requirement is stale**, is the
owner's ruling. This document does not answer it, and creating that file or ruling
on whether it should exist requires new owner authorization.

---

## Canonical documents reviewed, updated, or intentionally unchanged

**Reviewed:** `docs/REDESIGN_STATE.md`, `docs/CURRENT_STATUS.md`,
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`,
`src/lib/db/migration-ledger-map.ts` (read only),
`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-EXPAND-APPLIED.md`,
`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-APPLY-FORENSICS.md`,
`docs/redesign/CLAUDE-PROJECT-CONTEXT.md`,
`docs/redesign/CLAUDE-PROJECT-SOURCES.json`, `CLAUDE.md`,
`docs/redesign/MASTER-RULES.md`, `docs/AUTHORITATIVE_DOCUMENTS.md`.

**Updated in the same change:** `docs/REDESIGN_STATE.md`,
`docs/CURRENT_STATUS.md`, `docs/redesign/reference/MIGRATION-LEDGER-MAP.md`,
`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-EXPAND-APPLIED.md`,
`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-APPLY-FORENSICS.md`, and this
handoff.

**Intentionally unchanged:**

- `src/**`, `supabase/**`, `scripts/**` — nothing under them needed a change, and
  `src/lib/db/migration-ledger-map.ts` is **already correct** at 116 /
  `20260723151221`.
- `docs/redesign/DECISIONS.md` — no durable decision was approved here. Recording
  defects and checks is not a decision; the checks in items 4, 5, 6, 8 and 12 are
  recorded observations, not adopted policy, and adopting any of them is the
  owner's call.
- `docs/redesign/MASTER-PLAN.md` — no project-wide goal, phase structure,
  architecture, contract, milestone, validation gate or current-phase statement
  changed. Recording how assignments are written is not a change of project
  direction.
- `docs/AUTHORITATIVE_DOCUMENTS.md` — no authority was added, moved, superseded or
  archived. A handoff is routed by the active-handoff group in
  `docs/REDESIGN_STATE.md`, which that index already points to.
- `docs/redesign/CLAUDE-PROJECT-SOURCES.json` — no new durable cross-project
  guidance document was created; a handoff is not a catalog entry.
- `.claude/skills/**` — **not audited, catalogued, indexed, edited, or evaluated.**
  Item 11 records that they are unaudited; doing the audit is a separate
  assignment.
- Every blocker row and every `Blocking` value. **Step 4.3 is not marked
  complete**, no precondition was relaxed, and Step 4.4 was not begun.

### Addendum — 2026-07-23, the correction that added items 13–16 and bannered the forensics Scope section

Delivered as a two-part brief: an initial assignment (truncated in transit and
correctly stopped on — item 7's class again), a full resend, and an amendment. The
resend closed the falsified Scope claims and recorded item 13; the amendment
authorized `docs/REDESIGN_STATE.md` narrowly and recorded items 14–16 — the three
defects in that same brief, surfaced when the resend's own gate contradiction and
file-list gaps forced two BLOCKED stops. Both stops were accepted as correct.

Documentation-only and local. **No production access of any kind**, no migration,
no deploy, no merge, no push, no branch or worktree created, and `src/**`,
`supabase/**` and `scripts/**` untouched. The apply of 15:12:21Z is unaffected and
remains accepted; this corrects its record only.

**Reviewed:** `CLAUDE.md`, `docs/redesign/MASTER-RULES.md`,
`docs/CURRENT_STATUS.md`, `docs/REDESIGN_STATE.md` (active handoff group),
`src/lib/db/migration-ledger-map.ts` (read only — the `[REPO]` basis for 116 /
`20260723151221` and for `GATED_UNAPPLIED` holding five),
`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-APPLY-FORENSICS.md`,
`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-EXPAND-APPLIED.md`,
`docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-EXPAND-APPLIED.md`,
`docs/agent-handoffs/PHASE-04-STEP-03-GUEST-IDENTITY-PRODUCTION-CATALOG-READ.md`,
`docs/agent-handoffs/SAVED-GAME-LABEL-RECORD-CORRECTION-2026-07-23.md`.

**Updated in the same change:**

- `docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-APPLY-FORENSICS.md` — three claims
  in its Scope section bannered, originals retained verbatim.
- This handoff — items 13–16 recorded, the count carried to sixteen, this
  addendum.
- `docs/REDESIGN_STATE.md` — **narrowly, under the amendment**: the defect count in
  the active-handoff-group entry for this work item (`twelve` → `sixteen`, its
  enumeration marked "the first twelve", the outcome clause added). **Nothing else
  in that file** — no status line, phase, blocker, deploy or migration baseline, or
  other handoff group was touched.

**Intentionally unchanged, and each verified rather than assumed:**

- The **gap 1e** material in every file. Out of scope by instruction, and no
  conclusion of it is altered, narrowed, reopened, or referenced as authority.
- `src/lib/db/migration-ledger-map.ts` — **already correct** at 116 /
  `20260723151221`; it is this correction's evidence, not its target.
- `docs/agent-handoffs/PHASE-04-STEP-03-GUEST-IDENTITY-PRODUCTION-CATALOG-READ.md`,
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-EXPAND-APPLIED.md`, and both
  sites in `PHASE-04-STEP-03-MATCHER-OVERLOAD-EXPAND-APPLIED.md` — classified
  **correct dated history**, not falsified. They record the pre-apply ledger, or
  the *guest-identity* apply's own correct post-apply state at 08:29:17Z.
- `docs/agent-handoffs/SAVED-GAME-LABEL-RECORD-CORRECTION-2026-07-23.md` —
  examined and classified **correct dated history**. Its "attestation at 115
  entries" sits under an explicitly past-tense framing recording what a
  verification act read at the time, structurally identical to the sites above.
  Bannering it would misrepresent a dated record as a live claim.
- `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` — already brought to the
  applied state by the 2026-07-23 remediation; nothing stale remained.
- **The two remaining "twelve" defect-count mentions are CORRECT DATED HISTORY and
  deliberately left** — `docs/REDESIGN_STATE.md` line 68 and `docs/CURRENT_STATUS.md`
  line 61. Both sit under a heading scoping them to *what the 85d13bb4 remediation
  did*, and that remediation recorded **twelve**. Raising either to sixteen would
  falsely attribute defects 13–16 — added afterward, by the resend and this
  amendment — to that commit. They are exempt from the count propagation for the
  same reason the "115 entries" sites are exempt from bannering: a dated record of
  a past act is not a stale live claim. `CURRENT_STATUS.md` is additionally outside
  the amendment's authorized file set, so even a live-claim reading would route to
  new owner authorization rather than an edit here; it needs neither.
- `docs/redesign/DECISIONS.md` — no durable decision was approved. The checks in
  items 13–16 are recorded observations, not adopted policy; adopting them is the
  owner's call, exactly as for items 4, 5, 6, 8 and 12.
- `docs/redesign/MASTER-PLAN.md`, `docs/AUTHORITATIVE_DOCUMENTS.md`,
  `docs/redesign/CLAUDE-PROJECT-SOURCES.json` — no project direction, authority
  routing, or catalog entry changed.
- `.claude/skills/**` — still **not audited, catalogued, indexed, or edited**.
  Item 11 stands open.
