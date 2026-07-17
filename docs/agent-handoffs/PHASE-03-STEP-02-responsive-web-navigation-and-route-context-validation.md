# Phase 3, Step 3.2 Handoff — Responsive Web Navigation and Route Context Validation

## Assignment and branch

Explicit assignment: **Phase 3, Step 3.2 — Responsive Web Navigation and Route
Context Validation**, with the explicit direction that TM Stats is a
responsive website, not a native mobile application, and must not gain a
mobile bottom-navigation bar, an app drawer, or a separate mobile information
architecture.

- Branch: `redesign/tm-stats-dashboard-rebuild`.
- Starting/base commit: `dcf5cac1ca8476707e615d7480cfbfd7b8885b51`
  (`feat(navigation): define phase 3 route skeletons`, Step 3.1's completion
  commit). Working tree was clean at start.
- Repository: `C:\Users\izzyh\Documents\Terraforming Mars Redesign`. The
  original `C:\Users\izzyh\Documents\Terraforming Mars` checkout was not
  touched.
- Final commit: recorded by the post-commit verification immediately after
  this handoff is committed (this handoff cannot know its own hash in
  advance). Working tree is clean before that commit.

## Conflict found during preflight and how it was resolved

Preflight inspection of Step 3.1's already-committed navigation
(`src/components/navigation/bottom-nav.tsx`,
`src/components/navigation/app-navigation.tsx`,
`src/lib/navigation/app-navigation.ts`) found that it built exactly what this
Step 3.2 assignment explicitly prohibits: a fixed `BottomNav` bar
(`sticky bottom-0`, `grid-cols-5`, `aria-label="Bottom navigation"`), a native
`<dialog>` "More" drawer, and a `mobile-primary`/`mobile-more` surface split
where the narrow-width destination set (Log Game, Profile, Global Insights,
Compare, More) genuinely differed from the eight-item desktop set — with
Individual Insights, Group Insights, Improvement, Leaderboard, Games, Cards,
Glossary, and Group Settings reachable only inside the "More" dialog on narrow
screens. Step 3.1's own phase file and `DECISIONS.md` entry had approved this
pattern before the current assignment's explicit "responsive website, not an
app" direction existed.

Per the assignment's own instruction to stop and report rather than silently
reinterpret scope, this conflict was surfaced to the user before any edit.
The user chose to resolve it as in-scope Step 3.2 work — a "route-context or
navigation defect found during this validation" — rather than deferring it or
doing metadata-only work around it. Everything below reflects that resolution.

## Objective and scope completed

- Replaced Step 3.1's mobile-specific navigation with one responsive website
  navigation architecture used at every viewport width, with a conventional
  narrow-screen overflow menu for secondary links only (not a bottom nav, not
  a reduced destination set, not an app drawer).
- Verified and completed route-level page titles and descriptions for every
  canonical destination via one centralized, validated registry.
- Reran and extended the Step 3.1 focused test suite; ran full repository
  validation.
- Updated `docs/REDESIGN_STATE.md`, the Phase 3 spec, and `DECISIONS.md`;
  wrote this handoff.

