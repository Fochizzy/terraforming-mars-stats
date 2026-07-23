# TM Stats Current Status

Last updated: 2026-07-23

This is the concise current-work router. `docs/REDESIGN_STATE.md` retains the
full project history and detailed state. Update both files in the same change
whenever the current phase, release boundary, next work item, or production
migration state changes.

## Current phase

Phase 4, Step 4.3 - Import Validation, Evidence Review, and Claimable Guest
Identity. The step remains **blocked at its release boundary**. Step 4.4 has not
started.

**The EXPAND step is applied.** Migration `20260722160000` was applied to
production on 2026-07-23 as ledger `20260723082917`. **`ID-READER-DEPLOY` is now
the active gate** — the moved reader is still undeployed and nothing in
production calls the new function.

**A SECOND expand now exists, built but NOT applied.** Under owner decision
**PD-1** of 2026-07-23, the three-argument `match_import_player_names` overload
was built locally as gated migration `20260723130000`, with its reader moved on
the live-site lineage. **Nothing was applied, deployed or pushed**, and its
apply, deploy, production verification, and the contraction `20260722012707` are
four separate gates, none of them opened. Do not confuse the two expands: they
share the expand/deploy/verify/contract shape but are different migrations,
different functions, and different evidence.

## Current objective

Preserve the source-bound import-identity design and close the remaining
release sequence safely: deploy and verify the compatible reader only under a
new explicit assignment, then drop the deployed 7-argument resolver, and apply
the legacy-matcher contraction only after its separate gate is authorized. The
expand half of that sequence is done; every remaining step is still gated.

## Completed and executably verified

- The source-bound import-identity replacement was built locally and remediated
  after independent review.
- Production applied `add_source_bound_import_identity_staging` as ledger
  version `20260722132159` from repository migration `20260722012658`.
- Production applied the interim reason-coarsening migration as ledger version
  `20260722144034` from repository migration `20260720120000`.
- Production revoked `authenticated` execution of
  `resolve_import_guest_identity` as ledger version `20260722153233`; the
  post-apply ACL and one-target-only change were independently verified.
- **Production applied `add_non_import_guest_identity_creator` as ledger version
  `20260723082917` from repository migration `20260722160000` on 2026-07-23 at
  08:29:17Z** — the EXPAND half of the `ID-READER-CLIENT` repair, and the first
  schema-affecting production write of the redesign effort. **No deploy of any
  kind accompanied it.** Verified read-only immediately afterwards: exactly one
  overload of `public.create_or_reuse_guest_identity` exists, and its ACL is
  `{postgres=X/postgres,service_role=X/postgres}` — no `authenticated`, no
  `anon`, and no surviving `PUBLIC` grant. It dropped, altered and revoked
  nothing pre-existing; the deployed 7-argument `resolve_import_guest_identity`
  is untouched. Record:
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-EXPAND-APPLIED.md`.
- Production ledger attestation is now **115 entries with head `20260723082917
  add_non_import_guest_identity_creator`**, and **these values were read live**
  by the applying session, both before and after the apply. The pre-apply read
  returned 114 with head `20260723014849`, **confirming the 2026-07-23
  transcribed reconciliation below was correct** and that production had not
  moved in between. Exactly one ledger entry was added.
- The prior attestation was **114 entries with head `20260723014849
  repair_snapshot_player_ids`**, reconciled on 2026-07-23. Production applied
  that migration ~01:48Z on 2026-07-23 as the data half of the live-site
  saved-game player-label release, and for one day this lineage held **no
  record of it in any form** — no file, no ledger-map entry, no documentation
  row — while the attestation still read 113 with head `20260722153233`. The
  drift is closed: `20260723014849` is registered **production-only** with
  provenance, deliberately without carrying its file, because it defines no
  database object and so leaves no stale definition here for a redesign deploy
  or `db diff` to reproduce. That is the condition the ledger #106 carry existed
  to fix, and it is absent. Derived hazard would be `neutral`; a production-only
  entry carries no declaration. **The attested values were not read from
  production by the reconciling session** — they are transcribed from the
  canonical `DEPLOY-STATE.md` on the production lineage, where an authorized
  session recorded two independent live reads on 2026-07-23. Re-attest live
  before any production-sensitive action.
- **The expand apply of `20260722160000` had its ledger precondition satisfied
  by that reconciliation, and the apply has since been authorized and performed**
  (see the entry above). The precondition required the attested ledger to match
  production, and it was false by exactly one migration; a worker session
  stopped on it. The live pre-apply read then confirmed the reconciliation exact.
- The independent audit's **FAIL** on the `ID-READER-CLIENT` expand work is
  answered. `FINDING-1` (the divergent candidate-counting and auto-selection
  predicates) and `FINDING-2` (`p_requesting_user_id` declared last and
  defaulted) are remediated, executably proven, and **merged** into
  `redesign/tm-stats-dashboard-rebuild` on 2026-07-23. `FINDING-4` /
  `DRAFT-NAME-RESIDUE` remains **open and unfixed**, but is no longer
  uninvestigated: a read-only investigation of 2026-07-23 settled its
  reachability **by execution** and found the audit had understated it on three
  counts. See the blocker table.
- A **targeted re-audit** of that merged remediation was run on 2026-07-23 and
  returned **FAIL** on one MEDIUM documentation defect and three LOW items. It
  found the SQL and TypeScript remediation itself correct and complete. All four
  findings are now addressed and the FAIL is answered; two of them were proven
  vacuous test gaps and now carry mutation-proven assertions. The re-audit left
  no handoff in this repository — its verdict reached the follow-up session as
  the assignment text, and every defect was independently re-derived from code
  before being corrected. `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-COVERAGE-AND-SIGNATURE-RECORDS.md`
  is the record.
- **Both independent audits are now on the repository record.** Both were
  read-only and forbidden from writing to the repository they audited, so
  neither report was ever committed and their findings survived only indirectly
  through the remediation handoffs.
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-INDEPENDENT-AUDIT-TRAIL.md`
  records each audit's target, verdict, findings, cleared properties, and stated
  limits, so the closure audit can establish what was independently audited and
  what was cleared. Evidence class **[PRIOR]** — it records the audits rather
  than re-proving them, and changes no finding's disposition. **That trail is a
  historical record of what each audit found, and is deliberately NOT
  rewritten.** Where later evidence has overtaken it, the correction belongs in
  the current record instead: the 2026-07-23 execution superseded `FINDING-4`'s
  characterisation on three counts — reachability, scope and lifetime — and
  traced its "must never enter draft snapshots" phrasing to a code comment about
  a different field rather than to a contract clause. That correction is recorded
  against `DRAFT-NAME-RESIDUE` in the blocker table below.

## In progress

- No product implementation, migration, deployment, or production operation is
  currently authorized by this status document.
- Authoritative branch: `redesign/tm-stats-dashboard-rebuild`.
- The compatible source-bound redesign reader is **not deployed**. This is now
  the active gate, `ID-READER-DEPLOY`, and it requires a new explicit
  assignment.
- Migration `20260722160000` is **APPLIED** (ledger `20260723082917`,
  2026-07-23). Applying it authorized nothing further: it did not authorize the
  reader deploy, the `ID-READER-CONTRACT` drop, or contraction `20260722012707`.
  Nothing in production calls the function it added.
- **The production ACL read on `resolve_import_guest_identity` is SATISFIED as
  of 2026-07-23 09:40:14Z.** It was the stated precondition of the CONTRACT step
  and was deliberately **not** performed by the expand session, which held no
  authorization for it; a separately authorized read-only session has since made
  it. **Evidence class [PRIOR]** — see "The production catalog read" below for
  the full result, the exact signature the drop must name, the four areas the
  caller sweep does not cover, and the requirement to **re-derive the signature
  live** before authoring any drop statement. **The reader-deploy precondition
  (`ID-READER-DEPLOY`) is NOT relaxed by this and remains in force.**
  **SUPERSEDED 2026-07-23 as to that last sentence, original retained.** An
  owner decision has since replaced the reader-deploy precondition on the
  7-argument drop with three preconditions — re-derive the signature live,
  re-run the catalog sweep, and verify the deployed edge functions. See "The
  seven-argument drop's preconditions" below. **`ID-READER-DEPLOY` itself is not
  dissolved and remains the active gate for the reader deploy**; it is simply no
  longer a precondition of that drop.
