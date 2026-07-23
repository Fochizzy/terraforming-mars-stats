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

## Claude Project context delivery

- The permanent native Google Doc `TM PROJECT MASTER CONTEXT` is the required
  first-read orientation page for the external Claude Project.
- Its canonical generation contract is
  `docs/redesign/CLAUDE-PROJECT-CONTEXT.md`.
- It embeds the current state, the phase detected from that state, every handoff
  in the first contiguous list under `REDESIGN_STATE.md` -> `Latest handoff`,
  and the newest repository handoff when needed as a freshness backstop.
- The generated page is navigation and aggregation only. It never replaces a
  canonical source, changes authority, or grants scope, production, migration,
  deploy, push, or next-substep permission.
- Local agents must read canonical files directly. External assistants must
  follow the canonical authority order and flag any generated/canonical
  conflict as stale generated context.
- Future state updates must keep the first `Latest handoff` list complete for
  the active work. A blank line ends that active group; older historical
  handoffs may follow separately.
- `docs/CURRENT_STATUS.md` is the concise current-work router and
  `docs/REDESIGN_STATE.md` is the full detailed state. Update them together when
  phase, blocker, release, migration, or next-action state changes.
- `docs/AUTHORITATIVE_DOCUMENTS.md` owns current authority routing and evidence
  precedence. Report unresolved contradictions before implementation and never
  treat stronger evidence as permission to broaden scope.
- The version-controlled individual-document catalog is
  `docs/redesign/CLAUDE-PROJECT-SOURCES.json`. Add a new durable cross-project
  guidance document there in the same change that creates or promotes it.
- A catalog document owned by another repository lineage must be declared as a
  Git source with an explicit repository, ref, and in-tree path. `redesign` is
  the only working-tree root; no catalog entry may read another checkout's
  working tree, because such a copy goes stale the moment that lineage is
  committed to from elsewhere.
- Generation must fail closed on a missing current phase, missing or malformed
  active-handoff declaration, duplicate active handoff, or missing source file.
- Git-sourced generation must fail closed on an unreadable repository, ref, or
  path, and must never fall back to a filesystem copy. Each generated
  Git-sourced document carries a provenance block naming its ref, resolved tip
  commit, newest commit touching the path, generation time, and body hash.
  Validation rejects a missing, mismatched, or stale block, and rejects a body
  that differs from `git show <ref>:<path>`.
- Any session that deploys application code, applies a migration, or performs a
  production write must append the result to the canonical `DEPLOY-STATE.md` on
  the production lineage, commit it there, and then run the planning-pack
  updater, or explicitly report synchronization pending with its reason. This
  applies whether or not the session is redesign work, and committing the ledger
  and publishing the planning pack are separate actions.
- Generation must be deterministic and update the same Google Doc ID only when
  source content changes.
- Every completed redesign task must run
  `npm.cmd run validate:claude-context -- --require-maintenance` before commit.
- After commit, run the authorized desktop planning-pack updater when available,
  or report the synchronization as pending with its reason. The local updater
  log and task report are the final receipt; do not create a new source change
  solely to record that post-commit receipt.
- Post-commit and post-merge synchronization in the updater's tree is
  additionally enforced by a committed Claude Code hook
  (`.claude/hooks/sync-planning-pack.ps1`, registered in `.claude/settings.json`
  on `PostToolUse`/`Bash` via `Bash(git commit *)` and `Bash(git merge *)`
  handlers), which runs the same updater and derives its watch set from
  `CLAUDE-PROJECT-SOURCES.json`. It runs only from the tree the updater reads;
  from any other worktree it reports synchronization PENDING and does not sync.
  This automation is Claude Code-only and does not run under other agents, so the
  written after-commit rule above stays authoritative whether the hook is
  disabled, unavailable, unapproved, or firing outside the updater's tree. An
  automatic run in the updater's tree is expected, not a violation; a non-tree
  commit's PENDING message is the synchronization report for that commit. Do not
  disable the hook, hand-edit the sync marker, or run the updater manually to
  bypass the gate. See `docs/redesign/DECISIONS.md` -> "Project-wide -
  post-commit planning-pack synchronization is hook-enforced".
- Verify Drive content and stable IDs only. Claude controls linked-source refresh
  timing, so never claim automatic ingestion or a particular refresh time.

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

<!-- BEGIN UPSTREAM-CATALOG-MAP-RULES (Phase 4, Step 4.3) -->

## Upstream Terraforming Mars source-authority contract

The open-source Terraforming Mars implementation
(`https://terraforming-mars.herokuapp.com/cards`, whose card and `TileType`
definitions come from the upstream repository) and the printed rulebooks are the
authority for card identity and tile-type identity. Product labels, display
names, filenames, and UI copy are never authority for that identity.

- All card and tile reference data is stored in Supabase: `public.cards` and
  `public.terraforming_mars_tile_types`. The application reads reference data
  from Supabase, never from a hard-coded in-app catalog.
