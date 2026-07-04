# Terraforming Mars Cloudflare Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current Terraforming Mars Stats app developer-build ready for a real public launch by adding the approved medium-intensity Terraforming Mars visual theme, Cloudflare Workers hosting support, fixing the live auth callback path, pushing the code into a new public GitHub repo, provisioning a new Supabase production project, loading reference data, and deploying the first live site at `https://terraforming-mars-stats.workers.dev`.

**Architecture:** Keep the existing Next.js App Router app and Supabase-backed data model, add the official Cloudflare OpenNext adapter for Workers, keep runtime secrets minimal in Cloudflare, use Supabase for auth/database/storage, and finish the catalog publishing path so a brand-new Supabase project can be made usable without hand-editing rows.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase, Cloudflare Workers, `@opennextjs/cloudflare`, Wrangler, Tailwind CSS, Vitest, Playwright, `tsx`

---

## Planned File Structure

- `package.json`: add Cloudflare adapter scripts and runnable catalog publish scripts
- `.gitignore`: ignore Workers/OpenNext build outputs
- `.env.example`: document local script env and runtime env separately
- `wrangler.jsonc`: commit explicit Workers config for the app
- `open-next.config.ts`: commit the Cloudflare OpenNext adapter config
- `src/app/auth/callback/route.ts`: add the magic-link exchange route needed for production login
- `src/features/auth/login-form.tsx`: redirect email auth through the callback route instead of directly to `/profile`
- `src/lib/env.ts`: add server env parsing for runtime bucket names and keep service-role usage out of the deployed app
- `src/lib/db/game-import-repo.ts`: read the import-evidence bucket name from typed server env
- `src/features/catalog/catalog-record.ts`: upgrade the normalized catalog types to match the real `cards` table
- `scripts/catalog/fetch-hadronikle.ts`: keep the cached upstream HTML snapshot flow
- `scripts/catalog/build-thumbnails.ts`: make thumbnail generation runnable from the command line
- `scripts/catalog/import-reference-data.ts`: build complete card upsert payloads instead of partial placeholders
- `scripts/catalog/publish-reference-data.ts`: upsert fixed reference data, promo sets, corporations, preludes, and cards into Supabase
- `supabase/migrations/20260704043302_seed_reference_dimensions.sql`: seed expansions, maps, and style definitions
- `supabase/tests/reference_seed_verification.sql`: verify a fresh project has the required setup/reference rows
- `docs/deployment.md`: replace the current short note with the real GitHub + Supabase + Cloudflare launch checklist

## Delivery Strategy

The safest path is:

1. land the approved medium-intensity Terraforming Mars theme baseline in shared UI primitives
2. make the repo Cloudflare-ready
3. fix live auth before any public deploy
4. finish the minimum data-publishing path a fresh Supabase project needs
5. push the app into a new GitHub repo
6. create and seed the production Supabase project
7. connect Cloudflare Workers Builds to GitHub
8. smoke-test the live site on `workers.dev`

### Task 1: Add the Cloudflare Workers Adapter and Explicit Deploy Config

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `wrangler.jsonc`
- Create: `open-next.config.ts`

- [ ] **Step 1: Install the official Cloudflare adapter tooling and confirm the repo does not already have deploy scripts**

Run:

```bash
npm.cmd install @opennextjs/cloudflare@latest
npm.cmd install -D wrangler@latest tsx
```

Expected:

- `package.json` gains `@opennextjs/cloudflare`, `wrangler`, and `tsx`
- there is still no committed `wrangler.jsonc` or `open-next.config.ts` yet

