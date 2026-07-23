# Planning-pack updater Design B — every source read from the committed tree — BUILT LOCALLY, gated on owner delivery

## Header

1. **Task and outcome.** Build Design B for the planning-pack updater: make every
   planning-pack document source resolve its content from the committed tree
   rather than the working tree, so an uncommitted working-tree edit cannot reach
   Google Drive by construction. **Outcome: BUILT LOCALLY and executably proven.
   Not delivered to the installed updater, which is the owner's step.**
2. **Date.** 2026-07-23.
3. **Branch / lineage.** `redesign/tm-stats-dashboard-rebuild` (redesign lineage).
4. **Worktree.** The redesign primary,
   `C:\Users\izzyh\Documents\Terraforming Mars Redesign` (a LINKED worktree; the
   object-database root is `C:\Users\izzyh\Documents\Terraforming Mars`). No new
   worktree was created; the brief directed work in the primary.
5. **Base commit.** `a301ce20a` (`git rev-parse HEAD` [GIT]). The brief named
   `76ea259e`; HEAD was two clean commits ahead (phase-pack 05-20 install +
   Step 4.3 closure-criterion). The owner re-authorized building on `a301ce20a`
   and re-baselining the count anchors.
6. **Category.** A local code change to the planning-pack updater
   (`scripts/planning-pack/**`), its tests, and this handoff plus its
   registration in `docs/REDESIGN_STATE.md`. It is **not** a deploy, migration,
   production write, push, merge, delivery to the installed updater, autorun
   creation, `.bat`/hook edit, or any change to the document catalog, the 48
   document set, the Drive folder, or the Drive file IDs.
7. **Authorization held.** `docs/redesign/DECISIONS.md` → "Project-wide — updater
   clean-tree guard authorized", AMENDMENT 2026-07-23 (commit `76ea259e`) → A-1,
   which authorizes **Design B**. The `BUILD-DESIGN-B` work-item brief. Owner
   re-authorization (this session) to proceed on `a301ce20a` and re-baseline the
   counts.
8. **Authorization NOT held, and what did not occur.** No delivery repo→installed
   (`sync_installed_updater.py --apply`) — owner-only per R-4 A-4; it was not run.
   No updater run against Google Drive in any mode. No autorun, scheduled task,
   registry Run/RunOnce, or Startup change. No edit to `run-updater.bat`, the
   Desktop `.bat`, or the Claude Code hook. No change to the catalog, the 48
   document set, the Drive folder, or any Drive file ID. No push, merge, deploy,
   migration apply, rebase, force-push, or history rewrite. No production read or
   write — no Supabase, no Cloudflare, no production SQL, no `/api/deploy-info`.
   No `src/**` or `supabase/**` edit. Nothing outside `scripts/planning-pack/**`,
   its tests, this handoff, and the `REDESIGN_STATE.md` registration was touched.

## Problem — why this existed

The updater derived ~47 of 48 documents from the live working tree and nothing
checked that those bytes were committed; only `deploy-state` was safe, because it
was read via `git show <ref>:<path>`. An agent that ran the updater (or the
post-commit hook did) with an uncommitted edit to a pack source would publish the
uncommitted bytes to the permanent Drive documents. R-4 A-1 authorizes removing
the hazard class by making every source read from the committed tree — the
`deploy-state` mechanism, generalized. The characterization
(`UPDATER-INVESTIGATION-CLOSEOUT.md` → CANDIDATE DESIGNS) names Design B the
**lighter refinement**: change the read path, do **not** convert the 24 manifest
entries into catalog Git sources.

## What was built

- **Pin once (C-1).** `discover_sources` resolves the redesign `HEAD` to one SHA
  at run start (`pin_redesign_commit`) and reads every same-lineage source at that
  SHA. `deploy-state` keeps its own production-lineage ref (C-2), unchanged.
