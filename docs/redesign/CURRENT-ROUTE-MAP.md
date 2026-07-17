# TM Stats Current Route Map

## Audit scope

- Audit date: 2026-07-16
- Branch: `redesign/tm-stats-dashboard-rebuild`
- Starting revision: `8a6daeff5`
- Framework: Next.js App Router
- Inventory boundary: all page routes, route handlers, the favicon metadata route,
  shared layouts, and middleware present in this revision
- Result: 14 page routes, 4 route handlers, and 1 metadata asset route
- Dynamic route segments: none

No production application code was changed for this inventory. Major components
are listed only to establish route ownership; component-level migration decisions
belong to Step 0.2.

## Files inspected

- `middleware.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/favicon.ico`
- `src/app/(app)/layout.tsx`
- `src/app/(app)/cards/page.tsx`
- `src/app/(app)/group/page.tsx`
- `src/app/(app)/group/players/page.tsx`
- `src/app/(app)/group/settings/page.tsx`
- `src/app/(app)/insights/page.tsx`
- `src/app/(app)/log-game/page.tsx`
- `src/app/(app)/log-game/import/page.tsx`
- `src/app/(app)/profile/page.tsx`
- `src/app/(app)/saved-games/page.tsx`
- `src/app/(auth)/forgot-pin/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/reset-pin/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/auth/complete/route.ts`
- `src/app/auth/request-pin-reset/route.ts`
- `src/app/auth/reset-pin/page.tsx`
- `src/app/auth/username-login/route.ts`

Route-level guards, URL helpers, shells, server actions, and repositories imported
by those files were also inspected. This was dependency tracing for route accuracy,
not a component inventory.

## Shared routing behavior

### Root layout

`src/app/layout.tsx` wraps every page. It supplies metadata and mounts the client
`RecoveryHashRedirect`, which examines Supabase recovery hashes globally and sends
valid recovery sessions to `/auth/reset-pin`.

### Middleware

`middleware.ts` refreshes the Supabase session on every non-static request. Its
explicit protected-prefix list contains only `/profile`, `/group`, `/insights`,
and `/log-game`. When no Supabase cookie is present on those paths, it redirects to
`/login?next=<pathname>`.

### Protected layout

Every route under `src/app/(app)` also passes through the async server layout in
`src/app/(app)/layout.tsx`. The layout checks only for a cookie whose name starts
with `sb-` and redirects to `/login` when absent. Page-level group-context queries
then call `supabase.auth.getUser()` and establish the active group.

### Group context

`requireGroupContextOrRedirect()` calls `getCurrentGroupContext()`. That repository
reads the authenticated user, `user_profiles.last_active_group_id`, and the user's
`group_members` joined to `groups`; it may update the last active group. If no
context exists, this helper redirects to `/log-game/import`.

`requireCurrentGroupContext()` performs the same lookup but throws when no group
membership exists. Routes rendering `GroupSwitcher` make another membership read
and provide a server action that updates `user_profiles.last_active_group_id`.

### Analytics query bundle

`getGroupAnalytics(groupId)` is a route-level aggregate over these persisted views
and summaries: `group_leaderboard`, `group_score_source_averages`,
`player_score_source_averages`, `group_style_performance`,
`player_style_performance`, `group_interactions`, `player_interactions`,
`head_to_head`, `lineup_effects`, `player_trends`, `style_agreement`,
`data_coverage`, `player_data_coverage`, `player_metric_summaries`,
`player_map_metric_summaries`, `global_map_metric_summaries`,
`global_corporation_metric_summaries`, `global_style_metric_summaries`,
`global_tag_metric_summaries`, `global_milestone_metric_summaries`,
`global_award_metric_summaries`, `global_player_count_metric_summaries`, and
`global_generation_metric_summaries`.

## Route ownership ambiguities

1. `/insights` currently owns global, individual, and compare navigation. The
   `scope=individual` and `scope=compare` links are not read by the page, while the
   `#global-statistics` anchor is implemented.
2. `/group` is the destination for both Group Insights and Leaderboard navigation.
   It also receives global analytics rows, so global and group ownership overlap.
3. `/saved-games` owns game history, but the target architecture names this route
   `/games` and requires detail and replay routes that do not exist yet.
4. `/reset-pin` and `/auth/reset-pin` render the same recovery form. The global
   recovery bridge selects `/auth/reset-pin`, leaving `/reset-pin` as a parallel
   legacy entry.
