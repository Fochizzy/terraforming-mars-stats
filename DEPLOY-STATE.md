# Deploy state

Shared between concurrent working sessions. **Read this before deploying;
update it immediately after.** The Cloudflare account, the production database,
and this repo are all shared, so this file is the only record of who changed
what.

## Current production

| | |
|---|---|
| Worker version | `501d18ef-fea8-46ce-ba4a-7f7278945995` |
| Source commit | `3a8664e7b` |
| Source branch | `fix/live-42501-on-capture-v2` (off `data-capture-hardening-v2` @ `64918663a`) |
| Built | 2026-07-20 01:47 UTC |
| Deploy lock | Izzy |

Note that `wrangler secret put` publishes a **new version** carrying the same
code plus the updated bindings. This deploy uploaded `219cacee`, then pinning
`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` superseded it with `0732bd81`. Always
re-check `wrangler deployments list` after touching secrets; the version id the
deploy printed is not necessarily the one serving traffic.

`wrangler` records no source commit (`Source: Unknown (version_upload)`), which
is why the previous build had to be identified forensically: its
`compatibility_date` of 2026-07-14 matched `data-capture-hardening-v2` and not
`tm-stats-app`'s 2026-07-04, the branch contained `8c33bc0f2 fix: remove stale
expansion tracking`, and the branch tip was committed 20 minutes after the
build. Fill the commit in above on every deploy so nobody repeats that.

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
4. **Record every deploy below**, worker version *and* source commit.

## History

| When (UTC) | Version | Commit | Notes |
|---|---|---|---|
| 07-19 13:24 | `eb4e5821` | `bf081d918` | Live-capture v2. |
| 07-19 23:23 | `d80b155c` | `a0eba76fc` | 42501 fix on `tm-stats-app`. Regressed prod. |
| 07-19 23:31 | `7f6c4017` | `369b90182` | Added alias tolerance. Still regressed. |
| 07-20 01:16 | `ffbecea6` | `369b90182` | Clean rebuild. Still regressed. |
| 07-20 01:27 | `eb4e5821` | `bf081d918` | Rollback to restore service. |
| 07-20 01:47 | `219cacee` | `32c381c22` | 42501 fixes on the correct base. Superseded 30s later. |
| 07-20 01:47 | `0732bd81` | `32c381c22` | Same code + pinned Server Actions key. |
| 07-20 02:2x | `ffd765de` | `7972608f8` | Server-side import name matching. |
| 07-20 02:5x | `5d290811` | `48ebf13e6` | Card-type filter fix (project deck). |
| 07-20 03:1x | `501d18ef` | `3a8664e7b` | Page card reads past the 1000-row cap. **Current.** |

The three regressed deploys were built on `tm-stats-app`, which predates
migration `20260718041532 remove_game_expansion_tracking`. They threw
`PGRST205: Could not find the table 'public.group_default_expansions'` from
`getGroupSettings()` during render, taking out `/log-game` and
`/log-game/review` for signed-in users. `check:schema` now catches exactly this
class of drift before it reaches production.

## Open follow-ups

- **Duplicate-group consolidation — pending the Step 4.3 audit.** Six unlinked
  rows are the entire membership of two duplicate groups: `869467ec` duplicates
  `0bed9a67` (4 phantoms, 0 games, plus a broken empty draft `feaa89ab`), and
  `987ce716` duplicates `19426f66` (2 rows holding 2 games and 83 log events).
  Fixing means moving those 2 games onto the linked Izzy/James in `19426f66`,
  re-pointing the log events, then dropping both groups. Note
  `game_log_events.player_id` / `owner_player_id` are `ON DELETE SET NULL`, not
  cascade, so events must be re-pointed *before* any delete, inside one
  transaction with a `mig_backup_*` snapshot. Held because it changes the very
  row counts the Step 4.3 historical-preservation audit verifies.
- **Jenna Kass's game needs re-importing.** Her group `6cb73dce`
  ("Colette LeRoux / Corey Jansen / Jenna Kass") and its games were destroyed by
  the 2026-07-12 group migrations. Only score rows survive, in
  `mig_backup_game_players` for games `e58c3171` / `e061fb0d` — which are
  duplicates of one another, so it is one real game, not two. Re-import the log
  rather than restoring: the backup has no `played_on`, map, generation count,
  or log events. Verify against Corey 117 / Colette 79 / Jenna 73.
- **`tm-stats-app` and `main` are stale — do not deploy them.** Both still
  reference `expansions`, `game_expansions`, and `group_default_expansions`,
  which no longer exist. Merge this branch forward into `main`, make `main` the
  deploy source, and have both sessions branch from it.
