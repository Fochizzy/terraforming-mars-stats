# CORRECT-GOVERNING-DOCUMENTS-TO-IDENTITY-MODEL — superseding the identity requirements in MASTER-RULES and the guest-identity privacy contract; owner ruling R-18 recorded, every remaining protection left in force

- **Date:** 2026-07-24
- **Branch:** `redesign/tm-stats-dashboard-rebuild` (redesign lineage)
- **Worktree:** the redesign primary,
  `C:\Users\izzyh\Documents\Terraforming Mars Redesign`
  (git-dir `.../Terraforming Mars/.git/worktrees/Terraforming-Mars-Redesign`) — the tree
  the planning-pack updater reads. No worktree was created.
- **Base commit:** `9080f84dfc31ba782ec7bc1b420866e4b277801e`
  (`RECORD-UNIFICATION-SHAPE-AND-AUDIT-SCOPE`), clean at start
  (`git status --porcelain=v1` empty). The brief expected `d5dc8b15` **or later**;
  `d5dc8b155333020fc8f2ac3fd7412d1bb8b04cce` verifies and is this commit's grandparent, so
  the actual base is later than expected and the comparison is recorded rather than assumed.
- **Category:** documentation-only supersession of two governing documents, plus the owner
  ruling that authorizes it. It is **not** a phase-document sweep, **not** an identity or
  analytics decision, **not** a schema, migration, or production action.
- **Authorization held:** read-only git and repository inspection; supersession markers on
  class-S sites only in `docs/redesign/MASTER-RULES.md` and
  `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`; the ruling and the
  structural observation only in `docs/redesign/DECISIONS.md`; editing
  `docs/REDESIGN_STATE.md` to register this handoff and record the outcome; creating this
  one handoff; exactly one commit made with the Bash tool; reporting the publish receipt.
- **Authorization NOT held, and what did not occur:** **no class-F site was marked
  superseded, annotated, softened, or described as easier to satisfy** — every one is
  byte-unchanged and provable from the diff; no class-U site corrected; **no requirement
  deleted from either document**; nothing relocated out of either document or into
  `DECISIONS.md`; no list or section restructured, renumbered, or reordered; **no
  phase-document site corrected, including the eighteen this unblocks**; no other contract
  and no `CURRENT_STATUS.md` edit; **the name-removal migration was not designed,
  authorized, or begun**; no decision's content restated and no line-number citation added;
  no existing decision, ruling, or finding amended; analytics Q-1/Q-2/Q-3/Q-7/Q-8 unresolved,
  `MATCHER-MANUAL-ENTRY-REPLACEMENT` not reclassified, `ID-READER-CONTRACT` given no
  destination, and the D-2-versus-D-21 pseudonym-display question not resolved; no code,
  schema, or migration; no second commit; no push, merge, deploy, migration apply, rebase,
  force-push, or history rewrite. **No production read or write of any kind** — no Supabase
  MCP, no `execute_sql`, no `list_migrations`, no `wrangler`, no `/api/deploy-info`, no
  production SQL, no Cloudflare action. The planning-pack updater was **not** run by hand and
  `sync_installed_updater.py` was **not** invoked in any mode.

## Problem — why this existed

`ALIGN-PHASES-TO-IDENTITY-MODEL` found eighteen phase-document sites on personal-name
capture and matching that it could correct in **neither** direction under process rule
**P-1**, because two governing documents still required what the identity model forbids:

- `docs/redesign/MASTER-RULES.md` → "Guest player identity and claimed-name privacy", whose
  **non-negotiable** list still required guest identification by first and last name with
  separate matching; and
- `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`, which the identity decision
  record itself left authoritative for semantic meaning until the owner amended it.

**D-1** records that no real names are stored or displayed. The owner has now ruled on both:
the identity model governs. This work item applies that ruling to the two documents and
records the ruling itself.

### Why MASTER-RULES went stale unnoticed

The identity model was recorded across several commits, each superseding earlier entries in
`DECISIONS.md`. **Nothing in that path touched `MASTER-RULES.md`**, because a **design**
requirement was living in a **rules** document, where the supersession discipline that
governs `DECISIONS.md` does not reach it. The contradiction therefore survived commits that
would otherwise have caught it, and surfaced only when a phase sweep ran into it from the
outside. This is recorded as an **observation** in `DECISIONS.md` under R-18 and is
**not acted on** — see "What was deliberately not done".

