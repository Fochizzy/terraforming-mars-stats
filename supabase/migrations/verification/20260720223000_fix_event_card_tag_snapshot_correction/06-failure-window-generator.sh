#!/bin/sh
# Generates disposable, test-only instrumented copies of the REAL migration
# file, each with exactly one forced exception spliced in at a single,
# stable, uniquely-occurring anchor line -- for failure-window testing.
#
# Covers 4 of the 8 required failure windows (see README.md "Eight required
# failure windows"): the four that are boundaries inside the migration's own
# top-level DO block text, between its own steps:
#   window 1 -- after target selection (Step 1), before neutralization (Step 2)
#   window 2 -- immediately after neutralization, before the per-game loop
#   window 5 -- after restoration (Step 2's restore + defense-in-depth
#               revoke), before the final real rebuild call (Step 3)
#   window 8 -- after the final real rebuild call, before the top-level
#               statement completes
# The other 4 windows (3, 4, 6, 7 -- inside the per-game loop, first call /
# after several calls / inside rebuild_metric_summaries_base / inside
# rebuild_additional_metric_summaries) are covered instead by disposable stub
# function swaps in run-verification.sh, not by instrumented migration
# copies -- there is no stable text position inside the *unmodified*
# migration file that corresponds to "the Nth loop iteration" or "inside a
# function this migration calls but does not define", so a stub swap is the
# narrower, more reliable technique for those four (see run-verification.sh's
# failure_window_case invocations 3/4/6/7 in the "8 required failure windows"
# section for the actual swap SQL).
#
# NEVER modifies the tracked migration file. Every generated copy is written
# under $OUT_DIR, which the caller must set to a scratch directory OUTSIDE
# this repository's tracked source tree -- this script only refuses to write
# inside its own directory tree as a minimal guard against accidentally
# generating a copy that a future `git status` would pick up as untracked
# noise inside supabase/migrations/.
#
# Usage:
#   OUT_DIR=/some/scratch/dir ./06-failure-window-generator.sh
#
# Exits nonzero, writing no output files, if:
#   - the real migration file's sha256 does not match EXPECTED_SHA256 below
#     (the actual sha256 is reported so a reviewer can tell whether this
#     script is simply stale relative to a further-edited migration, rather
#     than silently generating instrumented copies of an unreviewed file)
#   - any anchor does not occur in the source file exactly once

set -eu

HERE="$(cd "$(dirname "$0")" && pwd)"
MIGRATION="$HERE/../../20260720223000_fix_event_card_tag_snapshot_correction.sql"
# Recompute after any further edit to the migration file:
#   sha256sum supabase/migrations/20260720223000_fix_event_card_tag_snapshot_correction.sql
EXPECTED_SHA256="2eba01204cff08c7220d1b7c2f78c02e45b1332a7f621e28c1606e9d800d48f4"
OUT_DIR="${OUT_DIR:?set OUT_DIR to a scratch directory outside this repository's tracked tree}"

case "$OUT_DIR" in
  "$HERE"*)
    echo "refusing to write generated copies inside the tracked verification directory: $OUT_DIR" >&2
    exit 1
    ;;
esac

if ! actual_sha256="$(sha256sum "$MIGRATION" 2>/dev/null | awk '{print $1}')"; then
  # Git Bash / some minimal environments expose certutil instead of sha256sum.
  actual_sha256="$(certutil -hashfile "$MIGRATION" SHA256 | sed -n '2p' | tr -d '[:space:]' | tr 'A-F' 'a-f')"
fi

if [ "$actual_sha256" != "$EXPECTED_SHA256" ]; then
  echo "migration file sha256 mismatch: expected $EXPECTED_SHA256, found $actual_sha256 -- refusing to generate instrumented copies against a migration file this script was not reviewed against" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

require_exactly_one() {
  # require_exactly_one <label> <exact-line-text>
  n=$(grep -Fxc -- "$2" "$MIGRATION" || true)
  if [ "$n" -ne 1 ]; then
    echo "anchor for $1 must occur as an exact line exactly once in $MIGRATION, found $n occurrence(s): $2" >&2
    exit 1
  fi
}

inject_after() {
  # inject_after <exact-line-anchor> <statement-to-insert> <out-file>
  awk -v anchor="$1" -v stmt="$2" '{ print } $0 == anchor { print stmt }' "$MIGRATION" > "$3"
}

inject_before() {
  # inject_before <exact-line-anchor> <statement-to-insert> <out-file>
  awk -v anchor="$1" -v stmt="$2" '$0 == anchor { print stmt } { print }' "$MIGRATION" > "$3"
}

# --- Window 1: after target selection, before neutralization -------------
A1='    execute $exec_neutralize$'
require_exactly_one "window 1 (before neutralization)" "$A1"
inject_before "$A1" \
  "    raise exception 'INJECTED_FAILURE_WINDOW_1: after target selection, before neutralization' using errcode = 'P0001';" \
  "$OUT_DIR/window1.sql"

# --- Window 2: immediately after neutralization ---------------------------
A2='    $exec_neutralize$;'
require_exactly_one "window 2 (after neutralization)" "$A2"
inject_after "$A2" \
  "    raise exception 'INJECTED_FAILURE_WINDOW_2: immediately after neutralization' using errcode = 'P0001';" \
  "$OUT_DIR/window2.sql"

# --- Window 5: after restoration, before the final real rebuild ----------
A5='    $exec_restore_acl$;'
require_exactly_one "window 5 (after restoration, before final rebuild)" "$A5"
inject_after "$A5" \
  "    raise exception 'INJECTED_FAILURE_WINDOW_5: after restoration, before the final real rebuild' using errcode = 'P0001';" \
  "$OUT_DIR/window5.sql"

# --- Window 8: after the final rebuild, before statement completion ------
A8='    perform public.rebuild_metric_summaries();'
require_exactly_one "window 8 (after final rebuild, before statement completion)" "$A8"
inject_after "$A8" \
  "    raise exception 'INJECTED_FAILURE_WINDOW_8: after the final rebuild, before completion of the top-level statement' using errcode = 'P0001';" \
  "$OUT_DIR/window8.sql"

for f in window1 window2 window5 window8; do
  echo "generated: $OUT_DIR/$f.sql"
done
