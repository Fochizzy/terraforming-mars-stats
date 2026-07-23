# Phase 4, Step 4.3 — ID-READER remediation closeout for `eaab0654`

**Outcome: PASS. The load-bearing mutation probe P1 was re-proven against the
tightened proof clause; two documentation inaccuracies left open by the prior
session were corrected; one exclusion question was answered with evidence only
and left for the owner. No migration was applied, no production system was read
or written, nothing was deployed, nothing was pushed.**

This session treats every claim of the prior session (`eaab0654`) as unverified
and re-derives it. Where a statement below is **measured**, it was produced by
executing something in this session; where it is **inferred**, it is derived
from file contents and is labelled as such.

Worktree used: `C:\tmp\tm-id-reader-fix` (pre-existing worktree on
`fix/id-reader-candidate-predicate`; the primary checkout was not used for any
edit).

---

## 0. Re-derived facts [MEASURED]

| Claim | Result |
|---|---|
| Repo `Fochizzy/terraforming-mars-stats` | confirmed — `git remote -v` |
| Branch `fix/id-reader-candidate-predicate` at `eaab0654` | confirmed — `eaab06545c8d6892ec72d38fc2a11ebf1cf2cca9` |
| Base `redesign/tm-stats-dashboard-rebuild` @ `7a1f11eca` | confirmed — `git merge-base` = `7a1f11eca…`, 0 behind |
| Ahead of origin by 2 | confirmed — `origin/redesign/tm-stats-dashboard-rebuild` = `89dd7b961`; 2 commits ahead |
| Pushed nowhere | confirmed — `git ls-remote origin "*id-reader*"` returns nothing; no upstream configured |
| Working tree clean | confirmed |

---

## 1. P1 RE-PROVEN against the tightened clause 8b [MEASURED]

The prior session confirmed P1 (reintroduce the counting/selection divergence)
failed at clause 8b, then **afterwards** tightened 8b's exception handler in
response to probe P3, which had shown the handler attributing any error to
divergence. P1 was never re-run against that tightened handler. It has now been.

Pre-mutation `sha256` [MEASURED]:

```
d4ba3dbe9918e18b8e9f0eff76ad600748847a5878157b7e23b17033b8d37b32  supabase/migrations/20260722160000_add_non_import_guest_identity_creator.sql
c95224ef042fc727dddc8d12fdaa8c5f0a49eda08a64324e754a8c168a9b67df  supabase/tests/executable/non-import-guest-identity-after.sql
```

**Mutation fidelity was proven, not assumed.** The P1 mutation restores the
divergent two-query candidate search from the pre-fix blob `eaab0654^`. Stripping
comments and blank lines from the region between the advisory lock and
`if p_selected_player_id is not null then` in both the mutated file and
`eaab0654^` yields a **zero-line diff**, so the probe reintroduces the exact
pre-fix executable logic rather than an approximation of it [MEASURED].

Result:

- harness exit code **3**;
- caught by clause **8b** — `non-import-guest-identity-after.sql:340`, the
  closing line of the `do $$` block headed *"8b. THE PROOF"*;
- sqlstate **P0002**.

Verbatim failure line [MEASURED]:

```
psql:C:/tmp/tm-id-reader-fix/supabase/tests/executable/non-import-guest-identity-after.sql:340: ERROR:  ID-READER COLLISION FAIL: the call errored with sqlstate P0002 (The selected guest identity is unavailable or no longer matches.) -- this is the candidate-predicate divergence: the count and the auto-selection no longer agree.
CONTEXT:  PL/pgSQL function inline_code_block line 22 at RAISE
```

This is the same clause and the same sqlstate the prior session reported, and the
tightened handler's conditional suffix still fires — meaning 8b now reports the
sqlstate *as itself* and only attributes divergence when the sqlstate is
genuinely `P0002`. The tightening did not weaken the proof.

Reversion proven by hash, not asserted [MEASURED]: after restoring from the
pristine copy, both files hash to `d4ba3dbe…` and `c95224ef…` respectively, and
`git status --porcelain` is empty.

