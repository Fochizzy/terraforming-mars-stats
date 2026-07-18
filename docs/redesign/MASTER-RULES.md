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

<!-- BEGIN GUEST-IDENTITY-PRIVACY-RULES -->

## Guest player identity and claimed-name privacy

The authoritative cross-phase contract is:

`docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`

Non-negotiable rules:

- unmatched players may exist as unlinked guests before account registration
- a guest may be identified using either username or first and last name
- username and personal-name matching are separate
- registration must explicitly confirm a claim
- a successful claim preserves the existing player ID
- historical games and statistics remain attached to that player ID
- after claim, the registered username is the public identity
- first name, last name, full name, normalized personal names, and private
  personal-name aliases must not appear publicly
- private names must be excluded from public and client payloads, not merely
  hidden visually
- missing username must never fall back to a private personal name
- schema or migration changes require separate explicit authorization
- production identities must not be mutated during redesign validation

Every phase that reads, creates, resolves, claims, serializes, exports, or
displays player identities must comply with the authoritative contract.

<!-- END GUEST-IDENTITY-PRIVACY-RULES -->
