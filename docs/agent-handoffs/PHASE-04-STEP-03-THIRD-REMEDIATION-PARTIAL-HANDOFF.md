# Phase 4, Step 4.3 — Third remediation pass (PARTIAL)

**Status: INCOMPLETE. Step 4.3 remains BLOCKED.** Two of the six assigned
workstreams are delivered and validated; two are not started; one was
deliberately not executed because the deploy lock is held elsewhere.

Session model: Claude Opus 4.8. Branch `redesign/tm-stats-dashboard-rebuild`,
starting from audit candidate `eb1f73161`.

## Production freeze — resolved facts

Established from authoritative deployment metadata plus the owner's direct
statement, not from timestamp inference.

| | |
|---|---|
| Live worker version | `c23bfbd7-9729-4981-9f45-aee05c242d31` |
| Built | 2026-07-20 15:14:01 UTC |
| Source commit | `59dda6c0f` |
| Source branch | `fix/live-42501-on-capture-v2` |
| Branch tip at handoff | `14abb8d1d` (one docs-only commit ahead of live) |
| Deploy lock | **Izzy** (owner retains it; this session deployed nothing) |
| DB ledger head | `20260720021300 add_import_player_name_matching_rpc` |
| Rollback target | `eb4e5821` (v2-hardening build, `bf081d918`) |

### Corrections to the assignment's stated premises

- The branch was **16** commits ahead of `data-capture-hardening-v2`
  (`64918663a`), not 15, and is now 17 with the docs commit.
- Two production deploys (`1b3dbac3` 14:00:43Z, `21e3047e` 14:30:26Z) landed
  after the last one recorded in DEPLOY-STATE.md and before `c23bfbd7`.
  Cloudflare records `Source: Unknown (version_upload)` and carries no commit
  metadata, so version→commit linkage exists only in DEPLOY-STATE.md.

### Resolved risk: unpushed production source

`fix/live-42501-on-capture-v2` existed on **no remote**. The entire source of
the running worker was single-copy on one local disk, and a deploy from the
remote `data-capture-hardening-v2` would have reverted all 16 commits at once.
Pushed to `origin` with owner approval; now tracked at
`origin/fix/live-42501-on-capture-v2`.

## Delivered

### Workstream 4 — tile attribution (commit `594244875`)

Root cause: imported placement events are persisted while the game is a draft,
before `game_players` rows exist. `buildTerraformingMarsLogEvents` already
accepts a same-game participant map, but `finalizeGameLog` never supplied one
and nothing re-attributed afterwards, so `player_id` / `game_player_id` stayed
null permanently.

`finalizeGameLog` now calls `attributeImportedPlacementEvents(gameId)` after
participant rows are inserted and before metric refresh. Resolution uses only
the import's own recorded `player_identity_resolutions` matched against the
parser-preserved actor text. Unresolved, ambiguous, and non-participant actors
stay unattributed. Null predicates on read and write make retries no-ops.

New pure module `src/lib/imports/resolve-tile-event-attribution.ts` with 14
tests covering exact attribution, unattributed actor, ambiguous actor,
same-game enforcement, retry idempotency, finalization after draft import, and
all six canonical placement actions.

### Workstream 3 — matching oracle (commit `1efd6f447`)

Migration `20260720120000_coarsen_import_name_match_reasons.sql`. **Gated, not
applied.**

The deployed `match_import_player_names` is SECURITY DEFINER and returns
`full_name_exact` / `alias_exact` / `display_name_exact` and partial variants.
Any caller who may import into a group could submit candidate strings and read
back which private field matched, confirming `players.full_name` and stored
alias texts field by field — defeating the Data API revokes in
`20260719192054` / `20260719203944`.

`match_score` (400/350/300/250/200/175/150) maps 1:1 onto the reason, so it is
a parallel oracle; coarsening the reason alone would have left the exposure
fully intact. Both are coarsened to `exact`/`partial` and 2/1.

Internal ranking is unchanged, so the same player is still selected — only the
disclosed classification changes. Input bounded to 64 names of 128 chars.
`is_group_member` gate and `search_path=''` hardening preserved.

Validated by creating the function under a scratch name inside a rolled-back
transaction against the real schema; verified afterwards that nothing leaked
and the production RPC is byte-unchanged.

### Workstream 6 — ledger reconciliation (partial, in commit `1efd6f447`)

Production-only `20260720021300` added to `PRODUCTION_LEDGER_VERSIONS` and to
the documentation map; `20260720120000` registered as gated. The drift test
passes.