5. `/cards` and `/saved-games` are in the protected route group but absent from the
   middleware protected-prefix list. They lose the original `next` destination on
   an unauthenticated redirect.
6. Routes using `requireGroupContextOrRedirect()` send a user without group
   membership to `/log-game/import`, but that destination uses
   `requireCurrentGroupContext()` and throws for the same condition. No-group
   onboarding ownership is unresolved.
7. Auth helpers still reference `/claim-player`, and `LoginForm` has a fallback to
   `/log-game/import-single`; neither route exists in this revision.
8. The target `/insights/global`, `/insights/individual`, `/insights/group`,
   `/compare`, `/improvement`, `/leaderboard`, `/games/[gameId]`, and
   `/games/[gameId]/replay` routes do not exist.

## Public and authentication pages

### `/`

- **Source file:** `src/app/page.tsx`
- **Purpose:** Public landing page with themed product-area sections and a sign-in
  call to action.
- **Rendering model:** Server component with no server data reads. `next/image` and
  `next/link` render the page; the root layout also mounts a client recovery-hash
  bridge.
- **Authentication and group requirements:** Public. No group required.
- **Queries and repositories used:** None.
- **Major components rendered:** `Image`, `Link`, and inline landing sections.
- **Search parameters or hash state:** No search parameters. Uses `#overview`,
  `#corporations`, `#cards`, `#projects`, `#milestones`, `#stats`, and `#tools`.
- **Known duplication or routing problems:** The section tabs are same-page anchors,
  not application destinations. Several labels overlap authenticated product areas
  without owning their routes.
- **Proposed destination in the redesign:** Retain `/` as the public entry and
  sign-in surface outside the eight authenticated primary pages.

### `/login`

- **Source file:** `src/app/(auth)/login/page.tsx`
- **Purpose:** Username/email plus PIN sign-in and account creation.
- **Rendering model:** Async server page that normalizes URL state and renders the
  client `LoginForm`.
- **Authentication and group requirements:** Public. No group required.
- **Queries and repositories used:** The page has no query. `LoginForm` posts sign-in
  to `/auth/username-login`; sign-up uses Supabase Auth plus the
  `is_username_available` RPC.
- **Major components rendered:** `LoginForm`.
- **Search parameters or hash state:** Reads `next`; invalid values normalize to
  `/profile`. Recovery flows can append `error`, but this page does not read or
  display that parameter.
- **Known duplication or routing problems:** The middleware preserves `next` for
  only four protected prefixes. Recovery error redirects generate URL state that
  the page ignores.
- **Proposed destination in the redesign:** Retain `/login` as the canonical public
  authentication page.

### `/forgot-pin`

- **Source file:** `src/app/(auth)/forgot-pin/page.tsx`
- **Purpose:** Request a PIN recovery link.
- **Rendering model:** Server wrapper around the client `ForgotPinForm`.
- **Authentication and group requirements:** Public. No group required.
- **Queries and repositories used:** The page has no query. The form posts to
  `/auth/request-pin-reset`, which resolves `user_profiles.email` and requests a
  Supabase recovery link.
- **Major components rendered:** `ForgotPinForm`.
- **Search parameters or hash state:** None. The form fixes its post-recovery
  destination at `/profile`.
- **Known duplication or routing problems:** PIN reset can also be initiated from
  `LoginForm`, so two UI entries own the same request flow. This page cannot preserve
  a caller-specific `next` destination.
- **Proposed destination in the redesign:** Retain as an auth-support route, with
  final ownership coordinated with `/login`.

### `/reset-pin`

- **Source file:** `src/app/(auth)/reset-pin/page.tsx`
- **Purpose:** Set a new six-digit PIN after recovery.
- **Rendering model:** Server wrapper around the client `ResetPinForm`.
- **Authentication and group requirements:** Public route that expects a recovery
  session or recovery tokens. No group required.
- **Queries and repositories used:** Supabase browser Auth `setSession`,
  `getSession`, and `updateUser`; no repository query.
- **Major components rendered:** `ResetPinForm`.
- **Search parameters or hash state:** The form consumes Supabase recovery hash
  tokens. This page does not read `next`, so success defaults to `/profile`.
- **Known duplication or routing problems:** Duplicates `/auth/reset-pin`; the
  global recovery bridge sends users to the other route.
- **Proposed destination in the redesign:** Retire after `/auth/reset-pin` is proven
  canonical and all recovery links are verified.

### `/auth/reset-pin`

