# Phase 4, Step 4.3 — ID-READER remediation integration onto the redesign branch

**Outcome: PASS. The `ID-READER-CLIENT` audit remediation and its closeout were
merged `--no-ff` into `redesign/tm-stats-dashboard-rebuild`, and two repeatedly
rediscovered facts were recorded durably. The owner separately authorized one
fast-forward push of this branch and the planning-pack publication that follows
this commit; both are performed after it, and their results are recorded in the
task report and the updater log rather than here, because recording a post-commit
receipt in a canonical document would create a new unsynchronized source change.
No migration was applied, nothing was deployed, and no Cloudflare or Supabase
system was accessed.**

Date: 2026-07-23. Worktree: the redesign **primary** checkout
`C:\Users\izzyh\Documents\Terraforming Mars Redesign` — deliberately, because
Git refuses a second checkout of a branch already checked out elsewhere and
because this is the tree the planning-pack updater reads.

---

## 0. Why this integration existed

The independent audit returned **FAIL** on the `ID-READER-CLIENT` expand work.
The remediation answering it, and the closeout that re-proved the remediation,
were both complete but sat on the unmerged branch
`fix/id-reader-candidate-predicate`. Every session reading canonical state was
therefore still told the expand work was unremediated. This integration makes the
corrected state visible and durable, and is the precondition for the targeted
re-audit that must follow.

---

## 1. Re-derived facts [GIT]

Nothing below was inherited from the assignment; every value was re-derived in
this session.

| Claim | Result |
|---|---|
| Repository | `https://github.com/Fochizzy/terraforming-mars-stats.git` |
| Branch / HEAD before the merge | `redesign/tm-stats-dashboard-rebuild` @ `7a1f11eca` |
| Tracked or untracked changes before the merge | none — `git status --porcelain` empty |
| Source branch tip | `fix/id-reader-candidate-predicate` @ `949d16009` |
| Already merged? | **No** — absent from `git branch --merged <target>` |
| Merge-base | `7a1f11eca` — identical to the target HEAD, so the target had not moved |
| Commits brought | 2 — `eaab06545`, `949d16009` (`--left-right --count` = `0 2`) |
| `origin/redesign/tm-stats-dashboard-rebuild` before the push | `89dd7b961` |
| `fix/id-reader-candidate-predicate` on origin | absent |
| `fix/planning-pack-deploy-state-source` on origin | absent |
| Remote tag count before the push | 2 |

### 1.1 Source diff path containment [GIT]

The nine changed paths were checked against the four allowed roots
(`supabase/migrations/**`, `supabase/tests/executable/**`, `src/lib/db/**`,
`docs/**`). All nine are inside them; none is outside:

```
M docs/CURRENT_STATUS.md
M docs/REDESIGN_STATE.md
M docs/agent-handoffs/PHASE-04-STEP-03-GUEST-IDENTITY-OVERLOAD-DESIGN-SCOPING.md
A docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md
A docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md
M supabase/migrations/20260722160000_add_non_import_guest_identity_creator.sql
M supabase/tests/executable/assertions.sql
M supabase/tests/executable/non-import-guest-identity-after.sql
M supabase/tests/executable/run.sh
```

`src/**` is untouched by the merge. 1240 insertions, 71 deletions.

---

## 2. The merge [GIT]

`git merge --no-ff --no-edit fix/id-reader-candidate-predicate` — exit **0**,
strategy `ort`, **no conflict of any kind**. The narrow additive
`## Latest handoff` conflict that was anticipated did not arise, because the
merge-base equalled the target HEAD, so no resolution was performed and nothing
was dropped, reordered, or reworded.

| | |
|---|---|
| Pre-merge HEAD | `7a1f11eca429e7b29494483dd9c2318d4586496a` |
| Merge commit | `07a81c19eb99498e3d80be425f1b53e837ab9a1c` |
| Parents | `7a1f11eca` (target), `949d16009` (source) — both intact |

Working tree clean immediately after the merge.

---

## 3. Record 1 — the harness coverage gap [PRIOR]

Recorded in `docs/REDESIGN_STATE.md` under
"Harness coverage gap on the coarsened matcher", and in summary in
`docs/CURRENT_STATUS.md`. **Not fixed.**

The evidence class is **[PRIOR]** throughout: the measurements were produced in
the closeout session (`PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md` §4)
over four full harness runs on disposable clusters. This session did **not**
re-run them, and the documents say so.

**What was refuted.** The recorded reason for excluding `20260720120000`
(`coarsen_import_name_match_reasons`) from the production-history replay — that
applying it "would coarsen the very pre-image the contraction proof measures
against" — is false. The replay *does* coarsen the matcher, and then
`MATCH_PREIMAGE`, which runs after the loop, unconditionally `create or replace`s
the fine-grained predecessor back over it (`finegrained=f` before the pre-image,
`finegrained=t` after). Four single-variable runs each exited 0. The exclusion is
inconsequential, not necessary.

