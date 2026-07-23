# Phase 4 Step 4.3 - production catalog read of the guest-identity surface

Documentation only, on two lineages. **No production access of any kind was made
by the session that wrote this document**: no Supabase MCP call, no
`execute_sql`, no `list_migrations`, no `apply_migration`, no `wrangler`, no
`/api/deploy-info`, no production log read, no direct database connection. No
`src/`, migration, harness, or test file changed. No deploy, no push, no merge.

## Why this document exists

An authorized read-only session made the production ACL and signature read that
the `ID-READER-CONTRACT` step has carried as an outstanding precondition, and the
production-side catalog sweep for database-internal callers. It was then blocked
from recording either, because a concurrent writer held the redesign worktree.
Its results therefore existed only in the owner's session record - the same gap
that left both independent ID-READER audits uncommitted and unavailable to later
sessions.

That writer has since committed and both worktrees were clean before this record
was written. This document, the two state documents, and the canonical
`DEPLOY-STATE.md` entry put those results on the repository record.

## Provenance - read this before using any value below

Evidence class **[PRIOR]** for every production value, and for every production
value only.

- The reads were made on **2026-07-23 at 09:40:14 UTC** against Supabase project
  **`qjtwgrjjwnqafbvkkfex`** (`tm-stats`), **PostgreSQL 17.6**, by a
  read-only session under its own authorization.
- The migration ledger stood at **115 entries**, head **`20260723082917
  add_non_import_guest_identity_creator`**, at read time.
- **This document was written by a later documentation-only session that made no
  production read.** What is recorded here is a committed record of a live read,
  not a live read. It is the same evidence class as the ledger attestation
  transcribed onto this lineage on 2026-07-23, and as
  `PHASE-04-STEP-03-ID-READER-INDEPENDENT-AUDIT-TRAIL.md`.
- **Nothing here is [LIVE].** Do not cite any value below as a current live read.

### The re-derive requirement

**A session authoring the `ID-READER-CONTRACT` drop must re-derive the resolver's
signature live from the production catalog before writing any drop statement.**

A signature recorded from a report is not a signature read from the catalog.
`drop function if exists` against a signature that does not exist **succeeds
silently against nothing**: the function survives, and the session records it as
dropped. That is exactly the failure the ID-READER re-audit's FINDING A described
against a stale published handoff. The values in this document do not discharge
that requirement, and no later transcription of them will.

## What the read established

### A. The resolver - exactly one overload, in `public`, in no other schema

```
public.resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean)
```

Named arguments: `p_group_id uuid, p_identity_mode text, p_guest_username text,
p_guest_first_name text, p_guest_last_name text, p_selected_player_id uuid,
p_create_new boolean`.

| Property | Value |
|---|---|
| OID | `21767` |
| Owner | `postgres` |
| `prosecdef` | true |
| `proconfig` | `{search_path=""}` |
| `proacl` | `{postgres=X/postgres,service_role=X/postgres}` |
| `md5(prosrc)` | `2892f3189a15f04c35641473541fc5bd` |
| `length(prosrc)` | `7504` |
| Returns | `TABLE(player_id uuid, public_name text, resolution_state text, normalized_imported_value text)` |
| Extension membership | none |

**Production matches what both creating migrations declare, character for
character.** The repository half of that claim was verified locally for this
record rather than inherited - evidence class **[REPO]**:
`supabase/migrations/20260718050924_claimable_guest_identity_privacy.sql:267`
and
`supabase/migrations/20260718212339_remediate_guest_identity_privacy_boundary.sql:79`
declare the same seven arguments in the same order, both return the same four
columns, and every revoke/grant in either file names
`(uuid, text, text, text, text, uuid, boolean)`.

**Consequence.** Production was never ambiguous about this function's identity.
The recorded signature hazard is a **documentation** defect only - which is what
the re-audit's FINDING A found, against a published handoff rather than against
the database. The `prosrc` hash and length also match what the canonical ledger
recorded after the 2026-07-22 revoke, so the body has not moved since.

### B. The `service_role` EXECUTE discrepancy - RESOLVED

**`service_role` holds EXECUTE.** `proacl` is
`{postgres=X/postgres,service_role=X/postgres}`.

Confirmed two independent ways: the raw `proacl`, and `has_function_privilege`
evaluated across **11 roles**, which resolves `PUBLIC` membership and role
inheritance that a raw ACL read alone does not.

| Role | EXECUTE |
|---|---|
| `postgres` | yes |
| `supabase_admin` | yes |
| `service_role` | **yes** |
| `authenticated` | no |
| `anon` | no |
| `PUBLIC` | no |
| `authenticator` | no |

