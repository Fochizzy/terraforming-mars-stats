# SUPERSEDE-COPY-READY-PROMPTS — superseding notes placed before four copy-ready prompt blocks; carried source left byte-identical

- **Date:** 2026-07-24
- **Branch:** `redesign/tm-stats-dashboard-rebuild` (redesign lineage)
- **Worktree:** the redesign primary,
  `C:\Users\izzyh\Documents\Terraforming Mars Redesign`
  (git-dir `.../Terraforming Mars/.git/worktrees/Terraforming-Mars-Redesign`) — the tree
  the planning-pack updater reads. No worktree was created.
- **Base commit:** `87e5fbd4ba080d3a1dc493349346bcdecf316cfc`
  (`SWEEP-MINIMUM-WINS-TO-ELIGIBILITY`), clean at start.
- **Category:** documentation-only annotation of phase documents. It is **not** a
  contract reconciliation, **not** an analytics decision, **not** an edit to any
  copy-ready block, **not** code, migration, schema, deploy, or production work.
- **Authorization held:** read-only git and repository inspection; adding notes
  immediately before `## Copy-ready agent execution prompt` blocks in
  `docs/redesign/phases/*.md` and nothing else; editing `docs/REDESIGN_STATE.md` to
  register this handoff; creating this one handoff; exactly one commit made with the Bash
  tool; reporting the publish receipt.
- **Authorization NOT held, and what did not occur:** no edit inside any copy-ready
  block — proven byte-identical below; no threshold value written anywhere; no
  line-number citation added; no other change to any phase document; no edit to any
  contract, `DECISIONS.md`, `CURRENT_STATUS.md`, or `MASTER-RULES.md`; no reclassification
  of `MATCHER-MANUAL-ENTRY-REPLACEMENT` and no destination assigned to
  `ID-READER-CONTRACT`; no revisiting of the prior sweep's class-B/C/D2/D3 dispositions;
  no AUD-5 or cross-file citation sweep; no code, migration, or schema change; no second
  commit; no push, merge, deploy, migration apply, rebase, force-push, or history rewrite.
  **No production read or write of any kind** — no Supabase MCP, no `execute_sql`, no
  `list_migrations`, no `wrangler`, no `/api/deploy-info`, no production SQL, no
  Cloudflare action. The planning-pack updater was **not** run by hand and
  `sync_installed_updater.py` was **not** invoked in any mode.

## Problem — why this existed

`SWEEP-MINIMUM-WINS-TO-ELIGIBILITY` (`87e5fbd4`) corrected fifteen phase-document sites
from wins-based eligibility to a pointer at owner ruling **R-14**. It correctly left three
sites alone: they sit inside `## Copy-ready agent execution prompt` blocks, which each
document's own **Preservation rule** declares to be verbatim carried source text. That
sweep recorded the consequence itself, as its class-D disposition: the superseded
instruction survived **in the one place most likely to be executed**, because a session
handed a phase assignment pastes the copy-ready prompt.

This work item removes that hazard **without touching the carried text**. Each affected
document's Preservation rule constrains "the source steps, their order, their dependencies,
and their stop conditions" — it governs the block's **content**. A note placed
**immediately before** the block leaves the quoted source byte-identical and satisfies the
preservation rule exactly, while ensuring anyone reading down to the prompt meets the
correction first. **No owner exception was needed and none was taken.** Rewriting inside a
block would have been the override, and would have made the document assert its source
said something it did not.

## What was done

**Four notes, one per affected block**, each placed between the
`## Copy-ready agent execution prompt` heading and the block's first line.

Notes are **plain (non-quoted) text**, deliberately: every block except Phase 7's is a
Markdown blockquote, so a quoted note could be mistaken for — or rendered as part of — the
carried source. Plain text keeps the blockquote unambiguously the only quoted material.

