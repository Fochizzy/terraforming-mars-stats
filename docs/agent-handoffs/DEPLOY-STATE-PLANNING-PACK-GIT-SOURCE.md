# DEPLOY-STATE Planning-Pack Git Source Handoff

## Status

Implemented 2026-07-22. This is a local documentation-and-tooling correction to
the planning-pack updater and its validation gate. It changes no application
behavior, no Phase 4 implementation, no release state, and no production fact.

## Root cause, confirmed

The planning pack published a stale `DEPLOY-STATE` document because the source
manifest resolved it from a working-tree file rather than from Git:

```json
{ "key": "deploy-state", "title": "DEPLOY-STATE", "root": "live", "path": "DEPLOY-STATE.md" }
```

`root: "live"` resolved to `C:\Users\izzyh\Documents\Terraforming Mars\DEPLOY-STATE.md`,
an **untracked** file in the live checkout. Because it is untracked, no deploy
session could commit to it, and none refreshed it. The 2026-07-22 deploy session
correctly updated and committed the canonical tracked copy from its clean
deployment worktree, and that copy moved on without the cache.

The two disagreed at the time of this task:

| | Untracked cache | Canonical Git object |
|---|---|---|
| Worker version | `178229f3-bfa4-4776-826a-e344daf23d72` | `6ef56761-3c41-4c90-b83c-19db0060c048` |
| Source commit | `4dec49a423013b319a2904b35eb70396b1398800` | `d12e33ad09e976ec5779a6f0d79b621846912964` |
| Deployed | 2026-07-21 19:49Z, "nothing has shipped since" | 2026-07-22 19:26Z |
| Size | 82,198 bytes | 88,339 bytes |

Both figures above are quoted from the canonical Git object, which already
records the supersession. No production system was queried by this task.

## Canonical source

```
Repository: C:\Users\izzyh\Documents\Terraforming Mars
Ref:        fix/live-compare-data-remove-declared-style
Path:       DEPLOY-STATE.md
Read with:  git show fix/live-compare-data-remove-declared-style:DEPLOY-STATE.md
```

Resolved at implementation time: source tip `e4a99963fff86302d0f9ac76d4c54eaee331c805`,
newest commit touching the path `e4a99963fff86302d0f9ac76d4c54eaee331c805`
(2026-07-22T15:31:58-04:00), body SHA-256
`fbcb936b44981761bf2a9237dc77244d7954a5cac018e2b3ec722498c8734aa9`.

## What changed

### A first-class Git source type

`docs/redesign/CLAUDE-PROJECT-SOURCES.json` now declares `deploy-state` as
structured Git data (`sourceType`, `repository`, `ref`, `path`) rather than a
filesystem root and path. `scripts/planning-pack/git_source.py` resolves it:

- Git is invoked with an argument array, never `shell=True`.
- `git rev-parse --verify <ref>^{commit}` resolves the ref.
- `git cat-file -t <ref>:<path>` proves the path is a blob, not a tree.
- `git log -1 --format=%H%x00%cI <ref> -- <path>` resolves the newest commit
  touching the file and its commit time.
- `git show <ref>:<path>` reads the body, decoded as strict UTF-8.
- CRLF and lone CR are normalized to LF. That is the only transformation.

A missing repository, unreadable ref, missing path, absent `git` executable,
decode failure, or nonzero command is fatal and names the manifest entry and the
failed ref/path. **There is no filesystem fallback**, and the updater never
reads the untracked file again.

### Filesystem fallback removed

The `live` root is gone from both the updater and the validator. `redesign` is
now the only working-tree root, so no catalog entry can read another checkout's
working tree. A filesystem entry that declares `repository` or `ref` is rejected,
so no document can borrow the DEPLOY-STATE coordinates.

### Generated provenance

The published `DEPLOY-STATE` begins with a provenance block naming the source
type, repository, ref, resolved source-tip commit, path, newest commit touching
the path and its time, a SHA-256 of the canonical body, and the ISO-8601
generation time with timezone. A `---` rule separates it from the body, which
matches `git show <ref>:<path>` exactly after the documented newline
normalization.

The block is updater metadata, explicitly labelled as not a ledger entry. The
canonical production-lineage file was **not** edited to carry it. The generation
timestamp is re-stamped only when the resolved provenance or body changes, so an
unchanged source leaves the Google Doc unchanged.

### Source isolation

Only `deploy-state` changed its source configuration. The other 47 documents keep
their root, path, key, title, Drive ID, order, and dynamic classification. The
updater now logs a full source-resolution table and, given `--source-snapshot`,
fails closed before any Drive write unless every non-DEPLOY-STATE entry matches
the recorded snapshot and DEPLOY-STATE alone resolves through the required
repository and ref.

### Validation

