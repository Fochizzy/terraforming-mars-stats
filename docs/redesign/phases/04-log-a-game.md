# Phase 4 — Log a Game

## Status

Phase 4 is active. **Step 4.2 — Manual Entry Wizard and Responsive Step
Navigation is complete in the repository.** Later Phase 4 work remains gated
by a separate explicit assignment.

Step 4.1 establishes a shared product entry surface and records the existing
workflow contract. It does not redesign the form, change validation or
persistence semantics, add card-acquisition storage, or begin Step 4.2.

## Step 4.2 scope and outcome

The six manual-entry sections now render as one typed, responsive, accessible
wizard. One registry owns step identity, labels, descriptions, field ownership,
review-issue ownership, ordering, status, and heading focus. The shared shell
shows draft context, save state, progress, active/completed/error text, Back,
Continue, Save Draft, and the existing finalization action without creating a
mobile-only workflow or a second persistence state machine.

During Step 4.2 the user explicitly broadened the assignment to remove gameplay
expansion tracking product-wide. Expansion choices and defaults are no longer
part of group settings, Manual Entry, imported drafts, saved draft snapshots,
game relations, analytics filters, URL state, or interaction analytics. Legacy
draft snapshots parse safely with their former `expansionCodes` key discarded.
Prelude selections remain directly recordable when known but are optional;
absence is no longer interpreted through an expansion switch.

Migration `20260718041532_remove_game_expansion_tracking.sql` removes
`public.expansions`, `public.group_default_expansions`, and
`public.game_expansions`. The interaction views retain only corporation–Prelude
pairings and preserve the production multi-corporation read path. Intrinsic
catalog metadata such as `cards.expansion_code`,
`corporations.expansion_code`, `preludes.expansion_code`, and card-required
expansion codes remains catalog identity and browsing metadata, not a recorded
game configuration.

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

The form records played date, map, player count, generation count, promo sets,
and the saved Merger-offer rule plus its provenance. Defaults come from the
active group's settings and reference repositories.

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
corporations, required score fields, optional
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
  player references, upserts the `games` draft shell and promo associations,
  and appends a `game_revisions` snapshot.
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

The Step 4.1 audit found a pre-existing validation discrepancy: the UI renders
three Prelude selection slots while separately documented language describes an
exact-two/Merger-slot rule. After the user removed gameplay expansion tracking
in Step 4.2, Prelude entry became optional because the product no longer records
whether a game used Prelude. Recorded Prelude identities remain evidence;
missing Prelude rows remain missing rather than being inferred as disabled.

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

<!-- BEGIN PHASE-4-GUEST-IDENTITY-PRIVACY -->

## Updated Phase 4 sequence

Phase 4 uses the following working sequence:

1. Step 4.1 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Workflow Preservation and Unified Entry Foundation
2. Step 4.2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Manual Entry Wizard and Responsive Step Navigation
3. Step 4.3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Import, Validation, Evidence Review, and Claimable Guest Identity
   Creation
4. Step 4.4 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Final Review, Finalization, and Draft Safety
5. Step 4.5 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Phase 4 Integration Validation and Closure

Step 4.2 predates the claimable guest identity clarification.

Do not reopen or recommit Step 4.2 solely to add this later clarification.

## Step 4.3 guest identity scope

When an imported game contains an unmatched player, Step 4.3 must allow the
importer to:

- select an existing linked player
- select an existing unlinked guest
- create a new unlinked guest using username
- create a new unlinked guest using first name and last name
- leave the player unresolved when information is insufficient
- resolve an ambiguous match explicitly

Step 4.3 must:

- preserve the selected player ID
- avoid duplicate guest creation
- preserve original import evidence
- preserve imported provenance
- preserve future registration claimability
- keep username and personal-name matching separate
- keep private claim information separate from public display data
- audit whether the current schema supports the required separation
- stop and request migration authorization when it does not

Step 4.3 must not:

- implement registration-time claiming
- link the guest to the importer
- create an authentication account
- automatically claim a textual match
- overload one field with incompatible username and personal-name semantics
- expose private personal-name claim data publicly
- create or apply a migration without explicit authorization

