# Phase 4, Step 4.1 Handoff — Log a Game Workflow Preservation and Unified Entry Foundation

## Assignment

Explicit assignment: **Phase 4, Step 4.1 — Log a Game Workflow Preservation
and Unified Entry Foundation.** Audit the existing Manual Entry and Import
Game workflows before editing, preserve their data and finalization behavior,
make them visibly one Log a Game product area, centralize canonical workflow
terminology and states, improve safe resume/unavailable behavior, validate the
result, and document the durable contract.

Not authorized: Phase 4 Step 4.2, a full form redesign, a new persistence
model, validation/finalization semantic changes, schema or migration work,
production or Storage mutation, dependency changes, push, or deployment.

## Outcome

**Step 4.1 is complete in the repository.** Manual Entry remains at
`/log-game`; Import Game remains at `/log-game/import`; `/games` remains the
canonical Saved Games owner and `/saved-games` remains compatible. A shared
entry-method selector now makes the two routes one visible Log a Game product
area without merging their forms or fabricating new routes.

The shared foundation now provides:

- Manual Entry and Import Game labels and descriptions from one contract;
- current method with visible **Current** text and `aria-current="page"`;
- current group, workflow status, and Saved Games access on both routes;
- a preserved manual `gameId` link when resuming a draft;
- confirmation before dirty method changes or the selector's Saved Games
  exit, plus hard-unload protection;
- canonical section labels and workflow-state vocabulary;
- form pending/live-status accessibility semantics;
- a safe no-group Import Game unavailable state; and
- an access-safe manual-draft not-found state instead of silent blank-form
  fallback for malformed, missing, finalized, removed, cross-group, or
  RLS-hidden draft IDs.

No save, import, finalization, score, Merger, Prelude, milestone, award, style,
key-card, metric-refresh, RLS, or Storage behavior was changed.

## Branch and commits

- Working directory:
  `C:\Users\izzyh\Documents\Terraforming Mars Redesign`.
- Branch: `redesign/tm-stats-dashboard-rebuild`.
- Starting/Phase 3 closure commit:
  `dcd1f4b265e7eeb0257269f5936073a62bbf498e`
  (`chore(redesign): close phase 3 navigation and routes`).
- Separately landed middleware fix confirmed in ancestry:
  `e4a444f2d5ef8a6904966c8667ef59acdc346c50`.
- Starting worktree: clean.
- Final Step 4.1 commit: recorded by post-commit verification immediately
  after this handoff is committed. A commit cannot contain its own final hash;
  the final task report is the authoritative hash record.

The original repository at
`C:\Users\izzyh\Documents\Terraforming Mars` was used only as the protected
reference named by the assignment. No file, branch, process, database, or
production state in that repository was modified by Step 4.1. A pre-existing
development server from that checkout was explicitly left running and
untouched during E2E isolation.

## Required preflight and source review

Before editing, read in the required authority order:

1. the explicit Step 4.1 assignment;
2. `docs/REDESIGN_STATE.md`;
3. `docs/redesign/phases/04-log-a-game.md`;
4. `docs/redesign/DECISIONS.md`;
5. `docs/agent-handoffs/PHASE-03-STEP-04-navigation-and-route-phase-closure.md`;
6. `docs/agent-handoffs/PHASE-00-STEP-03-data-capability-audit.md`;
7. `docs/redesign/MASTER-RULES.md`;
8. `docs/redesign/MASTER-PLAN.md`;
9. `docs/redesign/reference/TM-Stats-Redesign-Master-Guide.docx` for broader
   Phase 4 product context; and
10. repository `AGENTS.md` and `CLAUDE.md`.

The DOCX renderer could not run because LibreOffice/`soffice` is unavailable
in this environment. Text extraction with the bundled document runtime was
used only for review; no DOCX was created or changed. The guide's relevant
direction matched the assignment: first unify Manual Entry and Import Game as
one product area while retaining `/log-game/import`; later steps own the full
header, persistent summary, and mobile/sticky-action changes.

The preflight report was delivered before any edit. It identified these
preservation contracts and risks:

- only `/log-game` and `/log-game/import` are implemented entry routes;
- the manual form is one page with six sections, not a routed wizard;
- draft save is explicit, despite a historical revision note saying
  `Draft autosave`;
- resume requires current-group, RLS-readable `status='draft'` plus latest
  revision;
- finalization is sequential and non-transactional;
- Import Game saves reviewable evidence and an editable manual draft, not a
  complete parser result;
- no complete card-acquisition writer or coverage contract exists;
- Merger provenance is preserved, but the current three-slot/at-least-one
  Prelude behavior does not enforce the separately described exact-two rule;
  and
- live authenticated browser review and unsaved-navigation boundaries were
  material verification risks.

The required current Supabase review was read-only. No relevant breaking
change altered this non-schema, existing-client Step 4.1 implementation, and
no Supabase CLI, database, migration, Storage, or production command ran.

## Implemented foundation

### Shared contract and selector

`src/features/games/log-game/log-game-entry.ts` owns:

- the two canonical entry methods;
- the six canonical manual section labels;
- the shared workflow-state vocabulary and labels;
- UUID-safe draft route parsing; and
- the resumable Manual Entry href helper.

`src/features/games/log-game/entry-method-selector.tsx` renders one semantic
selector on both routes. It is responsive, keyboard/focus visible, uses
non-color active state, exposes group/status context, and keeps method links
as normal direct URLs. Dirty method changes and its Saved Games exit require
confirmation; hard unload registers `beforeunload`. It does not persist or
copy unsaved state across methods.

Global application navigation and the server-rendered `GroupSwitcher` remain
outside the form client boundary; they are not covered by the selector's
confirmation and are documented as deferred.

### Manual Entry

The existing form, server actions, and all six sections remain intact. The
wizard now renders the shared selector, derives a presentational workflow
status, marks the form busy during a server action, announces save/finalize
feedback, and resets React Hook Form's dirty baseline after success while
retaining the server-returned game UUID.

The manual route parses `gameId` before reader selection. It still requires
current-group context before draft access. Invalid IDs and UUIDs that do not
resolve to a current-group draft now use the local access-safe not-found
surface. The response does not reveal whether the game is finalized, removed,
in another group, missing, or hidden by RLS.

### Import Game

The existing import form, OCR helper, evidence writer, correction metadata,
and draft action remain intact. The route now shares the exact **Log a Game**
page title, `GroupSwitcher`, entry selector, group/status context, dirty-exit
protection, pending/live feedback semantics, and Saved Games access. A signed-
in user without an active group receives a clear unavailable panel instead of
an unhandled group-context throw; the server action still requires current
group context before every write.

### Terminology

The existing section headings now use the centralized labels:

1. Setup
2. Players & Corporations
3. Milestones & Awards
4. Final Scores
5. Styles, Cards & Details
6. Review

This changes labels only. No field, order, form shape, validation rule, or
server payload changed.

## Preserved lifecycle and data behavior

### Drafts

- New manual forms use current group defaults and write nothing until an
  explicit action.
- Save re-authenticates, replaces client group identity with the active group,
  parses the existing Zod schema, resolves player references, upserts the
  draft shell/associations, and appends a revision snapshot.
- Resume reads only a current-group draft and its latest revision.
- Step 4.1 adds no deletion or retention behavior.

### Import

- Import creates the same editable draft shape.
- Exported-log text and optional private screenshot evidence remain attached.
- OCR correction/review metadata remains best-effort and disclosed.
- Import success still hands the user to
  `/log-game?gameId=<uuid>` for review/finalization.
- No complete parser, duplicate detection, or complete card-event coverage is
  claimed.

### Finalization

The existing `logGameDraftSchema` and `buildFinalizedGamePayload` contract is
unchanged. Existing sequential writes still update the game shell, replace
finalized children, append the final revision, refresh metric snapshots, and
revalidate downstream routes. No transaction or idempotency key was added;
partial-failure/retry behavior remains a known pre-existing risk.

### Authentication and authorization

Middleware continues to protect both routes and preserve return paths. Pages
and server actions re-resolve current-group context. RLS remains the final
data boundary. Existing group role labels do not add a narrower action-level
write gate; Step 4.1 neither broadens nor narrows that policy.

## Card-acquisition finding

The manual/import/finalization workflow has no trustworthy per-player,
per-generation writer or reviewed coverage contract for purchased, seen,
effect-drawn, otherwise acquired, completely played, or end-hand card counts.
Key-card selections and card-point scoring are not substitutes. Imported
card-played events cannot be treated as complete totals without a source and
coverage contract.

Therefore Step 4.1 adds no field, schema, migration, writer, inference, or
hard-coded analytic. Missing remains missing and explicit zero remains zero.
The phase specification now records the future event/aggregate/hybrid model
constraints without approving a model.

## Merger finding

The saved game continues to retain the Merger always-available value and its
provenance (`group_default`, `manual_override`, or stored/unknown source). The
owner-gated production migration/backfill remains untouched.

Pre-existing discrepancy: the current player UI renders three Prelude slots
and `buildGameReview` requires only at least one Prelude when the expansion is
enabled. It does not enforce the separately stated exact-two/Merger-slot
semantics. The assignment prohibited validation/finalization changes, so this
is documented and deferred rather than silently changed.

## Responsive and accessibility review

Source and component review confirmed:

- selector cards stack below `sm` and become two columns at `sm`;
- group/status definitions stack below `sm` and become two columns at `sm`;
- selector/Saved Games targets meet the 44px touch-height requirement;
- visible focus, semantic nav, `aria-current`, and visible Current text;
- `aria-busy` during form submission; and
- live-region status/error feedback for manual and import actions.

The requested live visual review at 1440, 1024, 768, and 390 pixels could not
be completed. The selected in-app browser refused the localhost route under
its URL security policy after the local server reported ready. Per browser
safety guidance, no alternate browser mechanism was used to bypass that
policy. This is a known limitation, not a claimed pass.

## Validation

