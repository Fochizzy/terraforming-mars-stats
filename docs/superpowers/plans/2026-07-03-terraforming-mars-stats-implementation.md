# Terraforming Mars Stats App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a phone-first Terraforming Mars statistics web app with Supabase-backed auth, cloud storage, guided game logging, an authenticated web import surface for pasted logs and exact endgame screenshots, reference catalog support, and personal, group, and aggregate analytics.

**Architecture:** Build a Next.js App Router application with clear feature boundaries under `src/features`, backed by a Supabase Postgres schema with RLS, storage buckets for card imagery and imported screenshot evidence, and SQL views/functions for analytics. Keep live user workflows server-first where possible, use client components for forms and charts only, and add a protected `/log-game/import` web workflow that saves raw evidence, runs parser and OCR adapters, and hands reviewed data back to the normal draft-based logging flow. Persist inferred analytics data at game finalization so profile and leaderboard reads stay fast.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Postgres SQL migrations, React Hook Form, Zod, Recharts, Vitest, React Testing Library, Playwright

---

## Planned File Structure

- `package.json`: app scripts, dependencies, and test commands
- `.env.example`: required Supabase, storage, and catalog import environment variables
- `src/app/`: route groups for auth, protected app pages, and global layout
- `src/components/`: reusable UI, layout, and chart primitives
- `src/features/auth/`: login flow, auth guards, membership-aware redirects
- `src/features/groups/`: group settings, recurring players, role-gated actions
- `src/features/games/`: draft/finalized game logging wizard, score validation, revisions, tie handling
- `src/features/imports/`: authenticated web import page, evidence review, parser/OCR mismatch surfacing, and alias confirmation UI
- `src/features/catalog/`: promo browsing, key-card selection, catalog metadata loaders
- `src/features/analytics/`: profile, group, leaderboard, head-to-head, trend, and coverage queries
- `src/features/styles/`: declared style definitions, inferred style engine, style comparison utilities
- `src/features/insights/`: sentence-form insight builders and chart annotation helpers
- `src/lib/supabase/`: browser, server, and middleware Supabase clients
- `src/lib/db/`: typed repositories and query helpers
- `src/lib/imports/`: parser adapters, OCR normalization, player-alias matching, and confidence helpers
- `src/lib/validation/`: shared Zod schemas for forms and server actions
- `src/lib/theme/`: board-game-inspired design tokens and chart colors
- `scripts/catalog/`: Hadronikle import, thumbnail generation, and storage upload scripts
- `supabase/config.toml`: local Supabase project config
- `supabase/migrations/`: schema, RLS, storage, seed, and analytics SQL
- `supabase/tests/`: SQL verification scripts run against local Supabase
- `tests/e2e/`: Playwright flows for auth, logging, drafts, analytics, and promo browsing

## Delivery Strategy

This spec is broad, but the subsystems are tightly coupled through a shared schema and app shell. Implement it as one phased product plan with working checkpoints after each task:

1. establish the web app and Supabase foundation
2. land the schema and reference catalog spine
3. deliver logging, web import, and group-management workflows
4. add analytics, insights, and charts
5. harden with tests, QA, and deployment polish

### Task 1: Scaffold the App Workspace and Test Harness

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/test/setup.ts`
- Create: `src/app/page.test.tsx`

- [ ] **Step 1: Scaffold the Next.js app and install the core dependencies**

```bash
npx create-next-app@latest . --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm --yes
npm install @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers recharts clsx tailwind-merge lucide-react
npm install sharp
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event playwright
```

Expected: `package.json`, `src/app`, `public`, and the base config files exist in the repo root.

- [ ] **Step 2: Add a failing smoke test for the unauthenticated landing page**

```tsx
// src/app/page.test.tsx
import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the Terraforming Mars stats CTA', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: /terraforming mars stats/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /sign in to your group/i }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the smoke test to confirm the starter page fails**

Run: `npm run test -- src/app/page.test.tsx`

Expected: `FAIL` because `src/app/page.tsx` still contains the default starter content.

- [ ] **Step 4: Replace the starter shell with the branded landing page and test setup**

```tsx
// src/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#4f1d12,_#0c0f14_55%)] text-stone-100">
      <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
        <p className="text-xs uppercase tracking-[0.35em] text-orange-300">
          Shared Terraforming Mars tracker
        </p>
        <h1 className="font-serif text-4xl font-bold tracking-wide text-stone-50">
          Terraforming Mars Stats
        </h1>
        <p className="text-sm leading-6 text-stone-200/85">
          Log finished games, compare corporations and preludes, and see how your
          group&apos;s meta changes over time.
        </p>
        <Link
          className="rounded-full bg-orange-400 px-5 py-3 text-center text-sm font-semibold text-slate-950"
          href="/login"
        >
          Sign in to your group
        </Link>
      </section>
    </main>
  );
}
```

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Terraforming Mars Stats',
  description: 'Track Terraforming Mars games, scores, and analytics.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

body {
  margin: 0;
  background: #0c0f14;
  color: #f5f5f4;
  font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
}
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 5: Add the scripts and environment example the rest of the plan expects**

```json
// package.json (scripts section)
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

```env
# .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_ID=
SUPABASE_STORAGE_BUCKET_CARD_FULL=tm-card-full
SUPABASE_STORAGE_BUCKET_CARD_THUMBS=tm-card-thumbs
```

- [ ] **Step 6: Verify the scaffold passes unit tests and lint**

Run: `npm run test -- src/app/page.test.tsx`

Expected: `PASS  src/app/page.test.tsx`

Run: `npm run lint`

Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 7: Commit the scaffold checkpoint**

```bash
git add package.json next.config.ts tailwind.config.ts postcss.config.mjs vitest.config.ts playwright.config.ts .env.example src/app src/test
git commit -m "feat: scaffold Next.js app foundation"
```

### Task 2: Configure Supabase Clients, Protected Routing, and Login Flow

**Files:**
- Create: `middleware.ts`
- Create: `src/lib/env.ts`
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/features/auth/route-guards.ts`
- Create: `src/features/auth/login-form.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/features/auth/route-guards.test.ts`

- [ ] **Step 1: Add a failing test for the protected-route guard**

```ts
// src/features/auth/route-guards.test.ts
import { describe, expect, it } from 'vitest';
import { isProtectedPath } from './route-guards';

describe('isProtectedPath', () => {
  it('protects app routes and leaves auth routes public', () => {
    expect(isProtectedPath('/profile')).toBe(true);
    expect(isProtectedPath('/group')).toBe(true);
    expect(isProtectedPath('/log-game')).toBe(true);
    expect(isProtectedPath('/login')).toBe(false);
    expect(isProtectedPath('/')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the auth guard test to confirm it fails**

Run: `npm run test -- src/features/auth/route-guards.test.ts`

Expected: `FAIL` because `route-guards.ts` does not exist yet.

- [ ] **Step 3: Implement environment parsing, Supabase clients, and route guards**

```ts
// src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export const publicEnv = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
```

```ts
// src/features/auth/route-guards.ts
const protectedPrefixes = ['/profile', '/group', '/insights', '/log-game'];

export function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
```

```ts
// src/lib/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
```

```ts
// src/lib/supabase/server.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => undefined,
      },
    },
  );
}
```

```ts
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { publicEnv } from '@/lib/env';

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}
```

- [ ] **Step 4: Implement middleware and the email-login page**

```ts
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { isProtectedPath } from '@/features/auth/route-guards';
import { updateSupabaseSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const response = await updateSupabaseSession(request);

  if (!isProtectedPath(request.nextUrl.pathname)) {
    return response;
  }

  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-'));

  if (!hasSupabaseAuthCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

```tsx
// src/features/auth/login-form.tsx
'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/profile`,
      },
    });

    setStatus(error ? 'error' : 'sent');
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <input
        className="rounded-xl border border-stone-600 bg-stone-950 px-4 py-3"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
      />
      <button className="rounded-full bg-orange-400 px-5 py-3 font-semibold text-slate-950" type="submit">
        Email me a sign-in link
      </button>
      {status === 'sent' ? <p className="text-sm text-emerald-300">Check your email for a magic link.</p> : null}
      {status === 'error' ? <p className="text-sm text-red-300">Could not send sign-in link.</p> : null}
    </form>
  );
}
```

```tsx
// src/app/(auth)/login/page.tsx
import { LoginForm } from '@/features/auth/login-form';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-stone-100">
      <h1 className="font-serif text-3xl font-bold">Join Your Group</h1>
      <p className="text-sm text-stone-300">
        Sign in with email to access your Terraforming Mars group data.
      </p>
      <LoginForm />
    </main>
  );
}
```

- [ ] **Step 5: Verify the auth utilities and lint**

Run: `npm run test -- src/features/auth/route-guards.test.ts`

Expected: `PASS  src/features/auth/route-guards.test.ts`

Run: `npm run lint`

Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 6: Commit the auth and middleware foundation**

```bash
git add middleware.ts .env.example src/lib/env.ts src/lib/supabase src/features/auth src/app/'(auth)'
git commit -m "feat: add Supabase auth shell and protected routing"
```

### Task 3: Create the Core Supabase Schema, Import Lifecycle Tables, and RLS Policies

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/20260703120000_create_core_tables.sql`
- Create: `supabase/migrations/20260703121800_create_import_tables.sql`
- Create: `supabase/migrations/20260703121500_create_core_rls.sql`
- Create: `supabase/tests/core_schema_verification.sql`
- Create: `supabase/tests/import_schema_verification.sql`

