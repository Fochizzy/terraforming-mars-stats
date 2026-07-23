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
#     for symmetry with the deferred set, and then NOT applied at all. The
#     ordering makes that exclusion INCONSEQUENTIAL rather than necessary:
#     MATCH_PREIMAGE runs AFTER the replay loop and unconditionally
#     `create or replace`s the fine-grained predecessor, so replaying this file
#     inside the loop would be erased before any assertion observed it.
#     MEASURED, not reasoned — see the COARSEN_MIGRATION annotation below for
#     the measurement, its evidence class, and the coverage gap it does not
#     close.
#   * 20260722160000, which IS applied to production as of 2026-07-23 (ledger
#     20260723082917, paired by NAME). It left GATED_UNAPPLIED on that date. It
#     is held back for the SAME reason as 20260722012658: the ID-READER-CLIENT
#     BEFORE proof must run against the pre-expand image, and the AFTER proof
#     must then measure the expand on the SAME database. Replaying it in the
#     loop would satisfy the BEFORE proof's precondition with the very function
#     whose absence that proof measures, so the pair would prove nothing.
#
# So the baseline assertions in half 1 model production MINUS those THREE
# applied migrations, not production exactly. That is intentional and is what
# the BEFORE/AFTER pairs depend on; it is recorded here so the divergence is not
# mistaken for a replay gap.
#
# CONSEQUENCE, stated so it is not rediscovered as a defect: half 1 is no longer
# "the state production is in today" for the guest-identity surface. Since
# 2026-07-23 it is the state production was in immediately BEFORE the expand.
# The BEFORE proof's own header still says "today"; correcting that file was
# outside the authorized edit set of the task that applied the migration and is
# recorded as an open documentation discrepancy in the ID-READER-EXPAND handoff.
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
# GATED_UNAPPLIED. Deferred from the replay for symmetry with the deferred set,
# and then never applied at all.
#
# CORRECTED 2026-07-23. This comment previously said that applying it in the
# replay "would coarsen the very pre-image the contraction proof measures
# against". Measurement REFUTES that causal claim: MATCH_PREIMAGE below runs
# after the replay loop and unconditionally installs the fine-grained
# predecessor over whatever the loop left, so in the replay position this file
# demonstrably cannot coarsen that pre-image. Probes either side of
# MATCH_PREIMAGE read finegrained=f then finegrained=t, and full harness runs
# with the file replayed in the loop, and applied in the deferred half, both
# exit 0. The exclusion is therefore INCONSEQUENTIAL, not necessary.
# Evidence [PRIOR], measured in
# docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md §4.2.
#
# What the exclusion does NOT do is buy coverage. The real, open gap is that
# match-oracle-post-contraction.sql is referenced by nothing, so the coarsened
# match_reason/match_score and the candidate-input bound are asserted nowhere
# (§4.3 of the same handoff). Wiring that file in, and moving this apply,
# require their own authorization and were deliberately NOT done here.
COARSEN_MIGRATION="$MIGRATIONS/20260720120000_coarsen_import_name_match_reasons.sql"
# APPLIED to production as ledger 20260722132159 (paired by NAME), and NOT in
# GATED_UNAPPLIED. Deferred from the replay so the linked-player matching
# BEFORE/AFTER pair can install its pinned pre-image first and then restore the
# shipped matcher via the repeat-safety apply, on one database.
SOURCE_BOUND_EXPANSION="$MIGRATIONS/20260722012658_add_source_bound_import_identity_staging.sql"
SOURCE_BOUND_CONTRACTION="$MIGRATIONS/20260722012707_retire_free_form_import_name_matcher.sql"
# EXPAND half of the ID-READER-CLIENT repair: creates the service_role-only
# public.create_or_reuse_guest_identity. Replaces what 20260720100000 was for.
#
# APPLIED to production 2026-07-23 as ledger 20260723082917 (paired by NAME —
# src/lib/db/migration-ledger-map.ts), and therefore NO LONGER in
# GATED_UNAPPLIED. It stays deferred from the replay above for the same reason
# SOURCE_BOUND_EXPANSION does, not because it is unapplied: the BEFORE proof
# needs the pre-expand image and the AFTER proof needs the post-expand one, on
# one database. Applying it to production did NOT authorize the reader deploy or
# the CONTRACT drop of the deployed 7-argument resolver; both remain gated.
NON_IMPORT_GUEST_MIGRATION="$MIGRATIONS/20260722160000_add_non_import_guest_identity_creator.sql"
# GATED / UNAPPLIED. The EXPAND half of the 2026-07-22 matcher amendment: adds a
# service_role-only THREE-argument overload of public.match_import_player_names
# whose authorization gate AND candidate pool both derive from an explicit
# requesting-user id instead of auth.uid(). Excluded from the production-history
# replay for the ordinary reason — it is not applied to production. It is applied
# below BEFORE SOURCE_BOUND_CONTRACTION, because that is the mandatory
# expand-then-contract order and because its two-argument-still-resolves
# assertion needs `authenticated` to still hold its grant when it runs.
MATCHER_OVERLOAD_MIGRATION="$MIGRATIONS/20260723130000_add_service_role_import_name_matcher_overload.sql"

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

