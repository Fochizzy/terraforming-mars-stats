# Email-Backed Username PIN Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require a real email address at account creation, keep `username + 4-digit PIN` as the visible login, and make `Forgot Password` / `Forgot PIN` work immediately through email-based recovery.

**Architecture:** Keep Supabase Auth sessions and `auth.uid()`-based RLS, but stop using synthetic emails for new accounts. Route unauthenticated sign-in, sign-up, and recovery through server-side App Router handlers so username-to-email lookup stays off the client, then reuse `/auth/callback?next=/reset-pin` to exchange the recovery link for a session before the user sets a new 4-digit PIN.

**Tech Stack:** Next.js App Router, React 19, Supabase Auth/SSR, Supabase admin client, Supabase SQL migrations, Vitest, Testing Library, Zod.

---

## File Map

- Create: `supabase/migrations/20260706160000_add_profile_email_for_recovery.sql`
  Purpose: add a nullable `email` column to `public.user_profiles`, enforce uniqueness for real emails, and leave legacy synthetic-email rows untouched.
- Modify: `supabase/config.toml`
  Purpose: align the local Supabase password minimum with the product's 4-digit PIN rule.
- Modify: `src/features/auth/username-auth.ts`
  Purpose: add normalized email validation and reusable synthetic-email detection for legacy-account fallback.
- Modify: `src/features/auth/username-auth.test.ts`
  Purpose: prove real-email normalization and synthetic-email detection stay stable.
- Modify: `src/lib/db/user-profile-repo.ts`
  Purpose: persist profile emails, resolve a username to the correct auth email, and expose the signed-in user's recovery email state.
- Create: `src/lib/db/user-profile-repo.test.ts`
  Purpose: cover username lookup, synthetic-email fallback, and profile email updates with mocked Supabase clients.
- Modify: `src/lib/supabase/admin.ts`
  Purpose: clarify the service-role error message now that auth recovery depends on it too.
- Create: `src/app/auth/sign-in/route.ts`
- Create: `src/app/auth/sign-in/route.test.ts`
  Purpose: resolve username to email on the server and establish a Supabase session without exposing email lookups to the browser.
- Create: `src/app/auth/sign-up/route.ts`
- Create: `src/app/auth/sign-up/route.test.ts`
  Purpose: create a real-email Supabase user, insert the profile row, and reject duplicate usernames or emails cleanly.
- Create: `src/app/auth/recovery/route.ts`
- Create: `src/app/auth/recovery/route.test.ts`
  Purpose: send generic username-based recovery responses while only dispatching real recovery mail when an email is registered.
- Create: `src/app/auth/reset-pin/route.ts`
- Create: `src/app/auth/reset-pin/route.test.ts`
  Purpose: update the recovered user's password to a new 4-digit PIN after `/auth/callback` creates a recovery session.
- Modify: `src/app/auth/callback/route.ts`
- Modify: `src/app/auth/callback/route.test.ts`
  Purpose: preserve legacy synthetic-email profile creation while also supporting metadata-backed real-email accounts that return through the callback.
- Create: `src/features/auth/reset-pin-form.tsx`
- Create: `src/features/auth/reset-pin-form.test.tsx`
- Create: `src/app/(auth)/reset-pin/page.tsx`
- Create: `src/app/(auth)/reset-pin/page.test.tsx`
  Purpose: render the reset-PIN screen and submit the new 4-digit PIN to the server route.
- Modify: `src/features/auth/login-form.tsx`
- Modify: `src/features/auth/login-form.test.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/login/page.test.tsx`
  Purpose: add the required email field for signup, switch browser auth calls to the new route handlers, and surface `Forgot Password` / `Forgot PIN`.
- Create: `src/app/auth/recovery-email/route.ts`
- Create: `src/app/auth/recovery-email/route.test.ts`
- Create: `src/features/auth/recovery-email-panel.tsx`
- Create: `src/features/auth/recovery-email-panel.test.tsx`
- Modify: `src/app/(app)/profile/page.tsx`
- Modify: `src/app/(app)/profile/page.test.tsx`
  Purpose: let legacy signed-in accounts register a real recovery email so they can use the new recovery flow later.

### Task 1: Add Email-Aware Auth Foundations

**Files:**
- Create: `supabase/migrations/20260706160000_add_profile_email_for_recovery.sql`
- Modify: `supabase/config.toml`
- Modify: `src/features/auth/username-auth.ts`
- Modify: `src/features/auth/username-auth.test.ts`
- Modify: `src/lib/db/user-profile-repo.ts`
- Create: `src/lib/db/user-profile-repo.test.ts`
- Modify: `src/lib/supabase/admin.ts`

- [ ] **Step 1: Extend the helper tests to cover normalized real emails and synthetic-email detection**

```ts
import { describe, expect, it } from 'vitest';
import {
  buildSyntheticAuthEmail,
  emailSchema,
  isSyntheticAuthEmail,
  normalizeUsername,
  pinSchema,
  signupFullNameSchema,
} from './username-auth';

describe('username auth helpers', () => {
  it('normalizes usernames to lowercase slugs', () => {
    expect(normalizeUsername('  Friday.Mars  ')).toBe('friday-mars');
  });

  it('builds deterministic synthetic auth emails', () => {
    expect(buildSyntheticAuthEmail('Friday Mars')).toBe(
      'friday-mars@users.tmstats.local',
    );
  });

  it('normalizes real email input for signup and recovery', () => {
    expect(emailSchema.parse('  Friday@Example.com  ')).toBe('friday@example.com');
  });

  it('detects synthetic auth emails used by legacy accounts', () => {
    expect(isSyntheticAuthEmail('friday-mars@users.tmstats.local')).toBe(true);
    expect(isSyntheticAuthEmail('friday@example.com')).toBe(false);
  });

  it('rejects non four-digit PIN values', () => {
    expect(() => pinSchema.parse('12a4')).toThrow(/4 digits/i);
  });

  it('requires first and last name for signup', () => {
    expect(() => signupFullNameSchema.parse('Friday')).toThrow(/full name/i);
  });
});
```

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findAuthIdentityByUsername,
  getUserProfile,
  updateCurrentUserRecoveryEmail,
} from './user-profile-repo';

const adminMocks = vi.hoisted(() => ({
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}));

