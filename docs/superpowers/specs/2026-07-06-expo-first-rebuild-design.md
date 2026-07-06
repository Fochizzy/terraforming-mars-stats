# Expo-First Rebuild Design

Date: 2026-07-06

## Goal

Rebuild Terraforming Mars Stats as an Expo-first application that ships from one codebase to iPhone, Android, and web, while freezing the current Next.js app as a legacy reference until the Expo app reaches near feature parity.

## Product Decisions

1. Start the rebuild only after the two active in-flight tasks finish and land in the current repo.
2. Use that resulting commit as the frozen reference snapshot for parity checks.
3. Keep the same product surface area from the current web app, including auth, group management, log game, imports, profile, insights, and reference browsing.
4. Redesign navigation and screen structure to feel native from the start instead of mirroring the current Next route tree exactly.
5. Build the new product in parallel inside the same repo rather than attempting a big-bang replacement.
6. Target iPhone, Android, and web from the new Expo codebase.
7. Freeze the current Next app with minimal maintenance during the rebuild instead of evolving both products in parallel.

## Current Constraints

The current product is not just a shared React UI. It contains several Next-only seams that cannot be moved directly into Expo:

1. App Router pages and layouts in `src/app`
2. `next/navigation` redirects and client navigation
3. `next/server` route handling
4. cookie-based session wiring through `next/headers`
5. page-local server actions that mix UI submission with data writes

The rebuild must explicitly remove those dependencies from the active product path rather than recreating them with thin compatibility layers.

## Repository Strategy

The repo should temporarily hold two product surfaces with one clear owner:

1. The current Next.js app remains the frozen legacy reference.
2. The new Expo app becomes the active product under development.

The point of the parallel setup is not to keep both apps equally current. It is to preserve a stable behavioral reference while the new app reaches parity.

The preferred structure is:

1. `app/` for Expo Router screens, layouts, tabs, and route groups
2. `src/core/` for platform-neutral business logic
3. `src/services/` for Supabase access, session management, storage adapters, upload helpers, and environment access
4. `src/ui/` plus feature-local folders for Expo-compatible presentation components
5. existing `src/app` and existing Next-only helpers treated as the legacy web implementation

The repo should avoid an immediate large rename of the current Next app. The safer approach is:

1. freeze the current Next files in place
2. build the Expo app in new folders
3. extract shared logic out of the legacy implementation as needed

That keeps the reference baseline readable and avoids churn before the Expo app can replace it.

## Target App Structure

The new app should be organized around Expo Router rather than around the current Next page tree.

Recommended route layout:

1. `app/_layout.tsx`
   - bootstraps fonts, theme, auth restore, and global providers
2. `app/(auth)/...`
   - login, signup, recovery, and auth callback completion
3. `app/(tabs)/_layout.tsx`
   - native-first tab shell for the signed-in experience
4. `app/(tabs)/home.tsx`
   - lightweight entry dashboard or resume surface
5. `app/(tabs)/log-game/...`
   - the main logging stack, including setup, players, milestones, scores, style, review, and import flows
6. `app/(tabs)/insights/...`
   - analytics and insight surfaces
7. `app/(tabs)/profile/...`
   - profile, current group, player roster, and group settings
8. modal or nested stack routes for detail surfaces that should not live in the main tab hierarchy

This structure intentionally reshapes the product around everyday phone use rather than current URL symmetry.

## Navigation Model

The new navigation should preserve features while feeling native:

1. top-level tabs should prioritize the most frequently used product surfaces
2. group management should live under profile and settings rather than as a peer navigation silo
3. the log-game flow should behave like a dedicated stack, not a collection of loosely connected pages
4. import evidence and review should be treated as part of the log-game flow rather than as a web-only side path
5. auth should be isolated from the signed-in shell through Expo Router route groups and guards

The first Expo version should not preserve the current route names or page nesting simply because they already exist in Next. Product parity matters more than route parity.

## Shared Logic Boundary

The most important migration boundary is between platform-neutral logic and platform-specific delivery.

`src/core/` should hold logic that must behave identically on iPhone, Android, web, and any future product shell:

1. ranking and tie utilities
2. game review and finalize rules
3. log-game draft shaping and validation
4. style inference
5. analytics shaping and insight-card building
6. import parsing, participant matching, and review modeling
7. catalog normalization and filtering rules

`src/services/` should hold product infrastructure that is still cross-platform but not purely domain logic:

1. Supabase client setup
2. session bootstrap and restore helpers
3. storage adapters for native and web
4. upload helpers for screenshots and evidence
5. environment access and runtime configuration
6. platform-safe wrappers around capabilities such as linking or file selection

Expo screens should call into these shared layers instead of re-embedding logic inside route files.

## Auth And Session Model

The Expo app should use one consistent cross-platform auth model rather than reproducing the current cookie-plus-redirect flow.

The design should be:

1. Supabase client auth for native and Expo web
2. platform-aware session persistence
   - native uses device storage
   - web uses browser storage
3. root bootstrap logic that restores the session once and routes accordingly
4. auth route groups for signed-out surfaces
5. signed-in route groups for the application shell
6. Expo deep linking for auth callbacks instead of a Next callback route being the center of the flow

