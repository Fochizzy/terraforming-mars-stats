# Handoff — Planning-pack sync hook: instruction-set completion

**Date:** 2026-07-22
**Branch:** `docs/planning-pack-hook-instruction-sync` (isolated worktree
`C:\tmp\tm-pack-hook-docs`), created from
`redesign/tm-stats-dashboard-rebuild` at merge commit
`7dc694b24861fd6f3a66abbbf05f130da0dda5f4` (parents
`47c607cd6ef63ebfd5e76590d4345dfa2906f892` and
`9b874f2fffe84e1a76f7c92adb95c8298a6bab26`).
**Category:** Documentation and governance only. **Not Phase 4 work.**

This task changes no application code, migration, schema, hook script, installed
updater, or production state. No push, deploy, migration, or production
read/write was performed. It only makes the instruction set correctly and
completely describe the planning-pack synchronization hook that already shipped
(`e1dd0cfe` + `9b874f2f`, merged at `7dc694b2`).

## Problem

The post-commit/post-merge planning-pack synchronization hook shipped with a
step-8 note added to `CLAUDE.md`, plus `DECISIONS.md` and `REDESIGN_STATE.md`
entries. Two of the three governance files that also carry the post-commit
synchronization gate were **not** updated to describe the hook:

- `AGENTS.md` (the Codex-facing instructions) said nothing about the hook. Codex
  does not execute Claude Code hooks, so `.claude/settings.json` is inert for it;
  a repo where synchronization is automatic for one agent and manual for the
  other, with nothing saying which, is the defect this task closes.
- `docs/redesign/MASTER-RULES.md` carries the post-commit synchronization gate in
  its "Claude Project context delivery" section but did not mention the hook.

Even the shipped `CLAUDE.md` note did not state three load-bearing facts an agent
needs: that an automatic updater run in the updater's tree is *expected* (not a
violation, scope expansion, or stop condition, including in publish-forbidding
tasks); that a non-tree PENDING message *is* the synchronization report, not a
failure; and that agents must not disable the hook, hand-edit the marker, or run
the updater manually to bypass the gate.

## Hook behavior verified (from the tree and the script, not assumed)

Read `.claude/hooks/sync-planning-pack.ps1` and `.claude/settings.json` on the
merged branch. Confirmed against the brief:

- Two `PostToolUse`/`Bash` handlers, `if Bash(git commit *)` and
  `if Bash(git merge *)`, disambiguated by `-Trigger commit` / `-Trigger merge`
  (distinct args also survive command+args hook dedup).
- Runs the updater only when the current tree IS the updater's `ROOT`, parsed at
  runtime from `%LOCALAPPDATA%\TMPlanningPackUpdater\update_planning_pack.py`
  (that `ROOT` is a git *linked* worktree, distinct from the git main worktree).
- When the tree is not that `ROOT`: does not run the updater, does not advance
  `.claude/.pack-last-sync`, and emits a PENDING `systemMessage` naming the
  worktree and SHA.
- Absent/unresolvable sync marker or unreadable diff/catalog is treated as
  pack-relevant (fail open toward publishing).
- Always exits 0.

The documentation written here matches that behavior. No script/documentation
discrepancy found.

## What changed (three target files only)