- **Source file:** `src/app/auth/reset-pin/page.tsx`
- **Purpose:** Canonical recovery landing page for setting a new PIN.
- **Rendering model:** Async server page that resolves `next`, then renders the
  client `ResetPinForm`.
- **Authentication and group requirements:** Public route that expects a recovery
  session or recovery tokens. No group required.
- **Queries and repositories used:** Supabase browser Auth `setSession`,
  `getSession`, and `updateUser`; no repository query.
- **Major components rendered:** `ResetPinForm`.
- **Search parameters or hash state:** Reads `next`; the form also consumes
  `#access_token`, `#refresh_token`, and `#type=recovery` when present.
- **Known duplication or routing problems:** Duplicates `/reset-pin`, but this is the
  route selected by current callback and global recovery logic.
- **Proposed destination in the redesign:** Retain as the single reset page after
  the duplicate route is safely retired.

## Protected application pages

All routes in this section are server components under `src/app/(app)/layout.tsx`
and therefore receive the cookie-presence guard before page execution.

### `/cards`

- **Source file:** `src/app/(app)/cards/page.tsx`
- **Purpose:** Browse promo-set cards and their full images.
- **Rendering model:** Async server page with a client `PromoSetBrowser`.
- **Authentication and group requirements:** Auth cookie required by layout;
  authenticated active-group membership required by
  `requireGroupContextOrRedirect()`.
- **Queries and repositories used:** Group context; `listPromoSets()` and
  `listPromoCards()` from `reference-repo` (`promo_sets`, `cards`); group membership
  list for `GroupSwitcher`.
- **Major components rendered:** `AppShell`, `GroupSwitcher`, `PromoSetBrowser`.
- **Search parameters or hash state:** None. Browser filters are component-local.
- **Known duplication or routing problems:** Missing from middleware's protected
  prefixes. Despite its broad name, the route queries only promo cards.
- **Proposed destination in the redesign:** Retain `/cards` as the supporting Cards
  destination; define full-card versus promo-only ownership in a later phase.

### `/group`

- **Source file:** `src/app/(app)/group/page.tsx`
- **Purpose:** Combined group dashboard, leaderboard, relationships, global context,
  and final terraforming action statistics.
- **Rendering model:** Async server page. It loads data in parallel and renders
  analytics client components. Final-action query failures are caught at the route.
- **Authentication and group requirements:** Auth cookie plus active-group
  membership required.
- **Queries and repositories used:** Group context; `getGroupAnalytics()` and its
  shared analytics bundle; `getFinalTerraformingActionStats()` via
  `get_final_terraforming_action_stats(scope='group')`; group list for switching.
- **Major components rendered:** `AppShell`, `GroupSwitcher`, `GroupDashboard`,
  `FinalTerraformingActionTable`.
- **Search parameters or hash state:** None.
- **Known duplication or routing problems:** Both Group Insights and Leaderboard
  navigation target this page. It mixes group and global summaries. A failed final
  action query becomes `[]`, so unavailable data is indistinguishable from no rows.
- **Proposed destination in the redesign:** Move group analysis to
  `/insights/group`; move ranking ownership to `/leaderboard`; retain group
  administration as a supporting destination whose final URL is still undecided.

### `/group/players`

- **Source file:** `src/app/(app)/group/players/page.tsx`
- **Purpose:** View and add players in the active group's shared roster.
- **Rendering model:** Async server page with a client-capable `PlayerList` and an
  inline server action for player creation.
- **Authentication and group requirements:** Auth cookie plus active-group
  membership required. The write action re-resolves group context server-side.
- **Queries and repositories used:** `listPlayers()` and
  `createPlayerIfMissing()` from `player-repo` (`players`); group context and group
  membership list for switching.
- **Major components rendered:** `AppShell`, `GroupSwitcher`, `PlayerList`.
- **Search parameters or hash state:** None.
- **Known duplication or routing problems:** The target architecture lists Players
  and Group Members separately but does not yet assign a URL or ownership boundary.
- **Proposed destination in the redesign:** Supporting Group Members or Players
  destination; exact route requires a product decision before movement.

### `/group/settings`

- **Source file:** `src/app/(app)/group/settings/page.tsx`
- **Purpose:** Edit group name, analytics visibility, default expansions, and default
  promo sets.
- **Rendering model:** Async server page with `GroupSettingsForm` and an inline
  validated server action.
- **Authentication and group requirements:** Auth cookie plus active-group
  membership required. The action re-resolves group context. No route-level owner
  or editor role check is visible; authorization therefore depends on repository
  and RLS enforcement.
