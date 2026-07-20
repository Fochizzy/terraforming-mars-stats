#!/usr/bin/env bash
#
# Executable migration + integration test for the Phase 4 Step 4.3 remediation
# migrations (20260718212339 privacy, 20260718212340 event contract,
# 20260718212342 objective aliases).
#
# It stands up a disposable, trust-authenticated PostgreSQL cluster (no Docker),
# replays the full migration history on it, then applies the alias migration
# against a seeded objective catalogue and runs behavioural assertions,
# idempotency, and a rollback check. Exit status is non-zero on any failure.
#
# Usage:
#   PGBIN="/c/Program Files/PostgreSQL/18/bin" bash supabase/tests/executable/run.sh
#
# The migration tool applies function bodies with check_function_bodies=off, so
# the test database mirrors that (one historical OCR function has an intentionally
# stale body that a later migration replaces before it is ever called).
set -euo pipefail

PGBIN="${PGBIN:-/c/Program Files/PostgreSQL/18/bin}"
PORT="${PGPORT:-55432}"
PGDATA="${PGDATA:-C:/tmp/tm_pg_test}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
MIGRATIONS="$REPO/supabase/migrations"
ALIAS_MIGRATION="$MIGRATIONS/20260718212342_add_objective_catalog_aliases.sql"
SPLIT_MIGRATION="$MIGRATIONS/20260719234500_separate_event_confidence_from_review_state.sql"
PLACEMENT_MIGRATION="$MIGRATIONS/20260720110000_extend_canonical_board_placement_contract.sql"

cleanup() { "$PGBIN/pg_ctl" -D "$PGDATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$PGDATA"; }
trap cleanup EXIT

"$PGBIN/pg_ctl" -D "$PGDATA" stop -m immediate >/dev/null 2>&1 || true
rm -rf "$PGDATA"
"$PGBIN/initdb" -D "$PGDATA" -U postgres -A trust -E UTF8 >/dev/null
"$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PORT -c listen_addresses=127.0.0.1" -l "$PGDATA/log" -w start >/dev/null

PSQL() { "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -d tmtest "$@"; }
"$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -d postgres -q \
  -c "create database tmtest;" \
  -c "alter database tmtest set check_function_bodies = off;"

echo "== bootstrap Supabase-compatible roles/auth/storage =="
PSQL -q -f "$HERE/bootstrap.sql"

echo "== replay migration history (alias + split + placement-contract deferred) =="
for f in "$MIGRATIONS"/*.sql; do
  [ "$f" = "$ALIAS_MIGRATION" ] && continue
  [ "$f" = "$SPLIT_MIGRATION" ] && continue
  [ "$f" = "$PLACEMENT_MIGRATION" ] && continue
  PSQL -q -f "$f"
done
echo "   history applied"

echo "== seed prerequisites + canonical objective catalogue =="
PSQL -q -f "$HERE/seed.sql"

echo "== apply objective alias migration =="
PSQL -q -f "$ALIAS_MIGRATION"

echo "== seed legacy overloaded 'reviewed' confidence rows (pre-split contract) =="
PSQL -q -c "insert into public.game_log_events (game_log_import_id, event_order, event_type, raw_line, confidence_level, event_identity, payload) values
  ('44444444-4444-4444-8444-444444444444', 900, 'milestone_claimed', 'X claimed Terraformer', 'reviewed', null, '{\"resolution\":\"corrected\"}'::jsonb),
  ('44444444-4444-4444-8444-444444444444', 901, 'colony_traded', 'X traded with Atlantis', 'reviewed', '901:colony_traded:none', '{\"canonical_colony_name\":\"Atlantis\"}'::jsonb);"

echo "== pre-migration RPC payload compatibility (deployed contract) =="
# The exact payload the redesign emits — including the review_state key —
# must succeed against the PRE-split RPC (which ignores the extra key), and
# the review_state column must not exist yet. This is the state production
# is in today: review_state is computed and cannot persist until the gated
# migration is applied.
PSQL -q -f "$HERE/pre-split-compat.sql"

echo "== apply confidence/review-state split migration =="
PSQL -q -f "$SPLIT_MIGRATION"

echo "== repeat-safety: apply the split migration a second time =="
PSQL -q -f "$SPLIT_MIGRATION"

echo "== apply canonical board-placement contract migration =="
PSQL -q -f "$PLACEMENT_MIGRATION"

echo "== repeat-safety: apply the placement-contract migration a second time =="
PSQL -q -f "$PLACEMENT_MIGRATION"

echo "== behavioural assertions =="
PSQL -q -f "$HERE/assertions.sql"

echo "== fixture-to-persistence bridge: real action -> real RPC -> database =="
THARSIS_MAP_ID=$(PSQL -tAc "select id from public.maps where code = 'tharsis'")
FIXTURE_OUT_SQL="$PGDATA-fixtures.sql" \
THARSIS_MAP_ID="$THARSIS_MAP_ID" \
GROUP_ID="22222222-2222-4222-8222-222222222222" \
USER_ID="11111111-1111-4111-8111-111111111111" \
PLAYER_A_ID="55555555-5555-4555-8555-555555555555" \
PLAYER_B_ID="5b5b5b5b-5b5b-45b5-85b5-5b5b5b5b5b5b" \
  "$REPO/node_modules/.bin/tsx" "$HERE/build-fixture-payloads.ts"
PSQL -q -f "$PGDATA-fixtures.sql"
PSQL -q -f "$HERE/fixture-assertions.sql"

echo "== idempotency: re-apply alias migration =="
PSQL -q -f "$ALIAS_MIGRATION"
n=$(PSQL -tAc "select count(*) from public.domain_text_aliases where source='catalog'")
[ "$n" = "7" ] || { echo "FAIL idempotency: catalog aliases=$n (expected 7)"; exit 1; }

echo "== rollback: delete the seven deterministic alias ids only =="
PSQL -q -c "delete from public.domain_text_aliases where id in (
  '43a30001-43a3-4001-8001-000000000001','43a30002-43a3-4002-8002-000000000002',
  '43a30003-43a3-4003-8003-000000000003','43a30004-43a3-4004-8004-000000000004',
  '43a30005-43a3-4005-8005-000000000005','43a30006-43a3-4006-8006-000000000006',
  '43a30007-43a3-4007-8007-000000000007');"
after=$(PSQL -tAc "select count(*) from public.domain_text_aliases where source='catalog'")
unrelated=$(PSQL -tAc "select count(*) from public.domain_text_aliases where source='confirmed_ocr'")
[ "$after" = "0" ] && [ "$unrelated" = "1" ] || {
  echo "FAIL rollback: catalog=$after (expected 0), unrelated=$unrelated (expected 1)"; exit 1; }

echo "ALL EXECUTABLE MIGRATION TESTS PASSED"
