# Production package — data-capture-hardening-v2

Status: **prepared and validated; production not mutated.** Awaiting explicit
authorization before any migration or deploy.

Base: `origin/tm-stats-app` @ `3904561360046ad1fc1c8eb15e5de92763390292`
("feat: capture Venus and Colonies game mechanics").
Supabase project: `tm-stats` (`qjtwgrjjwnqafbvkkfex`, us-east-1, ACTIVE_HEALTHY).

## 1. Exact migrations

| File | Role | Applies to production? |
| --- | --- | --- |
| `supabase/migrations/20260718200536_add_venus_colonies_import_facts.sql` | Schema-only reconstruction of the already-applied production migration so a clean baseline builds. | **No** — version `20260718200536` is already in production migration history; `supabase db push` skips it. |
| `supabase/migrations/20260719120000_data_capture_hardening_v2.sql` | The additive v2 capture schema. | **Yes** — the one migration to apply. |

### Migration-history caveat (must be handled at deploy)

Production history contains the v1 mechanic migration as version **`20260718212722`**
(name `20260718204000_add_game_mechanic_capture`), while the repo file is version
**`20260718204000`**. A plain `supabase db push` would therefore also try to
re-apply `20260718204000`. That file is fully idempotent (`create table if not
exists`, `create or replace function`, `drop policy if exists`, `on conflict do
nothing`), so re-running is harmless — but to avoid the phantom, either:

- run `supabase migration repair --status applied 20260718204000` first, or
- apply **only** `20260719120000_data_capture_hardening_v2.sql` through the
  approved production-change process (recommended).

## 2. Affected tables and expected row effects (of the migration itself)

No existing data rows are modified by the migration. Concretely:

| Object | Effect |
| --- | --- |
| `game_capture_import_sources`, `game_capture_parser_runs`, `game_capture_events`, `game_capture_board_placements`, `game_capture_map_detections`, `game_capture_unsupported_evidence` | Created empty (RLS on, authenticated-only grants). |
| `capture_colony_catalog` | +13 rows (canonical colonies). |
| `capture_event_type_catalog` | +24 rows (canonical category/type pairs). |
| `game_players` | +1 `unique (game_id, id)` constraint (index build over ~168 rows; trivial). |
| `game_venus_events`, `game_colony_events` | `REVOKE ALL ... FROM anon` (RLS already blocked anon; removes stray grant). No row changes. |
| `game_mechanic_capture_deployments` | +1 row (`data-capture-hardening-v2`). v1 marker untouched. |
| `game_expansion_facts` | **0 rows changed by the migration.** Only future captures update forward rows; the 42 historical rows are never touched. |
| `game_log_events` (14,816 rows) | Untouched. |
| Functions/triggers | `replace_game_capture_v2`, `enforce_capture_source_immutability`, `enforce_capture_player_scope`, `enforce_capture_colony_catalog` created. |

## 3. Deployment action (coordinated release — schema before parser)

1. Apply `20260719120000_data_capture_hardening_v2.sql` (approved process).
2. Deploy the parser in the **same** release window: `npm.cmd run deploy`
   (`opennextjs-cloudflare build && opennextjs-cloudflare deploy`) to
   `tm-stats.com`. Do not deploy either half alone.
3. Record `parser_deployed_at` (and current counts) on the v2 marker:
   `update public.game_mechanic_capture_deployments set parser_deployed_at = now(), recorded_at = now() where deployment_key = 'data-capture-hardening-v2';`
4. Run the read-only monitor and confirm the required-zero results.

The cutoff (`cutoff_at`) is stamped when the migration runs. Games imported
after it are classified by the parser; games before it keep their provenance.

## 4. Risk analysis

- **Additive + idempotent.** No object dropped; every statement guarded. Applying
  twice is a no-op (validated). Existing import/scoring behaviour unchanged.
- **Non-blocking capture.** Import and finalize wrap capture in try/catch; a
  capture failure logs and is left for a forward re-run, never blocking a game.
- **Player-scope trigger is `SECURITY DEFINER`** so the "unrelated player
  rejection" guarantee holds under any writing role. It is a trigger (not
  client-EXECUTE-exposed) with a fixed `search_path`.
- **Workers runtime:** source hashing uses Web Crypto (`crypto.subtle`),
  available in the Cloudflare Workers runtime and Node.
- **Added queries** on finalize (participants + reference catalogues) — small,
  cached, and non-blocking.
- **Phantom `20260718204000` re-apply** — idempotent; see §1 caveat.
- **Reversibility:** additive schema; capture can be disabled by reverting the
  parser deploy while leaving the (empty, harmless) tables in place.

