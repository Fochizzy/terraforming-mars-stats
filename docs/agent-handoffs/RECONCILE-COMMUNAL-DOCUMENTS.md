# RECONCILE-COMMUNAL-DOCUMENTS — owner rulings R-13–R-17 applied across the seven communal documents; three contracts corrected in place (originals retained), two descriptive documents de-duplicated to pointers, the Phase 2 merge verified already-done, the master guide left for separate handling

**Headline.** `RECORD-ANALYTICS-RULINGS` (`fe3f1538f`) recorded owner rulings
**R-13–R-17** and process rules **P-1/P-2** but deliberately edited none of the four
analytics contracts and neither descriptive communal document, so seven communal
documents still described the pre-install world. This documentation-only work item
applies those rulings to the seven: **Group B** corrects `DATA-CAPABILITIES.md`,
`CANONICAL-ANALYTICS-DEFINITIONS.md`, and `METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md`
in place (supersede / contest, **originals retained**); **Group A** de-duplicates
`PAGE-ARCHITECTURE.md` to pointers and adds navigation pointers to `MASTER-PLAN.md`
(which carried **no** restatement to strip); **Group C** verifies the Phase 2 list
merge already performed by `RECORD-ANALYTICS-RULINGS` and does **not** redo it; the
master guide is reported as a binary `.docx` and left untouched. **No open question is
resolved, no phase document is edited, and no minimum-wins site is corrected** — the
minimum-wins → minimum-games sweep and the master-guide handling remain separate work.

## Header — the eight facts

