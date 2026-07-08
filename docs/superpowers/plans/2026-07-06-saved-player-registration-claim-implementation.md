# Saved Player Registration Claim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let new accounts automatically claim an existing saved player profile when there is one safe exact match, join that player's group automatically, and route ambiguous or missing matches through a narrow signed-in claim flow.

**Architecture:** Keep Supabase Auth, the current username-plus-PIN login form, and `auth.uid()`-based app code, but move claim-and-join into dedicated security-definer SQL functions that are called through a small server repository. Add a server-owned `/auth/complete` route that ensures the `user_profiles` row exists, tries an automatic claim for no-group users, and routes either into the claimed group or into a new `/claim-player` page.

**Tech Stack:** Next.js App Router, React 19, Supabase Auth/SSR, Supabase SQL migrations, Vitest, Testing Library, Zod.

---

## File Map

- Create: `supabase/migrations/20260706190000_add_saved_player_claim_functions.sql`
  Purpose: add the lookup and atomic claim functions that can safely read claim candidates and write `group_members`, `players.linked_user_id`, and `user_profiles.last_active_group_id` for a newly signed-in user.
- Create: `src/lib/db/player-claim-repo.ts`
  Purpose: wrap the new Supabase RPC calls in focused helpers for candidate listing, auto-claim resolution, and manual claiming.
- Create: `src/lib/db/player-claim-repo.test.ts`
  Purpose: prove the repository only auto-claims when there is one exact match and otherwise falls back to manual claim.
- Create: `src/features/auth/complete-auth-session.ts`
  Purpose: ensure the signed-in `user_profiles` row exists, detect whether the user already has a group, attempt auto-claim when needed, and choose the post-auth redirect path.
- Create: `src/features/auth/complete-auth-session.test.ts`
  Purpose: cover the redirect decisions for existing members, auto-claimed users, and no-group users who need the manual claim page.
- Create: `src/app/auth/complete/route.ts`
- Create: `src/app/auth/complete/route.test.ts`
  Purpose: expose a server-owned completion route that runs the shared auth-completion helper and redirects deterministically.
- Create: `src/app/(app)/claim-player/page.tsx`
- Create: `src/app/(app)/claim-player/page.test.tsx`
  Purpose: render the signed-in manual claim UI, allow choosing one candidate or skipping, and keep the page usable even when there are zero candidates.
- Modify: `src/features/auth/build-auth-callback-url.ts`
- Modify: `src/features/auth/build-auth-callback-url.test.ts`
  Purpose: add reusable `/auth/complete` path builders so both login and callback routing use the same next-path normalization.
- Modify: `src/features/auth/submit-username-auth.ts`
- Modify: `src/features/auth/submit-username-auth.test.ts`
  Purpose: stop writing `user_profiles` directly during signup and leave post-auth completion to the new server route.
- Modify: `src/features/auth/login-form.tsx`
- Modify: `src/features/auth/login-form.test.tsx`
  Purpose: send both sign-in and immediate-session sign-up through `/auth/complete` instead of jumping directly into app pages.
- Modify: `src/app/auth/callback/route.ts`
- Modify: `src/app/auth/callback/route.test.ts`
  Purpose: exchange the email callback code, then forward into `/auth/complete` instead of creating the profile inline and redirecting straight into the app.
- Modify: `src/features/auth/route-guards.ts`
- Modify: `src/features/auth/route-guards.test.ts`
  Purpose: treat `/claim-player` as a protected signed-in route.
- Modify: `src/features/groups/require-group-context.ts`
- Modify: `src/features/groups/require-group-context.test.ts`
  Purpose: send signed-in no-group users to `/claim-player` instead of the current `/log-game/import` dead end.
- Modify: `src/app/(app)/profile/page.tsx`
- Modify: `src/app/(app)/profile/page.test.tsx`
  Purpose: replace the no-group redirect with a claim-aware profile fallback card and a reduced navigation set.

### Task 1: Add Claim RPCs And The Server Repository

