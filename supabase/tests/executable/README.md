# Executable migration + integration tests (Phase 4 Step 4.3 remediation)

These tests run the real migration SQL against a real PostgreSQL engine, rather
than asserting on migration text. They exist because Docker/`supabase start` is
unavailable in this environment; a disposable, trust-authenticated PostgreSQL 18
cluster is created on a spare port instead (see the
`docker-wsl-unavailable-native-pg` note).

## What it validates

`run.sh` creates a throwaway cluster, applies a Supabase-compatible bootstrap
(`bootstrap.sql`: `anon`/`authenticated`/`service_role` roles, an `auth` schema
with `auth.uid()`, a minimal `storage` schema, `pgcrypto`), then:

1. **Full history replay** — every migration in `supabase/migrations/` applies
   cleanly, including `20260718212339` (privacy), `20260718212340` (event
   contract), `20260718212342` (objective aliases), and `20260719234500`
   (confidence/review-state split). The alias migration is deferred until the
   objective catalogue is seeded, because its precondition correctly refuses to
   run against a catalogue that does not match the approved mapping (the
   catalogue is seed data, not a migration). The split migration is deferred
   until two legacy overloaded `confidence_level = 'reviewed'` rows are seeded,
   so its deterministic data mapping is exercised against real rows.
2. **Behavioural assertions** (`assertions.sql`):
   - 23 canonical colonies and 7 catalog aliases are present.
   - the overloaded confidence `reviewed` is **rejected** after the split; an
     unsupported confidence is rejected; every canonical `review_state`
     persists and an unsupported one is rejected; a missing `review_state`
     defaults to `not_required`.
   - the seeded legacy rows were split deterministically: the
     importer-corrected row became `high`/`reviewed`, the unresolved-colony row
     became `low`/`needs_review`, and no `reviewed` confidence survives.
   - the `event_type` allowlist rejects unknown types.
   - a tile event missing typed placement identity/provenance is rejected.
   - a malformed deterministic `event_identity` is rejected.
   - a `colony_id` outside the canonical catalogue is rejected; a valid one is
     accepted.
   - an ordinary `authenticated` member cannot directly read
     `private.player_private_identities` or `public.player_import_aliases`.
3. **Idempotency** — re-applying the alias migration leaves exactly 7 aliases.
4. **Rollback** — deleting the seven deterministic alias ids removes only them
   and leaves unrelated aliases untouched.

The test database sets `check_function_bodies = off`, mirroring how the
migration tool applies functions (one historical OCR function has a stale body
that a later migration replaces before it is ever called).

## Running

```bash
PGBIN="/c/Program Files/PostgreSQL/18/bin" bash supabase/tests/executable/run.sh
```

Override `PGBIN`, `PGPORT`, or `PGDATA` as needed. The cluster is torn down on
exit. A non-zero exit status indicates a failure.

## Rollback scope of the remediation migrations

- **`20260718212342` (aliases)** — reversible by deleting only the seven
  deterministic alias row ids (tested above). Canonical objectives, maps,
  relationships, and historical game ids are untouched.
- **`20260718212339` (privacy)** — structurally reversible: move
  `player_private_identities` back to `public`, restore the two member-scoped
  policies and grants, and restore the invoker-security resolver. The one-way
  effect is the neutralised `players.display_name` values for unlinked guests;
  restoring the original personal-name labels is intentionally **not** part of
  rollback, since removing them from the public column is the point.
- **`20260718212340` (event contract)** — the additive columns, constraints,
  indexes, and the `terraforming_mars_colonies` table can be dropped, and the
  confidence constraint restored to `high/medium/low`, to reverse the schema.
  The `replace_game_log_events` function reverts to its prior definition from
  `20260718200536`.
