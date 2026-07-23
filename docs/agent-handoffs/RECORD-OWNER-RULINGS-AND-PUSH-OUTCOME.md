# RECORD-OWNER-RULINGS-AND-PUSH-OUTCOME — four owner rulings written to canonical documents; PUSH-TWO-LINEAGES and FORENSICS-HANDOFF-SCOPE-CORRECTION recorded closed

- **Title.** Recorded four owner rulings of 2026-07-23 in `docs/redesign/DECISIONS.md`,
  and recorded in `docs/REDESIGN_STATE.md` that `PUSH-TWO-LINEAGES` is complete and
  `FORENSICS-HANDOFF-SCOPE-CORRECTION` is accepted at `505e49ece`. Documentation
  record only. What happened: the rulings, which existed only in a chat thread, now
  live in one canonical place; no code, production system, or defect register entry
  was changed.
- **Date.** 2026-07-23.
- **Branch.** `redesign/tm-stats-dashboard-rebuild` (redesign lineage).
- **Worktree.** `C:\Users\izzyh\Documents\Terraforming Mars Redesign` — the redesign
  primary, a git *linked* worktree and the tree the planning-pack updater reads.
  Deliberately NOT an isolated worktree: the post-commit publish receipt depends on
  the hook firing in this tree.
- **Base commit.** `505e49ecee93b0553642af2b4f35a42067404a07` (`505e49ece`), which was
  the branch head at start, clean, 0 ahead / 0 behind `origin` **[GIT]**.
- **Category.** Documentation and record only — it writes owner rulings and two
  work-item closures into canonical documents. It is NOT code, NOT a migration, NOT a
  deploy, NOT a production write, NOT a push/merge, and NOT a defect-register change.
- **Authorization held.** The `RECORD-OWNER-RULINGS-AND-PUSH-OUTCOME` brief: edit
  `docs/redesign/DECISIONS.md` (four entries) and `docs/REDESIGN_STATE.md` (narrowly),
  update the hand-maintained `## Latest handoff` group, and make exactly one commit in
  the updater's tree.
- **Authorization NOT held, and what did NOT occur.** No push, merge, deploy, migration
  apply, rebase, force-push, or history rewrite. No push of
  `fix/matcher-service-role-overload-callsite` or any branch. No branch or worktree
  creation or deletion. No production read or write of any kind: no Supabase MCP call,
  no `execute_sql`, no `list_migrations`, no `apply_migration`, no `wrangler`, no
  `/api/deploy-info`, no direct database connection, no Cloudflare action. `src/**`,
  `supabase/**`, `scripts/**`, every `.bat`, the updater, and its hook were not touched.
  Gap 1e, the five open findings, `PD-1`/`PD-2`/`PD-3`, the 6d conflict, and the
  `DOCUMENT-OWNERSHIP-MAP` question were not touched. `docs/CURRENT_STATUS.md`,
  `docs/REDESIGN_STATE.md` line 68, and other dated-history sites were not edited, and
  no defect count was changed.

## Why this existed

Four owner rulings and one completed work item (`PUSH-TWO-LINEAGES`) existed only in a
chat thread. The project has repeatedly paid the cost of decisions that live nowhere
canonical. This work item writes them to the canonical documents so a session that was
not present can rely on them.

## What was recorded

### Four owner rulings, now in `docs/redesign/DECISIONS.md`

- **R-1 — release publication scope.** `redesign/tm-stats-dashboard-rebuild` and
  `fix/live-compare-data-remove-declared-style` are authorized for publication;
  `fix/matcher-service-role-overload-callsite` is DELIBERATELY UNPUBLISHED — not merely
  unpushed — as a standing exclusion, because three matcher gates still depend on it and
  publishing it invites a merge no gate has cleared. Reversal requires fresh
  authorization. Recorded in the Phase 4 Step 4.3 cluster.
