# Phase 4, Step 4.3 - Source-Bound Import Identity Matching Regression Remediation

## Status

**REMEDIATED locally and still STOPPED at the release boundary.** The
independent review of `fix/import-identity-source-bound-matching` passed the
security objective and blocked on a legitimate-matching regression. That
blocker is fixed, legacy identity coverage is added, and every anti-oracle
property was re-measured rather than assumed. Both migrations remain gated and
unapplied. No production write, apply, revoke, deploy, push, or merge occurred.

This handoff extends
`PHASE-04-STEP-03-IMPORT-IDENTITY-SOURCE-BOUND-MATCHING-IMPLEMENTED-LOCAL.md`.
The governing durable decision remains the existing
`Phase 4 Step 4.3 - Import identity classification and source-bound matching`
entry in `docs/redesign/DECISIONS.md`; it was referenced and not duplicated.

Branch tip re-derived at start: `e27fae282` (as expected).

## What the blocker actually was

In `private.import_identity_player_matches`, both the
`player_private_identities` and the `player_import_aliases` fallbacks were
gated on `p.linked_user_id is null` in all three modes. A count-only
production introspection pass confirmed the consequence and found a second,
independent defect the review had not named.

### Production shape (count-only introspection, 2026-07-21)

| Fact | Value |
| --- | --- |
| players / linked / unlinked | 28 / 26 / 2 |
| `player_import_aliases` rows | 110 |
| ... with `identity_mode IS NULL` | 110 |
| ... belonging to a **linked** player | 110 |
| linked players carrying an alias | 22 |
| `private.player_private_identities` rows | 0 |
| `private.player_legacy_identities` rows | **0** |
| unlinked players with `players.full_name` | 1 |
| unlinked players with `players.username` | 1 |
| alias rows matching the personal-name normalizer | 110 |
| alias rows matching the username normalizer | **66** |
| alias rows containing a space / a hyphen | 44 / 0 |
| (group, normalized identity key) pairs mapping to >1 player | **0** |

Only counts, booleans, and catalog facts were read. No name, ID, or row content
was returned at any point.

### Two defects, not one

1. **The linked gate.** Every alias row that exists belongs to a linked player,
   so the alias path was 100% dead by construction and `player_private_identities`
   is empty, making that fallback dead too.
2. **Normalization mismatch (new finding).** Stored aliases are written in the
   *space* form (`normalize_claim_player_name` /
   `normalize_private_personal_name`), but username-mode compared them against
   the *hyphen* form (`normalize_guest_username`). The 44 multi-token alias rows
   would therefore have stayed unmatchable in username mode **even after the
   gate was removed**. Removing the gate alone would not have fixed the
   username-mode path.

## What changed

`supabase/migrations/20260722012658_add_source_bound_import_identity_staging.sql`
was **edited in place** (it is unapplied; no corrective migration was stacked on
it). The matcher now:

- reads identity evidence for **linked and unlinked players alike** - the
  `linked_user_id is null` gate is removed wholesale, not narrowed. It was never
  a privacy control: the function returns a boolean, and a claim preserves the
  player ID and its history, so pre-claim evidence still identifies the same
  player. The retired matcher applied no such gate either. The reasoning is
  recorded in-file;
- treats `identity_mode IS NULL` alias rows as **mode-agnostic**, matching the
  deployed matcher and the meaning of `player_import_aliases_legacy_unique_idx`;
- compares each candidate value against a stored alias in **both** normalized
  forms, which fixes the multi-token username-mode defect;
- also reads `public.players.full_name`, `public.players.username`, and
  `private.player_legacy_identities` (both `legacy_full_name` and
  `legacy_username`) as identity evidence.

Comparison remains exact equality on a normalized key. There is no substring,
prefix, fuzzy, or similarity comparison anywhere, and first-name-only or
last-name-only evidence still never auto-links. All widened sources are private
and are read only inside the definer; none is returned, logged, or otherwise
allowed across the gateway boundary.

### Deviation from the brief, and why