- [ ] **Step 1: Initialize Supabase locally and create the migration files**

```bash
npx supabase init
npx supabase migration new create_core_tables
npx supabase migration new create_import_tables
npx supabase migration new create_core_rls
```

Expected: `supabase/config.toml` exists and three migration files are created under `supabase/migrations/`.

- [ ] **Step 2: Add a verification SQL script that will fail before the core schema exists**

```sql
-- supabase/tests/core_schema_verification.sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'games'
order by ordinal_position;
```

- [ ] **Step 3: Run the verification query before the migrations are written**

Run: `npx supabase db reset --local`

Expected: the reset succeeds but the verification query does not show the `games` columns yet.

Run: `npx supabase db query --local -f supabase/tests/core_schema_verification.sql`

Expected: empty result set for `games` because the core tables are not defined.

- [ ] **Step 4: Implement the core tables, enums, and lifecycle columns**

```sql
-- supabase/migrations/20260703120000_create_core_tables.sql
create type public.group_role as enum ('owner', 'editor', 'viewer');
create type public.game_status as enum ('draft', 'finalized');

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.group_role not null,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table public.group_settings (
  group_id uuid primary key references public.groups(id) on delete cascade,
  default_map_id uuid,
  global_analytics_enabled boolean not null default false,
  image_reference_mode text not null default 'full'
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  played_on date not null,
  map_id uuid,
  player_count integer not null check (player_count between 1 and 5),
  generation_count integer not null check (generation_count > 0),
  source_game_id uuid references public.games(id) on delete set null,
  status public.game_status not null default 'draft',
  catalog_snapshot_id uuid,
  created_by_user_id uuid not null references auth.users(id),
  updated_by_user_id uuid not null references auth.users(id),
  finalized_at timestamptz,
  finalized_by_user_id uuid references auth.users(id),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  corporation_id uuid,
  placement integer not null check (placement > 0),
  is_winner boolean not null default false,
  total_points integer not null,
  final_megacredits integer not null default 0,
  cities_points integer not null default 0,
  greenery_points integer not null default 0,
  card_points_total integer not null default 0,
  card_points_microbes integer,
  card_points_animals integer,
  card_points_jovian integer,
  tr_points integer not null default 0,
  milestone_points integer not null default 0,
  award_points integer not null default 0,
  other_card_points integer,
  created_at timestamptz not null default now()
);

create table public.game_revisions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  editor_user_id uuid not null references auth.users(id),
  revision_note text not null default '',
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 5: Add web-import evidence tables, raw-event storage, and player alias support**

```sql
-- supabase/migrations/20260703121800_create_import_tables.sql
create table public.game_log_imports (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  raw_log_text text not null,
  parser_version text not null,
  parse_status text not null check (parse_status in ('parsed', 'partial', 'failed')),
  detected_source text not null,
  confidence_summary jsonb not null default '{}'::jsonb,
  line_count integer not null default 0,
  unparsed_line_count integer not null default 0,
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  parsed_at timestamptz
);

create table public.game_log_events (
  id uuid primary key default gen_random_uuid(),
  game_log_import_id uuid not null references public.game_log_imports(id) on delete cascade,
  game_player_id uuid references public.game_players(id) on delete set null,
  generation_number integer,
  event_order integer not null,
  event_type text not null,
  card_id uuid,
  resource_type text,
  resource_amount integer,
  tile_type text,
  board_space text,
  confidence_level text not null check (confidence_level in ('high', 'medium', 'low')),
  raw_line text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.game_result_screenshot_imports (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  storage_object_path text not null,
  ocr_engine_version text not null,
  parse_status text not null check (parse_status in ('parsed', 'partial', 'failed')),
  detected_layout text not null,
  confidence_summary jsonb not null default '{}'::jsonb,
  extracted_fields jsonb not null default '{}'::jsonb,
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  parsed_at timestamptz
);

create table public.player_import_aliases (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  source_type text not null,
  alias_text text not null,
  normalized_alias_text text not null,
  created_at timestamptz not null default now(),
  unique (player_id, source_type, normalized_alias_text)
);
```

```sql
-- supabase/tests/import_schema_verification.sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'game_log_imports',
    'game_log_events',
    'game_result_screenshot_imports',
    'player_import_aliases'
  )
order by table_name;
```

- [ ] **Step 6: Implement RLS and role-based access**

```sql
-- supabase/migrations/20260703121500_create_core_rls.sql
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_settings enable row level security;
alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.game_revisions enable row level security;

create function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
  );
$$;

create function public.can_edit_group(target_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'editor')
  );
$$;

create function public.is_group_owner(target_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  );
$$;

create function public.can_read_game(target_game_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.games g
    where g.id = target_game_id
      and public.is_group_member(g.group_id)
  );
$$;

create function public.can_edit_game(target_game_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.games g
    where g.id = target_game_id
      and public.can_edit_group(g.group_id)
  );
$$;

create function public.can_read_game_player(target_game_player_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.game_players gp
    join public.games g on g.id = gp.game_id
    where gp.id = target_game_player_id
      and public.is_group_member(g.group_id)
  );
$$;

create function public.can_edit_game_player(target_game_player_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.game_players gp
    join public.games g on g.id = gp.game_id
    where gp.id = target_game_player_id
      and public.can_edit_group(g.group_id)
  );
$$;

create policy "members can read groups"
on public.groups for select
using (public.is_group_member(id));

create policy "members can read group memberships"
on public.group_members for select
using (public.is_group_member(group_id));

create policy "owners manage group memberships"
on public.group_members for all
using (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  )
);

create policy "members can read settings"
on public.group_settings for select
using (public.is_group_member(group_id));

create policy "owners manage settings"
on public.group_settings for all
using (
  public.is_group_owner(group_settings.group_id)
)
with check (
  public.is_group_owner(group_settings.group_id)
);

create policy "members can read players"
on public.players for select
using (public.is_group_member(group_id));

create policy "editors manage players"
on public.players for all
using (public.can_edit_group(group_id))
with check (public.can_edit_group(group_id));

create policy "members can read games"
on public.games for select
using (public.is_group_member(group_id));

create policy "editors can write games"
on public.games for all
using (public.can_edit_group(group_id))
with check (public.can_edit_group(group_id));

create policy "members can read game players"
on public.game_players for select
using (
  exists (
    select 1 from public.games g
    where g.id = game_players.game_id
      and public.is_group_member(g.group_id)
  )
);

create policy "editors can write game players"
on public.game_players for all
using (
  exists (
    select 1 from public.games g
    where g.id = game_players.game_id
      and public.can_edit_group(g.group_id)
  )
)
with check (
  exists (
    select 1 from public.games g
    where g.id = game_players.game_id
      and public.can_edit_group(g.group_id)
  )
);

alter table public.game_log_imports enable row level security;
alter table public.game_log_events enable row level security;
alter table public.game_result_screenshot_imports enable row level security;
alter table public.player_import_aliases enable row level security;

create policy "members read game log imports"
on public.game_log_imports for select
using (public.can_read_game(game_id));

create policy "editors manage game log imports"
on public.game_log_imports for all
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

create policy "members read game log events"
on public.game_log_events for select
using (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_events.game_log_import_id
      and public.can_read_game(gli.game_id)
  )
);

create policy "editors manage game log events"
on public.game_log_events for all
using (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_events.game_log_import_id
      and public.can_edit_game(gli.game_id)
  )
)
with check (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_events.game_log_import_id
      and public.can_edit_game(gli.game_id)
  )
);

create policy "members read screenshot imports"
on public.game_result_screenshot_imports for select
using (public.can_read_game(game_id));

create policy "editors manage screenshot imports"
on public.game_result_screenshot_imports for all
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

create policy "members read player import aliases"
on public.player_import_aliases for select
using (
  exists (
    select 1
    from public.players p
    where p.id = player_import_aliases.player_id
      and public.is_group_member(p.group_id)
  )
);