echo "== replay production migration history (alias deferred; all gated excluded, PLUS the three production-APPLIED files 20260722012658, 20260720120000 and 20260722160000) =="
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
  [ "$f" = "$MATCHER_OVERLOAD_MIGRATION" ] && continue
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
# Must stay above the deferred line — it asserts the pre-expand state, which
# production held until 2026-07-23 and which the AFTER proof below measures the
# departure from. It is a claim about production's state BEFORE ledger
# 20260723082917, no longer about production's state today.
echo "== ID-READER-CLIENT: BEFORE (reader broken on post-revoke, pre-expand production state) =="
PSQL -q -f "$HERE/non-import-guest-identity-before.sql"

# ---------------------------------------------------------------------------
# The deferred migrations start here, in ledger-version order. Everything above
# this line models production MINUS the three applied migrations noted in the
# header; everything below is that deferred set — mostly prepared-and-NOT-applied
# work, plus those three applied files. The echo labels below now name each
# file's real production status, so a reader of the output does not have to
# consult this header to tell a gated migration from an applied-but-deferred one.
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

# EXPAND-then-CONTRACT for the matcher amendment, in that order and on this one
# database. The BEFORE half pins the two-argument function's body hash, ACL and
# comment so the AFTER half can prove the expand left it byte-identical, and
# installs sentinel probe fixtures plus a second group with its own member.
echo "== matcher service-role overload: BEFORE (pin the two-argument identity, install sentinel probes) =="
PSQL -q -f "$HERE/matcher-service-role-overload-before.sql"

echo "== apply gated matcher service-role overload (EXPAND) =="
PSQL -q -f "$MATCHER_OVERLOAD_MIGRATION"

echo "== repeat-safety: apply the matcher overload a second time =="
PSQL -q -f "$MATCHER_OVERLOAD_MIGRATION"

echo "== matcher service-role overload: AFTER (gate/pool agreement, null rejection, grants, two-argument untouched) =="
PSQL -f "$HERE/matcher-service-role-overload.sql"

echo "== apply separate gated legacy-matcher contraction =="
PSQL -q -f "$SOURCE_BOUND_CONTRACTION"

echo "== repeat-safety: apply source-bound contraction a second time =="
PSQL -q -f "$SOURCE_BOUND_CONTRACTION"
PSQL -q -f "$HERE/source-bound-import-identity-contraction.sql"

# The contraction RE-GATES the free-form matcher; it does not close it. The file
# above already pins that service_role kept the TWO-argument grant; this one pins
# that the service-role OVERLOAD survives and still matches, which is what the
# moved reader depends on.
echo "== matcher service-role overload survives the contraction (re-gated, not closed) =="
PSQL -q -f "$HERE/matcher-service-role-overload-post-contraction.sql"

echo "== apply 20260722160000 non-import guest-identity creator (ID-READER-CLIENT expand) — APPLIED to production as ledger 20260723082917, deferred from the replay so the BEFORE/AFTER pair spans the expand on one database =="
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
