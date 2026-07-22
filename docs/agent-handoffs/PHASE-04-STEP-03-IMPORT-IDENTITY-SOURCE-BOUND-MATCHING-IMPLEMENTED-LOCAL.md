# Phase 4, Step 4.3 - Source-Bound Import Identity Matching Local Implementation Handoff

## Status

**BUILT locally and STOPPED at the release boundary.** The owner-authorized
source-bound import identity design is implemented on
`fix/import-identity-source-bound-matching`. Both migrations are gated and
unapplied. Nothing was written to production, deployed, pushed, revoked, or
applied. Step 4.4, registration-time claiming, and a closure audit did not begin.

This handoff supersedes
`PHASE-04-STEP-03-IMPORT-IDENTITY-SOURCE-BOUND-MATCHING-STOP.md` for local
implementation status. The STOP handoff remains the historical prerequisite
record. The governing durable decision remains the existing
`Phase 4 Step 4.3 - Import identity classification and source-bound matching`
entry in `docs/redesign/DECISIONS.md`; no duplicate decision was added.

## Production evidence boundary

Exactly two owner-authorized read-only production reads were used:

1. **[LIVE-READ] Catalog/definition/ACL/ledger snapshot, no personal rows.**
   Ledger count `110`, head `20260721201734`; the deployed
   `match_import_player_names(uuid,text[])` remains an authenticated
   `SECURITY DEFINER` arbitrary-array oracle with fine-grained reason/score;
   registered usernames have only raw uniqueness; `pg_cron` is absent.
2. **[LIVE-READ] COUNT-only normalized collision preflight.**
   `normalized_collision_group_count = 0`. No username, user ID, row, or
   personal value was returned.

The production-read boundary was then closed. There were no additional live
reads and no production mutation.

## Implemented contract

### Private staging and lifecycle

The expansion migration creates `private.import_identity_staging` with:

- server-parsed source player texts, group/requester identity, parser identity,
  source format, optional game/import linkage, and a 30-minute expiry;
- a hard one-to-five-seat bound and per-value validation;
- RLS enabled and all direct table privileges denied to `public`, `anon`,
  `authenticated`, and `service_role`;
- public `SECURITY DEFINER`, `search_path = ''` gateways for stage, resolve,
  attach, and discard, each executable only by `service_role`;
- opportunistic expiry cleanup on service calls, cascade cleanup when the
  attached draft/import is deleted, and trigger cleanup when a game finalizes.

`service_role` intentionally receives gateway EXECUTE only, not `private`
schema/table access. The server action stages `logParse.players[].originalValue`
before any identity resolution, passes only a staging ID plus one seat ordinal
to the matcher, persists the same authoritative text in resolution evidence,
and attaches the stage only after the draft and import row exist. A failed
resolution discards the stage; later abandoned partial runs expire.

### Structured source-bound matcher

`resolve_staged_import_player_identity` accepts one classification:

- `existing_player` with an explicit player ID;
- `username` with exact normalized equality to the staged seat; or
- `personal_name` with staged text exactly equal, after whitespace collapse,
  to the submitted first name, last name, or full name.

First-name-only and last-name-only personal evidence never auto-links; it
requires explicit selection. The function takes a group-scoped advisory lock,
locks the selected/candidate player row by stable ID, and re-runs eligibility
after that row lock before reuse or creation. The preflight-backed normalized
registered-username unique index closes the check/write race.

Every matcher call returns exactly one row with only
`outcome`, `player_id`, and `public_label`. Private match reasons, scores,
normalized keys, aliases, and personal values never cross the function boundary.
Caught database failures collapse to the same `unavailable` shape, and the
application maps RPC errors to a generic unavailable message.

### Expand/contract release shape

- `20260722012658_add_source_bound_import_identity_staging.sql` - **expansion**,
  gated and unapplied.
- `20260722012707_retire_free_form_import_name_matcher.sql` - **contraction**,
  gated and unapplied; revokes the legacy matcher from public/anon/authenticated
  while retaining service-role compatibility.

The contraction is intentionally a separate file. It may be authorized only
after the expansion and compatible server reader are deployed and verified.
The existing `20260720120000_coarsen_import_name_match_reasons.sql` was neither
edited nor applied and the executable runner explicitly skips it.

## BEFORE / AFTER executable proof

| Property | BEFORE: deployed predecessor model | AFTER: expansion | AFTER: contraction |
| --- | --- | --- | --- |
| Caller input | authenticated arbitrary `text[]`, including 65 probes | service-only staging ID + one bounded ordinal + structured classification | same source-bound path |
| Private-name oracle | fine-grained field reason and 1:1 score reproduced | only `outcome`, stable player ID, public label | authenticated legacy execution denied |
| Exact username/full name | old oracle resolves and discloses source field | exact source-bound equivalents resolve | source-bound path retained |
| First/last-only personal text | arbitrary probeable text | never auto-links; explicit selected ID required | unchanged |
| Invalid/ambiguous/unavailable | observable row/no-row and reason distinctions | uniform three-column one-row shape with null public values | unchanged |
| Authorization | authenticated member can probe old function | only service-role gateways; membership/requester rechecked | old authenticated EXECUTE revoked |
| Lifecycle | none | expiry purge, finalization cleanup, and cascade cleanup | unchanged |

The disposable runner applies the expansion twice, runs the AFTER assertions
while the old matcher still exists, then applies the separate contraction twice.

## Files changed

- Import orchestration and dependency binding under
  `src/app/(app)/log-game/import/`.
- Source-bound service repository and focused tests in
  `src/lib/db/import-player-identity-repo.ts` and its test.
- Two gated migrations and static/executable migration tests under `supabase/`.
- Migration ledger classifications and reference map.
- `docs/REDESIGN_STATE.md`, `docs/redesign/MASTER-PLAN.md`, and this handoff.

`docs/redesign/DECISIONS.md` was referenced and intentionally not edited.

## Validation

- `bash supabase/tests/executable/run.sh` (via installed Git Bash): pass,
  including `MATCH_ORACLE_PRE_CONTRACTION_PINNED`,
  `SOURCE_BOUND_IMPORT_IDENTITY_AFTER_PINNED`,
  `SOURCE_BOUND_IMPORT_IDENTITY_CONTRACTION_PINNED`, all behavioral assertions,
  and all fixture assertions.
- Focused Vitest: 3 files / 20 tests pass.
- Full Vitest, TypeScript, lint, build, and final diff checks are recorded in
  the final task report and repository state after they complete.

## Boundaries and next action

No production write, migration application, deploy, push, closure audit,
registration-claiming flow, Step 4.4, or unrelated phase work occurred.

Next action requires a new explicit owner assignment: separately authorize an
expansion production preflight/application and compatible server deploy, verify
the reader, then separately authorize the contraction. Until then, the correct
state is **built locally, release-stopped**.

### Final validation addendum

- Full Vitest: 178 files / 978 tests pass with `--no-file-parallelism`.
- `npx tsc --noEmit`: pass.
- `npm run lint`: pass with four pre-existing warnings (three `img`
  optimization warnings and one unused analytics normalizer).
- `npm run build`: pass with process-only non-secret Supabase placeholders;
  no environment file was created or copied.
