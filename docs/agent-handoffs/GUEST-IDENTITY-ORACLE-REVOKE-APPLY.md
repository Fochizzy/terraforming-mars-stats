# Guest-identity oracle revoke — production apply record

**Status: APPLIED to production 2026-07-22 15:32 UTC. Database-only. No app
deploy, no `wrangler`, no push.**

One statement executed against production:

```sql
revoke execute on function public.resolve_import_guest_identity(
  uuid, text, text, text, text, uuid, boolean
) from authenticated;
```

> **This does NOT close the import name-matcher oracle.** The free-form
> enumeration oracle on `public.match_import_player_names` remains **OPEN**
> behind the interim coarsening (ledger `20260722144034`). Its contraction
> `20260722012707` is still gated and unapplied. The two are distinct surfaces.

---

## 1. Why

`public.resolve_import_guest_identity(uuid, text, text, text, text, uuid,
boolean)` is `SECURITY DEFINER`, gated on `is_group_member(auth.uid())`, and
`authenticated` held `EXECUTE`.

With `p_create_new = false` and `p_selected_player_id = null` its outcomes were
fully distinguishable to the caller, and the miss path performed **no write**:

| Candidates | Result |
|---|---|
| 0 | `22023` — "Confirm creation of the new guest identity." (no write) |
| exactly 1 | success, returns `player_id` + `public_name` (writes an alias row) |
| >1 | `P0003` — "Multiple guest identities match." |

Any signed-in member of a group could therefore confirm, one guess at a time and
without mutating anything, whether a private name they supplied belonged to a
real identity in `private.player_private_identities`
(`normalized_personal_name` / `normalized_guest_username`). It also violated the
approved decision's requirement that the failure modes be indistinguishable to
the caller.

## 2. Pre-state (evidence class: read-only production introspection)

| | |
|---|---|
| Worktree | clean, no tracked uncommitted changes |
| Branch / HEAD | `redesign/tm-stats-dashboard-rebuild` @ `66694e967` |
| Ledger | **112** entries, head `20260722144034` (matched expectation) |
| Signature | `resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean)` |
| `prosecdef` | `true` |
| `proconfig` | `search_path=""` |
| Language / owner | `plpgsql` / `postgres` |
| `prosrc` | md5 `2892f3189a15f04c35641473541fc5bd`, 7504 bytes |

**ROLLBACK PRE-IMAGE — the ACL as it stood before the apply:**

```
{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
```

md5 `d1707186c8e5f1577bde2338d7541aec`.

Roles holding EXECUTE: `postgres`, `authenticated`, `service_role`. **`anon` and
PUBLIC held none** — PUBLIC's implicit `CREATE FUNCTION` default had already been
revoked by `20260718050924`. Nothing therefore needed revoking for them, and the
migration revokes only `authenticated`.

Global pre-image across all 61 `public` functions:
`all_public_proc_acl_md5 = 7a47c9c0ad55fc661826814642a52472`.

## 3. Gates — all passed before anything was executed

The prior session's zero-caller claim was **not accepted**; it was re-derived
independently.

### (a) Live worker unchanged

`wrangler deployments list` (read-only) → latest deployment for worker
`terraforming-mars-stats` is **`178229f3-bfa4-4776-826a-e344daf23d72`**, created
2026-07-21T19:49:49Z. Unchanged from the recorded value, so the deployed source
to sweep is commit **`4dec49a42`** ("chore(deploy): take the deploy lock for the
Insights Overall joint release", 2026-07-21 19:46 UTC — 3 minutes before the
build, consistent).

### (b) No application callers on the deployed lineage — with a positive control

Sweeps against tree `4dec49a42` (930 tracked files, 85 migration files):

