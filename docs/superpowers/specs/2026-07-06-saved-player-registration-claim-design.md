Date: 2026-07-06

# Saved Player Registration Claim Design

## Goal

Let a newly registered account automatically claim a saved player profile that previously existed only as a roster player in other people's games, and require new unregistered players to be entered with a full first-and-last name so they remain claimable later.

## Product Decisions

1. Shared roster players remain the source of truth for historical game participation.
2. Unregistered players must continue to be entered as a full name in `First Name Last Name` format.
3. Account creation should try to auto-claim an existing saved player profile before asking the user to do anything manual.
4. Auto-claim may only happen when there is exactly one safe exact match.
5. Claiming a saved player during registration also adds the new user to that player's group automatically.
6. When auto-claim is not safe, the app should route the user into a narrow manual claim step instead of guessing.
7. Manual claim must only expose candidate players derived from the signed-in user's own full name, not a general searchable roster browser.

## Goals

1. Preserve prior game history for people who were logged as unregistered players before they created an account.
2. Make account creation feel automatic when the match is obvious.
3. Avoid claiming the wrong person when duplicate or ambiguous names exist.
4. Keep the existing username plus 4-digit PIN auth model.
5. Keep saved player creation during game logging simple for any signed-in member.

## Non-Goals

1. Replacing the current auth system.
2. Making players global across all groups.
3. Creating a broad invitations or approval workflow.
4. Letting users browse or search arbitrary groups during signup.
5. Auto-creating new player rows during claim resolution.

## Existing Constraints

1. `players` are group-scoped, and historical games point at `players.id`.
2. A brand-new signed-in user cannot reliably insert themselves into `group_members` through the normal member-gated RLS path because they are not yet in the group.
3. `players.linked_user_id` already supports linking a roster player to a signed-in user.
4. `user_profiles` already stores `full_name`, `username`, and `last_active_group_id`.
5. The current roster and log-game flows already validate typed player names as full names.

## Core User Flow

### Unregistered Player Entry

When someone logs a game with a player who does not yet have an account:

1. the logger may still type that player's name directly
2. the name must validate as a full name
3. the existing save flow still creates or reuses the active-group `players` row

This preserves the current roster-building workflow while keeping the future claim surface registration-ready.

### Account Creation

During `Create Account`, the user provides:

1. `Full Name`
2. `Username`
3. `4-Digit PIN`

After the auth account and `user_profiles` row exist, the app runs the shared claim-resolution flow.

### Auto-Claim

If the signed-in user's full name has exactly one unlinked exact match across saved players:

1. claim that player
2. add the user to the matched group as an `editor`
3. set `user_profiles.last_active_group_id`
4. continue into the app with the claimed group active

### Manual Claim

If the signed-in user's full name does not have exactly one safe exact match:

1. route the user to `/claim-player`
2. show only relevant unlinked candidates derived from the user's own name
3. let the user claim one candidate or skip for now

If the user skips, the account remains usable, but the app continues to prompt them from claim-aware signed-in surfaces until they link a player later.

## Match Rules

### Exact Match

Auto-claim only uses normalized exact full-name matches against unlinked `players.display_name`.

Normalization should match the existing roster behavior:

1. trim surrounding whitespace
2. collapse repeated internal whitespace
3. lowercase
4. compare through the same normalized-name semantics already used for players

### Manual Candidate Matches

The manual claim page may show:

1. exact unlinked full-name matches first
2. conservative partial matches second, such as token-prefix matches

Manual candidate ranking exists only to help the user choose. It must not silently auto-claim a partial match.

### Conflict Rules

The claim flow must refuse to auto-claim when:

1. more than one unlinked exact match exists
2. the matched player is already linked to another user
3. the linking or membership write would conflict

## Technical Approach

### Post-Auth Completion Route

Introduce a server-owned post-auth completion route so both signup outcomes use the same server-side claim logic:

1. when signup creates an immediate session, the client redirects to a server route such as `/auth/complete?next=...`
2. when signup completes through the Supabase email callback, the existing callback route redirects through the same completion logic before entering the app

This keeps claim resolution off the client and avoids duplicating privileged logic in multiple auth paths.

### Claim Execution Surface

Use a dedicated security-definer SQL claim path for the durable state change, not a client-side sequence of table writes.

The design should add:

