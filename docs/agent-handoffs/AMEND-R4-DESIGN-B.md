# AMEND-R4-DESIGN-B — DECISIONS R-4 amended: Design B authorized, the clean-tree guard (Design A) withdrawn, the autorun premise corrected; no fix built

This handoff records a **decision-record amendment only**. It builds no fix, touches no
updater, and grants no production, deploy, migration, push, or next-substep permission.

## Header

1. **Title.** Amend DECISIONS R-4 with a dated amendment (A-1…A-4): Design B supersedes the
   fail-closed clean-tree guard, Design A is withdrawn and not to be built, R-4's "autorun
   path" premise is corrected as factually wrong, the two standing-position overrides are
   recorded as surviving, and repo→installed delivery is recorded as an owner-only action.
   **What happened:** the amendment was written; nothing was built.
2. **Date.** 2026-07-23.
3. **Branch / lineage.** `redesign/tm-stats-dashboard-rebuild` (redesign lineage), the
   planning-pack updater's own tree.
4. **Worktree.** `C:\Users\izzyh\Documents\Terraforming Mars Redesign` — the redesign primary
   (a git *linked* worktree; object database root
   `C:\Users\izzyh\Documents\Terraforming Mars`).
5. **Base commit.** `d4444a4a3f527818db035da778a9a604ac6f5634` (`d4444a4a`), clean tree, 0
   behind / 3 ahead of origin at start **[GIT]**.
6. **Category.** Governance / decision-record amendment and handoff registration. **NOT** a
   fix, **NOT** a guard, **NOT** either candidate design, **NOT** a refactor, **NOT** a
   production/migration/deploy/push, **NOT** a schema or updater change.
7. **Authorization held.** Read-only git and repository inspection; edit
   `docs/redesign/DECISIONS.md` — the R-4 amendment only, no other entry; create and register
   this handoff; edit `docs/REDESIGN_STATE.md` only to register the handoff and update the
   active work-item / next-action fields; exactly one commit; report the publish receipt from
   the updater's local log.
8. **Authorization NOT held, and what did NOT occur.** No build of Design A, Design B, any
   guard, or any part of the hazard fix. No edit to the updater, the hook, any `.bat`, or
   anything under `scripts/planning-pack`. No run of the updater or of
   `sync_installed_updater.py` in any mode. No write outside the repository (including
   delivery). No creation of an autorun and no change to any scheduled task, Startup entry,
   registry key, or system setting. No push, merge, deploy, migration apply, rebase,
   force-push, or history rewrite. No production read or write — no Supabase MCP call, no
   `execute_sql`, no `list_migrations`, no `wrangler`, no `/api/deploy-info`. The original R-4
   text was neither rewritten nor deleted; no other DECISIONS entry (R-1, R-2, R-3, or any
   other) was touched. Gap 1e, the five open findings, PD-1/2/3, the 6d conflict, the
   DOCUMENT-OWNERSHIP-MAP question, and the nine empty phase documents were left untouched.

## Why this existed

DECISIONS R-4 (2026-07-23) authorized building a fail-closed clean-tree guard for the
planning-pack updater, "wired into" the Desktop `.bat` "and the autorun path." Two things
changed that premise the same day:

- `UPDATER-INVESTIGATION-CLOSEOUT` established, evidence class **[SYSTEM]**, that **no autorun
  exists** — so R-4's autorun-path requirement rested on a path that is latent and
  uninstalled.
- The owner ruled for **Design B** (read every source's bytes from the committed tree, the
  mechanism `deploy-state` already uses), which is a root-cause fix, **not** a guard.

R-4 was a genuine owner decision made under a premise that was true as far as anyone then
knew. Per the project's dated-history classification standard (DECISIONS R-3) and the
supersession convention used by the forensics correction (Amendment 1), the original text is
**retained verbatim** and a dated amendment records what changed and why.

## What was written (the amendment records four things, each identifiable)

- **A-1 — Design B supersedes the guard.** Names Design B concretely (committed-tree resolution
  via `git show <ref>:<path>`; the two dynamic docs `tm-project-master-context` and
  `latest-handoff` produced from committed content; working-tree state cannot reach Drive by
  construction) so the build brief can cite A-1 as its authorization without restating the
  design. Design A is **NOT authorized**; the recorded reason is the second-enumeration /
  single-source-of-truth defect class the project has recorded four times (defect items 5, 9,
  13, 15 in `PHASE-04-STEP-03-PLANNING-LAYER-ASSIGNMENT-DEFECTS.md`).
- **A-2 — the autorun premise was wrong.** 210 scheduled tasks carry no updater action; no
  Run/RunOnce entry; Startup holds one unrelated shortcut; `--scheduled` in `run-updater.bat`
  is latent and uninstalled. Under Design B the ".bat and autorun path" requirement is
  satisfied by construction (the fix lives in the updater, which every invocation path runs).
  Creating an autorun is now an independent, unauthorized question.
- **A-3 — what remains in force.** The override of "no fix is applied and none is recommended
  as decided" (working-tree publish hazard, defect 10) and the lifting of the "updater
  clean-tree investigation" excluded-work line both survive; only the mechanism changes.
- **A-4 — delivery is an owner action.** A committed fix does not run until it reaches
  `%LOCALAPPDATA%` via `sync_installed_updater.py --apply`, which an agent session cannot
  perform; `--apply` makes no backup and is non-atomic, so the installed directory should be
  copied first.