- **Committed-tree read primitives** in `git_source.py` (standard library only):
  `resolve_ref_to_commit`, `read_committed_text`, `read_committed_blob` (binary),
  `materialize_committed_file` (atomic; text stored LF, binary verbatim; fails
  closed and never overwrites a prior artifact on failure), `list_committed_blobs`
  (`git ls-tree`), and `committed_path_commit_time`. These reuse the existing
  `_run_git`/`_decode`/`normalize_newlines` and add **no** provenance wrapper, so
  same-lineage content is byte-identical to the canonical file.
- **Filesystem entries materialized from the commit.** `manifest_source` validates
  the entry exactly as before, then materializes `git show <sha>:<path>` under
  `generated/committed/<path>`; the catalog entry is unchanged and carries no
  `git_spec`. `deploy-state` still gets its provenance-wrapped generated document.
- **Phase enumeration from the commit (C-3).** `git ls-tree` of the phase
  directory at the pinned SHA, matched `NN-*.md` for `first..last`; a phase file
  on disk but not committed is not selected, one committed but absent from disk
  still is.
- **Newest handoff over the commit (C-4).** `latest-handoff` selects the newest
  committed handoff by last-touching commit time, then materializes it.
- **Master context from committed inputs (C-5).** `master_context_sources`
  materializes its four fixed inputs, the current phase, and the active/newest
  handoffs from the pinned commit; the generated artifact still lives in the
  unversioned generated directory.
- **Fail closed (C-6).** A catalogued path absent from the pinned commit aborts
  the run inside materialization; there is no working-tree fallback.
- **`--source-manifest` preserved (C-7).** The override still selects only the
  catalog file; a filesystem entry's content still resolves from the pinned
  redesign commit, proven by a test that reads a decoy beside the override and a
  dirty working tree and gets neither.

`gate_source_isolation`, `verify_git_sources`, `source_snapshot.py`, `build_docx`,
and the entire publish loop are **unchanged**: filesystem sources materialize
under `generated/committed`, which is inside the redesign root, so the existing
containment check passes and still fails closed on any out-of-tree root; and only
`deploy-state` carries a `git_spec`, so `verify_git_sources` still covers exactly
the cross-lineage document. The source model and the manifest are preserved; the
change is confined to where content is read.

## Evidence (classes: [TEST] executed test suite, [GIT] git fact, [REPO] repo read)

- [TEST] `python scripts/planning-pack/test_git_source.py` → **Ran 45 tests, OK**
  (29 pre-existing + 16 new committed-tree-read tests, including a git-level
  section-4 proof that an uncommitted edit is not read).
- [TEST] `<venv> scripts/planning-pack/test_source_isolation.py` → **Ran 24
  tests, OK** (9 unchanged SnapshotComparison + 13 rewritten ManifestDispatch +
  2 new PinnedDiscovery end-to-end). Includes
  `test_section_4_uncommitted_edit_does_not_reach_the_payload` and
  `test_discovery_resolves_committed_content_over_a_dirty_tree`, both asserting on
  payload content, not the absence of an error.
- [TEST] `node scripts/planning-pack/test-validate-claude-project-context.mjs` →
  **20 passed, 0 failed** (unchanged; generation contract intact).
- [TEST] Integration proof on the real 48-document catalog at `a301ce20a`
  (generated output redirected to a scratch dir; no Drive, no repo write):
  `SOURCE_COUNT: 48`; `GIT_SPEC_SOURCES: ['deploy-state']` (the lighter refinement
  confirmed — only the cross-lineage document is a Git source); materialized
  `claude`, `redesign-state`, and `master-rules` byte-match `git show`, live under
  staging, and are not the working tree; `deploy-state` keeps its provenance
  wrapper; worst-case real materialized path ≈188 chars, under Windows MAX_PATH.
- [GIT] `git status --porcelain=v1` before commit listed only the intended files.

## Files changed

- `scripts/planning-pack/git_source.py` — added committed-tree read primitives
  (no change to the existing provenance/verify functions).