- **R-2 — FORENSICS-HANDOFF-SCOPE-CORRECTION file-list amendment (Amendment 1).**
  `docs/REDESIGN_STATE.md` was added to that work item's authorized file list; the
  alternative of waiving `validate:claude-context --require-maintenance` was refused
  because it waives a CLAUDE.md pre-commit gate and would leave `REDESIGN_STATE.md`
  asserting a count the same work item had just falsified. Recorded in the Phase 4 Step
  4.3 cluster.
- **R-3 — dated-history classification standard.** A fact site whose heading scopes it
  to a past event stays at the historical value; raising it to the current value would
  falsely attribute later work to that event. Worked examples: the "115 entries" sites in
  the matcher-apply forensics handoff, `REDESIGN_STATE.md` line 68, and
  `CURRENT_STATUS.md` line 61. Recorded in the Project-wide cluster.
- **R-4 — updater clean-tree guard authorization (owner exception).** Authorizes
  building a fail-closed clean-tree guard for the planning-pack updater, overriding two
  named standing positions — the "no fix is applied, and none is recommended as decided"
  position on the working-tree publish hazard (defect 10) and the "updater clean-tree
  investigation" line in the excluded-work list. Authorization only; the guard is NOT
  built here. Recorded in the Project-wide cluster.

### Two work items, recorded closed in `docs/REDESIGN_STATE.md`

- **`PUSH-TWO-LINEAGES` — COMPLETE.** `redesign/tm-stats-dashboard-rebuild` was published
  carrying nine commits `d63e6b0d7..505e49ece` by a worker session; the branch is level
  with `origin` **[GIT]**. `fix/live-compare-data-remove-declared-style` was published
  carrying one commit `1b4c2350d..2926a1bcc` **by the owner directly**, after the worker
  session's second push was denied by the Claude Code auto-mode classifier — a harness
  event, not a gate failure, with all preconditions verified clean beforehand.
  `2926a1bcc` is present on `origin/fix/live-compare-data-remove-declared-style` **[GIT]**.
- **`FORENSICS-HANDOFF-SCOPE-CORRECTION` — ACCEPTED at `505e49ece`.** That commit
  ("docs(step-43): correct the forensics handoff Scope section and record defects 13-16")
  is the base of this work item and the current branch head **[GIT]**.

The updater clean-tree guard (R-4) is the queued next meta-work item; this record
authorizes it but does not build it.

## Evidence

```
$ git rev-parse --abbrev-ref HEAD
redesign/tm-stats-dashboard-rebuild
$ git rev-parse HEAD
505e49ecee93b0553642af2b4f35a42067404a07
$ git status --porcelain=v1           # at start
(clean)
$ git rev-list --left-right --count origin/redesign/tm-stats-dashboard-rebuild...HEAD
0	0
$ git rev-parse --git-dir
C:/Users/izzyh/Documents/Terraforming Mars/.git/worktrees/Terraforming-Mars-Redesign
$ cat .claude/.pack-last-sync
505e49ecee93b0553642af2b4f35a42067404a07   # == HEAD

$ for s in d63e6b0d7 505e49ece 1b4c2350d 2926a1bcc; do git rev-parse --verify -q "$s^{commit}"; done
d63e6b0d781b7c1d14be611b2f4b7dc05c53c66e
505e49ecee93b0553642af2b4f35a42067404a07
1b4c2350d9894f2fec2896d02b0ef9e057850453
2926a1bcc5907dd130dc0a3bb50d8511ede67308
$ git rev-list --count d63e6b0d7..505e49ece
9
$ git rev-list --count 1b4c2350d..2926a1bcc
1
$ git branch -a --contains 2926a1bcc
  fix/live-compare-data-remove-declared-style
  remotes/origin/fix/live-compare-data-remove-declared-style
```

All four asserted commit SHAs resolve **[GIT]**; the range counts (nine, one) match the
recorded figures; `2926a1bcc` is present on `origin`.

## Files changed

- `docs/redesign/DECISIONS.md` — four new dated 2026-07-23 owner-decision entries
  (R-1, R-2 in the Phase 4 Step 4.3 cluster; R-3, R-4 in the Project-wide cluster).
