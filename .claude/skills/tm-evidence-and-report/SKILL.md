---
name: tm-evidence-and-report
description: Use when writing, revising, or finishing any TM Stats report, handoff, audit, investigation, review, or status summary — any time you are about to state what you did, what you found, what is deployed, what a commit contains, what a migration ledger holds, or what a production system looks like. Covers evidence-class tagging ([GIT], [REPO], [PROJECT-DOC], [PRIOR], [INFERENCE], [UNVERIFIED]), the report section order, and the identifier check that must run before the report leaves the session. Fires on: write the report, summarise what I did, what's the verdict, did the apply happen, is this deployed, cite a SHA, cite a ledger version.
---

# Reporting with evidence classes

This skill is procedure. It authorizes nothing — no scope, no phase, no deploy,
no migration, no production read or write, no push, no merge.

## Tag every load-bearing claim with how you know it

A reader cannot tell a measurement from a memory unless you say which it is. Tag
inline. The vocabulary in use across the project's records:

| Tag | Means |
|---|---|
| `[GIT]` | Derived this session from a git command you ran. |
| `[REPO]` | Read this session from a file in the checkout. |
| `[PROJECT-DOC]` | Asserted by a canonical project document you read this session. |
| `[PRIOR]` | Committed record of an earlier session's authorized observation. You did not re-derive it. |
| `[INFERENCE]` | Reasoned, not observed. Say what it rests on. |
| `[UNVERIFIED]` | You could not check it. Say why. |

Rules that make the tags worth anything:

- A statement about a live system is `[PRIOR]` or `[UNVERIFIED]` unless *this
  session* read that system under authorization. Never upgrade it because it
  sounds right.
- If a session performed no production access, say so explicitly and enumerate
  what was not called. An absent denial reads as an unstated read.
- `[INFERENCE]` never settles a question that a measurement could settle. Either
  measure it, or record it as unsettled.
- When you correct an earlier record, tag the correction with how *you* know,
  not with how the earlier record knew.

Which class of evidence outranks which, when two factual claims disagree, is
**not** decided here — see `docs/AUTHORITATIVE_DOCUMENTS.md` → `## Evidence
precedence`, and its companion rule that evidence never grants scope under
`## Instruction and scope authority`.

## Verify every identifier before the report leaves the session

Mechanical, sub-second, no judgement:

```bash
git rev-parse --verify -q <sha>^{commit}
```

Run it on **every** commit SHA the report asserts. Check every migration ledger
version you cite against the ledger this session actually read — not against a
version you remember, and not against a version another report asserted.

The rule, including what to do when an identifier does not resolve and what this
check explicitly does *not* prove, is at `docs/redesign/MASTER-RULES.md` →
`## Reporting integrity`, `AGENTS.md` → `### Identifier verification before
reporting`, and authoritatively at `docs/redesign/DECISIONS.md` →
`## Project-wide - a report may not assert an identifier the reporting session
cannot resolve`. Read it there. Do not rely on this summary.

## Section order

Unless the assignment names different sections, close the report with these, in
this order:

1. `VERDICT` — PASS, FAIL, BLOCKED, or INCOMPLETE. One word first, then why.
2. `ASSIGNMENT AND AUTHORIZATION` — what you were told to do; what you held; what
   you did not hold.
3. `DOCUMENT BASIS` — documents read, with section and when.
4. `TARGET` — repository, branch, base commit, worktree.
5. `ACTIONS` — what you actually did, in order.
6. `EVIDENCE` — the commands and their output.
7. `VALIDATION` — every check, its command, its exit status.
8. `CHANGED FILES AND COMMITS`
9. `DISCREPANCIES` — anything that did not match what you were told or expected.
10. `KNOWLEDGE REFRESH` — what the next session should know that no document says yet.
11. `REMAINING RISKS OR BLOCKERS`
12. `DOWNSTREAM WORK` — named, and explicitly not started.

The section list is a reporting convention carried by assignments. The project's
canonical reporting *requirements* are at the headings cited above and at
`AGENTS.md` → `## Handoff`. Where an assignment and this list differ, the
assignment wins.

## Failure modes this exists to stop

- **Collapsing statuses.** A skipped check is not a passed check. A check you did
  not run is not a passed check. Report each one by name.
- **Inheriting facts.** A fact that arrived in your prompt or in a prior report is
  `[PRIOR]` at best until you re-derive it. Re-derive the ones your conclusion
  rests on.
- **Silent conflict resolution.** If two instructions conflict, apply the stricter
  one *and disclose that you did*. A conflict resolved silently is invisible at
  review time.
- **Omission.** Stating only what went well is a false report even when every
  sentence in it is true.
