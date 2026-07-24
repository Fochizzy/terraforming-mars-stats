# ALIGN-PHASES-TO-IDENTITY-MODEL — sweeping all twenty-one phase documents against the D-1–D-49 identity model; two contradictions corrected, eight gaps reported and none filled

- **Date:** 2026-07-24
- **Branch:** `redesign/tm-stats-dashboard-rebuild` (redesign lineage)
- **Worktree:** the redesign primary,
  `C:\Users\izzyh\Documents\Terraforming Mars Redesign`
  (git-dir `.../Terraforming Mars/.git/worktrees/Terraforming-Mars-Redesign`) — the tree
  the planning-pack updater reads. No worktree was created.
- **Base commit:** `7349c87ea93445e6b8cc70e7a59adb2f7d46c2bf`
  (`RECORD-REGISTRATION-SEARCH-AND-REPUDIATION`), clean at start
  (`git status --porcelain=v1` empty).
- **Category:** documentation-only annotation of phase documents. It is **not** a
  contract reconciliation, **not** an identity or analytics decision, **not** an edit to
  any copy-ready block, **not** code, migration, schema, deploy, or production work.
- **Authorization held:** read-only git and repository inspection; editing
  `docs/redesign/phases/*.md` for class-A corrections outside copy-ready blocks and
  supersession notes before copy-ready blocks, and nothing else; editing
  `docs/REDESIGN_STATE.md` to register this handoff and record the outcome; creating this
  one handoff; exactly one commit made with the Bash tool; reporting the publish receipt.
- **Authorization NOT held, and what did not occur:** **no class-C gap was filled and no
  requirement was added to any phase document**; no edit inside any copy-ready block —
  proven byte-identical below; no class-D site corrected; no phase-versus-**contract**
  conflict touched (Card Acquisition Pace, Phase 07's provisional/visible instruction,
  Phase 13's low-sample qualification, Phase 14's confidence-adjusted win rate, Phase 17's
  single-value point differential, Phase 18's Award Funding ROI — all still awaiting
  analytics Q-1/Q-2/Q-3/Q-7/Q-8); **phases 09 and 11 were NOT edited** on the strength of
  C-2; no decision's content, threshold or value restated; no line-number citation added;
  no edit to `DECISIONS.md`, `CURRENT_STATUS.md`, `MASTER-RULES.md`, or any contract; no
  open question resolved and **the unification design choice (identity Q-2) not made**; no
  reclassification of `MATCHER-MANUAL-ENTRY-REPLACEMENT` and no destination assigned to
  `ID-READER-CONTRACT`; no code, migration, or schema change; no second commit; no push,
  merge, deploy, migration apply, rebase, force-push, or history rewrite. **No production
  read or write of any kind** — no Supabase MCP, no `execute_sql`, no `list_migrations`,
  no `wrangler`, no `/api/deploy-info`, no production SQL, no Cloudflare action. The
  planning-pack updater was **not** run by hand and `sync_installed_updater.py` was
  **not** invoked in any mode.

## Problem — why this existed

The sixteen phase documents for phases 5–20 were generated from the Word implementation
guide and installed 2026-07-23. **They predate the entire identity model**, which was
recorded the same day as D-1–D-33 and extended 2026-07-24 to D-1–D-49 with consequences
C-1–C-8. Phase 04 predates most of it too. Nobody had checked whether any phase document
contradicts it.

`DECISIONS.md` outranks a phase document, so a phase document contradicting a recorded
decision gives way. A phase document **silent** where a decision requires something is a
different thing — a gap, not a contradiction — and filling it would add requirements to
accepted design. This work item corrects the first and only reports the second.

## Standard read before classifying