const serverMocks = vi.hoisted(() => ({
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      eq: adminMocks.eq,
      maybeSingle: adminMocks.maybeSingle,
      select: adminMocks.select,
      update: adminMocks.update,
    })),
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      eq: serverMocks.eq,
      maybeSingle: serverMocks.maybeSingle,
      select: serverMocks.select,
      update: serverMocks.update,
    })),
  })),
}));

describe('user profile repo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminMocks.select.mockReturnValue(adminMocks);
    adminMocks.eq.mockReturnValue(adminMocks);
    serverMocks.select.mockReturnValue(serverMocks);
    serverMocks.eq.mockReturnValue(serverMocks);
    serverMocks.update.mockReturnValue(serverMocks);
  });

  it('looks up a normalized username and returns the stored real auth email', async () => {
    adminMocks.maybeSingle.mockResolvedValue({
      data: {
        email: 'friday@example.com',
        user_id: 'user-1',
      },
      error: null,
    });

    await expect(findAuthIdentityByUsername(' Friday.Mars ')).resolves.toEqual({
      authEmail: 'friday@example.com',
      normalizedUsername: 'friday-mars',
      recoveryEmail: 'friday@example.com',
      userId: 'user-1',
    });
  });

  it('falls back to the synthetic auth email when a legacy profile has no real email yet', async () => {
    adminMocks.maybeSingle.mockResolvedValue({
      data: {
        email: null,
        user_id: 'user-1',
      },
      error: null,
    });

    await expect(findAuthIdentityByUsername('Friday Mars')).resolves.toEqual({
      authEmail: 'friday-mars@users.tmstats.local',
      normalizedUsername: 'friday-mars',
      recoveryEmail: null,
      userId: 'user-1',
    });
  });

  it('selects the recovery email when loading the signed-in user profile', async () => {
    serverMocks.maybeSingle.mockResolvedValue({
      data: {
        email: 'friday@example.com',
        full_name: 'Friday Mars',
        last_active_group_id: 'group-1',
        username: 'friday-mars',
      },
      error: null,
    });

    await expect(getUserProfile('user-1')).resolves.toEqual({
      email: 'friday@example.com',
      full_name: 'Friday Mars',
      last_active_group_id: 'group-1',
      username: 'friday-mars',
    });
  });

  it('updates the current users recovery email in the profile table', async () => {
    serverMocks.update.mockReturnValue(serverMocks);
    serverMocks.eq.mockReturnValue(serverMocks);
    serverMocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      updateCurrentUserRecoveryEmail({
        email: 'friday@example.com',
        userId: 'user-1',
      }),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the helper and repo tests to verify they fail**

Run: `npm.cmd test -- src/features/auth/username-auth.test.ts src/lib/db/user-profile-repo.test.ts`
Expected: FAIL because `emailSchema`, `isSyntheticAuthEmail`, `findAuthIdentityByUsername`, and `updateCurrentUserRecoveryEmail` do not exist yet.

- [ ] **Step 3: Implement the helper and repository changes**

```ts
import { z } from 'zod';

const SYNTHETIC_AUTH_EMAIL_DOMAIN = 'users.tmstats.local';

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeUsername(input: string) {
  return collapseWhitespace(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, 'PIN must be exactly 4 digits.');

export const signupFullNameSchema = z
  .string()
  .transform(collapseWhitespace)
  .refine((value) => value.split(' ').filter(Boolean).length >= 2, {
    message: 'Enter a full name in First Name Last Name format.',
  });

export const emailSchema = z
  .string()
  .transform(collapseWhitespace)
  .transform((value) => value.toLowerCase())
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: 'Enter a valid email address.',
  });

export function buildSyntheticAuthEmail(username: string) {
  return `${normalizeUsername(username)}@${SYNTHETIC_AUTH_EMAIL_DOMAIN}`;
}

export function isSyntheticAuthEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return email.toLowerCase().endsWith(`@${SYNTHETIC_AUTH_EMAIL_DOMAIN}`);
}
```

```ts
import { buildSyntheticAuthEmail, normalizeUsername } from '@/features/auth/username-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function findAuthIdentityByUsername(username: string) {
  const normalizedUsername = normalizeUsername(username);
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('email, user_id')
    .eq('username', normalizedUsername)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    authEmail: data.email ?? buildSyntheticAuthEmail(normalizedUsername),
    normalizedUsername,
    recoveryEmail: data.email ?? null,
    userId: data.user_id,
  };
}

export async function createUserProfile(input: {
  email: string | null;
  fullName: string;
  userId: string;
  username: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('user_profiles').insert({
    email: input.email,
    full_name: input.fullName,
    user_id: input.userId,
    username: input.username,
  });

  if (error) {
    throw error;
  }
}

export async function getUserProfile(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('email, full_name, last_active_group_id, username')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCurrentUserRecoveryEmail(input: {
  email: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('user_profiles')
    .update({
      email: input.email,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', input.userId);

  if (error) {
    throw error;
  }
}
```

```ts
throw new Error(
  'SUPABASE_SERVICE_ROLE_KEY is required for auth recovery and web import group matching.',
);
```

- [ ] **Step 4: Add the migration and local Supabase password policy update**

```sql
alter table public.user_profiles
add column if not exists email text;

create unique index if not exists user_profiles_email_unique_idx
on public.user_profiles (lower(email))
where email is not null;
```

```toml
minimum_password_length = 4
```

- [ ] **Step 5: Run the focused foundation tests again**

Run: `npm.cmd test -- src/features/auth/username-auth.test.ts src/lib/db/user-profile-repo.test.ts`
Expected: PASS

- [ ] **Step 6: Commit the foundation work**

```bash
git add supabase/config.toml supabase/migrations/20260706160000_add_profile_email_for_recovery.sql src/features/auth/username-auth.ts src/features/auth/username-auth.test.ts src/lib/db/user-profile-repo.ts src/lib/db/user-profile-repo.test.ts src/lib/supabase/admin.ts
git commit -m "feat: add email-aware auth foundations"
```

### Task 2: Move Sign-In And Sign-Up Behind Server Routes

**Files:**
- Create: `src/app/auth/sign-in/route.ts`
- Create: `src/app/auth/sign-in/route.test.ts`
- Create: `src/app/auth/sign-up/route.ts`
- Create: `src/app/auth/sign-up/route.test.ts`

- [ ] **Step 1: Write the failing sign-in and sign-up route tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const profileRepoMocks = vi.hoisted(() => ({
  findAuthIdentityByUsername: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
}));

vi.mock('@/lib/db/user-profile-repo', () => ({
  findAuthIdentityByUsername: profileRepoMocks.findAuthIdentityByUsername,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: {
      signInWithPassword: authMocks.signInWithPassword,
    },
  })),
}));

