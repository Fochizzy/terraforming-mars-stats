Date: 2026-07-07

# Email + PIN Login And Recovery Design

## Overview

This change switches the app from `username + PIN` sign-in to `email + PIN` sign-in. Username remains part of the account model for display, saved-player matching, and group-facing identity, but it is no longer used as the auth credential.

The login page gains a `Reset PIN` action. Because sign-in is now email-first, recovery becomes straightforward: the user enters their email, Supabase sends a recovery link, and the app redirects that recovery session into a dedicated reset-PIN screen where the user chooses a new 6-digit PIN.

This rollout also backfills the only existing user, `Fochizzy`, so their account email becomes `izzy.hodnett@gmail.com` and recovery works immediately after deploy.

## Goals

1. Switch sign-in from username-based to email-based.
2. Require a real email address for all new registrations.
3. Add a `Reset PIN` action on the login page.
4. Support PIN reset through Supabase recovery emails.
5. Preserve username as an app identity field even though it is no longer the auth credential.
6. Backfill `Fochizzy` to `izzy.hodnett@gmail.com`.

## Non-Goals

1. Replacing Supabase Auth with a custom auth system.
2. Preserving username-first login.
3. Redesigning group, roster, or game logging flows.
4. Adding a full account-settings email-management feature in this pass.
5. Migrating a large population of existing auth users beyond the explicitly named `Fochizzy` account.

## Product Decisions

### Sign-In Credentials

Each account has:

1. a required `email`
2. a required `username`
3. a required `full_name`
4. a required 6-digit PIN

Users sign in with:

1. `email`
2. `PIN`

Users do not sign in with username anymore.

### Registration Fields

Create-account mode collects:

1. full name
2. username
3. email
4. 6-digit PIN

Username remains visible in the product for player identity and app context, but not for authentication.

### Recovery Entry Point

The login page shows a single `Reset PIN` action in sign-in mode.

Recovery uses the same email the user signs in with. If the email input is blank, the UI asks the user to enter their email first.

### Recovery Privacy

The recovery request should not reveal whether an email exists in the system. The response after requesting reset should always be:

1. `If that email is registered, a recovery link has been sent.`

### Existing Accounts

This rollout assumes `Fochizzy` is the only existing account that needs migration. That account is backfilled to the real email `izzy.hodnett@gmail.com`.

If any other legacy synthetic-email auth users still exist, they are out of scope for this rollout and must be migrated separately before they can use email-first sign-in.

## Technical Approach

### Auth Identity Model

The current implementation derives auth identity from a synthetic username email. That complexity is removed.

For all new accounts:

1. create the Supabase auth user with the real email
2. set the Supabase password to the chosen 6-digit PIN
3. store `full_name` and `username` in auth user metadata
4. store `email`, `username`, and `full_name` in `public.user_profiles`

For the existing migrated account:

1. update `auth.users.email`
2. update `public.user_profiles.email`
3. preserve the existing user id, username, and account ownership

### Sign-In Path

The browser submits:

1. `email`
2. `PIN`

The client signs in directly with Supabase `signInWithPassword({ email, password: pin })`.

No username lookup or synthetic-email fallback remains in the runtime auth flow after this switch.

### Recovery Dispatch

The recovery request uses the email already typed into the login form.

The simplest path is:

1. validate the email format client-side
2. call Supabase `resetPasswordForEmail(email, { redirectTo })`
3. always show the generic success message

No privileged username-to-email lookup is needed anymore.

### Recovery Callback Routing

The current auth callback always redirects to the normal auth-complete path. Recovery links need a separate branch.

The callback flow should:

1. exchange the recovery or auth code for a session
2. detect recovery links
3. redirect recovery sessions to the reset-PIN route
4. continue sending normal auth links through `/auth/complete`

This keeps reset-PIN isolated from the normal post-signup claim flow.

### Reset PIN Screen

Add a dedicated authenticated recovery page that:

1. confirms the user has a valid recovery session
2. collects a new 6-digit PIN
3. collects the same PIN again for confirmation
4. validates format and match
5. updates the Supabase password
6. redirects back into the signed-in app after success

The reset screen does not ask for email again because the recovery session already identifies the account.

### Complete-Auth Session Handling

The current `completeAuthSession` logic tries to derive usernames from synthetic auth emails. After the switch, that should stop being the primary source.

Update completion logic so it resolves account identity in this order:

1. `user.user_metadata.username`
2. existing `user_profiles` row by `user.id`

Synthetic-email parsing should be removed from the mainline design and kept only if required temporarily during the one-time Fochizzy migration verification.

## Data Model Changes

### User Profiles

Extend `public.user_profiles` with:

1. `email text null`

Migration behavior:

