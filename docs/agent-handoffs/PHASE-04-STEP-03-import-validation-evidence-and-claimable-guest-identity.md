# Phase 4 · Step 4.3 — Import Validation, Evidence, and Claimable Guest Identity (remediation handoff)

## Status

**Step 4.3 is BLOCKED pending re-audit — not closed, not self-approved.**
Three bounded passes are repository-complete:

1. the F-01–F-10 closure-audit remediation (commits `cfafd823`..`6e6e1859`,
   docs `4e20aeb8`), whose four gated production mutation groups were applied
   and verified 2026-07-19, followed by the F-01 completion and audit-view
   fixes (`e8397144`, `cf57d142`, `bbfc8613`);
2. the 2026-07-19 continuation session (live-site v2 adapter, confidence/
   review split, source identity, semantic matrix, fixtures, reconciliation
   artifact), ending at `c9473be25`;
3. **this second closure-blocker remediation (2026-07-20)**, resolving every
   Blocker and High finding of the independent audit's BLOCKED verdict, plus
   the coupled Medium findings.

Do not mark Step 4.3 complete — closure requires a **fresh independent
read-only audit** (Claude Opus 4.8 Max per the assignment). Do not begin
Step 4.4.

### Commit ranges

- F-01–F-10 pass: baseline `b0deed8c`, commits `cfafd823`..`bbfc8613`.
- Continuation session: baseline `bbfc8613`, commits `435077bf`..`c9473be25`.
- **This pass:** assignment-expected start `c9473be25`; actual base
  `8e11d3167` (the user's own expanded master-guide docs commit, landed
  during a coordination pause and verified docs-only). Remediation commits,
  in order:

| Commit | Scope |
| --- | --- |
| `ad693938d` | privacy: private name material out of client payloads; neutral guest labels on every creation path (F-01/B4/H5) + gated migration `20260720100000` |
| `47b3cfa13` | canonical board-placement persistence contract (F-02) + gated migration `20260720110000` |
| `cd687dfd4` | repeat-safe confidence/review split + end-to-end review-state persistence (F-03/H2) |
| `476a100b2` | original-byte hashing, duplicate-source review, recoverable run state, action extraction (H6/H3/§19) + reconstruction migration `20260711232834` |
| `9cd10d09c` | one shared client/server map gate over identical exception evidence (F-05/H1) |
| `83c43811f` | fixture-to-persistence bridge through the real action and real RPC (F-09/H4) |
| `ef09a54d5` | immutable report restoration, honest reconciliation metrics, deployed-schema contract fixture (F-08/§16/§17) |
| branch head carrying this handoff | documentation, ledger map + drift test, resume default, status reconciliation (B3/F-10/§18/§19) |

## Finding-by-finding resolution matrix

