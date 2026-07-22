# Claude Project Context Contract

## Purpose

The permanent native Google Doc named **TM PROJECT MASTER CONTEXT** is the
orientation page for the external Claude Project. Add that one document to the
Claude Project once. The local TM Planning Pack updater replaces the contents
of the same Google Drive file ID on later runs.

This prevents project context from depending on whichever single handoff file
happens to have the newest filesystem timestamp.

## Required use

An external assistant working from the Claude Project must read **TM PROJECT
MASTER CONTEXT** first. It provides, in one document:

- this context contract;
- the concise `docs/CURRENT_STATUS.md` current-work router;
- the `docs/AUTHORITATIVE_DOCUMENTS.md` authority and evidence index;
- the full canonical `docs/REDESIGN_STATE.md`;
- the full phase file detected from the `Current substep` section of that state
  file;
- every handoff in the first contiguous list under `## Latest handoff`; and
- the newest repository handoff as a freshness backstop when it is not already
  in the declared active set.

The source path appears above every embedded document. Embedded headings are
demoted only to preserve one readable document outline; source text is otherwise
retained.

## Authority and scope

The generated document is a navigation and aggregation surface. It is not a new
authority layer and does not replace any canonical repository file.

- The authority order in the root instructions and project governance remains
  controlling.
- A current assignment still limits scope even when the generated document
  contains future-phase context.
- The generated document never authorizes a new substep, production mutation,
  migration, deployment, push, or unrelated fix.
- If generated text conflicts with an attached canonical source, follow the
  canonical source and report the generated document as stale.
- Local coding agents must still read the canonical repository files required
  by `AGENTS.md` and `CLAUDE.md`; they must not substitute the generated copy.

## Active-handoff declaration

`docs/REDESIGN_STATE.md` owns the active-handoff declaration. The updater reads
the first contiguous bullet-list group below `## Latest handoff`. A blank line
ends that active group, allowing older historical handoffs to remain listed
separately without being embedded every run.

Every current handoff needed to understand or continue the active work must be
in that first group. Future agents already updating project state and their
handoff must maintain this group as part of the same change. The updater fails
closed if the section is missing, empty, duplicated, malformed, or refers to a
missing file.

## Version-controlled source catalog

`docs/redesign/CLAUDE-PROJECT-SOURCES.json` owns the individual planning-pack
documents, their stable keys, their Google Doc titles, the phase-file range, and
the two dynamic outputs. The installed updater reads this repository file; its
document count is derived rather than hard-coded. The master page also embeds
both routing documents before the full state and phase content.

When a durable cross-project guidance document becomes necessary for external
Claude work, add it to the catalog in the same change. A missing source,
duplicate key, duplicate title, invalid root, malformed phase range, or retired
catalog key with a still-managed Drive document must fail closed. Removing or
renaming a managed source requires an explicit retirement/migration operation;
the updater must not silently delete or orphan a Google Doc.

`docs/CURRENT_STATUS.md` and `docs/AUTHORITATIVE_DOCUMENTS.md` are permanent
catalog entries. They route the external project to concise current state and
the correct evidence/authority chain without replacing canonical detail.

## Stable update behavior

The generated Markdown is deterministic. It carries a fingerprint of the
ordered source paths and bytes, not a run timestamp. Therefore an unchanged
source set leaves the Google Doc unchanged, while any change to the context
contract, state, current phase, declared active handoffs, or included newest
handoff updates the same Google Doc ID.

The Google Drive file link remains stable. Whether and when Claude refreshes a
linked Drive source is controlled by Claude; the updater can guarantee the
Drive document contents and identity, not Claude's ingestion timing.

## Documentation and synchronization completion gate

Before a completed redesign task is reported as finished:

1. update `docs/CURRENT_STATUS.md` and `docs/REDESIGN_STATE.md` together when
   current state changed;
2. create or update the handoff and maintain the active-handoff declaration;
3. update `docs/AUTHORITATIVE_DOCUMENTS.md` and the source catalog when routing
   changed;
4. record in the handoff which canonical documents were reviewed, updated, or
   intentionally unchanged;
5. run `npm.cmd run validate:claude-context -- --require-maintenance` before the
   completion commit; and
6. after commit, run the local authorized updater or report synchronization as
   pending with the exact reason.

The post-commit result is recorded by the updater's local summary/log and the
final task report. Do not edit a canonical source solely to record that receipt,
because the edit would itself require another synchronization. A successful
Drive update still does not prove when Claude refreshed the linked source.

## Maintenance boundary

Edit the canonical repository documents, never the generated Markdown under the
updater's local application directory. The generated file is an output and may
be replaced on every updater run.
