# Deploy state

Shared between concurrent working sessions. **Read this before deploying;
update it immediately after.** The Cloudflare account, the production database,
and this repo are all shared, so this file is the only record of who changed
what — until the runtime deployment stamp below supersedes it for the
version→commit linkage.

> ## This file was reconciled on 2026-07-22. Read this before adding to it.
>
> This ledger had **forked five ways**, and every copy disagreed about what was
> running in production. Four of them were confidently wrong. That is the exact
> condition that caused the 2026-07-19 outage — a session read a stale record,
> inferred the live branch, and deployed a frontend older than the schema.
>
> All five have now been merged into this one file. What each uniquely held,
> and where it came from:
>
> | Copy | Where it lived | Claimed live worker | Merged in here as |
> |---|---|---|---|
> | **A** | `fix/live-compare-data-remove-declared-style` (691 lines) | `178229f3` — **the only one that was right** | the base of this file |
> | **B** | `docs/corporation-banner-logos-deploy-record` (710 lines) | `2ee56485` (1 deploy stale) | the 07-21 16:37 banner-logo and 09:47 Venus deploy records |
> | **C** | `fix/106-claim-rpc-privacy-remediation` (557 lines) | `08f9191f` (3 stale) | the 07-21 20:17 claim-RPC privacy migration |
> | **D** | `redesign/tm-stats-dashboard-rebuild` (296 lines) | `c23bfbd7` (6 stale) | the three 07-22 database changes |
> | **E** | untracked file in the `Terraforming Mars` checkout (106 lines) | `eb4e5821`, commit **UNKNOWN** (12 stale) | nothing — it was the oldest and held no unique fact |
>
> **Where this file now lives.** *(Corrected 2026-07-22; the superseded wording
> is preserved at the end of this block.)* The one place to read this ledger,
> and the one place to append to it, is the tracked copy committed on
> `fix/live-compare-data-remove-declared-style`, the production lineage. No
> checkout is needed:
>
> ```
> git show fix/live-compare-data-remove-declared-style:DEPLOY-STATE.md
> ```
>
> **Every filesystem copy is now a factless pointer stub** — B, C, D **and** the
> untracked E at `C:\Users\izzyh\Documents\Terraforming Mars\DEPLOY-STATE.md`.
> None holds a worker version, commit, migration version, or deploy date, so
> none can go stale again. If you find any other copy of this file asserting a
> production fact, it is stale by construction — do not act on it, and replace
> it with a stub.
>
> *The original wording, and why it was false.* It read: "The working copy is
> `C:\Users\izzyh\Documents\Terraforming Mars\DEPLOY-STATE.md` — the checkout
> the owner reads. The tracked authoritative copy is committed on
> `fix/live-compare-data-remove-declared-style` …". The first sentence was
> already untrue when written. The same reconciliation that produced this file
> replaced that untracked copy with a 50-line pointer stub and stopped the
> planning-pack updater from reading it. Re-derived 2026-07-22 by reading the
> file directly: it opens "Deploy state — moved", states it is not the ledger,
> and contains no production fact. Sending a reader there is the exact failure
> mode this block exists to prevent.
>
> **Never fork this file again.** Append to this copy, commit it on the
> production lineage, and re-derive production facts live (`wrangler
> deployments list`, the migration ledger) rather than trusting any row here
> that you have not just checked.

## Current production

**Superseded 2026-07-22 19:26Z by the import candidate-input bounds release.**
Every row below was re-derived live during that deploy (`npx wrangler
deployments list`, a read-only `supabase_migrations.schema_migrations` query,
and HTTP probes against `tm-stats.com`). The previous occupant of this table —
worker `178229f3` @ `4dec49a42` — is now the rollback target.

| | |
|---|---|
| Environment | production — Cloudflare Worker `terraforming-mars-stats`, serving `tm-stats.com` / `www.tm-stats.com` |
| Worker version | `6ef56761-3c41-4c90-b83c-19db0060c048` — **confirmed live 2026-07-22 at 100% traffic** |
| Source repository | `github.com/Fochizzy/terraforming-mars-stats` |
| Source branch | `fix/live-compare-data-remove-declared-style` — **pushed. `origin` is at `e4a99963f`, identical to local, and every deployed code-bearing commit is on it.** Verified 2026-07-22 after `git fetch origin`; see "Source is local-only — RESOLVED" below. |
| Source commit | `d12e33ad09e976ec5779a6f0d79b621846912964` — printed by the deploy-time stamp (branch passed explicitly via `TM_STATS_SOURCE_BRANCH`), not inferred. **`wrangler` itself records `Source: Unknown (deployment)` for every version.** Unlike every prior row in this file, this linkage does **not** rest on the stamp and this ledger alone — it was independently corroborated by a served-asset probe; see "Commit linkage evidence" below. |
| Deployed (UTC) | 2026-07-22 19:26:59.159Z (version created 19:26:57.040Z; `wrangler deployments list`, 100% traffic) |
| Deploy lock | **Free.** Taken by this session at 2026-07-22 ~19:2xZ for `d12e33ad0`, deploy completed, released on writing this row. Take it by editing this row. |
| Active clean deployment worktree | `C:\tmp\tm-live-compare-data` — clean at `d12e33ad0`, real `node_modules`, no orphaned `workerd`, `.open-next` absent before the build |
| DB migration ledger head | **`20260722153233 close_authenticated_guest_identity_oracle`**, **113 entries** — re-derived live immediately before this deploy and **unchanged by it**. This release applied **no migration and no DDL, and granted and revoked nothing**. Gated migration `20260722012707 retire_free_form_import_name_matcher` remains **absent** from the ledger and unapplied. |
| Rollback worker version | **`178229f3-bfa4-4776-826a-e344daf23d72`** — the immediately prior production version @ `4dec49a42`, 100% traffic 2026-07-21T19:49:51.928Z until this deploy. Command: `npx wrangler rollback 178229f3-bfa4-4776-826a-e344daf23d72 --name terraforming-mars-stats`. **This rollback IS schema-neutral**: no migration accompanied this release, so the database is identical either side of it. |
| Verified | 2026-07-22 19:2xZ — new version at 100%; `/api/deploy-info` → `401 {"error":"Authentication required."}` (route served); `tm-stats.com` → `200`, `www.tm-stats.com` → `200`; served CSS byte-identical to the local artifact. **Not authenticated-verified** — the signed-in `/api/deploy-info` `sourceCommit` read remains open, and the two owner smoke tests below are **not yet run**. |

## Import candidate-input bounds release — 2026-07-22 19:26Z (current)

Deployed from `C:\tmp\tm-live-compare-data`, clean at `d12e33ad0`, via
`TM_STATS_SOURCE_BRANCH=fix/live-compare-data-remove-declared-style npm run deploy`
so the `predeploy` schema gate and the commit stamper both ran. Exit code 0.

**What shipped.** `d12e33ad0` is a merge (`910a7c24d` + `7e401eccc`). The full
range `4dec49a42..d12e33ad0` is seven commits — enumerated before deploying,
nothing outside it:

| Commit | Class | Content |
|---|---|---|
| `d12e33ad0` | merge | merge of `fix/import-candidate-input-bounds` |
| `7e401eccc` | **code — the (d+3) change** | 16 files: per-channel candidate-name bound of 5 with a matcher backstop of 10; over-limit now **throws** instead of silently truncating; every matcher invocation logged with **counts and ids only** — never names, labels, or error text |
| `910a7c24d` | docs | `DEPLOY-STATE.md` only |
| `83dd8ce14` | docs | `DEPLOY-STATE.md` only |
| `f84cc56ac` | docs | `DEPLOY-STATE.md` only |
| `540f27243` | **code — insights only** | `globals.css` + `insights-dashboard.tsx`; the long-pending release recorded below finally ships with this one |
| `c1d18f32d` | docs | `DEPLOY-STATE.md` only |

`540f27243`'s 982-line diff is re-indentation: `git show -w` measures **69
insertions / 10 deletions** — two CSS classes and a `useTransition` wrap.
`insights-dashboard` is imported only by `insights/insights-page.tsx` and two
test files, so it cannot reach the import path.

**Validation before the gate — all passed, none bypassed.**

- `npx tsc --noEmit` — clean, exit 0.
- `npx vitest run --no-file-parallelism` — **1089 passed, 8 failed in 5 files**
  (`group/page.test.tsx`, `auth/callback/route.test.ts`,
  `auth/reset-pin/page.test.tsx`, `global-loss-cards-section.test.ts`,
  `env.test.ts`). **Identical to the recorded baseline** for `540f27243` below
  — same five files, same eight failures. Passing count rose 1051 → 1089, the
  delta being the new (d+3) tests. **No new failure.** Not reproduced at the
  merge base: that needs a checkout this session was not authorized to perform,
  so it rests on the recorded baseline plus the import-graph argument above.
- `npm run lint` — 8 warnings, 0 errors, **none in any file this range touches**.
- `npm run build` — succeeded.
- `npm run check:schema` — **`Schema OK: all 51 referenced tables exist`** (14
  dynamic `.from(variable)` sites not statically checkable, as always). The
  predeploy hook ran it a second time inside `npm run deploy`.

**Commit linkage evidence — stronger than any prior row in this file.** The
`/api/deploy-info` endpoint returned `401` unauthenticated, which proves the
route is served but not which commit built it. The linkage was instead pinned
without credentials: `540f27243` introduced `.tm-pending-banner` and
`.tm-pending-content`, which existed at no earlier commit. Production serves
`/_next/static/css/ad151738c23c83ab.css`, both classes present, and that file
is **byte-identical (`cmp`) to `.open-next/assets/_next/static/css/ad151738c23c83ab.css`**
in the worktree that just built `d12e33ad0`. Production is serving this exact
artifact.

**Source is local-only — RESOLVED 2026-07-22.** The branch has since been
pushed. Re-derived after `git fetch origin`:

| Check | Result |
|---|---|
| `git rev-parse fix/live-compare-data-remove-declared-style` | `e4a99963fff86302d0f9ac76d4c54eaee331c805` |
| `git rev-parse origin/fix/live-compare-data-remove-declared-style` | `e4a99963fff86302d0f9ac76d4c54eaee331c805` — identical |
| `git rev-list <branch> --not --remotes` | empty — nothing unpushed |
| `7e401eccc` (the d+3 change) on origin | yes |
| `d12e33ad0` (the deployed merge) on origin | yes, with every ancestor |

The disk-loss risk this paragraph described is closed: the deployed source is
recoverable from `origin`. This was a documentation correction only — no push
was performed to reach this state, and nothing was deployed, migrated, or
queried in production to verify it. Only local Git refs were read.

The original text is preserved here for history: it recorded that `origin` was
at `83dd8ce14` with the branch 3 commits ahead, and that `7e401eccc` and
`d12e33ad0` existed only on this machine. That was true when written and is no
longer true. One detail from it still holds — there is still no
`fix/import-candidate-input-bounds` branch on `origin`; its commits are reachable
through this branch instead, so nothing is at risk.

**Owner smoke tests — NOT YET RUN.** Both paths call the same bounded matcher
wrapper and both must be exercised on the live site:

1. **Import path** — an import through Analyze and the review screen. Confirm
   player matching resolves the same players, and that a normal-sized game is
   **not rejected** by the new bounds (over-limit now throws rather than
   truncating).
2. **Manual-entry path** — log a game via `/log-game/review` with a typed player
   name and confirm resolution still works. A regression here does **not** error
   visibly; it silently creates **duplicate roster players**, so it must be
   checked deliberately rather than assumed from the import path passing.

**Scope of the import enumeration oracle.** This release **narrows** it — it
does not close it. `20260722012707 retire_free_form_import_name_matcher`
remains gated and unapplied.

**Evidence for the `08f9191f` source commit — historical, retained.** This
paragraph documents the **04:21Z `08f9191f` deploy**, not the `4dec49a42`
deploy in the table above; in copy A it sat directly beneath the table and read
as though it evidenced the current row. Evidence for the current commit is in
"Insights Overall joint release" below.
printed `TM_STATS_SOURCE_COMMIT=2b9a5e3a5a0d2db5c3508ed1a987d353ca44070d` and
`TM_STATS_SOURCE_BRANCH=integration/final-ws2-event-card-42501` immediately
before invoking the build, from a verified-clean detached-HEAD worktree at
that exact `git rev-parse HEAD`. The resulting version (`08f9191f`) was then
confirmed at 100% of `wrangler deployments list` traffic. **The authenticated
`/api/deploy-info` HTTP fetch — the intended steady-state verification path —
was not completed this session** (it returned `{"error":"Authentication
required."}` unauthenticated, as expected; a signed-in fetch was not
performed — entering credentials to authenticate is not something this
session will do). Until that fetch is done, this row's commit is
build-time/ledger-history correlated, not live-endpoint confirmed.
**Superseded**: a later card-scoring deployment-readiness review session
reported completing the authenticated `/api/deploy-info` GET against this
same immutable worker version and confirmed `sourceCommit` matched. This
documentation task did not independently rerun that fetch, and — unlike the
migration facts below — found no corroborating artifact for it anywhere in
this repository's history; it is recorded here as reported, not as
self-verified. The historical fact that the original 04:2x UTC deploy session
could not perform it (see above) stands unchanged.


## Production database changes since the current deploy (no application deploy)

Applied directly to the production database on **2026-07-22**, after worker
`178229f3` shipped and with **no Worker/app deploy of any kind** — no
`wrangler`, no build, no push. They therefore do **not** appear in the deploy
History table near the end of this file, and they do not change any
worker/source/traffic row above. Carried into this file from copy D during the
2026-07-22 reconciliation; **every version and name below was re-derived from
the live ledger** before being written here, and all three matched what copy D
recorded.

**Ledger versions do not match repo filenames.** The migration tool stamps the
version at apply time, so the recorded version is the apply timestamp, not the
filename. **Reconcile repo to ledger by migration *name*, never by version.**

| When (UTC) | Ledger version (recorded) | Repo filename version | Migration name | Kind | Provenance |
|---|---|---|---|---|---|
| 2026-07-22 15:32 | `20260722153233` | `20260722153000` | `close_authenticated_guest_identity_oracle` | **contraction** | `redesign/tm-stats-dashboard-rebuild` @ `66694e967` |
| 2026-07-22 14:40 | `20260722144034` | `20260720120000` | `coarsen_import_name_match_reasons` | interim mitigation | `redesign/tm-stats-dashboard-rebuild` @ `37065ec9b` |
| 2026-07-22 13:21 | `20260722132159` | `20260722012658` | `add_source_bound_import_identity_staging` | **expansion** | `redesign/tm-stats-dashboard-rebuild` @ `484eec90e` |

Provenance commits are as recorded by the applying sessions and were confirmed
to exist in this repository; they are the redesign branch state at apply time,
which runs one commit behind the documentation commit for each entry.

**Read the three entries together.** The expansion added a source-bound matcher
that has **no production caller**; the mitigation coarsened — but did **not**
close — the import enumeration oracle; the contraction closed a *second,
different* oracle. **One oracle is still open.** See "Open production
follow-ups".

**2026-07-22 — revoked `authenticated` EXECUTE on
`public.resolve_import_guest_identity` (CONTRACTION; closes a SECOND, distinct
oracle).** One statement, database-only. **No Worker deploy, no `wrangler`, no
push was involved.**

- **What it closed.** `public.resolve_import_guest_identity(uuid, text, text,
  text, text, uuid, boolean)` is `SECURITY DEFINER`. With `p_create_new = false`
  and `p_selected_player_id = null` its three outcomes were fully
  distinguishable to any signed-in group member, and the miss path performed no
  write: 0 candidates → `22023`, exactly 1 → success returning `player_id` and
  `public_name`, >1 → `P0003`. That is a confirmation oracle over
  `private.player_private_identities.normalized_personal_name` and
  `normalized_guest_username`, and it violated the approved requirement that the
  failure modes be indistinguishable to the caller.
- **This is NOT the import matcher oracle.** The free-form enumeration oracle on
  `public.match_import_player_names` remains **OPEN** behind the interim
  coarsening above; its contraction `20260722012707` is still unapplied. The two
  are separate surfaces and this change closes only the guest-identity one.
- **Zero deployed callers, independently re-derived before applying.** Live
  worker `178229f3-bfa4-4776-826a-e344daf23d72` (source `4dec49a42`) was
  confirmed unchanged, and its tree contains **no** reference to the function in
  any form — all 930 tracked files swept for the RPC name, camel-case wrapper
  spellings, and the `guest_identity` substring, with
  `match_import_player_names` located in the same tree as a **positive control**
  so the empty result is a proven absence, not a broken search. The live-site
  lineage never carried the guest-identity migrations at all. No function, view,
  materialized view or trigger in the database references it; the only edge
  function is a disabled 410 stub.
- **Ledger-version drift.** Repo filename
  `20260722153000_close_authenticated_guest_identity_oracle.sql`; the ledger
  recorded **`20260722153233`**. Reconcile by migration *name*. Ledger went
  112 → **113**, new entry at head.
- **ACL before → after.**
  `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` →
  `{postgres=X/postgres,service_role=X/postgres}`. `anon` and PUBLIC held no
  EXECUTE beforehand, so nothing was revoked for them, and nothing was granted.
  `prosecdef`, `search_path=""` and the function body (`prosrc` md5
  `2892f3189a15f04c35641473541fc5bd`, 7504 bytes) are unchanged.
- **Nothing else moved — proven, not assumed.** Substituting only this
  function's pre-image ACL back into the post-apply fingerprint of all 61
  `public` functions reproduces the pre-apply hash
  `7a47c9c0ad55fc661826814642a52472` exactly.
  `match_import_player_names` and `list_import_player_identity_candidates`
  retain their ACLs verbatim.
- **Rollback is one statement:**
  `grant execute on function public.resolve_import_guest_identity(uuid, text, text, text, text, uuid, boolean) to authenticated;`
- **FORWARD DEPENDENCY — blocks any redesign deploy.**
  `src/lib/db/import-player-identity-repo.ts:88`
  (`createOrReuseGuestPlayerByPersonalName`) calls this RPC through
  `createSupabaseServerClient()` — the **user-session** client. After this
  revoke that path fails with **`42501`** if the redesign lineage is ever
  deployed as-is. It must move to `createSupabaseAdminClient()`, the pattern the
  same file already uses at lines 125/148/162/182 and the one the applied
  source-bound gateways follow. Not deployed today, so nothing is broken now.
  Handle as a separate change. See
  `docs/agent-handoffs/GUEST-IDENTITY-ORACLE-REVOKE-APPLY.md`.

**2026-07-22 — coarsened import name match reasons (INTERIM MITIGATION, NOT A
CLOSURE).** Replaced the body of the live
`public.match_import_player_names(uuid, text[])` so it discloses only a coarse
`exact` / `partial` classification instead of the field-identifying
`display_name_exact` / `full_name_exact` / `alias_exact` / `username_exact`
values, and bounded candidate input to 64 names of at most 128 characters.
**No Worker deploy, no `wrangler deploy`, no push was involved**; this was a
database-only change.

- **In plain words: the enumeration oracle is NOT closed.** Independent review
  found this change *insufficient as a closure*. It stops a caller learning
  *which private field* matched, but it does **not** stop a caller confirming
  that a private name they supply belongs to a real identity — the function is
  still `SECURITY DEFINER`, `authenticated` still holds `EXECUTE`, and a
  matching name still returns a row. This was applied solely to reduce exposure
  while the real fix (a compatible source-bound reader, then the contraction
  `20260722012707`) is built.
- **Ledger-version drift.** The repo filename is
  `20260720120000_coarsen_import_name_match_reasons.sql`, but the tool stamps
  apply-time UTC, so the ledger recorded **`20260722144034`**. Same precedent as
  `20260722012658`→`20260722132159`. Reconcile by migration *name*, not version.
- **Nothing was granted or revoked.** The ACL was verified **hash-identical**
  before and after (sha256 `6517848c…`,
  `postgres=X/postgres | authenticated=X/postgres | service_role=X/postgres`).
  `SECURITY DEFINER`, `search_path=""` and STABLE all survived the replace.
- **The return signature is unchanged** (sha256 `d8d91a90…`), which the deployed
  reader depends on. Only the body and language changed (`sql` → `plpgsql`).
- **Deployed-reader compatibility was gated before applying.** Live worker
  `178229f3-bfa4-4776-826a-e344daf23d72` (source `4dec49a42`) already tolerates
  coarse reasons: `coarsenMatchReason()` maps both `'exact'` and any `*_exact`
  to exact, `match_score` is never consumed (0 references), and the client caps
  requests at the same 64 / 128 bounds.
- **Rollback pre-image captured and byte-verified** before the apply (3335
  bytes, sha256 `2c8c9395cee6b8d127557a7cb05324f1ccef6a14fd2374ee385c091aa4da4d19`).
  See `docs/agent-handoffs/IMPORT-ORACLE-INTERIM-MITIGATION-APPLY.md`.
- **The contraction is still NOT applied.** `20260722012707`
  (`retire_free_form_import_name_matcher`) requires separate authorization.

**2026-07-22 — source-bound import identity staging (EXPANSION half).**
Applied the expansion migration of the source-bound import identity
remediation. **No Worker deploy, no `wrangler`, no push was involved**; this was
a database-only change.

- **Ledger-version drift.** The repo filename is
  `20260722012658_add_source_bound_import_identity_staging.sql`, but the tool
  stamps apply-time UTC, so the ledger recorded **`20260722132159`**. Same
  precedent as `20260720190000`→`20260720221937` and
  `20260721173000`→`20260721201734`. The repo filename and the ledger version
  will not match; reconcile by migration *name*, not version.
- **Two live tables were modified**, so this is not purely additive:
  1. a **UNIQUE index on `public.user_profiles`** over
     `private.normalize_guest_username(username)` (partial, non-empty only);
  2. an **`AFTER UPDATE OF status` trigger on `public.games`**
     (`delete_finalized_import_identity_staging`) that clears staging rows when
     a game is finalized. This is the *first* user trigger on `public.games`.