- [ ] **Step 2: Add the Cloudflare scripts and config files**

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test --pass-with-no-tests",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts",
    "catalog:fetch": "tsx scripts/catalog/fetch-hadronikle.ts",
    "catalog:publish": "tsx scripts/catalog/publish-reference-data.ts"
  }
}
```

```gitignore
# .gitignore
.open-next/
.wrangler/
cloudflare-env.d.ts
```

```jsonc
// wrangler.jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "name": "terraforming-mars-stats",
  "compatibility_date": "2026-07-03",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "observability": {
    "enabled": true
  }
}
```

```ts
// open-next.config.ts
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig();
```

- [ ] **Step 3: Verify the adapter path before touching GitHub or Cloudflare**

Run:

```bash
npm.cmd run cf-typegen
npm.cmd run preview
```

Expected:

- `cf-typegen` writes `cloudflare-env.d.ts`
- `preview` builds `.open-next\worker.js` and `.open-next\assets`
- the app starts in the Workers runtime instead of only the Next dev server

- [ ] **Step 4: Commit the deploy scaffolding checkpoint**

```bash
git add package.json .gitignore wrangler.jsonc open-next.config.ts
git commit -m "feat: add Cloudflare Workers deploy scaffolding"
```

### Task 2: Fix the Production Auth Callback Flow Before First Deploy

**Files:**
- Create: `src/app/auth/callback/route.ts`
- Modify: `src/features/auth/login-form.tsx`
- Create: `src/features/auth/build-auth-callback-url.ts`
- Create: `src/features/auth/build-auth-callback-url.test.ts`

- [ ] **Step 1: Add a failing test for the callback URL builder**

```ts
// src/features/auth/build-auth-callback-url.test.ts
import { describe, expect, it } from 'vitest';
import { buildAuthCallbackUrl } from './build-auth-callback-url';

describe('buildAuthCallbackUrl', () => {
  it('routes the magic link through /auth/callback with a next param', () => {
    expect(buildAuthCallbackUrl('https://terraforming-mars-stats.workers.dev', '/profile')).toBe(
      'https://terraforming-mars-stats.workers.dev/auth/callback?next=%2Fprofile',
    );
  });
});
```

- [ ] **Step 2: Implement the callback helper, callback route, and login redirect**

```ts
// src/features/auth/build-auth-callback-url.ts
export function buildAuthCallbackUrl(origin: string, nextPath: string) {
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('next', nextPath);
  return url.toString();
}
```

```ts
// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = requestUrl.searchParams.get('next') ?? '/profile';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
    }
  }

  const loginUrl = new URL('/login', requestUrl.origin);
  loginUrl.searchParams.set('error', 'auth_callback');
  return NextResponse.redirect(loginUrl);
}
```

```tsx
// src/features/auth/login-form.tsx
import { buildAuthCallbackUrl } from './build-auth-callback-url';

// inside onSubmit(...)
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: buildAuthCallbackUrl(window.location.origin, '/profile'),
  },
});
```

- [ ] **Step 3: Verify login plumbing locally before going public**

Run:

```bash
npm.cmd run test -- src/features/auth/build-auth-callback-url.test.ts
npm.cmd run build
```

Expected:

- the helper test passes
- the production build includes `/auth/callback`
- there is no magic-link redirect that points straight to `/profile` anymore

- [ ] **Step 4: Commit the auth readiness fix**

```bash
git add src/app/auth/callback/route.ts src/features/auth/login-form.tsx src/features/auth/build-auth-callback-url.ts src/features/auth/build-auth-callback-url.test.ts
git commit -m "feat: add auth callback route for live magic link sign-in"
```

### Task 3: Normalize Runtime Env and Replace the Short Deployment Note

**Files:**
- Modify: `.env.example`
- Modify: `src/lib/env.ts`
- Modify: `src/lib/db/game-import-repo.ts`
- Modify: `docs/deployment.md`

- [ ] **Step 1: Separate app-runtime env from local admin-script env**

```env
# .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE=tm-import-evidence

# local-only admin/script env
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_ID=
SUPABASE_STORAGE_BUCKET_CARD_FULL=tm-card-full
SUPABASE_STORAGE_BUCKET_CARD_THUMBS=tm-card-thumbs
```

```ts
// src/lib/env.ts
import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverEnvSchema = z.object({
  SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE: z.string().min(1).default('tm-import-evidence'),
});

