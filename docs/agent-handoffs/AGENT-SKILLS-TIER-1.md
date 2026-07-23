# Handoff — Agent skills encoding existing governance procedure

**Date:** 2026-07-23
**Branch:** `chore/agent-skills-tier-1`, on the redesign lineage
`redesign/tm-stats-dashboard-rebuild`.
**Worktree:** `C:\tmp\tm-agent-skills-tier-1` — a fresh branch-backed worktree,
isolated from the primary redesign checkout and from the updater's tree. Not a
detached HEAD.
**Base commit:** `d63e6b0d781b7c1d14be611b2f4b7dc05c53c66e`.
**Category:** Local tooling and governance only. **Not Phase 4 work, not Phase 5
work.** It changes no phase, blocker, release, migration, or production fact, and
resolves no pending decision.

**Authorization held:** read anything in the repository; create this worktree and
task branch; create files under `.claude/skills/`; run the validation battery to
measure baselines; run `validate:claude-context -- --require-maintenance`; write
this handoff; commit to the task branch.

**Authorization NOT held, and none of it occurred:** no Supabase call of any kind
(no `execute_sql` including read-only `SELECT`, no `list_migrations`, no
`apply_migration`), no `wrangler`, no `/api/deploy-info`, no production logs, no
direct database connection, no deploy, no migration, no backfill, no grant or
revoke, no push, no merge, no rebase, no force-push. No file under `src/**`,
`supabase/**`, or `scripts/**` was created or changed. `CLAUDE.md`, `AGENTS.md`,
and `docs/redesign/CLAUDE-PROJECT-SOURCES.json` were not edited. No index
document was created and no subagent was added under `.claude/agents/`. The
planning-pack hook was not disabled and `.claude/.pack-last-sync` was not edited.

Evidence classes are tagged inline: `[GIT] [REPO] [PROJECT-DOC] [INFERENCE]`.
**No `[LIVE]`, `[PROVIDER]`, or `[PRIOR]` production claim appears** — this task
made no production observation and repeats none.

---

## Why this exists

The project's governance is written down and is followed by re-reading long
documents at the start of every task. The recurring failure is not disagreement
with the rules; it is not reaching them at the right moment — the identifier
check that is skipped, the "intentionally unchanged" row that is omitted, the
baseline that is inherited instead of measured, the PENDING message read as a
failure.

These skills carry **procedure and pointers** to those moments. They deliberately
do **not** carry the rules themselves.

## What was built

Seven skills under `.claude/skills/`, one `SKILL.md` each:

| Skill | What it carries |
|---|---|
| `tm-evidence-and-report` | Evidence-class tagging, the report section order through `DOWNSTREAM WORK`, and running the identifier check before the report leaves the session. |
| `tm-validation-battery` | The commands, an executable that runs them and compares against recorded baselines, and how to read the results honestly. |
| `tm-task-preflight` | Re-derive repository/branch/base commit, prove the tree clean, create the isolated worktree, record the document baseline. |
| `tm-handoff-writer` | The eight header facts, the reviewed/updated/intentionally-unchanged disposition, and registering the handoff in the state document. |
| `tm-planning-pack-sync` | The updater step, the canonical `DEPLOY-STATE` ref, fail-closed generation, the tree-identity gate, and that a non-updater-tree PENDING is the synchronization report. |
| `tm-no-fabrication` | Classifying a value as observed-zero, missing, or unsupported, and the bans on interpolation, timeline reconstruction from totals, and fabricated continuity. |
| `tm-canonical-first` | Search for the existing formula, constant, or component first; no per-page duplicates; no scattered classification constants. |

### The authoring constraint that shaped all seven

**No skill restates contract text.** Where a requirement is canonical, the skill
cites document and heading and tells the reader to read it there. A skill that
copied a canonical requirement would become a second source of truth for it and
would drift silently the first time the canonical text changed — and nothing in
either file would say which one was current.

Each skill states in its own body that it authorizes nothing. There is no
`references/` directory: the canonical document is the reference. No skill names a
model, a phase number, a status, or a current project position, so none of them
goes stale when the project moves.

## Evidence

### Baselines, measured in this task [GIT] [REPO]

