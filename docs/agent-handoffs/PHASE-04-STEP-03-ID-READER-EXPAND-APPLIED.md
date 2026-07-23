# Phase 4, Step 4.3 — ID-READER-CLIENT EXPAND applied to production

Date: 2026-07-23
Branch: `redesign/tm-stats-dashboard-rebuild`
Production lineage: `fix/live-compare-data-remove-declared-style`
Production project: `tm-stats` / `qjtwgrjjwnqafbvkkfex`

## Outcome

`supabase/migrations/20260722160000_add_non_import_guest_identity_creator.sql`
is **APPLIED to production**, recorded in the live ledger as
**`20260723082917 add_non_import_guest_identity_creator`**.

This is the EXPAND step of an expand/verify/contract sequence and the first
schema-affecting production write of the redesign effort. **Exactly one
production mutation was performed.** No deploy, no push, no second statement.

## Authorization boundary

Authorized and performed:

- the single apply, via Supabase MCP `apply_migration`;
- production project-identity verification;
- the ledger read immediately before and immediately after the apply;
- a post-apply catalog read of the **new function only** — existence, overload
  count, and ACL.

Explicitly **not** authorized and **not** performed:

- **any read of `public.resolve_import_guest_identity`** — its ACL, definition
  or any other property. That read is the CONTRACT step's own precondition and
  a separate gate. **It remains outstanding.**
- any production table row or personal data read;
- any deploy, `wrangler` command, `/api/deploy-info` call, or Cloudflare action;
- any other migration, in particular contraction `20260722012707`;
- any backfill, repair, grant or revoke beyond the migration's own contents;
- any push, merge, tag, rebase or history rewrite.

**Applying this authorized nothing further.** Not the reader deploy, not the
drop of the seven-argument resolver, not the contraction. Each is a separate
gate and none is open.

## Evidence

### Local preconditions [GIT]

- Both worktrees clean, no tracked uncommitted changes: redesign at `10583af0a`,
  production lineage at `d8903873f` — the reported tips, each 1 ahead of origin.
- The production lineage had **not** advanced beyond its reported tip. Its last
  six commits are the saved-game player-label release and its documentation; no
  unnoticed code, migration or worker-configuration commit had landed.
- The migration file is **byte-identical** to the copy the independent re-audit
  examined at `60300532f`: blob `0d0ae105dd9305b345ab215e1f9b63b4c971740c` at
  `60300532f`, at `HEAD`, and in the worktree.

### The migration's contents, verified against the file [REPO]

Six statements, all scoped to the one function it creates:

1. `create or replace function public.create_or_reuse_guest_identity(uuid, uuid, text, text, text, text, uuid, boolean)`
2. `revoke execute … from public`
3. `revoke execute … from anon`
4. `revoke execute … from authenticated`
5. `grant execute … to service_role`
6. `comment on function …`

It drops nothing, alters nothing pre-existing, and revokes nothing any other
object holds. No out-of-scope statement is present.

**Transcription control.** The SQL sent to `apply_migration` was verified
byte-identical to the committed git blob (sha256
`d4ba3dbe9918e18b8e9f0eff76ad600748847a5878157b7e23b17033b8d37b32`, 15933
bytes) before the call. The working-tree copy differs from the blob only by
CRLF, a `core.autocrlf` checkout artifact — a first `grep -c $'\r'` reported no
CR and was **wrong**; a byte-level comparison caught it. The canonical committed
content is what was applied.

### Pre-apply production reads [LIVE]

- Project identity: `qjtwgrjjwnqafbvkkfex`, name `tm-stats`, `ACTIVE_HEALTHY`.
- Ledger: **114 entries**, head **`20260723014849 repair_snapshot_player_ids`** —
  matching the expected precondition exactly. This **confirms the earlier
  transcribed reconciliation was correct**, which that reconciliation could not
  establish for itself.
- No ledger entry carried version `20260722160000` or the name
  `add_non_import_guest_identity_creator`.
- `select count(*) … where proname = 'create_or_reuse_guest_identity'` → **0**.

### The apply [LIVE]

Applied 2026-07-23 **08:29:17Z** via Supabase MCP `apply_migration`, name
`add_non_import_guest_identity_creator`, contents unmodified. Result:
`{"success": true}`. No error, no partial application.