- **OWNER DECISION 2026-07-23 — the 7-argument drop's reader-deploy precondition
  is SUPERSEDED, replaced by three.** Recorded verbatim in
  `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 - The seven-argument resolver
  drop: replacing the reader-deploy precondition", which is authoritative over
  every summary of it in this file. **It authorizes nothing** — not the drop, not
  a deploy, not a migration — and changed no blocker's `Blocking` value. Detail
  under "The seven-argument drop's preconditions" below.
- **The fresh production-side catalog sweep for database-internal callers is
  also SATISFIED as of that same read**, and found **none**. It does **not**
  cover Edge Functions as deployed, consumers outside the database, whether the
  swept commit is what production serves, or runtime-constructed dynamic SQL. A
  further sweep is required if production changes before the drop is authored.
- `GATED_UNAPPLIED` now holds **five** entries; `20260722160000` left it on
  2026-07-23 and is recorded as renamed drift instead.
- **Known harness coverage gap, open and deliberately not fixed.**
  `supabase/tests/executable/match-oracle-post-contraction.sql` is referenced by
  nothing, so the coarsened `match_import_player_names` disclosure and its
  candidate-input bound are asserted nowhere: a regression re-widening the
  disclosed `match_reason` / `match_score`, or removing the input bound, would
  pass `run.sh` clean. The previously recorded reason for excluding
  `20260720120000` from the replay was **refuted** by measurement. Evidence class
  **[PRIOR]** — measured in
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md` §4,
  not re-verified since. The closure audit must account for it; wiring the file
  in requires separate authorization. Full record in `docs/REDESIGN_STATE.md`.
- Tooling only, **integrated**: `fix/deploy-state-planning-pack-sync` is merged
  into `redesign/tm-stats-dashboard-rebuild` — both branches are at
  `944bdad0d`. The planning pack reads `DEPLOY-STATE` from
  `fix/live-compare-data-remove-declared-style` through Git instead of an
  untracked working-tree cache, and the ordinary desktop launcher and scheduled
  task now work with **no `--source-manifest` override**. The
  "until it is merged … fail closed" limitation recorded here and in the handoff
  described the pre-merge state and no longer applies. Handoff:
  `docs/agent-handoffs/DEPLOY-STATE-PLANNING-PACK-GIT-SOURCE.md`.
- Do not merge `fix/planning-pack-deploy-state-source` (`52373ff79`). It is a
  superseded parallel attempt at the same repair; see `docs/REDESIGN_STATE.md`.

### The production catalog read (2026-07-23 09:40:14Z) — evidence class [PRIOR]

An authorized read-only session issued `SELECT`s only against
`qjtwgrjjwnqafbvkkfex` (PostgreSQL 17.6; ledger 115 entries, head
`20260723082917`). It read **no application table and no personal name**,
performed **no Cloudflare action**, and mutated nothing. **These values are
recorded from that session's report by a later documentation-only session that
made no production read of its own** — they are a committed record of a live
read, not a live read. Full record: the canonical `DEPLOY-STATE.md` entry
"READ-ONLY catalog read of the guest-identity surface", `docs/REDESIGN_STATE.md`,
and `docs/agent-handoffs/PHASE-04-STEP-03-GUEST-IDENTITY-PRODUCTION-CATALOG-READ.md`.

**The exact signature the CONTRACT drop must name — and it must be re-derived
live before use:**

```
public.resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean)
```

Named arguments `p_group_id uuid, p_identity_mode text, p_guest_username text,
p_guest_first_name text, p_guest_last_name text, p_selected_player_id uuid,
p_create_new boolean`. **Exactly one overload**, in `public` and no other schema;
OID `21767`; owner `postgres`; `prosecdef` true; `proconfig` `{search_path=""}`;
`md5(prosrc)` `2892f3189a15f04c35641473541fc5bd`, length `7504`; returns
`TABLE(player_id uuid, public_name text, resolution_state text,
normalized_imported_value text)`; member of no extension. Production matches
what both creating migrations declare, character for character (**[REPO]**,
re-verified `20260718050924` and `20260718212339`), so production was never
ambiguous and the recorded signature hazard is a **documentation** defect only.

**A signature recorded from a report is not a signature read from the catalog.**
`drop function if exists` against a wrong signature **succeeds silently against
nothing**: the function survives while the session records it as dropped. The
drop session must re-derive the signature from the live catalog before writing
any drop statement. This requirement is not discharged by the values above.

**ACL — the `service_role` discrepancy is RESOLVED.** `proacl` is
`{postgres=X/postgres,service_role=X/postgres}`; `service_role` **holds**
EXECUTE, confirmed both by the raw ACL and by `has_function_privilege` across 11
roles, which resolves `PUBLIC` and inheritance. `authenticated`, `anon`,
`PUBLIC` and `authenticator` hold **none**. The applied revoke migration's header
was **correct**; the creating migrations' grant lists were the incomplete
picture. A **project-level default grant** rather than a migration statement is
the likely origin — **[INFERENCE], and it stays [INFERENCE]**, because
`pg_default_acl` was **not** queried.

**Database-internal callers — none found.** Zero hits across 172 function
bodies, 41 views, 0 materialized views, 13 user triggers in 12 non-system
schemas, and zero `pg_depend` rows on OID `21767`. Positive controls returned
hits on the same query shapes; no function uses a SQL-standard body, and the
resolver belongs to no extension, so the `prosrc` sweep has no blind spot.
**Not covered, all four open:** Edge Functions as deployed; consumers outside
the database, including application source on any lineage; whether the commit
production serves matches any swept tree; and runtime-constructed dynamic SQL.
**This is not authorization to drop, and `ID-READER-DEPLOY` still stands.**
**SUPERSEDED 2026-07-23 as to the second clause, original retained.**
`ID-READER-DEPLOY` still stands **as the reader-deploy gate**, but it is no
longer a precondition of the 7-argument drop — see "The seven-argument drop's
preconditions" below. The first clause is unchanged: **this is still not
authorization to drop.**

**The expand is verified applied from the catalog**, independently of the
applying session: one overload of
`public.create_or_reuse_guest_identity(uuid,uuid,text,text,text,text,uuid,boolean)`,
`prosecdef` true, `proconfig` `{search_path=""}`, `proacl`
`{postgres=X/postgres,service_role=X/postgres}`, no `authenticated`/`anon`/
`PUBLIC`, `md5(prosrc)` `99906055c863c4bebad13c21648a3058`, length `7897`.

## Next work item

No next product action is automatically authorized. A new explicit assignment
must define and authorize the release continuation. The currently evidenced
sequence is:

1. **done locally and merged, not applied** — the remaining redesign call site is
   corrected. Gated `20260720100000` is retired as a no-op tombstone and new
   gated `20260722160000` adds a service_role-only replacement authorized on an
   explicit requesting-user id. Both are unapplied. The remediation answering the
   audit FAIL is merged into `redesign/tm-stats-dashboard-rebuild` as of
   2026-07-23;