| Sweep | Result |
|---|---|
| `git grep -I 'resolve_import_guest_identity' 4dec49a42 -- .` | **0 hits** |
| `git grep -I -E 'resolveImportGuestIdentity\|ResolveImportGuestIdentity\|resolve_import_guest' 4dec49a42 -- ':!docs'` | **0 hits** |
| `git grep -I -E "\.rpc\(\s*['\"][a-z_]*(guest\|identity)" 4dec49a42 -- src` | **0 hits** |
| `git grep -I 'guest_identity' 4dec49a42 -- src scripts supabase` | **0 hits** |

**Positive control — this is what makes the zero meaningful.** The same command
form against the same tree finds `match_import_player_names` at
`src/lib/db/import-player-resolution-repo.ts` and its test, and finds `.rpc(`
across 8 files in `src/lib/db`. The sweep works; the absence is real, not a
broken search.

**Root cause of the absence:** the live-site lineage never carried the
guest-identity migrations at all — none of its 85 migration files are
guest/identity named, while the function was created in production by ledger
`20260718181600` (`claimable_guest_identity_privacy`) and last modified by
`20260719191911` from the *other* lineage. The deployed app has no code path to
this function.

### (c) No database-internal callers

`pg_proc.prosrc` and `pg_get_viewdef` swept across every function, view and
materialized view in all non-system schemas → **0 references**. Non-internal
triggers whose function references it → **0**.

### (d) `authenticated` still held EXECUTE

Confirmed in the pre-state ACL above — this had not already been done.

### (e) No other server-side consumer

`list_edge_functions` → one function, `temporary-asset-uploader`, whose entire
body is:

```ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(() => new Response("Uploader disabled", { status: 410 }));
```

No reference. Only one Cloudflare worker (`terraforming-mars-stats`) exists.

## 4. Operator confirmation

The gate was presented in chat with the exact SQL, the current ACL, the
resulting ACL, and the gate results. Execution was withheld until the operator
typed the literal string:

```
CONFIRM REVOKE resolve_import_guest_identity
```

## 5. Applied

| | |
|---|---|
| Migration file | `supabase/migrations/20260722153000_close_authenticated_guest_identity_oracle.sql` |
| Migration name | `close_authenticated_guest_identity_oracle` |
| Filename version | `20260722153000` |
| **Actual ledger version** | **`20260722153233`** |
| Drift | apply-time UTC stamp over the filename version — **reconcile by NAME** |
| Statements executed | **1** (the revoke) |

No `comment on function` was issued, so exactly one statement mutated
production. The executable SQL in the repo file is byte-identical to what was
applied; only the `--` comment header differs (the ledger statement carries an
abridged version), and the file says so.

## 6. Post-apply verification — all passed

| Check | Result |
|---|---|
| (a) `authenticated` EXECUTE | **revoked** — `has_function_privilege('authenticated', …) = false` |
| (b) `postgres` / `service_role` EXECUTE | **retained** — both `true` |
| (b) Function unchanged | `prosecdef = true`, `proconfig = search_path=""`, `prosrc` md5 `2892f3189a15f04c35641473541fc5bd` / 7504 bytes — identical to pre-state |
| (b) Resulting ACL | `{postgres=X/postgres,service_role=X/postgres}` (md5 `db23e67d6fad77fdfa003856d807d6af`) |
| (c) `match_import_player_names` ACL | **untouched** — `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` |
| (c) `list_import_player_identity_candidates` ACL | untouched |
| (c) Nothing else moved | **proven** — see below |
| (d) Ledger | **112 → 113**, new entry `20260722153233 close_authenticated_guest_identity_oracle` at head |

**Exact proof that only the target changed.** Rather than eyeballing a changed
global hash, the post-apply fingerprint of all 61 `public` functions was
recomputed with *only* this function's ACL substituted back to its pre-image. It
reproduced the pre-apply hash **`7a47c9c0ad55fc661826814642a52472`** exactly
(`only_target_changed = true`). No other function's privileges moved. Function
count is still 61.

## 7. Rollback (not executed)

If a live breakage is ever traced to this change, rollback is one statement:

