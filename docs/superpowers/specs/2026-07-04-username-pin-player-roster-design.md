Date: 2026-07-04

# Username PIN Auth And Group Player Roster Design

## Overview

This change replaces email magic-link login with username plus 4-digit PIN authentication while preserving the existing Supabase session model and `auth.uid()`-based Row Level Security. It also expands game player entry so a logger can either select an existing player from the active group roster or type a new full name. Typed names that do not already exist in the active group are automatically added to that group's recurring roster during draft save or finalization.

The design keeps users and players as distinct concepts:

1. `users` are signed-in identities with a global username and full name.
2. `players` are group-scoped roster entries used by logged games.
3. a `player` may optionally link back to a signed-in `user`.

## Goals

1. Let people sign in with a known username and 4-digit PIN.
2. Keep the current Supabase-backed session and RLS approach intact.
3. Allow one signed-in person to belong to multiple groupings.
4. Let any signed-in group member add players while logging a game.
5. Allow game logging to create missing group players automatically from typed full names.
6. Keep player tracking scoped to the active group.

## Non-Goals

1. Replacing Supabase Auth with a custom session system.
2. Making players global across all groups.
3. Requiring group selection on the login screen.
4. Adding email verification or password-reset flows in this change.

## Product Decisions

### Login Credentials

Each signed-in user has:

1. a globally unique `username`
2. a required `full_name` in `First Name Last Name` format
3. a 4-digit PIN used for login

The user-facing login form accepts only `username` and `PIN`.

### Group Membership

Users may belong to multiple groups. Login does not ask for a group name or invite code. After sign-in, the app resolves an active group from the user's saved preference and allows switching between groups from the authenticated app shell.

### Player Entry

During game logging, a user can:

1. select an existing player from the active group's roster
2. type a new full name when the player is not yet listed

If a typed full name does not already exist in the active group after normalization, the save flow creates a new `players` row for that group automatically.

### Group Permissions

Any signed-in member of a group may:

1. log games
2. add missing players while logging a game
3. add players directly from the group roster page

Owner-only behavior remains limited to group settings and membership management.

## Technical Approach

### Auth Strategy

The app keeps Supabase Auth and existing session middleware. The login experience changes, but the underlying session still resolves to a normal `auth.users.id`.

Implementation shape:

1. add an app-level user profile table keyed by `auth.users.id`
2. store `username`, `full_name`, and `last_active_group_id` in that profile table
3. authenticate through Supabase using a synthetic internal email derived from the username
4. use the 4-digit PIN as the Supabase password

This preserves:

1. `supabase.auth.getUser()`
2. protected route middleware
3. existing `auth.uid()`-based RLS policies
4. the current server-action and repository patterns

### Active Group Resolution

The current implementation chooses the earliest group membership. That behavior must be replaced.

New resolution order:

1. use `last_active_group_id` if it still matches one of the user's memberships
2. otherwise fall back to the earliest available membership
3. persist the fallback group as the new `last_active_group_id`

The authenticated shell adds a lightweight group switcher. Switching groups updates `last_active_group_id` and refreshes all group-scoped pages against the new group.

## Data Model Changes

### User Profiles

Add a table such as `public.user_profiles` with:

1. `user_id uuid primary key references auth.users(id) on delete cascade`
2. `username text not null unique`
3. `full_name text not null`
4. `last_active_group_id uuid null references public.groups(id) on delete set null`
5. `created_at timestamptz not null default now()`
6. `updated_at timestamptz not null default now()`

Rules:

1. `username` is globally unique
2. `full_name` must validate as a two-word or greater full name
3. users may change active group without affecting membership rows

### Players

Keep `public.players` as the canonical group roster table, with one important strengthening change: names must normalize uniquely within a group.

Implementation options:

1. add a stored normalized-name column and a unique constraint on `(group_id, normalized_display_name)`, or
2. keep normalization in SQL and enforce an equivalent unique index

Design requirement:

