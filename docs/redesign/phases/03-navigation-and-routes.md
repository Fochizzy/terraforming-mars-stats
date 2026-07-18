# Phase 3 — Navigation and Route Skeletons

## Status

**Phase 3 — Navigation and Routes — Complete.** Steps 3.1, 3.2, 3.3, and 3.4
have all passed full repository validation. Step 3.2 validated route context
and replaced Step 3.1's mobile-specific navigation pattern with one
responsive website architecture, per explicit direction that TM Stats is a
responsive website, not a native mobile application. Step 3.3, authorized
afterward as a standalone assignment, integrated five approved brand assets
(header banner, leaderboard laurels, authentication background) through the
existing typed asset registry. Step 3.4, the closure step, re-audited all of
the above (confirmed intact and unregressed), found and resolved one
pre-existing defect unrelated to Phase 3's own code (see below), and
confirmed every closure criterion passes. Phase 3 does not implement the
later page redesigns; await explicit assignment for Phase 4, Step 4.1.

## Step 3.4 — Navigation and Route Phase Closure

Ran the full required preflight, canonical-route/navigation/asset audit,
responsive/accessibility live-browser review (where authentication allowed),
and full validation suite (124 test files / 614 tests, clean typecheck, lint
at the same 4 pre-existing baseline warnings, 31/31 build pages) — confirming
Steps 3.1-3.3 remain intact. Live-verified `/login` and `/reset-pin` at
1440/1024/768/390px (background resolves through the typed asset registry,
no horizontal overflow, no console errors); leaderboard laurels and the
authenticated header could not be live-verified for the same reason recorded
in Steps 3.2/3.3 (no authenticated test credentials), relying on the
existing automated test coverage instead.

Discovered, during live verification of authentication-required states, that
`middleware.ts` — confirmed via an unconditional-redirect probe and an empty
`.next/server/middleware-manifest.json` in both `next dev` and `next
build` — never executed in this repository. This predated Phase 3 (traces to
commit `0d1176484`) and reproduced identically on pre-Phase-3 routes
(`/profile`, `/group`) as well as Phase-3-added ones (`/cards`, `/games`), so
it was not a Phase 3 regression, but it did mean the `next=` return-path
preservation Step 3.1 added to the middleware redirect never actually
executed; a separate, duplicate, non-preserving guard in
`src/app/(app)/layout.tsx` was what actually blocked unauthenticated access
instead. Diagnosing the root cause was out of Step 3.4's authorized scope
(Next.js/build-tooling file discovery, not a minimal Phase 3-scoped defect,
and adjacent to authentication architecture Step 3.4 may not change), so it
was spawned as its own background task (`task_82ee1fc7`) with the full
diagnostic trail rather than patched inline; Phase 3 was left active pending
its outcome, per explicit user decision.

That task diagnosed and fixed the root cause at commit
`e4a444f2d5ef8a6904966c8667ef59acdc346c50`: Next.js only scans for
`middleware.ts` inside `src/` (the immediate parent of `src/app`) once a
`src/` layout is in use, never the repository root — a pure file relocation
to `src/middleware.ts`, no logic change. Step 3.4 independently re-verified
this fix (populated middleware manifest in both dev and build, `ƒ Middleware`
now printed in the build route table, live unauthenticated `curl` requests to
`/cards`/`/profile`/`/games?foo=bar` all correctly redirecting to `/login`
with the visited path preserved in `next=`, no more uncaught
`AuthSessionMissingError` logs) and re-ran the full validation suite
(unchanged: 124 files / 614 tests, clean typecheck, same 4 baseline lint
warnings, 31/31 build pages) before closing Phase 3. See
`docs/redesign/DECISIONS.md` and
`docs/agent-handoffs/PHASE-03-STEP-04-navigation-and-route-phase-closure.md`
for the full finding, including one harmless, pre-existing, unrelated
imprecision noted but not fixed (a duplicate top-level query param on the
`/login` redirect when the original path already had its own query string —
inert, since the login page only reads `next`).

## Step 3.3 — Brand Asset Preservation and Responsive Website Integration

