# Email + PIN Login Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch auth from username plus PIN to email plus PIN, add reset-PIN recovery, and backfill the existing Fochizzy account email.

**Architecture:** Replace synthetic-email auth with direct Supabase email auth while keeping username in profile data and auth metadata for app identity. Extend the existing auth callback/completion flow with a recovery branch and a dedicated reset-PIN page, then add a profile-email migration and one-time privileged backfill for the existing user.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase Auth, Postgres migrations, Vitest, React Testing Library

---

### Task 1: Update auth validation primitives for email-first sign-in

**Files:**
- Modify: `src/features/auth/username-auth.ts`
- Modify: `src/features/auth/username-auth.test.ts`
- Modify: `src/features/auth/submit-username-auth.ts`
- Modify: `src/features/auth/submit-username-auth.test.ts`

### Task 2: Switch the login UI to email plus PIN and add reset-request behavior

**Files:**
- Modify: `src/features/auth/login-form.tsx`
- Modify: `src/features/auth/login-form.test.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/login/page.test.tsx`
- Create: `src/features/auth/request-pin-reset.ts`
- Create: `src/features/auth/request-pin-reset.test.ts`

### Task 3: Add recovery-aware callback routing and reset-PIN completion

**Files:**
- Modify: `src/app/auth/callback/route.ts`
- Modify: `src/app/auth/callback/route.test.ts`
- Create: `src/features/auth/reset-pin-form.tsx`
- Create: `src/features/auth/reset-pin-form.test.tsx`
- Create: `src/app/auth/reset-pin/page.tsx`
- Create: `src/app/auth/reset-pin/page.test.tsx`

### Task 4: Update auth completion to rebuild profile identity without synthetic emails

**Files:**
- Modify: `src/features/auth/complete-auth-session.ts`
- Modify: `src/features/auth/complete-auth-session.test.ts`
- Modify: `src/app/auth/complete/route.ts`
- Modify: `src/app/auth/complete/route.test.ts`
- Modify: `src/lib/db/user-profile-repo.ts`

### Task 5: Add profile email persistence and backfill support

**Files:**
- Create: `supabase/migrations/20260707120000_add_user_profile_emails.sql`
- Modify: `supabase/tests/core_schema_verification.sql`
- Modify: `src/lib/db/user-profile-repo.ts`
- Create: `scripts/backfill-fochizzy-email.mjs`

### Task 6: Verify the auth rollout and deploy

**Files:**
- Modify: `package.json`
- Create: `docs/superpowers/verification/2026-07-07-email-pin-login-recovery.md`

## Self-Review

### Spec Coverage

- Email-first sign-in, create-account email capture, and 6-digit PIN validation are covered by Tasks 1 and 2.
- Reset-PIN request, recovery callback branching, and reset completion are covered by Tasks 2 and 3.
- Username preservation and profile reconstruction without synthetic emails are covered by Task 4.
- `user_profiles.email` storage, uniqueness, Fochizzy backfill, and rollout verification are covered by Tasks 5 and 6.

### Placeholder Scan

- No `TODO`, `TBD`, or deferred placeholders remain.

### Type Consistency

- The plan consistently treats email as the auth credential, PIN as the password, and username as profile metadata rather than a login identifier.
