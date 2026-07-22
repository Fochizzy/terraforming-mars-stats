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
     fire. When the marker is absent or unresolvable there is no trustworthy
     comparison base, so the change is treated as pack-relevant and synchronized
     (superseding the earlier `HEAD~1` fallback — see the 2026-07-22 amendment
     below).
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
   `PostToolUse`, matcher `"Bash"`. It now uses **two** handlers in that one
   matcher group — `if` `Bash(git commit *)` and `if` `Bash(git merge *)` — each
   invoking the script in exec form (`powershell -NoProfile -ExecutionPolicy
   Bypass -File ${CLAUDE_PROJECT_DIR}/.claude/hooks/sync-planning-pack.ps1
   -Trigger commit|merge`; the merge handler and the distinguishing `-Trigger`
   arg were added by the 2026-07-22 amendment below). Project scope (not
   `settings.local.json`) is used so the hook is present in the isolated
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

- The installed updater reads its catalog and document bodies from a **fixed**
  root — its `ROOT` in `update_planning_pack.py`, the primary redesign working
  tree (`C:\Users\izzyh\Documents\Terraforming Mars Redesign`) — never from an
  isolated worktree. The first commit's hook triggered the updater from any tree,
  so a worktree commit made the updater read a tree that did **not** contain that
  commit, report success, and record a **false** sync. The 2026-07-22 amendment
  (below) closes that: the hook now runs the updater only when the current tree
  IS the updater's tree, and otherwise reports synchronization PENDING without
  advancing the marker. Worktree changes still reach Drive only after they are
  merged into the updater's tree, where the merge now fires the hook.
- New-hook approval: Claude Code loads project hooks at session start and asks
  the user to review newly added project hooks. The hook may therefore not be
  live in the same session that introduces it; it becomes active for later
  sessions/worktrees once approved.
- Changing the trigger to edit-based, adding a scheduled task, or adding/retiring
  a catalog entry all require new owner authorization and were not done.

## Amendment — second commit, 2026-07-22 (tree-identity gate, merge trigger, marker-absent fail-open)

A review of this task's own evidence found two defects in the first commit
(`e1dd0cfe`), plus one hardening improvement. All three are fixed on this same
branch as a **second commit**; `e1dd0cfe` was not amended, reset, or rewritten.
Only `.claude/hooks/sync-planning-pack.ps1`, `.claude/settings.json`, and
documentation changed.

### Fix 1 — tree-identity gate (was: false success from a worktree)

The updater resolves every source under a FIXED root (`ROOT` in
`update_planning_pack.py`). The first hook resolved its repository from
`$env:CLAUDE_PROJECT_DIR` — normally an isolated worktree in this project — and
then ran the updater and advanced the marker regardless. On a worktree commit the
updater therefore read a tree that did **not** contain the triggering commit,
returned success, and the hook recorded a false sync and claimed Drive was
current.

The hook now compares the current tree against the updater's actual root and runs
the updater only when they match. When they do not, it does **not** invoke the
updater, does **not** advance `.claude/.pack-last-sync`, and emits a
`systemMessage` naming the worktree and the SHA and stating that planning-pack
synchronization is PENDING and Google Drive is not current for this change.

**Key finding — the comparison is against the updater's own root, NOT the git
main worktree.** The updater's `ROOT` is
`C:\Users\izzyh\Documents\Terraforming Mars Redesign`, which is a git *linked*
worktree. The git *main* worktree (the first entry of `git worktree list
--porcelain`) is `C:\Users\izzyh\Documents\Terraforming Mars` — a **different**
directory. Comparing the current tree against the main worktree (a tempting
git-only heuristic) would be wrong on this machine: it would authorize a sync
from `Terraforming Mars` (which the updater never reads) and report PENDING for
the `Terraforming Mars Redesign` tree (which it does read). So the hook derives
the updater's root at runtime instead: it parses the single `ROOT = Path(r"...")`
assignment out of `update_planning_pack.py`, located via
`%LOCALAPPDATA%\TMPlanningPackUpdater` (install convention — no user-specific
absolute path is committed to the hook). If that root cannot be determined, the
hook reports PENDING rather than guessing; silence is safer than a false success.