Authorized after Step 3.2 completed, as a standalone asset-preservation and
integration assignment — not a reopening of Step 3.2. Preflight found three of
the five approved assets already had a foothold in the repository predating
this step: the shared header banner was already the exact approved asset
(checksum-identical) and already integrated via `AppShell`'s bundled Next.js
static import; the leaderboard already rendered gold/silver/bronze laurels in
`GroupDashboard` (the real leaderboard, at `/group`) but with outdated
artwork; the authentication background was a placeholder SVG, not yet the
approved Mars-landscape PNG.

Preflight also found no Supabase Storage bucket suitable for site-brand or
decorative assets, and no existing precedent for storing this asset category
in Storage — the banner and background have always been bundled-static or
public-static repository files. Per the assignment's own stop condition for
exactly this case, the user was asked and chose to keep that existing
repository-file convention rather than authorize a new Storage bucket; no
Storage upload occurred for this step.

Resolution:

- The three laurels were reprocessed from newly approved source art with
  `sharp`: confirmed genuine alpha transparency (no baked checkerboard) via
  pixel-level alpha histograms, then resized to optimized 256x256 PNGs
  (~94% smaller than source) with alpha preserved. No repositioning was
  needed — each source laurel's visible content already filled roughly 92%+
  of its canvas, and per-laurel bounding-box measurement confirmed the three
  are already aligned within a few pixels of each other on a shared coordinate
  system.
- The authentication background was converted to a single optimized WebP at
  its native 1672x941 resolution (no upsampling; ~92% smaller than source) and
  applied to `/login` and, per explicit user direction given mid-task, both
  reset-PIN routes (`(auth)/reset-pin` and the legacy `auth/reset-pin`).
  `/forgot-pin` has no background today and was left unchanged (out of scope).
- All five assets are now resolved through the existing `resolveStaticSiteAsset`
  typed registry (`src/lib/assets/static-assets.ts`), extended with four new
  keys (`auth-page-mars-landscape`, `leaderboard-laurel-gold/silver/bronze`),
  rather than hardcoded literal paths — including the banner, which is now
  routed through the registry for the first time while keeping its exact
  prior rendering (same `next/image`, same optimized bundled-static source).
- The leaderboard now renders an always-visible "#N" rank text via a new
  `LeaderboardRankBadge` client component, independent of any image, so rank
  is never conveyed by laurel color alone; the laurel itself is decorative
  (empty alt, `aria-hidden`) and is dropped without hiding the row if its
  image fails to load.
- No analytics, formula, schema, migration, Storage, dependency, production,
  push, or deployment action occurred. See
  `docs/agent-handoffs/PHASE-03-STEP-03-brand-asset-preservation-and-responsive-website-integration.md`
  for full validation results, file list, and asset processing detail.

## Step 3.2 — Responsive Web Navigation and Route Context Validation