describe('POST /auth/sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.signInWithPassword.mockResolvedValue({ error: null });
  });

  it('resolves the username to the stored real email before signing in', async () => {
    profileRepoMocks.findAuthIdentityByUsername.mockResolvedValue({
      authEmail: 'friday@example.com',
      normalizedUsername: 'friday-mars',
      recoveryEmail: 'friday@example.com',
      userId: 'user-1',
    });

    const response = await POST(
      new Request('https://terraforming-mars-stats.workers.dev/auth/sign-in', {
        body: JSON.stringify({
          nextPath: '/profile',
          pin: '1234',
          username: 'Friday Mars',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'friday@example.com',
      password: '1234',
    });
    await expect(response.json()).resolves.toEqual({
      ok: true,
      redirectTo: '/profile',
    });
  });

  it('falls back to the synthetic auth email for a legacy profile without a real email', async () => {
    profileRepoMocks.findAuthIdentityByUsername.mockResolvedValue({
      authEmail: 'friday-mars@users.tmstats.local',
      normalizedUsername: 'friday-mars',
      recoveryEmail: null,
      userId: 'user-1',
    });

    const response = await POST(
      new Request('https://terraforming-mars-stats.workers.dev/auth/sign-in', {
        body: JSON.stringify({
          nextPath: '/profile',
          pin: '1234',
          username: 'Friday Mars',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'friday-mars@users.tmstats.local',
      password: '1234',
    });
    await expect(response.json()).resolves.toEqual({
      ok: true,
      redirectTo: '/profile',
    });
  });

  it('returns the generic error when the username is unknown', async () => {
    profileRepoMocks.findAuthIdentityByUsername.mockResolvedValue(null);

    const response = await POST(
      new Request('https://terraforming-mars-stats.workers.dev/auth/sign-in', {
        body: JSON.stringify({
          nextPath: '/profile',
          pin: '1234',
          username: 'missing-user',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: 'Unknown username or incorrect PIN.',
    });
  });
});
```

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const adminMocks = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  eq: vi.fn(),
  insert: vi.fn(),
  maybeSingle: vi.fn(),
  select: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  signUp: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        deleteUser: adminMocks.deleteUser,
      },
    },
    from: vi.fn(() => ({
      eq: adminMocks.eq,
      insert: adminMocks.insert,
      maybeSingle: adminMocks.maybeSingle,
      select: adminMocks.select,
    })),
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: {
      signUp: authMocks.signUp,
    },
  })),
}));

describe('POST /auth/sign-up', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminMocks.select.mockReturnValue(adminMocks);
    adminMocks.eq.mockReturnValue(adminMocks);
    adminMocks.insert.mockResolvedValue({ error: null });
    authMocks.signUp.mockResolvedValue({
      data: {
        session: { access_token: 'session-token' },
        user: { id: 'user-1' },
      },
      error: null,
    });
  });

  it('creates the auth account with the real email and stores it on the profile row', async () => {
    adminMocks.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const response = await POST(
      new Request('https://terraforming-mars-stats.workers.dev/auth/sign-up', {
        body: JSON.stringify({
          email: ' Friday@Example.com ',
          fullName: 'Friday Mars',
          nextPath: '/profile',
          pin: '1234',
          username: 'Friday Mars',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: 'friday@example.com',
      options: {
        data: {
          full_name: 'Friday Mars',
          username: 'friday-mars',
        },
      },
      password: '1234',
    });
    expect(adminMocks.insert).toHaveBeenCalledWith({
      email: 'friday@example.com',
      full_name: 'Friday Mars',
      user_id: 'user-1',
      username: 'friday-mars',
    });
    await expect(response.json()).resolves.toEqual({
      ok: true,
      redirectTo: '/profile',
    });
  });

  it('rejects duplicate usernames before creating a new auth user', async () => {
    adminMocks.maybeSingle.mockResolvedValueOnce({
      data: { user_id: 'existing-user' },
      error: null,
    });

    const response = await POST(
      new Request('https://terraforming-mars-stats.workers.dev/auth/sign-up', {
        body: JSON.stringify({
          email: 'friday@example.com',
          fullName: 'Friday Mars',
          nextPath: '/profile',
          pin: '1234',
          username: 'Friday Mars',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(authMocks.signUp).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: 'That username is already in use.',
    });
  });

  it('rejects duplicate real emails before creating a new auth user', async () => {
    adminMocks.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { user_id: 'existing-user' }, error: null });

    const response = await POST(
      new Request('https://terraforming-mars-stats.workers.dev/auth/sign-up', {
        body: JSON.stringify({
          email: 'friday@example.com',
          fullName: 'Friday Mars',
          nextPath: '/profile',
          pin: '1234',
          username: 'Friday Mars',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(authMocks.signUp).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: 'That email is already in use.',
    });
  });
});
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run: `npm.cmd test -- src/app/auth/sign-in/route.test.ts src/app/auth/sign-up/route.test.ts`
Expected: FAIL because the new sign-in and sign-up route files do not exist yet.

- [ ] **Step 3: Implement the server sign-in and sign-up routes**

```ts
import { NextResponse } from 'next/server';
import { normalizeNextPath } from '@/features/auth/build-auth-callback-url';
import { pinSchema } from '@/features/auth/username-auth';
import { findAuthIdentityByUsername } from '@/lib/db/user-profile-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const signInSchema = z.object({
  nextPath: z.string().optional(),
  pin: pinSchema,
  username: z.string().min(1, 'Username is required.'),
});

export async function POST(request: Request) {
  const parsed = signInSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? 'Could not complete authentication right now.' },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const authIdentity = await findAuthIdentityByUsername(payload.username);

  if (!authIdentity) {
    return NextResponse.json(
      { ok: false, message: 'Unknown username or incorrect PIN.' },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: authIdentity.authEmail,
    password: payload.pin,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, message: 'Unknown username or incorrect PIN.' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    redirectTo: normalizeNextPath(payload.nextPath),
  });
}
```

```ts
import { NextResponse } from 'next/server';
import { normalizeNextPath } from '@/features/auth/build-auth-callback-url';
import {
  emailSchema,
  normalizeUsername,
  pinSchema,
  signupFullNameSchema,
} from '@/features/auth/username-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const signUpSchema = z.object({
  email: emailSchema,
  fullName: signupFullNameSchema,
  nextPath: z.string().optional(),
  pin: pinSchema,
  username: z.string().min(1, 'Username is required.'),
});

export async function POST(request: Request) {
  const parsed = signUpSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? 'Could not create that account right now.' },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const normalizedUsername = normalizeUsername(payload.username);
  const admin = createSupabaseAdminClient();

  const { data: usernameMatch, error: usernameError } = await admin
    .from('user_profiles')
    .select('user_id')
    .eq('username', normalizedUsername)
    .maybeSingle();

  if (usernameError) {
    throw usernameError;
  }

  if (usernameMatch) {
    return NextResponse.json(
      { ok: false, message: 'That username is already in use.' },
      { status: 400 },
    );
  }

  const { data: emailMatch, error: emailError } = await admin
    .from('user_profiles')
    .select('user_id')
    .eq('email', payload.email)
    .maybeSingle();

  if (emailError) {
    throw emailError;
  }

  if (emailMatch) {
    return NextResponse.json(
      { ok: false, message: 'That email is already in use.' },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    options: {
      data: {
        full_name: payload.fullName,
        username: normalizedUsername,
      },
    },
    password: payload.pin,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { ok: false, message: 'Could not create that account right now.' },
      { status: 400 },
    );
  }

  const { error: profileError } = await admin.from('user_profiles').insert({
    email: payload.email,
    full_name: payload.fullName,
    user_id: data.user.id,
    username: normalizedUsername,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json(
      { ok: false, message: 'Could not finish creating that account.' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    redirectTo: normalizeNextPath(payload.nextPath),
  });
}
```

- [ ] **Step 4: Run the sign-in and sign-up route tests again**

Run: `npm.cmd test -- src/app/auth/sign-in/route.test.ts src/app/auth/sign-up/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the server auth route work**

```bash
git add src/app/auth/sign-in/route.ts src/app/auth/sign-in/route.test.ts src/app/auth/sign-up/route.ts src/app/auth/sign-up/route.test.ts
git commit -m "feat: move username auth routes server-side"
```

### Task 3: Add Recovery Dispatch, Callback Fallback, And Reset PIN

**Files:**
- Create: `src/app/auth/recovery/route.ts`
- Create: `src/app/auth/recovery/route.test.ts`
- Create: `src/app/auth/reset-pin/route.ts`
- Create: `src/app/auth/reset-pin/route.test.ts`
- Modify: `src/app/auth/callback/route.ts`
- Modify: `src/app/auth/callback/route.test.ts`
- Create: `src/features/auth/reset-pin-form.tsx`
- Create: `src/features/auth/reset-pin-form.test.tsx`
- Create: `src/app/(auth)/reset-pin/page.tsx`
- Create: `src/app/(auth)/reset-pin/page.test.tsx`

- [ ] **Step 1: Write the failing recovery, callback, and reset-PIN tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const profileRepoMocks = vi.hoisted(() => ({
  findAuthIdentityByUsername: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
}));

vi.mock('@/lib/db/user-profile-repo', () => ({
  findAuthIdentityByUsername: profileRepoMocks.findAuthIdentityByUsername,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: {
      resetPasswordForEmail: authMocks.resetPasswordForEmail,
    },
  })),
}));

