# Production execution report — data-capture-hardening-v2

**Status: ACTIVE in production (2026-07-19).** Applied and deployed under explicit
authorization; historical data preserved exactly.

- Project: `tm-stats` (`qjtwgrjjwnqafbvkkfex`)
- Approved commit deployed: `bf081d918` (branch `Fochizzy/moonrakers-app/data-capture-hardening-v2`)
- Approved migration: `supabase/migrations/20260719120000_data_capture_hardening_v2.sql`
- Parser version: `tm-data-capture-v2`

## Deployment sequence (schema before parser)

| Step | What | Timestamp (UTC) | Evidence |
| --- | --- | --- | --- |
| 6 | Schema migration applied | 2026-07-19 13:20:42Z | prod migration version `20260719132042` (name `data_capture_hardening_v2`) |
| 8 | Parser + app deployed (`npm run deploy`) | 2026-07-19 13:24:14Z | Worker version `eb4e5821-49b8-489d-a8c0-4e170f45adbb` @ 100%; `tm-stats.com` HTTP 200 |

Gap schema→parser ≈ 3.5 min (no extended window). Cutoff stamped
`2026-07-19 13:20:42.476Z` on marker `data-capture-hardening-v2`.

## Pre-deployment state (steps 1–4)

Migration-history head `20260718234835 lock_down_public_backup_tables`; capture
worktree clean at `bf081d918`. Counts: 42 games (41 finalized, 1 draft), 42
game-log imports, 14,816 legacy `game_log_events`, 42 `game_expansion_facts` (all
historical owner-confirmed absence), 0 non-null final Venus, 0 v1 Venus/colony
events, v2 objects absent.

## Schema verification (step 7)

8/8 capture tables + catalogs (13 colonies, 23 event-type pairs); RPC
`replace_game_capture_v2` present as SECURITY INVOKER; 4 triggers present; RLS
6/6 new tables; 0 anon table grants; authenticated SELECT 6/6; event-type FK +
game_player composite FK + `game_players (game_id,id)` unique constraint; anon
revoked on v1 event tables. Historical: 42 games, 42 historical expansion facts,
0 non-null final Venus, 0 v1 Venus/colony events, 0 v2 rows (no reparse).

## Deploy verification (step 9)

Deployed server bundle contains `tm-data-capture-v2` and `replace_game_capture_v2`
(`.open-next/server-functions/default/.next/server/chunks/270.js`). Worker
version `eb4e5821` live at 100%; site HTTP 200.

## Production capture verification (steps 10–12)

A throwaway post-cutoff verification game (isolated synthetic group, deleted
afterward — the 42 historical games were never touched) was captured through the
live production `replace_game_capture_v2`:

- immutable source retained; `source_sha256` present (64 hex) and matches the
  stored original text exactly;
- parser version `tm-data-capture-v2` recorded on the parser run;
- 6 canonical events + 1 board placement; 4 events resolved to stable participants;
- Venus/Colonies state `confirmed_absent`/`confirmed_absent` (non-null);
  `final_venus_scale` NULL (missing ≠ zero);
- **idempotency:** three total captures of the identical source →
  sources 1, parser_runs 1, events 6, placements 1, 0 duplicate events, 0
  duplicate placements;
- unsupported evidence nonblocking and editor-only (0 unsupported here).

### Post-deployment report (with the verification game present)

historical game count (pre-cutoff) 42; historical expansion-fact count 42;
historical Venus events 0; historical Colony events 0; v2 source count 1; v2
parser-run count 1; v2 canonical-event count 6; v2 board-placement count 1;
duplicate events 0; duplicate placements 0; orphan events 0; orphan placements 0;
synthetic blank events 0; post-cutoff finalized games 1; post-cutoff source
retained 1; post-cutoff parser version present 1; null post-cutoff Venus 0; null
post-cutoff Colonies 0; unsupported-pattern count 0; parser-failure count 0.

**All required immediate results met:** historical expansion-fact rows unchanged;
historical Venus events 0; historical Colony events 0; duplicate canonical events
0; duplicate canonical placements 0; orphaned events 0; orphaned placements 0;
synthetic blank events 0.

### Post-cleanup baseline

Verification game removed (cascade). Production: 42 games, 42 expansion facts (all
historical), 0 non-null final Venus, 0 remaining v2 capture rows, 0 v1 events,
synthetic group gone, v2 marker retained. Marker: `parser_deployed_at`
2026-07-19 13:24:14Z, `production_game_count` 42, `recorded_at` set.

## Ongoing monitoring

Read-only [`game_capture_v2_monitor.sql`](../supabase/scripts/game_capture_v2_monitor.sql)
and sanitized [`game_capture_v2_unsupported_report.sql`](../supabase/scripts/game_capture_v2_unsupported_report.sql).
Every real new post-cutoff finalized import must show: source retained, source
hash present, parser version present, Venus/Colonies state non-null, retries
idempotent, unsupported evidence nonblocking + private. `unattributed_events` may
be non-zero and is expected (counted, not a failure).

## Known unsupported patterns

Non-canonical Venus/Colony wording, unknown colony names, and sources with no
retained log are retained privately in `game_capture_unsupported_evidence` (never
backfilled as absence). Forward fix: add a versioned parser pattern and re-run
`replace_game_capture_v2` for the affected game; deterministic ids keep it
idempotent.

## Non-blocking warnings

1. `anon` retains EXECUTE on `replace_game_capture_v2` via Supabase's default
   function privileges (approved migration revokes from `public` + grants
   `authenticated`, same pattern as the v1 RPC). Not exploitable: SECURITY
   INVOKER → an anon caller runs as anon, cannot see any game (RLS) and has no
   table grants, so it errors before writing. Optional future hardening:
   `revoke execute on function public.replace_game_capture_v2(uuid,uuid,jsonb) from anon`.
2. Prod recorded the migration as version `20260719132042` while the repo file is
   `20260719120000` (apply-time version), mirroring the earlier v1
   `20260718204000`↔`20260718212722` case. The marker's `schema_migration_version`
   records the repo name. Cosmetic.
3. The build emitted benign esbuild "duplicate object key" warnings in the
   pre-existing minified analytics bundle (`.open-next/.../handler.mjs`) — not
   errors; unrelated to this release.
4. Server Actions encryption key is not pinned (no runtime secret; build is
   self-consistent) — matches every existing deploy; only effect is a transient,
   refresh-resolved "Server Action not found" for sessions spanning the deploy.