The brief authorized `players.full_name` and `private.player_legacy_identities`
so that "the 2 otherwise-unmatchable unlinked players can resolve." Measured
against production, those two sources reach only **one** of the two players:
`private.player_legacy_identities` is **empty** (its populating migration ran
when there were no unlinked players, and both current unlinked players were
created afterwards), and the second player's only evidence is
`public.players.username`. `players.username` was therefore included. It is the
exact sibling private column, preserved by the same isolation migration
(`legacy_username` in the legacy table is a copy of it), and it is required to
meet the brief's stated objective. With it, `unlinked_still_unmatchable = 0`.

`private.player_legacy_identities` is still implemented and proved, because it
is the durable contract that preserves these values once the public columns are
dropped.

## BEFORE / AFTER, measured

`supabase/tests/executable/source-bound-import-identity-linked-alias-before.sql`
reinstalls the matcher **byte-exactly as committed at `e27fae282`** (verified by
diff against `git show`) and probes production-shaped fixtures: a LINKED player
whose seat text exists only as an `identity_mode = NULL`, space-normalized alias
row. `run.sh` then re-applies the expansion - which doubles as the repeat-safety
apply - restoring the shipped matcher, and the AFTER file probes the same
fixtures on the same database with only the matcher changed.

| Probe | BEFORE | AFTER |
| --- | --- | --- |
| Linked-player alias seat, automatic | `unresolved` | `resolved` -> correct existing player |
| Same seat, explicit user selection | `unavailable` (dead end) | `resolved` -> correct existing player |
| Create-new path | `resolved` -> **new duplicate player minted**, group population +1 | `resolved` -> **existing player reused**, population unchanged |
| Username mode vs multi-token alias | `unresolved` | `resolved` |
| `players.full_name` evidence | `unresolved` | `resolved` |
| `players.username` evidence | `unresolved` | `resolved` |
| `player_legacy_identities` evidence | `unresolved` | `resolved` |
| First-name-only, automatic | n/a | `ambiguous` (never auto-links) |
| First-name-only, explicit selection | n/a | `resolved` |

The AFTER file additionally asserts that the label returned for the linked
player is the **registered username** and never the alias text, profile full
name, or any normalized key; that unlinked players keep their neutral
`Guest XXXXXXXX` label; and that exactly one alias row still exists for the seat.
Cross-group isolation is proved by seeding the same identity text on a player in
a group the caller is not staging into: a leak would surface as `ambiguous`, and
the probe resolves to exactly one in-group player.

## Anti-oracle guarantee: re-proved, not assumed

`supabase/tests/executable/source-bound-import-identity-uniformity.sql` runs
after the widening. Measured results:

| Probe | outcome | rows | column shape |
| --- | --- | --- | --- |
| `unresolved` | `unresolved` | 1 | `outcome,player_id,public_label` |
| `ambiguous` | `ambiguous` | 1 | `outcome,player_id,public_label` |
| `invalid_source_match` | `invalid_source_match` | 1 | `outcome,player_id,public_label` |
| `unavailable` | `unavailable` | 1 | `outcome,player_id,public_label` |
| induced database failure | `unavailable` | 1 | `outcome,player_id,public_label` |

Every property re-confirmed:

- exactly one row, three columns, NULL `player_id` and `public_label` in every
  failure mode;
- the four failure modes are indistinguishable by row count, column count, name,
  order, nullability, SQLSTATE (`00000` throughout - nothing escaped), or error
  text. They differ only in the `outcome` label they are designed to carry;
- **no NOTICE/WARNING/INFO output.** SQL cannot assert this about itself, so
  `run.sh` captures the whole session with `client_min_messages = notice` and
  fails on any such line;
- an induced database failure (a trigger forced to raise inside the resolver's
  insert path) collapses to the same uniform `unavailable` shape;
- `anon`, `authenticated`, and `public` hold EXECUTE on **none** of stage /
  resolve / attach / discard, `service_role` retains all four, and the matcher
  itself is executable by no role;
- the staging table keeps RLS on and grants none of select/insert/update/delete/
  references/trigger to any role;
- the widened evidence sources remain unreadable by client roles: `anon` and
  `authenticated` can read neither `players.full_name`/`players.username` nor
  `private.player_legacy_identities`/`private.player_private_identities`.

No regression was found, so no hard stop was triggered.

## Line-ending test defect