Step 3.1's committed navigation used a fixed `BottomNav` bar (`sticky
bottom-0`) plus a `mobile-primary`/`mobile-more` destination split that showed
a materially different, reduced destination set on narrow screens than on
desktop, with a native-dialog "More" panel holding the rest. The explicit Step
3.2 assignment stated directly that TM Stats is a responsive website, not an
app, and specifically prohibited a mobile bottom-navigation bar, an app
drawer, and a separate mobile information architecture — a direct conflict
with what Step 3.1 had already built and committed. Per the assignment's own
instruction to stop and report rather than silently reinterpret scope, this
conflict was surfaced to the user, who approved resolving it as in-scope
Step 3.2 work (fixing a "route-context or navigation defect found during this
validation").

Resolution: one navigation architecture at every viewport width.

- The primary destination row (all eight approved primary destinations,
  Log a Game prominent) now renders identically from 390px through desktop
  widths, reusing its existing horizontal-scroll behavior at narrow widths
  instead of being desktop-only. No destination is added or removed based on
  viewport.
- Only the secondary utility destinations (Games, Cards, Glossary, Group
  Settings) plus Logout collapse into one semantic "Menu" overflow panel below
  the desktop breakpoint — the one narrow-screen concession the assignment
  explicitly permits ("a conventional responsive website menu or overflow
  panel when required by the approved design"), used because twelve links
  plus Logout do not fit in a narrow header. Every utility destination is also
  present, always visible, in the identical desktop utility bar.
- The overflow panel keeps Step 3.1's native `<dialog>` modality (background
  inertness, focus into Close, Escape-as-cancel, trigger focus restoration,
  close on route change); only its content (full utility set, not a mobile-only
  subset) and its trigger/label ("Menu", not "More") changed.
- `BottomNav` and the `mobile-primary`/`mobile-more`/`mobileLabel` surface
  taxonomy are removed, not retained disabled. `NavigationSurface` is now
  `'primary' | 'utility'`.
- Route-level page titles and descriptions for every canonical destination now
  come from one centralized, validated `src/lib/navigation/route-metadata.ts`
  registry, feeding both each route's document `<title>`/description metadata
  and (for the six Phase 3 shells) the in-page heading/description text, so
  there is exactly one string per destination instead of duplicated literals.
- No analytics, formula, schema, migration, Storage, dependency, or existing
  page-content change occurred. See
  `docs/agent-handoffs/PHASE-03-STEP-02-responsive-web-navigation-and-route-context-validation.md`
  for full validation results and file list.

## Purpose

Give later redesign steps a stable, accessible application map without moving
analytics code, inventing data, or breaking authenticated deep links. This step
defines canonical URLs, compatibility treatment, shared desktop/mobile navigation,
and truthful shells for destinations whose feature content belongs to a later
approved step.

## Step 3.1 scope

- One typed navigation contract used by desktop, mobile primary, mobile More,
  and utility navigation.
- Canonical paths and active-route rules for all currently navigable destinations.
- Compatibility handling for legacy Insights scope links and its historical
  global-statistics fragment.
- `/games` as the canonical game-library path, sharing the existing Saved Games
  implementation with the retained `/saved-games` alias.
- Group-protected shells for `/insights/global`, `/insights/individual`,
  `/insights/group`, `/compare`, `/improvement`, and `/leaderboard`.
- Intentional application loading, not-found, and route-unavailable states.
- Focused route, navigation, accessibility, and authorization tests.

## Prerequisites

- Phase 0 route/component/data inventories are complete.
- Phase 1 shared foundations and Phase 2 analytics contracts are complete.
- The Glossary and full repository-backed Card Lookup are complete at
  `c17e8b1ba` and remain canonical at `/glossary` and `/cards`.
- No Phase 2 production package is applied by this step.

## Canonical route contract

| Canonical path | Owner now | Boundary | Active group | Navigation (current, Step 3.2) | Step 3.1 treatment |
| --- | --- | --- | --- | --- | --- |
| `/` | Landing page | Public | No | Public landing | Unchanged |
| `/login`, `/forgot-pin`, `/reset-pin`, `/auth/*` | Auth pages/handlers | Public | No | Public/auth flow | Unchanged |
| `/profile` | Existing Profile page | Authenticated | Yes | Primary | Retained |
| `/log-game`, `/log-game/import` | Existing game/import workflows | Authenticated | Yes | Primary/direct workflow | Retained |
| `/games` | Existing Saved Games implementation | Authenticated | Yes | Utility (desktop bar / narrow Menu) | Canonical alias owner |
| `/saved-games` | Same Saved Games implementation | Authenticated | Yes | Compatibility only | Retained alias |
| `/insights` | Existing legacy Insights page | Authenticated | Yes | Compatibility only | Retained pending later replacement |
| `/insights/global` | Global route shell | Authenticated | Yes | Primary | Added |
| `/insights/individual` | Individual route shell | Authenticated | Yes | Primary | Added |
| `/insights/group` | Group route shell | Authenticated | Yes | Primary | Added |
| `/compare`, `/improvement`, `/leaderboard` | Route shells | Authenticated | Yes | Primary | Added |
| `/group`, `/group/players`, `/group/settings` | Existing group pages | Authenticated | Yes | Group legacy active path/Settings utility | Retained |
| `/cards` | Full Card Lookup | Authenticated | Yes | Utility (desktop bar / narrow Menu) | Retained |
| `/glossary` | Fragment-addressable Glossary | Authenticated | No | Utility (desktop bar / narrow Menu) | Retained |

Primary destinations render in the one row used at every viewport width (no
"More" appearance — Step 3.2 removed that split). Utility destinations render
in the desktop utility bar and, at narrow widths, inside the "Menu" overflow
described under Step 3.2 above.

`/games/[gameId]` and `/games/[gameId]/replay` remain planned Phase 5 paths.
They are deliberately not skeletonized because their route identity and
permission behavior require the approved Games/detail/replay implementation.

## Route and navigation principles

- The typed source has stable IDs, canonical hrefs, visibility, group-context
  requirements, match mode, deterministic order, and surface placement. No UI
  owns an independent primary-route list.
- The eight approved primary destinations, with Log a Game prominent, render in
  one row at every viewport width (narrow widths scroll it horizontally rather
  than showing a reduced set). Utility navigation exposes Games, Cards,
  Glossary, and Group Settings only when an active group is present where
  required, as a visible bar at desktop widths and inside a narrow-width "Menu"
  overflow otherwise (Step 3.2; see that step's section above for why the
  Step 3.1 mobile-specific split was replaced). Menu is a native modal dialog,
  moves focus to Close, closes on Escape or route selection, restores focus to
  its trigger, and makes its background inert.
- Active state is path identity, not labels. Query strings and fragments do not
  affect it; longer nested paths win; segment-aware prefixes prevent `/profile`
  from activating `/profiles`.
- The authenticated `(app)` layout remains the page guard. Middleware now covers
  all new canonical prefixes and `/saved-games`, preserving the request query in
  the login return path. Group pages retain their existing server guard and
  switcher.
- Cards and Glossary retain their current behavior. Card Lookup query/filter
  state and Glossary fragments are not rewritten by navigation.

## Compatibility decisions

| Existing address | Treatment | State handling |
| --- | --- | --- |
| `/insights?scope=global` | Redirect to `/insights/global` | Preserve non-`scope` query values |
| `/insights?scope=individual` | Redirect to `/insights/individual` | Preserve non-`scope` query values |
| `/insights?scope=group` | Redirect to `/insights/group` | Preserve non-`scope` query values |
| `/insights?scope=compare` | Redirect to `/compare` | Preserve non-`scope` query values |
| `/insights#global-statistics` | Browser replacement to `/insights/global` | Preserve query; fragments are not sent to the server |
| `/insights` without a selector | Keep legacy Insights owner | No state discarded |
| `/saved-games` | Same component as `/games` | Existing draft links and group context remain intact |
| Old Leaderboard link (`/group`) | Keep legacy group owner | It had no distinct URL to redirect safely; new nav uses `/leaderboard` |

## Explicit exclusions

No database work, migrations, Supabase/Storage changes, formula or repository
changes, production reads/writes, dependency additions, deployment, push, page
redesigns, workflow redesigns, Card Database redesign, Glossary redesign, or
analytics consumers are authorized. Shells fetch no analytics data and contain
no fabricated metrics or dead controls.

## Acceptance criteria and validation

- Every navigation href is declared by the canonical route contract; IDs and
  canonical hrefs are unique.
- Every viewport width uses the same ordered typed source (Step 3.2: no
  separate mobile surface), exposes `aria-current="page"` on exactly one
  destination per route, has visible focus, and retains internal Next links.
- Group-required destinations are filtered before the client navigation receives
  them; public/auth boundaries stay server and middleware enforced.
- New shells have an accessible heading and announced unavailable/deferred status;
  `(app)/loading.tsx` and `not-found.tsx` provide intentional loading and missing
  route behavior.
- Every canonical destination has a page title and description sourced from
  the centralized `route-metadata.ts` registry (Step 3.2).
- Focused tests cover validation, active matching, visibility, responsive
  navigation at every width, the narrow "Menu" overflow's focus/Escape
  restoration, route guards, and the shell.
- Full suite, typecheck, lint, build, diff review, documentation, handoff, and
  one focused commit are required before completion.

## Next-step gate

Phase 3 (Steps 3.1 through 3.4) is complete. Await explicit assignment for
Phase 4, Step 4.1. That assignment must name the next route or implementation
scope; this route framework does not authorize moving legacy analytics
content.
