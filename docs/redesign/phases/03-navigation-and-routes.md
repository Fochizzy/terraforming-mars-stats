# Phase 3 — Navigation and Route Skeletons

## Status

Phase 3 is active. Step 3.1 and Step 3.2 have both passed full repository
validation. Step 3.2 is complete; it validated route context and replaced Step
3.1's mobile-specific navigation pattern with one responsive website
architecture, per explicit direction that TM Stats is a responsive website,
not a native mobile application. Phase 3 does not implement the later page
redesigns; await explicit assignment for the next Phase 3 step.

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

Step 3.2 is complete. Await explicit assignment for the next Phase 3 step (or
Phase 4). That assignment must name the next route or implementation scope;
this route framework does not authorize moving legacy analytics content.
