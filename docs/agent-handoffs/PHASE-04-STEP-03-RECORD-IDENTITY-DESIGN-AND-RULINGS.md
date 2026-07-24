# PHASE-04-STEP-03-RECORD-IDENTITY-DESIGN-AND-RULINGS — an owner design conversation and its rulings written into the canonical record; nothing built, decided beyond recording, or resolved

> ## AMENDMENT — 2026-07-23 — R-12 recorded; the ruling set is now R-5–R-12
>
> The initial recording commit `588218504` recorded owner rulings **R-5–R-11**
> only. **Ruling R-12** — "substring matching is NARROWED, not repealed", the
> **third OVERRIDE** alongside R-6 and R-8 — was **missing** from it (that commit
> predated R-12's addition to the assignment; R-12 sits out of numeric order in the
> updated brief, inserted between R-10 and R-11). Its absence left a live
> **unexplained contradiction** in `docs/redesign/DECISIONS.md`: D-8 requires
> username substring search while the rule at `:1261-1263` forbids substring
> matching, with no reconciling override between them.
>
> A **follow-up completion commit** (documentation only; same tree and branch; base
> `588218504`) closes that gap. It adds **R-12** to `docs/redesign/DECISIONS.md`
> (labelled OVERRIDE; overrides the `:1261-1263` no-substring rule **for the
> group-scoped username/alias search path ONLY**; records what it does **NOT**
> override — the rule stays **in full force** for the private personal-name stores
> `private.player_private_identities` / `private.player_legacy_identities` / any
> normalized personal-name value, and the **exact-match claim path** hardened by
> migration `20260721173000` is **excluded** — plus the `is_group_member` build
> constraint), renames the section title `R-5–R-11` → `R-5–R-12`, corrects the
> override count from **two** to **three**, and reconciles the routed
> "R-5–R-11" cross-references in `docs/CURRENT_STATUS.md`, `docs/REDESIGN_STATE.md`,
> `docs/redesign/phases/04-log-a-game.md`, and
> `docs/redesign/phases/05-games-detail-and-replay.md`.
>
> **Still documentation only:** nothing built, applied, deployed, pushed, merged,
> or read from production; **no open question answered**; the
> `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` contract is still
> **not edited**. The body below is the initial recording's handoff; where it says
> "R-5–R-11" or "two overrides" of the first commit's own facts, those are that
> commit's record and are superseded by this amendment.

**Headline.** A long owner design conversation produced a replacement
player-identity model and resolved several pending decisions, all of it living
only in a chat thread. This work item (`RECORD-IDENTITY-DESIGN-AND-RULINGS`, step
4.33) **writes it down**: owner rulings **R-5–R-12**, the identity/account/vouching
**decision record D-1–D-33**, its consequences **C-1/C-2**, and the four open
questions **Q-1–Q-4** (recorded OPEN, none answered). It **builds nothing, decides
nothing beyond recording, and resolves none of the four open questions.** Three
rulings — **R-6**, **R-8**, and **R-12** — are deliberate **OVERRIDES** of
higher-authority records and are recorded as such, each naming what it overrides and
why. (R-12 was added in a follow-up completion commit — see the amendment above.)

## Header — the eight facts

1. **Title.** Recorded an owner design conversation and its rulings into the
   canonical documents: R-5–R-12, D-1–D-33, C-1/C-2, Q-1–Q-4. Documentation only;
   nothing built, applied, deployed, or resolved. Three overrides recorded as
   overrides (R-12 added in the follow-up completion commit).
2. **Date.** 2026-07-23.
3. **Branch.** `redesign/tm-stats-dashboard-rebuild` (redesign lineage).
4. **Worktree.** `C:\Users\izzyh\Documents\Terraforming Mars Redesign` — the
   redesign primary, a git *linked* worktree
   (`git-dir …/worktrees/Terraforming-Mars-Redesign`) and the tree the
   planning-pack updater reads. **No worktree was created** — the brief forbids
   it, and the publish receipt depends on committing in this tree.
5. **Base commit.** `9fc2c96f063c35737c092d5da661e12c794915be` (`9fc2c96f`, the
   Design B planning-pack change). Clean tree at start; 0 behind / 1 ahead of
   `origin` **[GIT]**. The brief's expected base `a301ce20a` is an **ancestor** of
   this HEAD (BUILD-DESIGN-B had landed, exactly as the brief anticipated), so the
   advance is not a stop condition.
