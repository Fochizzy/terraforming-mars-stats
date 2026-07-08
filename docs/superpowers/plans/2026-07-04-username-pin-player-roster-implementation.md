# Username PIN Player Roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace email magic-link login with username plus 4-digit PIN auth, add active-group tracking for multi-group users, and let game logging resolve typed full names into group-scoped roster players automatically.

**Architecture:** Keep Supabase Auth sessions and `auth.uid()`-based RLS, but add an app-level `user_profiles` table and a deterministic synthetic email derived from the username. Preserve the existing log-game form shape by allowing `selectedPlayerIds` to temporarily hold either saved player IDs or typed full names, then resolve those names to real group player rows during draft save and finalization.

**Tech Stack:** Next.js App Router, React 19, Supabase Auth/SSR, Supabase SQL migrations, Vitest, Testing Library, Zod.

---

## File Map

- Create: `supabase/migrations/20260704123000_add_username_profiles_and_player_resolution.sql`
  Purpose: add `user_profiles`, player-name uniqueness support, and updated write policies for group members logging games.
- Create: `src/features/auth/username-auth.ts`
  Purpose: normalize usernames, validate PINs, build deterministic synthetic emails, and validate full names used by signup.
- Create: `src/features/auth/username-auth.test.ts`
  Purpose: prove auth helper normalization and validation behavior.
- Create: `src/features/auth/login-form.test.tsx`
  Purpose: cover username/PIN sign-in and create-account behavior with mocked Supabase browser client.
- Create: `src/features/groups/group-switcher.tsx`
  Purpose: render the active-group switcher and submit a server action to update `last_active_group_id`.
- Create: `src/lib/db/user-profile-repo.ts`
  Purpose: create/read/update the signed-in user's profile and active-group preference.
- Create: `src/lib/db/log-game-player-resolution.ts`
  Purpose: resolve mixed saved-player IDs and typed full names into real group player IDs and remap dependent draft payload keys.
- Create: `src/lib/db/log-game-player-resolution.test.ts`
  Purpose: verify typed-name resolution, duplicate detection, and remapping behavior.
- Modify: `src/features/auth/login-form.tsx`
  Purpose: swap email OTP UI for sign-in/create-account username+PIN flows.
- Modify: `src/app/(auth)/login/page.tsx`
  Purpose: update copy for username+PIN access and account creation.
- Modify: `src/app/(auth)/login/page.test.tsx`
  Purpose: expect the new auth copy and controls.
- Modify: `src/lib/db/group-context-repo.ts`
  Purpose: resolve the active group from `last_active_group_id`, expose user groups for the switcher, and update the preference.
- Modify: `src/features/groups/require-group-context.ts`
  Purpose: keep redirect behavior intact while using the new active-group resolution.
- Modify: `src/components/layout/app-shell.tsx`
  Purpose: accept header controls so the group switcher can appear consistently.
- Modify: `src/components/layout/app-shell.test.tsx`
  Purpose: cover rendering shell actions alongside nav items.
- Modify: `src/app/(app)/group/page.tsx`
- Modify: `src/app/(app)/group/players/page.tsx`
- Modify: `src/app/(app)/group/settings/page.tsx`
- Modify: `src/app/(app)/insights/page.tsx`
- Modify: `src/app/(app)/log-game/page.tsx`
- Modify: `src/app/(app)/profile/page.tsx`
  Purpose: pass switcher controls into `AppShell`.
- Modify: `src/lib/db/player-repo.ts`
  Purpose: create or reuse group players with normalized-name uniqueness and optional self-linking.
- Modify: `src/features/groups/player-list.tsx`
- Modify: `src/features/groups/player-list.test.tsx`
  Purpose: enforce full-name validation on direct roster adds.
- Modify: `src/features/games/log-game/players-step.tsx`
  Purpose: support selecting existing roster players or typing new full names from one input surface.
- Modify: `src/features/games/log-game/log-game-wizard.tsx`
  Purpose: preserve mixed selected values and derive selected-player display rows from either saved IDs or typed names.
- Modify: `src/lib/validation/log-game.ts`
  Purpose: allow mixed selected-player references while keeping existing payload structure.
- Modify: `src/lib/db/game-draft-repo.ts`
- Modify: `src/lib/db/game-draft-repo.test.ts`
  Purpose: resolve typed names before draft/finalized writes and persist only resolved player IDs after save.