## Backfill package — prepared, NOT executed

`supabase/verification/tile-attribution-{dry-run,backfill,rollback}.sql`.

Measured read-only against production on 2026-07-20:

| Game | Import | Rows |
|---|---|---|
| `008bb0b8-532b-4b88-9132-51a6633d5be1` | `0e4146ff` | 45 |
| `935e6dd9-9aaf-4432-8241-a1c8e8bd0127` | `217f06f4` | 35 |
| `46bde90c-0dd6-48bd-8ccc-471986e4acec` | `b1f88e06` | 34 |

114 rows, 3 games, 3 imports, **0 ambiguous, 0 excluded**. The dry-run
predicate was executed read-only and returns exactly this.

All three imports store **zero** `player_identity_resolutions`, so the
finalization-time evidence is unavailable for them. The package therefore
resolves `payload->>'actor'` against the game's own participants and accepts
only an exactly-one match.

### Load-bearing ordering constraint

Evidence coverage for the 114 rows:

| Signal | Resolves |
|---|---|
| `players.display_name` first token | 114 / 114 |
| `player_import_aliases` | 45 / 114 |
| `user_profiles.username` | 0 / 114 |
| private personal first name | 0 / 114 |

Two rows (game `46bde90c`, actor "Jenna") resolve **solely** through
`display_name`, and only because that value was set to the guest's full name on
2026-07-20. She is the remaining unlinked guest.

**The assignment's Workstream 5 orders re-neutralization (step 5) before the
tile backfill (steps 7–8). That order destroys the only evidence for those two
rows and makes them permanently unattributable rather than merely ambiguous.**
The backfill must run **before** guest re-neutralization. Once written, the
attribution is durable and no longer depends on `display_name`.

## NOT delivered

### Workstream 1 — executable expand/contract gate (NOT STARTED)

The intended wiring point is `src/lib/db/migration-ledger-map.ts` plus its test
(the existing executable drift gate), extended to reject a migration that adds
or validates a constraint required by a deployed writer, revokes a privilege
used by a deployed reader, drops a contract, or narrows an enum/CHECK, unless
runtime-verifiable deployment evidence proves a compatible reader/writer is
already deployed.

Blocking design problem found during discovery: **there is currently no
runtime-verifiable deployment metadata to gate on.** Cloudflare records no
source commit, and neither repo embeds a build-time commit stamp or serves a
version endpoint. A gate built today could only read prose in DEPLOY-STATE.md,
which the assignment explicitly forbids. Recommended prerequisite: embed the
commit at build time and serve it at a stable endpoint, so the gate can read
the live worker's actual commit.

`20260720110000` remains gated and unapplied regardless.

### Workstream 2 — privacy reader expansion (NOT STARTED)

Requires editing live-site code. Not attempted because the owner retains the
deploy lock and was actively committing to `fix/live-42501-on-capture-v2`
during this session; editing that worktree would have collided. Recommended
approach: branch from `14abb8d1d` into a fresh worktree.

**This is the B-02 half of the pair.** `20260720120000` must not be applied
until it ships.

### Workstream 5 — deploy sequence (DELIBERATELY NOT EXECUTED)

Owner retains the deploy lock. No deploy, no migration application, no
production mutation was performed by this session. All production access was
read-only, except the authorized `git push`.

## Validation at handoff

Commands run at the final commit, all from the redesign repo root:

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run --no-file-parallelism` | 177 files, 965 tests, all passed |
| `npm run lint` | 4 baseline warnings (3 `no-img-element`, 1 unused var), none new |
| `npm run build` | green |
| `bash supabase/tests/executable/run.sh` | `ALL EXECUTABLE MIGRATION TESTS PASSED` |
| `git diff --check` | clean |

## Production mutations performed

None. Read-only verification only. The one outward-facing action was the
owner-approved `git push` of `fix/live-42501-on-capture-v2` to `origin`.

## Next actions

1. Workstream 2 on a branch off `14abb8d1d`, then deploy and verify it.
2. Only then apply `20260720120000` (paired with Workstream 2).
3. Run the tile-attribution dry run, then the backfill — **before** guest
   re-neutralization.
4. Re-neutralize the unlinked guest.
5. Workstream 1, after a runtime-verifiable deployment stamp exists.
6. Fresh independent read-only closure audit. Step 4.3 stays BLOCKED until it
   returns PASS. Step 4.4 has not begun.