- **Queries and repositories used:** `getGroupSettings()` and
  `saveGroupSettings()` (`groups`, `group_settings`, group default join tables);
  `listExpansions()`, `listPromoSets()`, group context, and group list for switching.
- **Major components rendered:** `AppShell`, `GroupSwitcher`, `GroupSettingsForm`.
- **Search parameters or hash state:** None.
- **Known duplication or routing problems:** Supporting Group Settings is approved,
  but its final route is absent from the target-route list.
- **Proposed destination in the redesign:** Retain as the supporting Group Settings
  destination until a broader `/groups` route structure is approved.

### `/insights`

- **Source file:** `src/app/(app)/insights/page.tsx`
- **Purpose:** Combined corporation/prelude pairings, game-pace replay, individual
  and global analytics dashboard content, comparison content, and score profile.
- **Rendering model:** Async server page with parallel repository reads and
  route-local derivations, followed by several client analytics components.
- **Authentication and group requirements:** Auth cookie plus active-group
  membership required.
- **Queries and repositories used:** `getGroupAnalytics()`; `listPlayers()`
  (`players`); `listGamePaceReplays()` (`games`, `game_log_imports`, and paged
  `game_log_events`); group context and group list for switching.
- **Major components rendered:** `AppShell`, `GroupSwitcher`,
  `CorporationPreludePairingsPanel`, `GamePaceReplay`, `InsightsDashboard`, and
  `ScoreProfilePanel`.
- **Search parameters or hash state:** The page reads no URL state. Navigation sends
  `scope=individual` and `scope=compare`, which are ignored. `#global-statistics`
  targets an existing section ID.
- **Known duplication or routing problems:** This route owns at least three planned
  primary destinations. It passes empty promo-card and promo-set arrays to
  `InsightsDashboard`, filters pairing rows in the route, calculates baseline win
  rate and score-profile entries in the route, and hides the dashboard's final
  section with a CSS selector.
- **Proposed destination in the redesign:** Split content across
  `/insights/global`, `/insights/individual`, and `/compare`; move game-specific
  replay ownership toward `/games/[gameId]/replay`; evaluate recommendation content
  for `/improvement` in later phases.

### `/log-game`

- **Source file:** `src/app/(app)/log-game/page.tsx`
- **Purpose:** Create a game, reopen a draft, save progress, and finalize a game.
- **Rendering model:** Async server page with parallel reference reads, optional
  draft/import reads, a client `LogGameWizard`, and inline save/finalize server
  actions.
- **Authentication and group requirements:** Auth cookie plus active-group
  membership required. Both write actions re-resolve current user and group.
- **Queries and repositories used:** `getGroupSettings()`; reference repositories
  for maps, expansions, promo sets, corporations, preludes, map milestones, map
  awards, styles, cards, and catalog snapshot; `listPlayers()`;
  `getDraftGameForm()`; `getLatestGameLogImportSummary()`. Writes use
  `resolveLogGamePlayerReferences()`, `saveDraftGame()`, and `finalizeGameLog()`
  across `games`, revisions, players, score/selection child tables, and analytics
  refresh paths.
- **Major components rendered:** `AppShell`, `GroupSwitcher`,
  `ImportEvidenceSummary`, `LogGameWizard`.
- **Search parameters or hash state:** Reads `gameId`; when repeated, only the first
  value is used. Saved draft links originate at `/saved-games` and import completion
  redirects here with this parameter.
- **Known duplication or routing problems:** Create and edit-draft modes share one
  route without a dynamic segment. No finalized game detail route exists. The route
  revalidates several analytics pages but not `/saved-games`.
- **Proposed destination in the redesign:** Retain `/log-game` for creation and
  drafts. Finalized review should move to `/games/[gameId]`; draft URL ownership can
  remain query-based until a later routing decision.

### `/log-game/import`

- **Source file:** `src/app/(app)/log-game/import/page.tsx`
- **Purpose:** Import an exported log and optional screenshot/OCR evidence into an
  editable saved draft.
- **Rendering model:** Async server page with a client `LogGameImportShell` and an
  inline server action that persists the draft, evidence, and OCR correction data.
- **Authentication and group requirements:** Auth cookie plus active-group
  membership required through `requireCurrentGroupContext()`. Missing membership
  throws instead of redirecting to onboarding.