- `scripts/planning-pack/update_planning_pack.py` — pin-once; filesystem/phase/
  handoff/master-context resolution read from the pinned commit and materialize
  under `generated/committed`.
- `scripts/planning-pack/test_git_source.py` — 16 new tests.
- `scripts/planning-pack/test_source_isolation.py` — ManifestDispatch rewritten
  for the Design B contract; PinnedDiscovery end-to-end tests added; module
  docstring updated.
- `docs/agent-handoffs/UPDATER-DESIGN-B-COMMITTED-TREE-SOURCES-BUILT-LOCAL.md`
  (this file) and `docs/REDESIGN_STATE.md` (registration).

## Documents reviewed / updated / intentionally NOT changed

- **Read:** `CLAUDE.md`, `docs/redesign/MASTER-RULES.md`, `docs/REDESIGN_STATE.md`,
  `docs/redesign/DECISIONS.md` → R-4 amendment,
  `docs/agent-handoffs/UPDATER-INVESTIGATION-CLOSEOUT.md` → CANDIDATE DESIGNS,
  `docs/redesign/CLAUDE-PROJECT-SOURCES.json`, and the four updater source modules.
- **Updated:** `docs/REDESIGN_STATE.md` — registered this handoff at the head of
  the active `## Latest handoff` group.
- **Intentionally NOT changed:**
  - `docs/CURRENT_STATUS.md` — its update rule fires on a change to current phase,
    blocker, release, migration, or next-action state. Design B is a local
    infrastructure build that does not advance the Step 4.3 phase, change a
    blocker's disposition, deploy, or migrate; the brief scoped the documentation
    to `REDESIGN_STATE.md` plus this handoff. Left unchanged.
  - `docs/AUTHORITATIVE_DOCUMENTS.md` — no authority was added, moved, superseded,
    or archived. Left unchanged.
  - `docs/redesign/CLAUDE-PROJECT-SOURCES.json` — the catalog is deliberately
    unchanged; Design B changes where content is read, not the 48-document set.
  - `docs/redesign/MASTER-PLAN.md` — no project-wide goal, phase, milestone, or
    durable contract changed.
  - The `AMEND-R4-DESIGN-B` and `RECORD-OWNER-RULINGS` subsections of
    `REDESIGN_STATE.md` that call building Design B "the queued next work item" —
    dated historical records under the R-3 dated-history standard, retained. The
    new active-group entry records that Design B is now built.

## Known limitations / deliberately left in place

- The first Design-B run **after delivery** will re-publish all 48 documents once,
  because each source's hash changes from the working-tree bytes to the committed
  bytes. This is a benign one-time event under the content-addressed publish; the
  health signal is `success: true` with created+updated+unchanged summing to 48.
- The catalog file itself is still read from the working tree (or a
  `--source-manifest` override), by design: R-4 A-1 and the closeout scope Design
  B to document **content**, and C-7 keeps the catalog a selectable file. An
  uncommitted catalog edit can change which committed documents publish, but
  cannot inject uncommitted document content.

## Production and external effects

**None.** No deploy, migration, production read/write, push, merge, delivery, or
Drive change occurred.

## Next approved action, and what is NOT approved

- **Owner delivery (R-4 A-4).** Deliver the built fix repo→installed via
  `sync_installed_updater.py --apply`. It makes no backup and is non-atomic, so
  copy `%LOCALAPPDATA%\TMPlanningPackUpdater` first. This is the **owner's** step;
  an agent session cannot perform it.
- **NOT approved by this handoff:** delivery, any push, any autorun or scheduled
  task, any `.bat`/hook edit, any catalog or Drive change, and any deploy,
  migration, or production write. Each requires its own owner authorization.

## Note on the post-commit synchronization receipt

The commit that lands this work triggers the committed post-commit hook, which
runs the **installed** updater. The installed updater does **not** carry this
change until the owner delivers it, so that run publishes via the **old
working-tree read path**. Its receipt therefore does not validate Design B — the
tests above do. The receipt is reported in the task report and the updater log,
not copied into a canonical document.
