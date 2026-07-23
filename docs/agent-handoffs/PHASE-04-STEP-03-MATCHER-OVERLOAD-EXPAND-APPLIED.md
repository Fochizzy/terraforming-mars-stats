# Phase 4, Step 4.3 — matcher overload EXPAND applied to production

Date: 2026-07-23
Work item: `MATCHER-OVERLOAD-EXPAND-APPLY`
Branch: `redesign/tm-stats-dashboard-rebuild`
Production lineage: `fix/live-compare-data-remove-declared-style`
Production project: `tm-stats` / `qjtwgrjjwnqafbvkkfex`

## Outcome

`supabase/migrations/20260723130000_add_service_role_import_name_matcher_overload.sql`
is **APPLIED to production**, recorded in the live ledger as
**`20260723151221 add_service_role_import_name_matcher_overload`**.

This is the EXPAND step of the matcher's expand → deploy → verify → contract
sequence. **Exactly one production mutation was performed.** No deploy, no
merge, no push, no second statement, and no invocation of either overload.

**This is the FIRST application of this migration.** A 2026-07-23 report claimed
an earlier apply at 13:20:35Z under ledger `20260723132035`; forensics
established that none of it happened, and the pre-apply ledger this session read
live confirms it again — 115 entries, no `20260723132035`, no matcher-overload
entry. See `PHASE-04-STEP-03-MATCHER-APPLY-FORENSICS.md`.

## Authorization boundary

Authorized and performed:

- the single apply, via Supabase MCP `apply_migration`;
- production project-identity verification;
- the ledger read immediately before and immediately after the apply;
- a post-apply `pg_catalog` read of **every** overload of
  `public.match_import_player_names` — signature, `prosecdef`, `proconfig`,
  `proacl`, `md5(prosrc)`, `length(prosrc)`.

Explicitly **not** authorized and **not** performed:

- **calling either overload**, with real or test arguments. Verification here is
  from the catalog, never by invocation: invoking reads player data and may
  write an audit row;
- any application table row, personal name, or identifying value — `pg_catalog`
  only;
- any deploy, `wrangler` command, `/api/deploy-info` call, Cloudflare action, or
  production log access;
- any other migration, in particular contraction `20260722012707`;
- any drop, alter, or re-grant touching the existing two-argument function;
- any merge — in particular `fix/matcher-service-role-overload-callsite`;
- any push, tag, rebase, reset, or history rewrite.

**Applying this authorized nothing further.** Not the merge of the moved reader,
not the deploy, not the production verification, not the contraction. Each is a
separate gate and none is open.

## What "verified" means here, and what it does not

This session verified that the **object exists with the correct shape and ACL**.
It did **not** verify that the function returns matches.

The project record carries a requirement that verification show a **non-zero
match count and a non-null `userId`**. That requirement belongs to the
**post-deploy gate**, not to this apply — it settles on the first real import
after the moved reader ships, and satisfying it here would require invoking the
function, which is forbidden. It remains **outstanding**, and this handoff does
not discharge it.

PostgREST overload resolution between the two signatures likewise remains
**[INFERENCE]** and settles at the deploy gate, failing loudly as `PGRST203` if
wrong.

## Evidence

### Local preconditions, re-derived live [GIT]

- Redesign primary at `d63e6b0d781b7c1d14be611b2f4b7dc05c53c66e`, local ==
  `origin`, **no tracked or untracked changes**.
- Live worktree `C:\tmp\tm-live-compare-data` on
  `fix/live-compare-data-remove-declared-style` at
  `1b4c2350d9894f2fec2896d02b0ef9e057850453`, clean.
- Both re-confirmed immediately before the apply, after the session's initial
  stop and the owner's clarification. Neither had moved. No concurrent writer.
- Canonical `DEPLOY-STATE.md` "Deploy lock" row read as **Free**.

### The migration's contents, verified against the file [REPO]

Mechanically inventoried rather than read impressionistically: **1** `create`,
**0** `drop`, **0** `alter`. Every executable statement names
`(uuid, uuid, text[])` and only that signature:

1. `create or replace function public.match_import_player_names(uuid, uuid, text[])`
2. `revoke execute … from public`
3. `revoke execute … from anon`
4. `revoke execute … from authenticated`
5. `grant execute … to service_role`
6. `comment on function …`

The two-argument `(uuid, text[])` form appears only in header prose, never in an
executable statement. `p_requesting_user_id` carries **no default** and sits in
**position two**, which makes the defaulted form fail at CREATE time with 42P13
rather than applying and making live two-argument calls ambiguous (42725).