- **Queries and repositories used:** Group settings, maps, and active-group players.
  Writes use `saveDraftGame()`, `saveGameLogImport()` (including the configured
  import evidence storage bucket), and `correctAndSaveOcrText()`
  (`game_log_ocr_attempts`, `game_log_ocr_corrections`).
- **Major components rendered:** `AppShell`, `LogGameImportShell`.
- **Search parameters or hash state:** None. Successful import pushes to
  `/log-game?gameId=<id>`.
- **Known duplication or routing problems:** This is also the no-group redirect
  target, but it cannot operate without a group. Unlike neighboring pages, it does
  not render `GroupSwitcher`.
- **Proposed destination in the redesign:** Retain `/log-game/import` as the import
  entry inside the Log a Game workflow; resolve no-group onboarding separately.

### `/profile`

- **Source file:** `src/app/(app)/profile/page.tsx`
- **Purpose:** Personal analytics plus personal-versus-group style context.
- **Rendering model:** Async server page with parallel personal and group analytics
  reads and client analytics components.
- **Authentication and group requirements:** Auth cookie plus active-group
  membership required through `requireCurrentGroupContext()`. A user without a
  group gets an exception rather than an onboarding redirect.
- **Queries and repositories used:** `getProfileAnalytics()` (`players`,
  `player_game_results`, `player_metric_summaries`,
  `player_map_metric_summaries`); full `getGroupAnalytics()` bundle; group list for
  switching.
- **Major components rendered:** `AppShell`, `GroupSwitcher`,
  `StyleEffectivenessPanel`, `ProfileDashboard`.
- **Search parameters or hash state:** None.
- **Known duplication or routing problems:** Profile identity/activity and individual
  analytical exploration are combined. The page loads the full group analytics
  bundle to extract comparison rows.
- **Proposed destination in the redesign:** Keep identity, recent activity, groups,
  status, and shortcuts at `/profile`; move deep player analytics to
  `/insights/individual` and improvement guidance to `/improvement` when those
  routes are implemented.

### `/saved-games`

- **Source file:** `src/app/(app)/saved-games/page.tsx`
- **Purpose:** List active-group drafts and finalized games, and reopen drafts.
- **Rendering model:** Async server page with a direct Supabase query and
  server-rendered cards.
- **Authentication and group requirements:** Auth cookie plus active-group
  membership required.
- **Queries and repositories used:** Direct `games` query filtered by `group_id`,
  ordered by `updated_at`; group context and group list for switching. This route
  bypasses a game repository.
- **Major components rendered:** `AppShell`, `GroupSwitcher`, `Link`, inline game
  cards.
- **Search parameters or hash state:** None. Draft links produce
  `/log-game?gameId=<id>`.
- **Known duplication or routing problems:** Missing from middleware's protected
  prefixes. Finalized games are not links, and there are no detail or replay routes.
  The route name differs from the approved `/games` destination.
- **Proposed destination in the redesign:** Replace with `/games`; link finalized
  rows to `/games/[gameId]` and eligible replay data to
  `/games/[gameId]/replay` only after those routes work and are tested.

## Route handlers

### `GET /auth/callback`

- **Source file:** `src/app/auth/callback/route.ts`
- **Purpose:** Complete Supabase email authentication or bridge implicit recovery
  hash tokens to the reset page.
- **Rendering model:** GET route handler. Returns a redirect after PKCE code exchange
  or a no-store HTML bridge with an inline script for hash-based recovery.
- **Authentication and group requirements:** Public callback. No group required.
- **Queries and repositories used:** Supabase Auth
  `exchangeCodeForSession(code)`; no table repository.
- **Major components rendered:** None; redirect or generated HTML response.
- **Search parameters or hash state:** Reads `code` and `next`. The browser bridge
  reads `access_token`, `refresh_token`, `type`, and `error_description` from the
  hash.
- **Known duplication or routing problems:** Supports two recovery transport models
  and shares responsibility with the root `RecoveryHashRedirect`.
- **Proposed destination in the redesign:** Retain as the canonical auth callback;
  consolidate recovery ownership only after end-to-end auth tests cover both link
  formats.

### `GET /auth/complete`

- **Source file:** `src/app/auth/complete/route.ts`
- **Purpose:** Normalize and complete post-auth navigation.
- **Rendering model:** Synchronous GET route handler returning a redirect.
- **Authentication and group requirements:** Public endpoint. No group required.
- **Queries and repositories used:** None.
- **Major components rendered:** None.
- **Search parameters or hash state:** Reads `next`; invalid values normalize to
  `/profile`.
