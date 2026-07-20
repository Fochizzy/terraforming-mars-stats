# TM Stats Redesign Decisions

## Phase 4, Step 4.3 — upstream catalog authority, board-signal map detection, and shared Supabase catalog

Approved by the explicit Phase 4, Step 4.3 assignment on 2026-07-18. The user
expanded the step to cover automatic upstream catalog sync, imported-map
reconstruction from ordered tile evidence, randomized-objective independence,
and a shared Supabase catalog that keeps the existing Cards page current.

- **Upstream exports and rulebooks are the authority.** The open-source
  Terraforming Mars implementation's card and `TileType` definitions and the
  printed rulebooks define card and tile identity. All card and tile reference
  data is stored in Supabase (`public.cards`,
  `public.terraforming_mars_tile_types`); the app reads reference data from
  Supabase, never a hard-coded in-app catalog. The full contract is in
  `MASTER-RULES.md` (Upstream source-authority, Export-format governance, Map and
  objective interpretation).
- **Map signal precedence.** Board geometry — placed oceans compared against each
  map's reserved-ocean fingerprint, from the ordered tile evidence — identifies
  the map. Confirmed board-defined objectives may only disambiguate identical or
  sparse ocean evidence (e.g. Terra Cimmeria vs Terra Cimmeria Nova). No
  unresolved evidence defaults to Tharsis.
- **Randomized objectives never infer a map, and a map never infers randomized
  objectives.** The objective configuration (`board_defined`, a `randomized_*`
  mode, or `unknown`) is an explicit importer input. Hollandia is supported only
  when randomized objectives are confirmed; Hollandia with board-defined
  objectives is a conflict. The save gate rejects only a true detector conflict
  or a confident detected-map mismatch and otherwise trusts the confirmed map.
  Manual Entry always uses `board_defined`; imported drafts remain `unknown`
  until the importer confirms the objective setup.
- **Shared Supabase catalog and automatic Cards-page update.** The upstream sync
  preserves each exact raw manifest, upserts normalized fields while keeping
  curated metadata and effect evidence, never deletes rows absent upstream, and
  never coerces an absent upstream effect to zero. Identity-mismatch duplicates
  are preserved as reversible audit rows (`is_catalog_visible = false`,
  `superseded_by_card_id`), never hard-deleted. Every catalog consumer, including
  the Cards page, reads only `is_catalog_visible = true`, so the page reflects the
  synchronized catalog automatically. Automation runs daily plus manual dispatch;
  its Supabase service-role credential is server/automation-only and never
  exposed to browser code.
- **Verified live state (2026-07-18).** Migrations
  `20260718154209 sync_upstream_cards_and_tile_catalog` and
  `20260718154932 reconcile_upstream_card_identities` were applied to project
  `tm-stats`/`qjtwgrjjwnqafbvkkfex`. Snapshot
  `a63ac3f9-4725-49f5-a967-04899ad52c19` recorded 996 upstream cards and 45 tile
  types (42 special + 7 Moon). Retained card rows total 1,143; 1,090 are visible
  and 53 are superseded audit rows; there are 0 visible duplicate-name groups. A
  direct deletion of the 53 duplicates was rejected by the production safety
  reviewer; the reversible supersession model is the accepted safe state and
  deletion must not be retried.
- **Explicit catalog gaps.** Seven upstream expansion milestones (Hoverlord,
  Networker, Purifier, One Giant Step, Lunarchitect, Risktaker, Tunneler) are not
  in the local/live objective catalog and remain explicit gaps until a separately
  approved, source-backed objective sync inserts them. Do not invent IDs or
  aliases.
- **Claimable guest identity/privacy migration applied.** With explicit user
  confirmation on 2026-07-18, `claimable_guest_identity_privacy`
  (`supabase/migrations/20260718050924_...sql`) was applied to production after
  full read-only vetting. It adds the private `player_private_identities` store,
  normalizers, member-scoped RLS, `resolve_public_player_name`,
  `get_public_player_names`, `resolve_import_guest_identity`, and privacy-wrapped
  redefinitions of `analytics.player_game_results` and the final-action/OCR RPCs,
  with no identity backfill. This satisfies the separate-authorization
  requirement in the guest-identity/privacy contract (below) for this schema
  only; registration-time claiming and any production identity backfill remain
  out of scope.

## Phase 4, Step 4.2 — gameplay expansion tracking is removed; catalog metadata remains

Approved explicitly by the user on 2026-07-18 during the Phase 4, Step 4.2
assignment.

- Gameplay expansion selection and storage are retired product-wide. Group
  defaults, Manual Entry, imports, draft snapshots, finalized-game relations,
  analytics filters, URL state, eligibility rules, and interaction analytics no
  longer track which expansions a game used.
- Legacy draft snapshots remain reopenable: schema parsing discards their former
  `expansionCodes` key instead of treating it as current product state.
- Prelude identities remain optional, directly recordable game evidence. A
  missing Prelude row remains missing and is not interpreted as proof that the
  Prelude expansion was disabled.
- Intrinsic catalog metadata remains authoritative for catalog identity and
  browsing. This includes expansion metadata on cards, corporations, and
  Preludes, plus card-required expansion codes.
- Migration `20260718041532_remove_game_expansion_tracking.sql` replaces the
  interaction views with corporation–Prelude-only definitions, preserves the
  production multi-corporation read path, and drops `public.game_expansions`,
  `public.group_default_expansions`, and `public.expansions` without `CASCADE`.
  It was applied successfully to the linked production project and verified
  there. This database action does not authorize an application push or deploy.

## Phase 3, Step 3.4 — pre-existing middleware defect found, fixed via a separate task, and independently re-verified before closure

Approved by explicit user decision during the Phase 3, Step 3.4 assignment on
2026-07-17, after the assignment's own stop condition fired ("if correcting
the defect would require authentication architecture changes... stop before
performing that action and report"). Phase 3 is now complete; this entry
records the finding, the fix, and the process, since it materially affects
what future work can assume about the authentication middleware.

- Step 3.4's live-browser verification of authentication-required route
  states found that `middleware.ts` never executes in this repository, in
  either `next dev` or `next build`, confirmed three independent ways: an
  unconditional `NextResponse.redirect(...)` placed as the literal first line
  of the exported `middleware` function never fires on any request; a fully
  clean `.next/server/middleware-manifest.json` is `{"middleware": {},
  "sortedMiddleware": []}` in both dev and production build; and the
  production build's printed route table has no `ƒ Middleware` line. Stale
  build-directory mixing, Turbopack, `next.config.ts` exclusions, file
  encoding, and Next's sibling-lockfile workspace-root misdetection were each
  checked and ruled out.
