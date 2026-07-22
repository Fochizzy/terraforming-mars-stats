# TM Stats Claude Code Instructions

@docs/redesign/MASTER-RULES.md
@docs/redesign/PAGE-ARCHITECTURE.md

## Authoritative project information

Before planning, implementing, or recommending the next task:

1. Read `docs/CURRENT_STATUS.md`.
2. Read `docs/AUTHORITATIVE_DOCUMENTS.md`.
3. Read `docs/REDESIGN_STATE.md` and only the authoritative phase, decision,
   handoff, contract, migration, and verification sources relevant to the
   current assignment.
4. Verify documentation claims against current code, migrations, executable
   tests, verification harnesses, and available production evidence.
5. Treat files under `docs/archive/` as historical unless a current
   authoritative source explicitly promotes them.
6. Report unresolved contradictions before changing code.
7. Do not mark an item resolved without executable verification.

Evidence precedence determines which factual implementation claim is current;
it does not authorize work outside the explicit assignment. The full routing
and conflict rules are in `docs/AUTHORITATIVE_DOCUMENTS.md`.

## Current task

Read only the phase or substep named in the task.

Also read:

- `docs/REDESIGN_STATE.md`
- `docs/redesign/DECISIONS.md`
- The latest relevant handoff in `docs/agent-handoffs/`

## Claude Project master context

For the external Claude Project, read the permanent native Google Doc
`TM PROJECT MASTER CONTEXT` first. Its contract is
`docs/redesign/CLAUDE-PROJECT-CONTEXT.md`. The updater embeds the canonical
current state, detected current phase, declared active handoff group, and a
newest-handoff freshness backstop into the same stable Google Drive file ID.

The generated document is an orientation copy only. It does not replace the
canonical repository files, change their authority, or authorize another
phase, substep, production action, deployment, push, or migration. Local Claude
Code work must still read the canonical files listed here.

Maintain the first contiguous bullet group under
`docs/REDESIGN_STATE.md` -> `## Latest handoff` as the complete active
handoff set. A blank line separates it from historical handoffs.

## Documentation and Claude Project synchronization gate

Before claiming a completed redesign task:

1. Update `docs/CURRENT_STATUS.md` and `docs/REDESIGN_STATE.md` together when
   current phase, blocker, release, migration, or next-action state changed.
2. Create or update the task handoff and record which canonical documents were
   reviewed, updated, or intentionally unchanged.
3. Maintain the complete active handoff group in `docs/REDESIGN_STATE.md`.
4. Update `docs/AUTHORITATIVE_DOCUMENTS.md` when an authority is added, moved,
   superseded, or archived.
5. Add any new durable cross-project guidance document to
   `docs/redesign/CLAUDE-PROJECT-SOURCES.json` in the same change.
6. Run `npm.cmd run validate:claude-context -- --require-maintenance` before
   committing.
7. Include all required documentation in the same focused completion commit.
8. After the commit, run
   `%USERPROFILE%\Desktop\Refresh TM Project Planning Pack.bat` when the local
   authorized updater is available. Otherwise report synchronization as pending
   with the reason; do not claim Google Drive is current.
9. Verify the updater result and Drive structure from its local summary/log.

Step 8 is additionally hook-enforced. A `PostToolUse`/`Bash` hook gated on
`Bash(git commit *)` (`.claude/hooks/sync-planning-pack.ps1`, registered in
`.claude/settings.json`) runs the same updater automatically after a commit that
changes a planning-pack source, deriving that source set from
`docs/redesign/CLAUDE-PROJECT-SOURCES.json`. The hook is an enforcement aid, not
a replacement: it can be disabled, absent from a checkout, or awaiting user
approval, so this written step 8 remains authoritative and you must still run or
explicitly defer the updater yourself when the hook does not fire. See
`docs/redesign/DECISIONS.md` -> "Project-wide - post-commit planning-pack
synchronization is hook-enforced".

The final post-commit synchronization receipt belongs in the updater's local
log and the task report. Do not edit a canonical document solely to record that
receipt, because doing so would create a new unsynchronized source change.

The updater can verify Google Drive content and stable file identity. Never
claim that Claude has refreshed or ingested the linked source; Claude controls
that timing.

## Production-action synchronization rule

Any session that deploys application code, applies a migration, or performs any
production write must append the result to the canonical `DEPLOY-STATE.md` copy
on the production lineage, commit that record there, and then run the
planning-pack updater. If synchronization cannot be completed, the session must
explicitly report synchronization pending and the reason.

Updating a noncanonical working copy does not satisfy this requirement.

- The canonical copy is read from the ref configured in
  `docs/redesign/CLAUDE-PROJECT-SOURCES.json`, currently
  `fix/live-compare-data-remove-declared-style`. Read it with
  `git show fix/live-compare-data-remove-declared-style:DEPLOY-STATE.md`.
- Filesystem cache copies of `DEPLOY-STATE.md` must contain no production
  facts. A copy asserting a worker version, commit, ledger value, or deploy
  date is stale by construction; replace it with a pointer stub.