> **SUPERSEDED IN PLACE for Step 4.3 by owner ruling R-8 (2026-07-23) — the
> prohibition above is retained, not deleted or reworded.** The first item under
> "Step 4.3 must not:" — **"implement registration-time claiming"** — is
> **overridden for Step 4.3** by owner ruling **R-8**: the owner places the
> vouching / claim flow **inside Step 4.3**. **This is a deliberate OVERRIDE**,
> recorded here beside the prohibition it overrides so the two are read together;
> the prohibition remains on the record as the pre-override position. Ruling text
> and reasoning: `docs/redesign/DECISIONS.md` → "owner rulings R-5–R-12" → **R-8**.
> The claim flow itself is the peer-vouching model recorded as **D-22/D-28–D-33**
> in `docs/redesign/DECISIONS.md`. (The recording assignment cited line 356, the
> blank line above the bullet; the prohibition text is at line 357.)
>
> **EXTENDED 2026-07-24 by `CORRECT-PERSONAL-NAME-PHASE-SITES` under owner ruling R-18
> — a SECOND and SEPARATE supersession, recorded inside this same note because this
> document keeps one supersession note. The R-8 override above is UNCHANGED: it is not
> restated, narrowed, widened, or reopened here.** Two items in the lists above are
> superseded, and **both are retained in place, not deleted or reworded**:
>
> - under "Step 4.3 guest identity scope", in the "Step 4.3 must allow the importer to:"
>   list, the item **"create a new unlinked guest using first name and last name"**; and
> - under the same section's "Step 4.3 must:" list, the item **"keep username and
>   personal-name matching separate"**.
>
> Both **give way** to the identity model recorded in `docs/redesign/DECISIONS.md` →
> "Phase 4 Step 4.3 — replacement player-identity, account, and vouching model (decision
> record: D-1–D-49), 2026-07-23" — the first to **D-1**, **D-3**, **D-4** and **D-37**,
> the second to **D-1**, **D-4**, **D-8**, **D-40** and **D-41**. The ruling that removes
> the basis they rested on is `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 — owner
> ruling R-18 on the governing-document conflicts with the identity model, 2026-07-24".
> It clears the first item where it supersedes `docs/redesign/MASTER-RULES.md` → "Guest
> player identity and claimed-name privacy" → **"a guest may be identified using either
> username or first and last name"**, and
> `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` → "Guest identity modes"
> (its framing sentence and the "First-and-last-name mode" subsection), → "Required
> identity lifecycle" **step 2**, and → "Cross-phase ownership" (Phase 4's **"explicit
> username or first-and-last-name identity mode"**). It clears the second where it
> supersedes `docs/redesign/MASTER-RULES.md` → **"username and personal-name matching are
> separate"** and
> `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` → "Username and
> personal-name separation" (the sentence naming the two as separate concepts). **Read
> those decisions where they live; their content is deliberately not restated here**
> (process rule **P-2**, `docs/redesign/MASTER-RULES.md` → "Conflict handling and
> canonical-home process rules").
>
> **NOTHING ELSE IN THIS DOCUMENT IS SUPERSEDED BY THIS NOTE, and the rest of its
> personal-name text STAYS IN FORCE** — "Step 4.3 must:" → "keep private claim
> information separate from public display data"; "Step 4.3 must not:" → "overload one
> field with incompatible username and personal-name semantics" and "expose private
> personal-name claim data publicly"; the whole of "Claimed-player privacy requirement";
> and "Step 4.5 closure requirement" → "private personal-name values are not placed into
> public-facing contracts". R-18 records why those remain load-bearing, at its section
> "What R-18 does NOT reach — the remaining protections STAY IN FORCE". **None of them is
> marked, softened, or made easier to satisfy by this note.**
>
> **Corrected is not buildable.** This note records that the two items above no longer
> govern. It **supplies no replacement instruction**, and supplying one is neither
> performed nor authorized here; that specification gap is recorded as **C-1** in
> `docs/agent-handoffs/ALIGN-PHASES-TO-IDENTITY-MODEL.md`.

## Claimed-player privacy requirement

A future successful claim must preserve the same player ID while causing public
presentation to resolve to the registered username.

The claimed player's first name, last name, full name, normalized personal name,
and private name aliases must not appear on:

- leaderboards
- public profiles
- game history
- game detail
- public statistics
- insights
- comparisons
- search
- metadata
- public APIs
- public RPC responses
- exports
- browser hydration data
- analytics events
- user-visible logs or errors

Private data must be omitted from public payloads.

CSS hiding is not sufficient.


## Step 4.3B ? Automatic Venus Next and Colonies import facts

Repository implementation is complete at commits `aeebf8b7`, `cef2ff1d`,
`41bc1221`, and `e88fc25f`; the production migration and historical backfill are
verified under live ledger entry `20260718200536`.

- The server import path runs `terraforming-mars-venus-colonies-v1` after stable
  player resolution and persists canonical events plus one game-level fact row.
- Exact upstream messages cover Venus increases/decreases, World Government,
  Colony setup/construction/trade/track movement, payment/source details, and
  generation context. Related cards alone do not activate Colonies.
- A complete zero-event exported log records `confirmed_absent` (No), per the
  user's 2026-07-18 clarification. Partial, unsupported, and conflicting logs
  retain their distinct states.
- No manual Venus/Colonies fields, expansion selector, generic `expansionCodes`,
  or restored gameplay-expansion configuration were added.
- Migration `20260718200536_add_venus_colonies_import_facts.sql` adds the RLS-
  protected `game_expansion_facts` table and typed `game_log_events` columns. It
  is applied and production-verified.
- A privacy-sanitized 704-line retained real export is committed as the negative
  integration fixture; the source-backed positive fragment is pinned to upstream
  commit `7a6f98f09ac2a558969c092d317c313806af7b73`.
- The production preflight covered 42/42 games with retained complete logs: 42
  Venus absences, 42 Colonies absences, and zero unexpected, incomplete,
  unsupported, conflicting, duplicate, exception, or unresolved results. The
  authorized backfill inserted 42 facts, created no historical expansion events,
  preserved all fingerprinted unrelated data, and then planned zero writes on its
  second pass. Reports are under `docs/redesign/reports/phase-04-step-03b/`.

Validation: 164 test files / 862 tests pass; `npx tsc --noEmit` passes; lint exits
0 with the four existing warnings; and production build passes at 32/32 pages
with middleware present. Docker Desktop is unavailable, so local migration
execution is unverified; static migration tests pass. The production migration
and 42-row backfill are independently verified. No push or deployment occurred.

Step 4.3B (the Venus/Colonies import facts above) is production-verified, but
**Step 4.3 as a whole remains BLOCKED pending a fresh independent read-only
closure audit; Step 4.4 has not begun.** The independent closure audit
reopened Step 4.3 for the bounded F-01–F-10 remediation
(repository-complete at commits `cfafd823`..`6e6e1859`, production mutations
applied and verified 2026-07-19). The 2026-07-19 continuation session then
integrated the deployed live-site data-capture v2 contract through a versioned
read adapter (`docs/redesign/reference/LIVE-SITE-DATA-CAPTURE-V2-COMPATIBILITY.md`),
split event confidence from review state, wired deterministic source
identity into the import action, added the executable semantic matrix,
labelled synthetic full-export fixtures, negative RPC authorization tests, and
the third immutable reconciliation artifact
(`docs/redesign/reports/phase-04-step-03-compat/`).

A second independent audit returned **BLOCKED**; the 2026-07-20 remediation
pass resolved its findings: private normalized names are out of every client
payload and all guest-creation paths use neutral public labels (F-01/B4/H5);
the redesign-owned placement persistence carries the complete canonical
contract via gated migration `20260720110000` (F-02); gated migration
`20260719234500` is repeat-safe and review state persists end to end
(F-03/H2); the exact original submission is hashed and stored untrimmed and
duplicate sources surface as an explicit reviewable state in the real import
action (H6/H3); client and server share one map gate over identical
off-reserve-ocean exception evidence (F-05/H1); labelled fixtures flow
through the real action into real database assertions in the executable
harness (F-09/H4); the overwritten historical dry run is restored beside a
separate production artifact and reconciliation metrics are per-system and
measured-only (F-08/§16/§17); and the migration↔ledger drift is corrected
and governed (`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`, B3/F-10/§18).
Live-site v2 remains deployed with zero capture rows as of the recorded
verification; the redesign application is not deployed; migrations
`20260719234500`, `20260720100000`, and `20260720110000` are prepared, not
applied; backup-table security remediation is complete; no production
mutation occurred in the remediation. See
`docs/agent-handoffs/PHASE-04-STEP-03-import-validation-evidence-and-claimable-guest-identity.md`.

**[Status observation correction, 2026-07-23 — this corrects only the
observed state recorded in the preceding paragraph. No scope item,
obligation, prohibition, or closure criterion in this document is changed.]**
`20260720100000` is no longer "prepared": it is a **RETIRED no-op tombstone**
retained at its original version as an auditable record, containing no
executable statement, so it cannot be applied and will never enter the
production ledger. `20260719234500` and `20260720110000` are unchanged —
still prepared and still not applied. The redesign application is still not
deployed. Evidence class **[REPO]**. Current disposition:
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md` and
`docs/CURRENT_STATUS.md`.
Step 4.3 is closed only after a fresh independent read-only audit passes. Do not
begin Step 4.4; it requires an explicit assignment. Step 4.4 consumes the
canonical capture model through `readCanonicalGameCapture` rather than
reparsing raw logs.

> **POINTER — added 2026-07-24; the criterion above is UNCHANGED.** This document
> states the Step 4.3 closure **criterion** and states no **scope** for that audit.
> The scope is recorded in `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 — the
> unification shape and the closure-audit scope" → "The Step 4.3 closure-audit scope
> — the principle". **Nothing about that scope is restated here**, and this pointer
> changes no obligation, prohibition, or criterion in this document.

## Step 4.5 closure requirement

Phase 4 closure must verify that:

- imported guests preserve claimable identity data
- player IDs remain stable
- private personal-name values are not placed into public-facing contracts
- public identity can switch to registered username without rewriting historical
  game references
- no unauthorized migration occurred

<!-- END PHASE-4-GUEST-IDENTITY-PRIVACY -->
