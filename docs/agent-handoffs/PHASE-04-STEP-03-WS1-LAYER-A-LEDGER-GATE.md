# Phase 4, Step 4.3 — WS1 Layer A: ledger gate + harness reconciliation

**Scope: Layer A only.** Layer B and Layer C of Workstream 1 are NOT started.
WS2, guest re-neutralization, the tile backfill, the closure audit, and Step
4.4 are NOT begun. Step 4.3 is not marked anything by this work; it remains
BLOCKED pending a fresh independent read-only closure audit.

Session model: Claude Opus 4.8. Branch `fix/step-43-ws1-layer-a-ledger-gate`,
created from `redesign/tm-stats-dashboard-rebuild` at `0c6f45dfa` in an
isolated worktree. The main redesign worktree was not modified.

## Production access

**None.** No Supabase MCP call, no `list_migrations`, no `execute_sql`, no
`wrangler`, no `/api/deploy-info` fetch. Nothing pushed, deployed, or applied.
No file under `supabase/migrations/` was created, edited, renamed, or applied.
`.codex/` and `DEPLOY-STATE.md` were not touched.

Layer A is hermetic by construction: the production ledger's ground truth for
this work is the read-only attestation of 2026-07-21, supplied as authoritative
input. The only production-facing check performed here was confirming the local
base matched that attestation's stated base — it did (105 entries, max
`20260720021300`).

## Re-derived facts (worktree, not inherited)

| Fact | Value | How derived |
| --- | --- | --- |
| Base commit | `0c6f45dfa4e4fc8ad51aebe81a701030d87563c8` | `git rev-parse HEAD` on the redesign branch |
| `PRODUCTION_LEDGER_VERSIONS` before | 105 entries, max `20260720021300`, sorted, unique | parsed from the file |
| Migration files on this branch | 49 | `ls supabase/migrations/*.sql` |
| Gated migrations in the harness replay loop | 3 of 5 (`20260717190000`, `20260720100000`, `20260720120000`) | read `run.sh`; the loop excluded only alias/split/placement |

Hazard classes were declared from a per-file reading of the actual `DROP` /
`REVOKE` / `CHECK` statements and their replacements, not from filenames.

## Deliverable 1 — Layer A gate

