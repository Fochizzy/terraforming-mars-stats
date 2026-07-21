# Deploy state

Shared between concurrent working sessions. **Read this before deploying;
update it immediately after.** The Cloudflare account, the production database,
and this repo are all shared, so this file is the only record of who changed
what — until the runtime deployment stamp below supersedes it for the
version→commit linkage.

> **Stale copies exist.** The ordinary checkout at
> `C:\Users\izzyh\Documents\Terraforming Mars` holds an *untracked, outdated*
> `DEPLOY-STATE.md` (it still claims `eb4e5821` is current with an unknown
> commit). The authoritative ledger is this tracked file at the head of the
> production branch. Do not act on any other copy.

## Current production

| | |
|---|---|
| Environment | production — Cloudflare Worker `terraforming-mars-stats`, serving `tm-stats.com` / `www.tm-stats.com` |
| Worker version | `08f9191f-7b06-4fa3-88dd-b3421d3ae89f` |
| Source repository | `github.com/Fochizzy/terraforming-mars-stats` |
| Source branch | `integration/final-ws2-event-card-42501` (pushed to `origin`; `origin/integration/final-ws2-event-card-42501` independently confirmed to resolve to the exact deployed SHA both before and after this deploy) |
| Source commit | `2b9a5e3a5a0d2db5c3508ed1a987d353ca44070d` — resolved by the deploy-time stamp print (branch passed explicitly via `TM_STATS_SOURCE_BRANCH`, since the build ran from a detached HEAD), not inferred |
| Deployed (UTC) | 2026-07-21 04:21:42.798Z (`wrangler deployments list`, 100% traffic) |
| Deploy lock | **Released — Event-card migration `20260721081355` recorded and verified. No production session currently holds the lock.** Available for the next deployment session, which must update this row before starting. |
| Active clean deployment worktree | `C:\tmp\tm-final-ws2-event-card-42501-deploy` — no longer needed once this entry is read; candidate `2b9a5e3a5`, base `9b7a00555` (merge-base confirmed, 9 commits ahead / 0 behind, 26-file diff) |
| DB migration ledger head | `20260721035955 secure_public_player_labels_service_role` (unchanged — no migration applied this release; Event-card snapshot migration `20260720223000` and gated migration `20260720120000` both confirmed still absent from the ledger, before and after this deploy). **Superseded 2026-07-21 08:13:55 UTC**: a separate, documentation-tracked *database migration* (no application deploy) subsequently advanced the ledger head to `20260721081355 fix_event_card_tag_snapshot_correction` — see "Event-card snapshot migration — production database correction" below. Gated migration `20260720120000` remains absent from the ledger. The worker/source/traffic facts in this table are unaffected by that migration. |
| Rollback worker version | `79d5b795-eb81-4962-aa5a-bfff26359a36` (immediately prior production build, 100% traffic 2026-07-21T00:15:19.080Z through this deploy; source commit `9b7a00555f216f4a741e819e8795238c362584f9`, confirmed via the prior deployment-record commit `3a8f4eb24`) |
| Verified | 2026-07-21 ~04:20-04:30 UTC — see "Combined WS2/Event-card/42501 deploy" below for exact evidence and its gaps |

**Evidence for the source commit.** `scripts/deploy/deploy-with-stamp.ts`
printed `TM_STATS_SOURCE_COMMIT=2b9a5e3a5a0d2db5c3508ed1a987d353ca44070d` and
`TM_STATS_SOURCE_BRANCH=integration/final-ws2-event-card-42501` immediately
before invoking the build, from a verified-clean detached-HEAD worktree at
that exact `git rev-parse HEAD`. The resulting version (`08f9191f`) was then
confirmed at 100% of `wrangler deployments list` traffic. **The authenticated
`/api/deploy-info` HTTP fetch — the intended steady-state verification path —
was not completed this session** (it returned `{"error":"Authentication
required."}` unauthenticated, as expected; a signed-in fetch was not
performed — entering credentials to authenticate is not something this
session will do). Until that fetch is done, this row's commit is
build-time/ledger-history correlated, not live-endpoint confirmed.
**Superseded**: a later card-scoring deployment-readiness review session
reported completing the authenticated `/api/deploy-info` GET against this
same immutable worker version and confirmed `sourceCommit` matched. This
documentation task did not independently rerun that fetch, and — unlike the
migration facts below — found no corroborating artifact for it anywhere in
this repository's history; it is recorded here as reported, not as
self-verified. The historical fact that the original 04:2x UTC deploy session
could not perform it (see above) stands unchanged.

