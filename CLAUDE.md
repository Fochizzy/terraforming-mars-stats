# TM Stats Claude Code Instructions

@docs/redesign/MASTER-RULES.md
@docs/redesign/PAGE-ARCHITECTURE.md

## Current task

Read only the phase or substep named in the task.

Also read:

- `docs/REDESIGN_STATE.md`
- `docs/redesign/DECISIONS.md`
- The latest relevant handoff in `docs/agent-handoffs/`

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