**D-1 through D-49 and C-1 through C-8 were read in full**, in
`docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 — replacement player-identity, account,
and vouching model (decision record: D-1–D-49), 2026-07-23", across its subsections
"Identity and display", "Search and selection", "Accounts and credentials", "Deletion",
"Scope", "Vouch request lifecycle", "Entry — registration", "Claiming — taking an existing
username", "Groups — membership", "Search and Add — two operations, not one",
"Repudiation — correcting a wrong attribution", "Build constraints that follow from the
decisions", "Consequences recorded explicitly", "Consequences of the registration and
search model", and "Open and deferred". The identity Q-series was read for the
disambiguation qualifier; **no question in either Q-series was answered.**

## Scope of the sweep

**All twenty-one phase documents** in `docs/redesign/phases/` were swept, phases 00–20
plus `PACK-05-20-README.md` and `PACK-05-20-VERIFICATION.md`, **including phase 04**.
Nine term families were searched by text: identification/naming/display/labelling;
adding, searching for, or selecting a player; registration, login, accounts, credentials
and PINs; claiming, guests, unlinked profiles and profile ownership; group membership,
joining and invitations; personal names, real names, aliases and display names; account
deletion, pseudonyms and profile removal; participation slots and a player's presence in
a game; and anything requiring authentication to view.

**A copy-ready heading variant was found that the obvious search misses.** Phase 06 uses
`## Copy-ready phase prompt`, not `## Copy-ready agent execution prompt`. **There are
sixteen copy-ready blocks, not fifteen**, and the sixteenth is the identity-critical one.
Every block was swept for identity content; **only phase 06's carries any.**

## Class counts

| Class | Meaning | Count |
| --- | --- | --- |
| **A** | Contradicts a recorded decision — corrected | **2** |
| **B** | Consistent — left, reported | **15 families** (the four recurring privacy-contract lines alone account for **64 occurrences** across 10 documents) |
| **C** | Gap — the model requires what the phase is silent about — **reported only, none filled** | **8** |
| **D** | Unclear — reported, corrected nothing | **4 families** (30 occurrences) |

## Class A — the two contradictions, both in `06-my-profile.md`

Both are the **same defect**: the claim completes on the registrant's own confirmation,
with no approval from outside the registration session.

**A-1 — "Required claim lifecycle", steps 4–6.** Step 4 makes the registrant's explicit
confirmation the operative decision ("A textual match is only a candidate. The registrant
explicitly confirms one candidate or declines all candidates."); step 5 revalidates at
submission time; step 6 then links the existing player ID to the authenticated account.
The ordered sequence asserts that confirmation plus revalidation completes the claim.
**D-22, D-28–D-33, D-36 and D-38 make that false.**

**A-2 — the copy-ready block's third paragraph**, which instructs an executing session to
"Require explicit confirmation and server-side revalidation. Link the existing player ID".
Same contradiction, in the place most likely to be executed: a session handed a Phase 6
assignment pastes the prompt.

**Why this is a contradiction and not a gap.** The lifecycle is presented as a complete
ordered path from registration to public-presentation switch, with its own failure
enumeration at step 7. A complete path whose steps 5→6 run straight through asserts there
is no gate between them. The determination **does not depend on the unresolved
personal-name question**: it stands on the username axis alone, because under D-36 a
username already held by any profile triggers the vouching flow regardless of how
candidates are matched.

**The document was already internally inconsistent.** Its "Additive scope — 2026-07-23
identity design decision (D-24)" section already cites **D-22** for reclaim, while the
lifecycle gated the first claim differently.

### Disposition

| Site | Where the note went | Shape |
| --- | --- | --- |
| A-1 | Immediately **after** the `## Required claim lifecycle` heading, **before** the numbered list | Blockquote, matching this file's existing in-place supersession convention (as phase 04's R-8 note) |
| A-2 | Immediately **after** the `## Copy-ready phase prompt` heading, **before** the block's first line | Plain non-quoted text, matching the convention `SUPERSEDE-COPY-READY-PROMPTS` established |

Both notes **point and do not restate**: they name D-22, D-28–D-33, D-36 and D-38 by
identifier and name the `DECISIONS.md` section and subsections the entries live in. **No
decision's content, mechanic, threshold or value was copied into the phase document**
(process rule P-2) — proven zero below.

**Phase 06 carried no prior copy-ready supersession note**, so A-2's note was **added, not
extended**. The four documents that do carry one — 09, 12, 18, 20 — have **no identity
content in their blocks** and were **not touched**; nothing needed extending anywhere.
Phase 06 now carries two notes because they serve two different sites under two different
mechanisms (an editable surface, and an unedittable carried block); this is not a second
note against one block.

## Class B — consistent, left alone