6. **Category.** Documentation and record only. It is **NOT** code, a migration, a
   deploy, a production write, a push/merge, a schema/RPC/test change, or a phase
   advance. It **resolves no open question** and **changes no blocker's `Blocking`
   value** except the three dissolution annotations (R-11), which retain each
   row's disposition.
7. **Authorization held.** The `RECORD-IDENTITY-DESIGN-AND-RULINGS` brief:
   read-only git and repository inspection; editing exactly the files named in the
   brief's section 7; creating one new handoff and registering it; exactly **one**
   commit; reporting the publish receipt.
8. **Authorization NOT held, and what did NOT occur.** No decision, resolution, or
   recommendation on any open question. **No edit to
   `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`** — the contract
   the design affects; amending it is a separate owner act. **No edit to phases 09
   or 11** on the strength of consequence C-2 — the consequence is recorded only.
   No edit to any phase document other than 04, 05, 06, and no restructuring of
   those three. No change to any blocker disposition not named in the brief's
   section 4. No touch to gap 1e, the 6d conflict, the DOCUMENT-OWNERSHIP-MAP
   question, the analytics-contract conflicts, or the 11/12/19 overlap. No code,
   schema, migration, RPC, or test. No more than one commit. **No push, merge,
   deploy, migration apply, rebase, force-push, or history rewrite. No production
   read or write of any kind** — no Supabase, no `execute_sql`, no
   `list_migrations`, no `apply_migration`, no Cloudflare, no `wrangler`, no
   `/api/deploy-info`, no production SQL. The updater was **not** run manually and
   `sync_installed_updater.py` was not run in any mode. `src/**`, `supabase/**`,
   `scripts/**`, every `.bat`, the updater and its hook were not touched.

## Why this existed

The project has repeatedly paid for canonical facts living in one place. The owner
design conversation replaced the identity model and resolved several pending
owner decisions, but all of it existed only in a chat thread. This work item moves
it into the canonical record so a session that was not present can rely on it. It
is a recording task by construction: it decides nothing and resolves none of the
four questions in the brief's section 6, which are recorded **as open**.

---

# WHAT WAS RECORDED

## Owner rulings R-5–R-12 → `docs/redesign/DECISIONS.md`

New section "Phase 4 Step 4.3 — owner rulings R-5–R-12 …, 2026-07-23", continuing
the `R-` ruling series (latest prior member R-4, the updater clean-tree guard).

- **R-5 — PD-1 AMENDED, not retired.** The interim `service_role` re-gate (the
  three-argument matcher overload) is not the permanent answer; the source-bound
  replacement is still to be built (`MATCHER-MANUAL-ENTRY-REPLACEMENT`). The five
  PD-1 scoping findings remain binding.
- **R-6 — PD-2: Step 4.3 closes on the independent audit alone. OVERRIDE.** Quoted
  in full below.
- **R-7 — PD-3: MOOT rather than answered.** Unique usernames + group-scoped
  search-and-select make ambiguity a selectable list, not a terminal `P0003`
  state; residual is a UI problem, not a database error.
- **R-8 — vouching/claim flow inside Step 4.3. OVERRIDE.** Quoted in full below.
- **R-9 — a skills audit runs between Phase 4 and Phase 5.**
- **R-10 — `MATCHER-MANUAL-ENTRY-REPLACEMENT` is the sixth tracked open item**,
  alongside the five PD-1 findings.
- **R-11 — three findings DISSOLVED, not fixed.** `DRAFT-NAME-RESIDUE`,
  `GUEST-NAME-COLLISION-TERMINAL`, and most of `GUEST-LABEL-REDIRTY` are removed as
  problems by the identity model rather than remediated — a stronger claim than a
  fix. `GUEST-LABEL-REDIRTY`'s three writers still change. The dissolutions are
  prospective on the model being built and fix nothing today.
- **R-12 — substring matching NARROWED, not repealed. OVERRIDE.** Added in the
  follow-up completion commit (see amendment at top). Overrides the `:1261-1263`
  no-substring rule **for the group-scoped username/alias search path only**; the
  rule stays in full force for the private personal-name stores and the exact-match
  claim path (migration `20260721173000`) is excluded; the search RPC must gate on
  `is_group_member`. Quoted in full below.

### R-6, quoted as recorded (an OVERRIDE)

