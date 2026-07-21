# Carry ledger #106 claim-RPC privacy hardening onto the redesign lineage

Branch `fix/carry-106-to-redesign`, off redesign HEAD `4160eb565`. Scope: carry
one already-applied migration file onto this lineage and reconcile the ledger
record to current production. No production write, no deploy, no push.

## Why this existed

The #106 hardening is **applied to production** — ledger version
`20260721201734 harden_claim_rpc_privacy`. But its migration file
`20260721173000_harden_claim_rpc_privacy.sql` lived only on the live-site branch
`fix/106-claim-rpc-privacy-remediation` (fix commit `9ddd0de59`, tip
`48d612fc8`). This lineage's record of the three claim RPCs was still the
**pre-fix, vulnerable** definitions.

That is a live revert hazard, not a bookkeeping gap. A later redesign deploy or
a `db diff` taken against the stale record would have reproduced the pre-fix
bodies and silently restored the enumeration oracle in production.

## WS1 Layer A — confirmed present on redesign HEAD

Re-derived, not assumed. Redesign HEAD `4160eb565` is the merge commit
`Merge branch 'fix/step-43-ws1-layer-a-ledger-gate'`, and the gate it delivers
is intact on it:

- `MIGRATION_HAZARD_CLASS` carries explicit per-file hazard declarations
  (`CLASSIFICATION_MISSING` on an undeclared file).
- The drift test iterates the ledger snapshot as well as the repo files, so a
  cross-branch production application fails as `LEDGER_INCOMPLETE`.

Both are what the reconciliation below depends on. Local `redesign/tm-stats-dashboard-rebuild`
is 3 commits ahead of `origin/redesign/tm-stats-dashboard-rebuild` (`0c6f45dfa`);
the Layer A work is in those three and has not been pushed.

## The carried migration

`supabase/migrations/20260721173000_harden_claim_rpc_privacy.sql`, copied
verbatim via `git checkout fix/106-claim-rpc-privacy-remediation -- <path>`.
Byte-identity is proven by blob hash, not by inspection: source and staged blob
are both `461e0ecbb2fc83d3e0159f0415531a0cd9442697`. Line endings follow the
repo convention already in force (`i/lf w/crlf`). 353 lines. **The SQL was not
altered.**

It is three `create or replace function` statements and nothing else — no
object created, dropped or renamed, and no grant touched. `authenticated` keeps
EXECUTE on all three (ledger `20260720221937`), which the live claim flow
depends on.

Its companion fixture on the live-site branch
(`supabase/tests/claim-rpc-privacy/production-preimage-claim-rpcs.sql`) was
**not** copied — outside the authorized scope, and the replay here does not
need it.

## Ledger reconciliation

Production ledger re-read read-only (`list_migrations`, metadata only — no
table row data, no personal data): **110 entries, head `20260721201734
harden_claim_rpc_privacy`**. The recorded snapshot held 108 with head
`20260721081355`. The refreshed snapshot is an exact set match against that
read — no additions, no omissions.

The two new entries are classified differently, and the difference is the point:

| Ledger version | Name | Class here |
| --- | --- | --- |
| `20260721193508` | fold_player_card_outcome_context_into_definer | production-only (no file on this branch) |
| `20260721201734` | harden_claim_rpc_privacy | renamed drift — file now carried as `20260721173000` |

`20260721193508` has no file on redesign; its source is
`20260721194500_fold_player_card_outcome_context_into_definer.sql` on
`814e60210` (`fix/live-compare-data-remove-declared-style`), registered in
`PRODUCTION_ONLY_LEDGER_VERSIONS` with provenance.

### The drift mapping is keyed by NAME, not version

`apply_migration` stamped the UTC apply time `20260721201734` over the filename
version `20260721173000`, and nothing in the ledger points back at the filename.
Version cannot be the join key. Neither can adjacency in time: the *other*
2026-07-21 addition, `20260721193508`, was stamped with a ledger version that
**precedes** its own filename version `20260721194500`, so "nearest timestamp"
would mispair.

What survives the rename is the migration **name**. New export
`APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME` records
`harden_claim_rpc_privacy → { fileVersion 20260721173000, ledgerVersion 20260721201734 }`,
and the new test asserts that against the **real filename on disk** — so
renaming or deleting the file fails the gate instead of orphaning the mapping.
The existing version-keyed `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION` gains the
same pair so the established gate machinery classifies it, and the test asserts
the two agree.

### Hazard class: contraction

Declared `contraction`, and pinned in the known-contractions test so it cannot
be quietly downgraded. It creates, drops and grants nothing, so the raw SQL
reads like a no-op on the contract surface; it is not. It narrows what the three
RPCs disclose and accept:

- prefix/substring name matching → exact whole-name matching
- a 3-character normalized-input floor (a 1–2 character profile value now
  matches nothing rather than everyone named that)
- a 10-row cap, so the RPC cannot be read as a directory
- the private-first-name label fallback → a neutral `'Unclaimed player'`
- `group_name` returned null in the candidate list
- `claim_player_profile` revalidates from the row it has locked instead of
  trusting the candidate list

None of that restores an equal-or-broader replacement, so a reader written
against the pre-fix bodies breaks against the deployed result. This is the case
where ledger classification and hazard class pull opposite ways — already
applied, still a contraction — which is exactly why the two dimensions are kept
orthogonal.

## Exact edits

`src/lib/db/migration-ledger-map.ts`

- `PRODUCTION_LEDGER_ATTESTATION`: count 108 → **110**, head
  `20260721081355` → **`20260721201734`**, headName → `harden_claim_rpc_privacy`,
  previous 105/`20260720021300` → **108/`20260721081355`**, with both new
  entries explained.
- `PRODUCTION_LEDGER_VERSIONS`: appended `20260721193508`, `20260721201734`
  (110 total, ascending, no duplicates).
- `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION`: added
  `'20260721173000': '20260721201734'` (10 entries).
- **New export** `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME`.
- `PRODUCTION_ONLY_LEDGER_VERSIONS`: added `20260721193508` (69 entries).
- `PRODUCTION_ONLY_ENTRY_PROVENANCE`: added `20260721193508`; removed the now
  false "Current ledger head" note from `20260721081355`.
- `MIGRATION_HAZARD_CLASS`: added `'20260721173000': 'contraction'` (50 files —
  14 contraction, 28 expansion, 8 neutral).

`src/lib/db/migration-ledger-map.test.ts`

- New `repoMigrationFiles()` helper.
- New test: name-keyed renamed applications reconcile against the real filename
  and agree with the version-keyed map.
- Pinned `20260721173000` as a contraction in the known-contractions test.

`docs/redesign/reference/MIGRATION-LEDGER-MAP.md` — snapshot 110/head, the new
renamed-drift row and its name-keying rationale, the fourth cross-branch entry,
production-only count 68 → 69, hazard counts 13/28/8 (49) → 14/28/8 (50), and
the new contraction row.

Nothing else changed. No grant, no other migration, no function body beyond the
copied file.

## Validation (at the final commit)

- `npx vitest run --no-file-parallelism` — **177 files / 971 tests pass**
  (baseline 970; +1 is the new name-keyed reconciliation test). The ledger gate
  passes all 11 of its assertions: bidirectional completeness holds,
  `20260721173000` classified `contraction`, no `LEDGER_INCOMPLETE`, no
  `CLASSIFICATION_MISSING`.
- `npx tsc --noEmit` — exit 0.
- `npm run lint` — the four baseline warnings (3× `no-img-element` in
  `score-profile-panel.tsx`, 1 unused `normalizeProfileHeadToHeadRow` in
  `analytics-repo.ts`). None new.
- `npm run build` — exit 0, 32 routes generated. (The first attempt failed on
  missing `NEXT_PUBLIC_SUPABASE_*` env: a fresh worktree has no gitignored
  `.env.local`. Copied from the main worktree — an untracked local env file, not
  a code change — and the build is green.)
- `bash supabase/tests/executable/run.sh` — `ALL EXECUTABLE MIGRATION TESTS
  PASSED`. The new file applies last in the production-history half (it is not
  in the gated exclusion list and sorts last), before the gated half — matching
  its real position as ledger head. Its `create or replace` return shapes match
  the repo predecessors in `20260706190000`, so it replays as a genuine replace
  rather than failing on a return-type change.
- `git diff --check` — clean.

## Boundaries held

No production write of any kind: no `apply_migration`, no writing
`execute_sql`, no GRANT/REVOKE/DDL. The single production access was one
read-only `list_migrations` returning ledger metadata; no table row data and no
personal data were read. Nothing pushed, deployed, or applied. No file under
`supabase/migrations/` was edited — the one change there is the added #106 file.
`.codex/` untouched.

## Still open

- **The gated `20260718050924` reconciliation remains a separate parked
  follow-up.** It was not touched here.
- **WS2, WS1 Layer B/C, converge, and the closure audit have not begun.**
- Residual from #106 itself (recorded on the live-site branch, unchanged here):
  `claim_player_profiles_by_name` still links matching profiles without a
  per-profile confirmation. The migration bounds that path rather than removing
  it; removing it needs a client change and separate authorization.
