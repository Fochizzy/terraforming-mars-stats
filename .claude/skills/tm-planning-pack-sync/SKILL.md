---
name: tm-planning-pack-sync
description: Use immediately after any TM Stats commit or merge, and whenever the planning pack, the Google Doc, the desktop updater, the sync hook, .claude/.pack-last-sync, the deploy ledger, or synchronization status comes up. Covers the post-commit updater step, the canonical DEPLOY-STATE ref, fail-closed source resolution, the hook's tree-identity gate, and why a PENDING message from a worktree the updater does not read is the correct synchronization report rather than a failure. Fires on: I just committed, did the pack sync, is Drive current, the hook said pending, do I run the updater, record a deploy or migration.
---

# Planning-pack synchronization

This skill is procedure. It authorizes nothing — in particular it does not
authorize a deploy, a migration, a production write, a push, or a merge. It only
describes what to do about synchronization for work you were already allowed to do.

## After the commit

Run the authorized desktop updater, **or** explicitly report synchronization as
pending with the reason. There is no third option, and "the commit is done" is not
a synchronization report.

The requirement is at `CLAUDE.md` → `## Documentation and Claude Project
synchronization gate` (step 8) and `AGENTS.md` → `### Documentation and
synchronization completion gate` (step 7). Read it there.

## A PENDING message from another tree is the answer, not a problem

A committed hook (`.claude/hooks/sync-planning-pack.ps1`, registered in
`.claude/settings.json` on commit and on merge) runs the same updater
automatically. It has a **tree-identity gate**: the installed updater resolves
every source under one fixed root — its own `ROOT`, read at runtime — so it only
ever reads one specific worktree. Firing it from any other tree would make it read
a tree that does not contain your commit, report success, and record a false sync.

So from a tree the updater does not read, the hook deliberately does **not** run
the updater. It emits a PENDING message naming the worktree and the SHA, and
leaves the marker untouched.

**That PENDING message is the synchronization report for that commit.** It is
correct behaviour, not a failure, and not something to work around. Quote it,
attribute it to the hook, and move on. The pack publishes when the work reaches
the updater's tree — where the merge itself fires the hook.

When the hook fires *in* the updater's tree, the automatic run is expected
behaviour too, including in a task otherwise forbidden from publishing: it runs
only the synchronization the gate already requires and grants no new authority.

### Three things never to do

- **Do not disable the hook** to avoid a message.
- **Do not hand-edit `.claude/.pack-last-sync`.** The marker is the evidence that
  a sync happened; editing it manufactures that evidence.
- **Do not run the updater manually to get around the gate.** From the wrong tree
  it publishes a tree without your commit, which is exactly the false success the
  gate exists to prevent.

Report what the hook actually printed. Do not assume it fired, and do not assume
it stayed silent — read its output.

## The deploy ledger

Any session that deploys code, applies a migration, or performs any production
write must append the result to the canonical `DEPLOY-STATE.md` on the production
lineage, commit it there, and then run the updater or report pending.

- The canonical copy is a **Git object**, read from the ref configured in
  `docs/redesign/CLAUDE-PROJECT-SOURCES.json`. Read it with
  `git show <configured-ref>:DEPLOY-STATE.md`. Take the ref from that file rather
  than from memory or from this skill — it is configuration and can change.
- Every filesystem copy is a pointer stub. One asserting a worker version, commit,
  ledger value, or deploy date is stale by construction.
- Updating a non-canonical working copy does not satisfy the requirement.

**Committing the ledger and publishing the pack are two separate actions.** Doing
the first does not do the second. Report them separately.

Full rule: `CLAUDE.md` → `## Production-action synchronization rule` and
`AGENTS.md` → `### Production-action synchronization rule`.

## Fail-closed, by design

Generation resolves Git-sourced documents with `git show <ref>:<path>` and has no
filesystem fallback, so an unreadable ref stops the run instead of publishing a
stale working-tree copy. Generation also fails closed on a missing current phase,
a missing or malformed active-handoff declaration, a duplicate active handoff, or
a missing source file. Details: `docs/redesign/CLAUDE-PROJECT-CONTEXT.md` →
`## Git-sourced catalog documents` and `docs/redesign/MASTER-RULES.md` →
`## Claude Project context delivery`.

If generation fails, the fix is the source it named — not a bypass.

## Claims you may and may not make

- You **may** state what the updater's local log and the Drive result show.
- You **may not** claim the pack is current without an updater receipt.
- You **may not** claim the external assistant has refreshed or ingested the
  linked source. That timing is not yours to observe.

Background on why the gate is shaped this way: `docs/redesign/DECISIONS.md` →
`## Project-wide - post-commit planning-pack synchronization is hook-enforced`,
and the handoff `docs/agent-handoffs/PLANNING-PACK-POST-COMMIT-SYNC-HOOK.md`.