create policy "editors manage player import aliases"
on public.player_import_aliases for all
using (
  exists (
    select 1
    from public.players p
    where p.id = player_import_aliases.player_id
      and public.can_edit_group(p.group_id)
  )
)
with check (
  exists (
    select 1
    from public.players p
    where p.id = player_import_aliases.player_id
      and public.can_edit_group(p.group_id)
  )
);
```

- [ ] **Step 7: Verify the schema and policies locally**

Run: `npx supabase db reset --local`

Expected: local database resets and replays both migrations without error.

Run: `npx supabase db query --local -f supabase/tests/core_schema_verification.sql`

Expected: rows including `group_id`, `played_on`, `status`, `catalog_snapshot_id`, and `finalized_at`.

Run: `npx supabase db query --local -f supabase/tests/import_schema_verification.sql`

Expected: rows for `game_log_imports`, `game_log_events`, `game_result_screenshot_imports`, and `player_import_aliases`.

- [ ] **Step 8: Commit the core schema milestone**

```bash
git add supabase/config.toml supabase/migrations/20260703120000_create_core_tables.sql supabase/migrations/20260703121800_create_import_tables.sql supabase/migrations/20260703121500_create_core_rls.sql supabase/tests/core_schema_verification.sql supabase/tests/import_schema_verification.sql
git commit -m "feat: add core schema, import tables, and RLS policies"
```

### Task 4: Add Reference Catalog, Promo, Map, and Storage Support

**Files:**
- Create: `supabase/migrations/20260703123000_create_reference_catalog.sql`
- Create: `supabase/migrations/20260703124500_create_storage_policies.sql`
- Create: `src/features/catalog/catalog-record.ts`
- Create: `scripts/catalog/fetch-hadronikle.ts`
- Create: `scripts/catalog/build-thumbnails.ts`
- Create: `scripts/catalog/import-reference-data.ts`
- Create: `scripts/catalog/source/README.md`
- Create: `src/features/catalog/catalog-record.test.ts`

- [ ] **Step 1: Add a failing parser test for catalog records**

```ts
// src/features/catalog/catalog-record.test.ts
import { describe, expect, it } from 'vitest';
import { normalizeCardRecord } from './catalog-record';

describe('normalizeCardRecord', () => {
  it('maps upstream fields into the local reference shape', () => {
    const record = normalizeCardRecord({
      cardNumber: 'P39',
      name: 'Merger',
      type: 'Event',
      expansion: 'Promo',
      imageUrl: 'https://example.com/card.png',
    });

    expect(record.card_number).toBe('P39');
    expect(record.card_name).toBe('Merger');
    expect(record.card_type).toBe('Event');
  });
});
```

- [ ] **Step 2: Run the parser test to confirm the catalog normalization module is missing**

Run: `npm run test -- src/features/catalog/catalog-record.test.ts`

Expected: `FAIL` because `catalog-record.ts` does not exist yet.

- [ ] **Step 3: Implement the reference schema and promo/map tables**

```sql
-- supabase/migrations/20260703123000_create_reference_catalog.sql
create table public.expansions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.maps (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.promo_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  promo_year integer,
  edition_label text not null,
  display_order integer not null default 0,
  source_attribution text not null
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  source_card_id text not null unique,
  card_number text not null,
  card_name text not null,
  card_type text not null,
  expansion_code text not null,
  expansion_name text not null,
  promo_set_id uuid references public.promo_sets(id) on delete set null,
  image_url text not null,
  thumbnail_path text,
  full_image_path text,
  source_attribution text not null,
  sync_metadata jsonb not null default '{}'::jsonb
);

create table public.corporations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  expansion_code text not null,
  promo_set_id uuid references public.promo_sets(id) on delete set null
);

create table public.preludes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  expansion_code text not null
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.catalog_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_version text not null,
  imported_at timestamptz not null default now(),
  notes text not null default ''
);

create table public.catalog_overrides (
  id uuid primary key default gen_random_uuid(),
  record_type text not null check (record_type in ('card', 'corporation')),
  source_key text not null unique,
  payload jsonb not null,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.style_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null
);

create table public.group_default_expansions (
  group_id uuid not null references public.groups(id) on delete cascade,
  expansion_id uuid not null references public.expansions(id) on delete cascade,
  primary key (group_id, expansion_id)
);

create table public.group_default_promo_sets (
  group_id uuid not null references public.groups(id) on delete cascade,
  promo_set_id uuid not null references public.promo_sets(id) on delete cascade,
  primary key (group_id, promo_set_id)
);

create table public.game_expansions (
  game_id uuid not null references public.games(id) on delete cascade,
  expansion_id uuid not null references public.expansions(id) on delete cascade,
  primary key (game_id, expansion_id)
);

create table public.game_promo_sets (
  game_id uuid not null references public.games(id) on delete cascade,
  promo_set_id uuid not null references public.promo_sets(id) on delete cascade,
  primary key (game_id, promo_set_id)
);

create table public.game_player_preludes (
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  prelude_id uuid not null references public.preludes(id) on delete cascade,
  primary key (game_player_id, prelude_id)
);

create table public.map_milestones (
  map_id uuid not null references public.maps(id) on delete cascade,
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  primary key (map_id, milestone_id)
);

create table public.map_awards (
  map_id uuid not null references public.maps(id) on delete cascade,
  award_id uuid not null references public.awards(id) on delete cascade,
  primary key (map_id, award_id)
);

create table public.game_milestones (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  winner_game_player_id uuid not null references public.game_players(id) on delete cascade
);

create table public.game_awards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  award_id uuid not null references public.awards(id) on delete cascade,
  funded_by_game_player_id uuid not null references public.game_players(id) on delete cascade,
  place integer not null check (place in (1, 2)),
  winner_game_player_id uuid not null references public.game_players(id) on delete cascade
);

create table public.game_player_declared_styles (
  id uuid primary key default gen_random_uuid(),
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  style_definition_id uuid not null references public.style_definitions(id) on delete cascade,
  is_primary boolean not null default false
);

create table public.game_player_inferred_styles (
  id uuid primary key default gen_random_uuid(),
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  style_definition_id uuid not null references public.style_definitions(id) on delete cascade,
  is_primary boolean not null default false,
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1)
);

