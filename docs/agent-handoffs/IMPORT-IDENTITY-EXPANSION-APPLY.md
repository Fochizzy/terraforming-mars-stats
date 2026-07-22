# Import identity remediation — EXPANSION applied to production

**Status: APPLIED.** The expansion half of the source-bound import identity
remediation is live in the production database. The contraction is **not**
applied and is **not** authorized.

| | |
|---|---|
| Applied (UTC) | 2026-07-22 13:21:59 |
| Project | `tm-stats` / `qjtwgrjjwnqafbvkkfex` (PostgreSQL 17.6) |
| Migration file | `supabase/migrations/20260722012658_add_source_bound_import_identity_staging.sql` |
| Ledger name | `add_source_bound_import_identity_staging` |
| **Ledger version recorded** | **`20260722132159`** |
| Filename version | `20260722012658` — **drift, see below** |
| Provenance | `redesign/tm-stats-dashboard-rebuild` @ `484eec90e7793ab6fdcec122987a3cedf2b0e26f` |
| Deploy involved | **None.** No Worker deploy, no `wrangler`, no push. |

## Ledger-version drift

The apply tool stamps apply-time UTC rather than the filename version, so the
repo filename (`20260722012658`) and the ledger version (`20260722132159`) do
not match. This matches prior precedent (`20260720190000`→`20260720221937`,
`20260721173000`→`20260721201734`). **Reconcile by migration name, not
version.**

## Pre-state snapshot (before apply)

- Working tree **clean**, no tracked uncommitted changes; HEAD `484eec90e`.
- Migration file SHA-256 (CRLF, as checked out):
  `ce28195d512ad761ff3dd330c24edcf3c3c452944cdef5c89b604cfba18fda3a`
- Exact SQL executed, SHA-256 (LF-normalized, 0 CR bytes, 22,459 bytes, 518
  lines): `d183e855422409865553631f4f28b94d86cf3bf3ca0f21242bc1a3310017d0c5`
- Ledger: **110** entries, head `20260721201734 harden_claim_rpc_privacy`.
  Neither `20260722012658` nor `20260722012707` present.
- **Absence confirmed** for every object the migration creates: the staging
  table, the four gateways, the source-bound matcher, the trigger function, the
  trigger, and the unique index.
- `public.match_import_player_names(uuid, text[])` baseline ACL:
  `postgres=X/postgres | authenticated=X/postgres | service_role=X/postgres`
  (md5 `d1707186c8e5f1577bde2338d7541aec`), owner `postgres`, SECURITY DEFINER.
- `public.games`: **zero** user triggers. `public.user_profiles`: 4 indexes.

## Pre-apply gates

**Collision preflight (COUNT-ONLY): `0`.** Zero colliding normalized-username
groups; 4 profiles total, 4 rows indexable. No username, row, or id was read.

**Privilege inventory.** 4 grants — all to `service_role` only, **none** to
`authenticated`/`anon`/`public`. 28 revokes — **every one targets an object this
migration creates**; none touches a pre-existing object.
`match_import_player_names` does not appear anywhere in the file. The only
`drop` is `drop trigger if exists … on public.games`, a no-op (games had no
triggers).

> The operator's written gate said "no revoke of anything"; the operator
> confirmed the intended meaning was **"no revoke against any pre-existing
> object"**, which is satisfied.

**Trigger safety.** The trigger is `AFTER UPDATE **OF status**` — narrower than
"every game update"; it fires only when `status` appears in the SET list. Its
body is a no-op unless `new.status='finalized' AND old.status IS DISTINCT FROM
new.status`, then performs one indexed delete on the staging table.
`games.status` is enum `game_status(draft, finalized)`, so `'finalized'` is a
valid label and cannot raise an enum-cast error.

**Dependencies verified:** `normalize_guest_username` is IMMUTABLE (index
expression legal); `game_log_imports` has the required UNIQUE `(game_id, id)`;
all four `private` helpers, both private identity tables, and
`player_import_aliases.identity_mode` exist.

## Operator confirmation

The operator typed `CONFIRM APPLY 20260722012658`, explicitly accepted the 28
self-targeting revokes as satisfying the gate, and directed that the
`service_role`/`anon` functional-index finding be recorded as a DEPLOY-STATE
follow-up. **No statement was executed against production before that
confirmation.**

## Post-apply verification — all passed

**Objects and privileges**

