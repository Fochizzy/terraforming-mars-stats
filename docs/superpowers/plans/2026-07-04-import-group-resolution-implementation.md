# Import Group Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement exact participant-set group resolution for web imports while keeping the rest of the app group-based.

**Architecture:** Add an authenticated import-only path that resolves or creates groups server-side, then reuse the existing draft game flow. Keep the player/group model intact, but compute exact roster signatures and broaden permissions so all members can edit shared group data.

**Tech Stack:** Next.js App Router, React, Vitest, Supabase Postgres, Supabase Storage

---

### Task 1: Add the exact participant parsing and resolution primitives

**Files:**
- Create: `src/lib/imports/parse-import-participants.ts`
- Create: `src/lib/db/import-group-repo.ts`
- Test: `src/lib/imports/parse-import-participants.test.ts`
- Test: `src/lib/db/import-group-repo.test.ts`

- [ ] Parse participant names from import text input.
- [ ] Normalize aliases for exact matching only.
- [ ] Compute exact roster signatures that ignore turn order.
- [ ] Resolve existing linked users or fall back to new-name identities.

### Task 2: Carry participant names through the web import form

**Files:**
- Modify: `src/features/imports/web-import-page.tsx`
- Modify: `src/features/imports/log-game-import-shell.tsx`
- Modify: `src/features/imports/import-review-panel.tsx`
- Modify: `src/features/imports/web-import-page.test.tsx`
- Modify: `src/features/imports/log-game-import-shell.test.tsx`

- [ ] Add a required participant input to the web import UI.
- [ ] Pass parsed participant names through the action payload.
- [ ] Update review copy so the user understands exact-match and new-group behavior.

### Task 3: Resolve or create the target group from the import route

**Files:**
- Modify: `src/app/(app)/log-game/import/page.tsx`
- Modify: `src/lib/imports/build-import-draft.ts`
- Modify: `src/lib/imports/build-import-draft.test.ts`
- Create: `src/lib/supabase/admin.ts`
- Modify: `src/lib/env.ts`

- [ ] Authenticate the import route without requiring an existing group.
- [ ] Resolve or create the target group before building the draft.
- [ ] Seed the selected player ids from the resolved roster.
- [ ] Save the import evidence and route into the normal draft flow.

### Task 4: Make no-group users land on import instead of crashing

**Files:**
- Modify: `src/features/auth/build-auth-callback-url.ts`
- Modify: `src/features/auth/login-form.tsx`
- Modify: `src/features/groups/require-group-context.ts`
- Modify: `src/app/(app)/profile/page.tsx`
- Test: `src/features/auth/build-auth-callback-url.test.ts`
- Test: `src/features/groups/require-group-context.test.ts`
- Test: `src/app/(app)/profile/page.test.tsx`

- [ ] Default login redirects to `/log-game/import`.
- [ ] Redirect no-group users from group-required pages to the import route.
- [ ] Prevent the signed-in `/profile` crash.

### Task 5: Broaden group permissions to equal member access

**Files:**
- Create: `supabase/migrations/20260704034500_make_group_members_equally_privileged.sql`

- [ ] Make `can_edit_group` membership-based.
- [ ] Update group, membership, and settings policies to shared member rights.
- [ ] Update default expansion and promo policy writes to the same symmetric model.

### Task 6: Verify the repo end to end

**Files:**
- Test: `npm.cmd run test`
- Test: `npm.cmd run build`

- [ ] Run focused regression tests while developing.
- [ ] Run the full Vitest suite.
- [ ] Run the production build and confirm the import route compiles cleanly.
