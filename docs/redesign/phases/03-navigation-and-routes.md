# Phase 3 — Navigation and Route Skeletons

## Status

Phase 3 is active. Step 3.1 passed full repository validation and is ready for
its focused completion commit. It establishes route and navigation ownership; it
does not implement the later page redesigns.

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

| Canonical path | Owner now | Boundary | Active group | Navigation | Step 3.1 treatment |
| --- | --- | --- | --- | --- | --- |
| `/` | Landing page | Public | No | Public landing | Unchanged |
| `/login`, `/forgot-pin`, `/reset-pin`, `/auth/*` | Auth pages/handlers | Public | No | Public/auth flow | Unchanged |
| `/profile` | Existing Profile page | Authenticated | Yes | Primary | Retained |
| `/log-game`, `/log-game/import` | Existing game/import workflows | Authenticated | Yes | Primary/direct workflow | Retained |
| `/games` | Existing Saved Games implementation | Authenticated | Yes | Utility/More | Canonical alias owner |
| `/saved-games` | Same Saved Games implementation | Authenticated | Yes | Compatibility only | Retained alias |
| `/insights` | Existing legacy Insights page | Authenticated | Yes | Compatibility only | Retained pending later replacement |
| `/insights/global` | Global route shell | Authenticated | Yes | Primary/More | Added |
| `/insights/individual` | Individual route shell | Authenticated | Yes | Primary/More | Added |
| `/insights/group` | Group route shell | Authenticated | Yes | Primary/More | Added |
| `/compare`, `/improvement`, `/leaderboard` | Route shells | Authenticated | Yes | Primary/More | Added |
| `/group`, `/group/players`, `/group/settings` | Existing group pages | Authenticated | Yes | Group legacy active path/Settings utility | Retained |
| `/cards` | Full Card Lookup | Authenticated | Yes | Utility/More | Retained |
| `/glossary` | Fragment-addressable Glossary | Authenticated | No | Utility/More | Retained |

`/games/[gameId]` and `/games/[gameId]/replay` remain planned Phase 5 paths.
They are deliberately not skeletonized because their route identity and
permission behavior require the approved Games/detail/replay implementation.

## Route and navigation principles

- The typed source has stable IDs, canonical hrefs, visibility, group-context
  requirements, match mode, deterministic order, and surface placement. No UI
  owns an independent primary-route list.
- Desktop shows the eight approved primary destinations, with Log a Game
  prominent. Its utility navigation exposes Games, Cards, Glossary, and Group
  Settings only when an active group is present where required.
- Mobile shows Profile, Insights, Log Game, Compare, and More. More is a native
  modal dialog, moves focus to Close, closes on Escape or route selection,
  restores focus to its trigger, and makes its background inert.
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
- Desktop and mobile use the same ordered typed source, expose
  `aria-current="page"`, have visible focus, and retain internal Next links.
- Group-required destinations are filtered before the client navigation receives
  them; public/auth boundaries stay server and middleware enforced.
- New shells have an accessible heading and announced unavailable/deferred status;
  `(app)/loading.tsx` and `not-found.tsx` provide intentional loading and missing
  route behavior.
- Focused tests cover validation, active matching, visibility, desktop/mobile
  navigation, focus/Escape restoration, route guards, and the shell.
- Full suite, typecheck, lint, build, diff review, documentation, handoff, and
  one focused commit are required before completion.

## Next-step gate

Await explicit assignment for Phase 3, Step 3.2. That assignment must name the
next route or implementation scope; this route framework does not authorize
moving legacy analytics content.