---

## 2. `run.sh` echo labels — CORRECTED

### Does anything assert on `run.sh` stdout? — NO [MEASURED]

Searched `package.json` scripts, `.github/workflows/**`, all `*.test.ts` /
`*.spec.ts`, `scripts/**`, `.claude/**`, and the whole tree for the literal echo
strings. Results:

- `run.sh` appears in **documentation only** (handoffs, `REDESIGN_STATE.md`,
  `MIGRATION-LEDGER-MAP.md`, `supabase/tests/executable/README.md`) — never in a
  script, test, CI job, or npm script;
- there are **no snapshot directories** anywhere outside `node_modules`;
- the only in-repo consumer of any harness output is `run.sh`'s own
  `grep -Eq '^(NOTICE|WARNING|INFO)'` over `$UNIFORMITY_LOG`, which captures the
  output of **one psql invocation** redirected to its own file. Echo labels never
  enter that file.

So the labels could be corrected without updating anything else.

### What changed

- the replay label now states that the exclusion set is *gated **plus** the two
  production-APPLIED files* `20260722012658` and `20260720120000`;
- `20260722012658` is now labelled as **applied to production as ledger
  `20260722132159`**, with its deferral reason (so the BEFORE/AFTER pair can pin
  its pre-image and then restore the shipped matcher on one database);
- `20260720120000` had **no echo of its own at all** — its status lived only in a
  comment, and that comment called it "superseded", which the ledger map
  contradicts. It now gets an explicit *NOT applied here* label naming its
  production ledger version `20260722144034`;
- the mid-file banner comment that said *"Some echo labels below still read
  'gated' for the applied pair"* was updated, because that is no longer true.

Applied status for both was re-derived from `src/lib/db/migration-ledger-map.ts`
(`APPLIED_UNDER_DIFFERENT_LEDGER_VERSION`, `…_BY_NAME`, and their absence from
`GATED_UNAPPLIED`), not from memory [MEASURED].

### Executable logic unchanged — proven [MEASURED]

| Metric | Before | After |
|---|---|---|
| non-comment, non-blank lines | 155 | 156 |
| non-comment, non-blank, **non-echo** lines | 116 | 116 |
| diff on non-comment, non-blank, non-echo lines | — | **zero lines** |

The single-line growth is exactly the one added `echo`. The `git diff` for
`run.sh` touches only comment lines and `echo` lines.

---

## 3. `GUEST-IDENTITY-OVERLOAD-DESIGN-SCOPING.md` — CORRECTED

Both required changes were made, not one:

1. **Argument order corrected in-file.** The proposed `create function` in §3a
   and all four `revoke`/`grant` argument lists carried the superseded order
   `(uuid, text, text, text, text, uuid, boolean, uuid)` with
   `p_requesting_user_id` last and defaulted. All five sites now carry the
   shipped order `(uuid, uuid, text, text, text, text, uuid, boolean)`. A short
   in-block note records what changed and why. Verified: **zero** occurrences of
   the old order remain in the file [MEASURED].
2. **Dated authority notice at the top**, naming
   `PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md` and the
   shipped migration `20260722160000` as the current authority, and stating the
   shipped signature inline.

The §3b *overload* variant still describes a trailing, defaulted
`p_requesting_user_id` — correctly, because that is a property of the **rejected**
overload option (PostgreSQL forces an appended parameter to default when the
existing signature ends in defaults). It is not the shipped signature and is not
presented as such.

The design reasoning is left as written; it is the record of how the decision was
reached.

---

## 4. Why `20260722012658` and `20260720120000` are excluded from the replay — EVIDENCE ONLY, NO CHANGE MADE

The prior session corrected the comment describing this exclusion but never
established whether the exclusion is correct. This section establishes it by
measurement. **No change was made on the strength of anything here.** The
disposition is the owner's.

### 4.1 Why each is excluded (as recorded)