> **Ruling.** Step 4.3 closes on the fresh independent read-only audit **alone** —
> the single closure criterion the phase contract states:
> `docs/redesign/phases/04-log-a-game.md:476` **[REPO]**, "Step 4.3 is closed only
> after a fresh independent read-only audit passes." No deployment, migration, or
> contraction is a condition of Step 4.3 closure.
>
> **THIS IS A DELIBERATE OVERRIDE — recorded as an override, not as a reading of
> the contract.** `docs/AUTHORITATIVE_DOCUMENTS.md:11-18` **[PROJECT-DOC]** ranks
> `docs/CURRENT_STATUS.md` and `docs/REDESIGN_STATE.md` (authority rank 2) **ABOVE**
> `docs/redesign/phases/04-log-a-game.md` (rank 3). The added closure blockers —
> **`ID-READER-CONTRACT`, `ID-LEGACY-ORACLE`, and `STEP-4.3-AUDIT`** — live in
> those higher-ranked files and carry "Blocking: Step 4.3 closure". **On authority
> alone the rank-2 state files would win, and the phase contract would not.** PD-2
> recorded exactly this as unresolved because "nothing in the record says whether
> that addition was intended to amend the contract or merely to sequence the work".
> This ruling **overrides the authority ranking on this one point**: the owner
> rules the audit is the intended closure gate and the extra blockers were
> work-sequencing, not closure conditions. `STEP-4.3-AUDIT` — the fresh
> independent audit — is the surviving criterion, being the same thing the phase
> contract names; the override removes `ID-READER-CONTRACT` and `ID-LEGACY-ORACLE`
> as Step 4.3 *closure* gates.
>
> **Re-registration.** `ID-LEGACY-ORACLE` and `MATCHER-MANUAL-ENTRY-REPLACEMENT`
> are **re-registered as gates on PHASE 5 ENTRY** … They are not dissolved; they
> stop gating Step 4.3 closure and start gating Phase 5 entry. `ID-READER-DEPLOY`,
> `ID-READER-CONTRACT`, and contraction `20260722012707` keep their own separate
> release gates and are unaffected as release items; they simply no longer block
> Step 4.3 closure.

### R-8, quoted as recorded (an OVERRIDE)

> **Ruling.** The owner places the claim (peer-vouching) flow **inside Step 4.3**.
>
> **THIS IS A DELIBERATE OVERRIDE, and both the override and the prohibition it
> overrides are recorded explicitly.** `docs/redesign/phases/04-log-a-game.md:357`
> **[REPO]** lists **"implement registration-time claiming"** under **"Step 4.3
> must not:"** (`:355`). Step 4.3 as written **defers** claiming. The owner places
> the claim flow inside 4.3 **regardless of that prohibition.** The prohibition is
> **not deleted or reworded**; it is superseded **in place**, with a pointer
> recorded beside it in the phase file noting this override. (The prohibition text
> sits at `:357`; the assignment cited `:356`, which is the blank line above it —
> the same prohibition.)

### R-12, quoted as recorded (an OVERRIDE) — added in the follow-up completion commit

> **Ruling.** The rule at `docs/redesign/DECISIONS.md:1261-1263` — "No substring,
> prefix, fuzzy, or similarity matching" — is **narrowed, not repealed.** D-8
> requires **username substring search**; the owner **overrides that rule for the
> SEARCH PATH ONLY**, because the original rule protected matching against private
> personal-name stores (where a substring query is an oracle over data the subject
> never chose to expose), whereas the search matches a username the person selected
> and an alias they may set, inside a group they already belong to — different data,
> different act.
>
> **What this override does NOT touch:** the rule remains **in full force** for
> `private.player_private_identities`, `private.player_legacy_identities`, and any
> **normalized personal-name value** (the original is not deleted or reworded — the
> guest-identity oracle sequence depends on it); and the **claim path is explicitly
> excluded** — migration `20260721173000` hardened `list_claimable_player_profiles`,
> `claim_player_profile`, and `claim_player_profiles_by_name` to **exact whole-value
> matching** (3-character floor, 10-row cap), and those **remain exact-match.**
> **Build constraint:** the search RPC must gate on `is_group_member`, or
> "group-scoped" is a UI convention rather than a security boundary.

## The identity decision record D-1–D-33 (+ C-1, C-2, Q-1–Q-4) → `docs/redesign/DECISIONS.md`

New section "Phase 4 Step 4.3 — replacement player-identity, account, and vouching
model (decision record: D-1–D-33), 2026-07-23", recorded with the weight of a
decision that changes a governing contract, cross-referencing
`docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` as the contract it
affects and stating that the contract is **not edited here**. Grouped as: identity
and display (D-1–D-7), search and selection (D-8–D-14), accounts and credentials
(D-15–D-19), deletion (D-20–D-23), scope (D-24–D-27), vouch request lifecycle
(D-28–D-33); plus the build constraints that follow from D-32 and D-21/D-26, the
D-25 scale note, consequences C-1/C-2, and open questions Q-1–Q-4.

