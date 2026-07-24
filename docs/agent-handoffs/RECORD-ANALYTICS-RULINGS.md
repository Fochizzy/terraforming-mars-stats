# RECORD-ANALYTICS-RULINGS — owner analytics rulings and two process rules written into the canonical record; no contract reconciliation performed

**Headline.** `INSTALL-PHASE-PACK-05-20` surfaced conflicts between the sixteen
installed phase documents and the four analytics contracts; the owner has since ruled
on most of them in conversation, and none of it was recorded. This documentation-only
work item (`RECORD-ANALYTICS-RULINGS`) **writes it down**: analytics rulings
**R-13–R-17** and analytics open questions **Q-1–Q-9** into `docs/redesign/DECISIONS.md`;
the two standing process rules **P-1**/**P-2** into `docs/redesign/MASTER-RULES.md`; and
the Phase 2 undecided list **merged to one canonical home** (DECISIONS), with
`02-analytics-foundation.md` reduced to a pointer. It **does NOT perform the contract
reconciliation** those rulings imply — that is a separate, larger work item — and it
**resolves none** of Q-1–Q-9.

## Header — the facts

1. **Title.** Recorded the owner analytics rulings (R-13–R-17), the analytics open
   questions (Q-1–Q-9), the two process rules (P-1/P-2), and the Phase 2 list merge.
   Documentation only.
2. **Date.** 2026-07-23.
3. **Branch.** `redesign/tm-stats-dashboard-rebuild` (redesign lineage).
4. **Worktree.** `C:\Users\izzyh\Documents\Terraforming Mars Redesign` — the redesign
   primary, a git *linked* worktree (`git-dir …/worktrees/Terraforming-Mars-Redesign`)
   and the tree the planning-pack updater reads. **No worktree was created.**
5. **Base commit.** `9b031506a81ae4f3c3a833e166c30eb43317cf7d` (`9b031506`, the R-12
   completion of the identity recording). Clean tree at start. The recording session the
   brief said "should have landed ahead of you" is exactly this base.
6. **Category.** Documentation and record only. **NOT** code, a migration, a deploy, a
   production write, a push/merge, a schema/RPC/test change, or a phase advance. It
   **resolves no open question** and **reconciles no contract**.
7. **Authorization held (`RECORD-ANALYTICS-RULINGS` brief).** Read-only git and
   repository inspection; editing `MASTER-RULES.md` (P-1/P-2 only), `DECISIONS.md`
   (R-13–R-17, Q-1–Q-9, and the section-6 merge), `phases/02-analytics-foundation.md`
   (the section-6 pointer only, replacing lines 390-396), and `REDESIGN_STATE.md`
   (register handoff + outcome); creating one new handoff; exactly **one** commit;
   reporting the publish receipt.
8. **Authorization NOT held, and what did NOT occur.** No contract reconciliation and
   **no edit to any of the four analytics contracts** (`DATA-CAPABILITIES.md`,
   `CANONICAL-ANALYTICS-DEFINITIONS.md`, `ANALYTICS-REPOSITORY-QUERY-CONTRACTS.md`,
   `METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md`) — R-13/R-14 name lines as
   stale/wrong without editing them. **No edit to any phase document other than 02**, and
   in 02 only the section-6 pointer; the nine minimum-wins phase sites are **NOT
   corrected**. No resolution of any Q-1–Q-9. No deletion of the Phase 2 questions from 02
   without the pointer replacing them. No code, schema, migration, or test. No more than
   one commit. **No push, merge, deploy, migration apply, rebase, force-push, or history
   rewrite. No production read or write** — no Supabase, no Cloudflare, no production SQL.
   The updater was **not** run manually and `sync_installed_updater.py` was not run in any
   mode.

## What was recorded

### Process rules P-1, P-2 → `docs/redesign/MASTER-RULES.md`

New section "Conflict handling and canonical-home process rules" (after "Reporting
integrity"). Recorded as **standing process governance for all future work, not
analytics decisions**.

- **P-1** — a phase/contract conflict is never resolved by default; it is surfaced as an
  owner question; the authority order does not license a worker to act on the ranking
  silently; conflict-reporting is a **standing obligation** of any work item that installs
  or edits a phase document.
- **P-2** — one canonical home per fact; pointers everywhere else. Three live
  applications recorded: MASTER-PLAN/PAGE-ARCHITECTURE must point at the phase documents;
  the Phase 2 undecided list resolves to one home (done here); the planning-layer defect
  count itself is replicated and should collapse. Applying P-2 beyond the Phase 2 list is
  separate work.

### Analytics rulings R-13–R-17 and open questions Q-1–Q-9 → `docs/redesign/DECISIONS.md`

New section "Phase 2 / analytics — owner rulings R-13–R-17 …, 2026-07-23".

- **R-13** — the 2026-07-21 seasonal-ELO decision (`DECISIONS.md:1146-1204`) stands; the
  contracts are stale. Named stale lines, **not edited**: `DATA-CAPABILITIES.md:421`
  (rating + expected-result clauses superseded; adjusted-model conditional per R-15);
  `CANONICAL-ANALYTICS-DEFINITIONS.md`'s expected-score exclusion (`:134-138`); Phase 7 is
  correct and does not give way.
- **R-14** — minimum eligibility: a **three-game floor** (a); per-metric thresholds above
  it (b), mechanism undecided (Q-1); a threshold is a **display gate, not a labelling
  rule** (c). Nine/eight phase sites are wrong **in kind** — minimum WINS where the rule is
  minimum GAMES PLAYED (see caveats below).
- **R-15** — Group Chemistry (`18:85`) is unanchored and gives way; opponent-adjusted
  margin (`17:89`) survives because ELO supplies a per-opponent rating, with a recorded
  **Phase 7 dependency** (`DECISIONS.md:1204`). Different objects; not conflated.
- **R-16** — overall point differential is **two player-level metrics** (next-closest;
  field-average), both scaled by player count. Supersedes the "baseline undecided" state
  (Phase 2 `DECISIONS.md:643`; `DATA-CAPABILITIES.md:399`) and anchors `07:779`, `17:105`,
  `13:638`, `11:768`. Defined in shape; four sub-questions open (Q-3–Q-6).
- **R-17** — the **six card-acquisition primitives** (cards purchased ex-initial-deal;
  initial cards purchased + starting money from reference data; research-phase purchases;
  cards obtained free; total cards that entered hand; cards sold). The phase documents'
  ratio family is derived from them. **Sample-log finding [PRIOR]** (owner log examined
  2026-07-23): five of six appear recoverable from raw log content, contradicting
  `DATA-CAPABILITIES.md:581-584` — recorded, that line **not edited** (one log is not the
  corpus; immutable-reparse is Q-8).
- **Q-1–Q-9 (analytics)** — recorded OPEN, none answered, explicitly distinguished from the
  identity-design Q-1–Q-4 in the section above.

### Phase 2 undecided list merged to one home → `DECISIONS.md` canonical, `02` pointer

DECISIONS "Phase 2 questions that remain undecided" gains a canonical-home note (owner
ruling + reasoning + cross-reference to R-13/R-15/R-16). `02-analytics-foundation.md:390-396`
is **replaced in the same edit** with a pointer to that canonical home. See the diff below.

## The Phase 2 list diff — the finding (reported, not assumed)

Two lists existed: `02-analytics-foundation.md:390-396` (a compressed 9-item prose
paragraph) and `DECISIONS.md:637-661` ("Step 2.0 does not decide:", a 12-item bulleted
list). They are **not** the same list:

- **DECISIONS carries four entries `02` entirely lacks** (invisible to a reader of `02`
  only): the event-vs-aggregate model for card acquisition / Cards Seen; per-generation /
  final TR + duration + production/engine + board-coordinate capture contracts; which
  live-only DB/RPC/Storage objects become tracked production contracts; and migration /
  backfill for any of the above.
- **Wording drift on shared entries:** `02` frames overall point differential as its
  "**definition**", DECISIONS narrows it to "**baseline**"; `02` says "**approved** sample
  and coverage thresholds", DECISIONS says "**metric-specific**"; DECISIONS is generally
  the more detailed/precise wording.
- **`02` carries no entry DECISIONS lacks in coverage** — every `02` item maps to a
  DECISIONS item, several of which are broader.
- **Framing:** `02` "block corresponding Step 2.4 work"; DECISIONS "blockers for the
  specific later substeps … not permission to resolve them."

Per the owner ruling and P-2, the two collapse to the DECISIONS version (already the
superset) plus the pointer from `02`; nothing only-`02` needed adding. `R-16` independently
supersedes the "baseline/definition of overall point differential" item.

## Evidence — commands run this session (all read-only) [GIT]

```
$ git rev-parse --abbrev-ref HEAD          -> redesign/tm-stats-dashboard-rebuild
$ git rev-parse HEAD                        -> 9b031506a81ae4f3c3a833e166c30eb43317cf7d (base)
$ git status --porcelain=v1                 -> (clean at start)
$ git rev-parse --git-dir                   -> …/worktrees/Terraforming-Mars-Redesign
```

Documentary reads cited inline by `file:line`. Rulings are **[OWNER-DECISION]**; cited
repository lines are **[PROJECT-DOC]**/**[REPO]**; the R-17 sample-log observation is
**[PRIOR]**. Verified this session: the Elo decision `DECISIONS.md:1146-1231`; the
version-1 sole-winner Win Point Differential `:587-588`/`:615-616`; `DATA-CAPABILITIES.md`
`:399`/`:421`/`:581-584`; `CANONICAL-ANALYTICS-DEFINITIONS.md:134-138`;
`METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md:103-109` ("no universal threshold" at
`:105`); R-15 sites `17:89`/`18:85`; R-16 sites `07:779`/`17:105`/`13:638`/`11:768`; Q-7
sites `18:526`/`14:69`; and the eight R-14 win-based sites.

