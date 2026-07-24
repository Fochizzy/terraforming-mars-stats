# CORRECT-PERSONAL-NAME-PHASE-SITES — correcting the phase-document personal-name sites that owner ruling R-18 cleared; eleven superseded in place, seventy-five protections left untouched

- **Date:** 2026-07-24
- **Branch:** `redesign/tm-stats-dashboard-rebuild` (redesign lineage)
- **Worktree:** the redesign primary,
  `C:\Users\izzyh\Documents\Terraforming Mars Redesign`
  (git-dir `.../Terraforming Mars/.git/worktrees/Terraforming-Mars-Redesign`) — the tree
  the planning-pack updater reads. No worktree was created.
- **Base commit:** `205e073f53b60013047fd82f8b766d679cf943f0`
  (`CORRECT-GOVERNING-DOCUMENTS-TO-IDENTITY-MODEL`), clean at start
  (`git status --porcelain=v1` empty), remote
  `https://github.com/Fochizzy/terraforming-mars-stats.git`.
- **Category:** documentation-only annotation of phase documents. It is **not** a
  contract or governing-document edit, **not** an identity, analytics or design decision,
  **not** an edit inside any copy-ready block, **not** a gap fill, and **not** code,
  migration, schema, deploy, or production work.
- **Authorization held:** read-only git and repository inspection; editing
  `docs/redesign/phases/*.md` for class-A corrections outside copy-ready blocks,
  supersession notes before copy-ready blocks, and one per-document supersession note;
  editing `docs/REDESIGN_STATE.md` to register this handoff and record the outcome;
  creating this one handoff; exactly one commit made with the Bash tool; reporting the
  publish receipt and the pinned-commit line.
- **Authorization NOT held, and what did not occur:** **no class-F or class-U site was
  corrected** — proven by a diff with **zero deleted lines**; no site corrected without a
  nameable R-18 basis; no edit inside any copy-ready block — proven byte-identical below;
  none of the three blocked families touched (the "or an approved public handle" question,
  phase 06's "adds or preserves group membership", phase 06's candidate-disclosure
  boundary); no class-C gap filled and **no requirement added to any phase document**; no
  phase-versus-**contract** conflict touched (analytics Q-1/Q-2/Q-3/Q-7/Q-8 still open);
  **phases 09 and 11 not edited** on the strength of C-2 (PIN gating); no decision's
  content, mechanic, threshold or value restated; no line-number citation added; no edit
  to `DECISIONS.md`, `MASTER-RULES.md`,
  `GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`, `CURRENT_STATUS.md`,
  `AUTHORITATIVE_DOCUMENTS.md` or any contract; the **D-2-versus-D-21** question not
  resolved, no class-U site resolved, no analytics question answered; the **name-removal
  migration** neither designed, authorized nor begun; no code, schema, or migration; no
  second commit; no push, merge, deploy, migration apply, rebase, force-push, or history
  rewrite. **No production read or write of any kind** — no Supabase MCP, no
  `execute_sql`, no `list_migrations`, no `wrangler`, no `/api/deploy-info`, no production
  SQL, no Cloudflare action. The planning-pack updater was **not** run by hand and
  `sync_installed_updater.py` was **not** invoked in any mode.

## Problem — why this existed

`ALIGN-PHASES-TO-IDENTITY-MODEL` found phase-document sites on personal-name capture and
matching that it could correct in **neither** direction under process rule **P-1**,
because two governing documents still required what the identity model forbids. Owner
ruling **R-18** (commit `205e073f5`) superseded **fourteen named requirements** across
`docs/redesign/MASTER-RULES.md` and
`docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`, removing the basis those
sites rested on.

**R-18 did not blanket-supersede either document.** It classified **110** requirements as
still in force and left them byte-unchanged, because personal names remain in the
database until an unwritten, unauthorized migration runs; **six** more it could not
classify. A phase site is therefore correctable **only** if the requirement it rests on is
one of the fourteen. That test, not the topic, decides each site.

## Standard read before classifying

