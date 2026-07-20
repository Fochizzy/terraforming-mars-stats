# Deploy state

Shared between concurrent working sessions. **Read this before deploying;
update it immediately after.** The Cloudflare account, the production database,
and this repo are all shared, so this file is the only record of who changed
what.

## Current production

| | |
|---|---|
| Worker version | `0732bd81-5933-4168-86bc-e250350ee43a` |
| Source commit | `32c381c22` |
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
| 07-20 01:47 | `0732bd81` | `32c381c22` | Same code + pinned Server Actions key. **Current.** |

The three regressed deploys were built on `tm-stats-app`, which predates
migration `20260718041532 remove_game_expansion_tracking`. They threw
`PGRST205: Could not find the table 'public.group_default_expansions'` from
`getGroupSettings()` during render, taking out `/log-game` and
`/log-game/review` for signed-in users. `check:schema` now catches exactly this
class of drift before it reaches production.

## Open follow-ups

- **Security-definer matching RPC.** Replaces the interim 42501 tolerance in
  `listPlayerImportAliasesForGroup`. Inputs: imported names. Outputs: player id
  + public name only, never stored alias texts. Design against the
  guest-identity privacy contract; apply under separate authorization after the
  Step 4.3 closure audit. Until it exists, import auto-matching has no
  saved-alias or full-name axis.
- **`tm-stats-app` and `main` are stale — do not deploy them.** Both still
  reference `expansions`, `game_expansions`, and `group_default_expansions`,
  which no longer exist. Merge this branch forward into `main`, make `main` the
  deploy source, and have both sessions branch from it.