Measured from the primary redesign checkout, verified clean, at
`d63e6b0d781b7c1d14be611b2f4b7dc05c53c66e` — the same commit this branch is based
on. The tree was re-checked clean afterwards and HEAD was unchanged.

| Check | Command | Exit | Result |
|---|---|---|---|
| Executable PostgreSQL harness | `PGBIN="/c/Program Files/PostgreSQL/18/bin" bash supabase/tests/executable/run.sh` | 0 | `ALL EXECUTABLE MIGRATION TESTS PASSED` (also `ALL_ASSERTIONS_PASSED`, `ALL_FIXTURE_ASSERTIONS_PASSED`) |
| Tests | `npm.cmd run test` | 0 | 178 test files, 982 tests, 0 failed |
| TypeScript | `npx tsc --noEmit` | 0 | no diagnostics |
| Lint | `npm.cmd run lint` | 0 | 0 errors, 4 warnings (below) |
| Build | `npm.cmd run build` | 0 | succeeded |
| Context validator | `npm.cmd run validate:claude-context` | 0 | 48 planning-pack documents, 1 Git source checked |

The four pre-existing lint warnings, recorded individually so a **new** warning is
detectable even though lint exits 0:

- `src/features/insights/score-profile-panel.tsx:172:19` — `@next/next/no-img-element`
- `src/features/insights/score-profile-panel.tsx:192:19` — `@next/next/no-img-element`
- `src/features/insights/score-profile-panel.tsx:216:13` — `@next/next/no-img-element`
- `src/lib/db/analytics-repo.ts:1132:10` — `@typescript-eslint/no-unused-vars`

### `--require-maintenance` is a completion gate, not a state check [REPO]

`scripts/validate-claude-project-context.mjs` builds its changed-file set from
`git diff --name-only HEAD` plus untracked files, then requires that the change in
progress touches `docs/REDESIGN_STATE.md`, creates or updates a handoff, and that
the handoff is referenced from the state document.