`scripts/validate-claude-project-context.mjs` fails when the manifest still
points at a working-tree path for `deploy-state`; the repository, ref, or path is
unreadable; the provenance block is absent or incomplete; the stamped ref,
source-tip commit, or file-touch commit disagrees with Git; the stamped
generation time predates the file-touch commit time; the stamped body hash is
wrong; the generated body differs from `git show <ref>:<path>`; or a filesystem
fallback is configured. In `--require-maintenance` mode a missing generated
artifact is also a failure, so stale content blocks the completion commit.

The validator performs local Git and filesystem inspection only. It invokes no
Wrangler, Cloudflare, Supabase, database client, HTTP production endpoint, or
production credential.

### Synchronization rule broadened

`AGENTS.md` and `CLAUDE.md` now carry a production-action synchronization rule:
any session that deploys application code, applies a migration, or performs a
production write must append the result to the canonical `DEPLOY-STATE.md` on the
production lineage, commit it there, and then run the planning-pack updater, or
explicitly report synchronization pending with the reason. It applies regardless
of whether the session is redesign work, updating a noncanonical working copy
does not satisfy it, no session may claim the pack is current without an updater
receipt, and committing the ledger is not the same action as publishing the pack.

## Files changed

Repository:

- `AGENTS.md`
- `CLAUDE.md`
- `DEPLOY-STATE.md` (this branch's pointer stub: corrected the false claim that
  the live checkout's copy mirrors the canonical content)
- `package.json`
- `docs/AUTHORITATIVE_DOCUMENTS.md`
- `docs/CURRENT_STATUS.md`
- `docs/REDESIGN_STATE.md`
- `docs/agent-handoffs/DEPLOY-STATE-PLANNING-PACK-GIT-SOURCE.md`
- `docs/redesign/CLAUDE-PROJECT-CONTEXT.md`
- `docs/redesign/CLAUDE-PROJECT-SOURCES.json`
- `docs/redesign/MASTER-RULES.md`
- `docs/redesign/MASTER-PLAN.md`
- `scripts/validate-claude-project-context.mjs`
- `scripts/planning-pack/update_planning_pack.py`
- `scripts/planning-pack/git_source.py` (new)
- `scripts/planning-pack/source_snapshot.py` (new)
- `scripts/planning-pack/sync_installed_updater.py` (new)
- `scripts/planning-pack/test_git_source.py` (new)
- `scripts/planning-pack/test_source_isolation.py` (new)
- `scripts/planning-pack/test-validate-claude-project-context.mjs` (new)

Outside Git:

- `C:\Users\izzyh\AppData\Local\TMPlanningPackUpdater\update_planning_pack.py`
- `C:\Users\izzyh\AppData\Local\TMPlanningPackUpdater\git_source.py`
- `C:\Users\izzyh\AppData\Local\TMPlanningPackUpdater\source_snapshot.py`
- `C:\Users\izzyh\Documents\Terraforming Mars\DEPLOY-STATE.md` (replaced with a
  factless pointer stub; deliberately left untracked)

Intentionally unchanged: every non-DEPLOY-STATE manifest entry, `verify_drive.py`,
`google_docs_title_sanitize.py`, the installed credentials, token, Drive map, run
summaries, logs, and virtual environment, and all application code.

## The manifest-file-only override

The installed updater reads its catalog from a fixed path inside the shared
redesign checkout. That checkout must not be modified by this task, so
`--source-manifest` selects an alternate manifest **file** for one run.

It changes the manifest file location and nothing else. `ROOT` remains fixed, so
filesystem entries, phase files, handoffs, and the master context still resolve
against `C:\Users\izzyh\Documents\Terraforming Mars Redesign`. An overriding
manifest cannot re-root a document, cannot reinterpret relative paths against its
own directory, and cannot redirect anything to the live checkout. Regression
tests cover exactly this.

## Known limitation

Until this branch is merged into `redesign/tm-stats-dashboard-rebuild`, the
shared checkout's manifest still declares the retired `root: "live"`. The
corrected installed updater rejects it, so the desktop launcher and the
`TM Planning Pack Updater` scheduled task **fail closed** unless
`--source-manifest` is supplied. That is safe — it cannot publish stale content —
but the default path stays broken until the merge. Merging this branch restores
it with no further tooling change.

## Production and external effects

No deployment, Wrangler command, Cloudflare operation, Supabase or other
production query, migration, or production write was performed. Every production
fact quoted here was read from the canonical Git object. The only external change
is the authorized planning-pack refresh to the existing private Drive folder.

## Next approved action

None. The Phase 4, Step 4.3 release boundary in `docs/REDESIGN_STATE.md` is
unchanged, and Step 4.4 remains unstarted. Merging this branch into the
authoritative redesign lineage is the natural follow-up and requires separate
authorization.
