# Claude Project Master Context Automation Handoff

## Status

Implemented on 2026-07-22. This is a project-governance and local context-
delivery task. It does not change Phase 4 implementation or production state.
Strengthened later the same day with concise authority/status routing,
manifest-driven source discovery, and an enforced documentation/sync gate.

## Scope completed

- Added the canonical Claude Project context-delivery contract.
- Directed external Claude Project sessions to one permanent first-read Google
  Doc instead of requiring each active handoff to be added separately.
- Defined `REDESIGN_STATE.md`'s first `Latest handoff` group as the active
  handoff declaration.
- Extended the local TM Planning Pack updater to generate the master context,
  preserve a stable Google Doc ID, and fail closed on context-source drift.
- Hardened local updater locking so dead-process locks recover immediately,
  genuine overlap exits cleanly, and the scheduled task runs through windowless
  Python instead of a closable console window.
- Added `docs/CURRENT_STATUS.md` and `docs/AUTHORITATIVE_DOCUMENTS.md` as small
  first-read routing documents embedded in the master page and published as
  separate native Google Docs.
- Reconciled stale detailed-state wording against the newer verified production
  apply record: expansion, interim coarsening, and the guest-resolver revoke are
  applied; the compatible redesign reader is not deployed and the legacy
  matcher contraction remains gated and unapplied.
- Replaced the installed updater's hard-coded source list/count with the
  version-controlled `CLAUDE-PROJECT-SOURCES.json` catalog.
- Added a structural and maintenance-mode validator, wired structural checks
  into test/build/preview/deploy preflights, and versioned the updater sources
  under `scripts/planning-pack/`.
- Made post-commit synchronization or an explicit pending reason a completion
  gate without creating a recursive handoff-edit/sync loop.
- Updated root instructions, master rules, durable decisions, project state,
  and the project-wide master plan without changing the active substep.

## Files changed

- `AGENTS.md`
- `CLAUDE.md`
- `package.json`
- `docs/CURRENT_STATUS.md`
- `docs/AUTHORITATIVE_DOCUMENTS.md`
- `docs/REDESIGN_STATE.md`
- `docs/agent-handoffs/CLAUDE-PROJECT-MASTER-CONTEXT-AUTOMATION.md`
- `docs/redesign/CLAUDE-PROJECT-CONTEXT.md`
- `docs/redesign/CLAUDE-PROJECT-SOURCES.json`
- `docs/redesign/MASTER-RULES.md`
- `docs/redesign/DECISIONS.md`
- `docs/redesign/MASTER-PLAN.md`
- `scripts/validate-claude-project-context.mjs`
- `scripts/planning-pack/update_planning_pack.py`
- `scripts/planning-pack/verify_drive.py`
- `scripts/planning-pack/google_docs_title_sanitize.py`

Local installed updater files, outside Git:

- `C:\Users\izzyh\AppData\Local\TMPlanningPackUpdater\update_planning_pack.py`
- `C:\Users\izzyh\AppData\Local\TMPlanningPackUpdater\verify_drive.py`
- `C:\Users\izzyh\AppData\Local\TMPlanningPackUpdater\google_docs_title_sanitize.py`

## Generated document contract

`TM PROJECT MASTER CONTEXT` contains the full context contract, concise current
status, authority/evidence index, detailed state, detected current phase,
declared active handoffs, and the newest repository handoff when it is outside
the active declaration. Its fingerprint is derived from ordered source paths
and bytes, so an unchanged snapshot is not rewritten.

The manifest-driven planning pack contains 48 documents: 25 fixed catalog
entries, all 21 phase files, and two generated dynamic documents. The exact
Phase 4, Step 4.3 assignment guide is a required catalog entry as well as being
embedded in the master router, so the current assignment cannot be omitted
silently. The generated document is navigation and aggregation only. Canonical
authority, scope boundaries, and production gates remain unchanged.

## Validation

- Installed updater Python files compile successfully.
- Master generation is byte-deterministic for an unchanged source set. The
  parser detected Phase 4, eight declared active handoffs, and the new
  context-delivery handoff as the newest freshness backstop.
- Fail-closed checks reject a duplicate active handoff and a current phase with
  no matching phase file.
- `--prepare-only` converted and structurally verified all 45 DOCX files.
  The master DOCX contains 1,017 paragraphs, 203 headings, 21 tables, and all
  required state, phase, active-handoff, and freshness-backstop source markers.
