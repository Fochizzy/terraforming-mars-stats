# Handoff — Post-commit planning-pack synchronization hook

**Date:** 2026-07-22
**Branch:** `tooling/planning-pack-sync-hook` (isolated worktree
`C:\tmp\tm-pack-sync-hook`), created from
`redesign/tm-stats-dashboard-rebuild` at base commit
`47c607cd6ef63ebfd5e76590d4345dfa2906f892`.
**Category:** Local tooling and governance only. **Not Phase 4 work.**

This task does **not** change Phase 4, Step 4.3, or Step 4.4 status, analytics,
schema, migrations, RLS, grants, functions, or any production state. No push,
deploy, migration, or production read/write was performed.

## Problem

CLAUDE.md workflow step 8 (and the equivalent gate in `AGENTS.md`,
`MASTER-RULES.md`, and `CLAUDE-PROJECT-CONTEXT.md`) requires running the local
planning-pack updater after a completing commit. Until now that step depended on
an agent remembering to run it, so a completed commit could leave the planning
pack unsynchronized without any repository-level signal.

## What was built

A deterministic PostToolUse hook that runs the existing, already-authorized
planning-pack updater automatically after a commit that changes a planning-pack
source. It triggers the same updater the documented gate already requires; it
grants no new authority.

1. **`.claude/hooks/sync-planning-pack.ps1`** — the hook handler. Behavior:
   - **Inert outside the redesign repository.** Resolves the repository root from
     `$env:CLAUDE_PROJECT_DIR` (via `git rev-parse --show-toplevel`) and exits 0
     with no action unless `docs/redesign/CLAUDE-PROJECT-SOURCES.json` is present
     under it. As defence in depth, a readable `origin` remote that is clearly a
     different project also makes it inert; an unreadable remote does not disable
     enforcement, so isolated worktrees still fire.
   - **No-op when HEAD did not advance.** Reads the last-synced SHA from
     `.claude/.pack-last-sync`; if it equals HEAD, exits 0 with no action. This
     makes the hook a no-op after a failed commit, a no-op turn, or a repeated
     fire. When the marker is absent, the previous commit (`HEAD~1`) is the
     comparison point.
   - **Catalog-derived watch set.** Computes the files changed between the
     comparison point and HEAD, then decides pack-relevance by deriving the
     watched set **at runtime** from `CLAUDE-PROJECT-SOURCES.json`: every
     `documents[].path`, the configured phase-file range
     (`phaseDocuments.directory` with two-digit prefixes inside
     `[first,last]`), and any file under `docs/agent-handoffs/`. No document
     filename is hard-coded. If the catalog cannot be read or parsed, the change
     is treated as pack-relevant rather than silently skipped.
   - **No pack-relevant change:** records HEAD to `.claude/.pack-last-sync` and
     exits without running the updater.
   - **Pack-relevant change:** invokes
     `%USERPROFILE%\Desktop\Refresh TM Project Planning Pack.bat`. On success it
     records HEAD as synced; on failure it leaves the marker unchanged and emits
     a `systemMessage` naming the exit code. If the `.bat` is absent it emits a
     `systemMessage` that synchronization is **pending** because the updater is
     unavailable and does **not** advance the marker (it never claims Drive is
     current).
   - **Always exits 0. Never exits 2.** The existing updater owns its own
     concurrent-run lock, so the hook adds none.

2. **`.claude/settings.json`** (project scope, committed) — registers the hook on
   `PostToolUse`, matcher `"Bash"`, handler `if` `Bash(git commit *)`, invoking
   the script in exec form (`powershell -NoProfile -ExecutionPolicy Bypass -File
   ${CLAUDE_PROJECT_DIR}/.claude/hooks/sync-planning-pack.ps1`). Project scope
   (not `settings.local.json`) is used so the hook is present in the isolated
   worktrees where this project's implementation work happens. The `.bat`
   reference stays `%USERPROFILE%`-relative so nothing machine-specific is
   committed.

3. **`.gitignore`** — adds `.claude/.pack-last-sync` (a per-worktree marker, not
   tracked).

4. **Documentation** — this handoff; a `DECISIONS.md` entry; a `REDESIGN_STATE.md`
   subsection and active-handoff-group entry; and a note in `CLAUDE.md` that step
   8 is now hook-enforced without weakening the written instruction.

## Evidence

- **Base derivation.** `git rev-parse HEAD` on
  `redesign/tm-stats-dashboard-rebuild` = `47c607cd6ef63ebfd5e76590d4345dfa2906f892`;
  worktree created at that commit; working tree clean at start.
