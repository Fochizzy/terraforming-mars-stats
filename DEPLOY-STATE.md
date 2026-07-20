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
| Worker version | `c23bfbd7-9729-4981-9f45-aee05c242d31` |
| Source repository | `github.com/Fochizzy/terraforming-mars-stats` |
| Source branch | `fix/live-42501-on-capture-v2` (tracked at `origin/fix/live-42501-on-capture-v2`, tip `14abb8d1d` = one docs-only commit ahead of the deployed code) |
| Source commit | `59dda6c0f` (ledger-correlated; Cloudflare metadata carries no commit — see Evidence) |
| Deployed (UTC) | 2026-07-20 15:14:05Z (`wrangler deployments list`) |
| Deploy lock | **Izzy** |
| Active clean deployment worktree | `C:\tmp\tm-step-43-production-reader` on branch `release/step-43-production-compatibility` (created from `origin/fix/live-42501-on-capture-v2` @ `14abb8d1d`) |
| DB migration ledger head | `20260720021300 add_import_player_name_matching_rpc` |
| Rollback worker version | `eb4e5821` (live-capture v2 build, commit `bf081d918`) |
| Verified | 2026-07-20 16:44 UTC, against `wrangler deployments list`, `origin/fix/live-42501-on-capture-v2`, and the production migration ledger |

**Evidence for the source commit.** Every Cloudflare deployment record shows
`Source: Unknown` with no message or tag, so the version→commit linkage above
rests on this ledger's own deploy history plus branch archaeology (the
2026-07-20 third-remediation audit re-verified it). That is exactly the gap the
runtime deployment stamp closes: **from the next release onward,
`/api/deploy-info` on the deployed worker is the authoritative source of the
running commit, branch, build time, and environment** — this table then merely
mirrors it.

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

- **Step 4.3 expand/contract pair (in progress).** The privacy-compatible
  reader (public-name labels, coarse match-reason consumption, tile
  attribution, deployment stamp) is prepared on
  `release/step-43-production-compatibility` and awaits an explicitly
  authorized code-only deploy. Only after that deploy is runtime-verified may
  the paired contract migration `20260720120000
  coarsen_import_name_match_reasons` be applied — under its own separate
  authorization, per the redesign repo's gated-migration ledger. The 114-row
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
