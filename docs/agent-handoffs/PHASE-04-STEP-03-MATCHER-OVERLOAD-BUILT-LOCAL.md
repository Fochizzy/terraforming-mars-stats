# Phase 4, Step 4.3 — Matcher service-role overload: BUILT LOCALLY, gated

Date: 2026-07-23

**Outcome: the EXPAND half of the 2026-07-22 matcher amendment is built and
proven locally. NOTHING was applied, deployed, or pushed, and no production
system was read or written.**

Authorization held: read-only git/filesystem inspection across both lineages;
disposable PostgreSQL clusters; one new gated migration; the call-site change;
tests; the state documents; this handoff; one local commit per lineage.

**NOT held, and none of it occurred:** any Supabase MCP call, `execute_sql`
(including read-only `SELECT`), `list_migrations`, `apply_migration`, wrangler,
`/api/deploy-info`, production logs, direct database connections, any
deploy/migration/backfill/grant/revoke, any push or merge.

Evidence classes are tagged inline: `[GIT] [REPO] [PROJECT-DOC] [PRIOR]
[INFERENCE] [UNVERIFIED]`. **No `[LIVE]` or `[PROVIDER]` claim appears.** Every
statement about the currently deployed function, ACL, or Worker configuration is
`[PRIOR]` or `[UNVERIFIED]`.

---

## What the owner decided (PD-1, 2026-07-23)

Build the three-argument `match_import_player_names` overload that
`docs/redesign/DECISIONS.md` adopted on 2026-07-22, rather than accept a full
redesign deploy as the price of unblocking contraction `20260722012707`. The
owner accepted explicitly that this is **a lesser destination reached sooner**:
the manual-entry replacement remains owed, and the contraction **re-gates rather
than closes**.

---

## Lineage — the artefact SPANS BOTH, and that is structural

The repository cannot hold this work on one branch [GIT]:

| Needed by the task | Exists on `redesign/tm-stats-dashboard-rebuild` | Exists on `fix/live-compare-data-remove-declared-style` |
|---|---|---|
| `supabase/migrations/` matcher history (`20260720120000`, `20260722012707`) | yes | **no** — the live lineage has no migration mentioning the matcher at all |
| `src/lib/db/migration-ledger-map.ts` (Step 1c registration) | yes | **no** |
| `supabase/tests/executable/` harness | yes | **no** |
| `docs/REDESIGN_STATE.md`, `docs/CURRENT_STATUS.md`, `docs/agent-handoffs/` | yes | **no** |
| `scripts/validate-claude-project-context.mjs` (`validate:claude-context`) | yes | **no** |
| `src/lib/db/import-player-resolution-repo.ts` — the matcher wrapper | **no** | yes |
| `src/lib/observability/import-matcher-audit.ts` | **no** | yes |

The two branches share merge-base `2e3f5f7cf` and have diverged 267/399 commits
[GIT]. The redesign lineage contains **zero** matcher call sites; the live
lineage contains **zero** matcher migrations and none of the governance
machinery. Forcing one lineage would mean either fabricating the whole
`import-player-resolution-repo` subsystem on the redesign branch — which the
redesign deliberately replaced with `import-player-identity-repo.ts` — or
dropping the ledger registration, the executable proof, the state documents and
the validator gate on the live branch. Neither is acceptable, so the honest
answer is a split:

| Half | Base | Task branch | Commit |
|---|---|---|---|
| Migration, ledger, proof, docs | `redesign/tm-stats-dashboard-rebuild` @ `92d4f6917` | `fix/matcher-service-role-overload-expand` | *(this commit)* |
| Reader + tests | `fix/live-compare-data-remove-declared-style` @ `0d866559f` | `fix/matcher-service-role-overload-callsite` | `5894c874aa1cd87d8ca06b1dc6a2b968c46ee03d` |

**DEVIATION, STATED PLAINLY.** The assignment specified ONE commit on ONE task
branch. This is **two commits on two task branches, one per lineage**, because a
single branch cannot carry both halves. Nothing was pushed or merged, and each
branch is exactly one commit ahead of its own base. This is the only deviation
from the assignment's scope.

