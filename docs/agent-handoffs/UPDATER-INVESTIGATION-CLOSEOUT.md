# UPDATER-INVESTIGATION-CLOSEOUT — the planning-pack updater investigation made canonical (no guard, ~47/48 hazard surface, no autorun, non-atomic publish); five-file parity closed; repo→installed delivery is owner-only

This handoff commits findings that previously existed only in chat reports
(`UPDATER-GUARD-INVESTIGATION`) plus this work item's parity and delivery-path
results. It builds no fix.

- **Title.** Canonical record of the planning-pack updater investigation (Q1–Q7 and two
  candidate hazard-fix designs), the five-file versioned↔installed parity result, the
  repo→installed delivery-path characterization, and the DECISIONS R‑4 "autorun path"
  discrepancy. What happened: investigation + parity closeout + figure correction; **no
  code fix, no guard, no design built.**
- **Date.** 2026-07-23.
- **Branch.** `redesign/tm-stats-dashboard-rebuild` (redesign lineage).
- **Worktree.** `C:\Users\izzyh\Documents\Terraforming Mars Redesign` — redesign primary
  (git *linked* worktree; the updater's own tree).
- **Base commit.** `f5d7864e980e1b0079f4fab15240f7a5d1d0f497` (`f5d7864e`), clean, 0 behind
  / 2 ahead of origin at start **[GIT]**.
- **Category.** Documentation/record, parity verification, and a figure correction. NOT a
  fix, NOT a guard, NOT either candidate design, NOT a refactor, NOT a
  production/migration/deploy.
- **Authorization held.** Read-only git/repo inspection; any read (in/out of repo) needed
  for the parity and delivery-path tasks that writes nothing; create + register this
  handoff; edit the understated "24 of 25" sites; minimal `REDESIGN_STATE` edits; one commit.
- **Authorization NOT held, and what did NOT occur.** No `sync_installed_updater.py --apply`
  and no write of any kind outside the repository. No updater run. No guard or hazard-fix
  design built. No amendment to DECISIONS R‑4 (the autorun discrepancy is recorded, not
  fixed). No push, merge, deploy, migration, rebase, force-push, or history rewrite. No
  change to any scheduled task, Startup entry, registry key, or system setting. No
  production read or write. Gap 1e, the five open findings, PD‑1/2/3, the 6d conflict, and
  DOCUMENT-OWNERSHIP-MAP untouched.

## FINDINGS — UPDATER-GUARD-INVESTIGATION (Q1–Q7), evidence class [REPO] unless noted

**Q1 — Where the updater lives / what it does.** Python 3 (google-api-python-client +
pandoc via `subprocess`). Versioned source `scripts/planning-pack/update_planning_pack.py`
(+ `git_source.py`, `source_snapshot.py`, `verify_drive.py`, `google_docs_title_sanitize.py`);
it *runs* from the installed copy `%LOCALAPPDATA%\TMPlanningPackUpdater\update_planning_pack.py`
via `.venv\Scripts\python.exe`. Entry `main()` → `acquire_lock()` → `run_update()`:
`discover_sources()` (48 docs) → `load_state()` (drive-map.json) → `gate_source_isolation()`
(fail-closed if a filesystem source resolves outside `ROOT`/`GENERATED_DIR`) → retired-key
check → Google auth + DOCX-import capability check → `verify_git_sources()` (re-prove each
Git artifact matches its ref) → per-document loop: `sha256(source.path)`; if the Drive doc's
stored sha and title match → unchanged, else `build_docx()` + `upload_one()`
(`files().update`/`create`), rewriting `drive-map.json` after each → final exact-set check →
write `last-run-summary.json`. `ROOT` is hard-pinned to the redesign checkout.

**Q2 — Does a clean-tree guard already exist? NO (settled).** None in the hook (it gates on
repo-identity, HEAD-advanced, tree-identity, and pack-relevance), none in the versioned
updater, none in the installed updater. The only "gate," `gate_source_isolation()`, checks
that source *paths* resolve under `ROOT`/`GENERATED_DIR` — not whether the files are
committed. `verify_git_sources()` protects only the one Git source. Filesystem sources are
read straight off disk. There is nothing to prevent an uncommitted working-tree edit from
being published. (Adjacent, non-cleanliness: an opt-in `--source-snapshot` fail-closed check
exists for source *identity*, but the live `.bat`/hook paths do not pass it.)

**Q3 — What invokes the updater.**
1. **Claude Code hook** `.claude/hooks/sync-planning-pack.ps1`, registered in
   `.claude/settings.json` as PostToolUse/Bash with two handlers: `if Bash(git commit *)`
   (`-Trigger commit`) and `if Bash(git merge *)` (`-Trigger merge`); on a pack-relevant
   HEAD-advance in the updater's tree it calls the Desktop `.bat`.
2. **Desktop `.bat`** `C:\Users\izzyh\Desktop\Refresh TM Project Planning Pack.bat` →
   `call "%LOCALAPPDATA%\TMPlanningPackUpdater\run-updater.bat" --no-open`.
3. **`run-updater.bat`** (installed) → `"%APP_DIR%\.venv\Scripts\python.exe"
   "%APP_DIR%\update_planning_pack.py" %*`; special-cases a `--scheduled` first arg.
4. **Autorun: none exists.** `Get-ScheduledTask` (210 tasks) has no action referencing the
   updater; no HKCU/HKLM Run or RunOnce entry; Startup holds only "Send to OneNote.lnk". The
   `--scheduled` handling is a latent, uninstalled design path. **[SYSTEM]** (a non-standard
   host — login script, third-party scheduler, another user's task — is not excluded).

**Q4 — The "24 of 25" figure.** The manifest `documents` array has 25 entries; exactly one —
`deploy-state` (`sourceType:"git"`, ref `fix/live-compare-data-remove-declared-style`, path
`DEPLOY-STATE.md`) — is Git-sourced; the other 24 are filesystem under `ROOT`. That statement
about the manifest array is CORRECT. **But the full pack is 48**, and the runtime log states
"46 documents resolve from the redesign checkout; 1 from Git" — the 21 phase files and the
`latest-handoff` file are also `ROOT`-rooted, and `tm-project-master-context` is generated
*from* `ROOT` files. **So ~47 of 48 derive from the working tree; only `deploy-state` is
Git-isolated.** "24 of 25" understates the hazard surface; T4 (below) corrected the
understated sites.

**Q5 — `.pack-last-sync` write semantics.** Written **only by the hook**, at two points: (g)
when the commit touched no pack source → record HEAD without running the updater; (i) after
the updater exits 0. Not written on updater failure, on the tree-identity/updater-unavailable
PENDING paths, or on a no-op. The updater never references `.pack-last-sync`. Therefore a
manual `.bat` run (or a hypothetical scheduled run) never writes it. Refinement: "the hook
writes it only on success" is slightly imprecise — the hook also writes it on a legitimate
no-pack-relevant-change advance.

**Q6 — Is the hazard reproducible in principle? Yes (traced, not reproduced).** Filesystem
sources are read from the live working tree (`build_docx(source)` → `source.path.read_text/bytes`),
never via `git show`. The hook's pack-relevance test looks at the *committed* diff and does
not check working-tree cleanliness. Path: commit pack-source A while pack-source B sits
modified-uncommitted → hook sees A changed → runs updater → updater reads B from the working
tree and publishes B's uncommitted bytes → the Drive doc for B holds content in no commit.

**Q7 — Failure behavior: NON-ATOMIC / partial.** All pre-publish gates (git-source verify,
isolation, retired-keys, auth, import-capability) run before any Drive write — a failure there
leaves Drive untouched. But the publish loop calls `upload_one()` per document, each an
immediate `files().update`/`create`, rewriting `drive-map.json` (atomically) after each. A
failure mid-loop leaves Drive partially updated (docs 1..N‑1 new, N..end old).
`last-run-summary.json` is written only on full success, so it will not reflect a partial
failure (an observability gap). `drive-map.json` stays consistent with what was uploaded, so
the next full run is self-healing. No cross-document transaction exists.

## CANDIDATE DESIGNS for the hazard fix (not built; owner ruling pending)

**Root cause.** The updater derives ~47 of 48 documents from the live working tree, and
nothing checks that those bytes are committed. The one safe document (`deploy-state`) is safe
because it is read via `git show <ref>:<path>`.

**The tension.** A naive whole-tree fail-closed guard (`abort if git status --porcelain
nonempty`) blocks every publish whenever any file is dirty; agents routinely commit with
unrelated files dirty, so it would block most publishes and be disabled. The distinguishing
fact: **only a dirty file that is itself a pack source can corrupt the publish.**

**Design A — Source-scoped fail-closed guard (smallest change; what R‑4 literally authorizes).**
In the updater, after `discover_sources()` and before any Drive write, enumerate the resolved
pack-source paths (24 manifest-fs + 21 phase + the `latest-handoff` file + the `master-context`
inputs) and abort if any of *those* paths is dirty vs HEAD; dirty non-source files are ignored.
Distinguishes corrupting-vs-irrelevant by *source membership*. Pros: precise, low false
positives, keeps the read-from-disk model, protects all invocation paths because it lives in
the updater. Cons: residual TOCTOU window; the guard's source-path enumeration must track
`discover_sources()` or it has a blind spot.

**Design B — Read source content from the committed tree (`git show HEAD:<path>`); root-cause
fix, no guard.** Change the filesystem read path so every source's bytes come from the commit
via the mechanism `deploy-state` already uses; generate the two dynamic docs from committed
content. Then working-tree dirtiness cannot reach Drive by construction. Addresses the tension
by making the distinction unnecessary. Pros: eliminates the hazard class, no false positives,
no TOCTOU, matches the project's stated principle and the `deploy-state` precedent. Cons:
larger change (read path, `build_docx`, phase globbing via `git ls-tree`, newest-handoff
selection over the committed tree); a manual `.bat` run would then publish committed HEAD, not
on-disk edits.

**Prior art, why inferior.** *Publish-only tree discipline* = the human discipline that already
failed. *Converting the 24 to catalog Git sources* = heavier catalog churn; Design B is the
lighter refinement. *Naive whole-tree fail-closed guard* = the disable-within-a-week problem
Design A fixes by scoping to sources.

**Recommendation.** Ship Design A now (the fail-closed guard R‑4 authorizes; must live in the
updater, not only the hook, so it covers the `.bat` and any future autorun); record Design B as
the durable follow-up. If the owner prefers one change, go straight to B. **Whichever design is
chosen, it must be delivered to the installed copy to take effect — see DELIVERY below.**

## T1 — PARITY (all five SYNCED_FILES)

Normalized SHA-256 (CRLF/CR→LF then sha256, exactly `sync_installed_updater.py`'s
`normalized_digest`) of versioned vs installed, computed read-only via PowerShell (Bash
`%LOCALAPPDATA%` access is classifier-blocked):

| file | status | normalized sha256 (first 12) |
|---|---|---|
| `update_planning_pack.py` | **MATCHED** | `a45cde3f93f8` |
| `git_source.py` | **MATCHED** | `0991e056ed91` |
| `source_snapshot.py` | **MATCHED** | `9883c58ef208` |
| `verify_drive.py` | **MATCHED** | `97e578fa9826` |
| `google_docs_title_sanitize.py` | **MATCHED** | `b74bf8b9f9bf` |

All five MATCHED — **the parity gap is closed**; the versioned updater equals the installed
running copy modulo line endings. **[REPO]** (The four beyond `update_planning_pack.py` were
`[UNVERIFIED]` after `UPDATER-DRIFT-RECONCILIATION`; they are now MATCHED.)

## T2 — DELIVERY PATH (`sync_installed_updater.py`), evidence class [REPO]

- **What `--apply` does / writes.** For each of the five `SYNCED_FILES`,
  `shutil.copyfile(SOURCE_DIR/name, destination/name)` — overwrites the installed program file
  with the versioned one. `SOURCE_DIR` is the repo `scripts/planning-pack/`; `destination` is
  `%LOCALAPPDATA%\TMPlanningPackUpdater`. It writes only those five files. `PROTECTED_NAMES`
  (credentials, token, drive-map, last-run-summary, update.lock, run-updater.bat,
  google-docs-reference.docx, `.venv`, `logs`, `generated`) are never touched (the in-loop
  `if name in PROTECTED_NAMES: raise` is belt-and-suspenders — the two sets are disjoint).
- **Idempotent?** Yes — `copyfile` overwrites with source content; a rerun with unchanged
  source converges. **Backup?** No — it overwrites in place and makes no backup of what it
  replaces.
- **Failure mode / left state.** No lock; copies file-by-file; `copyfile` is not atomic. A
  failure mid-file can leave a truncated destination; a failure mid-loop leaves k updated +
  (5−k) old, possibly one partial. No rollback.
- **Anything other than `--apply` deliver repo→installed?** No. `--check` only reports;
  the updater and `run-updater.bat` run the installed copy and never copy from the repo. So
  nothing auto-delivers — which is exactly why the copy drifted.
- **Half-delivered install + Desktop `.bat`/`run-updater.bat`.** `run-updater.bat` runs
  `python update_planning_pack.py`. A syntactically broken partial → `SyntaxError`/`ImportError`
  at parse/import → non-zero exit before the Drive-publish stage (fails closed). A
  syntactically valid but semantically mismatched partial (new `update_planning_pack.py` + old
  dependency) could run with mismatched modules and misbehave, potentially publishing wrong
  content — the primary risk.
- **Can a worker (agent) session run `--apply`? NO — plainly.** `--apply` requires both
  executing Python and writing to `%LOCALAPPDATA%`; this session's classifier blocked the venv
  Python execution and `%LOCALAPPDATA%` Bash access, and this work item forbids it. **Delivery
  repo→installed must be performed by the owner** (run `sync_installed_updater.py --apply`, then
  optionally `--check`). Consequence: **a hazard fix committed to the repository does not take
  effect in the running updater until the owner delivers it.**

## T4 — "24 of 25" figure corrected

Sweep classified every site:
- **CORRECTED (understated — framed the hazard/mechanism around 24):** `REDESIGN_STATE.md`
  defect-10 description (the numeric "24 of 25 … so a hook firing … publishes"); this handoff's
  source, `PHASE-04-STEP-03-PLANNING-LAYER-ASSIGNMENT-DEFECTS.md` §10 "The mechanism"
  ("twenty-four of its twenty-five") and "the other twenty-four sources". Each now states the
  correct manifest split *and* the ~47-of-48 working-tree surface.
- **LEFT ALONE (correct):** `PHASE-04-STEP-03-PLANNING-LAYER-ASSIGNMENT-DEFECTS.md` §10 "What
  is verified" ("the catalogued split of twenty-four filesystem sources plus one Git source" —
  a correct verified statement about the manifest array); and
  `PHASE-04-STEP-03-SEVEN-ARGUMENT-DROP-PRECONDITION-REPLACEMENT.md:202` (`documents[24]
  (deploy-state)` — a correct manifest-index reference).

Corrections went to hand-maintained sources only. `CURRENT_STATUS.md` contains no "24 of 25"
site; `CURRENT_STATUS` line 61 and `REDESIGN_STATE` line 68 (dated defect-count history) were
not touched.

## DISCREPANCY — DECISIONS R‑4's "autorun path" premise is factually wrong

R‑4 ("updater clean-tree guard authorized") authorizes wiring the guard into the Desktop `.bat`
"and the autorun path." **No autorun exists** (Q3 [SYSTEM]) — the `--scheduled` path is latent
and uninstalled. Recorded here as a discrepancy; **R‑4 is deliberately left unamended**, because
correcting an owner ruling is an owner action. The guard should target the updater itself (which
all live paths funnel through); if an autorun is later created, the same guard covers it.

## Documents reviewed / updated / intentionally NOT changed

- **Read:** both updater copies, `sync_installed_updater.py`, `run-updater.bat`, the Desktop
  `.bat`, `.claude/hooks/sync-planning-pack.ps1`, `.claude/settings.json`,
  `CLAUDE-PROJECT-SOURCES.json`, the updater log/summary, and the "24 of 25" sites.
- **Updated:** this handoff (new); `docs/REDESIGN_STATE.md` (T4 correction + this handoff
  registered); `docs/agent-handoffs/PHASE-04-STEP-03-PLANNING-LAYER-ASSIGNMENT-DEFECTS.md` (two
  T4 corrections).
- **Intentionally unchanged:** `docs/redesign/DECISIONS.md` — R‑4's autorun premise is wrong but
  amending an owner ruling is an owner action (discrepancy recorded above); no other decision
  changed. `docs/CURRENT_STATUS.md` — no "24 of 25" site and no phase/blocker/release/migration/
  next-action change; line 61 is correct dated history. `docs/AUTHORITATIVE_DOCUMENTS.md`,
  `docs/redesign/MASTER-PLAN.md` — no routing or durable-direction change. The installed updater
  copy and everything outside the repo — read-only; delivery is owner-only.

## Production and external effects

None. No production or external system read or written. After the commit, the post-commit
planning-pack hook is expected to fire in this (the updater's) tree and republish the pack;
that automatic run is expected, and its receipt belongs in the updater log and the task report.

## Next approved action, and what is NOT approved

- **Awaiting owner ruling:** choose Design A or Design B for the hazard fix. After it is built
  and committed, **the owner must deliver it repo→installed** via `sync_installed_updater.py
  --apply` for it to take effect.
- **NOT approved by this record:** building any guard/design; running `--apply` or any write
  outside the repo; amending R‑4 or creating an autorun; any push, merge, deploy, migration, or
  production write.