**The applied revoke migration's header was correct.**
`20260722153000_close_authenticated_guest_identity_oracle.sql` records the
pre-state ACL as `{postgres,authenticated,service_role}` and states that
"`postgres` and `service_role` deliberately keep EXECUTE". Production bears that
out.

**It is the creating migrations' grant lists that are an incomplete picture of
production** [REPO]. The only EXECUTE grants on this function anywhere in
`supabase/migrations/` are at `20260718050924:540` and `20260718212339:296`, and
both name `authenticated` alone. No migration in this repository grants EXECUTE
on the resolver to `service_role`.

**[INFERENCE] - label preserved, deliberately not upgraded.** The reading
session marked a **project-level default grant**, rather than any migration
statement, as the likely origin of the `service_role` grant, and recorded that it
had **NOT** queried `pg_default_acl`. The mechanism is therefore **not
established**. The ACL answer is a finding; the explanation for it is an
inference, and settling it would require a further authorized read. This
document does not upgrade that label, and neither should any document derived
from it.

**Where the discrepancy was recorded as outstanding.**
`PHASE-04-STEP-03-ID-READER-INDEPENDENT-AUDIT-TRAIL.md` states: "the recorded
discrepancy over whether service_role holds EXECUTE on the deployed
seven-argument resolver remains unsettled and requires an authorized production
ACL read, which the recorded decision makes a precondition of the contraction
step." **That document was deliberately not edited.** It records what two
read-only audits could reach; amending an audit trail is not the same as
answering the question it left open. The resolution is recorded on the canonical
`DEPLOY-STATE.md`, in `docs/CURRENT_STATUS.md`, in `docs/REDESIGN_STATE.md`, and
here.

### C. Database-internal callers - none found

Zero hits across **172** function bodies, **41** views, **0** materialized views
and **13** user triggers, in all **12** non-system schemas; and **zero**
`pg_depend` rows referencing OID `21767`.

Why the empty result is meaningful rather than a broken sweep:

- **Positive controls returned hits on the same query shapes.**
- **Blindness check 1:** no function in the database uses a SQL-standard body,
  so the `prosrc` text sweep has no gap.
- **Blindness check 2:** the resolver belongs to no extension.

**What the sweep does NOT cover. All four are open and must be carried wherever
this result is cited:**

1. Edge Functions as deployed.
2. Any consumer outside the database, including application source on any
   lineage.
3. Whether the commit production actually serves matches any swept tree.
4. Runtime-constructed dynamic SQL that never stores the function name
   literally.

This is the **production-side complement** to the repository-side sweep already
recorded in `docs/REDESIGN_STATE.md` under "the 7-argument drop's reader
dependency has no found caller", whose own first uncovered area was
"database-internal callers since the expand landed". That area is now covered.
The other three are not.

**"No caller was found" is not "the drop is safe."** The reader-deploy
precondition (`ID-READER-DEPLOY`) is **not** relaxed by this result, no blocker
is reclassified, and a further production-side sweep is required if production
changes before the drop is authored.

### D. The expand - verified applied, from the catalog

Exactly one overload of
`public.create_or_reuse_guest_identity(uuid,uuid,text,text,text,text,uuid,boolean)`.

| Property | Value |
|---|---|
| `prosecdef` | true |
| `proconfig` | `{search_path=""}` |
| `proacl` | `{postgres=X/postgres,service_role=X/postgres}` |
| `authenticated` / `anon` / surviving `PUBLIC` | none |
| `md5(prosrc)` | `99906055c863c4bebad13c21648a3058` |
| `length(prosrc)` | `7897` |

This matches the ACL the expand session recorded post-apply, **independently
re-derived by a different session**. The eight-argument signature is the one the
shipped migration creates, which confirms from the database side that the
re-audit's FINDING A was a stale document rather than a production ambiguity.

### E. The matcher - the adopted design is unbuilt, in production too

One overload only: `public.match_import_player_names(uuid,text[])`.

| Property | Value |
|---|---|
| `prosecdef` | true |
| `proconfig` | `{search_path=""}` |
| `proacl` | `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` |
| `authenticated` EXECUTE | **yes - the oracle is still reachable** |
| `md5(prosrc)` | `522f8cb0a2647c57e35da0a081f90480` |
| `length(prosrc)` | `4191` |

