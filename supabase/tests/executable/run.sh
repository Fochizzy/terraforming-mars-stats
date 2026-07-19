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

echo "== replay migration history (alias migration deferred until catalogue is seeded) =="
for f in "$MIGRATIONS"/*.sql; do
  [ "$f" = "$ALIAS_MIGRATION" ] && continue
  PSQL -q -f "$f"
done
echo "   history applied"

echo "== seed prerequisites + canonical objective catalogue =="
PSQL -q -f "$HERE/seed.sql"

echo "== apply objective alias migration =="
PSQL -q -f "$ALIAS_MIGRATION"

echo "== behavioural assertions =="
PSQL -q -f "$HERE/assertions.sql"

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
