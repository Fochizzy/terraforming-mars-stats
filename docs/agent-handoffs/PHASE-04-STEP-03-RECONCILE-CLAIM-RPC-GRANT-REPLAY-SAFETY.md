# Reconcile the claim-RPC grant and replay safety in 20260718050924

Branch `fix/reconcile-claim-rpc-grant-replay-safety`, off redesign HEAD
`c5021a52f` (the `fix/carry-106-to-redesign` merge). Scope: repository-only
reconciliation. One read-only production ledger read plus one read-only
function-definition read for fidelity confirmation. **No production write, no
apply, no deploy, nothing pushed.** Production was already in the correct
state; this fixes the repository's record of it.

## The defect, measured

A clean-baseline replay of `supabase/migrations/` did not reproduce production.
Measured in a disposable PostgreSQL cluster at redesign HEAD `c5021a52f`,
before any edit:

| Function | EXECUTE ACL after replay | `authenticated` | `anon` |
| --- | --- | --- | --- |
| `list_claimable_player_profiles()` | `{postgres=X}` | **no** | no |
| `claim_player_profile(uuid)` | `{postgres=X}` | **no** | no |
| `claim_player_profiles_by_name()` | default (EXECUTE to PUBLIC) | yes | **yes** |

Production holds `authenticated=X` on all three and `anon` on none. So the
repository modelled a database in which no signed-in caller can claim a saved
player, and in which the bulk auto-link RPC is callable anonymously.

Two causes, both required for the fix:

1. `20260718050924_claimable_guest_identity_privacy.sql` ended with six revokes
   of EXECUTE on `list_claimable_player_profiles()` and
   `claim_player_profile(uuid)` from `public`, `anon` and `authenticated`
   (lines 525–530; the `authenticated` revokes were 527 and 530).
2. Nothing on this lineage restored the grant. Production restored it as ledger
   `20260720221937 grant_authenticated_claim_rpc_execute`, whose file lived only
   on `b11cae71b` (`fix/b05-claim-rpc-authenticated-grants`).
   `20260706190000_add_saved_player_claim_functions` grants nothing at all, and
   the #106 hardening grants nothing either.

## Premise re-derived (trust nothing)

Every prior claim was re-verified. All held; one correction is recorded below.

- **`20260718050924` is NOT gated.** `GATED_UNAPPLIED` holds five entries and
  this is not among them; `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION` maps
  `20260718050924 → 20260718181600`. The live ledger contains
  `20260718181600 claimable_guest_identity_privacy`. Only its *version string*
  is absent from the ledger; its *content* is applied.
  **Correction:** `DEPLOY-STATE.md` (lines 27 and 460) describes it as a
  "gated" migration awaiting reconciliation. That label is wrong and is itself
  an exposure path, because it invites an apply under the per-mutation
  protocol. `MIGRATION-LEDGER-MAP.md` now says so explicitly; `DEPLOY-STATE.md`
  is on the live-site lineage and was not edited here.
- **Revoke lines confirmed exactly** at 525–530, with the `authenticated`
  revokes at 527 and 530.
- **`20260720190000_grant_authenticated_claim_rpc_execute.sql` exists on
  `b11cae71b`** (blob `f1ad9cb9bfb29970a940704600a35902a9e5106f`) and was
  **absent** from redesign (50 migration files before this change).
- **Live ledger re-read read-only: 110 entries, head `20260721201734
  harden_claim_rpc_privacy`.** Exact set match against the recorded snapshot —
  no additions, no omissions, so `PRODUCTION_LEDGER_ATTESTATION` needed no
  numeric change. What changed is a *classification*, not the ledger.

## What changed

### 1. The revoke block is removed (`20260718050924`)

Lines 523–530 replaced by a comment recording why, in the file itself. Three
independent reasons, each sufficient:

- Registration-time claiming is live, and
  `GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` requires the confirmed-claim
  lifecycle. The file never touched `claim_player_profiles_by_name()`, so
  replaying the revoke disabled the explicitly confirmed, per-profile path
  while leaving the unconfirmed bulk auto-link path callable — a net privacy
  regression, not a tightening.
- `authenticated` EXECUTE is production state (ledger `20260720221937`), and
  the live claim flow depends on it: `/claim-player`, the auto-claim in
  `completeAuthSession`, and the roster "probably you" highlight.
- Ledger `20260721201734` hardened what those functions **disclose and accept**,
  never **who may call them**. It creates, drops and grants nothing. Caller set
  and disclosure are orthogonal; the hardening does not make the revoke safe.

Nothing else in the file changed. The diff is six deleted `revoke` lines plus
comments — verified by filtering the diff to non-comment lines.