**Files:**
- Create: `supabase/migrations/20260706190000_add_saved_player_claim_functions.sql`
- Create: `src/lib/db/player-claim-repo.ts`
- Create: `src/lib/db/player-claim-repo.test.ts`

- [ ] **Step 1: Write the failing claim repository tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  claimSavedPlayerProfile,
  listClaimablePlayerProfiles,
  resolveSavedPlayerAutoClaim,
} from './player-claim-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('resolveSavedPlayerAutoClaim', () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);
  });

  it('claims the saved player when exactly one exact match exists', async () => {
    rpc
      .mockResolvedValueOnce({
        data: [
          {
            exact_match: true,
            group_id: 'group-1',
            group_name: 'Mars Club',
            match_reason: 'exact',
            player_id: 'player-1',
            player_name: 'Friday Mars',
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            group_id: 'group-1',
            group_name: 'Mars Club',
            player_name: 'Friday Mars',
          },
        ],
        error: null,
      });

    await expect(resolveSavedPlayerAutoClaim()).resolves.toEqual({
      groupId: 'group-1',
      groupName: 'Mars Club',
      playerName: 'Friday Mars',
      status: 'claimed-and-joined',
    });
  });

  it('returns manual-claim candidates when more than one exact match exists', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          exact_match: true,
          group_id: 'group-1',
          group_name: 'Mars Club',
          match_reason: 'exact',
          player_id: 'player-1',
          player_name: 'Friday Mars',
        },
        {
          exact_match: true,
          group_id: 'group-2',
          group_name: 'Second Table',
          match_reason: 'exact',
          player_id: 'player-2',
          player_name: 'Friday Mars',
        },
      ],
      error: null,
    });

    await expect(resolveSavedPlayerAutoClaim()).resolves.toEqual({
      candidates: [
        {
          exactMatch: true,
          groupId: 'group-1',
          groupName: 'Mars Club',
          matchReason: 'exact',
          playerId: 'player-1',
          playerName: 'Friday Mars',
        },
        {
          exactMatch: true,
          groupId: 'group-2',
          groupName: 'Second Table',
          matchReason: 'exact',
          playerId: 'player-2',
          playerName: 'Friday Mars',
        },
      ],
      status: 'needs-manual-claim',
    });
  });
});
```

- [ ] **Step 2: Run the repository test to verify it fails**

Run: `npm.cmd test -- src/lib/db/player-claim-repo.test.ts`
Expected: FAIL because the repository file and the new claim RPC wrappers do not exist yet.

- [ ] **Step 3: Add the security-definer claim functions**

```sql
create or replace function public.normalize_claim_player_name(input text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', ' ', 'g'));
$$;

create or replace function public.list_claimable_player_profiles()
returns table (
  player_id uuid,
  player_name text,
  group_id uuid,
  group_name text,
  match_reason text,
  exact_match boolean
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select normalize_claim_player_name(full_name) as normalized_full_name
    from public.user_profiles
    where user_id = auth.uid()
  )
  select
    p.id,
    p.display_name,
    p.group_id,
    g.name,
    case
      when normalize_claim_player_name(p.display_name) = me.normalized_full_name then 'exact'
      when normalize_claim_player_name(p.display_name) like me.normalized_full_name || '%' then 'partial'
      when me.normalized_full_name like normalize_claim_player_name(p.display_name) || '%' then 'partial'
      else null
    end as match_reason,
    normalize_claim_player_name(p.display_name) = me.normalized_full_name as exact_match
  from me
  join public.players p on p.linked_user_id is null
  join public.groups g on g.id = p.group_id
  where
    normalize_claim_player_name(p.display_name) = me.normalized_full_name
    or normalize_claim_player_name(p.display_name) like me.normalized_full_name || '%'
    or me.normalized_full_name like normalize_claim_player_name(p.display_name) || '%'
  order by exact_match desc, g.name, p.display_name;
$$;

create or replace function public.claim_player_profile(p_player_id uuid)
returns table (
  group_id uuid,
  group_name text,
  player_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player public.players%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not signed in.';
  end if;

  if not exists (
    select 1
    from public.list_claimable_player_profiles() candidate
    where candidate.player_id = p_player_id
  ) then
    raise exception 'That saved player profile is not claimable for this account.';
  end if;

  select *
  into v_player
  from public.players
  where id = p_player_id
  for update;

  if v_player.linked_user_id is not null and v_player.linked_user_id <> v_user_id then
    raise exception 'That saved player profile is already linked.';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_player.group_id, v_user_id, 'editor')
  on conflict (group_id, user_id) do nothing;

  update public.players
  set linked_user_id = v_user_id
  where id = v_player.id;

  update public.user_profiles
  set last_active_group_id = v_player.group_id,
      updated_at = now()
  where user_id = v_user_id;

  return query
  select g.id, g.name, v_player.display_name
  from public.groups g
  where g.id = v_player.group_id;
end;
$$;
```

- [ ] **Step 4: Wrap the RPCs in `player-claim-repo.ts`**

```ts
type ClaimCandidateRow = {
  exact_match: boolean;
  group_id: string;
  group_name: string;
  match_reason: 'exact' | 'partial';
  player_id: string;
  player_name: string;
};

export async function listClaimablePlayerProfiles() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('list_claimable_player_profiles');

  if (error) {
    throw error;
  }

  return ((data ?? []) as ClaimCandidateRow[]).map((candidate) => ({
    exactMatch: candidate.exact_match,
    groupId: candidate.group_id,
    groupName: candidate.group_name,
    matchReason: candidate.match_reason,
    playerId: candidate.player_id,
    playerName: candidate.player_name,
  }));
}

