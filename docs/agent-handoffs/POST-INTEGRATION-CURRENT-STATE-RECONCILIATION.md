# Post-Integration Current-State Reconciliation Handoff

## Status

Completed 2026-07-22. **Documentation only, across two branches.** No
application code, migration, schema, deployment, or production system was
touched. No production read of any kind was authorized or performed: no
Supabase MCP call, no `execute_sql`, no `list_migrations`, no Wrangler, no
`/api/deploy-info`, no production logs, no database connection. Every fact below
was re-derived from local Git refs and repository files in this session.

Nothing was pushed, merged, deleted, rebased, or tagged.

## Why this existed

Three sessions landed work in parallel on 2026-07-22: a planning-pack source
repair, a superseded parallel attempt at the same repair, and a production
deploy. The integration itself succeeded. What it left behind were four
current-state claims in the published records that still described the
pre-integration world — two of them contradicting other statements in the same
file. Those records are what every later session reads first.

## The four corrections

Each was proven false before it was touched.

### 1. `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` — stale ledger snapshot

**Claimed:** "Last independently verified **2026-07-21**: **110 entries**, head
`20260721201734 harden_claim_rpc_privacy`."

**Evidence it was false.** `src/lib/db/migration-ledger-map.ts` — the executable
source of truth this document names at its own top — attests
`entryCount: 113`, `headVersion: '20260722153233'`,
`headName: 'close_authenticated_guest_identity_oracle'`, `attestedOn: '2026-07-22'`.
The declared count was not trusted: `PRODUCTION_LEDGER_VERSIONS` was parsed and
counted directly — **113 literals, 113 unique, maximum `20260722153233`**, with
exactly **110** at or below `20260721201734`. The array is in ascending order.

**Corrected to** 113 / `20260722153233`, recording the three additions with
their names and repository filename pairings:

| Ledger version | Ledger name | Repo file version |
|---|---|---|
| `20260722132159` | add_source_bound_import_identity_staging | `20260722012658` |
| `20260722144034` | coarsen_import_name_match_reasons | `20260720120000` |
| `20260722153233` | close_authenticated_guest_identity_oracle | `20260722153000` |

The prior 110- and 108-entry snapshots are retained as history, and the section
states explicitly that no live ledger was read for the reconciliation.

Three consequential claims in the same file were corrected in the same pass,
each mandated by the same executable file:

- The renamed-drift table gained the three rows above.
  `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION` and
  `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME` already carried all three.
- The gated table listed `20260720120000` and `20260722012658` as "Prepared and
  NOT applied". Both are applied. `GATED_UNAPPLIED` now holds five entries:
  `20260717190000`, `20260719234500`, `20260720100000`, `20260720110000`,
  `20260722012707`. The removed rows are recorded beneath the table, preserving
  the standing warning that `20260722144034` was an interim mitigation and is
  **not** a closure — the closure is `20260722012707`, still gated.
- Hazard counts read "15 contraction, 30 expansion, 8 neutral (53 files)".
  Counted from `MIGRATION_HAZARD_CLASS`: **16 contraction, 30 expansion, 8
  neutral, 54 files**, and `supabase/migrations/` holds 54 `.sql` files with no
  file missing a declaration and no declaration missing a file. The 54th,
  `20260722153000`, is declared `contraction` and was added to the contractions
  table.

### 2. `docs/CURRENT_STATUS.md` — tooling branch described as unmerged

**Claimed:** "Tooling only, not merged: `fix/deploy-state-planning-pack-sync` …
Until it is merged the desktop updater and its scheduled task fail closed unless
`--source-manifest` is supplied."

**Evidence it was false.** `fix/deploy-state-planning-pack-sync` and
`redesign/tm-stats-dashboard-rebuild` are both at `944bdad0d`;
`git branch --merged redesign/tm-stats-dashboard-rebuild` lists it;
`git rev-list --count fix/deploy-state-planning-pack-sync ^redesign/tm-stats-dashboard-rebuild`
is `0`. The shared checkout's `docs/redesign/CLAUDE-PROJECT-SOURCES.json` at
HEAD declares `deploy-state` as `sourceType: "git"` against
`fix/live-compare-data-remove-declared-style`, and **no** entry declares the
retired `root: "live"`. The installed updater's last run
(`last-run-summary.json`, `completed_at 2026-07-22T17:21:19-0400`) succeeded
with 48 documents, `0 created, 0 updated, 48 unchanged`.

**Corrected to** the integrated reality: merged, the pack reads DEPLOY-STATE
from the production lineage through Git, and the ordinary desktop and scheduled
paths work with no `--source-manifest` override. The entry's history is
superseded, not deleted.

### 3. `DEPLOY-STATE.md` (production lineage) — "where this file now lives"

**Claimed:** "The working copy is
`C:\Users\izzyh\Documents\Terraforming Mars\DEPLOY-STATE.md` — the checkout the
owner reads."

**Evidence it was false.** That file is 50 lines, opens "Deploy state — moved",
states it is not the ledger, and contains no worker version, commit, migration
version, or deploy date. It was replaced by a pointer stub by the same
reconciliation that produced the header making the claim.