describe('POST /auth/recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it('sends a recovery link when the username has a registered real email', async () => {
    profileRepoMocks.findAuthIdentityByUsername.mockResolvedValue({
      authEmail: 'friday@example.com',
      normalizedUsername: 'friday-mars',
      recoveryEmail: 'friday@example.com',
      userId: 'user-1',
    });

    const response = await POST(
      new Request('https://terraforming-mars-stats.workers.dev/auth/recovery', {
        body: JSON.stringify({ username: 'Friday Mars' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith(
      'friday@example.com',
      expect.objectContaining({
        redirectTo:
          'https://terraforming-mars-stats.workers.dev/auth/callback?next=%2Freset-pin',
      }),
    );
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message: 'If that account has a registered email, a recovery link has been sent.',
    });
  });

  it('returns the same generic success message when no real email is on file', async () => {
    profileRepoMocks.findAuthIdentityByUsername.mockResolvedValue({
      authEmail: 'friday-mars@users.tmstats.local',
      normalizedUsername: 'friday-mars',
      recoveryEmail: null,
      userId: 'user-1',
    });

    const response = await POST(
      new Request('https://terraforming-mars-stats.workers.dev/auth/recovery', {
        body: JSON.stringify({ username: 'Friday Mars' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(authMocks.resetPasswordForEmail).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message: 'If that account has a registered email, a recovery link has been sent.',
    });
  });

  it('returns the same generic success message when the username is unknown', async () => {
    profileRepoMocks.findAuthIdentityByUsername.mockResolvedValue(null);

    const response = await POST(
      new Request('https://terraforming-mars-stats.workers.dev/auth/recovery', {
        body: JSON.stringify({ username: 'missing-user' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(authMocks.resetPasswordForEmail).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message: 'If that account has a registered email, a recovery link has been sent.',
    });
  });
});
```

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const authMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: {
      getUser: authMocks.getUser,
      updateUser: authMocks.updateUser,
    },
  })),
}));

describe('POST /auth/reset-pin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    authMocks.updateUser.mockResolvedValue({ data: {}, error: null });
  });

  it('updates the recovered users password with a valid new 4-digit pin', async () => {
    const response = await POST(
      new Request('https://terraforming-mars-stats.workers.dev/auth/reset-pin', {
        body: JSON.stringify({ pin: '1234' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(authMocks.updateUser).toHaveBeenCalledWith({ password: '1234' });
    await expect(response.json()).resolves.toEqual({
      ok: true,
      redirectTo: '/profile',
    });
  });

  it('rejects missing recovery sessions', async () => {
    authMocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const response = await POST(
      new Request('https://terraforming-mars-stats.workers.dev/auth/reset-pin', {
        body: JSON.stringify({ pin: '1234' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: 'This recovery link is no longer valid. Start over from login.',
    });
  });

  it('rejects invalid non four-digit PIN values', async () => {
    const response = await POST(
      new Request('https://terraforming-mars-stats.workers.dev/auth/reset-pin', {
        body: JSON.stringify({ pin: '12a4' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(400);
  });
});
```

```ts
it('creates a missing profile from metadata username and real email during callback exchange', async () => {
  authMocks.getUser.mockResolvedValueOnce({
    data: {
      user: {
        email: 'friday@example.com',
        id: 'user-1',
        user_metadata: {
          full_name: 'Friday Mars',
          username: 'friday-mars',
        },
      },
    },
    error: null,
  });

  const response = await GET(
    new Request(
      'https://terraforming-mars-stats.workers.dev/auth/callback?code=abc123&next=%2Freset-pin',
    ),
  );

  expect(profileQueryMocks.insert).toHaveBeenCalledWith({
    email: 'friday@example.com',
    full_name: 'Friday Mars',
    user_id: 'user-1',
    username: 'friday-mars',
  });
  expect(response.headers.get('location')).toBe(
    'https://terraforming-mars-stats.workers.dev/reset-pin',
  );
});
```

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPinForm } from './reset-pin-form';

describe('ResetPinForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'fetch').mockResolvedValue({
      json: async () => ({ ok: true, redirectTo: '/profile' }),
      ok: true,
    } as Response);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign: vi.fn(),
      },
    });
  });

  it('posts the new 4-digit pin to the reset route and redirects on success', async () => {
    const user = userEvent.setup();

    render(<ResetPinForm />);

    await user.type(screen.getByLabelText(/new 4-digit pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /save new pin/i }));

    expect(window.fetch).toHaveBeenCalledWith(
      '/auth/reset-pin',
      expect.objectContaining({
        body: JSON.stringify({ pin: '1234' }),
        method: 'POST',
      }),
    );
    expect(window.location.assign).toHaveBeenCalledWith('/profile');
  });
});
```

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ResetPinPage from './page';

describe('ResetPinPage', () => {
  it('renders the recovery heading and reset form', async () => {
    render(<ResetPinPage />);

    expect(screen.getByRole('heading', { name: /set a new pin/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save new pin/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the recovery and reset tests to verify they fail**

Run: `npm.cmd test -- src/app/auth/recovery/route.test.ts src/app/auth/reset-pin/route.test.ts src/app/auth/callback/route.test.ts src/features/auth/reset-pin-form.test.tsx src/app/(auth)/reset-pin/page.test.tsx`
Expected: FAIL because the recovery route, reset route, reset page, and reset form do not exist yet, and the callback route still only understands synthetic auth emails.

- [ ] **Step 3: Implement the recovery route, reset route, callback fallback, and reset form**

```ts
import { NextResponse } from 'next/server';
import { buildAuthCallbackUrl } from '@/features/auth/build-auth-callback-url';
import { findAuthIdentityByUsername } from '@/lib/db/user-profile-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const recoverySchema = z.object({
  username: z.string().min(1, 'Enter your username first.'),
});