| Document | Block section | Ruling | What the note says is superseded |
|---|---|---|---|
| `09-individual-insights.md` | `INDIVIDUAL WIN DIFFERENTIAL` | **R-14** | hide **or qualify** when the minimum-wins threshold is not met |
| `12-improvement.md` | `IMPROVEMENT WIN DIFFERENTIAL RULES` | **R-14** | rules may use win point differential only above the minimum-wins threshold |
| `20-release-hardening.md` | `FINAL WIN DIFFERENTIAL VALIDATION` | **R-14** | "minimum wins" listed among conditions to regression-test |
| `18-objectives-endgame-and-chemistry.md` | first paragraph and the Group Chemistry gate | **R-15** | implement a transparent **Group Chemistry model** and define/test its expected-performance baseline |

Each note names its ruling, points at
`docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md` → "Universal eligibility
floor and per-metric display gates (owner ruling R-14, 2026-07-23)" (R-14 notes) or
`docs/redesign/DECISIONS.md` (R-15 note), and states plainly that the block is retained
verbatim as carried source and must not be executed as written on that point.

**No threshold value is restated.** R-14 is cited by identifier and via the contract's
section heading, which carries no number. The `DECISIONS.md` R-14 heading was deliberately
**not** quoted: it contains the value, and quoting it would have put the number into four
more documents — the **P-2** defect the previous session caught in its own draft, arriving
by the same route. Proven zero by grep over the added lines.

## A discrepancy the brief did not anticipate — recorded, not resolved

The brief characterised `09`'s instruction as wrong **twice**: wrong unit (R-14 counts
games played, not wins) and wrong behaviour (R-14 hides rather than qualifies). **The
second half is correct. The first half is not sound for these three sites**, and the notes
were written accordingly rather than to the brief's wording.

All three R-14 sites gate the **Win Point Differential** metric. R-14's own verification
caveat records that **the Win Point Differential metric keeps its own separate minimum-wins
gate**, as a per-metric threshold under R-14(b) distinct from the universal games-played
floor under R-14(a), "because a winner-margin metric needs wins" — and marks that
interaction **surfaced, not resolved** under process rule **P-1**. The underlying decision
(`DECISIONS.md` → "Phase 7 — Leaderboard eligibility and Confidence marker", the bullet
beginning "The Win Point Differential metric ranking keeps its own separate minimum-wins")
states the gate survives and that **its value is not yet set**.

A note asserting that these sites' wins unit is simply wrong would therefore have asserted
something the record contradicts. Each note instead states accurately that the
games-played floor applies **in addition**, that the per-metric mechanism is open
**analytics Q-1** so "the minimum-wins threshold" names no settled value, that R-14(c)'s
display gate supersedes the labelling clause, and that **whether the metric's own gate or
the universal floor governs these values is an owner question not decided here**.

## The sweep — every copy-ready block in `docs/redesign/phases/`

Fifteen documents carry a `## Copy-ready agent execution prompt` block; all fifteen were
examined against recorded rulings **R-5–R-17**, by text and not by line number.

**Found: four superseded instructions, against the three known.** One beyond the three —
`18`, under **R-15**.

**Corrected (4):** `09`, `12`, `20` (R-14) and `18` Group Chemistry (R-15).

**Reported, corrected nothing (6):**

- **`07-leaderboard.md`** — "Players appear after their first eligible game" and
  "Low-history ratings remain visible with sample-based provisional/Confidence
  presentation" sit against R-14(a)'s floor and R-14(c)'s hide-not-flag rule. **This is
  exactly open analytics Q-2**, recorded as surfaced-not-resolved; **R-13 declares Phase 7
  "correct as written and does not give way"**; and `DECISIONS.md` → "Phase 7 — Leaderboard
  eligibility and Confidence marker" states "no minimum-games gate removes anyone from the
  board". Annotating it would resolve Q-2 and override R-13.
- **`13-card-and-tag-analytics.md`** — "qualify low samples". R-14(c) governs only the
  **below-a-present-threshold** case; the contract expressly preserves "Low-sample
  categories remain visible unless an explicit filter excludes them" for the
  absent-threshold case, and the per-metric mechanism is open **Q-1**. Threshold-presence
  dependent. (`09`'s wording differs materially — it names a threshold that *is* present,
  "when the minimum-wins threshold is not met", so R-14(c) applies squarely there.)