`src/lib/db/migration-ledger-map.ts`, `…test.ts`,
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`.

### Refreshed snapshot

108 entries; head `20260721081355 fix_event_card_tag_snapshot_correction`. The
three additions over the previous snapshot are registered as known
production-only entries relative to this branch, each with its ledger version,
ledger name, other-branch filename version, and branch provenance:

| Ledger version | Ledger name | Source file (other branch) | Branch |
| --- | --- | --- | --- |
| `20260720221937` | grant_authenticated_claim_rpc_execute | `20260720190000_…sql` | `b11cae71b` (`fix/b05-claim-rpc-authenticated-grants`) |
| `20260721035955` | secure_public_player_labels_service_role | `20260721013000_…sql` | `origin/fix/public-player-label-service-role-boundary` |
| `20260721081355` | fix_event_card_tag_snapshot_correction | `20260720223000_…sql` | `origin/fix/event-card-snapshot-migration-bounded-rebuild` |

`PRODUCTION_LEDGER_ATTESTATION` records the attestation date, count, and head,
plus the previous count and head, so a future mismatch is a detectable failure
rather than a silent overwrite.

### Bidirectional completeness

The file's header comment already claimed the test "partitions every repo file
and every ledger version". It did not: nothing iterated the snapshot. It does
now. Every version in `PRODUCTION_LEDGER_VERSIONS` must resolve to exactly one
of repo-native, reconstructed-remote-only, renamed-drift target, gated, or
registered production-only; anything else fails as `LEDGER_INCOMPLETE`.

Making that direction complete required registering every ledger entry with no
file on this branch — `PRODUCTION_ONLY_LEDGER_VERSIONS`, 68 entries. The
partition is exact: 29 repo-native + 2 reconstructions + 9 renamed-drift
targets + 68 production-only = 108. Most of the 68 are remote-only history
whose migration *names* were never captured by any attestation, so no name is
asserted for them; the seven whose identity is attested carry provenance in
`PRODUCTION_ONLY_ENTRY_PROVENANCE`.

This is exactly the hole the three cross-branch applications fell through: they
landed in the production ledger and left no trace on this branch, and the
one-directional gate could not see them.

### Hazard class

A second, orthogonal dimension. Every migration **file** on this branch must
declare `contraction | expansion | neutral`; an undeclared file fails as
`CLASSIFICATION_MISSING`. Declarations are explicit and never derived from the
SQL, because the hazard depends on what was *deployed before* the migration,
which the SQL alone does not record.

**12 contraction, 29 expansion, 8 neutral (49 files).** The contractions:

`20260704000000`, `20260715032000`, `20260715113501`, `20260718041532`,
`20260718050924`, `20260718212339`, `20260718212340`, `20260719223000`,
`20260719223500`, `20260719230000`, `20260719234500`, `20260720120000`.

`20260720120000_coarsen_import_name_match_reasons` is `contraction` as
assigned: it narrows a disclosed classification a caller can read.

Two declarations run against how the raw SQL reads, and are documented in the
map:

- `20260720100000` **drops** the deployed 7-argument
  `resolve_import_guest_identity` signature but creates an 8-argument superset
  whose new parameter defaults to the previous behaviour, so every previously
  valid call still resolves → `expansion`.
- `20260704034500` / `20260704071832` / `20260704123000` drop policies and
  recreate them equal-or-broader (`owners …` → `members …`, `editors …` →
  `members …`) → `expansion`.

Production-only entries whose files are not on this branch carry **no** hazard
class; ledger completeness is the only property that applies to them until
their file lands here. This is stated in both the module and the map, and the
test rejects a hazard declaration for a version with no file.

### Preserved

Every previously passing assertion still runs, including "never lists a gated
migration as applied" (`GATED_MIGRATION_APPLIED`), which additionally now
asserts no gated version is registered production-only. Test count for this
file: 6 → 10.

### Gates verified to fail (mutation-checked, then reverted)

| Mutation | Result |
| --- | --- |
| append an unregistered version to the snapshot | attestation count mismatch fires |
| drop `20260721081355` from the production-only register | `LEDGER_INCOMPLETE: ledger version 20260721081355 resolves to 0 classifications (none)` |
| delete the `20260720120000` hazard declaration | `CLASSIFICATION_MISSING: migration 20260720120000 has no declared hazard class` |

## Deliverable 2 — executable-harness reconciliation

`supabase/tests/executable/run.sh`, `README.md`, and three new assertion files.

### Gated migrations removed from the production-history baseline

The replay loop excluded only the alias, split, and placement migrations, so
gated `20260717190000`, `20260720100000`, and `20260720120000` were applied as
if they were production history. The pre-split-compat assertion — whose own
comment says "This is the state production is in today" — therefore ran against
a database carrying three never-applied migrations.

`run.sh` now runs in two explicitly separated halves:

1. **Production history.** Only migrations actually applied to production,
   plus the modelled pre-image below. The baselines (`pre-split-compat.sql`,
   `match-oracle-pre-contraction.sql`) run here, with nothing gated above them.
2. **Gated work.** All five `GATED_UNAPPLIED` migrations in ledger-version
   order, each applied twice for repeat-safety — which also *extends* coverage:
   the merger and guest-alias migrations were previously applied once, inside
   the history loop, with no repeat-safety check.

`20260720100000` still precedes `20260720110000`, and both still precede
`assertions.sql`, which depends on the 8-argument guest RPC.

### The contraction is now exercised as a contraction

`20260720120000` is a `create or replace` of `public.match_import_player_names`,
whose only predecessor is production-only `20260720021300` — no repo file. The
harness was therefore **creating** the function, not replacing it, and no
assertion referenced it at all.

`production-preimage-20260720021300-match-import-player-names.sql` installs a
modelled pre-image of the deployed predecessor before the baseline, making the
gated migration a true REPLACE — a signature or return-shape mismatch now fails
loudly instead of silently defining a new function.

**What the pre-image is:** a reconstruction from repository-local evidence
only. No production system was read to produce it. Its evidence is the deployed
definition documented in the gated migration's own header and in the third
remediation handoff: the seven fine-grained `match_reason` values, the
400/350/300/250/200/175/150 scores mapping 1:1 onto them, the explicitly
retained internal ranking, the preserved `SECURITY DEFINER` /
`search_path = ''` / `is_group_member` gate / `private.resolve_public_player_name`
/ cross-group candidate pool, and the absence of an input bound (which the
contraction adds).

**Limitation, stated in the file itself:** fidelity is asserted only for the
surface the contraction changes — signature, return shape, ACL, disclosed
classification, and absence of an input bound. It is not a byte-faithful copy
of the deployed function, must never be promoted into `supabase/migrations/`,
and must never be cited as evidence about production. It is confined to the
disposable harness.

Assertions, on identical probes and fixtures either side of the migration:

| Probe | Before | After |
| --- | --- | --- |
| `Oraclefixture Displaymatch` | `display_name_exact` / 400 | `exact` / 2 |
| `Oraclefixture Fullmatch` | `full_name_exact` / 350 | `exact` / 2 |
| `oraclefixture-username` | `username_exact` / 300 | `exact` / 2 |
| `Oraclefixture Aliasmatch` | `alias_exact` / 250 | `exact` / 2 |
| `Oraclefixture` | `display_name_partial` / 200 | `partial` / 1 |
| `Zzzznomatchatall` | no row | no row |

Each probe also asserts the **same resolved player** on both sides, which is
the migration's central claim (internal ranking unchanged, only the disclosure
coarsened). Additionally: the predecessor accepts a 65-name batch and the
replacement rejects it (`22023`), an over-long name is rejected, a non-member
is rejected on both sides, and the post-contraction call succeeds as
`authenticated` even though the migration grants nothing — proving the ACL
survived `create or replace`.

Markers: `MATCH_ORACLE_PRE_CONTRACTION_PINNED`,
`MATCH_ORACLE_CONTRACTION_VERIFIED`.

## Validation at the final commit

Run from the worktree root (`C:/tmp/tm-step-43-ws1-layer-a`), which is the
repository root for this branch.

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run --no-file-parallelism` | 177 files, 970 tests, all passed |
| `npm run lint` | the four baseline warnings (3 `no-img-element`, 1 unused var), none new |
| `npm run build` | green, 32 pages, middleware present |
| `bash supabase/tests/executable/run.sh` | `ALL EXECUTABLE MIGRATION TESTS PASSED` |
| `git diff --check` | clean |