Not implemented in this step (unchanged, per the assignment's "Not
authorized" list): any dashboard content, Log a Game/import/saved-games/game
detail/profile redesign, new Leaderboard/Global/Individual/Group
Insights/Compare/Improvement analytics, Card Database or Glossary redesign,
analytics formula changes, schema/migration/Storage/dependency changes, the
Merger production migration/backfill, push, or deployment.

## Files changed

- `src/lib/navigation/app-navigation.ts` — `NavigationSurface` collapsed from
  `'desktop-primary' | 'desktop-utility' | 'mobile-primary' | 'mobile-more'`
  to `'primary' | 'utility'`; removed `NavigationItem.mobileLabel`; every item
  now declares exactly one surface set consumed at every width.
- `src/lib/navigation/route-metadata.ts` (new) — centralized, validated
  `{ pathname, title, description }` registry for every canonical destination
  that owns a real page, plus `pageMetadata()` (Next.js `Metadata`) and
  `routeMetadataFor()` lookups.
- `src/lib/navigation/route-metadata.test.ts` (new).
- `src/components/navigation/app-navigation.tsx` — rewritten: one always-
  visible primary `<nav>`, one desktop-only utility `<nav>`, one narrow-only
  "Menu" trigger + native `<dialog>` overflow panel containing only the
  utility destinations plus Logout. Removed the `BottomNav` import/usage.
- `src/components/navigation/bottom-nav.tsx` — deleted.
- `src/components/layout/app-shell.module.css` — `.primaryNavigation` no
  longer `desktopOnly` (now visible at every width, using its existing
  `overflow-x: auto`); added `.narrowOnly`/`.narrowMenuBar`/
  `.narrowMenuTrigger`; renamed `.mobileMoreDialog*`/`.mobileMoreLink*` to
  `.siteMenuDialog*`/`.siteMenuLink*`.
- `src/app/globals.css` — removed the now-dead `.tm-bottom-nav` /
  `.tm-bottom-nav__link` classes (no remaining consumer).
- `src/app/not-found.tsx` — added `metadata` (title/description); no rendered
  content changed.
- `src/app/(app)/{compare,improvement,leaderboard,insights/global,insights/individual,insights/group}/page.tsx`
  — now source `title`/`description` from `routeMetadataFor()` and export
  `metadata` from the same registry entry, instead of duplicating the string
  literals that were already correct in Step 3.1.
- `src/app/(app)/{profile,log-game,log-game/import,games,saved-games,cards,glossary,group,group/players,group/settings,insights}/page.tsx`
  — added `export const metadata = pageMetadata('/...')`. No JSX, heading,
  data query, or behavior changed in any of these files.
- `src/components/navigation/app-navigation.test.tsx`,
  `src/lib/navigation/app-navigation.test.ts`,
  `src/components/layout/app-shell.test.tsx` — updated for the new
  architecture (see Tests below).

## Route-context decisions

Every canonical destination's title/description/owner/boundary/group
requirement is unchanged from Step 3.1 except as follows:

- Page title and description are now sourced from
  `src/lib/navigation/route-metadata.ts` for: `/profile`, `/log-game`,
  `/log-game/import`, `/games`, `/saved-games`, `/insights`,
  `/insights/global`, `/insights/individual`, `/insights/group`, `/compare`,
  `/improvement`, `/leaderboard`, `/cards`, `/glossary`, `/group`,
  `/group/players`, `/group/settings`. Public landing and authentication/
  recovery routes (`/`, `/login`, `/forgot-pin`, `/auth/reset-pin`, `/reset-pin`)
  are intentionally not in this registry — Step 3.1 marked them "Unchanged"
  and this step preserves that.
- No route's owner, authentication boundary, or group-context requirement
  changed. `requireGroupContextOrRedirect()` / `requireCurrentGroupContext()`
  calls are untouched in every page file.

## Navigation architecture (the Step 3.2 fix)

- `NavigationSurface` is `'primary' | 'utility'`. `appNavigationItems` in
  `src/lib/navigation/app-navigation.ts` is otherwise unchanged (same 12 IDs,
  same canonical hrefs, same `activePaths`, same `match`/`prominent` flags).
- The primary `<nav aria-label="Primary navigation">` renders the same eight
  items at 390px through desktop widths; it was already `overflow-x: auto`
  and is no longer hidden below 768px.
- The utility `<nav aria-label="Account and reference navigation">` (Games,
  Cards, Glossary, Group Settings, Logout) renders as a visible bar at ≥768px
  and is hidden below it.
- Below 768px, a single `<button aria-haspopup="dialog" aria-expanded
  aria-controls="site-menu-panel">Menu</button>` opens a native `<dialog
  id="site-menu-panel">` containing the same utility items plus Logout. It
  reuses Step 3.1's dialog mechanics: `showModal()` for background inertness,
  focus moves to Close on open, `onCancel` closes on Escape, closing restores
  focus to the trigger, and selecting a link or the route changing (via a
  `pathname` effect) closes it.
- `activeNavigationId()` is unchanged; at most one link across the whole page
  carries `aria-current="page"` at any time (verified by test).
- No destination exists only inside the Menu overflow that isn't also present,
  always visible, in the desktop utility bar — the same items render in both
  places depending on viewport, never a different set.

## Redirects, aliases, query/fragment preservation

Unchanged from Step 3.1: `/insights?scope=*` redirects preserving other query
values, `#global-statistics` browser-side bridge, `/saved-games` alias to the
same `SavedGamesPage` component, `/group` as the legacy Group Insights owner.
None of this compatibility logic was touched.

## Authentication, group-context, and states

Unchanged from Step 3.1: `(app)` layout guard, `requireGroupContextOrRedirect`/
`requireCurrentGroupContext` server checks, middleware protection list,
`(app)/loading.tsx`, and `not-found.tsx` (metadata added, content unchanged).
No group is fabricated or silently selected; group-required navigation is
still filtered server-side before the client component renders it.

## Analytics, database, and infrastructure

No analytics formula, repository query, schema, migration, Storage, dependency,
production read/write, push, or deployment occurred. The Merger production
migration/backfill remain unapplied and untouched.

## Tests added / updated

- `src/lib/navigation/app-navigation.test.ts` — updated for `'primary'`/
  `'utility'` surfaces; added a case asserting the primary destination set is
  singular (no separate mobile surface to diverge from it).
- `src/lib/navigation/route-metadata.test.ts` (new) — uniqueness of
  pathname/title/description, coverage of every canonical app destination,
  distinct per-route `pageMetadata()` output, and a thrown error for an
  unregistered pathname.
- `src/components/navigation/app-navigation.test.tsx` — rewritten: primary row
  renders every destination with correct `aria-current`/highlighting; exactly
  one `aria-current="page"` link exists page-wide; Menu open/focus-in/
  Escape/focus-restore; Menu closes on route selection; group-filtered
  destinations still excluded from the Menu.
- `src/components/layout/app-shell.test.tsx` — updated: asserts the primary
  row contains all eight destinations (not a reduced mobile set), the Menu
  trigger exists with `aria-expanded="false"`/`aria-haspopup="dialog"`, and no
  `.tm-bottom-nav` element remains in the DOM.

## Exact validation run

| Command | Result |
| --- | --- |
| `npx.cmd vitest run src/lib/navigation src/components/navigation src/components/layout src/features/navigation src/features/auth/route-guards.test.ts` (rerun before editing) | 5 files, 12 tests passed |
| `npm.cmd test` | 121 files, 606 tests passed |
| `npx.cmd tsc --noEmit` | Passed, no errors |
| `npm.cmd run lint` | Passed with the same four pre-existing baseline warnings as Step 3.1 (three `no-img-element` in `score-profile-panel.tsx`, one unused `normalizeProfileHeadToHeadRow` in `analytics-repo.ts`) and the `next lint` deprecation notice; no new warning |
| `npm.cmd run build` | Passed; 28 routes generated (counted from the printed route table, including `/_not-found`), no route added or removed by this step |

## Responsive and accessibility review

- **Method:** automated (jsdom via Testing Library/Vitest — the tests above
  directly assert `aria-expanded`, `aria-haspopup`, `aria-current`, focus
  entry/restoration, Escape dismissal, and route-close behavior) plus manual
  source/CSS review of the media queries in `app-shell.module.css` (the
  `@media (min-width: 768px)` breakpoint toggling `.desktopOnly` /
  `.narrowOnly` / `.siteMenuDialog`).
- **Not performed:** live browser rendering at 1440/1024/768/390px. No test
  or seed Supabase credentials exist in this repository or its `.env.local`
  for any authenticated account, and creating one is a prohibited action, so
  the authenticated `(app)` routes where this navigation lives could not be
  reached in a real browser session. A local dev server was also not started
  for this check: port 3000 was already occupied by another process (not a
  preview server) when checked, and starting a second instance or killing an
  unidentified process on a shared machine was avoided as a safety measure.
  This is a known limitation, not a silent gap — no visual/responsive claim
  beyond the CSS/automated-test review above is made.
- **Routes inspected:** none via live browser, for the reason above.
- **Screenshots:** none taken.

## Known limitations and deferred work

- Live browser responsive/visual verification of the new navigation at the
  four required widths is deferred to whoever next has authenticated access
  or valid test credentials; the CSS itself (single primary row with existing
  `overflow-x: auto`, narrow-only Menu trigger, desktop-only utility bar) was
  reviewed by hand and is exercised in jsdom, but not rendered in a real
  browser under this step.
- All Phase 2 undecided questions (tied-first win margin, leaderboard
  methodology, opponent-strength model, etc.) remain exactly as recorded in
  `docs/redesign/DECISIONS.md`; nothing here resolves them.
- `/games/[gameId]` and `/games/[gameId]/replay` remain deliberately
  unskeletonized, per Step 3.1.

## Explicit confirmations

- TM Stats is a responsive website, not a mobile application; this step
  removed the mobile-app-style pattern Step 3.1 had introduced rather than
  extending it.
- No app-style mobile navigation, mobile bottom navigation, or separate mobile
  information architecture exists after this step.
- No production database action was performed.
- No Merger migration or backfill was performed.
- No push was performed.
- No deployment was performed.

## Next action

Await a new explicit assignment. Do not begin Phase 4 or any later Phase 3
step automatically.