`supabase/tests/source-bound-import-identity-migrations.test.ts` asserted a
hard-coded `\n`-joined string. The repository is `core.autocrlf=true` with no
`.gitattributes`, so a fresh Windows checkout materializes CRLF and the test
failed; the build worktree was green only because its files were authored in
place.

**Chosen fix: normalize at read time in the test**, not a `.gitattributes`
entry. The assertions are about SQL structure, not newlines, and a repo-wide
`.gitattributes` would renormalize unrelated files on the next checkout - a much
broader change than the defect warrants. A `readMigration()` helper strips `\r\n`
for both migrations, so the whole file is CRLF-immune rather than only line 52.

Proved both directions against genuinely CRLF-converted migrations: the original
test **fails**, the fixed test **passes**. The files were then restored to LF and
verified byte-identical to their pre-conversion content.

A `withoutComments()` helper was also added so the new structural assertions read
executable SQL rather than prose, and a regression-guard test now fails if the
`linked_user_id is null` gate, the mode-strict alias read, or the legacy evidence
sources ever revert.

## Parked - recorded, not fixed

These are recorded for the owner and deliberately not acted on:

1. **The residual crafted-log probe leaves no durable evidence.** Resolution runs
   before the draft saves, and a failed attempt discards the staging row. The
   earlier characterization is corrected here. Whether failed attempts should be
   audited is a separate owner decision.
2. **Staging expiry is opportunistic.** Rows are swept only when a gateway is
   next called; there is no scheduler. Parsed seat text can therefore outlive its
   30-minute window until the next service call.
3. **The expansion is not purely additive.** It creates a UNIQUE index on live
   `public.user_profiles` and an AFTER UPDATE trigger on live `public.games`.
   The apply gate must account for both.
4. **`match-oracle-post-contraction.sql` is unreferenced.** `run.sh` no longer
   runs it; `source-bound-import-identity-contraction.sql` replaced it. The file
   remains in the tree and its coverage is currently lost.

## Validation at the final commit

- `bash supabase/tests/executable/run.sh`: **pass, run to completion**, exit 0,
  in a worktree with dependencies installed - including the fixture-to-persistence
  bridge the review could not reach. Pins observed:
  `MATCH_ORACLE_PRE_CONTRACTION_PINNED`,
  `SOURCE_BOUND_LINKED_ALIAS_BEFORE_PINNED`,
  `SOURCE_BOUND_LINKED_ALIAS_AFTER_PINNED`,
  `SOURCE_BOUND_IMPORT_IDENTITY_UNIFORMITY_PINNED`,
  `SOURCE_BOUND_IMPORT_IDENTITY_AFTER_PINNED`,
  `SOURCE_BOUND_IMPORT_IDENTITY_CONTRACTION_PINNED`,
  `ALL_ASSERTIONS_PASSED`, `ALL_FIXTURE_ASSERTIONS_PASSED`,
  `ALL EXECUTABLE MIGRATION TESTS PASSED`.
- `npx vitest run --no-file-parallelism`: **178 files / 979 tests pass**,
  including the previously failing line-ending test.
- `npx tsc --noEmit`: pass.
- `npm run lint`: pass with the same four pre-existing warnings (three `img`
  optimization, one unused analytics normalizer); none new, none in changed files.
- `npm run build`: pass.
- `git diff --check`: clean.

## Master-plan review

Reviewed as required. `docs/redesign/MASTER-PLAN.md` needed no change: its
"Source-bound import identity release contract (approved 2026-07-21)" section
states that exact username/full-name evidence may auto-resolve when unique and
that first/last-name-only always requires explicit selection - both of which this
work restores rather than alters. Nothing in the section is falsified by the fix,
and the change is an implementation correction inside an already-approved
contract, which the maintenance rules explicitly exclude from master-plan updates.

## Boundaries and next action

No production write, apply, revoke, deploy, push, or merge. `20260720120000` was
neither applied nor edited. `.codex/`, `DEPLOY-STATE.md`, and the main worktree
were untouched. The registration-claiming flow, the closure audit, and Step 4.4
did not begin. The branch was not rebased or merged with `redesign`.

Correct state remains **built locally, remediated, release-stopped**. Next action
requires a new explicit owner assignment: a re-review of this remediation, then
separately authorized expansion preflight/apply plus compatible reader deploy,
and only after verification a separate contraction authorization.