### Event-card snapshot migration — production database correction — 2026-07-21 08:13:55 UTC

**This is a database-only migration record. No application deployment
occurred as part of this entry** — the worker version, source commit, and
traffic split in the "Current production" table above are unchanged by it.

**Status:** completed successfully. Applied once, to production, under
separate owner authorization from the WS2/Event-card/42501 deploy above.
Immediate post-application verification passed (see "Production result"
below). No further database write against this migration is authorized —
any future corrective action requires a new owner-authorized gate.

**Repository identity** (independently reconfirmed by this documentation
session):
- Candidate commit: `ab9e11191f1f0b276b3a1dd278750a66a5742c0e`
- Repository branch: `fix/event-card-snapshot-migration-bounded-rebuild`
- Repository migration path:
  `supabase/migrations/20260720223000_fix_event_card_tag_snapshot_correction.sql`
- SHA-256 of that file's exact content at the candidate commit (LF line
  endings): `2eba01204cff08c7220d1b7c2f78c02e45b1332a7f621e28c1606e9d800d48f4`
  — recomputed directly from `git show` of that commit while writing this
  entry and confirmed to match exactly. (This is the file-content digest, not
  a Git object/blob ID.)

**Remote ledger identity** (independently reconfirmed via `list_migrations`
against Supabase project `qjtwgrjjwnqafbvkkfex` while writing this entry):
- Server-assigned version: `20260721081355`
- Name: `fix_event_card_tag_snapshot_correction`
- Previous ledger head: `20260721035955 secure_public_player_labels_service_role`
- Ledger row count: 107 → 108; reconfirmed the live ledger contains exactly
  one entry named `fix_event_card_tag_snapshot_correction`, at position 108
  of 108, immediately after `20260721035955`.
- **Repository-file-to-ledger-version mapping**: the repository filename
  timestamp `20260720223000` is the migration's identity/filename prefix
  only — it is **not**, and was never intended to be, the ledger version.
  The ledger recorded this migration under the server-assigned version
  `20260721081355` (the actual application time).

**Reapplication rule.** Any future guard against re-running this migration
must key on the exact ledger **name** `fix_event_card_tag_snapshot_correction`
— not on finding remote ledger version `20260720223000`, which will never
appear (see mapping above).

**Production result.** The pre-application target counts, deltas, and
before/after aggregate digest below are as reported by the completed
production-application verification; this documentation task did not rerun
the underlying correction SQL and cannot recompute a "before" state that no
longer exists. Where this session re-derived a figure independently
read-only against current production, that is noted.
- Target convergence (as reported): pre-application 45 targeted games / 122
  targeted resolved players (109 Event-signal, 99 total-mismatch, 86
  overlapping both, 13 missing player-snapshot rows, 109 contaminated
  Event-tag rows, 658 spurious Event-tag units; 0 unresolved/ambiguous/
  malformed targets) → 0 of every one of those categories post-application.
- Four snapshot-table deltas (as reported: 109→122 / 1526→1708 / 117→135 /
  186→203). **Current-state values independently reconfirmed by this
  session** via read-only query: `game_player_metric_snapshots` = 122,
  `game_player_tag_metric_snapshots` = 1708, `game_milestone_metric_snapshots`
  = 135, `game_award_metric_snapshots` = 203 — matching the reported
  post-application figures. Zero nonzero-value `event`-tag rows remain in
  `game_player_tag_metric_snapshots`.
- Root evidence (`game_log_tag_summaries`) reported unchanged before/after:
  1778 total rows, 127 `event`-tag rows, event value sum 0, 0 nonzero event
  rows, aggregate digest `19168d42d66bea93495f8b8ef6587abb` both before and
  after. **Independently reconfirmed by this session** (current state, read
  -only): 1778 total rows, 127 `event`-tag rows, event tag-count sum 0, 0
  nonzero event rows — all matching. This session's own digest query used a
  different aggregation and did not reproduce `19168d42d66bea93495f8b8ef6587abb`
  bit-for-bit; that specific digest is recorded as reported, not independently
  reproduced.