- **`14-corporation-and-prelude-analytics.md`** — "confidence-adjusted win rate" and the
  configurable smoothing method stand against `CANONICAL-ANALYTICS-DEFINITIONS.md`'s
  corporation-weighting exclusion. That is open **analytics Q-7**, expressly "not discussed
  and not ruled". "Mark them experimental" is the same Q-1-dependent labelling question.
- **`17-competition-and-board.md`** — "overall point differential versus average opponents"
  states the metric as one value; **R-16** makes it two player-level metrics, of which this
  is only (b). R-16's own site list names four other sites and **not** this one, which of
  the two ranks is open **analytics Q-3**, and R-16 defines them "in shape but not
  completely". Calling the block superseded would be a stretched judgement.
- **`18-objectives-endgame-and-chemistry.md` — Award Funding ROI**, carried in the same
  sentence as the Group Chemistry instruction, stands against
  `CANONICAL-ANALYTICS-DEFINITIONS.md`'s award-calculation exclusion. Open **analytics
  Q-7**, unruled. **The note is scoped to Group Chemistry only and says so.**
- **Systemic, five blocks (`08`, `09`, `12`, `16`, `19`)** — all instruct building cards-bought
  pace / Card Acquisition Pace, which `DATA-CAPABILITIES.md` row 15 "Purchase pace" declares
  "Not currently possible from recorded data", **uncontested** (unlike rows 13 and 14, which
  now carry `[CONTESTED by R-17]` markers). **R-17** records a sample-log finding
  contradicting the derived ratio family but says explicitly the contradiction is "recorded,
  not acted on", and **analytics Q-8** is open. Not superseded by a ruling. Note also that
  R-17's citation of `DATA-CAPABILITIES.md:581-584` points at the canonical-formula list;
  the "Not currently possible" rows are further down the file — a citation defect, reported
  and not fixed.

**Examined, consistent with R-5–R-17, no action (5):** `05` (replay metrics, no eligibility
or ranking instruction); `10` (its chemistry instruction is already **conditional** — "keep
chemistry as an unimplemented or clearly defined future view until a transparent
expected-performance model exists" — which R-15 confirms rather than supersedes, the
material difference from `18`'s unconditional "implement … a transparent Group Chemistry
model"); `11` (mentions overall point differential only to require it stay distinct, which
R-16 does not disturb); `15`; and `17`'s opponent-adjustment half, which **R-15 expressly
preserves** because ELO supplies the per-opponent rating it needs.

## Evidence

- **[GIT]** Base `87e5fbd4ba080d3a1dc493349346bcdecf316cfc`, clean tree at start
  (`git status --porcelain=v1` empty); remote `Fochizzy/terraforming-mars-stats`.
- **[REPO]** Copy-ready blocks **byte-identical** — `sha256` of each block body extracted
  from `git show HEAD:<path>` and from the working tree, matching in all four files:
  `09` `e77b665a…`, `12` `258e50b8…`, `18` `cd90d94e…`, `20` `10e0b742…`.
- **[REPO]** `git diff --numstat` — `30 0`, `31 0`, `23 0`, `30 0`. **Zero deleted lines**
  across the change; pure insertion. One hunk per file, each anchored immediately after its
  copy-ready heading.
- **[REPO]** No threshold value: grep over the 95 added lines returns **0** for "three"
  (any case); every digit-bearing added line is a ruling/question/process identifier
  (`R-14`, `R-15`, `Q-1`, `Q-7`, `P-1`, `P-2`) or the ruling date `2026-07-23`.
- **[REPO]** No line-number citation: grep over added lines returns **0** for both
  `.md:NNN`/`:NNN` and "line NNN" forms.
- **[PROJECT-DOC]** R-14, R-15, R-16, R-17 and analytics Q-1–Q-9 read from
  `docs/redesign/DECISIONS.md`; the eligibility contract section from
  `docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md`; capability rows from
  `docs/redesign/DATA-CAPABILITIES.md`.