## Files changed (this session)

- `docs/redesign/MASTER-RULES.md` — new "Conflict handling and canonical-home process
  rules" section (P-1, P-2).
- `docs/redesign/DECISIONS.md` — new "owner rulings R-13–R-17" section (R-13–R-17 +
  analytics Q-1–Q-9) and the canonical-home note on the Phase 2 undecided list.
- `docs/redesign/phases/02-analytics-foundation.md` — lines 390-396 replaced by a pointer
  to the DECISIONS canonical home (section-6 merge only; no other edit).
- `docs/REDESIGN_STATE.md` — recording-outcome note and this handoff's registration at the
  head of the "Latest handoff" group.
- `docs/agent-handoffs/RECORD-ANALYTICS-RULINGS.md` — this handoff (the deliverable).

## Documents reviewed / updated / intentionally NOT changed

- **Read (2026-07-23):** `DECISIONS.md` (Phase 2 list, Elo decision, WPD metric),
  `02-analytics-foundation.md`, `DATA-CAPABILITIES.md`, `CANONICAL-ANALYTICS-DEFINITIONS.md`,
  `METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md`, phases 07/08/09/10/11/12/13/14/17/18/20
  (targeted), `MASTER-RULES.md`, `REDESIGN_STATE.md`.
- **Updated:** the five files above (each an edit named in the brief's section 8).
- **Intentionally unchanged:**
  - **The four analytics contracts** — R-13/R-14/R-17 name lines as stale/wrong; the brief
    forbids editing them (reconciliation is separate). Proven untouched by the commit diff.
  - **Every phase document except 02** — the nine minimum-wins sites and all other cited
    phase lines are **not** corrected here.
  - `docs/AUTHORITATIVE_DOCUMENTS.md`, `docs/redesign/MASTER-PLAN.md`,
    `docs/redesign/PAGE-ARCHITECTURE.md`, `CLAUDE-PROJECT-SOURCES.json`, `DEPLOY-STATE.md` —
    no authority routing changed, no production action, no new catalogued source. P-2 names
    MASTER-PLAN/PAGE-ARCHITECTURE as future pointer work but does not perform it.

## Known limitations and deliberately-retained statements

- This is a **recording, not a reconciliation**. The contracts still lag the rulings until
  a separately authorized reconciliation work item edits them.
- **The brief said "nine phase sites" but enumerated eight.** The eight are recorded
  (seven verbatim "enforce minimum-wins eligibility"; `07:470` a win-based test line,
  "qualifying-win aggregation"). No ninth was invented. The list is representative, not
  exhaustive — the pattern recurs at further sites (e.g. `07:867`, `10:324`, `11:305/404`,
  `12:669`, `09:790`, `20:746/787/820/1028`).
- `METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS`'s "no universal threshold" sentence is at
  `:105`; the brief cited `:109` (the end of the same rule block). Recorded at the precise
  line.
- The Win Point Differential metric's own minimum-wins gate (`DECISIONS.md:1192`, `:1231`)
  is a per-metric threshold under R-14(b), distinct from the universal games-played floor
  under R-14(a). Surfaced, not resolved (P-1).
- All Q-1–Q-9 remain OPEN; Q-8 and Q-9 are queued repository reads.

## Next approved action, and what is NOT approved

- **Next (future assignments, not started):** the contract reconciliation implied by
  R-13/R-14 (edit the stale/wrong lines; correct the minimum-wins → minimum-games sites);
  the repository reads Q-8/Q-9; deciding the per-metric threshold mechanism (Q-1) once real
  data exists; the P-2 pointer collapses for MASTER-PLAN/PAGE-ARCHITECTURE and the defect
  count.
- **NOT approved by this record:** answering or recommending any Q-1–Q-9; editing any
  analytics contract; editing any phase document other than 02; correcting the minimum-wins
  sites; any code, schema, migration, RPC, or test; any push, merge, deploy, migration
  apply, or production write; beginning any phase.

**No downstream work was started.**
