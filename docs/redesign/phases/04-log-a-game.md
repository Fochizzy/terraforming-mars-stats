# Phase 4 — Log a Game

## Status

Phase 4 is active. **Step 4.1 — Log a Game Workflow Preservation and Unified
Entry Foundation is complete in the repository.** Later Phase 4 work remains
gated by a separate explicit assignment.

Step 4.1 establishes a shared product entry surface and records the existing
workflow contract. It does not redesign the form, change validation or
persistence semantics, add card-acquisition storage, or begin Step 4.2.

## Step 4.1 scope and outcome

The existing entry methods remain separate, direct-linkable routes under one
visible **Log a Game** product area:

| Method | Canonical route | Existing responsibility | Step 4.1 treatment |
| --- | --- | --- | --- |
| Manual Entry | `/log-game` | Create a new manual draft, or resume a saved draft through `?gameId=<uuid>` | Retained; now uses the shared entry selector and canonical workflow terminology |
| Import Game | `/log-game/import` | Create a draft from pasted exported-log evidence and an optional endgame screenshot/OCR result | Retained; now uses the same product title, selector, group context, status language, and Saved Games exit |

`/games` remains the canonical Saved Games surface and `/saved-games` remains
its compatibility route. Saved Games reopens an editable draft at
`/log-game?gameId=<uuid>`. There is no implemented `/log-game/import-single`
route and no standalone `/log-game/review` route; this step does not invent
either one.

The shared selector:

- labels the two methods **Manual Entry** and **Import Game**;
- identifies the active method with `aria-current="page"` and visible
  **Current** text, not color alone;
- displays the active group and current workflow status;
- links to Saved Games;
- preserves an active manual draft's `gameId` when the selector is rendered
  on that draft;
- asks for confirmation before a dirty form switches methods or exits through
  the selector's Saved Games link;
- registers `beforeunload` protection for hard reload, tab close, or external
  navigation while the rendered form is dirty; and
- does not add automatic persistence or silently copy dirty form state from
  one method to the other.

The group switcher and global application navigation remain outside the
client form boundary and therefore do not receive the selector's dirty-form
confirmation in Step 4.1. That broader navigation guard is deferred rather
than implied complete.

## Canonical terminology

The following section names are centralized and shared by the existing
manual workflow:

1. **Setup**
2. **Players & Corporations**
3. **Milestones & Awards**
4. **Final Scores**
5. **Styles, Cards & Details**
6. **Review**

All six sections remain visible in one responsive form. The names describe
logical workflow sections; Step 4.1 does not introduce a step router, progress
wizard, sticky action bar, or mobile-app navigation model.

The shared workflow vocabulary is:

- `choosing_entry_method`
- `creating_manual_draft`
- `loading_draft`
- `editing_manual_draft`
- `importing`
- `reviewing_imported_data`
- `validating`
- `saving`
- `saved`
- `save_failed`
- `ready_to_finalize`
- `finalizing`
- `finalized`
- `finalization_failed`
- `inaccessible`
- `unavailable`
- `not_found`

This is canonical vocabulary for existing route, form, and server-action
states, not a second state machine. The current selector derives and presents
the states it can observe directly; future steps may expose more of the
vocabulary without changing its meaning.

## Existing Manual Entry contract

### Setup

The form records played date, map, player count, generation count, expansions,
promo sets, and the saved Merger-offer rule plus its provenance. Defaults come
from the active group's settings and reference repositories.

### Players & Corporations

The form selects or creates player references, selects a corporation per
player, and records Prelude identities. Player references are resolved on the
server before save or finalization.

### Milestones & Awards

The form records map-valid milestone claims and winners, plus award funding,
funder, first-place finishers, and optional second-place finishers. Tied award
placements are retained as arrays rather than collapsed.

### Final Scores

Per-player inputs cover cities, greenery, total card points, optional microbe,
animal, and Jovian card-point detail, Terraform Rating, milestone points,
award points, total points, and final megacredits. Explicit numeric zero and a
missing optional value remain distinct.

### Styles, Cards & Details

Per-player inputs record one declared primary style, up to two style modifiers,
and selected key-card identities. They are not card-acquisition counts and do
not prove when or how a card entered a player's hand.

### Review

The existing review calculation checks player-count consistency,
corporations, required Prelude presence, required score fields, optional
card-point breakdown reconciliation, map-valid milestone/award rows, award
winners and funders, milestone/award point reconciliation, and supported
style counts. It also produces derived coverage summaries and ranking input.
Notes remain editable here.

## Draft lifecycle and resume behavior

- `/log-game` without `gameId` creates a client-side new-form state using
  active-group defaults. It does not write until the user chooses **Save
  Draft** or **Finalize Game**.
- **Save Draft** is an explicit action. Despite the historical revision note
  text `Draft autosave`, there is no timer-, blur-, or field-change autosave.
- Save re-authenticates the user, replaces the submitted `groupId` with the
  current active group, validates with the existing Zod schema, resolves
  player references, upserts the `games` draft shell and expansion/promo
  associations, and appends a `game_revisions` snapshot.
- A successful save returns the stable game UUID, resets React Hook Form's
  dirty baseline to the saved values, and keeps the resumable manual URL.
- `/log-game?gameId=<uuid>` loads only a `draft` game in the current active
  group and uses its latest revision snapshot.