Both base worktrees were verified clean before branching: the redesign primary
checkout reported no changes, and `git -C "C:/tmp/tm-live-compare-data" status
--porcelain --untracked-files=no` (a read-only inspection; that worktree was not
otherwise touched) reported none either [GIT]. Both tips were re-derived at
commit time and were unchanged.

---

## Step 0 — constraints RE-DERIVED, not inherited

### 0a. The two-argument signature carries no defaults

`supabase/migrations/20260720120000_coarsen_import_name_match_reasons.sql:31-34`
[REPO]:

```sql
create or replace function public.match_import_player_names(
  p_group_id uuid,
  p_imported_names text[]
)
```

`pronargdefaults` is therefore 0. This is the property that makes an added
parameter legal without a default, and it is the whole reason the
guest-identity `42725` lesson does not transfer.

### 0b. Constraint 1 verified on a disposable cluster, BOTH directions

PostgreSQL 18.4, `initdb` cluster on port 55991, destroyed afterwards. Nothing
outside it was touched.

| Case | Call | Result |
|---|---|---|
| No default, positional 2-arg | `t.m2(uuid, text[])` | resolved to the 2-arg function |
| No default, **named** 2-arg (the PostgREST shape) | `t.m2(p_group_id => …, p_imported_names => …)` | resolved to the 2-arg function |
| No default, named 3-arg | `+ p_requesting_user_id => …` | resolved to the 3-arg function |
| `default null`, positional 2-arg | — | `ERROR: function t.mb(uuid, text[]) is not unique` (**42725**) |
| `default null`, named 2-arg | — | `ERROR: function t.mb(p_group_id => uuid, p_imported_names => text[]) is not unique` (**42725**) |

**A finding the scoping did not record.** Putting `p_requesting_user_id` in
**position two** — matching the four applied gateways of `20260722012658` — makes
the defaulted form fail at CREATE time:

```
create or replace function t.mbb(p_group_id uuid, p_requesting_user_id uuid default null, p_imported_names text[])
ERROR:  input parameters after one with a default value must also have defaults   (42P13)
```

Position two also resolves unambiguously against `(uuid, text[])`, verified in
the same run. So position two is **load-bearing, not cosmetic**: it converts the
no-default rule from something the author must remember into something
PostgreSQL refuses. It does not make every mistake impossible — defaulting
*both* trailing parameters would still create — but it removes the single most
likely one, which is appending `default null` "to keep old calls working". The
migration says so in its header, so a future editor who moves the parameter
knows what protection they are removing.

### 0c. BOTH identity predicates located — there are exactly two

From the two-argument body [REPO, `20260720120000`]:

**Predicate 1 — the GATE**, first statement of the body (file line 61):

```sql
  if not public.is_group_member(p_group_id) then
    raise exception 'The selected group is not available for import.'
      using errcode = '42501';
  end if;
```

`public.is_group_member` is itself `SECURITY DEFINER` and reads `auth.uid()`
internally [REPO, `20260703121500_create_core_rls.sql:9-21`], so the dependency
is **invisible at the call site**, which reads like a pure function of
`p_group_id`.

**Predicate 2 — the CANDIDATE POOL**, in the `candidates` CTE (file line 108):

```sql
    where p.group_id in (
      select gm.group_id
      from public.group_members gm
      where gm.user_id = (select auth.uid())
    )
```

**Exactly two, confirmed by search rather than by reading.** Grepping the whole
function body for `auth.uid|is_group_member|current_user|current_setting|
session_user` returns exactly those two lines [REPO]. The other candidates were
checked and are not identity predicates: `private.resolve_public_player_name` is
a pure function of `p_player_id` [REPO, `20260718212339:24-40`],
`public.normalize_claim_player_name` is a text normalizer [REPO,
`20260706190000:1-7`], and `a.group_id = p_group_id` in the alias branch is a
scope derived from an argument, not from the caller.