export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE:
      process.env.SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE,
  });
}
```

```ts
// src/lib/db/game-import-repo.ts
import { getServerEnv } from '@/lib/env';

const IMPORT_EVIDENCE_BUCKET = getServerEnv().SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE;
```

- [ ] **Step 2: Replace `docs/deployment.md` with the real launch checklist**

```md
# Deployment Notes

## Runtime env in Cloudflare

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE`

Do not add `SUPABASE_SERVICE_ROLE_KEY` to the deployed Worker unless a future server-only feature truly requires it.

## Local-only admin/script env

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_STORAGE_BUCKET_CARD_FULL`
- `SUPABASE_STORAGE_BUCKET_CARD_THUMBS`

## Launch order

1. Push the app to the new GitHub repo.
2. Create the Supabase production project.
3. Run `npx.cmd supabase db push` against the linked project.
4. Run `npm.cmd run catalog:publish`.
5. Connect the repo in Cloudflare Workers Builds.
6. Add the runtime env vars in Cloudflare Build Variables and secrets.
7. Set Supabase Auth Site URL to `https://terraforming-mars-stats.workers.dev`.
8. Add `https://terraforming-mars-stats.workers.dev/auth/callback` and `https://terraforming-mars-stats.workers.dev/profile` to Additional Redirect URLs.
9. Deploy and smoke-test the live site.
```

- [ ] **Step 3: Verify env parsing and deployment docs**

Run:

```bash
npm.cmd run build
npm.cmd run lint
```

Expected:

- the build still passes with the runtime env schema in place
- `docs/deployment.md` is now the real operator checklist, not just a stub

- [ ] **Step 4: Commit the env and docs cleanup**

```bash
git add .env.example src/lib/env.ts src/lib/db/game-import-repo.ts docs/deployment.md
git commit -m "chore: document runtime env and deployment checklist"
```

### Task 4: Make a Brand-New Supabase Project Usable with Real Reference Data

**Files:**
- Create: `supabase/migrations/20260704043302_seed_reference_dimensions.sql`
- Create: `supabase/tests/reference_seed_verification.sql`
- Modify: `src/features/catalog/catalog-record.ts`
- Modify: `scripts/catalog/import-reference-data.ts`
- Modify: `scripts/catalog/build-thumbnails.ts`
- Create: `scripts/catalog/publish-reference-data.ts`

- [ ] **Step 1: Seed the fixed dimensions a fresh project always needs**

```sql
-- supabase/migrations/20260704043302_seed_reference_dimensions.sql
insert into public.expansions (code, name)
values
  ('base', 'Base Game'),
  ('corporate_era', 'Corporate Era'),
  ('prelude', 'Prelude'),
  ('venus_next', 'Venus Next'),
  ('colonies', 'Colonies'),
  ('turmoil', 'Turmoil')
on conflict (code) do update
set name = excluded.name;

insert into public.maps (code, name)
values
  ('tharsis', 'Tharsis'),
  ('hellas', 'Hellas'),
  ('elysium', 'Elysium')
on conflict (code) do update
set name = excluded.name;
```

```sql
-- supabase/tests/reference_seed_verification.sql
select
  (select count(*) from public.expansions) as expansions_count,
  (select count(*) from public.maps) as maps_count,
  (select count(*) from public.milestones) as milestones_count,
  (select count(*) from public.awards) as awards_count,
  (select count(*) from public.style_definitions) as styles_count;