2. **done 2026-07-23 — the targeted re-audit of the remediated work ran before
   the expand gate and returned FAIL.** It confirmed the SQL and TypeScript
   remediation of `FINDING-1` and `FINDING-2` correct and complete, and failed on
   one MEDIUM documentation defect (an active handoff stating a function
   signature that does not exist) plus three LOW items (release-sequence
   numbering, and two branches asserted nowhere). All four are addressed; the
   two coverage gaps now carry assertions proven to fail under the exact
   mutations that previously left the harness at exit 0. The recorded harness
   coverage gap above is **unchanged and still open** — `run.sh` exit 0 still
   does not cover the coarsened `match_import_player_names` disclosure or its
   candidate-input bound, and wiring that in was deliberately not done;
3. **DONE 2026-07-23 — `20260722160000` was applied** under explicit
   single-mutation authority and the per-mutation protocol, landing as ledger
   `20260723082917`. Pre-apply ledger 114 / `20260723014849`, post-apply 115.
   Exactly one entry added, exactly one overload created, ACL verified
   `{postgres,service_role}` only. The apply-time bookkeeping in 3b below was
   completed in the same session. **No deploy occurred**, and no second
   production statement was issued. The two notes below are retained because
   they remain live operational facts, not because the step is outstanding:

   **3a. Rollback SQL for the expand step.** The migration creates exactly one
   object, so its reversal is a single statement:

   ```sql
   drop function if exists public.create_or_reuse_guest_identity(
     uuid, uuid, text, text, text, text, uuid, boolean
   );
   ```

   Nothing else references it: it is new and additive, and the deployed
   7-argument `resolve_import_guest_identity` is left untouched. This rollback
   is valid only in the window between applying the migration and deploying the
   moved reader (item 4 below). Once that reader is live it depends on this
   function, and reversal becomes a deploy rollback rather than a migration
   rollback.

   **3b. Apply-time ledger bookkeeping — COMPLETED 2026-07-23.** The apply tool
   stamped the UTC apply time over the filename version, exactly as predicted:
   the file landed as ledger `20260723082917`, **not** `20260722160000`. Version
   is the wrong join key for a renamed apply; the pairing is by NAME. All of the
   following were done in the applying session:

   - read the ledger version the apply actually produced — `20260723082917`;
   - registered the pairing under the key
     `add_non_import_guest_identity_creator` in
     `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME`, and the file-to-ledger
     entry in `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION`, both in
     `src/lib/db/migration-ledger-map.ts`;
   - removed `20260722160000` from `GATED_UNAPPLIED` in the same file;
   - re-attested the production ledger live (115 entries, head
     `20260723082917`) and recorded it on the canonical `DEPLOY-STATE.md`;
   - ran `npx.cmd vitest run src/lib/db/migration-ledger-map.test.ts` — passing.
4. **ACTIVE GATE — `ID-READER-DEPLOY`.** Deploy and production-verify the moved
   redesign reader under explicit authority. Not authorized; not started;
   **applying the expand did not authorize it**. **Amended 2026-07-23, and NOT
   dissolved:** this item still stands in full — the redesign reader is still
   undeployed and will eventually need to ship, and it still gates step 6 — but
   by owner decision it is **no longer a precondition of step 5**;
5. only then author and apply the CONTRACT drop of the deployed 7-argument
   `resolve_import_guest_identity`, after a fresh zero-caller re-sweep. **Its
   ACL-read precondition is now SATISFIED** — an authorized read-only session
   made it on 2026-07-23 at 09:40:14Z, and the production-side catalog sweep for
   database-internal callers was made at the same time and found none; both are
   recorded above under "The production catalog read", evidence class
   **[PRIOR]**. **Step 4 is unchanged and still gates this step**: satisfying the
   ACL read and the sweep does not relax `ID-READER-DEPLOY`, and the sweep's four
   uncovered areas remain open. **The signature must be re-derived live from the
   catalog before any drop statement is written**.
   **SUPERSEDED 2026-07-23 as to "only then" and as to "Step 4 is unchanged and
   still gates this step", original text retained.** By owner decision, step 4 no
   longer gates this step. Its three replacing preconditions — re-derive the
   signature live, re-run the catalog sweep, verify the deployed edge functions —
   are stated under "The seven-argument drop's preconditions" below, and the last
   sentence above is now the first of them. **The step is still unauthorized**;
   this changes what must be true before it may be authored, not whether it may
   be;
6. separately authorize and apply contraction migration `20260722012707` only
   after reader verification; and
7. run a fresh closure audit before any Step 4.4 assignment.

### Note (2026-07-23): steps 4–6 span TWO distinct expand/contract pairs

Recorded as a clarification. The sequence above is **not** restructured,
renumbered, or relaxed. "Deploy and verify the compatible reader" has been used
across this project's records for two different gates:

- **the guest-identity pair** — expand `20260722160000` (applied, ledger
  `20260723082917`), whose contraction is step 5, the **drop of the deployed
  7-argument `resolve_import_guest_identity`**; and
- **the matcher pair** — expand `20260722012658` (applied, ledger
  `20260722132159`), whose contraction is step 6, **migration
  `20260722012707`**.

They share step 4's reader-deploy gate but have different contractions and
different supporting evidence. Satisfying one does not satisfy the other.
**SUPERSEDED 2026-07-23 as to "they share step 4's reader-deploy gate", original
retained.** They no longer share it: by owner decision the reader-deploy gate
was removed from the guest-identity pair's contraction (step 5) and replaced by
three preconditions, while it remains genuinely in force for the matcher pair's
contraction (step 6). The rest of this note is unchanged and now matters more,
not less — the two pairs were always distinct, and their preconditions have now
diverged outright. The full comparison, with evidence, is in
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md` →
"'Deploy and verify the compatible reader' names TWO different gates".

**Step 6 is genuinely deploy-gated, and this is evidenced [GIT]/[REPO].** At
production source commit `865df0108f2f7b9df000ad3aeb8fcd394e6242a5`,
`src/lib/db/import-player-resolution-repo.ts:223` calls
`supabase.rpc('match_import_player_names', …)` through
`createSupabaseServerClient()`, which `src/lib/supabase/server.ts:5` builds from
`@supabase/ssr` with the publishable key and the request cookies — a
user-session client, so a signed-in caller executes as **`authenticated`**.
Migration `20260722012707` revokes exactly that grant. Applying it against the
current deployment would break live import matching.

**Step 5's reader dependency is, by contrast, currently unsupported by any
found caller — and the precondition is left standing anyway.** See the
`ID-READER-CONTRACT` blocker row below and the pending owner decision
registered under "Pending owner decisions".
**SUPERSEDED 2026-07-23, original retained.** That owner decision has been made
and is recorded in `docs/redesign/DECISIONS.md`; the precondition is no longer
left standing. The first clause is unchanged — step 5's reader dependency is
still unsupported by any found caller, which is the evidence the decision rests
on. The pointer to "Pending owner decisions" is now stale for this item: the
reader-deploy question was never registered as a numbered `PD-`, and `PD-1`,
`PD-2` and `PD-3` are each unaffected and remain open.

### The seven-argument drop's preconditions (owner decision, 2026-07-23)

**The reader-deploy precondition on the drop of the deployed 7-argument
`public.resolve_import_guest_identity` is SUPERSEDED.** The decision text is
`docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 - The seven-argument resolver
drop: replacing the reader-deploy precondition" and is **authoritative over this
summary**. `docs/REDESIGN_STATE.md` carries the detailed record.

**Nothing here authorizes the drop.** Authoring or applying it, and the
authorized production session that would discharge the three preconditions, each
require new explicit owner authorization.

**The three preconditions, binding on the session that authors the drop:**

1. **RE-DERIVE THE SIGNATURE LIVE** from the production catalog before writing
   any drop statement. `drop function if exists` against a signature that does
   not exist succeeds silently against nothing.
2. **RE-RUN THE CATALOG SWEEP** for database-internal callers across all
   non-system schemas, with a positive control. The existing sweep is dated
   2026-07-23 and production can move.