### 0d. The wrapper already resolves a server-verified id

`src/lib/db/import-player-resolution-repo.ts:183-184` on the live lineage
[REPO]: `matchImportPlayerNames` builds its own `createSupabaseServerClient()`
and calls `resolveAuditUserId(supabase)`, which calls `supabase.auth.getUser()`
— the same token-validating call `getCurrentGroupContext` uses. The id was used
for the audit line only. No caller passes a client or an id.

### 0e. What the contraction actually revokes

`supabase/migrations/20260722012707_retire_free_form_import_name_matcher.sql`
in full [REPO] is three `revoke execute` statements against
`public.match_import_player_names(uuid, text[])` — from `public`, from `anon`,
from `authenticated` — plus a `comment on function`. **It does not revoke from
`service_role` and it does not drop anything.** Production `proacl` is
`{postgres,authenticated,service_role}` [PRIOR], so `service_role` keeps EXECUTE
and the two-argument function survives the contraction as a live callable
object. **It re-gates; it does not close.**

---

## Step 1 — the migration

`supabase/migrations/20260723130000_add_service_role_import_name_matcher_overload.sql`,
GATED / UNAPPLIED.

```sql
create or replace function public.match_import_player_names(
  p_group_id uuid,
  p_requesting_user_id uuid,
  p_imported_names text[]
)
returns table(imported_name text, player_id uuid, public_name text,
              is_linked boolean, match_reason text, match_score integer)
language plpgsql stable security definer set search_path to ''
```

Where each constraint landed:

| # | Constraint | Where |
|---|---|---|
| 1 | new parameter carries **no default** | signature, position two; header §1 records the 42725/42P13 measurements |
| 2 | **both** identity predicates converted | the gate is an explicit `exists` against `public.group_members` on `p_requesting_user_id` (replacing `is_group_member`); the pool's `where gm.user_id =` now reads `p_requesting_user_id`. Each carries an `IDENTITY PREDICATE n of 2` marker |
| 3 | null requesting user rejected **in SQL** | first statement of the body, `raise … errcode = '22023'`, before the gate |
| 4 | fail-closed id resolver | caller side — see Step 2 |
| 5 | `service_role` ONLY | `revoke … from public/anon/authenticated` then `grant … to service_role`, all naming `(uuid, uuid, text[])` |
| 6 | two-argument function untouched | **no statement in the file names `(uuid, text[])`** — verified by inspection and asserted executably |

**Hazard class: `expansion`, derived from the SQL.** Every statement names one
signature, and that signature does not exist until the `create or replace` at
the top of the same file creates it. There is no DROP, no ALTER, no tightened
constraint, and no statement mentioning `(uuid, text[])`, so nothing a deployed
reader or writer holds today is removed or narrowed; the three revokes are on
the object the file itself creates, including the load-bearing `from public`
revoke that removes `CREATE FUNCTION`'s implicit PUBLIC grant. The one place a
reader might expect a contraction — the requesting-user argument carrying no
default — is not one, because no existing call names this signature. Registered
in `GATED_UNAPPLIED` and `MIGRATION_HAZARD_CLASS` in
`src/lib/db/migration-ledger-map.ts`; the drift test enforces both directions and
fails `CLASSIFICATION_MISSING` on an undeclared file.

**Do not read `expansion` as "low risk".** Hazard class describes what applying
the file does to a deployed reader, not how much trust it moves. This file
downgrades the matcher's authorization from `auth.uid()` to an
application-supplied id, which the amendment records as an accepted security
cost.

**Body duplicated, deliberately, and the duplication is guarded.** Everything
except the two identity predicates and the null guard is transcribed from the
coarsened two-argument body (`20260720120000`, applied as ledger `20260722144034`
[PROJECT-DOC]). Factoring the shared body into a private helper would require
`create or replace`-ing the LIVE two-argument function during the expand step,
which the amendment's ordering forbids. The drift that duplication risks is
guarded executably, not by convention: the equivalence assertion below compares
the two functions' selections directly. Fold into a shared helper when the
two-argument function is retired.