## Files changed

- `docs/redesign/phases/09-individual-insights.md` — note added before the block.
- `docs/redesign/phases/12-improvement.md` — note added before the block.
- `docs/redesign/phases/18-objectives-endgame-and-chemistry.md` — note added before the block.
- `docs/redesign/phases/20-release-hardening.md` — note added before the block.
- `docs/agent-handoffs/SUPERSEDE-COPY-READY-PROMPTS.md` — this file (new).
- `docs/REDESIGN_STATE.md` — handoff registered in the active group; outcome recorded.

## Documents reviewed, updated, intentionally unchanged

**Reviewed:** `CLAUDE.md`; `docs/CURRENT_STATUS.md`; `docs/AUTHORITATIVE_DOCUMENTS.md`;
`docs/REDESIGN_STATE.md`; `docs/redesign/MASTER-RULES.md`; `docs/redesign/DECISIONS.md`;
`docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md`;
`docs/redesign/DATA-CAPABILITIES.md`; all fifteen phase documents carrying a copy-ready
block; `docs/agent-handoffs/SWEEP-MINIMUM-WINS-TO-ELIGIBILITY.md`.

**Updated:** `docs/REDESIGN_STATE.md` (registration and outcome) and the four phase
documents above.

**Intentionally unchanged, each against its own maintenance rule:**

- `docs/CURRENT_STATUS.md` — its rule (and `AUTHORITATIVE_DOCUMENTS.md` → Maintenance)
  requires updating it together with `REDESIGN_STATE.md` when **current phase, blocker,
  release, migration, or next-action state** changes. **None changed**: this is an
  annotation of documents for phases that remain planned and not started, Step 4.3 remains
  blocked at its release boundary, and no blocker's disposition moved.
- `docs/AUTHORITATIVE_DOCUMENTS.md` — updated when an authority is **added, moved,
  superseded, or archived**. No authority moved; the notes point at existing authorities.
- `docs/redesign/DECISIONS.md` — updated when a **durable decision is approved**. None was;
  this records no ruling and decides nothing. R-14's Win-Point-Differential interaction and
  analytics Q-1–Q-8 remain open exactly as recorded.
- `docs/redesign/MASTER-RULES.md` and `docs/redesign/MASTER-PLAN.md` — updated on a change
  to project-wide direction, governance, phase structure, or durable architecture. None
  occurred; scope, sequencing, and gates are untouched.
- The four analytics contracts — **explicitly forbidden by the brief** and unnecessary: the
  contracts are the pointer target, not the defect. The contract's R-14 section does **not**
  carry R-14's Win-Point-Differential caveat; that is reconciliation work, reported here and
  deliberately not performed.
- `docs/redesign/CLAUDE-PROJECT-SOURCES.json` — no durable cross-project guidance document
  was created or promoted.

## Known limitations

- The notes annotate; they do not reconcile. The contracts still lag the rulings, and the
  copy-ready blocks still carry the superseded wording verbatim by design.
- **Whether carried source text may be corrected in place remains an OPEN OWNER QUESTION**
  (process rule P-1). This work item did **not** answer it and did not need to — the notes
  are adjacent, not inside.
- Six reported items above are uncorrected by design, five of them because the governing
  question (analytics Q-1, Q-2, Q-3, Q-7, Q-8) is open.
- `DATA-CAPABILITIES.md` row 15 "Purchase pace" may itself be stale now that per-generation
  cards-bought capture exists; establishing that requires evidence and was out of scope.

## Production and external effects

**None.** No production read or write, no deploy, no migration, no push, no merge. The only
external effect is the post-commit planning-pack synchronization required by the standing
gate, reported in the task report.

## Next approved action

**None. No downstream work is authorized by this handoff.** It does not authorize the
contract reconciliation, any phase, the closure audit, the reader deploy, the 7-argument
drop, contraction `20260722012707`, Phase 5, or Step 4.4. All twenty phase documents remain
planned and not started, and Step 4.3 remains blocked at its release boundary.