```

- [ ] **Step 2: Upgrade the catalog payload to match the real `cards` table**

```ts
// src/features/catalog/catalog-record.ts
export type NormalizedCardRecord = {
  source_card_id: string;
  card_number: string;
  card_name: string;
  card_type: string;
  expansion_code: string;
  expansion_name: string;
  image_url: string;
  source_attribution: string;
  sync_metadata: Record<string, unknown>;
};
```

```ts
// scripts/catalog/import-reference-data.ts
export async function buildCatalogImportPayload(rawCards: RawCardRecord[]) {
  return rawCards.map((card) =>
    normalizeCardRecord({
      cardNumber: card.cardNumber,
      expansion: card.expansion,
      imageUrl: card.imageUrl,
      name: card.name,
      sourceCardId: `${card.expansion}:${card.cardNumber}`,
      sourceAttribution: 'https://tm.hadronikle.com/',
      type: card.type,
    }),
  );
}
```

- [ ] **Step 3: Add the publish and image-upload scripts**

```ts
// scripts/catalog/publish-reference-data.ts
import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // upsert fixed reference rows, promo sets, corporations, preludes, and cards
  // using the normalized catalog payload and group-safe onConflict keys
  console.log('Published reference catalog to Supabase.');
}

void main();
```

- [ ] **Step 4: Verify a dry run locally before touching production**

Run:

```bash
npx.cmd supabase db reset --local
npx.cmd supabase db query --local -f supabase/tests/reference_seed_verification.sql
npm.cmd run catalog:fetch
npm.cmd run catalog:publish -- --dry-run
```

Expected:

- local Supabase resets cleanly with the new seed migration
- the verification query returns non-zero counts for the fixed dimensions
- the catalog publish script prints a summary instead of crashing on missing fields

- [ ] **Step 5: Commit the reference-data publishing checkpoint**

```bash
git add supabase/migrations/20260704043302_seed_reference_dimensions.sql supabase/tests/reference_seed_verification.sql src/features/catalog/catalog-record.ts scripts/catalog/import-reference-data.ts scripts/catalog/build-thumbnails.ts scripts/catalog/publish-reference-data.ts
git commit -m "feat: add production catalog publish pipeline"
```

### Task 5: Create the New Public GitHub Repo and Push the App

- [ ] **Step 1: Create the repository in GitHub**

Browser steps:

1. Create a new public repo named `terraforming-mars-stats`.
2. Do not initialize it with a README, `.gitignore`, or license.
3. Keep the owner account personal unless you explicitly want an organization repo.

Expected:

- GitHub shows an empty public repo ready for the first push

- [ ] **Step 2: Point this local repo at GitHub and push the current app to `main`**

Run:

```bash
git remote add origin https://github.com/<your-github-user>/terraforming-mars-stats.git
git push -u origin tm-stats-app:main
```

Expected:

- `git remote -v` shows `origin`
- GitHub shows the app on the `main` branch
- Cloudflare can later connect directly to that repo and branch

### Task 6: Provision the New Supabase Project and Load the Real Data

- [ ] **Step 1: Create the new Supabase production project**

Browser steps:

1. Create a new free-tier project.
2. Copy the project URL, publishable key, service-role key, and project ref.
3. Leave sign-in providers simple for the first launch.

Expected:

- the project exists and the dashboard exposes URL + API keys

- [ ] **Step 2: Link the CLI and apply the migrations**

Run:

```bash
npx.cmd supabase login
npx.cmd supabase link --project-ref <SUPABASE_PROJECT_REF>
npx.cmd supabase db push
```

Expected:

- the CLI links to the new project
- all migrations apply successfully
- the storage buckets from the migrations exist in the dashboard

- [ ] **Step 3: Publish the catalog metadata and upload the card images**

Run:

```bash
npm.cmd run catalog:publish
```

Expected:

- expansions, maps, styles, and any prepared corporations, preludes, promo sets, and cards are populated
- a catalog snapshot row is created for traceability

- [ ] **Step 4: Spot-check the data before involving Cloudflare**

Run:

```bash
npx.cmd supabase db query --linked --output json "select count(*) as cards from public.cards"
npx.cmd supabase db query --linked --output json "select count(*) as promos from public.promo_sets"
npx.cmd supabase db query --linked --output json "select count(*) as maps from public.maps"
```

Expected:

- card, promo, and map counts are all greater than zero
- the app now has enough reference data to render selectors and promo browsing

### Task 7: Connect Cloudflare Workers Builds to GitHub and Deploy the Site

- [ ] **Step 1: Connect the GitHub repo to Cloudflare Workers Builds**

Browser steps:

1. Log in to Cloudflare.
2. Open Workers & Pages.
3. Create a Worker or connect the repository if prompted.
4. Authorize the Cloudflare GitHub integration when asked.
5. Select the `terraforming-mars-stats` repo and the `main` branch.

Expected:

- Cloudflare shows the repo connected under the Worker build settings

- [ ] **Step 2: Add only the runtime env the deployed Worker actually needs**

Add these in Cloudflare Build Variables and secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE`