## Numbering — derived from the file, not assumed

Read from `docs/redesign/DECISIONS.md` at the time of recording:

- highest existing `R-` number: **R-17** (`R-14` carries sub-lettered `R-14b`/`R-14c`;
  `R-1`–`R-3` are not present in this file, and `R-4` is its lowest member);
- highest existing `D-` number: **D-59**;
- highest existing `C-` number: **C-12**.

**Used: R-18.** The file's own convention puts **owner rulings that dispose of a conflict**
in the `R-` series — §"Phase 4 Step 4.3 — owner rulings R-5–R-12 on the pending decisions and
finding dispositions" and §"Phase 2 / analytics — owner rulings R-13–R-17 on the
phase-vs-contract conflicts" — while the `D-` series is the identity **design** record and
the `C-` series is **consequences** of it. This ruling disposes of a document conflict; it is
neither a new design decision nor a consequence of one, so it continues `R-` and extends
neither `D-` nor `C-`. Nothing is cited by line number anywhere in this change.

## The classification that governed every decision

Three classes, not two, because **the identity model changes what is stored going forward
and does not retroactively erase existing data**. Personal names remain in
`private.player_private_identities`, `private.player_legacy_identities`,
`public.player_import_aliases` and `game_revisions.snapshot`; the migration that would remove
them is unwritten and unauthorized.

- **S — superseded.** The identity model replaces the requirement with a different one.
  Corrected in place, original retained.
- **F — still in force.** The model does not replace it. It may be easier to satisfy for new
  data, but it still governs the name data already stored. **Left completely untouched** —
  not marked, not annotated, not softened.
- **U — unclear.** Reported; corrected nothing.

The operative test was the brief's: a site is **S only where the identity model gives an
explicit replacement for it**. "The model means there will be fewer names" was never treated
as a replacement. Where a site both stated a superseded mechanism and could be read as
protecting stored names, it went to **F** or **U**, never to **S**.

**Counting unit, stated so the totals are reproducible:** a site is one independently-stated
requirement — a standalone imperative sentence, a numbered lifecycle step, or a top-level
bullet in a flat rule list. A lead-in sentence plus the enumeration that itemizes it counts
as **one** site; a `###` subsection defining a single mechanism counts as **one** site;
where a single item inside an enumeration carries a different class from its siblings, that
item is counted separately and the remainder as one.

## Totals

| Document | Sites swept | S | F | U |
|---|---:|---:|---:|---:|
| `docs/redesign/MASTER-RULES.md` | 15 | **2** | **13** | **0** |
| `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` | 115 | **12** | **97** | **6** |
| **Total** | **130** | **14** | **110** | **6** |

**Fourteen class-S sites were found against the one known.** The brief warned that a cited
set in this project has turned out to be a subset five times; it did so a sixth time here.
The single known site — MASTER-RULES' guest-identification rule — is one of fourteen, and
**twelve of the fourteen are in the contract, which no prior work item had swept at all.**

Both documents were swept **entirely**, not only their identity sections. In
`MASTER-RULES.md` the mechanical vocabulary sweep (`name`, `guest`, `match`, `username`,
`alias`, `claim`, `display`, `member`, `auth`, `identit`, `personal`, `private`, `player`,
`group`, `regist`) returned hits in four other sections; three are **card and tile catalog
identity, catalog aliases, and parser identity** — not player identity, and excluded with
that reason — and the fourth is the Venus/Colonies player-attribution rule, which is counted
as a swept site and classified **F**. A hyphen-tolerant re-sweep of the contract was run
after the first pass because the first pattern would have missed `first-name and last-name
collection`; that re-sweep found it, and it is class-S site 11 below.

## SWEEP — `docs/redesign/MASTER-RULES.md` (15 sites)

All in §"Guest player identity and claimed-name privacy" except the last.

### Class S — 2 sites, both corrected