export async function claimSavedPlayerProfile(playerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('claim_player_profile', {
    p_player_id: playerId,
  });

  if (error || !data?.[0]) {
    throw error ?? new Error('Could not claim that saved player profile.');
  }

  return {
    groupId: data[0].group_id,
    groupName: data[0].group_name,
    playerName: data[0].player_name,
    status: 'claimed-and-joined' as const,
  };
}

export async function resolveSavedPlayerAutoClaim() {
  const candidates = await listClaimablePlayerProfiles();
  const exactMatches = candidates.filter((candidate) => candidate.exactMatch);

  if (exactMatches.length !== 1) {
    return {
      candidates,
      status: 'needs-manual-claim' as const,
    };
  }

  return claimSavedPlayerProfile(exactMatches[0].playerId);
}
```

- [ ] **Step 5: Run the repository test to verify it passes**

Run: `npm.cmd test -- src/lib/db/player-claim-repo.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260706190000_add_saved_player_claim_functions.sql src/lib/db/player-claim-repo.ts src/lib/db/player-claim-repo.test.ts
git commit -m "feat: add saved player claim rpc flow"
```

### Task 2: Add The Shared Auth Completion Route

**Files:**
- Create: `src/features/auth/complete-auth-session.ts`
- Create: `src/features/auth/complete-auth-session.test.ts`
- Create: `src/app/auth/complete/route.ts`
- Create: `src/app/auth/complete/route.test.ts`
- Modify: `src/features/auth/build-auth-callback-url.ts`
- Modify: `src/features/auth/build-auth-callback-url.test.ts`
- Modify: `src/app/auth/callback/route.ts`
- Modify: `src/app/auth/callback/route.test.ts`

- [ ] **Step 1: Write the failing auth-completion tests**

```ts
import { buildAuthCompletePath } from './build-auth-callback-url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completeAuthSession } from './complete-auth-session';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';
import { resolveSavedPlayerAutoClaim } from '@/lib/db/player-claim-repo';

vi.mock('@/lib/db/group-context-repo', () => ({
  getCurrentGroupContext: vi.fn(),
}));

vi.mock('@/lib/db/player-claim-repo', () => ({
  resolveSavedPlayerAutoClaim: vi.fn(),
}));

