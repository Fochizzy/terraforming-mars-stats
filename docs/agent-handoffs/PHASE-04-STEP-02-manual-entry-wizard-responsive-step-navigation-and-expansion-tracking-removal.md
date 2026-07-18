# Phase 4, Step 4.2 — Manual Entry Wizard, Responsive Step Navigation, and Expansion-Tracking Removal

## Assignment

Complete Phase 4, Step 4.2 — Manual Entry Wizard and Responsive Step
Navigation. Do not begin Step 4.3.

During the substep the user explicitly broadened the assignment twice: first,
expansion selection must not be required; then, gameplay expansion data must not
be tracked at all. The user confirmed removal product-wide, including a database
migration. Intrinsic expansion metadata used to identify and browse catalog
cards, corporations, and Preludes remains in scope and was intentionally kept.

## Outcome

Step 4.2 is complete.

- Manual Entry uses one typed six-step registry for step identity, order, labels,
  descriptions, form-section ownership, review-issue ownership, revisiting,
  conditional status, and heading IDs.
- The shared navigation renders semantic list/tab-like state, progress, active,
  completed, and error status, with full labels on wide screens and compact,
  horizontally reachable navigation at narrow widths.
- The shell retains one React Hook Form instance and the existing draft/save,
  resume, review, finalization, import-link, and active-group boundaries.
- Back and Continue navigate the form without submitting it. Save Draft remains
  explicit. Finalize remains the existing final step action.
- Expansion choices/defaults and gameplay expansion state were removed from
  group settings, Manual Entry, import construction, draft persistence,
  finalization, saved-game relations, analytics filters, URL state, eligibility,
  and interaction analytics.
- Legacy draft snapshots that contain `expansionCodes` remain parseable; the
  retired key is discarded.
- Prelude identities remain optional evidence when recorded. Missing Prelude
  rows remain missing and are not converted into a claim that Prelude was off.

## Database change

Migration:

`supabase/migrations/20260718041532_remove_game_expansion_tracking.sql`

The migration:

1. creates a security-invoker helper view that reads production's
   multi-corporation selection table when present and falls back to the baseline
   `game_players.corporation_id` model in a fresh repository reset;
2. replaces group/player interaction views with corporation–Prelude-only
   definitions;
3. grants the same analytics read roles; and
4. drops `public.game_expansions`, `public.group_default_expansions`, and
   `public.expansions` without `CASCADE`.

The migration was applied successfully to linked project
`qjtwgrjjwnqafbvkkfex` as remote version `20260718041532`. Before removal,
production contained 17 expansion catalog rows, 1 group-default link, and 27
game-expansion links. Post-application verification confirmed:

- all three retired relations resolve to `null` through `to_regclass`;
- group and player interaction view definitions contain no expansion join or
  interaction;
- the only group interaction type returned is
  `corporation_prelude_pair`;
- intrinsic catalog expansion metadata remains populated on 1,083 cards, 116
  corporations, and 135 Preludes; and
- the remote migration version matches the local filename.

The retired relation data is no longer recoverable through the application or
down migration. Recovery would depend on Supabase project backups or point-in-
time recovery, if enabled.

No application push or deploy was requested or performed.

## Main implementation files

- `src/features/games/log-game/manual-entry-steps.ts`
- `src/features/games/log-game/manual-entry-step-navigation.tsx`
- `src/features/games/log-game/log-game-wizard.tsx`
- `src/features/games/log-game/{setup,players,milestones,scores,style,review}-step.tsx`
- `src/components/ui/step-heading.tsx`
- `src/lib/validation/log-game.ts`
- `src/lib/db/game-draft-repo.ts`
- `src/features/games/finalize-game.ts`
- `src/lib/imports/build-import-draft.ts`
- `src/features/groups/group-settings-form.tsx`
- `src/lib/db/group-settings-repo.ts`
- `src/lib/validation/group-settings.ts`
- `src/lib/analytics/{filters,filter-normalization,filter-url-state,eligibility,repository-contracts}.ts`
- `src/lib/db/analytics-repo.ts`
- the corresponding focused tests and migration verification files

## Validation

- Focused wizard/expansion coverage: 16 files, 108 tests passed.
- Full Vitest suite: 131 files, 663 tests passed.
- `npx tsc --noEmit`: clean.
- `npm run lint`: passed with the same four pre-existing warnings (three
  `no-img-element` warnings in `score-profile-panel.tsx` and one unused helper
  warning in `analytics-repo.ts`).
- `npm run build`: passed, 31/31 pages, Middleware 106 kB, `/log-game` 10 kB.
- `git diff --check`: passed; only existing line-ending conversion warnings were
  printed.
- Local `supabase db reset` could not run because Docker Desktop was not running.
  Static migration tests and direct post-application production verification
  were used instead.

## Responsive evidence

- 1440 px: no page or step-navigation overflow; full labels; targets at least
  44 px.
- 1024 px: no page or step-navigation overflow; compact labels.
- 768 px: no page overflow; the step strip scrolls horizontally and the active
  step remains visible.
- 390 px: no page overflow; the step strip remains horizontally reachable; the
  active step remains visible; actions stack to full-width 351×46 controls.

## Security-advisor follow-up

The post-migration Supabase security advisor still reports existing issues that
were not introduced or changed in this substep and were not safe to broaden into
an unrequested cleanup:

- 22 public backup/migration tables have RLS disabled and are exposed through
  PostgREST;
- `public.game_log_import_integrity_audit` is a SECURITY DEFINER view;
- additional existing warnings cover mutable function search paths, overly
  permissive policies, anonymous execution of security-definer functions, and
  one RLS-enabled table without a policy.

These should be handled as a separate, explicitly authorized security task.

## Boundaries and next action

- The original repository at `C:\Users\izzyh\Documents\Terraforming Mars` was
  not changed.
- Separately authorized asset changes already present in this worktree were not
  staged into the Step 4.2 commit.
- Step 4.3 was not begun.
- Await an explicit Step 4.3 assignment before continuing Phase 4.