| Finding | Resolution | Where |
| --- | --- | --- |
| **F-01 / B4** — normalized private name in client hydration | `normalizedImportedValue` removed from the client-facing resolution schema, the repo boundary, and `confidence_summary.player_identity_resolutions`; zod strips the retired key from legacy snapshots on resume, so no caller (including an unrelated member resuming a draft) can retrieve it. Sentinel tests pin absence at every layer; the executable RPC path still performs authorized server-side matching with the private normalized value. | `guest-identity.ts`, `import-player-identity-repo.ts`, `game-import-repo.ts`, `game-draft-repo.test.ts`, `page.action.test.tsx`, harness section K |
| **F-01 / H5** — personal names as public display values | Every first-and-last-name guest creation path routes through the guarded `resolve_import_guest_identity` RPC: `/group/players` (explicit First/Last fields), Manual Entry's new-player references (deterministic first-token split of the validated full name; RPC dedupe converges repeats onto one stable player id), and imports (unchanged). Personal names live only in `private.player_private_identities`; `players.display_name` gets the neutral `Guest XXXXXXXX` label; the raw display-name writers (`createPlayerIfMissing`, `upsertPlayer`) are deleted. Gated migration `20260720100000` adds `p_record_import_alias` so non-import creations write no false `game_log` alias evidence (the missing-parameter error names the migration; no fallback fabricates evidence). | `player-repo.ts`, `log-game-player-resolution.ts`, `group/players/page.tsx`, `player-list.tsx`, migration `20260720100000`, harness K1–K9 |
| **F-02** — incomplete placement persistence | The redesign-owned model (not a second `game_capture_*` producer) now persists first-class: actions `placed/removed/replaced/converted/ownership_changed/unresolved`; ownership `explicit_owner/neutral/unowned/unknown/not_applicable/unresolved` with owner ids only under `explicit_owner`; verbatim `raw_actor_text`; constrained coarse `tile_type_class` beside the fine upstream code; grid row/position beside the flat id; the verified exception card as `source_entity`; optional `game_player_id` from exact participant evidence; and first-class `original_source_sha256`/`original_source_byte_length`/`parser_run_identity` on the import row. RPC enforces the vocabularies, the owner-consistency rule, and the map-independent board-layout format (mars 03..63, moon `mNN`); per-map geometry stays application-layer. Builder ownership is evidence-seamed (`derivePlacementOwnership`) — unknown stays unknown, never fabricated. Adapter maps the widened vocabulary as pure renames with honest nulls on pre-column rows and a three-step gated select. | migration `20260720110000`, `build-terraforming-mars-log-events.ts`, `map-live-capture.ts`, `game-capture-compat-repo.ts`, harness section L (all six actions, attribution, rejections, retry idempotency, repeated placements) |
| **F-03 / H2** — migration repeat-safety + review-state persistence | `20260719234500` (verified absent from the ledger) now uses guarded DDL throughout and converges on clean baseline, prior-schema upgrade, partial dev state, and repeat execution; the harness applies BOTH gated migrations twice in version order. `pre-split-compat.sql` pins today's production behavior (payload with `review_state` accepted by the deployed RPC; value discarded — the audited gap). Post-migration, sections J/L/M assert all four review states against persisted rows via the RPC, the fixed `not_required` default on a low-confidence row (never re-derived from confidence), and rejection of invalid values. Draft save/resume still cannot rewrite events (pinned), and the adapter reads stored review state when present. | migration `20260719234500`, `run.sh`, `pre-split-compat.sql`, assertions J/L/M |
| **F-05 / H1** — client/server ocean-exception mismatch | `evaluateImportMapGate` is the ONE gate rule used by both sides, and the client now resolves the same `resolveOffReserveOceanEvidence` output the server resolves, feeding the detector identical inputs. Gate tests drive the real fixture: verified exception passes both sides; an unexplained off-reserve ocean against board-defined objectives stays a true conflict; ambiguous/missing detection defers to the confirmed map; a confident mismatch blocks. | `import-map-gate.ts` + test, `web-import-page.tsx`, `create-import-draft.ts` |
| **F-08** — destroyed dry-run artifact | Dry run restored byte-exact from `41bc1221e`; production execution split into `venus-colonies-historical-production.{md,json}` (JSON byte-exact from `b0deed8cb`; Markdown with accurate production language — authorized write, timestamp, actual rows, predicates, zero-write second run, rollback path, unrelated-table checks — plus an explicit correction note). `report-artifacts.test.ts` pins every dry-run/production pair as separate and non-contradictory. | `docs/redesign/reports/phase-04-step-03b/`, `src/lib/reports/report-artifacts.test.ts` |
| **F-09 / H4** — fixtures never reached persistence | `build-fixture-payloads.ts` drives the REAL `createImportDraft` entry (recording deps at the DB boundary) per mechanic category — Venus, colony build+trade, grid row/position (new labelled `synthetic-grid-placement` fixture), off-reserve exception, printed alias (including an importer-corrected objective persisting `reviewed`), unsupported wording — through original-byte hashing, the real parsers/builder, and the REAL `replace_game_log_events` RPC in the disposable PostgreSQL, with SQL assertions on persisted states, counts, null final Venus, confidence/review values, source hashes, placement fields, and attribution. Conflicting evidence enters at the parser/fact layer (documented deviation: absent-option evidence is not constructible through the action's trusted inputs). `buildGameExpansionFactInput` has direct unit tests. | `supabase/tests/executable/build-fixture-payloads.ts`, `fixture-assertions.sql`, `build-game-expansion-fact-input.test.ts`, `FIXTURES.md` |
| **F-10 / B3** — documentation drift and wrong ledger versions | Ledger versions corrected everywhere (`20260719203944`/`20260719204250`/`20260719205420`, re-verified read-only) with correction notes in the immutable F-01 report; `DECISIONS.md`'s stale "prepared and gated" language reconciled; state file, phase file, master plan, data capabilities, and compatibility spec carry the required status language consistently. | `docs/REDESIGN_STATE.md`, `f01-completion-production.md`, `DECISIONS.md`, phase/master-plan/data-capabilities/compat docs |
| **H3** — duplicate detection unwired | Detection runs in the real action before any write: the deployed `find_duplicate_game_log_import` RPC (exact original AND trimmed text, covering historical trimmed storage) plus classified matches (`exact_bytes`/`trimmed_equal`/`stored_hash_only`, draft vs finalized, same-parser flag). Duplicates return an explicit reviewable `duplicate_source` state with a resume link for drafts; explicit acknowledgment proceeds and records the matched game ids in `confidence_summary.source.duplicate_source_acknowledged`; editing the log withdraws the acknowledgment. Reconstruction migration `20260711232834` restores the RPC for clean replay (grants matched to the deployed ACL). The existing production pair is documented (below) and untouched. | `game-import-repo.ts`, `create-import-draft.ts`, `web-import-page.tsx`, migration `20260711232834`, action tests |
| **H6** — trimmed before "original-byte" hash | No trim anywhere on the immutable source: the client submits the exact original, storage is byte-identical, `original_sha256` covers the true original bytes (trailing newline, leading whitespace, and CRLF-vs-LF all change it — tested), and the misleading `storedTextTrimmed` flag became `source_has_outer_whitespace` + `stored_text_matches_original: true`. Parsing uses a separately trimmed value on both sides so line numbers stay stable; the whitespace-wrapped action test proves parsing succeeds while the stored text matches the submission exactly and retries reuse the original-byte hash. | `web-import-page.tsx`, `game-import-repo.ts`, `build-import-source-evidence.ts` + tests, action tests, harness fixture check 2 (`input_sha256 = original_sha256` for bridge imports) |
| **§16** — reconciliation inaccuracies | Metrics are per-system and measured-only: duplicate source hashes measured in BOTH systems (surfacing the real legacy pair), adapter servability derived from stored facts (`v2-compatible` / `legacy-fallback` / `missing-source` — no "either system" union), and no adapter-failure figure at all (none measured). Artifacts regenerated read-only 2026-07-20. | `supabase/verification/live-capture-v2-reconciliation.sql`, `docs/redesign/reports/phase-04-step-03-compat/` |
| **§17** — mock discarded select lists | The deployed v2 schema is captured read-only as a contract fixture; tests verify every adapter select-list column exists there with the load-bearing types (and `original_source_text` is never selected), and the mocked harness now captures and asserts the actual runtime select strings. | `deployed-v2-schema.ts` + contract test, `game-capture-compat-repo.test.ts` |
| **§18** — migration-version drift | `MIGRATION-LEDGER-MAP.md` + `migration-ledger-map.ts` classify every repo file against the verified ledger (repo-native, renamed-drift with its ledger version, unconfirmed-remote, reconstructed, gated), with a drift test that fails on unclassified files, gated-but-applied contradictions, or dangling renamed mappings. `supabase/migrations/` is documented as NOT a safe direct `db push` source; clean-baseline replay is executable-proven. | `docs/redesign/reference/MIGRATION-LEDGER-MAP.md`, `src/lib/db/migration-ledger-map.{ts,test.ts}` |
| **§19 (Medium, coupled)** — transactionality + resume default | Full single-transaction persistence is deferred (it would redesign the Step 4.4 boundary — documented limitation); instead `confidence_summary.run` records persisting→complete, the run flips complete only after events AND facts land, the adapter surfaces non-complete runs as `incomplete_import_run` (missing block = completed historical import), and failure injection proves partial runs never read as successful. A snapshot missing `objectiveConfiguration` resumes as `unknown` (requires review), never as confirmed `board_defined`. | `create-import-draft.ts`, `game-import-repo.ts`, `game-capture-compat-repo.ts`, `log-game.ts`, tests |

## Validation (this pass; exact commands at the pre-handoff commit)

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0, clean |
| `npx vitest run --no-file-parallelism` | exit 0, **176 files / 951 tests passed**, 0 skipped |
| `npm run lint` | exit 0, exactly the four pre-existing baseline warnings |
| `npm run build` | exit 0, 32/32 pages, `ƒ Middleware 106 kB` |
| `bash supabase/tests/executable/run.sh` | exit 0 — `ALL_ASSERTIONS_PASSED`, `ALL_FIXTURE_ASSERTIONS_PASSED`, `ALL EXECUTABLE MIGRATION TESTS PASSED` (full history replay incl. both reconstructions; both gated migrations applied twice; pre-split compatibility pin; sections A–M; six action-driven fixtures + one parser-layer record through the real RPC) |
| `git diff --check` | clean (CRLF notices only) |

The final-HEAD re-run of the full battery is recorded in the final response
of the remediation session.

## Production status (verified read-only 2026-07-20)

- **Applied earlier (unchanged):** catalogs `20260718154209`/`20260718154932`;
  identity/privacy `20260718181600`; Venus/Colonies `20260718200536` +
  42-row absence backfill; remediation `20260719191911`/`20260719192054`/
  `20260719192148` + 1,500-row placement backfill; F-01 completion
  `20260719203944`/`20260719204250`; audit-view invoker `20260719205420`
  (ledger versions corrected per B3). Backup-table lockdown `20260718234835`
  is complete. Live-site v2 `20260719132042` is deployed (cutoff 13:20:42Z,
  parser 13:24:14Z) with **zero capture rows** as of the recorded
  verification.
- **Prepared, NOT applied:** `20260719234500` (repeat-safe; pre-apply gate
  includes the expand/contract writer check), `20260720100000`,
  `20260720110000`. Reconstructions `20260711232834`/`20260712114538` are
  skipped by version. The redesign application is **not deployed**.
- **This remediation performed zero production mutations** — read-only
  verification only.

### Deploy events witnessed (performed by other sessions, recorded for context)

On 2026-07-19 evening the F-01 column revokes broke the deployed live-site
frontend (42501s), a separate session shipped a fix built on stale
`tm-stats-app` (regressing `/log-game` via the dropped expansion tables), and
production was rolled back to worker `eb4e5821…` (the 13:24Z v2-hardening
build). No database changes were made by that session. Consequences adopted
here: the **expand/contract release gate** is now a durable decision, the
live repo owns a DEPLOY-STATE.md with the user holding the deploy lock, and
no build of this repository has ever served production.

### Production baseline re-based (user-directed)

The user directed player linking/dedup and deletion of the one draft game in
a concurrent session. Re-verified read-only: **41 games (all finalized), 41
imports, 14,402 events, 1,467 typed placements (all attributed — the deleted
draft carried the 33 unresolved), 41 expansion facts (all historical
parser-verified absence, 0 non-null final Venus, 0 Venus/Colony events, 0
non-unknown ownership), 25 players (1 unlinked)**. Documented provenance,
not drift; no blank child rows, no missing value became zero, no ownership
was fabricated, and duplicate-source detection rewrote nothing.

### Named follow-ups (all deferred until after the closure audit)

1. Resolve the duplicate-source finalized pair (`30750df1-…`/`784f9a7c-…`,
   one shared hash) — separately authorized production data-integrity work.
2. Merge the duplicate same-roster groups `987ce716`/`19426f66` (2 vs 8
   games) — cross-group surgery.
3. The pending re-import of the deleted draft must run under the correct
   active group (wrong-group guest hazard flagged by the concurrent session).
4. A privacy-safe SECURITY DEFINER alias-matching RPC for the live site
   (inputs: imported names; outputs: player id + public name only; never
   stored alias texts), replacing its temporary 42501 tolerance.
5. Applying the three gated migrations under the per-mutation protocol (in
   version order, expand/contract respected) when authorized.

## Limitations

- Registration-time claiming remains out of scope and unimplemented.
- The final Venus scale is preserved only from trusted evidence; no accepted
  source currently prints it, so it stays null.
- Neutral labels apply to all unlinked players (documented privacy
  trade-off; rosters cannot distinguish guests by name).
- Conflicting expansion evidence cannot currently be produced through the
  action's trusted inputs; its persistence coverage enters at the
  parser/fact layer (documented in the bridge).
- Full single-transaction import persistence is deferred to the Step 4.4
  boundary redesign; the recoverable run state covers the gap.
- Historical placement rows keep null in the new first-class columns (no
  invented actor text or tile class); enrichment would be a separately
  authorized backfill.
- The live-capture v2 stores remain empty until the first real post-cutoff
  import, so the adapter's v2 path is proven by tests and the deployed-schema
  contract fixture, not yet by production data.
- `.codex/` is a pre-existing unrelated untracked directory, deliberately
  left untouched.

## Exact next action

Run a **fresh independent read-only Phase 4 Step 4.3 closure audit** (Claude
Opus 4.8 Max) against this handoff's commit range. Do not self-approve Step
4.3; do not begin Step 4.4 until that audit returns PASS (or PASS WITH
NON-BLOCKING FINDINGS) and explicitly permits it. Applying migrations
`20260719234500`/`20260720100000`/`20260720110000` to production requires
separate explicit authorization under the per-mutation protocol. No
application push or deployment is authorized.
