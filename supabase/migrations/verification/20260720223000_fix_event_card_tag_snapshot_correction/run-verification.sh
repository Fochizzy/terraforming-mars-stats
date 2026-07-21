#!/bin/sh
# Orchestrates every case documented in README.md against a disposable
# PostgreSQL 18 instance, in one pass, with PASS/FAIL markers -- the single
# command a reviewer needs to run to see every required scenario evaluated.
# This does not replace the manual reproduction steps in README.md -- it
# runs the exact same psql invocations those steps describe (plus the
# generated failure-window copies from 06-failure-window-generator.sh and
# the stub swaps documented in 07-failure-window-stubs.sql), in sequence,
# against throwaway databases on one already-running disposable server, and
# diffs the results the way a reviewer would by hand.
#
# Usage:
#   PGHOST=127.0.0.1 PGPORT=<disposable-cluster-port> PGUSER=postgres \
#     PGBIN="/path/to/postgresql/18/bin" ./run-verification.sh
#
# Requires an already-running, already-initialized disposable PostgreSQL 18
# server (see README.md "Reproduction" step 1) -- this script only creates
# and drops databases on it, never touches the cluster's own lifecycle. Must
# be run with `sh`, not `bash` -- this script uses only POSIX sh constructs,
# and bash's stricter quote-nesting parser misparses one of the multi-line
# double-quoted heredoc-style arguments below as an unterminated string
# (confirmed empirically against this exact file on Windows Git Bash: `sh -n`
# accepts it, `bash -n` reports "unexpected EOF while looking for matching
# `''" -- POSIX sh alone is what this script is written against and tested
# with, not a bash extension).
#
# Exit status is nonzero if ANY case fails, OR if the number of cases that
# actually ran does not equal EXPECTED_CHECKS below -- a check that is
# skipped (for example because an earlier `set -e` failure short-circuited
# the rest of the script) is treated as a hard failure of the harness run as
# a whole, not a warning, per this correction round's "no expected scenario
# may be silently skipped" requirement.

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
WINDOWS_DIR="$WORK/failure-windows"
trap 'rm -rf "$WORK"' EXIT

PASS=0
FAIL=0
EXPECTED_CHECKS=26
RESULTS_LOG="$WORK/results.log"
: > "$RESULTS_LOG"
fail() { echo "FAIL: $1"; echo "FAIL|$1" >> "$RESULTS_LOG"; FAIL=$((FAIL + 1)); }
pass() { echo "PASS: $1"; echo "PASS|$1" >> "$RESULTS_LOG"; PASS=$((PASS + 1)); }

