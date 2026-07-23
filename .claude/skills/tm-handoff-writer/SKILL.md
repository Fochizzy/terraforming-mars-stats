---
name: tm-handoff-writer
description: Use when finishing any TM Stats task that needs a record under docs/agent-handoffs/ — a completed substep, investigation, remediation, audit, record correction, tooling change, or anything another session will have to pick up. Covers the handoff header facts, the reviewed/updated/intentionally-unchanged disposition, and registering the handoff in the state document so the validator accepts it. Fires on: write the handoff, record this work, document what I did, update the docs before committing, what do I need to write before I commit.
---

# Writing a handoff

This skill is procedure. It authorizes nothing — writing a handoff does not
approve the work it describes, close a blocker, or grant the next step. Nor does
it authorize the writing itself: if your assignment permits no writes, you write
no handoff and no state edit, and you report that instead. An assignment that
authorizes a document while forbidding writes is a conflict to disclose, not to
resolve by picking the permissive reading — see `tm-conflict-and-authority`.

A handoff exists so a session that was not present can reconstruct what happened
and what it may rely on. Write for that reader.

## The eight facts the header must carry

Put these at the top, before any narrative:

1. **Title** — what the task was *and what actually happened*. "…applied", "…built
   locally, gated", "…investigation, STOP". Not just the subject.
2. **Date.**
3. **Branch**, and the lineage it belongs to when the repository has more than one.
4. **Worktree** — the path, when the work was isolated. A reader checking your
   claims needs to know which tree to look in.
5. **Base commit** the branch was created from.
6. **Category** — the class of work, stated positively and negatively: what it is,
   and what it is *not*.
7. **Authorization held** — enumerated.
8. **Authorization not held, and what did not occur** — enumerated. Name the
   production surfaces you did not touch, one by one.

Fact 8 is the one that gets skipped and the one that matters most. "No production
access occurred" is weaker than a list, because a list is falsifiable and a
summary is not. Tag the claims as `tm-evidence-and-report` describes.

## The disposition section

Every canonical document gets one of three dispositions, and all three are
written down:

- **Read** — list them.
- **Updated** — list them, each with what changed and why.
- **Intentionally unchanged** — list them, each with the reason, tested against
  *that document's own maintenance rule*.

The third is not optional padding. A document missing from the handoff is
indistinguishable, at review time, from a document you forgot. Naming it and
giving the reason converts an invisible omission into a checkable decision.

Test each "unchanged" against the document's own rule rather than your judgement.
The routing index and the state document each state when they must be updated;
quote the condition you are failing to meet, then say your change does not meet
it. Where the rules live: `CLAUDE.md` → `### Required review after work`,
`AGENTS.md` → `### Documentation and synchronization completion gate` and
`## Handoff`, and `docs/AUTHORITATIVE_DOCUMENTS.md` → `## Maintenance`. Read them
there; this skill does not restate them.

## Register the handoff

Add it to the state document's active handoff group — the first contiguous bullet
list under `docs/REDESIGN_STATE.md` → `## Latest handoff`, which a blank line ends.

The context validator enforces two things mechanically: the state document must
be part of the same change, and a changed handoff must be *referenced* from the
state document. A handoff that is not registered will fail the gate, and the
generated orientation copy will not carry it. What the group must contain is at
`docs/redesign/MASTER-RULES.md` → `## Claude Project context delivery`.

## Sections worth carrying beyond the header

Practised shape, from `docs/agent-handoffs/PLANNING-PACK-POST-COMMIT-SYNC-HOOK.md`
and `docs/agent-handoffs/POST-INTEGRATION-CURRENT-STATE-RECONCILIATION.md`:

- **Problem / why this existed** — the reason, not just the change.
- **What was built or found.**
- **Evidence** — commands and output, not assurances.
- **Files changed.**
- **Documents reviewed / updated / intentionally NOT changed, with reasons.**
- **Known limitations, or a stale statement deliberately left in place.**
- **Production and external effects** — including "none", stated explicitly.
- **Next approved action** — and what is *not* approved.

## Do not

- Do not write a handoff that only records success. Record what you did not
  finish, what you could not verify, and what you deliberately left alone.
- Do not close an open item without executable verification. Recording it open is
  a valid outcome; recording it closed without proof is not.
- Do not edit a canonical document solely to record a post-commit receipt — that
  creates a fresh unsynchronized change. The receipt belongs in the updater's log
  and your report.