### Fix 2 — merge trigger (was: merges never fired the hook)

`git merge` creates a commit without invoking `git commit`, so the original `if`
`Bash(git commit *)` handler never fired on a merge. After Fix 1, a merge into
the updater's own tree is the primary event this hook exists to catch. A second
handler in the same matcher group is gated on `if` `Bash(git merge *)`. Command
hooks are deduplicated by command + args (the `if` field is excluded from the
dedup key), so the two handlers pass distinct args — `-Trigger commit` /
`-Trigger merge` — which guarantees both survive dedup and also lets the emitted
messages name the operation. `git commit` and `git merge` are the only triggers;
no further trigger was added.

### Fix 3 — marker-absent fail-open (was: HEAD~1 could undercount)

When `.claude/.pack-last-sync` is absent or unresolvable, the original hook used
`HEAD~1` as the comparison base. After a merge that lands many commits, `HEAD~1`
undercounts the changed set and can miss a pack-relevant file. The
absent-or-unresolvable-marker case now treats the change as pack-relevant and
synchronizes. Failing open toward publishing is the safe direction; failing open
toward silence is not.

### Evidence

A disposable-repo PowerShell harness invoked the actual edited hook exactly as
`settings.json` does (`powershell -NoProfile -ExecutionPolicy Bypass -File
sync-planning-pack.ps1 -Trigger <commit|merge>`) with a fully controlled
environment: `CLAUDE_PROJECT_DIR` → a temp git repo, `LOCALAPPDATA` → a fake
updater whose `ROOT` was set per scenario (with decoy `Path(...)` lines to prove
the regex selects only the `ROOT` assignment), and `USERPROFILE` → a stub `.bat`
that recorded its own invocation and returned a chosen exit code. **39 assertions
across 10 scenarios all passed:**

- IS updater tree + pack-relevant + stub exit 0 → updater invoked, marker
  advanced to HEAD, message names `commit`.
- NOT updater tree → PENDING naming the worktree, the SHA, and "Google Drive is
  NOT current"; updater not invoked; marker unchanged.
- Updater root undeterminable → PENDING "could not determine"; no invoke; marker
  unchanged.
- `-Trigger merge` + absent marker + `--no-ff` merge (IS updater tree) →
  synchronized; marker advanced to the merge commit; message names `merge`.
- Absent marker + a **non**-pack-relevant change → still synchronized (Fix 3
  fail-open), proving the behavior change versus `HEAD~1`.
- Marker present + non-pack-relevant change → updater not invoked, marker
  advanced (existing behavior preserved).
- No-op (marker == HEAD), inert (no catalog), updater exit 3 (failure → marker
  unchanged), and `.bat` missing (pending → marker unchanged) all behave as
  before.

No real Drive updater was ever run: the updater-reaching scenarios used stub
`.bat` files under a temporary `%USERPROFILE%`. The hook always exited 0.

### Documents reconciled by this amendment

- `docs/REDESIGN_STATE.md` — an amendment note under the tooling subsection.
- `docs/redesign/DECISIONS.md` — the hook-enforcement decision updated for the
  tree-identity gate, the merge trigger, and the marker-absent fail-open.
- `CLAUDE.md` — the step-8 note updated to name both triggers.
- This handoff — the now-superseded "Known limitations" Defect-1 description, the
  `HEAD~1` fallback statement, and the commit-only-trigger statement were
  reconciled inline above.

### Post-commit synchronization for THIS amendment

This second commit is made in the worktree `C:\tmp\tm-pack-sync-hook`, which is
NOT the updater's tree. Per Fix 1, planning-pack synchronization is therefore
PENDING for this commit and Google Drive is not current for it; the planning pack
will refresh when this branch is merged into the updater's tree (which now fires
the hook). This is reported explicitly rather than run from the wrong tree — the
exact behavior the amendment makes automatic.
