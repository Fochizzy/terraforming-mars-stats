# TM Stats Agent Instructions

## Required reading

Before editing, read:

1. `docs/CURRENT_STATUS.md`
2. `docs/AUTHORITATIVE_DOCUMENTS.md`
3. `docs/REDESIGN_STATE.md`
4. `docs/redesign/MASTER-RULES.md`
5. The exact phase file named in the task
6. `docs/redesign/DECISIONS.md`
7. The latest relevant handoff in `docs/agent-handoffs/`

Verify documentation claims against code, migrations, executable tests,
verification harnesses, and available production evidence. Evidence precedence
does not grant scope beyond the explicit assignment. Report contradictions
before modifying code, treat `docs/archive/` as historical unless a current
authority explicitly promotes it, and do not mark an item resolved without
executable verification.

Do not implement unrelated phases.

## Claude Project master context

The external Claude Project uses one permanent native Google Doc named
`TM PROJECT MASTER CONTEXT` as its first-read orientation page. The local
planning-pack updater regenerates that document from the canonical repository
sources defined in `docs/redesign/CLAUDE-PROJECT-CONTEXT.md` and updates the
same Google Drive file ID.

This generated page is navigation and aggregation only. It does not replace the
required canonical reading above, change document authority, or authorize wider
scope. Local agents must continue reading the repository files directly.

When updating `docs/REDESIGN_STATE.md`, keep every handoff required for the
current work in the first contiguous bullet group under `## Latest handoff`.
The generator embeds that entire group and fails closed on missing or malformed
entries. Older handoffs may remain after a blank line.

### Documentation and synchronization completion gate

Before claiming completion:

1. Update `docs/CURRENT_STATUS.md` and `docs/REDESIGN_STATE.md` together when
   current work or release state changed.
2. Create or update the handoff and record canonical documents reviewed,
   updated, and intentionally unchanged.
3. Maintain the active handoff group and update
   `docs/AUTHORITATIVE_DOCUMENTS.md` when authority routing changes.
4. Add new durable cross-project guidance to
   `docs/redesign/CLAUDE-PROJECT-SOURCES.json`.
5. Run `npm.cmd run validate:claude-context -- --require-maintenance`.
6. Commit the documentation with the task.
7. After commit, run the desktop planning-pack updater when available and
   authorized, or explicitly report the synchronization as pending.

Use the updater's local log and final task report for the post-commit receipt.
Do not edit a repository document solely to record that receipt. Verify Google
Drive content and identity, but do not claim Claude ingestion timing.

### Production-action synchronization rule

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
  actions. Completing the first does not complete the second.

The updater sources `DEPLOY-STATE` from Git and fails closed. It will not fall
back to a working-tree file, so an unreadable ref stops the run rather than
publishing a stale copy.

## Project architecture

- Next.js App Router
- React
- Strict TypeScript
- Supabase
- Recharts
- Existing Tailwind and CSS patterns
- Vitest and Testing Library
- Playwright

## Non-negotiable rules

- Use real Supabase data and production assets.
- Do not hard-code production analytics.
- Preserve explicit zero versus missing data.
- Do not fabricate temporal, card, TR, board, or opponent data.
- Keep calculations outside presentation JSX.
- Centralize analytics formulas.
- Add tests for derived metrics and migrations.
- Do not begin another phase without explicit instruction.

## Production assets

Use existing Supabase-hosted:

- Tag icons
- Point-source graphics
- Corporation logos

Do not replace them with generic production placeholders.

## Validation

Run the relevant commands:

- `npm test`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

## Handoff

Before stopping:

- Update `docs/CURRENT_STATUS.md` and `docs/REDESIGN_STATE.md` when applicable
- Update `docs/redesign/DECISIONS.md` when needed
- Create a handoff file
- Maintain the authority index, active handoff group, and planning-pack catalog
- Run the documentation-maintenance validator
- Run or explicitly defer the post-commit planning-pack synchronization
- Report files changed, tests, migrations, assumptions, and limitations

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
5. maintain `docs/AUTHORITATIVE_DOCUMENTS.md` and the planning-pack source catalog
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
