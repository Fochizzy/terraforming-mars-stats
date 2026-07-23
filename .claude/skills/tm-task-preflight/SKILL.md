---
name: tm-task-preflight
description: Use at the start of any TM Stats assignment, before reading deeply and before writing anything — re-derive repository identity, branch, base commit and worktree cleanliness from git instead of inheriting them from the prompt or a prior report, create an isolated branch-backed worktree to work in, and record the document baseline you read. Fires on: starting a task, new assignment, before I begin, set up a worktree, which branch is this, is the tree clean, what should I read first, is this the right base commit.
---

# Task preflight

This skill is procedure. It authorizes nothing — it does not grant scope, phase,
deploy, migration, production, push, or merge permission, and running it does not
make an assignment allowable.

## 1. Derive the four facts yourself

Never inherit these from the prompt, a handoff, or a prior report. Prompts carry
stale branch names; reports have asserted commits that were never written.

```bash
git remote get-url origin
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git status --porcelain=v1
```

Record all four with the commands that produced them. If the assignment names an
expected base branch or base commit, compare against what git says and report the
comparison, not the assumption.

Then confirm the base commit is where you think it is:

```bash
git rev-parse --verify -q <expected-base>^{commit}
git log --oneline -1 <expected-base>
```

## 2. Stop conditions

Stop, preserve evidence, state the condition, and report — do not improvise —
when:

- repository identity, base branch, or base commit will not verify;
- the worktree is dirty at start, or holds changes you did not make;
- your task branch already exists carrying unrelated work;
- a required document is missing or unreadable;
- two controlling documents conflict materially on a point your task depends on;
- any step appears to require production access you were not granted.

A dirty tree at start matters because another session may be working the same
checkout: your commit would capture their half-finished work, and their next
command may move HEAD under you.

## 3. Work in an isolated, branch-backed worktree

**When your assignment calls for one.** Creating a branch or worktree is itself a
write; a read-only or investigation-only assignment does not get one, and a
session told to write nothing writes nothing.

**Never modify the separate non-redesign checkout** — do not clean, reset, stage,
commit into, copy wholesale from, or otherwise alter it. That prohibition is
absolute and is at `docs/redesign/MASTER-PLAN.md` → `## 4. Non-Negotiable
Constraints`.

```bash
git worktree add -b <task-branch> <path-outside-the-checkout> <base-commit>
```

Then verify the new tree: branch name, HEAD, clean status, same `origin`.

- **Branch-backed, never detached HEAD.** A detached commit is reachable only by
  SHA and is easy to lose.
- **Outside the primary checkout**, so concurrent sessions cannot clobber each
  other's files or move HEAD mid-task.
- **Know whether your tree is the tree the planning-pack updater reads**, because
  that decides what happens when you commit. See the `tm-planning-pack-sync`
  skill.
- A fresh worktree has no `node_modules` and no local env file, so builds and
  tests there may fail for environmental reasons that look like code regressions.
  Decide deliberately where you measure, and say where in the report.

## 4. Record the document baseline

Read what the project's own routing tells you to read, in its order, and record
title, section, and when you read each. The routing is at `CLAUDE.md` →
`## Authoritative project information`, and the authority order and conflict
procedure at `docs/AUTHORITATIVE_DOCUMENTS.md` → `## Instruction and scope
authority` and `## Conflict handling`. Read them there; this skill does not
restate them and is not authority over them.

Verify documentation claims against code, migrations, executable tests, and
harnesses before relying on them. A document can be stale; that makes it wrong
about a fact, and never makes you allowed to do more than the assignment says.

## 5. Before you write a line

State the expected file list. If the work turns out to need a file outside it,
that is a scope question to raise — not an edit to make quietly.

Implement only the assigned substep. Future-phase material is context, never
permission; out-of-scope discoveries are recorded as deferred work; and the next
substep does not begin until the current one is validated, documented, committed,
and marked complete. The rule is at `docs/redesign/MASTER-PLAN.md` →
`### Scope rule`, and the prohibited actions — including deploying, pushing
without explicit instruction, adding dependencies, modifying environment files,
creating migrations or views, changing schema, and fixing unrelated warnings —
at `## 4. Non-Negotiable Constraints`. Read both before you start, not after
someone asks.
