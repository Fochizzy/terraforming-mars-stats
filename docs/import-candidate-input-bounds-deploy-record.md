# Import candidate-input bounds — production deploy record

**2026-07-22 19:26:59Z · worker `6ef56761-3c41-4c90-b83c-19db0060c048` ·
commit `d12e33ad09e976ec5779a6f0d79b621846912964`**

Companion to `docs/import-candidate-input-bounds-and-matcher-attribution.md`
(the change itself) and to the "Import candidate-input bounds release" section
of `DEPLOY-STATE.md`, which is the canonical ledger. This file records the
deploy *operation*: what was checked, what was confirmed, and what is still
open.

---

## 1. Pre-deploy state (re-derived, not trusted from any document)

| Fact | Value |
|---|---|
| Worktree | `C:\tmp\tm-live-compare-data` |
| Branch | `fix/live-compare-data-remove-declared-style` |
| HEAD | `d12e33ad09e976ec5779a6f0d79b621846912964` (merge of `910a7c24d` + `7e401eccc`) |
| Working tree | clean — `git status --porcelain` empty |
| Live worker before | `178229f3-bfa4-4776-826a-e344daf23d72`, created 2026-07-21T19:49:49.573Z, 100% |
| Migration ledger before | 113 entries, head `20260722153233 close_authenticated_guest_identity_oracle` |
| `origin` | `83dd8ce14` — local branch 3 commits ahead |
| Environment | real `node_modules`, `.open-next` absent, no orphaned `workerd` |

Nothing had been deployed since `178229f3`, so no concurrent session had moved
production out from under this one.

## 2. Commit range `4dec49a42..d12e33ad0` — enumerated before deploying

Seven commits, nothing outside the briefed scope:

| Commit | Class | Content |
|---|---|---|
| `d12e33ad0` | merge | merge of `fix/import-candidate-input-bounds` |
| `7e401eccc` | **code (d+3)** | 16 files — candidate bounds, matcher audit, import/log-game resolution |
| `910a7c24d` | docs | `DEPLOY-STATE.md` |
| `83dd8ce14` | docs | `DEPLOY-STATE.md` |
| `f84cc56ac` | docs | `DEPLOY-STATE.md` |
| `540f27243` | **code (insights)** | `globals.css` + `insights-dashboard.tsx` |
| `c1d18f32d` | docs | `DEPLOY-STATE.md` |

`540f27243` measures 69 insertions / 10 deletions under `git show -w`; the
982-line raw diff is re-indentation. `insights-dashboard` is imported only by
`insights/insights-page.tsx` and two test files — it cannot reach the import
path.

## 3. Validation — all gates passed, none bypassed

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean, exit 0 |
| `npx vitest run --no-file-parallelism` | 1089 passed, 8 failed in 5 files |
| `npm run lint` | 8 warnings, 0 errors, none in changed files |
| `npm run build` | succeeded |
| `npm run check:schema` | `Schema OK: all 51 referenced tables exist` |

The 8 failures are the established baseline — `group/page.test.tsx`,
`auth/callback/route.test.ts`, `auth/reset-pin/page.test.tsx`,
`global-loss-cards-section.test.ts`, `env.test.ts`. `DEPLOY-STATE.md` records
the identical five files and eight failures for `540f27243`, confirmed then
against a stashed tree. Passing count rose 1051 → 1089 (the new d+3 tests)
against an unchanged failure set. **No new failure.**

They were *not* re-run at the merge base: that requires a checkout this session
was not authorized to perform. The conclusion rests on the recorded baseline
plus the import-graph argument in §2.

`SUPABASE_SERVICE_ROLE_KEY` was present in this worktree, so `check:schema` ran
against the live database rather than being skipped.

## 4. Confirmation

The operator was shown the commit, the enumerated range with each commit
classified, every validation result, the rollback target and its command, and
an explicit statement that this was a whole-site application deploy. They
replied with the exact literal `CONFIRM DEPLOY d12e33ad0`.

They did **not** answer the accompanying push question. Silence was treated as
*not approved*; the branch was **not** pushed. See §7.

## 5. Deploy

```
TM_STATS_SOURCE_BRANCH=fix/live-compare-data-remove-declared-style npm run deploy
```

Run from the clean worktree so the `predeploy` schema gate and the commit
stamper both executed. Exit code 0. The stamper printed
`sourceCommit=d12e33ad09e976ec5779a6f0d79b621846912964`.

**No migration was applied. No DDL. No `GRANT` or `REVOKE`. No SQL writes.**
The only database access all session was two read-only queries against
`supabase_migrations.schema_migrations` returning version strings and migration
names. No personal or row data was read.

## 6. Post-deploy verification

- `wrangler deployments list` — `6ef56761-3c41-4c90-b83c-19db0060c048` live at
  **100%**, created 2026-07-22T19:26:57.040Z, deployed 19:26:59.159Z.
- `GET /api/deploy-info` unauthenticated — `401
  {"error":"Authentication required."}`. Proves the route is served; does not
  identify the commit. **The signed-in `sourceCommit` read was not performed —
  this session does not enter credentials. It remains open for the owner.**
- `GET https://tm-stats.com/` — `200`, 24,510 bytes.
  `GET https://www.tm-stats.com/` — `200`.
- **Credential-free commit pin.** `540f27243` introduced `.tm-pending-banner`
  and `.tm-pending-content`, which exist at no earlier commit. Production
  serves `/_next/static/css/ad151738c23c83ab.css` containing both, and that
  file is **byte-identical (`cmp`)** to
  `.open-next/assets/_next/static/css/ad151738c23c83ab.css` in the worktree
  that just built `d12e33ad0`. Production is serving this exact artifact.

## 7. Rollback

Identified **before** the deploy, not improvised after:

```
npx wrangler rollback 178229f3-bfa4-4776-826a-e344daf23d72 --name terraforming-mars-stats
```

`178229f3` @ `4dec49a42` was the immediately prior production version. **This
rollback is schema-neutral** — no migration accompanied this release, so the
database is identical on either side of it. That is not true of the older
rollback rows in `DEPLOY-STATE.md`.

## 8. Open — carried forward

1. **Production is running unpushed code.** `origin` is at `83dd8ce14`;
   `7e401eccc` and `d12e33ad0` exist only on this machine, and there is no
   `fix/import-candidate-input-bounds` branch on `origin` either. Pushing the
   branch is the next action anyone should take.
2. **Neither smoke test has been run.** Both paths call the same bounded
   matcher wrapper:
   - **Import path** — an import through Analyze and the review screen; confirm
     matching resolves the same players and a normal-sized game is **not
     rejected** by the new bounds (over-limit now throws rather than
     truncating).
   - **Manual-entry path** — `/log-game/review` with a typed player name.
     Regression here is **silent**: it creates duplicate roster players rather
     than erroring, so it must be checked deliberately.
3. **Authenticated `/api/deploy-info` `sourceCommit` read** — still not done,
   though §6 pins the commit by other means.
4. **The import enumeration oracle is NARROWED, NOT CLOSED.** Migration
   `20260722012707 retire_free_form_import_name_matcher` remains **gated,
   absent from the ledger, and unapplied.** This deploy changed no database
   object.
5. The insights pending-feedback UI has now shipped but still has not been
   watched rendering on a real focus change.