Current server redirects such as "go to login" or "go to import" should become client-side route-guard decisions in the Expo shell.

## Group Context Model

The current product relies on server-driven gating for current group access in several places. The Expo app should make group context explicit client state instead.

That means:

1. auth restore determines who the user is
2. group bootstrap determines what groups the user can access
3. app state tracks the current group
4. screens that require a current group redirect inside the app shell rather than through server-page redirects
5. group switching, players, and settings reuse the same client-held current group context

This makes the flow predictable on native and avoids rebuilding Next-specific page protection patterns.

## Data Access And Mutation Model

The new app should eliminate page-bound server actions from the active product path.

Data reads and writes should follow this rule:

1. if the operation is safe for a signed-in client under existing RLS, call Supabase directly through shared service functions
2. if the operation needs elevated trust, secret handling, or multi-step orchestration, move it into Supabase RPC or an Edge Function

This keeps the app consistent across native and web while preserving security boundaries.

Expected outcomes:

1. form submissions no longer depend on Next server actions
2. writes happen through shared service methods instead of page-local callbacks
3. auth-sensitive behavior depends on Supabase session state rather than Next cookies
4. secret-bearing logic does not move into the Expo client just because the old web implementation hid it behind a server action

## Import And Screenshot Workflow

The import workflow is the trickiest feature in the migration because it touches large text input, image intake, parsing, review, and persistence.

The design should preserve the product outcome while re-evaluating the runtime boundary:

1. shared parsing and review logic moves into `src/core`
2. evidence intake becomes platform-safe for native and web
3. screenshot upload and OCR-or-parsing coordination should use a service boundary that does not assume a browser-only file flow

If the current screenshot workflow depends too heavily on browser-local behavior, the rebuild should prefer moving that coordination to a service-side boundary rather than forcing native to imitate the web path.

The rule is: preserve feature behavior, not legacy implementation details.

## Web Target Strategy

The Expo app must support web, but it should still be designed as a native-first product.

That means:

1. Expo web is part of the main product contract, not a later add-on
2. the same navigation and feature model should run on web, with only narrow platform-specific affordance changes
3. the new Expo web target does not need to preserve the current Next route structure or page composition
4. the frozen Next app remains the legacy web reference until Expo web is ready to replace it

The end state is one Expo codebase that can ship to app stores and to the web, with the old Next app left behind.

## Migration Phases

### Phase 1: Freeze Point

1. let the two active tasks finish and land
2. treat that commit as the reference snapshot
3. stop adding new product behavior to the old Next app except for narrow maintenance fixes

### Phase 2: Expo Foundation

1. stand up Expo Router in the repo as the active app surface
2. configure providers, theme, environment loading, linking, and session bootstrap
3. create the signed-out and signed-in shells
4. verify iPhone, Android, and Expo web all boot successfully

### Phase 3: Shared-Core Extraction

1. move pure logic out of Next-bound files into `src/core`
2. keep the logic covered by framework-neutral tests
3. adapt the frozen Next app only when needed to consume extracted logic without changing behavior

### Phase 4: Feature Rebuild

Rebuild features in a native-first order:

1. auth and session restore
2. app shell and current-group context
3. log-game flow
4. profile
5. insights
6. group settings and players
7. import evidence and review flow
8. catalog and reference surfaces

### Phase 5: Parity Closure

1. compare behavior against the frozen Next baseline
2. close feature gaps
3. confirm the Expo app covers the required product surface on native and web
4. treat the Expo app as primary and the old Next app as archival reference

## Verification Strategy

The rebuild should verify parity at three layers.

### Shared-Core Verification

Use fast framework-neutral tests for:

1. validation
2. ranking
3. style inference
4. import parsing
5. draft shaping
6. analytics shaping

### Screen And Flow Verification

Use Expo-compatible component and screen tests for:

1. auth route guards
2. session restore behavior
3. group selection flows
4. log-game state progression
5. import review interactions
6. profile and insights rendering states

### Cross-Platform Acceptance Verification

For each milestone, verify the same critical path on:

1. iPhone
2. Android
3. Expo web

Critical paths should include:

1. login
2. current group selection
3. log game creation and completion
4. import evidence flow
5. profile rendering
6. insights rendering

Early in the migration, mobile acceptance can rely on repeatable smoke checks while the platform shell stabilizes. Once the shell and route structure settle, the project should add stronger native flow automation.

## Non-Goals

This migration does not aim to:

1. preserve the existing Next route tree
2. keep evolving the old web app as a co-equal product
3. move Next cookies or server actions into Expo through compatibility hacks
4. redesign the game rules or analytics rules during the platform migration
5. achieve a single-step big-bang cutover

## Success Criteria

The migration is successful when:

1. the new Expo codebase is the active product surface
2. the app ships from one codebase to iPhone, Android, and web
3. the main product surfaces reach near feature parity with the frozen Next reference
4. navigation and screen structure feel native-first rather than web-transplanted
5. the old Next app can remain frozen without blocking ongoing product development