**R-18 was read in full — both halves.** `docs/redesign/DECISIONS.md` → "Phase 4 Step
4.3 — owner ruling R-18 on the governing-document conflicts with the identity model,
2026-07-24", across its subsections "R-18 — where the identity model and the two governing
documents conflict, the identity model governs" (the fourteen named requirements), **"What
R-18 does NOT reach — the remaining protections STAY IN FORCE"**, "What this ruling does
and does not unblock", and "Structural observation". Also read in full: the identity model
`D-1–D-49` with `C-1–C-8`; both governing documents in their post-R-18 state, so that each
superseded requirement was read **at its own supersession note** rather than from R-18's
summary; and `ALIGN-PHASES-TO-IDENTITY-MODEL` for the eighteen-site claim. **No question in
either Q-series was answered.**

### The fourteen, enumerated as R-18 names them

Two in `docs/redesign/MASTER-RULES.md` → "Guest player identity and claimed-name privacy":
"a guest may be identified using either username or first and last name"; "username and
personal-name matching are separate". Twelve in
`docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`: "Required identity
lifecycle" steps **2** and **6**; "Guest identity modes" framing sentence and the
"First-and-last-name mode" subsection; "Username and personal-name separation" separateness
sentence; "Registration-time candidate lookup" search-by-registered-name requirement and
"one exact private-name candidate" return shape; "Cross-phase ownership" Phase 4 identity-mode
entry and registration name-collection entry; "Required tests" two "entered with first and
last name" guest-creation tests and the "exact private-name candidate" claim test.

## Scope of the sweep

**All twenty-one phase documents** in `docs/redesign/phases/` were swept — phases 00–20
plus `PACK-05-20-README.md` and `PACK-05-20-VERIFICATION.md` — for personal-name capture
and matching: first name, last name, full name, personal name, name matching, name-based
identification, private name values, and any instruction to collect, store, compare or
resolve on a real name. Two independent passes were run: a noun-family pass, and a
verb-family pass (`collect|captur|stor|compar|resolv|identif|search|match|enter|suppl|provid`
adjacent to a name term, in both orders) plus a `registration name` / `display name as
identity` / `name field` / `name value` pass. **The second pass surfaced no site the first
had missed.**

Ten of the twenty-one documents carry **no** personal-name text at all: 00, 01, 03, 12, 13,
14, 16, 17, 19, and both PACK files. Phase 02's "Display names are not identity" and "no
display name is used as canonical identity" are the model's own position, not a
personal-name site. Phase 13's "personal signals" is card analytics.

**Sixteen copy-ready blocks were found across both heading variants** — fifteen under
`## Copy-ready agent execution prompt` and **one** under `## Copy-ready phase prompt`
(phase 06), which is the only one carrying identity content. Recorded additionally, because
it defeats a `>`-based extractor: **phase 07's block is plain text, not blockquoted**;
fifteen of the sixteen are blockquoted.

## Class counts

**Eighty-seven personal-name requirement sites** across eleven documents (a further five
lines are pre-existing `ALIGN-PHASES-TO-IDENTITY-MODEL` supersession-note text, counted
separately and not sites).

| Class | Meaning | Count |
| --- | --- | --- |
| **A** | Rests on a requirement R-18 superseded — corrected | **11** |
| **F** | Rests on a requirement R-18 left in force — left exactly as written | **75** |
| **U** | Class-U basis, or the governing requirement cannot be named — corrected nothing | **1** |

Per document: **04** 9 sites (A=2, F=7); **05** 5 (F=5); **06** 37 (A=9, F=27, U=1);
**07** 3 (F=3); **08** 4 (F=4); **09** 6 (F=6); **10** 4 (F=4); **11** 4 (F=4);
**15** 2 (F=2); **18** 1 (F=1); **20** 12 (F=12).

### The total against eighteen

`ALIGN-PHASES-TO-IDENTITY-MODEL` reported **eighteen** sites in its class-D-1 family,
"personal-name capture and matching (18 sites across 04, 06, 20)". The comparable subfamily
in this sweep — sites that instruct capture, matching or the private use of a personal
name, as distinct from sites that forbid one on a public surface — is **fifteen**, and it
lies in **04 and 06 only**.

**Two differences are recorded rather than reconciled.**

1. **Nothing in phase 20 is a capture-or-matching site.** All twelve of its personal-name
   sites are privacy validation — repository scans for private name fields, known-test-name
   payload inspection, and the "no pre-claim private personal name remains public"
   verification. Every one rests on a requirement R-18 left in force, and R-18 names the
   contract's "Public privacy" tests as explicitly outside its reach. That reading agrees
   with `ALIGN-PHASES-TO-IDENTITY-MODEL`'s **own class B-12**, which recorded the same
   phase-20 content as *consistent*. Which phase-20 text its class D-1 counted could not be
   reconstructed from what it recorded, and **this work item does not resolve the
   discrepancy** — it reports it. Nothing turns on it: had those sites been in the
   capture-and-matching family, they would still classify **F**.
