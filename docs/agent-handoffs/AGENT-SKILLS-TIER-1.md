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
`d63e6b0d7`** ~~— byte-identical source to this branch —~~ via the runner this
task added. `--require-maintenance` was run in the **task worktree**, because it
inspects the working tree and only means anything there.

> **Correction, recorded in Amendment 3 below.** The struck phrase does not hold.
> That checkout was later found to carry another session's uncommitted change to
> `src/lib/db/migration-ledger-map.ts`, so this run did **not** measure source
> byte-identical to this branch. Its results still matched the recorded baseline
> exactly. Text retained rather than rewritten.

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

---

# Amendment 2 — third commit, 2026-07-23 (permission audit and reconciliation)

Neither earlier commit was rewritten. Same branch, same worktree. **No new skill
was added.** Every change in this commit makes a skill narrower.

The owner directed that the skills must in no way allow actions beyond the rules
as expressly stated in the project files, and that all those files be reviewed and
reconciled.

## What was reviewed

`CLAUDE.md`, `AGENTS.md`, `docs/redesign/MASTER-RULES.md`,
`docs/AUTHORITATIVE_DOCUMENTS.md`, `docs/CURRENT_STATUS.md` (`## Rules`),
`docs/redesign/DECISIONS.md`, `docs/redesign/PAGE-ARCHITECTURE.md`,
`docs/redesign/CLAUDE-PROJECT-CONTEXT.md` (`## Authority and scope`,
`## Maintenance boundary`),
`docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` (`## Status`,
`## Cross-phase ownership`, `## Data-boundary requirements`),
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md` (`## What the gate enforces`),
and — **newly, and decisively** — `docs/redesign/MASTER-PLAN.md`
`## 2. Authority and Scope Control`, `### Scope rule`,
`## 4. Non-Negotiable Constraints` with its `### Repository safety` and
`### Prohibited actions`, `### 8.2 Formula governance`,
`### 8.3 Sample and denominator rules`, and `### 8.4 Analytics language`.

The first two increments never cited the master plan's constraint sections. That
is where most of the findings came from.

## Findings — eleven permission leaks, all closed

| # | Skill | The leak | Governing rule now cited |
|---|---|---|---|
| 1 | `tm-canonical-first` | Dependencies forbidden only when they *duplicate* an existing one, implying novel ones were fine | No dependency without approval — `## 4. Non-Negotiable Constraints` |
| 2 | `tm-canonical-first` | "If you cannot find a formula" implied writing one | Formulas may not be invented during implementation; only approved ones implemented — `### 8.2 Formula governance` |
| 3 | `tm-canonical-first` | "Lift the first copy into the shared module" invited an unrelated refactor | Refactoring unrelated code prohibited — `### Prohibited actions` |
| 4 | `tm-canonical-first` | "Before adding a lookup table" implied a table could be added | Table, view, migration, schema change each need separate approval |
| 5 | `tm-canonical-first` | Silent on legacy removal | `MASTER-RULES.md` → `## Workflow` |
| 6 | `tm-no-fabrication` | "Mark low-sample results as low-sample" invited inventing a threshold and implied hiding | No universal threshold; thresholds metric-specific or caller-provided; low sample stays visible and is never colour alone — `### 8.3` |
| 7 | `tm-task-preflight` | Worktree creation written unconditionally | Creating a branch is a write; a no-write assignment gets none. Plus the absolute prohibition on altering the separate non-redesign checkout — `### Repository safety` |
| 8 | `tm-production-action-preflight` | "Preflight reads stay minimal" read as licensing preflight reads | A preflight read **is** production access and needs its own authorization |
| 9 | `tm-production-action-preflight` | Generic about which actions need approval | Now names deploy, push, production data and Storage mutation, migration creation, view creation, schema change — `### Prohibited actions` |
| 10 | `tm-handoff-writer` | Assumed writing the handoff and editing state were permitted | A no-write assignment writes nothing; an assignment that both authorizes a document and forbids writes is a conflict to disclose |
| 11 | `tm-validation-battery` | Silent that adjacent `package.json` scripts write to remotes; and a new lint warning implied a fix | Battery is local only; `deploy`, `preview`, `catalog:*` are not validation; no `npm audit fix`; unrelated warnings are not yours to clean up |

Two further tightenings, not leaks: `tm-planning-pack-sync` now says run the
updater "when available and authorized", matching `AGENTS.md` step 7 rather than
paraphrasing it; and `tm-identity-privacy` now states that an instruction may add
stricter requirements but never weaken the privacy contract — including this
skill, so if anything in it reads as more permissive than the contract, the
contract wins and the skill is wrong.