**Ledger version drift: YES.** Filename `20260722160000`, ledger
**`20260723082917`**. The apply tool stamped the UTC apply time over the
filename version, as it has for eight of the nine preceding known-source applies
on this lineage. Reconcile by **name**, never by version.

### Post-apply verification [LIVE]

- Ledger: **115 entries**, head **`20260723082917
  add_non_import_guest_identity_creator`**. **Exactly one entry added**, and it
  is the authorized apply.
- `public.create_or_reuse_guest_identity` exists in schema `public` with
  **exactly one overload**, arguments `p_group_id uuid, p_requesting_user_id
  uuid, p_identity_mode text, p_guest_username text, p_guest_first_name text,
  p_guest_last_name text, p_selected_player_id uuid, p_create_new boolean`. The
  distinct-name design that avoids the `42725` ambiguity hazard held.
- `prosecdef` = true, `proconfig` = `search_path=""`, as declared.
- **ACL exactly as the catalog reports it:
  `{postgres=X/postgres,service_role=X/postgres}`.**
  - `service_role` can execute. `postgres` is the owner and retains its own
    grant.
  - **`authenticated` cannot execute. `anon` cannot execute.**
  - **No `PUBLIC` grant survives** — an entry with no grantee would indicate one,
    and none is present. The file's `revoke … from public` is load-bearing
    because `CREATE FUNCTION` grants EXECUTE to PUBLIC by default, and it worked.

## Bookkeeping

### `src/lib/db/migration-ledger-map.ts`

- `20260722160000` **removed** from `GATED_UNAPPLIED`, which now holds **five**
  entries. A comment records that it left, and that leaving did not open any
  downstream gate.
- Pairing registered **by name** in
  `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME` as
  `add_non_import_guest_identity_creator: { fileVersion: '20260722160000',
  ledgerVersion: '20260723082917' }`, with the matching version-keyed entry.
- `20260723082917` appended to `PRODUCTION_LEDGER_VERSIONS`.
- `PRODUCTION_LEDGER_ATTESTATION` updated to **115 / `20260723082917` /
  `add_non_import_guest_identity_creator`, attested 2026-07-23**. Its provenance
  block is rewritten: unlike the revision it replaces, **these values were read
  live**, and the block records both the pre- and post-apply reads.
- Hazard class **re-confirmed `expansion`** against the SQL that actually landed
  and the post-apply catalog, and left as declared.

Figures re-derived rather than carried forward: 55 migration files, 55 hazard
declarations (16 contraction / 30 expansion / 9 neutral — unchanged, because the
apply added a ledger entry but no file), `GATED_UNAPPLIED` = 5,
`PRODUCTION_LEDGER_VERSIONS` = 115 literals, 115 unique, head `20260723082917`.

`docs/redesign/reference/MIGRATION-LEDGER-MAP.md` updated to match.

### Drift test

`npx.cmd vitest run src/lib/db/migration-ledger-map.test.ts` — **11/11 passed**,
both directions (`repo → ledger` and `ledger → repo`).

## The executable harness

**Decision: the mechanical treatment was already correct and was left alone.
Only the annotations changed.**

`20260722160000` moved from gated to applied, so the harness's *description* of
it became wrong — it was labelled "gated" throughout, and grouped with the
prepared-and-unapplied set. Its *treatment* did not become wrong.

The harness defers it from the production-history replay and applies it twice in
the deferred half, with the `ID-READER-CLIENT` BEFORE proof above the divider and
the AFTER proof below. That is exactly the pattern `run.sh` already uses for the
two other production-APPLIED-but-deferred files, `20260722012658` and
`20260720120000`: deferral is what lets a BEFORE/AFTER pair span the change on
one database. Replaying this file in the loop would satisfy the BEFORE proof's
precondition with the very function whose absence that proof measures, so the
pair would prove nothing.

Changes made, all annotation-only:

- the header's accounting of the deferred set now names **three** applied files,
  not two, and states the consequence plainly: half 1 is no longer "the state
  production is in today" for the guest-identity surface — since 2026-07-23 it is
  the state production was in immediately **before** the expand;