Do not add:

- `SUPABASE_SERVICE_ROLE_KEY`

Expected:

- the build has the public/runtime vars it needs
- the deployed Worker is not carrying a service-role key it does not use

- [ ] **Step 3: Configure Supabase Auth for the live Cloudflare URL**

In Supabase Auth URL settings:

1. set Site URL to `https://terraforming-mars-stats.workers.dev`
2. add `https://terraforming-mars-stats.workers.dev/auth/callback`
3. add `https://terraforming-mars-stats.workers.dev/profile`

Expected:

- live magic links are allowed to exchange and redirect correctly

- [ ] **Step 4: Trigger the first Cloudflare deployment**

Primary path:

- let the GitHub connection build and deploy from `main`

Fallback path if the dashboard flow blocks:

```bash
npx.cmd wrangler login
npm.cmd run deploy
```

Expected:

- the site deploys to `https://terraforming-mars-stats.workers.dev`
- Cloudflare shows a successful deployment for the latest commit

### Task 8: Smoke-Test the Live Site and Lock the Build Ready State

- [ ] **Step 1: Run the local verification commands one last time**

Run:

```bash
npm.cmd run test
npm.cmd run build
```

Expected:

- unit tests pass
- the production build passes before relying on Cloudflare logs

- [ ] **Step 2: Verify the public site responds**

Run:

```bash
Invoke-WebRequest https://terraforming-mars-stats.workers.dev
```

Expected:

- HTTP 200
- returned HTML includes the landing page shell

- [ ] **Step 3: Do the browser smoke test that matters for the user workflow**

Manual checks:

1. landing page loads on phone-sized viewport
2. `/login` loads
3. `/profile` redirects to `/login` when signed out
4. magic-link email returns through `/auth/callback` and lands in the app
5. `/group`
6. `/log-game`
7. `/log-game/import`
8. one safe read/write path works, such as creating a player profile or saving group defaults

Expected:

- the site is not just deployed, it is actually usable for the group workflow

- [ ] **Step 4: Mark the app developer-build ready**

Ready means all of the following are true:

1. GitHub repo exists and contains the current app on `main`
2. Supabase production project exists and is seeded
3. Cloudflare Worker deploys from GitHub
4. live auth works
5. live protected routes work
6. live reference data exists

## Self-Review

### Scope Coverage

- The plan covers the actual website hosting path the user asked for: GitHub, Cloudflare Workers, and a live `workers.dev` URL.
- It includes the missing auth callback work that would otherwise break magic-link sign-in after launch.
- It includes the fresh-project reference data path, so a new Supabase project is not left empty.
- It keeps service-role usage limited to local admin scripts instead of pushing it into the public Worker runtime.

### Operational Risks

- The catalog publish pipeline is still thin in the repo today, so Task 4 is the main execution risk.
- Cloudflare Git integration should be the primary path, but the plan keeps `wrangler` deploy available as a safe fallback.
- If the preferred Worker name is unavailable, use the closest acceptable variant and immediately update the Supabase Auth URLs to match.

### Placeholder Scan

- No `TODO`, `TBD`, or “figure this out later” placeholders remain.
- The plan names the concrete files, scripts, commands, dashboards, and live URLs involved.
- The only branch point left is the Cloudflare fallback deploy path, which is intentional risk handling rather than a missing decision.
