# RECORD-REGISTRATION-SEARCH-AND-REPUDIATION — entry separated from claiming; shadowing closed; search split in two; a repudiation path added. Documentation only; nothing built, decided anew, or resolved

**Headline.** The identity model recorded as D-1–D-33 **fused two things**: how a person
**enters** the system, and how a person **claims existing history**. The owner has since
separated them, closed a shadowing hole, established a group-membership gate, split search
into two distinct operations, and added a **repudiation path** for games wrongly
attributed to a person. This work item **writes that down** as **D-34–D-49**, consequences
**C-3–C-8**, two **scope notes** beside already-recorded entries, and **two items recorded
OPEN**. It **builds nothing and decides nothing new**.

## Header — the eight facts

1. **Title.** Recorded the registration, search and repudiation model into the identity
   decision record: D-34–D-49, C-3–C-8, two scope notes, two open items. Documentation
   only. Nothing built, applied, deployed, or resolved.
2. **Date.** 2026-07-24.
3. **Branch.** `redesign/tm-stats-dashboard-rebuild` (redesign lineage).
4. **Worktree.** `C:\Users\izzyh\Documents\Terraforming Mars Redesign` — the redesign
   primary, a git *linked* worktree (git-dir `…/worktrees/Terraforming-Mars-Redesign`) and
   the tree the planning-pack updater reads. **No worktree was created.**
5. **Base commit.** `acf368b52a64646806f3f69a43338af469d78fed` (`acf368b52`,
   `SUPERSEDE-COPY-READY-PROMPTS`). Clean tree at start **[GIT]**. The brief's expected
   base `87e5fbd4` is an **ancestor** of this HEAD, so the advance is not a stop condition.
6. **Category.** Documentation and record only. It is **NOT** code, schema, a migration,
   an RPC, a test, a deploy, a production write, a push/merge, or a phase advance. It
   **resolves no open question**, reclassifies **no** blocker, and amends **no** existing
   decision, ruling, or finding.
7. **Authorization held.** The `RECORD-REGISTRATION-SEARCH-AND-REPUDIATION` brief:
   read-only git and repository inspection; editing `docs/redesign/DECISIONS.md` (the
   section-5 entries, the section-6 scope notes, the section-7 consequences, the section-8
   open items); editing `docs/REDESIGN_STATE.md` to register this handoff and record the
   outcome; creating ONE handoff; exactly ONE commit **made with the Bash tool**; reporting
   the publish receipt.
8. **Authorization NOT held, and what did NOT occur.** No amendment or deletion of any
   existing decision, ruling or finding. **Neither section-8 item is resolved** — the
   recompute question is deferred, not decided, and no fix was designed for the residual.
   The **unification design choice is NOT resolved or recommended.** No edit to the
   feasibility handoff, any contract,
   `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`, `docs/CURRENT_STATUS.md`,
   `docs/redesign/MASTER-RULES.md`, or **any** phase document — X-3's upgrade is recorded
   in `DECISIONS.md` as a consequence, **not** by editing where X-3 lives, and the Phase 5 /
   Phase 7 dependencies at C-8 are recorded without touching either phase document. **No
   `is_username_available` migration** and no other code, schema or migration written. **No
   line-number citation added.** `MATCHER-MANUAL-ENTRY-REPLACEMENT` was **not**
   reclassified and `ID-READER-CONTRACT` was **not** assigned a destination — both need
   owner rulings. No more than one commit. **No push, merge, deploy, migration apply,
   rebase, force-push, or history rewrite. No production read or write of any kind** — no
   Supabase MCP, no `execute_sql`, no `list_migrations`, no `apply_migration`, no
   Cloudflare, no `wrangler`, no `/api/deploy-info`, no production SQL. The updater was
   **not** run manually and `sync_installed_updater.py` was not run in any mode. `src/**`,
   `supabase/**`, `scripts/**`, every `.bat`, the updater and its hook were not touched.

## Why this existed

The original identity record answered "how does a person get an account" and "how does a
person take over an existing profile" with one fused set of rules. That fusion left a
**shadowing hole** — nothing stopped a person from registering a username another profile
already answered to — left group membership and search under-specified, and had **no path
at all** for the commonest real error: a game logged with the wrong person in a slot. The
owner separated entry from claiming and added repudiation. This work item moves that into
the canonical record so a session that was not present can rely on it.

## Numbering — derived, not assumed

The identity decision record was read and its existing identifiers enumerated: **D-1 …
D-33 with no gaps, highest D-33**. The new entries therefore run **D-34 – D-49**. The
consequence series already held **C-1, C-2**, so the new consequences run **C-3 – C-8**.
The record's heading range was updated from `D-1–D-33` to `D-1–D-49` as **navigational
metadata**, following the precedent set when the ruling-series heading was renamed
`R-5–R-11` → `R-5–R-12`.

---

# WHAT WAS RECORDED — `docs/redesign/DECISIONS.md`