| # | Family | Where | Consistent with |
| --- | --- | --- | --- |
| B-1 | The four recurring public-name privacy lines — centralized resolver for every public label (19×), never fall back to a personal name/email/auth ID (10×), exclude private values from payloads rather than hiding after serialization (17×), known-test-name payload scans with neutral fallback (18×) | 05, 06, 07, 08, 09, 10, 11, 15, 18, 20 | D-1, D-2, D-4, D-13 |
| B-2 | "Claimed-player privacy requirement" — claim preserves the player ID; private names absent from the enumerated public surfaces; CSS hiding insufficient | 04 | D-1, D-2, D-13, D-15 |
| B-3 | "Step 4.5 closure requirement" — stable player IDs, public identity switches to username without rewriting historical references | 04 | D-15 |
| B-4 | "Step 4.3 guest identity scope" — create a guest **using username**; preserve the selected player ID; preserve future registration claimability; must not automatically claim a textual match; must not create an authentication account | 04 | D-15, D-33, D-37 (direction) |
| B-5 | "Display names are not identity"; "no display name is used as canonical identity"; joins use stable IDs, never parsed display labels | 02 | D-1, D-2, D-15 |
| B-6 | Route table — every `(app)` route Authenticated; `/glossary` authenticated without group | 03 | The model generally; D-19's finer PIN gate is reported as gap C-5 |
| B-7 | "The three rules" — label from the authoritative roster, not the frozen snapshot; never render an unresolved uuid-shaped entry as itself; resolve to an explicit unknown-player label | 05 | Same shape as D-49's unavailable-not-absent treatment, applied to labels |
| B-8 | "Centralized resolution already available" — `resolvePublicPlayerName` falls back to `PUBLIC_PLAYER_FALLBACK`; ids resolve through `get_public_player_names`, gated on `can_read_player`/`is_group_member` | 05 | D-2, D-13; the `is_group_member` gate is the precondition C-5 says R-12 rests on |
| B-9 | "Additive scope — D-24" — profile screen with reset PIN, change email, delete account; D-27, D-20/D-21/D-22/D-26, D-16–D-18 recorded as context | 06 | It **is** the model, already recorded |
| B-10 | Acceptance checklist — "Registration presents candidates but never auto-claims"; "Successful claim preserves the original player ID and all historical relationships" | 06 | D-33, D-15 |
| B-11 | Player selection/search as **analytics subject** selection, synchronized across rankings and panels | 07, 09, 10, 11 | Not the game-entry surface; nothing the model contradicts |
| B-12 | Step 20.10 identity-privacy validation — repository scan for `full_name`/`first_name`/`last_name`/`display_name`/private aliases; known-test-name inspection; resolver verification; historical games retain the same player ID | 20 | D-1, D-2, D-13, D-15 |
| B-13 | "Public-name privacy standard" — private-field enumeration, explicit column selection and public DTOs, no CSS hiding, neutral fallback | 06 | D-13 |
| B-14 | "Authentication, group context, and authorization" — loaders require authenticated current-group context; server actions re-resolve user and active group; membership rechecked before any write | 04 | The model generally |
| B-15 | Group Insights Members view, member rows, rankings and pairings | 10 | Displays members; says nothing about how membership arises (that silence is gap C-7) |

## Class C — gaps. **REPORTED ONLY. NONE FILLED.**

Each names the phase that **plainly** owns the surface and the decisions that imply it.
**No fill is proposed, designed, or recommended**, and naming an owning phase is not an
assignment.

**C-1 — the search and add operations.** Phase **04** owns entering a player into a game;
its "Existing Manual Entry contract" → "Players & Corporations" says only that the form
"selects or creates player references, … resolved on the server before save or
finalization". It is silent on the entire split: **D-40** (search is group-scoped,
membership-gated substring discovery returning a selectable list), **D-41** (add is exact
username, resolved globally, one profile or nothing), **D-42** (add must not fall back to
search), **D-43** (add must not require membership), and **D-8–D-14** (matching, minimum
query length, co-play ordering, the undisplayed count, the alias server boundary, the
empty-result offer). **C-6** records that the split is what closes cross-group disclosure,
so the silence is load-bearing. Identity **Q-3** separately asks whether group-scoped
structured search satisfies `MATCHER-MANUAL-ENTRY-REPLACEMENT`; **that item is not
reclassified here.**

**C-2 — the repudiation path.** **The word does not appear in any phase document** —
`grep -ci "repudiat"` over `docs/redesign/phases/*.md` returns zero across all
twenty-one files. **C-8** places the dependency in two phases: **Phase 05** owns game
detail and replay, where a slot is displayed and repudiated; **Phase 07** owns the ratings
an unresolved slot affects. **D-46** ("the logger re-picks") additionally reaches back into
**Phase 04**'s logging surface. Implied by **D-44–D-49**. **C-7** records that repudiation
and the search design are counterparts rather than independent features, so this gap is
not optional polish.

