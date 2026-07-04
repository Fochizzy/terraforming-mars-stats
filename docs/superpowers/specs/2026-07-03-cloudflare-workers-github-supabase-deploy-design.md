# Terraforming Mars Deployment Design

Date: 2026-07-03

## Overview

This design covers the first production-style deployment path for the Terraforming Mars Stats app.

The deployment target is:

1. a new public GitHub repository
2. a GitHub-connected Cloudflare Workers deployment
3. a new free-tier Supabase production project
4. a first live URL on `terraforming-mars-stats.workers.dev`

The goal is to get the existing Next.js app reachable on the public internet with the least custom infrastructure while preserving room to add a real custom domain later.

## Goals

1. Publish the app to a live URL usable from desktop and phone
2. Keep the deployment flow simple enough for a first launch
3. Preserve server-side Next.js behavior such as middleware, server components, and server actions
4. Connect production auth, database, and storage through Supabase
5. Use GitHub as the source of truth for ongoing deploys

## Non-Goals

1. A custom domain is not part of the first launch
2. CI polish beyond basic GitHub-connected deploys is not required for v1
3. Production hardening beyond a safe free-tier launch is not required yet
4. Export backups, observability dashboards, and multi-environment release promotion are out of scope for this step

## Chosen Approach

Use Cloudflare Workers with the official Next.js-on-Workers path rather than static hosting.

Why:

1. the app uses middleware
2. the app uses server-side Supabase session handling
3. the app uses server actions for draft save, finalize, and import flows
4. the app should behave the same way in production as it does in local Next.js development

The deployment model is:

1. local repo pushed to GitHub
2. Cloudflare connected to the GitHub repo
3. Cloudflare builds and deploys the Worker on pushes to the production branch
4. Supabase provides runtime services through environment variables and hosted infrastructure

## Architecture

### App Runtime

The app remains a Next.js App Router application.

Cloudflare hosts it through a Workers-compatible adapter layer so the following behaviors keep working:

1. route middleware
2. App Router SSR
3. server components
4. server actions
5. protected auth-aware routes

### Source of Truth

GitHub becomes the code source of truth.

Cloudflare pulls from GitHub for production deploys.
Supabase remains the source of truth for:

1. authentication
2. database state
3. storage buckets
4. live application data

### Live URL

The first public URL should be:

`https://terraforming-mars-stats.workers.dev`

If that exact Worker name is unavailable, use the closest available variant without changing the architectural plan.

## Components

### GitHub

GitHub is responsible for:

1. hosting the repository
2. storing the deployment branch history
3. acting as the repo connection point for Cloudflare

The initial repo should be public because the user approved that visibility.

### Cloudflare

Cloudflare is responsible for:

1. building the Next.js app for Workers
2. storing runtime secrets and plain env vars
3. serving the app on `workers.dev`
4. handling redeploys from GitHub pushes

### Supabase

Supabase is responsible for:

1. auth and session cookies
2. public and protected database tables
3. storage buckets for cards and import evidence
4. future live production data for the group

The first production project should use the simplest free-tier setup without custom tuning.

## Required Production Configuration

### GitHub

Create a new public repository, ideally named:

`terraforming-mars-stats`

### Supabase

Create a new production project and capture:

1. project URL
2. publishable key
3. service role key
4. project ref or project ID when needed for CLI linking and admin tasks

The auth site URL and redirect URLs must be updated to include the live Cloudflare URL once it exists.

### Cloudflare

Create or connect:

1. a Workers project using the GitHub repo
2. the `workers.dev` subdomain target
3. production env vars matching the app runtime

Expected runtime values include:

1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`
4. `SUPABASE_PROJECT_ID`
5. `SUPABASE_STORAGE_BUCKET_CARD_FULL`
6. `SUPABASE_STORAGE_BUCKET_CARD_THUMBS`
7. `SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE`

## Repo Changes Required

The repo needs a production hosting layer for Cloudflare Workers.

Expected changes:

1. add the Cloudflare-compatible Next.js deployment dependencies
2. add Worker build and deploy configuration files
3. add or update scripts for local Cloudflare build or preview where helpful
4. document the GitHub and Cloudflare environment requirements

These changes should preserve local `next dev`, current tests, and existing app behavior.

## Data and Setup Flow

The first live setup should happen in this order:

1. create the GitHub repo
2. push the current app code to GitHub
3. create the Supabase project
4. apply schema migrations and bucket setup to Supabase
5. create or connect the Cloudflare Workers project
6. add runtime env vars in Cloudflare
7. set Supabase auth site URL and redirect URLs for the live app
8. trigger the first GitHub-connected Cloudflare deploy
9. verify public load, login flow, protected routing, and the import page

## Error Handling and Recovery

### GitHub Problems

If GitHub repo creation or push fails:

1. stop before Cloudflare connection work
2. resolve repo access first
3. do not connect Cloudflare to a partial or incorrect repo

### Supabase Problems

If the Supabase project exists but migrations fail:

1. stop before claiming the app is live
2. verify schema objects and storage buckets explicitly
3. fix the schema before production use

### Cloudflare Problems

If Cloudflare builds fail:

1. treat the deployment adapter or env configuration as the likely issue first
2. inspect build logs before changing app behavior
3. keep the repo deployable locally while iterating

### Auth Problems

If login redirects fail live:

1. verify Supabase site URL
2. verify additional redirect URLs
3. verify Cloudflare production env vars
4. verify that middleware still sees the expected cookie flow

## Verification Plan

Before calling the deployment path complete, verify:

1. the GitHub repo exists and contains the app
2. the Cloudflare project is connected to the repo
3. the Worker serves the app on `workers.dev`
4. the landing page loads
5. the login page loads
6. protected routes redirect correctly when signed out
7. the authenticated app shell loads when signed in
8. the `Log Game` route loads
9. the `Web Import` route loads
10. Supabase-backed reads and writes succeed for at least one safe test path

## Risks and Mitigations

### Risk: Workers adapter mismatch

Mitigation:

Use the official Cloudflare Next.js Workers deployment path and verify against current Cloudflare docs before implementation.

### Risk: Supabase auth redirect mismatch

Mitigation:

Treat the live `workers.dev` URL as a first-class auth configuration input and verify redirects immediately after first deploy.

### Risk: Production secrets drift

Mitigation:

Keep the authoritative production env list in the repo docs and use matching names across `.env.example`, Cloudflare, and Supabase-related setup notes.

### Risk: GitHub-connected deploys fail before first release

Mitigation:

Keep the rollout narrow: one production branch, one Workers project, one `workers.dev` hostname, one Supabase project.

## Testing Scope

The deployment implementation should include:

1. existing app test suite staying green
2. production build verification
3. Cloudflare-targeted build or deploy verification
4. one live smoke test after deployment

## Final Decisions

1. Host on Cloudflare Workers, not static Pages
2. Use `workers.dev` first, not a custom domain
3. Use `terraforming-mars-stats` as the preferred Worker name
4. Create a brand-new public GitHub repository
5. Create a brand-new free-tier Supabase production project
6. Connect Cloudflare to GitHub for deploys from the start
7. Keep the first release path simple and production-like rather than creating multiple environments