## Entry (D-34–D-35)

- **D-34 — REGISTRATION IS UNVOUCHED.** An unused username plays immediately. The recorded
  reasoning is what makes this safe rather than lax: **vouching exists to protect EXISTING
  HISTORY, not to gate participation.**
- **D-35 — NO GROUP INVITATION IS REQUIRED.** The gate is the shared-logged-game rule
  (D-39).

## Claiming (D-36–D-38)

- **D-36 — TAKING AN EXISTING USERNAME IS THE CLAIM** — the same act, detected at
  registration. **SHADOWING IS CLOSED**, recorded explicitly.
- **D-37 — USERNAMES ARE UNIQUE ACROSS ALL PROFILES**, recorded as **D-36's
  precondition**.
- **D-38 — WHILE A CLAIM IS PENDING** the person stays unregistered and plays as a guest.
  No temporary account, no rename on approval.

## Groups (D-39)

- **D-39 — GROUP MEMBERSHIP REQUIRES A SHARED LOGGED GAME**, and it is **RETROSPECTIVE**:
  add → game logged → membership.

## Search and Add — two operations (D-40–D-43)

- **D-40 — SEARCH is discovery**: substring, group-scoped, co-play ordered, requires
  membership.
- **D-41 — ADD is entry by prior knowledge**: exact username, global, one profile or
  nothing.
- **D-42 — ADD MUST NOT FALL BACK TO SEARCH.**
- **D-43 — ADD MUST NOT REQUIRE MEMBERSHIP**, because membership is retrospective and
  nothing could otherwise bootstrap.

## Repudiation — correcting a wrong attribution (D-44–D-49)

- **D-44 — REPUDIATION IS SELF-SERVICE**, needing no confirmation from the logger. The
  asymmetry is deliberate and recorded: vouching gates **acquiring** history because taking
  what is not yours needs permission; **disowning** what is not yours does not. Requiring
  the logger's confirmation would let **the person who made the error decide whether it was
  an error**, and would stall if they stop playing.
- **D-45 — REPUDIATION IS RECORDED, NOT SILENT**: who, when, and what the slot held
  before — making a wrongful repudiation **visible rather than prevented**.
- **D-46 — THE LOGGER RE-PICKS**, with **all participants notified** using the same fan-out
  as the vouching flow, so the correction does not stall on one person.
- **D-47 — THE REPUDIATOR IS EXCLUDED FROM THAT SLOT ONLY** — per-slot, per-game, never a
  global exclusion from the group or from future games.
- **D-48 — THE GAME REMAINS VALID** while the slot is unresolved; voiding it would punish
  three people for someone else's error.
- **D-49 — AN UNRESOLVED SLOT IS UNAVAILABLE, NOT ABSENT.** The metrics contract must not
  silently reduce the field size: a four-player game must not become a three-player game,
  or every margin in it shifts. This is the **coverage-state pattern** applied to
  participation.

## Scope notes added beside existing entries — content unchanged

- **Beside the vouch-lifecycle entries (D-28–D-33):** the lifecycle now applies to **CLAIMS
  ONLY, never to entry**, because D-34 makes registration unvouched.
- **Beside D-32:** its **purpose changed** — written as a lockout workaround, it is now an
  **accumulation mechanism**, since nobody is locked out and each new game adds a potential
  approver.

**Neither note amends anything.** Proven mechanically: a word-diff over the
vouch-lifecycle region returns **zero deletion markers**, and the only deleted line in the
entire `DECISIONS.md` diff is the record's heading range (navigational metadata).

## Consequences (C-3–C-8)

- **C-3 — X-3 upgraded from housekeeping to LOAD-BEARING** (`RECORD-IDENTITY-FEASIBILITY-FINDINGS.md`
  → §"X-3 — `is_username_available` is called but defined nowhere"), **disambiguated**
  from the unrelated X-3 in `AUDIT-SESSION-RECORDS-2026-07-23.md`. Under D-36 it decides
  whether registration proceeds or vouching triggers, so it must **FAIL CLOSED** and span
  **ALL** profiles.
- **C-4 — the shared namespace requires the unification, the THIRD dependency on it**
  (per §"F-1 — the schema does not currently implement the unified-profile model"),
  alongside where guest usernames live and whether an email attaches to an existing row.
- **C-5 — the group gate confirms R-12's footing; R-12 needs no revisiting.**
- **C-6 — the search/add split closes cross-group disclosure**, by construction.
- **C-7 — repudiation is the corrective for mis-selection, which this design makes more
  likely.** Picking from a list is easier to get wrong than typing a name, so the search
  design and repudiation are **counterparts, not independent features**.
- **C-8 — repudiation is consumed by two phases**: Phase 5 (game detail and replay, where a
  slot is displayed and repudiated) and Phase 7 (the ratings an unresolved slot affects).

## Recorded OPEN — neither resolved