**No existing migration was modified.**

---

## Step 2 — the call site

`src/lib/db/import-player-resolution-repo.ts` on the live lineage, commit
`5894c874a`.

- The session client is kept **only** to establish identity; the RPC moves to
  `createSupabaseAdminClient()`.
- `p_requesting_user_id: userId` is added to the RPC arguments.
- `resolveAuditUserId` is **replaced** by `requireRequestingUserId`, which
  throws on a `getUser()` error and on a missing/blank id. The old resolver had
  no other caller, so leaving it would have been dead code a future author could
  reuse for exactly the wrong purpose.
- **The now-false comment is corrected.** "The RPC itself remains gated by RLS
  on the caller's session" was true while the id was a label and is false after
  the move, because there is no session on the RPC. The replacement states what
  is true and why the resolver must fail closed.
- The audit contract in `src/lib/observability/import-matcher-audit.ts` is
  corrected the same way: an unresolvable session is now recorded as `failed`,
  so a `matched` record carrying a null `userId` is impossible by construction.
  A missing `SUPABASE_SERVICE_ROLE_KEY` is likewise recorded rather than lost.
- **No caller signature changed and nothing is threaded.** The id is resolved
  inside the wrapper; all three call sites still pass `(groupId, names[],
  sourceTag)`. `DECISIONS.md:1396-1405` records this divergence from the four
  sibling gateways as deliberate and forbids normalising it back to threading
  [PROJECT-DOC]; the same reasoning applies here and a test pins the wrapper's
  arity.

### Ordering — what happens if the code deploys before the migration applies

The new code calls a function that does not exist, so PostgREST answers
`PGRST202` (`42883` underneath) on **every** import analyze and **both** manual
player-resolution paths. `matchImportPlayerNames` throws; the audit line records
`outcome: "failed"` with that code.

Assessment: **loud, confined, and reversible — but a real outage, and only
sequencing prevents it.** It is loud (an exception, not an empty result),
confined (the three matcher paths; nothing else in the app calls this RPC
[GIT]), and reversible by redeploying the previous Worker version. There is no
in-code mitigation worth having: a fallback to the two-argument overload would
keep the `authenticated` path alive, mask a failed apply, and risk quietly
becoming the normal path — the opposite of what the contraction is for.

**Therefore sequencing alone must prevent it, and it can**: apply
`20260723130000` first. That apply is safe on its own — it is an `expansion` and
changes nothing the currently deployed code calls. This is not a hard stop; it is
the mandatory order the amendment already specifies.

---

## Step 3 — proof, every assertion mutation-proven

The assertions live in `supabase/tests/executable/matcher-service-role-overload.sql`
(with a BEFORE half that pins the two-argument identity and installs fixtures,
and a post-contraction half). They run inside the real harness — full production
migration-history replay, then the deferred set — with the expand applied
**twice** for repeat-safety, between the source-bound AFTER proof and the
contraction. Baseline: `run.sh` exit **0**, all assertions PASS, and the
pre-existing suite still reports `ALL_ASSERTIONS_PASSED`.

Method: break the property, run the real harness, confirm the **specific**
assertion fails, `git checkout --` the file, then prove the tree is byte-identical
by comparing `git write-tree` against the pre-mutation tree. Baseline tree
`882ca396308f104c5c591dbb6531a55f43d49bb0` (SQL half),
`56f60cf8b911b2b5d28b07ed7ab4338b5836d9c7` (TypeScript half).

### SQL mutations — 8, all caught, all reverted byte-identically

