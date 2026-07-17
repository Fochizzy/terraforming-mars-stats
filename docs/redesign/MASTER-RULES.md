# TM Stats Redesign Master Rules

## Architecture

Preserve:

- Next.js App Router
- React
- Strict TypeScript
- Supabase
- Recharts
- Existing Tailwind and CSS conventions
- Vitest, Testing Library, and Playwright

## Data integrity

- Use real application data.
- Do not hard-code production statistics.
- Do not convert missing values into zero.
- Preserve explicit zero observations.
- Do not reconstruct generation-level values from final totals.
- Do not invent board coordinates or placement events.
- Use unavailable and partial-data states where necessary.

## Supabase assets

Use existing Supabase-hosted:

- Tag icons
- Point-source graphics
- Corporation logos

Asset handling must include:

- Shared typed lookup logic
- Loading states
- Missing-asset fallback
- Accessible labels
- Responsive sizing
- Caching where appropriate

## Temporal analytics

The application tracks:

- Cards bought by player and generation
- Terraforming Rating by player and generation

These must remain distinct from:

- Cards played
- Cards drawn
- Cards retained
- Final Terraforming Rating

## Analytics

- Centralize calculations.
- Document formulas.
- Show denominators.
- Show sample sizes.
- Identify low-sample results.
- Add tests for derived values.
- Avoid unsupported causal language.

## Workflow

- Implement one substep at a time.
- Do not remove legacy components before replacements work.
- Run tests before handoff.
- Commit before switching agents.