A pointer banner was added under the R-4 heading (project blockquote convention) directing a
reader to the amendment; the original authorization text below it is byte-for-byte unchanged.

## Evidence (classes per `tm-evidence-and-report`)

- **[GIT]** Baseline: `git rev-parse HEAD` → `d4444a4a3f527818db035da778a9a604ac6f5634`;
  `git status --porcelain=v1` → empty; `git rev-list --left-right --count
  origin/redesign/tm-stats-dashboard-rebuild...HEAD` → `0  3` (0 behind, 3 ahead);
  `git rev-parse --git-dir` → `…/worktrees/Terraforming-Mars-Redesign`.
- **[REPO]** `discover_sources()` resolves at `scripts/planning-pack/update_planning_pack.py:499`;
  `sync_installed_updater.py` present under `scripts/planning-pack/`; `dynamicDocuments` in
  `docs/redesign/CLAUDE-PROJECT-SOURCES.json` are exactly `latest-handoff` and
  `tm-project-master-context`.
- **[DOC]** The "four times over" claim is grounded in
  `PHASE-04-STEP-03-PLANNING-LAYER-ASSIGNMENT-DEFECTS.md:30` ("Items 5, 9, 13 and 15 are the
  same defect four times over") — the under-specified-file-list / coupled-document class.
- **[DOC]** Design A/B characterization, the [SYSTEM] no-autorun finding, and the owner-only
  non-atomic delivery path are all from `UPDATER-INVESTIGATION-CLOSEOUT.md` (CANDIDATE DESIGNS,
  Q3/DISCREPANCY, T2).

## Files changed

- `docs/redesign/DECISIONS.md` — R-4 pointer banner + appended dated AMENDMENT (A-1…A-4). No
  other entry changed.
- `docs/agent-handoffs/AMEND-R4-DESIGN-B.md` — this handoff (new).
- `docs/REDESIGN_STATE.md` — this handoff registered in the `## Latest handoff` active group; a
  dated `### AMEND-R4-DESIGN-B` current-substep subsection added updating the active work item
  and next action.

## Documents reviewed / updated / intentionally NOT changed

- **Read:** `docs/redesign/DECISIONS.md` (R-1…R-4 region, the R-3 dated-history standard, the
  forensics Amendment 1, the in-entry "Amended" convention), `docs/REDESIGN_STATE.md` (current
  substep + Latest handoff), `docs/agent-handoffs/UPDATER-INVESTIGATION-CLOSEOUT.md`,
  `docs/agent-handoffs/PHASE-04-STEP-03-PLANNING-LAYER-ASSIGNMENT-DEFECTS.md`,
  `docs/redesign/CLAUDE-PROJECT-SOURCES.json`, `scripts/planning-pack/update_planning_pack.py`
  (identifier verification only).
- **Updated:** `docs/redesign/DECISIONS.md`, `docs/REDESIGN_STATE.md`, and this handoff — as
  listed above.
- **Intentionally unchanged:**
  - `docs/CURRENT_STATUS.md` — its maintenance rule fires on a change to current phase,
    blocker, release, migration, or next-action state. This amendment moves none of those: no
    blocker's disposition changed, no phase/deploy/migration baseline changed, and the fix
    remains an unbuilt separate work item. The queued-next-work-item characterization is
    updated in `REDESIGN_STATE.md` (the full detailed state); `CURRENT_STATUS.md` carries no
    R-4 mechanism detail to correct.
  - `docs/AUTHORITATIVE_DOCUMENTS.md` — no authority was added, moved, superseded, or archived;
    routing is unchanged.
  - `docs/redesign/MASTER-PLAN.md` — no project goal, governance rule, phase structure, durable
    architecture, or documented current phase/next-milestone changed; a decision-record
    amendment about a not-yet-built meta-tool fix is not durable project-wide direction.
  - `docs/agent-handoffs/PHASE-04-STEP-03-PLANNING-LAYER-ASSIGNMENT-DEFECTS.md` and the defect-10
    record in `REDESIGN_STATE.md` — dated history, left in place per the R-3 dated-history
    standard (and out of scope for this work item).

## Known limitations / stale statements deliberately left in place

- The dated `RECORD-OWNER-RULINGS-AND-PUSH-OUTCOME` subsection in `REDESIGN_STATE.md` states
  "the updater clean-tree guard (R-4) is the queued next meta-work item." That was correct when
  written; rather than rewrite dated history, the new `### AMEND-R4-DESIGN-B` subsection
  supersedes it — Design B is now the authorized (still unbuilt) fix and Design A is withdrawn.
- Defect 10's "no fix applied and none recommended as decided" record is retained; R-4 already
  overrode that stance, and this amendment records (A-3) that the override survives.

## Production and external effects

None. No production or external system was read or written. After the commit, the post-commit
planning-pack hook is expected to fire in this (the updater's) tree and republish the pack;
that automatic run is expected behavior, and its receipt belongs in the updater's
`last-run-summary.json` and the task report — not in a canonical document.

## Next approved action, and what is NOT approved

- **Next approved (separate work item, NOT started here):** build **Design B** — make every
  planning-pack source resolve from the committed tree — citing this amendment as its
  authorization. After it is built and committed, **the owner must deliver it repo→installed**
  via `sync_installed_updater.py --apply` for it to take effect.
- **NOT approved by this record:** building any guard or design; running `--apply` or any write
  outside the repository; creating an autorun; any push, merge, deploy, migration, or
  production write.