- This is pre-existing, not a Phase 3 regression: `middleware.ts` and
  `src/lib/supabase/middleware.ts` both predate Step 3.1 (traces to commit
  `0d1176484`, "feat: add Supabase auth shell and protected routing"), and
  the failure reproduces identically on routes Phase 3 never touched
  (`/profile`, `/group`) as well as ones it added (`/cards`, `/games`,
  `/compare`). No prior Phase 3 step could have caught it — Steps 3.1-3.3
  each explicitly recorded "no live authenticated browser verification" as a
  known limitation, relying on jsdom/Vitest, which never runs Next's
  middleware pipeline.
- Practical effect: the `next=` return-path preservation Step 3.1 added to
  the middleware login redirect never executes. The only thing actually
  blocking unauthenticated access to protected `(app)` routes is a separate,
  duplicate, pre-existing cookie-presence check in `src/app/(app)/layout.tsx`
  — it does block access (no data exposure occurs), but its redirect carries
  no return-path query string, and the protected page's own Server Component
  body observably begins executing (throwing an uncaught
  `AuthSessionMissingError`) before that redirect fully takes effect.
- The user was asked whether to (a) document this as a known limitation and
  close Phase 3 now, (b) leave Phase 3 active until a fix lands, or (c)
  investigate further before deciding. The user chose further investigation
  first (performed and recorded above), then, once asked "if this isn't fixed
  now when will it be?", the defect was immediately spawned as its own
  trackable background task (`task_82ee1fc7`, "Diagnose why middleware.ts
  never executes") with the full diagnostic trail, and the user explicitly
  chose to **leave Phase 3 active** until it landed rather than close it with
  this criterion unmet.
- The user started that task in the same working directory as this Step 3.4
  session (not an isolated worktree). This briefly surfaced as an unexplained
  `middleware.ts` → `src/middleware.ts` file move mid-session before the
  task's commit landed. Per this repository's established concurrent-agent
  guidance, Step 3.4 paused all further repository edits, confirmed via `git
  status`/`git log` that no history was lost, and waited for explicit user
  confirmation that the concurrent session had finished before resuming.
- The spawned task diagnosed and fixed the root cause at commit
  `e4a444f2d5ef8a6904966c8667ef59acdc346c50` (`fix(auth): relocate
  middleware.ts to src/ so Next.js executes it`): Next.js only scans for
  `middleware.ts` in the immediate parent of the App Router directory
  (`src/app` → `src/`) once a `src/` layout is in use, never the repository
  root — a pure file relocation with no logic change. Step 3.4 independently
  re-verified this rather than trusting the task's own report: a fresh
  `.next/server/middleware-manifest.json` is populated in both `next dev` and
  `next build`; the production build's route table now prints `ƒ Middleware
  106 kB`; `next dev` logs show `Compiling /middleware` /
  `Compiled /middleware`; and live unauthenticated `curl` requests to
  `/cards`, `/profile`, and `/games?foo=bar` all now redirect to `/login`
  with the visited path correctly present in `next=` (URL-encoded), with no
  more uncaught `AuthSessionMissingError` server logs. The full suite was
  re-run after the fix: 124 test files / 614 tests passed, clean typecheck,
  lint at the same 4 pre-existing baseline warnings, 31/31 build pages.
- One harmless, pre-existing, unrelated imprecision was also observed during
  this re-verification: `GET /games?foo=bar` redirects to
  `/login?foo=bar&next=%2Fgames%3Ffoo%3Dbar` — the original page's query
  string is cloned onto the `/login` URL itself as well as being correctly
  embedded in `next=`, because `middleware.ts`'s `loginUrl =
  request.nextUrl.clone()` keeps the source URL's search params before
  `next` is added on top. The `next` value itself is fully correct and is
  the only param `/login`'s page reads (`normalizeNextPath`), so this does
  not fail the authentication-return-path closure criterion — it is a
  cosmetic duplicate query param, not a functional regression. Not fixed,
  per the assignment's "do not fix unrelated defects" / "do not broaden the
  task" instructions; left for a future pass if ever revisited.
- This decision does not reopen or regress Steps 3.1-3.3: their own
  navigation, route, and asset work was re-audited during Step 3.4 (both
  before and after the middleware fix) and remains fully intact and tested.
  Phase 3 (Steps 3.1 through 3.4) is now complete.
- Phase 4 remains not started; it requires a separate explicit assignment.

## Phase 3, Step 3.3 — brand/decorative site assets stay repository-tracked, not Supabase Storage

Approved by explicit user decision during the Phase 3, Step 3.3 assignment on
2026-07-17, in response to the assignment's own stop condition ("if no
suitable bucket exists, stop before creating one and report").

- The Step 3.3 assignment's default plan was to publish the shared header
  banner, the authentication Mars-landscape background, and the three
  leaderboard laurels through a new Supabase Storage `design-assets` bucket.
  Preflight found no such bucket exists, and none of the seven existing public
  buckets (`tm-card-full`, `tm-card-thumbs`, `tm-tag-icons`, `tm-map-images`,
  `tm-corporation-logos`, `tm-score-icons`, plus the private
  `tm-import-evidence`) are a fit for generic site-brand/decorative imagery —
  every one of them is scoped to a specific gameplay-data asset family.
- More importantly, this asset category has an existing, working, different
  precedent: the header banner and the placeholder auth background were
  already integrated as repository-tracked files (a bundled Next.js static
  import for the banner, `public/*` static paths for backgrounds and laurels),
  never Supabase Storage. Moving the banner specifically to Storage would also
  have been a regression — as a bundled import it already gets Next.js's
  built-in image optimizer for free; as a Storage-hosted URL it would need
  `unoptimized` rendering (no remote-image allowlist exists in
  `next.config.ts`) for no offsetting benefit.
- Given this, the user chose to keep the existing repository-file convention:
  the reprocessed laurels and the auth-page background derivative are
  committed `public/*` files, resolved through the existing typed
  `resolveStaticSiteAsset` registry (`src/lib/assets/static-assets.ts`), with
  no Supabase Storage bucket created and no Storage upload performed.
- This decision is scoped to brand/decorative site chrome (banners,
  page backgrounds, static rank emblems). It does not revisit or change the
  Storage-backed convention already established for gameplay-data asset
  families (corporation logos, card images, tag icons, map images, score
  icons), which remain unaffected.

## Phase 3, Step 3.2 — responsive website navigation supersedes Step 3.1's mobile pattern

Approved by the explicit Phase 3, Step 3.2 assignment on 2026-07-17. This entry
supersedes the Step 3.1 "Mobile More" decision recorded immediately below it.

- TM Stats is a responsive website, not a native mobile application. The
  explicit Step 3.2 assignment stated this directly and takes precedence over
  Step 3.1's already-committed `BottomNav` (a fixed `sticky bottom-0` bar) and
  its "mobile-primary"/"mobile-more" destination split, which showed a
  different, reduced destination set on narrow screens than on desktop.
- There is now exactly one navigation architecture at every viewport width.
  The primary destination row (all eight approved primary destinations,
  including the prominent Log a Game pill) renders identically from 390px
  through desktop widths; it scrolls horizontally at narrow widths using the
  same `overflow-x: auto` behavior it already had. No destination is removed
  from or added to this row based on viewport.
- Only the secondary utility destinations (Games, Cards, Glossary, Group
  Settings) and Logout collapse into a single semantic "Menu" overflow panel
  below the desktop breakpoint. This is the one narrow-screen concession
  explicitly permitted by the assignment ("a conventional responsive website
  menu or overflow panel when required by the approved design"), used only
  because twelve links plus Logout do not fit in a narrow header. It is not a
  reduced destination set, a native drawer, or a second information
  architecture: every utility destination is also present in the identical
  desktop utility bar, just always visible there instead of behind a trigger.
- The overflow panel keeps Step 3.1's native `<dialog>` modality (background
  inertness, initial focus on Close, Escape-as-cancel, trigger focus
  restoration, close-on-route-change) because that mechanism itself was sound;
  only its content and framing changed from a mobile-only "More" subset to the
  complete, always-available utility link set, and its trigger/label changed
  from "More" to "Menu" to reflect that it is a website overflow menu, not an
  app navigation drawer.
- The `NavigationSurface` type is now `'primary' | 'utility'` (no
  `'desktop-primary'`, `'desktop-utility'`, `'mobile-primary'`, or
  `'mobile-more'`), and `NavigationItem.mobileLabel` was removed — every
  destination has exactly one label used at every width.
- The removed `BottomNav` component and its dead `tm-bottom-nav`/
  `tm-bottom-nav__link` global CSS classes are deleted rather than retained
  disabled, since no consumer of Step 3.1's mobile pattern remains.
- Route-level page titles and descriptions are now sourced from one
  centralized `src/lib/navigation/route-metadata.ts` registry (validated for
  uniqueness) instead of being duplicated as inline JSX string literals per
  shell page; existing implemented pages (Profile, Log a Game, Import, Games,
  Cards, Glossary, Group, Players, Group Settings, legacy Insights) also gained
  a document `<title>`/description from this registry without any change to
  their rendered headings or content.

## Phase 3 navigation and route contract

Approved by the explicit Phase 3, Step 3.1 assignment on 2026-07-17. Its
"mobile primary"/"mobile More" destination split and native dialog framing are
superseded by the Step 3.2 entry above; the route contract, compatibility
handling, and active-matching rules below remain in force unchanged:

- Canonical primary routes are `/log-game`, `/profile`, `/insights/global`,
  `/insights/individual`, `/insights/group`, `/compare`, `/improvement`, and
  `/leaderboard`. Their shells do not authorize analytics implementation.
- `/games` is canonical for the existing Saved Games implementation;
  `/saved-games` remains a compatible alias until a later approved Games phase
  can retire it safely.
- `/insights` remains the working legacy analytics owner until later destination
  work proves parity. `scope=global`, `scope=individual`, `scope=group`, and
  `scope=compare` are compatibility aliases only and redirect to their canonical
  routes while preserving other query values. `#global-statistics` is bridged in
  the browser because fragments do not reach the server.
- A shared typed source is the sole navigation definition across primary and
  utility surfaces at every viewport width (Step 3.2 removed the separate
  desktop/mobile surface split described here at Step 3.1). Item identity,
  canonical href, visibility, active matching, group requirement, ordering,
  and surface placement are data, not duplicated markup.
- Active matching is canonical path identity with exact or segment-aware prefix
  behavior. Query strings and fragments do not affect it; the most specific match
  wins. Display labels are never route identity.
- All `(app)` routes remain authenticated. Group-required navigation is filtered
  by the server-rendered active-group fact; client filtering is presentation only
  and cannot authorize a route. Glossary remains authenticated but does not
  require an active group.
- The narrow-screen "Menu" overflow (Step 3.2 rename of "Mobile More") uses the
  native dialog modality for background inertness, intentional initial focus,
  Escape close, trigger focus restoration, and route-change close.
- New destination shells are explicitly unavailable/deferred state, fetch no
  analytics data, and contain no fake controls or data. Existing working routes
  remain in place rather than receiving placeholder replacements.

## Approved product structure

The application will have eight primary pages:

1. Log a Game
2. My Profile
3. Global Insights
4. Individual Insights
5. Group Insights
6. Compare
7. Improvement
8. Leaderboard

## Production graphics

Existing Supabase-hosted tag icons, point-source graphics, and corporation
logos must be integrated throughout the application.

## Temporal game data

The game log supports:

- Cards bought by player and generation
- Terraforming Rating by player and generation

Explicit zero values must remain distinct from missing observations.

## Win point differential

Winner margin is measured against the highest non-winning final score.

Tied first-place games require explicit handling and must not be silently
treated as ordinary positive-margin wins.

## Agent workflow

- One phase or substep at a time
- Clean commit before switching agents
- State and handoff documentation required
- Incoming agent verifies the previous commit before editing

## Glossary and Card Database preservation

Approved on 2026-07-17 by the explicitly assigned Glossary and Card Database
Preservation and Cross-Linking task:

- Historical commit `b13276d88` is the compatibility baseline for Glossary
  identity and behavior: `/glossary`, category IDs, entry slugs, term names,
  aliases, fragment destinations, controlled matching, and destination focus.
- Current governing redesign contracts control all definitions, formulas,
  eligibility, coverage, availability, and missing-data semantics. Historical
  wording is not authority for an obsolete metric claim.
- `/cards` is the canonical authenticated Card Database and must use the full
  repository-backed Card Lookup, not a promo-only substitute.
- Promo browsing remains a specialized reference view only; it does not define
  the Card Database.
- Historical implementation is adapted to current routing, server repository,
  authentication, group context, and accessibility patterns rather than being
  restored or cherry-picked wholesale.

## Card acquisition and conversion metrics

### Cards purchased

The number of cards a player paid to add to their hand.

Cards purchased must remain distinct from:

- Cards seen
- Cards drawn
- Cards received
- Cards played
- Cards discarded
- Cards retained at game end

### Cards seen

The number of distinct card opportunities genuinely presented to a player.

Cards seen may include separately recorded:

- Starting-card offers
- Research-phase offers
- Draft cards received
- Cards drawn through effects
- Cards inspected through effects

A card must not be counted as seen merely because it was purchased.

The same physical or logical card opportunity must not be counted more than
once unless the underlying game event genuinely presents it again.

### Purchase conversion

Purchase Conversion = Cards Purchased / Cards Seen

This metric is unavailable when Cards Seen is missing or zero.

Missing Cards Seen data must not be treated as zero.

### Hand acquisitions

Total Hand Acquisitions means cards entering the player's hand from all
recorded sources.

This may include:

- Purchased cards
- Cards drawn through effects
- Cards received through other game effects

### Purchased hand share

Purchased Hand Share =
Cards Purchased / Total Hand Acquisitions

### Hand utilization

Hand Utilization =
Cards Played / Total Hand Acquisitions

### End-hand carryover

End-Hand Carryover =
Cards Remaining at Game End / Total Hand Acquisitions

### Aggregation rules

For multi-game summaries, expose both:

- Ratio of totals
- Median per-game rate

Do not silently average percentages.

### Interpretation rules

Relationships between card acquisition behavior and outcomes are
observational associations.

Do not describe cards purchased, cards seen, or purchase conversion as
causing wins.

Relevant context includes:

- Number of generations
- Player count
- Drafting
- Corporation
- Prelude
- Player strength
- Opponent strength

### Repeated card exposure

Cards Seen counts card opportunities, not unique card names.

Seeing the same named card in two separate legitimate offers, draws, or
inspection events counts as two card opportunities.

Seeing a card in one offer and then purchasing that same offered card counts
as one opportunity, not two.

A card must not be counted again merely because it remains visible, remains
in hand, or appears later in a game summary.

## Phase 2 analytics foundation assignment

Approved on 2026-07-17 by the explicit user assignment for Phase 2, Step 2.0.

Phase 2 is titled **Analytics Foundation**. Its approved purpose is analytics
scope, filters, capability modeling, and shared analytics state and data rules.
It is divided into these separately assigned substeps:

1. Step 2.0 — Analytics Foundation Specification and Acceptance Criteria
2. Step 2.1 — Analytics Scope and Capability Model
3. Step 2.2 — Shared Filter and URL-State Contracts
4. Step 2.3 — Metric, Sample, Coverage, and Eligibility Contracts
5. Step 2.4 — Canonical Analytics Definitions and Calculation Utilities
6. Step 2.5 — Analytics Repository and Query Contracts
7. Step 2.6 — Analytics Foundation Integration Validation

Completing one substep does not authorize the next substep.

## Phase 2 value and capability policy

- Explicit zero is a real observed value.
- Zero, missing, unavailable, and partial/lower-bound values remain distinct.
- An unavailable metric includes a reason.
- A display placeholder is never an underlying numeric value.
- Query error, empty eligible data, unsupported capability, and incomplete
  evidence remain distinct.
- Phase 2 capability contracts must represent supported, partially supported,
  unavailable, requires-query-work, requires-view, requires-new-fields, and
  insufficient-evidence states, with typed reasons and source/coverage metadata.
- A capability state and an evaluated metric-value state are separate contracts.

## Phase 2 filter and URL-state policy

Phase 2 must define typed shared filters, scope compatibility, normalization,
defaults, canonical parameter names, deterministic serialization/restoration,
invalid and stale value behavior, explicit compatibility aliases, reset
behavior, and filter-versus-selection synchronization.

The route owns the analytics scope; Phase 2 does not adopt a shared `scope`
query parameter. URL-provided identities never authorize access. Multi-value
filters use deterministic repeated parameters, and serialization emits canonical
names and ordering.

Step 2.2 implements this policy with these durable decisions:

- sample filters and durable comparison/highlight/focus selection are separate
  state objects; route/navigation and hover/focus/open-menu state remain outside
  URL-addressable analytics state;
- canonical filter parameters are `player`, `group`, `from`, `to`, `map`,
  `playerCount`, `generationCount`, `gameLength`, `corporation`,
  `prelude`, `corporationPrelude`, `card`, `tag`, `scoreSource`, `style`,
  `status`, and `minSample`; durable selection uses `entity`, `metric`, `point`,
  `series`, and `detail`;
- the former `expansion` filter is retired; stale `expansion` query parameters
  are removed during analytics URL canonicalization rather than preserved as
  unrelated route state;
- corporation/Prelude pairs use repeated `corporationPrelude` values encoded as
  canonical corporation UUID plus canonical Prelude UUID; display names are
  never identity;
- game range and imported/data-source filters remain deferred with no canonical
  parameter, while game-length remains typed but unavailable until its facts and
  category definition are approved;
- `finalized` is the omitted aggregate-status default, and `minSample=0` is an
  explicit value that must survive canonicalization;
- malformed, unknown, stale, authorization-rejected, unresolved, loading, and
  query-error identity states remain typed; unresolved/loading/query-error
  values may remain URL-restorable but are withheld from applicable query state;
- aliases are route-provided compatibility declarations only, canonical input
  wins an alias conflict, and serialization emits canonical names only; and
- reset removes registered analytics fields while preserving unrelated route
  state, and serialization strips authorization/token and internal error fields.

The complete contract and scope matrix are documented in
`SHARED-FILTER-URL-STATE-CONTRACTS.md`.

## Phase 2 sample, coverage, and formula policy

- There is no universal low-sample threshold.
- Thresholds are metric-specific and explicitly approved, or caller-provided.
- Absence of a threshold does not mean a sample passed a threshold.
- Low-sample categories remain visible unless an explicit filter excludes them.
- Denominators, eligible observations, coverage, and exclusion reasons are
  visible when they affect interpretation.
- Step 2.3 implements sample contracts as candidate, eligible, included, and
  excluded counts, with structured exclusion reasons. Comparison/highlight/focus
  selection is context only and does not narrow a sample unless represented as a
  real Step 2.2 filter.
- Step 2.3 implements minimum-sample states as no-threshold, met, not-met,
  cannot-evaluate, and insufficient-evidence. A missing threshold is never
  interpreted as a passed threshold.
- Step 2.3 implements coverage states as measured complete, partial, none,
  no-eligible-records, invalid, plus unknown and capability-unavailable
  evaluated coverage. Available/unavailable source counts must reconcile when
  provided.
- Step 2.3 implements eligibility states as eligible, ineligible,
  indeterminate, unavailable, and not-applicable, with structured reasons for
  every non-eligible state.
- Step 2.3 implements metric result states as loading, load-error,
  capability-unavailable, insufficient-evidence, and ready. Ready results carry
  the Phase 1 value states without coercing observed zero, missing,
  unavailable, partial, or error states into each other.
- Metric identity uses stable IDs/codes/versions. Display metadata is not
  identity, and analytics interpretation remains observational.
- Calculations are centralized, versioned, documented, and directly tested.
- React presentation components do not define business formulas.
- Step 2.0 approves no new metric formula.
- Step 2.3 approves no new metric formula, repository query, schema, migration,
  or production page integration.
- Step 2.4 may implement only formulas already approved here or added by a
  separate explicit approval.
- Ratio of totals and median per-game rate remain separate labeled results where
  supported; percentages are not silently averaged.
- Tie, missing operand, zero denominator, partial data, exclusions, and stable
  tie-breaking are explicit parts of every applicable formula contract.

## Phase 2 canonical calculation versioning

- Step 2.4 registers the approved calculation meanings at formula version `1`
  with stable metric IDs and codes; display copy remains outside identity.
- A semantic formula change requires a new version. It must not silently
  reinterpret an existing metric ID/version pair.
- The approved card-acquisition rate definitions use exact raw values and retain
  sample, eligibility, coverage, and denominator context. Formatting and
  rounding are presentation responsibilities, not calculation behavior.
- The sole-winner Win Point Differential implementation is winner score minus
  highest non-winning score. Tied-first remains indeterminate with no numeric
  result until the unresolved policy receives separate approval.

## Phase 2 repository and query policy

- Step 2.5 establishes a client-safe repository contract separate from the
  server Supabase implementation, raw persistence DTOs, normalized analytics
  records, calculation utilities, and presentation.
- Repository operations use stable operation IDs and explicitly declare scope,
  supported filters, capabilities, authorization, pagination, and ordering.
- Step 2.2 sample filters remain distinct from comparison, highlight, and focus
  selection; selection context never silently changes a repository sample.
- Repository results distinguish ready, successful empty, partial,
  capability-unavailable, and error states. Raw persistence errors remain
  server diagnostics and never enter public result contracts.
- The first approved source slice is finalized game and player results for an
  authenticated group member or an RLS-readable game. Global scope is not
  implemented by this slice and therefore cannot bypass the existing global
  analytics opt-in boundary.
- Group lists use bounded offset pages ordered by played date, creation time,
  and stable game ID. Player results and import provenance are loaded in
  page-wide batches, never per game.
- Normalized records preserve database identity, zero, null/missing fields,
  native/imported provenance, finalized status, and tied-first winner flags.
- Returned-page coverage is not a metric sample size. Consumers remain
  responsible for Step 2.3 candidate, eligible, included, excluded,
  denominator, and minimum-sample construction for the exact metric.
- The version 1 sole-winner Win Point Differential is supported for game scope
  through the normalized source adapter and Step 2.4 utility. Tied-first remains
  indeterminate. Card-acquisition and per-generation facts remain unavailable
  when their recorded sources do not exist.
- Existing production analytics consumers and the broad legacy
  `analytics-repo.ts` are deferred migrations; Step 2.5 does not silently
  reinterpret or replace them.

The full boundary is documented in
`ANALYTICS-REPOSITORY-QUERY-CONTRACTS.md`.

## Phase 2 schema, page, and completion boundaries

- No database schema, migration, view, RPC, backfill, Supabase data, or Storage
  work is authorized without a separate explicit assignment and approval gate.
- Phase 2 does not migrate production destination pages, route ownership,
  navigation, middleware, authentication, or group switching.
- Unsupported historical facts remain unavailable and are not fabricated from
  final totals or incomplete event streams.
- Phase 3 may begin only after Steps 2.0 through 2.6 meet the Phase 2 acceptance
  criteria and Phase 3 receives explicit approval.

## Phase 2 questions that remain undecided

Step 2.0 does not decide:

- the tied-first numeric or exclusion result for canonical win point
  differential;
- the baseline for overall point differential;
- leaderboard ranking, eligibility, and minimum-history methodology;
- opponent/player-strength model, population, time window, uncertainty, or
  no-future-leakage rules;
- metric-specific sample and coverage thresholds;
- data-derived range construction and versioning;
- whether current corporation weighting, expected-score, efficiency, style,
  award-ROI, or final-action calculations become canonical;
- the accepted source and security contract for final terraforming actions;
- the event-versus-aggregate model, identity, reconciliation, provenance, and
  exhaustive coverage needed for card acquisition and Cards Seen;
- authoritative per-generation/final TR, duration, production/engine, and board
  coordinate capture contracts;
- which live-only database, RPC, or Storage objects become tracked production
  contracts; or
- a migration or backfill for any of the above.

These questions are blockers for the specific later substeps that require them,
not permission to resolve them by copying current UI or SQL behavior.

## Phase 2 Merger always-available Prelude remediation

Approved by the explicit Phase 2 Validation Remediation and Closure assignment
on 2026-07-17.

- `group_settings.default_guaranteed_merger_offer` is the owner-managed default
  for future games. It defaults to enabled for the established house rule, but
  only a saved game snapshot is authoritative for analytics.
- `games.guaranteed_merger_offer` is nullable. `true` and `false` are recorded
  facts; null is unknown/unrecorded and must never display or aggregate as Off.
  `games.guaranteed_merger_offer_source` records group default, editor override,
  historical policy, import metadata, or unknown provenance.
- New games copy the current group default once. Editors may override the saved
  snapshot for an exceptional game. Changing a group default cannot reinterpret
  a saved game.
- The historical always-on policy is an explicit, group-scoped, idempotent
  update of only null/null snapshots to `true` with `historical_policy`
  provenance. It is prepared but not applied without a separate production
  authorization and an owner-reviewed target group UUID.
- `game_player_preludes` remains the manual-selection source. A resolved,
  high-confidence imported `card_played` event may corroborate selection, but
  no Merger event never establishes that the variant was off or that a player
  rejected it.
- Imported source-card aliases use stable catalog source identities and one
  `prelude_card_aliases` relationship to canonical `preludes.code = merger`.
  No display-name identity or automatic final-selection correction is allowed.
- Merger reports distinguish usage rate, availability rate, and selection rate
  given availability. Guaranteed-variant exposure is segmented from random and
  unknown sources; non-Merger random offers remain unknown unless independently
  captured.

## Corporation logo identification

Approved corporation logos contain the corporation name as part of the
artwork.

When an approved corporation logo is rendered at a size where its embedded
name remains clearly legible, the interface does not need to repeat the
corporation name as adjacent visible text.

Requirements:

- Resolve corporation logos using the canonical corporation ID or canonical
  slug.
- An informative standalone logo must use the corporation name as its alt
  text.
- A logo displayed beside a visible corporation name is decorative and must
  use empty alt text.
- Interactive logo-only controls must have an accessible name containing the
  corporation name.
- Missing or failed logos must fall back to the corporation name or an
  approved textual abbreviation.
- Keep a visible text label in compact contexts where the name inside the logo
  is too small to read reliably.
- Do not rely on embedded image text for screen-reader accessibility.
- Do not repeat the corporation name visually when the approved logo already
  displays it clearly and legibly.

## Corporation logo asset replacement and presentation

Approved on 2026-07-17 as a separately authorized production task executed
between Phase 2 Step 2.5 and Step 2.6 (it did not begin Step 2.6).

- Corporation logos are stored as **uniform 800×800 tiles** on the
  `tm-corporation-logos` bucket: content trimmed, scaled to fit with a
  consistent margin, centered, and flattened onto a solid background.
- Each logo is placed on **white `#ffffff`**, **black `#000000`**, or **orange
  `#f06a32`** (the app `--tm-tr` accent), chosen per logo for readability against
  the app surface `#141a22`. Backgrounds prevent dark-on-dark and light-on-light
  wash-out; the orange is a real theme token, not an arbitrary color.
- Objects are **content-addressed** (`corporation-logo-<sha256>.png`) so refreshed
  art busts the bucket's one-year cache without overwriting prior objects.
- Stable identity is `corporations.id` + `code`; a source filename, display name,
  prior `logo_path`, object name, or URL never selects a corporation. Near-miss
  and replacement art are matched to a corporation only by verified identity
  (embedded wordmark review plus explicit user adjudication), never by filename.
- The four cross-edition logos that share one object (Athena, Eris, Kuiper
  Cooperative, Tycho Magnetics) **remain shared** — both corporation records in
  each pair point to one tile.
- Prior objects are retained (no deletion) so `logo_path` can be reverted to fully
  roll back. `community:marabout-shiritori`'s previously-missing object is now
  resolved.
- This task replaced only `logo_path` and Storage objects in
  `tm-corporation-logos`; no corporation identity field, schema, RLS policy,
  bucket configuration, or unrelated asset changed, and nothing was deployed.

## Tag and standard score icon production replacement

Approved on 2026-07-17 as a separately authorized production Storage task. It
does not authorize Phase 4, Step 4.2 or any broader asset remapping.

- Replace only the 19 supplied canonical root objects in `tm-tag-icons` and the
  10 supplied standard root objects in `tm-score-icons`; do not modify
  `earth.webp`, `science.webp`, any `axis/` object, or the legacy UUID score
  icon.
- Preserve established object paths so existing application URLs keep working.
  The source file `galatic.png` maps deliberately to canonical
  `galactic.webp`, and `terraforming_rating.png` maps to
  `Terraform_Rating.png`.
- Convert the supplied tag PNGs to **lossless WebP** without resizing, preserving
  the bucket's WebP contract and one-hour cache behavior. Upload the supplied
  standard score PNGs byte-for-byte and preserve their no-cache behavior.
- Back up every current target before upsert, verify every replacement by
  downloading it and matching SHA-256, and automatically restore already
  changed objects if any upload or verification fails.
- This approval changes image content only. It does not change stable tag or
  score-source identity, resolver paths, database vocabulary, bucket settings,
  RLS, schema, application code, or deployment state.
- A same-day explicit follow-up replaced only the revised
  `tm-score-icons/Other_Card.png`. The canonical path, PNG MIME type, no-cache
  behavior, identity policy, and exclusion of axis/legacy variants remain
  unchanged.
- A second same-day explicit follow-up replaced only revised `jovian.webp`,
  `microbe.webp`, `plant.webp`, and `space.webp` in `tm-tag-icons`. Their
  canonical paths, lossless WebP/no-resize transformation, one-hour cache,
  tag-code identity, and exclusion of every other tag object remain unchanged.

## Phase 4 Log a Game unified entry foundation

Approved on 2026-07-17 by the explicit Phase 4, Step 4.1 assignment.

- **Log a Game** is one product area with two retained, direct-linkable entry
  methods: **Manual Entry** at `/log-game` and **Import Game** at
  `/log-game/import`. Step 4.1 does not merge their forms, add a parallel
  route, or move Saved Games ownership away from `/games`.
- Both entry methods use one shared selector that exposes current group,
  workflow status, active method in text and `aria-current`, and the existing
  Saved Games exit. A resumed manual draft keeps its `gameId` URL.
- Dirty method changes and the selector's Saved Games exit require explicit
  confirmation; hard unload receives `beforeunload` protection. Global app
  navigation and the server-rendered group switcher remain outside this
  Step 4.1 guard and are explicitly deferred.
- The canonical manual section labels are **Setup**, **Players &
  Corporations**, **Milestones & Awards**, **Final Scores**, **Styles, Cards &
  Details**, and **Review**. Centralizing these labels does not convert the
  single-page form into a routed wizard.
- A malformed, missing, finalized, removed, cross-group, or RLS-hidden
  `gameId` resolves to one access-safe not-found response rather than silently
  opening a new blank game. The response deliberately does not disclose which
  underlying condition occurred.
- Existing explicit-save behavior is authoritative. The historical revision
  note `Draft autosave` does not mean the UI autosaves, and Step 4.1 does not
  add timer-, blur-, or field-change persistence.
- Step 4.1 preserves all draft, import, finalization, Merger, score, Prelude,
  milestone, award, style, and key-card semantics. It approves no schema,
  migration, Storage-policy, RLS, formula, dependency, production, or
  deployment change.
- Card-acquisition counts remain unsupported by the current workflow.
  Key-card selections, card-point scoring, and incomplete import events must
  not be substituted for purchased, seen, drawn, acquired, played, or
  remaining-card coverage.
- The pre-existing Prelude/Merger discrepancy is documented rather than
  changed: the UI exposes three Prelude slots and finalization requires at
  least one when Prelude is enabled; it does not enforce a separately stated
  exact-two/Merger-slot rule. Any semantic correction requires a later
  explicit Phase 4 assignment.

<!-- BEGIN GUEST-IDENTITY-PRIVACY-DECISION -->

## 2026-07-17 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Guest identity, account claim, and public-name privacy

### Decision

Unmatched players may be stored as unlinked guest player identities using
either:

- username, or
- first name and last name

A later account claim links the existing player identity rather than creating a
replacement player and moving history.

### Public identity

After claim, the registered username is the player's public identity.

First name, last name, full name, normalized personal-name values, and private
personal-name aliases are private.

They must not appear on public pages or in public/client payloads.

A missing username uses a neutral privacy-safe fallback and must never fall back
to a private personal name.

### Ownership

Phase 4 owns guest creation, guest reuse, imported evidence, and future
claimability.

Registration and onboarding own candidate lookup, explicit confirmation,
account linking, group membership effects, active-group behavior, and
post-registration continuation.

### Data model

Username matching and personal-name matching remain separate.

A schema change may be required to preserve structured claim information and
public/private data separation.

No schema or migration work is authorized by this decision alone.

<!-- END GUEST-IDENTITY-PRIVACY-DECISION -->

## 2026-07-18 ? Automatic Venus Next and Colonies import facts

### Decision

Phase 4 Step 4.3B derives Venus Next and Colonies from the complete exported log
and other trusted import evidence. No Venus/Colonies field is added to Manual
Entry or Import Review, and the retired generic gameplay-expansion configuration
workflow remains retired.

Per the user's explicit clarification, a complete exported log with no supported
Venus or Colony mechanic events records the corresponding expansion as
`confirmed_absent` (No). A partial log still reports `incomplete_evidence`;
unsupported and conflicting evidence never become absence. Presence requires an
explicit option, trusted final Venus value, or an exact upstream-supported Venus
or Colony mechanic message. Related card metadata alone is insufficient.

### Canonical persistence

- `public.game_expansion_facts` is the one-row-per-game state/provenance/coverage
  record. It preserves null final Venus scale separately from explicit zero.
- `public.game_log_events` remains the canonical event table and gains stable
  player ID, canonical colony ID, deterministic event identity, parameter
  movement, source entity, parser version, and provenance columns.
- Parser identity is `terraforming-mars-venus-colonies-v1`.
- World Government Venus movement is explicitly unattributed and has no TR
  effect assigned to a player. Missing before/after/final tracker values remain
  null.
- RLS follows `can_read_game` / `can_edit_game`; the new exposed table grants no
  anonymous access.

### Historical policy and production gate

The fixed historical cutoff is `2026-07-18T00:00:00.000Z`. The owner confirms
that every earlier TM Stats game used neither expansion. Retained logs run through
the same production parser and use
`historical_parser_verified_owner_confirmed_absent`; a missing retained log uses
`historical_owner_confirmed_absent`. The backfill inserts only games without an
existing fact row and must plan zero changes on rerun.

The production preflight found 42/42 retained complete logs, 42 parser-confirmed
absences for each expansion, and zero unexpected, incomplete, unsupported,
conflicting, duplicate, exception, or unresolved results. The separately
authorized schema migration was applied under ledger entry
`20260718200536_add_venus_colonies_import_facts`; its insert-only backfill created
42 facts, no historical expansion events, no fingerprinted unrelated-data change,
and planned zero writes on the second pass.

## Phase 4, Step 4.3 — closure-audit remediation (F-01–F-10), 2026-07-19

Approved as a bounded remediation of the independent Step 4.3 closure audit.
Repository-complete at commits `cfafd823`..`6e6e1859`. The four gated
production mutation groups were subsequently **applied and verified on
2026-07-19** under the per-mutation protocol (user approved "apply all
four"); the ledger records them as `20260719191911`/`20260719192054`/
`20260719192148` plus the 1,500-row placement backfill, with the F-01
completion and audit-view fixes as `20260719203944`/`20260719204250`/
`20260719205420` (status language reconciled 2026-07-20 per audit B3/F-10 —
this entry previously still described that work as "prepared and gated").

- **Guest-identity privacy is a server boundary, not a display concern (F-01).**
  Private identity material lives in the `private` schema with no
  anon/authenticated access; matching happens only inside guarded SECURITY
  DEFINER functions. The browser receives public-only candidate fields. Every
  unlinked player — including username guests — resolves to a neutral public
  label; personal names are never a public fallback. This is a deliberate
  privacy trade-off (the roster dropdown cannot distinguish guests by name;
  guests are resolved by entering a username/personal name for server-side
  matching). Original import evidence is retained only behind
  `can_read_game`/`can_edit_game`.
- **One confidence contract (F-03).** `high/medium/low/reviewed` is defined once
  (`game-log-event-contract.ts`) and enforced by a single database constraint;
  `reviewed` is a first-class value, not collapsed to `low`.
- **Placements are durable, typed, and player-attributed (F-02).** Board
  placements persist canonical map, action, board, format, original grid
  row/position, upstream space id, source line, deterministic identity,
  provenance, and `ownership_state`. The acting player is recorded as
  `player_id` when resolvable and is never treated as tile ownership; unresolved
  actors and owners stay null.
- **Canonical event identifiers are constrained; the replacement RPC is
  authorized (F-07).** `replace_game_log_events` is SECURITY DEFINER with
  `can_edit_game` and validates player/game-player/owner/colony/map/event-type/
  event-identity. `player_import_aliases` is not directly readable by
  authenticated clients.
- **Venus option evidence is trusted from the result PDF; final Venus scale is
  never interpolated (F-04).** A Venus contribution column in the PDF global
  parameters is trusted Venus option evidence wired into the production action.
  Colonies presence is never inferred from missing PDF data, and the final Venus
  scale stays null unless a trusted value exists.
- **Off-reserve oceans are evidence-based, never a guessed allowance (F-05).**
  Only the four source-backed exception cards (Artificial Lake 116, Small Comet
  Pf37, Central Reservoir UP09, Subterranean Sea U015) qualify; each is linked to
  the first subsequent same-actor ocean, and only those verified spaces are
  excused from the reserved-ocean fingerprint. Ambiguous evidence stays
  ambiguous.
- **Objective aliases are exact, verified, and reversible (F-06).** Seven
  catalog aliases with deterministic row ids, canonical-name preconditions, a
  collision guard, and a seven-row postcondition. No fuzzy matching; rollback
  deletes only those seven rows.
- **Migrations are executable-tested without Docker (F-08/F-09 support).** A
  disposable native PostgreSQL 18 cluster replays the full history and asserts
  constraint, privacy, seed, idempotency, and rollback behavior
  (`supabase/tests/executable/`). Migration-text assertions are not a substitute.
- **Real fixtures are sanitized; missing evidence is not fabricated (F-09).**
  Real flat and grid exports are committed with player names neutralized. No
  real Venus/Colonies-positive export exists locally, so none is invented; the
  pinned upstream fragment is the authoritative positive corpus.
- **Production mutation stays gated (F-08/F-10).** The privacy, event-contract,
  and alias migrations and the 1,500-row placement backfill were applied only
  under the per-mutation protocol (exact SQL, tables, expected rows, rollback,
  re-run preflight, stop conditions) — executed and verified 2026-07-19.
  Step 4.3 is closed only after a fresh independent read-only audit passes.

## Phase 4, Step 4.3 — live-site v2 compatibility and the confidence/review-state split, 2026-07-19

Approved as the bounded continuation of the Step 4.3 remediation, integrating
the prepared live-site data-capture contract.

- **The live-site v2 deployment is a verified production fact, not an
  assumption.** Production carries ledger migration `20260719132042
  data_capture_hardening_v2`, the `data-capture-hardening-v2` marker (cutoff
  2026-07-19 13:20:42Z, parser `tm-data-capture-v2` deployed 13:24:14Z), and
  all eight capture objects with seeded catalogs and, at verification time,
  zero capture rows. Documentation alone is never treated as proof of a
  production change.
- **The redesign consumes live-capture v2 through a versioned read adapter at
  the repository boundary.** Of direct reads, compatibility views, data
  migration, and a versioned adapter, the adapter is the smallest safe
  approach: no data duplication, no new production objects, and one unit that
  knows the contract version. `readCanonicalGameCapture` presents one canonical
  model from v2 rows when a supported parser run exists and from the legacy
  import shape otherwise; a missing v2 run is never parser failure and never
  confirmed absence; unknown parser versions are reported as
  `unsupported_contract_version` and left untouched. The redesign does not
  write `game_capture_*` rows — a second producer with a different event
  vocabulary would recreate the two-incompatible-event-systems problem. The
  authoritative mapping is
  `docs/redesign/reference/LIVE-SITE-DATA-CAPTURE-V2-COMPATIBILITY.md`.
- **Confidence and review state are separate contracts (supersedes the F-03
  four-value confidence).** `confidence_level` is strictly
  `high`/`medium`/`low` evidence strength; the review lifecycle lives in
  `review_state` (`not_required`/`needs_review`/`reviewed`/`rejected`).
  Importer-corrected values are high-confidence reviewed; unknown tile labels
  and unknown colony names are low-confidence needs-review; verified catalog
  aliases are high-confidence not-required. Any legacy overloaded row is split
  by the payload-deterministic rule exercised in the executable harness. The
  gated migration `20260719234500` is prepared and executable-tested, not
  applied; production holds zero overloaded rows (verified read-only), and the
  emitted RPC payloads remain valid against both the pre- and post-migration
  function.
- **One executable semantic matrix.** `canonical-data-semantics.ts` defines
  zero versus missing versus not-applicable, mechanic-state invariants
  (absence states: null final value, zero counts, no child rows; unsupported
  and conflicting states: no activity claim), and parser- versus
  owner-confirmed verification. The adapter evaluates it and surfaces
  violations as issues instead of coercing values.
- **Synthetic fixtures are explicitly labelled, never passed off as real.**
  The six `synthetic-but-format-faithful` full exports carry provenance,
  expected canonical results, and limitations in `FIXTURES.md`; retained real
  exports remain the preferred corpus when they exist.
- **Deterministic import source identity.** The import action records the
  original-submission SHA-256, byte length, trim flag, and a parser-run
  identity of `(source hash, parser version)` mirroring the v2 rerun rule; the
  server-derived stored-text hash is preserved separately and the two digests
  are never conflated.

## Phase 4, Step 4.3 — second closure-blocker remediation, 2026-07-20

Approved as the second bounded remediation of the independent Step 4.3
closure audit (BLOCKED verdict). Durable decisions:

- **Expand/contract is a standing release gate.** A privilege or schema
  contraction (REVOKE, DROP, constraint tightening) must never be applied to
  production while a currently deployed reader or writer still depends on
  the old shape. Order: deploy the code that no longer needs it → verify →
  contract. Adopted after the 2026-07-19 incident in which the F-01 column
  revokes (correct in themselves) broke the deployed live-site frontend the
  moment they landed. Gated migration `20260719234500`'s pre-apply protocol
  therefore includes verifying that no deployed writer emits the retired
  `'reviewed'` confidence value.
- **The redesign-owned placement model carries the full canonical contract**
  (gated migration `20260720110000`): actions placed/removed/replaced/
  converted/ownership_changed/unresolved; ownership explicit_owner/neutral/
  unowned/unknown/not_applicable/unresolved with owner ids permitted only
  under explicit_owner; first-class raw actor text and a constrained coarse
  tile class beside the fine upstream code; first-class original-source
  identity on the import row; and the map-independent board-layout format
  check in the RPC. Per-map geometry semantics remain application-layer.
  The redesign still never writes `game_capture_*` rows; the adapter maps
  the repository vocabulary onto the shared canonical one as pure renames.
- **The immutable source is the exact original submission.** No trim,
  line-ending normalization, Unicode normalization, or re-encoding anywhere
  between submission and storage; `original_sha256` digests those bytes and
  the stored text is byte-identical to them. Parsing uses a separately
  trimmed value on both client and server so line numbers stay stable.
- **Duplicate sources are reviewed, never silently re-imported.** The import
  action runs duplicate detection before any write (deployed
  `find_duplicate_game_log_import` plus classified matches: exact bytes /
  trimmed-equal / stored-hash-only, draft vs finalized, same-parser flag)
  and returns an explicit `duplicate_source` state. An intentional re-import
  requires the importer's explicit acknowledgment, which is recorded with
  the matched game ids as import evidence. No unique constraint — reruns
  and corrections stay legitimate. The pre-existing finalized duplicate pair
  remains a separately authorized production follow-up.
- **One shared map gate.** `evaluateImportMapGate` is the single rule for
  client preview and server action, over identical detector inputs
  including the verified off-reserve-ocean exception evidence; only a true
  conflict or a confident different-map detection blocks a save.
- **Import persistence carries a recoverable run state.**
  `confidence_summary.run` records persisting→complete; a run that never
  completes is surfaced by the adapter as `incomplete_import_run` and must
  not be read as a finished record. A missing run block means a completed
  historical import. Full single-transaction persistence remains deferred
  (it would redesign the Step 4.4 boundary); the limitation is documented.
- **A resumed draft never invents confirmed setup.** A snapshot missing
  `objectiveConfiguration` resumes as `unknown` (requiring review), never as
  `board_defined`.
- **Dry-run and production artifacts are permanently separate.** The
  overwritten Venus/Colonies dry run was restored byte-exact from
  `41bc1221e`; production execution lives in its own artifact; a repository
  test pins every pair's separation and non-contradiction.
- **Reconciliation metrics are per-system and measured-only.** Coverage is
  never claimed for "either system"; duplicate source hashes are measured in
  both systems; adapter failures are reported only when actually measured.
- **The migration↔ledger map is governed.**
  `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` +
  `src/lib/db/migration-ledger-map.ts` classify every repository migration
  against the verified production ledger (repo-native, renamed-drift,
  reconstructed, unconfirmed-remote, gated), with a drift-detecting test.
  `supabase/migrations/` is not a safe direct `db push` source; production
  changes continue through the per-mutation protocol in version order.
- **Non-import guest creation records no import evidence.** Gated migration
  `20260720100000` adds `p_record_import_alias` (default true) so the
  roster and Manual Entry guest paths — now routed through the guarded
  guest RPC with private personal-name storage and neutral public labels —
  never write a false `game_log` alias row. The raw `display_name` writers
  are removed entirely.