## One tension reconciled, not silently resolved

`docs/redesign/MASTER-PLAN.md` → `### Repository safety` says to work only in the
primary redesign path and never to modify the separate non-redesign checkout.
Assignments and the whole recorded project practice direct **isolated worktrees
outside** that path.

Read with `## 2. Authority and Scope Control`, the current explicit assignment is
authority 1 and the master plan is authority 8, so the assignment governs; and the
prohibition's subject — read with the sentence that follows it about not cleaning,
resetting, staging, committing into, or copying wholesale from "the original
worktree" — is the separate non-redesign checkout. A linked worktree of the
redesign repository is not that.

So the skills carry the **prohibition** and do not carry a worktree ban. This is
recorded rather than decided quietly. If the owner reads it the other way, the
skill text is what changes, not the master plan.

## Verification

- **107 pointers resolve** — 34 path, 73 heading — up from 92, all checked
  mechanically, exit 0.
- No skill names a model, project phase, status, or current position.
- All ten still state that they authorize nothing;
  `tm-production-action-preflight` states it twice, once as its opening line.
- **No skill gained a permission in this commit.** Every edit removed one,
  narrowed one, or cited the rule that constrains it.

## Validation for this commit

The diff is `.claude/skills/**` Markdown plus `docs/REDESIGN_STATE.md` and this
handoff. No input read by `tsc`, ESLint, Vitest, or the build changed.

| Check | Exit | Note |
|---|---|---|
| `validate:claude-context -- --require-maintenance` | 0 | run in the task worktree |
| test / tsc / lint / build / PostgreSQL harness | **not re-run** | no code-tool input changed; and the primary checkout — where the earlier code-facing runs were measured — now carries **another session's uncommitted work**, so a run there would no longer measure this branch's source. Their baselines at `d63e6b0d7` stand and were not re-measured. |

## Planning-pack synchronization

**PENDING**, same as the earlier commits and for the same reason: made outside the
updater's tree. Marker untouched, hook not disabled, updater not run manually.

---

# Amendment 3 — correction: a validation claim and the baseline's standing

Recorded on the same day, on discovering that the base branch had moved while this
work was in progress. **Nothing about the skills changed in this amendment**; it
corrects the record.

## What happened

A concurrent session was working in the **primary redesign checkout** — the same
tree these baselines were measured in. It has since committed
`f8c2c8e1d1866eddbfb110206e17aa5bcb77f443` [GIT], advancing
`redesign/tm-stats-dashboard-rebuild` from `d63e6b0d781b7c1d14be611b2f4b7dc05c53c66e`
and changing, among documents, **`src/lib/db/migration-ledger-map.ts`**.

## Correction 1 — the "byte-identical source" claim does not hold

Amendment 1 recorded that the second increment's code-facing checks ran against
source byte-identical to this branch. When that tree was inspected shortly
afterwards it carried an uncommitted modification to
`src/lib/db/migration-ledger-map.ts`. The precise moment that edit appeared,
relative to the run, **cannot be established from the evidence available here**, so
the claim cannot be sustained and is struck above rather than defended.

What does still hold, and is separately checked: that run returned **178 files /
982 tests**, **no `tsc` diagnostics**, and **exactly the four baseline lint
warnings** — identical to the recorded baseline. So no drift was observed either
way. The claim was stronger than the evidence, which is the defect being recorded.

## Correction 2 — the baselines' commit is now an ancestor, not the tip

`scripts/baselines.json` is pinned to `d63e6b0d7…`, which is now **behind** the
base branch, and a file under `src/` has changed since. The pin is doing exactly
its job — the numbers say which commit they describe — but the consequence must be
stated: **they are not automatically valid for the current branch tip.**

Before this branch merges, re-measure from a clean tree at the then-current commit
and update `measuredAtCommit` in the same edit. Do not carry these numbers forward
as though they were measured there.

## Correction 3 — evidence about the hook, from another session's commit

Earlier reporting from this task recorded that a worktree commit produced **no**
hook output at all, and offered two explanations it could not distinguish. One data
point now narrows it: `.claude/.pack-last-sync` in the updater's tree has advanced
to `f8c2c8e1d…`, exactly that session's new HEAD [GIT]. The marker is written by
the hook, not by the updater, so **the hook is live and did fire and run the
updater for a commit made in its own tree**.

That does not by itself prove which path a worktree commit takes, and no claim is
made here that it does. It removes "the hook is not active in this environment"
as an explanation. The gap remains open and still wants a hook-level test.

## Scope