- The upstream Cards site is client-rendered with no stable JSON endpoint. The
  sync (`scripts/catalog/`) discovers `main.js`, follows the runtime webpack
  dependencies, and scans candidate chunks for the generated `JSON.parse('...')`
  card payload **without evaluating upstream JavaScript**, then validates the
  card-array shape and a minimum size before accepting it.
- Each exact raw upstream record is preserved in
  `cards.sync_metadata.upstream.rawManifest`. Normalized lookup fields are
  upserted while curated existing metadata and effect evidence are preserved.
- Records absent upstream are kept, not deleted. Card global-effect columns that
  are unproven remain null; an absent upstream effect is never coerced to zero.
- Identity-mismatch or duplicate rows are preserved as reversible audit rows
  (`is_catalog_visible = false`, `superseded_by_card_id` set), never hard-deleted.
- The Card Database and every catalog consumer read only
  `is_catalog_visible = true`, so the existing Cards page reflects the
  synchronized catalog automatically without a UI redesign.
- Synchronization runs as server/automation only (a scheduled workflow plus
  manual dispatch). The Supabase service-role credential it uses must never be
  exposed to browser code.
- Objectives, cards, tiles, or aliases that are not present in an authoritative
  source remain explicit catalog gaps. Do not invent IDs, aliases, cards,
  objectives, or tiles to fill them.

## Export-format governance

The only trusted import inputs are the complete exported game log and the
complete game result PDF (or a compatible end-game screenshot). TM Stats parses
supported fields from those sources and presents them for verification or
correction; it never fabricates a field the sources do not contain.

- Server parsing is authoritative before any persistence. Client parsing is a
  preview that the server re-derives and revalidates on the same scope.
- Supported tile-log formats are the current flat space IDs (`at NN`, and Moon
  spaces as `mNN`) and the historical grid form (`on row R position P`). Both
  are retained with their source line order; the Moon remains a distinct board
  layer.
- Unknown or future tile labels remain visible and reviewable
  (`isKnownTileType: false`) rather than being dropped or guessed.
- Raw evidence (the exported log text and the private screenshot/PDF), parser
  identity, source format, and provenance are preserved with the import.
- Language and format support is evidence-based: only formats actually parsed
  and tested are claimed as supported. See `DATA-CAPABILITIES.md`.

## Map and objective interpretation

Board geometry is the authoritative map signal; objectives are a separate,
explicitly configured input.

- The ordered placed/removed tile evidence — in particular placed ocean spaces
  compared against each map's reserved-ocean fingerprint — identifies the map.
- Randomized objectives are never used to infer a map, and a map is never
  inferred from randomized objectives. The objective configuration
  (`board_defined`, a `randomized_*` mode, or `unknown`) is an explicit input,
  not something derived from the detected map.
- Confirmed board-defined objectives may disambiguate identical or sparse ocean
  evidence (for example Terra Cimmeria versus Terra Cimmeria Nova, whose boards
  are identical).
- Hollandia is supported only when randomized objectives are confirmed.
  Hollandia together with board-defined objectives is a conflict.
- No unresolved evidence silently defaults to Tharsis. When the detector cannot
  determine the map, the importer's confirmed map is trusted.
- The import save gate rejects only a true detector conflict or a confident
  detected-map mismatch; an ambiguous or missing detection defers to the
  confirmed map. Objective setup must be confirmed (not `unknown`) before save.
- Board-defined objectives are validated against the confirmed map's milestone
  and award relationship set; randomized objectives are validated against the
  global canonical objective catalog. Server revalidation uses the same scope as
  the review UI.


## Venus Next and Colonies import evidence

Venus Next and Colonies are parser-derived import facts, not a restored generic
gameplay-expansion configuration workflow.

- Do not add Venus/Colonies setup checkboxes, tracker fields, action inputs,
  correction controls, `expansionCodes`, or another manual-entry requirement.
- Presence comes only from explicit exported options, exact upstream-supported
  Venus parameter movement, Colony setup/construction/trade/track messages, or
  trusted final Venus evidence. Related card metadata alone is never presence.
- Per the user's 2026-07-18 clarification, a complete exported log with no
  supported Venus or Colony mechanic events records that expansion as
  `confirmed_absent` (No). A log missing complete-game terminators remains
  `incomplete_evidence`; unsupported and conflicting evidence remain distinct.
- Preserve stable player IDs when attribution is explicit. World Government and
  other unattributed movement must not be assigned to a nearby player.
- Preserve event order, deterministic identity, generation when available,
  canonical colony identity, supported payment/TR effects, raw evidence,
  confidence, parser version, and provenance. Missing tracker values stay null;
  never interpolate a start/final value or turn missing final Venus scale into
  zero.
- Historical owner-confirmed absence uses the same production parser and a
  fixed cutoff. Missing logs use owner-confirmed-only provenance; retained logs
  use parser-verified provenance. Backfills insert only missing fact rows and
  must be zero-change on rerun.
- Applying the schema migration or historical rows to production remains a
  separately authorized operation.
<!-- END UPSTREAM-CATALOG-MAP-RULES -->