**Consequence, deliberately accepted:** the file is no longer byte-identical to
the SQL applied as `20260718181600`. This is the single exception to the
renamed-drift byte-identity property, and it is recorded in both
`MIGRATION-LEDGER-MAP.md` and the `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION`
docstring so it can never be mistaken for drift.

### 2. Non-idempotency is preserved and documented as a safety property

The three unguarded `create unique index` statements and the unguarded
`create policy` keep no `if not exists` guard, and a comment above them states
why. The file's content is already applied under a different version, so a
`supabase db push` would try to run it again; unguarded, that attempt aborts on
`42P07`. **Guarded, it would succeed** — and by then it has already executed
`create table public.player_private_identities`, the Data-API-exposed table of
guest first names, last names and normalized personal names that
`20260718212339` (ledger `20260719191911`) moved into the `private` schema. It
would also revert the hardened definer functions from `20260719191911` and
`20260721035955`. The duplicate-object errors are the safeguard, not a defect.

No `if not exists` was added anywhere in the file — verified.

### 3. Assertions inverted and pinned (`claimable-guest-identity-privacy-migration.test.ts`)

The two assertions that **required** the revokes are gone. Two new tests:

- `never revokes execute on the saved-player claim RPCs` — asserts the absence
  of all six revoke forms (both functions × `public`/`anon`/`authenticated`), so
  the block cannot silently return.
- `stays deliberately non-idempotent so an accidental replay aborts` — asserts
  the four unguarded statements are still present and that no
  `create ... if not exists` form has appeared.

### 4. The grant migration is carried verbatim

`supabase/migrations/20260720190000_grant_authenticated_claim_rpc_execute.sql`,
copied with `git checkout b11cae71b -- <path>`. **Byte-identity proven by blob
hash, not inspection:** source and staged blob are both
`f1ad9cb9bfb29970a940704600a35902a9e5106f`. Line endings follow the repo
convention already in force (`i/lf w/crlf`). **The SQL was not altered.**

### 5. Ledger map registration

`src/lib/db/migration-ledger-map.ts`:

- `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION`: added
  `'20260720190000': '20260720221937'` (11 entries).
- `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME`: added
  `grant_authenticated_claim_rpc_execute`. Name-keyed for the same reason as
  #106 — `apply_migration` stamped the apply time over the filename version and
  nothing in the ledger points back at the file.
- `MIGRATION_HAZARD_CLASS`: added `'20260720190000': 'expansion'`.
- `PRODUCTION_ONLY_LEDGER_VERSIONS`: **removed** `20260720221937` (69 → 68). It
  cannot be both production-only and a renamed-drift target; the register test
  enforces that.
- `PRODUCTION_ONLY_ENTRY_PROVENANCE`: removed its `20260720221937` entry.
- `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION` docstring: records the one
  deliberate byte-divergence.

**Hazard class `expansion`, despite four `REVOKE` statements.** What it revokes
is the implicit `PUBLIC` EXECUTE that `CREATE FUNCTION` grants by default, plus
`anon` on `claim_player_profiles_by_name()`. No deployed reader was written
against the `PUBLIC` grant, and the functions' own `auth.uid() is null` gate
already rejected anonymous callers. Every real signed-in caller gains access
rather than losing it; nothing is stranded.

### 6. Harness pre-image for production-only ledger entry `20260712115539`

**Discovered during validation, and separately authorized.** The carried grant
acts on three functions. `claim_player_profiles_by_name()` is created by
production-only ledger entry `20260712115539 claim_players_by_name_and_username`,
which has **no repo file**, and no repo migration creates it before
`20260720190000`. The replay therefore aborted:

```
20260720190000_grant_authenticated_claim_rpc_execute.sql:44:
ERROR:  function public.claim_player_profiles_by_name() does not exist
```

Resolved with the pattern already established for `20260720021300`:
`supabase/tests/executable/production-preimage-20260712115539-claim-players-by-name.sql`,
installed by one `if` block in `run.sh` immediately before the grant migration
in the production-history half.

- **Body reconstructed from repository-local evidence only** — the
  `claim_player_profiles_by_name()` definition in
  `20260721173000_harden_claim_rpc_privacy.sql`. **Fidelity confirmed by a
  read-only hash comparison**, not asserted: `md5(prosrc)` is
  `b68036b3cec2ab8259889b48d64a7e67` at length 2925 on both the repository side
  and production. It is the currently deployed body.