describe('completeAuthSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a safe auth-complete path from the requested next path', () => {
    expect(buildAuthCompletePath('/profile')).toBe('/auth/complete?next=%2Fprofile');
  });

  it('sends existing group members straight to the requested next path', async () => {
    vi.mocked(getCurrentGroupContext).mockResolvedValue({
      groupId: 'group-1',
      groupName: 'Mars Club',
      role: 'editor',
      userId: 'user-1',
    });

    await expect(
      completeAuthSession({ nextPath: '/log-game/import' }),
    ).resolves.toEqual({
      redirectPath: '/log-game/import',
    });
  });

  it('routes no-group users to the claim page when auto-claim is not available', async () => {
    vi.mocked(getCurrentGroupContext).mockResolvedValue(null);
    vi.mocked(resolveSavedPlayerAutoClaim).mockResolvedValue({
      candidates: [],
      status: 'needs-manual-claim',
    });

    await expect(
      completeAuthSession({ nextPath: '/profile' }),
    ).resolves.toEqual({
      redirectPath: '/claim-player?next=%2Fprofile',
    });
  });
});
```

- [ ] **Step 2: Run the completion tests to verify they fail**

Run: `npm.cmd test -- src/features/auth/build-auth-callback-url.test.ts src/features/auth/complete-auth-session.test.ts src/app/auth/callback/route.test.ts`
Expected: FAIL because the completion helper and `/auth/complete` route do not exist yet, and the callback still performs profile creation inline.

- [ ] **Step 3: Create the completion helper and route**

```ts
export function buildAuthCompletePath(nextPath: string) {
  return `/auth/complete?next=${encodeURIComponent(normalizeNextPath(nextPath))}`;
}

export function buildAuthCompleteClaimPath(nextPath: string) {
  return `/claim-player?next=${encodeURIComponent(normalizeNextPath(nextPath))}`;
}

function getUsernameFromSyntheticAuthEmail(email: string | null | undefined) {
  if (!email) {
    return '';
  }

  const [localPart, domain] = email.split('@');
  return domain === 'users.tmstats.local' ? normalizeUsername(localPart) : '';
}