- The first Drive reconciliation completed with 1 created, 7 updated, and 37
  unchanged. Live verification returned 45 native Google Docs, zero subfolders,
  zero other files, 45 unique titles, and exact Drive/state ID agreement.
- All 44 pre-existing Google Doc IDs were preserved. The new master document is
  [TM PROJECT MASTER CONTEXT](https://docs.google.com/document/d/1odSGfjZC6LKJ-q5ytB5jq7G3JSd4E7AXaYsQkmX7g9s/edit).
- A later scheduled run was interrupted and left a lock for dead PID 46912.
  The installed updater now verifies lock ownership by live process, removes
  dead locks immediately, preserves a live owner's lock, and returns a friendly
  exit 0 instead of a traceback during genuine overlap.
- The scheduled action now uses windowless `pythonw.exe`. A real overlap test
  kept the scheduled lock intact while the desktop launcher returned the
  friendly one-line message and exit 0. The hidden scheduled run then completed
  all 45 documents unchanged, returned task result 0, released its lock, and
  remained scheduled for 2026-07-22 16:46:24 local time.
- `npm.cmd test`: 178 test files / 979 tests passed.
- `npx.cmd tsc --noEmit`: passed.
- `npm.cmd run lint`: passed with the four existing warnings only.
- `npm.cmd run build`: passed, 32/32 static-generation pages and
  middleware present.
- `git diff --check`: passed.

Same-day strengthening validation:

- Catalog validation passed with 25 fixed entries, 21 phase documents, two
  dynamic documents, 48 total documents, Phase 4 detected, eight active
  handoffs, and the external deploy-state source present.
- Maintenance-mode validation passed with one changed handoff referenced by
  `REDESIGN_STATE.md`.
- Python compilation and discovery passed with 48 expected and discovered
  sources, unique keys and titles, and the exact Step 4.3 assignment guide
  present.
- Installed `--prepare-only` converted and structurally verified all 48 DOCX
  files, including `CURRENT_STATUS`, `AUTHORITATIVE_DOCUMENTS`, the Step 4.3
  assignment guide, and `TM PROJECT MASTER CONTEXT`.
- `npm.cmd test`: 178 test files / 979 tests passed.
- `npx.cmd tsc --noEmit`: passed.
- `npm.cmd run lint`: passed with the four existing warnings only.
- `npm.cmd run build`: passed, 32/32 static-generation pages and middleware
  present.
- `git diff HEAD --check`: passed.

The bundled visual renderer could not start because LibreOffice is not
installed. No visual-render claim is made; package validation, the Google Docs
title sanitizer, Python-DOCX structural inspection, and the live native-Google-
Doc import are the documented fallback evidence.

## Production and external effects

No application, Supabase, schema, migration, production-data, Storage, push, or
deployment action is part of this task. The only external content change is the
user-approved planning-pack synchronization to the existing private Google Drive
folder.

## Known limitations

- The updater can guarantee the Google Doc's stable ID and current Drive
  contents. Claude controls linked-source refresh timing.
- LibreOffice is not installed in this environment, so DOCX visual rendering is
  unavailable; structural DOCX validation and the existing Google Docs title
  sanitizer are the fallback evidence.

## Documentation maintenance

Before a redesign task stops, update the concise status router, detailed state,
and a referenced handoff; update decisions and project-wide documents only when
their governing facts changed. The maintenance-mode validator requires the
state and handoff updates and verifies that catalog, phase, and active-handoff
references remain complete.

## Post-commit synchronization

After the documentation commit, run the desktop planning-pack batch file and
verify its receipt, Drive inventory, stable IDs, and scheduled task. Record the
final receipt in the updater logs and task report; do not create a fresh source
edit solely to record that receipt, because doing so would create another
unsynchronized change. Drive synchronization proves current native Google Docs,
not that Claude has already refreshed a linked source.

## Repository state

- Branch: `redesign/tm-stats-dashboard-rebuild`
- Completion commit: the commit containing this handoff
- Push/deploy: not requested and not performed
- Phase status: unchanged; Phase 4, Step 4.3 remains blocked at its documented
  release boundary

## Next approved action

The Phase 4, Step 4.3 release boundary and next action in
`docs/REDESIGN_STATE.md` remain unchanged. Do not begin Step 4.4.