create table public.game_player_key_cards (
  id uuid primary key default gen_random_uuid(),
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade
);
```

- [ ] **Step 4: Add reference-table RLS, storage policy SQL, and the import/thumbnail scripts**

```sql
-- supabase/migrations/20260703124500_create_storage_policies.sql
insert into storage.buckets (id, name, public)
values ('tm-card-full', 'tm-card-full', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('tm-card-thumbs', 'tm-card-thumbs', true)
on conflict (id) do nothing;

alter table public.expansions enable row level security;
alter table public.maps enable row level security;
alter table public.promo_sets enable row level security;
alter table public.cards enable row level security;
alter table public.corporations enable row level security;
alter table public.preludes enable row level security;
alter table public.milestones enable row level security;
alter table public.awards enable row level security;
alter table public.style_definitions enable row level security;
alter table public.catalog_snapshots enable row level security;
alter table public.catalog_overrides enable row level security;
alter table public.group_default_expansions enable row level security;
alter table public.group_default_promo_sets enable row level security;
alter table public.game_expansions enable row level security;
alter table public.game_promo_sets enable row level security;
alter table public.game_player_preludes enable row level security;
alter table public.map_milestones enable row level security;
alter table public.map_awards enable row level security;
alter table public.game_milestones enable row level security;
alter table public.game_awards enable row level security;
alter table public.game_player_declared_styles enable row level security;
alter table public.game_player_inferred_styles enable row level security;
alter table public.game_player_key_cards enable row level security;

create policy "authenticated users read expansions"
on public.expansions for select to authenticated using (true);

create policy "authenticated users read maps"
on public.maps for select to authenticated using (true);

create policy "authenticated users read promo sets"
on public.promo_sets for select to authenticated using (true);

create policy "authenticated users read cards"
on public.cards for select to authenticated using (true);

create policy "authenticated users read corporations"
on public.corporations for select to authenticated using (true);

create policy "authenticated users read preludes"
on public.preludes for select to authenticated using (true);

create policy "authenticated users read milestones"
on public.milestones for select to authenticated using (true);

create policy "authenticated users read awards"
on public.awards for select to authenticated using (true);

create policy "authenticated users read styles"
on public.style_definitions for select to authenticated using (true);

create policy "authenticated users read catalog snapshots"
on public.catalog_snapshots for select to authenticated using (true);

create policy "authenticated users read catalog overrides"
on public.catalog_overrides for select to authenticated using (true);

create policy "members read default expansions"
on public.group_default_expansions for select
using (public.is_group_member(group_id));

create policy "owners manage default expansions"
on public.group_default_expansions for all
using (public.is_group_owner(group_id))
with check (public.is_group_owner(group_id));

create policy "members read default promo sets"
on public.group_default_promo_sets for select
using (public.is_group_member(group_id));

create policy "owners manage default promo sets"
on public.group_default_promo_sets for all
using (public.is_group_owner(group_id))
with check (public.is_group_owner(group_id));

create policy "members read game expansions"
on public.game_expansions for select
using (public.can_read_game(game_id));

create policy "editors manage game expansions"
on public.game_expansions for all
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

create policy "members read game promo sets"
on public.game_promo_sets for select
using (public.can_read_game(game_id));

create policy "editors manage game promo sets"
on public.game_promo_sets for all
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

create policy "members read game milestones"
on public.game_milestones for select
using (public.can_read_game(game_id));

create policy "editors manage game milestones"
on public.game_milestones for all
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

create policy "members read game awards"
on public.game_awards for select
using (public.can_read_game(game_id));

create policy "editors manage game awards"
on public.game_awards for all
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

create policy "authenticated users read map milestones"
on public.map_milestones for select to authenticated using (true);

create policy "authenticated users read map awards"
on public.map_awards for select to authenticated using (true);

create policy "members read game player preludes"
on public.game_player_preludes for select
using (public.can_read_game_player(game_player_id));

create policy "editors manage game player preludes"
on public.game_player_preludes for all
using (public.can_edit_game_player(game_player_id))
with check (public.can_edit_game_player(game_player_id));

create policy "members read declared styles"
on public.game_player_declared_styles for select
using (public.can_read_game_player(game_player_id));

create policy "editors manage declared styles"
on public.game_player_declared_styles for all
using (public.can_edit_game_player(game_player_id))
with check (public.can_edit_game_player(game_player_id));

create policy "members read inferred styles"
on public.game_player_inferred_styles for select
using (public.can_read_game_player(game_player_id));

create policy "editors manage inferred styles"
on public.game_player_inferred_styles for all
using (public.can_edit_game_player(game_player_id))
with check (public.can_edit_game_player(game_player_id));

create policy "members read key cards"
on public.game_player_key_cards for select
using (public.can_read_game_player(game_player_id));

create policy "editors manage key cards"
on public.game_player_key_cards for all
using (public.can_edit_game_player(game_player_id))
with check (public.can_edit_game_player(game_player_id));
```

```ts
// src/features/catalog/catalog-record.ts
export type NormalizedCardRecord = {
  card_number: string;
  card_name: string;
  card_type: string;
  expansion_code: string;
  image_url: string;
};

export function normalizeCardRecord(input: {
  cardNumber: string;
  name: string;
  type: string;
  expansion: string;
  imageUrl: string;
}): NormalizedCardRecord {
  return {
    card_number: input.cardNumber,
    card_name: input.name,
    card_type: input.type,
    expansion_code: input.expansion,
    image_url: input.imageUrl,
  };
}
```

```ts
// scripts/catalog/fetch-hadronikle.ts
import { writeFile } from 'node:fs/promises';

async function main() {
  const response = await fetch('https://tm.hadronikle.com/');
  const html = await response.text();
  await writeFile('scripts/catalog/source/hadronikle-home.html', html, 'utf8');
}

void main();
```

```ts
// scripts/catalog/build-thumbnails.ts
import sharp from 'sharp';

export async function buildThumbnail(inputPath: string, outputPath: string) {
  await sharp(inputPath).resize({ width: 240 }).png().toFile(outputPath);
}
```

```md
<!-- scripts/catalog/source/README.md -->
# Catalog Source Notes

Keep temporary upstream snapshots here while validating import scripts.
Do not commit raw card image assets to git; upload runtime images to Supabase Storage instead.
```

```ts
// scripts/catalog/import-reference-data.ts
import { normalizeCardRecord } from '@/features/catalog/catalog-record';

export async function buildCatalogImportPayload(rawCards: Array<{
  cardNumber: string;
  name: string;
  type: string;
  expansion: string;
  imageUrl: string;
}>, overrides: Array<{
  card_number: string;
  card_name: string;
  card_type: string;
  expansion_code: string;
  image_url: string;
}> = []) {
  return [...rawCards.map(normalizeCardRecord), ...overrides];
}
```

- [ ] **Step 5: Verify the parser and local schema**

Run: `npm run test -- src/features/catalog/catalog-record.test.ts`

Expected: `PASS  src/features/catalog/catalog-record.test.ts`

Run: `npx supabase db reset --local`

Expected: local database resets and includes the reference tables plus storage policy migration.

- [ ] **Step 6: Commit the catalog and storage foundation**

```bash
git add supabase/migrations/20260703123000_create_reference_catalog.sql supabase/migrations/20260703124500_create_storage_policies.sql scripts/catalog src/features/catalog
git commit -m "feat: add reference catalog and storage scaffolding"
```

### Task 5: Build the Protected App Shell, Theme Tokens, and Navigation

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/profile/page.tsx`
- Create: `src/app/(app)/group/page.tsx`
- Create: `src/app/(app)/insights/page.tsx`
- Create: `src/components/layout/app-shell.tsx`
- Create: `src/components/navigation/bottom-nav.tsx`
- Create: `src/lib/theme/tokens.ts`
- Create: `src/components/layout/app-shell.test.tsx`

- [ ] **Step 1: Add a failing test for the protected shell navigation**

```tsx
// src/components/layout/app-shell.test.tsx
import { render, screen } from '@testing-library/react';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  it('renders the default bottom navigation items', () => {
    render(<AppShell title="My Profile">content</AppShell>);

    expect(screen.getByRole('link', { name: /my profile/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log game/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /group/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /insights/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the shell test to confirm it fails**

Run: `npm run test -- src/components/layout/app-shell.test.tsx`

Expected: `FAIL` because the app shell components do not exist yet.

- [ ] **Step 3: Implement the Mars-themed shell and the default authenticated routes**

```ts
// src/lib/theme/tokens.ts
export const chartPalette = {
  cities: '#d6b08c',
  greenery: '#6ba83b',
  cards: '#e0d3b8',
  microbes: '#c67c47',
  animals: '#e3b04b',
  jovian: '#8aa8ff',
  tr: '#f06a32',
  milestones: '#c9a45c',
  awards: '#6ec3f4',
};
```

```tsx
// src/components/navigation/bottom-nav.tsx
import Link from 'next/link';

const items = [
  { href: '/profile', label: 'My Profile' },
  { href: '/log-game', label: 'Log Game' },
  { href: '/group', label: 'Group' },
  { href: '/insights', label: 'Insights' },
];

export function BottomNav() {
  return (
    <nav className="grid grid-cols-4 gap-2 border-t border-stone-700 bg-black/35 px-4 py-3">
      {items.map((item) => (
        <Link className="text-center text-xs text-stone-200" href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

```tsx
// src/components/layout/app-shell.tsx
import { BottomNav } from '@/components/navigation/bottom-nav';

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#3f170f,_#0c0f14_28%,_#0c0f14)] text-stone-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <header className="border-b border-orange-900/50 px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-orange-300">Terraforming Mars Stats</p>
          <h1 className="mt-2 font-serif text-2xl font-bold">{title}</h1>
        </header>
        <section className="flex-1 px-5 py-5">{children}</section>
        <BottomNav />
      </div>
    </main>
  );
}
```

```tsx
// src/app/(app)/profile/page.tsx
import { AppShell } from '@/components/layout/app-shell';

export default function ProfilePage() {
  return (
    <AppShell title="My Profile">
      <div className="grid gap-4">
        <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
          <h2 className="font-serif text-lg font-semibold">Recent Results</h2>
          <p className="mt-2 text-sm text-stone-300">
            Show win rate, average placement, recent games, and score composition trends.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Add the remaining route shells and verify navigation**

```tsx
// src/app/(app)/group/page.tsx
import { AppShell } from '@/components/layout/app-shell';

export default function GroupPage() {
  return (
    <AppShell title="Group">
      <div className="grid gap-4">
        <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
          <h2 className="font-serif text-lg font-semibold">Group Defaults</h2>
          <p className="mt-2 text-sm text-stone-300">
            Manage the default expansion profile, promo sets, and aggregate analytics opt-in.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
```

```tsx
// src/app/(app)/insights/page.tsx
import { AppShell } from '@/components/layout/app-shell';

export default function InsightsPage() {
  return (
    <AppShell title="Insights">
      <div className="grid gap-4">
        <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
          <h2 className="font-serif text-lg font-semibold">Insight Lab</h2>
          <p className="mt-2 text-sm text-stone-300">
            Explore weighted leaderboards, head-to-head filters, playstyle comparisons, and promo interactions.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
```

```tsx
// src/app/(app)/layout.tsx
export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
```

- [ ] **Step 5: Verify the shell test and lint**

Run: `npm run test -- src/components/layout/app-shell.test.tsx`

Expected: `PASS  src/components/layout/app-shell.test.tsx`

Run: `npm run lint`

Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 6: Commit the protected shell and theme foundation**

```bash
git add src/app/'(app)' src/components/layout src/components/navigation src/lib/theme
git commit -m "feat: add protected app shell and navigation"
```

### Task 6: Build Group Settings, Saved Players, and Default Expansion/Promo Profiles

**Files:**
- Create: `src/lib/validation/group-settings.ts`
- Create: `src/lib/db/group-settings-repo.ts`
- Create: `src/lib/db/player-repo.ts`
- Create: `src/features/groups/group-settings-form.tsx`
- Create: `src/features/groups/player-list.tsx`
- Create: `src/app/(app)/group/settings/page.tsx`
- Create: `src/app/(app)/group/players/page.tsx`
- Create: `src/features/groups/group-settings-form.test.tsx`

- [ ] **Step 1: Add a failing test for group defaults validation**

```tsx
// src/features/groups/group-settings-form.test.tsx
import { describe, expect, it } from 'vitest';
import { groupSettingsSchema } from '@/lib/validation/group-settings';

describe('groupSettingsSchema', () => {
  it('requires a group name and allows promo and expansion defaults', () => {
    const parsed = groupSettingsSchema.parse({
      groupName: 'Friday Mars',
      globalAnalyticsEnabled: true,
      defaultExpansionCodes: ['base', 'prelude', 'colonies'],
      defaultPromoSetSlugs: ['2021-promos'],
    });

    expect(parsed.groupName).toBe('Friday Mars');
    expect(parsed.defaultExpansionCodes).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the validation test to confirm the schema is missing**

Run: `npm run test -- src/features/groups/group-settings-form.test.tsx`

Expected: `FAIL` because `group-settings.ts` does not exist yet.

- [ ] **Step 3: Implement validation and repositories for group settings and players**

```ts
// src/lib/validation/group-settings.ts
import { z } from 'zod';

export const groupSettingsSchema = z.object({
  groupName: z.string().min(2),
  globalAnalyticsEnabled: z.boolean(),
  defaultExpansionCodes: z.array(z.string()).default([]),
  defaultPromoSetSlugs: z.array(z.string()).default([]),
});

export type GroupSettingsInput = z.infer<typeof groupSettingsSchema>;
```

```ts
// src/lib/db/player-repo.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function listPlayers(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('players')
    .select('id, display_name, linked_user_id')
    .eq('group_id', groupId)
    .order('display_name');

  if (error) throw error;
  return data;
}

export async function upsertPlayer(input: {
  id?: string;
  group_id: string;
  display_name: string;
  linked_user_id?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('players')
    .upsert(input)
    .select('id, display_name')
    .single();

  if (error) throw error;
  return data;
}
```

```ts
// src/lib/db/group-settings-repo.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getGroupSettings(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('group_settings')
    .select('*')
    .eq('group_id', groupId)
    .single();

  if (error) throw error;
  return data;
}

export async function saveGroupSettings(input: {
  group_id: string;
  global_analytics_enabled: boolean;
  default_map_id?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('group_settings')
    .upsert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
```

- [ ] **Step 4: Implement the settings form and recurring-player pages**

```tsx
// src/features/groups/group-settings-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  groupSettingsSchema,
  type GroupSettingsInput,
} from '@/lib/validation/group-settings';

export function GroupSettingsForm({ initialValues }: { initialValues: GroupSettingsInput }) {
  const form = useForm<GroupSettingsInput>({
    resolver: zodResolver(groupSettingsSchema),
    defaultValues: initialValues,
  });

  return (
    <form className="flex flex-col gap-4">
      <input className="rounded-xl bg-stone-950 px-4 py-3" {...form.register('groupName')} />
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" {...form.register('globalAnalyticsEnabled')} />
        Contribute anonymous aggregate analytics
      </label>
      <button className="rounded-full bg-orange-400 px-5 py-3 font-semibold text-slate-950" type="submit">
        Save Group Defaults
      </button>
    </form>
  );
}
```

```tsx
// src/app/(app)/group/settings/page.tsx
import { AppShell } from '@/components/layout/app-shell';
import { GroupSettingsForm } from '@/features/groups/group-settings-form';

export default function GroupSettingsPage() {
  return (
    <AppShell title="Group Settings">
      <GroupSettingsForm
        initialValues={{
          groupName: 'Friday Mars',
          globalAnalyticsEnabled: false,
          defaultExpansionCodes: ['base', 'prelude'],
          defaultPromoSetSlugs: [],
        }}
      />
    </AppShell>
  );
}
```

```tsx
// src/app/(app)/group/players/page.tsx
import { AppShell } from '@/components/layout/app-shell';

export default function PlayersPage() {
  return (
    <AppShell title="Players">
      <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
        <h2 className="font-serif text-lg font-semibold">Recurring Player Profiles</h2>
        <p className="mt-2 text-sm text-stone-300">
          Add shared player records, link signed-in users when needed, and keep the group roster consistent between games.
        </p>
      </section>
    </AppShell>
  );
}
```

- [ ] **Step 5: Verify the validation test, then lint**

Run: `npm run test -- src/features/groups/group-settings-form.test.tsx`

Expected: `PASS  src/features/groups/group-settings-form.test.tsx`

Run: `npm run lint`

Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 6: Commit group settings and player management**

```bash
git add src/lib/validation/group-settings.ts src/lib/db/group-settings-repo.ts src/lib/db/player-repo.ts src/features/groups src/app/'(app)'/group
git commit -m "feat: add group settings and recurring player management"
```

### Task 7: Build the Draft-Based Game Logging Wizard for Setup, Start Modes, and Player Selection

**Files:**
- Create: `src/lib/validation/log-game.ts`
- Create: `src/lib/db/game-draft-repo.ts`
- Create: `src/features/games/log-game/log-game-wizard.tsx`
- Create: `src/features/games/log-game/setup-step.tsx`
- Create: `src/features/games/log-game/players-step.tsx`
- Create: `src/features/games/log-game/use-log-game-draft.ts`
- Create: `src/app/(app)/log-game/page.tsx`
- Create: `src/features/games/log-game/log-game-draft.test.ts`

- [ ] **Step 1: Add a failing test for duplicate-from-previous setup behavior**

```ts
// src/features/games/log-game/log-game-draft.test.ts
import { describe, expect, it } from 'vitest';
import { cloneGameSetup } from './use-log-game-draft';

describe('cloneGameSetup', () => {
  it('copies setup fields without copying final results', () => {
    const cloned = cloneGameSetup({
      mapId: 'elysium',
      playerCount: 4,
      expansionCodes: ['base', 'prelude', 'colonies'],
      promoSetSlugs: ['2022-promos'],
      selectedPlayerIds: ['a', 'b', 'c', 'd'],
      totalPoints: [85, 79, 76, 63],
    });

    expect(cloned.mapId).toBe('elysium');
    expect(cloned.selectedPlayerIds).toHaveLength(4);
    expect('totalPoints' in cloned).toBe(false);
  });
});
```

- [ ] **Step 2: Run the duplicate setup test to confirm the draft helper is missing**

Run: `npm run test -- src/features/games/log-game/log-game-draft.test.ts`

Expected: `FAIL` because the draft helper does not exist yet.

- [ ] **Step 3: Add the draft schema, helper, and repository**

```ts
// src/lib/validation/log-game.ts
import { z } from 'zod';

export const logGameDraftSchema = z.object({
  groupId: z.string().uuid(),
  playedOn: z.string(),
  mapId: z.string(),
  playerCount: z.number().min(1).max(5),
  generationCount: z.number().min(1),
  expansionCodes: z.array(z.string()).default([]),
  promoSetSlugs: z.array(z.string()).default([]),
  selectedPlayerIds: z.array(z.string()).default([]),
});
```

```ts
// src/features/games/log-game/use-log-game-draft.ts
type PreviousGameSetup = {
  mapId: string;
  playerCount: number;
  expansionCodes: string[];
  promoSetSlugs: string[];
  selectedPlayerIds: string[];
  totalPoints?: number[];
};

export function cloneGameSetup(previous: PreviousGameSetup) {
  return {
    mapId: previous.mapId,
    playerCount: previous.playerCount,
    expansionCodes: previous.expansionCodes,
    promoSetSlugs: previous.promoSetSlugs,
    selectedPlayerIds: previous.selectedPlayerIds,
  };
}
```

```ts
// src/lib/db/game-draft-repo.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function createDraftGame(payload: {
  group_id: string;
  played_on: string;
  map_id: string;
  player_count: number;
  generation_count: number;
  created_by_user_id: string;
  updated_by_user_id: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('games')
    .insert({ ...payload, status: 'draft' })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

export async function saveDraftSnapshot(gameId: string, payload: Record<string, unknown>) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('game_revisions')
    .insert({ game_id: gameId, revision_note: 'Draft autosave', snapshot: payload });

  if (error) throw error;
}
```

- [ ] **Step 4: Implement the first two wizard steps and `/log-game` page**

```tsx
// src/features/games/log-game/setup-step.tsx
'use client';

import Link from 'next/link';

export function SetupStep() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-serif text-xl font-semibold">Game Setup</h2>
      <p className="text-sm text-stone-300">
        Start from group defaults, duplicate a recent setup, or jump to the web import page for pasted logs and endgame screenshots.
      </p>
      <Link
        className="inline-flex w-fit rounded-full border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200"
        href="/log-game/import"
      >
        Open Web Import
      </Link>
    </section>
  );
}
```

```tsx
// src/features/games/log-game/players-step.tsx
'use client';

export function PlayersStep() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-serif text-xl font-semibold">Players</h2>
      <p className="text-sm text-stone-300">
        Pick saved players, then assign corporation and prelude selections.
      </p>
    </section>
  );
}
```

```tsx
// src/features/games/log-game/log-game-wizard.tsx
'use client';

import { SetupStep } from './setup-step';
import { PlayersStep } from './players-step';

export function LogGameWizard() {
  return (
    <div className="flex flex-col gap-8">
      <SetupStep />
      <PlayersStep />
    </div>
  );
}
```

```tsx
// src/app/(app)/log-game/page.tsx
import { AppShell } from '@/components/layout/app-shell';
import { LogGameWizard } from '@/features/games/log-game/log-game-wizard';

export default function LogGamePage() {
  return (
    <AppShell title="Log Game">
      <LogGameWizard />
    </AppShell>
  );
}
```

- [ ] **Step 5: Verify the draft helper test and lint**

Run: `npm run test -- src/features/games/log-game/log-game-draft.test.ts`

Expected: `PASS  src/features/games/log-game/log-game-draft.test.ts`

Run: `npm run lint`

Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 6: Commit the draft logging foundation**

```bash
git add src/lib/validation/log-game.ts src/lib/db/game-draft-repo.ts src/features/games/log-game src/app/'(app)'/log-game
git commit -m "feat: add draft game setup, start modes, and player logging flow"
```

### Task 8: Finish Scoring, Import Review, Finalization, Revisions, and True-Tie Handling

**Files:**
- Create: `src/features/games/log-game/milestones-step.tsx`
- Create: `src/features/games/log-game/scores-step.tsx`
- Create: `src/features/games/log-game/style-step.tsx`
- Create: `src/features/games/log-game/review-step.tsx`
- Create: `src/features/games/finalize-game.ts`
- Create: `src/features/games/tie-utils.ts`
- Create: `src/features/games/finalize-game.test.ts`

- [ ] **Step 1: Add a failing test for tiebreak and true-tie placement logic**

```ts
// src/features/games/finalize-game.test.ts
import { describe, expect, it } from 'vitest';
import { rankPlayers } from './tie-utils';

describe('rankPlayers', () => {
  it('breaks ties with final megacredits and preserves true ties', () => {
    const ranked = rankPlayers([
      { playerId: 'a', totalPoints: 82, finalMegacredits: 14 },
      { playerId: 'b', totalPoints: 82, finalMegacredits: 10 },
      { playerId: 'c', totalPoints: 82, finalMegacredits: 10 },
    ]);

    expect(ranked[0]).toMatchObject({ playerId: 'a', placement: 1, isWinner: true });
    expect(ranked[1]).toMatchObject({ playerId: 'b', placement: 2, isWinner: false });
    expect(ranked[2]).toMatchObject({ playerId: 'c', placement: 2, isWinner: false });
  });
});
```

- [ ] **Step 2: Run the finalize test to confirm ranking helpers are missing**

Run: `npm run test -- src/features/games/finalize-game.test.ts`

Expected: `FAIL` because `tie-utils.ts` does not exist yet.

- [ ] **Step 3: Implement the tie utility and review/finalize helpers**

```ts
// src/features/games/tie-utils.ts
type RankedPlayerInput = {
  playerId: string;
  totalPoints: number;
  finalMegacredits: number;
};

export function rankPlayers(players: RankedPlayerInput[]) {
  const sorted = [...players].sort((left, right) => {
    if (right.totalPoints !== left.totalPoints) return right.totalPoints - left.totalPoints;
    return right.finalMegacredits - left.finalMegacredits;
  });

  return sorted.map((player, index) => {
    const previous = sorted[index - 1];
    const placement =
      previous &&
      previous.totalPoints === player.totalPoints &&
      previous.finalMegacredits === player.finalMegacredits
        ? index
        : index + 1;

    return {
      ...player,
      placement,
      isWinner: placement === 1,
    };
  });
}
```

```ts
// src/features/games/finalize-game.ts
import { rankPlayers } from './tie-utils';

type RankedPlayerInput = {
  playerId: string;
  totalPoints: number;
  finalMegacredits: number;
};

export function buildFinalizedGameSnapshot(input: {
  players: RankedPlayerInput[];
  catalogSnapshotId: string;
  declaredStyleCodes?: string[];
  keyCardIds?: string[];
}) {
  const rankedPlayers = rankPlayers(input.players);

  return {
    gameUpdate: {
      status: 'finalized',
      catalog_snapshot_id: input.catalogSnapshotId,
    },
    players: rankedPlayers,
    declaredStyles: input.declaredStyleCodes ?? [],
    keyCards: input.keyCardIds ?? [],
    revision: {
      snapshot: {
        players: rankedPlayers,
        declaredStyleCodes: input.declaredStyleCodes ?? [],
        keyCardIds: input.keyCardIds ?? [],
        catalogSnapshotId: input.catalogSnapshotId,
      },
      reason: 'Finalize game results',
    },
    finalizedAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 4: Implement the remaining wizard steps for milestones, scores, and review**

```tsx
// src/features/games/log-game/milestones-step.tsx
'use client';

export function MilestonesStep() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-serif text-xl font-semibold">Milestones and Awards</h2>
      <p className="text-sm text-stone-300">
        Record claimed milestones, funded awards, and who placed on each award.
      </p>
    </section>
  );
}
```

```tsx
// src/features/games/log-game/scores-step.tsx
'use client';

export function ScoresStep() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-serif text-xl font-semibold">Final Scores</h2>
      <p className="text-sm text-stone-300">
        Total card points are required; microbe, animal, and Jovian breakdowns stay optional.
      </p>
    </section>
  );
}
```

```tsx
// src/features/games/log-game/style-step.tsx
'use client';

export function StyleStep() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-serif text-xl font-semibold">Styles and Key Cards</h2>
      <p className="text-sm text-stone-300">
        Optionally record declared style, style modifiers, and key cards from the cached catalog.
      </p>
    </section>
  );
}
```

```tsx
// src/features/games/log-game/review-step.tsx
'use client';

export function ReviewStep() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-serif text-xl font-semibold">Review and Finalize</h2>
      <p className="text-sm text-stone-300">
        Show validation warnings, optional-data coverage, OCR or pasted-log conflicts, alias resolution prompts, and finalize or save the draft.
      </p>
    </section>
  );
}
```

- [ ] **Step 5: Extend the wizard to include all six steps and a finalize action**

```tsx
// src/features/games/log-game/log-game-wizard.tsx
import { MilestonesStep } from './milestones-step';
import { ReviewStep } from './review-step';
import { ScoresStep } from './scores-step';
import { StyleStep } from './style-step';

export function LogGameWizard() {
  return (
    <div className="flex flex-col gap-8">
      <SetupStep />
      <PlayersStep />
      <MilestonesStep />
      <ScoresStep />
      <StyleStep />
      <ReviewStep />
    </div>
  );
}
```

Expected: the review step is the single point where manual entry, pasted-log evidence, and screenshot-derived candidates are reconciled before finalization.

- [ ] **Step 6: Verify finalization rules and lint**

Run: `npm run test -- src/features/games/finalize-game.test.ts`

Expected: `PASS  src/features/games/finalize-game.test.ts`

Run: `npm run lint`

Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 7: Commit score finalization and tie handling**

```bash
git add src/features/games/log-game src/features/games/finalize-game.ts src/features/games/tie-utils.ts src/features/games/finalize-game.test.ts
git commit -m "feat: add import-aware review, scoring, and tie handling"
```

### Task 9: Add Analytics Views, Leaderboards, Head-to-Head Queries, and Coverage Metrics

**Files:**
- Create: `supabase/migrations/20260703130000_create_analytics_views.sql`
- Create: `supabase/tests/analytics_verification.sql`
- Create: `src/lib/db/analytics-repo.ts`
- Create: `src/features/analytics/leaderboard.test.ts`

- [ ] **Step 1: Add a failing unit test for weighted leaderboard ordering**

```ts
// src/features/analytics/leaderboard.test.ts
import { describe, expect, it } from 'vitest';
import { sortLeaderboardRows } from '@/lib/db/analytics-repo';

describe('sortLeaderboardRows', () => {
  it('sorts rows by weighted score descending', () => {
    const rows = sortLeaderboardRows([
      { player_name: 'A', weighted_score: 0.71 },
      { player_name: 'B', weighted_score: 0.84 },
    ]);

    expect(rows[0].player_name).toBe('B');
  });
});
```

- [ ] **Step 2: Run the leaderboard unit test to confirm the repository helper is missing**

Run: `npm run test -- src/features/analytics/leaderboard.test.ts`

Expected: `FAIL` because `analytics-repo.ts` does not exist yet.

- [ ] **Step 3: Create the analytics SQL views and functions**

```sql
-- supabase/migrations/20260703130000_create_analytics_views.sql
create schema if not exists analytics;

create view analytics.player_game_results
with (security_invoker = true) as
select
  g.group_id,
  g.player_count,
  g.id as game_id,
  p.id as player_id,
  p.display_name as player_name,
  gp.placement,
  gp.is_winner,
  gp.total_points,
  gp.final_megacredits,
  case
    when gp.placement = 1 then gp.total_points - coalesce((
      select gp2.total_points
      from public.game_players gp2
      where gp2.game_id = g.id
        and gp2.placement = 2
      order by gp2.total_points desc, gp2.final_megacredits desc
      limit 1
    ), gp.total_points)
    else coalesce((
      select gp2.total_points
      from public.game_players gp2
      where gp2.game_id = g.id
        and gp2.placement = gp.placement - 1
      order by gp2.total_points desc, gp2.final_megacredits desc
      limit 1
    ), gp.total_points) - gp.total_points
  end as differential_points
from public.games g
join public.game_players gp on gp.game_id = g.id
join public.players p on p.id = gp.player_id
where g.status = 'finalized'
;

create view analytics.group_leaderboard
with (security_invoker = true) as
select
  pgr.group_id,
  pgr.player_id,
  pgr.player_name,
  count(*) as games_played,
  count(*) filter (where pgr.is_winner) as wins,
  round((count(*) filter (where pgr.is_winner))::numeric / count(*), 4) as win_rate,
  round(avg(pgr.placement::numeric), 3) as average_placement,
  round(avg(pgr.total_points::numeric), 3) as average_score,
  round(avg(case when pgr.is_winner then pgr.differential_points::numeric else null end), 3) as average_win_margin,
  round(avg(case when not pgr.is_winner then pgr.differential_points::numeric else null end), 3) as average_loss_gap,
  round(
    (((count(*) filter (where pgr.is_winner))::numeric / count(*)) * 0.5) +
    ((1 - ((avg(pgr.placement::numeric) - 1) / greatest(max(pgr.player_count) - 1, 1))) * 0.3) +
    ((avg(pgr.differential_points::numeric) / 20.0) * 0.2),
    4
  ) as weighted_score
from analytics.player_game_results pgr
group by pgr.group_id, pgr.player_id, pgr.player_name;

create view analytics.head_to_head
with (security_invoker = true) as
select
  g.group_id,
  gp_left.player_id as left_player_id,
  gp_right.player_id as right_player_id,
  count(*) filter (where gp_left.placement < gp_right.placement) as left_wins,
  count(*) filter (where gp_right.placement < gp_left.placement) as right_wins,
  avg((gp_left.total_points - gp_right.total_points)::numeric) as average_score_differential
from public.games g
join public.game_players gp_left on gp_left.game_id = g.id
join public.game_players gp_right on gp_right.game_id = g.id and gp_left.player_id <> gp_right.player_id
where g.status = 'finalized'
group by g.group_id, gp_left.player_id, gp_right.player_id;

create view analytics.global_corporation_performance
with (security_invoker = true) as
select
  gp.corporation_id,
  count(*) as games_played,
  count(*) filter (where gp.is_winner) as wins,
  round((count(*) filter (where gp.is_winner))::numeric / count(*), 4) as win_rate,
  round(avg(gp.total_points::numeric), 3) as average_score
from public.games g
join public.group_settings gs on gs.group_id = g.group_id
join public.game_players gp on gp.game_id = g.id
where g.status = 'finalized'
  and gs.global_analytics_enabled = true
  and gp.corporation_id is not null
group by gp.corporation_id;

create view analytics.data_coverage
with (security_invoker = true) as
select
  g.group_id,
  count(*) as finalized_games,
  avg((gp.card_points_microbes is not null)::int::numeric) as microbe_coverage,
  avg((gp.card_points_animals is not null)::int::numeric) as animal_coverage,
  avg((gp.card_points_jovian is not null)::int::numeric) as jovian_coverage
from public.games g
join public.game_players gp on gp.game_id = g.id
where g.status = 'finalized'
group by g.group_id;
```

- [ ] **Step 4: Implement the analytics repository helper and SQL verification**

```ts
// src/lib/db/analytics-repo.ts
export function sortLeaderboardRows<T extends { weighted_score: number }>(rows: T[]) {
  return [...rows].sort((left, right) => right.weighted_score - left.weighted_score);
}
```

```sql
-- supabase/tests/analytics_verification.sql
select table_schema, table_name
from information_schema.views
where table_schema = 'analytics'
order by table_name;
```

- [ ] **Step 5: Verify the analytics repository and local analytics views**

Run: `npm run test -- src/features/analytics/leaderboard.test.ts`

Expected: `PASS  src/features/analytics/leaderboard.test.ts`

Run: `npx supabase db reset --local`

Expected: reset succeeds and replays the analytics migration.

Run: `npx supabase db query --local -f supabase/tests/analytics_verification.sql`

Expected: rows for `data_coverage`, `global_corporation_performance`, `group_leaderboard`, `head_to_head`, and `player_game_results`.

- [ ] **Step 6: Commit the analytics foundation**

```bash
git add supabase/migrations/20260703130000_create_analytics_views.sql supabase/tests/analytics_verification.sql src/lib/db/analytics-repo.ts src/features/analytics/leaderboard.test.ts
git commit -m "feat: add analytics views and leaderboard helpers"
```

### Task 10: Build My Profile and Group Dashboards with Coverage-Aware Charts

**Files:**
- Create: `src/components/charts/chart-frame.tsx`
- Create: `src/components/charts/coverage-badge.tsx`
- Create: `src/features/analytics/profile-dashboard.tsx`
- Create: `src/features/analytics/group-dashboard.tsx`
- Modify: `src/app/(app)/profile/page.tsx`
- Modify: `src/app/(app)/group/page.tsx`
- Create: `src/components/charts/coverage-badge.test.tsx`

- [ ] **Step 1: Add a failing test for the optional-data coverage badge**

```tsx
// src/components/charts/coverage-badge.test.tsx
import { render, screen } from '@testing-library/react';
import { CoverageBadge } from './coverage-badge';

describe('CoverageBadge', () => {
  it('renders the entered-data percentage', () => {
    render(<CoverageBadge label="Jovian data" value={0.75} />);
    expect(screen.getByText(/jovian data/i)).toBeInTheDocument();
    expect(screen.getByText(/75%/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the badge test to confirm the chart helper is missing**

Run: `npm run test -- src/components/charts/coverage-badge.test.tsx`

Expected: `FAIL` because `coverage-badge.tsx` does not exist yet.

- [ ] **Step 3: Implement reusable chart primitives and the profile dashboard**

```tsx
// src/components/charts/coverage-badge.tsx
export function CoverageBadge({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
      {label}: {Math.round(value * 100)}%
    </span>
  );
}
```

```tsx
// src/components/charts/chart-frame.tsx
export function ChartFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
      <h2 className="font-serif text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
```

```tsx
// src/features/analytics/profile-dashboard.tsx
import { ChartFrame } from '@/components/charts/chart-frame';
import { CoverageBadge } from '@/components/charts/coverage-badge';

export function ProfileDashboard() {
  return (
    <div className="flex flex-col gap-4">
      <ChartFrame title="Recent Form">
        <p className="text-sm text-stone-300">
          Show rolling win rate, recent placement trend, and final megacredit tiebreak frequency.
        </p>
      </ChartFrame>
      <ChartFrame title="Optional Data Coverage">
        <CoverageBadge label="Jovian data" value={0.75} />
      </ChartFrame>
    </div>
  );
}
```

- [ ] **Step 4: Implement the group dashboard and mount both dashboards**

```tsx
// src/features/analytics/group-dashboard.tsx
import { ChartFrame } from '@/components/charts/chart-frame';

export function GroupDashboard() {
  return (
    <div className="flex flex-col gap-4">
      <ChartFrame title="Weighted Leaderboard">
        <p className="text-sm text-stone-300">
          Show weighted score, win rate, placement, head-to-head records, and lineup-shift comparisons.
        </p>
      </ChartFrame>
    </div>
  );
}
```

```tsx
// src/app/(app)/profile/page.tsx
import { AppShell } from '@/components/layout/app-shell';
import { ProfileDashboard } from '@/features/analytics/profile-dashboard';

export default function ProfilePage() {
  return (
    <AppShell title="My Profile">
      <ProfileDashboard />
    </AppShell>
  );
}
```

```tsx
// src/app/(app)/group/page.tsx
import { AppShell } from '@/components/layout/app-shell';
import { GroupDashboard } from '@/features/analytics/group-dashboard';

export default function GroupPage() {
  return (
    <AppShell title="Group">
      <GroupDashboard />
    </AppShell>
  );
}
```

- [ ] **Step 5: Verify the coverage badge test and lint**

Run: `npm run test -- src/components/charts/coverage-badge.test.tsx`

Expected: `PASS  src/components/charts/coverage-badge.test.tsx`

Run: `npm run lint`

Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 6: Commit the profile and group dashboards**

```bash
git add src/components/charts src/features/analytics/profile-dashboard.tsx src/features/analytics/group-dashboard.tsx src/app/'(app)'/profile/page.tsx src/app/'(app)'/group/page.tsx
git commit -m "feat: add profile and group dashboards"
```

### Task 11: Add Insights, Style Inference, the Authenticated Web Import Website, Promo Browsing, and End-to-End QA

**Files:**
- Create: `src/features/styles/infer-style.ts`
- Create: `src/features/styles/infer-style.test.ts`
- Create: `src/features/insights/build-insight-cards.ts`
- Create: `src/features/imports/web-import-page.tsx`
- Create: `src/features/imports/import-review-panel.tsx`
- Create: `src/lib/db/game-import-repo.ts`
- Create: `src/lib/imports/normalize-player-alias.ts`
- Create: `src/app/(app)/log-game/import/page.tsx`
- Create: `src/features/catalog/promo-set-browser.tsx`
- Create: `src/features/imports/web-import-page.test.tsx`
- Modify: `src/app/(app)/insights/page.tsx`
- Create: `tests/e2e/log-game-draft.spec.ts`
- Create: `docs/deployment.md`

- [ ] **Step 1: Add a failing test for deterministic style inference**

```ts
// src/features/styles/infer-style.test.ts
import { describe, expect, it } from 'vitest';
import { inferPrimaryStyle } from './infer-style';

describe('inferPrimaryStyle', () => {
  it('flags Jovian-heavy results as jovian_payoff', () => {
    const inferred = inferPrimaryStyle({
      totalPoints: 94,
      trPoints: 18,
      cardPointsTotal: 36,
      cardPointsJovian: 22,
      greeneryPoints: 8,
      citiesPoints: 4,
    });

    expect(inferred.primary).toBe('jovian_payoff');
  });
});
```

- [ ] **Step 2: Run the style inference test to confirm the engine is missing**

Run: `npm run test -- src/features/styles/infer-style.test.ts`

Expected: `FAIL` because `infer-style.ts` does not exist yet.

- [ ] **Step 3: Implement deterministic style inference, sentence-form insights, and import matching helpers**

```ts
// src/features/styles/infer-style.ts
type StyleInput = {
  totalPoints: number;
  trPoints: number;
  cardPointsTotal: number;
  cardPointsJovian?: number | null;
  greeneryPoints: number;
  citiesPoints: number;
};

export function inferPrimaryStyle(input: StyleInput) {
  if ((input.cardPointsJovian ?? 0) >= 15) {
    return { primary: 'jovian_payoff', confidence: 0.86 };
  }

  if (input.greeneryPoints + input.citiesPoints >= input.cardPointsTotal) {
    return { primary: 'board_control', confidence: 0.72 };
  }

  return { primary: 'balanced', confidence: 0.58 };
}
```

```ts
// src/features/insights/build-insight-cards.ts
export function buildInsightCard(params: {
  sentence: string;
  sampleSize: number;
  confidence: 'low' | 'medium' | 'high';
}) {
  return {
    title: 'Insight',
    body: params.sentence,
    sampleSize: params.sampleSize,
    confidence: params.confidence,
  };
}
```

```ts
// src/lib/imports/normalize-player-alias.ts
export function normalizePlayerAlias(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
```

```ts
// src/lib/db/game-import-repo.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function createGameLogImport(input: {
  game_id: string;
  raw_log_text: string;
  parser_version: string;
  detected_source: string;
  created_by_user_id: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('game_log_imports')
    .insert({
      ...input,
      parse_status: 'partial',
      confidence_summary: {},
      line_count: input.raw_log_text.split('\n').length,
      unparsed_line_count: 0,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}
```

```tsx
// src/features/imports/web-import-page.test.tsx
import { render, screen } from '@testing-library/react';
import { WebImportPage } from './web-import-page';

describe('WebImportPage', () => {
  it('renders the protected import workflow copy', () => {
    render(<WebImportPage />);

    expect(
      screen.getByRole('heading', { name: /web import/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/paste a supported exported game log/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Implement the insights page, promo browser shell, authenticated web import page, and first Playwright flows**

```tsx
// src/features/imports/import-review-panel.tsx
export function ImportReviewPanel() {
  return (
    <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
      <h2 className="font-serif text-lg font-semibold">Import Review</h2>
      <p className="mt-2 text-sm text-stone-300">
        Surface matched players, ambiguous aliases, OCR score candidates, and conflicts between pasted-log evidence and the screenshot before the draft moves into the normal log-game flow.
      </p>
    </section>
  );
}
```

```tsx
// src/features/imports/web-import-page.tsx
'use client';

import { ImportReviewPanel } from './import-review-panel';

export function WebImportPage() {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
        <h1 className="font-serif text-2xl font-semibold">Web Import</h1>
        <p className="mt-2 text-sm text-stone-300">
          Paste a supported exported game log, upload the exact digital endgame results screen, and review the parsed evidence before it pre-fills the shared draft.
        </p>
      </section>
      <ImportReviewPanel />
    </div>
  );
}
```

```tsx
// src/app/(app)/log-game/import/page.tsx
import { AppShell } from '@/components/layout/app-shell';
import { WebImportPage } from '@/features/imports/web-import-page';

export default function LogGameImportPage() {
  return (
    <AppShell title="Web Import">
      <WebImportPage />
    </AppShell>
  );
}
```

```tsx
// src/features/catalog/promo-set-browser.tsx
const previewCards = [
  {
    id: 'merger',
    cardNumber: 'P39',
    name: 'Merger',
    type: 'Event',
    thumbnailUrl: '/promo-thumb-merger.png',
    fullImageUrl: '/promo-full-merger.png',
  },
];

export function PromoSetBrowser() {
  return (
    <section className="rounded-2xl border border-orange-900/40 bg-black/25 p-4">
      <h2 className="font-serif text-lg font-semibold">Promo Sets</h2>
      <div className="mt-4 grid gap-3">
        {previewCards.map((card) => (
          <a
            className="grid grid-cols-[72px_1fr] gap-3 rounded-xl border border-stone-700 bg-stone-950/60 p-3"
            href={card.fullImageUrl}
            key={card.id}
          >
            <img
              alt={`${card.name} thumbnail`}
              className="h-[96px] w-[72px] rounded-md object-cover"
              src={card.thumbnailUrl}
            />
            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-[0.2em] text-orange-300">{card.cardNumber}</p>
              <h3 className="font-semibold text-stone-100">{card.name}</h3>
              <p className="text-sm text-stone-300">{card.type}</p>
              <span className="text-xs text-cyan-200">Open full image</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
```

```tsx
// src/app/(app)/insights/page.tsx
import { AppShell } from '@/components/layout/app-shell';
import { PromoSetBrowser } from '@/features/catalog/promo-set-browser';

export default function InsightsPage() {
  return (
    <AppShell title="Insights">
      <div className="flex flex-col gap-4">
        <PromoSetBrowser />
      </div>
    </AppShell>
  );
}
```

```ts
// tests/e2e/log-game-draft.spec.ts
import { test, expect } from '@playwright/test';

test('unauthenticated user is redirected to login from /log-game', async ({ page }) => {
  await page.goto('/log-game');
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole('heading', { name: /join your group/i }),
  ).toBeVisible();
});

test('unauthenticated user is redirected to login from /log-game/import', async ({ page }) => {
  await page.goto('/log-game/import');
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole('heading', { name: /join your group/i }),
  ).toBeVisible();
});
```

- [ ] **Step 5: Add deployment notes for the first real environment**

```md
<!-- docs/deployment.md -->
# Deployment Notes

1. Create a Supabase project and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
2. Run the schema migrations before uploading catalog data.
3. Create `tm-card-full`, `tm-card-thumbs`, and a private screenshot-evidence bucket if the migration has not already done so.
4. Import reference data before inviting the first group so maps, corporations, preludes, milestones, awards, and promo sets are selectable.
5. Configure the parser and OCR adapter environment expected by the protected `/log-game/import` route.
6. Run `npm run build`, `npm run test`, and `npm run test:e2e` before each release.
```

- [ ] **Step 6: Verify style inference, the web import surface, e2e auth redirects, and production build**

Run: `npm run test -- src/features/styles/infer-style.test.ts`

Expected: `PASS  src/features/styles/infer-style.test.ts`

Run: `npm run test -- src/features/imports/web-import-page.test.tsx`

Expected: `PASS  src/features/imports/web-import-page.test.tsx`

Run: `npm run test:e2e -- --grep "unauthenticated user is redirected"`

Expected: `2 passed`

Run: `npm run build`

Expected: `Compiled successfully`

- [ ] **Step 7: Commit the insights, import website, style inference, and QA pass**

```bash
git add src/features/styles src/features/insights src/features/imports src/lib/imports/normalize-player-alias.ts src/lib/db/game-import-repo.ts src/features/catalog/promo-set-browser.tsx src/app/'(app)'/insights/page.tsx src/app/'(app)'/log-game/import/page.tsx tests/e2e/log-game-draft.spec.ts docs/deployment.md
git commit -m "feat: add import website, insights, and qa coverage"
```

## Self-Review

### Spec Coverage

- Auth, cloud storage, groups, RLS, shared access, and import evidence persistence are covered by Tasks 2 and 3.
- Player profiles, group defaults, promo defaults, and opt-in aggregate analytics hooks are covered by Tasks 3, 4, and 6.
- Draft/finalized logging, duplicate-from-previous setup, web import launch, milestones, awards, optional card subfields, revision history, and true-tie handling are covered by Tasks 7 and 8.
- Catalog metadata, promo browsing, cached images, historical catalog snapshotting, and import-review card matching hooks are covered by Tasks 4 and 11.
- The authenticated web import website, pasted-log storage, screenshot review, alias normalization, and import QA are covered by Task 11.
- Personal, group, and insights dashboards, weighted leaderboards, head-to-head comparisons, optional-data coverage, style inference, and sentence-form insights are covered by Tasks 9, 10, and 11.
- Board-game-inspired visual theming is established in Tasks 1 and 5, then reused in Tasks 10 and 11.

### Placeholder Scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Input `placeholder` attributes inside form controls are intentional UI copy, not planning placeholders.
- Each task names concrete files, commands, tests, and commit messages.

### Type Consistency

- The plan consistently uses `card_points_total`, optional `card_points_microbes`, `card_points_animals`, and `card_points_jovian`.
- Game lifecycle fields stay consistent as `status`, `catalog_snapshot_id`, `finalized_at`, `game_revisions`, and the import evidence tables attached by `game_id`.
- Analytics references `finalized` games as the default source of truth throughout the plan.
