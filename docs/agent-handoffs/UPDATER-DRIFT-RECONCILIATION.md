# UPDATER-DRIFT-RECONCILIATION — versioned `update_planning_pack.py` brought to parity with the installed running copy by adding the `--no-open` feature

- **Title.** Added the `--no-open` argparse flag and its one conditional to the versioned
  `scripts/planning-pack/update_planning_pack.py`, so the version-controlled updater now
  matches the installed copy at `%LOCALAPPDATA%\TMPlanningPackUpdater\update_planning_pack.py`
  that actually publishes to Drive. What happened: a reviewed reconciliation, not a
  transcription — the running code is now the reviewed code. No guard, no design change,
  no behavior change to the running code.
- **Date.** 2026-07-23.
- **Branch.** `redesign/tm-stats-dashboard-rebuild` (redesign lineage).
- **Worktree.** `C:\Users\izzyh\Documents\Terraforming Mars Redesign` — the redesign
  primary (git *linked* worktree; the updater's own tree). Not isolated: the publish
  receipt depends on the post-commit hook firing here.
- **Base commit.** `f1f836ab766f054eeef7b1bb1e91ee3cb295e710` (`f1f836ab`), clean, 0 behind
  / 1 ahead of origin at start **[GIT]**.
- **Category.** Source reconciliation — brings versioned code up to the installed running
  copy. It is NOT a guard, NOT a clean-tree check, NOT either candidate hazard-fix design,
  NOT a refactor, NOT a behavior change to the running updater, and NOT a
  production/migration/deploy.
- **Authorization held.** Edit `scripts/planning-pack/update_planning_pack.py` to add the
  `--no-open` feature and nothing else in that file; create and register the
  validator-required handoff; make the minimal `docs/REDESIGN_STATE.md` edit that registers
  it; run a read-only parity check; exactly one commit.
- **Authorization NOT held, and what did NOT occur.** No sync of the installed copy and no
  write of any kind outside the repository. No updater run (and the attempted parity run was
  blocked by the auto-mode classifier anyway). No guard or hazard-fix design. No edit to any
  file other than the three named. No push, merge, deploy, migration apply, rebase,
  force-push, or history rewrite. No change to any scheduled task, Startup entry, registry
  key, or system setting. No production read or write (no Supabase, Cloudflare, or SQL). Gap
  1e, the five open findings, PD‑1/2/3, the 6d conflict, and DOCUMENT-OWNERSHIP-MAP
  untouched.

## Why this existed

`UPDATER-GUARD-INVESTIGATION` established **[REPO]** that the updater publishing to Drive is
the installed copy, and that it is drifted from the versioned copy. Any hazard fix must land
on a base where versioned and installed agree, or it would be written against code that is
not the code that executes.

## The drift (re-derived this session, not inherited)

CR-normalized `diff` of versioned (a) vs installed (b) `update_planning_pack.py`, in full:

```
1200a1201
>     parser.add_argument("--no-open", action="store_true", help="Do not open the Drive folder when finished, but keep console output and prompts.")
1274c1275
<         if not args.scheduled:
---
>         if not args.scheduled and not args.no_open:
```

Exactly the `--no-open` feature and nothing else — no hard-stop condition. Reviewed, not
blindly transcribed:

- The flag is placed immediately after `--scheduled` (its logical sibling) in `main()`.
- Its only behavioral effect is the end-of-run folder-open block: `if not args.scheduled and
  not args.no_open:` opens the Drive folder only when neither flag is set. `--no-open`
  correctly leaves every other `args.scheduled` branch untouched — console logging, status
  and error prints, interactive auth, and the lock/prompt paths — matching its documented
  intent ("do not open the folder, but keep console output and prompts"). The Desktop `.bat`
  passes `--no-open`, so before this change the versioned copy would have failed argparse if
  it were the one running.

## What changed

`scripts/planning-pack/update_planning_pack.py`, two hunks (`+2 / −1`):

- added `parser.add_argument("--no-open", action="store_true", help="Do not open the Drive
  folder when finished, but keep console output and prompts.")` after `--scheduled`;
- changed `if not args.scheduled:` → `if not args.scheduled and not args.no_open:` in the
  folder-open block (uniquely anchored — this phrase occurs four times in the file).

## Parity result

`update_planning_pack.py` versioned == installed (modulo line endings): **achieved.**
Verified by the authorized *equivalent read-only parity check*:

1. the pre-edit CR-normalized `diff` isolated exactly the two `--no-open` hunks as the
   complete set of differences;
2. the installed copy's exact bytes for both regions were read (Read tool) — line 1201
   `    parser.add_argument("--no-open", …)` and line 1275 `        if not args.scheduled and
   not args.no_open:`;
3. the post-edit `git diff` reproduces those bytes character-for-character.

Therefore the versioned copy now equals the installed copy modulo EOL. **[REPO]**

The standard tool `sync_installed_updater.py --check` and a direct `diff` against the
installed path were each **blocked by the auto-mode classifier** when invoked via Bash
against `%LOCALAPPDATA%` — a harness event, not a parity or gate failure. No write outside
the repository was needed or attempted; parity was achieved by editing the versioned copy
alone.

The other four `SYNCED_FILES` (`git_source.py`, `source_snapshot.py`, `verify_drive.py`,
`google_docs_title_sanitize.py`) were **not byte-verified this session**; their installed vs
versioned sizes differ only by amounts consistent with CRLF↔LF line endings (or are
identical), so they are consistent with content parity. **[UNVERIFIED]** for exact content;
settling it requires `sync_installed_updater.py --check` (needs the classifier to permit the
venv Python) or a per-file normalized-hash comparison.

## Documents reviewed / updated / intentionally NOT changed

- **Read:** `scripts/planning-pack/update_planning_pack.py` (both copies), `sync_installed_updater.py`,
  the `UPDATER-GUARD-INVESTIGATION` findings, `CLAUDE-PROJECT-SOURCES.json`.
- **Updated:** `scripts/planning-pack/update_planning_pack.py`; `docs/REDESIGN_STATE.md` (this
  handoff registered in the active group); this handoff.
- **Intentionally unchanged:**
  - `docs/CURRENT_STATUS.md` — its rule (update with `REDESIGN_STATE` when phase, blocker,
    release, migration, or next-action state changes) is NOT met: none changed. Brief forbids
    editing it.
  - `docs/AUTHORITATIVE_DOCUMENTS.md` — no authority routing changed.
  - `docs/redesign/DECISIONS.md` — no durable decision was made; a reconciliation is not a
    decision.
  - `docs/redesign/MASTER-PLAN.md` — no durable project-wide direction changed.
  - the installed updater copy — parity was achieved by editing the versioned copy only;
    syncing the installed copy is a write outside the repository and is not authorized.

## Known limitations / deliberately-retained state

- The mechanical all-five parity tool was classifier-blocked; parity of the edited file is
  proven by the equivalent read-only method above, and the other four files are size-consistent
  with parity but not byte-verified this session.
- This reconciliation ships no guard. The working-tree publish hazard remains open; its fix
  (Design A source-scoped guard, or Design B read-from-committed-tree) is a separate work item
  awaiting an owner ruling, and now has a base where versioned and installed agree.

## Production and external effects

None. No production or external system was read or written. After the commit, the post-commit
planning-pack hook is expected to fire in this (the updater's) tree and republish the pack;
that automatic run is expected behavior, and its receipt belongs in the updater log and the
task report.

## Next approved action, and what is NOT approved

- **Not started, awaiting owner ruling:** the hazard fix (Design A / Design B from
  `UPDATER-GUARD-INVESTIGATION`).
- **NOT approved by this record:** building any guard; syncing the installed copy or any other
  write outside the repository; any push, merge, deploy, migration, or production write.