**Transcription control.** The SQL sent to `apply_migration` was proven
byte-identical to the committed git blob **before** the call: the payload was
written to a file and compared with `cmp` against
`git show HEAD:<path>`, both hashing to sha256
`6d2f4768ed5ac7afdbe3af31517e748f2ca5ad68d99ee106b3d8424cdf628f86`, 16216 bytes,
329 lines, **0 CR bytes**. The working-tree copy hashes differently
(`e71fab8921e4fe3d6a940911ac6d94b94703ea000d9bc24445a1637107104646`, 16545
bytes) — a CRLF checkout artifact, exactly the trap that has produced a false
pass in this project. `git hash-object` was deliberately **not** used, because it
applies the EOL clean filter and returns the committed blob hash regardless of
working-tree bytes.

### The ledger, read live before and after [LIVE]

| | Before | After |
|---|---|---|
| Entries | **115** | **116** |
| Head | `20260723082917 add_non_import_guest_identity_creator` | `20260723151221 add_service_role_import_name_matcher_overload` |

Exactly one entry was added, at the head. Every prior entry is unchanged.

Pre-apply deviation checks, all **CHECKED absences**: no entry at
`20260723132035`; no entry anywhere in `20260723130000`–`20260723140000`; no
entry naming a matcher **overload**. The two long-standing matcher-named
entries — `20260720021300 add_import_player_name_matching_rpc` and
`20260722144034 coarsen_import_name_match_reasons` — are expected history,
enumerated in `PRODUCTION_LEDGER_VERSIONS`, and are not deviations.

### The apply-time rename [LIVE]

| | |
|---|---|
| Filename version | `20260723130000` |
| Stamped ledger version | **`20260723151221`** |
| Name (the join key) | `add_service_role_import_name_matcher_overload` |
| Apply time UTC | **2026-07-23 15:12:21Z** |

The apply tool stamped the UTC apply time over the filename version, as it did
for `20260722012658`→`20260722132159` and `20260722160000`→`20260723082917`.
**The pairing is by NAME, not by version**, and is registered in
`APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME`.

### Post-apply catalog verification [LIVE]

`pg_catalog` only. **Two** overloads exist (`overload_count` = 2):

| | NEW `(uuid, uuid, text[])` | EXISTING `(uuid, text[])` |
|---|---|---|
| `prosecdef` | `true` | `true` |
| `proconfig` | `search_path=""` | `search_path=""` |
| `proacl` | `{postgres=X/postgres,service_role=X/postgres}` | `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` |
| `md5(prosrc)` | `4c91b87f9f88848e840a7fa60d848f21` | `522f8cb0a2647c57e35da0a081f90480` |
| `length(prosrc)` | 5657 | 4191 |
| `provolatile` | `s` (stable) | `s` (stable) |
| owner | `postgres` | `postgres` |

The new overload carries **no `authenticated`, no `anon`, and no surviving
PUBLIC grant** — the load-bearing `from public` revoke removed CREATE FUNCTION's
implicit grant.

**The existing two-argument function is UNCHANGED.** Its `md5(prosrc)`
`522f8cb0a2647c57e35da0a081f90480` and `length(prosrc)` `4191` are **identical
to the baseline** recorded by the authorized catalog read of 2026-07-23 at
09:40:14Z, and its ACL still includes `authenticated`. The apply disturbed
nothing the deployed Worker depends on.

## Rollback — recorded, NOT executed, NOT authorized

The reversal of this apply is a single statement dropping the one function it
creates:

```sql
drop function public.match_import_player_names(uuid, uuid, text[]);
```

**It was not executed and is not authorized in this session.** It is recorded so
a future authorized session does not have to derive it under pressure. It must
not be run while the moved reader is deployed, because that reader calls exactly
this signature.

## No deploy occurred, and nothing calls the new function

- **No deploy of any kind accompanied this apply.** The worker version, source
  commit, and deploy rows in `DEPLOY-STATE.md` are unchanged.
- **Nothing in production calls the three-argument overload.** The moved reader
  lives on `fix/matcher-service-role-overload-callsite` (`5894c874a`) on the
  live-site lineage and is **neither merged nor deployed**.
- The deployed Worker continues to call the **two-argument** form as
  `authenticated`, which is why that form was left untouched and why the
  contraction stays gated.

## Remaining gates — three, then the contraction

Applied is **not** deployed and is **not** closed.

1. **Merge** `fix/matcher-service-role-overload-callsite` into the live-site
   lineage. Not authorized.
2. **Deploy** the moved reader. Not authorized.
3. **Verify** in production — the non-zero match count and non-null `userId`
   requirement above. Not authorized.
4. Only then, **contraction `20260722012707`**, which revokes `authenticated`
   EXECUTE on the two-argument form. Not authorized, and applying it before
   step 2 would break every import and both manual player-resolution paths with
   42501.

Step 4.3 is **not** complete and no blocker's disposition changed.

## Canonical documents reviewed, updated, or intentionally unchanged

Reviewed:

- `docs/REDESIGN_STATE.md`, `docs/CURRENT_STATUS.md`
- `docs/redesign/DECISIONS.md` — the 2026-07-22 interim service-role re-gate
  amendment; the identifier-verification entry
