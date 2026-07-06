Date: 2026-07-06

# Email-Backed Username PIN Recovery Design

## Overview

This change keeps the user-facing `username + 4-digit PIN` sign-in model, but requires a real email address when creating an account so recovery can work immediately. The real email becomes the account's Supabase auth email, while `username` remains the public login handle stored in `public.user_profiles`.

The recovery experience stays simple:

1. `Forgot Password`
2. `Forgot PIN`

Both entries resolve to the same email-based recovery flow because the current PIN is the Supabase password under the hood.

## Goals

1. Require a real email address when creating a new account.
2. Preserve `username + 4-digit PIN` as the visible sign-in experience.
3. Let `Forgot Password` and `Forgot PIN` work immediately after account creation.
4. Keep the existing Supabase session model and `auth.uid()`-based RLS intact.
5. Avoid exposing whether a username exists when recovery is requested.

## Non-Goals

1. Replacing Supabase Auth with a custom auth system.
2. Requiring email verification before recovery is allowed.
3. Requiring email-based sign-in instead of username-based sign-in.
4. Redesigning group, roster, or game logging behavior.
5. Migrating every existing synthetic-email account to a real email in this change.

## Product Decisions

### Sign-In Credentials

Each account must have:

1. a globally unique `username`
2. a required `full_name`
3. a required real `email`
4. a 4-digit PIN

Users sign in with:

1. `username`
2. `PIN`

The login screen should not require the user to remember or type their email for everyday sign-in.

### Recovery Entry Points

The login page shows both:

1. `Forgot Password`
2. `Forgot PIN`

These are separate user-facing labels, but they trigger the same backend recovery action because both ultimately reset the Supabase password.

### Immediate Recovery

Recovery works as soon as the account is created. The user does not need to click a verification link first.

### Existing Accounts

Accounts that were created under the older synthetic-email model may continue signing in with username and PIN. However, recovery links should stay unavailable for those accounts until a real email is registered on the profile and the auth account is updated to match.

## Technical Approach

### Auth Identity Model

The current implementation stores a synthetic auth email derived from `username`. That needs to change for new accounts.

For new accounts:

1. create the Supabase auth user with the real email address
2. set the Supabase password to the chosen 4-digit PIN
3. write the normalized `username`, `full_name`, and `email` into `public.user_profiles`

For sign-in:

1. the browser submits `username` and `PIN`
2. a server-side auth entry point resolves the normalized username to the stored real email
3. the server authenticates against Supabase using `email + PIN`
4. the existing session and middleware behavior continue unchanged

This preserves the current session model while removing the dependency on synthetic emails for newly created accounts.

### Recovery Lookup

Recovery should also resolve by username rather than by asking the user for email.

Flow:

1. the user enters a username
2. the server looks up the matching profile
3. if a real email is registered, the server triggers Supabase password recovery for that email
4. the UI always returns a generic success message whether or not the username exists

Recommended message:

1. `If that account has a registered email, a recovery link has been sent.`

### Reset PIN Screen

The recovery email should redirect back into the app on a dedicated reset route. That route should:

1. confirm the user has an active recovery session
2. collect a new 4-digit PIN
3. validate the PIN against the existing `^\d{4}$` rule
4. update the Supabase password
5. redirect the user back into the signed-in app after success

`Forgot Password` and `Forgot PIN` both land on this same reset-PIN experience.

### Server-Side Supabase Use

Because username lookup and recovery mail should not happen in the browser, this change should use server-side Supabase helpers:

1. the existing authenticated server client for session-aware actions
2. the existing service-role admin client when recovery or account maintenance requires privileged auth access

The browser should never receive a profile-based email lookup result directly.

## Data Model Changes

### User Profiles

Add a real email field to `public.user_profiles`:

1. `email text null` initially for backward compatibility

Then tighten usage rules:

1. new accounts must write a non-empty normalized email
2. emails should be unique at the profile level
3. existing rows may stay null until the account owner adds a real email

The profile table becomes the app-level source for:

1. username lookup
2. full name display
3. recovery eligibility

### Auth Account Alignment

For new accounts, `user_profiles.email` and `auth.users.email` should match.

For legacy synthetic-email accounts that later add a real email:

1. update `user_profiles.email`
2. update `auth.users.email`
3. only then expose recovery actions for that account

## UI Changes

### Create Account Mode

The create-account form should collect:

1. full name
2. username
3. real email
4. 4-digit PIN

Copy should explain that the email is used for account recovery.

### Sign-In Mode

The sign-in form should continue to collect only:

1. username
2. 4-digit PIN

Below the form, add:

1. `Forgot Password`
2. `Forgot PIN`

If recovery is requested without a username value, the form should ask for a username first rather than opening a separate email-first recovery flow.

### Recovery Status

The UI must not reveal whether a username exists, whether the account has a real email, or whether the email matches a specific person. Recovery responses should stay generic.

### Legacy Account Messaging

If a signed-in legacy account reaches profile settings without a real email on file, the profile page should prompt them to add one so recovery becomes available.

## Validation Rules

### Username

1. required
2. normalized with the existing username rules
3. unique across all accounts

### Email

1. required for new account creation
2. validated as a real email format
3. unique across profiles
4. stored in normalized lowercase-trimmed form

### PIN

1. exactly 4 digits
2. required for sign-in
3. required for account creation
4. required again on the reset-PIN screen

## Failure Handling

### Sign-In Failures

The UI should continue to use a single generic error:

1. `Unknown username or incorrect PIN.`

This keeps username existence private and avoids leaking whether the email lookup succeeded.

### Recovery Failures

If recovery lookup, email dispatch, or legacy-account checks fail unexpectedly, the server should log the failure and the user should still see the generic recovery success message unless the failure is systemic enough that no recovery mail could be attempted at all.

### Signup Failures

Show clear messages for:

1. invalid email format
2. username already taken
3. email already in use
4. invalid PIN

## Migration Plan

1. add nullable `email` to `public.user_profiles`
2. backfill nothing for synthetic-email accounts
3. add profile uniqueness rules for real emails
4. change signup to require `full_name`, `username`, `email`, and `PIN`
5. change new-account auth creation to use the real email rather than a synthetic one
6. move username sign-in through a server-side username-to-email lookup
7. add recovery action(s) that resolve username to email and send Supabase recovery mail
8. add a reset-PIN route that completes recovery by setting a new 4-digit password
9. add a profile prompt for legacy accounts that still lack a registered email

## Testing Plan

### Auth Tests

1. create-account mode renders a required email field
2. signup sends the real email to Supabase auth creation
3. signup stores the same email in `user_profiles`
4. sign-in still accepts username and PIN only
5. sign-in uses server-side username resolution before authenticating

### Recovery Tests

1. recovery requires a username input
2. recovery returns the generic success message for both found and not-found usernames
3. recovery triggers Supabase password recovery for accounts with a real email
4. legacy synthetic-email accounts do not expose live recovery until a real email is added
5. reset-PIN accepts a valid 4-digit PIN and updates the account password
6. reset-PIN rejects invalid non-4-digit values

### Repository And Route Tests

1. username lookup returns the correct real email for normalized usernames
2. duplicate email signup is rejected cleanly
3. reset route rejects missing or invalid recovery sessions
4. signed-in profile state reflects whether recovery is enabled

## Rollout Notes

This should ship as one coordinated auth change because signup, sign-in lookup, recovery, and profile email state all depend on the same identity model. The main backward-compatibility rule is:

1. old accounts keep working for username + PIN sign-in
2. new accounts require a real email immediately
3. recovery is only enabled for accounts that have a real registered email
