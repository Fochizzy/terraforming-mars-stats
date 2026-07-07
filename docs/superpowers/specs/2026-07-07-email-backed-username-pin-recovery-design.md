Date: 2026-07-07

# Email-Backed Username PIN Recovery Design

## Overview

This change keeps the user-facing `username + PIN` login model, but makes every new account register with a real recovery email. The real email becomes the Supabase auth email, while `username` remains the everyday login handle stored in `public.user_profiles` and auth metadata.

The login page gains a `Reset PIN` action. That flow accepts a username, resolves it to the stored recovery email on the server, and sends a Supabase recovery link without revealing whether the username exists. The recovery link returns the user to a dedicated reset-PIN screen where they choose a new 6-digit PIN.

This rollout also backfills the one existing legacy user, `Fochizzy`, with the real email `izzy.hodnett@gmail.com` so recovery works immediately for that account.

## Goals

1. Require a real email address when creating a new account.
2. Preserve `username + PIN` as the visible sign-in experience.
3. Add a `Reset PIN` button on the login page.
4. Send Supabase recovery emails using the stored real email for the username.
5. Keep legacy username sign-in working during the transition.
6. Backfill `Fochizzy` with `izzy.hodnett@gmail.com`.

## Non-Goals

1. Replacing Supabase Auth with a custom auth system.
2. Switching the product to email-first sign-in.
3. Redesigning group, roster, or game logging behavior.
4. Bulk-migrating every historical synthetic-email account in this change.
5. Adding a general profile-settings email-management screen in this pass.

## Product Decisions

### Account Credentials

Each new account must have:

1. a globally unique `username`
2. a required `full_name`
3. a required real `email`
4. a required 6-digit PIN

Users still sign in with:

1. `username`
2. `PIN`

The login screen should not require the user to remember or type their email for routine sign-in.

### Recovery Entry Point

The login page shows a single `Reset PIN` action in sign-in mode.

The reset flow starts from the username already typed into the form. If the username is blank, the UI should prompt the user to enter a username first rather than switching to an email-first recovery flow.

### Recovery Privacy

Recovery must not disclose whether:

1. a username exists
2. a recovery email is on file
3. the account is a legacy synthetic-email account

The response after requesting recovery should always be:

1. `If that account has a registered email, a recovery link has been sent.`

### Legacy Account Compatibility

Legacy accounts created under the synthetic-email model must keep working for username + PIN sign-in.

For this rollout:

1. `Fochizzy` is explicitly backfilled to a real email and becomes recovery-enabled immediately.
2. Other legacy synthetic-email accounts, if any exist, continue signing in through the fallback path but do not gain recovery until they are separately backfilled.

## Technical Approach

### Auth Identity Model

The current implementation derives the Supabase auth email from the username. That no longer works for recovery because reset emails must go to a real address.

For new accounts:

1. create the Supabase auth user with the real email
2. set the Supabase password to the chosen 6-digit PIN
3. write `username`, `full_name`, and normalized `email` into `public.user_profiles`
4. store `username` in auth user metadata so post-auth flows can resolve it without relying on synthetic emails

For legacy accounts:

1. keep the existing synthetic-email sign-in path available as a fallback
2. move specific users to real-email auth only when they are explicitly backfilled

### Server-Side Username Resolution

The browser must no longer translate username into an auth email directly.

Instead, introduce server-side auth entry points that:

1. normalize the provided username
2. resolve the login email using a privileged server lookup
3. attempt Supabase auth using the resolved real email when present
4. fall back to the synthetic email path for legacy accounts without a real stored email

This keeps the login experience unchanged while removing email lookup from the browser.

### Recovery Dispatch

Add a server-side recovery action that:

1. accepts a username
2. resolves the matching stored email with the same privileged lookup path
3. triggers Supabase `resetPasswordForEmail` using a redirect back into the app
4. always returns the same generic success message

If the username is unknown or the account still lacks a real email, the action returns the generic success message without sending anything.

### Recovery Callback Routing

The current callback route always exchanges the auth code and then redirects into the normal auth-complete path. Recovery links need a separate branch.

The callback flow should:

1. exchange the recovery or auth code for a session
2. detect recovery links and redirect them straight to the reset-PIN route
3. continue sending non-recovery auth links through the existing `/auth/complete` path

This prevents a recovery session from accidentally running the normal post-signup claim flow.

### Reset PIN Screen

Add a dedicated authenticated recovery page that:

1. confirms the user has a valid recovery session
2. collects a new 6-digit PIN
3. collects the same PIN again for confirmation
4. validates exact 6-digit format and match
5. updates the Supabase password
6. redirects the user back into the app after success

The reset screen does not ask for username or email again because the recovery session already identifies the account.

### Complete-Auth Session Handling

The current `completeAuthSession` logic derives usernames from synthetic auth emails. New accounts will no longer use those synthetic emails.

Update completion logic so it resolves usernames in this order:

1. `user.user_metadata.username` for new real-email accounts
2. synthetic-email parsing as a fallback for legacy accounts

That keeps profile creation and the existing saved-player claim flow intact for both account generations.

### Privileged Supabase Access

Use the existing service-role admin client for:

1. server-side username-to-email lookup
2. one-time auth-user backfill for `Fochizzy`

Do not expose direct email lookup to the client, and do not add a public browser-readable profile query for anonymous username resolution.

## Data Model Changes

### User Profiles

Extend `public.user_profiles` with:

1. `email text null`

Rules:

1. new accounts must write a normalized lowercase non-empty email
2. profile emails must be unique when present
3. existing rows may remain null until explicitly backfilled

Recommended constraint shape:

1. a unique index on `lower(email)` with `where email is not null`

### Auth Metadata

New account creation must include:

1. `full_name`
2. `username`

in auth user metadata so post-auth completion can rebuild or confirm the `user_profiles` row.

## UI Changes

### Create Account Mode

The create-account form should collect:

1. full name
2. username
3. email
4. 6-digit PIN

Helper copy should explain that the email is used for PIN recovery.

### Sign-In Mode

The sign-in form should continue to collect only:

1. username
2. PIN

Below the main submit button, add:

1. `Reset PIN`

### Reset PIN Request State

After recovery is requested, the form should show the generic success message in-place instead of navigating away immediately.

### Reset PIN Completion Screen

The reset screen should show:

1. a title explaining the user is setting a new PIN
2. new PIN and confirm-PIN inputs
3. validation feedback for non-6-digit or mismatched values
4. a success redirect back into the signed-in app

## Validation Rules

### Username

1. required
2. normalized with the existing username rules
3. unique across all accounts

### Email

1. required for new account creation
2. validated as a real email format
3. normalized to trimmed lowercase
4. unique across `user_profiles` when present

### PIN

1. new-account PIN: exactly 6 digits
2. reset-PIN value: exactly 6 digits
3. sign-in PIN: accept 6 digits for new accounts and allow the current legacy fallback path for older 4-digit accounts

## Failure Handling

### Sign-In Failures

The UI should continue to use one generic message:

1. `Unknown username or incorrect PIN.`

This keeps username existence private even when the server-side username lookup succeeds.

### Recovery Failures

If lookup or mail dispatch fails unexpectedly, the server logs the error and the UI still returns the generic success message unless the system is broadly unavailable.

### Signup Failures

Show clear messages for:

1. invalid email format
2. username already taken
3. email already in use
4. invalid PIN

### Reset Failures

Show clear messages for:

1. invalid or expired recovery session
2. mismatched PIN confirmation
3. invalid 6-digit PIN format
4. Supabase password update failure

## Backfill Plan

### Fochizzy

Run a one-time privileged update for the existing `Fochizzy` account:

1. set `public.user_profiles.email` to `izzy.hodnett@gmail.com`
2. update the matching Supabase auth user email to `izzy.hodnett@gmail.com`
3. preserve the existing username and account ownership
4. preserve immediate sign-in and recovery eligibility after the update

If the auth email update requires explicit confirmation-state preservation, the backfill path should set that at the same time so recovery works immediately after rollout.

## Migration Plan

1. add nullable `email` to `public.user_profiles`
2. add the partial unique email index
3. update auth helper validation to require email on create-account flows
4. add server-side username sign-in and recovery entry points
5. change new-account auth creation to use the real email instead of a synthetic one
6. update auth metadata and completion logic so usernames no longer depend on synthetic emails
7. add the recovery-aware callback branch
8. add the reset-PIN page and password-update flow
9. add the login-page `Reset PIN` button and request state
10. run the one-time `Fochizzy` backfill
11. deploy the coordinated auth change and verify live

## Testing Plan

### Auth Tests

1. create-account mode renders a required email field
2. signup sends the real email to Supabase auth creation
3. signup stores username metadata for completion
4. sign-in still accepts username + PIN only in the UI
5. sign-in resolves real-email accounts server-side
6. sign-in still falls back for legacy synthetic-email accounts

### Recovery Tests

1. reset request requires a username value on the form
2. reset request returns the generic success message for both found and not-found usernames
3. recovery dispatch calls Supabase recovery for real-email accounts
4. legacy no-email accounts do not reveal non-recovery state
5. recovery callback redirects to the reset-PIN route instead of `/auth/complete`
6. reset-PIN accepts matching 6-digit values and updates the password
7. reset-PIN rejects mismatched or invalid values

### Repository And Route Tests

1. profile email uniqueness is enforced
2. completion logic resolves username from metadata first and synthetic email second
3. the recovery route rejects malformed input safely
4. the login page keeps generic error and recovery messages

### Live Verification

1. create a new account with username, real email, and 6-digit PIN
2. request `Reset PIN` from the login screen
3. follow the recovery link into the reset screen
4. set a new 6-digit PIN and sign in successfully with it
5. verify `Fochizzy` can receive the recovery email after backfill

## Rollout Notes

This should ship as one coordinated auth change because registration, username sign-in, recovery dispatch, callback routing, and reset completion all depend on the same identity model.

Backward compatibility rules:

1. new accounts require a real email and a 6-digit PIN
2. old accounts keep working for sign-in during the transition
3. `Fochizzy` is explicitly upgraded in this rollout
4. recovery remains generic and non-enumerating at every stage