export async function completeAuthSession(input: { nextPath: string }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { redirectPath: '/login?error=auth_callback' };
  }

  const username = getUsernameFromSyntheticAuthEmail(user.email);
  const parsedFullName = signupFullNameSchema.safeParse(user.user_metadata?.full_name);

  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingProfile && parsedFullName.success && username) {
    const { error: profileInsertError } = await supabase.from('user_profiles').insert({
      full_name: parsedFullName.data,
      user_id: user.id,
      username,
    });

    if (profileInsertError) {
      throw profileInsertError;
    }
  }

  const existingContext = await getCurrentGroupContext();
  if (existingContext) {
    return { redirectPath: normalizeNextPath(input.nextPath) };
  }

  const claimResult = await resolveSavedPlayerAutoClaim();
  if (claimResult.status === 'claimed-and-joined') {
    return { redirectPath: normalizeNextPath(input.nextPath) };
  }

  return {
    redirectPath: buildAuthCompleteClaimPath(input.nextPath),
  };
}
```

```ts
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = normalizeNextPath(requestUrl.searchParams.get('next'));
  const result = await completeAuthSession({ nextPath });
  return NextResponse.redirect(new URL(result.redirectPath, requestUrl.origin));
}
```

- [ ] **Step 4: Rewire the email callback to forward into `/auth/complete`**

```ts
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = normalizeNextPath(requestUrl.searchParams.get('next'));

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(
          new URL(buildAuthCompletePath(nextPath), requestUrl.origin),
        );
      }
    } catch (error) {
      console.error('Supabase auth callback failed', error);
    }
  }

  const loginUrl = new URL('/login', requestUrl.origin);
  loginUrl.searchParams.set('error', 'auth_callback');
  return NextResponse.redirect(loginUrl);
}
```

- [ ] **Step 5: Run the auth completion and callback tests to verify they pass**

Run: `npm.cmd test -- src/features/auth/complete-auth-session.test.ts src/app/auth/complete/route.test.ts src/app/auth/callback/route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/build-auth-callback-url.ts src/features/auth/build-auth-callback-url.test.ts src/features/auth/complete-auth-session.ts src/features/auth/complete-auth-session.test.ts src/app/auth/complete/route.ts src/app/auth/complete/route.test.ts src/app/auth/callback/route.ts src/app/auth/callback/route.test.ts
git commit -m "feat: add shared auth completion routing"
```

### Task 3: Route Login Success Through Auth Completion

**Files:**
- Modify: `src/features/auth/submit-username-auth.ts`
- Modify: `src/features/auth/submit-username-auth.test.ts`
- Modify: `src/features/auth/login-form.tsx`
- Modify: `src/features/auth/login-form.test.tsx`

- [ ] **Step 1: Write the failing login-routing tests**

```tsx
it('routes sign-in through auth completion instead of jumping directly to the page', async () => {
  render(<LoginForm nextPath="/profile" />);

  await user.type(screen.getByLabelText(/username/i), 'friday-mars');
  await user.type(screen.getByLabelText(/4-digit pin/i), '1234');
  await user.click(screen.getByRole('button', { name: /^sign in$/i }));

  await waitFor(() =>
    expect(window.location.assign).toHaveBeenCalledWith(
      '/auth/complete?next=%2Fprofile',
    ),
  );
});
```

```ts
it('returns signed-in without inserting a profile row when sign up creates a session', async () => {
  const result = await submitUsernameAuth({
    client: createClient(),
    fullName: 'Friday Mars',
    mode: 'sign-up',
    pin: '1234',
    username: 'Friday Mars',
  });

  expect(result).toEqual({
    action: 'signed-in',
    ok: true,
  });
});
```

- [ ] **Step 2: Run the login-routing tests to verify they fail**

Run: `npm.cmd test -- src/features/auth/submit-username-auth.test.ts src/features/auth/login-form.test.tsx`
Expected: FAIL because `submitUsernameAuth` still inserts `user_profiles`, and `LoginForm` still assigns `nextPath` directly.

- [ ] **Step 3: Simplify `submitUsernameAuth` for post-auth completion**

```ts
type UsernameAuthClient = {
  auth: {
    signInWithPassword(input: {
      email: string;
      password: string;
    }): Promise<{ error: unknown | null }>;
    signUp(input: {
      email: string;
      options: {
        data: {
          full_name: string;
        };
        emailRedirectTo?: string;
      };
      password: string;
    }): Promise<SignupResponse>;
  };
};

if (!signupResult.data.session) {
  return {
    action: 'awaiting-email',
    ok: true,
    status: {
      message:
        'Check your email for the Supabase sign-in link to finish creating this account.',
      state: 'success',
    },
  };
}

return {
  action: 'signed-in',
  ok: true,
};
```

- [ ] **Step 4: Update `LoginForm` to always finish via `/auth/complete`**

```tsx
const completionPath = buildAuthCompletePath(nextPath);

if (result.action === 'awaiting-email') {
  setStatus(result.status);
  return;
}

window.location.assign(completionPath);
```

- [ ] **Step 5: Run the login-routing tests to verify they pass**

Run: `npm.cmd test -- src/features/auth/submit-username-auth.test.ts src/features/auth/login-form.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/submit-username-auth.ts src/features/auth/submit-username-auth.test.ts src/features/auth/login-form.tsx src/features/auth/login-form.test.tsx
git commit -m "feat: route auth success through completion flow"
```

### Task 4: Add The Signed-In Claim Player Page

**Files:**
- Create: `src/app/(app)/claim-player/page.tsx`
- Create: `src/app/(app)/claim-player/page.test.tsx`
- Modify: `src/features/auth/route-guards.ts`
- Modify: `src/features/auth/route-guards.test.ts`

- [ ] **Step 1: Write the failing claim-page tests**

```tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClaimPlayerPage from './page';
import { listClaimablePlayerProfiles } from '@/lib/db/player-claim-repo';

vi.mock('@/lib/db/player-claim-repo', () => ({
  listClaimablePlayerProfiles: vi.fn(),
  claimSavedPlayerProfile: vi.fn(),
}));