**What the real consequence is.** `supabase/tests/executable/match-oracle-post-contraction.sql`
is referenced by nothing — no `.sh`, `.ts`, `.json`, or `.yml` — so the coarsened
privacy surface is asserted nowhere. The only post-deferred-half assertion on
`match_import_player_names` checks the **ACL only**. A regression that re-widened
the disclosed `match_reason` / `match_score`, or removed the candidate-input
bound, **would pass the harness clean**. That is the name-confirmation oracle the
coarsening exists to close.

**Why it matters to closure.** `STEP-4.3-AUDIT` must account for it: a green
`run.sh` is not evidence that the matcher surface production actually runs is
protected against regression. Both state documents now say so, and the
`STEP-4.3-AUDIT` blocker row carries it.

**Explicitly not done.** `match-oracle-post-contraction.sql` was **not** wired
into `run.sh`; the set of migrations the harness replays was **not** changed; the
closeout's experiments were **not** re-run. That disposition — including whether
`20260720120000` is applied in the deferred half immediately before those
assertions — is the owner's and needs its own authorization.

---

## 4. Record 2 — the ledger-map label: **BLOCKED, structural, unchanged** [REPO]

`src/lib/db/migration-ledger-map.ts:360` describes `20260720120000` as a
`"Gated repo file"` while the same file records it as applied
(`APPLIED_UNDER_DIFFERENT_LEDGER_VERSION['20260720120000'] = '20260722144034'`
at line 160, plus the `…_BY_NAME` entry) and omits it from `GATED_UNAPPLIED`. The
prose is stale relative to the file's own data.

**It is not a comment.** It is the `note` property of a structured record:

- line 331 exports `PRODUCTION_ONLY_ENTRY_PROVENANCE` as
  `Readonly<Record<string, ProductionOnlyProvenance>>`;
- line 319 declares `readonly note: string` as a required field of that
  interface;
- line 360 is that field's value for ledger entry `20260720021300`;
- `migration-ledger-map.test.ts` imports the map (line 12) and iterates its keys
  (line 143), asserting every provenance key is a registered production-only
  ledger entry.

The drift test therefore reads the containing structure. The string value itself
is not asserted, but the text is exported module data, not comment text, so
editing it is a change to `src/**` data rather than the comment-only correction
that was conditionally permitted.

**Disposition: BLOCKED. No change was made.** Correcting it needs its own
authorization. The determination is recorded in `docs/REDESIGN_STATE.md` so the
next session does not have to rediscover it a third time.

---

## 5. State documents updated

- `docs/CURRENT_STATUS.md` — dated 2026-07-23; records that the audit FAIL is
  answered and `FINDING-1` / `FINDING-2` are remediated **and merged**; adds the
  harness coverage gap as a standing known gap; adds the targeted re-audit as the
  evidenced next step, renumbering the release sequence to 7 items; updates the
  `ID-READER-CLIENT` and `STEP-4.3-AUDIT` blocker rows; adds the three
  `ID-READER` handoffs to the evidence list.
- `docs/REDESIGN_STATE.md` — the current-substep block now says the repair is
  MERGED and names the re-audit as the next step; a new dated section
  "ID-READER-CLIENT remediation integrated onto the redesign branch (2026-07-23)"
  records the integration; the harness gap is upgraded from a terse paragraph to
  the full measured `[PRIOR]` record; the older one-line "deliberately not fixed"
  note now points at it; this handoff heads the active `Latest handoff` group.

**Not changed:** Step 4.3 is **not** marked complete. No blocker other than
`ID-READER-CLIENT` changed disposition, and that one changed only from
branch-local to merged. `docs/redesign/DECISIONS.md`, `supabase/**`,
`scripts/**`, and all of `src/**` were left untouched by this commit.
`FINDING-4` / `DRAFT-NAME-RESIDUE` was not opened.

---

## 6. Validation

Recorded in full, with real exit codes, in the task report. Every check ran in
the redesign primary after the merge. The load-bearing one is
`bash supabase/tests/executable/run.sh`, which proves the merge preserved the
remediation's proofs including the collision proof at clause 8b.

---

## 7. Explicitly NOT done

No migration applied. No deploy. No Supabase MCP call of any kind — no
`execute_sql`, `list_migrations`, or `apply_migration`. No `wrangler`, no
`/api/deploy-info`, no production logs, no direct database connection. No
backfill, grant, or revoke. No force push, no tags, no pull request, no rebase,
no history rewrite. No branch other than `redesign/tm-stats-dashboard-rebuild`
was pushed. `fix/planning-pack-deploy-state-source` was not touched and remains
quarantined do-not-merge. The planning-pack updater was not run manually; the
committed post-commit hook ran it.

## 8. Requires new owner authorization

The targeted re-audit of the remediated work; the harness coverage decision
(wiring `match-oracle-post-contraction.sql` into `run.sh`, and whether
`20260720120000` is applied before it); correcting the structural ledger-map
`note`; applying `20260722160000`; deploying and verifying the moved reader; the
CONTRACT drop; the production ACL read for the `service_role` EXECUTE
discrepancy; `FINDING-4` / `DRAFT-NAME-RESIDUE`; contraction `20260722012707`;
the tile-attribution backfill; guest re-neutralization; the closure audit; the
owner smoke tests; and Step 4.4.