3. **VERIFY THE DEPLOYED EDGE FUNCTIONS** — an area the catalog sweep explicitly
   does not cover, and where the repository holds only a prior record
   (`20260722153000:40-41` describes the project's only edge function,
   `temporary-asset-uploader`, as a two-line disabled stub returning 410
   **[REPO]**), not an observation.

**Residual risk accepted:** consumers outside the database, and dynamic SQL that
never stores the name literally. The function body is preserved in migration
`20260718212339` **[REPO]** and can be recreated.

**TRACKED CONSEQUENCE — the drop makes this repository's record permanently
stale, and the drop session inherits it.** Two migrations on the redesign
lineage create the function (`20260718050924`, `20260718212339`) and the
executable harness asserts that it **exists**: `run.sh:254` fails when
`to_regprocedure('public.resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean)')`
is null, and `non-import-guest-identity-after.sql:71,77` names the same
signature **[REPO]**. Same class of repository-versus-production divergence the
carry convention prevents, arriving from the opposite direction. **It must be
handled as part of the drop's own work, not discovered afterwards** — and
handling it is separately unauthorized.

**It closes no oracle, and no status line may say it does.** Authenticated
EXECUTE was already revoked as ledger `20260722153233` and the ACL is
`{postgres,service_role}` only **as of the authorized catalog read of 2026-07-23
09:40:14Z** — a **[PRIOR]** record, re-derived live by precondition 1 before any
drop. The security objective was met by that revoke; the drop completes
expand/contract and removes a dead object.

**Unchanged by this decision:** contraction `20260722012707` is still genuinely
deploy-gated (the deployed application calls `match_import_player_names` through
a user-session client, so it executes as `authenticated`, which that migration
revokes); and `ID-READER-DEPLOY` is **not dissolved** — the redesign reader is
still undeployed and still needs to ship.

### Also outstanding: the tile-attribution backfill and guest re-neutralization

Added 2026-07-23 by a documentation-only correction. **This router previously
carried neither operation and never used the word "neutralization"**, so a
reader following it alone would not have learned that an irreversible ordering
constraint exists between them. That omission is what this section repairs.
**Nothing here authorizes either operation**, and no schedule is asserted.

**THE ORDERING CONSTRAINT — CONFIRMED, IRREVERSIBLE IF VIOLATED.** The
tile-attribution backfill **MUST** run **before** guest re-neutralization. Two
of the 114 rows (game `46bde90c…`, actor "Jenna") resolve **solely** through
that unlinked guest's `public.players.display_name`. Evidence coverage across
the 114 rows is `display_name` first token 114/114, `player_import_aliases`
45/114, `user_profiles.username` **0/114**, private personal first name
**0/114** [PRIOR]. Re-neutralization overwrites exactly that column for exactly
unlinked players, and restoring the personal labels is deliberately excluded
from the rollback — `tile-attribution-rollback.sql` restores `player_id` /
`game_player_id` only. Running them in the wrong order makes those two rows
**permanently unattributable**, not merely ambiguous. The authoritative
statements of this constraint are
`supabase/verification/tile-attribution-dry-run.sql` (the ORDERING CONSTRAINT
block), `supabase/verification/tile-attribution-backfill.sql` (its
do-not-execute preconditions),
`docs/agent-handoffs/PHASE-04-STEP-03-THIRD-REMEDIATION-PARTIAL-HANDOFF.md`
("Load-bearing ordering constraint" and its evidence table), and
`docs/REDESIGN_STATE.md` ("Ordering correction"). **This constraint is not
weakened, reinterpreted, or rescheduled by anything below.**

**Their position in the numbered sequence above is SUPERSEDED, and no new
position replaces it.** A read-only investigation found the pair **independent**
of the identity release sequence in both directions, and found that the recorded
position placing the pair after that sequence **has never carried a stated
justification**, in the documents or in git history. Evidence class **[PRIOR]**,
with both load-bearing halves re-verified **[REPO]** on 2026-07-23: the backfill
matches on `players.display_name` and on nothing else, and neither operation
reads, writes, calls, or requires any object the identity work creates, drops,
or re-grants. **When to schedule them is an owner decision that has not been
made. Executing either still requires its own separate authorization.** Detail
in `docs/REDESIGN_STATE.md` and
`docs/agent-handoffs/PHASE-04-STEP-03-BACKFILL-NEUTRALIZATION-ORDERING-CORRECTION.md`.

**What each actually requires — they are not comparable in readiness:**

| | Tile-attribution backfill | Guest re-neutralization |
|---|---|---|
| Package | `supabase/verification/tile-attribution-{dry-run,backfill,rollback}.sql` | **NONE — no SQL file, no dry run, no rollback, and no expected row count exists anywhere in the repository** [REPO] |
| Privilege | `service_role` or superuser | Owner approval for an irreversible write |
| Preconditions | Recorded owner approval; a successful dry run **in the same session window**; confirmation re-neutralization has not yet run | Owner approval; the backfill must already have run |
| Reversibility | Reversible — rollback file plus the `private.mig_backup_tile_attribution_20260720` backup table | **Irreversible** for the personal labels; restoring them is excluded by design |
| Authorized? | **No** | **No** |

**The backfill's pinned population is [UNVERIFIED] against production today.**
Its stopping conditions assert 114 candidate rows, 114 backfill rows, 0
excluded, 3 games and 3 imports, measured read-only on **2026-07-20**. Whether
production still matches has not been re-checked. The package **fails closed**
on any drift — each expectation raises `EXPECTATION DRIFT` and aborts the
transaction — so drift is safe but blocking: it may require re-review before the
package can run at all.

## Known blockers