describe('ClaimPlayerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders matched saved player candidates with group names', async () => {
    vi.mocked(listClaimablePlayerProfiles).mockResolvedValue([
      {
        exactMatch: true,
        groupId: 'group-1',
        groupName: 'Mars Club',
        matchReason: 'exact',
        playerId: 'player-1',
        playerName: 'Friday Mars',
      },
    ]);

    render(await ClaimPlayerPage({}));

    expect(screen.getByText(/friday mars/i)).toBeInTheDocument();
    expect(screen.getByText(/mars club/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /claim this profile/i }),
    ).toBeInTheDocument();
  });
});
```

```ts
it('protects the claim page route', () => {
  expect(isProtectedPath('/claim-player')).toBe(true);
});
```

- [ ] **Step 2: Run the claim-page tests to verify they fail**

Run: `npm.cmd test -- "src/app/(app)/claim-player/page.test.tsx" src/features/auth/route-guards.test.ts`
Expected: FAIL because the page does not exist yet and `/claim-player` is not protected.

- [ ] **Step 3: Create the page and protect the route**

```tsx
export default async function ClaimPlayerPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextPath = normalizeNextPath(resolvedSearchParams?.next);
  const candidates = await listClaimablePlayerProfiles();

  async function handleClaim(formData: FormData) {
    'use server';

    await claimSavedPlayerProfile(z.string().uuid().parse(formData.get('playerId')));
    redirect(nextPath);
  }

  async function handleSkip() {
    'use server';
    redirect('/profile');
  }

  return (
    <AppShell
      navItems={[{ href: '/profile', label: 'My Profile' }]}
      title="Claim Saved Player"
    >
      <section className="tm-panel flex flex-col gap-4">
        <p className="tm-body-copy text-sm">
          We found saved player profiles that may already contain your Terraforming
          Mars history.
        </p>
        {candidates.length === 0 ? (
          <p className="tm-muted-copy text-sm">
            No matching saved player profiles were found yet. You can keep this
            account and claim a saved roster entry later.
          </p>
        ) : (
          <ul className="grid gap-3">
            {candidates.map((candidate) => (
              <li className="tm-stat-card" key={candidate.playerId}>
                <p className="font-semibold text-stone-100">{candidate.playerName}</p>
                <p className="tm-muted-copy text-sm">{candidate.groupName}</p>
                <p className="tm-data-label">{candidate.matchReason}</p>
                <form action={handleClaim} className="mt-3">
                  <input name="playerId" type="hidden" value={candidate.playerId} />
                  <button className="tm-button-primary" type="submit">
                    Claim This Profile
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={handleSkip}>
          <button className="tm-button-secondary" type="submit">
            Skip For Now
          </button>
        </form>
      </section>
    </AppShell>
  );
}
```

```ts
export const protectedPrefixes = [
  '/claim-player',
  '/profile',
  '/group',
  '/insights',
  '/log-game',
] as const;
```

- [ ] **Step 4: Run the claim-page tests to verify they pass**

Run: `npm.cmd test -- "src/app/(app)/claim-player/page.test.tsx" src/features/auth/route-guards.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/claim-player/page.tsx" "src/app/(app)/claim-player/page.test.tsx" src/features/auth/route-guards.ts src/features/auth/route-guards.test.ts
git commit -m "feat: add signed-in player claim page"
```

### Task 5: Replace No-Group Dead Ends With Claim Prompts

**Files:**
- Modify: `src/features/groups/require-group-context.ts`
- Modify: `src/features/groups/require-group-context.test.ts`
- Modify: `src/app/(app)/profile/page.tsx`
- Modify: `src/app/(app)/profile/page.test.tsx`

- [ ] **Step 1: Write the failing no-group fallback tests**

```ts
it('redirects to the claim page when the signed-in user has no group yet', async () => {
  groupContextMocks.getCurrentGroupContext.mockResolvedValue(null);

  await requireGroupContextOrRedirect();

  expect(navigationMocks.redirect).toHaveBeenCalledWith('/claim-player');
});
```

```tsx
it('renders a claim prompt when the signed-in user has no active group yet', async () => {
  vi.mocked(getCurrentGroupContext).mockResolvedValue(null);

  render(await ProfilePage());

  expect(
    screen.getByText(/claim a saved player profile to join the group that already has your history/i),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /review saved player matches/i }),
  ).toHaveAttribute('href', '/claim-player');
  expect(getProfileAnalytics).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the no-group fallback tests to verify they fail**

Run: `npm.cmd test -- src/features/groups/require-group-context.test.ts "src/app/(app)/profile/page.test.tsx"`
Expected: FAIL because group-less users still redirect to `/log-game/import` and the profile page still treats missing group context as a redirect instead of a renderable prompt.

- [ ] **Step 3: Point no-group users at claim-aware surfaces**

```ts
export async function requireGroupContextOrRedirect(): Promise<CurrentGroupContext> {
  const context = await getCurrentGroupContext();

  if (!context) {
    redirect('/claim-player');
  }

  return context;
}
```

```tsx
if (!context) {
  return (
    <AppShell
      navItems={[{ href: '/profile', label: 'My Profile' }]}
      title="My Profile"
    >
      <ChartFrame title="Claim Your Saved Player">
        <p className="text-sm text-stone-300">
          Claim a saved player profile to join the group that already has your
          history and unlock your personal analytics.
        </p>
        <Link className="tm-button-primary mt-4 inline-flex w-fit" href="/claim-player">
          Review Saved Player Matches
        </Link>
      </ChartFrame>
    </AppShell>
  );
}
```

- [ ] **Step 4: Run the focused saved-player-claim verification set**

Run: `npm.cmd test -- src/lib/db/player-claim-repo.test.ts src/features/auth/build-auth-callback-url.test.ts src/features/auth/complete-auth-session.test.ts src/app/auth/complete/route.test.ts src/app/auth/callback/route.test.ts src/features/auth/submit-username-auth.test.ts src/features/auth/login-form.test.tsx src/features/auth/route-guards.test.ts src/features/groups/require-group-context.test.ts "src/app/(app)/claim-player/page.test.tsx" "src/app/(app)/profile/page.test.tsx" src/features/groups/player-list.test.tsx src/features/games/log-game/log-game-wizard.test.tsx`
Expected: PASS with 0 failures.

Run: `npm.cmd run build`
Expected: PASS and emit the normal Next.js production build summary without route or type errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/groups/require-group-context.ts src/features/groups/require-group-context.test.ts "src/app/(app)/profile/page.tsx" "src/app/(app)/profile/page.test.tsx"
git commit -m "feat: add no-group claim fallbacks"
```

## Self-Review

### Spec coverage

- Auto-claim from a single safe exact saved-player match is covered by Tasks 1 and 2.
- Automatic group join and `last_active_group_id` updates are covered by Task 1.
- Shared post-auth completion for immediate-session signup and email callback signup is covered by Tasks 2 and 3.
- The signed-in `/claim-player` manual fallback is covered by Task 4.
- No-group redirects and profile dead ends are replaced with claim prompts in Task 5.
- First-and-last-name validation staying intact for roster and log-game player entry is regression-covered in Task 5 via `src/features/groups/player-list.test.tsx` and the existing `src/features/games/log-game/log-game-wizard.test.tsx` suite, while the underlying validation code is intentionally left unchanged.

### Placeholder scan

- No `TODO`, `TBD`, or `implement later` placeholders remain.
- Every task includes exact file paths, concrete code snippets, and Windows-safe commands.

### Type consistency

- The claim repository uses one naming set throughout: `listClaimablePlayerProfiles`, `claimSavedPlayerProfile`, and `resolveSavedPlayerAutoClaim`.
- The shared post-auth helper stays `completeAuthSession`, and the new path helpers stay `buildAuthCompletePath` and `buildAuthCompleteClaimPath`.
- The manual-claim status stays `needs-manual-claim`, and the successful claim status stays `claimed-and-joined` across tests, repository helpers, and route logic.