**C-3 — an unresolved participation slot as an unavailable state, not a reduced field.**
Phase 04 already permits "leave the player unresolved when information is insufficient",
so the state is **created** today with nothing specifying its treatment. **D-49** requires
the metrics contract to treat it as unavailable and never silently reduce the field size.
Owning phases: **02** (the analytics foundation, which owns coverage and unavailable
states), **05** (display), **07** (ratings, per C-8). Phase 05's three rules address an
unresolved **label**, which is a different object from an unresolved **participant**.

**C-4 — registration, claiming, and the vouching flow as user-facing surfaces.** Phase
**06** owns the claim surface and, after this work item's A-1 correction, defers on the
completion path — but no phase document specifies any of the surfaces the lifecycle needs:
raising a vouch request, a participant approving one, the pending state, owner escalation,
expiry, or re-raise. Implied by **D-22**, **D-28–D-33**, **D-34–D-38**. Owner ruling
**R-8** additionally places the vouching/claim flow **inside Step 4.3**, so **Phase 04**
holds part of this surface too.

**C-5 — PIN gating. REPORTED; PHASES 09 AND 11 WERE NOT EDITED.** **D-19** puts viewing
another member's profile and comparing yourself with other players behind the PIN.
**C-2 (consequence)** records that this reaches **Phase 09** and **Phase 11**, that both
documents were installed 2026-07-23, and that neither states an authentication
requirement — and that the consequence was **recorded, not acted on**, with those two
files explicitly not edited on its strength. That disposition is preserved here
unchanged. Route-level authentication (phase 03) is a coarser gate and does not satisfy
D-19. **D-27**'s PIN re-entry for account deletion and email change is already recorded
in phase 06 and is **not** part of this gap.

**C-6 — account deletion, the assigned pseudonym, and the released username.** Phase
**06** records **D-20/D-21/D-22/D-26** as context in its additive section, but no phase
document specifies the surfaces: disclosing the pseudonym at the moment of deletion,
displaying it on historical games, or releasing the former username for someone else to
register. Implied by **D-20**, **D-21**, **D-23**, **D-26**. Owning phases: **06** (the
account controls) and every surface that displays historical player labels — **05**,
**07**, **08**–**11**.

**C-7 — group membership by shared logged game.** No phase document states how membership
arises. **D-39** makes it retrospective from a shared logged game (add → game →
membership, never membership first) and **D-35** removes any invitation step. Owning
phase: **04**, because logging the game is what creates the membership; **10** and the
`/group/players` destination display it. The **unilateral group join** residual recorded
open in `DECISIONS.md` attaches to this surface.

**C-8 — the shared username namespace.** No phase document states that usernames are
unique across all profiles, guest and registered alike. **D-37** requires it as the
precondition **D-36** depends on, and **C-3/C-4 (consequences)** record that
`is_username_available` must become fail-closed and span all profiles, and that the shared
namespace **presupposes the unmade unification design choice**. Owning phases: **06**
(registration eligibility) and **04** (guest creation). **Identity Q-2 is not resolved
here and no unification option is recommended.**

## Class D — unclear. Reported, corrected nothing.

**D-1 — personal-name capture and matching (18 sites across 04, 06, 20).** Phase 06
requires "personal-name registration data", candidate search "by normalized first name
plus last name", an "exact private-name candidate" test, and step 6.2's "Protected
candidate search by username and private personal name"; phase 04 permits creating a guest
"using first name and last name" and requires username and personal-name matching be kept
separate. **D-1** says no real names are stored or displayed, which would make these
false. **Why it could not be resolved:** the same decision record states that it changes
the governing contract `GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`, that amending the contract
is a **separate owner act**, and that **where the model and the contract interact the
contract remains authoritative for semantic meaning until the owner amends it**.
`MASTER-RULES.md` → "Guest player identity and claimed-name privacy" independently carries
"a guest may be identified using either username or first and last name" and "username and
personal-name matching are separate" among its **non-negotiable** rules, and this work item
may not edit `MASTER-RULES.md`. Correcting the phase sites would resolve a
decision-versus-contract conflict by proxy, which **process rule P-1** says a worker
surfaces and resolves in neither direction. **Surfaced as an owner question.** The A-1 and
A-2 notes both state explicitly that this point is not decided.