2. **Four of the fifteen are not class A.** Three rest on requirements R-18 left in force
   and one cannot be attributed; all four are listed below and none was touched.

The larger total (87 against 18) is not a disagreement: this sweep counted the **whole**
personal-name surface, including the protection sites `ALIGN-PHASES-TO-IDENTITY-MODEL`
counted separately as class B-1 and B-12.

## Class A — the eleven corrected sites

Each names the R-18 site that cleared it. Where several R-18 sites cover one phase site,
the decisions cited are those **common to all of them**, so no decision is attributed to a
site R-18 does not place it at.

### `04-log-a-game.md` — 2 sites

| # | Section and original text — **retained unchanged** | R-18 site(s) relied on | Decisions |
| --- | --- | --- | --- |
| A-1 | "Step 4.3 guest identity scope" → "Step 4.3 must allow the importer to:" → **"create a new unlinked guest using first name and last name"** | `MASTER-RULES.md` "a guest may be identified using either username or first and last name"; contract "Guest identity modes" (framing sentence + "First-and-last-name mode"); contract "Required identity lifecycle" step 2; contract "Cross-phase ownership" (Phase 4's "explicit username or first-and-last-name identity mode") | D-1, D-3, D-4, D-37 |
| A-2 | Same section → "Step 4.3 must:" → **"keep username and personal-name matching separate"** | `MASTER-RULES.md` "username and personal-name matching are separate"; contract "Username and personal-name separation" (the separateness sentence) | D-1, D-4, D-8, D-40, D-41 |

### `06-my-profile.md` — 9 sites

| # | Section and original text — **retained unchanged** | R-18 site(s) relied on | Decisions |
| --- | --- | --- | --- |
| A-3 | "Required claim lifecycle" step 1 — **"The registrant supplies the approved username and personal-name registration data."** | Contract "Cross-phase ownership" (registration's "first-name and last-name collection"); `MASTER-RULES.md` "a guest may be identified using either username or first and last name" | D-1, D-3, D-4, D-37 |
| A-4 | "Required claim lifecycle" step 2 — **"The server searches eligible unlinked guest identities by normalized username and by normalized first name plus last name using separate matching rules."** | Contract "Required identity lifecycle" step 6; contract "Registration-time candidate lookup" (search using the registered first and last name); `MASTER-RULES.md` "username and personal-name matching are separate" for the "separate matching rules" clause | D-1, D-3, D-4, D-36, D-37, D-41 |
| A-5 | "Required tests" — the **"exact private-name candidate"** item only | Contract "Registration-time candidate lookup" ("one exact private-name candidate" return shape); contract "Required tests" ("exact private-name candidate" claim test) | D-1, D-3, D-4, D-36, D-37 |
| A-6 | "Expanded working sequence" → row "6.2 - Registration candidate lookup and confirmation" — **"Protected candidate search by username and private personal name"** | Contract "Required identity lifecycle" step 6; contract "Registration-time candidate lookup" | D-1, D-3, D-4, D-36, D-37, D-41 |
| A-7 | "Phase 6 working sequence" → same row, same instruction | Same as A-6 | Same as A-6 |
| A-8 | "Step 6.2 — Registration candidate lookup and confirmation" → "Source-defined scope" → same instruction | Same as A-6 | Same as A-6 |
| A-9 | Step 6.2 → "Stage C — Implement the source step" → checklist item, same instruction | Same as A-6 | Same as A-6 |
| A-10 | Step 6.2 → "Step completion gate" → checklist item, same instruction | Same as A-6 | Same as A-6 |
| A-11 | **"Copy-ready phase prompt"** block, third paragraph — **"Search candidates by registered username and private first-plus-last name using separate normalized rules."** | Same as A-4 | D-1, D-3, D-4, D-36, D-37, D-41 |

**The distinction that decided A-4 and A-6–A-11.** The contract's "Claim candidate privacy"
section — *"Registration-time claim matching may privately use: registered username, first
name, last name, normalized private personal name, approved private aliases"* — is **not**
among the fourteen and **stays in force**. It is a **permission scoped to privacy**, not a
mandate to match. What R-18 superseded is the separate **requirement** that registration
*must* search using the registered first and last name ("Registration-time candidate
lookup") and lifecycle step 6. The phase sites above are mandates ("The server searches…",
"Protected candidate search…"), so they rest on the superseded requirement, not on the
surviving permission. Recorded because the two are easy to conflate, and conflating them in
the other direction would have wrongly corrected a live protection.

### Disposition

| Site | Where the note went | Shape |
| --- | --- | --- |
| A-1, A-2 | **Extended** the document's existing R-8 supersession blockquote, which already sits immediately after both lists it now also covers | Blockquote, matching this document's convention |
| A-3 – A-10 | **Extended** the "Required claim lifecycle" blockquote note that `ALIGN-PHASES-TO-IDENTITY-MODEL` added | Blockquote, one note for all eight editable-surface sites |
| A-11 | **Extended** the note before `## Copy-ready phase prompt` that `ALIGN-PHASES-TO-IDENTITY-MODEL` added | Plain non-quoted text, matching the convention `SUPERSEDE-COPY-READY-PROMPTS` established |

**Every note extended an existing one; none was added.** Both documents already carried a
supersession note, so the "one supersession note per document" convention was satisfied by
extension. Phase 06's two notes remain two because they serve two mechanisms — an editable
surface and an uneditable carried block — which is the structure
`ALIGN-PHASES-TO-IDENTITY-MODEL` recorded as deliberate.

**The paragraphs whose basis R-18 removed were not reworded.** Phase 06's "Steps 1 and 2 are
NOT corrected here" and its copy-ready counterpart "Also carried in the same paragraph, and
NOT ruled here" are **retained verbatim**; the extensions state that the basis those
paragraphs named has since been removed. Superseding a prior record by rewriting it would
destroy the evidence of why the conflict existed.

**All notes point and do not restate.** They name each decision by identifier and name the
`DECISIONS.md` section and subsections the entries live in. **No decision's content,
mechanic, threshold or value was copied into a phase document** (process rule P-2) — proven
zero below.

## Class F — seventy-five sites, preserved. **This is half the deliverable.**

R-18 preserved 110 protections because the identity model changes what is **stored going
forward** and does not erase what is **already stored**. A phase site implementing one of
those is **correct, not stale**. None was marked, annotated, softened, or described as
easier to satisfy; the diff proves none was edited.

| Family | Where | Count | Requirement it rests on — **in force** |
| --- | --- | --- | --- |
| F-1 | The four recurring privacy lines: centralized resolver for every public label; never fall back to a personal name/email/auth ID; exclude private values from payloads rather than hiding after serialization; known-test-name payload scans with neutral fallback | 05, 06, 07, 08, 09, 10, 11, 15, 18, 20 | Contract "Claimed-player public name rule", "Public surfaces", "Public player-name resolver", "Data-boundary requirements" |
| F-2 | `04` "Claimed-player privacy requirement" in full — the enumerated public surfaces, "Private data must be omitted from public payloads", "CSS hiding is not sufficient" | 04 | Contract "Public surfaces" |
| F-3 | `04` "Step 4.3 must:" → "keep private claim information separate from public display data"; "Step 4.3 must not:" → "expose private personal-name claim data publicly" | 04 | Contract "Data-boundary requirements", "Security requirements" |
| F-4 | `04` "Step 4.3 must not:" → **"overload one field with incompatible username and personal-name semantics"** | 04 | Contract **"Data-model governance"** → "Do not assume one display-name field can safely serve both private personal-name matching and public player presentation" |
| F-5 | `04` "Step 4.5 closure requirement" → "private personal-name values are not placed into public-facing contracts" | 04 | Contract "Data-boundary requirements" |
| F-6 | `04` the 2026-07-20 remediation status observation, "private normalized names are out of every client payload" | 04 | Historical status record, not a requirement |
| F-7 | `06` "Public-name privacy standard" in full — the private-field enumeration, explicit column selection and public DTOs, no CSS hiding, neutral fallback, and the "Private names are used only inside authorized registration, matching, correction, and audit boundaries" boundary | 06 | Contract "Claimed-player public name rule", "Claim candidate privacy", "Data-boundary requirements" |
| F-8 | `06` "Prerequisites" → the current full-name behaviour audit | 06 | Contract "Data-model governance" |
| F-9 | `06` "Required tests" → known-test-name absence; missing username never exposes a private name | 06 | Contract "Required tests" → "Public privacy", which R-18 names as outside its reach |
| F-10 | `06` "Acceptance checklist" → private names absent from public and client contracts; missing username never falls back | 06 | Contract "Claimed-player public name rule", "Public surfaces" |
| F-11 | `06` copy-ready block, fourth paragraph — private names and aliases absent from public/client payloads | 06 | Same as F-1; recorded in the block's note as **not** superseded |
| F-12 | `20` Step 20.10 in all three of its occurrences — repository scan for private name fields, known-test-name inspection, "no pre-claim private personal name remains public"; and the "private-name leakage audit" handoff pattern | 20 | Contract "Required tests" → "Public privacy"; "Data-boundary requirements"; "Historical-game privacy" |
| F-13 | `05`, `08`, `09`, `10`, `11` source-contract rows — "Keep original import evidence and private claim-matching data behind authenticated and authorized boundaries" | 05, 08, 09, 10, 11 | Contract "Import evidence", "Historical-game privacy" |

**F-4 is the one worth naming individually.** It sits closest to the line: its wording
echoes the contract's "A single unlabeled value must not ambiguously mean either username
or personal name", which falls inside the "Guest identity modes" section R-18 superseded in
part — and whether that sentence lies inside the "First-and-last-name mode" subsection R-18
superseded *in its entirety* is a structural question R-18 does not settle. It was
classified **F** because an independent, unambiguously-in-force requirement supports it
("Data-model governance"), and because correcting it would remove a protection over field
overloading while personal names are still stored. When in doubt, F.

## Class U — one site, corrected nothing

**U-1 — `06-my-profile.md` → "My Profile scope" → "Show registered username as the public
identity and private personal-name fields only in clearly private account-edit contexts
when product requirements permit."** No requirement in either governing document says this;
it is phase-local text, and **no R-18 site can be named for it**. It is also not a
protection, so it is not class F. Reported and left exactly as written.

## What this work item deliberately did not touch

The three families `ALIGN-PHASES-TO-IDENTITY-MODEL` left blocked were re-surfaced by this
sweep and **none was touched**:

- **"or an approved public handle"** — present at 05, 06, 07, 08, 09, 10, 11. The
  **D-2-versus-D-21** question, unresolved, and R-18 explicitly did not resolve it (its
  class-U sites 4 and 5).
- **Phase 06's claim transaction "adds or preserves group membership"** — R-18's class-U
  site 3.
- **Phase 06's candidate-disclosure boundary** — the SEARCH-versus-ADD mapping neither
  document makes.

The phase 06 extension states explicitly that the second and third remain untouched, so a
reader of the note does not infer that the whole section was disposed of.

Also untouched: the eight class-C gaps; the phase-versus-contract conflicts awaiting
analytics Q-1, Q-2, Q-3, Q-7, Q-8; and phases 09 and 11 on PIN gating, which C-2 recorded
as an owner decision deliberately not acted on.

## WHAT THIS DOES NOT ACHIEVE — corrected is not buildable

**Correcting a site removes a wrong instruction. It does not supply the right one.** Phase
04 no longer tells a builder to create a guest from a first and last name, and phase 06 no
longer tells one to collect personal-name registration data or to search candidates by
normalized first-plus-last name. **Neither document now says what to do instead.** That
specification — how a person is entered, searched for, and matched under the identity
model — is class-C gap **C-1** (the search and add operations) and **C-4** (registration,
claiming, and the vouching flow as user-facing surfaces) in
`docs/agent-handoffs/ALIGN-PHASES-TO-IDENTITY-MODEL.md`, and **filling it is not
authorized here and was not done.**

**So: after this commit the phase documents stop being WRONG on personal names. They do not
become BUILDABLE.** This commit must not be read as having completed, advanced, or partly
completed the identity specification. Each of the three notes states this in the document
itself, so the point survives without this handoff.

## Evidence

- **[REPO]** Base commit `205e073f53b60013047fd82f8b766d679cf943f0`, verified with
  `git rev-parse --verify -q 205e073f53b60013047fd82f8b766d679cf943f0^{commit}`; clean tree
  at start.
- **[PROJECT-DOC]** `docs/redesign/DECISIONS.md` → owner ruling **R-18**, read in full
  including "What R-18 does NOT reach — the remaining protections STAY IN FORCE", before
  any classification.
- **[PROJECT-DOC]** Both governing documents read in their post-R-18 state, so each
  superseded requirement was read at its own supersession note.
- **[REPO]** `git diff --numstat` on `docs/redesign/phases/` reports **`47 0`** for
  `04-log-a-game.md` and **`102 0`** for `06-my-profile.md` — **149 lines added, zero
  deleted, two files**. **Zero deletions is the proof that every class-F and class-U site
  is untouched**: no existing line was removed, reworded, or annotated.
- **[REPO]** No other phase document changed: `git status --porcelain=v1` lists only these
  two under `docs/redesign/phases/`.
- **[REPO]** **No copy-ready block edited.** Phase 06's block body (its `>` lines) is
  **byte-identical** across the change —
  `fe8ef27702d752a6bab7f72252fbddd365285707fc20d2b3e96ad661f653e2f4` from both
  `git show HEAD:<path>` and the working tree, the same hash
  `ALIGN-PHASES-TO-IDENTITY-MODEL` recorded. The other fifteen blocks are in files proven
  unchanged above.
- **[REPO]** The superseded text is **retained byte-identical**. Phase 06's numbered
  "Required claim lifecycle" list:
  `fe36dd4717ed94e30515ff78fa9b9223fc4870c0a414a8e986bc72f811759f68` from both — again the
  hash the prior work item recorded. Phase 04's "Step 4.3 guest identity scope" bullet
  lists: `07bb38c379826be63383c1daba581d5bb9f8551bcf17667f06a8ec497813deab` from both.
- **[REPO]** Phase 04's class-F sections are byte-identical: "Claimed-player privacy
  requirement" through "Step 4.5 closure requirement" hashes
  `007cfcc90ee1c682b06271944e60e0e3d10ccb156adacd232b0d131a53e585dd` from both.
- **[REPO]** **Zero line-number citations added**:
  `grep -cE '\.md:[0-9]|:[0-9]+-[0-9]+|[Ll]ines? [0-9]+'` over the 147 added content lines
  returns `0`. (Phase 04's pre-existing R-8 note contains one; it was not touched.)
- **[REPO]** **Zero restated decision content**: a grep over the added lines for every
  mechanic and value in the cited decisions — participant, approver, approval, escalation,
  expiry, auto-claim, auto-approval, PIN, digit, attempt, backoff, co-play, substring,
  pseudonym, unused username, shared logged game, unvouched, detachment, namespace, 1500,
  week, selectable, group-scoped, globally, repudiation, matchable, never displayed, only
  usernames, minimum query, three characters — returns **`0`** once the `DECISIONS.md`
  section title "…account, and vouching model (decision record: D-1–D-49), 2026-07-23" is
  excluded, which is a **pointer** carrying no mechanic or value and is how R-18 and the
  prior notes cite it.
- **[REPO]** **Every numeral in the added lines accounted for**: `D-1`, `D-3`, `D-4`,
  `D-8`, `D-36`, `D-37`, `D-40`, `D-41`, `D-49`, `R-18`, `C-1`, `C-4`, `P-1`, `P-2`, the
  phase/step names (Phase 4, Step 4.3, Step 4.5, Phase 6, Step 6.2, Steps 6.1–6.6), and the
  dates 2026-07-23 / 2026-07-24. **No threshold value appears.**
- **[REPO]** **Sixteen copy-ready blocks** across both heading variants — fifteen
  `## Copy-ready agent execution prompt`, one `## Copy-ready phase prompt` (phase 06).
  Phase 07's is plain text rather than blockquoted.
- **[REPO]** Two independent sweep passes over all twenty-one phase documents; the second
  surfaced nothing the first missed.

## Validation

`npm.cmd run validate:claude-context -- --require-maintenance` — result recorded in the
task report. No test, build, lint, or type-check is applicable: no `src/**` file, test,
schema, or migration was touched.

## What this authorizes

**Nothing.** No phase begins, no substep is assigned, no gap is approved for filling, no
question in either Q-series is answered, the unification design choice remains unmade, and
the name-removal migration remains unwritten and unauthorized.

## Next action

Owner disposition of class-C gaps **C-1** and **C-4** — the specification of how a person is
entered, searched for and matched under the identity model. **They are now the binding
constraint on Phase 6 scoping**: with this commit the phase documents no longer contradict
the model on personal names, and what remains is that they do not yet describe the
replacement. The single class-U site above and the three families in "What this work item
deliberately did not touch" remain owner questions.