### Task 1: Add Auth/Profile Foundations

**Files:**
- Create: `supabase/migrations/20260704123000_add_username_profiles_and_player_resolution.sql`
- Create: `src/features/auth/username-auth.ts`
- Create: `src/features/auth/username-auth.test.ts`
- Create: `src/lib/db/user-profile-repo.ts`
- Modify: `src/lib/db/group-context-repo.ts`

- [ ] **Step 1: Write the failing helper tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  buildSyntheticAuthEmail,
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

  it('rejects non four-digit PIN values', () => {
    expect(() => pinSchema.parse('12a4')).toThrow(/4 digits/i);
  });

  it('requires first and last name for signup', () => {
    expect(() => signupFullNameSchema.parse('Friday')).toThrow(/full name/i);
  });
});
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run: `npm.cmd test -- src/features/auth/username-auth.test.ts`
Expected: FAIL because `src/features/auth/username-auth.ts` does not exist yet.

- [ ] **Step 3: Write the minimal auth helper implementation**

```ts
import { z } from 'zod';

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

export function buildSyntheticAuthEmail(username: string) {
  return `${normalizeUsername(username)}@users.tmstats.local`;
}
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run: `npm.cmd test -- src/features/auth/username-auth.test.ts`
Expected: PASS

- [ ] **Step 5: Add the migration and profile repository**

```sql
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  last_active_group_id uuid references public.groups(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "users read their own profiles"
on public.user_profiles for select
using (user_id = auth.uid());

create policy "users insert their own profiles"
on public.user_profiles for insert
with check (user_id = auth.uid());

create policy "users update their own profiles"
on public.user_profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

```ts
export async function setCurrentUserLastActiveGroup(input: {
  groupId: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('user_profiles').upsert({
    user_id: input.userId,
    last_active_group_id: input.groupId,
  });

  if (error) {
    throw error;
  }
}
```

- [ ] **Step 6: Update active-group resolution to use the profile**

```ts
const { data: profile } = await supabase
  .from('user_profiles')
  .select('last_active_group_id')
  .eq('user_id', user.id)
  .maybeSingle();

const memberships = await supabase
  .from('group_members')
  .select('group_id, role, groups(name)')
  .eq('user_id', user.id)
  .order('created_at', { ascending: true });

const preferredMembership =
  memberships.data?.find((row) => row.group_id === profile?.last_active_group_id) ??
  memberships.data?.[0];
```

- [ ] **Step 7: Run the group-context tests and env tests**

Run: `npm.cmd test -- src/features/groups/require-group-context.test.ts src/lib/env.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260704123000_add_username_profiles_and_player_resolution.sql src/features/auth/username-auth.ts src/features/auth/username-auth.test.ts src/lib/db/user-profile-repo.ts src/lib/db/group-context-repo.ts src/features/groups/require-group-context.test.ts
git commit -m "feat: add username auth foundations"
```

### Task 2: Replace Email Login With Username Plus PIN

**Files:**
- Modify: `src/features/auth/login-form.tsx`
- Create: `src/features/auth/login-form.test.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/login/page.test.tsx`

- [ ] **Step 1: Write the failing login form tests**

```tsx
it('signs in with username and pin', async () => {
  render(<LoginForm nextPath="/profile" />);

  await user.type(screen.getByLabelText(/username/i), 'friday-mars');
  await user.type(screen.getByLabelText(/4-digit pin/i), '1234');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() =>
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'friday-mars@users.tmstats.local',
      password: '1234',
    }),
  );
});

it('creates an account with full name, username, and pin', async () => {
  render(<LoginForm nextPath="/profile" />);

  await user.click(screen.getByRole('button', { name: /create account/i }));
  await user.type(screen.getByLabelText(/full name/i), 'Friday Mars');
  await user.type(screen.getByLabelText(/username/i), 'friday-mars');
  await user.type(screen.getByLabelText(/4-digit pin/i), '1234');
  await user.click(screen.getByRole('button', { name: /create account/i }));

  await waitFor(() =>
    expect(mockInsertProfile).toHaveBeenCalledWith({
      full_name: 'Friday Mars',
      username: 'friday-mars',
      user_id: 'user-1',
    }),
  );
});
```

- [ ] **Step 2: Run the login tests to verify they fail**

Run: `npm.cmd test -- src/features/auth/login-form.test.tsx src/app/(auth)/login/page.test.tsx`
Expected: FAIL because the form still renders email-magic-link controls.

- [ ] **Step 3: Write the minimal login/create-account UI**

```tsx
const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
const [username, setUsername] = useState('');
const [fullName, setFullName] = useState('');
const [pin, setPin] = useState('');

if (mode === 'sign-in') {
  const { error } = await supabase.auth.signInWithPassword({
    email: buildSyntheticAuthEmail(username),
    password: pin,
  });
}

if (mode === 'sign-up') {
  const { data, error } = await supabase.auth.signUp({
    email: buildSyntheticAuthEmail(username),
    password: pin,
    options: {
      data: { full_name: signupFullNameSchema.parse(fullName) },
    },
  });

  await supabase.from('user_profiles').insert({
    full_name: signupFullNameSchema.parse(fullName),
    username: normalizeUsername(username),
    user_id: data.user.id,
  });
}
```

- [ ] **Step 4: Update the login page copy**

```tsx
<p className="tm-body-copy text-sm">
  Sign in with your username and 4-digit PIN, or create an account with your full name.
</p>
```

- [ ] **Step 5: Run the login tests to verify they pass**

Run: `npm.cmd test -- src/features/auth/login-form.test.tsx src/app/(auth)/login/page.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/login-form.tsx src/features/auth/login-form.test.tsx src/app/(auth)/login/page.tsx src/app/(auth)/login/page.test.tsx
git commit -m "feat: switch login to username and pin"
```

### Task 3: Add Active Group Switching

**Files:**
- Create: `src/features/groups/group-switcher.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/app-shell.test.tsx`
- Modify: `src/app/(app)/group/page.tsx`
- Modify: `src/app/(app)/group/players/page.tsx`
- Modify: `src/app/(app)/group/settings/page.tsx`
- Modify: `src/app/(app)/insights/page.tsx`
- Modify: `src/app/(app)/log-game/page.tsx`
- Modify: `src/app/(app)/profile/page.tsx`

- [ ] **Step 1: Write the failing app shell test for header actions**

```tsx
it('renders header controls when provided', () => {
  render(
    <AppShell title="My Profile" headerActions={<div>group switcher</div>}>
      content
    </AppShell>,
  );

  expect(screen.getByText(/group switcher/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the shell test to verify it fails**

Run: `npm.cmd test -- src/components/layout/app-shell.test.tsx`
Expected: FAIL because `headerActions` is not supported yet.

- [ ] **Step 3: Add `headerActions` support to the shell**

```tsx
export function AppShell({
  title,
  children,
  headerActions,
  navItems,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  navItems?: BottomNavItem[];
  wide?: boolean;
}) {
  return (
    <main className="tm-app-shell">
      <div className={`mx-auto flex min-h-screen flex-col ${wide ? 'max-w-md lg:max-w-2xl' : 'max-w-md'}`}>
        <header className="tm-app-header">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="tm-display-eyebrow text-[11px]">Terraforming Mars Stats</p>
              <h1 className="tm-display-title mt-2 text-2xl font-bold">{title}</h1>
            </div>
            {headerActions}
          </div>
        </header>
```

- [ ] **Step 4: Create the group switcher component**

```tsx
export async function GroupSwitcher({
  currentGroupId,
  returnPath,
}: {
  currentGroupId: string;
  returnPath: string;
}) {
  const groups = await listCurrentUserGroups();

  async function handleSwitch(formData: FormData) {
    'use server';

    const groupId = formData.get('groupId');
    const context = await requireCurrentGroupContext();

    await setCurrentUserLastActiveGroup({
      groupId: z.string().uuid().parse(groupId),
      userId: context.userId,
    });

    redirect(returnPath);
  }

  if (groups.length < 2) {
    return null;
  }

  return (
    <form action={handleSwitch} className="flex items-center gap-2">
      <select className="tm-input min-w-40" defaultValue={currentGroupId} name="groupId">
        {groups.map((group) => (
          <option key={group.groupId} value={group.groupId}>
            {group.groupName}
          </option>
        ))}
      </select>
      <button className="tm-button-secondary" type="submit">Switch</button>
    </form>
  );
}
```

- [ ] **Step 5: Pass switcher controls into each authenticated page**

```tsx
<AppShell
  headerActions={
    <GroupSwitcher currentGroupId={context.groupId} returnPath="/log-game" />
  }
  title="Log Game"
>
```

- [ ] **Step 6: Run the shell and group-context tests**

Run: `npm.cmd test -- src/components/layout/app-shell.test.tsx src/features/groups/require-group-context.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/groups/group-switcher.tsx src/components/layout/app-shell.tsx src/components/layout/app-shell.test.tsx src/app/(app)/group/page.tsx src/app/(app)/group/players/page.tsx src/app/(app)/group/settings/page.tsx src/app/(app)/insights/page.tsx src/app/(app)/log-game/page.tsx src/app/(app)/profile/page.tsx
git commit -m "feat: add active group switching"
```

### Task 4: Resolve Typed Player Names Into Group Roster Entries

**Files:**
- Create: `src/lib/db/log-game-player-resolution.ts`
- Create: `src/lib/db/log-game-player-resolution.test.ts`
- Modify: `src/lib/db/player-repo.ts`
- Modify: `src/lib/db/game-draft-repo.ts`
- Modify: `src/lib/db/game-draft-repo.test.ts`
- Modify: `src/app/(app)/group/players/page.tsx`

- [ ] **Step 1: Write the failing player-resolution tests**

```ts
it('reuses existing players when a typed name matches the roster', async () => {
  await expect(
    resolveLogGamePlayerReferences({
      selectedPlayerIds: ['existing-id', 'Friday Mars'],
      groupId: 'group-1',
    }),
  ).resolves.toMatchObject({
    selectedPlayerIds: ['existing-id', 'player-friday'],
  });
});

it('creates a new group player when a typed name is not in the roster', async () => {
  await expect(
    resolveLogGamePlayerReferences({
      selectedPlayerIds: ['New Player Name'],
      groupId: 'group-1',
    }),
  ).resolves.toMatchObject({
    selectedPlayerIds: ['player-new'],
  });
});
```

- [ ] **Step 2: Run the player-resolution tests to verify they fail**

Run: `npm.cmd test -- src/lib/db/log-game-player-resolution.test.ts src/lib/db/game-draft-repo.test.ts`
Expected: FAIL because the resolver does not exist yet and draft saves still persist raw mixed values.

- [ ] **Step 3: Create the minimal resolution utility**

```ts
export async function resolveLogGamePlayerReferences(input: LogGameDraftInput) {
  const roster = await listPlayers(input.groupId);
  const rosterById = new Map(roster.map((player) => [player.id, player]));
  const rosterByName = new Map(
    roster.map((player) => [normalizePlayerAlias(player.display_name), player]),
  );

  const replacements = new Map<string, string>();

  for (const reference of input.selectedPlayerIds) {
    if (rosterById.has(reference)) {
      replacements.set(reference, reference);
      continue;
    }

    const fullName = signupFullNameSchema.parse(reference);
    const normalizedName = normalizePlayerAlias(fullName);
    const existing = rosterByName.get(normalizedName);

    if (existing) {
      replacements.set(reference, existing.id);
      continue;
    }

    const created = await createPlayerIfMissing({
      displayName: fullName,
      groupId: input.groupId,
    });

    replacements.set(reference, created.id);
    rosterByName.set(normalizedName, created);
  }

  return remapDraftPlayerReferences(input, replacements);
}
```

- [ ] **Step 4: Use the resolver in draft save/finalize and roster add**

```ts
const resolved = await resolveLogGamePlayerReferences(parsed);
const gameId = await upsertGameShell({
  form: resolved,
  userId: payload.userId,
  status: 'draft',
});

await saveGameRevision(gameId, payload.userId, resolved, 'Draft autosave');
```

```ts
await createPlayerIfMissing({
  displayName: parsedDisplayName,
  groupId: activeContext.groupId,
  linkedUserId: activeContext.userId,
});
```

- [ ] **Step 5: Run the player-resolution and draft repo tests**

Run: `npm.cmd test -- src/lib/db/log-game-player-resolution.test.ts src/lib/db/game-draft-repo.test.ts src/features/groups/player-list.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/log-game-player-resolution.ts src/lib/db/log-game-player-resolution.test.ts src/lib/db/player-repo.ts src/lib/db/game-draft-repo.ts src/lib/db/game-draft-repo.test.ts src/app/(app)/group/players/page.tsx src/features/groups/player-list.test.tsx
git commit -m "feat: resolve typed player names into group rosters"
```

### Task 5: Update Log Game Player Entry UI

**Files:**
- Modify: `src/features/games/log-game/players-step.tsx`
- Modify: `src/features/games/log-game/log-game-wizard.tsx`
- Modify: `src/lib/validation/log-game.ts`
- Modify: `src/features/games/log-game/log-game-wizard.test.tsx`
- Modify: `src/features/groups/player-list.tsx`

- [ ] **Step 1: Write the failing UI test for typed player adds**

```tsx
it('adds a typed player name that is not already in the saved roster', async () => {
  render(<LogGameWizard {...props} />);

  await user.type(screen.getByLabelText(/add or select player/i), 'New Player Name');
  await user.click(screen.getByRole('button', { name: /add player/i }));

  expect(screen.getByText(/new player name/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the log-game wizard test to verify it fails**

Run: `npm.cmd test -- src/features/games/log-game/log-game-wizard.test.tsx`
Expected: FAIL because the player step only supports checkbox selection from saved roster.

- [ ] **Step 3: Implement the mixed add/select input in `PlayersStep`**

```tsx
const [playerEntry, setPlayerEntry] = useState('');

function handleAddPlayerReference() {
  const rawValue = playerEntry.trim();
  if (!rawValue) return;

  const existing = playerOptions.find(
    (player) => normalizePlayerAlias(player.display_name) === normalizePlayerAlias(rawValue),
  );
  const nextValue = existing ? existing.id : signupFullNameSchema.parse(rawValue);

  if (selectedPlayerIds.includes(nextValue)) {
    return;
  }

  setValue('selectedPlayerIds', [...selectedPlayerIds, nextValue]);
  setPlayerEntry('');
}
```

- [ ] **Step 4: Derive display rows for saved IDs and typed names**

```tsx
const selectedPlayers = selectedPlayerIds.map((reference) => {
  const existing = playerOptions.find((player) => player.id === reference);
  return existing ?? { id: reference, display_name: reference };
});
```

- [ ] **Step 5: Share full-name validation with direct roster adds**

```tsx
disabled={isPending || !canAddFullName(displayName)}
```

- [ ] **Step 6: Run the log-game and roster tests**

Run: `npm.cmd test -- src/features/games/log-game/log-game-wizard.test.tsx src/features/groups/player-list.test.tsx`
Expected: PASS

- [ ] **Step 7: Run the focused auth, shell, draft, and group tests together**

Run: `npm.cmd test -- src/features/auth/username-auth.test.ts src/features/auth/login-form.test.tsx src/app/(auth)/login/page.test.tsx src/components/layout/app-shell.test.tsx src/lib/db/log-game-player-resolution.test.ts src/lib/db/game-draft-repo.test.ts src/features/games/log-game/log-game-wizard.test.tsx src/features/groups/player-list.test.tsx`
Expected: PASS with 0 failures.

- [ ] **Step 8: Commit**

```bash
git add src/features/games/log-game/players-step.tsx src/features/games/log-game/log-game-wizard.tsx src/lib/validation/log-game.ts src/features/games/log-game/log-game-wizard.test.tsx src/features/groups/player-list.tsx
git commit -m "feat: support typed or selected game players"
```

## Self-Review

### Spec coverage

- Username plus PIN auth is covered by Tasks 1 and 2.
- Active-group preference and switching are covered by Tasks 1 and 3.
- Group-scoped typed-player creation and reuse are covered by Tasks 4 and 5.
- Shared full-name validation between roster adds and log-game adds is covered by Tasks 1, 4, and 5.

### Placeholder scan

- No `TODO`, `TBD`, or placeholder steps remain.
- Every task includes concrete files, commands, and code snippets.

### Type consistency

- The auth helper names stay consistent across tests and implementation: `normalizeUsername`, `buildSyntheticAuthEmail`, `pinSchema`, `signupFullNameSchema`.
- The player-resolution path consistently uses `resolveLogGamePlayerReferences`.
- `headerActions` is the single shell prop for switcher UI.

Plan complete and saved to `docs/superpowers/plans/2026-07-04-username-pin-player-roster-implementation.md`. Since you asked me to implement, I’ll execute this inline in this session rather than stopping for an execution-mode choice.
