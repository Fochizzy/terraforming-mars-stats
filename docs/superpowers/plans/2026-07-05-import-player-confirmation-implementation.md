# Import Player Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ranked import-player matching with a confirm list before web-import draft creation.

**Architecture:** Enrich the import analysis response with ranked roster candidates built from roster names, linked profile names, usernames, aliases, and group play counts. Keep the confirm UI client-side, then submit the explicit imported-name to player-id map back to the server so draft creation and alias saving use confirmed choices instead of recomputed guesses.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase server/admin clients, Vitest, React Testing Library

---

### Task 1: Add ranked candidate matching and server-side roster enrichment

**Files:**
- Create: `src/lib/db/import-player-resolution-repo.ts`
- Create: `src/lib/db/import-player-resolution-repo.test.ts`
- Modify: `src/lib/imports/resolve-import-player-links.ts`
- Modify: `src/lib/imports/resolve-import-player-links.test.ts`

### Task 2: Pass confirmed player links through the import flow

**Files:**
- Modify: `src/lib/imports/import-draft-form-data.ts`
- Modify: `src/lib/imports/import-draft-form-data.test.ts`
- Modify: `src/lib/imports/build-import-review-model.ts`
- Modify: `src/app/(app)/log-game/import/page.tsx`

### Task 3: Replace status-only review rows with the confirm dropdown UI

**Files:**
- Modify: `src/features/imports/import-player-resolution-panel.tsx`
- Modify: `src/features/imports/import-review-panel.tsx`
- Modify: `src/features/imports/web-import-page.tsx`
- Modify: `src/features/imports/web-import-page.test.tsx`
- Modify: `src/features/imports/log-game-import-shell.test.tsx`

### Task 4: Save aliases from confirmed non-exact choices and verify the flow

**Files:**
- Modify: `src/lib/db/player-import-alias-repo.ts`
- Modify: `src/lib/db/player-import-alias-repo.test.ts`
- Modify: `src/app/(app)/log-game/import/page.tsx`

## Self-Review

### Spec Coverage

- Ranked exact, alias, username, full-name, and partial matching are covered by Tasks 1 and 2.
- The quick confirm-list UI and explicit confirmation submit path are covered by Task 3.
- Alias learning from confirmed non-exact choices is covered by Task 4.

### Placeholder Scan

- No `TODO`, `TBD`, or deferred placeholders remain.

### Type Consistency

- The plan uses one shared concept throughout: confirmed imported-name to player-id links plus ranked candidate lists.
