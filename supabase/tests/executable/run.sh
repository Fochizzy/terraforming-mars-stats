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
#   2. DEFERRED WORK. Applies the deferred migrations in ledger-version order,
#      each twice for repeat-safety, then asserts the behaviour they add —
#      including that the match-reason contraction is a true REPLACE of its
#      deployed predecessor.
#
# "Deferred" is NOT the same set as GATED_UNAPPLIED. The second half is what the
# replay above defers, and that set is deliberately wider:
#
#   * every migration in GATED_UNAPPLIED (none of which is applied to
#     production); PLUS
#   * 20260722012658, which IS applied to production (as ledger 20260722132159,
#     paired by NAME — see src/lib/db/migration-ledger-map.ts). It is held back
#     so the linked-player matching BEFORE/AFTER pair below can pin its
#     pre-image and then restore the shipped matcher on the same database; PLUS
#   * 20260720120000, which IS also applied to production (as ledger
#     20260722144034, likewise paired by name). It is excluded from the replay
#     and then NOT applied at all, because the modelled pre-image
#     MATCH_PREIMAGE already installs the deployed matcher this file would
#     coarsen.
#
# So the baseline assertions in half 1 model production MINUS those two applied
# migrations, not production exactly. That is intentional and is what the
# BEFORE/AFTER pairs depend on; it is recorded here so the divergence is not
# mistaken for a replay gap.
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

# The migrations the production-history replay below DEFERS. Most are
# GATED_UNAPPLIED (src/lib/db/migration-ledger-map.ts) and are excluded because
# they are not applied to production: including one would make the "state
# production is in today" baseline assert against a database production does not
# have. Two of them — SOURCE_BOUND_EXPANSION and COARSEN_MIGRATION — ARE applied
# to production and are deferred for a different reason, marked individually
# below. See the header for the full accounting.
MERGER_MIGRATION="$MIGRATIONS/20260717190000_add_merger_offer_rule_snapshots.sql"
SPLIT_MIGRATION="$MIGRATIONS/20260719234500_separate_event_confidence_from_review_state.sql"
# RETIRED / SUPERSEDED tombstone — now a no-op with no executable statement.
# It is still excluded from the production-history replay and still applied
# twice below, which is what proves it is genuinely inert.
GUEST_ALIAS_MIGRATION="$MIGRATIONS/20260720100000_add_guest_identity_alias_source_control.sql"
PLACEMENT_MIGRATION="$MIGRATIONS/20260720110000_extend_canonical_board_placement_contract.sql"
# APPLIED to production as ledger 20260722144034 (paired by NAME), and NOT in
# GATED_UNAPPLIED. Deferred from the replay and then never applied at all,
# because MATCH_PREIMAGE below already installs the deployed matcher this file
# coarsens; applying it too would coarsen the very pre-image the contraction
# proof measures against.
COARSEN_MIGRATION="$MIGRATIONS/20260720120000_coarsen_import_name_match_reasons.sql"
# APPLIED to production as ledger 20260722132159 (paired by NAME), and NOT in
# GATED_UNAPPLIED. Deferred from the replay so the linked-player matching
# BEFORE/AFTER pair can install its pinned pre-image first and then restore the
# shipped matcher via the repeat-safety apply, on one database.
SOURCE_BOUND_EXPANSION="$MIGRATIONS/20260722012658_add_source_bound_import_identity_staging.sql"
SOURCE_BOUND_CONTRACTION="$MIGRATIONS/20260722012707_retire_free_form_import_name_matcher.sql"
# EXPAND half of the ID-READER-CLIENT repair: creates the service_role-only
# public.create_or_reuse_guest_identity. Replaces what 20260720100000 was for.
NON_IMPORT_GUEST_MIGRATION="$MIGRATIONS/20260722160000_add_non_import_guest_identity_creator.sql"

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