- `docs/REDESIGN_STATE.md` — one new dated subsection under `## Current substep`
  recording the two closures and the queued guard, and one new bullet at the head of the
  `## Latest handoff` active group registering this handoff.
- `docs/agent-handoffs/RECORD-OWNER-RULINGS-AND-PUSH-OUTCOME.md` — this file.

## Documents reviewed / updated / intentionally NOT changed

- **Read:** `CLAUDE.md`, `docs/redesign/MASTER-RULES.md`, `docs/redesign/PAGE-ARCHITECTURE.md`,
  `docs/CURRENT_STATUS.md`, `docs/AUTHORITATIVE_DOCUMENTS.md`, `docs/REDESIGN_STATE.md`,
  `docs/redesign/DECISIONS.md`, `docs/redesign/CLAUDE-PROJECT-SOURCES.json`, and the
  validator `scripts/validate-claude-project-context.mjs`.
- **Updated:** `docs/redesign/DECISIONS.md` and `docs/REDESIGN_STATE.md` (above), plus this
  handoff.
- **Intentionally unchanged:**
  - `docs/CURRENT_STATUS.md` — its maintenance rule (update together with
    `REDESIGN_STATE.md` when phase, blocker, release, migration, or next-action state
    changes) is NOT met: this work item changes none of those; it records governance
    rulings and two meta-work closures. The brief also forbids editing it.
  - `docs/AUTHORITATIVE_DOCUMENTS.md` — its rule (update when a current authority is
    added, moved, superseded, or archived) is NOT met: no authority routing changed.
  - `docs/redesign/MASTER-PLAN.md` — its update triggers (project goals, governance
    rules, phase structure, durable architecture, etc.) are NOT met: recording existing
    rulings changes no durable project-wide direction.
  - `docs/redesign/CLAUDE-PROJECT-SOURCES.json` — no new catalogued source; handoffs are
    discovered by directory, not catalogued, so no entry is required.
  - `docs/CURRENT_STATUS.md` line 61, `docs/REDESIGN_STATE.md` line 68, and other
    dated-history sites — left at their event-correct values per ruling R-3.
  - `docs/agent-handoffs/PHASE-04-STEP-03-PLANNING-LAYER-ASSIGNMENT-DEFECTS.md` (the
    defect register) — not edited and no defect count changed; R-4's override of the
    "none recommended" stance is recorded in DECISIONS, leaving the historical stance in
    place per R-3.

## Known limitations and deliberately-retained stale statements

- The historical "no fix is applied, and none is recommended as decided" stance on the
  working-tree publish hazard (defect 10) and the "updater clean-tree investigation"
  excluded-work line are left in place; ruling R-4 supersedes them going forward, and
  the dated historical records are retained per R-3 rather than rewritten.
- LATEST-HANDOFF classification: the `## Latest handoff` section in `REDESIGN_STATE.md` is
  HAND-MAINTAINED (agents maintain the first contiguous bullet group; the validator reads
  it but never writes it; the updater reads it to generate the external copy). The
  planning-pack `latest-handoff` document is the GENERATED artifact
  (`dynamicDocuments` key `latest-handoff` in `CLAUDE-PROJECT-SOURCES.json`); it is left
  for the post-commit hook to regenerate.

## Production and external effects

None. No production or external system was read or written. After the commit, the
post-commit planning-pack hook is expected to fire in this (the updater's) tree and
republish the pack; that automatic run is expected behavior, and its receipt belongs in
the updater log and the task report, not in a canonical document.

## Next approved action, and what is NOT approved

- **Queued next:** build the fail-closed updater clean-tree guard authorized by R-4 —
  a separate work item, not started here, requiring its own session.
- **NOT approved by this record:** any push (including the callsite branch), merge,
  deploy, migration apply, or production write; building the guard or editing any `.bat`,
  the updater, or its hook; beginning Step 4.4; resolving gap 1e, the five open findings,
  `PD-1`/`PD-2`/`PD-3`, the 6d conflict, or the `DOCUMENT-OWNERSHIP-MAP` question.