```sql
grant execute on function public.resolve_import_guest_identity(
  uuid, text, text, text, text, uuid, boolean
) to authenticated;
```

Nothing was auto-rolled-back; no post-apply check failed.

## 8. Forward dependency — blocks any redesign deploy

**Verified directly in this session, not inherited.**

`src/lib/db/import-player-identity-repo.ts:88`, inside
`createOrReuseGuestPlayerByPersonalName`, calls:

```ts
const supabase = await createSupabaseServerClient();   // line 87 — USER SESSION client
const { data, error } = await supabase.rpc('resolve_import_guest_identity', { … });
```

`createSupabaseServerClient()` is the user-session client, so this call runs as
`authenticated`. **After this revoke it will fail with `42501` if the redesign
lineage is ever deployed as-is.**

It must move to `createSupabaseAdminClient()` — the service-role pattern the
*same file* already uses at lines 125, 148, 162 and 182, and the pattern the
four applied source-bound gateways follow — **before any redesign deploy.**

Nothing is broken today: this code is not deployed. The live worker
`178229f3` has no reference to the function at all.

Two independent notes on that call site:

- It passes an **8-key** argument object including `p_record_import_alias`,
  which only exists in the gated, unapplied `20260720100000`. Against
  production's 7-argument function it would already fail `PGRST202`/`42883`
  today — the code explicitly handles that. The revoke changes which error it
  fails with, not whether it works.
- The other call sites in the file already use the admin client, so the fix is
  a one-line client swap, not a redesign.

This is a **follow-up. It was not fixed in this task.**

## 9. Ledger-map registration

`src/lib/db/migration-ledger-map.ts` was updated and its bidirectional drift
test passes (**11/11**, both before and after the apply).

The map was found **stale by two entries** — it attested 110 entries / head
`20260721201734`, while production stood at 112. The two 07-22 applies had never
been registered, and a new entry cannot be accepted against a stale snapshot.
Corrected from evidence (ledger names read directly, corroborated by the two
existing handoffs), not from assumption:

| File version | Ledger version | Name | Change |
|---|---|---|---|
| `20260722012658` | `20260722132159` | `add_source_bound_import_identity_staging` | `GATED_UNAPPLIED` → renamed-apply |
| `20260720120000` | `20260722144034` | `coarsen_import_name_match_reasons` | `GATED_UNAPPLIED` → renamed-apply |
| `20260722153000` | `20260722153233` | `close_authenticated_guest_identity_oracle` | new, hazard class **`contraction`** |

Attestation re-recorded: `attestedOn 2026-07-22`, `entryCount 113`,
`headVersion 20260722153233`. `20260722012707` **remains gated and unapplied**.

Hazard class is `contraction`: it removes a surface `authenticated` held before
the migration and restores no replacement, even though the zero-caller sweep
proved no deployed reader depends on it.

## 10. Flagged, not fixed

**The `DEPLOY-STATE.md` fork.** The canonical copy lives on the live-site
lineage (the newest `docs/*` deploy-record branch), not on
`redesign/tm-stats-dashboard-rebuild`. It is still missing all three 07-22
database entries — `20260722132159`, `20260722144034` and now
`20260722153233`. Recorded in the branch copy's "Open follow-ups"; reconciling
the fork was explicitly out of scope.

## 11. Scope attestation

- Exactly **one** statement executed against production: the revoke above.
- Nothing else was granted, revoked, created, dropped, deployed, pushed or
  applied. The gated migrations — including `20260722012707` — were **not**
  applied.
- `match_import_player_names` was not touched, and **its oracle remains OPEN**.
- The function was **not invoked**.
- **No table row data and no personal data were read.** All production reads
  were catalog/introspection only (`pg_proc`, `pg_class`, `pg_namespace`,
  `pg_trigger`, `has_function_privilege`, and
  `supabase_migrations.schema_migrations`).