- Guarded-function restoration — **independently reconfirmed by this session**
  via live `pg_proc` introspection: `public.rebuild_metric_summaries()`
  (OID `19392`) body SHA-256 `1301ade233da95c487e8d9e3e9739cd3cccbfbb7e789682cf3400f94c7f9d8da`,
  full function definition SHA-256
  `1c94896bfe75e52618354cf9734bd891cb2e98eb68f86ee1eec79ba2ed65eb7c`, ACL
  `{postgres=X/postgres}` — all match exactly; no migration-scoped no-op body
  survived. `public.refresh_game_metric_snapshots_internal(uuid, boolean)`
  (OID `19296`) body SHA-256
  `4b90d50c7353c9a035d454c31480e45bb42a22550335030b9390337c4665c65c` — matches
  exactly; owner and ACL unchanged.
- Non-target stability (as reported): the two unresolved non-target games
  remained outside the correction, still with zero snapshot rows across all
  four refreshed tables; no repair of those games was performed or
  authorized.

**Application boundary** (independently reconfirmed by this session via
`wrangler deployments list`):
- No application deployment or worker-version change occurred as part of
  this migration. Worker remains `08f9191f-7b06-4fa3-88dd-b3421d3ae89f` as
  the most recent deployment, at 100% traffic, created
  `2026-07-21T04:21:42.798Z` — unchanged and still the latest entry.
  Deployed application source remains associated with
  `2b9a5e3a5a0d2db5c3508ed1a987d353ca44070d`.
- No parser, card-scoring, Venus, secret, environment, or RLS operation was
  bundled into this migration.
- No repair of the two unresolved non-target games was performed or
  authorized.

**Known notes (non-blocking):**
- Exactly-one-global-rebuild is structurally proven in the correction package
  (harness item 14, §6) but was not independently isolated through a fresh
  pre-application PostgreSQL-statistics baseline captured by this specific
  production application.
- Authenticated source confirmation for the current deployed application
  (`/api/deploy-info`) was carried forward from the prior WS2/Event-card/42501
  deploy entry above as not-yet-done at that time; see the superseding note
  above this section for the subsequently reported (not independently
  rerun) completion.
- Several global summary dimensions increased (see the four-table deltas
  above) because previously-missing target snapshots became materialized —
  this is expected, not a regression.

**Rollback and follow-up:**
- No rollback was needed.
- No automatic rerun is permitted; any future corrective database action
  against this migration or its tables requires a new owner-authorized gate.
- The Event-card database workstream (this migration) is complete.
- This entry, and the corresponding final section in
  `docs/event-card-tag-exclusion-correction-package.md` (recorded separately
  on `docs/event-card-migration-production-record`), are a documentation-only
  reconciliation of an already-applied, already-verified production
  migration — no migration, refresh, or rebuild was executed by the session
  that wrote this entry.

### Combined WS2/Event-card/42501 deploy — 2026-07-21 04:2x UTC

Deployed by this session under owner authorization ("Full execution as
written" against a pre-scoped deployment directive naming exact candidate
`2b9a5e3a5a0d2db5c3508ed1a987d353ca44070d`). No database migration was
authorized or applied by this deploy.

**Confirmed:**
- `origin/integration/final-ws2-event-card-42501` resolved to
  `2b9a5e3a5a0d2db5c3508ed1a987d353ca44070d` before creating the deploy
  worktree; re-checked after deploy, unchanged.
- Merge-base of the candidate against the prior production source
  (`9b7a00555f216f4a741e819e8795238c362584f9`) is exactly that commit — 9
  commits ahead, 0 behind, 26-file diff (`git diff --name-only`), matching
  the approved candidate exactly.
- Fresh detached worktree at `C:\tmp\tm-final-ws2-event-card-42501-deploy`;
  `git status --porcelain` empty and `HEAD` matched the candidate SHA
  immediately before deploy.
