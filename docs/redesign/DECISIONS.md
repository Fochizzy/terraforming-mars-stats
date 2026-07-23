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
- **`20260718050924` is applied, not gated, and is never to be applied.**
  Its content is live as ledger `20260718181600` (renamed drift); only its
  version string is absent from the ledger. Records describing it as a
  "gated" migration awaiting reconciliation — including `DEPLOY-STATE.md` —
  are wrong, and the label is itself a hazard because it invites an apply.
  Applying the file would abort on `42P07` *after* creating the
  Data-API-exposed `public.player_private_identities`, and would revert
  hardening applied by `20260719191911` and `20260721035955`.
- **A migration file records the replay, not the byte history, when the two
  conflict.** `20260718050924`'s six revokes of EXECUTE on
  `list_claimable_player_profiles()` and `claim_player_profile(uuid)` are
  removed from the repository file, making it the single deliberate
  exception to renamed-drift byte-identity. Production restored that grant
  afterwards (ledger `20260720221937`), so replaying the revoke modelled a
  database in which no signed-in caller can claim a saved player. The
  divergence is confined to that block and recorded in the file, in
  `MIGRATION-LEDGER-MAP.md`, and in the constant's docstring. The ledger
  #106 hardening (`20260721201734`) narrowed what those functions *disclose
  and accept*, never *who may call them*, and therefore never made the
  revoke safe — caller set and disclosure stay orthogonal dimensions.
- **Non-idempotency can be a safety property, and is here.** The unguarded
  `create unique index` and `create policy` statements in `20260718050924`
  must keep no `if not exists` guard. Because the file's content is already
  applied under a different version, an accidental `supabase db push` would
  re-run it; unguarded it aborts, guarded it would *succeed* and create the
  Data-API-exposed private-identity table. A repository test pins both the
  absence of the revokes and the presence of the unguarded statements.
- **A production-only ledger entry that repo migrations depend on is modelled
  as a harness fixture, never as a migration.** `20260720190000` (carried from
  `b11cae71b` for ledger `20260720221937`) grants on
  `claim_player_profiles_by_name()`, created by production-only entry
  `20260712115539`, which has no repo file. The predecessor is supplied by
  `supabase/tests/executable/production-preimage-20260712115539-…sql`,
  following the `20260720021300` precedent: reconstructed from
  repository-local evidence, fidelity confirmed against production by hash,
  headed as a fixture that must never enter `supabase/migrations/` nor be
  cited as evidence about production. Where a retired definition carried a
  privacy defect, the fixture models the *current* deployed body rather than
  the historical one — the enumeration oracle #106 removed is not
  reintroduced into the repository even for tests, at the cost of exercising
  that migration as a REPLACE rather than a behavioural before/after.


## Phase 7 — Leaderboard rating color bands

Decided by explicit user decision in the analytics-decisions session on
2026-07-21. Display-layer decision within the Phase 7 leaderboard cluster;
does not authorize implementation.

- Color tiers key off a player's ELO rating distance from the 1500 baseline
  (rating − 1500), applied to whichever ELO scope is on display (quarter or
  year). The actual rating number is always shown alongside the color; color is
  never the only signal (honors the no-color-alone accessibility rule).
- Bands (integer-inclusive, no gaps):
  - delta ≤ −100 → deep red
  - −99 to −50 → purple
  - −49 to +49 → no color (neutral)
  - +50 to +99 → green
  - delta ≥ +100 → gold
- The low and high bands are open-ended. ELO is unbounded, so ratings beyond
  ±150 from baseline clamp into deep red or gold rather than losing color. There
  is no ±150 rating cap; the earlier −150/+150 framing was an assumed scale
  limit ELO does not have.
