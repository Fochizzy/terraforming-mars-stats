# Phase 4 Step 4.3 — planning-layer assignment defects, recorded

**Date:** 2026-07-23
**Lineage:** redesign (`redesign/tm-stats-dashboard-rebuild`)
**Type:** record of defects found in **assigning briefs** during the matcher
overload sequence. **Nothing applied, deployed, pushed, or read from production —
by the work recorded here or by this record.**

---

## What this document is, and what it is not

This records **twelve defects in how the planning layer writes assignments**, plus
**one open question for the owner**. They accumulated across the guest-identity
and matcher work items of 2026-07-22 and 2026-07-23.

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
already were. Items 5 and 9 are the same defect one work item apart; item 8 is its
class's second instance; item 12 is its class's second instance.

Evidence class **`[PRIOR]`** throughout except where marked. The defects are
recorded from the reports and briefs of the sequence; this document does not
re-derive the underlying work.

---

## The twelve defects

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