- **`CLAUDE.md`** — added one paragraph after the existing step-8 hook paragraph:
  an automatic run in the updater's tree is expected (not a violation, scope
  expansion, or stop condition, including in publish-forbidding tasks); a
  non-tree commit/merge does not publish and its PENDING message is the
  synchronization report, not a failure, with the pack publishing when the work
  reaches the updater's tree; do not disable the hook, hand-edit
  `.claude/.pack-last-sync`, or run the updater manually to bypass the gate. The
  existing hook paragraph (which already covers "enforcement aid, not a
  replacement" and stays correct if hooks are disabled) was left unchanged.
- **`AGENTS.md`** — added one paragraph at the end of the "Documentation and
  synchronization completion gate" subsection: the hook exists and runs the same
  updater after a commit/merge from the updater's tree, but is **Claude
  Code-only**; Codex does not execute Claude Code hooks, so `.claude/settings.json`
  is inert and the manual post-commit step (step 7) remains fully in force; plus
  the expected-run / non-tree-pending / do-not-bypass facts.
- **`docs/redesign/MASTER-RULES.md`** — added one bullet in the "Claude Project
  context delivery" section, immediately after the existing "After commit, run
  the authorized desktop planning-pack updater" bullet (the bullet that carries
  the gate): a parallel statement that post-commit/merge synchronization in the
  updater's tree is additionally hook-enforced, Claude Code-only, that the
  written after-commit rule stays authoritative when the hook is disabled /
  unavailable / unapproved / outside the updater's tree, that an automatic run is
  expected while a non-tree PENDING is the report, and do-not-bypass.

Each addition sits within the same synchronization-gate context each file already
had and is kept clearly distinct from the separate DEPLOY-STATE / production-
action synchronization rule, which was **not** edited or entangled.

## Canonical documents reviewed

`CLAUDE.md`, `AGENTS.md`, `docs/redesign/MASTER-RULES.md`,
`.claude/hooks/sync-planning-pack.ps1`, `.claude/settings.json`,
`docs/redesign/DECISIONS.md` (hook entry, read-only),
`docs/agent-handoffs/PLANNING-PACK-POST-COMMIT-SYNC-HOOK.md`,
`docs/redesign/CLAUDE-PROJECT-CONTEXT.md`, `docs/CURRENT_STATUS.md`,
`docs/AUTHORITATIVE_DOCUMENTS.md`, `docs/REDESIGN_STATE.md`, and
`scripts/validate-claude-project-context.mjs`.

## Documents updated

- `CLAUDE.md`, `AGENTS.md`, `docs/redesign/MASTER-RULES.md` — the gap fill above.
- `docs/REDESIGN_STATE.md` — active-handoff-group pointer to this handoff.
- This handoff.

## Documents intentionally NOT changed, with reasons

- **`docs/redesign/DECISIONS.md`** — the hook decision is already recorded; the
  brief forbids editing it, and it needs no change.
- **`docs/CURRENT_STATUS.md`** — its maintenance rule updates it only when the
  current phase, release boundary, next work item, or production migration state
  changes. This documentation-only change alters none of those. (Also outside the
  allowed edit list.)
- **`docs/AUTHORITATIVE_DOCUMENTS.md`** — its maintenance rule updates the index
  only when a current authority is added, moved, superseded, or archived. No
  authority routing changed; the three edited files are already indexed and the
  hook decision already lives in the already-indexed `DECISIONS.md`. (Also outside
  the allowed edit list.)
- **`docs/redesign/MASTER-PLAN.md`, `CLAUDE-PROJECT-SOURCES.json`,
  `CLAUDE-PROJECT-CONTEXT.md`, phase files, `DEPLOY-STATE.md`** — out of scope;
  no project-direction, catalog, generation-contract, phase, or production change.

## Validation

- `npm.cmd run validate:claude-context -- --require-maintenance` — see the task
  report for the exact exit code and JSON summary.
- `git diff --check` — clean.

## Post-commit synchronization for THIS commit

This commit is made in `C:\tmp\tm-pack-hook-docs`, which is NOT the updater's
`ROOT`. Per the hook's tree-identity gate, planning-pack synchronization is
therefore PENDING for this commit and Google Drive is not current for it. The
updater was **not** run manually — running it from a non-ROOT tree is exactly the
false-success case the hook prevents. The pack will publish when this branch is
merged into the updater's tree under separate owner authorization, where the
merge fires the hook.

## Notes for the next owner

- Merging this branch would publish (the merge fires the hook in the updater's
  tree). That merge, and any change to the hook, the updater, the source catalog,
  or the DEPLOY-STATE synchronization rule, require new owner authorization.
- No downstream work was started.