**C-1** and **C-2** are recorded as consequences neither chosen deliberately; C-2
names **Phases 9 and 11** and records that they are not edited on its strength.

**Q-1–Q-4** are recorded OPEN — repository reads queued at step 4.38, no owner
decision outstanding, none answered. Q-1 as recorded:

> **Q-1** — Does Supabase Auth support a 6-digit PIN credential, or does D-17
> require custom authentication or mapping the PIN onto a password field?

## Routed records → `docs/CURRENT_STATUS.md`

- **PD-1 disposition (R-5)** and the **six-item count (R-10)** appended under
  "Pending owner decisions" → PD-1.
- **PD-2 disposition (R-6, the OVERRIDE)** appended under PD-2.
- **PD-3 disposition (R-7, MOOT)** appended under PD-3.
- **Three dissolution annotations (R-11)** on the `GUEST-NAME-COLLISION-TERMINAL`,
  `DRAFT-NAME-RESIDUE`, and `GUEST-LABEL-REDIRTY` blocker rows — each **retaining**
  the row's disposition and Blocking value, recording the finding as REMOVED by the
  model rather than fixed.

## Routed records → phase documents

- **`04-log-a-game.md`** — a pointer beside the `:357` "implement registration-time
  claiming" prohibition recording that **R-8 overrides it for Step 4.3**. The
  prohibition is **retained, superseded in place** (a blockquote note after the
  "Step 4.3 must not:" list); nothing deleted or reworded.
- **`05-games-detail-and-replay.md`** — an additive "Phase 5 entry gates" section
  after Prerequisites, recording R-6's re-registration of `ID-LEGACY-ORACLE` and
  `MATCHER-MANUAL-ENTRY-REPLACEMENT` as Phase 5 entry gates (and noting Q-3 as open,
  unanswered).
- **`06-my-profile.md`** — an additive "Additive scope — 2026-07-23 identity design
  decision (D-24)" section after "My Profile scope"; the document is not
  restructured.

## Routed records → `docs/REDESIGN_STATE.md`

Current-substep note, next-action note, and the handoff registration at the head of
the `## Latest handoff` active group (this file).

---

## Evidence — commands run this session (all read-only) [GIT]

```
$ git remote get-url origin
https://github.com/Fochizzy/terraforming-mars-stats.git
$ git rev-parse --abbrev-ref HEAD
redesign/tm-stats-dashboard-rebuild
$ git rev-parse HEAD                                   # at start
9fc2c96f063c35737c092d5da661e12c794915be
$ git status --porcelain=v1                            # at start
(clean)
$ git rev-parse --git-dir
C:/Users/izzyh/Documents/Terraforming Mars/.git/worktrees/Terraforming-Mars-Redesign
$ git rev-parse --verify -q a301ce20aae23745d02f9c13d2119ffddd2991c8^{commit}
a301ce20aae23745d02f9c13d2119ffddd2991c8
$ git merge-base --is-ancestor a301ce20a HEAD ; echo $?
0                                                     # expected base is an ancestor of HEAD
$ git rev-list --left-right --count origin/redesign/tm-stats-dashboard-rebuild...HEAD
0	1                                                 # 0 behind, 1 ahead
```

Documentary reads are cited inline by `file:line` with evidence class. The design
and rulings are evidence class **[OWNER-DECISION]** — the owner's stated decision,
recorded from the assignment; this record does not and cannot executably verify a
design decision.

## Files changed (this session)

- `docs/redesign/DECISIONS.md` — two new sections: owner rulings R-5–R-12 (R-12
  added in the follow-up completion commit; see amendment at top), and the
  D-1–D-33 decision record with C-1/C-2 and Q-1–Q-4.
- `docs/CURRENT_STATUS.md` — PD-1/PD-2/PD-3 disposition notes, the six-item count,
  and three dissolution annotations on the blocker rows.
- `docs/REDESIGN_STATE.md` — current-substep note, next-action note, and this
  handoff's registration.
- `docs/redesign/phases/04-log-a-game.md` — pointer beside the `:357` prohibition
  (R-8 override), prohibition retained.
- `docs/redesign/phases/05-games-detail-and-replay.md` — additive Phase 5 entry
  gates section (R-6).
- `docs/redesign/phases/06-my-profile.md` — additive D-24 profile-screen section.
- `docs/agent-handoffs/PHASE-04-STEP-03-RECORD-IDENTITY-DESIGN-AND-RULINGS.md` —
  this handoff (the deliverable).