export async function POST(request: Request) {
  const parsed = recoverySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? 'Enter your username first.' },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const authIdentity = await findAuthIdentityByUsername(payload.username);

  if (authIdentity?.recoveryEmail) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(authIdentity.recoveryEmail, {
      redirectTo: buildAuthCallbackUrl(new URL(request.url).origin, '/reset-pin'),
    });
  }

  return NextResponse.json({
    ok: true,
    message: 'If that account has a registered email, a recovery link has been sent.',
  });
}
```

```ts
import { NextResponse } from 'next/server';
import { pinSchema } from '@/features/auth/username-auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const resetPinSchema = z.object({
  pin: pinSchema,
});

export async function POST(request: Request) {
  const parsed = resetPinSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? 'PIN must be exactly 4 digits.' },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        message: 'This recovery link is no longer valid. Start over from login.',
      },
      { status: 401 },
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: payload.pin,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, message: 'Could not save that PIN right now.' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    redirectTo: '/profile',
  });
}
```

```ts
import { emailSchema, isSyntheticAuthEmail, normalizeUsername, signupFullNameSchema } from '@/features/auth/username-auth';

function getUsernameFromAuthUser(user: {
  email: string | null | undefined;
  user_metadata?: { username?: unknown };
}) {
  if (typeof user.user_metadata?.username === 'string') {
    return normalizeUsername(user.user_metadata.username);
  }

  if (!user.email || !isSyntheticAuthEmail(user.email)) {
    return '';
  }

  return normalizeUsername(user.email.split('@')[0] ?? '');
}

function getProfileEmailFromAuthUser(email: string | null | undefined) {
  if (!email || isSyntheticAuthEmail(email)) {
    return null;
  }

  const parsed = emailSchema.safeParse(email);
  return parsed.success ? parsed.data : null;
}

const username = getUsernameFromAuthUser(user);
const email = getProfileEmailFromAuthUser(user.email);

const { error: profileInsertError } = await supabase.from('user_profiles').insert({
  email,
  full_name: parsedFullName.data,
  user_id: user.id,
  username,
});
```

```tsx
'use client';

import { useState } from 'react';

