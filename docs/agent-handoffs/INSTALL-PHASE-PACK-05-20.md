# Install expanded phase pack 05–20 — INSTALLED (docs-only, byte-identical), conflicts surfaced not resolved

## Header facts

1. **Title / what happened:** Installed sixteen expanded phase documents
   (`05`–`20`) plus two pack documents into `docs/redesign/phases/`. Nine were
   pure fills into empty repository files; seven overwrote non-empty files and
   were verified to be hand-merged versions that preserve the pre-existing
   repo-native content. Four owner-decision conflicts were **surfaced, not
   resolved**. Nothing was implemented; no phase was started.
2. **Date:** 2026-07-23.
3. **Branch / lineage:** `redesign/tm-stats-dashboard-rebuild` (redesign
   lineage).
4. **Worktree:** `C:\Users\izzyh\Documents\Terraforming Mars Redesign`
   (redesign primary; git-dir
   `…/Terraforming Mars/.git/worktrees/Terraforming-Mars-Redesign`).
5. **Base commit (pre-commit HEAD):**
   `76ea259eb1f987c7db1cfb8eeed807820e1c44c8` [GIT]. Clean tree, 0/0 vs
   upstream at start.
6. **Category:** Documentation install of planning/phase specifications. It is
   **not** an implementation, migration, deploy, push, or production action, and
   it is **not** authorization to begin any of the installed phases.
7. **Authorization held:** read-only git/repository inspection; reading the
   source directory; copying the sixteen phase docs plus the two pack docs into
   `docs/redesign/phases/`; adding the single VERIFICATION correction banner;
   creating and registering this handoff; editing `docs/REDESIGN_STATE.md` to
   register it and record the install; exactly one commit.
8. **Authorization NOT held, and what did not occur:** no editing of any
   installed phase-document body (byte-identical only); no merging/reconciling
   of any surfaced conflict; no reconciliation of MASTER-PLAN,
   PAGE-ARCHITECTURE, the master guide, or any specialist contract against these
   docs; no deletion of any repository file; **no push, merge, deploy, migration
   apply, rebase, force-push, or history rewrite**; **no production read or
   write** — no Supabase, no Cloudflare, no production SQL; no start of
   BUILD-DESIGN-B or any queued work item; gap 1e, the open findings, PD-1/2/3,
   the 6d conflict, and the DOCUMENT-OWNERSHIP-MAP question were untouched.

## Problem / why this existed

Sixteen phase documents for phases 5–20 were expanded from the integrated Word
implementation guide following the `04-log-a-game.md` pattern. Seven of the
target repository files already held content (a player-label design constraint
with `[GIT]` evidence in `05`; a card-acquisition section in each of `08`–`13`).
The Word-derived versions contain none of that repo-native material, so an
unmerged install would have silently destroyed seven sections — invisible in a
diff because both sides are legitimately large. The seven source files were
therefore hand-merged upstream to carry both bodies; this work item installs the
merged/owner versions after mechanically proving they are the merged ones.

## Source verification gate (Section 4) — PASSED

- Seven merged source files each contain exactly one literal
  `**Provenance:** this section is REPO-NATIVE` marker, and line counts match
  exactly [CMD]: `05`=991, `08`=759, `09`=843, `10`=886, `11`=819, `12`=718,
  `13`=728.
- `07-leaderboard.md` source is **51534 bytes** — the owner's Elo version, not
  the 52272-byte Word original [FS].