- **Hook behavior.** A disposable-repo harness exercised 13 scenarios / 36
  assertions, all passing: no-op (marker == HEAD), no-pack-change, pack-change
  via a watched document path, via a git-sourced `path` (`DEPLOY-STATE.md`), via
  the `docs/agent-handoffs/` prefix, and via an in-range phase file; an
  out-of-range phase file (`25-…`) correctly excluded; missing `.bat` reports
  pending and leaves the marker unchanged; an updater exit code of 3 reports the
  failure and leaves the marker unchanged; an unreadable catalog fails open;
  and three inert paths (unset project dir, non-git dir, git repo without the
  catalog). The updater-reaching scenarios used stub `.bat` files under a
  temporary `%USERPROFILE%`, so the real Drive updater was never triggered by
  the tests. The real worktree confirmed the no-op and inert paths (exit 0, no
  output, marker unchanged).
- **No hard-coded list.** `grep` over `.claude/hooks/sync-planning-pack.ps1`
  finds no literal planning-pack document-filename list; the watch set is read
  from the catalog at runtime.

## Canonical documents reviewed

`CLAUDE.md`, `AGENTS.md`, `docs/redesign/MASTER-RULES.md`,
`docs/AUTHORITATIVE_DOCUMENTS.md`, `docs/CURRENT_STATUS.md`,
`docs/REDESIGN_STATE.md`, `docs/redesign/DECISIONS.md`,
`docs/redesign/CLAUDE-PROJECT-CONTEXT.md`,
`docs/redesign/CLAUDE-PROJECT-SOURCES.json`, and
`scripts/validate-claude-project-context.mjs`.

## Documents updated

- `docs/REDESIGN_STATE.md` — new tooling subsection; new active-handoff-group
  entry pointing to this handoff.
- `docs/redesign/DECISIONS.md` — new project-wide decision that post-commit
  planning-pack synchronization is hook-enforced and the watch set is catalog-
  derived, not duplicated.
- `CLAUDE.md` — a note under the synchronization gate that step 8 is now
  hook-enforced, without weakening the written instruction (it stays correct if
  hooks are disabled).
- `.gitignore`, `.claude/settings.json`, `.claude/hooks/sync-planning-pack.ps1` —
  the tooling itself.

## Documents intentionally NOT changed, with reasons

- **`docs/CURRENT_STATUS.md`** — its own maintenance rule updates it only when
  "the current phase, release boundary, next work item, or production migration
  state changes." This change alters none of those, so it is left unchanged.
- **`docs/AUTHORITATIVE_DOCUMENTS.md`** — its own rule updates it "when a current
  authority is added, moved, superseded, or archived." No authoritative document
  in the routing index is added/moved/superseded/archived; the new decision lands
  inside the already-indexed `DECISIONS.md`. Left unchanged.
- **`docs/redesign/CLAUDE-PROJECT-SOURCES.json`** — no catalog entry is added or
  retired (that requires separate owner authorization and is not needed; the
  hook derives its watch set from the existing catalog). The hook script and
  this handoff are not durable cross-project guidance documents for the pack.
- **`docs/redesign/MASTER-PLAN.md`** — the project's governance rule already
  requires post-commit synchronization; adding a hook that enforces an existing
  rule is an implementation detail of that rule, not a change to project goals,
  authority rules, phase structure, or a documented milestone. Left unchanged.
- **`docs/redesign/CLAUDE-PROJECT-CONTEXT.md`** — the generation contract is
  unchanged; the hook is a new trigger for the same updater, and editing this
  catalog document solely to mention the hook would create another source change.

## Known limitations / notes for the next owner

- The installed updater reads its catalog and document bodies from the **primary**
  redesign working tree (`C:\Users\izzyh\Documents\Terraforming Mars Redesign`),
  not from an isolated worktree. So when the hook fires after a commit on a task
  branch in a worktree, it triggers the updater against the primary tree; the
  worktree's own changes are reflected only after they are merged into the
  primary tree and a commit fires the hook there. This mirrors the existing
  updater binding and is not changed by this task.
- New-hook approval: Claude Code loads project hooks at session start and asks
  the user to review newly added project hooks. The hook may therefore not be
  live in the same session that introduces it; it becomes active for later
  sessions/worktrees once approved.
- Changing the trigger to edit-based, adding a scheduled task, or adding/retiring
  a catalog entry all require new owner authorization and were not done.