- `private.import_identity_staging`: exists, **RLS enabled**, 0 rows, grants to
  **`postgres` (owner) only** — no `anon`, `authenticated`, or `service_role`
  table grants.
- All four gateways (`stage_import_player_identity_evidence`,
  `attach_import_identity_staging`, `discard_import_identity_staging`,
  `resolve_staged_import_player_identity`):
  `anon=false authenticated=false service_role=true`.
- Both private functions (`import_identity_player_matches`,
  `delete_finalized_import_identity_staging`): `anon=false authenticated=false
  service_role=false` — not client-executable at all.
- `user_profiles_normalized_username_key`: `valid=true ready=true unique=true
  live=true`. `user_profiles` index count 4 → 5.
- `public.games` triggers: exactly one,
  `delete_finalized_import_identity_staging` (`tgenabled=O`).

**The live site is unaffected — the critical check**

- `public.match_import_player_names(uuid, text[])` still exists and its ACL is
  **byte-identical** to the pre-apply snapshot (md5
  `d1707186c8e5f1577bde2338d7541aec`); `authenticated` still holds EXECUTE,
  `anon` still does not.
- **Live `games` UPDATE still succeeds.** Verified inside an explicitly
  **rolled-back** transaction, exercising both trigger branches without
  mutating real data:
  1. writing `status` with its existing value — succeeded, trigger fired, no
     transition path taken;
  2. updating a non-`status` column — succeeded, trigger not fired;
  3. a staged probe row bound to a real game, then `finalized→draft`
     (staging rows stayed 1 — branch correctly skipped) then `draft→finalized`
     (staging rows → 0 — **DELETE branch fired correctly**).

  All identifiers were resolved server-side by subselect and never returned.
  The transaction was rolled back; post-rollback counts are unchanged: 48 games
  (0 draft, 48 finalized), 0 staging rows, 4 user_profiles, 28 players.
- Ledger: **111** entries (exactly +1), new entry at head.

## Known latent hazard (not breakage)

PostgreSQL **does** enforce `EXECUTE` on an index-expression function during
DML. Verified empirically on a rolled-back temp table: with the functional
index present, `service_role` and `anon` inserts both failed
`42501 permission denied for function normalize_guest_username`, while the same
inserts without the index succeeded. `private.normalize_guest_username` is
granted only to `postgres` and `authenticated`.

**Nothing is broken today.** Every current `user_profiles` writer is safe — the
sole app writer (`src/lib/db/user-profile-repo.ts`) uses the session
(`authenticated`) client, and all three DB writers (`handle_new_auth_user`,
`claim_player_profile`, `claim_player_profiles_by_name`) are `SECURITY DEFINER`
owned by `postgres`. Signup is unaffected; reads never evaluate index
expressions.

**The hazard is latent:** any future server code writing `user_profiles` via
`createSupabaseAdminClient()` (service_role) will fail with 42501. Recorded as a
DEPLOY-STATE follow-up — grant `EXECUTE` on `private.normalize_guest_username`
to `service_role` as a separately authorized change.

## Remaining sequence

1. ~~Apply the expansion migration~~ — **done, this document.**
2. **Deploy/port the server code that calls the gateways.** The four gateways
   are `service_role`-only and currently have **no caller in production**; the
   live site still uses the free-form matcher. Nothing consumes the staging
   table yet.
3. **Verify imports end-to-end** against the new source-bound path before
   retiring anything.
4. **Separately authorize and apply the contraction**
   `20260722012707_retire_free_form_import_name_matcher.sql`, which revokes
   `authenticated` access to the legacy free-form matcher.

> **The enumeration oracle is still OPEN.**
> `public.match_import_player_names(uuid, text[])` remains executable by
> `authenticated` and still accepts arbitrary source-name arrays. The expansion
> alone does not close it. It closes only when the contraction is applied —
> which must not happen until step 2 is deployed and step 3 verified, per the
> expand/contract rule (never revoke against a currently-deployed reader).

## Note for the next session

`DEPLOY-STATE.md` is canonically maintained at the repo root on the deploy-record
branches; the newest copy was on `fix/live-42501-on-capture-v2`. That content was
brought onto `redesign/tm-stats-dashboard-rebuild` **verbatim as a superset**
(nothing removed) plus the new "Production database changes" section and
follow-up. **Reconcile these copies** before the next deploy so the shared record
does not fork.
