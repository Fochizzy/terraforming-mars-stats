# SWEEP-MINIMUM-WINS-TO-ELIGIBILITY — wins-based eligibility in the phase documents is corrected to point at the R-14 contract; documentation only; 15 class-A sites in 8 documents, one supersession note per document, no threshold value restated

**Headline.** The phase layer no longer instructs a builder to enforce
**wins-based** eligibility. **Fifteen** class-A sites across **eight** phase
documents now **point at**
`docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md` instead of
asserting "minimum-wins eligibility". **No threshold value was written into any
phase document**, and **no line-number citation was added anywhere**. The cited
lists were **again a subset**: they named **eighteen** sites, of which only
**fourteen** were class A; the sweep found **one further class-A site** and
**twenty-seven** further sites in the other classes, **forty-two** in total.
**Nothing was built, applied, deployed, pushed, merged, or read from
production.**

## Header — the eight facts

1. **Title.** Documentation-only correction of wins-based eligibility language
   in `docs/redesign/phases/` to a pointer at the R-14 eligibility contract
   (work item `SWEEP-MINIMUM-WINS-TO-ELIGIBILITY`). Fifteen class-A sites
   corrected in place; one supersession note per affected document; this handoff
   plus one `REDESIGN_STATE.md` registration, in one commit.
2. **Date.** 2026-07-24.
3. **Branch / lineage.** `redesign/tm-stats-dashboard-rebuild` (redesign
   lineage).
4. **Worktree.** None created. Work performed in the redesign **primary**
   checkout `C:\Users\izzyh\Documents\Terraforming Mars Redesign`
   (git-dir `.../worktrees/Terraforming-Mars-Redesign`) per brief §3 — the tree
   the planning-pack updater reads, so the post-commit publish receipt is
   obtainable.
5. **Base commit.** `813af7c588d3e3a7231815ef43f51ed795c49070` — HEAD at start,
   the record-navigability remediation commit. Working tree **clean** at start
   `[GIT]`.
6. **Category.** Error correction in accepted design documents, documentation
   only. It **builds nothing and decides nothing**. It is not a ruling, not an
   analytics decision, not authorization to begin Phase 7–20 or any part of
   them, and not a resolution of open analytics question **Q-1**.
7. **Authorization held.** Read-only git and repository inspection; editing
   `docs/redesign/phases/*.md` — class-A sites and the per-document supersession
   notes only; editing `docs/REDESIGN_STATE.md` to register this handoff and
   record the outcome; creating **one** new handoff; **exactly one** commit made
   with the **Bash** tool; reporting the publish receipt.
8. **Authorization NOT held, and what did not occur.** No threshold value
   restated in any phase document — proven zero (§E-3). No per-metric threshold
   mechanism invented or specified; **Q-1 remains open**. No class-B or class-D
   site touched (§E-5, §E-6). No change to any phase document beyond a class-A
   site and its document's supersession note. `METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md`
   and every other contract **unedited**. **No line-number citation added
   anywhere** — proven zero (§E-4). `MATCHER-MANUAL-ENTRY-REPLACEMENT` **not
   reclassified**; `ID-READER-CONTRACT` **given no destination**. **AUD-5 not
   fixed**; the cross-file citation sweep **not performed**. No code, migration,
   or schema. No second commit. No push, merge, deploy, migration apply, rebase,
   force-push, or history rewrite. **No production access of any kind:** no
   Supabase MCP, no `execute_sql`, no `list_migrations`, no `wrangler`, no
   `/api/deploy-info`, no direct database connection, no Cloudflare action. The
   planning-pack updater was **not** run by hand and `sync_installed_updater.py`
   was not invoked in any mode.

## What the defect was

Owner ruling **R-14** sets a universal eligibility floor counting **games
played**. Multiple phase documents instructed a builder to "enforce
**minimum-wins** eligibility". That is wrong **in kind**, not merely in value —
it counts the wrong thing. A phase document is accepted design at rank 4, so a
session assigned Phase 8 or 10 would have built wins-based eligibility from it
and the error would have surfaced only at review.

## The sweep — the cited lists were a subset, for the fifth time