- A malformed `gameId`, a missing draft, a finalized game, a removed draft,
  or a draft hidden by active-group/RLS boundaries renders one access-safe
  not-found state instead of silently opening a blank new game. The public
  response intentionally does not reveal which of those cases occurred.
- Step 4.1 adds no delete action and changes no draft-retention behavior.

## Import Game contract

Import Game accepts pasted exported-log text and an optional endgame screenshot.
Browser OCR may prefill recognized text and confidence. The server action:

1. re-authenticates and resolves the current active group;
2. builds the same editable manual-draft shape from group defaults;
3. explicitly saves that draft;
4. stores pasted log evidence and, when supplied, private screenshot evidence;
5. persists OCR correction/review metadata when recognized text exists; and
6. returns a link to `/log-game?gameId=<uuid>` for review and finalization.

Import Game does not claim a complete gameplay parser, duplicate-game
detection, or complete card-event coverage. Imported evidence remains
reviewable and editable before finalization. A signed-in account with no active
group receives a clear unavailable state; the server action still rechecks
group membership before any write.

## Validation and finalization contract

Finalization preserves the existing two-layer validation:

1. the submitted draft is parsed by `logGameDraftSchema`; and
2. `buildFinalizedGamePayload` rejects blocking review issues and builds
   normalized player ranking, scores, Prelude rows, milestones, awards,
   declared/inferred styles, key cards, and revision evidence.

The existing repository then updates the game shell to `finalized`, replaces
the finalized child rows, appends the final revision, and refreshes metric
snapshots. The page revalidates Group, Players, Insights, Log a Game, and
Profile readers.

These writes are sequential, not one database transaction. Client pending
state prevents a second click in the rendered form, but the server action has
no new idempotency key. Partial failure and retry behavior are therefore a
known pre-existing risk; Step 4.1 does not claim transactional finalization.

## Authentication, group context, and authorization

- Middleware protects both entry routes and preserves the requested return
  path for unauthenticated users.
- Page loaders require authenticated current-group context before loading
  group defaults, player options, or a manual draft.
- Server actions re-resolve the authenticated user and active group; client
  `groupId` values are not trusted.
- Supabase RLS remains the final data-access boundary.
- Existing group role labels are not an additional per-action write gate in
  this workflow; current group-member RLS behavior is preserved and not
  broadened or narrowed here.

## Accessibility and responsive behavior

Step 4.1 preserves the responsive website model established by Phase 3:

- method controls stack at narrow widths and become two columns at `sm`;
- group/status context stacks safely and becomes a two-column definition list
  at `sm`;
- method links and Saved Games provide at least 44px touch height;
- visible focus treatment is retained;
- status and error feedback uses live-region semantics;
- form pending state exposes `aria-busy`; and
- active method status is available in text and through `aria-current`.

Live authenticated visual inspection at 1440, 1024, 768, and 390 pixels was
not possible in the execution environment: the in-app browser refused the
localhost route under its URL security policy. This limitation is recorded,
not represented as a completed visual review. Source-level breakpoint review,
component/route tests, the production build, and the isolated unauthenticated
Playwright regression are the available evidence for this step.

## Card-acquisition audit

The current workflow has no manual inputs, import coverage contract, writer,
or reviewed finalization rows for per-player/per-generation:

- cards purchased;
- cards seen;
- cards drawn through effects;
- cards acquired through other sources;
- cards played as a complete count; or
- cards remaining at game end.

Key-card identity selections and score-card point values are not substitutes.
Some import/event infrastructure may record individual card-played evidence,
but Step 4.1 found no approved completeness or coverage contract that makes it
safe to present as total card acquisition. Therefore Step 4.1 adds no fields,
schema, migration, writer, inference, or hard-coded analytics.

Future card-acquisition work must retain these rules:

- preserve missing versus explicit zero;
- do not require unavailable historical data;
- do not infer Cards Seen from Cards Purchased;
- do not infer Cards Played from final hand size;
- do not infer total acquisitions by summing hand snapshots;
- record source and coverage for imported values;
- validate nonnegative integer counts;
- prevent duplicate generation records; and
- preserve draft editing and game-finalization behavior.

Individual events remain preferable when card identity, source, and timing are
known. Generation aggregates remain acceptable only when they are the actual
recorded grain. A hybrid model requires explicit reconciliation rules. No
choice among those models is approved by Step 4.1.

## Merger preservation finding

The saved game retains the Merger always-available rule and provenance
snapshot (`group_default`, `manual_override`, or the existing stored source),
so later analytics can distinguish enabled, disabled, and unknown. Step 4.1
does not change the protected production migration/backfill gate.

The audit also found a pre-existing validation discrepancy: the current UI
renders three Prelude selection slots and finalization requires at least one
Prelude when the Prelude expansion is enabled. It does not enforce the
separately described “exactly two, with Merger consuming one additional
offer/slot” rule. Because Step 4.1 explicitly forbids changing validation or
finalization semantics, the discrepancy is documented for a later explicitly
authorized Phase 4 step and is not silently corrected here.

## Step 4.1 preservation boundaries

Step 4.1 makes no change to:

- database schema, migrations, RPCs, views, RLS, or Storage policy;
- production Supabase data or assets;
- formulas or analytics readers;
- draft-save, import-save, or finalization persistence ordering;
- score, award, milestone, Prelude, Merger, style, or key-card semantics;
- existing route compatibility; or
- dependencies, deployment, or production state.

No push or deployment is part of this step. Step 4.2 and every later Phase 4
substep require a new explicit assignment.