- **Do derived values recompute after a repudiation?** Elo is sequential, so recomputing
  one game cascades through every later rating, and co-play counts, win differentials and
  margins change for everyone in that game. **Deferred to Phase 7**, which is not built.
  **Not decided; neither option recommended.**
- **Known residual — unilateral group join.** A game is logged by one person, so someone
  could assert they played with you and join your group unilaterally. **Scale condition
  recorded**: visible and harmless at the D-25 transition scope; the kind of thing that
  matters at a hundred users. **No fix designed.**

---

## Evidence — commands run this session (read-only except the named edits) [GIT]

```
$ git rev-parse --abbrev-ref HEAD      -> redesign/tm-stats-dashboard-rebuild
$ git rev-parse HEAD                   -> acf368b52a64646806f3f69a43338af469d78fed
$ git rev-parse --git-dir              -> .../worktrees/Terraforming-Mars-Redesign
$ git status --porcelain=v1            -> (clean at start)
$ git merge-base --is-ancestor 87e5fbd4 HEAD   -> 0 (expected base is an ancestor)
```

Numbering derived by enumerating `D-` and `C-` identifiers in `DECISIONS.md`. Zero-deletion
and no-line-number-citation claims verified with `git diff` and `git diff --word-diff`
filters before commit. Evidence class **[OWNER-DECISION]** for the decisions themselves;
**[PROJECT-DOC]** for the cited findings F-1 and X-3; **[GIT]/[REPO]** for the mechanical
checks.

## Files changed

- `docs/redesign/DECISIONS.md` — D-34–D-49, the two scope notes, C-3–C-8, both open items,
  the extension note, and the heading range.
- `docs/REDESIGN_STATE.md` — the outcome note and this handoff's registration.
- `docs/agent-handoffs/RECORD-REGISTRATION-SEARCH-AND-REPUDIATION.md` — this handoff.

## Documents reviewed / updated / intentionally NOT changed

- **Read:** `docs/redesign/DECISIONS.md` (identity record, ruling series, Q-series
  qualifier); `docs/REDESIGN_STATE.md`; `RECORD-IDENTITY-FEASIBILITY-FINDINGS.md` (F-1,
  X-3); `AUDIT-SESSION-RECORDS-2026-07-23.md` (the colliding X-3).
- **Updated:** the three files above.
- **Intentionally unchanged, each against its own rule:**
  - `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` — the governing contract
    the model affects; amending it is a separate owner act, and the brief forbids it.
  - `docs/CURRENT_STATUS.md` — forbidden; no current phase, blocker, release, migration or
    next-action state changed.
  - `docs/redesign/MASTER-RULES.md`, `docs/redesign/MASTER-PLAN.md` — no governance rule,
    phase structure, or durable direction changed by a recording task.
  - **Every phase document, including Phase 5 and Phase 7** — forbidden; C-8 records those
    two dependencies **in `DECISIONS.md`** rather than by editing either document.
  - `RECORD-IDENTITY-FEASIBILITY-FINDINGS.md` — forbidden; F-1 and X-3 are **cited**, not
    edited.
  - `docs/AUTHORITATIVE_DOCUMENTS.md` — no authority routing changed.
  - `docs/redesign/CLAUDE-PROJECT-SOURCES.json` — no new catalogued source; handoffs are
    discovered by directory.

## Known limitations and deliberately-retained statements

- This is a **recording**, not an adjudication or a build. The decisions are
  **[OWNER-DECISION]**; no executable or production check was performed or implied.
- **C-3 and C-4 describe work that does not exist**: `is_username_available` still fails
  open and is defined in no committed migration, and the shared namespace still cannot be
  expressed in the current schema. Recording the consequence fixes neither.
- **D-49 states a metrics requirement that nothing implements.** No coverage/unavailable
  state for participation exists today; recording it does not create one.
- The **unification design choice remains unmade**, now with three dependents.
- **Both open items are genuinely open** — the recompute question is deferred to a phase
  that is not built, and the unilateral-join residual is deliberately unfixed.

## Production and external effects

**None.** No production or external system was read or written. After the commit the
post-commit planning-pack hook is expected to fire in this (the updater's) tree and
republish; that automatic run is expected behaviour, and its receipt belongs in the updater
log and the task report, not in a canonical document.

## Next approved action, and what is NOT approved

- **Next (owner's / separate assignments, not started):** resolve the unification design
  choice (identity Q-2) on which C-4's three dependents wait; author the
  `is_username_available` migration C-3 requires to fail closed; decide the recompute
  question when the Phase 7 rating pipeline is built; decide whether the unilateral-join
  residual needs a fix before scale.
- **NOT approved by this record:** resolving either open item or the unification choice;
  writing any migration or code; editing any contract, phase document, `CURRENT_STATUS.md`
  or `MASTER-RULES.md`; reclassifying `MATCHER-MANUAL-ENTRY-REPLACEMENT`; assigning
  `ID-READER-CONTRACT` a destination; any push, merge, deploy, migration apply, or
  production write.