- the `NON_IMPORT_GUEST_MIGRATION` declaration records the apply, the ledger
  version, and that deferral is now for the BEFORE/AFTER reason rather than
  because it is unapplied;
- the replay and apply echo labels name its real production status.

**Which migrations are replayed did not change.** The recorded coverage gap
concerning the coarsened matcher was **not** acted on — it remains owner-gated.

`bash supabase/tests/executable/run.sh` — **exit 0**, end to end, twice. Proof
markers emitted: `ID_READER_CLIENT_BEFORE_REPRODUCED`,
`ID_READER_CLIENT_AFTER_PROVEN` (all 11 sections, including the two coverage
branches added after the re-audit), the retired-tombstone assertion,
`ALL_ASSERTIONS_PASSED`, `ALL_FIXTURE_ASSERTIONS_PASSED`.

The migration file itself was **not edited**. It is applied to production and
must not be.

## Known discrepancy, recorded not fixed

`supabase/tests/executable/non-import-guest-identity-before.sql` still describes
itself as measuring "the state production is in today", and
`non-import-guest-identity-after.sql` still calls `20260722160000` a "gated
migration". Both statements became stale when the migration was applied. **The
authorized edit set for this task covered `run.sh` only**, so those two files
were deliberately left unchanged rather than edited beyond authorization. The
correction is recorded in `run.sh`'s header, which points at this handoff.
Neither staleness affects what the proofs assert or whether they pass.

## Canonical deploy ledger

`DEPLOY-STATE.md` on `fix/live-compare-data-remove-declared-style`, commit
`5fe94f1f`. It records the migration, the landed ledger version, entry count
before and after, the project ref, the timestamp, the verified ACL, and
**explicitly that no deploy occurred and the reader remains undeployed**. The
now-stale "DB migration ledger head" row in the Current production table was
corrected in the same commit, since leaving it would have made the canonical
record wrong about production. **Not pushed.** No pointer stub was edited.

## State after this task

| Gate | Status |
|---|---|
| `ID-READER-CLIENT` expand | **APPLIED** — ledger `20260723082917` |
| `ID-READER-DEPLOY` | **ACTIVE GATE.** Reader undeployed; not authorized |
| `ID-READER-CONTRACT` | Gated. Precondition — the production ACL read on `resolve_import_guest_identity` — **outstanding** |
| `ID-LEGACY-ORACLE` / `20260722012707` | Gated and unapplied |
| `STEP-4.3-AUDIT` | Not completed |
| Step 4.3 | **NOT complete.** Not marked complete by this task |

No other blocker's disposition changed. `GUEST-NAME-COLLISION-TERMINAL` and
`DRAFT-NAME-RESIDUE` are untouched.

## Canonical documents reviewed or updated

Reviewed: `CLAUDE.md`, `docs/redesign/MASTER-RULES.md`,
`docs/CURRENT_STATUS.md`, `docs/REDESIGN_STATE.md`,
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`,
`src/lib/db/migration-ledger-map.ts` and its test,
`supabase/tests/executable/run.sh`, the migration file, and the canonical
`DEPLOY-STATE.md`.

Updated: `docs/CURRENT_STATUS.md`, `docs/REDESIGN_STATE.md`,
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`,
`src/lib/db/migration-ledger-map.ts`, `supabase/tests/executable/run.sh`, this
handoff, and `DEPLOY-STATE.md` on the production lineage.

Intentionally unchanged: `docs/redesign/MASTER-PLAN.md` — the expand apply
executed an already-approved, already-documented release sequence and changed no
project-wide goal, phase structure, durable architecture or governance rule.
`docs/redesign/DECISIONS.md` — no new durable decision was approved.
`docs/AUTHORITATIVE_DOCUMENTS.md` and
`docs/redesign/CLAUDE-PROJECT-SOURCES.json` — no authority moved and no new
durable cross-project guidance document was created.
`supabase/migrations/**` — the migration ships as applied and must not be edited.

## Do not do next without new authorization

Deploy the reader; drop the seven-argument resolver; apply `20260722012707`;
read the production ACL of `resolve_import_guest_identity`; push either branch;
carry `c7d6c203a` onto the redesign lineage; the tile backfill; guest
re-neutralization; the closure audit; Step 4.4.
