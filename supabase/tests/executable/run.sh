#!/usr/bin/env bash
#
# Executable migration + integration test for the Phase 4 Step 4.3 remediation
# migrations (20260718212339 privacy, 20260718212340 event contract,
# 20260718212342 objective aliases).
#
# It stands up a disposable, trust-authenticated PostgreSQL cluster (no Docker),
# then runs in two clearly separated halves:
#
#   1. PRODUCTION HISTORY. Replays only migrations that are actually applied to
#      production, plus a modelled pre-image of the one production-only ledger
#      entry the gated work depends on. The baseline assertions in this half
#      (pre-split-compat.sql, match-oracle-pre-contraction.sql) are claims about
#      the state production is in today, so no gated migration may be applied
#      before them.
#   2. GATED WORK. Applies every migration in GATED_UNAPPLIED, in ledger-version
#      order, each twice for repeat-safety, then asserts the behaviour they add
#      — including that the match-reason contraction is a true REPLACE of its
#      deployed predecessor.
#
# Then the behavioural assertions, the fixture-to-persistence bridge,
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

# Every migration in GATED_UNAPPLIED (src/lib/db/migration-ledger-map.ts). None
# of these is applied to production, so none of them may appear in the replay
# that models production history — otherwise the "state production is in today"
# baseline below asserts against a database production does not have.
MERGER_MIGRATION="$MIGRATIONS/20260717190000_add_merger_offer_rule_snapshots.sql"
SPLIT_MIGRATION="$MIGRATIONS/20260719234500_separate_event_confidence_from_review_state.sql"
GUEST_ALIAS_MIGRATION="$MIGRATIONS/20260720100000_add_guest_identity_alias_source_control.sql"
PLACEMENT_MIGRATION="$MIGRATIONS/20260720110000_extend_canonical_board_placement_contract.sql"
COARSEN_MIGRATION="$MIGRATIONS/20260720120000_coarsen_import_name_match_reasons.sql"

# Modelled pre-image of production-only ledger entry 20260720021300, which has
# no repo file. Installing it is what makes COARSEN_MIGRATION a REPLACE rather
# than a CREATE. See the file header for exactly what it is and is not.
MATCH_PREIMAGE="$HERE/production-preimage-20260720021300-match-import-player-names.sql"

# Modelled pre-image of production-only ledger entry 20260712115539, which has
# no repo file. It creates public.claim_player_profiles_by_name(), one of the
# three functions CLAIM_GRANT_MIGRATION revokes and grants on; without it that
# migration aborts on "function does not exist". Installed inside the history
# loop immediately before the grant, so the grant's revokes remove something
# real and the resulting ACL is a proof rather than an inherited default. See
# the file header for exactly what it is and is not.
CLAIM_PREIMAGE="$HERE/production-preimage-20260712115539-claim-players-by-name.sql"
CLAIM_GRANT_MIGRATION="$MIGRATIONS/20260720190000_grant_authenticated_claim_rpc_execute.sql"

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

echo "== replay production migration history (alias deferred; all gated excluded) =="
for f in "$MIGRATIONS"/*.sql; do
  [ "$f" = "$ALIAS_MIGRATION" ] && continue
  [ "$f" = "$MERGER_MIGRATION" ] && continue
  [ "$f" = "$SPLIT_MIGRATION" ] && continue
  [ "$f" = "$GUEST_ALIAS_MIGRATION" ] && continue
  [ "$f" = "$PLACEMENT_MIGRATION" ] && continue
  [ "$f" = "$COARSEN_MIGRATION" ] && continue
  if [ "$f" = "$CLAIM_GRANT_MIGRATION" ]; then
    echo "   model production-only ledger entry 20260712115539 (no repo file)"
    PSQL -q -f "$CLAIM_PREIMAGE"
  fi
  PSQL -q -f "$f"
done
echo "   history applied"

echo "== seed prerequisites + canonical objective catalogue =="
PSQL -q -f "$HERE/seed.sql"

echo "== apply objective alias migration (production history) =="
PSQL -q -f "$ALIAS_MIGRATION"

echo "== model production-only ledger entry 20260720021300 (no repo file) =="
PSQL -q -f "$MATCH_PREIMAGE"

echo "== seed legacy overloaded 'reviewed' confidence rows (pre-split contract) =="
PSQL -q -c "insert into public.game_log_events (game_log_import_id, event_order, event_type, raw_line, confidence_level, event_identity, payload) values
  ('44444444-4444-4444-8444-444444444444', 900, 'milestone_claimed', 'X claimed Terraformer', 'reviewed', null, '{\"resolution\":\"corrected\"}'::jsonb),
  ('44444444-4444-4444-8444-444444444444', 901, 'colony_traded', 'X traded with Atlantis', 'reviewed', '901:colony_traded:none', '{\"canonical_colony_name\":\"Atlantis\"}'::jsonb);"

echo "== pre-migration RPC payload compatibility (deployed contract) =="
# The exact payload the redesign emits — including the review_state key —
# must succeed against the PRE-split RPC (which ignores the extra key), and
# the review_state column must not exist yet. This is the state production
# is in today: review_state is computed and cannot persist until the gated
# migration is applied. Nothing gated has been applied above this line.
PSQL -q -f "$HERE/pre-split-compat.sql"

echo "== deployed match-oracle disclosure (pre-contraction baseline) =="
PSQL -q -f "$HERE/match-oracle-pre-contraction.sql"

# ---------------------------------------------------------------------------
# Gated migrations start here, in ledger-version order. Everything above this
# line models production; everything below is prepared-and-NOT-applied work.
# ---------------------------------------------------------------------------

echo "== apply gated merger offer/rule snapshot migration =="
PSQL -q -f "$MERGER_MIGRATION"

echo "== repeat-safety: apply the merger migration a second time =="
PSQL -q -f "$MERGER_MIGRATION"

echo "== apply confidence/review-state split migration =="
PSQL -q -f "$SPLIT_MIGRATION"

echo "== repeat-safety: apply the split migration a second time =="
PSQL -q -f "$SPLIT_MIGRATION"

echo "== apply gated guest-identity alias source-control migration =="
PSQL -q -f "$GUEST_ALIAS_MIGRATION"

echo "== repeat-safety: apply the guest-alias migration a second time =="
PSQL -q -f "$GUEST_ALIAS_MIGRATION"

echo "== apply canonical board-placement contract migration =="
PSQL -q -f "$PLACEMENT_MIGRATION"

echo "== repeat-safety: apply the placement-contract migration a second time =="
PSQL -q -f "$PLACEMENT_MIGRATION"

echo "== apply gated match-reason contraction (REPLACE of 20260720021300) =="
PSQL -q -f "$COARSEN_MIGRATION"

echo "== repeat-safety: apply the contraction a second time =="
PSQL -q -f "$COARSEN_MIGRATION"

echo "== coarsened match-oracle disclosure (post-contraction) =="
PSQL -q -f "$HERE/match-oracle-post-contraction.sql"

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