- Focused suites: Workstream 2 privacy (six-file manifest derived from the
  diff between the prior deployed base and the WS2 privacy commit —
  `web-import-page.test.tsx`, `apply-created-import-player-to-review.test.ts`,
  `apply-server-player-matches.test.ts`, `resolve-import-player-links.test.ts`,
  `resolve-player-identity.test.ts`, `private-name-sentinel.test.ts`) —
  **55/55 passed**. Event-card (`card-type-vocabulary`, `analytics-repo`,
  `extended-analytics-repo`, `derive-card-score-evidence`,
  `countable-card-tags`, `derive-player-tag-summaries`) — **50/50 passed**.
  42501 (`import-group-repo`, `public-player-labels-service-role-migration`) —
  **27/27 passed**.
- `npx tsc --noEmit` — clean. `npm run build` — succeeded, 34/34 static
  pages, no errors (only pre-existing lint warnings). `git diff --check` —
  clean. `npm run check:schema` — passed (51 referenced tables confirmed
  against the live project; 14 dynamic call sites unchecked, as always).
- `npm run lint` — only the two known pre-existing warnings on Event-card
  files: `_fallbackName` unused in `src/lib/db/analytics-repo.ts` (present,
  unchanged); `scripts/backfill/recompute-tag-summaries.ts` is outside
  `next lint`'s default scope so its `no-explicit-any` finding was not
  re-observed this run but was not touched. No new blocking findings.
- DB compatibility (read-only, via Supabase MCP): migration ledger head is
  `20260721035955 secure_public_player_labels_service_role`; live
  `pg_proc` introspection of `public.get_public_player_names` confirms
  `SECURITY DEFINER`, owner `postgres`, language `plpgsql`, empty
  `search_path`, output `(player_id uuid, public_name text, is_linked
  boolean)`, EXECUTE granted to `authenticated`/`service_role` only (no
  anon/PUBLIC grant); `service_role` confirmed to still hold no `USAGE` on
  schema `private`. Event-card migration `20260720223000` and migration
  `20260720120000` both confirmed absent from the ledger.
- Deploy-time stamp printed the exact candidate SHA and explicit source
  branch before the build ran (see Evidence above).
- `wrangler deployments list` shows `08f9191f-7b06-4fa3-88dd-b3421d3ae89f` at
  100% traffic, created `2026-07-21T04:21:42.798Z`; the immediately prior
  version (`79d5b795-eb81-4962-aa5a-bfff26359a36`, 100% traffic since
  `2026-07-21T00:15:19.080Z`) remains present in the deployments list as the
  rollback target.
- Post-deploy read-only health checks: `https://tm-stats.com/` → 200;
  `https://tm-stats.com/login` → 200; `https://tm-stats.com/insights` → 307
  (expected redirect, unauthenticated); unauthenticated
  `https://tm-stats.com/api/deploy-info` → `{"error":"Authentication
  required."}` (expected — the route requires a signed-in session).
  Supabase `postgres` and `api` logs (24h window) reviewed: `api` service
  returned zero log rows; the `postgres` errors present are all timestamped
  before this deploy's build/publish window and match already-documented
  incidents (migration-application probing, `check:schema`'s anon-key
  existence probe, and the pre-existing 42501 incident signatures) — no new
  error burst correlated with this deploy.
- Confirmed **zero database mutations** this session: all Supabase MCP calls
  were read-only (`list_migrations`, `select`-only `execute_sql`, `get_logs`).

**NOT completed this session — do before treating this deploy as fully
verified:**
- **The authenticated `/api/deploy-info` HTTP fetch was not performed** for
  the same reason as the Step 4.3 deploy below: it requires a signed-in
  session, and entering credentials to authenticate is not something this
  session will do. **Action needed:** the owner (or a session with a
  sanctioned auth path) should load `https://tm-stats.com/api/deploy-info`
  while signed in and confirm `sourceCommit` reads
  `2b9a5e3a5a0d2db5c3508ed1a987d353ca44070d`.