1. add the column as nullable first for safe rollout
2. backfill `Fochizzy`
3. require email for all new inserts and updates created through the app

Recommended constraint:

1. a unique index on `lower(email)` where `email is not null`

### Auth Metadata

New account creation should store:

1. `full_name`
2. `username`

in auth user metadata so the completion route can rebuild missing profile rows without depending on email parsing.

## UI Changes

### Sign-In Mode

Sign-in mode should collect only:

1. email
2. 6-digit PIN

Below the main submit button, add:

1. `Reset PIN`

### Create Account Mode

Create-account mode should collect:

1. full name
2. username
3. email
4. 6-digit PIN

Helper copy should explain that the email is used for sign-in and PIN recovery.

### Reset Request State

After a recovery request, show the generic success message in-place instead of navigating away immediately.

### Reset PIN Completion Screen

The reset screen should show:

1. a title explaining the user is setting a new PIN
2. new PIN and confirm-PIN inputs
3. validation feedback for invalid or mismatched values
4. a success redirect back into the signed-in app

## Validation Rules

### Email

1. required for sign-in
2. required for create-account
3. validated as a real email format
4. normalized to trimmed lowercase before storage and auth submission

### Username

1. required for create-account
2. normalized with the existing username rules
3. unique across all accounts

### PIN

1. sign-in PIN: exactly 6 digits
2. create-account PIN: exactly 6 digits
3. reset-PIN value: exactly 6 digits
4. reset-PIN confirmation must match exactly

## Failure Handling

### Sign-In Failures

Use one generic sign-in error:

1. `Unknown email or incorrect PIN.`

### Recovery Failures

Even if the email does not exist or the recovery attempt fails in a recoverable way, the user should still see:

1. `If that email is registered, a recovery link has been sent.`

Unexpected system failures should still be logged.

### Signup Failures

Show clear messages for:

1. invalid email format
2. email already in use
3. username already taken
4. invalid PIN

### Reset Failures

Show clear messages for:

1. invalid or expired recovery session
2. mismatched PIN confirmation
3. invalid 6-digit PIN format
4. password update failure

## Backfill Plan

### Fochizzy

Run a one-time privileged update for the existing `Fochizzy` account:

1. set `public.user_profiles.email` to `izzy.hodnett@gmail.com`
2. update the matching Supabase auth user email to `izzy.hodnett@gmail.com`
3. preserve the existing `user_id`
4. preserve the existing `username`
5. verify the migrated account can request and receive a recovery email

If the auth email update requires confirmation-state handling to keep recovery available immediately, include that as part of the backfill procedure.

## Migration Plan

1. add nullable `email` to `public.user_profiles`
2. add the partial unique email index
3. update create-account validation to require email
4. switch the login form from username to email
5. switch sign-in auth calls from synthetic-email generation to direct email sign-in
6. add the recovery request flow using `resetPasswordForEmail`
7. add the recovery-aware callback branch
8. add the reset-PIN route and UI
9. update completion logic to rely on metadata/profile identity instead of synthetic-email parsing
10. run the one-time `Fochizzy` backfill
11. deploy and verify the email-first auth flow live

## Testing Plan

### Auth Tests

1. sign-in mode renders email and PIN fields
2. create-account mode renders full name, username, email, and PIN
3. sign-in submits `email + PIN` to Supabase
4. create-account submits the real email to Supabase auth creation
5. create-account stores username metadata for profile completion
6. duplicate email and duplicate username failures render correctly

### Recovery Tests

1. reset request requires an email value in the form
2. reset request calls `resetPasswordForEmail` with the correct redirect
3. reset request always returns the generic success message
4. recovery callback redirects to the reset-PIN route
5. reset-PIN accepts matching 6-digit values and updates the password
6. reset-PIN rejects invalid or mismatched values

### Repository And Route Tests

1. profile email uniqueness is enforced
2. completion logic rebuilds or confirms profile identity from metadata
3. reset callback handling does not fall into the normal auth-complete branch
4. the login page copy consistently uses email-first wording

### Live Verification

1. create a new account with full name, username, email, and 6-digit PIN
2. sign out and sign back in with email + PIN
3. request `Reset PIN`
4. follow the recovery link into the reset screen
5. set a new 6-digit PIN and sign in successfully with it
6. verify `Fochizzy` can receive the recovery email after backfill

## Rollout Notes

This should ship as one coordinated auth change because sign-in fields, signup, recovery dispatch, callback routing, and reset completion all depend on the same email-first identity model.

Key rollout assumptions:

1. `Fochizzy` is the only existing user that needs migration in this rollout
2. email becomes the only supported login credential after deploy
3. username remains part of the app data model, but not the auth flow