## 5. Rollback / forward-fix plan (forward-only)

No production data is deleted as a rollback mechanism. Raw sources are immutable
and retained. To fix a parser gap: add/adjust a versioned parser pattern, then
re-run `replace_game_capture_v2` for the affected game (deterministic ids make
this idempotent). To stand down entirely: revert the frontend/parser deploy; the
schema stays (empty tables, no effect on the current site).

## 6. Monitoring

Read-only: [`supabase/scripts/game_capture_v2_monitor.sql`](../supabase/scripts/game_capture_v2_monitor.sql)
and the sanitized [`game_capture_v2_unsupported_report.sql`](../supabase/scripts/game_capture_v2_unsupported_report.sql).

Required ongoing results for post-cutoff finalized games: `games_missing_source`,
`games_missing_parser_version`, `games_null_venus_state`,
`games_null_colonies_state`, `duplicate_canonical_events`,
`orphaned_canonical_events`, `synthetic_blank_events` — **all zero**.
`unattributed_events` may be non-zero and is expected (counted explicitly, not a
failure).

## 7. Validation performed (local + disposable Postgres, no production writes)

Docker/WSL is unavailable in this environment, so the full-stack `supabase db
reset` could not run. Instead the migrations were validated on a disposable
native PostgreSQL 18 cluster against a faithful bootstrap of the production
dependency surface (Supabase roles, `auth` shim, prerequisite tables, real RLS
helpers).

| Check | Command | Result |
| --- | --- | --- |
| Clean-baseline apply | `node scripts/run-capture-v2-db-tests.mjs` (setup phase) | bootstrap + reconstruction + v1 + v2 apply cleanly |
| Idempotency | same runner (re-applies v2) | second apply is a no-op |
| Executable DB integration tests | `npm run test:db:capture` | **7/7 files pass** (baseline, capture+retry idempotency, immutable source, constraints, attribution scope, null-vs-zero + historical preservation, RLS/grants) |
| TypeScript | `npx tsc --noEmit` | **0 errors** |
| Focused Vitest | `npx vitest run src/lib/imports/capture src/lib/db/game-mechanic-capture-repo.test.ts src/lib/db/game-import-repo.test.ts src/lib/db/game-draft-repo.test.ts` | **55/55 pass** |
| Full Vitest | `npm run test` | 873 pass; **8 failures pre-existing** on the pristine base (env, auth/callback, auth/reset-pin, insights global-loss-cards, group page — verified identical via `git stash`), unrelated to capture |

Fixture inventory: `src/lib/imports/capture/__fixtures__/fixtures.ts` — 6
sanitized, format-faithful fixtures (base no-expansions, Venus only, Colonies
only, both, row/position + off-reserve ocean, unsupported wording), each with
source/date/version/sanitization/expected. Real production exports contain no
Venus/Colonies/Turmoil gameplay, so those scenarios are necessarily synthetic;
no real names or production identifiers are committed.

## 8. Historical read-only production report (recalculated live 2026-07-18)

- Games 42 (finalized 41, draft 1); game-log imports 42, all with non-empty
  retained raw text; `game_expansion_facts` 42.
- All 42 have `historical_parser_verified_owner_confirmed_absent` for Venus and
  Colonies; `final_venus_scale` non-null: 0; typed Venus events 0; colony events 0.
- `game_log_events` 14,816. `games` has **no** Venus/Colonies columns.
- Deployment markers: `venus-colonies-capture-v1` present (1 row).
- These 42 historical records are preserved exactly by v2.

## 9. Turmoil (read-only evidence)

Read-only scan of all 42 retained logs: **zero** occurrences of `turmoil`,
`delegate`, `chairman`, dominant/ruling party or political wording, or a
`turmoilExtension` option. Current exports contain **no authoritative Turmoil
evidence**. Group intent before the redesign launch is unknown. Recommendation:
do not implement Turmoil now; if the group intends to play it, capture it under a
separate bounded proposal once exports carry authoritative markers. Generic
expansion tracking is not reintroduced.

## 10. Explicit approval request

The following require production authorization and have **not** been performed:

1. Apply `20260719120000_data_capture_hardening_v2.sql` to `tm-stats`
   (`qjtwgrjjwnqafbvkkfex`), handling the §1 migration-history caveat.
2. Deploy the parser (`npm.cmd run deploy`) in the same release window.
3. Stamp `parser_deployed_at` on the v2 marker and run the monitor.

The RLS backup-table security finding (separate document) is an independent
decision and is **not** bundled into this release.