| Check | Result |
| --- | --- |
| Focused Step 4.1 suite | 10 files / 23 tests passed |
| Full `npm.cmd test` | 128 files / 624 tests passed |
| `npx.cmd tsc --noEmit` | Clean |
| `npm.cmd run lint` | Passed with 4 pre-existing warnings: 3 `no-img-element` warnings in `score-profile-panel.tsx`, 1 unused helper warning in `analytics-repo.ts` |
| `npm.cmd run build` | Passed; 31/31 pages; `/log-game` and `/log-game/import` dynamic; `ƒ Middleware 106 kB` present |
| `git diff --check` | Passed; only repository line-ending notices |
| Committed unauthenticated Playwright spec | 1/1 passed against an isolated current-worktree server on port 3104 |

E2E environment detail: the default local configuration uses port 3000 and
`reuseExistingServer`. An older read-only original-checkout server was already
listening on IPv6 `localhost:3000`, while this worktree's server listened on
IPv4 `127.0.0.1:3000`. The middleware correctly returned `307` from the
current worktree, but Next's redirect to `localhost:3000` then reached the
unrelated server and its stale OCR build overlay. That first default run was
not counted as a product pass. The identical committed test was rerun against
an isolated port 3104 current-worktree server and passed 1/1. The temporary
Playwright config, generated `.next`, test results, and QA processes were
removed; the unrelated original-checkout server was not stopped or modified.

The production build also reports the same pre-existing Supabase Edge-runtime
warning and webpack cache-size warnings recorded by prior work. No new lint or
build warning is attributed to Step 4.1.

## Tests added or updated

Added coverage for:

- entry-method identity, group/status display, active semantics, direct hrefs,
  dirty method/Saved Games exit, and hard-unload protection;
- workflow-state vocabulary, route parsing, and resumable Manual Entry hrefs;
- access-safe manual not-found behavior;
- Import Game no-group unavailable behavior;
- manual/import selector integration and group context; and
- route metadata preserving the shared Log a Game identity.

Existing form, import-shell, and section tests were updated only for the new
required group prop or centralized label contract.

## Files changed

### New production files

- `src/features/games/log-game/log-game-entry.ts`
- `src/features/games/log-game/entry-method-selector.tsx`
- `src/app/(app)/log-game/not-found.tsx`

### New tests

- `src/features/games/log-game/log-game-entry.test.ts`
- `src/features/games/log-game/entry-method-selector.test.tsx`
- `src/app/(app)/log-game/not-found.test.tsx`
- `src/app/(app)/log-game/import/page.test.tsx`

### Updated application files

- `src/app/(app)/log-game/page.tsx`
- `src/app/(app)/log-game/import/page.tsx`
- `src/features/games/log-game/log-game-wizard.tsx`
- `src/features/games/log-game/setup-step.tsx`
- `src/features/games/log-game/players-step.tsx`
- `src/features/games/log-game/milestones-step.tsx`
- `src/features/games/log-game/scores-step.tsx`
- `src/features/games/log-game/style-step.tsx`
- `src/features/games/log-game/review-step.tsx`
- `src/features/imports/log-game-import-shell.tsx`
- `src/features/imports/web-import-page.tsx`
- `src/lib/navigation/route-metadata.ts`

### Updated tests

- `src/features/games/log-game/log-game-wizard.test.tsx`
- `src/features/imports/log-game-import-shell.test.tsx`
- `src/features/imports/web-import-page.test.tsx`
- `src/lib/navigation/route-metadata.test.ts`

### Documentation

- `docs/redesign/phases/04-log-a-game.md`
- `docs/redesign/DECISIONS.md`
- `docs/redesign/MASTER-PLAN.md`
- `docs/REDESIGN_STATE.md`
- this handoff

## Migrations, production actions, and dependencies

- Migrations added or applied: **none**.
- Database/schema/RPC/view/RLS changes: **none**.
- Supabase data or Storage mutations: **none**.
- Production asset changes: **none**.
- Dependency or lockfile changes: **none**.
- Original-repository writes: **none**.
- Push or deployment: **none**.

## Assumptions and limitations

- Access-safe not-found intentionally collapses missing, finalized, removed,
  cross-group, and RLS-hidden draft outcomes; externally distinguishing them
  would create an enumeration risk.
- The workflow-state list is vocabulary, not a new persistence state machine;
  some states are documented for later presentation rather than currently
  observable in the selector.
- Unsaved protection is scoped to method changes, selector Saved Games, and
  hard unload. Global nav and group switching remain deferred.
- Finalization remains non-transactional and lacks a new idempotency key.
- Import remains evidence-first and reviewable, not a complete parser.
- Card acquisition remains unavailable without an approved writer/coverage
  contract.
- The Prelude/Merger semantic discrepancy remains open.
- Authenticated, data-backed visual review at the four requested widths was
  blocked by the in-app browser URL policy.

## Next approved action

Await an explicit assignment for **Phase 4, Step 4.2**. Do not begin it from
this handoff alone. The un-applied owner-gated Merger production package also
remains separate and unauthorized.