| # | Mutation | Observed failure | Reverted |
|---|---|---|---|
| M1 | null guard neutralised (`is null` → `is null and false`) | `FAIL 3b: expected SQLSTATE 22023 for a null requesting user, got 42501` | identical |
| M2 | candidate POOL reverted to `auth.uid()`, gate converted — **the silent variant** | `FAIL 3a: a truthful member id matched ZERO rows — this is the silent failure mode` | identical |
| M3 | GATE reverted to `public.is_group_member(p_group_id)`, pool converted | `ERROR: The selected group is not available for import.` (42501, uncaught → harness exit 3) | identical |
| M4 | `p_requesting_user_id uuid default null` | `ERROR: input parameters after one with a default value must also have defaults` (42P13, at apply) | identical |
| M5 | `revoke … from public` removed | `FAIL grants: authenticated can execute the new overload` | identical |
| M6 | expand re-comments the TWO-argument function | `FAIL 3f: the two-argument comment changed` | identical |
| M7 | new overload granted to `authenticated` | `FAIL grants: authenticated can execute the new overload` | identical |
| M8 | authorization gate short-circuited | `FAIL 3c: expected 42501 for a non-member id, got 00000 (rows 0)` | identical |

Notes worth keeping:

- **M1 is more interesting than it looks.** With the explicit guard removed the
  call did not silently return zero rows — it raised `42501`, because
  `gm.user_id = null` is NULL and the membership test fails closed on its own.
  That is *why* the assertion checks the SQLSTATE and not merely "an error
  happened": without the explicit guard a caller defect is reported as "you are
  not a member of that group", and the pool's own null behaviour (zero rows, no
  error) is one careless edit away. The migration header says exactly this.
- **M5's message names `authenticated`** because a surviving PUBLIC grant
  satisfies `has_function_privilege('authenticated', …)`. The check fires
  correctly; only the wording is indirect. A dedicated regex on the aclitem list
  catches the empty-grantee entry as well.
- **M2 is the headline.** It is the one failure mode that produces no error, and
  the assertion that catches it asserts a **non-zero, exactly enumerated** match
  set rather than the absence of an exception.

### Assertion-by-assertion

| Ref | Assertion | Made load-bearing by |
|---|---|---|
| 3a | a member with a truthful id matches and returns **non-zero** rows — 4 rows, each pinned to its expected player and coarse class, with `auth.uid()` asserted NULL first | M2, M3 |
| 3b | a null requesting-user id **raises 22023**, not zero rows | M1 |
| 3c | a non-member id raises `42501` | M8 |
| 3d | a member of a DIFFERENT group raises `42501` here **and still matches in their own group** — the second half is what stops a blanket-rejection implementation passing | M8 |
| 3e | the two identity predicates agree — see below | M2, M3 |
| 3f | the two-argument function is byte-identical: same oid, `md5(prosrc)`, `proacl`, comment, `prosecdef`, volatility, `proconfig`, return type, and still granted to `authenticated` | M6 |
| 3g | existing two-argument calls still resolve unambiguously, **positionally and by name** | M4 |
| 3h | sentinels only — see below | n/a (construction) |

**3e in detail.** Three probes, all required:

1. the two-argument function **as installed in the harness** called as
   `authenticated` with a real session — the reference selection;
2. the overload called with `auth.uid()` NULL and the same user passed
   explicitly — must select the **same non-empty**
   `(imported_name, player_id, is_linked)` set. Emptiness is failed *first*,
   because two empty sets are equal and the silent variant produces exactly
   that;
3. **poisoned `auth.uid()`** — the overload called while `auth.uid()` resolves
   to an unrelated user who belongs to no group, with the truthful id still
   passed explicitly. A pool reading `auth.uid()` collapses to empty; a gate
   reading it raises `42501`; the correct implementation is unaffected because
   neither predicate reads it at all.

This also serves as the **drift guard for the duplicated body**: the two
functions must keep selecting the same players.

**CORRECTION 2026-07-23 (independent-audit FINDING-1, MEDIUM).** Probe 1 above
was originally written as "the **deployed** two-argument function". That was
wrong, and the original wording is retained in this sentence as history. The
harness **deliberately never applies `20260720120000`** — `run.sh` excludes it
from the replay loop and then states explicitly that it is not applied
afterwards — so the two-argument signature the probe calls is the **modelled
fine-grained pre-image of production-only ledger `20260720021300`**, which
emits `display_name_exact` and rank **400**, where the deployed coarsened body
emits `exact` and **2** [REPO].