## Documents reviewed / updated / intentionally NOT changed

- **Read (this session, 2026-07-23):** `docs/CURRENT_STATUS.md`,
  `docs/REDESIGN_STATE.md`, `docs/redesign/DECISIONS.md`,
  `docs/redesign/phases/04-log-a-game.md`,
  `docs/redesign/phases/05-games-detail-and-replay.md`,
  `docs/redesign/phases/06-my-profile.md`,
  `docs/agent-handoffs/PHASE-04-STEP-03-CLOSURE-CRITERION-ESTABLISHED.md`
  (handoff template); git history at `f1f836ab7` for the R-1–R-4 series.
- **Updated:** the six files above plus this handoff — each an edit named in the
  brief's section 7.
- **Intentionally unchanged:**
  - **`docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`** — the
    contract this design affects. The brief forbids editing it; amending it is a
    separate owner act. Cross-referenced from the D-1–D-33 record instead.
  - **`docs/redesign/phases/09-*.md` and `docs/redesign/phases/11-*.md`** — C-2's
    consequence (D-19 gating reaches them) is recorded only; the brief forbids
    editing them on that basis.
  - **`docs/AUTHORITATIVE_DOCUMENTS.md`** — its maintenance rule fires only when a
    current authority is added, moved, superseded, or archived. No authority
    routing changed; recording rulings and a decision inside `DECISIONS.md` does
    not move authority. Not updated.
  - **`docs/redesign/MASTER-PLAN.md`** — its update triggers (project goals,
    governance rules, phase structure, durable architecture) are not met by a
    documentation-recording task that starts no phase and changes no direction.
    R-6/R-8 change what gates Step 4.3 closure and where the claim flow sits, both
    already captured in `DECISIONS.md`, the state files, and the phase files; the
    master plan's own "do not update for … work outside the explicitly assigned
    scope" rule applies. Not updated.
  - **`docs/redesign/MASTER-RULES.md`** — no architecture, data-integrity, or
    governance rule changed. Not updated.
  - **`docs/redesign/CLAUDE-PROJECT-SOURCES.json`** — no new catalogued cross-project
    source; handoffs are discovered by directory, not catalogued. Not updated.
  - **`DEPLOY-STATE.md`** (production lineage) — no production action occurred, so
    the production-action synchronization rule does not fire. Not touched.

## Known limitations and deliberately-retained statements

- This is a **recording**, not an adjudication or a build. The rulings and the
  design are **[OWNER-DECISION]**; no executable or production check was performed
  or is implied.
- The `ID-LEGACY-ORACLE`, `MATCHER-MANUAL-ENTRY-REPLACEMENT`, `ID-READER-CONTRACT`,
  and `STEP-4.3-AUDIT` blocker rows in `docs/CURRENT_STATUS.md` **retain their
  "Blocking" values**; R-6's re-registration is recorded in the PD-2 disposition
  note, in `DECISIONS.md` → R-6, and in the phases/05 entry-gates section, rather
  than by rewriting those rows. This keeps the change within the brief's section-7
  routing and the "retain and supersede rather than rewrite" convention.
- The dissolutions (R-11) are **prospective on the identity model being built** and
  fix nothing today.
- The assignment cited `04-log-a-game.md:356` for the registration-time-claiming
  prohibition; the bullet is at **`:357`** and the "Step 4.3 must not:" header at
  `:355`. The pointer was placed beside the actual prohibition and the off-by-one
  is noted in-line and in the report.

## Production and external effects

**None.** No production or external system was read or written. After the commit,
the post-commit planning-pack hook is expected to fire in this (the updater's) tree
and republish the pack from the committed filesystem; that automatic run is
expected behaviour, and its receipt belongs in the updater log and the task report,
not in a canonical document.

## Next approved action, and what is NOT approved

- **Next (owner's / future assignments, not started):** the four repository reads
  Q-1–Q-4 (queued at step 4.38); amending
  `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` to reflect the
  model; the skills audit (R-9) between Phase 4 and Phase 5; the fresh independent
  Step 4.3 closure audit; and building the identity model — each a separate future
  assignment.
- **NOT approved by this record:** answering or recommending an answer to any of
  Q-1–Q-4; editing the identity/privacy contract; editing phases 09 or 11; any
  code, schema, migration, RPC, or test; any push, merge, deploy, migration apply,
  or production write; beginning any phase or the identity build.

**No downstream work was started.**