- **Nothing was revoked from any pre-existing object.** The legacy free-form
  matcher `public.match_import_player_names(uuid, text[])` and its
  `authenticated` EXECUTE grant are **unchanged** — ACL verified byte-identical
  before and after (`postgres=X/postgres | authenticated=X/postgres |
  service_role=X/postgres`).
- **The contraction is NOT applied.** `20260722012707`
  (`retire_free_form_import_name_matcher`) requires separate authorization, and
  the free-form enumeration oracle stays **OPEN** until it is. See
  `docs/agent-handoffs/IMPORT-IDENTITY-EXPANSION-APPLY.md`.


## Release and migration records — newest first

Every production change, deploy or database-only, in one sequence. Merged
from four forked copies on 2026-07-22; the source copy is noted where it
was not copy A.

### Space tag icon replacement — production Storage change — 2026-07-23 01:14:21 UTC

**This is a Storage-only record. No application deployment and no database
migration occurred as part of this entry** — the worker version, source commit,
and migration ledger head in "Current production" are unchanged by it. Recorded
here because the production-action rule covers any production write, not only
deploys and migrations.

Applied under owner instruction ("Replace the supabase asset in tags labeled
space with this"), supplying
`C:\Users\izzyh\Documents\Terraforming Mars\assets\Tags\Space.png`.

**Change.** One object in the public `tm-tag-icons` bucket, project `tm-stats`
(`qjtwgrjjwnqafbvkkfex`):

| | Pre-change | Applied |
|---|---|---|
| `space.webp` bytes | 21,056 | 19,658 |
| SHA-256 | `c208aee474d0597561b12b235502e76ae2028597a6bd7ea0f0d93555dd6a165d` | `fdf6f85ec72c8a5a7ed28a7358ab3405c83bbcf5bb5ee2697254aae11e94f52b` |
| Geometry | WebP 128×128, alpha | WebP 128×128, alpha |

`content-type: image/webp` and `cache-control: max-age=3600` are unchanged. The
resolver already mapped `space` to `space.webp`, so **no code changed and
nothing needed deploying** for the new art to serve.

**One superseded intermediate upload, disclosed.** The first upload followed the
geometry recorded in the 2026-07-17 tag handoff (lossless, no resize) and was
wrong for the current bucket: 1024×1024, 477,338 bytes. It was live from
01:13:08.465Z to 01:14:21.263Z (~73s) before being replaced in place by the
correctly sized object above. The canonical path never changed and no code
referenced anything new, so no consumer saw a missing or broken asset — only,
briefly, an oversized correct image.

**Verified after the corrected upload:** re-download hash matched; the public
URL returns HTTP 200, `image/webp`, `public, max-age=3600`, 19,658 bytes,
byte-identical; corner alpha `0,0,0,0` with centre `255`, matching the
`jovian.webp` sibling; the served bytes were rendered and confirmed to be the
supplied artwork. Final bucket state: 21 objects, 313,154 bytes, all
`image/webp` at `max-age=3600`.

**Rollback** is a single re-upload of the retained pre-change object at
`…\Terraforming Mars Redesign\.npm-cache\tm-space-tag-replacement-20260722\backup\space.webp`
(`c208aee4…`) with the same content type and cache control. Clients may hold the
prior art for up to one hour regardless, by that cache control.

**Stale documentation found, not reconciled.** `docs/redesign/ASSET-INVENTORY.md`
still records this bucket as 21 objects / 14,910,938 bytes at 1254×1254. Live it
is 21 objects / 313,154 bytes at 128×128. No handoff or commit records the
downscale, which happened between 2026-07-17 and 2026-07-22. Reconciling that
inventory needs its own assignment. Handoff:
`docs/agent-handoffs/SPACE-TAG-ICON-REPLACEMENT-2026-07-22.md` on
`redesign/tm-stats-dashboard-rebuild`.

### Ledger #106 claim-RPC privacy hardening — production database change — 2026-07-21 20:17:34 UTC

**This is a database-only migration record. No application deployment occurred
as part of this entry** — the worker version, source commit, and traffic split
in the "Current production" table above are unchanged by it. No `wrangler`
command ran, nothing was pushed, and no other migration was applied.

**Provenance.** Branch `fix/106-claim-rpc-privacy-remediation` @
`9ddd0de596422fd30c89b3cb73101ead70a5a5c3`, from the clean worktree
`C:\tmp\tm-106-claim-fix`. Migration file
`supabase/migrations/20260721173000_harden_claim_rpc_privacy.sql`. Applied under
explicit per-action owner authorization, at an in-session confirmation gate, by
a session whose authorization covered this migration and nothing else.

**What it did.** Replaced the bodies of exactly three existing functions —
`list_claimable_player_profiles()`, `claim_player_profile(uuid)`, and
`claim_player_profiles_by_name()` — closing the ledger #106 private-name
enumeration oracle and the cross-group partial-match claim-escalation path:

- `list_claimable_player_profiles` no longer matches with a bidirectional
  prefix `like`, and no longer falls back to `split_part(display_name,' ',1)`
  (the guest's private first name) as a public label. It now requires exact
  whole-value normalized matching, a 3-character minimum on the caller's own
  profile values, a 10-row cap, a neutral `'Unclaimed player'` placeholder, and
  a null group label.
- `claim_player_profile` no longer revalidates by asking whether the target
  appears in `list_claimable_player_profiles()`; it revalidates independently
  from a row it locks first (`for update` before the eligibility judgement,
  reversing the deployed lock-after-judge order), and returns one
  indistinguishable message for every ineligible reason.
- `claim_player_profiles_by_name` gains the same length floor, the same 10-row
  cap, and row locks taken before any link is written.

**No object was created, dropped or renamed, and no grant or ACL was touched.**
`authenticated` retains EXECUTE on all three — that grant is deliberate
(`20260720221937 grant_authenticated_claim_rpc_execute`) and the live claim flow
depends on it.

**Pre-apply re-verification (hard gate, passed).** Production had moved during
this fix's lifetime, so the three currently-deployed bodies were re-read and
hashed before applying, and all three still matched the reviewed pre-image
exactly — confirming the migration was still a faithful `CREATE OR REPLACE` of
its reviewed predecessors:

| function | pre-apply `prosrc` md5 (CR-stripped) | len |
|---|---|---|
| `claim_player_profile` | `24adae4c2f163c1fd1977d9237c3e734` | 1203 |
| `claim_player_profiles_by_name` | `9866c7f717614d067210712e73aecd88` | 1977 |
| `list_claimable_player_profiles` | `1a6fe35c577a7ad8b16909a9d01140e9` | 2008 |

**Post-apply verification (passed).** All three bodies now hash to their
predicted post-fix values (`9ac64e7f…`/2978, `b68036b3…`/2925,
`cb311ffad…`/2153), contain no carriage returns, and retain their
`security definer`, `search_path=public`, owner and return signatures. No
executable `like` or `split_part` construct remains in any of the three. The
`proacl` on all three is byte-identical to the pre-apply snapshot.

> **Ledger version drift — read before reconciling.** The migration is recorded
> under version **`20260721201734`**, name `harden_claim_rpc_privacy` — *not*
> under its filename version `20260721173000`. The Supabase MCP
> `apply_migration` tool has no version parameter and stamps the current UTC
> time. The recorded `statements` are byte-identical to the file's three
> statements (8786 bytes, LF-normalized). This is the same drift already
> recorded for `20260718204000` (recorded as `20260718212722`). The ledger count
> went 109 → 110. Because production had already advanced to
> `20260721193508`, this entry is the highest-versioned row but its version does
> not match its filename; any repo-to-ledger reconciliation must match on
> **name**, not version.


### Insights "Overall" joint release — 2026-07-21 19:49:51 UTC — SHIPPED

Two sessions, one release. **Both halves are now live.**

| Half | Change | State |
|---|---|---|
| Database | `20260721193508 fold_player_card_outcome_context_into_definer` | **Applied to production 2026-07-21 19:35:08 UTC** — full evidence above under "player_card_outcomes definer fold" |
| Frontend | `fix/live-compare-data-remove-declared-style` @ `4dec49a42` | **Deployed 2026-07-21 19:49:51.928Z** as worker `178229f3-bfa4-4776-826a-e344daf23d72`, 100% traffic |

Deployed by the `player_card_outcomes` session under direct owner instruction
("deploy and push to make live"), holding the deploy lock, from the clean
worktree `C:\tmp\tm-live-compare-data`. Database half went first, ~15 minutes
ahead of the frontend — the safe order here, since `2f38b1e6a` only removes an
amplification and does not depend on the migration.

**Confirmed:**
- Worktree clean at `4dec49a42` immediately before the build; `node_modules` a
  real directory, not the symlink that breaks Workers builds; `.next` and
  `.open-next` cleared first to avoid shipping a stale bundle.
- `origin/fix/live-compare-data-remove-declared-style` pushed and confirmed at
  `4dec49a42` before the build ran.
- `npm run deploy` ran `check:schema` through the `predeploy` hook and the
  deploy-time stamp printed
  `sourceCommit=4dec49a423013b319a2904b35eb70396b1398800`.
- `wrangler deployments list` shows `178229f3-bfa4-4776-826a-e344daf23d72` at
  100% traffic, created `2026-07-21T19:49:51.928Z`.
- Post-deploy health checks: `https://tm-stats.com/` → 200; `/login` → 200;
  `/insights` → 307 (expected redirect, unauthenticated); `/api/deploy-info` →
  401 `{"error":"Authentication required."}` (expected).

**NOT completed — do before treating this as fully verified:**
- **The authenticated `/api/deploy-info` fetch was not performed**, for the same
  reason as every prior entry: it needs a signed-in session and this session
  will not enter credentials. **Action needed:** load
  `https://tm-stats.com/api/deploy-info` while signed in and confirm
  `sourceCommit` reads `4dec49a423013b319a2904b35eb70396b1398800`.
- **No authenticated walkthrough of `/insights` Overall was performed.** The
  whole point of this release is that Tag profiles, Preferred corporations,
  pts-per-board-tile, greenery share, best map and the card-outcome sections
  now render. That is unobserved: the migration is verified at the SQL level
  and the frontend at the HTTP level, but nobody has looked at the page.

#### Ledger gap found during this deploy — RESOLVED 2026-07-22

*Original finding (2026-07-21):* `wrangler deployments list` showed **two
production deploys that no ledger entry described**, between the recorded
04:21:42Z deploy and this one:

| Created (UTC) | Version | Recorded then? | Recorded now |
|---|---|---|---|
| 2026-07-21T09:47:55.840Z | `2c0ef541-0171-469c-a83d-2e91757f4e14` | **No** | **Yes** — `9ab74dd4a10c737aaaed062a4047dbd66c37b1b6`, see "Venus capture parser correction deploy" below |
| 2026-07-21T16:37:11.457Z | `2ee56485-dc7b-4074-b6ce-db82061d91ae` | **No** | **Yes** — `7ffc9961ff4ba599ff0b800c4ea8ef83664ad289`, see "Corporation banner-logo release" below |

**Both are now identified.** The gap was never that the deploys went
unrecorded — the sessions that ran them *did* write full entries. They wrote
them into **a different fork of this file** (copy B,
`docs/corporation-banner-logos-deploy-record`), which the deploying session
here could not see. The 2026-07-22 reconciliation merged copy B in, which is
why both rows now resolve and why the "Rollback worker version" row above can
finally name a commit.

**That is the real lesson, and it is worse than the original one.** Rule 5 was
being followed. Every session recorded its deploy. Production still ended up
with four mutually contradictory ledgers, because each session recorded onto
its own branch's copy. Recording a deploy is not enough — it has to land in
*the* file. See the reconciliation banner at the top of this file: append here,
on the production lineage, and never start a new copy.

**Why it needed both halves.** `analytics.player_card_outcomes` exceeded the 8 s
`authenticated` `statement_timeout`, so PostgREST returned 500 (57014). Both
Overall fan-outs collected their views with a plain `Promise.all`, so that one
rejection discarded all 21 results and `loadInsightsDataOrDefault` substituted
`emptyOverallAnalytics` — blanking Tag profiles, Preferred corporations,
pts-per-board-tile, greenery share and best map even though *their* views had
returned 200. The migration takes the view to ~300 ms (independently
re-measured by the frontend session at 316 ms for the filtered shape);
`2f38b1e6a` stops any future single failure from taking the scope down with it,
and `41ace9f41` fixes the player-comparison headers that read the
deliberately-empty Overall leaderboard.

**Branch safety.** Deploy the frontend from
`fix/live-compare-data-remove-declared-style` — **not** from
`claude/jovial-dirac-9c0f53`, which is 375 commits behind and still calls
`.from('group_default_expansions')` three times in
`src/lib/db/group-settings-repo.ts` (lines 73, 159, 178): the same file and
dropped table behind the 07-19 outage. Nothing was ever deployed from it. The
database session moved off it onto `fix/player-card-outcomes-timeout` before
doing any work, and that line has no such references anywhere in `src/`.

**The migration is already on the deployable line.** An earlier draft of this
entry recorded the migration file as uncommitted and needing to be carried
across. It was in fact committed as `814e60210`, and
`fix/live-compare-data-remove-declared-style` has since been fast-forwarded
(0 behind, 3 ahead → `df9d0c2cc`) so it now contains all three commits: the
migration, this ledger entry plus its verified rollback artifact
(`supabase/migrations/verification/20260721194500_player_card_outcomes_prefold_rollback.sql`),
and the deployment-runbook update. Copying the `.sql` alone would have dropped
the rollback artifact — which matters here, because production's pre-fold view
definition did not match `20260714134000` in this repository.

**Record releases in the tracked file only.** That draft was written into the
*untracked* `DEPLOY-STATE.md` at `C:\Users\izzyh\Documents\Terraforming Mars`
(branch `move-score-profile-below-insights-lab`) — the stale copy this file
warns about at the top. It would not have shipped, and the release branch had
no record of either half until this entry. The tracked file at the head of the
production branch is the only ledger; the copy at the primary checkout is not
a place to write.


### player_card_outcomes definer fold — production database — 2026-07-21 19:35:08 UTC

**Database-only migration. No application deployment occurred** — the worker
version, source commit, and traffic split in "Current production" above are
unchanged. Applied under owner authorization ("Apply now") after the deploy
lock was confirmed released. The view's column list, types, order,
`security_invoker=true` reloption and `authenticated:SELECT` grant are all
unchanged, so no frontend change was needed or made.

**Identity:**
- Repository migration path:
  `supabase/migrations/20260721194500_fold_player_card_outcome_context_into_definer.sql`
- Repository branch: `fix/player-card-outcomes-timeout` (branched from
  `2f38b1e6a` on `fix/live-compare-data-remove-declared-style`); commit
  `814e60210`
- Server-assigned ledger version: `20260721193508`, name
  `fold_player_card_outcome_context_into_definer`. As with the Event-card
  entry, the repository filename prefix (`20260721194500`) is the filename
  identity only and will never appear in the ledger — guard on the **name**.
- Previous ledger head: `20260721081355 fix_event_card_tag_snapshot_correction`

**What it fixes.** `analytics.player_card_outcomes` is `security_invoker`, and
its context joins (`player_game_results`, `game_players`, `maps`, and a lateral
over `game_player_corporations`) re-evaluated `can_read_game_player` /
`can_read_game` / `is_group_member` per row. Read *unfiltered* the planner hides
this behind a Memoize node (4,510 loops → 117, ~550ms), which is why the view
looks healthy in isolation. The Insights Overall scope reads it as
`where group_id = any(...)` (`listView` in `extended-analytics-repo.ts`); with
that qualifier the planner abandons Memoize and pays the RLS calls per row —
**11.8s against the 8s `statement_timeout` on `authenticated`**, so PostgREST
returned 500 (57014) and every card-outcome Insights section rendered empty.
This also explains why indexing `game_player_id` on the style tables changed
nothing. The migration folds the joins into the SECURITY DEFINER function
`analytics.player_card_outcomes_detailed_for_caller()`, so the enrichment runs
once per distinct game player and the caller's filter applies to the function's
result instead of rewriting its plan.

**Verification (measured directly, `set local role authenticated` with
`request.jwt.claims`, since the MCP service role has no statement timeout and
hides the problem):**
- Output **byte-identical** before and after, for all four production users and
  a synthetic non-member, in both the filtered and unfiltered shapes: same row
  counts and same md5 over all sixteen columns. Non-member returns 0 rows.
- Post-application, live (not in a rolled-back transaction), filtered shape
  under an enforced 8s `statement_timeout`: 4,704 rows / 929ms (cold), 4,415 /
  327ms, 4,151 / 285ms, 2,653 / 184ms, 0 / 18ms. Pre-fold the 4,415-row case
  was 11,789ms.
- New function confirmed `SECURITY DEFINER`, `stable`, owner `postgres`,
  `search_path=""`, ACL `{postgres=X/postgres,authenticated=X/postgres}` — no
  PUBLIC/anon EXECUTE.

**Deliberate non-change (worth knowing).** Running the folded query as definer
*would* have bypassed the RLS on `public.players` that gates the
`player_game_results` join. That gate is why user `a6149ac0` currently sees
`style_code=unclassified` / `outcome_method=unclassified_method` /
`pace_bucket=unknown_pace` / `player_count=null` / `map_name=Unknown map` on 95
rows of game `b840e565` — a game they **created** but whose group
(`256d11a3`, "Colette LeRoux / Corey Jansen / James Hodnett") they are not a
member of, so `can_read_game` passes while the `players` rows stay invisible.
The predicate is re-applied explicitly in the function to keep output
identical. Note the inconsistency is pre-existing and arguably backwards: the
player *names*, corporations, and win flags for that game are already visible
to that user through the base definer function — only the map/pace/style/table
-size context is withheld. Widening it is a visibility decision, deliberately
not bundled into a performance fix.

**Rollback.** Run
`supabase/migrations/verification/20260721194500_player_card_outcomes_prefold_rollback.sql`.
It is definition-only — no data was mutated in either direction. **Do not roll
back by re-running `20260714134000_extend_player_card_outcome_context.sql`**:
the definition actually live in production before the fold did not match that
repository file (it carries an extra `when pgr.game_id is null then
'unclassified_method'` branch, arriving through the known repo/production
migration-history drift), so that file would silently change behaviour rather
than restore it. The rollback file holds the exact `pg_get_viewdef` capture
taken immediately before the change.

### Corporation banner-logo release — 2026-07-21 16:37:09 UTC

Deployed under owner instruction ("Replace the supabase logo images with
these and make live"), supplying
`assets/Corps_Contrasting_Backgrounds_Large_Text_600x300.zip`. No database
migration was applied, authorized, or needed.

**Scope — logos only, deliberately.** The art swap already existed as commit
`aa1ac1386` on `fix/live-compare-data-remove-declared-style`, authored by an
earlier session at 12:58 UTC the same day and never deployed. That branch tip
also carries an unrelated insights change (`41ace9f41`, player comparison
sourced from cross-group focus bundles, ~20 files). Deploying the branch tip
would have shipped both, so `aa1ac1386` was cherry-picked alone onto the
then-live commit `9ab74dd4a`, producing `7ffc9961f`. The cherry-pick applied
without conflict; `git diff 9ab74dd4a..7ffc9961f` is exactly the 6 files of
the logo commit.

**Asset state (pre-existing, verified not re-uploaded).** The 112 replacement
objects were uploaded to the public `tm-corporation-logos` bucket at
2026-07-21 12:45 UTC by that earlier session, content-addressed on the
normalized bytes (`corporation-logo-<sha256>.png`, 600×300, `fit: contain`).
Verified this session:
- All 112 keys referenced by `CORPORATION_LOGO_PATHS` return HTTP 200 with
  `content-type: image/png` from the public bucket — 112/112, no misses.
- The map's 112 normalized keys are an exact bijection with the 112 distinct
  `public.corporations.name` values (116 rows; Athena, Eris, Kuiper
  Cooperative and Tycho Magnetics are each two edition records sharing one
  name). No corporation without art, no orphaned art.
- The prior 228 objects were left in place, so reverting this commit is a
  complete rollback with no storage work.

**Gates before deploying:**
- `npx tsc --noEmit` — clean.
- `npm run lint` — warnings only (pre-existing unused-var warnings), no errors.
- `npm run test` — 1027/1036 passed. The 9 failures are pre-existing and
  unrelated (`src/lib/env.test.ts`, `src/app/auth/callback/route.test.ts` ×4,
  `src/app/auth/reset-pin/page.test.tsx`, `src/app/(app)/group/page.test.tsx`,
  `src/features/insights/global-loss-cards-section.test.ts`,
  `src/features/games/log-game/log-game-wizard.test.tsx`); `env.test.ts` was
  confirmed to fail identically in an untouched worktree at `aa1ac1386`. All
  7 corporation-logo tests pass.
- `npm run check:schema` (also enforced by the `predeploy` hook) — "Schema OK:
  all 51 referenced tables exist".
- Deploy lock claimed before the build via commit `6300272ae` on this branch
  (pushed), released by this entry.

**Post-deploy verification:**
- `wrangler deployments list` — `2ee56485-dc7b-4074-b6ce-db82061d91ae` at 100%
  traffic, created 2026-07-21T16:37:09.372Z.
- `https://tm-stats.com/` 200, `/login` 200, `/insights` 307 to login when
  signed out (expected).
- Live client chunk contains all 112 new keys, zero superseded keys (above).
- **Gap:** no signed-in visual confirmation of the logos rendering in the
  authenticated surfaces (insights tables, selection dialogs, player
  comparison). The art is only rendered behind auth, and this session does not
  sign in. The owner should eyeball `/insights` once.
- **Content note, not a deploy defect:** the supplied `Steelaris.png` artwork
  spells the corporation "STELLARIS". The mapping is correct (the file resolves
  to the `steelaris` catalog key); the wordmark inside the image is the
  supplied art's own spelling and needs new art to change.

### Venus capture parser correction deploy — 2026-07-21 09:47:53 UTC

Deployed by this session under explicit owner authorization ("I authorize
deploying Venus integration commit 9ab74dd4a10c737aaaed062a4047dbd66c37b1b6
from integration/venus-capture-to-increase-pattern to production. This
authorization does not include any production reparse, repair, or backfill"),
following a prior independent, read-only deployment-readiness review
performed earlier in this same session (review worktree
`C:\tmp\tm-venus-parser-deployment-readiness`, classification: PASS WITH
NON-BLOCKING NOTES). No database migration was authorized or applied by this
deploy.

**Confirmed before deploying:**
- `origin/integration/venus-capture-to-increase-pattern` resolved to
  `9ab74dd4a10c737aaaed062a4047dbd66c37b1b6` immediately before deploying;
  re-checked after, unchanged. Merge parents in order: `c91299da1` (first,
  authoritative base at review time) then `cefe64cc7` (second, Venus
  authoring branch tip).
- Exact scope relative to the authoritative base: exactly 3 files —
  `src/lib/imports/capture/parse-game-capture.ts`,
  `src/lib/imports/capture/parse-game-capture.test.ts`,
  `src/lib/imports/capture/__fixtures__/fixtures.ts`. No migration,
  persistence, RPC, RLS, secret, environment, or card-scoring file touched.
  `CAPTURE_PARSER_VERSION` unchanged (`tm-data-capture-v2`).
- **Deploy lock claimed before starting** via commit `f9f5c447c` on this
  branch (pushed and independently re-fetched/confirmed live before the
  build began), then released by this entry.
- Focused suite (`src/lib/imports/capture`) — **50/50 passed (2 files)**.
  Full suite — **1026/1034 tests passed (187/192 files)**, the same 5
  pre-existing failing files as the established baseline
  (`src/lib/env.test.ts`, `src/features/insights/global-loss-cards-section.test.ts`,
  `src/app/(app)/group/page.test.tsx`, `src/app/auth/callback/route.test.ts`
  ×4, `src/app/auth/reset-pin/page.test.tsx`) — no new parser/import failure.
- `npx tsc --noEmit` — clean. `npx eslint` on the 3 scoped files — 0 errors,
  1 pre-existing warning (`EventCategory` unused). `git diff --check` against
  the authoritative base — clean. `npm run build` — succeeded, 34/34 static
  pages (only pre-existing esbuild duplicate-object-key warnings in the
  bundler output, unrelated to this change).
- Deploy-time stamp printed the exact candidate SHA and explicit source
  branch before the build ran (see Evidence above).
- `wrangler deployments list` shows `2c0ef541-0171-469c-a83d-2e91757f4e14` at
  100% traffic, created `2026-07-21T09:47:53.078Z`; the immediately prior
  version (`08f9191f-7b06-4fa3-88dd-b3421d3ae89f`, 100% traffic since
  `2026-07-21T04:21:42.798Z`) remains present in the deployments list as the
  rollback target.
- Post-deploy read-only health checks: `https://tm-stats.com/` → 200;
  `/login` → 200; `/insights`, `/cards`, `/log-game/import` → 307 (expected
  redirects, unauthenticated); unauthenticated `/api/deploy-info` →
  `{"error":"Authentication required."}` (expected). Supabase logs (24h
  window) reviewed: `api` service returned zero rows; `postgres` errors
  present are all pre-existing, already-documented signatures (`permission
  denied for schema analytics` from `check:schema`'s own anon-key probe run
  moments before this deploy as the `predeploy` gate; `permission denied for
  table player_import_aliases` from the already-standing, unrelated 42501
  issue) — no new error signature correlated with this deploy.
- Confirmed **zero database mutations** this session: `list_migrations` and
  `get_logs` calls were read-only; no migration was applied, no privilege or
  RLS change, no backfill, no reparse.

**NOT completed this session — same standing gaps as prior deploys:**
- **The authenticated `/api/deploy-info` HTTP fetch was not performed**, for
  the same reason as every prior deploy recorded in this file: it requires a
  signed-in session, and entering credentials to authenticate is not
  something this session will do. **Action needed:** the owner (or a session
  with a sanctioned auth path) should load
  `https://tm-stats.com/api/deploy-info` while signed in and confirm
  `sourceCommit` reads `9ab74dd4a10c737aaaed062a4047dbd66c37b1b6`.
- **No functional walkthrough of any live import flow was performed** (out
  of scope; no reparse of any existing capture is authorized by this
  deploy's authorization, and none was performed).
- Net: the **mechanics** of this release (correct commit, correct worktree,
  correct branch, stamped, gated, tested, live, no DB writes, deploy lock
  claimed-then-released) are confirmed; the **authenticated-endpoint
  confirmation** of the deployed commit is not yet independently observed by
  this session.

**Cross-workstream note carried forward from the pre-deploy review.**
`integration/import-card-scoring-cross-check` (live tip `477da770b` at review
time) is **not** rebased/merged onto this authoritative history and contains
none of the Venus commits. Deploying that branch as-is, unmodified, in a
future release **would revert this Venus parser fix**. Before card-scoring is
ever deployed, its branch must first be re-integrated onto the
then-current authoritative HEAD (which now includes this Venus deploy),
following this repo's own established integration-branch convention — this
is a prerequisite for that workstream's own future deployment task, not
something this deploy needed to resolve.

### Venus post-deploy authenticated and functional follow-up — 2026-07-21

**Classification: PASS WITH NON-BLOCKING NOTES.** This is a documentation-only
addendum. No deployment, migration, rollback, deploy-lock claim, or database
mutation occurred as part of this entry. It closes the two gaps the deploy
entry above truthfully recorded as not completed at deploy time — it does not
rewrite or erase that historical fact; both gaps genuinely existed at the
04:2x/09:4x UTC deploy time and were closed later by this separate,
owner-assisted follow-up session.

**Authenticated deploy-info — closed.** Using the owner's own already-signed-in
browser session (read-only; no credentials, cookies, or tokens were seen or
handled by the assisting session), a live fetch of
`https://tm-stats.com/api/deploy-info` reported:
- `sourceBranch: integration/venus-capture-to-increase-pattern`
- `sourceCommit: 9ab74dd4a10c737aaaed062a4047dbd66c37b1b6`

Exact match to the deployed candidate. The worker remained
`2c0ef541-0171-469c-a83d-2e91757f4e14` at 100% traffic throughout, with no
newer deployment observed.

**Stale Server Action error — did not reproduce.** The previously reported
`Server Action ... was not found on the server` failure was not seen during a
freshly loaded authenticated page, form interaction, import analysis, or
review. Treated as resolved stale-client/version-skew behavior for this
verification specifically — this does not claim every possible stale browser
session everywhere is now impossible.

**Functional import walkthrough — completed, with a duplicate-guard result.**
The game used for verification had already been imported and saved in an
earlier, separate session, before this follow-up began. Re-confirming it on
the fresh page was correctly rejected by the existing "cannot upload a game
twice" duplicate protection. This rejection is expected, correct behavior —
**not** a deployment failure. No second game was created, no duplicate record
exists, and no production cleanup was required. Because the game already
existed, no new save or reopen of a newly-created record occurred during this
follow-up; verification instead proceeded via read-only inspection of the
already-persisted record.

**Read-only persisted-capture comparison (sanitized — no player names, game
IDs, group names, or raw log text).** The already-saved game's v2 capture
data were compared against its raw source evidence line-by-line:
- Parser version: `tm-data-capture-v2` (unchanged).
- Colonies state: `confirmed_present`. Venus Next state: `confirmed_absent`.
- 9 canonical Colonies events — 2 colony-build events, 7 colony-trade
  events — across 3 canonical colonies (Titan, Io, Miranda). Every event
  matched the source exactly: no duplicate canonical events, no invented
  canonical events, no missing supported build/trade events, no invented
  player attribution.
- Venus events: 0. Cross-mechanic isolation held — a Colonies-heavy game
  produced zero false Venus events, and no colony named after a global
  parameter (e.g. Venus-the-colony vs. Venus-the-scale) was confused with the
  other mechanic.

**Live Venus evidence — scope limitation, stated precisely.** This
verification game contained no Venus gameplay at all. It therefore verified
the deployed worker, the authenticated source stamp, the fresh-page import
path, duplicate protection, persisted Colonies behavior, and negative
Venus/Colonies isolation (zero Venus events from an all-Colonies game). **It
did not exercise the new positive asteroid-removal Venus wording** (`<actor>
removed an asteroid resource to increase Venus scale N step(s)`) against a
real production sample — no game containing that wording was available for
this follow-up. That positive pattern remains covered by the focused
automated parser suite recorded in the deploy entry above (50/50 tests
passed), not by a live production sample.

**Non-blocking pre-existing Colonies gap (not introduced by this Venus
deployment — the Colonies code path in `parse-game-capture.ts` is untouched
by the Venus diff, confirmed both by static diff review and by this live
behavioral check).** Three source lines describing colony-track movement —
shapes such as `<player> increased Titan colony track 1 step(s)`, `<player>
decreased Io colony track 1 step`, `<player> increased Titan colony track 2
step(s)` — produced no canonical Colonies event and no unsupported-evidence
row. The parser explicitly recognizes Colonies *build* and *trade* actions,
but these *track-movement* forms fall through every pattern (Colonies action
patterns, the Colonies option-line pattern, and the shared line classifier)
into the generic `context` bucket, which is silently treated as inert prose.
The persisted coverage for this game reported `recognizedLines: 586` and
`unsupportedLines: 0` — **this does not establish complete Colonies mechanic
coverage**, because generic context lines count as "recognized" without ever
producing a canonical event or an unsupported-evidence record. This is
classified as pre-existing, non-blocking for this deployment, and a future
parser-hardening/backlog item. No code change or issue was created for it in
this task; it is documented here only.

**Mutation and privacy boundary.** All database inspection in this follow-up
was read-only (`execute_sql` SELECT statements and read-only log/migration
calls only). No new game was saved, no duplicate was created, no migration
was applied, no reparse/repair/backfill occurred, no deployment occurred, and
no deploy lock was claimed. No private player names, game identifiers, group
names, or raw log text appear in this entry.

**Net result:** live functional acceptance for this Venus deployment is now
complete. The Venus deployment workstream is closed. The Colonies
track-movement gap above is a separate, future backlog item — not part of
this deployment's scope and not authorized for implementation here.


### Event-card snapshot migration — production database correction — 2026-07-21 08:13:55 UTC

**This is a database-only migration record. No application deployment
occurred as part of this entry** — the worker version, source commit, and
traffic split in the "Current production" table above are unchanged by it.

**Status:** completed successfully. Applied once, to production, under
separate owner authorization from the WS2/Event-card/42501 deploy above.
Immediate post-application verification passed (see "Production result"
below). No further database write against this migration is authorized —
any future corrective action requires a new owner-authorized gate.

**Repository identity** (independently reconfirmed by this documentation
session):
- Candidate commit: `ab9e11191f1f0b276b3a1dd278750a66a5742c0e`
- Repository branch: `fix/event-card-snapshot-migration-bounded-rebuild`
- Repository migration path:
  `supabase/migrations/20260720223000_fix_event_card_tag_snapshot_correction.sql`
- SHA-256 of that file's exact content at the candidate commit (LF line
  endings): `2eba01204cff08c7220d1b7c2f78c02e45b1332a7f621e28c1606e9d800d48f4`
  — recomputed directly from `git show` of that commit while writing this
  entry and confirmed to match exactly. (This is the file-content digest, not
  a Git object/blob ID.)

**Remote ledger identity** (independently reconfirmed via `list_migrations`
against Supabase project `qjtwgrjjwnqafbvkkfex` while writing this entry):
- Server-assigned version: `20260721081355`
- Name: `fix_event_card_tag_snapshot_correction`
- Previous ledger head: `20260721035955 secure_public_player_labels_service_role`
- Ledger row count: 107 → 108; reconfirmed the live ledger contains exactly
  one entry named `fix_event_card_tag_snapshot_correction`, at position 108
  of 108, immediately after `20260721035955`.
- **Repository-file-to-ledger-version mapping**: the repository filename
  timestamp `20260720223000` is the migration's identity/filename prefix
  only — it is **not**, and was never intended to be, the ledger version.
  The ledger recorded this migration under the server-assigned version
  `20260721081355` (the actual application time).

**Reapplication rule.** Any future guard against re-running this migration
must key on the exact ledger **name** `fix_event_card_tag_snapshot_correction`
— not on finding remote ledger version `20260720223000`, which will never
appear (see mapping above).

**Production result.** The pre-application target counts, deltas, and
before/after aggregate digest below are as reported by the completed
production-application verification; this documentation task did not rerun
the underlying correction SQL and cannot recompute a "before" state that no
longer exists. Where this session re-derived a figure independently
read-only against current production, that is noted.
- Target convergence (as reported): pre-application 45 targeted games / 122
  targeted resolved players (109 Event-signal, 99 total-mismatch, 86
  overlapping both, 13 missing player-snapshot rows, 109 contaminated
  Event-tag rows, 658 spurious Event-tag units; 0 unresolved/ambiguous/
  malformed targets) → 0 of every one of those categories post-application.
- Four snapshot-table deltas (as reported: 109→122 / 1526→1708 / 117→135 /
  186→203). **Current-state values independently reconfirmed by this
  session** via read-only query: `game_player_metric_snapshots` = 122,
  `game_player_tag_metric_snapshots` = 1708, `game_milestone_metric_snapshots`
  = 135, `game_award_metric_snapshots` = 203 — matching the reported
  post-application figures. Zero nonzero-value `event`-tag rows remain in
  `game_player_tag_metric_snapshots`.
- Root evidence (`game_log_tag_summaries`) reported unchanged before/after:
  1778 total rows, 127 `event`-tag rows, event value sum 0, 0 nonzero event
  rows, aggregate digest `19168d42d66bea93495f8b8ef6587abb` both before and
  after. **Independently reconfirmed by this session** (current state, read
  -only): 1778 total rows, 127 `event`-tag rows, event tag-count sum 0, 0
  nonzero event rows — all matching. This session's own digest query used a
  different aggregation and did not reproduce `19168d42d66bea93495f8b8ef6587abb`
  bit-for-bit; that specific digest is recorded as reported, not independently
  reproduced.
- Guarded-function restoration — **independently reconfirmed by this session**
  via live `pg_proc` introspection: `public.rebuild_metric_summaries()`
  (OID `19392`) body SHA-256 `1301ade233da95c487e8d9e3e9739cd3cccbfbb7e789682cf3400f94c7f9d8da`,
  full function definition SHA-256
  `1c94896bfe75e52618354cf9734bd891cb2e98eb68f86ee1eec79ba2ed65eb7c`, ACL
  `{postgres=X/postgres}` — all match exactly; no migration-scoped no-op body
  survived. `public.refresh_game_metric_snapshots_internal(uuid, boolean)`
  (OID `19296`) body SHA-256
  `4b90d50c7353c9a035d454c31480e45bb42a22550335030b9390337c4665c65c` — matches
  exactly; owner and ACL unchanged.
- Non-target stability (as reported): the two unresolved non-target games
  remained outside the correction, still with zero snapshot rows across all
  four refreshed tables; no repair of those games was performed or
  authorized.

**Application boundary** (independently reconfirmed by this session via
`wrangler deployments list`):
- No application deployment or worker-version change occurred as part of
  this migration. Worker remains `08f9191f-7b06-4fa3-88dd-b3421d3ae89f` as
  the most recent deployment, at 100% traffic, created
  `2026-07-21T04:21:42.798Z` — unchanged and still the latest entry.
  Deployed application source remains associated with
  `2b9a5e3a5a0d2db5c3508ed1a987d353ca44070d`.
- No parser, card-scoring, Venus, secret, environment, or RLS operation was
  bundled into this migration.
- No repair of the two unresolved non-target games was performed or
  authorized.

**Known notes (non-blocking):**
- Exactly-one-global-rebuild is structurally proven in the correction package
  (harness item 14, §6) but was not independently isolated through a fresh
  pre-application PostgreSQL-statistics baseline captured by this specific
  production application.
- Authenticated source confirmation for the current deployed application
  (`/api/deploy-info`) was carried forward from the prior WS2/Event-card/42501
  deploy entry above as not-yet-done at that time; see the superseding note
  above this section for the subsequently reported (not independently
  rerun) completion.
- Several global summary dimensions increased (see the four-table deltas
  above) because previously-missing target snapshots became materialized —
  this is expected, not a regression.

**Rollback and follow-up:**
- No rollback was needed.
- No automatic rerun is permitted; any future corrective database action
  against this migration or its tables requires a new owner-authorized gate.
- The Event-card database workstream (this migration) is complete.
- This entry, and the corresponding final section in
  `docs/event-card-tag-exclusion-correction-package.md` (recorded separately
  on `docs/event-card-migration-production-record`), are a documentation-only
  reconciliation of an already-applied, already-verified production
  migration — no migration, refresh, or rebuild was executed by the session
  that wrote this entry.

### Combined WS2/Event-card/42501 deploy — 2026-07-21 04:2x UTC

Deployed by this session under owner authorization ("Full execution as
written" against a pre-scoped deployment directive naming exact candidate
`2b9a5e3a5a0d2db5c3508ed1a987d353ca44070d`). No database migration was
authorized or applied by this deploy.

**Confirmed:**
- `origin/integration/final-ws2-event-card-42501` resolved to
  `2b9a5e3a5a0d2db5c3508ed1a987d353ca44070d` before creating the deploy
  worktree; re-checked after deploy, unchanged.
- Merge-base of the candidate against the prior production source
  (`9b7a00555f216f4a741e819e8795238c362584f9`) is exactly that commit — 9
  commits ahead, 0 behind, 26-file diff (`git diff --name-only`), matching
  the approved candidate exactly.
- Fresh detached worktree at `C:\tmp\tm-final-ws2-event-card-42501-deploy`;
  `git status --porcelain` empty and `HEAD` matched the candidate SHA
  immediately before deploy.
- Focused suites: Workstream 2 privacy (six-file manifest derived from the
  diff between the prior deployed base and the WS2 privacy commit —
  `web-import-page.test.tsx`, `apply-created-import-player-to-review.test.ts`,
  `apply-server-player-matches.test.ts`, `resolve-import-player-links.test.ts`,
  `resolve-player-identity.test.ts`, `private-name-sentinel.test.ts`) —
  **55/55 passed**. Event-card (`card-type-vocabulary`, `analytics-repo`,
  `extended-analytics-repo`, `derive-card-score-evidence`,
  `countable-card-tags`, `derive-player-tag-summaries`) — **50/50 passed**.
  42501 (`import-group-repo`, `public-player-labels-service-role-migration`) —
  **27/27 passed**.
- `npx tsc --noEmit` — clean. `npm run build` — succeeded, 34/34 static
  pages, no errors (only pre-existing lint warnings). `git diff --check` —
  clean. `npm run check:schema` — passed (51 referenced tables confirmed
  against the live project; 14 dynamic call sites unchecked, as always).
- `npm run lint` — only the two known pre-existing warnings on Event-card
  files: `_fallbackName` unused in `src/lib/db/analytics-repo.ts` (present,
  unchanged); `scripts/backfill/recompute-tag-summaries.ts` is outside
  `next lint`'s default scope so its `no-explicit-any` finding was not
  re-observed this run but was not touched. No new blocking findings.
- DB compatibility (read-only, via Supabase MCP): migration ledger head is
  `20260721035955 secure_public_player_labels_service_role`; live
  `pg_proc` introspection of `public.get_public_player_names` confirms
  `SECURITY DEFINER`, owner `postgres`, language `plpgsql`, empty
  `search_path`, output `(player_id uuid, public_name text, is_linked
  boolean)`, EXECUTE granted to `authenticated`/`service_role` only (no
  anon/PUBLIC grant); `service_role` confirmed to still hold no `USAGE` on
  schema `private`. Event-card migration `20260720223000` and migration
  `20260720120000` both confirmed absent from the ledger.
- Deploy-time stamp printed the exact candidate SHA and explicit source
  branch before the build ran (see Evidence above).
- `wrangler deployments list` shows `08f9191f-7b06-4fa3-88dd-b3421d3ae89f` at
  100% traffic, created `2026-07-21T04:21:42.798Z`; the immediately prior
  version (`79d5b795-eb81-4962-aa5a-bfff26359a36`, 100% traffic since
  `2026-07-21T00:15:19.080Z`) remains present in the deployments list as the
  rollback target.
- Post-deploy read-only health checks: `https://tm-stats.com/` → 200;
  `https://tm-stats.com/login` → 200; `https://tm-stats.com/insights` → 307
  (expected redirect, unauthenticated); unauthenticated
  `https://tm-stats.com/api/deploy-info` → `{"error":"Authentication
  required."}` (expected — the route requires a signed-in session).
  Supabase `postgres` and `api` logs (24h window) reviewed: `api` service
  returned zero log rows; the `postgres` errors present are all timestamped
  before this deploy's build/publish window and match already-documented
  incidents (migration-application probing, `check:schema`'s anon-key
  existence probe, and the pre-existing 42501 incident signatures) — no new
  error burst correlated with this deploy.
- Confirmed **zero database mutations** this session: all Supabase MCP calls
  were read-only (`list_migrations`, `select`-only `execute_sql`, `get_logs`).

**NOT completed this session — do before treating this deploy as fully
verified:**
- **The authenticated `/api/deploy-info` HTTP fetch was not performed** for
  the same reason as the Step 4.3 deploy below: it requires a signed-in
  session, and entering credentials to authenticate is not something this
  session will do. **Action needed:** the owner (or a session with a
  sanctioned auth path) should load `https://tm-stats.com/api/deploy-info`
  while signed in and confirm `sourceCommit` reads
  `2b9a5e3a5a0d2db5c3508ed1a987d353ca44070d`.
- **No functional walkthrough of Confirm Import Draft, Analyze Import
  Evidence, or any other live import flow was performed.** The owner
  separately reported the previously failing upload/import action succeeded
  after migration `20260721035955`; this session did not independently
  re-run or observe that flow, and Analyze Import Evidence / Confirm Import
  Draft were explicitly out of scope for this deploy.
- Net: the **mechanics** of this release (correct commit, correct worktree,
  correct branch, stamped, gated, tested, live, no DB writes) are confirmed;
  the **functional/authenticated behavior** of the combined change set
  against real production traffic is not yet independently observed by this
  session.

### Step 4.3 code-only deploy — 2026-07-20 18:3x UTC

Deployed by this session under owner authorization ("AUTHORIZE CODE-ONLY
DEPLOY", exact candidate `a40d49662825474c98813aa44abb577b8830cc68`).

**Confirmed:**
- Worktree was clean and at `a40d49662` immediately before and after deploy
  (`git status --porcelain` empty, `git rev-parse HEAD` matched).
- `release/step-43-production-compatibility` pushed to `origin`;
  `origin/release/step-43-production-compatibility` independently fetched and
  resolved to `a40d49662825474c98813aa44abb577b8830cc68` from a second
  worktree.
- Critical focused suite (15 files / 146 tests: deployment-stamp,
  `/api/deploy-info` route, cloudflare-config, privacy sentinel, import
  matching + link resolution, tile attribution, player-repo,
  log-game-player-resolution, analytics-repo, game-draft-repo,
  game-import-repo, import/review/roster pages) — all passed.
- `npx tsc --noEmit`, `git diff --check`, `git status` — all clean immediately
  before deploy.
- `npm run check:schema` (predeploy gate) — passed, ran again automatically as
  part of `npm run deploy`.
- Deploy-time stamp printed the exact candidate SHA before the build ran (see
  Evidence above).
- `wrangler deployments list` shows `15fba7e9-2443-440c-8a1f-b5b9231d7ff6` at
  100% traffic, created `2026-07-20T18:33:13.965Z`.
- Passive read-only monitoring immediately after deploy: `wrangler tail` for a
  ~20s window showed no error traffic; Supabase `api`/`postgres` logs (24h
  window) showed **no PGRST205** and **no tile `CHECK` constraint violations**
  anywhere in the reviewed range; the most recent request in that window
  (`get_public_landing_stats`, unauthenticated) returned 200.
- Confirmed **zero database mutations**: no migration applied, no privilege
  or RLS change, no backfill, no guest neutralization. `execute_sql` calls this
  session were all read-only (`select`/log queries), and both fetched logs are
  read-only by nature.

**NOT completed this session — do before treating this deploy as fully
verified:**
- **The authenticated `/api/deploy-info` HTTP fetch was not performed.**
  Verifying it requires a signed-in session; entering a username/PIN to
  authenticate is a credential-entry action this session will not perform
  regardless of authorization, and using the owner's real-browser session was
  offered and declined. **Action needed:** the owner (or a session with a
  sanctioned auth path) should load `https://tm-stats.com/api/deploy-info`
  while signed in and confirm `sourceCommit` reads
  `a40d49662825474c98813aa44abb577b8830cc68`.
- **No functional walkthrough of Import Analyze, import review, group
  roster, new participant creation, public player labels, coarse matching, or
  a tile-containing import was performed**, for the same reason. The
  `permission denied for schema analytics` / `permission denied for table
  player_import_aliases` entries visible in the Supabase `postgres` logs
  around this deploy window are from this session's own `check:schema` probe
  script (anon-key, `select=*&limit=0` against every referenced table/schema,
  `node` user agent) — **not** from real application traffic — and are
  expected, pre-existing tooling noise, not a regression signal. No
  authenticated-user request against the new deploy was observed in either
  direction (success or failure) because none occurred during the monitoring
  window.
- Net: the **mechanics** of this release (correct commit, correct worktree,
  correct branch, stamped, gated, tested, live) are confirmed; the
  **functional/authenticated behavior** of the privacy reader, coarse
  matching, and tile attribution against real production traffic is not yet
  independently observed by this session.

## Insights focus pending feedback (2026-07-21) — NO LONGER PENDING, SHIPPED 2026-07-22

> **Resolved.** `540f27243` shipped to production on 2026-07-22 at 19:26Z as
> part of worker `6ef56761` @ `d12e33ad0` — it was carried along in the range
> below the import candidate-input bounds change, not deployed on its own. See
> "Import candidate-input bounds release" near the top of this file. The
> section below is retained as the historical record of why it sat undeployed
> for a day, and its test baseline is what the 2026-07-22 release compared
> against. **The paragraph immediately following is now out of date** — it was
> accurate when written.
>
> Its "never been seen rendered" caveat still stands: the spinner, banner and
> dimmed state have now been deployed but still have not been watched on a real
> focus change by anyone.

Frontend only, no migration, no schema dependency. **Committed, pushed and
verified; the production deploy was never run.** Production is still on
`178229f3` @ `4dec49a42` — the row above is unchanged by this entry.

| | |
|---|---|
| Commit | `540f27243` on `fix/live-compare-data-remove-declared-style` (pushed; `origin` confirmed at `f84cc56ac`, which is `540f27243` + this ledger's lock commit) |
| Change | `useTransition` around the Insights player-focus / comparison change, a spinner and press state on the OK button, and a sticky "Recalculating insights…" banner with the results dimmed while pending |
| Why | Applying a focus re-derives every chart in one blocking render. The owner reported the OK button looked dead — it was working, just with no feedback for several seconds. |
| Risk | Low. Presentation only; no data access, no new `.from(...)` call sites, no server code touched. |

**Verified before the deploy attempt:**
- `tsc --noEmit` clean.
- `npx vitest run`: 1051 passed. 8 failures in 5 files
  (`src/app/(app)/group/page.test.tsx`, `src/app/auth/callback/route.test.ts`,
  `src/app/auth/reset-pin/page.test.tsx`,
  `src/features/insights/global-loss-cards-section.test.ts`,
  `src/lib/env.test.ts`) — **all pre-existing**, confirmed by re-running the
  same five files against a stashed tree and getting the identical 8 failures.
  None are in `insights-dashboard.test.tsx`, which passes with a new assertion
  covering the comparison select.
- `npm run check:schema`: `Schema OK: all 51 referenced tables exist`.
- `.next` and `.open-next` cleared; worktree `C:\tmp\tm-live-compare-data` clean
  at the commit; `node_modules` a real directory.

**Why it was not deployed.** `npm run deploy` was blocked by the operating
harness's permission classifier, which requires direct owner approval for a
production deploy. The session stopped there rather than routing around the
gate. **Action needed:** from `C:\tmp\tm-live-compare-data`, run
`TM_STATS_SOURCE_BRANCH=fix/live-compare-data-remove-declared-style npm run deploy`,
then record the resulting worker version and stamped `sourceCommit` in this file.

**Not verified — carried forward.** The change is visual and has never been
seen rendered. `/insights` requires a signed-in session and this session does
not enter credentials, so the spinner, the banner and the dimmed state are
confirmed only by unit test and type check, not by looking at the page. Whoever
deploys should watch one focus change on `/insights` before calling it good.

**Also unfixed, noticed while working here.** Pressing OK resets Compare With to
"— no comparison —" (pre-existing behaviour, not introduced by `540f27243`). If
you set a focus and an opponent, then change the focus and press OK, the
comparison silently clears. The owner was asked whether it should persist when
the chosen opponent is still valid; that question is unanswered.

## Deployment sources — allowed and prohibited

Deploy **only** from the recorded clean worktree and branch above, at a
reviewed commit, via `npm run deploy` (which now refuses a dirty tree or a
missing commit SHA).

Do **not** deploy from:

- `data-capture-hardening-v2` — predates all 11 production fixes on
  `fix/live-42501-on-capture-v2`; deploying it reverts them at once;
- the ordinary live-site checkout at
  `C:\Users\izzyh\Documents\Terraforming Mars` — it sits on the unrelated
  dirty branch `move-score-profile-below-insights-lab`;
- the redesign repository/worktree
  (`C:\Users\izzyh\Documents\Terraforming Mars Redesign`,
  branch `redesign/tm-stats-dashboard-rebuild`) — different application line
  sharing this database;
- `tm-stats-app` or `main` — both predate migration
  `20260718041532 remove_game_expansion_tracking` and throw `PGRST205` on
  `/log-game` in production.

## Rules

1. **Expand/contract for privilege and schema changes.** Deploy the frontend
   that no longer needs a grant or table, verify it, *then* revoke or drop.
   Never revoke against a reader that is currently deployed.
2. **One deployer at a time**, whoever holds the deploy lock above. Hand it
   over here before the other session deploys.
3. **`npm run check:schema` gates `npm run deploy`** through the `predeploy`
   hook. It asserts every `.from('…')` in `src/` exists in the live database.
   If it fails, the build is out of step with the schema — fix the drift, do
   not bypass the gate.
4. **Every release must be stamped.** `npm run deploy` runs
   `scripts/deploy/deploy-with-stamp.ts`, which bakes the repository, branch,
   full commit SHA, build timestamp, and environment into the artifact and
   refuses to ship without them. After deploying, verify
   `https://tm-stats.com/api/deploy-info` (authenticated) reports the commit
   you just shipped, then record the new worker version here.
5. **Record every deploy below**, worker version *and* source commit.
6. **There is exactly one ledger. Do not fork it.** Record into *this* file and
   commit it on the production lineage
   (`fix/live-compare-data-remove-declared-style`). Do **not** start a copy on
   your feature branch, and do **not** write production facts into an untracked
   file — both happened, four times over, and produced four confidently wrong
   records of what was live. If you are working on another branch and need to
   record a production change, commit it onto the production lineage. Any other
   copy is stale by construction.
7. **Re-derive before you trust.** Any row in this file that you have not
   personally just checked may be stale. Before deploying, re-run
   `npx wrangler deployments list` and read the migration ledger; if reality
   disagrees with this file, reality wins and you fix the file.

## Open production follow-ups

Newest and highest-consequence first. The four items added on 2026-07-22 came
in with copies C and D during the fork reconciliation.

- **~~PRODUCTION IS RUNNING UNPUSHED CODE~~ — RESOLVED 2026-07-22.** The branch
  is pushed and the deployed source is recoverable from `origin`. Re-derived
  from local Git refs only; no production system was contacted:

  | Check | Result |
  |---|---|
  | `git rev-parse fix/live-compare-data-remove-declared-style` | `c58416e4f05902787f09f5035bb4cf4a27f8b8eb` |
  | `git rev-parse origin/fix/live-compare-data-remove-declared-style` | `c58416e4f05902787f09f5035bb4cf4a27f8b8eb` — identical |
  | `git rev-list <branch> --not --remotes` | empty — nothing unpushed |
  | `git rev-list --left-right --count <branch>...origin/<branch>` | `0  0` |
  | `d12e33ad0` (the deployed merge) on origin | yes |
  | `7e401eccc` (the d+3 change) on origin | yes |
  | `83dd8ce14` (the tip this bullet named as origin) on origin | yes — origin has advanced past it |

  This duplicated the already-resolved note in the release section above
  ("Source is local-only — RESOLVED 2026-07-22") and contradicted the
  **Source branch** row of the Current production table, which records the
  branch as pushed. It was left behind when that row was corrected.

  *Original text, retained as history:* "**PRODUCTION IS RUNNING UNPUSHED
  CODE.** Worker `6ef56761` was built from `d12e33ad0`, and that commit plus
  `7e401eccc` (the whole d+3 change) exist **only** in
  `C:\tmp\tm-live-compare-data` on the owner's machine. `origin` is at
  `83dd8ce14`. The operator confirmed the deploy but did not approve the push,
  so it was not performed. **Push `fix/live-compare-data-remove-declared-style`
  to `origin`** — until then the running production build is unrecoverable from
  the remote and cannot be rolled forward by anyone else." That was true when
  written. The push has since been performed; **no push was performed by the
  documentation session that resolved this bullet.**

  One detail from it still holds: the operator's approval is required for a
  push, and none of the branches this ledger names may be pushed without it.

- **THE TWO SMOKE TESTS FOR `6ef56761` HAVE NOT BEEN RUN.** The import path and
  the manual-entry path at `/log-game/review` both call the newly bounded
  matcher wrapper. The manual-entry regression mode is silent — duplicate
  roster players, no error. Neither has been exercised on the live site. See
  the release section near the top of this file.

- **THE IMPORT ENUMERATION ORACLE IS STILL OPEN.** The 2026-07-22 coarsening
  (`20260722144034`) was an **interim mitigation and independent review found it
  insufficient as a closure**. `public.match_import_player_names` is still
  `SECURITY DEFINER`, `authenticated` still holds `EXECUTE`, and a private name
  supplied by a caller that matches a real identity still returns a row — so a
  signed-in group member can still *confirm* a private name, they simply can no
  longer learn which field matched. The real closure is the contraction
  `20260722012707 retire_free_form_import_name_matcher`, which is **written but
  NOT applied** — re-confirmed absent from the live ledger on 2026-07-22 — and
  requires its own separate authorization. Do not treat the mitigation as a fix.

- **DEPLOY LANDMINE ON THE REDESIGN LINEAGE — read before any redesign deploy.**
  `src/lib/db/import-player-identity-repo.ts:88`
  (`createOrReuseGuestPlayerByPersonalName`) calls
  `public.resolve_import_guest_identity` through
  `createSupabaseServerClient()` — the **user-session** client. The 2026-07-22
  contraction revoked `authenticated` EXECUTE on that function, so this path now
  fails with **`42501`** the moment the redesign lineage is deployed as-is.
  **Nothing is broken today** — the live worker `178229f3` is on the live-site
  lineage, which never carried that code. The fix is to move the call to
  `createSupabaseAdminClient()`, the pattern the same file already uses at lines
  125/148/162/182. Handle as its own change, before deploying redesign. See
  `docs/agent-handoffs/GUEST-IDENTITY-ORACLE-REVOKE-APPLY.md`.

- **Grant `EXECUTE` on `private.normalize_guest_username` to `service_role`.**
  The new `user_profiles_normalized_username_key` functional index means index
  maintenance evaluates `private.normalize_guest_username(username)` on every
  `user_profiles` INSERT/UPDATE — and PostgreSQL **does** enforce `EXECUTE` on
  an index-expression function at DML time (verified empirically on a
  rolled-back temp table: `service_role` and `anon` both got
  `42501 permission denied for function normalize_guest_username`; the same
  insert without the index succeeded). That function is granted only to
  `postgres` and `authenticated`.
  **Nothing is broken today** — every current writer is safe: the only app
  writer (`src/lib/db/user-profile-repo.ts`) uses the session/`authenticated`
  client, and all three DB writers (`handle_new_auth_user`,
  `claim_player_profile`, `claim_player_profiles_by_name`) are `SECURITY
  DEFINER` owned by `postgres`. Signup is unaffected; reads never evaluate
  index expressions.
  **The hazard is latent:** any future server code writing `user_profiles`
  through `createSupabaseAdminClient()` (service_role) will fail with 42501.
  Handle as a separate authorized change.


- **The Step 4.3 item below is partly superseded — read this first.** It says
  the paired contract migration `20260720120000 coarsen_import_name_match_reasons`
  must not be applied until an authenticated `/api/deploy-info` fetch and a
  functional pass are complete. **That migration was applied anyway on
  2026-07-22 at 14:40 UTC**, recorded under version `20260722144034`. The
  verification it was gated behind was **not** completed first. The applying
  session gated on a narrower check instead — that the deployed reader tolerates
  coarse reasons (`coarsenMatchReason()` maps `*_exact` to exact, `match_score`
  unused) — which is real evidence but is not the functional pass this item
  asked for. The authenticated `/api/deploy-info` fetch and the functional
  walkthrough of Import Analyze, import review, group roster, participant
  creation, public labels and coarse matching **remain outstanding**, and are
  now outstanding *against already-applied* schema rather than ahead of it.


- **Step 4.3 expand/contract pair (deployed, runtime verification incomplete).**
  The privacy-compatible reader (public-name labels, coarse match-reason
  consumption, tile attribution, deployment stamp) is deployed as worker
  `15fba7e9` from `release/step-43-production-compatibility` @ `a40d49662`.
  **Before applying the paired contract migration `20260720120000
  coarsen_import_name_match_reasons`, complete the runtime verification this
  session could not**: an authenticated `/api/deploy-info` fetch confirming
  `sourceCommit=a40d49662825474c98813aa44abb577b8830cc68`, plus a functional
  pass over Import Analyze, import review, group roster, participant
  creation, public labels, and coarse matching. Only after both the migration
  may be applied — under its own separate authorization. The 114-row
  tile-attribution backfill and guest re-neutralization remain separately
  authorized steps, in that order (backfill first — two rows resolve solely
  through the guest's current display name).
- **Capture participant resolution still reads `players.display_name`.**
  `game-mechanic-capture-repo.ts` resolves capture actors via
  `players!inner(display_name)` under the authenticated role. It works today
  and is wrapped in best-effort handlers, but the eventual display-column
  restriction will degrade capture attribution until it gets a definer-side
  resolver. Pair that work with whichever migration restricts the display
  columns; it is deliberately not part of the Step 4.3 code-only release.
- **Jenna Kass's game needs re-importing.** Her group `6cb73dce`
  ("Colette LeRoux / Corey Jansen / Jenna Kass") and its games were destroyed by
  the 2026-07-12 group migrations. Only score rows survive, in
  `mig_backup_game_players` for games `e58c3171` / `e061fb0d` — which are
  duplicates of one another, so it is one real game, not two. Re-import the log
  rather than restoring: the backup has no `played_on`, map, generation count,
  or log events. Verify against Corey 117 / Colette 79 / Jenna 73.
- **`tm-stats-app` and `main` are stale — do not deploy them.** Both still
  reference `expansions`, `game_expansions`, and `group_default_expansions`,
  which no longer exist. Merge the production branch forward into `main`, make
  `main` the deploy source, and have both sessions branch from it.


## History

### 2026-07-20 — Step 4.3 code-expansion session (this update)

Corrections made while repairing this ledger:

- The previous revision's "Built 2026-07-20 01:47 UTC" in Current production
  described `0732bd81`, not the current `c23bfbd7`; the deploy-history times
  below were recorded in local EDT despite the UTC header (Cloudflare shows
  `c23bfbd7` at 15:14Z, the table said 11:0x). Times below are kept as
  recorded, now labeled correctly.
- The previous revision's "**This branch is not on any remote**" warning is
  resolved: `fix/live-42501-on-capture-v2` was pushed to `origin` with owner
  approval during the third remediation pass and verified again today
  (`origin/fix/live-42501-on-capture-v2` = `14abb8d1d`).
- Completed follow-ups moved out of the active list: duplicate-group
  consolidation (done 2026-07-20, backups in `private.mig_backup_group_*`),
  tag-summary backfill (done 2026-07-20 via
  `scripts/backfill/recompute-tag-summaries.ts`, idempotent, backup
  `private.mig_backup_tag_summaries_20260720`; re-run after any catalogue
  sync).

### Deploy history (times as originally recorded, EDT before 2026-07-20 12:00)

| When (EDT) | Version | Commit | Notes |
|---|---|---|---|
| 07-19 13:24 | `eb4e5821` | `bf081d918` | Live-capture v2. **Rollback target.** |
| 07-19 23:23 | `d80b155c` | `a0eba76fc` | 42501 fix on `tm-stats-app`. Regressed prod. |
| 07-19 23:31 | `7f6c4017` | `369b90182` | Added alias tolerance. Still regressed. |
| 07-20 01:16 | `ffbecea6` | `369b90182` | Clean rebuild. Still regressed. |
| 07-20 01:27 | `eb4e5821` | `bf081d918` | Rollback to restore service. |
| 07-20 01:47 | `219cacee` | `32c381c22` | 42501 fixes on the correct base. Superseded 30s later. |
| 07-20 01:47 | `0732bd81` | `32c381c22` | Same code + pinned Server Actions key. |
| 07-20 02:2x | `ffd765de` | `7972608f8` | Server-side import name matching. |
| 07-20 02:5x | `5d290811` | `48ebf13e6` | Card-type filter fix (project deck). |
| 07-20 03:1x | `501d18ef` | `3a8664e7b` | Page card reads past the 1000-row cap. |
| 07-20 09:5x | `39820427` | `c9eb1924a` | Typed placement contract for tile events. |
| 07-20 10:0x | `1b3dbac3` | `980165021` | Slug tile names into the event identity format. |
| 07-20 10:3x | `21e3047e` | `20921cf46` | Route the import roster by confirmed player id. |
| 07-20 11:14 | `c23bfbd7` | `59dda6c0f` | Name new groups from the roster, not review labels. **Current** (15:14 UTC). |

### Standing operational notes

Note that `wrangler secret put` publishes a **new version** carrying the same
code plus the updated bindings. The 07-20 01:47 deploy uploaded `219cacee`,
then pinning `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` superseded it with
`0732bd81`. Always re-check `wrangler deployments list` after touching
secrets; the version id the deploy printed is not necessarily the one serving
traffic.

**Do not re-add the `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` Worker secret from
PowerShell.** Setting it on 07-20 stored a value that is not valid base64;
wrangler reported success anyway. Next.js decodes that key while rendering
Server Actions, so every authenticated render threw
`InvalidCharacterError: atob() …` twice and Confirm silently did nothing. It was
deleted; the build-time key from `.env.local` still pins actions across builds.
If it is ever set again, write it from a shell that will not mangle stdin and
then load an authenticated page and check `wrangler tail` before believing it.

The three regressed deploys were built on `tm-stats-app`, which predates
migration `20260718041532 remove_game_expansion_tracking`. They threw
`PGRST205: Could not find the table 'public.group_default_expansions'` from
`getGroupSettings()` during render, taking out `/log-game` and
`/log-game/review` for signed-in users. `check:schema` now catches exactly this
class of drift before it reaches production.

Group-surgery note for anyone repeating it: `game_log_events.player_id` and
`owner_player_id` are `ON DELETE SET NULL`, not cascade — re-point events
*before* deleting a player or attribution nulls silently.

**Check any branch before deploying it — chip-spawned worktrees inherit a bad
base.** Carried in from copy E during the 2026-07-22 reconciliation. Worktrees
created from a task chip branch from whatever the primary checkout happens to be
sitting on, which is how a session doing *database* work ended up on
`claude/jovial-dirac-9c0f53` — an undeployable frontend line 375 commits behind
production that still calls `.from('group_default_expansions')` three times in
`src/lib/db/group-settings-repo.ts`. Nothing was ever deployed from it, but
nothing structural prevented it either. Until `main` is the shared base, run
`git grep group_default_expansions -- src` on any branch before deploying it;
a hit means the branch predates `20260718041532 remove_game_expansion_tracking`
and will reproduce the 07-19 outage.