**State both halves of the bound, or the correction overcorrects.**

- **What the reference DOES carry.** All seven ranking predicates and their
  rank values (`400/350/300/250/200/175/150`) are identical in the pre-image and
  in the coarsened body, and the coarsening **only relabels output** — it
  retains `internal_rank` for the `distinct on … order by` and never emits it.
  The tuple this probe compares, `(imported_name, player_id, is_linked)`, is
  therefore selected identically by both bodies, so **player-selection
  equivalence transfers to the deployed body**. The drift guard and the
  gate/pool agreement assertion are **not weakened** by the correction.
- **What the reference does NOT carry.** The **coarse disclosure labels** and
  the **candidate-input bound**. Neither is exercised anywhere in this file, and
  `run.sh` exit 0 does not prove either — that is the same harness coverage gap
  already recorded under `STEP-4.3-AUDIT` in `docs/CURRENT_STATUS.md`.

Corrected at three sites, **comment and prose only**, with no executable line
changed: the section-3e header and the inline probe-(a) comment in
`supabase/tests/executable/matcher-service-role-overload.sql`, the section-5
entry in `supabase/tests/executable/README.md`, and this handoff. The
`raise exception` message inside section 3e still reads "the two-argument
reference"; it was left **byte-unchanged deliberately**, because it is an
executable line and because the phrase is accurate on its own terms — the probe
does call the two-argument signature.

**3h.** Fixtures use invented `Matchprobe*` tokens, invented UUIDs, and
`@example.invalid` addresses. No personal name, real username, or alias text
appears in the new SQL, the new tests, or their output. One constraint is
recorded in the fixture file because it is not obvious: probe names must **not**
contain `sentinel`, which `assertions.sql` K3/K4/K6/K8 use as their own leak
detector over `public.players` — the first fixture draft did contain it and
correctly tripped K6.

### TypeScript mutations — 3, all caught, all reverted byte-identically

| # | Mutation | Observed failure |
|---|---|---|
| T1 | `requireRequestingUserId` degrades to null instead of throwing | `× refuses, rather than matching, when the session id cannot be resolved` — `promise resolved "[ { …(4) } ]" instead of rejecting` |
| T2 | RPC moved back onto the session client | 8 tests fail, including `sends the server-resolved requesting user to the three-argument overload` |
| T3 | `p_requesting_user_id` dropped from the RPC arguments | `expected undefined to be 'user-analyst'` |

T1's mock is deliberately primed to **return a row**, so a regression that let
the call through produces a passing match rather than an empty one and is caught.

---

## Validation

Real exit codes, run directly.

| Check | Lineage | Result |
|---|---|---|
| `npm ci` | both | exit **0** |
| `npm run validate:claude-context -- --require-maintenance` | redesign | exit **0** (pre-commit; it correctly failed first with "requires `REDESIGN_STATE.md` to be updated" and "requires a handoff file", which is what this document and that update answer) |
| `npx tsc --noEmit` | redesign | exit **0** |
| `npx tsc --noEmit` | live | exit **0** |
| `npx vitest run --no-file-parallelism` | redesign | exit **0** — 178 files, **982 passed** |
| `npx vitest run --no-file-parallelism` | live | exit **1** — 195 files, **1094 passed / 8 failed**. **The same 8 tests in the same 5 files fail at the untouched base `0d866559f`**, measured by stashing the change and re-running exactly those files (`8 failed | 14 passed`), then restoring and proving the tree byte-identical. **Pre-existing, not introduced.** They are `group/page.test.tsx`, `auth/callback/route.test.ts` (×4), `auth/reset-pin/page.test.tsx`, `global-loss-cards-section.test.ts`, `lib/env.test.ts` — none matcher-related; the `env` one is the known missing-`.env.local`-in-a-worktree effect |
| `npm run lint` | both | exit **0**, baseline warnings only, none in a touched file |
| `npm run build` | both | **NO RESULT — not run, not claimed.** See the build note below, supplied 2026-07-23 |
| `supabase/tests/executable/run.sh` | redesign | exit **0** |
| `git diff --check` | both | clean |