| File | Production status [ledger map] | Recorded deferral reason |
|---|---|---|
| `20260722012658` `add_source_bound_import_identity_staging` | APPLIED, ledger `20260722132159`, paired by NAME; classified `expansion`; not in `GATED_UNAPPLIED` | held back so `source-bound-import-identity-linked-alias-before.sql` can install its pinned pre-image of the matcher first; the repeat-safety re-apply then restores the shipped matcher, so BEFORE and AFTER run on one database |
| `20260720120000` `coarsen_import_name_match_reasons` | APPLIED, ledger `20260722144034`, paired by NAME; classified `contraction`; not in `GATED_UNAPPLIED` | excluded from the replay and then never applied at all, because `MATCH_PREIMAGE` installs the deployed fine-grained matcher this file coarsens |

### 4.2 Would replaying them change harness outcomes? — NO, in every position tested [MEASURED]

Four full harness runs on disposable clusters, each a single-variable change,
each reverted afterwards:

| Run | Change | Exit |
|---|---|---|
| **A** | let `20260722012658` replay in the production-history loop | **0** — `ALL EXECUTABLE MIGRATION TESTS PASSED` |
| **B** | let `20260720120000` replay in the production-history loop | **0** — `ALL EXECUTABLE MIGRATION TESTS PASSED` |
| **B2** | as B, plus probes measuring the matcher body either side of `MATCH_PREIMAGE` | **0** |
| **C** | apply `20260720120000` in the **deferred half** at its ledger position (twice, for repeat-safety) | **0** |

Run **B** was expected to fail and did not. **B2** measured why. The probe reports
whether the installed `public.match_import_player_names` body still contains the
fine-grained token `display_name_exact`:

```
PROBE-BEFORE-PREIMAGE finegrained=f
PROBE-AFTER-PREIMAGE  finegrained=t
```

So when `20260720120000` is replayed in the history loop it *does* coarsen the
matcher — and then `MATCH_PREIMAGE`, which runs **after** the loop, unconditionally
`create or replace`s the fine-grained predecessor straight back over it. The
coarsening is erased before any assertion observes it.

**This contradicts the recorded reason for excluding it from the replay.** The
comment says applying it "would coarsen the very pre-image the contraction proof
measures against"; in the replay position it demonstrably cannot, because the
pre-image is installed afterwards and wins. Run **C** further shows that applying
it in the deferred half — after the pre-contraction baseline has already been
measured — also changes nothing.

### 4.3 Could the exclusion mask a regression? — YES, but the exclusion is not the active cause [MEASURED]

`supabase/tests/executable/match-oracle-post-contraction.sql` exists and asserts
exactly the behaviour `20260720120000` ships: that no row discloses a fine-grained
classification, that an oversized candidate batch is rejected, that an over-long
candidate name is rejected, that a non-member cannot read the RPC, and that the
contraction changed only the disclosure and not *which* player matches.

**That file is referenced by nothing.** It appears in no `.sh`, `.ts`, `.json`, or
`.yml` in the repository — `run.sh` references only its `pre-contraction` sibling.

The consequence, stated precisely:

- half 1 pins the matcher's **fine-grained** disclosure as "the state production
  is in today". Production does not have that state — it has the coarsened
  matcher, applied as ledger `20260722144034`. The baseline models a matcher
  production replaced;
- the coarsened behaviour is asserted **nowhere** in the harness. The only
  assertion that touches `match_import_player_names` after the deferred half is
  in `source-bound-import-identity-contraction.sql`, and it checks the **ACL
  only** (that `authenticated` cannot execute it, that `service_role` can) — not
  the disclosure, not the input bounds;
- therefore a regression that re-widened the disclosed `match_reason`/`match_score`,
  or removed the candidate-input bound, would pass this harness.

But run C shows applying the migration would **not**, on its own, close that gap:
with the migration applied and nothing asserting the coarsening, the harness still
exits 0. The masking is caused by the **unreferenced assertion file**, not by the
exclusion. Fixing the exclusion without wiring up the assertions would change
nothing.

### 4.4 Recommendation (for the owner; not acted on)