On a clean tree it therefore **fails by design** (exit 1, "Maintenance mode
requires…"). That is not a broken baseline and must not be recorded as one. It is
run once the documentation edits exist and before the commit. The runner encodes
this: on a clean tree it reports the check `SKIPPED` with that reason rather than
a meaningless failure.

### The battery runner discriminates [GIT]

`.claude/skills/tm-validation-battery/scripts/run-battery.ps1` was smoke-tested
against the real repository: lint and the context validator both `PASS`, and
`context-maintenance` self-skipped on the clean tree with its reason printed.

A **control** run against a copy whose lint baseline had one warning coordinate
perturbed returned `FAIL` (exit 1), naming both the unexpected warning and the
baseline warning that stopped being reported. The comparison therefore
discriminates; it is not vacuously passing.

The smoke test also found a real defect and it was fixed: invoked through
`-File`, `-Only a,b` arrives as a single string, which silently filtered out every
check and reported them all `SKIPPED`. The parameters are now split before use.

### Every pointer resolves [REPO]

Mechanically verified across all seven skills: **30 path pointers** and **35
heading pointers**, each heading matched verbatim against a document the same
skill names. All resolve. Bare filenames were rewritten to full repository paths
so each resolves standalone rather than only in context.

## Files changed

- `.claude/skills/tm-evidence-and-report/SKILL.md`
- `.claude/skills/tm-validation-battery/SKILL.md`
- `.claude/skills/tm-validation-battery/scripts/baselines.json`
- `.claude/skills/tm-validation-battery/scripts/run-battery.ps1`
- `.claude/skills/tm-task-preflight/SKILL.md`
- `.claude/skills/tm-handoff-writer/SKILL.md`
- `.claude/skills/tm-planning-pack-sync/SKILL.md`
- `.claude/skills/tm-no-fabrication/SKILL.md`
- `.claude/skills/tm-canonical-first/SKILL.md`
- `docs/REDESIGN_STATE.md`
- `docs/agent-handoffs/AGENT-SKILLS-TIER-1.md` (this file)

Nothing outside `.claude/skills/` and `docs/` was modified.

## Canonical documents reviewed

`CLAUDE.md` (in particular `## Authoritative project information`,
`## Documentation and Claude Project synchronization gate`,
`## Production-action synchronization rule`, `## Required workflow`,
`### Required review after work`), `AGENTS.md` (in particular
`### Documentation and synchronization completion gate`, `## Validation`,
`## Handoff`, `### Identifier verification before reporting`),
`docs/redesign/MASTER-RULES.md`, `docs/REDESIGN_STATE.md`,
`docs/CURRENT_STATUS.md`, `docs/AUTHORITATIVE_DOCUMENTS.md`,
`docs/redesign/DECISIONS.md` (the planning-pack hook entry and the identifier
entry), `docs/redesign/PAGE-ARCHITECTURE.md`,
`docs/redesign/CLAUDE-PROJECT-CONTEXT.md`,
`docs/redesign/CLAUDE-PROJECT-SOURCES.json` (read only),
`.claude/hooks/sync-planning-pack.ps1`, `.claude/settings.json`,
`package.json`, `scripts/validate-claude-project-context.mjs`,
`supabase/tests/executable/run.sh` and its `README.md`, and the handoffs
`PLANNING-PACK-POST-COMMIT-SYNC-HOOK.md`,
`POST-INTEGRATION-CURRENT-STATE-RECONCILIATION.md`,
`DEPLOY-STATE-PLANNING-PACK-GIT-SOURCE.md` and
`PHASE-04-STEP-03-MATCHER-OVERLOAD-MERGE-AND-RECORD-CORRECTIONS.md` for the
practised handoff shape.

## Documents updated

- `docs/REDESIGN_STATE.md` — a new tooling subsection recording what was built,
  the measured baselines and the unchanged-document reasoning; and a new entry at
  the head of the active handoff group pointing at this handoff.
- `docs/agent-handoffs/AGENT-SKILLS-TIER-1.md` — this file.

## Documents intentionally NOT changed, with reasons

Each assessed against that document's **own** maintenance rule, not against the
precedent set by the planning-pack hook change.

- **`docs/CURRENT_STATUS.md`** — it is the current-work router; it is updated when
  current phase, blocker, release, migration, or next-action state changes. This
  task changes none of those: it adds no work item, closes none, and moves no
  gate. Left unchanged.
- **`docs/AUTHORITATIVE_DOCUMENTS.md`** — its `## Maintenance` rule updates it
  when a current authority is added, moved, superseded, or archived. A skill is
  not an authority: each states it authorizes nothing and routes to the documents
  already indexed here. No routing changed. Left unchanged.
- **`docs/redesign/DECISIONS.md`** — updated when a durable decision is approved.
  No decision was approved here; this was a work order carried out. Adding an
  entry would imply an approval that was not given. Left unchanged.
- **`docs/redesign/MASTER-PLAN.md`** — tested against its own "when to update" and
  "when not to" lists: no project goal, boundary, governance rule, phase structure,
  milestone, durable architecture, shared component direction, analytics semantic,
  data-capability rule, asset policy, accessibility requirement, repository-wide
  constraint, validation or release gate, cross-page dependency, or documented
  next milestone changed. Encoding existing procedure into a tooling layer is
  exactly the class of change its integrity rules say not to write into it. Left
  unchanged.
- **`docs/redesign/CLAUDE-PROJECT-SOURCES.json`** — outside the authorized edit
  set, and no catalog entry is needed for this change. Whether the skills should
  ever be catalogued as durable cross-project guidance is an **open owner
  decision**, not a gap this task should have closed on its own.
- **`CLAUDE.md` and `AGENTS.md`** — outside the authorized edit set. The `AGENTS.md`
  mirror is explicitly reserved for new owner authorization.
- **`docs/redesign/CLAUDE-PROJECT-CONTEXT.md`** — the generation contract is
  unchanged; nothing about pack generation was altered.
- **`docs/redesign/PAGE-ARCHITECTURE.md`, the phase files, and every inventory,
  matrix, and specification** — no route, page responsibility, phase contract, or
  data capability changed.

## Known limitations / notes for the next owner

- **The report section list has no canonical home.** The section names the
  reporting convention uses (`VERDICT` through `DOWNSTREAM WORK`) appear in **no**
  repository document [REPO]. The evidence-class tags themselves *are* used
  throughout the records but are likewise never defined in one place. So
  `tm-evidence-and-report` is the first written statement of both. It does not
  duplicate a canonical requirement, because none exists to duplicate — and it says
  so, and defers to the assignment where they differ. If the owner wants either to
  become contract, that is a documentation decision, not a skill edit.
- **`tm-planning-pack-sync` was required to state four points explicitly** that
  also appear in `CLAUDE.md` and `AGENTS.md`. They are written as operational
  procedure with the headings cited, rather than as restated requirements, so the
  cited documents remain the single source. This is the one skill where the
  no-restatement rule and the explicit-content requirement had to be reconciled;
  it is recorded here rather than resolved silently.
- **Skills are Claude Code-only.** Like the planning-pack hook, this layer does not
  run under other agents. It is an aid to the written instructions, never a
  replacement: every rule stays correct and in force with the skills absent,
  unapproved, or disabled.
- **New-skill approval.** Project skills may require review before they are live,
  so they may not be active in the session that introduces them.
- **The baselines are a measurement, not a contract.** Re-measure from a clean tree
  and update `measuredAtCommit` in the same edit. `baselines.json` is the only
  place the numbers live so the skill body cannot drift from them.

## Production and external effects

**None.** No production system was read or written, nothing was deployed,
migrated, pushed, or merged. The branch is unmerged and exists only locally.

## Planning-pack synchronization

This commit is made in `C:\tmp\tm-agent-skills-tier-1`, which is **not** the tree
the planning-pack updater reads. Synchronization is therefore **PENDING** for this
commit and Google Drive is not current for it. The pack publishes when the branch
reaches the updater's tree. Reported explicitly rather than run from the wrong
tree — which is exactly what the tree-identity gate exists to prevent. The hook's
actual output for this commit is recorded in the task report.

## Next approved action

**None.** Merging `chore/agent-skills-tier-1` requires new owner authorization, as
do creating and registering any index, cataloguing the skills, mirroring them into
`AGENTS.md`, and adding any further skill.

---

# Amendment — second commit, 2026-07-23 (three further skills)

The first commit (`0e59efd049e28e23bc1e1a7bf75560d049a7facf`) was **not
rewritten**. Same branch, same worktree, same base lineage.

The first increment's report identified six documented governance surfaces the
original seven skills did not cover. The owner authorized three of them. The other
three — an import/export evidence contract, an upstream reference-catalog
authority skill, and asset handling — were **not** authorized and were **not**
built.

**Category is unchanged:** local tooling and governance only. No phase, blocker,
release, migration, or production fact changed. **No production access of any kind
occurred** in this increment either — no Supabase call, no `execute_sql`, no
`list_migrations`, no `wrangler`, no `/api/deploy-info`, no deploy, no migration,
no push, no merge. No file under `src/**`, `supabase/**`, or `scripts/**` was
touched; `CLAUDE.md`, `AGENTS.md`, and `docs/redesign/CLAUDE-PROJECT-SOURCES.json`
remain unedited.

## What was added

| Skill | What it carries |
|---|---|
| `tm-identity-privacy` | The boundary question — exclusion from the payload rather than concealment in the UI; missing username never falls back to a personal name; username and personal-name matching stay separate mechanisms; a claim preserves the existing player ID. Routes every rule to `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`. |
| `tm-conflict-and-authority` | Do not resolve a conflict silently; the six-step procedure; and the separation that evidence corrects a fact but never grants scope, with the shapes that failure takes enumerated — including "nothing forbade it". |
| `tm-production-action-preflight` | Name the authorizing sentence; read the ledger from Git; reconcile filename against ledger version by name; byte identity; expand/contract ordering; bound the write; the two separate actions owed afterwards. |

`tm-production-action-preflight` is the highest-risk of the ten and is written to
be inert on its own: it opens by stating that it authorizes nothing, that it does
not make an action allowable, and that it is only for a session **already holding
an explicit, named authorization**. Its first step is to quote the sentence that
authorizes the specific action, and it states that absence of a prohibition is not
authorization.

## Evidence for this increment

**The byte-identity step is measured, not recalled** [GIT]. Run in this repository
against a committed migration whose working copy has CRLF terminators:

| Check | Result |
|---|---|
| `git rev-parse "HEAD:$F"` | `98aeff9e…` (canonical object) |
| `git hash-object "$F"` | `98aeff9e…` — **matches, and is a false pass** |
| `git hash-object --no-filters "$F"` | `2b17b046…` |
| `sha256sum "$F"` | `e71fab89…` |
| `git show "HEAD:$F" \| sha256sum` | `6d2f4768…` |

The working-tree bytes genuinely differ from the reviewed object, yet the default
`git hash-object` reports a match because it applies the EOL filter. The skill
therefore directs that migration SQL be sent from `git show <ref>:<path>` and that
any identity check use `--no-filters` or a content hash.

**A claim was dropped after checking it** [REPO]. An early draft was going to state
that `supabase db push` must never be used. `docs/deployment.md` → `## Launch
order` prescribes exactly that for standing up a new project, so the blanket
prohibition is false. The skill now says the apply mechanism is not a free choice
and must be confirmed against the current authoritative records for that class of
change, rather than inventing a rule the documents contradict.

**A pointer was corrected during verification** [REPO]. A draft cited
`docs/archive/`, which does not exist — `docs/AUTHORITATIVE_DOCUMENTS.md` →
`## Historical documents` records that. It now cites that rule instead of the
absent path.

**Pointer verification across all ten skills:** 33 path pointers and 59 heading
pointers, each heading matched verbatim against a document the same skill names.
All resolve, exit 0.

## Validation for this increment

The whole branch diff against the base — committed and pending — is
`.claude/skills/**` plus `docs/REDESIGN_STATE.md` and this handoff. **No file
under `src/`, `supabase/`, or `scripts/` was touched**, verified with
`git diff --name-only` plus `git ls-files --others`, so no input read by `tsc`,
ESLint, Vitest, or the build changed.

The code-facing checks were therefore run from the **primary checkout at
`d63e6b0d7`** — byte-identical source to this branch — via the runner this task
added. `--require-maintenance` was run in the **task worktree**, because it
inspects the working tree and only means anything there.

| Check | Where | Exit | Result |
|---|---|---|---|
| `npm.cmd run test` | primary @ `d63e6b0d7` | 0 | 178 files / 982 tests — matches baseline |
| `npx tsc --noEmit` | primary @ `d63e6b0d7` | 0 | no diagnostics |
| `npm.cmd run lint` | primary @ `d63e6b0d7` | 0 | exactly the 4 baseline warnings, no new one |
| `npm.cmd run validate:claude-context` | primary @ `d63e6b0d7` | 0 | passes |
| `validate:claude-context -- --require-maintenance` | task worktree | 0 | satisfied by this change |
| Executable PostgreSQL harness | — | **not re-run** | no migration or SQL file changed; the baseline at `d63e6b0d7` stands |
| `npm.cmd run build` | — | **not re-run** | no application code changed; the baseline at `d63e6b0d7` stands |

Baselines in `scripts/baselines.json` are **unchanged** and still pinned to
`d63e6b0d781b7c1d14be611b2f4b7dc05c53c66e`. Nothing in this increment re-measured
them.

## Document disposition for this increment

`docs/REDESIGN_STATE.md` — updated: the tooling subsection gains an amendment
paragraph and the active-group entry is rewritten to describe ten skills in two
increments. This handoff — updated with this amendment.

`docs/CURRENT_STATUS.md`, `docs/AUTHORITATIVE_DOCUMENTS.md`,
`docs/redesign/DECISIONS.md`, `docs/redesign/MASTER-PLAN.md`,
`docs/redesign/CLAUDE-PROJECT-SOURCES.json`, `CLAUDE.md` and `AGENTS.md` — each
re-tested against its own maintenance rule for this increment and **unchanged**,
for the same reasons recorded above. Adding three more procedure-and-pointer
skills changes no phase, blocker, release, migration, or next-action state, adds
no authority, approves no durable decision, and alters no project-wide direction.

## Planning-pack synchronization for this amendment

Made in `C:\tmp\tm-agent-skills-tier-1`, which is **not** the updater's tree.
Synchronization is **PENDING** for this commit and Drive is not current for it.
The marker was not touched, the hook was not disabled, and the updater was not run
manually. The hook's actual observed behaviour is recorded in the task report.

## Next approved action, unchanged

**None.** Merging, cataloguing, indexing, the `AGENTS.md` mirror, and any further
skill all still require new owner authorization.