| ID | Requirement | Current status | Blocking |
|---|---|---|---|
| ID-READER-CLIENT | `createOrReuseGuestPlayerByPersonalName` must not call the revoked RPC as `authenticated` | **Resolved LOCALLY 2026-07-22, remediated after an independent audit returned FAIL, and MERGED into `redesign/tm-stats-dashboard-rebuild` on 2026-07-23; **migration APPLIED 2026-07-23 as ledger `20260723082917`, reader still undeployed**. Re-audited 2026-07-23: the targeted re-audit found the SQL and TypeScript remediation correct and complete and returned FAIL on documentation and coverage only; all four of its findings are addressed and its FAIL is answered.** Gated `20260720100000` retired as a no-op tombstone, so its `authenticated` re-grant can never be applied. New gated `20260722160000` adds service_role-only `create_or_reuse_guest_identity`, authorized on an explicit server-verified `p_requesting_user_id` and writing no import alias; both non-import call paths moved to the admin client. The audit's HIGH finding — the candidate-counting and auto-selection predicates disagreed about claimed players, so a same-name collision could auto-select a claimed player and fail with `P0002` — was reproduced and fixed in the unapplied file: the predicate is now evaluated once into `v_candidate_ids` and both uses derive from it. `p_requesting_user_id` was also made required, matching the four applied gateways. Executably proven and mutation-proven on a disposable cluster. **Closed out 2026-07-23**: probe P1 was re-run against the tightened clause 8b it had never been re-run against and still fails there with `P0002` (harness exit 3), so the remediation is proven at the current file state, not merely at the state the probe was originally run against. See `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md` and `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md` | Redesign deploy |
| ID-READER-CONTRACT | Drop the deployed 7-argument `resolve_import_guest_identity` | Not authored, not authorized. The expand half is applied (ledger `20260723082917`) and is additive, so the function is still in place. The drop is valid only after the moved reader is deployed and production-verified and a fresh zero-caller re-sweep passes. **SUPERSEDED 2026-07-23 by owner decision as to the reader-deploy half, with the original sentence retained immediately above as history. THE DROP'S PRECONDITIONS ARE NOW THREE:** (1) **RE-DERIVE THE SIGNATURE LIVE** from the production catalog before any drop statement is written, because `drop function if exists` against a signature that does not exist succeeds silently against nothing; (2) **RE-RUN THE CATALOG SWEEP** for database-internal callers — function bodies, view definitions, triggers and dependency records across all non-system schemas — with a positive control, because the existing sweep is dated 2026-07-23 and production can move; and (3) **VERIFY THE DEPLOYED EDGE FUNCTIONS**, an area the catalog sweep explicitly does not cover and for which the repository holds only a prior record (`20260722153000:40-41` calls the project's only edge function, `temporary-asset-uploader`, a two-line disabled stub returning 410 [REPO]) rather than an observation. Decision text: `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 - The seven-argument resolver drop: replacing the reader-deploy precondition"; summary under "The seven-argument drop's preconditions" above. **Residual risk accepted by the decision:** consumers outside the database and dynamic SQL that never stores the name literally; the body is preserved in `20260718212339` [REPO] and can be recreated. **TRACKED CONSEQUENCE, inherited by the session that performs the drop:** dropping the function makes this repository's record of it permanently stale — two migrations create it (`20260718050924`, `20260718212339`) and the executable harness asserts it **EXISTS** (`supabase/tests/executable/run.sh:254`; `non-import-guest-identity-after.sql:71,77`) [REPO] — the same class of repository-versus-production divergence the carry convention prevents, arriving from the opposite direction. **It must be handled as part of the drop's own work, not discovered afterwards**, and handling it is separately unauthorized. **The drop closes NO oracle**: authenticated EXECUTE was already revoked as ledger `20260722153233` and the ACL is `{postgres,service_role}` only **as of the authorized catalog read of 2026-07-23 09:40:14Z** — a [PRIOR] record, re-derived live by precondition 1 before any drop — so no status line or summary may describe this drop as closing or mitigating an exposure. **Its stated precondition — a production ACL read on `resolve_import_guest_identity` — is SATISFIED as of 2026-07-23 09:40:14Z**, by a separately authorized read-only session; the expand session was explicitly forbidden from making that read and did not make it. Result, evidence class **[PRIOR]**, recorded above under "The production catalog read" and on the canonical `DEPLOY-STATE.md`: exactly one overload, `public.resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean)`, OID `21767`, `prosecdef` true, `search_path=""`, `md5(prosrc)` `2892f3189a15f04c35641473541fc5bd`; `proacl` `{postgres=X/postgres,service_role=X/postgres}`, so **`service_role` holds EXECUTE and `authenticated`/`anon`/`PUBLIC` do not** — the `service_role` discrepancy is **RESOLVED** and the applied revoke migration's header was correct. **The signature must still be RE-DERIVED LIVE before any drop statement is authored**: a signature taken from a report is not one read from the catalog, and `drop function if exists` against a wrong signature succeeds silently against nothing. **Finding recorded 2026-07-23, disposition UNCHANGED: no reader on any lineage was found that calls this function.** Swept at production source commit `865df0108f2f7b9df000ad3aeb8fcd394e6242a5` (zero `src/` occurrences; the only hits are `DEPLOY-STATE.md` prose), at rollback target `d12e33ad0` (zero `src/` occurrences), and at `redesign/…` `44eed2e21` (comments, the ledger map, and a test asserting the RPC is **not** called). Positive control on the same commit finds `.rpc(` in fourteen `src/` files and finds `match_import_player_names`, so the absence is real, not a broken search [GIT]. **The sweep does NOT cover** database-internal callers since the expand landed, edge functions as deployed, consumers outside this repository, or whether the swept commit is what production actually serves (that commit is **[PRIOR]** from the canonical ledger; the authenticated `/api/deploy-info` confirmation is itself recorded there as outstanding). **"No caller was found" is not "the drop is safe": the reader-deploy precondition is NOT relaxed and remains in force.** Changing it is an owner decision and has not been made — see "Pending owner decisions". **SUPERSEDED 2026-07-23, original retained: that owner decision HAS since been made**, and the reader-deploy precondition is replaced by the three stated at the head of this cell. The first clause stands unchanged — "no caller was found" is still not "the drop is safe", which is precisely why two of this sweep's uncovered areas became preconditions 2 and 3 rather than being dismissed. The pointer to "Pending owner decisions" is stale for this item only: the reader-deploy question was never registered as a numbered `PD-`, and `PD-1`, `PD-2` and `PD-3` are unaffected and remain open. Two preconditions were real regardless of that decision — the authorized production ACL and signature read, and a fresh production-side catalog sweep for database-internal callers — and **both were satisfied on 2026-07-23 at 09:40:14Z [PRIOR]**. The production-side sweep found **no** database-internal caller: zero hits across 172 function bodies, 41 views, 0 materialized views and 13 user triggers in 12 non-system schemas, and zero `pg_depend` rows on OID `21767`, with positive controls returning hits on the same query shapes and two blindness checks clean (no SQL-standard function body anywhere, and the resolver in no extension). **It does not cover** Edge Functions as deployed, consumers outside the database, whether the commit production serves matches any swept tree, or runtime-constructed dynamic SQL — and a further sweep is required if production changes before the drop is authored. **Satisfying these two preconditions is not authorization to drop, and does not relax `ID-READER-DEPLOY`, which still stands.** **Amended 2026-07-23, original retained: still not authorization to drop.** `ID-READER-DEPLOY` still stands as the reader-deploy gate and is **not dissolved**, but by owner decision it is no longer a precondition of this drop. Detail: `docs/redesign/reference/MIGRATION-LEDGER-MAP.md`, whose own "The precondition stands and is NOT relaxed by this finding" passage is **superseded by the same decision and was NOT edited here** — that file was outside this documentation task's permitted edit set, and correcting it is outstanding | Step 4.3 closure |
| ID-READER-DEPLOY | Compatible source-bound reader must be deployed and production-verified | **ACTIVE GATE as of 2026-07-23.** Not authorized or deployed. The database side is now ready — `create_or_reuse_guest_identity` exists and is `service_role`-only — but nothing in production calls it, and applying the expand granted no deploy authority. **Amended 2026-07-23 by owner decision — NOT dissolved, NOT removed, NOT complete.** This gate stands in full: the moved redesign reader is still undeployed, still needs to ship, and still gates contraction `20260722012707`, which is genuinely deploy-gated because the deployed application calls `match_import_player_names` through a user-session client and executes as `authenticated`. **What changed is only its reach: it is no longer a precondition of the `ID-READER-CONTRACT` drop**, which now carries the three preconditions stated in that row. See `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 - The seven-argument resolver drop: replacing the reader-deploy precondition" | Legacy contraction |
| ID-LEGACY-ORACLE | Retire authenticated execution of `match_import_player_names` with migration `20260722012707` | Gated and unapplied; interim coarsening remains live. **Its EXPAND half is now BUILT LOCALLY** (2026-07-23) under owner decision **PD-1**: gated migration `20260723130000_add_service_role_import_name_matcher_overload` adds a `service_role`-only three-argument overload, and the live-site reader moved to the admin client on branch `fix/matcher-service-role-overload-callsite`. **Nothing was applied, deployed or pushed.** Four separately-authorized steps remain, in this order and no other: apply `20260723130000`; deploy the moved reader; verify in production that a real import returns a **non-zero** match count (a zero-match pass is indistinguishable from the silent failure mode); only then apply `20260722012707`. **RE-GATED, NEVER CLOSED**: `20260722012707` revokes from `public`/`anon`/`authenticated` only, drops nothing, and leaves `service_role`'s EXECUTE intact, so the two-argument function survives as a live callable object and free-form matching continues under `service_role`. Every post-contraction status line must therefore say "re-gated"; "closed" or "retired" would be false. That is not a style preference — it is asserted executably by `supabase/tests/executable/matcher-service-role-overload-post-contraction.sql`. **The enumeration oracle stays OPEN either way**, because candidate names are browser-supplied through the analyze server action | Step 4.3 closure |
| MATCHER-MANUAL-ENTRY-REPLACEMENT | Design a source-bound (or otherwise structured) replacement for the manual-entry player-matching paths, so free-form arbitrary-candidate-array matching stops being the permanent answer | **OWED, NOT DESIGNED, NOT AUTHORIZED. Registered 2026-07-23 as a gate, deliberately, because the amendment's own guard against it is prose.** `docs/redesign/DECISIONS.md` §"AMENDMENT: interim service-role re-gate of the import matcher" states the amendment "must not become permanent by default" and "ships with a recorded commitment to the source-bound design and a dated review of that commitment". Building `20260723130000` is precisely the action that makes leaving this open comfortable, so the commitment is recorded here as a tracked item rather than left in prose. **What is owed:** two of the three matcher call sites — `log_game_player_resolution` (`src/lib/db/log-game-player-resolution.ts`) and `roster_display_name_fallback` (`src/lib/db/player-repo.ts`), both on the live-site lineage — are NON-import paths with no parsed-log source evidence, and the four applied source-bound gateways of `20260722012658` structurally cannot serve them: `resolve_staged_import_player_identity` requires a `private.import_identity_staging` row whose `source_player_texts` came from a parsed import and enforces exact source-text binding; that table is FK-bound to `public.games`/`public.game_log_imports`; and creation through it writes a `player_import_aliases` row with `source_type 'game_log'` unconditionally, which for a typed name would fabricate the import provenance the source-bound design exists to prevent [REPO]. The overload does not resolve this — it keeps free-form matching alive under `service_role` on exactly those paths, indefinitely and with no forcing function. **Dated review of the commitment owed by 2026-08-23**, one month from the build. Designing or building the replacement requires its own explicit assignment | Nothing today; it is what makes the interim permanent by default |
| STEP-4.3-AUDIT | Fresh independent closure audit | Not completed after the current production boundary. It must also account for the recorded harness coverage gap: `run.sh` exit 0 does not cover the coarsened `match_import_player_names` disclosure or its candidate-input bound. A targeted re-audit of the merged `ID-READER-CLIENT` remediation is the evidenced next step and is separately unauthorized | Step 4.3 closure |
| STEP-4.4 | Explicit assignment for final review, finalization, and draft safety | Not authorized | Step 4.4 start |
| GUEST-NAME-COLLISION-TERMINAL | A user must be able to add a roster entry whose typed first/last name matches two or more unlinked guests already in the group | **Recorded 2026-07-23, NOT fixed. Inherited, not introduced.** When two or more UNLINKED players in a group carry the same normalized personal name, `create_or_reuse_guest_identity` raises `P0003` ("Multiple guest identities match. Select one explicitly.") and there is no way to satisfy it: the sole call site `createOrReuseGuestPlayerByPersonalName` (`src/lib/db/import-player-identity-repo.ts:118`) hard-codes `p_selected_player_id: null` and accepts no selection from its callers, and neither product path — `/group/players` (`src/app/(app)/group/players/page.tsx:31`) nor the Log-a-Game manual-entry resolver (`src/lib/db/log-game-player-resolution.ts:84`) — offers a disambiguation UI. No code in `src/` handles `P0003`, so it falls through `throw error` as a raw database failure. The state is therefore **terminal**: that roster entry can never be added [REPO]. It is inherited from the deployed resolver this function is derived from and is not a regression introduced by the `ID-READER-CLIENT` work. Reachable because the personal-name index is NON-unique per group (`20260718050924:111-113`) and personal_name is the only mode either non-import path uses. **Coupled to the coverage added on 2026-07-23**: the natural fix is a disambiguation UI, which would pass an explicit `p_selected_player_id` and thereby activate the revalidation path that section 11 of `non-import-guest-identity-after.sql` guards — the clause stopping an explicitly selected CLAIMED player from being returned as `existing_unlinked_guest`. That assertion must remain in place before any such UI ships. Fixing this is a product decision needing its own assignment; see `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-COVERAGE-AND-SIGNATURE-RECORDS.md`. **Classification CONTESTED as of 2026-07-23, and deliberately NOT changed here.** The phase contract's Step 4.3 scope requires that the importer be able to "select an existing unlinked guest" and "resolve an ambiguous match explicitly", and the terminal `P0003` state makes neither possible — which reads as a contract non-conformance against the "Blocking" value in this row. Whether it is one is an owner adjudication; registered as **PD-3** under "Pending owner decisions", where it interacts with **PD-2** | Nothing today; user-facing dead end |
| DRAFT-NAME-RESIDUE | A typed personal name must not survive into a Log-a-Game draft snapshot or its hydration payload after the seat that introduced it is removed | **Recorded, NOT fixed — but INVESTIGATED and settled by EXECUTION on 2026-07-23, and the audit UNDERSTATED it.** Independent-audit FINDING-4, pre-existing and untouched by the ID-READER-CLIENT work: removing a manually added player's seat leaves records keyed by that seat's reference unpruned, so a typed first/last name persists in the stored draft and is returned on hydration. This breaches the "private names must be excluded from payloads, not merely hidden" rule in `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`. **Reachability is no longer [INFERENCE]** [PRIOR]: a probe drove the REAL save path — `logGameDraftSchema.parse` → `resolveLogGamePlayerReferences` → `saveDraftGame` → the `game_revisions` insert — against a disposable PostgreSQL 18 cluster replaying the real migration history, adapting only the Supabase transport, then read the row back with raw SQL. **The audit understated the finding on three counts, all in the direction of severity.** (1) **Reachability is PROVEN, not inferred** — the audit left severity unconfirmed for want of a failing test, captured payload, or stored draft; all three now exist. (2) **The name persists at SIX sites, not one class of record** — as the object KEY of `playerScores`, `playerSelections` and `playerStyles`, and as the VALUE of `milestoneClaims.*.winnerPlayerId`, `awardClaims.*.fundedByPlayerId` and `awardClaims.*.firstPlaceWinnerPlayerIds[]`. (3) **It SURVIVES FINALIZATION permanently** — revisions are never deleted anywhere in `src/**` or `supabase/migrations/**`, finalization only ADDS a row, the finalized revision snapshot itself carries `playerSelections`/`playerStyles` residue, and claims naming a removed reference were measured ACCEPTED by `buildFinalizedGamePayload`, which checks presence not membership. **Exposure is not the drafting user alone**: from the policies as written it is every member of the game's group, plus any linked participant once the game is finalized — and **it reaches the browser of someone who never typed the name**, measured in the `initialValues` prop of `<LogGameWizard>`, a `'use client'` component (only the last hop, Next.js wire serialization, remains [INFERENCE]). Not public; permanent per-player tables stay clean, the name lives **only** in `game_revisions.snapshot`. **A fourth correction, to the finding's wording:** its phrase "must never enter draft snapshots" tracks a **code comment about a different field**, not a contract clause — the clause actually engaged is the privacy contract's **unqualified "browser hydration data"** boundary under Data-boundary requirements; the Public-surfaces list is NOT engaged. Mechanism proven by contrast: the RETAINED seat's typed name WAS resolved to a real UUID through `create_or_reuse_guest_identity` in the same call, and only the removed reference stayed raw, because `remapRecord`'s `replacements.get(key) ?? key` holds no entry for a reference absent from `selectedPlayerIds` and `compactRecord` prunes by value emptiness only, never by key membership. **One bug, not a family** — the import draft path keys by resolved UUID and is unaffected; `sourcePlayerText` is separate and contract-sanctioned. No guard is failing: the case was never covered, and no test asserts it. Three fix options are priced in the handoff, with existing stored drafts flagged as the expensive half needing separate authorization. **Whether this blocks Step 4.3 closure is an OWNER DECISION and is NOT taken here — the Blocking value in this row is deliberately left UNCHANGED pending that adjudication**; the investigation assessed it as recordable rather than blocking while calling that assessment genuinely contestable. It lives in the wizard/draft subsystem, not the identity RPCs, and needs its own scoped assignment; it must not be fixed inside an identity task. See `docs/agent-handoffs/PHASE-04-STEP-03-DRAFT-NAME-RESIDUE-INVESTIGATION.md` and `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md` | Nothing today |
| GUEST-LABEL-REDIRTY | Guest re-neutralization must stay neutralized after it runs — live code must stop writing personal-name material into `public.players` | **Recorded 2026-07-23, NOT fixed and deliberately NOT scoped. Inherited, not introduced.** Re-neutralization is a **one-shot cleanup that ordinary live use re-dirties**. Three code paths on the production lineage write personal-name material directly into `public.players`, and **none of them calls an identity RPC** — swept at production source commit `865df0108f2f7b9df000ad3aeb8fcd394e6242a5` [GIT]: (1) `createPlayerIfMissing` (`src/lib/db/player-repo.ts:141`) inserts `display_name: input.displayName, full_name: normalizeOptionalText(input.fullName), username: normalizeOptionalText(input.username)`; (2) `updatePlayerIdentity` (`src/lib/db/player-repo.ts:183`) updates `full_name` and `username`, and its own doc comment says it is "Used when an import is confirmed so the identity typed in review lands on the routed group's player"; (3) `resolveOrCreateImportGroup` (`src/lib/db/import-group-repo.ts:595`) inserts `display_name: participant.displayName` for every participant, through the **admin** client. The bypass is total, not partial: `git grep` for `create_or_reuse_guest_identity` or `resolve_import_guest_identity` across `src/` at that commit returns **zero hits** [GIT]. **NONE of the three is touched by the expand (`20260722160000`), the reader deploy (`ID-READER-DEPLOY`), the 7-argument drop (`ID-READER-CONTRACT`), or contraction `20260722012707`** [REPO] — those migrations contain no `update … players`, no grant or revoke on `players`, and no reference to the tile tables. **Consequence, stated plainly: re-neutralization will be undone by the next import that creates participants, and its durability is gated on a LIVE-SITE CODE CHANGE that appears nowhere in the recorded release sequence.** The record currently orders re-neutralization after the identity work as though that would make it stick; **it will not** — [INFERENCE] from the three writers plus the zero-hit RPC sweep, and the inference is that ordering alone cannot make a repeatedly-written column stay neutral. By contrast the identity RPC path is **clean**: `create_or_reuse_guest_identity` inserts new rows with an already-neutral `private.neutral_unlinked_player_label(...)` value (`20260722160000:296-299`) [REPO], so the fix direction is to route these three writers through it or an equivalent — **but scoping, designing, or beginning that fix is a separate assignment and was deliberately not started here**. **Secondary observation, FLAGGED not adjudicated:** `public.players.full_name` and `username` continue to be written by writers (1) and (2) after the 6 unlinked rows were preserved into `private.player_legacy_identities` on 2026-07-19, so that private preservation is a **point-in-time snapshot that ongoing writes have moved past**. Read **access** is contained by the existing column revokes (`authenticated`/`anon` cannot read `full_name` or `username`); the **accumulation** is not contained. Whether that matters is an owner question and is not answered here. See `docs/agent-handoffs/PHASE-04-STEP-03-BACKFILL-NEUTRALIZATION-ORDERING-CORRECTION.md` | Nothing today; re-neutralization durability |

## Pending owner decisions

Registered 2026-07-23 by a documentation-only reconciliation. Each is stated
neutrally: what is established, what is not, and who must decide. **None is
resolved here, none is recommended, and none authorizes work.** They are
decisions, not blockers, and no blocker's disposition was changed to record
them.

### PD-1 — Build the three-argument `match_import_player_names` overload, or not?

**Established [PROJECT-DOC].** `docs/redesign/DECISIONS.md` §"Phase 4 Step 4.3 -
AMENDMENT: interim service-role re-gate of the import matcher" records an
explicit owner decision of 2026-07-22 adopting a 3-argument overload that takes
an explicit requesting-user id, derives both the authorization gate and the
candidate pool from it instead of `auth.uid()`, and is granted to `service_role`
only; both live call sites move to the server-side admin client, after which the
2-argument overload's `authenticated` grant is revoked. Its stated purpose is to
unblock the contraction "without first designing a replacement for the
manual-entry path". That same entry states it "Defines the design; does not
authorize implementation."

**Established [REPO].** No such overload exists. Every
`create or replace function public.match_import_player_names(` in
`supabase/migrations/` — on this branch and on every other local and remote ref
checked — declares the 2-argument `(p_group_id uuid, p_imported_names text[])`
signature, in `20260720120000` only. No migration anywhere in the repository
creates a 3-argument overload.

**Established [PRIOR], added 2026-07-23.** It does not exist **in production
either** — previously an open unknown, since the repository sweep could only
speak for the repository. The authorized read-only catalog read of 2026-07-23
09:40:14Z found **exactly one** overload of the name,
`public.match_import_player_names(uuid,text[])`: `prosecdef` true, `proconfig`
`{search_path=""}`, `proacl`
`{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` — so
**`authenticated` CAN still execute it** — `md5(prosrc)`
`522f8cb0a2647c57e35da0a081f90480`, length `4191`. The three-argument
`service_role`-only overload the decision adopted exists **neither in the
repository nor in production**, and the matcher enumeration oracle therefore
remains **OPEN** behind the interim coarsening `20260722144034`, exactly as
already recorded. **This changes no disposition**: `ID-LEGACY-ORACLE` is
unchanged and contraction `20260722012707` remains gated and unapplied.

**Established [PRIOR], added 2026-07-23 by read-only design scoping.** A separate
session priced the amendment on a disposable PostgreSQL 18.4 cluster and answered
the buildability question **without building anything** — no `supabase/**`,
`src/**` or `scripts/**` file was created or changed on any lineage, and no
production read occurred
(`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-DESIGN-SCOPING.md`).
Five findings bear on this decision:

1. **The overload SHAPE survives the ambiguity lesson.** The `42725` failure that
   forced `resolve_import_guest_identity`'s redesign does **not** transfer here,
   because the matcher's base signature `(uuid, text[])` carries **no defaults**,
   so an appended third parameter is not forced to default. Proven on the
   cluster, together with a control that reproduced the guest-identity failure.
2. **Binding constraint the amendment does not state: the third parameter must
   carry NO default.** `default null` reproduces `42725` on **every existing
   two-argument call at expand time**. The amendment's text is silent on this.
3. **HIGH — a null requesting-user id fails SILENTLY.** An unguarded pool returns
   **zero rows and no error**, and the helper an implementer would naturally
   reuse returns `null` on failure **by design**, so every import would show all
   players unmatched with a clean log. Both a SQL null rejection and a
   fail-closed resolver are required, and **verification must confirm NON-ZERO
   matches, not merely the absence of an error.**
4. **There are THREE call sites, not the two the amendment names.** All three
   funnel through one wrapper, `matchImportPlayerNames`, which already builds its
   own client and already resolves the user id from `auth.getUser()` — so the
   change is one function in one file, with no threading introduced. The third
   site, `roster_display_name_fallback` in `player-repo.ts`, is dormant only
   because the `normalized_display_name` grant survives.
5. **The contraction RE-GATES rather than closes.** `20260722012707`'s body
   revokes `EXECUTE` from `public`/`anon`/`authenticated` **only**, so
   `service_role` keeps its grant and the two-argument function survives as a
   live callable object; the enumeration probe also remains reachable through the
   analyze server action. The contraction is an ACL change, not a removal, and
   dropping the two-argument function is separate and unauthorized. **Any
   post-contraction status line must say "re-gated", never "closed."**

**Precondition outside this repository, evidence class [UNVERIFIED].** Whether
`SUPABASE_SERVICE_ROLE_KEY` is bound on the live Worker is **unverified, and the
repository cannot settle it**. It is a precondition of any overload build,
because an unbound secret makes the admin client throw
`SUPABASE_SERVICE_ROLE_KEY is not configured.` on every affected request. It is
checkable only against the deployment (for example the Worker's Variables and
Secrets pane), which no session so far has been authorized to read.

**Not established.** Why it does not exist. Two possibilities were examined and
could **not** be distinguished from the repository record — **and the production
read above does not distinguish them either**, because an absent object is
equally consistent with both:

1. the amendment was **superseded** by later work without any record being
   written; or
2. it was **adopted and simply never built**.

The decision text's own "does not authorize implementation" clause is
consistent with (2), but it is not proof of it, and no evidence for (1) was
found either. **This is an inference boundary, not a conclusion.**

**Decision required of the owner.** Whether to build the overload, retire the
amendment, or leave it dormant. **`docs/redesign/DECISIONS.md` was deliberately
not edited**: recording an implementation-status question about a decision is
not the same as amending the decision, and amending it is the owner's act. The
2026-07-23 scoping prices the options and states the constraints; it **resolves
none of them**, authorizes neither the overload nor `20260722012707`, and left
`DECISIONS.md` untouched as well.

#### DECIDED 2026-07-23 — BUILD IT. Built locally; nothing applied or deployed.

The owner decided to **build the three-argument overload**, rather than accept a
full redesign deploy as the price of unblocking the contraction, accepting
explicitly that this is **a lesser destination reached sooner**: the manual-entry
replacement remains owed, and the contraction **re-gates rather than closes**.

What now exists, all LOCAL and all GATED:

- `supabase/migrations/20260723130000_add_service_role_import_name_matcher_overload.sql`
  on this lineage — registered in `GATED_UNAPPLIED` and classified `expansion`
  in `src/lib/db/migration-ledger-map.ts`. It creates ONE new signature and
  names the deployed `(uuid, text[])` in no statement at all.
- The moved reader on the **live-site** lineage, branch
  `fix/matcher-service-role-overload-callsite` — one wrapper, no caller
  signature changed, the requesting-user id resolved inside the wrapper and
  never threaded from a caller.

All five scoping findings above were **re-derived, not inherited**, and each is
now mutation-proven rather than reasoned:

1. and 2. **Constraint verified in both directions on a disposable PostgreSQL 18
   cluster.** With no default, positional and named two-argument calls both
   resolve to the two-argument function; with `default null` both raise `42725`.
   A finding the scoping did not record: placing `p_requesting_user_id` in
   **position two** — matching the four applied gateways of `20260722012658` —
   makes the defaulted form fail at CREATE time with `42P13` instead of applying
   and breaking live calls, so the single most likely mistake is
   impossible-by-construction rather than merely forbidden.
3. **Both mitigations are in.** The SQL rejects a null requesting user with
   `22023`, and the caller uses a fail-closed resolver that throws instead of
   degrading. Removing either is proven to fail a test.
4. **Confirmed: three call sites, one wrapper, no threading.** The wrapper now
   builds the service-role client for the RPC and keeps the session client for
   identity only.
5. **Recorded as a gate, not prose** — see the `ID-LEGACY-ORACLE` and
   `MATCHER-MANUAL-ENTRY-REPLACEMENT` blocker rows, and the executable
   post-contraction assertion.

**`SUPABASE_SERVICE_ROLE_KEY`'s binding on the live Worker remains
[UNVERIFIED]** and was deliberately not investigated: it is a precondition of
the DEPLOY, not of the build. It must be settled before that step.

**This resolves PD-1 only.** PD-2 and PD-3 are untouched, no blocker's `Blocking`
value changed, Step 4.3 is not complete, and `DECISIONS.md` was not edited.

### PD-2 — May Step 4.3 close with `ID-LEGACY-ORACLE` still open?

**Established [PROJECT-DOC].** The phase contract
`docs/redesign/phases/04-log-a-game.md` states exactly one closure criterion for
this step — "Step 4.3 is closed only after a fresh independent read-only audit
passes" — and mentions no deployment, no migration, and no contraction as a
condition of closure.

**Established [PROJECT-DOC].** The state files list `ID-LEGACY-ORACLE` (retire
authenticated execution of `match_import_player_names` via `20260722012707`) in
the "Blocking: Step 4.3 closure" column of the blocker table above, and
`docs/REDESIGN_STATE.md` carries the same ordering.

**Established [PROJECT-DOC].** `docs/AUTHORITATIVE_DOCUMENTS.md` ranks
`docs/CURRENT_STATUS.md` and `docs/REDESIGN_STATE.md` **above** the assigned
phase file (positions 2 and 3 of its authority order). The phase contract
therefore does **not** simply win this conflict on authority grounds.

**Not established.** Which reading governs. The documents genuinely do not
resolve it: the higher-ranked documents add a closure condition the phase
contract does not state, and nothing in the record says whether that addition
was intended to amend the contract or merely to sequence the work.

**Decision required of the owner**, before any closure audit is commissioned —
because the audit's scope depends on the answer.

### PD-3 — Is `GUEST-NAME-COLLISION-TERMINAL` a Step 4.3 contract non-conformance?

**Established [PROJECT-DOC].** The phase contract's "Step 4.3 guest identity
scope" requires that Step 4.3 allow the importer to "select an existing unlinked
guest" and to "resolve an ambiguous match explicitly".

**Established [REPO], as already recorded in the blocker row.** In the terminal
`P0003` state, neither is possible: the sole call site hard-codes
`p_selected_player_id: null` and accepts no selection, neither product path
offers a disambiguation UI, and no code in `src/` handles `P0003`.

**The tension.** Those two facts read together suggest a contract
non-conformance, while the blocker is currently classified as blocking
**"Nothing today; user-facing dead end"**.

**Recorded as CONTESTED. The blocker is NOT reclassified here**, and its
disposition, its "Blocking" value, and its recorded coupling to the
`non-import-guest-identity-after.sql` §11 assertion are all unchanged.
Reclassification would change what gates Step 4.3 closure, which is
**the owner's adjudication**, taken together with PD-2 — the two interact,
because both turn on what Step 4.3 must satisfy before it may close.

## Important repository and production evidence

- Full state: `docs/REDESIGN_STATE.md`
- Current phase contract: `docs/redesign/phases/04-log-a-game.md`
- Current production apply record:
  `docs/agent-handoffs/GUEST-IDENTITY-ORACLE-REVOKE-APPLY.md`
- Source-bound local implementation:
  `docs/agent-handoffs/PHASE-04-STEP-03-IMPORT-IDENTITY-SOURCE-BOUND-MATCHING-IMPLEMENTED-LOCAL.md`
- Latest remediation:
  `docs/agent-handoffs/PHASE-04-STEP-03-IMPORT-IDENTITY-MATCHING-REGRESSION-REMEDIATION.md`
- `ID-READER-CLIENT` audit remediation, its closeout, and the integration that
  merged them onto this branch:
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md`,
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md`,
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-INTEGRATION.md`
- Migration/ledger map: `docs/redesign/reference/MIGRATION-LEDGER-MAP.md`
- Deploy and production-write ledger: `DEPLOY-STATE.md` on
  `fix/live-compare-data-remove-declared-style`, read with
  `git show fix/live-compare-data-remove-declared-style:DEPLOY-STATE.md`. Every
  filesystem copy is a factless pointer stub.

## Rules

- This file routes work; it does not authorize a migration, deploy, push,
  production read/write, new phase, or next substep.
- Do not treat remediation or documentation claims as executable proof.
- Require executable repository evidence before marking a finding resolved.
- Record production evidence separately from local test evidence.
- When documentation conflicts with code, migrations, tests, or production
  evidence, report the contradiction and reconcile the current documents before
  implementation.
- Do not modify unrelated application or production rows during verification.