- Nine fill files checked against the source `VERIFICATION.md`: eight match
  exactly (`06,14,15,16,17,18,19,20`); **`07` deliberately mismatches** (909
  lines / 51534 bytes vs the table's 743 / 52272) because it is the Elo
  replacement — a finding, not a stop.

## Before-state (Section 5) — matched expected PRIOR

EMPTY (0 bytes, sha `e3b0c442…`): `06,07,14,15,16,17,18,19,20`. NON-EMPTY:
`05`(5391 B), `08`(378), `09`(360), `10`(387), `11`(426), `12`(522), `13`(1626).
No NON-EMPTY file had changed since the earlier receipt; HEAD was exactly the
baseline with a clean tree, so no stale-base stop condition applied [GIT].

## What was installed

- Sixteen phase docs copied **byte-identical** to source; sha256 verified equal
  on both sides for all sixteen [CMD].
- `PACK-05-20-README.md` — the pack README, byte-identical (carries the rule
  that the presence of these files is **not** authorization to begin any phase).
- `PACK-05-20-VERIFICATION.md` — the pack VERIFICATION report with a single
  added **install-time correction banner** naming all **eight** superseded rows
  (`05,07,08,09,10,11,12,13`); the original inventory table is retained verbatim
  (content from `## Result` onward is byte-identical to source [CMD]). The banner
  is the only authorized edit to that file.
- Both pack docs were given non-colliding `PACK-05-20-` names; neither previously
  existed in `docs/redesign/phases/`.
- Post-install, all seven merged files still contain their REPO-NATIVE section,
  and `07` is the Elo version (92 `Elo` mentions) [CMD].

## Conflicts surfaced for owner decision — NOT resolved (Section 7)

These are owner decisions; this session resolved none. Full evidence is in the
accompanying task report.

1. **07 Elo vs weighted score:** `07-leaderboard.md` states Elo **replaces** the
   weighted-score composite as the overall rank (e.g. "ELO rating, not a
   weighted-score composite"; "replacing the former weighted-score criterion").
   It does **not** dilute the recorded owner replacement decision to "alongside".
2. **11 / 12 / 19 overlap:** `11-compare.md`, `12-improvement.md`, and
   `19-compare-and-improvement-expansion.md` — three documents across two
   subjects (Compare, Improvement). Overlap mapped for owner deduplication.
3. **Contracts above phase docs:** possible conflicts against
   CANONICAL-ANALYTICS-DEFINITIONS, ANALYTICS-REPOSITORY-QUERY-CONTRACTS,
   METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS, and DATA-CAPABILITIES, plus
   Phase 2's deliberately-undecided analytics questions. Those contracts
   outrank phase documents; a phase specifying an unsupported analytic is
   specifying something unbuildable.
4. **Closure convention:** whether any of the sixteen states a closure
   convention differing from `04-log-a-game.md`.

## Documents reviewed / updated / intentionally NOT changed

- **Read:** `docs/redesign/phases/04-log-a-game.md` (pattern/closure baseline),
  `07-leaderboard.md`, the source pack `README.md`/`VERIFICATION.md`, the four
  analytics contracts and `02-analytics-foundation.md` (for the conflict scan),
  `CLAUDE.md`, `MASTER-RULES.md`.
- **Updated:** the sixteen phase docs (`05`–`20`) and the two `PACK-05-20-*`
  docs (this change); `docs/REDESIGN_STATE.md` (registers this handoff and
  records the install).
- **Intentionally unchanged:**
  - `docs/CURRENT_STATUS.md` — its rule requires an update only when current
    phase, blocker, release, migration, or next-action state changed. An inert
    documentation install that grants no phase authority changes none of those,
    so it is left unchanged.
  - `docs/AUTHORITATIVE_DOCUMENTS.md` — no authority was added, moved,
    superseded, or archived; phase docs are already routed there as a class.
  - `docs/redesign/CLAUDE-PROJECT-SOURCES.json` — no new durable cross-project
    guidance document was created; the two pack docs are not catalogued sources.
  - `docs/redesign/MASTER-PLAN.md`, `docs/redesign/DECISIONS.md` — no approved
    project-wide direction or durable decision changed; conflicts were surfaced,
    not decided.

## Production and external effects

**None.** No production access of any kind occurred; no Supabase, Cloudflare, or
production SQL; nothing pushed, merged, deployed, migrated, or applied.

## Next approved action

**None is authorized by this handoff.** The presence of these documents is not
authorization to begin any phase 5–20. The four surfaced conflicts are owner
decisions. BUILD-DESIGN-B and other queued items remain not started.