Test totals moved 965 → 970: the ledger-map file gained 4 tests (6 → 10) and
one pre-existing suite is unchanged otherwise.

The isolated worktree needed a real `npm ci`; the build additionally needed the
gitignored `.env.local`, which was copied in from the main worktree for the
build and deleted immediately afterwards. It is not committed (`.gitignore:39`).

## Where the worktree contradicted a prior claim

1. **The map module's header comment was false.** It stated the drift test
   "partitions every repo file and every ledger version through this map"; the
   test iterated repo files only. Now true.
2. **`MIGRATION-LEDGER-MAP.md` understated the harness.** It claimed clean
   replay was executable-tested "including double application of the gated
   split and placement migrations" — accurate as far as it went, but the same
   replay was silently applying three *other* gated migrations as production
   history. Corrected.
3. **The required-reading list names a WS1 scope-audit report that does not
   exist as a repository file.** Neither `C:/tmp/tm-step-43-ws1-scope-audit`
   nor `C:/tmp/tm-step-43-ws1-production-attestation` has any uncommitted or
   committed report; both worktrees are clean at `0c6f45dfa`. Their content was
   available to this session only as the attested input in the assignment.
4. **The third-remediation handoff's WS1 blocker is narrower than stated.** It
   reported WS1 blocked on "the absence of any runtime-verifiable deployment
   metadata to gate on". That blocks gating on *deployed code* (Layer B/C). It
   does not block the ledger-side gate delivered here, which needs no runtime
   deployment evidence.

## What remains

- **WS1 Layer B and Layer C — not started.** Layer B/C still need the
  runtime-verifiable deployment stamp identified in the third-remediation
  handoff: Cloudflare records no source commit and neither repo serves a
  build-time commit endpoint, so a gate cannot yet read the live worker's
  actual commit. The hazard-class dimension added here is the input such a gate
  would consume (it tells the gate *which* migrations require deployment
  evidence); it does not itself consult any deployment evidence.
- **WS2 — not started.** The live-site privacy reader move, the B-02 half of
  the pair. `20260720120000` must not be applied until it ships.
- **Migration application — none.** All five gated migrations remain prepared
  and unapplied.
- **Guest re-neutralization, the tile backfill, the closure audit, Step 4.4 —
  not begun.** The ordering constraint from the third remediation pass still
  holds: the tile backfill must run *before* guest re-neutralization.