1. **Wire `match-oracle-post-contraction.sql` into `run.sh`, and apply
   `20260720120000` immediately before it in the deferred half.** This is the
   change that actually buys coverage: it is the only way the harness comes to
   assert the matcher surface production really runs. Run C already demonstrates
   the apply itself is safe and repeat-safe in that position.
2. **Leave `20260722012658` deferred.** Run A shows replaying it is harmless, but
   the deferral is doing real work — the BEFORE/AFTER matcher pair depends on
   installing a pinned pre-image and then restoring the shipped matcher on one
   database. Moving it buys nothing and would put that pairing at risk.
3. **Correct the recorded reason for the `20260720120000` replay exclusion.** As
   written it asserts a causal claim (that including it would coarsen the
   pre-image) that measurement refutes. The accurate statement is narrower: it is
   excluded from the replay for symmetry with the deferred set, and the ordering
   makes the exclusion *inconsequential* rather than *necessary*.

Reasoning: the harness's stated purpose in half 1 is to model "the state
production is in today". For this one function it does the opposite — it pins the
predecessor production has already replaced, and no later clause corrects the
record. That is a coverage gap on a **privacy** surface (the name-confirmation
oracle the coarsening exists to close), which is the category this project treats
most strictly. It should not stay uncovered because a ready-made assertion file
was left unreferenced.

---

## 5. Contradiction found and reported, NOT changed

`src/lib/db/migration-ledger-map.ts:360`, inside
`PRODUCTION_ONLY_ENTRY_PROVENANCE` for ledger entry `20260720021300`, calls
`20260720120000` a **"Gated repo file"**. The same file records it as applied
(`APPLIED_UNDER_DIFFERENT_LEDGER_VERSION['20260720120000'] = '20260722144034'`,
plus the `…_BY_NAME` entry) and does **not** list it in `GATED_UNAPPLIED`. The word
"Gated" there is stale prose from before the 2026-07-22 apply.

Not changed: no task in this assignment authorizes editing the ledger map, and
the drift gate depends on that file. Reported for the owner.

---

## 6. Validation [MEASURED]

| Check | Exit | Notes |
|---|---|---|
| `npx tsc --noEmit` | **0** | |
| `npx vitest run --no-file-parallelism` | **0** | 178 files, 982 tests passed |
| `npm run lint` | **0** | 4 warnings — the recorded baseline, all in files this change does not touch (`score-profile-panel.tsx` ×3, `analytics-repo.ts` ×1). **None new.** |
| `npm run build` (first attempt) | **1** | **Environment, not code.** This worktree has no `.env.local`, so the env schema rejected `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and static export of `/reset-pin` aborted. The change set contains only `*.md` files and `run.sh`, none of which the Next.js build reads. |
| `npm run build` (publishable env supplied) | **0** | 32 routes generated. The two values supplied are `NEXT_PUBLIC_*`, publishable by design; nothing was written into the worktree. |
| `bash supabase/tests/executable/run.sh` at final file state | **0** | `ALL EXECUTABLE MIGRATION TESTS PASSED`; the corrected labels render as intended |
| `npx vitest run migration-ledger-map.test.ts` | **0** | 11 tests passed |
| `npm run validate:claude-context -- --require-maintenance` | **0** | `success: true`, 48 planning-pack documents, phase 4, 19 active handoffs |
| `git diff --check` | **0** | one benign `core.autocrlf` LF→CRLF notice, no whitespace error |

**Anyone building in a fresh worktree of this repo hits the first row.** The
worktree has real `node_modules` but no `.env.local`, and `npm run build` fails
env validation before it compiles anything.

---

## 7. Explicitly NOT done

No push, no merge, no PR. No migration applied. No production read or write of
any kind — no Supabase MCP, `execute_sql`, `list_migrations`, `apply_migration`,
`wrangler`, `/api/deploy-info`, or production logs. No deploy, backfill, grant, or
revoke. **FINDING-4 / `DRAFT-NAME-RESIDUE` was not touched and its subsystem was
not opened.** No change of any kind was made on the strength of §4.