**D-2 — "or an approved public handle" (12 sites across 05, 06, 07, 08, 09, 10, 11).**
**D-2 (decision)** says only usernames are ever displayed. **Why it could not be
resolved:** the phrase is defined in neither the phase documents nor the decisions, and
the model itself displays a non-username identity on historical games after deletion
(**D-21**/**D-23**), so a second approved display identity is not obviously forbidden.
Deciding whether a "handle" is a username or a distinct object requires interpreting the
decision for a surface it does not name.

**D-3 — phase 06's claim transaction "adds or preserves group membership".** **D-39**
makes membership follow from a shared logged game and forbids membership first. **Why it
could not be resolved:** "adds" may mean materializing membership the profile's existing
games already imply — which D-39 permits — or granting membership as a side-effect of the
claim, which it does not. The text does not distinguish them.

**D-4 — phase 06's candidate-disclosure boundary.** "Claim candidate enumeration is
unavailable to unauthenticated or unrelated users", and step 3's "only the minimum
candidate information needed". **Why it could not be resolved:** **D-40** gates discovery
on group membership while **D-41** permits global exact-username resolution *without*
membership, so whether "unrelated users" maps to the membership gate depends on whether
candidate lookup is the SEARCH operation or the ADD operation — a mapping neither document
makes.

## Evidence

- **[REPO]** Base commit `7349c87ea93445e6b8cc70e7a59adb2f7d46c2bf`, verified with
  `git rev-parse --verify -q 7349c87ea93445e6b8cc70e7a59adb2f7d46c2bf^{commit}`; clean
  tree at start.
- **[PROJECT-DOC]** `docs/redesign/DECISIONS.md`, the D-1–D-49 / C-1–C-8 record, read in
  full before any classification.
- **[PROJECT-DOC]** `docs/redesign/MASTER-RULES.md` → "Conflict handling and canonical-home
  process rules" (P-1, P-2) and "Guest player identity and claimed-name privacy".
- **[REPO]** Copy-ready block body of `06-my-profile.md` **byte-identical** across the
  change: `sha256` of the block's `>` lines is
  `fe8ef27702d752a6bab7f72252fbddd365285707fc20d2b3e96ad661f653e2f4` from both
  `git show HEAD:<path>` and the working tree.
- **[REPO]** The numbered "Required claim lifecycle" list is **byte-identical** too:
  `fe36dd4717ed94e30515ff78fa9b9223fc4870c0a414a8e986bc72f811759f68` from both. The A-1
  note supersedes **beside** the list without rewording a step.
- **[REPO]** `git diff --numstat` on `docs/redesign/phases/` reports `50  0` — **fifty
  lines added, zero deleted**, one file.
- **[REPO]** **Zero line-number citations added**: `grep -cE '\.md:[0-9]|:[0-9]+-[0-9]+|[Ll]ines? [0-9]+'`
  over the fifty added lines returns `0`.
- **[REPO]** **Zero restated decision content**: a grep over the fifty added lines for
  every mechanic and value in the cited decisions — participant fan-out, approver
  language, the escalation and expiry periods, auto-approval, PIN length, attempt count,
  backoff, query length, the games floor, transition scope, co-play, substring, pseudonym,
  exact username, unused username, shared logged game, unvouched, email detachment,
  namespace, minimum — returns `0`.
- **[REPO]** **Repudiation absent from every phase document**: `grep -ci "repudiat"` over
  `docs/redesign/phases/*.md` matches nothing in any of the twenty-one files.
- **[REPO]** Sixteen copy-ready blocks exist, not fifteen; phase 06's heading is
  `## Copy-ready phase prompt`. Only phase 06's block carries identity content.

## Validation

`npm.cmd run validate:claude-context -- --require-maintenance` — result recorded in the
task report. No test, build, lint, or type-check is applicable: no `src/**` file, test,
schema, or migration was touched.

## What this authorizes

**Nothing.** No phase begins, no substep is assigned, no gap is approved for filling, no
question in either Q-series is answered, and the unification design choice remains unmade.
The eight class-C gaps are the owner's to dispose of; the four class-D families are
surfaced as owner questions under process rule P-1.

## Next action

Owner disposition of the eight class-C gaps and the four class-D families. The
decision-versus-contract conflict at D-1 (phase personal-name sites against the unamended
`GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` and the `MASTER-RULES.md` non-negotiable list) is
the one most likely to block Phase 6 scoping, because it and the unmade unification choice
(identity Q-2, which C-4 gives three dependents) sit under the same surface.