export function ResetPinForm() {
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<{ message: string; state: 'error' | 'idle' }>({
    message: '',
    state: 'idle',
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ message: '', state: 'idle' });

    const response = await fetch('/auth/reset-pin', {
      body: JSON.stringify({ pin }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    const payload = await response.json();

    if (!response.ok) {
      setStatus({ message: payload.message, state: 'error' });
      return;
    }

    window.location.assign(payload.redirectTo);
  }

  return (
    <form className="tm-panel flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">New 4-Digit PIN</span>
        <input
          aria-label="New 4-Digit PIN"
          className="tm-input"
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => setPin(event.target.value)}
          required
          type="password"
          value={pin}
        />
      </label>
      <button className="tm-button-primary" type="submit">
        Save New PIN
      </button>
      {status.state === 'error' ? (
        <p className="text-sm text-red-300">{status.message}</p>
      ) : null}
    </form>
  );
}
```

```tsx
import { ResetPinForm } from '@/features/auth/reset-pin-form';

export default function ResetPinPage() {
  return (
    <main className="tm-app-shell">
      <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-stone-100">
        <p className="tm-display-eyebrow">Mission Recovery</p>
        <h1 className="tm-display-title text-3xl font-bold">Set A New PIN</h1>
        <p className="tm-body-copy text-sm">
          Choose a new 4-digit PIN for your Terraforming Mars Stats account.
        </p>
        <ResetPinForm />
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run the recovery, callback, and reset tests again**

Run: `npm.cmd test -- src/app/auth/recovery/route.test.ts src/app/auth/reset-pin/route.test.ts src/app/auth/callback/route.test.ts src/features/auth/reset-pin-form.test.tsx src/app/(auth)/reset-pin/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the recovery and reset flow**

```bash
git add src/app/auth/recovery/route.ts src/app/auth/recovery/route.test.ts src/app/auth/reset-pin/route.ts src/app/auth/reset-pin/route.test.ts src/app/auth/callback/route.ts src/app/auth/callback/route.test.ts src/features/auth/reset-pin-form.tsx src/features/auth/reset-pin-form.test.tsx src/app/(auth)/reset-pin/page.tsx src/app/(auth)/reset-pin/page.test.tsx
git commit -m "feat: add email recovery and reset pin flow"
```

### Task 4: Rework The Login Experience Around The New Auth Routes

**Files:**
- Modify: `src/features/auth/login-form.tsx`
- Modify: `src/features/auth/login-form.test.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/login/page.test.tsx`

- [ ] **Step 1: Rewrite the login-form tests around fetch-based sign-in, sign-up, and recovery**

```ts
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'fetch').mockResolvedValue({
      json: async () => ({ ok: true, redirectTo: '/profile' }),
      ok: true,
    } as Response);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign: vi.fn(),
      },
    });
  });

  it('signs in with username and pin through the server route', async () => {
    const user = userEvent.setup();

    render(<LoginForm nextPath="/profile" />);

    await user.type(screen.getByLabelText(/username/i), 'friday-mars');
    await user.type(screen.getByLabelText(/4-digit pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() =>
      expect(window.fetch).toHaveBeenCalledWith(
        '/auth/sign-in',
        expect.objectContaining({
          body: JSON.stringify({
            nextPath: '/profile',
            pin: '1234',
            username: 'friday-mars',
          }),
          method: 'POST',
        }),
      ),
    );
    expect(window.location.assign).toHaveBeenCalledWith('/profile');
  });

  it('requires a real email address during account creation', async () => {
    const user = userEvent.setup();

    render(<LoginForm nextPath="/profile" />);

    await user.click(screen.getByRole('button', { name: /use create account/i }));

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('creates an account with full name, username, real email, and pin', async () => {
    const user = userEvent.setup();

    render(<LoginForm nextPath="/profile" />);

    await user.click(screen.getByRole('button', { name: /use create account/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Friday Mars');
    await user.type(screen.getByLabelText(/username/i), 'friday-mars');
    await user.type(screen.getByLabelText(/email address/i), 'friday@example.com');
    await user.type(screen.getByLabelText(/4-digit pin/i), '1234');
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() =>
      expect(window.fetch).toHaveBeenCalledWith(
        '/auth/sign-up',
        expect.objectContaining({
          body: JSON.stringify({
            email: 'friday@example.com',
            fullName: 'Friday Mars',
            nextPath: '/profile',
            pin: '1234',
            username: 'friday-mars',
          }),
          method: 'POST',
        }),
      ),
    );
  });

  it('sends the generic recovery request for forgot password', async () => {
    const user = userEvent.setup();

    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      json: async () => ({
        ok: true,
        message: 'If that account has a registered email, a recovery link has been sent.',
      }),
      ok: true,
    } as Response);

    render(<LoginForm nextPath="/profile" />);

    await user.type(screen.getByLabelText(/username/i), 'friday-mars');
    await user.click(screen.getByRole('button', { name: /forgot password/i }));

    await waitFor(() =>
      expect(window.fetch).toHaveBeenCalledWith(
        '/auth/recovery',
        expect.objectContaining({
          body: JSON.stringify({ username: 'friday-mars' }),
          method: 'POST',
        }),
      ),
    );
    expect(
      screen.getByText(
        /if that account has a registered email, a recovery link has been sent\./i,
      ),
    ).toBeInTheDocument();
  });
});
```

```ts
it('mentions that account creation uses email for recovery', async () => {
  render(await LoginPage({}));

  expect(
    screen.getByText(/create an account with your full name and a recovery email/i),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the login tests to verify they fail**

Run: `npm.cmd test -- src/features/auth/login-form.test.tsx src/app/(auth)/login/page.test.tsx`
Expected: FAIL because the login form still talks directly to the browser Supabase client and does not render an email field or recovery buttons.

- [ ] **Step 3: Implement the new login UI flow**

```tsx
'use client';

import { useState } from 'react';

type AuthMode = 'sign-in' | 'sign-up';

export function LoginForm({ nextPath = '/log-game/import' }: { nextPath?: string }) {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<{
    message: string;
    state: 'error' | 'idle' | 'success';
  }>({
    message: '',
    state: 'idle',
  });
  const [username, setUsername] = useState('');

  async function submit(url: '/auth/recovery' | '/auth/sign-in' | '/auth/sign-up', body: Record<string, string>) {
    const response = await fetch(url, {
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    return {
      payload: await response.json(),
      response,
    };
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ message: '', state: 'idle' });

    const { payload, response } =
      mode === 'sign-in'
        ? await submit('/auth/sign-in', { nextPath, pin, username })
        : await submit('/auth/sign-up', {
            email,
            fullName,
            nextPath,
            pin,
            username,
          });

    if (!response.ok) {
      setStatus({ message: payload.message, state: 'error' });
      return;
    }

    window.location.assign(payload.redirectTo);
  }

  async function onRecover() {
    if (!username.trim()) {
      setStatus({ message: 'Enter your username first.', state: 'error' });
      return;
    }

    const { payload } = await submit('/auth/recovery', { username });
    setStatus({ message: payload.message, state: 'success' });
  }

  return (
    <form className="tm-panel flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex gap-3">
        <button
          className={mode === 'sign-in' ? 'tm-button-primary flex-1' : 'tm-button-secondary flex-1'}
          onClick={() => setMode('sign-in')}
          type="button"
        >
          Use Sign In
        </button>
        <button
          className={mode === 'sign-up' ? 'tm-button-primary flex-1' : 'tm-button-secondary flex-1'}
          onClick={() => setMode('sign-up')}
          type="button"
        >
          Use Create Account
        </button>
      </div>
      {mode === 'sign-up' ? (
        <>
          <label className="flex flex-col gap-2 text-sm">
            <span className="tm-data-label">Full Name</span>
            <input aria-label="Full Name" className="tm-input" onChange={(event) => setFullName(event.target.value)} required type="text" value={fullName} />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="tm-data-label">Email Address</span>
            <input aria-label="Email Address" autoCapitalize="none" className="tm-input" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
        </>
      ) : null}
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">Username</span>
        <input aria-label="Username" autoCapitalize="none" autoCorrect="off" className="tm-input" onChange={(event) => setUsername(event.target.value)} required type="text" value={username} />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span className="tm-data-label">4-Digit PIN</span>
        <input aria-label="4-Digit PIN" className="tm-input" inputMode="numeric" maxLength={4} onChange={(event) => setPin(event.target.value)} required type="password" value={pin} />
      </label>
      <button className="tm-button-primary" type="submit">
        {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
      </button>
      {mode === 'sign-in' ? (
        <div className="flex gap-3 text-sm">
          <button className="tm-button-secondary flex-1" onClick={onRecover} type="button">
            Forgot Password
          </button>
          <button className="tm-button-secondary flex-1" onClick={onRecover} type="button">
            Forgot PIN
          </button>
        </div>
      ) : null}
      {status.state !== 'idle' ? (
        <p className={status.state === 'error' ? 'text-sm text-red-300' : 'text-sm text-emerald-200'}>
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
```

```tsx
<p className="tm-body-copy text-sm">
  Sign in with your username and 4-digit PIN, or create an account with your
  full name and a recovery email.
</p>
```

- [ ] **Step 4: Run the login tests again**

Run: `npm.cmd test -- src/features/auth/login-form.test.tsx src/app/(auth)/login/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the login UI changes**

```bash
git add src/features/auth/login-form.tsx src/features/auth/login-form.test.tsx src/app/(auth)/login/page.tsx src/app/(auth)/login/page.test.tsx
git commit -m "feat: add email-backed username login ui"
```

### Task 5: Let Legacy Signed-In Accounts Register A Recovery Email

**Files:**
- Create: `src/app/auth/recovery-email/route.ts`
- Create: `src/app/auth/recovery-email/route.test.ts`
- Create: `src/features/auth/recovery-email-panel.tsx`
- Create: `src/features/auth/recovery-email-panel.test.tsx`
- Modify: `src/app/(app)/profile/page.tsx`
- Modify: `src/app/(app)/profile/page.test.tsx`

- [ ] **Step 1: Write the failing recovery-email route and panel tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const authMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

const adminMocks = vi.hoisted(() => ({
  updateUserById: vi.fn(),
}));

const repoMocks = vi.hoisted(() => ({
  updateCurrentUserRecoveryEmail: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: {
      getUser: authMocks.getUser,
    },
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        updateUserById: adminMocks.updateUserById,
      },
    },
  })),
}));

vi.mock('@/lib/db/user-profile-repo', () => ({
  updateCurrentUserRecoveryEmail: repoMocks.updateCurrentUserRecoveryEmail,
}));

describe('POST /auth/recovery-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    adminMocks.updateUserById.mockResolvedValue({ data: {}, error: null });
    repoMocks.updateCurrentUserRecoveryEmail.mockResolvedValue(undefined);
  });

  it('updates both auth and profile email for the signed-in user', async () => {
    const response = await POST(
      new Request('https://terraforming-mars-stats.workers.dev/auth/recovery-email', {
        body: JSON.stringify({ email: ' Friday@Example.com ' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(adminMocks.updateUserById).toHaveBeenCalledWith('user-1', {
      email: 'friday@example.com',
      email_confirm: true,
    });
    expect(repoMocks.updateCurrentUserRecoveryEmail).toHaveBeenCalledWith({
      email: 'friday@example.com',
      userId: 'user-1',
    });
    await expect(response.json()).resolves.toEqual({
      ok: true,
      email: 'friday@example.com',
      message: 'Recovery email saved.',
    });
  });
});
```

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecoveryEmailPanel } from './recovery-email-panel';

describe('RecoveryEmailPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'fetch').mockResolvedValue({
      json: async () => ({
        ok: true,
        email: 'friday@example.com',
        message: 'Recovery email saved.',
      }),
      ok: true,
    } as Response);
  });

  it('prompts legacy accounts to add a recovery email', () => {
    render(<RecoveryEmailPanel currentEmail={null} />);

    expect(
      screen.getByText(/add a recovery email to enable forgot password and forgot pin/i),
    ).toBeInTheDocument();
  });

  it('submits a new recovery email and shows the saved address', async () => {
    const user = userEvent.setup();

    render(<RecoveryEmailPanel currentEmail={null} />);

    await user.type(screen.getByLabelText(/recovery email address/i), 'friday@example.com');
    await user.click(screen.getByRole('button', { name: /save recovery email/i }));

    expect(window.fetch).toHaveBeenCalledWith(
      '/auth/recovery-email',
      expect.objectContaining({
        body: JSON.stringify({ email: 'friday@example.com' }),
        method: 'POST',
      }),
    );
    expect(screen.getByDisplayValue(/friday@example.com/i)).toBeInTheDocument();
  });
});
```

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from './page';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';
import { getProfileAnalytics } from '@/lib/db/analytics-repo';
import { getUserProfile } from '@/lib/db/user-profile-repo';

vi.mock('@/lib/db/user-profile-repo', () => ({
  getUserProfile: vi.fn(),
}));

it('loads the user profile so recovery email state can render on the profile page', async () => {
  vi.mocked(getCurrentGroupContext).mockResolvedValue({
    groupId: 'group-1',
    groupName: 'First Group',
    role: 'owner',
    userId: 'user-1',
  });
  vi.mocked(getProfileAnalytics).mockResolvedValue(null);
  vi.mocked(getUserProfile).mockResolvedValue({
    email: null,
    full_name: 'Friday Mars',
    last_active_group_id: 'group-1',
    username: 'friday-mars',
  });

  await ProfilePage();

  expect(getUserProfile).toHaveBeenCalledWith('user-1');
});
```