**Corrected to** name the tracked copy on
`fix/live-compare-data-remove-declared-style` as the only place to read or
append, via `git show fix/live-compare-data-remove-declared-style:DEPLOY-STATE.md`,
and to record that every filesystem copy — B, C, D and the untracked E — is now
a factless stub. The superseded wording is quoted inline as history.

### 4. `DEPLOY-STATE.md` (production lineage) — unpushed-code follow-up

**Claimed (first "Open production follow-ups" bullet):** "PRODUCTION IS RUNNING
UNPUSHED CODE … `origin` is at `83dd8ce14` … Push
`fix/live-compare-data-remove-declared-style` to `origin`".

**Evidence it was false.** Local Git refs only:
`git rev-parse fix/live-compare-data-remove-declared-style` and
`git rev-parse origin/fix/live-compare-data-remove-declared-style` are both
`c58416e4f05902787f09f5035bb4cf4a27f8b8eb`;
`git rev-list <branch> --not --remotes` is empty;
`git rev-list --left-right --count <branch>...origin/<branch>` is `0  0`;
`d12e33ad0`, `7e401eccc` and `83dd8ce14` are all ancestors of the origin ref.
The bullet also contradicted the **Source branch** row of the Current production
table in the same file, and duplicated the already-resolved "Source is
local-only — RESOLVED 2026-07-22" note in the release section above it.

**Resolved** in the file's existing style: struck through, marked RESOLVED with
the re-derived evidence table, original text retained inline, and the one detail
still true — that a push needs operator approval — preserved. **No push was
performed by this session.**

The smoke-test bullet, the oracle bullet, the deploy-landmine bullet, the
`service_role` grant bullet, and every other follow-up were left untouched. No
deployment history table and no verified production row was altered.

## Superseded branch — quarantined, not deleted

`fix/planning-pack-deploy-state-source` @ `52373ff79`.

- **Not merged.** One commit off `11418d34a`;
  `git rev-list --count fix/planning-pack-deploy-state-source ^redesign/tm-stats-dashboard-rebuild`
  is `1`. It exists on no remote.
- **Do not merge it.** Its `deploy-state` manifest entry is `root: "git"` with a
  bare `ref` — an earlier, incompatible catalog schema. The integrated tooling
  requires `sourceType: "git"` with an explicit `repository`, and
  `scripts/validate-claude-project-context.mjs` rejects any working-tree root
  other than `redesign` ("Only \"redesign\" is a working-tree root;
  cross-lineage documents must declare sourceType \"git\""). It also carries an
  older `update_planning_pack.py` and a duplicate handoff under a different
  filename. Merging it would regress the live tooling back to fail-closed.
- **Not deleted.** Deleting it requires separate owner authorization.

Recorded in `docs/REDESIGN_STATE.md` and `docs/CURRENT_STATUS.md`.

## Files changed

On `redesign/tm-stats-dashboard-rebuild`:

- `docs/CURRENT_STATUS.md`
- `docs/REDESIGN_STATE.md`
- `docs/redesign/reference/MIGRATION-LEDGER-MAP.md`
- `docs/agent-handoffs/POST-INTEGRATION-CURRENT-STATE-RECONCILIATION.md` (new)

On `fix/live-compare-data-remove-declared-style`:

- `DEPLOY-STATE.md`

Intentionally unchanged: `docs/AUTHORITATIVE_DOCUMENTS.md` (its routing already
names the Git object as canonical and every filesystem copy as a stub),
`docs/redesign/DECISIONS.md`, `docs/redesign/MASTER-PLAN.md` (no durable
project-wide direction changed — this corrects stale statements of existing
state), `docs/redesign/CLAUDE-PROJECT-SOURCES.json` (no authority added, moved,
superseded or archived), all pointer stubs, and all application code.

## Canonical documents reviewed

`docs/CURRENT_STATUS.md`, `docs/AUTHORITATIVE_DOCUMENTS.md`,
`docs/REDESIGN_STATE.md`, `docs/redesign/MASTER-RULES.md`,
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`,
`src/lib/db/migration-ledger-map.ts`,
`git show fix/live-compare-data-remove-declared-style:DEPLOY-STATE.md`,
`docs/agent-handoffs/DEPLOY-STATE-PLANNING-PACK-GIT-SOURCE.md`,
`docs/agent-handoffs/CLAUDE-PROJECT-MASTER-CONTEXT-AUTOMATION.md`.

## Known stale statement left in place

`docs/agent-handoffs/DEPLOY-STATE-PLANNING-PACK-GIT-SOURCE.md` still carries a
"Known limitation" section describing the pre-merge fail-closed behaviour. It is
a historical implementation record of that task, and the current-state routers
(`CURRENT_STATUS.md`, `REDESIGN_STATE.md`) now explicitly supersede it. It was
left unedited rather than rewritten after the fact.

## Production and external effects

No deployment, Wrangler command, Cloudflare operation, Supabase query,
migration, or production write. The only external action is the authorized
planning-pack refresh of the existing private Drive folder, which creates,
renames and deletes nothing and preserves every stable document ID.

## Next approved action

None. Phase 4, Step 4.3 remains blocked at its release boundary and Step 4.4 has
not started. The compatible-reader correction, its deploy, contraction
`20260722012707`, the owner smoke tests, the closure audit, pushing either
branch, and deleting `fix/planning-pack-deploy-state-source` each require a new
explicit owner assignment.