psql_() { "$PSQL" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$@"; }

fresh_db() {
  db="$1"
  "$DROPDB" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" --if-exists "$db" >/dev/null 2>&1
  "$CREATEDB" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$db"
  psql_ -d "$db" -v ON_ERROR_STOP=1 -f 01-schema-and-stubs.sql >/dev/null
}

seed() { psql_ -d "$1" -v ON_ERROR_STOP=1 -f 02-seed-fixtures.sql >/dev/null; }
dump() { psql_ -d "$1" -f dump-state.sql; }
drop_db() { "$DROPDB" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$1" >/dev/null; }

echo "=== 1/26: ordinary first pass + exact restoration + OID/metadata preservation ==="
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
  fail "exactly one base + one additional rebuild for a 5-game target set"
fi

echo "=== 3/26: idempotent second pass ==="
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
drop_db "$db"

echo "=== 4/26: no-target case (empty tables, guard/neutralize/restore never run) ==="
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
drop_db "$db"

echo "=== 5/26: atomic rollback on forced mid-loop failure (poison game, pre-existing) ==="
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
drop_db "$db"

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
  drop_db "$db"
}

echo "=== 6/26: guard -- body drift ==="
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

echo "=== 7/26: guard -- owner drift ==="
guard_case "owner-drift guard" verify_guard_owner "
do \$do_drift\$ begin
  if not exists (select 1 from pg_roles where rolname = 'drift_owner') then create role drift_owner; end if;
end \$do_drift\$;
alter function public.rebuild_metric_summaries() owner to drift_owner;
" "guard.*failed.*owner:"

echo "=== 8/26: guard -- SECURITY INVOKER drift ==="
guard_case "security-mode drift guard" verify_guard_secmode "
alter function public.rebuild_metric_summaries() security invoker;
" "guard.*failed.*security:"

echo "=== 9/26: guard -- ACL drift: unexpected authenticated EXECUTE grant ==="
guard_case "ACL drift guard (authenticated)" verify_guard_acl_authenticated "
grant execute on function public.rebuild_metric_summaries() to authenticated;
" "guard.*failed.*acl:"

echo "=== 10/26: pre-bounding rebuild-count defect reproduction (unrelated to this round) ==="
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
drop_db "$db"

# ===========================================================================
# Exact-ACL-identity drift tests (this round, second independent review).
# All 5 required cases from the correction spec. #9 above already covers
# case (1) (authenticated grant); the 4 below cover (2)-(5). Every fixture
# below was chosen and verified against real, empirically-observed
# aclexplode()/pg_proc.proacl behavior on this exact PostgreSQL 18.4 cluster
# (see docs/event-card-tag-exclusion-correction-package.md for the full
# empirical record), not assumed from documentation -- in particular, an
# "empty ACL" fixture built via `update pg_catalog.pg_proc set proacl =
# '{}'::aclitem[]` (a raw catalog literal) produces a genuinely
# zero-dimensional array that aclexplode() itself rejects with "ERROR: ACL
# arrays must be one-dimensional" -- a real Postgres behavior, and still
# fail-closed (it aborts before any mutation, same as every other guard
# rejection), but not reachable via any GRANT/REVOKE path and not what the
# guard's own friendly "acl: expected exactly 1 ACL entry... found 0"
# message is written to handle. The fixture below instead reaches the same
# logical state (a present, non-null, zero-row ACL) the only way normal DDL
# can: revoking the sole remaining owner grant via plain REVOKE, which
# aclexplode() handles correctly (confirmed: returns 0 rows, no error).
# ===========================================================================

echo "=== 11/26: guard -- ACL drift: unexpected PUBLIC EXECUTE grant ==="
guard_case "ACL drift guard (PUBLIC)" verify_guard_acl_public "
grant execute on function public.rebuild_metric_summaries() to public;
" "guard.*failed.*acl:.*expected exactly 1 ACL entry"

echo "=== 12/26: guard -- ACL drift: empty ACL (owner entry revoked, DDL-reachable) ==="
guard_case "ACL drift guard (empty/owner-entry-missing)" verify_guard_acl_empty "
revoke all on function public.rebuild_metric_summaries() from postgres;
" "guard.*failed.*acl:.*found 0"

echo "=== 13/26: guard -- ACL drift: owner entry with unexpected grantability (WITH GRANT OPTION) ==="
guard_case "ACL drift guard (grantability)" verify_guard_acl_grantable "
grant execute on function public.rebuild_metric_summaries() to postgres with grant option;
" "guard.*failed.*acl:.*is_grantable"

echo "=== 14/26: guard -- ACL drift: second entry naming a role not hardcoded by the migration ==="
guard_case "ACL drift guard (second entry, non-hardcoded role)" verify_guard_acl_other_role "
do \$do_drift\$ begin
  if not exists (select 1 from pg_roles where rolname = 'drift_other_role') then create role drift_other_role; end if;
end \$do_drift\$;
grant execute on function public.rebuild_metric_summaries() to drift_other_role;
" "guard.*failed.*acl:.*expected exactly 1 ACL entry"

# ===========================================================================
# Search-path / other metadata drift tests (this round). SECURITY INVOKER
# (#8), owner (#7), and body (#6) drift were already covered before this
# round; the 4 below are the previously-unexecuted required cases: search
# path changed to a nonempty value, proconfig missing entirely, an extra GUC
# alongside the expected search_path="" entry, and a comment added where
# none is expected. All 4 proconfig shapes below were confirmed empirically
# against this cluster before being wired in here (RESET search_path yields
# proconfig = NULL, not an empty array; an extra `SET x TO y` appends a
# second proconfig array element alongside the existing search_path entry)
# -- see the correction-package doc.
# ===========================================================================

echo "=== 15/26: guard -- search_path changed to a nonempty value ==="
guard_case "search_path drift guard (changed to public)" verify_guard_searchpath_public "
alter function public.rebuild_metric_summaries() set search_path to 'public';
" "guard.*failed.*search_path:"

echo "=== 16/26: guard -- proconfig missing entirely (search_path reset) ==="
guard_case "search_path drift guard (missing proconfig)" verify_guard_searchpath_missing "
alter function public.rebuild_metric_summaries() reset search_path;
" "guard.*failed.*search_path:"

echo "=== 17/26: guard -- extra GUC alongside the expected empty search_path ==="
guard_case "search_path drift guard (extra GUC)" verify_guard_searchpath_extra "
alter function public.rebuild_metric_summaries() set statement_timeout to '5000';
" "guard.*failed.*search_path:"

echo "=== 18/26: guard -- function comment drift ==="
guard_case "comment drift guard" verify_guard_comment "
comment on function public.rebuild_metric_summaries() is 'drift: this function should have no comment';
" "guard.*failed.*comment:"

# ===========================================================================
# Eight required failure windows (this round). Windows 1, 2, 5, 8 run an
# instrumented copy of the REAL migration file, generated fresh by
# 06-failure-window-generator.sh (never a hand-maintained duplicate, and
# never written to the tracked source tree -- see that script's header).
# Windows 3, 4, 6, 7 run the REAL, UNMODIFIED migration file against a
# database where one call-graph dependency has been swapped for a disposable
# stub that raises at the targeted point (07-failure-window-stubs.sql).
#
# For every window, this proves: migration execution fails with a nonzero
# psql exit code; the full state dump (all four per-game snapshot tables,
# root game_log_tag_summaries, and _rebuild_marker counts via dump-state.sql)
# is byte-identical immediately before vs. immediately after; and
# rebuild_metric_summaries()'s own full identity section in that same dump
# (oid, owner, language, SECURITY DEFINER, search_path, volatility, parallel
# safety, strictness, leakproofness, return type, comment, prosrc length +
# md5) is byte-identical too -- so a single diff covers "ended up back in its
# real, restored body, not stuck neutralized" AND "no metadata drifted" AND
# "no partial rebuild survives" in one check per window, exactly as
# dump-state.sql already did for the pre-existing rollback case (5/26
# above). No window leaves behind a generated database object of its own:
# every window runs against a disposable, freshly created database that is
# dropped at the end of its own case (windows 4's counter table / renamed
# real implementation are test scaffolding created BEFORE the migration
# runs, not something the migration itself creates -- see
# 07-failure-window-stubs.sql's header for that distinction).
# ===========================================================================

if OUT_DIR="$WINDOWS_DIR" sh 06-failure-window-generator.sh; then
  :
else
  fail "failure-window instrumented-copy generation (sha256 mismatch or anchor drift -- see output above)"
  # All 4 text-anchor windows depend on generation having succeeded; record
  # them as failed too rather than silently skipping, per this round's "no
  # expected scenario may be silently skipped" requirement.
  fail "failure window 1 (after target selection, before neutralization)"
  fail "failure window 2 (immediately after neutralization)"
  fail "failure window 5 (after restoration, before the final real rebuild)"
  fail "failure window 8 (after the final rebuild, before statement completion)"
  WINDOWS_DIR=""
fi

failure_window_case() {
  # failure_window_case <label> <db> <migration-file> <setup-sql-or-empty> <expect-grep>
  label="$1"; db="$2"; mig="$3"; setup_sql="$4"; expect_grep="$5"
  fresh_db "$db"; seed "$db"
  if [ -n "$setup_sql" ]; then
    psql_ -d "$db" -v ON_ERROR_STOP=1 -c "$setup_sql" >/dev/null
  fi
  dump "$db" > "$WORK/$db-pre.txt"
  if psql_ -d "$db" -v ON_ERROR_STOP=1 -f "$mig" >/dev/null 2>"$WORK/$db-err.txt"; then
    fail "$label: migration was expected to raise but did not"
  else
    dump "$db" > "$WORK/$db-post.txt"
    if diff -q "$WORK/$db-pre.txt" "$WORK/$db-post.txt" >/dev/null && grep -q "$expect_grep" "$WORK/$db-err.txt"; then
      pass "$label: raised as expected, full state dump (incl. function identity) byte-identical pre/post"
    else
      fail "$label: state diverged or error message unexpected (see $WORK/$db-err.txt, diff of $WORK/$db-pre.txt vs $WORK/$db-post.txt)"
    fi
  fi
  drop_db "$db"
}

if [ -n "$WINDOWS_DIR" ]; then
  echo "=== 19/26: failure window 1 -- after target selection, before neutralization ==="
  failure_window_case "failure window 1 (after target selection, before neutralization)" \
    verify_fw1 "$WINDOWS_DIR/window1.sql" "" "INJECTED_FAILURE_WINDOW_1"

  echo "=== 20/26: failure window 2 -- immediately after neutralization ==="
  failure_window_case "failure window 2 (immediately after neutralization)" \
    verify_fw2 "$WINDOWS_DIR/window2.sql" "" "INJECTED_FAILURE_WINDOW_2"
fi

echo "=== 21/26: failure window 3 -- during the first per-game refresh ==="
failure_window_case "failure window 3 (during the first per-game refresh)" \
  verify_fw3 "$MIGRATION" "
create or replace function public.refresh_game_metric_snapshots_internal(
  p_game_id uuid, p_require_editor boolean default true
)
returns void language plpgsql security definer set search_path to ''
as \$stub\$
begin
  raise exception 'INJECTED_FAILURE_WINDOW_3: failure during the first per-game refresh (game %)', p_game_id;
end;
\$stub\$;
" "INJECTED_FAILURE_WINDOW_3"

echo "=== 22/26: failure window 4 -- after several per-game refreshes ==="
failure_window_case "failure window 4 (after several per-game refreshes)" \
  verify_fw4 "$MIGRATION" "
alter function public.refresh_game_metric_snapshots_internal(uuid, boolean)
  rename to _real_refresh_game_metric_snapshots_internal;
create table public._test_refresh_call_counter (n int not null default 0);
insert into public._test_refresh_call_counter default values;
create or replace function public.refresh_game_metric_snapshots_internal(
  p_game_id uuid, p_require_editor boolean default true
)
returns void language plpgsql security definer set search_path to ''
as \$stub\$
begin
  update public._test_refresh_call_counter set n = n + 1;
  if (select n from public._test_refresh_call_counter) > 3 then
    raise exception 'INJECTED_FAILURE_WINDOW_4: failure after several per-game refreshes (game %, call #%)',
      p_game_id, (select n from public._test_refresh_call_counter);
  end if;
  perform public._real_refresh_game_metric_snapshots_internal(p_game_id, p_require_editor);
end;
\$stub\$;
" "INJECTED_FAILURE_WINDOW_4"

if [ -n "$WINDOWS_DIR" ]; then
  echo "=== 23/26: failure window 5 -- after restoration, before the final real rebuild ==="
  failure_window_case "failure window 5 (after restoration, before the final real rebuild)" \
    verify_fw5 "$WINDOWS_DIR/window5.sql" "" "INJECTED_FAILURE_WINDOW_5"
fi

echo "=== 24/26: failure window 6 -- inside rebuild_metric_summaries_base() ==="
failure_window_case "failure window 6 (inside rebuild_metric_summaries_base)" \
  verify_fw6 "$MIGRATION" "
create or replace function public.rebuild_metric_summaries_base()
returns void language plpgsql security definer set search_path to ''
as \$stub\$
begin
  raise exception 'INJECTED_FAILURE_WINDOW_6: failure inside rebuild_metric_summaries_base';
end;
\$stub\$;
" "INJECTED_FAILURE_WINDOW_6"

echo "=== 25/26: failure window 7 -- inside rebuild_additional_metric_summaries() ==="
failure_window_case "failure window 7 (inside rebuild_additional_metric_summaries)" \
  verify_fw7 "$MIGRATION" "
create or replace function public.rebuild_additional_metric_summaries()
returns void language plpgsql security definer set search_path to ''
as \$stub\$
begin
  raise exception 'INJECTED_FAILURE_WINDOW_7: failure inside rebuild_additional_metric_summaries';
end;
\$stub\$;
" "INJECTED_FAILURE_WINDOW_7"

if [ -n "$WINDOWS_DIR" ]; then
  echo "=== 26/26: failure window 8 -- after the final rebuild, before statement completion ==="
  failure_window_case "failure window 8 (after the final rebuild, before statement completion)" \
    verify_fw8 "$WINDOWS_DIR/window8.sql" "" "INJECTED_FAILURE_WINDOW_8"
fi

echo ""
echo "=== 8/8 failure-window table ==="
i=1
while [ "$i" -le 8 ]; do
  line=$(grep -E "failure window $i \(" "$RESULTS_LOG" || true)
  if [ -n "$line" ]; then
    status="${line%%|*}"
    printf '  window %s: %s\n' "$i" "$status"
  else
    printf '  window %s: MISSING (not executed)\n' "$i"
  fi
  i=$((i + 1))
done

echo ""
TOTAL=$((PASS + FAIL))
echo "=== SUMMARY: $PASS passed, $FAIL failed, $TOTAL/$EXPECTED_CHECKS expected checks ran ==="
if [ "$TOTAL" -ne "$EXPECTED_CHECKS" ]; then
  echo "=== HARNESS INCOMPLETE: expected $EXPECTED_CHECKS checks, only $TOTAL ran -- treating as a hard failure, not a warning ==="
  exit 1
fi
[ "$FAIL" -eq 0 ]