- This requirement applies regardless of whether the session is categorized as
  redesign work. A deploy-only, migration-only, or production-write-only
  session is still subject to it.
- Do not claim the planning pack is current without an updater receipt.
- Committing the ledger and publishing the planning pack are two separate
  actions. A session must not treat "committed the ledger" and "published the
  planning pack" as the same action.

The updater resolves `DEPLOY-STATE` with `git show <ref>:<path>` and fails
closed. There is no filesystem fallback, so an unreadable ref stops the run
instead of publishing a stale working-tree copy. This rule does not authorize a
deploy, migration, or production write; it governs what a session already
authorized to perform one must do afterwards.

## Required workflow

1. Inspect the existing implementation.
2. Confirm data availability and missing-data behavior.
3. List expected files before editing.
4. Complete only the assigned substep.
5. Run the required checks.
6. Update state and handoff documentation.
7. Run the documentation-maintenance validator.
8. Commit the completed substep.
9. Run or explicitly defer the post-commit planning-pack synchronization and
   report its result.

## Project rules

- Use real Supabase data and assets.
- Reuse the existing architecture and dependencies.
- Do not add another charting or UI framework.
- Do not hard-code analytics.
- Do not fabricate missing data.
- Keep formulas centralized and tested.
- Do not silently change approved definitions.
- Do not begin another phase without instruction.

## Master Plan Review and Maintenance

### Required review before work

Before planning or implementing any redesign phase or substep, review the applicable project documents in this order:

1. the current explicit user-approved assignment
2. `docs/REDESIGN_STATE.md`
3. the assigned phase file
4. `docs/redesign/DECISIONS.md`
5. the latest relevant handoff
6. `docs/redesign/MASTER-RULES.md`
7. `docs/redesign/MASTER-PLAN.md`
8. `docs/redesign/reference/TM-Stats-Redesign-Master-Guide.docx` when broader architectural or product context is needed

Use `docs/redesign/MASTER-PLAN.md` for:

- project-wide context
- phase relationships
- shared terminology
- durable architectural direction
- analytics and data-integrity principles
- cross-page expectations
- stable repository constraints
- long-term dependencies and deferred work

The master plan is context, not permission to expand scope.

Implement only the explicitly assigned phase and substep. Do not begin future work merely because it appears in the master plan.

When documents differ, follow the documented authority order. The current explicit assignment, project state, assigned phase file, approved decisions, and current handoff take precedence over the master plan.

### Required review after work

At the end of every completed redesign substep:

1. update `docs/CURRENT_STATUS.md` and `docs/REDESIGN_STATE.md` when current
   work or release state changed
2. create or update the required handoff
3. update `docs/redesign/DECISIONS.md` when a durable decision was approved
4. update relevant inventories, matrices, specifications, or phase documents when required
5. maintain `docs/AUTHORITATIVE_DOCUMENTS.md` and
   `docs/redesign/CLAUDE-PROJECT-SOURCES.json` when their routing changes
6. review `docs/redesign/MASTER-PLAN.md`
7. determine whether the completed work changed durable project-wide context
8. update the master plan when such a change occurred
9. run the documentation-maintenance validator
10. include all required documentation in the same substep commit
11. run or explicitly defer the post-commit planning-pack synchronization

### When to update the master plan

Update `docs/redesign/MASTER-PLAN.md` when approved work changes one or more of the following:

- project goals or boundaries
- authority or governance rules
- phase structure or sequencing
- completed major milestones
- durable architecture
- shared component direction
- analytics semantics or foundational contracts
- data-capability or missing-data rules
- filter or URL-state direction
- asset identity or presentation policies
- accessibility requirements
- repository-wide constraints
- validation or release gates
- cross-page dependencies
- material risks or deferred project-wide work
- the documented current phase or next major milestone

### When not to update the master plan

Do not update the master plan solely for:

- routine implementation details
- temporary debugging notes
- individual file changes
- minor test-count changes
- local refactors that do not change project direction
- transient blockers
- unapproved proposals
- speculative future features
- work outside the explicitly assigned scope

Record immediate status, active blockers, current commits, validation results, and the next action in `docs/REDESIGN_STATE.md` or the applicable handoff instead.

### Master-plan integrity rules

Do not:

- use the master plan to authorize additional scope
- replace higher-authority documents with the master plan
- imply that an unapproved decision has been approved
- invent phases, requirements, formulas, capabilities, mappings, or validation results
- remove unresolved risks or deferred work without evidence
- overwrite concurrent changes from another agent
- copy temporary implementation notes into the master plan
- treat the master plan as the source of immediate worktree status

When updating the master plan:

- preserve its project-wide purpose
- keep statements factual and evidence-based
- cite or reference the governing project document where appropriate
- preserve known limitations and missing-data constraints
- distinguish completed, active, planned, deferred, and unapproved work
- update related sections consistently
- review the final diff before committing