- **Known duplication or routing problems:** This extra redirect hop is used by
  login/account creation but does not verify auth itself.
- **Proposed destination in the redesign:** Retain as auth infrastructure unless a
  later auth-specific change proves it unnecessary.

### `POST /auth/request-pin-reset`

- **Source file:** `src/app/auth/request-pin-reset/route.ts`
- **Purpose:** Resolve an account and send a branded PIN recovery email without
  exposing whether the account exists.
- **Rendering model:** Async POST route handler returning JSON.
- **Authentication and group requirements:** Public endpoint. No group required.
- **Queries and repositories used:** Admin Supabase client; `user_profiles.email`
  lookup; Supabase Auth admin `generateLink(type='recovery')`; Resend email sender.
- **Major components rendered:** None.
- **Search parameters or hash state:** No URL state. JSON body fields are `username`
  and optional `nextPath`.
- **Known duplication or routing problems:** Called by both `/login` and
  `/forgot-pin`. Destination preservation depends on the caller.
- **Proposed destination in the redesign:** Retain as the single PIN-reset request
  endpoint.

### `POST /auth/username-login`

- **Source file:** `src/app/auth/username-login/route.ts`
- **Purpose:** Translate username-or-email plus PIN into a Supabase password sign-in.
- **Rendering model:** Async POST route handler returning JSON.
- **Authentication and group requirements:** Public endpoint. No group required.
- **Queries and repositories used:** Admin `user_profiles.email` lookup for username
  input; server Supabase Auth `signInWithPassword`; no group query.
- **Major components rendered:** None.
- **Search parameters or hash state:** No URL state. JSON body fields are `username`,
  `pin`, and optional `nextPath`; response points to `/auth/complete?next=...`.
- **Known duplication or routing problems:** Sign-in uses this handler while account
  creation calls Supabase directly from `LoginForm`, splitting auth ownership across
  server and browser paths.
- **Proposed destination in the redesign:** Retain as auth infrastructure; auth-flow
  consolidation is outside the route redesign.

## Metadata route

### `/favicon.ico`

- **Source file:** `src/app/favicon.ico`
- **Purpose:** Browser favicon generated by Next.js metadata routing.
- **Rendering model:** Static metadata asset.
- **Authentication and group requirements:** Public. No group required.
- **Queries and repositories used:** None.
- **Major components rendered:** None.
- **Search parameters or hash state:** None.
- **Known duplication or routing problems:** None identified.
- **Proposed destination in the redesign:** Retain unchanged.

## Current-to-target summary

| Current ownership | Proposed destination | Migration note |
| --- | --- | --- |
| `/log-game` | `/log-game` | Retain creation and draft finalization workflow. |
| `/log-game/import` | `/log-game/import` | Retain import as an additive logging path. |
| `/saved-games` | `/games` | Keep legacy route until library and detail replacement are tested. |
| Finalized game cards | `/games/[gameId]` | New route; no current owner. |
| Embedded game-pace replay | `/games/[gameId]/replay` | New route; preserve only supported persisted replay data. |
| `/profile` identity/activity | `/profile` | Retain. |
| `/profile` deep analytics | `/insights/individual` | Move only after replacement exists. |
| `/insights` global content | `/insights/global` | New route. |
| `/insights` individual content | `/insights/individual` | New route; current `scope` links are inert. |
| `/group` group analytics | `/insights/group` | New route. |
| `/insights?scope=compare` content | `/compare` | New route; current query state is inert. |
| Recommendation/improvement content | `/improvement` | New route; no current route owner confirmed. |
| `/group` leaderboard content | `/leaderboard` | New route; current nav duplicates `/group`. |
| `/cards` | `/cards` | Retain as supporting destination. |
| `/group/players` | Players or Group Members | Final supporting URL not yet approved. |
| `/group/settings` | Group Settings | Final supporting URL not yet approved. |
| Auth pages and handlers | Existing auth paths | Retain infrastructure; consolidate reset-page duplication later. |

## Route inventory blockers and follow-ups

- No blocker prevents completion of Step 0.1.
- Final URLs for Groups, Group Members, Players, and Group Settings are not specified
  in `PAGE-ARCHITECTURE.md`.
- The no-group onboarding destination must be decided before route migration.
- Legacy routes must remain until each replacement route works and is tested.
- Component retention, data capability, and asset coverage remain intentionally
  unassessed until Steps 0.2 through 0.4.