No skill file was edited. No production system was accessed by this task at any
point. The concurrent session's work is **its own**; it is named here only because
it moved the tree these measurements were taken in, and is neither reviewed nor
endorsed by this handoff.

---

# Amendment 4 — merged, and the baselines re-measured at the merge commit

The owner authorized the merge. `chore/agent-skills-tier-1` (four commits) landed
in `redesign/tm-stats-dashboard-rebuild` as `--no-ff` merge commit
**`58578dd91f808e635e65f8001e87aa9f7ea60bd5`** [GIT]. The ten skills are live
under `.claude/skills/`.

## Conflict resolution

One conflict: `docs/REDESIGN_STATE.md` at the head of `## Latest handoff`, where
this branch and the concurrent production-apply commit `f8c2c8e1d` each inserted
an entry. **Both retained**, production record first, group complete and
contiguous. Two statements in the merged text were corrected in the same
resolution because the merge made them false: the skills entry asserted "33 path
and 59 heading pointers" (superseded by the audit's 34 / 73) and "branch
unmerged", and the tooling subsection asserted "**Unmerged**; merging it requires
separate owner authorization". The latter is struck and superseded rather than
deleted.

## Re-measure at the merge commit — no drift

The correction in Amendment 3 said these baselines were pinned to an ancestor and
were owed a re-measure. Done, at `58578dd91…`:

| Check | Exit | Result at the merge commit | vs. baseline |
|---|---|---|---|
| Executable PostgreSQL harness | 0 | `ALL EXECUTABLE MIGRATION TESTS PASSED` | unchanged |
| `npm.cmd run test` | 0 | 178 files / 982 tests | unchanged |
| `npx tsc --noEmit` | 0 | no diagnostics | unchanged |
| `npm.cmd run lint` | 0 | exactly the same 4 warnings | unchanged |
| `npm.cmd run build` | 0 | succeeded | unchanged |
| `validate:claude-context` | 0 | passes | unchanged |
| `validate:claude-context -- --require-maintenance` | 1 | see below | not a baseline value |

**Every value is identical**, so `scripts/baselines.json` keeps its numbers and
only moves `measuredAtCommit` to the merge commit, with the prior commit retained
under `previousMeasurement` so the re-measure is auditable rather than a silent
overwrite.

**Measurement conditions, stated because they qualify the result:** the checkout
carried two *documentation* files dirty from a concurrent session
(`docs/REDESIGN_STATE.md`, `docs/redesign/reference/MIGRATION-LEDGER-MAP.md`).
Nothing under `src/`, `supabase/`, or `scripts/` was dirty — checked before and
after — so the code-facing checks measured this commit's source. This is stated
rather than glossed, which is the failure Amendment 3 recorded.

**The `--require-maintenance` exit 1 is not this work's failure.** Its message is
"Maintenance mode requires a handoff file to be created or updated", and the
pending change it was judging was the *other session's* two uncommitted document
edits, which do not yet include a handoff. The gate is correctly describing their
in-progress work.

## One defect found by using the runner, and fixed

The full run reported `harness SKIPPED — bash not available`. Git Bash is
installed but is not on the PowerShell host's `PATH`, so `Get-Command bash`
failed. The runner behaved correctly — it reported the check unrun rather than
passed, which is the whole point of the skill — but it meant the battery was
quietly validating less than it appeared to. The probe now falls back to the usual
Git install locations and invokes the resolved executable by full path. Verified:
the harness now runs and passes through the runner from PowerShell.

## What this commit deliberately does not touch

`docs/REDESIGN_STATE.md` is **not** edited here. The concurrent session has
uncommitted changes in it, and staging that file would commit their in-flight
work. The merge commit already carries this task's state-document content; this
follow-up records the measurement in `baselines.json` and in this handoff instead.

**Small follow-up owed:** once the concurrent session's edits land, a one-paragraph
note in the skills tooling subsection recording the merge commit and the no-drift
re-measure would close the pointer left there. It is not urgent and is not done
here, because doing it now would mean committing someone else's work.

## Planning-pack synchronization — no longer pending

The merge was made in the updater's tree, and `.claude/.pack-last-sync` now reads
`58578dd91f808e635e65f8001e87aa9f7ea60bd5`, equal to HEAD [GIT]. The marker is
written by the hook, not by the updater, so **the hook fired and ran the updater
for this merge**. The PENDING status carried by the three worktree commits is
resolved: the pack published when the work reached the updater's tree, exactly as
the documented path describes. Verify the Drive result in the updater's local log.

## Still unauthorized

Cataloguing the skills, creating or registering any index, and mirroring them into
`AGENTS.md`.
