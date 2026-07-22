# Deploy state

Shared between concurrent working sessions. **Read this before deploying;
update it immediately after.** The Cloudflare account, the production database,
and this repo are all shared, so this file is the only record of who changed
what.

## Current production

| | |
|---|---|
| Worker version | `c23bfbd7-9729-4981-9f45-aee05c242d31` |
| Source commit | `59dda6c0f` |
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
| 07-20 03:1x | `501d18ef` | `3a8664e7b` | Page card reads past the 1000-row cap. |
| 07-20 09:5x | `39820427` | `c9eb1924a` | Typed placement contract for tile events. |
| 07-20 10:0x | `1b3dbac3` | `980165021` | Slug tile names into the event identity format. |
| 07-20 10:3x | `21e3047e` | `20921cf46` | Route the import roster by confirmed player id. |
| 07-20 11:0x | `c23bfbd7` | `59dda6c0f` | Name new groups from the roster, not review labels. **Current.** |

> **This branch is not on any remote.** `fix/live-42501-on-capture-v2` is 15+
> commits ahead of `data-capture-hardening-v2`, and neither branch has been
> pushed. Production runs code that exists only on one machine, and deploying
> `data-capture-hardening-v2` would revert every fix below at once. Push before
> anything else:
> `git push -u origin fix/live-42501-on-capture-v2`

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

## Production database changes (no deploy)

Schema changes applied directly to production, with no Worker/app deploy. These
do **not** appear in the deploy History table above.

| When (UTC) | Ledger version | Migration | Provenance |
|---|---|---|---|
| 2026-07-22 13:21 | `20260722132159` | `add_source_bound_import_identity_staging` | `redesign/tm-stats-dashboard-rebuild` @ `484eec90e` |
| 2026-07-22 14:40 | `20260722144034` | `coarsen_import_name_match_reasons` | `redesign/tm-stats-dashboard-rebuild` @ `37065ec9b` |

**2026-07-22 — coarsened import name match reasons (INTERIM MITIGATION, NOT A
CLOSURE).** Replaced the body of the live
`public.match_import_player_names(uuid, text[])` so it discloses only a coarse
`exact` / `partial` classification instead of the field-identifying
`display_name_exact` / `full_name_exact` / `alias_exact` / `username_exact`
values, and bounded candidate input to 64 names of at most 128 characters.
**No Worker deploy, no `wrangler deploy`, no push was involved**; this was a
database-only change.

- **In plain words: the enumeration oracle is NOT closed.** Independent review
  found this change *insufficient as a closure*. It stops a caller learning
  *which private field* matched, but it does **not** stop a caller confirming
  that a private name they supply belongs to a real identity — the function is
  still `SECURITY DEFINER`, `authenticated` still holds `EXECUTE`, and a
  matching name still returns a row. This was applied solely to reduce exposure
  while the real fix (a compatible source-bound reader, then the contraction
  `20260722012707`) is built.
- **Ledger-version drift.** The repo filename is
  `20260720120000_coarsen_import_name_match_reasons.sql`, but the tool stamps
  apply-time UTC, so the ledger recorded **`20260722144034`**. Same precedent as
  `20260722012658`→`20260722132159`. Reconcile by migration *name*, not version.
- **Nothing was granted or revoked.** The ACL was verified **hash-identical**
  before and after (sha256 `6517848c…`,
  `postgres=X/postgres | authenticated=X/postgres | service_role=X/postgres`).
  `SECURITY DEFINER`, `search_path=""` and STABLE all survived the replace.
- **The return signature is unchanged** (sha256 `d8d91a90…`), which the deployed
  reader depends on. Only the body and language changed (`sql` → `plpgsql`).
- **Deployed-reader compatibility was gated before applying.** Live worker
  `178229f3-bfa4-4776-826a-e344daf23d72` (source `4dec49a42`) already tolerates
  coarse reasons: `coarsenMatchReason()` maps both `'exact'` and any `*_exact`
  to exact, `match_score` is never consumed (0 references), and the client caps
  requests at the same 64 / 128 bounds.
- **Rollback pre-image captured and byte-verified** before the apply (3335
  bytes, sha256 `2c8c9395cee6b8d127557a7cb05324f1ccef6a14fd2374ee385c091aa4da4d19`).
  See `docs/agent-handoffs/IMPORT-ORACLE-INTERIM-MITIGATION-APPLY.md`.
- **The contraction is still NOT applied.** `20260722012707`
  (`retire_free_form_import_name_matcher`) requires separate authorization.

**2026-07-22 — source-bound import identity staging (EXPANSION half).**
Applied the expansion migration of the source-bound import identity
remediation. **No Worker deploy, no `wrangler`, no push was involved**; this was
a database-only change.

- **Ledger-version drift.** The repo filename is
  `20260722012658_add_source_bound_import_identity_staging.sql`, but the tool
  stamps apply-time UTC, so the ledger recorded **`20260722132159`**. Same
  precedent as `20260720190000`→`20260720221937` and
  `20260721173000`→`20260721201734`. The repo filename and the ledger version
  will not match; reconcile by migration *name*, not version.