1. `Friday Mars`, ` friday mars `, and `FRIDAY   MARS` must resolve to one player in the same group
2. the same full name may exist in different groups
3. `linked_user_id` remains optional and continues supporting profile analytics

## UI Changes

### Login Page

Replace the email magic-link copy and controls with:

1. a username input
2. a 4-digit PIN input
3. clear error feedback for unknown username or invalid PIN

The login page no longer references email delivery or verification.

### App Shell

Add an active-group switcher for users with multiple memberships. Users with only one group do not need extra friction.

### Group Roster Page

The roster page continues to support direct player creation, but it shares the same full-name validation and normalization rules as the game flow.

### Log Game Players Step

The current player step is checkbox-based and only supports existing `selectedPlayerIds`. It should move to a seat-based entry model.

Each seat supports:

1. selecting an existing roster player
2. typing a full name for a new player
3. showing the resolved display name once saved

The number of seats still respects `playerCount`.

## Draft And Finalization Model

### Draft Shape

The current draft schema stores only `selectedPlayerIds`. That is not sufficient for unsaved typed names.

Replace this with a seat model that can persist either:

1. a resolved `playerId`, or
2. an unresolved typed `displayName`

This allows cloud drafts to preserve in-progress player entry without creating player rows prematurely on every change.

### Player Resolution On Save

Both draft save and finalization resolve seats server-side:

1. load the active group's current roster
2. normalize each typed full name
3. reuse an existing player if the normalized name already exists in the active group
4. otherwise create a new group player row
5. continue the existing game write pipeline with resolved player IDs

This resolution must happen inside the same server action as the game save to keep roster creation and game persistence consistent.

### Duplicate Protection

The save pipeline blocks:

1. selecting the same saved player more than once in one game
2. typing the same normalized name more than once in one game
3. mixing a saved player and a typed alias that normalize to the same active-group player in one game

## Validation Rules

### Username

1. required
2. trimmed
3. globally unique
4. constrained to a stable character set suitable for login

### PIN

1. exactly 4 digits
2. required for login
3. used only to authenticate as a user

### Full Name

1. required
2. trimmed
3. at least two words
4. stored and displayed in `First Name Last Name` style

## Failure Handling

### Login Failures

Show clear messages for:

1. username not found
2. incorrect PIN
3. username already taken during profile creation

### Save Failures

Show clear messages when:

1. a typed name is malformed
2. duplicate players are selected in the same game
3. player resolution fails unexpectedly
4. the game no longer has a valid active group context

### Concurrency

If two people create the same new player name in the same group at the same time, the group-scoped unique normalized-name constraint should ensure only one row survives. The loser request should re-read and reuse the existing row.

## Migration Plan

1. add the new `user_profiles` table and supporting RLS
2. add player-name normalization support and the group-scoped uniqueness rule
3. backfill existing signed-in users with usernames, full names, and optional `last_active_group_id`
4. link existing `players.linked_user_id` rows where matches are known
5. replace email login UI and auth helpers with username plus PIN
6. add active-group switching
7. change the log-game draft schema and resolution pipeline to support typed-or-selected seats
8. update roster entry to share the same name-validation rules

## Testing Plan

### Auth Tests

1. login page renders username and PIN controls
2. username plus valid PIN signs in successfully
3. unknown username shows a clear error
4. invalid PIN shows a clear error

### Group Context Tests

1. `last_active_group_id` is preferred when valid
2. earliest membership is used only as a first-login fallback
3. switching groups updates active context correctly

### Player Entry Tests

1. log-game player entry supports selecting existing players
2. typed names survive draft save and reload
3. typed names auto-create roster players on save
4. duplicate normalized names in the same game are rejected

### Repository Tests

1. draft save resolves typed seats into group players safely
2. finalization resolves typed seats before writing `game_players`
3. concurrent duplicate-name creation reuses the existing player

## Rollout Notes

This should ship as one coordinated change set because login, active-group resolution, roster creation, and draft persistence all depend on the same identity model. A partial rollout would leave mismatched assumptions between auth, game entry, and server persistence.