The executable harness is the load-bearing check and it is the one the mutation
probes drive.

**The build note (supplied 2026-07-23, independent-audit FINDING-2, LOW).** The
`npm run build` row pointed at "the build note below" and **no such note existed
anywhere in this document** — the phrase occurred exactly once, in the reference
itself [REPO]. The reference is now filled, and it is filled with what is
verifiable rather than with a result: **no `npm run build` result was recorded
by the build session, none is recoverable from this document, and none is
claimed here.** The merge session that supplied this note did not run the build
either, and says so.

What *is* verifiable, and is why the missing result is not treated as a gap
worth closing retrospectively:

- `.env.local` is gitignored (`.gitignore:39`), untracked, and **absent from
  both worktrees the build ran in** (`C:/tmp/tm-matcher-overload-expand` and
  `C:/tmp/tm-matcher-overload-callsite`), while it is present in the primary
  redesign tree [REPO]. A `next build` in either worktree therefore fails on
  invalid `NEXT_PUBLIC_SUPABASE_*` values before it can say anything about this
  change — a known environment effect, not a route regression.
- `prebuild` is `node scripts/apply-lineup-effects-polish.mjs && node
  scripts/validate-claude-project-context.mjs`, so `npm run build` transitively
  re-runs the documentation validator that the table already records separately
  at exit 0 [REPO].

The change this handoff covers is one gated SQL migration, three executable
harness files, `migration-ledger-map.ts`, and documentation. `tsc`, `vitest`,
`lint` and `run.sh` all cover it and all passed. **Treat the build as unrun and
unclaimed**; a session working in the primary tree may run it, and should record
the real result rather than back-fill this row.

---

## What this does NOT do

- **It does not close the import enumeration oracle.** Candidate names are
  browser-supplied through the analyze server action, so the probe survives,
  unrate-limited and without durable evidence. The amendment says this in its
  own text [PROJECT-DOC].
- **It does not authorize the apply, the deploy, the verification, or the
  contraction.** Four separate gates, none opened.
- **It does not settle `SUPABASE_SERVICE_ROLE_KEY`'s binding on the live
  Worker**, which stays `[UNVERIFIED]`. It is a precondition of the DEPLOY, not
  of the build, and was deliberately not investigated.
- **It does not resolve the manual-entry gap** — it is the action that makes
  leaving that gap open comfortable, which is why the gap is now a tracked
  blocker row rather than a sentence in a decision.
- **It does not mark Step 4.3 complete**, resolve PD-2 or PD-3, change any
  blocker's `Blocking` value, or edit `DECISIONS.md`.

---

## Documents reviewed, updated, or intentionally unchanged

**Read** (2026-07-23): `docs/redesign/DECISIONS.md` — the 2026-07-22 amendment
(1305-1351) in full, the parent Step 4.3 decision (1247-1302), and the non-import
guest identity decisions (1354-1418) carrying the mitigation pattern;
`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-DESIGN-SCOPING.md` in
full; `supabase/migrations/20260720120000`, `20260722012707`, `20260722012658`,
`20260722160000`, `20260703121500`, `20260718212339`, `20260706190000`;
`src/lib/db/migration-ledger-map.ts`; `supabase/tests/executable/run.sh`,
`README.md`, `bootstrap.sql`, `seed.sql`,
`production-preimage-20260720021300-match-import-player-names.sql`,
`match-oracle-pre-contraction.sql`,
`source-bound-import-identity-contraction.sql`, `assertions.sql` (K5-K7);
`docs/CURRENT_STATUS.md`; `docs/REDESIGN_STATE.md`;
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`. On the live lineage via
`git show`: `import-player-resolution-repo.ts` and its test,
`import-matcher-audit.ts`, `supabase/admin.ts`,
`private-name-sentinel.test.ts`.

**Updated**: `docs/CURRENT_STATUS.md` (current phase; `ID-LEGACY-ORACLE`; new
`MATCHER-MANUAL-ENTRY-REPLACEMENT` row; PD-1 marked decided);
`docs/REDESIGN_STATE.md` (new dated section; active handoff group);
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md` (gated table, counts,
re-gated-never-closed language); `src/lib/db/migration-ledger-map.ts`;
`supabase/tests/executable/README.md` and `run.sh`.