- **Two live tables were modified**, so this is not purely additive:
  1. a **UNIQUE index on `public.user_profiles`** over
     `private.normalize_guest_username(username)` (partial, non-empty only);
  2. an **`AFTER UPDATE OF status` trigger on `public.games`**
     (`delete_finalized_import_identity_staging`) that clears staging rows when
     a game is finalized. This is the *first* user trigger on `public.games`.
- **Nothing was revoked from any pre-existing object.** The legacy free-form
  matcher `public.match_import_player_names(uuid, text[])` and its
  `authenticated` EXECUTE grant are **unchanged** — ACL verified byte-identical
  before and after (`postgres=X/postgres | authenticated=X/postgres |
  service_role=X/postgres`).
- **The contraction is NOT applied.** `20260722012707`
  (`retire_free_form_import_name_matcher`) requires separate authorization, and
  the free-form enumeration oracle stays **OPEN** until it is. See
  `docs/agent-handoffs/IMPORT-IDENTITY-EXPANSION-APPLY.md`.

## Open follow-ups

- **This file has forked, and this copy is stale. Reconcile the two copies.**
  The "Current production" block above names worker
  `c23bfbd7-9729-4981-9f45-aee05c242d31` @ `59dda6c0f`, which is **six deploys
  old** — `wrangler deployments list` shows the live version is
  `178229f3-bfa4-4776-826a-e344daf23d72` (2026-07-21 19:49 UTC, 100%). The
  canonical copy of this file lives on the live-site lineage (the newest
  `docs/*` deploy-record branch), not on
  `redesign/tm-stats-dashboard-rebuild`.
  **Both database entries recorded in this file's "Production database changes"
  section — `20260722132159` and `20260722144034` — are missing from the
  canonical copy and must be carried across.** Reconciling the fork is a
  separate task and was explicitly out of scope for the 07-22 14:40 apply; it
  was recorded, not fixed.

- **Grant `EXECUTE` on `private.normalize_guest_username` to `service_role`.**
  The new `user_profiles_normalized_username_key` functional index means index
  maintenance evaluates `private.normalize_guest_username(username)` on every
  `user_profiles` INSERT/UPDATE — and PostgreSQL **does** enforce `EXECUTE` on
  an index-expression function at DML time (verified empirically on a
  rolled-back temp table: `service_role` and `anon` both got
  `42501 permission denied for function normalize_guest_username`; the same
  insert without the index succeeded). That function is granted only to
  `postgres` and `authenticated`.
  **Nothing is broken today** — every current writer is safe: the only app
  writer (`src/lib/db/user-profile-repo.ts`) uses the session/`authenticated`
  client, and all three DB writers (`handle_new_auth_user`,
  `claim_player_profile`, `claim_player_profiles_by_name`) are `SECURITY
  DEFINER` owned by `postgres`. Signup is unaffected; reads never evaluate
  index expressions.
  **The hazard is latent:** any future server code writing `user_profiles`
  through `createSupabaseAdminClient()` (service_role) will fail with 42501.
  Handle as a separate authorized change.

- ~~**Duplicate-group consolidation**~~ — done 2026-07-20. Both duplicate-roster
  pairs merged (`987ce716`→`19426f66`, `fd69bce9`→`817f330c`), the empty group
  removed, all group names realigned to their rosters, and Jenna Kass's
  identity repaired. Final: 10 groups, 27 players, 1 unlinked, 44 games, 121
  game_players, zero duplicate names, zero name/roster mismatches. Backups:
  `private.mig_backup_group_merge_20260720`,
  `private.mig_backup_group_merge2_20260720`,
  `private.mig_backup_group_names_20260720`,
  `private.mig_backup_jenna_fix_20260720`.
  Note for anyone doing similar surgery: `game_log_events.player_id` and
  `owner_player_id` are `ON DELETE SET NULL`, not cascade — re-point events
  *before* deleting a player or attribution nulls silently.
- ~~**Previous consolidation note**~~ superseded by the entry above. Six unlinked
  rows are the entire membership of two duplicate groups: `869467ec` duplicates
  `0bed9a67` (4 phantoms, 0 games, plus a broken empty draft `feaa89ab`), and
  `987ce716` duplicates `19426f66` (2 rows holding 2 games and 83 log events).
  Fixing means moving those 2 games onto the linked Izzy/James in `19426f66`,
  re-pointing the log events, then dropping both groups. Note
  `game_log_events.player_id` / `owner_player_id` are `ON DELETE SET NULL`, not
  cascade, so events must be re-pointed *before* any delete, inside one
  transaction with a `mig_backup_*` snapshot. Held because it changes the very
  row counts the Step 4.3 historical-preservation audit verifies.
- **Tag summaries were backfilled on 2026-07-20** via
  `npx tsx scripts/backfill/recompute-tag-summaries.ts` (dry run by default,
  `--apply` to write). It rewrote 1582 rows across 41 imports, taking card
  matching from 98.3% to 100% (4772/4772) and recovering 81 cards that were
  unresolved at import time. Net tags moved -9, because the 07-18 upstream
  catalogue sync revised gameplay tags on cards that had already been imported;
  the backfill adopts the current catalogue. Backup:
  `private.mig_backup_tag_summaries_20260720` (1694 rows). The script is
  idempotent — a second dry run reports zero changes. Re-run it after any
  catalogue sync.
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
