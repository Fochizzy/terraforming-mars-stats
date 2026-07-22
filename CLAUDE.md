# TM Stats Claude Code Instructions

@docs/redesign/MASTER-RULES.md
@docs/redesign/PAGE-ARCHITECTURE.md

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

## Required workflow

1. Inspect the existing implementation.
2. Confirm data availability and missing-data behavior.
3. List expected files before editing.
4. Complete only the assigned substep.
5. Run the required checks.
6. Update state and handoff documentation.
7. Commit the completed substep.

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

1. update `docs/REDESIGN_STATE.md`
2. create or update the required handoff
3. update `docs/redesign/DECISIONS.md` when a durable decision was approved
4. update relevant inventories, matrices, specifications, or phase documents when required
5. review `docs/redesign/MASTER-PLAN.md`
6. determine whether the completed work changed durable project-wide context
7. update the master plan when such a change occurred
8. include any required master-plan update in the same substep commit

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
