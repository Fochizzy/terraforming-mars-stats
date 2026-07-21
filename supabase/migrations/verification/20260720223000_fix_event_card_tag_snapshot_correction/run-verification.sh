#!/bin/sh
# Orchestrates every case documented in README.md against a disposable
# PostgreSQL 18 instance, in one pass, with PASS/FAIL markers. This does not
# replace the manual reproduction steps in README.md -- it runs the exact
# same psql invocations those steps describe, in sequence, against
# throwaway databases on one already-running disposable server, and diffs
# the results the way a reviewer would by hand. Added this round
# (independent-review corrections 1 and 2) so the full case list -- ordinary
# pass, idempotent second pass, no-target, atomic rollback, all four
# fail-closed guard drifts, and the pre-bounding rebuild-count comparison --
# can be re-run with one command instead of transcribing each psql
# invocation by hand.
#
# Usage:
#   PGHOST=127.0.0.1 PGPORT=<disposable-cluster-port> PGUSER=postgres \
#     PGBIN="/path/to/postgresql/18/bin" ./run-verification.sh
#
# Requires an already-running, already-initialized disposable PostgreSQL 18
# server (see README.md "Reproduction" step 1) -- this script only creates
# and drops databases on it, never touches the cluster's own lifecycle.

set -eu

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:?set PGPORT to the disposable cluster's port}"
PGUSER="${PGUSER:-postgres}"
PGBIN="${PGBIN:-}"
PSQL="${PGBIN:+$PGBIN/}psql"
CREATEDB="${PGBIN:+$PGBIN/}createdb"
DROPDB="${PGBIN:+$PGBIN/}dropdb"

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"
MIGRATION="../../20260720223000_fix_event_card_tag_snapshot_correction.sql"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PASS=0
FAIL=0
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }

psql_() { "$PSQL" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$@"; }

fresh_db() {
  db="$1"
  "$DROPDB" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" --if-exists "$db" >/dev/null 2>&1
  "$CREATEDB" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$db"
  psql_ -d "$db" -v ON_ERROR_STOP=1 -f 01-schema-and-stubs.sql >/dev/null
}

seed() { psql_ -d "$1" -v ON_ERROR_STOP=1 -f 02-seed-fixtures.sql >/dev/null; }
dump() { psql_ -d "$1" -f dump-state.sql; }

echo "=== 1/9: ordinary first pass + exact restoration + OID/metadata preservation ==="
db=verify_first_pass
fresh_db "$db"; seed "$db"
pre_def="$WORK/pre-def.txt"; post_def="$WORK/post-def.txt"
psql_ -d "$db" -t -A -c "select pg_get_functiondef('public.rebuild_metric_summaries()'::regprocedure);" > "$pre_def"
pre_oid=$(psql_ -d "$db" -t -A -c "select oid from pg_proc where oid = to_regprocedure('public.rebuild_metric_summaries()');")
if psql_ -d "$db" -v ON_ERROR_STOP=1 -f "$MIGRATION" >/dev/null; then
  psql_ -d "$db" -t -A -c "select pg_get_functiondef('public.rebuild_metric_summaries()'::regprocedure);" > "$post_def"
  post_oid=$(psql_ -d "$db" -t -A -c "select oid from pg_proc where oid = to_regprocedure('public.rebuild_metric_summaries()');")
  if diff -q "$pre_def" "$post_def" >/dev/null && [ "$pre_oid" = "$post_oid" ]; then
    pass "ordinary first pass: DO succeeded, pg_get_functiondef byte-identical pre/post, oid unchanged ($pre_oid)"
  else
    fail "ordinary first pass: def or oid diverged (pre_oid=$pre_oid post_oid=$post_oid)"
  fi
  base_ct=$(psql_ -d "$db" -t -A -c "select count(*) from public._rebuild_marker where kind='base';")
  add_ct=$(psql_ -d "$db" -t -A -c "select count(*) from public._rebuild_marker where kind='additional';")
  if [ "$base_ct" = "1" ] && [ "$add_ct" = "1" ]; then
    pass "exactly one base + one additional rebuild for a 5-game target set"
  else
    fail "rebuild marker counts wrong: base=$base_ct additional=$add_ct (expected 1/1)"
  fi
else
  fail "ordinary first pass: migration DO raised unexpectedly"
fi

echo "=== 2/9: idempotent second pass ==="
dump "$db" > "$WORK/dump-pass1.txt"
if psql_ -d "$db" -v ON_ERROR_STOP=1 -f "$MIGRATION" >/dev/null; then
  dump "$db" > "$WORK/dump-pass2.txt"
  if diff -q "$WORK/dump-pass1.txt" "$WORK/dump-pass2.txt" >/dev/null; then
    pass "second pass: full state dump byte-identical to first pass"
  else
    fail "second pass: state dump diverged from first pass"
  fi
else
  fail "second pass: migration DO raised unexpectedly"
fi
"$DROPDB" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$db" >/dev/null

echo "=== 3/9: no-target case (empty tables, guard/neutralize/restore never run) ==="
db=verify_notarget
fresh_db "$db"
psql_ -d "$db" -t -A -c "select pg_get_functiondef('public.rebuild_metric_summaries()'::regprocedure);" > "$WORK/notarget-pre.txt"
if psql_ -d "$db" -v ON_ERROR_STOP=1 -f "$MIGRATION" >/dev/null; then
  psql_ -d "$db" -t -A -c "select pg_get_functiondef('public.rebuild_metric_summaries()'::regprocedure);" > "$WORK/notarget-post.txt"
  markers=$(psql_ -d "$db" -t -A -c "select count(*) from public._rebuild_marker;")
  if diff -q "$WORK/notarget-pre.txt" "$WORK/notarget-post.txt" >/dev/null && [ "$markers" = "0" ]; then
    pass "no-target case: function untouched, zero rebuild markers"
  else
    fail "no-target case: function was touched or a rebuild ran (markers=$markers)"
  fi
else
  fail "no-target case: migration DO raised unexpectedly"
fi
"$DROPDB" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$db" >/dev/null

echo "=== 4/9: atomic rollback on forced mid-loop failure (poison game) ==="
db=verify_rollback
fresh_db "$db"; seed "$db"
psql_ -d "$db" -v ON_ERROR_STOP=1 -f "$MIGRATION" >/dev/null
psql_ -d "$db" -v ON_ERROR_STOP=1 -f 03-rollback-test-setup.sql >/dev/null
dump "$db" > "$WORK/rollback-pre.txt"
if psql_ -d "$db" -v ON_ERROR_STOP=1 -f "$MIGRATION" >/dev/null 2>"$WORK/rollback-err.txt"; then
  fail "rollback case: migration was expected to raise but did not"
else
  dump "$db" > "$WORK/rollback-post.txt"
  if diff -q "$WORK/rollback-pre.txt" "$WORK/rollback-post.txt" >/dev/null && grep -q "simulated refresh failure" "$WORK/rollback-err.txt"; then
    pass "rollback case: raised as expected, full state dump byte-identical pre/post (incl. function identity, back to real restored body)"
  else
    fail "rollback case: raised, but state diverged or error message unexpected"
  fi
fi
"$DROPDB" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$db" >/dev/null

guard_case() {
  label="$1"; db="$2"; drift_sql="$3"; expect_grep="$4"
  fresh_db "$db"; seed "$db"
  psql_ -d "$db" -v ON_ERROR_STOP=1 -c "$drift_sql" >/dev/null
  dump "$db" > "$WORK/$db-pre.txt"
  if psql_ -d "$db" -v ON_ERROR_STOP=1 -f "$MIGRATION" >/dev/null 2>"$WORK/$db-err.txt"; then
    fail "$label: migration was expected to raise but did not"
  else
    dump "$db" > "$WORK/$db-post.txt"
    if diff -q "$WORK/$db-pre.txt" "$WORK/$db-post.txt" >/dev/null && grep -q "$expect_grep" "$WORK/$db-err.txt"; then
      pass "$label: guard raised before any mutation, state (incl. drifted function identity) unchanged"
    else
      fail "$label: guard did not behave as expected (see $WORK/$db-err.txt, diff of $WORK/$db-pre.txt vs $WORK/$db-post.txt)"
    fi
  fi
  "$DROPDB" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$db" >/dev/null
}

echo "=== 5/9: guard -- body drift ==="
guard_case "body-drift guard" verify_guard_body "
create or replace function public.rebuild_metric_summaries()
returns void language plpgsql security definer set search_path to ''
as \$body_drift\$
begin
  perform 1;
  if to_regprocedure('public.rebuild_metric_summaries_base()') is null then
    raise exception 'rebuild_metric_summaries_base() is required before rebuilding metric summaries' using errcode = '42883';
  end if;
  perform public.rebuild_metric_summaries_base();
  perform public.rebuild_additional_metric_summaries();
end;
\$body_drift\$;
" "guard.*failed.*body:"

echo "=== 6/9: guard -- owner drift ==="
guard_case "owner-drift guard" verify_guard_owner "
do \$do_drift\$ begin
  if not exists (select 1 from pg_roles where rolname = 'drift_owner') then create role drift_owner; end if;
end \$do_drift\$;
alter function public.rebuild_metric_summaries() owner to drift_owner;
" "guard.*failed.*owner:"

echo "=== 7/9: guard -- search-path / security-mode drift ==="
guard_case "security-mode drift guard" verify_guard_secmode "
alter function public.rebuild_metric_summaries() security invoker;
" "guard.*failed.*security:"

echo "=== 8/9: guard -- ACL drift ==="
guard_case "ACL drift guard" verify_guard_acl "
grant execute on function public.rebuild_metric_summaries() to authenticated;
" "guard.*failed.*acl:"

echo "=== 9/9: pre-bounding rebuild-count defect reproduction (unchanged from before this round) ==="
db=defect_repro_run
fresh_db "$db"; seed "$db"
if psql_ -d "$db" -v ON_ERROR_STOP=1 -f 04-defect-reproduction-pre-correction-rebuild-count.sql >/dev/null; then
  base_ct=$(psql_ -d "$db" -t -A -c "select count(*) from public._rebuild_marker where kind='base';")
  add_ct=$(psql_ -d "$db" -t -A -c "select count(*) from public._rebuild_marker where kind='additional';")
  if [ "$base_ct" = "6" ] && [ "$add_ct" = "6" ]; then
    pass "pre-bounding text still reproduces six rebuilds of each kind for the same five-game target set"
  else
    fail "pre-bounding rebuild count changed: base=$base_ct additional=$add_ct (expected 6/6)"
  fi
else
  fail "pre-bounding defect-reproduction file raised unexpectedly"
fi
"$DROPDB" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$db" >/dev/null

echo ""
echo "=== SUMMARY: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