- [ ] **Step 2: Run the recovery-email and profile tests to verify they fail**

Run: `npm.cmd test -- src/app/auth/recovery-email/route.test.ts src/features/auth/recovery-email-panel.test.tsx src/app/(app)/profile/page.test.tsx`
Expected: FAIL because the recovery-email route and panel do not exist yet, and the profile page does not load or render recovery-email state.

- [ ] **Step 3: Implement the recovery-email route, panel, and profile integration**

```ts
import { NextResponse } from 'next/server';
import { emailSchema } from '@/features/auth/username-auth';
import { updateCurrentUserRecoveryEmail } from '@/lib/db/user-profile-repo';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const recoveryEmailSchema = z.object({
  email: emailSchema,
});

export async function POST(request: Request) {
  const parsed = recoveryEmailSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return NextResponse.json(
      { ok: false, message: 'Sign in again before updating your recovery email.' },
      { status: 401 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: payload.email,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, message: 'Could not save that recovery email right now.' },
      { status: 400 },
    );
  }

  await updateCurrentUserRecoveryEmail({
    email: payload.email,
    userId: user.id,
  });

  return NextResponse.json({
    ok: true,
    email: payload.email,
    message: 'Recovery email saved.',
  });
}
```

```tsx
'use client';

import { useState } from 'react';

export function RecoveryEmailPanel({ currentEmail }: { currentEmail: string | null }) {
  const [email, setEmail] = useState(currentEmail ?? '');
  const [status, setStatus] = useState<{ message: string; state: 'error' | 'idle' | 'success' }>({
    message: '',
    state: 'idle',
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const response = await fetch('/auth/recovery-email', {
      body: JSON.stringify({ email }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    const payload = await response.json();

    if (!response.ok) {
      setStatus({ message: payload.message, state: 'error' });
      return;
    }

    setEmail(payload.email);
    setStatus({ message: payload.message, state: 'success' });
  }

  return (
    <form className="tm-panel mb-4 flex flex-col gap-3" onSubmit={onSubmit}>
      <p className="tm-data-label">Recovery Email</p>
      <p className="text-sm text-stone-300">
        {currentEmail
          ? 'Update the email address used for Forgot Password and Forgot PIN.'
          : 'Add a recovery email to enable Forgot Password and Forgot PIN.'}
      </p>
      <label className="flex flex-col gap-2 text-sm">
        <span className="sr-only">Recovery Email Address</span>
        <input
          aria-label="Recovery Email Address"
          autoCapitalize="none"
          className="tm-input"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <button className="tm-button-secondary self-start" type="submit">
        Save Recovery Email
      </button>
      {status.state !== 'idle' ? (
        <p className={status.state === 'error' ? 'text-sm text-red-300' : 'text-sm text-emerald-200'}>
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
```

