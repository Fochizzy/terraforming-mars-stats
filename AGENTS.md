# TM Stats Agent Instructions

## Required reading

Before editing, read:

1. `docs/redesign/MASTER-RULES.md`
2. The exact phase file named in the task
3. `docs/REDESIGN_STATE.md`
4. `docs/redesign/DECISIONS.md`
5. The latest relevant handoff in `docs/agent-handoffs/`

Do not implement unrelated phases.

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

- Update `docs/REDESIGN_STATE.md`
- Update `docs/redesign/DECISIONS.md` when needed
- Create a handoff file
- Report files changed, tests, migrations, assumptions, and limitations
