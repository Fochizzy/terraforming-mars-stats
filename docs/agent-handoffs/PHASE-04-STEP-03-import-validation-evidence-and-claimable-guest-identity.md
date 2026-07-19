# Phase 4 · Step 4.3 — Import Validation, Evidence, and Claimable Guest Identity (remediation handoff)

## Status

**Step 4.3 is ACTIVE.** Two bounded passes are repository-complete:

1. the F-01–F-10 closure-audit remediation (commits `cfafd823`..`6e6e1859`,
   docs `4e20aeb8`), whose **four gated production mutation groups are applied
   and verified** (2026-07-19, user approved "apply all four"), followed by the
   F-01 completion and audit-view fixes (`e8397144`, `cf57d142`, `bbfc8613`);
2. the 2026-07-19 continuation session (this handoff's update), which
   integrated the **deployed** live-site data-capture v2 contract, split event
   confidence from review state, wired deterministic source identity into the
   import action, and produced the third immutable reconciliation artifact.

Do not mark Step 4.3 complete — that requires a fresh independent read-only
audit. Do not begin Step 4.4.

### Commit ranges

- F-01–F-10 pass: baseline `b0deed8c`, commits `cfafd823`..`bbfc8613`.
- Continuation session: baseline `bbfc8613`; implementation commits
  `435077bf`, `4c3ef273`, `7ec47f40`, `b4bac389`, `a3b76978`, `94306d60`,
  `333542b5`, `7460f054`, followed by one documentation/handoff commit — the
  branch head carrying this update (`git log -1`) is the end of the range.

| Continuation commit | Scope |
| --- | --- |
| `435077bf` | clean-baseline reconstruction of remote-only `players.username`/`full_name` (ledger `20260712114538`) |
| `4c3ef273` | confidence/review-state split (contract, parsers, RPC, gated migration `20260719234500`, executable mapping tests) |
| `7ec47f40` | live-capture v2 compatibility adapter + semantic matrix + specification |
| `b4bac389` | deterministic source identity in the import action + end-to-end action test |
| `a3b76978` | labelled synthetic-but-format-faithful full-export fixtures + fixture tests |
| `94306d60` | live-capture v2 reconciliation artifact + draft-evidence isolation test |
| `333542b5` | executable negative authorization/persistence tests for the event RPC |
| `7460f054` | shell test pinned to the public-only candidate contract |

## Live-site data-capture v2 relationship (Workstream 3)

**Verified production facts (read-only, 2026-07-19 — never from
documentation):** ledger migration `20260719132042 data_capture_hardening_v2`
is applied; marker `data-capture-hardening-v2` carries cutoff
2026-07-19 13:20:42Z and `parser_deployed_at` 13:24:14Z with parser
`tm-data-capture-v2`; all eight capture objects exist with seeded catalogs
(13 colonies / 23 event-type pairs); every capture data table held 0 rows
(no real post-cutoff import yet). The live-site repository and prepared
worktree (`C:\tmp\tm-data-capture-hardening-v2`, commit `bf081d918`) were
inspected strictly read-only and were not modified.

**Chosen consumption approach — a versioned read adapter at the repository
boundary** (`src/lib/db/game-capture-compat-repo.ts` +
`src/lib/imports/live-capture/{contract,map-live-capture}.ts`), specified
table-by-table in
`docs/redesign/reference/LIVE-SITE-DATA-CAPTURE-V2-COMPATIBILITY.md`:

- One canonical model backed by v2 rows when a supported parser run exists,
  by the legacy import shape otherwise; `availability` states which
  (`live_capture_v2` / `legacy_import` / `none`). A missing v2 run is never
  parser failure and never confirmed absence.
- Capability detection, not assumption: the first v2 query doubles as the
  schema probe (PGRST205/42P01 → legacy path); the gated `review_state`
  column is selected optimistically with a missing-column fallback, so the
  adapter is correct against production before and after each gated change.
- Reruns resolve to the newest supported run; unknown parser versions are
  reported as `unsupported_contract_version` and left untouched.
- Duplicate event/placement identities are surfaced as issues, never
  collapsed. Semantic violations (matrix below) are surfaced, never coerced.
- The adapter is read-only; the redesign does **not** write `game_capture_*`
  rows (a second producer with a different event vocabulary would recreate
  the two-incompatible-event-systems problem) and never duplicates v2 rows
  into redesign tables. The raw original source is never re-selected into
  DTOs.
- Hash semantics are explicit and never conflated: v2 `source_sha256` digests
  original bytes; legacy `input_sha256` digests the stored trimmed text; both
  are preserved; records join by `game_log_import_id`.

## Confidence and review state (Workstream 4)

The prior F-03 fix had overloaded confidence with a fourth `reviewed` value,
emitted both for unknown tile/colony evidence (which *needs* review) and for
importer-corrected values (already reviewed). The continuation splits them:

- `confidence_level`: `high`/`medium`/`low` — evidence strength only.
- `review_state`: `not_required`/`needs_review`/`reviewed`/`rejected`.
- Shared mapping (`game-log-event-contract.ts`): exact/alias resolutions →
  high + not_required; importer-corrected → high + reviewed; unknown tile
  labels and unknown colony names → low + needs_review. Both parsers and the
  event builder emit both fields; live-capture v2 rows (which carry no review
  lifecycle) derive needs_review deterministically from their own facts and
  never fabricate reviewed/rejected.
- Gated migration
  `supabase/migrations/20260719234500_separate_event_confidence_from_review_state.sql`
  adds the constrained column, splits any legacy overloaded rows by the
  payload-deterministic rule (production has **zero** such rows, verified
  read-only), tightens the confidence constraint, and rebuilds
  `replace_game_log_events` to validate and persist both values (a missing
  `review_state` defaults to `not_required`, so pre-split callers stay
  valid). **NOT applied to production**; the emitted payloads are valid
  against both the deployed pre-split RPC (which ignores the extra key) and
  the post-migration RPC.
- The executable harness seeds legacy overloaded rows before the split
  migration and asserts the deterministic mapping, enforcement of both value
  sets, the default, and that no `reviewed` confidence survives.

## Source and parser-run identity (Workstream 5)

The production import action persists, in the import's `confidence_summary`:
the SHA-256 and UTF-8 byte length of the **original submitted** text, a
deterministic parser-run identity `(source hash):(parser version)` mirroring
the v2 rerun rule, the parser version, and whether the stored text was
trimmed (`build-import-source-evidence.ts`). The server-derived
`input_sha256` over stored trimmed text is unchanged. The adapter surfaces
the original-source identity for new imports and leaves it null for
historical imports (never inferred). An end-to-end test
(`page.action.test.tsx`) drives the real server action from a submitted log
through the real parsers to the exact persistence payloads: source block, map
evidence with the confirmed objective configuration, verbatim player
resolutions, the split contract on every event, `incomplete_evidence` (never
absence) for a log without complete-game terminators, null (never zero)
final Venus, and the unconfirmed-objective rejection path.

## Semantic matrix (Workstream 12)

`src/lib/imports/canonical-data-semantics.ts` is the one executable matrix:
value semantics (explicit_zero / present / missing / not_applicable — null is
never coerced), mechanic-state invariants (absence states require null final
value, zero counts, no child rows; unsupported/conflicting states assert no
activity fact; blank child rows are violations in every state), attribution
semantics, and parser- versus owner-confirmed verification. Its tests encode
the four worked examples (confirmed-absent Venus, unsupported Venus,
confirmed-present with no supported detail, historical owner-confirmed
absence). The adapter evaluates it per game and surfaces violations as
issues.

## Fixtures (Workstreams 9/10)

`src/lib/imports/fixtures/FIXTURES.md` now records, besides the real
sanitized flat/grid exports and the pinned upstream fragment, six explicitly
labelled **synthetic-but-format-faithful** full exports: Venus-only,
Colonies-only, Venus+Colonies (also the rerun-determinism corpus),
off-reserve ocean (Artificial Lake 116 → same-actor ocean at a
non-reserved Tharsis space), unsupported Venus/Colony wording, and printed
objective aliases (the migration's verified alias texts plus an unknown
value that must stay unknown). Each row records provenance, expected
canonical results, and limitations; none is described as a retained real
export. Fixture tests additionally prove the off-reserve exception prevents
a false map conflict (and that detection is non-confident without it), and
that conflicting explicit-absent option evidence against positive events
yields `conflicting_evidence`, never absence.

## Executable migration + RPC tests (Workstream 8)

`supabase/tests/executable/run.sh` (disposable native PostgreSQL 18, no
Docker) replays the **full** migration history — including the new
reconstruction file `20260712114538_add_player_username_full_name.sql`, which
restores the clean-baseline replay that the F-01 completion migration had
silently broken (its `players.full_name`/`username` dependency exists in
production only via that remote-only ledger version; production skips the
file by version). New assertions: the split-contract mapping and
enforcement; `replace_game_log_events` rejects a non-member caller (42501)
before any write, duplicate event identities (23505), an unrelated player
UUID (23503), and the retired overloaded confidence (22023); and a valid
editor payload persists the split values end to end. Result:
`ALL EXECUTABLE MIGRATION TESTS PASSED`.

## Historical reports (three separate immutable artifacts)

1. Historical placement dry run —
   `docs/redesign/reports/phase-04-step-03-placement/placement-backfill-dry-run.{json,md}`
   (read-only; 42 games / 1500 placements / 1467 attributions).
2. Backfill execution —
   `.../placement-backfill-production.{json,md}` (authorized 2026-07-19;
   idempotent rerun zero diffs).
3. **Live-capture v2 reconciliation (new)** —
   `docs/redesign/reports/phase-04-step-03-compat/live-capture-v2-reconciliation.{json,md}`,
   generated from `supabase/verification/live-capture-v2-reconciliation.sql`
   read-only against production: 42/42 games legacy-only (parser
   `manual-web-import-v2`, all with input hashes), 0 v2
   sources/runs/events/placements, 42 historical absence facts with 0
   non-null final Venus, 0 duplicate hashes/identities in either system, 0
   unsupported contract versions, 0 adapter failures.

The Step 4.3B Venus/Colonies reports remain under
`docs/redesign/reports/phase-04-step-03b/`. No artifact overwrites another.

## Guest identity and privacy (F-01) — verified state

Production (read-only, 2026-07-19): `public.players` SELECT for
anon/authenticated is column-scoped to
`id/group_id/linked_user_id/display_name/created_at/normalized_display_name`
(no `full_name`/`username`); `private.player_private_identities` and
`private.player_legacy_identities` have RLS enabled with zero policies and no
client grants. The browser candidate contract is exactly
`{id,isAccessible,isLinked,publicName}` from the guarded RPC; the shell test
fixture was trimmed to stop misdocumenting it. Synthetic private names are
asserted absent from public payloads (`public-player-name-repo.test.ts`), and
the executable harness proves an ordinary authenticated member cannot read
the private tables. Registration-time claiming remains out of scope.

## Draft persistence (Workstream 11)

Draft save/resume touches only `games`, `game_promo_sets`, and
`game_revisions` — behaviorally pinned in `game-draft-repo.test.ts` — so a
resume/re-save can never rewrite the immutable source, duplicate a parser
run/events/placements, or mutate expansion state. `raw_log_text` has a single
insert-only writer. Step 4.4 consumes the canonical model through
`readCanonicalGameCapture` without reparsing raw logs.

## Validation (continuation session; exact commands)

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0, clean |
| `npx vitest run --no-file-parallelism` | exit 0, **171 files / 910 tests passed**, 0 skipped |
| `npm run lint` | exit 0, the four pre-existing baseline warnings only |
| `npm run build` | exit 0, 32/32 pages, `ƒ Middleware 106 kB` |
| `bash supabase/tests/executable/run.sh` | exit 0, `ALL EXECUTABLE MIGRATION TESTS PASSED` |
| `git diff --check` | clean |

## Production status

**Applied and verified (earlier passes):** catalog migrations
`20260718154209`/`20260718154932`; identity/privacy `20260718181600`;
Venus/Colonies `20260718200536` + 42-row absence backfill; remediation
`20260719191911`/`20260719192054`/`20260719192148`; 1,500-row placement
backfill; F-01 completion `20260719203944`/`20260719204250`; audit-view
invoker `20260719205420`. Security advisors: 0 ERROR.

**Applied by the live-site process (verified, not performed here):**
`20260719132042 data_capture_hardening_v2` plus the live-site parser deploy.

**Prepared, NOT applied (gated on separate authorization):**
`supabase/migrations/20260719234500_separate_event_confidence_from_review_state.sql`.
Also NOT in production: every continuation code change (the redesign app
itself remains undeployed). This session performed **zero** production
mutations — read-only verification only. The repo file
`20260712114538_add_player_username_full_name.sql` reconstructs an
already-applied remote-only migration and is skipped by version.

## Limitations

- Registration-time claiming remains out of scope and unimplemented.
- The final Venus scale is preserved only from trusted evidence; no accepted
  source currently prints it, so it stays null.
- Neutral labels apply to all unlinked players (privacy trade-off; roster
  dropdown cannot distinguish guests by name).
- No real Venus/Colonies-positive export exists; the labelled synthetic
  fixtures and pinned upstream fragment stand in, documented in
  `FIXTURES.md`.
- The live-capture v2 stores are empty until the first real post-cutoff
  import, so the adapter's v2 path is proven by tests, not yet by production
  data.
- The legacy origin exposes no row-wise unsupported evidence (count only) and
  no v2-style coverage classification; the adapter reports these as absent
  rather than fabricating them.
- `.codex/` is a pre-existing unrelated untracked directory, deliberately
  left untouched.

## Exact next action

Run a **fresh independent read-only Phase 4 Step 4.3 closure audit** against
this handoff's commit range. Do not self-approve Step 4.3; do not begin Step
4.4 until that audit returns PASS (or PASS WITH NON-BLOCKING FINDINGS) and
explicitly permits it. Applying migration `20260719234500` to production
requires separate explicit authorization under the per-mutation protocol. No
application push or deployment is authorized.