**S-M1 — "a guest may be identified using either username or first and last name"**
(non-negotiable rule). *Original text, retained verbatim in place.* Superseded because
**D-1** replaces the identification mechanism outright and **D-37** makes the username the
single shared-namespace identity, with **D-3**/**D-4** carrying the optional matchable
element. This is the one site the brief listed as known.

**S-M2 — "username and personal-name matching are separate"** (non-negotiable rule).
*Original text, retained verbatim in place.* Superseded because the model states what
matching now is — **D-8**, **D-40**, **D-41** — within which personal-name matching is not a
first-class concept, and **D-1** removes the data it operated on for new records. This is the
site `ALIGN-PHASES-TO-IDENTITY-MODEL` named alongside the first as jointly holding the phase
sites; without it, the phase-04 site requiring the two matchings be kept separate would still
have been blocked and this work item would not have unblocked what it claims to.

**Supersession added:** one blockquote note, placed between the contract pointer and the
`Non-negotiable rules:` lead-in so the bulleted list stays intact and unrenumbered. It marks
exactly those two rules superseded, names **D-1**, **D-3**, **D-4**, **D-8**, **D-37**,
**D-40**, **D-41** and the R-18 entry, states that it "reaches no further than the two named
here", and points at **P-2** for why no decision content is restated.

### Class F — 13 sites, every one left exactly as written

Reported with equal prominence, because what was deliberately preserved is as much the
deliverable as what was corrected. **None was marked, annotated, softened, or noted as easier
to satisfy**, and the diff shows no change to any of them.

1. The routing pointer naming `GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` as the authoritative
   cross-phase contract — still the contract, with parts of it superseded in place.
2. "unmatched players may exist as unlinked guests before account registration" — the model
   keeps unregistered profiles.
3. "registration must explicitly confirm a claim" — a floor, not a ceiling; the model adds an
   approval from outside the registration session rather than removing this one.
4. "a successful claim preserves the existing player ID".
5. "historical games and statistics remain attached to that player ID".
6. "after claim, the registered username is the public identity".
7. "first name, last name, full name, normalized personal names, and private personal-name
   aliases must not appear publicly" — **a disclosure protection over names that still
   exist.**
8. "private names must be excluded from public and client payloads, not merely hidden
   visually" — **likewise.**
9. "missing username must never fall back to a private personal name" — **likewise; this is
   precisely the rule that becomes easier to satisfy and stays load-bearing regardless.**
10. "schema or migration changes require separate explicit authorization".
11. "production identities must not be mutated during redesign validation".
12. "Every phase that reads, creates, resolves, claims, serializes, exports, or displays
    player identities must comply with the authoritative contract."
13. §"Venus Next and Colonies import evidence" — "Preserve stable player IDs when attribution
    is explicit. World Government and other unattributed movement must not be assigned to a
    nearby player." Player-identity-bearing, outside the identity section, unaffected by the
    model.

### Class U — 0 sites.

## SWEEP — `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` (115 sites)

### Class S — 12 sites, all corrected

Grouped by the section each sits in; seven blockquote notes were added, one per section
containing an S site, plus a second note at the `### First-and-last-name mode` heading so a
reader arriving there directly cannot miss it.

**§ Required identity lifecycle**

1. **Step 2** — identifying an unlinked guest "using either: a username, or first name and
   last name". Superseded by **D-1**, **D-3**, **D-4**, **D-37**.
2. **Step 6** — registration searching "normalized registered first-and-last name against
   approved private guest name information or a private name alias". Superseded by **D-1**,
   **D-36**, **D-37**, **D-40**, **D-41**.

**§ Guest identity modes**

3. The framing sentence "A new guest may be entered using one of two explicit identity
   modes." Superseded by **D-1**, **D-2**, **D-3**, **D-4**, **D-37** — the model permits one
   identity, not a choice of two.
4. The **entire `### First-and-last-name mode` subsection** (its stated inputs and all six of
   its requirements, including "preserve a separately normalized private full-name match
   value"). This is the brief's own example shape for S. Retained in full; two notes mark it.

**§ Username and personal-name separation**

5. "Username matching and personal-name matching are separate concepts." Superseded by
   **D-1**, **D-4**, **D-8**, **D-40**, **D-41**. **Only this sentence** — the section's
   seven other requirements are F and are listed below.

**§ Registration-time candidate lookup**

6. "Registration must search eligible unlinked guests using both: 1. the registered username;
   and 2. the registered first and last name."
7. The "one exact private-name candidate" entry in the list of shapes candidate lookup may
   return. Both superseded by **D-1**, **D-36**, **D-37**, **D-41**.

**§ Cross-phase ownership**

8. Phase 4 owns "explicit username or first-and-last-name identity mode".
9. Registration and onboarding owns "first-name and last-name collection". Both superseded by
   **D-1**, **D-3**, **D-4**, **D-37**. The note states that neither phase's remaining
   ownership is altered.

**§ Required tests**

10. "unmatched imported player entered with first and last name".
11. "unmatched manually entered player entered with first and last name".
12. "exact private-name candidate". All three require testing the mechanism superseded above
    and give way with it. The note names the "Public privacy" tests as outside its reach.

### Class F — 97 sites, every one left exactly as written

**This is the more important half of the deliverable.** Personal names are still in the
database; these are what protects them. Reported by section, with the requirement text where
the class turned on it.

**§ Status (3)** — the contract's governing scope; "A phase-specific instruction may add
stricter requirements"; "A phase-specific instruction must not weaken this contract."

**§ Required identity lifecycle (10)** — the opening statement that identities may exist
before an account; steps 1, 3, 4, 5, 7, 8, 9, 10; and "Do not replace this lifecycle with
copying history to a new player record when the existing player identity can be linked
directly." Step 7 ("The registrant reviews and explicitly confirms the intended identity") is
**F for the same reason as MASTER-RULES rule 3** — the model adds an approval, it does not
remove this one.

**§ Identity categories (3)** — the ten categories the application must distinguish; "Do not
treat every unmatched player as a new guest"; "Do not display an unlinked guest as a
registered account."

**§ Guest identity modes (3)** — the **entire `### Username mode` subsection**, including
"do not fabricate first name", "do not fabricate last name" and "do not split the username
into personal-name fields", which are **anti-fabrication rules that the model makes more
important, not less**; "A single unlabeled value must not ambiguously mean either username or
personal name" — **F because treating a stored personal name as a username would publish it**;
and "The user must explicitly select or the source format must explicitly establish the
identity mode" — **F because the model gives no explicit replacement for it, and it guards
against guessing what an existing stored value means.**

**§ Existing guest reuse (10)** — steps 1, 2, 4, 5, 6, 7; "Do not create duplicates because
of" the five formatting causes; "Do not introduce broad fuzzy matching that can join
unrelated people" (**R-12** narrows substring matching, it does not repeal this); "Partial
matching may suggest candidates"; "Partial matching must never automatically link or claim an
identity."

**§ Username and personal-name separation (7)** — **the seven requirements under the one
superseded sentence all stay**: "Use separate centralized normalization and comparison
utilities"; "Username matching must not inherit personal-name partial matching behavior";
"Personal-name matching must not treat username punctuation or formatting as evidence of a
personal-name match"; "Missing username must remain missing"; "Missing first name must remain
missing"; "Missing last name must remain missing"; "Do not convert missing identity
information into an empty value that participates in matching." **The two anti-bleed rules
are live protection**: a username query that inherited personal-name partial matching could
surface a stored personal name, and the deployed matcher still matches on personal names
while `MATCHER-MANUAL-ENTRY-REPLACEMENT` is open. **The three missing-value rules and the
empty-value rule are the project-wide missing-data rule applied to identity.**

**§ Registration-time candidate lookup (3)** — "A textual match must not automatically claim
a player"; "The registrant must explicitly confirm the identity"; the seven recovery
behaviours the registrant must be able to perform.

**§ Claim eligibility (5)** — the claimable-only-when conditions other than the one at U-2
below; "The server must revalidate claim eligibility at submission time"; "Do not rely only
on candidate eligibility calculated when the page loaded"; "Prevent duplicate submission and
concurrent claims"; "One player identity must not be linked to multiple accounts."

**§ Successful claim effects (1)** — every preservation effect other than the group-membership
item at U-3 below.

**§ Claimed-player public name rule (5)** — "A claimed player's private personal name must not
appear publicly"; the eleven-item definition of private personal-name data; "Do not use
private personal-name data as a public fallback"; the privacy-safe neutral fallback; the
seven things never to fall back to. **All disclosure protection over existing names.**

**§ Public surfaces (5)** — the twenty-seven surfaces private personal-name data must not
appear in; "Private names must be excluded from the returned payload"; and the three
insufficiency rules (CSS, post-hydration removal, sending-but-not-rendering). **Textbook F.**

**§ Public player-name resolver (5)** — the single centralized resolver; the six categories it
must distinguish; the seven things it must never return; "Do not allow individual pages to
independently decide which player-name field to display"; the ten surfaces it must govern.

**§ Historical-game privacy (7)** — all seven, including "Do not continue publicly showing the
pre-claim guest personal name merely because it remains stored as" a display name, import
evidence, claim alias, **historical snapshot**, or denormalized source data. **This is the
`game_revisions.snapshot` case named in the brief; it is exactly why the class exists.**

**§ Claim candidate privacy (3)** — "Claim candidates may be shown only to the authenticated
registrant within the protected claim workflow"; the five things candidate-search responses
must not be; "Expose only the minimum information required to distinguish legitimate
candidates."

**§ Data-boundary requirements (4)** — the eleven payload types private personal-name fields
must not be included in; "Use explicit column selection"; the prohibition on broad identity
selections; "Do not put private names into" query parameters, URLs, browser storage, cache
keys, console output, exception messages, analytics events, or client-side source maps and
fixtures. **This last is verbatim the brief's example of an F site.**

**§ Import evidence (4)** — all four, including "Do not use original imported personal-name
evidence as the public identity after a claim."

**§ Security requirements (2)** — server-side identity lookup and claiming; the nine
prohibitions, including "expose private names to unauthenticated users".

**§ Cross-phase ownership (5)** — both ownership lists apart from the two S items; "Phase 4
must not automatically claim a guest"; "Registration must not create a duplicate player when
a confirmed guest can be linked"; "Neither phase may weaken the privacy contract."

**§ Data-model governance (4)** — the fourteen-item pre-implementation audit; "Do not assume
one display-name field can safely serve both private personal-name matching and public player
presentation"; "Do not create or apply a migration without explicit authorization"; the
nine-step procedure when the data model cannot safely preserve the requirements.

**§ Required tests (8)** — the two username guest-creation tests and the four remaining
guest-creation tests; the twelve remaining registration-claim tests; all five historical
identity tests; **all nineteen public-privacy tests**, including every "claimed full name does
not appear in …" assertion, the neutral-fallback pair, private import evidence, and candidate
enumeration; "Privacy tests must inspect serialized payloads and rendered output using known
test personal names"; "A passing visual inspection alone is insufficient"; "Use local,
isolated, or dedicated test data"; "Do not mutate production identities during validation."

### Class U — 6 sites, reported, none corrected

**U-1 — § Existing guest reuse, step 3: "Match according to the selected identity mode."**
Whether the supersession of the two-mode framing reaches this derivative reference, or whether
the step survives as a deferral to whatever the approved matching rules are, is not stated by
the model.

**U-2 — § Claim eligibility: "the candidate satisfies the approved username or private-name
rules."** This defers to the approved rules rather than stating a mechanism, so it arguably
self-corrects; but it also names a private-name basis for claiming that **D-36** replaces.
Marking it superseded wholesale would risk reading as the removal of an eligibility gate, so
it was left.

**U-3 — § Successful claim effects: "add or preserve the appropriate group membership."** The
same ambiguity `ALIGN-PHASES-TO-IDENTITY-MODEL` recorded against phase 06: "adds" may mean
materializing membership the profile's existing games already imply, which **D-39** permits,
or granting membership as a side effect of the claim, which it does not.

**U-4 — § Claimed-player public name rule: "the registered username or another explicitly
approved public handle."**

**U-5 — § Public player-name resolver: "For a linked claimed player, the resolver may return
only: registered username, or another explicitly approved public handle."** U-4 and U-5 are
the **D-2-versus-D-21** question, which this work item is **forbidden to resolve** and did
not.

**U-6 — § Claim candidate privacy: "Registration-time claim matching may privately use:
registered username, first name, last name, normalized private personal name, approved
private aliases."** A permission bounded inside a privacy section rather than a required
mechanism. Whether the model withdraws the permission or it stands over existing data is not
stated, and superseding it could read as removing a bound.

## What this ruling does and does not unblock

- **DOES.** The eighteen phase-document sites that `ALIGN-PHASES-TO-IDENTITY-MODEL`
  classified unresolvable on personal-name capture and matching were held by **both**
  documents at once — each independently carried the requirement, so correcting one would not
  have been enough. With both corrected, **that basis is gone and those sites become
  correctable.**
- **DOES NOT correct them.** **This work item does not correct any phase-document site.**
  That is a separate sweep of the phase documents and is **not authorized here**. No phase
  document was edited. **This commit must not be read as having cleared those eighteen
  sites.**
- **DOES NOT touch the migration.** It does not authorize, design, or begin the migration
  that would remove existing name data. **Until that migration runs, the 110 class-F
  protections are load-bearing**, which is why not one of them was touched.

## What was deliberately not done

- **No class-F site was marked, annotated, softened, or described as easier to satisfy.**
  Several — the missing-username fallback rule, the anti-bleed matching rules, the public
  privacy tests — genuinely do become easier to satisfy as new data stops carrying names.
  That was treated as **not a reason to touch them**, exactly as the brief required.
- **No class-U site was corrected**, including the two that are the D-2-versus-D-21 question.
- **No requirement was deleted** from either document, and nothing was relocated out of either
  document or into `DECISIONS.md`. A deleted rule leaves a reader unable to tell whether the
  document was corrected or never said it.
- **No list was renumbered or reordered and no section restructured.** Every note is placed
  beside the requirement it supersedes, never inside a list.
- **The structural observation was recorded, not acted on.** Whether design requirements
  should be relocated out of `MASTER-RULES.md` under **P-2** is a separate owner question;
  no relocation was performed, proposed, or recommended.
- **`docs/AUTHORITATIVE_DOCUMENTS.md` was not edited.** No authority moved: the contract is
  still the primary cross-phase contract and `MASTER-RULES.md` still the governing rules;
  parts of each are superseded in place. Editing it was not authorized and was not needed.

## Evidence

- **[GIT]** Repository `https://github.com/Fochizzy/terraforming-mars-stats.git`, branch
  `redesign/tm-stats-dashboard-rebuild`, base `9080f84dfc31ba782ec7bc1b420866e4b277801e`,
  clean at start — all four derived from `git remote get-url origin`,
  `git rev-parse --abbrev-ref HEAD`, `git rev-parse HEAD`, `git status --porcelain=v1`, not
  inherited from the brief. `git rev-parse --verify -q d5dc8b15^{commit}` resolves.
- **[PROJECT-DOC]** `docs/redesign/DECISIONS.md`, **D-1–D-49 and C-1–C-8 read in full before
  any classification**, together with D-50–D-59 and C-9–C-12 from the base commit.
- **[PROJECT-DOC]** `docs/redesign/MASTER-RULES.md` → "Conflict handling and canonical-home
  process rules" (**P-1**, **P-2**) and "Guest player identity and claimed-name privacy".
- **[PROJECT-DOC]** `docs/agent-handoffs/ALIGN-PHASES-TO-IDENTITY-MODEL.md` → "Class D —
  unclear", the record of the eighteen sites and of both blocking documents.
- **[REPO]** **Zero deletions in either document.** `git diff --numstat` reports
  `15  0` for `MASTER-RULES.md` and `116  0` for the contract — 131 lines added, none
  removed. A `git diff --word-diff=porcelain` filtered for removed words returns only the two
  `--- a/<path>` file headers, no requirement text.
- **[REPO]** **Every class-F site provably untouched:** because the diff contains no deleted
  lines and no modified lines in either document, no F site's text can have changed. The
  additions are entirely new blockquote paragraphs adjacent to S sites.
- **[REPO]** **No decision content restated:** a grep over the added lines for the cited
  decisions' mechanics and values — participant fan-out, approver language, escalation and
  expiry periods, auto-approval, PIN length, attempt count, backoff, minimum query length,
  co-play ordering, substring, pseudonym, exact-username resolution, shared logged game,
  email attachment, namespace uniqueness, transition scope, games floor — returns **zero**.
- **[REPO]** **No line-number citation added:** a grep over the added lines for
  `\.md:[0-9]`, `:[0-9]+-[0-9]+` and `[Ll]ines? [0-9]+` returns **zero**.
- **[REPO]** Mechanical sweep commands recorded in the report; the hyphen-tolerant re-sweep
  is the reason `first-name and last-name collection` is in the S set rather than missed.

## Validation

- `npm.cmd run validate:claude-context -- --require-maintenance` — result recorded in the
  report and in `docs/REDESIGN_STATE.md`.
- `git status --porcelain=v1` run immediately before the commit, confirming only the intended
  files.
- Exactly one commit, **made with the Bash tool** so the `PostToolUse`/`Bash` planning-pack
  hook can match `Bash(git commit *)`.

## Next

**Not started, and not authorized by this handoff:**

1. The phase-document sweep that corrects the eighteen now-unblocked sites.
2. Owner disposition of the six class-U sites, two of which are the D-2-versus-D-21 question.
3. The owner question of whether design requirements should be relocated out of
   `MASTER-RULES.md` under P-2.
4. The name-removal migration, which remains unwritten and unauthorized.