echo "== replay production migration history (alias deferred; all gated excluded, PLUS the two production-APPLIED files 20260722012658 and 20260720120000) =="
for f in "$MIGRATIONS"/*.sql; do
  [ "$f" = "$ALIAS_MIGRATION" ] && continue
  [ "$f" = "$MERGER_MIGRATION" ] && continue
  [ "$f" = "$SPLIT_MIGRATION" ] && continue
  [ "$f" = "$GUEST_ALIAS_MIGRATION" ] && continue
  [ "$f" = "$PLACEMENT_MIGRATION" ] && continue
  [ "$f" = "$COARSEN_MIGRATION" ] && continue
  [ "$f" = "$SOURCE_BOUND_EXPANSION" ] && continue
  [ "$f" = "$SOURCE_BOUND_CONTRACTION" ] && continue
  [ "$f" = "$NON_IMPORT_GUEST_MIGRATION" ] && continue
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

# ID-READER-CLIENT: reproduce the reader break against production history only.
# Must stay above the gated line — it asserts the state production is in today.
echo "== ID-READER-CLIENT: BEFORE (reader broken on post-revoke production state) =="
PSQL -q -f "$HERE/non-import-guest-identity-before.sql"

# ---------------------------------------------------------------------------
# The deferred migrations start here, in ledger-version order. Everything above
# this line models production MINUS the two applied migrations noted in the
# header; everything below is that deferred set — mostly prepared-and-NOT-applied
# work, plus those two applied files. The echo labels below now name each file's
# real production status, so a reader of the output does not have to consult this
# header to tell a gated migration from an applied-but-deferred one.
# ---------------------------------------------------------------------------

echo "== apply gated merger offer/rule snapshot migration =="
PSQL -q -f "$MERGER_MIGRATION"

echo "== repeat-safety: apply the merger migration a second time =="
PSQL -q -f "$MERGER_MIGRATION"

echo "== apply confidence/review-state split migration =="
PSQL -q -f "$SPLIT_MIGRATION"

echo "== repeat-safety: apply the split migration a second time =="
PSQL -q -f "$SPLIT_MIGRATION"

# 20260720100000 is a RETIRED tombstone. Applying it twice must change nothing
# at all — in particular it must not recreate an 8-argument overload and must not
# restore `authenticated` EXECUTE on the deployed resolver. The BEFORE proof
# above already pinned that ACL; the tombstone assertion below re-checks it after
# the applies, so a resurrected body would fail here.
echo "== apply retired guest-alias tombstone (must be a no-op) =="
PSQL -q -f "$GUEST_ALIAS_MIGRATION"

echo "== repeat-safety: apply the retired tombstone a second time =="
PSQL -q -f "$GUEST_ALIAS_MIGRATION"

echo "== assert the retired tombstone changed nothing =="
PSQL -q -c "do \$\$
begin
  if to_regprocedure('public.resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean,boolean)') is not null then
    raise exception 'TOMBSTONE FAIL: the retired migration recreated the 8-argument overload';
  end if;
  if to_regprocedure('public.resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean)') is null then
    raise exception 'TOMBSTONE FAIL: the deployed 7-argument resolver was dropped';
  end if;
  if has_function_privilege('authenticated', 'public.resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean)'::regprocedure, 'execute') then
    raise exception 'TOMBSTONE FAIL: authenticated EXECUTE was restored';
  end if;
end \$\$;"

echo "== apply canonical board-placement contract migration =="
PSQL -q -f "$PLACEMENT_MIGRATION"

echo "== repeat-safety: apply the placement-contract migration a second time =="
PSQL -q -f "$PLACEMENT_MIGRATION"

# 20260720120000 is NOT gated and NOT superseded: it is APPLIED to production as
# ledger 20260722144034 (paired by NAME — src/lib/db/migration-ledger-map.ts).
# It is deferred out of the replay above and then never applied here either.
echo "== NOT applied here: 20260720120000 coarsen_import_name_match_reasons — APPLIED to production as ledger 20260722144034, deferred because MATCH_PREIMAGE above already installs the deployed matcher this file coarsens =="

echo "== apply 20260722012658 source-bound expansion — APPLIED to production as ledger 20260722132159, deferred from the replay so the BEFORE/AFTER pair below can pin its pre-image and then restore the shipped matcher on one database =="
PSQL -q -f "$SOURCE_BOUND_EXPANSION"

# The BEFORE half reinstalls the matcher exactly as committed at e27fae282 and
# measures the regression against production-shaped fixtures. The repeat-safety
# apply that follows restores the shipped definition, so the AFTER half runs on
# the same database and the same fixtures with only the matcher changed.
echo "== linked-player matching regression: BEFORE (pinned pre-image of e27fae282) =="
PSQL -f "$HERE/source-bound-import-identity-linked-alias-before.sql"

echo "== repeat-safety: apply source-bound expansion a second time (restores the shipped matcher) =="
PSQL -q -f "$SOURCE_BOUND_EXPANSION"

echo "== linked-player matching regression: AFTER =="
PSQL -f "$HERE/source-bound-import-identity-linked-alias-after.sql"

# Widening what the matcher reads is the change that could reopen disclosure, so
# the uniformity properties are re-measured rather than assumed. Notice and
# warning output is part of that property and cannot be asserted from inside
# SQL, so the whole session's output is captured and checked here.
echo "== anti-oracle uniformity re-proof =="
UNIFORMITY_LOG="$PGDATA-uniformity.log"
if ! PSQL -f "$HERE/source-bound-import-identity-uniformity.sql" >"$UNIFORMITY_LOG" 2>&1; then
  cat "$UNIFORMITY_LOG"
  echo "FAIL uniformity: the re-proof did not complete"
  exit 1
fi
cat "$UNIFORMITY_LOG"
if grep -Eq '^(NOTICE|WARNING|INFO)' "$UNIFORMITY_LOG"; then
  echo "FAIL uniformity: the resolver emitted notice/warning output"
  exit 1
fi

echo "== source-bound AFTER proof (legacy matcher still callable) =="
PSQL -q -f "$HERE/source-bound-import-identity.sql"

echo "== apply separate gated legacy-matcher contraction =="
PSQL -q -f "$SOURCE_BOUND_CONTRACTION"

echo "== repeat-safety: apply source-bound contraction a second time =="
PSQL -q -f "$SOURCE_BOUND_CONTRACTION"
PSQL -q -f "$HERE/source-bound-import-identity-contraction.sql"

echo "== apply gated non-import guest-identity creator (ID-READER-CLIENT expand) =="
PSQL -q -f "$NON_IMPORT_GUEST_MIGRATION"

echo "== repeat-safety: apply the non-import guest creator a second time =="
PSQL -q -f "$NON_IMPORT_GUEST_MIGRATION"

echo "== ID-READER-CLIENT: AFTER (service_role only, authz held, no import alias) =="
PSQL -q -f "$HERE/non-import-guest-identity-after.sql"

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