The **three-argument `service_role`-only overload** adopted by the 2026-07-22
owner decision exists **neither in the repository nor in production**. The
repository half was verified locally for this record rather than inherited -
**[REPO]**: every `create or replace function
public.match_import_player_names(` in `supabase/migrations/` declares the
two-argument `(p_group_id uuid, p_imported_names text[])` form, in
`20260720120000` only; the other references are the revokes and comments in
`20260722012707` plus test fixtures.

Its absence **from production** was previously an open unknown, because the
repository sweep could only speak for the repository. That gap is now closed.

**Disposition unchanged.** The matcher enumeration oracle remains **OPEN** behind
the interim coarsening `20260722144034`; contraction `20260722012707` remains
gated and unapplied; `ID-LEGACY-ORACLE` is unchanged.

**PD-1 is NOT resolved.** Whether to build the overload, retire the amendment, or
leave it dormant is the owner's decision. **[INFERENCE] boundary preserved:** the
production read does **not** distinguish superseded-without-record from
adopted-and-never-built, because an absent object is equally consistent with
both. `docs/redesign/DECISIONS.md` was not edited.

## Read-only attestation

As recorded by the reading session: it was read-only, issued **`SELECT`s only**,
read **no application table and no personal name**, and performed **no
Cloudflare action**. Nothing was created, altered, granted, revoked or dropped.
The migration ledger was unchanged by it.

## What this read did not authorize

Nothing. It grants no authority to:

- author or apply the `ID-READER-CONTRACT` drop of the 7-argument resolver;
- apply contraction `20260722012707`;
- deploy the moved source-bound reader (`ID-READER-DEPLOY` remains the active
  gate);
- build the three-argument matcher overload;
- resolve PD-1, PD-2 or PD-3;
- verify the Cloudflare worker version, or push either branch.

**No precondition was relaxed, no blocker's disposition was changed, no decision
was resolved, and Step 4.3 was not marked complete.**

## Limits of this record

- Every production value is **[PRIOR]**. The recording session made no
  production read and cannot attest that production still holds these values.
- The **[INFERENCE]** on the default-grant explanation is carried, not resolved.
  `pg_default_acl` was not queried by anyone.
- The caller sweep's four uncovered areas above are the limits of C.
- The **[REPO]** claims - the resolver's declared signature and the absence of a
  three-argument matcher overload - were verified locally against the working
  tree at `fa6f56177`. They speak for that tree only.
- This document records the read; it does not re-prove it.

## Documents reviewed, updated, or intentionally unchanged

**Reviewed:** `docs/CURRENT_STATUS.md`, `docs/REDESIGN_STATE.md`,
`docs/redesign/DECISIONS.md`, `docs/redesign/MASTER-RULES.md`,
`docs/redesign/PAGE-ARCHITECTURE.md`,
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`,
`docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-INDEPENDENT-AUDIT-TRAIL.md`,
`supabase/migrations/20260718050924_claimable_guest_identity_privacy.sql`,
`supabase/migrations/20260718212339_remediate_guest_identity_privacy_boundary.sql`,
`supabase/migrations/20260720120000_coarsen_import_name_match_reasons.sql`,
`supabase/migrations/20260722012707_retire_free_form_import_name_matcher.sql`,
`supabase/migrations/20260722153000_close_authenticated_guest_identity_oracle.sql`,
and the canonical `DEPLOY-STATE.md` on
`fix/live-compare-data-remove-declared-style`.

**Updated:**

- `DEPLOY-STATE.md` on `fix/live-compare-data-remove-declared-style` - the read
  entry, and the `service_role` discrepancy marked RESOLVED with its original
  text retained as history. Committed there as `0d866559`; **not pushed**.
- `docs/CURRENT_STATUS.md` - ACL-read and sweep preconditions recorded as
  satisfied, the exact signature carried, the re-derive requirement stated, fact
  E recorded against PD-1.
- `docs/REDESIGN_STATE.md` - the full record, the superseded "not read" note
  retained rather than deleted, the mutation-record section annotated, and this
  handoff added to the active handoff group.

**Intentionally unchanged:** `docs/redesign/DECISIONS.md` (resolving PD-1 is the
owner's act), `docs/redesign/MASTER-RULES.md`, `CLAUDE.md`,
`docs/AUTHORITATIVE_DOCUMENTS.md`,
`docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-INDEPENDENT-AUDIT-TRAIL.md`
(an audit trail records what those audits could reach), everything under
`src/**`, `supabase/**` and `scripts/**`, and every blocker row's disposition.

## Next action

None is authorized by this document. The active gate remains
`ID-READER-DEPLOY`, and it requires a new explicit assignment.
