# Venus Next and Colonies capture contract

> **Superseded by [game-capture-contract-v2.md](./game-capture-contract-v2.md).**
> The v2 data-capture-hardening release adds a byte-for-byte immutable source, a
> versioned parser run, one canonical event envelope, canonical board
> placements, map-detection evidence, and coverage telemetry. Venus/Colonies now
> flow through the shared envelope; game-level state still lives in
> `game_expansion_facts`. The v1 tables below (`game_venus_events`,
> `game_colony_events`) remain in place but new imports are captured by v2. This
> document is retained as history of the v1 marker (`venus-colonies-capture-v1`).

This is a hidden, additive import-capture contract. It does not add a dashboard, scoring control, expansion selector, or manual correction field.

## Parser and source rules

- Parser version: `tm-export-log-mechanics-v1`.
- The parser runs after a Web Import has completed successfully, then again when that game is finalized so an explicit source player can be resolved to a stable `players.id` only when that player is a participant.
- It accepts indexed upstream export lines such as `Alice increased Venus scale 2 step(s)`, `Alice built a colony on Titan`, and `Alice spent 3 energy to trade with Titan`.
- It also accepts structured upstream options `venusNextExtension`, `coloniesExtension`, and `venusScaleLevel` when they are present in retained exported state.
- A non-empty log with no Venus or Colonies reference is `confirmed_absent`. A blank log is `incomplete_evidence`; unsupported wording and conflicting option/action evidence retain their explicit states.
- Venus-tagged cards, generic TR changes, generic resource gains, and nearby player text are never used as proof or inferred attribution.

## Established aggregate storage

`public.game_expansion_facts` is the established aggregate record. The owner-confirmed historical backfill is already stored there and this release does not write a second historical backfill or duplicate those fields on `games`.

For each forward capture, `replace_game_mechanic_capture` atomically updates its source import, Venus/Colonies state, provenance, parser version, source coverage, final Venus scale, and Venus/colony action counts. Existing backfill metadata remains intact.

The release marker is `public.game_mechanic_capture_deployments`, keyed by `venus-colonies-capture-v1`. It records the forward-capture cutoff, parser version, deployment timestamp, and production counts.

## Canonical event storage

- `public.game_venus_events` contains only real tracker changes. Its identity is `unique (game_id, event_key)`, where the parser key is `venus:<source-line-index>`.
- `public.game_colony_events` contains only `built_colony` and `traded_with_colony` records. Its identity is `unique (game_id, event_key)`, where the parser key is `colony:<source-line-index>`.
- Both retain original evidence, parser version, confidence, coverage, source-player name, and attribution status. `player_id` is populated only for an exact participant match; otherwise it remains `NULL` with `explicit_unresolved` or `unattributed` status.
- `source_game_log_import_id` is paired with `game_id` through a composite foreign key. The replacement RPC deletes and replaces only a game's event snapshot atomically, so retries cannot accumulate duplicates. Confirmed absence always has zero child rows.

## Access control and compatibility

The event tables have RLS enabled. Group members can read them through `can_read_game(game_id)` and group editors manage them through `can_edit_game(game_id)`. Only `authenticated` receives explicit table and RPC grants. The deployment marker table has RLS and no client policy because it is an operational release record.

`replace_game_mechanic_capture` is `SECURITY INVOKER`. It validates source ownership, explicit states, JSON shape, evidence, and duplicate event keys before writing the existing aggregate fact row and real event arrays. The current UI does not query these tables.

## Operations

The owner confirmed historical games are already backfilled. This migration contains no legacy-game update and must not be used to run another historical backfill.

Before production release:

1. Apply [20260718204000_add_game_mechanic_capture.sql](../supabase/migrations/20260718204000_add_game_mechanic_capture.sql) through the repository-approved production-change process.
2. Deploy the parser in the same release window; do not deploy either half alone.
3. Record the parser deployment time and current counts in `game_mechanic_capture_deployments`.
4. Run [game_mechanic_capture_schema_verification.sql](../supabase/tests/game_mechanic_capture_schema_verification.sql) and the read-only [monitor query](../supabase/scripts/game_mechanic_capture_monitor.sql).

The monitor must report zero post-cutoff finalized games without a matching expansion-fact row, zero duplicate event keys, and zero orphaned events. Parser warnings are retained for a forward fix; they must never be silently backfilled as absence.

Known unsupported patterns in v1 are non-canonical Venus/Colony wording, unknown colony names, and sources that omit a retained log. The rollback plan is forward-only: retain raw logs, fix/add a versioned parser pattern, re-run `replace_game_mechanic_capture` for the affected game, and verify deterministic event keys and state. No production data should be deleted as a rollback mechanism.