- `docs/redesign/reference/MIGRATION-LEDGER-MAP.md`
- `src/lib/db/migration-ledger-map.ts`
- `docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-APPLY-FORENSICS.md`
- `docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-MERGE-AND-RECORD-CORRECTIONS.md`
- canonical `DEPLOY-STATE.md` via
  `git show fix/live-compare-data-remove-declared-style:DEPLOY-STATE.md`

Updated in this change:

- `src/lib/db/migration-ledger-map.ts` — attestation to 116 /
  `20260723151221`; `20260723151221` added to `PRODUCTION_LEDGER_VERSIONS`;
  `20260723130000` moved out of `GATED_UNAPPLIED` and registered in
  `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION` and
  `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME`; hazard class re-confirmed
  against the post-apply catalog and left `expansion`
- `docs/REDESIGN_STATE.md`, `docs/CURRENT_STATUS.md`
- `DEPLOY-STATE.md` on the production lineage (separate commit, separate branch)
- this handoff

Intentionally unchanged:

- `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` — **reviewed and NOT updated
  by the apply session, because its brief did not authorize the edit.** That brief
  named `src/lib/db/migration-ledger-map.ts` as the file to reconcile and did not
  name this document, and its forbidden list then barred editing any file outside
  the named set. The omission left this document asserting the pre-apply state —
  115 entries, head `20260723082917`, `20260723130000` gated as the sixth entry of
  `GATED_UNAPPLIED` — while the executable source of truth beside it read 116 /
  `20260723151221`. **The remediation of 2026-07-23 updated it** to the applied
  state in eight superseded-and-retained edits, and the two files now agree on
  entry count, head version and name, the applied status of `20260723130000`,
  `GATED_UNAPPLIED` membership, and the renamed-drift mapping count (16 on both
  sides). See the dated correction block below.
- `docs/redesign/DECISIONS.md` — the amendment already governs this sequence;
  this apply is its execution, not a new durable decision
- `docs/redesign/MASTER-PLAN.md` — no project-wide direction changed; an
  authorized apply within an already-approved sequence is implementation status
- the migration file itself, and every other gated migration

## Correction — 2026-07-23, record only. The apply is unaffected

**Nothing in this section changes what was applied, re-verifies it, or reopens
it.** The apply of `20260723130000` at 15:12:21Z as ledger `20260723151221`
**remains accepted exactly as recorded above.** No production access, migration,
deploy, merge or push was involved in this correction, which is documentation-only
and local.

**What prompted it.** An independent audit returned **FAIL on the record** — not
on the apply — and further defects were found on review and by the remediation
sessions themselves. The common cause is that an apply makes a fact stale in more
documents than the applying session was authorized to touch.

**What it changed.**

1. `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` was brought to the applied
   state, as described in the disposition above.
2. Present-tense claims falsified by this apply — that production stands at 115,
   that the head is `20260723082917`, that `20260723130000` is gated or unapplied
   — carry **SUPERSEDED** banners in `docs/REDESIGN_STATE.md` and
   `docs/CURRENT_STATUS.md`, with the original text retained. Claims falsified by
   the **earlier** guest-identity apply of 08:29:17Z (`20260722160000` described as
   gated and unapplied) are bannered with **that** timestamp, not this one.
3. **Gap 1e is recorded as NARROWED, NOT CLOSED.** The pre-registered rule that it
   would close "as a side effect of the eventual authorized apply's own catalog
   verification" is **withdrawn as unsound**: this apply's post-apply catalog read
   cannot distinguish an overload it created from one `create or replace` silently
   replaced, because both leave two overloads and neither is reported. That
   reasoning does **not** disturb anything this handoff asserts — the catalog read
   recorded above is accurate as to shape and ACL, which is all it ever claimed.
   The rule is neutralized at its origin in
   `docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-APPLY-FORENSICS.md`.
4. The planning-layer defects behind this and the preceding work items are recorded
   in
   `docs/agent-handoffs/PHASE-04-STEP-03-PLANNING-LAYER-ASSIGNMENT-DEFECTS.md`.

**Unchanged:** the apply itself; every catalog and ledger value above; that
**applied is not deployed and not closed**; the three remaining gates and the
contraction after them; Step 4.3 is not complete; no blocker's disposition moved.
**No second handoff was created for this apply** — one work item, one canonical
record, which is this document.

## Prompt-integrity note

The session's brief contained a self-contradiction at its precondition step: the
stop clause forbade "any matcher-named entry" while the same step required a
ledger state that necessarily contains two. Per the project's prompt-integrity
rule the session **stopped and reported both passages rather than resolving it**,
and the owner corrected the clause — the governing predicate is an entry naming
the matcher **overload**. Recorded because the correct-but-silent resolution of a
prompt conflict is indistinguishable at review time from invention.