- Deep red (not black) is the worst-tier color, so it stays legible on the app's
  dark surface (#141a22), where a literal black fill would vanish.
- Exact hex values for deep red, purple, green, and gold are pinned at
  implementation and contrast-tested on the dark surface; the band boundaries
  above are fixed regardless of final hues.

## Phase 7 — Leaderboard eligibility and Confidence marker

Decided by explicit user decision in the analytics-decisions session on
2026-07-21, resolving the eligibility/minimum-history portion of the Phase 7
cluster. Does not authorize implementation.

- Every player appears on the leaderboard from their first rated game. No hidden
  provisional period and no minimum-games gate removes anyone from the board
  (matches the adopted AsoBrain "appear after first game" behavior).
- A rating is provisional below 3 games and established at 3+ games, counted
  within the displayed scope's window. Quarterly hard resets make per-quarter
  samples thin, so many quarter ratings may stay provisional all quarter; this
  is expected, not a defect.
- The Confidence marker is a sample-maturity percentage = min(games / 3, 100%):
  1 game → 33%, 2 → 67%, 3+ → 100% (Established). It plateaus at 100% at three
  games and does not distinguish three games from many.
- This is a sample-maturity indicator, not a statistical confidence — pure ELO
  carries no rating-deviation term. Methodology copy must describe it as
  progress toward an established rating, not as a probability the rating is
  correct, so a 100% does not overclaim certainty.
- The Win Point Differential metric ranking keeps its own separate minimum-wins
  eligibility gate (MASTER-RULES requirement), distinct from this 3-game ELO
  threshold; the minimum-wins value is not yet set.


## Phase 7 — Leaderboard opponent-adjustment boundary, tie-breaking, and default scope

Decided by explicit user decision in the analytics-decisions session on
2026-07-21. Closes the opponent-adjustment-boundary, tie-breaking, and
default-scope items deferred by the seasonal-ELO methodology entry. Does not
authorize implementation.

- **One strength number, shared across phases.** The ELO rating is the single
  opponent-strength model. Phase 7 produces it; Phase 17 consumes it. Phase 17
  must not build a second strength model.
  - **Phase 7 owns the ladder:** the ELO rating (quarter and year), the ranked
    board, per-metric rankings, placement analysis, the Confidence marker, and
    color bands. Opponent strength enters Phase 7 only through the rating itself
    (who you beat).
  - **Phase 17 owns opponent-relative analysis:** head-to-head records, matchup
    heatmaps, and raw-vs-expected-vs-adjusted margin analysis, plus board
    control and board intelligence. This is diagnostic, not a ranking.
  - **The seam:** Phase 17 reads each game's pre-game Phase 7 ELO as its
    opponent-strength input for expected-margin and adjustment math. Using the
    pre-game value keeps Phase 17's no-target-leakage rule satisfied by
    construction. No metric is defined in two places.

- **ELO rank tie-breaking.** Applied in order; each step is used only when all
  prior steps tie; the final step is deterministic and is never surfaced as a
  visible "reason":
  1. ELO rating (the ranking itself).
  2. More games played in scope — an equal rating defended over more games ranks
     higher.
  3. Higher win rate in scope.
  4. Better average placement in scope.
  5. Stable player id (silent; guarantees a total, reproducible order).
  "In scope" means within the displayed rating window (quarter or year).

- **Metric rankings reuse the same shape:** metric value, then in-scope games
  (or in-scope wins for Win Point Differential, per its minimum-wins rule), then
  stable player id. No metric ranking is left with a nondeterministic order.

- **Rating eligibility and missing data.** Only finalized games with a complete,
  orderable finishing result feed the ELO computation. A game missing the
  scores/placements needed to order its players is excluded from the rating; it
  is never imputed, zero-filled, or treated as a result (consistent with the
  missing-is-not-zero and no-fabrication rules). Exclusion from the rating does
  not remove the game from other views.

- **Default headline scope is the current quarter.** The leaderboard opens on
  the current-quarter ELO ladder (the live race); the year ladder is available
  as a secondary view/toggle. Exact toggle placement and the user-facing
  methodology / last-refresh copy are display details deferred to implementation.


## Phase 4 Step 4.3 - Import identity classification and source-bound matching

Decided by explicit owner decision on 2026-07-21, in response to a confirmed live
private-name enumeration oracle in the deployed RPC
public.match_import_player_names(uuid, text[]). Defines the design; does not
authorize implementation or any production change.

- Identity classification. Each imported player is classified as exactly one of
  `username`, `personal_name`, or `existing_player`. `personal_name` requires BOTH
  first and last name; `username` requires exactly one valid normalized username.

- Exact relationship to the log. The parsed log's player name text is the source
  evidence. The server must prove the submitted identity matches it exactly:
  username mode matches the normalized log text; personal-name mode may match the
  first name, the last name, or the combined full name. No substring, prefix,
  fuzzy, or similarity matching. A first-only or last-only match is insufficient
  for automatic resolution and requires explicit selection.

- Candidate presentation. Existing players are shown with public or neutral labels
  only. Permitted distinguishing information is limited to finalized games in the
  active group, games shared with the signed-in player, and linked/unlinked status.
  Personal names are never assumed unique; multiple matches remain ambiguous and
  require explicit selection.

- Username uniqueness. Registered usernames are globally unique after
  normalization; guest usernames are unique within the active group after
  normalization; personal names are indexed for matching but never unique. Whether
  these are enforced in the database (not only in application code) requires
  independent verification.

- Server-only matcher boundary. Authenticated access to the free-form matcher is
  retired. The replacement accepts parser-derived evidence plus structured identity
  fields, never an arbitrary array of candidate names, and is callable server-side
  only. It returns only a uniform outcome from `resolved`, `ambiguous`,
  `unresolved`, `invalid_source_match`, `unavailable`, and never returns match
  reasons, scores, normalized names, or alias texts. Failure modes must be
  indistinguishable to the caller.

- Save-time revalidation. On save the server re-parses the original log and
  rechecks group authorization, the exact source-text match, username uniqueness,
  candidate eligibility, and distinct player IDs, taking the row lock before
  judging eligibility. The selected player ID and private import evidence are
  preserved.

- Migration 20260720120000_coarsen_import_name_match_reasons is INSUFFICIENT as a
  closure. Independent review confirmed it hides which private field matched but
  still confirms that a caller-supplied private name belongs to a real identity. It
  must not be applied on the belief that it closes the oracle.

- Registration-time claiming (identifying a prior co-player, with a verified shared
  finalized game, and uniform responses for zero/multiple/invalid combinations) is
  approved as design direction and is separate future work. Not authorized here.

- Release gate. No production migration, deployment, or revocation. Design and
  disposable-PostgreSQL proof first, then a fresh independent read-only review
  returning PASS, then separate authorization under an expand/contract sequence.


## Phase 4 Step 4.3 - AMENDMENT: interim service-role re-gate of the import matcher

Decided by explicit owner decision on 2026-07-22. Amends, and does not replace, the
import identity classification and source-bound matching decision recorded above.
Defines the design; does not authorize implementation.

- Adopted: a minimal service-role re-gate of public.match_import_player_names. A new
  3-arg overload takes an explicit requesting-user id, derives both the authorization
  gate and the candidate pool from that argument instead of auth.uid(), and is granted
  to service_role only. Both live call sites (import analyze, manual-entry resolution)
  move to the server-side admin client. The 2-arg overload's authenticated grant is
  then revoked.

- Deviation being accepted, explicitly. The re-gated matcher still accepts an arbitrary
  array of candidate names and still returns an exact/partial classification with a
  player id. That contradicts the clauses in the decision above requiring parser-derived
  structured input and indistinguishable failure modes. It is accepted only as interim
  risk reduction, on the same footing as the coarsening migration.

- What it does. It removes direct PostgREST access to the matcher by any authenticated
  caller, and it unblocks the contraction (retiring the authenticated grant on the
  free-form matcher) without first designing a replacement for the manual-entry path.

- What it does NOT do. It does not close the import enumeration oracle. Import candidate
  names are browser-supplied - participants text, pasted log, and client-posted OCR are
  all caller-controlled - so the same probe remains available through the analyze server
  action, unrate-limited and without durable evidence. Any claim that this closes the
  oracle would be false.

- Security cost being accepted. The database will trust the application to pass a
  truthful requesting-user id. Today auth.uid() makes an authorization bypass
  structurally impossible; afterwards, a server-action defect that passes an
  attacker-influenced id becomes a full bypass. This is the same trust model as the four
  applied source-bound gateways, but newly load-bearing on a matching function.

- Ordering is mandatory. Expand first (add the 3-arg overload, granted to service_role
  only), deploy the application with both call sites on the admin client, verify in
  production, and only then apply the contraction. The 2-arg function must remain
  granted and working until the deploy is verified.

- Source-bound matching remains the durable contract. This amendment is a stepping stone
  and must not become permanent by default. It ships with a recorded commitment to the
  source-bound design and a dated review of that commitment.

- Independent of this amendment: revoking authenticated EXECUTE on
  resolve_import_guest_identity is pure tightening, requires no amendment, and should
  proceed regardless.


## Phase 4 Step 4.3 - Non-import guest identity creation: accepted requesting-user trust model and retirement of 20260720100000

Decision date 2026-07-22. Owner decision, recorded from the planning session.

### Decision 1 - accept the explicit requesting-user trust model for the non-import guest identity path

public.resolve_import_guest_identity gates on auth.uid() and populates
created_by_user_id from it. After ledger 20260722153233 revoked authenticated
EXECUTE, the redesign's non-import guest creation path could not call it: under
the user-session client the privilege check fails, and under service_role
auth.uid() is NULL so the function's own gate raises the same 42501, with a
second independent failure on the not null created_by_user_id column. No
client-only change can succeed.

The accepted fix is a new, distinctly named, service_role-only function -
public.create_or_reuse_guest_identity - that authorizes against an explicit
p_requesting_user_id enforced against public.group_members, populates
created_by_user_id from that same argument, and records no player_import_aliases
row because no imported source exists on this path.

The cost, stated plainly. Today auth.uid() makes an authorization bypass on this
path structurally impossible: the database establishes the caller's identity and
no application defect can forge it. Afterwards the database trusts an
application-supplied id, so a server-side defect that passes an
attacker-influenced value becomes a full bypass. This is the same trust model
already accepted for the matcher in the 2026-07-22 amendment above, and the same
model as the four applied source-bound gateways of 20260722012658.

Why it is accepted anyway. No option both keeps the closed oracle closed and
repairs the reader. The only change that preserves auth.uid() is restoring the
authenticated grant on resolve_import_guest_identity, which would reopen the
private-name confirmation oracle closed as ledger 20260722153233 - a strictly
worse regression. Routing the path through the already-applied source-bound
gateways was evaluated and rejected: they require staged parsed-log source
evidence, enforce exact source-text binding, and write a game_log import alias
unconditionally, so using them on a non-import path would fabricate import
provenance that the source-bound design exists to prevent.

The surface is narrower than the matcher's. This function is write-scoped and
takes no caller-supplied candidate array, so it exposes no enumeration probe.
The matcher amendment left one open; this does not.

Mitigations that are part of the accepted decision, not incidental. The function
is granted to service_role only, never to authenticated or anon. The
requesting-user id is resolved server-side inside
createOrReuseGuestPlayerByPersonalName from supabase.auth.getUser(), the same
server-verified source getCurrentGroupContext uses, and is not exposed as a
parameter of any TypeScript caller - so no call site can supply it and no client
value can reach it. This deliberately diverges from the four sibling gateways,
which thread activeContext.userId from their callers. The divergence is
intentional and must not be normalized back to threading; doing so would
reintroduce the injection surface this mitigation removes.

A distinct function name was chosen over an overload of the existing signature.
An appended parameter is forced to carry a default because the existing
signature already ends in defaulted parameters, and a defaulted extra parameter
makes old-style calls ambiguous - 42725, proven on a disposable cluster.

### Decision 2 - supersede gated migration 20260720100000 rather than correct it in place

20260720100000 was written to add p_record_import_alias so non-import guest
creations record no false game_log alias evidence. That need is real and unmet,
but the migration as written drops the 7-argument resolve_import_guest_identity
and grants EXECUTE on its replacement to authenticated, which would reopen the
oracle closed as ledger 20260722153233.

It is retired unapplied as a documented no-op tombstone rather than corrected in
place. Correcting it would require the same rename and signature change anyway,
leaving a file whose name no longer describes its content; and any surviving
form of it continues to occupy a slot in the remaining-migration sequence, where
it invites application. The false-evidence-suppression requirement is carried
forward structurally instead: create_or_reuse_guest_identity never writes an
import alias, so the behaviour is a property of the function rather than a flag
on a call.

The in-place edit of unapplied 20260722012658 during the earlier matching
remediation is not a precedent for this case. That change preserved the
function's signature; this one does not.

### Scope authorized by this decision

The local build only - the new gated migration, the call-site move, and their
proofs. Applying 20260722160000, deploying the moved reader, verifying it, and
the subsequent contraction drop of the 7-argument function are each separately
gated and are not authorized by this decision. An authorized production ACL read
to settle the recorded service_role EXECUTE discrepancy is a precondition of the
contraction step.


## Phase 4 Step 4.3 - The seven-argument resolver drop: replacing the reader-deploy precondition

Decision date 2026-07-23. Owner decision, recorded from the planning session.

### What was decided

The recorded precondition on ID-READER-CONTRACT - that the drop of the
seven-argument public.resolve_import_guest_identity is valid only after the
moved reader is deployed and production-verified - is SUPERSEDED. It is
replaced by three preconditions that the evidence supports.

### Why the reader-deploy precondition is being replaced

Expand and contract exists to stop a deployed reader losing something it still
needs. Two independent read-only investigations, each using a positive control,
established that no reader on any lineage calls this function: not the deployed
application at its current source commit, not the rollback target, not the
redesign lineage, and not any object inside the database. An authorized
production catalog read confirmed zero references across every function body,
view, trigger and dependency record in all non-system schemas.

The moved reader that the precondition names exists only on the redesign
lineage. The live lineage has no caller of this function to move - it creates
guests by direct insert. Satisfying the precondition as written therefore
requires deploying the redesign application to production: a lineage cutover of
several hundred commits that ships Phase 4 of a twenty-phase rebuild, onto a
branch missing live-site fixes, whose deployability is itself unverified. That
is a launch decision, not a step in Step 4.3, and it is being asked for in order
to protect a reader that cannot exist short of the launch.

### What this decision does not claim

This drop is not closing an oracle. Authenticated EXECUTE on the seven-argument
resolver was revoked in production on 2026-07-22 as ledger 20260722153233, and
an authorized catalog read on 2026-07-23 confirmed the ACL is now postgres and
service_role only, as of 09:40:14Z. That is a prior record, and precondition 1
re-derives it live before any drop.
No client role can reach the function today. The security objective was met by
the revoke; this drop completes the expand and contract pattern and removes a
dead object. It should not be described, in any status line or summary, as
closing or mitigating an exposure.

### The three preconditions that replace it

1. The session authoring the drop must RE-DERIVE THE SIGNATURE LIVE from the
   production catalog before writing any drop statement. A signature recorded
   from a report is not a signature read from the catalog, and drop function if
   exists against a signature that does not exist succeeds silently - reporting
   success, changing nothing, while the session records the function as dropped.

2. That same session must RE-RUN THE CATALOG SWEEP for database-internal
   callers - function bodies, view definitions, triggers, and dependency
   records across all non-system schemas, with a positive control so that an
   empty result is meaningful. The existing sweep was taken on 2026-07-23 and
   production can move.

3. The session must VERIFY THE DEPLOYED EDGE FUNCTIONS. The repository records
   the project's only edge function as a disabled stub, but that is a prior
   record rather than an observation, and edge functions are one of the areas
   the catalog sweep explicitly does not cover.

### Residual risk accepted

The sweep cannot cover consumers outside the database - external clients,
scripts, ad-hoc sessions - or dynamic SQL that never stores the function name
literally. That residual is accepted. Recovery is straightforward if it is
wrong: the function body is preserved in migration 20260718212339 and can be
recreated.

### A cost this decision incurs, to be handled rather than absorbed

Dropping the function in production makes the repository's record of it
permanently stale. Two migrations on the redesign lineage create it, and the
executable harness asserts that it exists. This is the same class of
repository-versus-production divergence that the carry convention exists to
prevent, arriving from the opposite direction. It must be handled as part of
the drop's own work, not discovered afterwards.

### What this decision does not change

Contraction 20260722012707 remains genuinely deploy-gated. The deployed
application calls public.match_import_player_names through a user-session
client, so it executes as authenticated, and that migration revokes exactly
that grant. Applying it against the current deployment would break live import
matching. That gate is real and is unblocked by the service-role matcher
overload, not by this decision.

ID-READER-DEPLOY is not dissolved by this decision. The redesign reader remains
undeployed and will eventually need to ship. What changes is that it is no
longer a precondition of the seven-argument drop.


## Phase 4 Step 4.3 - Release publication scope: two lineages published, the matcher callsite branch held back as a standing exclusion

Decided by explicit owner ruling on 2026-07-23. Release-scope governance only. It
authorizes no further push, merge, deploy, migration, or production write, and changes
no phase, blocker, or production state.

- **Two lineages are authorized for publication:**
  `redesign/tm-stats-dashboard-rebuild` and
  `fix/live-compare-data-remove-declared-style`. Both were published under this scope;
  the execution record (nine commits `d63e6b0d7..505e49ece` on redesign, one commit
  `1b4c2350d..2926a1bcc` on `fix/live-compare`) is in `docs/REDESIGN_STATE.md`.
- **`fix/matcher-service-role-overload-callsite` is DELIBERATELY UNPUBLISHED — not
  merely unpushed.** It carries the moved matcher reader on the live-site lineage, and
  three matcher gates still depend on it (merge the moved reader, deploy it, and verify a
  real production import returns a non-zero match count). Publishing the branch invites a
  merge that no gate has cleared, reopening the window in which any unrelated live-lineage
  deploy would break import matching with `PGRST202`/`42883`.
- **This exclusion is STANDING, not incidental.** Reversing it — publishing or merging
  that branch — requires fresh explicit owner authorization. It does not become
  publishable by default now that the expand migration has been applied: applied is not
  deployed, and none of the three dependent gates is open.


## Phase 4 Step 4.3 - FORENSICS-HANDOFF-SCOPE-CORRECTION file-list amendment (Amendment 1): REDESIGN_STATE.md added; the validator waiver refused

Decided by explicit owner ruling on 2026-07-23. Amends the authorized file list of the
`FORENSICS-HANDOFF-SCOPE-CORRECTION` work item; governance only, with no code,
production, or scope change.

- **`docs/REDESIGN_STATE.md` was added to that work item's authorized file list**
  (Amendment 1), so the work item could correct the state document alongside the
  forensics handoff and the defect register.
- **The alternative was REFUSED.** The alternative considered — waiving
  `npm.cmd run validate:claude-context -- --require-maintenance` for a
  documentation-only change — was refused because it waives a CLAUDE.md pre-commit gate
  and would have left `docs/REDESIGN_STATE.md` asserting a ledger/gate count that the
  same work item had just falsified. Widening the authorized file set, rather than
  waiving the gate, keeps the gate intact and the state document truthful.


## Project-wide - generated Claude Project master context

Approved by the user's explicit context-maintenance request on 2026-07-22.

- **One permanent orientation document.** The external Claude Project uses one
  native Google Doc titled `TM PROJECT MASTER CONTEXT`. It is added once and
  updated in place under the same Google Drive file ID by the existing local
  planning-pack updater.
- **Canonical inputs, not copied summaries.** Each run embeds the full context
  contract, `docs/REDESIGN_STATE.md`, the current phase file detected from the
  state's `Current substep`, and every handoff in the first contiguous group
  under `Latest handoff`. The newest repository handoff is added as a freshness
  backstop when it is outside that declared group.
- **State owns active handoff membership.** Future agents already updating
  project state must maintain that first handoff group as the complete active
  set. The first blank line ends the group and separates older history.
- **Two small routing documents.** `docs/CURRENT_STATUS.md` is the concise
  current-work router and `docs/AUTHORITATIVE_DOCUMENTS.md` distinguishes
  instruction authority from factual evidence precedence. Current status and
  detailed `docs/REDESIGN_STATE.md` must be reconciled in the same change.
- **Executable evidence outranks remediation prose for factual status.** Current
  production evidence, applied migrations, executable verification, and current
  implementation can prove a documentation claim stale. They do not grant new
  scope, production, migration, deployment, push, or next-step authority.
- **Contradictions stop implementation.** Agents must report unresolved
  contradictions before changing code and must not mark an item resolved
  without executable verification.
- **Repository-owned source catalog.** The updater reads
  `docs/redesign/CLAUDE-PROJECT-SOURCES.json`; document count is derived from
  that catalog. New durable cross-project guidance must be added there in the
  same change. Removal/renaming requires explicit retirement and never silently
  deletes or orphans a managed Google Doc.
- **Enforced completion gate.** Before commit, completed redesign work runs
  `npm.cmd run validate:claude-context -- --require-maintenance`. After commit,
  the local authorized updater must run or the task must report synchronization
  pending with its exact reason.
- **Non-recursive receipt.** The final Drive result is recorded in the updater's
  local log and the task report, not by editing a canonical source solely to copy
  the receipt after synchronization.
- **No authority promotion.** The generated page is a navigation and
  aggregation copy. It never replaces canonical files, changes their authority,
  or grants permission for a phase, substep, production mutation, migration,
  deploy, push, or unrelated work. Local agents still read canonical sources.
- **Fail closed and remain stable.** Missing, empty, malformed, duplicate, or
  nonexistent active sources stop generation. A content fingerprint, rather
  than a run timestamp, keeps unchanged snapshots unchanged. Source changes
  replace the existing Google Doc content without changing its ID.
- **External refresh boundary.** The updater guarantees the Google Drive
  document's content and stable identity. Claude controls when it refreshes a
  linked Drive source, so no automatic-ingestion timing is claimed.

The full contract is `docs/redesign/CLAUDE-PROJECT-CONTEXT.md`.

## Project-wide - post-commit planning-pack synchronization is hook-enforced

Approved 2026-07-22 as local tooling and governance. Not Phase 4 work; changes
no phase, blocker, release, migration, or production state.

- **The gate is now enforced, not just written.** CLAUDE.md workflow step 8
  ("after the commit, run the planning-pack updater") previously relied on an
  agent remembering to run it. A deterministic repository hook
  (`.claude/hooks/sync-planning-pack.ps1`, registered in the committed
  `.claude/settings.json` on `PostToolUse` / matcher `Bash`, via handlers gated
  on `Bash(git commit *)` and `Bash(git merge *)`) now runs the same existing,
  already-authorized updater automatically — and only from the tree the updater
  actually reads (see the 2026-07-22 amendment below) — after a commit or merge
  that changes a planning-pack source. The hook triggers the documented updater;
  it grants no new phase, production, migration, deploy, push, or next-step
  authority.
- **The watch set is derived from the catalog, never duplicated.** The hook
  decides pack-relevance at runtime from
  `docs/redesign/CLAUDE-PROJECT-SOURCES.json`: every `documents[].path`, the
  configured phase-file range (`phaseDocuments.directory` with two-digit
  prefixes inside `[first,last]`), and any file under `docs/agent-handoffs/`. No
  planning-pack document filename is hard-coded in the hook, consistent with the
  decision above that the pack document count is derived rather than hard-coded.
  An unreadable or unparseable catalog is treated as a pack-relevant change
  rather than silently skipped.
- **Safe, idempotent triggering.** The hook is inert outside the redesign
  repository; is a no-op when HEAD did not advance (failed commit, no-op turn,
  repeat fire); records the last-synced commit in the git-ignored per-worktree
  marker `.claude/.pack-last-sync`; advances that marker only on a no-op or a
  successful updater run; and leaves it unchanged when the updater fails or is
  unavailable. A missing updater reports synchronization pending and never claims
  Drive is current. The hook always exits 0 and adds no lock of its own, because
  the existing updater already handles concurrent-run locking.
- **Project scope on purpose.** The registration lives in the committed
  `.claude/settings.json` (not `settings.local.json`) so the hook is present in
  the isolated worktrees where this project's implementation work happens. The
  updater reference stays `%USERPROFILE%`-relative so nothing machine-specific is
  committed.
- **Trigger and scope changes need authorization.** Adding an edit-based trigger,
  a scheduled task or service, or adding or retiring a
  `CLAUDE-PROJECT-SOURCES.json` entry all require new owner authorization and are
  out of scope here. (The 2026-07-22 amendment's `git merge` handler is within
  the same commit-family purpose — a merge produces a commit — not a new trigger
  class.)

**Amended 2026-07-22 (same branch, second commit; the first commit was not
rewritten).** Review of the first commit surfaced two defects, now fixed, plus
one hardening change:

- **Tree-identity gate (correctness).** The updater resolves every source under a
  fixed root (its `ROOT` in `update_planning_pack.py`), so it only ever reads one
  specific worktree. The first hook invoked the updater and advanced the marker
  from whatever tree fired it; a worktree commit therefore made the updater read
  a tree *without* that commit, report success, and record a false sync. The hook
  now runs the updater only when the current tree IS the updater's tree, read at
  runtime from `update_planning_pack.py` (via `%LOCALAPPDATA%`, so no
  machine-specific path is committed to the hook). That root is a git *linked*
  worktree, distinct from the git *main* worktree, so a main-worktree comparison
  would have been wrong; the updater's own root is authoritative. When the current
  tree is not that tree, the hook reports synchronization PENDING (naming the
  worktree and SHA) and does not advance the marker — silence over false success.
- **Merge trigger.** `git merge` creates a commit without invoking `git commit`,
  so merges never fired the hook; after the tree-identity gate, a merge into the
  updater's own tree is the primary event the hook catches. A second handler
  gated on `Bash(git merge *)` was added in the same matcher group, with distinct
  `-Trigger commit` / `-Trigger merge` args so hook deduplication (by command +
  args) keeps both handlers.
- **Marker-absent fail-open.** An absent or unresolvable
  `.claude/.pack-last-sync` is now treated as pack-relevant and synchronized
  rather than compared against `HEAD~1`, which could undercount the changed set
  after a many-commit merge.

Verified by a disposable-repo harness (39 assertions / 10 scenarios) that ran the
actual hook against a stubbed updater with no real Drive write.

The written CLAUDE.md step 8 remains authoritative and correct if hooks are
disabled; the hook is an enforcement aid, not a replacement for the instruction.
Handoff: `docs/agent-handoffs/PLANNING-PACK-POST-COMMIT-SYNC-HOOK.md`.

## Project-wide - a report may not assert an identifier the reporting session cannot resolve

Decided by the owner on **2026-07-23**. Governance and reporting only. It changes
no phase, blocker, release, migration, or production state, authorizes no work,
and relaxes no precondition.

### The decision

**A worker or audit report may not assert an identifier that the reporting
session cannot resolve at the moment of writing.**

Before returning a report, the session **mechanically verifies every identifier
it asserts**:

- **every claimed commit SHA**, via `git rev-parse --verify -q <sha>^{commit}`;
- **every claimed migration ledger version**, via membership in the ledger the
  session **actually read**.

**A non-resolving identifier is a STOP, not a footnote.** The session does not
return the report with the identifier flagged, hedged, or annotated; it stops and
reports the failure.

The check is **mechanical, requires no judgement, and runs in well under a
second**. It is not a review step and carries no analytical burden.

### What this does NOT cover, stated honestly

**It verifies that an identifier EXISTS, not that it means what the report says.**
It would not catch:

- a **real commit** cited as containing a change it does not contain;
- a **real ledger entry** described with the wrong content;
- false claims about **ACLs, body fingerprints, or overload counts**;
- a **harness claim that was never run**;
- work claimed on **another machine**; or
- **material omission**.

**It is a floor, not a ceiling.** No session may treat passing it as evidence
that a report is accurate, and no reviewer may treat it as a substitute for
reading the report.

### Provenance

The check was **identified and demonstrated by the `MATCHER-APPLY-FORENSICS`
session**, which ran it against the disputed production-apply report: **both
claimed SHAs FAIL**. A control proves it **PASSES** on the two real commits of
that window (`2b2a3b00e`, `a9429e213`), so **it is not vacuously failing** — it
discriminates. Record:
`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-APPLY-FORENSICS.md`.

That incident is also why the rule is stated as a **stop** rather than a
disclosure requirement: the disputed report asserted two commit SHAs that had
never been written, and a single `git rev-parse` on either would have caught it
before the report left the session.

### Scope

This entry defines the reporting requirement. It is referenced — not restated —
from the reporting-requirement sections of `docs/redesign/MASTER-RULES.md`,
`AGENTS.md`, and `CLAUDE.md`, which remain pointers to this text. This entry is
authoritative over every summary of it.


## Project-wide - dated-history classification standard for FALSIFIED-versus-CORRECT-DATED-HISTORY calls

Decided by the owner on 2026-07-23. Governance and documentation-classification only. It
changes no phase, blocker, release, migration, or production state and authorizes no work.

### The standard

A fact site whose heading — or immediately surrounding text — scopes it to a specific past
event STAYS at the value that was correct for that event. Raising it to the current value
would falsely attribute later work to the earlier event, which is a fabrication of the
record even when every individual number is real.

- A present-tense claim that a later event has since falsified is bannered **SUPERSEDED**
  with its original text retained. That is a FALSIFIED call.
- A value that a heading or date pins to a past event is **CORRECT DATED HISTORY** and is
  left unchanged.

The two are distinguished by scope, not by whether the number still matches production.

### The three worked examples (applied 2026-07-23)

- **The "115 entries" sites in the matcher-apply forensics handoff**
  (`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-APPLY-FORENSICS.md`). They record the
  pre-apply ledger the forensics session read live; production later moved to 116, but the
  sites are scoped to that read and stay at 115.
- **`docs/REDESIGN_STATE.md` line 68** — its dated defect-count record ("twelve
  planning-layer assignment defects"). The forensics work item later extended the total to
  sixteen, but line 68 is scoped to the earlier remediation event and stays at twelve.
- **`docs/CURRENT_STATUS.md` line 61** — the same dated defect-count record, left unchanged
  for the same reason.

These are the reference cases for future FALSIFIED-versus-CORRECT-DATED-HISTORY calls.
(Line numbers are as of this recording and may drift; the sites are identified by their
content.)


## Project-wide - updater clean-tree guard authorized (owner exception overriding two standing positions)

> **AMENDED 2026-07-23 — see the dated AMENDMENT at the end of this entry.** Two premises of
> the authorization below were superseded the same day: the fail-closed clean-tree guard
> (Design A) it authorizes is **withdrawn in favour of Design B**, and its "autorun path"
> clause rests on an autorun that **does not exist**. The override of the two standing
> positions below SURVIVES the amendment. The original authorization text is retained verbatim.

Decided by the owner on 2026-07-23. This entry records the AUTHORIZATION only. It does not
build the guard — that is a separate, not-yet-started work item — and it authorizes no
deploy, migration, production write, or push.

- **The authorization.** The owner authorizes building a fail-closed clean-tree guard for
  the planning-pack updater, wired into
  `C:\Users\izzyh\Desktop\Refresh TM Project Planning Pack.bat` and the autorun path, so
  the updater refuses to publish while the tree it reads holds uncommitted changes.
- **This owner exception OVERRIDES two standing positions, both named here:**
  1. the recorded **"no fix is applied, and none is recommended as decided"** position on
     the working-tree publish hazard — defect 10 in
     `docs/agent-handoffs/PHASE-04-STEP-03-PLANNING-LAYER-ASSIGNMENT-DEFECTS.md`, also
     stated in `docs/REDESIGN_STATE.md` and `docs/CURRENT_STATUS.md`; and
  2. the **"updater clean-tree investigation"** line in the excluded-work list — the open
     read-only investigation of "whether the updater has a clean-tree guard", recorded in
     the same defects handoff and in `docs/REDESIGN_STATE.md`.
- Both positions previously declined to fix, or even to recommend fixing, the hazard. This
  authorization supersedes that stance for the guard specifically. Their dated historical
  records are left in place per the dated-history classification standard above, not
  rewritten.
- **Out of scope for the recording work item, and still to be done under this
  authorization:** building the guard, editing the `.bat`, or otherwise touching the
  updater or its hook.

### AMENDMENT 2026-07-23 — Design B supersedes the guard; the autorun premise was wrong

Decided by the owner on 2026-07-23 (work item `AMEND-R4-DESIGN-B`). This amends, and does
not replace, the authorization above; the original text is retained verbatim. It builds
nothing and authorizes no deploy, migration, production write, or push. The implementation
is a separate work item that will cite this amendment as its authorization. Two findings
changed the original decision: `UPDATER-INVESTIGATION-CLOSEOUT` established that no autorun
exists, and the owner has now ruled for Design B, which is not a guard.

- **A-1 — Design B supersedes the guard.** The authorized fix is now **Design B**: every
  planning-pack document source resolves its content from the **committed tree** rather than
  from the working tree, using the same `git show <ref>:<path>` mechanism that `deploy-state`
  already uses, and the two generated (dynamic) documents — `tm-project-master-context` and
  `latest-handoff` — are produced from committed content. Working-tree state then cannot reach
  Google Drive **by construction**. The fail-closed clean-tree guard (**Design A**) that the
  original text above authorizes is **NOT authorized and is not to be built.** The reason: a
  source-scoped guard must maintain a **second enumeration** of which paths are pack sources,
  kept in step with `discover_sources()` in `scripts/planning-pack/update_planning_pack.py` —
  one fact asserted in two places, the coupled-enumeration / single-source-of-truth defect
  class this project has already recorded **four times** (items 5, 9, 13, and 15 in
  `docs/agent-handoffs/PHASE-04-STEP-03-PLANNING-LAYER-ASSIGNMENT-DEFECTS.md`, "the same defect
  four times over"). Design B removes the hazard class instead of guarding against it. Both
  designs are characterized in `docs/agent-handoffs/UPDATER-INVESTIGATION-CLOSEOUT.md` →
  CANDIDATE DESIGNS.
- **A-2 — the autorun premise was wrong.** The original text wires the fix into the Desktop
  `.bat` "and the autorun path." **No autorun exists** — `Get-ScheduledTask` (210 tasks)
  carries no updater action, there is no HKCU/HKLM Run or RunOnce entry, and Startup holds one
  unrelated shortcut ("Send to OneNote.lnk"); the `--scheduled` first-arg handling in the
  installed `run-updater.bat` is a **latent, uninstalled** design path (evidence class
  **[SYSTEM]**, `UPDATER-INVESTIGATION-CLOSEOUT.md` → Q3 and DISCREPANCY). Under Design B the
  "wired into the `.bat` and the autorun path" requirement is satisfied **by construction**,
  because the fix lives in the updater itself, which every invocation path (hook → Desktop
  `.bat` → `run-updater.bat` → `update_planning_pack.py`) executes. Whether to create a
  scheduled autorun is now an **independent** question and is **NOT authorized here**.
- **A-3 — what remains in force from the original R-4.** Two overrides survive this amendment
  unchanged: (1) the override of the recorded **"no fix is applied, and none is recommended as
  decided"** position on the working-tree publish hazard (defect 10), and (2) the lifting of
  the **"updater clean-tree investigation"** line in the excluded-work list. The authorization
  to *fix the hazard* stands; only the *mechanism* changes, from Design A to Design B. The
  dated historical records of both standing positions remain in place per the dated-history
  classification standard above, not rewritten.
- **A-4 — delivery is an owner action.** A committed fix does **not** run until it reaches
  `%LOCALAPPDATA%\TMPlanningPackUpdater` via `sync_installed_updater.py --apply`; an agent
  session cannot perform that step (it requires both Python execution and a `%LOCALAPPDATA%`
  write). Delivery is the **owner's** step. `--apply` **makes no backup** and is **non-atomic**
  (per-file `copyfile`, no lock, no rollback), so the installed directory should be copied
  before it is run (`UPDATER-INVESTIGATION-CLOSEOUT.md` → T2 DELIVERY).
- **Out of scope for this amendment, and still to be done under this authorization:** building
  Design B, and — as a separate owner step — delivering it repo→installed. Building the fix,
  creating an autorun, and any write outside the repository (including delivery) each require
  their own owner authorization.