```tsx
import { RecoveryEmailPanel } from '@/features/auth/recovery-email-panel';
import { getUserProfile } from '@/lib/db/user-profile-repo';

export default async function ProfilePage() {
  const context = await getCurrentGroupContext();

  if (!context) {
    return redirect('/log-game/import');
  }

  const [profileAnalytics, profile] = await Promise.all([
    getProfileAnalytics(context.userId),
    getUserProfile(context.userId),
  ]);

  return (
    <AppShell
      headerActions={
        <GroupSwitcher currentGroupId={context.groupId} returnPath="/profile" />
      }
      title="My Profile"
    >
      <RecoveryEmailPanel currentEmail={profile?.email ?? null} />
      <ProfileDashboard
        coverage={profileAnalytics?.coverage ?? null}
        headToHeadRows={profileAnalytics?.headToHeadRows ?? []}
        performance={profileAnalytics?.performance ?? null}
        playerName={profileAnalytics?.playerName ?? null}
        scoreAverages={profileAnalytics?.scoreAverages ?? null}
        styleAgreement={profileAnalytics?.styleAgreement ?? null}
      />
    </AppShell>
  );
}
```

- [ ] **Step 4: Run the recovery-email and profile tests again**

Run: `npm.cmd test -- src/app/auth/recovery-email/route.test.ts src/features/auth/recovery-email-panel.test.tsx src/app/(app)/profile/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the legacy recovery-email management work**

```bash
git add src/app/auth/recovery-email/route.ts src/app/auth/recovery-email/route.test.ts src/features/auth/recovery-email-panel.tsx src/features/auth/recovery-email-panel.test.tsx src/app/(app)/profile/page.tsx src/app/(app)/profile/page.test.tsx
git commit -m "feat: add legacy recovery email management"
```

### Task 6: Run The Focused Auth Regression Suite And Build

**Files:**
- Modify: `docs/superpowers/plans/2026-07-06-email-backed-username-pin-recovery-implementation.md`

- [ ] **Step 1: Run the focused auth and profile regression suite**

Run: `npm.cmd test -- src/features/auth/username-auth.test.ts src/lib/db/user-profile-repo.test.ts src/app/auth/sign-in/route.test.ts src/app/auth/sign-up/route.test.ts src/app/auth/recovery/route.test.ts src/app/auth/reset-pin/route.test.ts src/app/auth/recovery-email/route.test.ts src/app/auth/callback/route.test.ts src/features/auth/login-form.test.tsx src/features/auth/reset-pin-form.test.tsx src/features/auth/recovery-email-panel.test.tsx src/app/(auth)/login/page.test.tsx src/app/(auth)/reset-pin/page.test.tsx src/app/(app)/profile/page.test.tsx`
Expected: PASS

- [ ] **Step 2: Run the application build**

Run: `npm.cmd run build`
Expected: PASS

- [ ] **Step 3: Check the resulting worktree**

Run: `git status --short`
Expected: only the files from Tasks 1-5 plus any known unrelated pre-existing edits remain.

- [ ] **Step 4: Create the final feature commit**

```bash
git add supabase/config.toml supabase/migrations/20260706160000_add_profile_email_for_recovery.sql src/features/auth/username-auth.ts src/features/auth/username-auth.test.ts src/lib/db/user-profile-repo.ts src/lib/db/user-profile-repo.test.ts src/lib/supabase/admin.ts src/app/auth/sign-in/route.ts src/app/auth/sign-in/route.test.ts src/app/auth/sign-up/route.ts src/app/auth/sign-up/route.test.ts src/app/auth/recovery/route.ts src/app/auth/recovery/route.test.ts src/app/auth/reset-pin/route.ts src/app/auth/reset-pin/route.test.ts src/app/auth/recovery-email/route.ts src/app/auth/recovery-email/route.test.ts src/app/auth/callback/route.ts src/app/auth/callback/route.test.ts src/features/auth/login-form.tsx src/features/auth/login-form.test.tsx src/features/auth/reset-pin-form.tsx src/features/auth/reset-pin-form.test.tsx src/features/auth/recovery-email-panel.tsx src/features/auth/recovery-email-panel.test.tsx src/app/(auth)/login/page.tsx src/app/(auth)/login/page.test.tsx src/app/(auth)/reset-pin/page.tsx src/app/(auth)/reset-pin/page.test.tsx src/app/(app)/profile/page.tsx src/app/(app)/profile/page.test.tsx
git commit -m "feat: add email-backed username recovery"
```