- **The body is deliberately the current one, not the July-12 original.** What
  `20260712115539` actually created matched names with a bidirectional prefix
  `like` — the enumeration oracle #106 removed. That retired body is not
  reintroduced into this repository, not even as a fixture. Verified: the
  fixture contains no `like`, substring, wildcard or `split_part` matching; it
  uses whole-value equality with the 3-character floor and the 10-row cap.
  **Stated limitation:** the harness therefore does not exercise #106 as a
  behavioural before/after on this one function. It still exercises it as a
  genuine REPLACE, and the other two claim RPCs are unaffected.
- **The ACL models the pre-grant state** the grant migration was written
  against (EXECUTE to PUBLIC and anon alongside authenticated, as that
  migration's own header records), so its revokes remove something real and the
  post-replay ACL is a proof rather than an inherited default.
- Headed as a test fixture that must never enter `supabase/migrations/`, never
  be applied to production, and never be cited as evidence about production.

## Replay end state (the point of the whole change)

Measured in a disposable PostgreSQL cluster against the repository files at the
final commit, replaying the production-history half:

| Function | EXECUTE ACL | `authenticated` | `anon` | PUBLIC |
| --- | --- | --- | --- | --- |
| `list_claimable_player_profiles()` | `{postgres=X, authenticated=X}` | **yes** | no | no |
| `claim_player_profile(uuid)` | `{postgres=X, authenticated=X}` | **yes** | no | no |
| `claim_player_profiles_by_name()` | `{postgres=X, authenticated=X, service_role=X}` | **yes** | **no** | **no** |

Explicit grants, not an inherited `PUBLIC` default. This matches production's
shape, and it also closes the `anon` exposure the replay previously had on
`claim_player_profiles_by_name()`.

## Validation (at the final commit)

- `npx vitest run --no-file-parallelism` — **177 files / 973 tests pass**
  (baseline 971; +2 are the new pinning tests). The ledger gate passes all of
  its assertions: bidirectional completeness, `20260720190000` classified
  `expansion`, no `LEDGER_INCOMPLETE`, no `CLASSIFICATION_MISSING`.
- `bash supabase/tests/executable/run.sh` — **`ALL EXECUTABLE MIGRATION TESTS
  PASSED`**, exit 0, with the carried grant replaying in the production-history
  half behind its pre-image.
- `npx tsc --noEmit` — exit 0.
- `npm run lint` — the four baseline warnings (3× `no-img-element` in
  `score-profile-panel.tsx`, 1 unused `normalizeProfileHeadToHeadRow` in
  `analytics-repo.ts`). None new.
- `npm run build` — compiled successfully, 32 routes. (A fresh worktree has no
  gitignored `.env.local`; copied from the main worktree — an untracked local
  env file, not a code change.)
- `git diff --check` — clean.

## Boundaries held

No production write of any kind: no `apply_migration`, no writing
`execute_sql`, no DDL, no GRANT/REVOKE against production, no deploy, no
`wrangler`, nothing pushed. Production access was two read-only reads: one
`list_migrations` (ledger metadata) and one catalog `SELECT` returning the
definition and ACL of `claim_player_profiles_by_name()` for the fidelity
confirmation. No table row data and no personal data were read. `.codex/`
untouched. The main worktree was not modified.

Files changed: `20260718050924_claimable_guest_identity_privacy.sql` (revoke
block + two comments only), `claimable-guest-identity-privacy-migration.test.ts`,
`migration-ledger-map.ts`, `MIGRATION-LEDGER-MAP.md`, `run.sh` (one `if` block
plus two variables), plus two added files (the carried grant and the pre-image
fixture) and the closeout docs. No function body, view, or other migration was
modified.

## Still open

- **`20260718050924` must never be applied to production, under any protocol.**
  Its content is already live as `20260718181600`. `DEPLOY-STATE.md` still
  calls it "gated" on the live-site lineage; correcting that file was out of
  scope here.
- **`claim_player_profiles_by_name()` still links matching profiles without a
  per-profile confirmation.** Carried forward unchanged from the #106 record;
  removing that path needs a client change and separate authorization.
- **`docs/redesign/MASTER-PLAN.md` carries two stale statements, found here and
  deliberately not edited** — this task's authorization enumerated its closeout
  files and excluded the master plan. Both predate this change:
  1. It refers to "the gated identity/privacy migration" (the passage pointing
     at `docs/REDESIGN_STATE.md`). That is the incorrect "gated" label for
     `20260718050924`, now corrected in `MIGRATION-LEDGER-MAP.md`,
     `REDESIGN_STATE.md` and `DECISIONS.md`.
  2. It pins the ledger gate to "the 2026-07-21 read-only ledger attestation
     (108 entries)". The attestation has been 110 since the #106 carry; the
     master plan was not updated then.
  Both are durable, project-wide statements and should be corrected under their
  own authorization.
- **WS2, WS1 Layer B/C, converge, and the closure audit have not begun.**
