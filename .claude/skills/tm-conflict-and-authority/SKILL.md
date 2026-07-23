---
name: tm-conflict-and-authority
description: Use the moment two TM Stats sources disagree, or a document turns out not to match reality — a doc says one thing and the code, migration, ledger, test, or production evidence says another; two documents contradict each other; a statement looks stale; or you are about to decide whether something is allowed. Covers the conflict procedure, evidence precedence, and the separation between evidence correcting a fact and evidence granting scope. Fires on: the docs say X but the code does Y, this looks out of date, which document wins, is this still true, am I allowed to, does this authorize me, should I just fix it while I'm here.
---

# Conflicts and authority

This skill is procedure. It authorizes nothing, and reaching a conclusion about
which source is current never expands what you may do.

## 1. Do not silently choose

The failure this exists to prevent is quiet resolution. A session that picks the
source it finds more convincing, acts on it, and never says a conflict existed
produces work that looks clean and is unreviewable — the reviewer cannot see the
decision, so they cannot check it.

Surface it, then decide.

## 2. The procedure

1. **Identify both passages** — file, heading, and the date or commit each carries.
2. **Inspect the evidence**: the implementation, executable tests and harnesses,
   migrations and the reconciled ledger, blocker and handoff records, and any
   recorded production verification you already have. Do not acquire new
   production evidence unless your assignment authorizes it.
3. **State which factual source appears current, and why.**
4. **Stop before implementing** when the conflict touches scope, safety, data, or
   release authority.
5. **Record the resolution where the state lives**, not only in your report — a
   conflict resolved only in a report reappears for the next session.
6. **Do not mark it resolved without executable verification.**

The ordering of evidence classes, the instruction and scope authority order, and
the full conflict steps are at `docs/AUTHORITATIVE_DOCUMENTS.md` →
`## Evidence precedence`, `## Instruction and scope authority`, and
`## Conflict handling`, with the routing at `CLAUDE.md` →
`## Authoritative project information` and `AGENTS.md` → `## Required reading`.
Read them there rather than reasoning from memory about which outranks which.

## 3. The separation that matters most

**Evidence corrects facts. It never grants scope.**

Proving a document stale tells you what is true. It does not tell you that you may
act on it. These are the shapes to refuse:

- "The doc was wrong about this, so I corrected the code." — Being right about the
  fact is not authorization to change the code.
- "While verifying, I found a real bug, so I fixed it." — Finding it is in scope;
  fixing it is a separate decision.
- "The blocker turned out not to apply, so I proceeded." — A dissolved precondition
  is a finding to report, not a granted permission.
- "Nothing forbade it." — Absence of a prohibition is not authorization.

Report the finding. Let the owner decide what it authorizes.

## 4. Freshness is not authority either

A newer document does not automatically outrank an older one; the documented
authority order does. Archived material stays historical unless a current
authority explicitly promotes it — the rule, and whether an archive directory
currently exists at all, are at `docs/AUTHORITATIVE_DOCUMENTS.md` →
`## Historical documents`. Treat a generated or aggregated orientation copy as
navigation only: where it disagrees with a canonical file, the canonical file is
right and the copy is stale.

## 5. What to hand back

Name the two sources, quote the conflicting lines, say which appears current and
on what evidence, say what you did **not** do because of it, and say what decision
you need. If you applied the stricter of two conflicting instructions, say that
you did — an unstated strictness looks identical to not having noticed.