1. **Title.** Applied owner rulings R-13–R-17 (and P-2's canonical-home principle)
   across the seven communal documents. Documentation only.
2. **Date.** 2026-07-23.
3. **Branch.** `redesign/tm-stats-dashboard-rebuild` (redesign lineage).
4. **Worktree.** `C:\Users\izzyh\Documents\Terraforming Mars Redesign` — the redesign
   primary, a git *linked* worktree (`git-dir …/worktrees/Terraforming-Mars-Redesign`)
   and the tree the planning-pack updater reads. **No worktree was created.**
5. **Base commit.** `ffa6a17ed4ef564b77309a36adc7b1c08622ca29` (`ffa6a17ed`, the
   `RECORD-IDENTITY-FEASIBILITY-FINDINGS` recording). Clean tree at start; 0 behind /
   5 ahead of `origin/redesign/tm-stats-dashboard-rebuild`.
6. **Category.** Documentation and record only. **NOT** code, schema, a migration, a
   deploy, a production read/write, a push/merge, an RPC/test change, or a phase
   advance. It **resolves no open question** and **reconciles no phase document**.
7. **Authorization held (`RECONCILE-COMMUNAL-DOCUMENTS` brief).** Read-only git and
   repository inspection; editing `MASTER-PLAN.md`, `PAGE-ARCHITECTURE.md`,
   `DATA-CAPABILITIES.md`, `CANONICAL-ANALYTICS-DEFINITIONS.md`,
   `METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md`, and the master guide *if* safely
   editable; editing `02-analytics-foundation.md` for the section-7 pointer only;
   editing `REDESIGN_STATE.md` to register the handoff and record the outcome; creating
   one new handoff; exactly **one** commit; reporting the publish receipt.
8. **Authorization NOT held, and what did NOT occur.** **No edit to any phase
   document** — the `02` pointer was already in place from `RECORD-ANALYTICS-RULINGS`
   and was verified, not re-touched. **No correction of `DATA-CAPABILITIES:581-584`**
   (marked CONTESTED, not resolved). **No touch to `CANONICAL`'s award or
   corporation-weighting exclusions.** **No weakening of `METRIC-SAMPLE-COVERAGE:105`
   and no per-metric threshold mechanism invented.** **No minimum-wins phase site
   edited** — none of the eight cited nor the ten further ones named in the brief's
   section 8. **No open question resolved.** No conversion or reformat of the master
   guide. No code, schema, migration, or test. No more than one commit. **No push,
   merge, deploy, migration apply, rebase, force-push, or history rewrite. No
   production read or write — no Supabase, no Cloudflare, no production SQL.** The
   updater was **not** run manually; `sync_installed_updater.py` was not run in any
   mode.

## Problem — why this existed

`INSTALL-PHASE-PACK-05-20` (`010079cf`) installed sixteen phase documents (05-20) under
a brief that forbade reconciliation; it reported every phase-vs-contract conflict and
resolved none. `RECORD-ANALYTICS-RULINGS` (`fe3f1538f`) then recorded the owner's
resolutions — rulings **R-13–R-17**, open questions **Q-1–Q-9**, and process rules
**P-1/P-2** — but explicitly edited **none** of the four analytics contracts and
neither descriptive communal document. Seven communal documents therefore still
described the pre-install world. This work item applies the recorded rulings to those
seven. The risk is latent (nothing is built to these specs yet) but real: a session
assigned a later phase would read a stale communal contract and build to the wrong
definition.

## Governing principles applied (from the brief, section 4)

- **DE-DUPLICATE, DO NOT SYNCHRONISE** (Group A): replace a restatement with a pointer;
  never copy the phase document's current wording across.
- **SUPERSEDE, DO NOT REWRITE** (Group B): mark a now-false statement superseded with
  the date and the falsifying ruling, and **retain the original text**.

## What changed — per document (the seven)

### B-1 `docs/redesign/DATA-CAPABILITIES.md` — corrected in place; every original retained (65 ins / 6 del)

The 6 "deletions" are the six lines to which an inline marker was appended; every
original word is retained on each. Two reconciliation-note blocks carry the detail.

- **`:399` "Overall point differential … without a definition"** — inline
  `[SUPERSEDED IN PART by R-16, 2026-07-23]` marker appended; the note records that
  **R-16** defines it as two player-level metrics (next-closest; field-average) and
  that the definition is **directional, not complete** — four open sub-questions
  (analytics **Q-3–Q-6**) remain.
- **`:421` "no rating, expected result, or adjusted model exists"** — the three clauses
  are marked **separately**: **rating** and **expected result** superseded by **R-13**;
  **adjusted model** **split per R-15** — opponent-adjusted margin now has an anchor
  (ELO per-opponent rating, Phase 7 dependency) and stands, while the Group-Chemistry
  expected-performance model has no anchor and the clause still holds for it.
- **`:581-584` rows 11-14 (the derived ratio family)** — marked **CONTESTED by R-17**,
  **not corrected**; the R-17 note records both sides: the contract's "not currently
  possible" (primitives unpersisted) and R-17's **[PRIOR]** sample-log finding that five
  of six primitives appear recoverable, with the contradiction left open pending
  analytics **Q-8**. The classification is unchanged.

### B-2 `docs/redesign/CANONICAL-ANALYTICS-DEFINITIONS.md` — expected-score superseded; award/corp-weighting untouched (22 ins / 0 del)

A reconciliation note was appended after the "Explicit exclusions" paragraph, which is
**retained verbatim**. It marks only the **expected-score** item **SUPERSEDED by R-13**
(efficiency, style, and the rest unaffected), and records that the **award-calculations**
and **corporation/pairing-weighting** exclusions **stand** and are open analytics
question **Q-7** (a pointer only; those exclusions' own text is unchanged).

### B-3 `docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md` — R-14 rules added; `:105` intact (29 ins / 0 del)

`:105` "There is no universal low-sample threshold" is **left intact** (R-14 upheld it —
the first conflict to resolve in the contract's favour). A new section records the three
R-14 rules as **distinct** additions: a **three-game universal eligibility floor**
(profile-existence gate, below which a profile does not appear at all — explicitly not a
reintroduced universal low-sample threshold); **per-metric** thresholds above the floor;
and a threshold as a **display gate** (hidden below, not flagged). The per-metric
**mechanism** is recorded **OPEN** as analytics **Q-1**; none is invented.

### A-1 `docs/redesign/MASTER-PLAN.md` — NO restatement found; navigation pointers added (23 ins / 0 del)

**Verified first, per the brief's revised A-1:** MASTER-PLAN carries **no per-phase
scope restatement for phases 5-20**. Its Phase Roadmap (§7) details only Phases 1-2 and
jumps to §8; the only Phase-5+ mention is the governance line `:507` ("do not begin …
Phase 5"), retained; the install `010079cf` never touched this file. **The correct
outcome was therefore NO STRIP.** The one authorized addition (revised A-1): navigation
pointers were **absent** — §19 "Phase files" listed only `01`/`02` — so the inventory was
completed to the full existing set `00`–`20`, **paths only, no content summary**. This is
the "adding pointers where none existed → insertions without deletions" case.

### A-2 `docs/redesign/PAGE-ARCHITECTURE.md` — per-page specification de-duplicated to pointers (17 ins / 26 del)

**Verified first:** the "## Page responsibilities" section carried per-page scope
specification now owned by phases 5-20. The seven primary-analytics page descriptions
(My Profile, Global Insights, Individual Insights, Group Insights, Compare, Improvement,
Leaderboard) were **replaced with path-only pointers** to their governing phase
documents (06, 08, 09, 10, 11 [+19], 12 [+19], 07), plus a pointer for Games
Library/Detail/Replay to 05. Cross-page structure and navigation (primary navigation,
supporting destinations, target routes, Phase 3 route ownership) is **unchanged**. The
three destinations **not** governed by a phase 5-20 document — **Log a Game** (Phase 4),
**Card Database**, **Glossary** — retain their descriptions verbatim. **More deletions
than insertions** proves de-duplication, not synchronisation.

### A-3 `docs/redesign/reference/TM-Stats-Redesign-Master-Guide.docx` — binary `.docx`, left untouched (0 / 0)

`file` reports **Microsoft Word 2007+** (binary `.docx`, 171 KB). Per A-3 it cannot be
edited safely within this work item's scope. It was **read for format only, not
converted, not reformatted, not edited.** It needs its own handling; the Elo decision
(R-13) already overrode its weighted-score default, and more corrections may follow.

### C-1 `docs/redesign/phases/02-analytics-foundation.md` — Phase 2 merge already done; VERIFIED, not redone (0 / 0)

`RECORD-ANALYTICS-RULINGS` (`fe3f1538f`) already performed this merge. Verified against
git history: at parent `9b031506a`, `02:390-396` held a nine-item prose list ("The
following remain undecided and block corresponding Step 2.4 work: …"); `fe3f1538f`
replaced it, in the same edit, with a canonical-home pointer to
`DECISIONS.md` → "Phase 2 questions that remain undecided" (present now at `02:390-399`).
The questions were **not** left deleted without a pointer. **Not redone.** The two-list
diff is reported below.

## The Phase 2 two-list diff (C-1) — independently re-derived, reported not assumed

Pre-merge `02:390-396` (nine-item prose, `git show 9b031506a`) versus the canonical
`DECISIONS.md` "Step 2.0 does not decide" list (twelve items, `:651-670`):

- **DECISIONS carried FOUR items `02` entirely lacked** — invisible to a reader of `02`
  alone, and the drift **is** the finding:
  1. the event-versus-aggregate model, identity, reconciliation, provenance, and
     exhaustive coverage for card acquisition and Cards Seen (`DECISIONS:664-665`);
  2. authoritative per-generation/final TR, duration, production/engine, and board
     coordinate capture contracts (`:666-667`);
  3. which live-only database, RPC, or Storage objects become tracked production
     contracts (`:668-669`);
  4. a migration or backfill for any of the above (`:670`).
- **Wording drift on shared items:** `02` framed overall point differential as its
  "**definition**"; DECISIONS narrows it to "**baseline**" (`:655`). `02` said
  "**approved** sample and coverage thresholds"; DECISIONS says "**metric-specific**"
  (`:659`). DECISIONS is the more detailed wording throughout.
- **`02` carried no item DECISIONS lacked** in coverage — every `02` item maps to a
  DECISIONS item, several of which are broader.
- **Framing:** `02` "block corresponding Step 2.4 work"; DECISIONS "blockers for the
  specific later substeps … not permission to resolve them" (`:672-673`).

The merge collapsed the two to the DECISIONS superset plus the `02` pointer; nothing
only-`02` needed adding. **R-16** independently supersedes the overall-point-differential
item's undecided state.

## Evidence — commands run this session [GIT]/[REPO]

```
$ git rev-parse --abbrev-ref HEAD          -> redesign/tm-stats-dashboard-rebuild
$ git rev-parse HEAD                        -> ffa6a17ed4ef564b77309a36adc7b1c08622ca29 (base)
$ git status --porcelain=v1                 -> (clean at start)
$ git rev-parse --git-dir                   -> …/worktrees/Terraforming-Mars-Redesign
$ git remote get-url origin                 -> https://github.com/Fochizzy/terraforming-mars-stats.git
$ git rev-list --left-right --count @{upstream}...HEAD -> 0  5 (0 behind, 5 ahead)
$ git rev-parse --verify -q 010079cf^{commit}   -> resolves (phase-pack install)
$ git rev-parse --verify -q fe3f1538f^{commit}  -> resolves (RECORD-ANALYTICS-RULINGS; R-13 present)
$ git show fe3f1538f -- .../02-analytics-foundation.md -> the 02 merge edit
$ git show 9b031506a:.../02-analytics-foundation.md    -> the pre-merge nine-item list
$ git diff --numstat (the five edited communal docs) -> counts recorded per document above
```

Rulings are **[OWNER-DECISION]** (recorded in DECISIONS by `RECORD-ANALYTICS-RULINGS`);
cited repository lines are **[PROJECT-DOC]**/**[REPO]**; the R-17 sample-log observation
is **[PRIOR]**; production ledger/deploy state is untouched and unread this session.

## Files changed (this session)

- `docs/redesign/DATA-CAPABILITIES.md` — B-1 (markers + two reconciliation notes).
- `docs/redesign/CANONICAL-ANALYTICS-DEFINITIONS.md` — B-2 (one reconciliation note).
- `docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md` — B-3 (R-14 section).
- `docs/redesign/PAGE-ARCHITECTURE.md` — A-2 (page responsibilities de-duplicated).
- `docs/redesign/MASTER-PLAN.md` — A-1 (§19 Phase-files navigation pointers).
- `docs/REDESIGN_STATE.md` — recording-outcome note + this handoff's registration.
- `docs/agent-handoffs/RECONCILE-COMMUNAL-DOCUMENTS.md` — this handoff (the deliverable).

## Documents reviewed / updated / intentionally NOT changed

- **Read (2026-07-23):** `DECISIONS.md` (R-13–R-17, Q-1–Q-9, Phase 2 list, canonical-home
  note), `RECORD-ANALYTICS-RULINGS` handoff, `CURRENT_STATUS.md`,
  `AUTHORITATIVE_DOCUMENTS.md`, `REDESIGN_STATE.md`, the five edited communal docs,
  `02-analytics-foundation.md`, the master guide's format.
- **Updated:** the seven files above (five communal edits + REDESIGN_STATE + this handoff).
- **Intentionally unchanged:**
  - **`docs/CURRENT_STATUS.md`** — its maintenance rule (update when current phase,
    blocker, release, migration, or next-action state changes) is **not met**: this
    documentation reconciliation changed none of those. The brief's AUTHORIZED list also
    names only `REDESIGN_STATE.md`.
  - **The master guide `.docx`** — binary, out of safe-edit scope (A-3).
  - **Every phase document, including `02`** — this work item edits communal documents
    only; the `02` pointer already existed and was verified, not re-touched.
  - **CANONICAL's award and corporation-weighting exclusion text** — Q-7, unruled; a
    pointer was added but the exclusion text is unchanged.
  - **`DATA-CAPABILITIES:581-584` classification** — CONTESTED, not corrected.
  - **`METRIC-SAMPLE-COVERAGE:105`** — upheld by R-14, left intact.
  - **The minimum-wins phase sites** — the eight cited (`07:470`, `08:209`, `09:242`,
    `10:225`, `11:207`, `12:243`, `17:139`, `20:781`) and the ten further named
    (`07:867`, `09:790`, `10:324`, `11:305`, `11:404`, `12:669`, `20:746`, `20:787`,
    `20:820`, `20:1028`) — untouched; correcting them is a separate sweep.
  - **`GUEST-PLAYER-IDENTITY-AND-PRIVACY`, `ANALYTICS-REPOSITORY-QUERY-CONTRACTS`,
    `ANALYTICS-SCOPE-CAPABILITY-MODEL`, `SHARED-FILTER-URL-STATE-CONTRACTS`,
    `COMBINED-DASHBOARD-FOUNDATION`, `SHARED-ASSET-FOUNDATIONS`** — no ruling touches
    them; none was edited and no conflict was found in them.
  - **`docs/AUTHORITATIVE_DOCUMENTS.md`, `CLAUDE-PROJECT-SOURCES.json`,
    `DEPLOY-STATE.md`** — no authority routing changed, no new catalogued source, no
    production action.

## Discrepancies (reported, not resolved)

- **X-1 — the brief's A-1 premise did not hold.** The brief's section 1 said a Phase 5
  session "would read MASTER-PLAN's Phase 5 scope"; MASTER-PLAN carries no such scope
  (roadmap stops at Phase 2; install never touched it). The brief's own **revised** A-1
  anticipated this and made **no edit** the correct outcome, with navigation pointers the
  one authorized addition — which is what was done.
- **X-2 — parallel "no rating" claims left uncited by the rulings.** `DATA-CAPABILITIES`
  "### Context adjustment requirements" carries "Player strength … no rating" and
  "Opponent strength … no rating" rows that R-13's logic would also bear on, but R-13
  enumerated only `:421` among DATA-CAPABILITIES rows. **Not corrected** (uncited);
  surfaced for the reconciliation sweep.
- **X-3 — `MASTER-PLAN` §19 "Phase files" was incomplete** (listed only `01`/`02` when
  `00`–`20` exist). Treated as the authorized navigation-pointer addition, not a strip.

## Known limitations and deliberately-retained statements

- This is a **reconciliation of the communal documents to the rulings**, not a
  reconciliation of the **phase documents**. The minimum-wins → minimum-games correction
  across the phase sites remains a separate sweep (brief section 8).
- Every superseded/contested statement **retains its original text**; the markers and
  notes are additive.
- The master guide is unreconciled and needs its own handling.
- All of Q-1, Q-3–Q-9 remain **OPEN**; none was answered.

## Production and external effects

**None.** No Supabase, no Cloudflare, no production SQL, no deploy, no migration apply,
no push, no merge. `DEPLOY-STATE.md` was neither read nor written. The post-commit
planning-pack synchronization is expected to run via the committed hook in this (the
updater's) tree; its receipt is `last-run-summary.json` (`success: true`, counts summing
to the document total), reported in the task report — not written into any canonical
document.

## Next approved action, and what is NOT approved

- **Next (future assignments, not started):** the minimum-wins → minimum-games phase
  sweep; the master-guide `.docx` handling; the P-2 collapse of the planning-layer
  defect-count replication; the Q-8/Q-9 repository reads; deciding the per-metric
  threshold mechanism (Q-1) once real data exists.
- **NOT approved by this record:** answering or recommending any open question; editing
  any phase document; correcting any minimum-wins site; any code, schema, migration, RPC,
  or test; any push, merge, deploy, migration apply, or production write; beginning any
  phase.

**No downstream work was started.**