- **No functional walkthrough of Confirm Import Draft, Analyze Import
  Evidence, or any other live import flow was performed.** The owner
  separately reported the previously failing upload/import action succeeded
  after migration `20260721035955`; this session did not independently
  re-run or observe that flow, and Analyze Import Evidence / Confirm Import
  Draft were explicitly out of scope for this deploy.
- Net: the **mechanics** of this release (correct commit, correct worktree,
  correct branch, stamped, gated, tested, live, no DB writes) are confirmed;
  the **functional/authenticated behavior** of the combined change set
  against real production traffic is not yet independently observed by this
  session.

### Step 4.3 code-only deploy — 2026-07-20 18:3x UTC

Deployed by this session under owner authorization ("AUTHORIZE CODE-ONLY
DEPLOY", exact candidate `a40d49662825474c98813aa44abb577b8830cc68`).

**Confirmed:**
- Worktree was clean and at `a40d49662` immediately before and after deploy
  (`git status --porcelain` empty, `git rev-parse HEAD` matched).
- `release/step-43-production-compatibility` pushed to `origin`;
  `origin/release/step-43-production-compatibility` independently fetched and
  resolved to `a40d49662825474c98813aa44abb577b8830cc68` from a second
  worktree.
- Critical focused suite (15 files / 146 tests: deployment-stamp,
  `/api/deploy-info` route, cloudflare-config, privacy sentinel, import
  matching + link resolution, tile attribution, player-repo,
  log-game-player-resolution, analytics-repo, game-draft-repo,
  game-import-repo, import/review/roster pages) — all passed.
- `npx tsc --noEmit`, `git diff --check`, `git status` — all clean immediately
  before deploy.
- `npm run check:schema` (predeploy gate) — passed, ran again automatically as
  part of `npm run deploy`.
- Deploy-time stamp printed the exact candidate SHA before the build ran (see
  Evidence above).
- `wrangler deployments list` shows `15fba7e9-2443-440c-8a1f-b5b9231d7ff6` at
  100% traffic, created `2026-07-20T18:33:13.965Z`.
- Passive read-only monitoring immediately after deploy: `wrangler tail` for a
  ~20s window showed no error traffic; Supabase `api`/`postgres` logs (24h
  window) showed **no PGRST205** and **no tile `CHECK` constraint violations**
  anywhere in the reviewed range; the most recent request in that window
  (`get_public_landing_stats`, unauthenticated) returned 200.
- Confirmed **zero database mutations**: no migration applied, no privilege
  or RLS change, no backfill, no guest neutralization. `execute_sql` calls this
  session were all read-only (`select`/log queries), and both fetched logs are
  read-only by nature.

**NOT completed this session — do before treating this deploy as fully
verified:**
- **The authenticated `/api/deploy-info` HTTP fetch was not performed.**
  Verifying it requires a signed-in session; entering a username/PIN to
  authenticate is a credential-entry action this session will not perform
  regardless of authorization, and using the owner's real-browser session was
  offered and declined. **Action needed:** the owner (or a session with a
  sanctioned auth path) should load `https://tm-stats.com/api/deploy-info`
  while signed in and confirm `sourceCommit` reads
  `a40d49662825474c98813aa44abb577b8830cc68`.
- **No functional walkthrough of Import Analyze, import review, group
  roster, new participant creation, public player labels, coarse matching, or
  a tile-containing import was performed**, for the same reason. The
  `permission denied for schema analytics` / `permission denied for table
  player_import_aliases` entries visible in the Supabase `postgres` logs
  around this deploy window are from this session's own `check:schema` probe
  script (anon-key, `select=*&limit=0` against every referenced table/schema,
  `node` user agent) — **not** from real application traffic — and are
  expected, pre-existing tooling noise, not a regression signal. No
  authenticated-user request against the new deploy was observed in either
  direction (success or failure) because none occurred during the monitoring
  window.
- Net: the **mechanics** of this release (correct commit, correct worktree,
  correct branch, stamped, gated, tested, live) are confirmed; the
  **functional/authenticated behavior** of the privacy reader, coarse
  matching, and tile attribution against real production traffic is not yet
  independently observed by this session.

## Deployment sources — allowed and prohibited

Deploy **only** from the recorded clean worktree and branch above, at a
reviewed commit, via `npm run deploy` (which now refuses a dirty tree or a
missing commit SHA).

Do **not** deploy from:

- `data-capture-hardening-v2` — predates all 11 production fixes on
  `fix/live-42501-on-capture-v2`; deploying it reverts them at once;
- the ordinary live-site checkout at
  `C:\Users\izzyh\Documents\Terraforming Mars` — it sits on the unrelated
  dirty branch `move-score-profile-below-insights-lab`;
- the redesign repository/worktree
  (`C:\Users\izzyh\Documents\Terraforming Mars Redesign`,
  branch `redesign/tm-stats-dashboard-rebuild`) — different application line
  sharing this database;
- `tm-stats-app` or `main` — both predate migration
  `20260718041532 remove_game_expansion_tracking` and throw `PGRST205` on
  `/log-game` in production.

## Rules

1. **Expand/contract for privilege and schema changes.** Deploy the frontend
   that no longer needs a grant or table, verify it, *then* revoke or drop.
   Never revoke against a reader that is currently deployed.
2. **One deployer at a time**, whoever holds the deploy lock above. Hand it
   over here before the other session deploys.
3. **`npm run check:schema` gates `npm run deploy`** through the `predeploy`
   hook. It asserts every `.from('…')` in `src/` exists in the live database.
   If it fails, the build is out of step with the schema — fix the drift, do
   not bypass the gate.
4. **Every release must be stamped.** `npm run deploy` runs
   `scripts/deploy/deploy-with-stamp.ts`, which bakes the repository, branch,
   full commit SHA, build timestamp, and environment into the artifact and
   refuses to ship without them. After deploying, verify
   `https://tm-stats.com/api/deploy-info` (authenticated) reports the commit
   you just shipped, then record the new worker version here.
5. **Record every deploy below**, worker version *and* source commit.

## Open production follow-ups

- **Step 4.3 expand/contract pair (deployed, runtime verification incomplete).**
  The privacy-compatible reader (public-name labels, coarse match-reason
  consumption, tile attribution, deployment stamp) is deployed as worker
  `15fba7e9` from `release/step-43-production-compatibility` @ `a40d49662`.
  **Before applying the paired contract migration `20260720120000
  coarsen_import_name_match_reasons`, complete the runtime verification this
  session could not**: an authenticated `/api/deploy-info` fetch confirming
  `sourceCommit=a40d49662825474c98813aa44abb577b8830cc68`, plus a functional
  pass over Import Analyze, import review, group roster, participant
  creation, public labels, and coarse matching. Only after both the migration
  may be applied — under its own separate authorization. The 114-row
  tile-attribution backfill and guest re-neutralization remain separately
  authorized steps, in that order (backfill first — two rows resolve solely
  through the guest's current display name).
- **Capture participant resolution still reads `players.display_name`.**
  `game-mechanic-capture-repo.ts` resolves capture actors via
  `players!inner(display_name)` under the authenticated role. It works today
  and is wrapped in best-effort handlers, but the eventual display-column
  restriction will degrade capture attribution until it gets a definer-side
  resolver. Pair that work with whichever migration restricts the display
  columns; it is deliberately not part of the Step 4.3 code-only release.
- **Jenna Kass's game needs re-importing.** Her group `6cb73dce`
  ("Colette LeRoux / Corey Jansen / Jenna Kass") and its games were destroyed by
  the 2026-07-12 group migrations. Only score rows survive, in
  `mig_backup_game_players` for games `e58c3171` / `e061fb0d` — which are
  duplicates of one another, so it is one real game, not two. Re-import the log
  rather than restoring: the backup has no `played_on`, map, generation count,
  or log events. Verify against Corey 117 / Colette 79 / Jenna 73.
- **`tm-stats-app` and `main` are stale — do not deploy them.** Both still
  reference `expansions`, `game_expansions`, and `group_default_expansions`,
  which no longer exist. Merge the production branch forward into `main`, make
  `main` the deploy source, and have both sessions branch from it.

## History

### 2026-07-20 — Step 4.3 code-expansion session (this update)

Corrections made while repairing this ledger:

- The previous revision's "Built 2026-07-20 01:47 UTC" in Current production
  described `0732bd81`, not the current `c23bfbd7`; the deploy-history times
  below were recorded in local EDT despite the UTC header (Cloudflare shows
  `c23bfbd7` at 15:14Z, the table said 11:0x). Times below are kept as
  recorded, now labeled correctly.
- The previous revision's "**This branch is not on any remote**" warning is
  resolved: `fix/live-42501-on-capture-v2` was pushed to `origin` with owner
  approval during the third remediation pass and verified again today
  (`origin/fix/live-42501-on-capture-v2` = `14abb8d1d`).
- Completed follow-ups moved out of the active list: duplicate-group
  consolidation (done 2026-07-20, backups in `private.mig_backup_group_*`),
  tag-summary backfill (done 2026-07-20 via
  `scripts/backfill/recompute-tag-summaries.ts`, idempotent, backup
  `private.mig_backup_tag_summaries_20260720`; re-run after any catalogue
  sync).

### Deploy history (times as originally recorded, EDT before 2026-07-20 12:00)

| When (EDT) | Version | Commit | Notes |
|---|---|---|---|
| 07-19 13:24 | `eb4e5821` | `bf081d918` | Live-capture v2. **Rollback target.** |
| 07-19 23:23 | `d80b155c` | `a0eba76fc` | 42501 fix on `tm-stats-app`. Regressed prod. |
| 07-19 23:31 | `7f6c4017` | `369b90182` | Added alias tolerance. Still regressed. |
| 07-20 01:16 | `ffbecea6` | `369b90182` | Clean rebuild. Still regressed. |
| 07-20 01:27 | `eb4e5821` | `bf081d918` | Rollback to restore service. |
| 07-20 01:47 | `219cacee` | `32c381c22` | 42501 fixes on the correct base. Superseded 30s later. |
| 07-20 01:47 | `0732bd81` | `32c381c22` | Same code + pinned Server Actions key. |
| 07-20 02:2x | `ffd765de` | `7972608f8` | Server-side import name matching. |
| 07-20 02:5x | `5d290811` | `48ebf13e6` | Card-type filter fix (project deck). |
| 07-20 03:1x | `501d18ef` | `3a8664e7b` | Page card reads past the 1000-row cap. |
| 07-20 09:5x | `39820427` | `c9eb1924a` | Typed placement contract for tile events. |
| 07-20 10:0x | `1b3dbac3` | `980165021` | Slug tile names into the event identity format. |
| 07-20 10:3x | `21e3047e` | `20921cf46` | Route the import roster by confirmed player id. |
| 07-20 11:14 | `c23bfbd7` | `59dda6c0f` | Name new groups from the roster, not review labels. **Current** (15:14 UTC). |

### Standing operational notes

Note that `wrangler secret put` publishes a **new version** carrying the same
code plus the updated bindings. The 07-20 01:47 deploy uploaded `219cacee`,
then pinning `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` superseded it with
`0732bd81`. Always re-check `wrangler deployments list` after touching
secrets; the version id the deploy printed is not necessarily the one serving
traffic.

**Do not re-add the `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` Worker secret from
PowerShell.** Setting it on 07-20 stored a value that is not valid base64;
wrangler reported success anyway. Next.js decodes that key while rendering
Server Actions, so every authenticated render threw
`InvalidCharacterError: atob() …` twice and Confirm silently did nothing. It was
deleted; the build-time key from `.env.local` still pins actions across builds.
If it is ever set again, write it from a shell that will not mangle stdin and
then load an authenticated page and check `wrangler tail` before believing it.

The three regressed deploys were built on `tm-stats-app`, which predates
migration `20260718041532 remove_game_expansion_tracking`. They threw
`PGRST205: Could not find the table 'public.group_default_expansions'` from
`getGroupSettings()` during render, taking out `/log-game` and
`/log-game/review` for signed-in users. `check:schema` now catches exactly this
class of drift before it reaches production.

Group-surgery note for anyone repeating it: `game_log_events.player_id` and
`owner_player_id` are `ON DELETE SET NULL`, not cascade — re-point events
*before* deleting a player or attribution nulls silently.