**Intentionally unchanged**: `docs/redesign/DECISIONS.md`,
`docs/redesign/MASTER-RULES.md`, `docs/redesign/MASTER-PLAN.md`, `CLAUDE.md`,
`AGENTS.md`, every existing migration, and `match-oracle-post-contraction.sql`
(its wiring gap is recorded elsewhere and is out of scope here).

---

## Tracked items created

- **`MATCHER-MANUAL-ENTRY-REPLACEMENT`** (`docs/CURRENT_STATUS.md` blockers) —
  the manual-entry replacement is **owed**, with the structural reasons the
  applied source-bound gateways cannot serve a typed name, and a **dated review
  by 2026-08-23**. The amendment's guard against permanence-by-default was prose;
  this makes it a gate.
- **Re-gated, never closed** — recorded on the `ID-LEGACY-ORACLE` row, in the
  gated-migration table, and **asserted executably** by
  `matcher-service-role-overload-post-contraction.sql`, which pins that after the
  contraction the overload survives and still matches and the two-argument
  function still exists.

---

## Discrepancies found

1. **The amendment says "both live call sites"; there are THREE** [PROJECT-DOC
   vs REPO]. The third, `roster_display_name_fallback` in `player-repo.ts`, is
   dormant only because `players.normalized_display_name` is still granted to
   `authenticated`. Practical risk is nil — all three funnel through one wrapper
   — but a future tightening of that grant would wake it up. Confirms the
   scoping's FINDING-C.
2. **The amendment's `default null` silence.** It adopts an overload without
   stating the one constraint that makes it safe. Verified here in both
   directions; `DECISIONS.md` deliberately not edited.
3. **The scoping proposed position THREE for the new parameter and called
   position a consistency choice.** Measurement says otherwise: position two
   makes the defaulted form fail at CREATE (`42P13`). Position two was adopted.
4. **The assignment specified one commit on one task branch.** The repository's
   structure makes that impossible for this artefact; two branches, one commit
   each, are recorded above.
5. **`resolveAuditUserId` was to be "left as-is for the audit line only".** After
   the move it had no caller at all, so leaving it would be dead code inviting
   exactly the wrong reuse. It was replaced, and the audit line now uses the
   fail-closed id.

---

## Remaining risks

- **`SUPABASE_SERVICE_ROLE_KEY` binding — `[UNVERIFIED]`.** Settle before the
  deploy, not during it.
- **PostgREST overload resolution — `[INFERENCE]`.** PostgreSQL's resolution is
  proven; PostgREST performs its own name-set matching first. The two parameter
  sets differ by one name, the documented supported case, but no PostgREST was
  executed here. Failure surfaces as `PGRST203` and would need a distinct
  function name — a new migration, deploy and re-verification.
- **Production body fidelity — `[PRIOR]`.** The overload is derived from
  `20260720120000`, recorded as applied under ledger `20260722144034`. The
  recorded `md5(prosrc)` `522f8cb0a2647c57e35da0a081f90480` was not re-read.
- **The verification step can pass vacuously.** Production verification must
  confirm a **non-zero** match count and a non-null `userId` in the audit line.
  "No error" is exactly what the silent failure mode looks like.
- **Concurrent sessions.** ~70 live worktrees; both base tips were re-derived at
  commit time and were unchanged, but re-check before any production action.

---

## Downstream work

**No downstream work was started.**

Requires new owner authorization before any of it begins: applying
`20260723130000`; deploying the moved reader; verifying it in production;
contraction `20260722012707`; verifying the service-role key binding; designing
or building the manual-entry replacement; merging or pushing either branch; the
`ID-READER-CONTRACT` drop; the tile backfill; guest re-neutralization; the
closure audit; Step 4.4.