Both cited lists were treated as samples, and both were. Swept **all** of
`docs/redesign/phases/` (22 files) by **text**, not line number, across
`eligib*`, `minimum*`, `qualif*`, and `threshold` language bearing on who
appears in a metric.

| | Count |
|---|---|
| Sites named by the two cited lists | 18 |
| Of those, actually class A | **14** |
| Of those, class C (the brief's own example) | 1 |
| Of those, class D (carried source text) | 3 |
| **Further class-A sites the lists missed** | **1** |
| **Class A total, corrected** | **15** |
| Class B — games-based filter fields, already correct, untouched | 10 |
| Class C — win-based test/acceptance assertions, not eligibility, untouched | 6 |
| Class D — reported, corrected nothing | 11 |
| **Total sites found and classified** | **42** |

**The lists were not complete.** The one class-A site neither list named is the
`Validate win point differential analytics` row of `Expanded working sequence`
in `20-release-hardening.md` — a step-index table cell reproducing the same
source contract. Beyond class A, neither list named any of the 27 class-B/C/D
sites.

## Classification — four shapes, and why blind substitution would have broken text

The canonical class-A line has **three clauses**, only the middle one wrong:
"Show qualifying wins and total games, **enforce minimum-wins eligibility**, and
aggregate from qualifying game-level margins." The display clause and the
aggregation clause are correct and were preserved. A find-and-replace on the
line would have destroyed both.

- **A — wins-based eligibility rule (15, corrected).** Sites asserting that
  *eligibility* is determined by a minimum number of **wins**. The marker is the
  word **eligibility** attached to a wins-based minimum.
- **B — games-based filter field (10, untouched).** `Minimum games` as a UI
  population filter, and `minimum-games` / `minimum-game filtering` references,
  in `07-leaderboard.md` and `17-competition-and-board.md`. **Already correct** —
  a population filter is not the eligibility rule. The brief anticipated **two**
  such sites in phase 07; there are **six** in 07 and **four** in 17.
- **C — win-based test or acceptance assertion (6, untouched).** They assert an
  *aggregation* or *display* property that happens to involve wins, not
  eligibility, so per the brief they were reported and left: the
  `qualifying-win aggregation` test line and the `Preserve qualifying-win counts`
  requirement in 07; the qualifying-win-sample acceptance items in 09, 10 and 12;
  and the aggregation-weighting test line in 20.
- **D — reported, corrected nothing (11).** Three sub-groups, below.

## Class D in full — every site, and why it was left

**D1 — carried source text (3 sites: 09, 12, 20).** Each sits under
`## Copy-ready agent execution prompt`, and each file's own **Preservation rule**
declares the source steps unchanged and the text carried from
`TM_Stats_Redesign_Integrated_Full_Implementation_Guide_2026-07-19_Expanded_Step_4_3(5).docx`.
Rewriting them would make the document assert that its source said something it
did not. **Whether carried source text may be corrected in place is an owner
question and has not been decided** — process rule **P-1**: a worker records the
conflict and stops at recording.

- `09-individual-insights.md`, `INDIVIDUAL WIN DIFFERENTIAL` — "Hide or qualify
  these when the minimum-wins threshold is not met." This conflicts with R-14
  **twice**: the gate is games-played, not wins; and under R-14 a result below a
  present threshold is **hidden, not shown flagged as low-sample**, so "or
  qualify" is superseded independently.
- `12-improvement.md`, `IMPROVEMENT WIN DIFFERENTIAL RULES` — "only above the
  minimum-wins threshold".
- `20-release-hardening.md`, `FINAL WIN DIFFERENTIAL VALIDATION` — "minimum
  wins" among the properties to regression-test.

**This is a live hazard, not a closed item.** The copy-ready prompt is the text
most likely to be pasted and executed verbatim. Each of the three documents'
supersession notes states the residue explicitly and warns the reader not to
build from it unaltered.

**D2 — wins-based per-metric gates deferred to Q-1 (7 sites: 07 ×1, 09 ×3,
12 ×3).** R-14 **permits** per-metric thresholds above the games-played floor,
and the **mechanism** by which a metric declares its own threshold is **open
analytics question Q-1**. Whether a win-margin metric — whose observation unit
*is* qualifying wins — may count its own threshold in qualifying wins is exactly
what Q-1 defers. Correcting these would require inventing the mechanism the brief
forbids inventing, so they were left and reported.

- `07-leaderboard.md`, `Cross-cutting contract — Win point differential
  analysis` — "Require a visible minimum number of qualifying wins".
- `09-individual-insights.md`, `Step 9.2 — Implement Overview` — "Win margin
  trend and distribution when the player has enough qualifying wins", appearing
  as the spec bullet, its `Stage C` checklist echo, and its completion-gate echo.
- `12-improvement.md`, `Step 12.2 — Create deterministic rules` — "Use win point
  differential only when the player has enough qualifying wins", in the same
  three positions.

**These were the hardest call in the work item.** `07`'s "Require a visible
minimum number of qualifying wins" and `12`'s "only when the player has enough
qualifying wins" are the same shape, and consistency required treating them
alike. Neither says *eligibility*; both read as per-metric gates. They were
classified D deliberately, on the brief's own tiebreak that an honest D is worth
more than a forced A.

**D3 — a deferred owner decision R-14 may now bear on (1 site: 07).** The
`Minimum-history threshold` row of the deferred-decisions table in
`07-leaderboard.md` reads "Controls eligibility language and any minimum-games
filter defaults / Explicit owner decision before final ranking eligibility
behavior". It is **games-based**, so not class A. R-14 arguably now supplies part
of what that row defers, but deciding that is an owner ruling, not this work
item's to make. Recorded, untouched.

## The correction — pointer, not restatement

Every class-A site now reads, in its own grammar, *"the eligibility rules
recorded for owner ruling R-14 in
`docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md`"*. Three
sentence shapes were needed because the surrounding clauses differ; each was
edited to preserve the correct clauses around the wrong one.

**No phase document states the threshold value.** Writing "three games played"
into fifteen sites would be one fact in fifteen places — precisely the defect
class **P-2** forbids, and the value would then need changing in fifteen places
if it ever moved. The contract holds the number; the phase documents name the
contract.

**No line-number citation was added.** Every pointer is by file and stable ruling
ID; the supersession notes cite by section heading and text. **AUD-2** exists
because line citations drift, and its own remediation invalidated three citations
inside the record reporting the drift.

**An early draft of the supersession notes cited the R-14 heading verbatim**,
which contains the words "a three-game floor" — reintroducing the value into
eight documents. That was caught before commit and replaced with a bare **R-14**
pointer. §E-3 is the proof it is gone.

## Supersession notes — one per document, a deliberate departure

This project's convention is supersede-in-place with the original retained
(precedent: the R-8 marker in `04-log-a-game.md`). At fifteen sites across eight
documents, per-site banners would have buried eight accepted-design documents in
markers on the eve of their being built from.

**So: class-A sites were corrected cleanly in place, and each affected document
carries exactly ONE supersession note** recording that sites in it previously
asserted wins-based eligibility, that R-14 superseded it, the date, which sites
changed (by section, never by line), and — where applicable — which sites were
deliberately not corrected and why. Per-site originals remain recoverable in git
history.

**This is a deliberate departure from per-site marking, chosen and not
overlooked**, taken because the change is uniform and high-volume. It is recorded
here so a later reader knows it was a decision.

Each note is placed immediately after its document's source-authority /
preservation blockquote and before `## Status`, so it is read before any step.

## Evidence

- **E-1 `[GIT]` — baseline.** `git remote get-url origin` →
  `https://github.com/Fochizzy/terraforming-mars-stats.git`;
  `git rev-parse --abbrev-ref HEAD` → `redesign/tm-stats-dashboard-rebuild`;
  `git rev-parse HEAD` → `813af7c588d3e3a7231815ef43f51ed795c49070`;
  `git status --porcelain=v1` → empty. Git-dir
  `.../worktrees/Terraforming-Mars-Redesign`.
- **E-2 `[REPO]` — the sweep.** `grep -rniE` over all of
  `docs/redesign/phases/` for `minimum[- ]wins`, `minimum`, `qualif`, `eligib`,
  and `threshold`. Post-correction, `grep -rn "minimum-wins eligibility"` returns
  **zero**; the only surviving `minimum[- ]wins` text is the three D1 blockquote
  sites, all `>`-prefixed.
- **E-3 `[REPO]` — no threshold value restated.**
  `grep -rniE "three[- ]game|three games|3[- ]game|3 games|minimum of (three|3)"`
  over `$(git diff --name-only)` → **zero matches**.
- **E-4 `[REPO]` — no line-number citation added.** The added-lines-only diff
  (`git diff -U0 -- docs/redesign/phases/ | grep '^+'`) filtered for `:[0-9]+`,
  `line [0-9]+`, `L[0-9]+` → **zero matches**.
- **E-5 `[GIT]` — class-B sites untouched.** The ten `Minimum games` /
  `minimum-game` filter sites in `07-leaderboard.md` and
  `17-competition-and-board.md` appear in the diff **only** inside the added
  supersession-note prose that describes them; none appears as a changed line of
  its own. Verified by filtering the `+`/`-` diff lines for `minimum.games`.
- **E-6 `[GIT]` — scope of change.** `git diff --stat` → 8 files, **199
  insertions, 15 deletions**. The 15 deletions are exactly the 15 class-A lines
  replaced. No file was rewritten and no line-ending normalization occurred.
- **E-7 `[REPO]` — one note per document.**
  `grep -rc "SUPERSEDED IN PLACE by owner ruling R-14"` returns **1** for each of
  the eight changed files and 0 elsewhere.
- **E-8 `[REPO]` — pointer count per document.** `07` 1, `08` 1, `09` 1, `10` 2,
  `11` 3, `12` 1, `17` 1, `20` 5 — summing to **15**, matching the class-A count
  exactly.

## Class-A sites, by document and section

| Document | Section(s) | Count |
|---|---|---|
| `07-leaderboard.md` | `Acceptance checklist` | 1 |
| `08-global-insights.md` | `Step 8.2 — Implement Overview` → `Stage B` | 1 |
| `09-individual-insights.md` | `Step 9.2 — Implement Overview` → `Stage B` | 1 |
| `10-group-insights.md` | `Step 10.2 — Implement Overview`, `Step 10.3 — Implement Members`, each → `Stage B` | 2 |
| `11-compare.md` | `Step 11.2 — Implement player comparison`, `Step 11.3 — Implement group comparison`, `Step 11.4 — Apply comparison rules`, each → `Stage B` | 3 |
| `12-improvement.md` | `Step 12.2 — Create deterministic rules` → `Stage B` | 1 |
| `17-competition-and-board.md` | `Step 17.1 — Build Head-to-Head` → `Stage B` | 1 |
| `20-release-hardening.md` | `Expanded working sequence` row; and `Step source unnumbered — Validate win point differential analytics` under `Source-defined scope`, `Stage B`, `Stage C`, `Step completion gate` | 5 |
| **Total** | | **15** |

## Validation

`npm.cmd run validate:claude-context -- --require-maintenance` — see §Validation
in the task report for the exact exit code and counts.

## What this changes, and what it does not

**Changes:** the phase layer no longer instructs a builder to enforce wins-based
eligibility, and now routes to the one canonical eligibility home.

**Does not change:** any threshold value, anywhere. **Q-1 stays open** — no
per-metric mechanism is specified. No blocker's disposition. No phase's status;
every one of the eight documents remains **planned and not started**. No
authorization to begin any phase, deploy, migrate, apply, push, or merge.

## Downstream work — recorded, not started

1. **Owner question — may carried source text under
   `## Copy-ready agent execution prompt` be corrected in place?** Three
   documents carry superseded wins-based eligibility instructions there (D1).
   Until this is answered they stay wrong, and they are the text most likely to
   be executed verbatim. This is the highest-value follow-up.
2. **Q-1** — the per-metric threshold mechanism, deferred until real data shows
   where each metric stabilises. Seven D2 sites cannot be resolved before it is.
3. **The `Minimum-history threshold` deferred row** in `07-leaderboard.md` (D3) —
   whether R-14 now supplies part of what it defers is an owner ruling.
4. **AUD-5 and the cross-file citation sweep** — untouched, as required.