1. a lookup surface that returns claimable candidates for the current signed-in user
2. an atomic claim surface that performs the actual link-and-join operation

The exact split may be:

1. `public.list_claimable_player_profiles(...)`
2. `public.claim_player_profile(...)`

or an equivalent pair of SQL functions, but the actual claim write must be atomic and server-owned.

### Automatic Claim Resolver

Add a single server helper that:

1. reads the signed-in user's `full_name`
2. asks the claim lookup surface for candidates
3. auto-claims only when there is exactly one exact candidate
4. otherwise returns `needs-manual-claim`

This helper should be the one shared path used by:

1. immediate signup completion
2. email callback completion
3. any future retry entry point

### Atomic Claim Behavior

The atomic claim operation should:

1. verify the target player is still unlinked
2. verify the current signed-in user is the user being linked
3. insert or upsert a `group_members` row for the matched group with role `editor`
4. set `players.linked_user_id = auth.uid()`
5. update `user_profiles.last_active_group_id` to the claimed group
6. return the claimed `group_id`, `group_name`, and `player_name`

The operation must not clear links in other groups. A user may still have linked players in multiple groups over time.

## UI Changes

### Login And Signup

The signup form keeps its current fields and validation, but successful signup should no longer jump directly into the app. It should pass through the server-owned post-auth completion path first.

### Claim Player Page

Add a signed-in page such as `/claim-player` with:

1. a short explanation of why the app found possible saved player profiles
2. one row per candidate
3. `player name`
4. `group name`
5. a claim button per row
6. a skip-for-now action

This page should only render candidates returned for the current user's own full name.

### No-Group Signed-In State

The current signed-in UX assumes a group context in several places. That is not sufficient for an account that exists but has not yet claimed or joined a group.

This design therefore requires:

1. a signed-in no-group fallback that points to `/claim-player`
2. a claim prompt on `/profile` instead of an immediate redirect dead end when the user has no active group

`/group/players` may continue to be group-bound, but `/profile` and the claim page must give the user a clear next step when no group is active yet.

## Auth Result States

The auth and completion flow should resolve into explicit result states:

1. `signed-in`
2. `awaiting-email`
3. `claimed-and-joined`
4. `needs-manual-claim`
5. `error`

These states exist so the client can route intentionally instead of inferring behavior from missing group context.

## Data And Security Boundaries

1. Candidate lookup must only reveal unlinked players that are relevant to the signed-in user's own full name.
2. Manual claim should expose only the minimal fields needed to choose safely, such as player name and group name.
3. Claim writes must not rely on the user's normal `group_members` permissions because a new user is not yet a member.
4. The claim path must reject already-linked players even if the UI candidate list has gone stale.

## Failure Handling

### Auto-Claim Failure

If automatic claim cannot proceed safely, return `needs-manual-claim` rather than a generic error whenever possible.

### Manual Claim Failure

Show clear messages when:

1. the selected player was already claimed moments earlier
2. the group join failed
3. the account profile could not be updated

The user should be able to refresh the claim page and retry.

### Skip Behavior

Skipping manual claim must not block the account from existing, but it may leave the user without an active group. In that state, the app should continue offering the claim flow rather than pretending a normal group dashboard is available.

## Testing Plan

### Auth And Completion Tests

1. signup with a single exact unlinked match routes through completion and auto-claims successfully
2. signup with multiple exact matches routes to `needs-manual-claim`
3. signup with no exact match but partial candidates routes to `needs-manual-claim`
4. existing sign-in behavior remains intact for already-linked users

### Claim Repository Or RPC Tests

1. claiming an unlinked player links the player, inserts group membership, and sets `last_active_group_id`
2. claiming rejects already-linked players
3. claiming is safe when the user already has membership in the matched group
4. claiming does not remove links from other groups

### UI Tests

1. the claim page renders exact and partial candidates with group names
2. choosing a candidate completes the link and redirects into the claimed group
3. skipping leaves the account signed in and shows a clear follow-up prompt
4. `/profile` renders a claim CTA instead of a dead-end redirect when no group is active

### Existing Flow Regression Tests

1. log-game typed names still require first and last name
2. roster add-player still requires first and last name
3. unregistered typed names remain claimable later through the same normalization rules

## Rollout Notes

This should ship as one coordinated change set because auth completion, player claim resolution, group membership bootstrapping, and no-group signed-in routing all depend on the same behavior contract.
