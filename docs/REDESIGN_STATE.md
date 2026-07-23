# TM Stats Redesign State

## Current substep

Phase 4, Step 4.3 - Import Validation, Evidence Review, and Claimable Guest
Identity (**BLOCKED at the release boundary. The approved source-bound
replacement is BUILT locally and REMEDIATED. Production subsequently applied
its expansion as ledger `20260722132159`, applied interim reason coarsening as
`20260722144034`, and revoked authenticated execution of the separate guest
identity resolver as `20260722153233`. The `ID-READER-CLIENT` repair is now
BUILT, REMEDIATED after an independent audit returned FAIL, executably
proven LOCALLY, and **MERGED into this branch**. **Its migration
`20260722160000` was APPLIED to production on 2026-07-23 as ledger
`20260723082917` — the EXPAND step — but the reader is STILL NOT DEPLOYED and
nothing in production calls the function it added. `ID-READER-DEPLOY` is now the
active gate.** The legacy free-form matcher oracle
remains open, contraction `20260722012707` remains gated and unapplied, the
CONTRACT drop of the 7-argument guest resolver is not authored, and Step 4.4 is
NOT STARTED. The targeted re-audit of the remediated work RAN on 2026-07-23 and
returned **FAIL** on documentation and coverage only; its four findings are now
addressed and the migration remains gated. Both independent audits of this work
are now on the repository record in
`docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-INDEPENDENT-AUDIT-TRAIL.md`.
Nothing beyond that is authorized by this document.**) The production ledger
attestation on this lineage now reads **116 entries, head `20260723151221
add_service_role_import_name_matcher_overload`**, **read live** on 2026-07-23 by
the session that performed the matcher expand apply.

**THE MATCHER EXPAND IS ALSO APPLIED.** Migration `20260723130000` was applied to
production on 2026-07-23 at **15:12:21Z** as ledger `20260723151221`. **No deploy
accompanied it and nothing in production calls the new three-argument overload.**
`MATCHER-READER-MERGE`, `MATCHER-READER-DEPLOY`, and the production verification
are the three remaining gates before contraction `20260722012707`, and **none of
them is open**. Applied is not deployed and is not closed.

### Two accepted work items recorded: the expand merge, and a disputed apply report disproven (2026-07-23)

Documentation and record only. **No production access of any kind occurred** —
no Supabase MCP call, no `execute_sql`, no `list_migrations`, no `wrangler`, no
`/api/deploy-info`, no production logs, no direct database connection. **No
migration applied, no migration file added or changed, no deploy, nothing
pushed, nothing merged.** One commit on `redesign/tm-stats-dashboard-rebuild`.

**Both work items carry verdict PASS.**

#### 1. `MATCHER-OVERLOAD-EXPAND-MERGE` — PASS. Already on the record

The migration half of the three-argument service-role matcher overload was
merged onto this branch as `2b2a3b00e` (`--no-ff`, both parents intact), from
source branch `fix/matcher-service-role-overload-expand` @ `bb5370ab4` — the
exact commit an independent audit examined and passed — with record corrections
following at `a9429e213`. All four SHAs re-derived `[GIT]`.

**This item was already fully recorded before this session**, in
`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-MERGE-AND-RECORD-CORRECTIONS.md`
(the merge, the authorized row-level conflict rule and its verification, the four
audit findings and their disposition) and in
`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-BUILT-LOCAL.md` (the
validation figures). Both are in the active handoff group. **No second handoff
was created for it**, because a duplicate record of one work item is precisely
the class of defect this project keeps correcting. See "Discrepancy" below.

**Migration `20260723130000` is GATED AND UNAPPLIED.** The remaining sequence is
four separately-authorized gates, in this order and no other, and **none of them
is open**: apply `20260723130000`; merge and deploy the moved reader; verify in
production that a real import returns a **non-zero** match count; only then apply
contraction `20260722012707`. `fix/matcher-service-role-overload-callsite` @
`5894c874a` stays **deliberately unmerged and local-only** — merging it before
the apply opens a window in which any unrelated deploy of the live lineage would
break live import matching with `PGRST202`/`42883`. It is on **no remote**
`[GIT]`.

> **SUPERSEDED 2026-07-23 15:12:21Z — the first of those four gates is now
> closed.** `20260723130000` is **APPLIED** as ledger `20260723151221`. The
> paragraph above is retained as the state that was correct when written; read
> the "Current substep" block and
> `docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-EXPAND-APPLIED.md` for
> current state. **THREE gates remain, unchanged in order and none of them open:**
> merge the moved reader, deploy it, verify a real import returns a **non-zero**
> match count in production — only then contraction `20260722012707`.
> `fix/matcher-service-role-overload-callsite` @ `5894c874a` remains
> **deliberately unmerged, local-only, and on no remote**; the hazard that kept it
> unmerged (`PGRST202`/`42883` on an unrelated live deploy) is now retired by the
> apply, but merging and deploying it are still separately authorized gates.

#### 2. `MATCHER-APPLY-FORENSICS` — PASS. The disputed report is disproven

A session returned a detailed report **claiming** it applied `20260723130000` to
production at 13:20:35Z under ledger version `20260723132035`, moved the ledger
from 115 to 116, verified two overloads and their ACLs from the catalog, proved
the two-argument function byte-identical, passed the harness, and created commits
`5b9be6dad` and `03cdafcbc`.

**A read-only forensic investigation established that NONE of it happened.**
Evidence class **`[PRIOR]`** — the findings come from that session's report and
were not re-derived here.

- **The ledgers.** All three projects in the account were read — tm-stats
  (`qjtwgrjjwnqafbvkkfex`), Valeria (`zyoqrknojxoqwqftsrab`), Moonrakers
  (`znpzawotdmkcdjpwjkds`). **No entry at `20260723132035`, no matcher-named
  entry, and no entry in `20260723130000`–`20260723140000`, in any project** —
  each a **CHECKED absence**. tm-stats holds **exactly 115 entries**, head
  `20260723082917 add_non_import_guest_identity_creator`, transcribed and counted
  mechanically, with **nothing dated after 08:29:17Z that day**.
- **The commits.** Neither SHA exists in **any of 13 distinct object databases**
  on the machine. A full `--batch-all-objects` sweep shows no object with either
  prefix exists at all; neither is among the **88 dangling commits** or the **145
  in `lost-found/commit/`**; `git log -S` finds them in no tracked content ever;
  and a whole-profile grep finds them in exactly one file — that session's own
  transcript, because the brief quoted them. **They are not lost. They were never
  written.**
- **The sessions.** Both alive in the window are on record and **both correctly
  refused**. Session `087a4061` ran 13:10:06–13:16:09Z and returned **BLOCKED**,
  stating the migration was not applied and citing a churning worktree and the
  CRLF trap. Session `886d04e3` ran to 13:24:35Z, made the two **real** commits
  `2b2a3b00e` (13:03:00Z) and `a9429e213` (13:19:41Z), stated no production
  access occurred, and **declined to start the apply**. The reflog is continuous
  with **no entry at 13:20:35Z**; the claimed timestamp sits in the empty gap
  between the real commit at 13:19:41Z and the real planning-pack publish at
  13:21:04Z.

**`[THIS SESSION]`, one object database only.** `git rev-parse --verify -q` in
the redesign primary resolves `2b2a3b00e`, `a9429e213`, `bb5370ab4` and
`5894c874a` and **fails on both `5b9be6dad` and `03cdafcbc`** `[GIT]`. That
confirms their absence from **one** ODB — this repository's, which its linked
worktrees share — and is **not** a re-derivation of the 13-ODB sweep.

**Production is unchanged and correct at 115 entries, and there is no drift to
repair.** Full record:
`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-APPLY-FORENSICS.md`.

#### A prior observation corrected: "no dangling commits" was FALSE

There are **88**, plus **145** in `lost-found/commit/`. **Cause identified:**
`Select-Object -First 20` truncated the `git fsck` output, whose first 20 lines
happen to be **6 blobs and 14 trees**, so the truncated view contained no commit
and read as "none exist". **The conclusion is unaffected** — neither disputed SHA
is among them. Recorded because a truncation artifact that reads as a finding is
worth the project remembering: the command succeeds, the output is well-formed,
and nothing signals that the interesting rows were cut.

#### Four open items — recorded as OPEN, and NOT closed

1. **The disputed report's origin is UNRESOLVED.** It exists in **neither
   transcript store**. That is consistent with a client that does not persist
   locally, a deleted transcript, or a report produced elsewhere, and **the
   available evidence does not distinguish them.**
2. **Gap 1e.** A ledger read proves the **claimed mechanism** did not occur,
   because `apply_migration` always writes a ledger row, but it **cannot rule out
   DDL applied by a ledger-bypassing path**. The `pg_proc` catalog read that would
   close it was withheld, and **the owner has DECLINED to authorize it
   separately**; it closes as a side effect of the eventual authorized apply's own
   catalog verification. **Open until then.**
3. **The project has NO local MCP invocation audit trail.** The only trace of any
   MCP tool call is inside session transcripts; **if a transcript is absent there
   is no local record that any call it made ever happened.** This is a
   **structural audit limit of the project**, discovered here, and is recorded
   independently of this incident because it would apply to any future dispute
   about whether a production call was made.
4. **The planning-pack updater's `latest.log` is ROLLING** and is overwritten
   each run; **the 13:21:04Z run's log no longer exists.** Tooling design
   destroying audit evidence. **`[THIS SESSION]` corroboration `[REPO]`:**
   `latest.log` currently holds a later run, completed 13:56:06Z and reporting
   `0 created, 0 updated, 48 unchanged` — the 13:21:04Z log is already gone.

#### Two operational notes for future read-only forensic work

1. **`git fsck --lost-found` WRITES** files under `.git/lost-found/`, so it is not
   read-only. **`--dangling` is the correct read-only substitute.**
2. **Linked worktrees share the main repository's object database; separate
   clones do not.** Checking one worktree does **not** establish a commit's
   absence from the machine.

#### The amended-prompt finding — a project-workflow defect on the planning layer

**Recorded against the planning layer, not against any worker.** An amended
worker prompt **must reconcile its authorization and acceptance sections against
its retained body before issuing**. The forensics brief was a composite whose
**retained Step 6** authorized one handoff and one commit and directed a detached
worktree, while its **amended authorization required zero writes**.

**The executing session handled it correctly** — it identified the conflict,
applied the stricter constraint, made no commit, created no branch, substituted
`--dangling` for `--lost-found`, and disclosed all of it. **But a session that
resolved it silently, or badly, would have been indistinguishable at review
time.** Correct handling by one worker does not make the prompt safe; it makes
the prompt's risk invisible. **Mitigation now in force:** a prompt-integrity
instruction requiring a worker to **stop and report** a prompt-internal conflict
rather than resolve it.

#### Discrepancy: this session's brief was wrong about what was already recorded

Reported rather than silently absorbed, per the repository-governs rule.

- The brief stated the merge work item **"is not in the canonical record"** and
  that the declared latest handoff **"predates both items"**. **Both are false**
  `[REPO]`. `PHASE-04-STEP-03-MATCHER-OVERLOAD-MERGE-AND-RECORD-CORRECTIONS.md`
  exists, records that item, and **is the first entry of the active handoff
  group**. No duplicate was created.
- The brief stated the published planning pack **"is stale by both"** items. **It
  was stale by the forensics item only** `[REPO]`. `.claude/.pack-last-sync`
  equals `a9429e213`, and the updater's own summary records a run completed
  13:56:06Z with `success: true` and **`0 created, 0 updated, 48 unchanged`** —
  the pack was already current with the merge. The pack **did** carry the stale
  three-argument-overload sentence, but because that sentence was still live in
  this file, **not** because the pack lagged the repository.
- The brief anticipated that `20260723130000` might be missing from
  `GATED_UNAPPLIED`. **It was already registered, with an explicit `expansion`
  hazard class** `[REPO]`, and `docs/redesign/reference/MIGRATION-LEDGER-MAP.md`
  already agreed with the code. **Nothing was genuinely absent to reconcile.**

### Matcher service-role overload BUILT LOCALLY, gated (2026-07-23) — PD-1 decided

Owner decision **PD-1** of 2026-07-23: **build** the three-argument
`match_import_player_names` overload the 2026-07-22 amendment adopted, rather
than accept a full redesign deploy as the price of unblocking contraction
`20260722012707`. The owner accepted explicitly that this is **a lesser
destination reached sooner** — the manual-entry replacement remains owed, and
the contraction **re-gates rather than closes**.

**Built locally. Nothing was applied, deployed, pushed, or read from
production.** No Supabase MCP call, no `execute_sql`, no `list_migrations`, no
wrangler, no `/api/deploy-info`, no production logs, no direct database
connection. Every statement about the currently deployed function, ACL, or
Worker configuration in this section is **[PRIOR]** or **[UNVERIFIED]**.

**The artefact SPANS BOTH LINEAGES, and that is a property of the repository
rather than a choice.** The migration ledger (`src/lib/db/migration-ledger-map.ts`),
the executable harness (`supabase/tests/executable/`), the state documents, the
handoff convention and the `validate:claude-context` gate exist **only** on this
redesign lineage; the matcher's three call sites and the single wrapper they
funnel through exist **only** on the live-site lineage
`fix/live-compare-data-remove-declared-style`, which carries none of that
infrastructure and no matcher migration at all [GIT]. Neither lineage can hold
both halves. Two task branches were therefore used, one commit each:

| Half | Lineage | Branch | Contents |
|---|---|---|---|
| Migration | `redesign/tm-stats-dashboard-rebuild` | `fix/matcher-service-role-overload-expand` | `20260723130000_add_service_role_import_name_matcher_overload.sql`, ledger registration, executable proof, this record |
| Reader | `fix/live-compare-data-remove-declared-style` | `fix/matcher-service-role-overload-callsite` | `src/lib/db/import-player-resolution-repo.ts`, its audit helper's contract comment, and tests |

**What the migration does.** It creates ONE new signature,
`public.match_import_player_names(p_group_id uuid, p_requesting_user_id uuid,
p_imported_names text[])` — `security definer`, `search_path = ''`, granted to
`service_role` only with the default `PUBLIC` grant revoked. **It names the
deployed `(uuid, text[])` signature in no statement at all**, so that function's
body, comment and ACL are untouched, proven byte-identical across the apply.
Registered in `GATED_UNAPPLIED` and classified `expansion`, derived from the SQL
and justified in the ledger map.

**Both identity predicates were converted, and there are exactly two.** The gate
`public.is_group_member(p_group_id)` — whose `auth.uid()` dependency is invisible
at the call site — and the candidate pool's
`where gm.user_id = (select auth.uid())` both now read `p_requesting_user_id`.
Nothing else in the body reads caller identity.

**Three constraints re-derived by execution, not inherited.**

- `p_requesting_user_id` carries **no default**, verified in both directions on a
  disposable PostgreSQL 18 cluster: without one, positional and named
  two-argument calls both still resolve unambiguously; with `default null` both
  raise `42725`. **New finding, not in the scoping:** placing the parameter in
  **position two**, matching the four applied gateways of `20260722012658`, makes
  the defaulted form fail at CREATE with `42P13` rather than applying and
  breaking live calls — the single most likely mistake becomes
  impossible-by-construction, not merely forbidden.
- A **null requesting user is rejected in SQL** with `22023`. Unguarded it
  returns zero rows and no error.
- The caller uses a **fail-closed** resolver, not the audit-purposed one, and
  that resolver's now-false "the RPC remains gated by RLS on the caller's
  session" comment is corrected: after the move there is no session on the RPC.

**Every assertion is mutation-proven** — eleven mutations (eight SQL, three
TypeScript), each broken, each observed to fail its own assertion, each reverted
with `git write-tree` proving byte-identity. Detail:
`docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-BUILT-LOCAL.md`.

**Four gates remain, in this order and no other, each separately authorized:**
apply `20260723130000`; deploy the moved reader; verify in production that a real
import returns a **non-zero** match count; only then apply `20260722012707`.
Deploying the reader before the migration lands breaks import analyze and both
manual player-resolution paths with `PGRST202`/`42883` — loud, confined to those
paths, and reversible by redeploying the previous Worker version, but a real
outage that **only sequencing prevents**.

**`SUPABASE_SERVICE_ROLE_KEY`'s binding on the live Worker remains
[UNVERIFIED]** and was deliberately not investigated: it is a precondition of the
DEPLOY, not of the build.

**Nothing else changed.** Step 4.3 is not complete, `DECISIONS.md` was not
edited, no other pending decision was resolved, and no blocker's `Blocking` value
was changed. Two tracked items were added to `docs/CURRENT_STATUS.md`:
`MATCHER-MANUAL-ENTRY-REPLACEMENT` (owed, with a dated review by 2026-08-23) and
the **re-gated-never-closed** language rule on `ID-LEGACY-ORACLE`, which is
backed executably by
`supabase/tests/executable/matcher-service-role-overload-post-contraction.sql`.

### EXPAND applied: `20260722160000` → ledger `20260723082917` (2026-07-23)

The first schema-affecting production write of the redesign effort, performed
under a single-mutation authorization. **Exactly one production mutation was
issued.**

- **Target** Supabase `tm-stats` / `qjtwgrjjwnqafbvkkfex`, identity verified
  before applying. **Applied** 2026-07-23 08:29:17Z.
- **Ledger** 114 entries before (head `20260723014849 repair_snapshot_player_ids`)
  → **115** after (head `20260723082917 add_non_import_guest_identity_creator`).
  Both read live, either side of the apply. Exactly one entry added. The
  pre-apply read **confirmed the 2026-07-23 transcribed reconciliation was
  exactly correct**, closing the question that reconciliation left open.
- **Version drift, as predicted.** Filename `20260722160000`, ledger
  `20260723082917`. Registered by NAME in
  `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME`; `GATED_UNAPPLIED` now holds
  **five** entries.
- **What landed.** Six statements: one `create or replace function`, three
  revokes and one grant scoped to that same new function, and one comment. It
  drops nothing, alters nothing pre-existing, and revokes nothing any other
  object holds. The SQL sent was confirmed byte-identical to the committed
  repository blob first.
- **Post-apply verification.** Exactly **one** overload of
  `public.create_or_reuse_guest_identity` exists; ACL is
  `{postgres=X/postgres,service_role=X/postgres}` — `authenticated` and `anon`
  hold no EXECUTE and no `PUBLIC` grant survived. `prosecdef` true,
  `search_path` empty.
- **Hazard class re-confirmed `expansion`** against the SQL that actually landed
  and the post-apply catalog.
- **What was deliberately NOT read.** `public.resolve_import_guest_identity` —
  its ACL, definition and every other property. That read is the CONTRACT step's
  precondition, a separate gate, and was outside this session's authorization.
  **It remains outstanding.** No production table row and no personal data was
  read.
  **Superseded 2026-07-23 as to the last claim, and retained as the record of
  what this session did.** The statement is accurate for the expand session: it
  did not make that read. A **separately authorized read-only session** made it
  later the same day, at 09:40:14Z. The read is therefore **no longer
  outstanding** — see "The production catalog read" below. Everything else in
  this bullet stands unchanged.

### OWNER DECISION (2026-07-23): the reader-deploy precondition on the 7-argument drop is SUPERSEDED and replaced by three

Documentation only. **Nothing is authorized, applied, dropped, deployed, or
pushed by this record**, and no blocker's `Blocking` value changed. No
production access of any kind occurred in the session that recorded it.

The owner decided that the recorded precondition on `ID-READER-CONTRACT` — that
the drop of the deployed 7-argument `public.resolve_import_guest_identity` is
valid only after the moved reader is deployed and production-verified — is
**SUPERSEDED**. The full decision text, which is authoritative over this
summary, is `docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 - The
seven-argument resolver drop: replacing the reader-deploy precondition".

**The three preconditions that replace it**, each binding on the session that
authors the drop:

1. **RE-DERIVE THE SIGNATURE LIVE** from the production catalog before writing
   any drop statement. A signature recorded from a report is not a signature
   read from the catalog, and `drop function if exists` against a signature that
   does not exist succeeds silently against nothing.
2. **RE-RUN THE CATALOG SWEEP** for database-internal callers — function bodies,
   view definitions, triggers and dependency records across all non-system
   schemas — with a positive control so an empty result is meaningful. The
   existing sweep was taken on 2026-07-23 and production can move.
3. **VERIFY THE DEPLOYED EDGE FUNCTIONS.** The repository records the project's
   only edge function as a disabled stub (`20260722153000:40-41`, **[REPO]**),
   but that is a prior record rather than an observation, and edge functions are
   one of the four areas the catalog sweep explicitly does not cover.

**Residual risk accepted by the decision:** consumers outside the database, and
dynamic SQL that never stores the name literally. Recovery is straightforward if
that is wrong — the function body is preserved in migration `20260718212339`
(**[REPO]**) and can be recreated.

**TRACKED CONSEQUENCE OF THE DROP, inherited by the session that performs it.**
Dropping the function in production makes this repository's record of it
permanently stale: two migrations on the redesign lineage create it
(`20260718050924`, `20260718212339`) and the executable harness asserts that it
**exists** — `supabase/tests/executable/run.sh:254` fails when
`to_regprocedure('public.resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean)')`
is null, and `non-import-guest-identity-after.sql:71,77` names the same
signature (**[REPO]**). This is the same class of repository-versus-production
divergence the carry convention exists to prevent, arriving from the opposite
direction. **It must be handled as part of the drop's own work, not discovered
afterwards.** Handling it is separately unauthorized and was not begun.

**What the decision does NOT do.** It does not close an oracle — authenticated
EXECUTE was already revoked as ledger `20260722153233` and the ACL is
`{postgres,service_role}` only **as of the authorized catalog read of 2026-07-23
09:40:14Z**, a **[PRIOR]** record that precondition 1 re-derives live before any
drop — so no status line may describe the drop as closing or mitigating an
exposure. It does not authorize the drop. It
does not touch contraction `20260722012707`, which remains genuinely
deploy-gated. And it does **not** dissolve `ID-READER-DEPLOY`: the redesign
reader remains undeployed and will eventually need to ship — it is simply no
longer a precondition of the 7-argument drop.

Handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-SEVEN-ARGUMENT-DROP-PRECONDITION-REPLACEMENT.md`.

### Finding (2026-07-23): the 7-argument drop's reader dependency has no found caller

Recorded as a **finding**. **No disposition changed, and the precondition is
left standing.** The record states that the CONTRACT drop of the deployed
7-argument `resolve_import_guest_identity` is valid only after the moved reader
is deployed and production-verified. A read-only sweep found no reader on any
lineage that calls that function.

**SUPERSEDED 2026-07-23 as to the reader-deploy precondition only, and retained
as the record of what this sweep found.** The owner decision above replaced that
precondition with the three listed there. The finding's evidence, its four
uncovered areas, and its refusal to treat "no caller was found" as "the drop is
safe" all stand unchanged — two of those uncovered areas are now precondition 2
and precondition 3.

- **Swept [GIT]:** production source commit
  `865df0108f2f7b9df000ad3aeb8fcd394e6242a5` (the commit named in the canonical
  `DEPLOY-STATE.md`) — zero `src/` occurrences, the only hits being
  `DEPLOY-STATE.md` prose; rollback target `d12e33ad0` — zero `src/`
  occurrences; and this branch at `44eed2e21` — comments, the ledger map, and a
  test asserting the RPC is **not** called.
- **Positive control:** the same command on the same commit finds `.rpc(` in
  fourteen `src/` files and finds `match_import_player_names`, so the absence is
  real rather than a broken search.
- **NOT covered, all four open:** database-internal callers since the expand
  landed; edge functions as deployed; consumers outside this repository; and
  whether the swept commit is what production actually serves — that commit is
  **[PRIOR]** from the canonical ledger, whose own authenticated
  `/api/deploy-info` `sourceCommit` confirmation is recorded there as
  outstanding.
- **The precondition is NOT relaxed.** "No caller was found" is not "the drop is
  safe", and the four gaps above are exactly where a caller would hide.
  Relaxing or removing the reader-deploy precondition on a production drop is an
  **owner decision** and has not been made.
  **SUPERSEDED 2026-07-23 — that owner decision HAS since been made**, and the
  original text is retained as the record of what this sweep concluded at the
  time. The reader-deploy precondition is replaced by the three preconditions in
  the owner-decision section above. The first sentence still stands on its own
  terms: "no caller was found" is still not "the drop is safe", which is exactly
  why two of the four gaps became preconditions rather than being dismissed.
- **Real regardless of that decision, and SATISFIED 2026-07-23 09:40:14Z
  [PRIOR]:** the authorized production ACL and signature read on the resolver,
  and a fresh production-side catalog sweep for database-internal callers. Both
  were made by a separately authorized read-only session; the sweep found **no**
  database-internal caller. **This closes those two preconditions and nothing
  else.** The four uncovered areas above stay open, the reader-deploy
  precondition stays in force, the signature must be **re-derived live** before
  any drop statement is authored, and a further sweep is required if production
  changes before the drop. See "The production catalog read" below.
  **SUPERSEDED 2026-07-23 as to "the reader-deploy precondition stays in force",
  and retained otherwise unchanged.** That precondition is replaced by the three
  in the owner-decision section above. Every other clause here is not merely
  retained but reinforced: the four uncovered areas still stay open, the
  live signature re-derivation is now **precondition 1**, and the further sweep
  if production changes is now **precondition 2**.

Detail, including the two-gate distinction this dependency is often confused
with: `docs/redesign/reference/MIGRATION-LEDGER-MAP.md`.
- **No deploy occurred.** No `wrangler`, no build, no `/api/deploy-info`, no
  Cloudflare action. The reader remains undeployed and the contraction stays
  gated. Applying this authorized none of them.
- **Rollback**, valid only while nothing calls the function, and only with fresh
  owner authorization: `drop function if exists
  public.create_or_reuse_guest_identity(uuid, uuid, text, text, text, text,
  uuid, boolean);`
- **Harness treatment corrected.** `20260722160000` moved from gated to applied,
  so `supabase/tests/executable/run.sh` no longer describes it as gated. Its
  mechanical treatment is **unchanged and still correct**: it stays deferred from
  the production-history replay, exactly as the two other production-APPLIED
  deferred files are, so the `ID-READER-CLIENT` BEFORE/AFTER pair can span the
  expand on one database. Only the annotations changed. Harness passes end to
  end.

### The production catalog read (2026-07-23 09:40:14Z) — evidence class [PRIOR]

**What this is, and what it is not.** An authorized read-only session issued
`SELECT`s only against the production catalog of `tm-stats` /
`qjtwgrjjwnqafbvkkfex` (PostgreSQL 17.6) at 09:40:14Z on 2026-07-23. It read
**no application table and no personal name**, performed **no Cloudflare action**
of any kind, and **mutated nothing** — no migration, no grant, no revoke, no
drop, no deploy, no push. The migration ledger stood at **115 entries, head
`20260723082917 add_non_import_guest_identity_creator`**, unchanged by the read.

**Provenance, and it is load-bearing.** That session was blocked from writing to
this repository by a concurrent writer in the redesign worktree, so its results
existed only in the owner's session record — the same gap that left both
independent ID-READER audits uncommitted. **This section is written by a later
documentation-only session that made no production read of its own**, working
from that session's report. Every production value below is therefore **[PRIOR]**
— a committed record of a live read, not a live read — exactly as the ledger
attestation transcribed onto this lineage on 2026-07-23 was, and as the audit
trail in
`docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-INDEPENDENT-AUDIT-TRAIL.md` is.
**No claim below is [LIVE].**

**Requirement on the session that authors the `ID-READER-CONTRACT` drop: RE-DERIVE
THE SIGNATURE LIVE FROM THE CATALOG FIRST.** A signature recorded from a report
is not a signature read from the catalog. `drop function if exists` against a
signature that does not exist **succeeds silently against nothing** — the
function survives while the session records it as dropped. That is precisely the
failure the ID-READER re-audit's FINDING A described against a stale handoff, and
the values below do not discharge the requirement.

**A. The resolver — exactly ONE overload, in `public`, in no other schema.**

```
public.resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean)
```

Named arguments `p_group_id uuid, p_identity_mode text, p_guest_username text,
p_guest_first_name text, p_guest_last_name text, p_selected_player_id uuid,
p_create_new boolean`. OID `21767`; owner `postgres`; `prosecdef` **true**;
`proconfig` `{search_path=""}`; `md5(prosrc)`
`2892f3189a15f04c35641473541fc5bd`, `length(prosrc)` `7504`; returns
`TABLE(player_id uuid, public_name text, resolution_state text,
normalized_imported_value text)`; member of **no extension**.

**Production matches what both creating migrations declare, character for
character.** The repository half was re-verified independently for this record
(**[REPO]**): `20260718050924:267-279` and `20260718212339:79-93` declare the
same seven arguments in the same order and the same four-column return, and the
three revoke/grant statements in each name
`(uuid, text, text, text, text, uuid, boolean)`. **Production was never
ambiguous about this function's identity**, so the recorded signature hazard is a
**documentation** defect only — which is what the re-audit's FINDING A actually
found, against a published handoff rather than against the database.

**B. The `service_role` EXECUTE discrepancy — RESOLVED. `service_role` HOLDS
EXECUTE.** `proacl` is `{postgres=X/postgres,service_role=X/postgres}`. Confirmed
**two independent ways**: the raw `proacl`, and `has_function_privilege`
evaluated across **11 roles**, which resolves `PUBLIC` membership and role
inheritance that a raw ACL read alone does not. `authenticated` **NO**, `anon`
**NO**, `PUBLIC` **NO**, `authenticator` **NO**; `postgres` and `supabase_admin`
yes.

- **The applied revoke migration's header was CORRECT.** `20260722153000` states
  the pre-state ACL was `{postgres,authenticated,service_role}` and that
  "`postgres` and `service_role` deliberately keep EXECUTE". Production bears
  that out.
- **It is the creating migrations' grant lists that are an incomplete picture of
  production** [REPO]: the only EXECUTE grants on this function anywhere in
  `supabase/migrations/` are `20260718050924:540` and `20260718212339:296`, and
  both name `authenticated` alone. **No migration in this repository grants
  EXECUTE on the resolver to `service_role`.**
- **[INFERENCE], and it must not be upgraded.** The reading session marked a
  **project-level default grant** — rather than any migration statement — as the
  likely origin, having **NOT** queried `pg_default_acl`. The mechanism is
  therefore not established. The ACL answer is a finding; the explanation for it
  is an inference, and settling it would require a further authorized read.
- The discrepancy was recorded as unsettled in
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-INDEPENDENT-AUDIT-TRAIL.md`
  ("the recorded discrepancy over whether service_role holds EXECUTE on the
  deployed seven-argument resolver remains unsettled and requires an authorized
  production ACL read"). **That document was deliberately not edited** — it
  records what two read-only audits could reach, and amending an audit trail is
  not the same as answering the question it left open. The resolution is recorded
  here and on the canonical `DEPLOY-STATE.md`.

**C. Database-internal callers — NONE FOUND.** Zero hits across **172** function
bodies, **41** views, **0** materialized views and **13** user triggers, in all
**12** non-system schemas; and **zero** `pg_depend` rows referencing OID `21767`.

- **Positive controls returned hits on the same query shapes**, so the empty
  results are meaningful rather than a broken sweep.
- **Two blindness checks were clean**: no function in the database uses a
  SQL-standard body, so the `prosrc` text sweep has no gap; and the resolver
  belongs to no extension.
- **What the sweep does NOT cover — four areas, all open, and they must be
  carried wherever the result is cited:** (1) Edge Functions as deployed; (2) any
  consumer outside the database, including application source on any lineage;
  (3) whether the commit production actually serves matches any swept tree; and
  (4) runtime-constructed dynamic SQL that never stores the name literally.
- **This is the production-side complement** to the repository-side sweep already
  recorded above under "the 7-argument drop's reader dependency has no found
  caller", whose first uncovered area was exactly "database-internal callers
  since the expand landed". That one is now covered; the other three are not.
- **"No caller was found" is still not "the drop is safe."** The reader-deploy
  precondition is **NOT** relaxed, no blocker is reclassified, and a further
  production-side sweep is required if production changes before the drop is
  authored.
  **SUPERSEDED 2026-07-23 as to the reader-deploy precondition only**, by the
  owner decision recorded above; the original text is retained. The other two
  clauses are unchanged and still binding — no blocker is reclassified, and the
  further production-side sweep is now **precondition 2** of the drop rather
  than a caveat on this sweep.

**D. The expand — VERIFIED as applied, from the catalog, by a different session
than the one that applied it.** Exactly one overload of
`public.create_or_reuse_guest_identity(uuid,uuid,text,text,text,text,uuid,boolean)`;
`prosecdef` true; `proconfig` `{search_path=""}`; `proacl`
`{postgres=X/postgres,service_role=X/postgres}`; `authenticated` **NO**, `anon`
**NO**, no surviving `PUBLIC` grant; `md5(prosrc)`
`99906055c863c4bebad13c21648a3058`, `length` `7897`. This matches the ACL the
expand session recorded post-apply, independently re-derived. The eight-argument
signature is the one the shipped migration creates.

**E. The matcher — the adopted design is UNBUILT, now confirmed in production
too.** One overload only, `public.match_import_player_names(uuid,text[])`;
`prosecdef` true; `proconfig` `{search_path=""}`; `proacl`
`{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` —
**`authenticated` CAN execute it**; `md5(prosrc)`
`522f8cb0a2647c57e35da0a081f90480`, `length` `4191`. The **three-argument
`service_role`-only overload** adopted by the 2026-07-22 owner decision exists
**neither in the repository nor in production**; the repository half was
re-verified for this record (**[REPO]**). Its absence from production was
previously an open unknown, because the repository sweep could only speak for the
repository.

**SUPERSEDED 2026-07-23 as to the repository half only; the original sentence
above is retained as history.** The three-argument overload **now EXISTS IN THE
REPOSITORY**: it was built under owner decision **PD-1** as gated migration
`20260723130000_add_service_role_import_name_matcher_overload`, and merged onto
this branch as `2b2a3b00e` (`--no-ff`) from `fix/matcher-service-role-overload-expand`
@ `bb5370ab4` **[GIT]**. **It remains ABSENT FROM PRODUCTION**, and that half of
the original sentence is unchanged and still current: the migration is **GATED
and UNAPPLIED**, the production ledger stands at 115 entries with head
`20260723082917` **[PRIOR]**, and a 2026-07-23 forensic investigation
**disproved** a report claiming it had been applied — see "Two accepted work
items recorded" above. The `[PRIOR]` catalog values recorded in this paragraph
were read on 2026-07-23 at 09:40:14Z, **before** the build and merge, so they
remain an accurate record of production and were never a claim about the
repository after that date.

- **The matcher oracle remains OPEN** behind the interim coarsening
  `20260722144034`, exactly as already recorded, and contraction
  `20260722012707` remains gated and unapplied. `ID-LEGACY-ORACLE` is unchanged.
- **This resolves no decision.** Whether to build the overload, retire the
  amendment, or leave it dormant is the owner's, registered as **PD-1** in
  `docs/CURRENT_STATUS.md`. The production read does **not** distinguish
  superseded-without-record from adopted-and-never-built: an absent object is
  equally consistent with both. `docs/redesign/DECISIONS.md` was **not** edited.

**What this read did not authorize: nothing.** It grants no authority to author
or apply the `ID-READER-CONTRACT` drop, to apply `20260722012707`, to deploy the
moved reader, to build the three-argument overload, or to resolve PD-1, PD-2 or
PD-3. Recorded on the canonical `DEPLOY-STATE.md` at `0d866559` on
`fix/live-compare-data-remove-declared-style`.

### Production ledger drift closed: `20260723014849` registered production-only (2026-07-23)

Local ledger reconciliation only. **No production read and no production write
of any kind was authorized or performed** — no Supabase MCP call, no
`execute_sql`, no `list_migrations`, no `wrangler`, no `/api/deploy-info`. No
migration applied, no migration file added or changed, no deploy, nothing
pushed. One commit on `redesign/tm-stats-dashboard-rebuild`.

**The drift.** Migration `20260723014849 repair_snapshot_player_ids` is applied
in production — the data half of the live-site saved-game player-label release,
applied ~01:48Z on 2026-07-23 ahead of its own frontend — and this lineage had
**no record of it in any form**. All three absences were established
separately: no file under `supabase/migrations/`, no entry in
`src/lib/db/migration-ledger-map.ts`, and no row in
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`. Meanwhile
`PRODUCTION_LEDGER_ATTESTATION` still read 113 entries with head
`20260722153233`, against production's 114 with head `20260723014849`. This
blocked the next gate: the expand apply of `20260722160000` has a precondition
that the attested ledger match production, and it was false by exactly one
migration. A worker session had already stopped on it.

**Treatment: registered production-only, file deliberately NOT carried.** The
two available treatments are the #106 carry and the production-only register,
and the discriminator is not whether a file exists somewhere — one does, at
`75f6e0794` on `fix/live-compare-data-remove-declared-style`, blob
`1a1d70905bbabe450c90b6a40fc87b1527c9375e`. The discriminator is whether **this
lineage records a stale definition the migration corrects**. The #106 carry was
made because this branch's record of the three claim RPCs was the pre-fix,
vulnerable bodies, so a redesign deploy or `db diff` could have reproduced them
and silently reverted production. `20260723014849` defines nothing: its only DDL
is two `create table if not exists private.mig_*` audit artifacts, and its
substance is an `UPDATE` of `public.game_revisions.snapshot` row values — no
function, view, policy, constraint, column or grant is created, altered or
dropped. Nothing here is stale, so the #106 condition is absent and its remedy
does not apply. Three independent points agree: the nearest structural
precedent, `20260721193508`, is also a file on the production lineage — with
real schema surface, unlike this one — and was registered production-only by
the same session that carried #106; no file in `supabase/migrations/` creates a
`private.mig_*` table or repairs production rows (zero of 55), while
`DEPLOY-STATE.md` records several production repairs that did exactly that, all
of them production-only entries with no repo file; and carrying it would inject
a one-time production data repair into the harness's clean-baseline schema
replay, where the rows it repairs cannot exist. Evidence class **[REPO]** for
the convention, **[PROJECT-DOC]** for the production facts.

**Hazard: `neutral`, derived from the SQL.** No `REVOKE`, no `DROP`, no
tightened constraint, no narrowed vocabulary, no rebuilt function, so not a
contraction; the two added tables sit in `private` (outside Data API reach since
`20260719191911`), carry no grant and have no reader, so no contract surface is
widened either. What remains is a data-only reconciliation. It is **recorded in
prose only** — a production-only entry carries no `MIGRATION_HAZARD_CLASS`
declaration, and the drift test actively rejects one for a version with no file
on this branch. The canonical `DEPLOY-STATE.md` characterises it independently
as "a data-only repair of `game_revisions.snapshot`: no DDL on any application
table, no grant, no revoke … schema-neutral in both directions".

**No version drift, stated explicitly.** Its filename version equals its ledger
version, so it is neither a renamed apply nor a name-keyed pairing. That is
recorded rather than passed over because the eight preceding known-source
applies — `20260720221937`, `20260721035955`, `20260721081355`, `20260721193508`,
`20260721201734`, `20260722132159`, `20260722144034`, `20260722153233` — every
one drifted. This is the first that did not.

**Attestation provenance, stated honestly.** `PRODUCTION_LEDGER_ATTESTATION` is
a constant whose name asserts a production attestation, and **this session made
no production read**. The 114 / `20260723014849` values are transcribed from the
canonical `DEPLOY-STATE.md` on the production lineage, where an earlier
**authorized** session recorded them from two independent live reads on
2026-07-23: the "Current production" row re-derived during the 01:58Z deploy,
and the read-only "Snapshot repair verification" that followed it, which
re-derived the same count and head. That provenance is written into the
constant's own comment, the reference document, and `docs/CURRENT_STATUS.md`.
They are a committed repository record **of** a live read, not a live read.
Evidence class **[PROJECT-DOC]**.

**Harness.** `run.sh` passes end to end, unchanged and untouched. Because no
file was added, the clean-baseline replay is byte-for-byte the same set of 55
migrations it was before; the reconciliation cannot have affected it, which is
the confirmation the production-only treatment carries. Had the file been
carried, it would have replayed against an empty `game_revisions` and been a
no-op — but a meaningless one, creating two empty audit tables in every
disposable cluster.

**Not changed.** Step 4.3 is **not** marked complete. No other blocker's
disposition moved. `20260722160000` is still gated and unapplied; its ledger
precondition is now true and the apply itself still requires a new explicit
authorization.

**Discrepancy carried forward, not fixed here.** The **code half** of that same
release — `c7d6c203a`, the `listSavedGames` labelling fix in
`src/lib/db/game-draft-repo.ts` — is **not** an ancestor of this branch
(`git merge-base --is-ancestor` exit 1). This lineage still labels finalized
saved games from `game_revisions.snapshot`. **[That sentence is SUPERSEDED and
false — see the correction immediately below. It was an inference from the
ancestry fact, never checked against the code. The ancestry half stands.]**
Production's data is already
repaired so nothing is visibly broken today, but the durability fix the
live-site lineage shipped is absent here. Out of scope for this assignment and
recorded for the owner. Evidence class **[GIT]**.

**Correction (2026-07-23): this lineage does not label saved games at all.**
The ancestry half above is confirmed and retained — `c7d6c203a` is **not** an
ancestor of this branch (`git merge-base --is-ancestor` exit 1); it reaches
only `fix/live-compare-data-remove-declared-style` and
`fix/saved-game-label-orphan-snapshot-ids`. The behavioural half was wrong.
`src/features/games/saved-games-page.tsx` — the shared implementation behind
both `/games` and `/saved-games` — selects
`id, played_on, status, player_count, generation_count, updated_at` from
`games`, and renders a date, a Draft/Finalized badge, a
`{player_count} players | {generation_count} generations` line, and
`Open draft` / `Saved result`. It reads no roster, no snapshot and no player
name, and it displays no player name. The labelling machinery the fix repairs
is absent from this lineage entirely: `listSavedGames`, `getSavedGameForm`,
`reopenSavedGame`, `SavedGameListItem`, `UNKNOWN_SAVED_GAME_PLAYER_LABEL`,
`labelRosterEntry`, `saved-games-picker.tsx`, and the whole
`src/lib/people/person-label` module are zero-hit on this branch and present on
the production lineage. `git log -S listSavedGames` returns nothing on this
branch at any commit: the two lineages diverged at `2e3f5f7cf` (2026-07-04),
before that machinery was built. The defect `c7d6c203a` fixes therefore cannot
be reproduced here, because the surface that carried it does not exist here.
This is **not** a claim that this lineage is immune to the hazard — only that
the named surface does not exist. Evidence class **[REPO]** for the code,
**[GIT]** for the ancestry and the divergence point.

**How the false sentence was produced, recorded so it is not repeated.** The
authoring session established a true ancestry fact with `git`, then inferred a
behavioural claim from it — that a lineage lacking the fix must still exhibit
the behaviour the fix corrects — and wrote the fact and the inference into this
document as a single sentence, unlabelled. The inference was never checked
against the code. **Ancestry is not behaviour**: a lineage can lack a fix
because it never had the defect. Classed **[INFERENCE]** here, which is what it
was when written.

**One related observation, not a blocker and no disposition changed.** A sweep
for surfaces on this lineage that could render a raw uuid as a player name
found exactly one: `getPlayerName` in
`src/features/analytics/group-dashboard.tsx` falls back to the `playerId`
itself when a player has no matching leaderboard row
(`…?.playerName ?? playerId`). It is called once, for the Persisted Efficiency
"Top Player" tile on Group Insights. That is a different surface, a different
data path, and not the defect `c7d6c203a` fixes, but it is the same class of
hazard. Whether the fallback is reachable in live data was **not** tested — no
production read was authorized. Recorded as an observation only; no blocker was
opened and no blocker's disposition moved. Evidence class **[REPO]**.

**The forward constraint from `c7d6c203a` is recorded in the phase that owns
the surface**, `docs/redesign/phases/05-games-detail-and-replay.md`, because
`/games/[gameId]` and `/games/[gameId]/replay` are deferred to Phase 5 by
`docs/redesign/phases/03-navigation-and-routes.md` and Phase 5 is not started.
It is a design constraint on unbuilt work, not an open defect, so it is not
filed as a blocker.

### Re-audit FAIL answered: stale signature corrected, two vacuous branches now asserted (2026-07-23)

Documentation, state, and executable-test changes only. No migration applied, no
migration SQL changed, no `src/` file changed, no deploy, no push, no production
read or write.

A targeted re-audit of the merged `ID-READER-CLIENT` remediation returned
**FAIL**. It found the SQL and TypeScript remediation itself **correct and
complete** — every executable surface followed the signature change — and failed
on one MEDIUM documentation defect plus three LOW items. **The re-audit left no
handoff in this repository**; its verdict reached the follow-up session as the
assignment text, so every defect was independently re-derived from code before
being corrected. Evidence class for each correction below is **[REPO]**.

- **FINDING A (MEDIUM) — resolved.**
  `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CLIENT-EXPAND-BUILT-LOCAL.md`
  stated, in the present tense and with no supersession notice, that
  `20260722160000` creates
  `create_or_reuse_guest_identity(uuid, text, text, text, text, uuid, boolean, uuid)`.
  The shipped file creates
  `(uuid, uuid, text, text, text, text, uuid, boolean)`. That document is in the
  active handoff group and is published to the Claude Project, so a session
  authoring the CONTRACT drop or a rollback from it would have emitted
  `drop function if exists` against a signature nothing ever created — succeeding
  silently against nothing while recording the function as dropped. Corrected,
  and given a dated supersession notice matching the one the sibling
  design-scoping document carries. Two further stale statements in the same file
  were corrected in place: its claim that the candidate search is a verbatim
  transcription (only the selected-player revalidation is; the candidate
  predicate was rebuilt as a single materialised `v_candidate_ids`), and its
  discrepancy 3, which said the design handoff was unmerged — it was merged as
  `8e331cffb`.
- **FINDING B (LOW) — resolved.** In `docs/CURRENT_STATUS.md` the apply step's
  sub-headings still read `2a`/`2b` after the sequence was renumbered, and the
  rollback-validity sentence cross-referenced "item 3 below" from inside item 3.
  Relabelled `3a`/`3b` and repointed to item 4. No SQL, precondition, or
  substantive content changed; the recorded rollback statement and the ledger
  bookkeeping were both confirmed correct.
- **FINDING C (LOW, coverage) — resolved.** The multiple-candidate rejection was
  asserted nowhere. Section 8 of `non-import-guest-identity-after.sql` builds a
  two-row same-name collision, but only one row is an eligible candidate, so it
  exercises the exactly-one path; relaxing the auto-selection threshold from
  `= 1` to `>= 1` left the whole harness at exit 0. New section 10 asserts that
  two eligible candidates with no explicit selection raise `P0003` and create no
  player row. **Mutation-proven**: under that exact threshold change the harness
  exits 3 at the new assertion, reporting that the call auto-selected the
  lowest-ordered guest instead of rejecting.
- **FINDING D (LOW, coverage, privacy-adjacent) — resolved.** The
  `p.linked_user_id is null` clause in the selected-player revalidation is the
  sole barrier stopping an explicitly supplied CLAIMED player id from being
  returned and labelled `existing_unlinked_guest` — a registered account handed
  back as a reusable guest. Removing it also left the harness at exit 0. New
  section 11 asserts the refusal (`P0002`) and that it writes nothing.
  **Mutation-proven**: with the clause removed the harness exits 3, reporting the
  claimed player returned as `existing_unlinked_guest`. The branch is latent
  today because neither call site passes an explicit selection; the assertion's
  comment records why it exists anyway.

Both mutation probes were reverted and the tree proven byte-identical by
`git write-tree` (`cf186f51536cf401212693b8643d1699ec1e7dab` before, after the
first probe, and after the second). No non-reverted change exists under
`supabase/migrations/`.

Separately, two `run.sh` comment blocks still asserted the causal claim this
document records as **refuted by measurement** — that replaying
`20260720120000` would coarsen the pre-image the contraction proof measures
against. They now state what was actually measured: `MATCH_PREIMAGE` runs after
the replay loop and installs the fine-grained predecessor over it, so the
exclusion is inconsequential rather than necessary. Comment text only, proven by
diffing the 156 non-comment lines to zero difference. **The underlying coverage
decision was NOT acted on**: `match-oracle-post-contraction.sql` is still wired
into nothing, the replayed migration set is unchanged, and the measurements were
not re-run. That decision remains the owner's.

#### Terminal multiple-match state — RECORDED, deliberately NOT fixed

Tracked as blocker `GUEST-NAME-COLLISION-TERMINAL` in `docs/CURRENT_STATUS.md`.

When two or more UNLINKED players in a group carry the same normalized personal
name, `create_or_reuse_guest_identity` raises `P0003` and **nothing can satisfy
it**. The sole call site
(`src/lib/db/import-player-identity-repo.ts:118`) hard-codes
`p_selected_player_id: null` and accepts no selection from its callers; neither
`/group/players` nor the Log-a-Game manual-entry resolver offers a
disambiguation UI; and no code in `src/` handles `P0003`, so it propagates as a
raw database error. That roster entry can never be added [REPO]. It is
**inherited** from the deployed resolver this function is derived from, not
introduced by the `ID-READER-CLIENT` work, but it is a real unrecoverable
user-facing state and was written down nowhere.

**Coupling to FINDING D.** The natural fix is a disambiguation UI. Such a UI
would pass an explicit `p_selected_player_id`, which is precisely the path
FINDING D's new assertion guards — today that path is only reachable by a direct
service-role call. Section 11 of `non-import-guest-identity-after.sql` must
therefore already be in place before any disambiguation UI ships.

Not fixed here: no UI was designed or built and neither call site was changed.
That is a product decision requiring its own assignment.

Handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-COVERAGE-AND-SIGNATURE-RECORDS.md`.

### ID-READER-CLIENT remediation integrated onto the redesign branch (2026-07-23)

Local integration only. No migration applied, no deploy, no production read or
write.

The independent audit that returned **FAIL** on the `ID-READER-CLIENT` expand
work is **answered**: `FINDING-1` (the candidate-counting and auto-selection
predicates disagreed about claimed players) and `FINDING-2` (`p_requesting_user_id`
declared last and defaulted, diverging from the four applied gateways) are
remediated, executably proven, and merged into
`redesign/tm-stats-dashboard-rebuild`. Every session reading canonical state was
previously told the expand work was unremediated, because the remediation sat on
an unmerged branch; that is no longer the case.

- Merged `--no-ff` from `fix/id-reader-candidate-predicate`, bringing
  `eaab06545` (the FINDING-1/FINDING-2 remediation) and `949d16009` (its
  closeout, which re-proved mutation probe P1 against the tightened clause 8b).
- Unchanged by this integration, and still requiring separate owner
  authorization: migration `20260722160000` remains **gated and unapplied**, and
  the moved redesign reader remains **undeployed**. `ID-READER-CONTRACT`,
  `ID-READER-DEPLOY`, `ID-LEGACY-ORACLE`, `DRAFT-NAME-RESIDUE`, and `STEP-4.4`
  are untouched; no blocker changed disposition beyond `ID-READER-CLIENT`
  becoming merged rather than branch-local.
- Step 4.3 is **not** complete and is not marked complete.
- `FINDING-4` / `DRAFT-NAME-RESIDUE` was not opened.

Two items previously rediscovered each session are now recorded durably: the
harness coverage gap on the coarsened matcher (below, evidence class
**[PRIOR]**), and the stale "Gated repo file" label in
`src/lib/db/migration-ledger-map.ts:360`, which was investigated and found to be
a **structured field**, not a comment — the `note` property of the exported
`PRODUCTION_ONLY_ENTRY_PROVENANCE` record, whose containing map the drift test
imports and iterates. It was therefore left **unchanged and reported BLOCKED**;
correcting it is a change to exported module data and needs its own
authorization.

**Next step: a targeted re-audit of the remediated work, before the expand gate.**
It is not authorized here.

Handoff: `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-INTEGRATION.md`.

### ID-READER-CLIENT repaired locally — EXPAND built, undeployed (2026-07-22)

Local implementation only. No production read or write, no deploy, no push, no
merge. Step 4.3 remains blocked and is **not** complete.

Implements the owner-approved design (Option 1) under the 2026-07-22 decision
accepting the explicit `p_requesting_user_id` trust model for this non-import
reader and superseding gated migration `20260720100000`.

- Gated migration `20260720100000` is **RETIRED as a no-op tombstone**. The file
  is kept at its original version as an auditable record but now contains no
  executable statement, so the `grant execute … to authenticated` that would
  have reopened the oracle closed by ledger `20260722153233` can never be
  applied. It stays classified `GATED_UNAPPLIED`; its declared hazard class
  moves `expansion` → `neutral`.
- New gated migration `20260722160000_add_non_import_guest_identity_creator.sql`
  creates `public.create_or_reuse_guest_identity`, granted to `service_role`
  ONLY. It authorizes on an explicit server-verified `p_requesting_user_id`
  against `group_members`, stamps `created_by_user_id` from that same id, and
  records **no** `player_import_aliases` row on any branch. A distinct name
  rather than an overload, avoiding the `42725` ambiguity the design proved.
- It is **additive**: the deployed 7-argument
  `public.resolve_import_guest_identity` is left in place. Dropping it is the
  separate CONTRACT phase and was not authored.
- Both non-import paths — the `/group/players` roster add and the Log-a-Game
  manual-entry resolver — now reach the new function through the admin client,
  with the requesting user resolved from the server session
  (`supabase.auth.getUser()`) inside `createOrReuseGuestPlayerByPersonalName`.
  No client-supplied identity is accepted anywhere on this path.

Executably proven on a disposable PostgreSQL cluster (`run.sh` exit 0): the
BEFORE failure is reproduced against production history only; a group member
succeeds; a non-member requesting id is rejected with `42501` and writes
nothing; no import alias row is written on either the create or the reuse
branch; and `created_by_user_id` equals the passed id. The non-member and
no-alias assertions were mutation-tested and both correctly fail when the
property is violated.

**Still requires separate owner authorization:** applying `20260722160000`,
deploying the moved reader, verifying it in production, and only then authoring
and applying the CONTRACT drop of the 7-argument function. No other blocker
changed disposition.

Handoff: `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CLIENT-EXPAND-BUILT-LOCAL.md`.

**Integrated 2026-07-23, with three stale records corrected.** The design branch
merged as `8e331cff` and this implementation as `4b9523b8`, both `--no-ff`. A
separate correction commit then reconciled the three records the two source
tasks left stale only because they sat outside those tasks' permitted file sets.
Documentation and comment text only — no logic, migration, schema, deploy, or
production change, and no blocker changed disposition.

- `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` reconciled to
  `src/lib/db/migration-ledger-map.ts` at the merged HEAD: `20260720100000`
  recorded as a RETIRED no-op tombstone with hazard class `neutral` (still
  listed in `GATED_UNAPPLIED` for audit, never applicable), `20260722160000`
  registered gated/unapplied with hazard class `expansion`, the gated table now
  six entries, hazard totals 16 contraction / 30 expansion / 9 neutral over 55
  files. No ledger count, ledger head, or production attestation was changed.
- `src/lib/db/player-repo.ts` and `src/lib/player-identity/guest-identity.ts`
  carried comments routing **every** guest-creation path through
  `resolve_import_guest_identity`. That RPC now serves no live path: imports
  resolve through `resolve_staged_import_player_identity` and the two NON-import
  paths through the `service_role`-only `create_or_reuse_guest_identity`. The
  `guest-identity.ts` comment was already stale before this branch, because the
  applied source-bound replacement had already moved import-side matching.
  `src/lib/player-identity/guest-identity.test.ts` still carries the same
  superseded claim and was outside the correction task's permitted file set.

**Third and final stale comment corrected (2026-07-23).**
`src/lib/player-identity/guest-identity.test.ts` no longer routes existing-guest
reuse, ambiguity, and duplicate detection through `resolve_import_guest_identity`;
it now names `resolve_staged_import_player_identity` for imports and the
`service_role`-only `create_or_reuse_guest_identity` for the two NON-import
paths. Comment text only — every changed line is a `//` comment, and no
statement, expression, import, assertion, or test name changed. This closes the
stale-record set above; all three instances of the superseded routing claim are
corrected. No logic, migration, schema, deploy, or production change, and no
blocker changed disposition. Handoff section 8 of
`docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CLIENT-EXPAND-BUILT-LOCAL.md`.

**The owner decision behind this work is now recorded (2026-07-22).** The two
decisions this section implements — accepting the explicit
`p_requesting_user_id` trust model for the non-import guest path, and
superseding gated `20260720100000` rather than correcting it in place — are
written into `docs/redesign/DECISIONS.md` as "Phase 4 Step 4.3 - Non-import
guest identity creation: accepted requesting-user trust model and retirement of
20260720100000", placed immediately after the 2026-07-22 matcher amendment it
references. This closes the gap in which an implemented, security-relevant
authorization model had no recorded authorization behind it; the matcher's
equivalent downgrade was already recorded, this one was not. Documentation only
— no code, migration, schema, deploy, or production change, and no blocker
changed disposition. That entry's own "Scope authorized by this decision"
section governs what it does and does not authorize.

### ID-READER-CLIENT expand REMEDIATED after an independent audit FAIL (2026-07-22)

Local remediation only. No production read or write, no deploy, no push, no
merge, no migration applied. Step 4.3 remains blocked and is **not** complete,
and no other blocker changed disposition.

An independent read-only audit of the expand work above returned **FAIL** on one
HIGH and two LOW findings. Because `20260722160000` is gated and unapplied and
`public.create_or_reuse_guest_identity` exists in no environment, all of it was
corrected **in place in the unapplied file** — the established convention on
this lineage — rather than stacked as a corrective migration. No applied
migration and no deployed function was touched.

- **FINDING-1 (HIGH) — resolved.** The candidate-counting query and the
  auto-selection query eleven lines below it applied different predicates: the
  count excluded players with a non-null `linked_user_id`, the selection did
  not. Independently reproduced on a disposable cluster before any fix: in a
  group holding one unlinked guest and one already-claimed player carrying the
  same normalized personal name, the counting query returned **1** row while the
  selection query returned **2**, `limit 1` returned the **claimed** player, and
  the call failed `P0002` ("The selected guest identity is unavailable or no
  longer matches") — so reuse of a legitimate guest failed outright. The state
  is reachable because `normalized_personal_name` is indexed NON-uniquely, and
  `personal_name` is the only mode either non-import call site uses. Fixed
  structurally, not by copying the filter: the predicate is now evaluated once
  into `v_candidate_ids`, the count is `cardinality()` of that array, and the
  auto-selection is element `[1]` of the same array, so the two cannot disagree.
  This matches the applied sibling `resolve_staged_import_player_identity`.
- **FINDING-2 (LOW) — resolved.** `p_requesting_user_id` was declared last and
  defaulted, diverging from the four applied gateways of `20260722012658`, which
  all declare it required. It is now required and positioned second, so omitting
  it is a signature error (`42883` / `PGRST202`) instead of a runtime
  authorization failure. Both call sites pass parameters by name, so the
  reordering is caller-transparent and no TypeScript change was required. The
  explicit `is null` guard in the body is retained but now labelled in-file as a
  redundant guard, since the membership test already fails closed on a null id.
- **FINDING-3 (LOW) — resolved.** The release sequence in
  `docs/CURRENT_STATUS.md` omitted the expand step's rollback SQL and the
  apply-time ledger bookkeeping. Both are now recorded as steps 2a and 2b.
- **FINDING-4 — RECORDED, NOT FIXED.** A pre-existing draft-snapshot personal
  name residue, untouched by this work and in a different subsystem. Tracked as
  blocker `DRAFT-NAME-RESIDUE`; its end-to-end reachability is inferred rather
  than executed. It was deliberately not investigated and needs its own scoped
  assignment.

A new collision proof was added to
`supabase/tests/executable/non-import-guest-identity-after.sql` and every added
assertion was mutation-tested. Reintroducing the divergence fails the new proof
with the exact `P0002`; a duplicate-creating defect and a resurrected
trailing-defaulted overload each fail their own assertion; each probe was
reverted to a byte-identical file. One added clause (the collision fixture's
no-import-alias check) proved to be subsumed by an existing assertion and is
labelled in-file as a redundancy guard rather than presented as independent
proof. The `run.sh` header was also corrected: it claimed the deferred half was
exactly `GATED_UNAPPLIED`, but two production-applied migrations are deferred
too. That change is comment-only and proven so — all 155 executable lines are
byte-identical.

Closed out on 2026-07-23. Mutation probe P1 was re-run at the current file state,
because it had been confirmed *before* clause 8b's error handler was tightened in
response to probe P3 and was never re-run afterwards. It still fails, still at 8b
(`non-import-guest-identity-after.sql:340`), still with sqlstate `P0002`, harness
exit 3; the probe's fidelity to the pre-fix logic was itself proven by a zero-line
diff against blob `eaab0654^`, and both files reverted to byte-identical hashes.
The `run.sh` `echo` labels — left reading "gated" for the applied pair by the
comment-only constraint — are now corrected, with 116 non-comment, non-blank,
non-echo lines and a zero-line diff before and after, after verifying that nothing
in the repository asserts on `run.sh` stdout. The scoping document
`PHASE-04-STEP-03-GUEST-IDENTITY-OVERLOAD-DESIGN-SCOPING.md` had its five stale
signature sites corrected to the shipped argument order and gained a dated
authority notice.

#### Harness coverage gap on the coarsened matcher — OPEN, deliberately not fixed

Evidence class **[PRIOR]**: measured in the closeout session
(`PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md` §4) across four full
harness runs on disposable clusters. It is **not** re-verified by the
integration that merged that work, and the experiments must not be re-run
casually — re-measuring is its own scoped assignment.

**What was refuted.** The recorded reason for excluding repository migration
`20260720120000` (`coarsen_import_name_match_reasons`) from the harness's
production-history replay was that applying it "would coarsen the very pre-image
the contraction proof measures against". Measurement refutes that causal claim.
Replaying it *does* coarsen the matcher, and then `MATCH_PREIMAGE` — which runs
**after** the replay loop — unconditionally `create or replace`s the fine-grained
predecessor straight back over it, so the coarsening is erased before any
assertion observes it. Probe output either side of the pre-image:
`finegrained=f` before, `finegrained=t` after. Four single-variable runs each
exited 0: replaying `20260722012658` in the history loop; replaying
`20260720120000` in the history loop; the same run instrumented with the
matcher-body probes; and applying `20260720120000` in the deferred half at its
ledger position, twice, for repeat-safety. The exclusion is therefore
**inconsequential rather than necessary**.

**What the real coverage consequence is.** The gap is not the exclusion. It is
that `supabase/tests/executable/match-oracle-post-contraction.sql` is referenced
by nothing — it appears in no `.sh`, `.ts`, `.json`, or `.yml` in the repository,
and `run.sh` wires up only its `pre-contraction` sibling. Consequently:

- half 1 pins the matcher's **fine-grained** disclosure as "the state production
  is in today", but production replaced that matcher with the coarsened one as
  ledger `20260722144034`, so the baseline models a predecessor;
- the coarsened behaviour is asserted **nowhere**. The only post-deferred-half
  assertion touching `match_import_player_names` is in
  `source-bound-import-identity-contraction.sql`, and it checks the **ACL only**
  — that `authenticated` cannot execute it and `service_role` can — not the
  disclosure and not the input bounds;
- therefore a regression that **re-widened the disclosed `match_reason` /
  `match_score`, or removed the candidate-input bound, would pass this harness
  clean**. That is a privacy surface — the name-confirmation oracle the
  coarsening exists to close.

Applying the migration would not on its own close the gap: with it applied and
nothing asserting the coarsening, the harness still exits 0.

**Status: OPEN and deliberately not fixed here.**
`match-oracle-post-contraction.sql` was **not** wired into `run.sh` and the set of
migrations the harness replays was **not** changed. That disposition is the
owner's and requires its own authorization, which must also decide whether
`20260720120000` is applied in the deferred half immediately before those
assertions.

**Relevance to closure.** The fresh independent closure audit
(`STEP-4.3-AUDIT`) must account for this gap explicitly: a green
`run.sh` is **not** evidence that the coarsened matcher surface production
actually runs is protected against regression, and the audit must not treat
harness exit 0 as covering the disclosure or the input bound on
`match_import_player_names`.

Handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md`,
then `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md`.

### Production release-boundary reconciliation (2026-07-22)

The newer production apply record supersedes older statements below that both
source-bound migrations remained unapplied:

- repository migration `20260722012658` (`add_source_bound_import_identity_staging`)
  is applied in production as ledger version `20260722132159`;
- repository migration `20260720120000` (`coarsen_import_name_match_reasons`) is
  applied as ledger version `20260722144034`;
- repository migration `20260722153000`
  (`close_authenticated_guest_identity_oracle`) is applied as ledger version
  `20260722153233`; and
- contraction `20260722012707` (`retire_free_form_import_name_matcher`) remains
  gated and unapplied.

Production ledger attestation is 113 entries with head `20260722153233` in
`docs/agent-handoffs/GUEST-IDENTITY-ORACLE-REVOKE-APPLY.md`. That record also
proves the redesign's remaining `createOrReuseGuestPlayerByPersonalName` call
uses an authenticated user-session client and would fail after the revoke if
this redesign lineage were deployed unchanged. The live worker does not contain
that call, so current production behavior is not broken.

No continuation is authorized by this reconciliation. A new explicit owner
assignment must govern the reader correction/deploy and verification. The
legacy matcher contraction requires separate authorization only after compatible
reader verification, followed by a fresh closure audit before Step 4.4.

### ID-READER-CLIENT investigated — the recorded fix is wrong (2026-07-22)

Read-only investigation. No production access, no code change, no migration
authored. Step 4.3 remains blocked and is **not** complete.

`GUEST-IDENTITY-ORACLE-REVOKE-APPLY.md` §8 recorded that the fix is "a one-line
client swap" to `createSupabaseAdminClient()`, "the pattern the *same file*
already uses at lines 125, 148, 162 and 182". **That recommendation does not
hold.** `public.resolve_import_guest_identity` opens with
`if (select auth.uid()) is null or not public.is_group_member(p_group_id) then
raise ... errcode = '42501'`, identically in the deployed 7-argument definition
and in the gated 8-argument one. Under service_role `auth.uid()` is NULL, so the
admin client raises the **same `42501`** from the function body instead of from
the privilege check — the call breaks either way. Independently, both insert
branches write `created_by_user_id` as `(select auth.uid())` into a `not null`
column, so no client-only change can succeed.

The four cited call sites are a different pattern, not the same one: each calls a
function that takes an explicit `p_requesting_user_id` and enforces membership
against that argument, granted to `service_role` only.
`resolve_import_guest_identity` has no such parameter.

Two further findings. The call site passes 8 arguments including
`p_record_import_alias`, which exists only in gated, unapplied
`20260720100000` — so against production it would fail `PGRST202`/`42883` before
any `42501`. And `20260720100000` as written drops the revoked 7-argument
function and re-grants `authenticated` on its replacement, which would **reopen
the oracle closed by ledger `20260722153233`** if applied unchanged.

A correct fix is the change shape already approved for the *matcher* in
`docs/redesign/DECISIONS.md:1305-1351` — a new overload taking an explicit
requesting-user id, granted `service_role` only, under expand/contract ordering —
but no equivalent amendment exists for this function. That is a design change
requiring new owner authorization, not a repair, and it was not started.

Handoff: `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CLIENT-INVESTIGATION-STOP.md`.

### Planning-pack DEPLOY-STATE source corrected (2026-07-22)

Tooling and governance only. No phase, blocker, release, migration, or
production fact changed.

The planning-pack updater was publishing a stale `DEPLOY-STATE` because its
manifest resolved that document from an **untracked** working-tree file in the
live checkout. Untracked means no deploy session could commit to it, so it never
tracked the canonical ledger. The manifest now declares `deploy-state` as a Git
source read from `fix/live-compare-data-remove-declared-style:DEPLOY-STATE.md`,
resolution fails closed with no filesystem fallback, and the published document
carries a provenance block naming its ref and commits.

Only that one catalog entry changed. The other 47 documents keep their source
root, path, key, title, Drive ID, order, and dynamic classification, and a
pre-publication source-isolation gate fails before any Drive write if that stops
being true. Both filesystem copies of `DEPLOY-STATE.md` — this repository's and
the live checkout's — are now factless pointer stubs.

`AGENTS.md`, `CLAUDE.md`, and `MASTER-RULES.md` now require any session that
deploys, migrates, or performs a production write to append the result to the
canonical ledger on the production lineage, commit it there, and then run the
updater or report synchronization pending.

Handoff: `docs/agent-handoffs/DEPLOY-STATE-PLANNING-PACK-GIT-SOURCE.md`.

**Integration complete (re-derived 2026-07-22).** `fix/deploy-state-planning-pack-sync`
is merged into this branch — both tips are `944bdad0d` and `git branch --merged`
lists it. The shared redesign checkout therefore carries the corrected manifest:
its `deploy-state` entry is `sourceType: "git"` against
`fix/live-compare-data-remove-declared-style`, and no entry declares the retired
`root: "live"`. The desktop launcher and the scheduled task run the ordinary
path with **no `--source-manifest` override**. The pre-merge "fail closed unless
`--source-manifest` is supplied" limitation, recorded here, in
`docs/CURRENT_STATUS.md`, and under "Known limitation" in the handoff, described
the state before the merge and no longer applies.

**`fix/planning-pack-deploy-state-source` (`52373ff79`) is SUPERSEDED — do not
merge it.** It is a parallel attempt at the same repair, one commit off
`11418d34a`, and it is not merged into this branch. It carries an earlier,
incompatible planning-pack catalog schema — its `deploy-state` entry is
`root: "git"` with a bare `ref`, whereas the integrated tooling requires
`sourceType: "git"` with an explicit `repository`, and the current validator
rejects any working-tree root other than `redesign` — plus an older
`update_planning_pack.py` and a duplicate handoff under a different filename.
Merging it would overwrite the live tooling with a manifest the installed
updater refuses, regressing the default launcher and scheduled task back to
fail-closed. It is retained, unmerged and undeleted; deleting it needs separate
owner authorization.

### Planning-pack post-commit synchronization is hook-enforced (2026-07-22)

Local tooling and governance only. No phase, blocker, release, migration, or
production fact changed. This is **not** Phase 4 work and does not change Step
4.3 or Step 4.4 status.

CLAUDE.md workflow step 8 (run the planning-pack updater after a completing
commit) previously depended on an agent remembering to run it. A deterministic
`PostToolUse`/`Bash` hook (gated on `Bash(git commit *)` and, per the 2026-07-22
amendment below, also `Bash(git merge *)`) now runs the same existing,
already-authorized updater automatically after a commit that changes a
planning-pack source. The hook grants no new authority; it only triggers the
updater the documented gate already requires.

The hook (`.claude/hooks/sync-planning-pack.ps1`, registered in the committed
`.claude/settings.json`) is inert outside the redesign repository, is a no-op
when HEAD did not advance (failed commit, no-op turn, repeat fire), and runs the
updater only when a pack source changed between the last recorded sync and HEAD.
The watched source set is derived at runtime from
`docs/redesign/CLAUDE-PROJECT-SOURCES.json` (every `documents[].path`, the
configured phase-file range, and `docs/agent-handoffs/`) with no hard-coded
document filenames, consistent with the recorded decision that the pack document
count is derived rather than duplicated. A missing updater reports
synchronization pending and never claims Drive is current; the hook always exits
0 and adds no lock of its own. The per-worktree sync marker
`.claude/.pack-last-sync` is git-ignored.

`docs/CURRENT_STATUS.md` and `docs/AUTHORITATIVE_DOCUMENTS.md` were intentionally
left unchanged: this change alters no phase, blocker, release, migration, or
next-action state, and adds/moves/supersedes/archives no authority in the routing
index. `docs/redesign/CLAUDE-PROJECT-SOURCES.json` is unchanged (no catalog entry
added or retired).

Handoff: `docs/agent-handoffs/PLANNING-PACK-POST-COMMIT-SYNC-HOOK.md`.

**Amended 2026-07-22 (second commit on the same branch; `e1dd0cfe` not
rewritten).** A review of the first commit found two defects, now fixed, plus one
hardening change:

1. **Tree-identity gate.** The updater reads a fixed root (its `ROOT` in
   `update_planning_pack.py`) — one specific worktree. The first hook ran the
   updater and advanced the marker from whatever tree fired it, so a worktree
   commit made the updater read a tree *without* that commit and falsely report a
   sync. The hook now runs the updater only when the current tree IS the
   updater's tree; otherwise it reports synchronization PENDING (naming the
   worktree and SHA) and does not advance the marker. The updater's root is read
   at runtime from `update_planning_pack.py` (located via `%LOCALAPPDATA%`). That
   root is the redesign *linked* worktree `...\Terraforming Mars Redesign`, which
   is distinct from the git *main* worktree `...\Terraforming Mars`, so comparing
   against the main worktree would have been wrong on this machine.
2. **Merge trigger.** `git merge` creates a commit without running `git commit`,
   so merges never fired the hook. A second handler gated on `Bash(git merge *)`
   was added in the same matcher group, disambiguated by `-Trigger merge` vs
   `-Trigger commit` so hook deduplication keeps both. `git commit` and `git
   merge` are the only triggers.
3. **Marker-absent fail-open.** An absent or unresolvable
   `.claude/.pack-last-sync` no longer falls back to `HEAD~1` (which undercounts
   after a many-commit merge); the change is treated as pack-relevant and
   synchronized.

Verified by a disposable-repo harness (39 assertions / 10 scenarios) that ran the
actual hook with a stubbed updater and no real Drive write. This amendment is
itself made in a worktree that is not the updater's tree, so its own planning-pack
synchronization is PENDING until the branch merges into the updater's tree.

### Agent skills encoding existing governance procedure (2026-07-23)

Local tooling and governance only. No phase, blocker, release, migration, or
production fact changed. This is **not** Phase 4 or Phase 5 work, and it does not
change Step 4.3 or Step 4.4 status. No production access of any kind occurred.

Branch `chore/agent-skills-tier-1`, created from
`redesign/tm-stats-dashboard-rebuild` at base commit `d63e6b0d7` in the isolated
worktree `C:\tmp\tm-agent-skills-tier-1`. ~~**Unmerged**; merging it requires
separate owner authorization.~~ **Superseded 2026-07-23: the owner authorized the
merge and it landed as a `--no-ff` merge into
`redesign/tm-stats-dashboard-rebuild`.** See the merge record at the end of this
subsection. Cataloguing the skills, creating any index for them, and mirroring
them into `AGENTS.md` remain separate unauthorized owner decisions.

Seven Claude Code skills were added under `.claude/skills/`:
`tm-evidence-and-report`, `tm-validation-battery`, `tm-task-preflight`,
`tm-handoff-writer`, `tm-planning-pack-sync`, `tm-no-fabrication`, and
`tm-canonical-first`. Each holds **procedure and pointers only** and states that
it authorizes nothing. None restates contract text: where a requirement is
canonical, the skill cites the document and heading instead of copying it, so a
skill cannot become a competing source of truth. Every path and heading pointer
was verified mechanically (30 path pointers, 35 heading pointers, all resolving).

`tm-validation-battery` additionally carries an executable
(`scripts/run-battery.ps1`) and the baselines it compares against
(`scripts/baselines.json`), measured **in this task** from a clean primary
checkout at `d63e6b0d7`: the executable PostgreSQL harness, `npm run test`
(178 files / 982 tests), `npx tsc --noEmit` (0 diagnostics), `npm run lint`
(0 errors, the exact 4 pre-existing warnings recorded individually),
`npm run build`, and `validate:claude-context`. A control run against a
deliberately perturbed baseline failed as it should, so the comparison
discriminates rather than passing vacuously.

`validate:claude-context -- --require-maintenance` is recorded as a **completion
gate, not a state check**: it compares the working tree against `HEAD`, so on a
clean tree it fails by design. That is not a broken baseline, and the runner
skips it on a clean tree with that reason stated rather than reporting a
meaningless failure.

`docs/CURRENT_STATUS.md` and `docs/AUTHORITATIVE_DOCUMENTS.md` were intentionally
left unchanged, assessed independently against their own maintenance rules: no
phase, blocker, release, migration, or next-action state changed, and no
authority was added, moved, superseded, or archived — a skill is not an authority
and each defers to the documents it cites. `docs/redesign/DECISIONS.md` is
unchanged because no durable decision was approved here.
`docs/redesign/MASTER-PLAN.md` is unchanged because no project-wide goal,
governance rule, phase structure, milestone, architecture, contract, or gate
changed. `docs/redesign/CLAUDE-PROJECT-SOURCES.json`, `CLAUDE.md`, and
`AGENTS.md` are unchanged and were outside the authorized edit set.

Cataloguing the skills, creating any index for them, and mirroring them into
`AGENTS.md` all remain **unauthorized** and are open owner decisions.

**Amended 2026-07-23 (second commit on the same branch; the first commit was not
rewritten).** The owner authorized three further skills after the first increment
identified six documented governance surfaces the original seven did not cover:

- `tm-identity-privacy` — routes to the authoritative guest-identity and
  claimed-name privacy contract. Carries the boundary test (exclusion from the
  payload, not concealment in the UI), that a missing username never falls back to
  a personal name, that username and personal-name matching stay separate
  mechanisms, and that a claim preserves the existing player ID. States that it
  authorizes no schema change, no migration, and no production identity mutation.
- `tm-conflict-and-authority` — the conflict procedure, and the separation that
  evidence corrects a fact but never grants scope. Enumerates the shapes that
  failure takes, including "nothing forbade it".
- `tm-production-action-preflight` — for a session that **already holds** a named
  authorization; it opens by stating that it grants none. Covers naming the
  authorizing sentence, reading the ledger from Git, that a migration filename is
  not its ledger version and entries pair by name, byte identity, expand/contract
  ordering, bounding the write, and the two separate actions owed afterwards.

The byte-identity step is grounded in a measurement taken in this repository, not
in recollection: on a committed migration with CRLF terminators, `git hash-object`
returned the canonical object hash — a false pass — while `git hash-object
--no-filters` and a `sha256` comparison against `git show` both showed the
working-tree bytes differ. The skill therefore directs that migration SQL be sent
from `git show`, and that any identity check use `--no-filters` or a content hash.

One pointer was corrected during verification: an early draft cited
`docs/archive/`, which does not exist. It now cites the rule that governs archived
material instead. Across all ten skills, 33 path pointers and 59 heading pointers
were verified to resolve.

The unchanged-document reasoning above was re-tested for this increment and still
holds: no phase, blocker, release, migration, or next-action state changed, and no
authority was added, moved, superseded, or archived.

**Amended 2026-07-23 (third commit on the same branch; neither earlier commit was
rewritten) — permission audit.** Every skill was re-read line by line against the
governing files, including `docs/redesign/MASTER-PLAN.md` →
`## 2. Authority and Scope Control`, `### Scope rule`, `## 4. Non-Negotiable
Constraints` (its `### Repository safety` and `### Prohibited actions`),
`### 8.2 Formula governance`, `### 8.3 Sample and denominator rules` and
`### 8.4 Analytics language`, which the first two increments had not cited.

The audit found and closed **eleven** places where a skill read as more permissive
than the documents. The material ones: adding a dependency was written as
forbidden only when it duplicated an existing one, where the rule is that no
dependency may be added without approval; failing to find an existing formula
implied writing one, where formulas may not be invented during implementation and
only approved formulas may be implemented; production preflight reads were written
as a bounded good rather than as production access needing their own
authorization; worktree creation was unconditional rather than contingent on the
assignment; the handoff writer assumed writing was permitted; "lift the shared
copy" invited an unrelated refactor; "mark low-sample" invited inventing a
threshold; and creating a table, view, migration, or schema change was not named
as needing separate approval. The prohibited-action list, the repository-safety
prohibition on altering the separate non-redesign checkout, and the contract rule
that an instruction may add stricter requirements but never weaken the privacy
contract are now cited from the skills that can reach them.

**One documentary tension was reconciled rather than silently resolved.**
`docs/redesign/MASTER-PLAN.md` → `### Repository safety` says to work only in the
primary redesign path, while assignments and established practice direct isolated
worktrees outside it. Read with the authority order in `## 2. Authority and Scope
Control`, the explicit assignment outranks the master plan, and the prohibition's
subject is the separate non-redesign checkout, which must never be altered. The
skills therefore carry the prohibition and do not carry a worktree ban. Recorded
here rather than decided in silence; if the owner reads it the other way, the
skill text is what changes.

After the audit, 34 path pointers and 73 heading pointers resolve across the ten
skills. No skill gained a permission, and every change made one narrower.

**Merged 2026-07-23 by owner authorization.** `chore/agent-skills-tier-1` landed in
`redesign/tm-stats-dashboard-rebuild` as a `--no-ff` merge of four commits. The
only conflict was this document's `## Latest handoff` group, where this branch and
the concurrent matcher-overload production-apply commit each added a head entry;
both entries are retained, the production record first. The ten skills are live
under `.claude/skills/`.

The recorded baselines are still pinned to `d63e6b0d7`, which is now an ancestor
of the merge commit with a `src/` file changed since. Re-measuring them at the
merge commit is the immediate next action and is **not** done by this commit; the
result is recorded in a follow-up commit alongside the updated
`measuredAtCommit`.

**Corrected 2026-07-23 (fourth commit; no skill file changed).** The base branch
moved while this work was in progress, so two statements are corrected in the
handoff. The second increment's code-facing checks were recorded as running
against source byte-identical to this branch; the checkout they ran in was
afterwards found to carry a concurrent session's uncommitted change under `src/`,
and the timing relative to the run cannot be established, so that claim is struck
and retained rather than defended. The measured results were unchanged from
baseline either way. And the baselines remain pinned to `d63e6b0d7`, which is now
an **ancestor** of the branch tip with a `src/` file changed since: they are not
automatically valid there, and a re-measure from a clean tree at the then-current
commit is owed before this branch merges.

Handoff: `docs/agent-handoffs/AGENT-SKILLS-TIER-1.md`.

### Source-bound import identity replacement - BUILT locally, release-stopped (2026-07-21)

Branch `fix/import-identity-source-bound-matching`, merged into
`redesign/tm-stats-dashboard-rebuild`, contains the approved private,
service-only pre-resolution staging design; structured exact source-bound
matching; lock-then-judge save-time revalidation; a preflight-backed
normalized registered-username unique index; separate gated expansion and
contraction migrations; and executable BEFORE/AFTER proofs. Handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-IMPORT-IDENTITY-SOURCE-BOUND-MATCHING-IMPLEMENTED-LOCAL.md`.

The required COUNT-only production preflight returned
`normalized_collision_group_count = 0`. The other and only other production
read was catalog/definition/ACL/ledger introspection with no personal rows.
The deployed arbitrary-name matcher oracle was confirmed unchanged. The live
read boundary is closed.

#### Review blocker resolved (2026-07-21)

The independent review passed the security objective and blocked on a
legitimate-matching regression. Remediation handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-IMPORT-IDENTITY-MATCHING-REGRESSION-REMEDIATION.md`.

The unapplied expansion `20260722012658` was edited **in place** (no corrective
migration stacked on an unapplied file). `private.import_identity_player_matches`
no longer gates identity evidence on `p.linked_user_id is null`, treats
`identity_mode IS NULL` alias rows as mode-agnostic, compares stored aliases in
both normalized forms, and additionally reads `public.players.full_name`,
`public.players.username`, and `private.player_legacy_identities`.

One further COUNT-only production introspection pass (counts, booleans, and
catalog facts only - no name, ID, or row content) confirmed the shape and
corrected two assumptions: `private.player_legacy_identities` is **empty**, and
one of the two unmatchable unlinked players is reachable only through
`public.players.username`. It also surfaced a second defect the review had not
named - production aliases are stored in the *space* normalization, so
username-mode alias matching would have stayed dead on 44 of 110 rows even after
the gate was removed.

Measured BEFORE/AFTER in the disposable cluster: a linked-player alias seat moved
from `unresolved` (and `unavailable` on explicit selection, with a **duplicate
player minted** as the only remaining path) to resolving against the correct
existing player with the group population unchanged. All anti-oracle uniformity
properties were re-measured after the widening and **all still hold**; staging
table access, gateway grants, and private-column privileges are unchanged.

The line-ending defect in `source-bound-import-identity-migrations.test.ts` is
fixed by normalizing newlines at read time, proved against genuinely
CRLF-converted files in both directions.

Four items are recorded and deliberately not fixed: failed resolution attempts
leave no durable audit evidence; staging expiry is opportunistic with no
scheduler; the expansion is not purely additive (a UNIQUE index on live
`public.user_profiles` and an AFTER UPDATE trigger on live `public.games`); and
`match-oracle-post-contraction.sql` is now unreferenced by `run.sh`. That last
item is no longer adequately described by this one line — see
"Harness coverage gap on the coarsened matcher" above, which records the
measured **[PRIOR]** version: the recorded exclusion reason for
`20260720120000` was refuted, and the real consequence is that a regression
re-widening the disclosed `match_reason` / `match_score` or removing the
candidate-input bound would pass the harness clean.

At the end of this remediation, both `20260722012658` (expansion) and
`20260722012707` (contraction) were gated and unapplied, and `20260720120000`
had not been applied. The later production release-boundary reconciliation
above supersedes that historical state: expansion and interim coarsening are
now applied, while contraction remains gated and unapplied. No compatible
redesign reader deploy, push, closure audit, registration-claiming work, or Step
4.4 occurred. The next action requires separate owner authorization for reader
correction/deployment and verification, followed by separate contraction
authorization and a fresh closure audit.

### Historical current-substep snapshot (superseded for local implementation status)

**Additional mandatory STOP (2026-07-21): source-bound import identity matching
cannot begin until the persistence-order and normalized-username prerequisites below are resolved.**
That STOP was subsequently resolved by the implementation recorded above and is
retained here as historical record.

Phase 4, Step 4.3 — Import Validation, Evidence Review, and Claimable Guest
Identity (**BLOCKED-pending-reaudit — the second bounded remediation pass
(2026-07-20) resolved every Blocker and High finding of the independent
closure audit: private normalized names are out of client payloads and guest
public labels are neutral on every creation path (F-01/B4/H5), the canonical
board-placement contract is complete (F-02), the confidence/review split
migration is repeat-safe and review state persists end to end (F-03/H2),
true original bytes are hashed and duplicate sources are detected in the
import action (H6/H3), client and server share one map gate over identical
exception evidence (F-05/H1), format-faithful fixtures reach real database
assertions (F-09/H4), the overwritten historical dry run is restored beside
a separate production artifact and the reconciliation metrics are honest
(F-08/§16/§17), and the ledger/documentation drift is corrected and mapped
(B3/F-10/§18). Step 4.3 remains blocked pending a fresh independent
read-only closure audit. Step 4.4 has not begun.**)

## Current owner

Source-bound import identity implementation (Codex) on
`fix/import-identity-source-bound-matching`, merged into
`redesign/tm-stats-dashboard-rebuild` and **STOPPED at the release boundary**.
No production write, revoke, migration application, deploy, or push occurred.

Immediately prior owner: local documentation-only state reconciliation on
redesign/tm-stats-dashboard-rebuild. Its preflight starting HEAD was
5597817fc6790fa4831ff968629ff49c81f16705, and concurrent commit
572c88c11779146dcef5c86bc9cf71298e47f91b landed before that task commit
and is its immediate pre-commit parent. No production access was part of that
reconciliation; its findings are the pre-remediation state reconciliation
below.

### Claude Project master context automation (2026-07-22)

The external Claude Project now has one permanent first-read orientation source:
the native Google Doc `TM PROJECT MASTER CONTEXT`. The existing local planning-
pack updater deterministically regenerates it and updates the same Drive file
ID. It embeds the canonical context contract, this full state file, the phase
file detected from `Current substep`, every handoff in the first contiguous
group under `Latest handoff`, and the newest repository handoff when it is not
already declared active.

`docs/CURRENT_STATUS.md` now provides the concise current-work route and
`docs/AUTHORITATIVE_DOCUMENTS.md` owns current source routing and evidence
precedence. The updater reads the version-controlled
`docs/redesign/CLAUDE-PROJECT-SOURCES.json`, derives its document count, and
publishes both new routing documents. Root instructions, master rules, the
master plan, and the context contract require a pre-commit maintenance
validator plus a post-commit updater run or an explicit pending reason.

This governance hardening reconciles the stale pre-apply release wording above
against the latest production apply record. It does not authorize a reader fix,
deployment, migration, contraction, closure audit, Step 4.4, push, or production
operation.

This is context delivery only. It does not change the current Phase 4, Step 4.3
status, authorize Step 4.4, or grant any production, migration, deploy, or push
permission. Canonical sources retain their documented authority. Contract:
`docs/redesign/CLAUDE-PROJECT-CONTEXT.md`.

### Historical STOP before implementation (2026-07-21)

Codex - Phase 4, Step 4.3 source-bound import identity matching
(**STOPPED before implementation** on the assignment's mandatory pre-persistence
and normalized-uniqueness gates). Both gates were subsequently resolved by the
implementation recorded above; this record is retained as history.

Branch `fix/import-identity-source-bound-matching`, created from re-derived
redesign HEAD `5597817fc6790fa4831ff968629ff49c81f16705` in isolated worktree
`C:\Users\izzyh\Documents\Terraforming Mars Redesign\.npm-cache\tm-import-identity-worktree`.
Handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-IMPORT-IDENTITY-SOURCE-BOUND-MATCHING-STOP.md`.

No application, RPC, migration, or test-harness implementation was started.
Two independent assignment-defined STOP conditions were re-derived:

- **Import evidence is not persisted before identity matching.** The current
  action calls `resolveImportPlayerIdentities` first; that operation may reuse
  or create a guest through `resolve_import_guest_identity`. Only afterwards
  does the action save the draft, build immutable source evidence, and insert
  `game_log_imports.raw_log_text`. The required replacement matcher therefore
  cannot derive its probe from a persisted import/evidence reference without a
  newly authorized persistence-order or staging change. Existing
  `game_log_imports` cannot simply be inserted first because `game_id` is a
  non-null foreign key and the current draft save depends on resolved players.
- **Registered normalized username uniqueness is not database-enforced.** A
  fresh catalog-only production read confirmed `user_profiles.username` is
  plain `text` with `UNIQUE (username)`, no normalization trigger, and no
  normalized expression index. The live normalizer lowercases and collapses
  punctuation, so distinct raw usernames may normalize identically. Guest
  usernames are correctly protected per group by the valid unique index on
  `(group_id, normalized_guest_username)`. Adding the missing registered-name
  index could conflict with existing normalized collisions; the task forbids
  the row-data read needed to exclude that possibility, triggering its second
  explicit STOP.

The deployed `public.match_import_player_names(uuid, text[])` definition and
ACL were also re-derived catalog-only: it remains a `SECURITY DEFINER` function
with `search_path = ''`, accepts an arbitrary caller-controlled array, compares
exact and prefix forms against private identity values, emits fine-grained
reason/score fields, and grants EXECUTE to `authenticated` and `service_role`
(not `anon`). This confirms the live oracle premise; it does not authorize a
write.

Owner decision required before resuming: authorize either (1) a private/service-
only pre-resolution evidence staging record, or (2) a two-stage draft/import
persistence reordering with explicit partial-run recovery. Also authorize a
privacy-safe production collision preflight or another evidence source before
adding a globally unique normalized registered-username index. Requiring
explicit existing-player selection without private automatic matching is a
possible reduced-scope alternative, but it does not implement the approved
source-bound automatic matcher.

No production write, revoke, apply, deploy, or push occurred. Production access
was two catalog-only SQL reads; no table row or personal data was read.

### Prior owner / third remediation context

Claude Opus 4.8 — Phase 4, Step 4.3 closure-blocker remediation (third pass,
**PARTIAL**; WS1 **Layer A only** delivered 2026-07-21 on
`fix/step-43-ws1-layer-a-ledger-gate`, then the ledger #106 carry on
`fix/carry-106-to-redesign`)

### Pre-remediation state reconciliation (2026-07-21)

This section is the current authority for Step 4.3 production, ledger, and
design facts. It supersedes stale current-state claims below while retaining
their historical record. The local implementation status recorded above it is
newer and governs whether the approved replacement has been built.

- **Local Git/tree evidence.** WS1 Layer A is integrated by implementation
  commit 850953cc8 (with hazard correction 2c583a7a3) and merge
  4160eb565; the ledger #106 carry is integrated by d2679c569 and merge
  c5021a52f; the option (e) replay-safety reconciliation is integrated by
  7290fcf9c and merge 0d90d40c3.
- **Ledger model.** src/lib/db/migration-ledger-map.ts records **110
  entries**, head 20260721201734 harden_claim_rpc_privacy. The #106 file is
  20260721173000_harden_claim_rpc_privacy.sql; it was applied in production
  under ledger version 20260721201734, so reconcile it by migration **name**,
  not timestamp/version adjacency.
- **Production facts - last independently verified 2026-07-21; must be
  re-read live before any production-sensitive action.** The #106 hardening is
  applied. The deployed public.match_import_player_names(uuid, text[]) is a
  confirmed live private-name enumeration oracle: it is SECURITY DEFINER,
  authenticated-only, accepts an unbounded caller-supplied candidate array,
  and returns field-identifying reasons with a 1:1 score. This classification
  was established by two independent read-only sessions and is recorded here,
  not reopened or re-adjudicated.
- **WS2.** The reader half shipped on the live-site lineage and is deployed.
  It already bounds its own input and tolerates both fine-grained and coarse
  match values, so no frontend-first step is required. The remaining WS2 issue
  is the confirmed oracle and its replacement.
- **20260720120000.** The coarsening migration is unapplied and is
  insufficient as a closure: it hides which private field matched but still
  confirms that a supplied private name belongs to a real identity. It is not
  authorized for application and must not be applied in the belief that it
  closes the oracle.
- **20260718050924.** The claimable-guest identity migration is not gated.
  Its content is applied as ledger 20260718181600 under renamed drift. It
  must never be applied to production under any protocol.
- **Approved design.** The import identity classification, exact source-bound
  matching with no fuzzy/prefix matching, uniform response set, server-only
  matcher boundary, and save-time revalidation are recorded in
  docs/redesign/DECISIONS.md under "Phase 4 Step 4.3 - Import identity
  classification and source-bound matching." This reconciliation does not
  duplicate or alter that decision.

Remaining Step 4.3 blockers, in required order:

1. Build the approved import-identity fix; obtain an independent review; then,
   and only with separate authorization, apply it under expand/contract.
   **Status:** the fix is built locally and remediated after independent
   review, and is stopped at the release boundary. The separate authorization,
   the compatible reader deploy, and the expand/contract application of
   `20260722012658` then `20260722012707` are still outstanding.
   **[The last clause is SUPERSEDED in part, 2026-07-23: `20260722012658` is
   APPLIED — ledger `20260722132159`, 2026-07-22, a renamed apply reconciled
   by NAME. The compatible reader deploy and the application of
   `20260722012707` are still outstanding and still require separate explicit
   authorization; that gate is unchanged. Evidence class **[REPO]** for the
   ledger map, **[PRIOR]** for production.]**
2. Run the tile-attribution backfill **before** guest re-neutralization. Two of
   the 114 rows resolve only through the unlinked guest's display_name.
3. Perform guest re-neutralization.

   **[The POSITION of items 2 and 3 in this ordered list is SUPERSEDED,
   2026-07-23. The constraint INSIDE item 2 is NOT — it is confirmed and
   reaffirmed below.]** A read-only investigation found the backfill and
   re-neutralization **independent** of the identity release sequence in item 1:
   neither operation reads, writes, calls, or requires any object the identity
   work creates, drops, or re-grants, and nothing in that work requires either
   of them. The position placing this pair after item 1 **has never carried a
   stated justification** — not in this document, not in any other project
   document, and not in git history. Evidence class **[PRIOR]** for the
   investigation, with its two load-bearing halves re-verified **[REPO]** on
   2026-07-23: the backfill's predicate matches on `players.display_name` and on
   nothing else (no alias, username, or private personal-name fallback), and the
   three release-sequence migrations (`20260722012658`, `20260722012707`,
   `20260722160000`) contain no `update … players`, no grant or revoke on
   `players`, and no reference to `game_log_events`.

   **NO NEW POSITION REPLACES IT.** This correction does **not** assert that the
   pair should now run first, in parallel, or at any other point. It records only
   that the ordering is unforced and that **where to schedule it is an owner
   decision that has not been made**. Executing either operation still requires
   its own separate authorization, which neither has.

   **UNCHANGED AND ABSOLUTE — the pair-internal constraint.** The backfill MUST
   still run **before** re-neutralization. Two of the 114 rows resolve solely
   through the unlinked guest's `display_name`; re-neutralization overwrites
   exactly that column for exactly unlinked players; aliases cover 45/114 and
   username and private personal name **0/114**; and restoring the personal
   labels is deliberately excluded from rollback. Violating this order makes
   those rows **permanently unattributable**. See "Ordering correction" below,
   which is the authoritative statement in this document and is unchanged.
   Re-neutralization additionally has **no package at all** — no SQL file, no dry
   run, no rollback, no expected row count [REPO] — and its durability is gated
   on a live-site code change recorded nowhere in this sequence; see
   `GUEST-LABEL-REDIRTY` in `docs/CURRENT_STATUS.md`.
4. Apply the remaining gated migrations 20260719234500, 20260720100000,
   and 20260720110000 under the per-mutation protocol and separate
   authorization.
   **`20260720100000` MUST NOT be applied as written.** Verified against the
   migration file: it drops the 7-argument
   `public.resolve_import_guest_identity(uuid, text, text, text, text, uuid,
   boolean)` — precisely the function whose `authenticated` EXECUTE was revoked
   in production as ledger `20260722153233` — and ends with
   `grant execute on function public.resolve_import_guest_identity(uuid, text,
   text, text, text, uuid, boolean, boolean) to authenticated;`. Applying it
   unchanged would restore that grant and **reopen the closed guest-identity
   confirmation oracle**. It requires correction and separate explicit owner
   authorization before any application. Correcting the migration itself is not
   authorized by this entry. `ID-READER-CLIENT` is **downstream** of this
   migration: the redesign call site passes the 8-argument signature that exists
   only in this gated file, so it cannot be repaired before this is resolved.
   Evidence:
   `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CLIENT-INVESTIGATION-STOP.md`
   §5–§6.

   **[Item 4 is SUPERSEDED with respect to `20260720100000`, 2026-07-23.]**
   That migration is now a **RETIRED no-op tombstone**: the file is retained
   at its original version as an auditable record and contains no executable
   statement, so applying it is impossible by content rather than merely
   gated, and it will never appear in the production ledger. Everything the
   item says about the *previous* body — that it dropped the deployed
   7-argument resolver and re-granted `authenticated` EXECUTE, reopening the
   oracle closed as ledger `20260722153233` — is the reason it was retired and
   is retained as the record of that hazard. Its still-needed capability moved
   to `20260722160000`, which does **not** re-grant `authenticated` and which
   was itself applied on 2026-07-23 as ledger `20260723082917`.
   `ID-READER-CLIENT` is therefore **no longer downstream of this migration**;
   its current disposition is in `docs/CURRENT_STATUS.md` and is not changed
   here. The applicable remaining migrations in this item are
   `20260719234500` and `20260720110000`, still under the per-mutation
   protocol and separate authorization — that requirement is unchanged.
   Evidence class **[REPO]**.
5. Only then run the fresh independent closure audit.

Step 4.3 remains **BLOCKED**. Step 4.4 is **NOT STARTED**.

### Historical third remediation pass (2026-07-20) — PARTIAL, still BLOCKED

Authoritative handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-THIRD-REMEDIATION-PARTIAL-HANDOFF.md`.

Delivered and validated (commits `594244875`, `1efd6f447`):

- **Tile attribution (WS4).** `finalizeGameLog` now attributes imported
  placement events from the import's own recorded identity resolutions once
  the same-game participant map exists. Ambiguous, unresolved, and
  non-participant actors stay unattributed; retries are no-ops. 14 new tests.
- **Matching oracle (WS3).** Gated migration `20260720120000` coarsens the
  `match_import_player_names` disclosure to `exact`/`partial`. Both
  `match_reason` and `match_score` are coarsened — the score mapped 1:1 onto
  the reason and was a parallel oracle. Internal ranking unchanged, input
  bounded, authorization and `search_path=''` preserved. **Not applied.**
- **Ledger (WS6, partial).** Production-only `20260720021300` registered;
  `20260720120000` recorded as gated.
- **Backfill package (WS4).** `supabase/verification/tile-attribution-*.sql`,
  dry-run validated read-only: 114 rows, 3 games, 3 imports, 0 excluded.
  **Not executed.**

At the close of that historical branch, WS1 and WS2 had not yet landed. That
premise is superseded: WS1 Layer A is now integrated, the former
runtime-verifiable-stamp blocker is obsolete, and WS2's reader half is
deployed. WS5 was deliberately not executed; the owner retained the deploy
lock.

**Ordering correction.** The tile backfill must run *before* guest
re-neutralization. Two of the 114 rows resolve solely through the unlinked
guest's `display_name`; neutralizing first destroys that evidence permanently.

No production mutation was performed. The one outward-facing action was the
owner-approved `git push` of the live branch `fix/live-42501-on-capture-v2`,
which had existed on no remote while serving production.

### WS1 Layer A — ledger gate and harness reconciliation (2026-07-21)

Branch `fix/step-43-ws1-layer-a-ledger-gate`, off `0c6f45dfa`. Handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-WS1-LAYER-A-LEDGER-GATE.md`. Hermetic:
no production access of any kind, nothing pushed, deployed, or applied, and no
file under `supabase/migrations/` touched.

- **Ledger snapshot refreshed to the 2026-07-21 read-only attestation:** 108
  entries, head `20260721081355 fix_event_card_tag_snapshot_correction`. The
  three additions over the previous 105-entry snapshot (`20260720221937`,
  `20260721035955`, `20260721081355`) were all applied from *other* branches
  under renamed ledger versions and have no file here; each is registered with
  its provenance. The attestation date, count, and head are pinned so a later
  count mismatch fails instead of being overwritten.
- **The gate is now bidirectional.** It previously partitioned repo files only
  — its own header claimed it partitioned the ledger too, but nothing iterated
  the snapshot. Every ledger version must now resolve to exactly one
  classification or fail as `LEDGER_INCOMPLETE`. This is precisely the hole the
  three cross-branch applications fell through.
- **Hazard class added, orthogonal to approval status.** Every migration file
  declares `contraction | expansion | neutral` explicitly (never derived from
  SQL); an undeclared file fails as `CLASSIFICATION_MISSING`. Current
  declarations: 13 contraction, 28 expansion, 8 neutral. (`20260720110000` was
  first declared `expansion`; an independent review disproved that on a
  disposable local cluster and it was corrected to `contraction` — see below.)
- **Harness reconciled.** The replay loop was applying gated `20260717190000`,
  `20260720100000` and `20260720120000` as if they were production history, so
  the "state production is in today" baseline ran against a database carrying
  three never-applied migrations. All five gated migrations are now excluded
  from the history replay and applied after the baselines, in ledger-version
  order, each twice for repeat-safety.
- **The contraction is exercised as a contraction.** `20260720120000` is a
  `create or replace` whose only predecessor is production-only
  `20260720021300` (no repo file), so the harness had been *creating* the
  function rather than replacing it, with no assertion referencing it. A
  modelled pre-image of the deployed predecessor is installed first, and the
  disclosed classification is asserted before (fine-grained `full_name_exact`
  etc. with the 1:1 score) and after (coarse `exact`/`partial`, same resolved
  player, bounded input, ACL preserved). The pre-image is reconstructed from
  repository-local evidence only and is confined to the harness.

Validation at the final commit: `npx tsc --noEmit` exit 0; 177 files / 970
tests pass; lint at the four baseline warnings; production build green;
`bash supabase/tests/executable/run.sh` passes end to end; `git diff --check`
clean.

This historical WS1 branch did not itself start Layer B/C, WS2, guest
re-neutralization, the tile backfill, the closure audit, or Step 4.4. Current
state is governed by the pre-remediation reconciliation above: the WS2 reader
half subsequently deployed, while Step 4.4 remains not started.

### Ledger #106 carried onto this lineage (2026-07-21)

Branch `fix/carry-106-to-redesign`, off redesign HEAD `4160eb565`. Handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-CARRY-106-CLAIM-RPC-PRIVACY-TO-REDESIGN.md`.
One read-only production ledger read; no production write, nothing pushed,
deployed, or applied.

The #106 claim-RPC hardening is **applied to production** (ledger
`20260721201734 harden_claim_rpc_privacy`), but its file existed only on the
live-site branch `fix/106-claim-rpc-privacy-remediation` (fix commit
`9ddd0de59`, tip `48d612fc8`). This lineage's record of the three claim RPCs was
still the **pre-fix, vulnerable** definitions — so a later redesign deploy or
`db diff` could have reproduced them and silently restored the enumeration
oracle in production. That is what this closes.

- **Migration carried verbatim.**
  `supabase/migrations/20260721173000_harden_claim_rpc_privacy.sql`, byte-identity
  proven by blob hash (`461e0ecbb…` on both sides), not by inspection. The SQL
  was not altered. It is three `create or replace function` statements and
  nothing else — no object created, dropped or renamed, no grant touched.
- **Snapshot refreshed to a fresh read-only attestation: 110 entries**, head
  `20260721201734 harden_claim_rpc_privacy` (was 108 / `20260721081355`). The
  refreshed snapshot is an exact set match against that read.
- **The two new entries classify differently, which is the point.**
  `20260721193508 fold_player_card_outcome_context_into_definer` has no file
  here and is registered production-only with provenance
  (`20260721194500_…` on `814e60210`, `fix/live-compare-data-remove-declared-style`).
  `20260721201734` is renamed drift, because its file is now carried.
- **The drift mapping is keyed by NAME.** `apply_migration` stamped the UTC
  apply time over the filename version and nothing in the ledger points back at
  the file. Timestamp adjacency would also mispair: `20260721193508`'s ledger
  version *precedes* its filename version `20260721194500`. New export
  `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME` records the pairing and the
  new test asserts it against the real filename on disk.
- **Declared `contraction`, and pinned.** It creates, drops and grants nothing,
  so the raw SQL reads like a no-op on the contract surface; it is not. Exact
  whole-name matching replaces prefix matching, a 3-character input floor and a
  10-row cap are imposed, the private-first-name label fallback becomes a
  neutral placeholder, and `group_name` is nulled. Already applied *and* a
  contraction — the case the orthogonal hazard dimension exists for.
- **WS1 Layer A confirmed present** on redesign HEAD before any edit: explicit
  hazard declarations plus the bidirectional completeness check. The
  reconciliation depends on both. Declarations now 14 contraction, 28 expansion,
  8 neutral (50 files); production-only register 69 entries.

Validation at the final commit: 177 files / 971 tests pass; `npx tsc --noEmit`
exit 0; lint at the four baseline warnings, none new; production build green;
`bash supabase/tests/executable/run.sh` passes end to end, with the new file
replaying last in the production-history half; `git diff --check` clean.

At the close of that branch, WS2, WS1 Layer B/C, converge, and the closure
audit had not begun. The 20260718050924 reconciliation was parked at that
point and is now delivered; WS2's reader half subsequently deployed. See the
next section, which also corrects the former gated label.

### Claim-RPC grant and replay safety reconciled (2026-07-21)

Branch `fix/reconcile-claim-rpc-grant-replay-safety`, off redesign HEAD
`c5021a52f`. Handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-RECONCILE-CLAIM-RPC-GRANT-REPLAY-SAFETY.md`.
Two read-only production reads (ledger metadata; one function definition for a
fidelity check); no production write, nothing pushed, deployed, or applied.

**`20260718050924` is not gated.** `GATED_UNAPPLIED` does not contain it and
`APPLIED_UNDER_DIFFERENT_LEDGER_VERSION` maps it to `20260718181600`, which is
in the live ledger. Only its *version string* is absent from the ledger; its
*content* is applied. Earlier records — including `DEPLOY-STATE.md` — call it
"gated", which is wrong and is itself an exposure path, since it invites an
apply under the per-mutation protocol.

**The defect, measured** in a disposable cluster at `c5021a52f` before any
edit: a clean-baseline replay left `list_claimable_player_profiles()` and
`claim_player_profile(uuid)` at `{postgres=X}` — `authenticated` could not
execute either — and left `claim_player_profiles_by_name()` on the default
`PUBLIC` grant, callable by `anon`. Production holds `authenticated=X` on all
three and `anon` on none. Two causes: this file's six revokes (lines 525–530),
and the fact that the restoring grant (ledger `20260720221937`) had no file on
this lineage.

- **Revoke block removed**, replaced by a comment giving three independent
  reasons: the contract requires the confirmed-claim lifecycle and the file
  never touched `claim_player_profiles_by_name()`, so the revoke disabled the
  confirmed path while leaving the unconfirmed bulk path open; `authenticated`
  EXECUTE is production state; and ledger `20260721201734` changed what the
  functions *disclose and accept*, never *who may call them*. Nothing else in
  the file changed. It is consequently **no longer byte-identical** to the SQL
  applied as `20260718181600` — the one deliberate exception, recorded in both
  the map doc and the constant's docstring.
- **Non-idempotency preserved as a safety property**, with a comment saying so.
  The unguarded index and policy statements make an accidental `db push` abort
  on `42P07`; guarded, it would succeed, having already created the
  Data-API-exposed `public.player_private_identities`. No `if not exists` was
  added anywhere.
- **Grant carried verbatim.**
  `20260720190000_grant_authenticated_claim_rpc_execute.sql` from `b11cae71b`,
  blob-identity proven (`f1ad9cb9b…` both sides). Registered as renamed drift
  `→ 20260720221937`, name-keyed, hazard `expansion` (its REVOKEs remove only
  the implicit `PUBLIC` default and `anon`; nothing is stranded).
  `20260720221937` moved out of the production-only register (69 → 68).
- **Harness pre-image added** for production-only ledger entry
  `20260712115539`, which creates `claim_player_profiles_by_name()` and has no
  repo file — without it the grant migration aborted. Body reconstructed from
  repository-local evidence with fidelity **confirmed by hash** against
  production (`b68036b3c…`, 2925 bytes); deliberately the current body, not the
  July-12 original that carried the prefix-fanout oracle. Stated limitation:
  #106 is exercised as a REPLACE on that function, not as a behavioural
  before/after.
- **Ledger re-attested read-only: still 110 entries, head `20260721201734`**,
  exact set match. Declarations now 14 contraction, **29** expansion, 8 neutral
  (51 files).

**Replay end state**, measured against the repository files: all three claim
RPCs end with explicit `authenticated` EXECUTE, no `anon`, no `PUBLIC` —
production's shape, and the previous `anon` exposure on
`claim_player_profiles_by_name()` is closed.

Validation at the final commit: 177 files / 973 tests pass; `npx tsc --noEmit`
exit 0; lint at the four baseline warnings, none new; production build green;
`bash supabase/tests/executable/run.sh` passes end to end; `git diff --check`
clean.

20260718050924 must never be applied to production under any protocol. At
the close of this historical branch, WS2, WS1 Layer B/C, converge, and the
closure audit had not begun; WS2's reader half subsequently deployed.

## Status

**Phase 4 - Log a Game - Active. Step 4.3 is BLOCKED pending the approved
import-identity remediation and ordered follow-up work (not closed, not
self-approved).** The remediation commits build on `8e11d3167`
(the user's expanded master-guide docs commit on top of audit-end
`c9473be25`); the full commit list and finding-by-finding resolution matrix
are in the authoritative handoff. Validation at the final commit: typecheck
clean, full vitest suite green (`--no-file-parallelism`), lint at the four
baseline warnings, production build green, `git diff --check` clean, and the
executable PostgreSQL harness passes end to end — including double
application of both gated migrations, the pre-split RPC compatibility pin,
the guest-privacy lifecycle, the full placement contract through the real
RPC, and the fixture-to-persistence bridge
(`ALL_FIXTURE_ASSERTIONS_PASSED`).

### Production status (verified read-only 2026-07-20)

- **Live-site v2 is deployed** (ledger `20260719132042
  data_capture_hardening_v2`; cutoff 2026-07-19 13:20:42Z; parser
  `tm-data-capture-v2` deployed 13:24:14Z) and its capture data tables held
  **zero rows** as of the recorded verification.
- **The redesign application is not deployed.** Production serves the
  live-site app (worker rolled back to version `eb4e5821…`, the 13:24Z
  v2-hardening build, after an unrelated live-site incident on 2026-07-19;
  see the handoff's deploy-events record). Deploy coordination now lives in
  the live repo's DEPLOY-STATE.md with the user holding the deploy lock.
- **Migration `20260719234500` is NOT applied**, and neither are the two new
  gated migrations `20260720100000` (guest RPC alias-recording control) and
  `20260720110000` (placement contract). The reconstruction files
  `20260711232834`/`20260712114538` are skipped by version. The full
  filename↔ledger mapping is `docs/redesign/reference/MIGRATION-LEDGER-MAP.md`;
  its drift test is bidirectional and hazard-classified as of the 2026-07-21
  attestation (110 ledger entries, head 20260721201734
  harden_claim_rpc_privacy).
- **Backup-table security remediation is complete** (remote ledger
  `20260718234835 lock_down_public_backup_tables`), not outstanding.
- **No production mutation was performed by this remediation** — read-only
  verification only; zero rows, grants, policies, or schema objects changed.

### Production baseline re-based (user-directed, 2026-07-19/20)

Between the audit's verified starting state and this remediation's final
verification, the **user directed** operations in a concurrent session
(player linking and duplicate cleanup, plus deletion of the one draft game
so its wrong-group import can be retried). Re-verified read-only afterwards:
**41** games (all finalized), **41** imports, **14,402** events, **1,467**
typed placements (the deleted draft carried the 33 unresolved-attribution
placements; all remaining placements are attributed), **41** expansion facts
(all `historical_parser_verified_owner_confirmed_absent`, **0** non-null
final Venus, **0** Venus/Colony events, **0** non-unknown ownership), and
**25** players (1 unlinked). This is documented provenance, not drift; the
audit-era figures (42/42/14,816/1,500/42, 28 players) were correct when
captured. Known follow-ups deliberately deferred until after the closure
audit: merging the duplicate same-roster groups `987ce716`/`19426f66`, the
wrong-group guest hazard for the pending re-import, and resolving the
duplicate-source finalized game pair
(`30750df1-…`/`784f9a7c-…`, one shared source hash — now blocked at import
time by the remediated action).

### Second remediation pass outcomes (2026-07-20)

- **Privacy (F-01/B4/H5).** `normalizedImportedValue` is removed from the
  client-facing resolution schema, its confidence-summary serialization, and
  legacy snapshots are stripped at the parse boundary on resume. Every
  first-and-last-name guest creation path — imports, `/group/players` (now
  explicit first/last fields), and Manual Entry's new-player references —
  goes through the guarded `resolve_import_guest_identity` RPC with private
  storage and neutral `Guest XXXXXXXX` labels; the raw `display_name`
  writers (`createPlayerIfMissing`, `upsertPlayer`) are removed. Gated
  migration `20260720100000` adds `p_record_import_alias` so non-import
  creations record no false `game_log` alias evidence. Executable section K
  proves the lifecycle end to end with sentinel names.
- **Placements (F-02).** Gated migration `20260720110000` completes the
  redesign-owned contract: actions
  placed/removed/replaced/converted/ownership_changed/unresolved, ownership
  explicit_owner/neutral/unowned/unknown/not_applicable/unresolved,
  first-class `raw_actor_text` and constrained `tile_type_class` on events,
  first-class `original_source_sha256`/`original_source_byte_length`/
  `parser_run_identity` on imports, an owner-ids-require-explicit_owner
  rule, and the map-independent board-layout check in the rebuilt RPC. The
  builder emits the new fields (ownership stays evidence-seamed and unknown
  — never fabricated), and the adapter maps the widened vocabulary with
  honest nulls on rows predating the columns. Executable section L drives
  every case through the real RPC.
- **Review state (F-03/H2).** `20260719234500` is repeat-safe (guarded DDL;
  the harness applies it twice) and `pre-split-compat.sql` pins today's
  production behavior: the emitted payload (with the `review_state` key) is
  accepted by the deployed pre-split RPC and the computed review value is
  discarded — the exact gap the gated migration closes. Sections J/L/M
  assert all four review states against persisted rows, including the fixed
  `not_required` default that is never re-derived from confidence.
- **Source integrity (H6/H3/§19).** No trim anywhere on the immutable
  source: stored text is byte-identical to the submission and
  `original_sha256` covers the true original bytes (CRLF/LF, trailing
  newline, and leading whitespace all change it; parsing uses a separately
  trimmed value on both client and server). Duplicate-source detection runs
  in the action before any write via the deployed
  `find_duplicate_game_log_import` RPC plus classified matches
  (exact/trimmed/hash-only, draft/finalized, same-parser), returning a
  reviewable `duplicate_source` state; an explicit acknowledgment proceeds
  and records the association. `confidence_summary.run` carries a
  recoverable persisting→complete state; the adapter surfaces incomplete
  runs and failure injection proves partial runs are never read as
  successful.
- **Map gate (F-05/H1).** `evaluateImportMapGate` is the one shared rule;
  the client resolves the same off-reserve exception evidence the server
  resolves, so a verified Artificial Lake ocean passes both sides while an
  unexplained off-reserve ocean against board-defined objectives stays a
  true conflict.
- **Fixture bridge (F-09/H4).** `build-fixture-payloads.ts` drives the real
  `createImportDraft` entry (extracted behind an explicit dependency seam)
  per mechanic category into the disposable PostgreSQL through the real RPC,
  with SQL assertions on persisted states, counts, hashes, placements,
  attribution, and review values; `buildGameExpansionFactInput` has direct
  unit tests. The conflicting-evidence record enters at the parser/fact
  layer — the one documented deviation, since explicit absent-option
  evidence is not constructible through the action's trusted inputs.
- **Reports (F-08/§16/§17).** The Venus/Colonies dry run is restored
  byte-exact from `41bc1221e`; the production execution lives in
  `venus-colonies-historical-production.{md,json}` with a correction note;
  a test pins every dry-run/production pair as separate. The reconciliation
  artifact is regenerated with per-system coverage, both systems' duplicate
  metrics (surfacing the real legacy duplicate pair), and no unmeasured
  adapter-failure figure. The deployed v2 schema is captured as a contract
  fixture with tests that fail on renamed/missing/retyped columns, and the
  adapter's mocked harness now asserts the actual runtime select lists.
- **Resume semantics (§19).** A draft snapshot missing
  `objectiveConfiguration` resumes as `unknown` (requires review), never as
  silently confirmed `board_defined`.

**Step 4.3 must not be marked complete until a fresh independent read-only
audit passes. Step 4.4 has not started.**

Authoritative handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-import-validation-evidence-and-claimable-guest-identity.md`.

### Prior pass — F-01–F-10 remediation and v2 continuation (2026-07-19)

The first bounded remediation (F-01–F-10, commits `cfafd823`..`4e20aeb8`,
four production mutation groups applied and verified) and the 2026-07-19
continuation session (`435077bf`.., live-site v2 integration) are recorded
below as completed history. Its validation was green at the time: 171 test
files / 910 tests, typecheck clean, lint at the four baseline warnings,
build 32/32 pages, executable harness passing.

### Live-site data-capture v2 relationship (verified 2026-07-19; counts re-based 2026-07-20 — see above)

The live site's `data-capture-hardening-v2` release **is deployed to
production** — verified read-only against `qjtwgrjjwnqafbvkkfex`, not taken
from documentation: ledger migration `20260719132042 data_capture_hardening_v2`;
marker `data-capture-hardening-v2` with cutoff 2026-07-19 13:20:42Z and
`parser_deployed_at` 13:24:14Z (`tm-data-capture-v2`); all eight capture
objects present with seeded catalogs (13 colonies, 23 event-type pairs); all
capture data tables empty (no real post-cutoff import yet). The redesign
consumes that contract through a versioned read adapter at the repository
boundary (`src/lib/db/game-capture-compat-repo.ts` +
`src/lib/imports/live-capture/`), specified table-by-table in
`docs/redesign/reference/LIVE-SITE-DATA-CAPTURE-V2-COMPATIBILITY.md`, with the
read-only reconciliation artifact in
`docs/redesign/reports/phase-04-step-03-compat/` (42/42 games legacy-only, 0 v2
rows, 0 duplicate identities, 0 unsupported contract versions). The redesign
does not write `game_capture_*` rows and never duplicates them.

### Continuation session outcomes (2026-07-19, commits `435077bf`..)

- **Confidence/review-state split.** `confidence_level` is strictly
  high/medium/low and a new constrained `review_state`
  (not_required/needs_review/reviewed/rejected) carries the review lifecycle;
  the shared TS contract, both parsers, the event builder, and
  `replace_game_log_events` were split accordingly. Gated migration
  `20260719234500` (NOT applied to production; production has zero
  `confidence_level='reviewed'` rows, verified read-only) maps any legacy
  overloaded rows payload-deterministically and is exercised in the executable
  harness against seeded legacy rows.
- **Clean-baseline repair.** The F-01 completion migration depended on
  `players.full_name`/`username`, which exist in production only via
  remote-only ledger migration `20260712114538`; a faithful schema-only
  reconstruction file under that same version restores the full-history
  replay. Production skips it by version.
- **Source identity wiring.** The import action persists the SHA-256 and byte
  length of the original submitted text, a deterministic parser-run identity
  (source hash + parser version), and whether the stored text was trimmed;
  the server-derived `input_sha256` is unchanged and never conflated with it.
- **Semantic matrix.** `src/lib/imports/canonical-data-semantics.ts` is the one
  executable matrix distinguishing zero/missing/unknown/incomplete/unsupported/
  conflicting/confirmed/not-applicable/unattributed and parser- versus
  owner-verified states; the adapter surfaces violations as issues.
- **Fixtures.** Six explicitly labelled `synthetic-but-format-faithful` full
  exports (Venus-only, Colonies-only, both, off-reserve ocean, unsupported
  wording, printed objective aliases) with provenance in `FIXTURES.md`; none is
  described as a retained real export.
- **Executable negative tests.** The harness now proves the event RPC rejects a
  non-member caller, duplicate identities, unrelated player UUIDs, and the
  retired overloaded confidence, and persists the split contract end to end.
- **End-to-end action test.** The real server action is driven from a submitted
  log through the real parsers to the exact persistence payloads, including the
  incomplete-evidence (never confirmed-absent) state for a log without
  complete-game terminators and null (never zero) final Venus.
- **Draft-evidence isolation.** A behavioral test pins that draft save/resume
  touches only games/game_promo_sets/game_revisions and can never rewrite
  import evidence, duplicate a parser run, or mutate expansion state.

**Production mutations applied and verified (2026-07-19, user approved "apply all
four").** The three remediation migrations are in the live ledger as
`20260719191911` (privacy), `20260719192054` (event contract), and
`20260719192148` (objective aliases); their SQL is byte-identical to the
committed repo files (ledger versions differ from filenames — expected drift).
The 1,500-row canonical placement backfill was executed and verified: 1500 tile
events fully typed, 1467 player + 1467 game-player attributions, 33 unresolved
(null), 100 grid / 1400 flat, 0 owner fields set, 3 constraints validated,
non-tile events untouched, 42 games unchanged, idempotency re-run zero diffs.
`player_private_identities` is in the `private` schema (authenticated cannot
read it or `player_import_aliases`); 6 unlinked labels neutralized; 23 colonies
and 7 objective aliases present. Security advisors show no new regression
attributable to the remediation. Reports:
`docs/redesign/reports/phase-04-step-03-placement/`.

**F-01 was materially incomplete and has been completed (2026-07-19).**
Independent re-verification against production found that the first pass moved
`player_private_identities` — which holds **0 rows** — into `private` and
neutralized `players.display_name`, while the actual personal-name data in
`public.players.full_name` stayed readable by every group member. Impersonating a
real authenticated member returned all 6 unlinked players' `full_name` and
`username`; for the 22 linked players those values are an exact denormalized copy
of the otherwise self-only `public.user_profiles`, exposing all 4 distinct real
people. Closed by ledger migrations `20260719203944`
(`isolate_player_personal_names_from_data_api`, repo file `20260719223000_…`)
and `20260719204250` (`enable_rls_on_player_legacy_identities`, repo file
`20260719223500_…`; ledger versions corrected 2026-07-20 per audit B3 — see
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`): the 6 unlinked rows' values are
preserved in `private.player_legacy_identities` (private schema, client grants
revoked, RLS deny-all) rather than destroyed, and table-level SELECT on
`public.players` is revoked from `anon`/`authenticated` then re-granted per
column excluding `full_name`/`username`. Verified after: the original attack
returns `permission denied`, the copy-then-read path
(`set display_name = full_name`) is blocked, legitimate reads still return 23
rows, all 28 player rows retain their data, and the ELO leaderboard is unchanged
at its 4 baseline entries. The neutral-label rewrite of
`get_elo_leaderboard`/`get_player_usernames`/`list_claimable_player_profiles` was
built, executable-tested and **rejected** — it split the leaderboard 4→6 and
double counted two real people while the fallback only ever surfaced a registered
*public* username. Full rationale in the authoritative handoff.

**Import integrity audit view RLS bypass fixed (2026-07-19).** The advisor ERROR
`security_definer_view public.game_log_import_integrity_audit` had been recorded
as "pre-existing and unrelated" — true of its origin, but it understated a live
cross-tenant exposure. The view has no tenant filter and was created without
`security_invoker`, so it ran as `postgres` and bypassed the caller's RLS: a
signed-out `anon` caller saw all 42 rows (RLS permits 0) and an ordinary member
saw 42 (RLS permits 39), disclosing game ids, parse status, parser version,
sha256 values and validation errors for every import in the system. Closed by
ledger migration `20260719205420`
(`security_invoker_on_import_integrity_audit`, repo file `20260719230000_…`;
ledger version corrected 2026-07-20 per audit B3); `anon` now returns 0, the member
returns exactly 39, `service_role` still returns 42, and **security advisors
report 0 ERROR**. No application code reads the view.

**Step 4.3 must not be marked complete until a fresh independent read-only audit
passes. Step 4.4 has not started.**

Authoritative handoff:
`docs/agent-handoffs/PHASE-04-STEP-03-import-validation-evidence-and-claimable-guest-identity.md`.

### Prior Step 4.3B status (Venus/Colonies import facts)

The earlier Step 4.3B Venus/Colonies parser, schema, and 42-row historical
absence backfill remain applied and production-verified. That earlier note
described Step 4.3 as "closed"; the independent closure audit reopened Step 4.3
for the F-01–F-10 remediation above, which supersedes any "closed" claim.

Commits `aeebf8b7`, `cef2ff1d`, `41bc1221`, and `e88fc25f` implement the future-import
parser/schema/persistence path, historical production-parser verifier, sanitized
reports, and zero-change rerun verification. A complete exported log with no
supported Venus/Colony events now records No (`confirmed_absent`) per the
user's explicit clarification. Partial, unsupported, and conflicting evidence
remain distinct; no manual expansion controls or generic `expansionCodes` were
restored.

The production migration was applied through the connected Supabase tool as
`20260718200536_add_venus_colonies_import_facts`. Its first attempt stopped before
DDL because production already had the equivalent `(game_id, id)` constraint; the
reviewed migration was amended to guard that existing constraint, then applied
successfully. The post-migration preflight found 42 eligible complete logs and
zero blockers. The authorized insert-only backfill created 42 facts, zero
historical Venus/Colony event rows, preserved all fingerprinted unrelated data,
and a second plan contained zero writes.

Final repository validation: 164 test files / 862 tests passed; `npx.cmd tsc
--noEmit` passed; lint exited 0 with four pre-existing warnings; and build passed
at 32/32 pages with middleware present. Docker Desktop is not running, so local
migration execution remains unverified; static migration coverage passes. The
production schema migration and 42-row fact backfill were independently verified.
No push or deployment occurred. Step 4.4, Step 4.5, and Phase 5 were not started.

### Step 4.3 continuation — upstream catalog, tiles, and map reconstruction (2026-07-18, Claude)

Claude continued Step 4.3 after the upstream-catalog/map handoff. Completed and
validated in the repository this session:

- The authoritative **server import path**
  (`src/app/(app)/log-game/import/page.tsx`) was converted off the old
  objective-only detector. It now parses ordered tile actions, reconstructs the
  board, calls `detectImportBoardMapIndependent` with the importer's objective
  configuration, allows every map (including Hollandia), requires a confirmed
  (non-`unknown`) objective setup, rejects only true detector conflicts or a
  confident detected-map mismatch, validates objectives by configuration scope
  (map relationships for board-defined, the global catalog for randomized),
  passes tile actions to `buildTerraformingMarsLogEvents`, and persists the
  objective configuration, ordered tile actions, reconstructed board, unknown
  tile count, and conflicts in the import `confidenceSummary`.
- `LogGameImportShell` now forwards `objectiveConfiguration` to the server action
  (it was previously dropped); `web-import-page` gates the client submit on the
  same map-conflict rule so the reason is surfaced before save.
- `objectiveConfiguration` was threaded through all `LogGameDraftInput` call
  sites: Manual Entry uses `board_defined`, imported drafts stay `unknown` until
  reviewed, and it is owned by the Setup step in the manual-entry registry.
- Reference-catalog fixtures gained `allAwards`/`allMilestones`; the Cards-page
  `is_catalog_visible` filter is covered by a test.

Validation this session: `npx.cmd tsc --noEmit` clean; `npx.cmd vitest run` 160
files / 843 tests passed; `next lint` exit 0 with the same four pre-existing
warnings; `next build` exit 0, 32/32 pages, `ƒ Middleware` present.

Governance docs updated: `MASTER-RULES.md` (upstream source-authority,
export-format governance, map/objective interpretation), `DECISIONS.md`,
`DATA-CAPABILITIES.md` (Step 4.3 addendum with fixture/map/format/language
matrices), this file, and `MASTER-PLAN.md`.

Identity/privacy migration applied (user-confirmed this session): the
`claimable_guest_identity_privacy` migration
(`supabase/migrations/20260718050924_claimable_guest_identity_privacy.sql`) was
applied to production after full read-only vetting. Live verification confirmed
the `player_private_identities` table (RLS on, two member-scoped policies), the
`private` schema and normalizers, `private.resolve_public_player_name`,
`public.get_public_player_names`, `public.resolve_import_guest_identity`, the
privacy-wrapped `analytics.player_game_results` view (113 rows, zero null
names), and the redefined final-action/OCR RPCs. It performed **no identity
backfill** (0 rows in `player_private_identities`; 0 players created this
session; newest player row predates the session). Its final-action reader
consumes the new `tile_placed` greenery/ocean events. Advisors re-run: no new
security findings attributable to the migration; three INFO-level performance
notes on the new (empty) identity table only.

Still open before Step 4.3 can be marked complete:

- separately authorize, apply, and verify the Venus/Colonies migration and
  42-row historical absence backfill;
- the objective-alias data-only migration remains separately gated.

No push or deployment occurred.

### Prior Step 4.2 status

**Phase 4 — Log a Game — Active. Step 4.2 is complete in the repository.**
Manual Entry now uses one typed six-step registry and a responsive, accessible
step-navigation shell. Step order, labels, descriptions, field ownership,
review-issue ownership, status, and heading focus are centralized. The existing
single draft form, explicit Save Draft action, resume URL, and finalization path
remain authoritative; no parallel mobile workflow or persistence state machine
was introduced.

The user explicitly broadened Step 4.2 to remove gameplay expansion tracking
product-wide. Group defaults, Manual Entry, imports, draft snapshots,
saved-game relations, analytics filters/URL state, eligibility, and interaction
analytics no longer track expansions. Legacy snapshots reopen safely with their
former `expansionCodes` key discarded. Prelude selections remain optional,
directly recordable evidence; missing Prelude rows remain missing. Intrinsic
catalog expansion metadata remains available for cards, corporations, Preludes,
card requirements, and catalog browsing.

Migration `20260718041532_remove_game_expansion_tracking.sql` was applied to
the linked production Supabase project. It replaced the interaction views with
corporation–Prelude-only definitions, preserved the production
multi-corporation read path, and removed `public.game_expansions`,
`public.group_default_expansions`, and `public.expansions`. Post-migration
verification confirmed all three relations are absent, interaction output is
corporation–Prelude only, and intrinsic catalog expansion metadata remains
populated. No application push or deploy occurred.

Validation: focused expansion/wizard coverage passed 16 files / 108 tests; full
suite passed 131 files / 663 tests; `npx tsc --noEmit` is clean; lint passed
with the same four pre-existing warnings; build passed at 31/31 pages with
`ƒ Middleware`. Responsive harness checks passed at 1440, 1024, 768, and 390
pixels with no page overflow, reachable horizontal step navigation at narrow
widths, visible active steps, and stacked full-width mobile actions.

Local migration reset remains unverified because Docker Desktop is not running;
the migration has static tests and was verified directly after production
application. The current workflow still has no trustworthy card-acquisition
count writer or coverage contract. At Step 4.2 completion, Step 4.3 had not
begun.

### Prior Phase 3 closure status

**Phase 3 — Navigation and Routes — Complete.** Steps 3.1 through 3.4 are
complete. Step 3.4 independently re-verified the separately landed middleware
execution fix at `e4a444f2d5ef8a6904966c8667ef59acdc346c50` before closing
the phase.

### Step 3.4 finding and resolution: `middleware.ts` never executed

Live verification (unconditional-redirect probe placed as the first line of
the `middleware` function; `.next/server/middleware-manifest.json` inspected
after a fully clean `.next` in both `next dev` and `next build`; production
build's route table, which normally prints a `ƒ Middleware` line) confirmed
`middleware.ts`, at the repository root, was not being discovered or
compiled by Next.js 15.5.20 in this repository, in either mode. Stale mixed
dev/build `.next` state, Turbopack, `next.config.ts` exclusions, file
encoding, and Next's sibling-lockfile workspace-root misdetection were each
ruled out before escalating.

This was **pre-existing and not a Phase 3 regression**: `middleware.ts`'s
structure and `src/lib/supabase/middleware.ts` both predate Step 3.1 (git
blame traces to `0d1176484`, "feat: add Supabase auth shell and protected
routing"), and the failure reproduced identically on routes Phase 3 never
touched (`/profile`, `/group`) as well as ones it did (`/cards`, `/games`,
`/compare`). None of Steps 3.1-3.3 could have caught it: all three explicitly
recorded "no live authenticated browser verification" as a known limitation,
relying on jsdom/Vitest, which never exercises Next's middleware pipeline.

**Root cause and fix** (diagnosed and applied by the spawned task, verified
independently here): Next.js only scans for `middleware.ts` in the directory
that is the immediate parent of the App Router (`src/app` → `src/`) once a
`src/` layout is in use — never the repository root. A pure file
relocation, `middleware.ts` → `src/middleware.ts`, with no logic change
(imports already resolved via the `@/*` alias), fixed it. Verified
independently after the fix landed:

- `.next/server/middleware-manifest.json` populated with a real `"/"` entry
  in both `next dev` and a clean `next build`.
- Production build's route table now prints `ƒ Middleware   106 kB`.
- `next dev`'s log shows `○ Compiling /middleware ...` / `✓ Compiled
  /middleware`.
- Live, unauthenticated `curl` requests: `GET /cards` → `307` to
  `/login?next=%2Fcards`; `GET /profile` → `307` to `/login?next=%2Fprofile`;
  `GET /games?foo=bar` → `307` to `/login?foo=bar&next=%2Fgames%3Ffoo%3Dbar`
  (the `next` value itself, `/games?foo=bar`, is fully and correctly
  preserved and is the only param the login page reads via
  `normalizeNextPath(resolvedSearchParams?.next)`; the harmless top-level
  `foo=bar` duplicate is inert and pre-existing in the query-cloning logic
  Step 3.1 wrote — noted but not fixed, since it doesn't fail the closure
  criterion and touching redirect-URL construction further would broaden
  scope beyond the actual blocker).
- No more uncaught `AuthSessionMissingError` server logs for these requests
  — middleware now intercepts cleanly before the protected page's Server
  Component body ever executes.
- Full suite re-run after the fix: 124 test files / 614 tests passed; `npx
  tsc --noEmit` clean; lint at the same 4 pre-existing baseline warnings;
  build 31/31 pages with the `ƒ Middleware` line present.

**Concurrent-session note:** the spawned task ran in the same working
directory as this Step 3.4 session (not an isolated worktree), which briefly
surfaced as an unexplained `middleware.ts` → `src/middleware.ts` move mid-task
before its commit landed. Confirmed via `git status`/`git log` that no history
was lost or overwritten; Step 3.4 paused all repository edits until the user
confirmed the concurrent session and its commit had completed, then resumed
and re-verified from the committed state rather than trusting the interim
working-tree change.

Step 3.1 established the Phase 3 route framework without moving analytics or
workflow implementation: one typed navigation contract, canonical paths,
deterministic active matching, group-aware visibility, route shells, Insights
compatibility handling, canonical `/games` ownership using the existing Saved
Games implementation, and intentional loading/not-found/unavailable states.

Step 3.2's preflight found that Step 3.1's committed navigation had built a
fixed mobile `BottomNav` bar, a native-dialog "More" drawer, and a
`mobile-primary`/`mobile-more` destination split showing a materially reduced
destination set on narrow screens versus desktop — a direct conflict with
this step's explicit direction that TM Stats is a responsive website, not a
native mobile application, and its explicit prohibition on a mobile
bottom-navigation bar, an app drawer, and a separate mobile information
architecture. This conflict was surfaced to the user before any edit; the user
approved resolving it as in-scope Step 3.2 work.

Step 3.2 replaced that pattern with one responsive navigation architecture:
the same eight primary destinations (Log a Game prominent) render identically
at every viewport width in one row (scrolling horizontally at narrow widths,
as it already did); only the four secondary utility destinations (Games,
Cards, Glossary, Group Settings) plus Logout collapse into a single semantic
"Menu" overflow panel below the desktop breakpoint, keeping Step 3.1's native
dialog accessibility mechanics (background inertness, focus-in, Escape close,
focus restoration, close-on-route-change). Step 3.2 also completed route-level
page titles and descriptions for every canonical destination via one
centralized, validated `src/lib/navigation/route-metadata.ts` registry.

No production database, schema, migration, Storage, dependency, push, or
deployment action is authorized or was performed by Step 3.1 or Step 3.2.

### Prior preservation status

Completed in the repository. The assigned preservation task restored the
authenticated `/glossary` route with 125 historical compatibility identities,
current-contract wording, accessible fragments, and safe centralized
cross-linking. It restored `/cards` as the full server-repository Card Database,
with real catalog records, stable IDs, metadata search, composed filters,
responsive browsing, real-art fallback, and a metadata detail dialog. Promo-only
browsing is no longer the canonical Card Database.

Full validation passes at 117 test files / 590 tests; `npx.cmd tsc --noEmit`
passes; lint and build pass with the same four baseline lint warnings; and the
build generates 24/24 pages. No production database, schema, migration, Storage,
deployment, push, dependency, or original-repository mutation occurred. Card
outcome statistics and acquisition metrics remain explicitly unavailable where
their reader/evidence contract is not approved.

Phase 2 remains formally complete. This separately assigned preservation task is
also complete in the repository; production execution remains separately gated.

## Phase 3, Step 3.1 completion

Completed at commit `dcf5cac1ca8476707e615d7480cfbfd7b8885b51`
(`feat(navigation): define phase 3 route skeletons`). Full validation passed at
120 test files / 599 tests, typecheck clean, lint with the same four baseline
warnings, and build at 31/31 routes.

## Phase 3, Step 3.2 completion

Completed. See `docs/agent-handoffs/PHASE-03-STEP-02-responsive-web-navigation-and-route-context-validation.md`
for the full record. Summary: Step 3.1's committed mobile navigation
(fixed `BottomNav` bar, native-dialog "More" drawer, reduced `mobile-primary`/
`mobile-more` destination set) directly conflicted with this step's explicit
"responsive website, not an app" direction and was flagged to the user before
editing; the user approved fixing it as in-scope Step 3.2 work. Replaced with
one navigation architecture at every viewport width — all eight primary
destinations always visible in one row, only the four secondary utility
destinations plus Logout collapsing into a narrow-width "Menu" overflow that
reuses Step 3.1's native-dialog accessibility mechanics. Added a centralized,
validated route-metadata registry supplying page titles/descriptions for every
canonical destination. Full validation passed at 121 test files / 606 tests,
typecheck clean, lint with the same four baseline warnings, and build at 28
generated routes (no route added or removed). No analytics, formula, schema,
migration, Storage, dependency, production, push, or deployment action
occurred. Live browser responsive verification at 1440/1024/768/390px was not
performed — no authenticated test credentials exist and a local dev server
could not safely be started (port 3000 already in use by another process) —
so this step relied on automated jsdom tests plus manual CSS/media-query
review instead; this is recorded as a known limitation in the handoff, not
claimed as done.

## Phase 3, Step 3.3 completion

Completed. See
`docs/agent-handoffs/PHASE-03-STEP-03-brand-asset-preservation-and-responsive-website-integration.md`
for the full record. Summary: Step 3.3 was authorized after Step 3.2 completed,
specifically to integrate five approved brand assets (shared header banner,
gold/silver/bronze leaderboard laurels, authentication Mars landscape
background). Preflight found the banner was already the approved asset,
checksum-identical and already integrated via `AppShell`'s bundled Next.js
import; the laurels were already wired into the real leaderboard
(`GroupDashboard` under `/group`) but with outdated artwork; the auth
background was a placeholder SVG, not yet the approved PNG. Preflight also
found no Supabase Storage bucket suitable for site-brand/decorative assets and
no existing precedent for storing this asset category there (banner/background
have always been bundled-static or public-static repository files); the user
was asked and chose to keep that existing repository-file convention rather
than create a new Storage bucket, so no Storage upload occurred.
Delivered: laurels reprocessed from the newly approved source art (verified
genuine alpha transparency, no baked checkerboard; no repositioning needed —
content already filled ~92%+ of each canvas) into 256x256 optimized PNGs
(~94% smaller than source); the auth background converted to a single
optimized WebP at native 1672x941 resolution (~92% smaller than source, no
upsampling). All five assets are now resolved through the existing
`resolveStaticSiteAsset` typed registry (extended with 4 new keys) rather than
hardcoded paths, including the banner for the first time. The leaderboard rows
now render an always-visible "#N" rank text (independent of any image) via a
new small client component, with the laurel treated as purely decorative
(empty alt, `aria-hidden`) and dropped safely if the image fails to load,
without hiding the row. The user separately asked for the new background on
the reset-PIN pages too; both `(auth)/reset-pin` and the legacy `auth/reset-pin`
route were updated alongside `/login`. `forgot-pin` has no background today and
was left unchanged. Full validation passed at 124 test files / 614 tests
(10 new/updated test files covering the registry, the rank badge, the
leaderboard rank/laurel mapping, and the three auth-background pages),
typecheck clean, lint with the same four baseline warnings, and build at
31/31 pages. Live browser responsive review covered `/login` and `/reset-pin`
at 390/768/1440px (a dev server could be started this time via a new
`.claude/launch.json`); the leaderboard and authenticated header could not be
checked live because no authenticated test credentials exist (the same
limitation recorded in the Step 3.2 handoff), so that part relied on the
sharp-rendered composite checks (light/dark/orange backgrounds) plus the
automated test suite instead. No analytics, formula, schema, migration,
Storage, production, dependency, push, or deployment action occurred; Step 3.4
and Phase 4 were not started.

## Last completed commit

`e88fc25f` — `fix(imports): verify unrelated backfill data` (latest
Step 4.3B implementation commit before governance closure).

## Current phase

Phase 4 — Log a Game (active; Steps 4.1 and 4.2 complete; Step 4.3B
repository work complete; production migration and 42-row backfill awaiting
separate explicit authorization)

## Prior completed substep

Step 2.5 — Analytics Repository and Query Contracts

## Prior Step 2.5 status

Completed. Step 2.5 added client-safe typed operation/result contracts,
normalized finalized-game source records, and authenticated server readers for
a bounded group page and one RLS-readable game. The operations reuse Step 2.2
filters, keep selection out of the sample, report Step 2.3 coverage/evidence,
preserve zero/missing/native/imported/tied-first facts, and feed the Step 2.4
Win Point Differential utility without duplicating its formula. Inputs are
validated before broad reads; ordering is stable; child rows are batched; raw
errors are redacted; and empty, partial, unavailable, unauthorized, and failed
results remain distinct. Full validation passes at 101 test files / 540 tests,
with typecheck clean, the same four baseline lint warnings, and 23/23 build
pages. No SQL, migration, view, RPC, schema, Supabase state, Storage,
dependency, route, navigation, deployment, production page, or legacy consumer
changed.

## Corporation logo asset replacement (separately authorized, post-2.5)

Completed. A separately approved production task replaced every corporation logo
and remapped `public.corporations.logo_path`. All 116 corporations now resolve to
uniform 800×800 content-addressed tiles (`corporation-logo-<sha256>.png`) on
white/black/orange (`#f06a32`) backgrounds; 112 distinct objects (4 shared
cross-edition pairs). Matching used verified `id`+`code` identity (16 user-supplied
replacements, 4 near-miss adjudications, 96 name matches; 0 unmatched/ambiguous).
Production reconciliation: 116 resolvable, 0 broken, 228 objects (116 prior
retained for rollback + 112 new), all referenced new objects `image/png`.
Only `logo_path` and `tm-corporation-logos` objects changed — no corporation
identity field, schema, RLS, bucket config, unrelated asset, or deployment.
Repository validation at commit: asset suite 48/48, typecheck clean; full
`vitest`/`lint`/`build` recorded in the commit. Rollback:
`docs/redesign/assets/corporation-logos/ROLLBACK.md`. This task did **not** begin
Step 2.6.

## Tag and standard score icon replacement (separately authorized, 2026-07-17)

Completed. A separately approved production task replaced 19 canonical root
objects in public `tm-tag-icons` and all 10 canonical standard root objects in
public `tm-score-icons`. The user-supplied `Tags.zip` PNGs were converted to
lossless WebP at their source dimensions so the established `.webp` paths and
one-hour cache contract remain valid; `galatic.png` intentionally replaced the
canonical `galactic.webp` object. The `icons.zip` PNGs were uploaded byte-exact,
with `terraforming_rating.png` mapped to `Terraform_Rating.png` and the existing
standard no-cache contract preserved.

Post-change production reconciliation: 19/19 requested tag objects and 10/10
requested score objects were downloaded after upload and matched the prepared
SHA-256 values. Supabase metadata reports 21 objects / 14,921,436 bytes in
`tm-tag-icons` and 21 objects / 12,583,743 bytes in `tm-score-icons`, with the
expected WebP/PNG MIME types. `earth.webp`, `science.webp`, all ten `axis/`
objects, and the legacy UUID score icon retained their prior timestamps and
bytes. No database row, schema, migration, RLS policy, bucket configuration,
application file, dependency, deployment, or unrelated Storage object changed.
The pre-change objects and verification reports are retained locally under the
ignored `.npm-cache/tm-asset-replacement-backup-20260717/` rollback scratchpad.
This task did **not** begin Phase 4, Step 4.2.

Same-day authorized follow-up: only `tm-score-icons/Other_Card.png` was replaced
again from the revised user-supplied PNG. The prior 1,336,222-byte object
(`df53e751…f0537a0a`) was backed up, the new 1,595,283-byte object
(`25c0d8e9…f07a5208`) was downloaded after upload and matched SHA-256, and
Supabase retained `image/png` plus `max-age=0, no-cache`. The bucket now contains
21 objects / 12,842,804 bytes. No other object or project state changed; details
are in `docs/agent-handoffs/OTHER-CARD-SCORE-ICON-REPLACEMENT.md`.

Second same-day authorized follow-up: only `tm-tag-icons/jovian.webp`,
`microbe.webp`, `plant.webp`, and `space.webp` were refreshed from the revised
user-supplied PNGs. Each source was converted to lossless WebP without resizing;
all four final objects are 1254×1254 with alpha. The current targets were backed
up first, and all four post-upload downloads matched their prepared SHA-256
values. Supabase retained `image/webp` and `max-age=3600`; the bucket now
contains 21 objects / 14,910,938 bytes. No fifth object or other project state
changed. Details are in
`docs/agent-handoffs/JOVIAN-MICROBE-PLANT-SPACE-TAG-ICON-REPLACEMENT.md`.

## Branch

redesign/tm-stats-dashboard-rebuild

## Prior owner

Codex — analytics repository and query contracts

## Prior Step 2.5 completed commit

Step 2.5 focused completion commit (hash recorded in the completion report)

## Historical Phase 2 next action

Completed: Step 2.6 and its separately assigned Merger closure are complete in
the repository. The later Glossary/Card Lookup preservation task is also complete
at `c17e8b1ba`; this entry is retained as historical sequencing context.

## Next action

**Step 4.3 remains BLOCKED.** The source-bound, server-only import-identity
fix recorded in docs/redesign/DECISIONS.md is built locally and remediated
after independent review, and is stopped at the release boundary. The approved
next action is therefore the owner's separate authorization for the production
preflight/application of `20260722012658` and the compatible reader deploy,
with `20260722012707` authorized separately only after verification. Any
production change requires that separate authorization under expand/contract.

After that authorization gate, the required sequence is:
tile-attribution backfill before guest re-neutralization; guest
re-neutralization; migrations 20260719234500, 20260720100000, and
20260720110000 under the per-mutation protocol; then the fresh independent
closure audit. Two of the 114 tile-attribution rows resolve only through the
unlinked guest's display_name, so reversing the backfill/re-neutralization
order would destroy required evidence.

**[SUPERSEDED IN ONE RESPECT, 2026-07-23 — the placement of the two operations
"after that authorization gate", not the sequence's other contents and not the
constraint in the final sentence, which stands and is reaffirmed.]** The
tile-attribution backfill and guest re-neutralization are **independent** of the
identity release sequence in both directions, and their recorded position after
that gate **has never carried a stated justification** in the record or in git
history. Evidence class **[PRIOR]**, load-bearing halves re-verified **[REPO]**
2026-07-23. **No new position is asserted here**: the pair is not moved earlier,
later, or into parallel, and **scheduling it is an owner decision that has not
been made**. Executing either still requires its own separate authorization.
**The final sentence above remains exact and absolute** — reversing the
backfill/re-neutralization order destroys required evidence permanently — and
"Ordering correction" above is this document's authoritative statement of it,
unchanged. Two further facts belong with any scheduling of this pair:
re-neutralization has **no package whatsoever** (no SQL file, no dry run, no
rollback, no expected row count) **[REPO]**, and its durability is gated on a
live-site code change that appears nowhere in this sequence — see
`GUEST-LABEL-REDIRTY` in `docs/CURRENT_STATUS.md`. The backfill's pinned
population of 114 rows / 3 games / 3 imports was measured 2026-07-20 and is
**[UNVERIFIED]** against production today; the package fails closed on drift.

Production facts are last independently verified 2026-07-21 and must be
re-read live before any production-sensitive action. Migration 20260720120000
remains unapplied, insufficient as an oracle closure, and unauthorized for
application as one. Migration 20260718050924 is not gated and must never be
applied.

**Correction (2026-07-23) — three statements in this "Next action" are stale.
The sequence is not restructured, no step is removed, and no gate is
relaxed.** Evidence class **[REPO]** for the ledger map and migration files,
**[PRIOR]** for what production holds, which is read from the canonical
`DEPLOY-STATE.md` on `fix/live-compare-data-remove-declared-style` and was not
observed here.

- **`20260722012658` is APPLIED**, not awaiting preflight/application:
  production applied it on 2026-07-22 as ledger `20260722132159`, a renamed
  apply reconciled by NAME. **What remains outstanding is the rest of the
  first paragraph and is unchanged**: the compatible reader deploy is not
  authorized and has not happened, and `20260722012707` still requires its own
  separate authorization only after reader verification.
- **`20260720100000` is a retired no-op tombstone** with no executable
  statement. It cannot be applied and will never enter the ledger. The
  applicable pair in that sentence is `20260719234500` and `20260720110000`,
  still under the per-mutation protocol and separate authorization. The
  backfill-before-re-neutralization ordering and its stated reason are
  unaffected.
- **`20260720120000` is APPLIED** — ledger `20260722144034`, 2026-07-22 — so
  "remains unapplied" is false. **The rest of that sentence stands and is the
  load-bearing part**: it is insufficient as an oracle closure and must not be
  cited as one. Applied is not closed.
- Unchanged and reaffirmed: migration `20260718050924` is not gated and must
  never be applied; production facts must be re-read live before any
  production-sensitive action; and nothing here authorizes a migration,
  deploy, push, production read, or Step 4.4.

The current authoritative migration disposition is
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md` together with
`src/lib/db/migration-ledger-map.ts`, and the concise current router is
`docs/CURRENT_STATUS.md`.

Do not begin Step 4.4/4.5/Phase 5, push, deploy, or apply a migration without
separate authorization.

## Active blockers

**No Step 4.3B production blocker remains.** The linked production project has
`game_expansion_facts` under RLS, the expected typed event columns and policies,
and 42 verified historical absence facts. The separately gated objective-alias
migration remains out of scope.

The objective-alias data-only migration remains separately gated and is not
authorized by Step 4.3B. No workaround may hard-code a second UI catalog or
overload display names.

No repository blocker prevents Step 4.2 completion. Docker Desktop was not
running, so local `supabase db reset` verification was unavailable; static
migration coverage and direct post-application production verification passed.
The linked Supabase project has pre-existing security-advisor findings that are
outside this substep and require separately authorized remediation.

No Phase 3 blocker remains. The `middleware.ts` execution defect discovered
during Step 3.4 (see above) is resolved at commit
`e4a444f2d5ef8a6904966c8667ef59acdc346c50`, independently re-verified.

No repository blocker remains for Phase 2. The separately gated production
package needs an owner-approved target group UUID, a read-only dry run with no
catalog or conflicting-record stop condition, and explicit production execution
authorization. It must not be applied by a future unrelated task.

Separately, later analytics and consumer work remains blocked, where applicable,
by undecided tied-first numeric win-margin behavior;
overall point-differential baseline; leaderboard and opponent-strength
methodology; metric-specific sample, coverage, and range thresholds; approval
of current weighting/efficiency/style/award/final-action formulas;
final-action RPC source/security verification; card opportunity/acquisition
identity and coverage; TR, duration, production/engine, and board capture
contracts; role/global-opt-in semantics; generated database types; and
acceptance of live-only schema, RPC, and Storage contracts. Current repository
and UI heuristics that coerce null to zero or hard-code confidence thresholds
remain deferred migration work.

## Database migration status

Two Phase 4, Step 4.3 catalog migrations were applied to the linked production
project `tm-stats`/`qjtwgrjjwnqafbvkkfex` (verified in the live migration
ledger):

- `20260718154209 sync_upstream_cards_and_tile_catalog`
  (`supabase/migrations/20260718114500_sync_upstream_cards_and_tile_catalog.sql`)
  — creates `public.terraforming_mars_tile_types` (45 upstream `TileType`
  values, authenticated read-only), adds `cards.last_synced_at`, and removes
  unsafe default-zero behavior from deployed card global-effect columns.
- `20260718154932 reconcile_upstream_card_identities`
  (`supabase/migrations/20260718120000_reconcile_upstream_card_identities.sql`)
  — adds `cards.is_catalog_visible` and `cards.superseded_by_card_id`, preserves
  53 identity-mismatch rows as reversible audit rows, and hides only those from
  catalog consumers. It deletes nothing; a direct deletion of the 53 rows was
  rejected by the production safety reviewer and must not be retried.

Verified live: snapshot `a63ac3f9-4725-49f5-a967-04899ad52c19`, 996 upstream
cards and 45 tile types; 1,143 retained card rows (1,090 visible, 53 superseded);
0 visible duplicate-name groups.

A third Phase 4, Step 4.3 migration, `claimable_guest_identity_privacy`
(`supabase/migrations/20260718050924_claimable_guest_identity_privacy.sql`), was
applied to production this session with explicit user confirmation, after
reading the full SQL, running its focused static tests (6/6), and verifying its
interaction with the new tile events. It creates private claimable-guest
identity storage and normalization, mode-aware alias indexes, member-scoped RLS,
import-resolution/public-name RPCs, and privacy-preserving replacements for
affected public readers (`analytics.player_game_results` and the final-action/OCR
RPCs). It performed no production identity backfill. Live verification and the
re-run security/performance advisors passed with no new security regressions.

A fourth Phase 4, Step 4.3 migration was applied to production through the
connected Supabase tool and is recorded in the live ledger as
`20260718200536 add_venus_colonies_import_facts`
(`supabase/migrations/20260718200536_add_venus_colonies_import_facts.sql`). It
creates RLS-protected `game_expansion_facts`, extends canonical
`game_log_events`, and replaces the invoker-security event RPC. The verified
backfill inserted 42 historical absence facts only; no historical expansion
events or unrelated-data changes occurred.

A second, minimal data-only migration is required but not authorized. It should
insert only approved milestone/award aliases into the existing
`domain_text_aliases` table using canonical entity IDs, separately normalized
alias text, `source = 'catalog'`, and the existing unique
`(entity_type, normalized_alias_text)` contract. It requires no new table,
column, index, view, RPC, or RLS policy. Rollback must delete only those inserted
catalog alias rows; canonical maps/objectives/relationships and historical game
IDs remain unchanged.

One unapplied Phase 2 migration is prepared:
`20260717190000_add_merger_offer_rule_snapshots.sql`. Its verification SQL,
group-scoped dry run, idempotent historical policy backfill, and rollback are
reviewable locally.

**The EXPAND half of the `ID-READER-CLIENT` repair is applied.** On 2026-07-23
at 08:29:17Z, `supabase/migrations/20260722160000_add_non_import_guest_identity_creator.sql`
was applied to `tm-stats`/`qjtwgrjjwnqafbvkkfex` and recorded in the live ledger
as `20260723082917 add_non_import_guest_identity_creator` — a renamed apply,
reconciled by NAME. It creates exactly one function,
`public.create_or_reuse_guest_identity(uuid, uuid, text, text, text, text, uuid,
boolean)`, a `service_role`-only non-import guest reuse-or-create authorized on
an explicit server-verified requesting-user id, writing no
`player_import_aliases` row. Verified after the apply: one overload, ACL
`{postgres=X/postgres,service_role=X/postgres}`, no `authenticated`/`anon`/
`PUBLIC` execute. It dropped, altered and revoked nothing pre-existing; the
deployed 7-argument `resolve_import_guest_identity` is untouched. Ledger 114 →
115. **No deploy accompanied it and nothing in production calls the function.**
Handoff: `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-EXPAND-APPLIED.md`.

## Latest handoff

- docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-EXPAND-APPLIED.md
  (production apply, redesign lineage: lands the `MATCHER-OVERLOAD-EXPAND-APPLY`
  work item — verdict **PASS**. Gated migration `20260723130000` is **APPLIED to
  production**, recorded in the live ledger as **`20260723151221
  add_service_role_import_name_matcher_overload`**, applied **2026-07-23 at
  15:12:21Z**. **This is the FIRST application of this migration** — the report
  claiming a 13:20:35Z apply under `20260723132035` was disproven by forensics and
  is disproven again here, because the pre-apply ledger this session read live
  held **115 entries with no `20260723132035`, no entry in
  `20260723130000`–`20260723140000`, and no matcher-overload entry**. **Exactly
  one production mutation**; no invocation of either overload, no application row
  or personal value read, `pg_catalog` only. **The ledger moved 115 → 116** with
  exactly one entry added at the head and every prior entry unchanged. **The apply
  tool stamped `20260723151221` over the filename version `20260723130000`**, so
  the pairing is by **NAME** — the third such rename in this sequence, after
  `20260722012658`→`20260722132159` and `20260722160000`→`20260723082917`.
  **Transcription control:** the SQL sent was proven byte-identical to
  `git show HEAD:<path>` **before** the call by writing the payload and `cmp`-ing
  it — both sha256 `6d2f4768…`, 16216 bytes, 0 CR bytes — while the working-tree
  copy hashes differently (`e71fab89…`, 16545 bytes), the CRLF trap live in this
  checkout; `git hash-object` was deliberately not used. **Post-apply catalog
  verification, all CHECKED:** **two** overloads exist; the **new**
  `(uuid, uuid, text[])` is `prosecdef` true, `proconfig` `search_path=""`, ACL
  `{postgres=X/postgres,service_role=X/postgres}` — **no `authenticated`, no
  `anon`, no surviving PUBLIC grant**; the **existing** `(uuid, text[])` is
  **UNCHANGED**, `md5(prosrc)` `522f8cb0a2647c57e35da0a081f90480` and
  `length(prosrc)` `4191` **identical to the 09:40:14Z baseline**, ACL still
  including `authenticated`. **NO DEPLOY accompanied it and nothing in production
  calls the new overload** — the moved reader on
  `fix/matcher-service-role-overload-callsite` (`5894c874a`) is neither merged nor
  deployed, and the deployed Worker still calls the two-argument form as
  `authenticated`. **Rollback recorded as unexecuted and unauthorized:**
  `drop function public.match_import_player_names(uuid, uuid, text[]);`.
  **THREE GATES REMAIN, then the contraction** — merge the reader, deploy, verify
  in production, and only then `20260722012707`; **applied is not deployed and is
  not closed**, Step 4.3 is not complete, and no blocker's disposition changed.
  **Verification scope stated explicitly:** this session verified the OBJECT's
  shape and ACL, **not** that the function returns matches — the non-zero
  match-count / non-null `userId` requirement belongs to the **post-deploy gate**
  and **remains outstanding**, and PostgREST overload resolution stays
  **[INFERENCE]** until that gate. **Prompt-integrity note:** the brief's
  precondition step contradicted itself — its stop clause forbade "any
  matcher-named entry" while the same step required a ledger that necessarily
  contains two — and the session **stopped and quoted both passages rather than
  resolving it**; the owner corrected the clause to mean an entry naming the
  matcher **overload**, and only then did the apply proceed)
- docs/agent-handoffs/AGENT-SKILLS-TIER-1.md
  (local tooling and governance only: ten Claude Code skills under
  `.claude/skills/`, built in two separately authorized increments and then
  audited in a third, encoding existing governance procedure — evidence classes
  and report sections, the validation battery with baselines measured in that task
  at `d63e6b0d7`, task preflight, handoff writing, planning-pack synchronization,
  the missing/zero/unsupported distinction, canonical-first lookup,
  identity-and-name privacy, conflict and authority, and production-action
  preflight. Procedure and pointers only; no contract text restated; all 34 path
  and 73 heading pointers verified to resolve. Each skill states it authorizes
  nothing, and the production-action one states it grants no permission and is
  only for a session already holding a named authorization. **The permission audit
  closed eleven places where a skill read as more permissive than the governing
  documents** — dependencies, inventing formulas, unauthorized preflight reads,
  unconditional worktree creation, assumed write permission, unrelated refactors,
  invented sample thresholds, and unnamed separate-approval items — and cited
  `MASTER-PLAN.md` → `## 4. Non-Negotiable Constraints` and `### Scope rule`,
  which the build increments had not. No skill gained a permission. **No phase,
  blocker, release, migration, or production change, and no production access.**
  **MERGED** by owner authorization on 2026-07-23. Cataloguing the skills,
  creating any index, and the `AGENTS.md` mirror remain unauthorized owner
  decisions; the baselines remain pinned to `d63e6b0d7`, now an ancestor, and
  re-measuring them at the merge commit is the immediate next action)
- docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-APPLY-FORENSICS.md
  (record only, redesign lineage: lands the `MATCHER-APPLY-FORENSICS` work item —
  verdict **PASS** — which existed in **no** repository document before this
  commit. A session returned a detailed report **claiming** it applied gated
  migration `20260723130000` to production at 13:20:35Z under ledger version
  `20260723132035`, moved the ledger 115→116, verified two overloads and their
  ACLs from the catalog, proved the two-argument function byte-identical, passed
  the harness, and created commits `5b9be6dad` and `03cdafcbc`. **A read-only
  forensic investigation established that NONE of it happened**, and its findings
  are recorded **[PRIOR]** rather than re-derived. **The ledgers:** all three
  projects in the account were read — tm-stats `qjtwgrjjwnqafbvkkfex`, Valeria
  `zyoqrknojxoqwqftsrab`, Moonrakers `znpzawotdmkcdjpwjkds` — and there is **no
  entry at `20260723132035`, no matcher-named entry, and no entry in
  `20260723130000`–`20260723140000` in any project**, each a **CHECKED absence**;
  tm-stats holds **exactly 115** entries, head `20260723082917`, with nothing
  dated after 08:29:17Z that day. **The commits:** neither exists in **any of 13
  distinct object databases**; a `--batch-all-objects` sweep shows no object with
  either prefix exists at all, neither is among the **88 dangling** or **145
  lost-found** commits, `git log -S` finds them in no tracked content ever, and a
  whole-profile grep finds them only in that session's own transcript because the
  brief quoted them — **they were never written**. **The sessions:** both alive in
  the window are on record and **both correctly refused** — `087a4061`
  (13:10:06–13:16:09Z) returned **BLOCKED** citing a churning worktree and the
  CRLF trap, and `886d04e3` (to 13:24:35Z) made the two real commits `2b2a3b00e`
  and `a9429e213`, stated no production access occurred, and declined to start the
  apply; the reflog is continuous with **no entry at 13:20:35Z**. **Prior
  observation corrected:** "no dangling commits" was **FALSE** — there are 88 plus
  145, and the cause was `Select-Object -First 20` truncating `git fsck` output
  whose first 20 lines are 6 blobs and 14 trees; **the conclusion is unaffected**.
  **FOUR OPEN ITEMS, recorded open and NOT closed:** the disputed report's origin
  is unresolved and the evidence does not distinguish a non-persisting client from
  a deleted transcript from a report produced elsewhere; **gap 1e** — a ledger read
  cannot rule out a ledger-bypassing DDL path, the `pg_proc` read that would close
  it was withheld and the **owner has DECLINED to authorize it separately**, so it
  closes only as a side effect of the eventual authorized apply; the project has
  **no local MCP invocation audit trail**, a structural audit limit recorded
  independently of this incident; and the updater's `latest.log` is **rolling**, so
  the 13:21:04Z run's log is gone. **The amended-prompt finding**, recorded as a
  project-workflow defect **on the planning layer, not on any worker**: an amended
  prompt must reconcile its authorization and acceptance sections against its
  retained body before issuing — the forensics brief's retained Step 6 authorized
  a handoff, a commit and a detached worktree while its amended authorization
  required zero writes; the executing session identified the conflict, applied the
  stricter constraint, wrote nothing and disclosed it, **but a session that
  resolved it silently would have been indistinguishable at review time**.
  **Production is unchanged and correct at 115, and there is no drift to repair.**
  **No production access, no apply, no deploy, no push, no merge**; `20260723130000`
  stays **GATED and UNAPPLIED**; Step 4.3 **not** marked complete, no blocker's
  `Blocking` value changed, `PD-1`/`PD-2`/`PD-3` untouched)
- docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-MERGE-AND-RECORD-CORRECTIONS.md
  (merge + documentation, redesign lineage: completes the merge a prior session
  correctly stopped on, resolves its two conflicts under an explicitly
  authorized row-level rule, and corrects four record defects. **Applies
  nothing, deploys nothing, pushes nothing, and reads nothing from production**
  — no Supabase MCP call, no `execute_sql`, no `list_migrations`, no `wrangler`,
  no `/api/deploy-info`; `supabase/migrations/**`, `src/**` and `scripts/**`
  were not edited. `fix/matcher-service-role-overload-expand` @ `bb5370ab4` —
  **re-derived and confirmed to be the exact commit the independent audit
  examined and passed** — is merged `--no-ff` as `2b2a3b00e` with both parents
  intact, from pre-merge HEAD `0053101ad` over merge base `92d4f6917`.
  **Migration `20260723130000` remains GATED and UNAPPLIED**; the production
  ledger is untouched at 115 / `20260723082917` **[PRIOR]**. **The callsite half
  `5894c874a` is deliberately NOT merged** — merging it before the apply opens a
  window in which any unrelated deploy of the live lineage breaks live import
  matching with `PGRST202`/`42883`. **THE AUTHORIZED RULE WAS VERIFIED BEFORE
  IT WAS USED**, by byte-comparing every row of the `Known blockers` table
  against the merge base on both sides: `ID-READER-CONTRACT` and
  `ID-READER-DEPLOY` were modified by the TARGET only, `ID-LEGACY-ORACLE` and
  the new `MATCHER-MANUAL-ENTRY-REPLACEMENT` by the SOURCE only, five rows by
  neither, and `GUEST-LABEL-REDIRTY` — which the prior analysis had not named —
  added by the TARGET outside the conflict region. **NO row was modified by both
  sides**, so the semantic-conflict stop was never reached; all 10 merged rows
  are **byte-identical** to the side the rule assigns, with no duplicate, no
  omission and valid table structure. The `Latest handoff` resolution is
  **purely additive** — 30 base entries plus two target and one source, newest
  first by commit timestamp, nothing dropped or reworded and **no blank line
  introduced**. **The audit's four findings are dispositioned:** FINDING-1
  (MEDIUM) corrected at three sites **comment and prose only**, proven by a
  classified diff showing 33 comment lines and **0 executable lines** changed
  and by an **identical md5 of the comment-stripped file** — the reference is
  the fine-grained pre-image of ledger `20260720021300`, not the deployed
  coarsened body, and **both halves of the bound are stated** (the seven ranking
  predicates and rank values are identical so player-selection equivalence
  transfers; the coarse disclosure labels and candidate-input bound are **not**
  carried); FINDING-2 (LOW) filled with verified facts and an explicit **"no
  build result was recorded, none is claimed"**; the two record corrections
  applied — `MIGRATION-LEDGER-MAP.md`'s superseded reader-deploy precondition
  marked superseded with the original retained, and the `DECISIONS.md` ACL
  clause corrected in a **two-line diff and nothing else in that file**; and
  FINDING-4 **recorded as tracked item `MATCHER-WIRE-CONTRACT`, NOT fixed** —
  the wire contract is asserted on both lineages and compared by neither, so a
  rename leaves both suites green and fails with `PGRST203`, though the three
  parameter names were re-derived this session and **match today**. Two
  operational measurements recorded for the downstream sessions: the pre-deploy
  schema gate collects **tables only and probes no functions**, so **only
  sequencing** stops the reader deploying ahead of the migration; and production
  verification must confirm a **NON-ZERO match count and a non-null `userId`**,
  because a zero-match import is indistinguishable from the silent failure mode.
  **PostgREST overload resolution stays [INFERENCE] and unexecuted**, failing
  loudly and reversibly as `PGRST203`, settling at the **deploy** gate and not
  at the apply. **Step 4.3 NOT marked complete, no blocker's `Blocking` value
  changed, no pending decision resolved, PD-1/PD-2/PD-3 untouched**)
- docs/agent-handoffs/PHASE-04-STEP-03-SEVEN-ARGUMENT-DROP-PRECONDITION-REPLACEMENT.md
  (documentation only, redesign lineage: records the owner decision that
  **SUPERSEDES the reader-deploy precondition on the `ID-READER-CONTRACT` drop**
  of the deployed 7-argument `public.resolve_import_guest_identity` and replaces
  it with **three** — re-derive the signature live from the production catalog,
  re-run the database-internal caller sweep with a positive control, and verify
  the deployed edge functions. **Authorizes nothing**: not the drop, not the
  production session that would discharge those preconditions, not a deploy,
  migration or push. **No production access of any kind occurred** — no Supabase
  MCP call, no `execute_sql`, no `wrangler`, no `/api/deploy-info` — and no
  `src/**`, `supabase/**` or `scripts/**` file was touched. The decision text is
  recorded **verbatim** in `docs/redesign/DECISIONS.md`, placed after the
  2026-07-22 non-import guest identity entry, and is authoritative over every
  summary of it. **Every load-bearing premise was checked against this
  repository first and all reproduced**, including the ACL
  `{postgres=X/postgres,service_role=X/postgres}` **[PRIOR]** as of the
  authorized catalog read of 2026-07-23 09:40:14Z, which precondition 1
  re-derives live before any drop. **`ID-READER-DEPLOY` is NOT dissolved,
  removed, or marked complete** — the redesign reader is still undeployed, still
  needs to ship, and still gates contraction `20260722012707`, which remains
  genuinely deploy-gated because the deployed application calls
  `match_import_player_names` through a user-session client; only its reach
  changed. **No blocker's `Blocking` value changed, no other precondition was
  relaxed, and no other pending decision was resolved** — `PD-1`, `PD-2` and
  `PD-3` are untouched and remain open. **The drop closes NO oracle** — the
  revoke as ledger `20260722153233` already did that — so no status line may
  describe it as closing or mitigating an exposure. **New tracked consequence,
  inherited by the drop session:** dropping the function makes this repository's
  record permanently stale, because two migrations create it and the executable
  harness asserts it **EXISTS** (`run.sh:254`,
  `non-import-guest-identity-after.sql:71,77`) **[REPO]**; it must be handled as
  part of the drop's own work, not discovered afterwards, and handling it is
  separately unauthorized. **Known gap left open deliberately:**
  `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` still asserts the superseded
  precondition and was outside this task's permitted edit set, so that
  correction is outstanding and is flagged in the `ID-READER-CONTRACT` row.
  `tsc`, `vitest`, `lint`, `run.sh` and `build` were **deliberately skipped and
  are not claimed**; the six pre-existing `deploy-state` provenance errors were
  measured at the base commit on a clean tree and are planning-pack staleness,
  not a regression)
- docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-BUILT-LOCAL.md
  (LOCAL BUILD, gated, spanning both lineages: the EXPAND half of the 2026-07-22
  matcher amendment, built under owner decision **PD-1** of 2026-07-23. New
  gated migration `20260723130000_add_service_role_import_name_matcher_overload`
  adds the `service_role`-only three-argument
  `match_import_player_names(uuid, uuid, text[])`, deriving **both** the
  authorization gate and the candidate pool from an explicit server-verified
  requesting-user id; the moved reader is committed separately on the live-site
  lineage as `fix/matcher-service-role-overload-callsite` @ `5894c874a`, because
  the migration ledger, executable harness, state documents and validator exist
  only on the redesign lineage while the matcher's three call sites exist only on
  the live-site one. **NOTHING was applied, deployed, pushed, or read from
  production** — no Supabase MCP call, no `execute_sql`, no `list_migrations`, no
  wrangler, no `/api/deploy-info`. Constraint 1 was re-derived on a disposable
  PostgreSQL 18 cluster in **both** directions — no default resolves
  unambiguously for positional and named two-argument calls, `default null`
  raises `42725` for both — plus a new finding the scoping did not record:
  **position two makes the defaulted form fail at CREATE with `42P13`**, so the
  likeliest mistake is impossible-by-construction. Both identity predicates were
  located, quoted and converted (the `is_group_member` gate and the
  `auth.uid()` candidate pool), and proven by search to be **exactly two**. A
  null requesting user raises `22023` rather than returning zero rows; the caller
  uses a **fail-closed** resolver replacing the audit-purposed one, whose
  now-false RLS comment is corrected. **Eleven mutations — eight SQL, three
  TypeScript — each broke a specific assertion and each reverted byte-identically
  by `git write-tree`**, including the silent gate/pool variant. The two-argument
  function, its grants and every existing migration are untouched, proven by an
  ACL/body-hash/comment snapshot across the apply. **The apply, the deploy, the
  production verification and contraction `20260722012707` are four separate
  gates, none opened**; `SUPABASE_SERVICE_ROLE_KEY`'s binding on the live Worker
  stays **[UNVERIFIED]** as a DEPLOY precondition. Two tracked items added:
  `MATCHER-MANUAL-ENTRY-REPLACEMENT` (owed, dated review 2026-08-23) and the
  **re-gated-never-closed** rule, backed executably. Step 4.3 NOT complete,
  `DECISIONS.md` untouched, PD-2/PD-3 and every blocker's `Blocking` value
  unchanged.)
- docs/agent-handoffs/PHASE-04-STEP-03-BACKFILL-NEUTRALIZATION-ORDERING-CORRECTION.md
  (documentation only, redesign lineage: corrects a provably false ordering
  assertion and repairs an omission in the current-work router. **Decides
  nothing, authorizes nothing, schedules nothing, fixes nothing**; no `src/**`,
  `supabase/**` or `scripts/**` change, no production access of any kind, no
  deploy, no migration applied, no backfill, grant or revoke, nothing pushed.
  **The tile-attribution backfill and guest re-neutralization are INDEPENDENT of
  the identity release sequence** — neither reads, writes, calls, or requires any
  object that work creates, drops, or re-grants — and their recorded position
  after it **never carried a stated justification**, in the documents or in git
  history. Evidence class **[PRIOR]** for the investigation, which left no
  committed handoff, with both load-bearing halves re-derived **[REPO]** here:
  the backfill's predicate matches `players.display_name` and nothing else, and
  the three release migrations contain no `update … players`, no grant or revoke
  on `players`, and no reference to `game_log_events`. Four passages are marked
  **SUPERSEDED** with their original text retained — two in this file
  ("Remaining Step 4.3 blockers" items 2–3, and "Next action") and two in
  `MASTER-PLAN.md`. **NO NEW SCHEDULE IS ASSERTED**: the pair is not moved
  earlier, later, or into parallel; scheduling is an owner decision not yet made,
  and executing either still requires its own separate authorization. **THE
  PAIR-INTERNAL CONSTRAINT IS UNTOUCHED AND REAFFIRMED** — the backfill MUST run
  before re-neutralization, because 2 of the 114 rows resolve solely through the
  unlinked guest's `display_name` (aliases 45/114, username and private personal
  name **0/114**), re-neutralization overwrites exactly that column, and the
  rollback deliberately does not restore the personal labels; its four
  authoritative statements were left **byte-unchanged and proven so** by blob
  hash and by `-N,0` pure-insertion diff hunks. `CURRENT_STATUS.md`, which
  previously contained **neither operation and never used the word
  "neutralization"**, now carries both, the constraint stated prominently, their
  real requirements, and the fact that **re-neutralization HAS NO PACKAGE — no
  SQL file, no dry run, no rollback, no expected row count [REPO]** — plus the
  backfill's 2026-07-20 pinned population recorded **[UNVERIFIED]** against
  production today, fail-closed on drift. **New tracked item
  `GUEST-LABEL-REDIRTY`**: three production-lineage code paths at
  `865df0108f` — `createPlayerIfMissing`, `updatePlayerIdentity` and
  `resolveOrCreateImportGroup` — write personal-name material straight into
  `public.players`, and `git grep` for either identity RPC across `src/` returns
  **zero hits**, so **re-neutralization will be undone by the next import that
  creates participants and its durability is gated on a live-site code change
  recorded nowhere in the sequence**; recorded, **not scoped and not begun**. The
  `full_name`/`username` accumulation past the 2026-07-19
  `private.player_legacy_identities` snapshot is **flagged, not adjudicated**.
  Code checks (`tsc`, `vitest`, `lint`, `run.sh`, `build`) were **deliberately
  skipped and are not claimed** — no code changed and another session was
  building. **No blocker reclassified, no pending decision resolved,
  `DECISIONS.md` untouched, Step 4.3 NOT marked complete**)
- docs/agent-handoffs/PHASE-04-STEP-03-INVESTIGATION-CONSOLIDATION-2026-07-23.md
  (documentation only, redesign lineage: bounded local consolidation landing the
  two read-only investigation branches — `investigate/matcher-overload-scoping`
  (`9d742aef0`) and `investigate/draft-name-residue` (`29e166003`) — as two
  `--no-ff` merges, then recording their outcomes where the blockers and pending
  decisions live. **Decides nothing, builds nothing, fixes nothing**; no
  `src/**`, `supabase/**` or `scripts/**` change, no production access of any
  kind, no deploy, no migration applied, no backfill, grant or revoke. The single
  merge conflict was confined to this `Latest handoff` group and resolved
  **purely additively** — both sides kept in full, newest first, nothing dropped
  or reworded, no blank line introduced — and proven line-multiset identical to
  the conflicted file minus its three markers. `CURRENT_STATUS.md` updated in
  three places, all evidence class **[PRIOR]**: the `DRAFT-NAME-RESIDUE` blocker
  row now records that reachability is **PROVEN by execution**, that the name
  persists at **SIX sites**, that it **SURVIVES FINALIZATION permanently**, and
  that exposure is every group member plus any linked participant of a finalized
  game — reaching the browser of someone who never typed it — with the audit's
  three understatements and its misattributed "must never enter draft snapshots"
  phrase (a code comment about a different field, not a contract clause; the
  clause actually engaged is the privacy contract's unqualified "browser
  hydration data" boundary) recorded **without rewriting the independent audit
  trail**; and **PD-1** now carries the five scoping findings — the overload
  shape survives the ambiguity lesson, the third parameter must carry **no
  default**, the HIGH silent-failure finding on a null requesting-user id,
  **three** call sites and not two, and that the contraction **RE-GATES rather
  than closes** because `service_role` keeps EXECUTE. `SUPABASE_SERVICE_ROLE_KEY`'s
  binding on the live Worker is recorded as **[UNVERIFIED]** and a precondition
  of any overload build. **`DECISIONS.md` untouched, no blocker's `Blocking`
  value changed, nothing reclassified, PD-1/PD-2/PD-3 and the
  `DRAFT-NAME-RESIDUE` closure question all left unresolved, and Step 4.3 NOT
  marked complete**)
- docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-DESIGN-SCOPING.md
  (read-only design scoping, redesign lineage: prices the 2026-07-22 AMENDMENT's
  interim service-role re-gate of `public.match_import_player_names` so the owner
  can weigh building it against deploying the redesign lineage instead. **Decides
  nothing, builds nothing**; no `supabase/**`, `src/**` or `scripts/**` file was
  created or changed on any lineage, and **no production read occurred** — every
  production value is [PRIOR] or [UNVERIFIED]. **The amendment's "overload"
  wording SURVIVES**: the guest-identity `42725` ambiguity does not transfer,
  because the matcher's base signature `(uuid, text[])` carries **no defaults**,
  so an appended third parameter is not forced to default — proven on a
  disposable PostgreSQL 18.4 cluster, together with the control reproducing the
  guest-identity failure. **Binding constraint: the third parameter must carry NO
  default**; `default null` reproduces 42725 on every existing 2-arg call at
  expand time. **The server-side id-resolution mitigation transfers**, and more
  cheaply than the amendment implies: all call sites funnel through one wrapper,
  `matchImportPlayerNames`, which already builds its own client and already
  resolves the user id from `auth.getUser()`, so the change is **one function in
  one file** and no threading is introduced. **There are THREE call sites, not
  the two the amendment names** (the third, `roster_display_name_fallback`, is
  dormant only because the `normalized_display_name` grant survives). **The
  live-site lineage already has the admin client** and existing consumers, but
  whether `SUPABASE_SERVICE_ROLE_KEY` is bound on the live Worker is
  **[UNVERIFIED]** and is a precondition of the deploy step. **The manual-entry
  gap is NOT resolved** — two of three call sites are non-import paths the
  applied source-bound gateways structurally cannot serve. **HIGH finding: the
  null requesting-user id fails SILENTLY** — an unguarded pool returns zero rows
  with no error, and the helper an implementer would reuse returns null by
  design, so every import would show all players unmatched with a clean log; both
  the SQL null rejection and a fail-closed resolver are required. **The redesign
  lineage has ZERO matcher call sites** (verified with a positive control), so
  deploying it satisfies the contraction's real precondition outright, with no
  overload built. Proposed SQL is labelled PROPOSED — NOT APPROVED and exists
  only in the handoff. Authorizes nothing: not the overload, not
  `20260722012707`, not a migration, deploy, production read, merge or push, and
  it resolves no owner decision.)
- docs/agent-handoffs/PHASE-04-STEP-03-DRAFT-NAME-RESIDUE-INVESTIGATION.md
  (read-only investigation, **nothing fixed**: converts `DRAFT-NAME-RESIDUE`
  from an inferred audit finding into **executed fact**, and finds it was
  **understated**. A probe drove the REAL save path — `logGameDraftSchema.parse`
  → `resolveLogGamePlayerReferences` → `saveDraftGame` → the `game_revisions`
  insert — against a disposable PostgreSQL 18 cluster carrying the replayed real
  migration history, adapting only the Supabase transport, then read the row
  back with raw SQL. A typed personal name belonging to a **removed** seat is
  persisted in `game_revisions.snapshot` at **six sites**: as the object KEY of
  `playerScores`, `playerSelections` and `playerStyles`, and as the VALUE of
  `milestoneClaims.*.winnerPlayerId`, `awardClaims.*.fundedByPlayerId` and
  `awardClaims.*.firstPlaceWinnerPlayerIds[]`. The mechanism is proven by
  contrast: the **retained** seat's typed name WAS resolved to a real UUID
  through `create_or_reuse_guest_identity` in the same call — only the removed
  reference stayed raw, because `remapRecord`'s `replacements.get(key) ?? key`
  has no entry for a reference absent from `selectedPlayerIds`, and
  `compactRecord` prunes by value emptiness only, never by key membership.
  **It reaches the browser**: the value was measured in the `initialValues` prop
  of `<LogGameWizard>`, a `'use client'` component (the last hop, Next.js wire
  serialization, is labelled [INFERENCE], not measured). **It survives
  finalization permanently** — revisions are never deleted anywhere in `src/**`
  or `supabase/migrations/**`, finalization only ADDS a row, and the finalized
  revision snapshot itself carries `playerSelections`/`playerStyles` residue;
  claims naming a removed reference were measured **ACCEPTED** by
  `buildFinalizedGamePayload`, which checks presence not membership. Permanent
  per-player tables stay clean — the name lives **only** in
  `game_revisions.snapshot`. **Exposure**, from the policies as written:
  every member of the game's group, plus any linked participant once the game is
  finalized; **not public**, and **not** limited to the drafting user — `/games`
  renders a resume link and `getDraftGameForm` is scoped to the CALLER's active
  group. **One bug, not a family**: the import draft path keys by resolved UUID
  and is unaffected; `sourcePlayerText` is separate and contract-sanctioned.
  **No guard is failing — the case was never covered**, and no test asserts it.
  Contract: the **unqualified** "browser hydration data" bullet under
  Data-boundary requirements IS engaged; the Public-surfaces list is NOT.
  Records a correction: the finding's phrase "must never enter draft snapshots"
  tracks a **code comment about a different field**, not a contract clause.
  Three fix options priced, with existing stored drafts flagged as the expensive
  half needing separate authorization; recommends Option A + C, states the
  at-rest residual risk plainly, and leaves the Step 4.3 closure classification
  **explicitly to the owner** — assessed as recordable rather than blocking, but
  genuinely contestable. **No production read or write, no deploy, no migration
  applied, no push, no `src/`/`supabase/`/`scripts/` change**; probe reverted
  with tree hash `f985cd958` proven byte-identical)
- docs/agent-handoffs/PHASE-04-STEP-03-GUEST-IDENTITY-PRODUCTION-CATALOG-READ.md
  (documentation only, on two lineages: records an authorized read-only
  production catalog read made 2026-07-23 09:40:14Z against
  `qjtwgrjjwnqafbvkkfex` whose results existed only in the owner's session
  record, because a concurrent writer blocked the reading session from
  committing. **Every production value is [PRIOR], not [LIVE]** — the recording
  session made **no production read of its own**. **The `service_role` EXECUTE
  discrepancy on the deployed 7-argument `resolve_import_guest_identity` is
  RESOLVED**: `proacl` is `{postgres,service_role}`, corroborated by
  `has_function_privilege` across 11 roles, so the applied revoke migration's
  header was correct and the creating migrations' grant lists were the
  incomplete picture; the project-level-default-grant explanation stays
  **[INFERENCE]** because `pg_default_acl` was not queried. **The resolver has
  exactly one overload** and it matches both creating migrations character for
  character — verified locally [REPO] — so production was never ambiguous and
  the recorded signature hazard is documentation only. **The production-side
  caller sweep found none** across 172 function bodies, 41 views, 13 triggers
  and 12 schemas, with positive controls and two blindness checks clean, and
  **its four uncovered areas are carried**: edge functions as deployed,
  consumers outside the database, whether the swept tree is what production
  serves, and runtime-constructed dynamic SQL. **The expand is independently
  verified applied** from the catalog. **The three-argument matcher overload is
  absent from production as well as from the repository** — previously an open
  unknown — recorded against PD-1 **without resolving it**. **The drop session
  must RE-DERIVE the signature live**, because a drop against a wrong signature
  succeeds silently against nothing. **`ID-READER-DEPLOY` NOT relaxed, no
  blocker reclassified, no decision resolved, `DECISIONS.md` untouched, Step 4.3
  not marked complete, no `src/`, migration or harness change, no production
  access, no deploy, and no push**)
- docs/agent-handoffs/PROJECT-RECORD-RECONCILIATION-2026-07-23.md
  (documentation and comment text only: reconciles the governing documents
  against the repository after a read-only investigation found them stale in
  ten places. **Nine stale facts corrected, superseded text marked not
  deleted, every figure re-derived**: `20260722012658` and `20260720120000`
  are APPLIED (ledgers `20260722132159` / `20260722144034`), not gated;
  `GATED_UNAPPLIED` holds **five** entries, not seven, of which only **four**
  are applicable because `20260720100000` is a retired no-op tombstone that
  can never be applied. **The tenth is recorded, not corrected**: "deploy and
  verify the compatible reader" has named TWO distinct gates — the
  guest-identity pair, whose contraction is the drop of the 7-argument
  `resolve_import_guest_identity`, and the matcher pair, whose contraction is
  `20260722012707`. The matcher contraction is **evidenced** as genuinely
  deploy-gated: at production source commit `865df0108`,
  `import-player-resolution-repo.ts:223` calls `match_import_player_names`
  through the cookie-based SSR client, so it executes as `authenticated`, and
  that migration revokes exactly that grant. The 7-argument drop's reader
  dependency, by contrast, has **no found caller** on any lineage — production
  `865df0108`, rollback `d12e33ad0`, or this branch — verified with a positive
  control; **the sweep's four uncovered areas are recorded and the precondition
  was left STANDING and NOT relaxed**, because "no caller was found" is not
  "the drop is safe". **Three owner decisions registered and unresolved** in
  `docs/CURRENT_STATUS.md` → "Pending owner decisions": the unbuilt 3-argument
  matcher overload adopted 2026-07-22 (superseded-without-record vs
  adopted-and-unbuilt could not be distinguished); whether Step 4.3 may close
  with `ID-LEGACY-ORACLE` open; and whether `GUEST-NAME-COLLISION-TERMINAL` is
  a contract non-conformance — **recorded as CONTESTED and NOT reclassified**.
  Observations for the owner, not implemented: `MASTER-RULES.md` carries no
  expand/contract rule though the sequence relies on one, and the phase
  contract does not specify the reader-deploy step at all. Every inference is
  labelled as an inference. **Step 4.3 NOT marked complete, no blocker's
  disposition changed, no precondition relaxed, no sequence restructured,
  `DECISIONS.md`/`MASTER-RULES.md`/`AUTHORITATIVE_DOCUMENTS.md` untouched, no
  executable `src/` line changed, no migration applied, no deploy, no push,
  and no production read or write**)
- docs/agent-handoffs/SAVED-GAME-LABEL-RECORD-CORRECTION-2026-07-23.md
  (documentation and comment text only: corrects a **false statement** in this
  document — that this lineage "still labels finalized saved games from
  `game_revisions.snapshot`" — which was an **inference from ancestry never
  checked against the code** and had already premised a full session of work.
  The ancestry half stands (`c7d6c203a` is not an ancestor, exit 1); the
  behavioural half is refuted: `saved-games-page.tsx` selects only
  `id, played_on, status, player_count, generation_count, updated_at` and
  renders no player name, and `listSavedGames`, `person-label`, `personLabel`,
  `firstNameOf`, `labelRosterEntry`, `SavedGameListItem`,
  `UNKNOWN_SAVED_GAME_PLAYER_LABEL` and `saved-games-picker.tsx` are all
  zero-hit here and present on the production lineage — `git log -S` shows the
  machinery was **never** on this branch, the lineages having diverged at
  `2e3f5f7cf` before it was built. The superseded sentence is **marked, not
  deleted**, and the mechanism recorded. The genuine forward constraint — label
  a finalized game from the `game_players` roster not the frozen snapshot,
  preserve snapshot order only where both agree, never render an unresolved
  uuid-shaped entry as itself — is recorded in
  `docs/redesign/phases/05-games-detail-and-replay.md`, the phase that owns
  `/games/[gameId]`, with `c7d6c203a` and the canonical `DEPLOY-STATE.md`
  saved-game player-label release section as evidence, and an explicit note that
  merging the production lineage brings the fix so this is **not** a missing
  merge. **Not filed as a blocker** — it governs unbuilt work — and no blocker
  row for it existed to reclassify. One latent uuid fallback found elsewhere and
  recorded as an observation only: `getPlayerName` in
  `src/features/analytics/group-dashboard.tsx` returns `playerId` when a player
  has no leaderboard row, reachability untested. Both stale
  `non-import-guest-identity-{before,after}.sql` headers corrected comment-only
  — "the state production is in today" → the PRE-EXPAND state, and
  `20260722160000` no longer described as gated since it applied as ledger
  `20260723082917` — with the 79 and 542 non-comment lines proven byte-identical.
  Recommends to the owner, without implementing it, a convention of labelling
  inferences as inferences in this document. **Step 4.3 NOT marked complete, no
  blocker's disposition changed, no `src/` or migration file touched, no
  migration applied, no deploy, no push, and no production read or write**)
- docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-EXPAND-APPLIED.md
  (**the EXPAND step is applied**: migration `20260722160000` was applied to
  production `qjtwgrjjwnqafbvkkfex` on 2026-07-23 at 08:29:17Z under a
  single-mutation authorization and landed as ledger `20260723082917
  add_non_import_guest_identity_creator` — a renamed apply, reconciled by NAME.
  Ledger 114 → 115, both counts read live either side of the apply; the
  pre-apply read returned head `20260723014849` and so **confirmed the earlier
  transcribed reconciliation exactly correct**. Exactly one entry was added and
  exactly one production mutation was issued. The SQL sent was verified
  byte-identical to the committed blob first. Post-apply: **exactly one
  overload** of `public.create_or_reuse_guest_identity`, ACL
  `{postgres=X/postgres,service_role=X/postgres}` — no `authenticated`, no
  `anon`, no surviving `PUBLIC` grant. It dropped, altered and revoked nothing
  pre-existing; the deployed 7-argument `resolve_import_guest_identity` is
  untouched and **was deliberately not read**, that read being the CONTRACT
  step's own precondition and still outstanding. **No deploy of any kind
  occurred and nothing in production calls the new function.** Ledger map,
  ledger-map document, and `run.sh` annotations reconciled; the harness's
  mechanical treatment was already correct and was left alone, and the harness
  passes end to end with all guest-identity proof sections. `ID-READER-DEPLOY`
  is now the active gate; the contraction stays gated; **Step 4.3 is NOT marked
  complete and no other blocker's disposition changed**)
- docs/agent-handoffs/PHASE-04-STEP-03-LEDGER-DRIFT-20260723014849-RECONCILED.md
  (closes the production ledger drift that blocked the next gate: migration
  `20260723014849 repair_snapshot_player_ids` was applied in production on
  2026-07-23 and this lineage had no record of it in any form — no file, no
  ledger-map entry, no documentation row — while the attestation still read 113
  with head `20260722153233` against production's 114. Registered
  **production-only** with provenance and **deliberately not carried**: it
  defines no database object, so no stale definition exists here for a redesign
  deploy or `db diff` to reproduce, which is the condition the ledger #106 carry
  existed to fix. Hazard derived from the SQL as `neutral` and recorded in prose
  only, because a production-only entry carries no `MIGRATION_HAZARD_CLASS`
  declaration. Filename version equals ledger version — no apply-time rename,
  breaking a run of eight. **No production read or write was authorized or
  performed**; the attested values are transcribed from the committed canonical
  `DEPLOY-STATE.md` record of an earlier authorized session's two live reads,
  and that provenance is recorded everywhere the values appear. The bidirectional
  drift gate passes and `run.sh` is unaffected because no file was added. The
  expand apply of `20260722160000` now has its ledger precondition satisfied and
  remains gated and unauthorized; Step 4.3 is not marked complete and no other
  blocker's disposition changed)
- docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-INDEPENDENT-AUDIT-TRAIL.md
  (the repository record of the two independent audits of the
  `ID-READER-CLIENT` work — their targets, verdicts, findings, cleared
  properties, and stated limits. Both audits were read-only and forbidden from
  writing to the repository they audited, so neither report was ever committed;
  this document closes that gap so the closure audit can see what was audited
  and what was found. Evidence class **[PRIOR]** throughout: it records the
  audits, it does not re-prove them and does not reproduce their evidence.
  Recorded, not acted on — no finding's disposition changed, migration
  `20260722160000` is still gated and unapplied, the reader is still undeployed,
  and Step 4.3 is not marked complete)
- docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-COVERAGE-AND-SIGNATURE-RECORDS.md
  (answers the targeted re-audit's FAIL on the merged `ID-READER-CLIENT`
  remediation, which found the SQL and TypeScript correct and complete and failed
  on documentation and coverage only; the re-audit left no handoff in this
  repository, so every defect was independently re-derived from code first.
  FINDING A: the active, Claude-Project-published
  `PHASE-04-STEP-03-ID-READER-CLIENT-EXPAND-BUILT-LOCAL.md` stated a
  `create_or_reuse_guest_identity` signature that does not exist — corrected to
  `(uuid, uuid, text, text, text, text, uuid, boolean)` and given a dated
  supersession notice, together with its stale verbatim-transcription claim and
  its stale unmerged-design-handoff discrepancy, because a CONTRACT drop or
  rollback authored from the old text would have dropped nothing and silently
  recorded success. FINDING B: the release sequence's `2a`/`2b` sub-headings and
  self-referential "item 3 below" corrected to `3a`/`3b` and item 4, with no SQL
  or precondition touched. FINDING C and FINDING D: the multiple-candidate
  rejection and the revalidation's unlinked-only clause were asserted nowhere and
  now carry sections 10 and 11 of `non-import-guest-identity-after.sql`, each
  MUTATION-PROVEN to take the harness to exit 3 under the exact mutation that
  previously left it at exit 0 — auto-selecting on `>= 1` candidates, and
  returning an explicitly selected CLAIMED player as `existing_unlinked_guest`.
  Both probes reverted with `git write-tree` byte-identity proven; no
  non-reverted change under `supabase/migrations/` and no `src/` file changed.
  Two `run.sh` comment blocks corrected to state the measured result instead of
  the refuted causal claim, comment-only with the 156 non-comment lines proven
  unchanged, and the underlying coverage decision deliberately NOT acted on. The
  terminal multiple-match state — a name colliding with two or more unlinked
  guests can never be added, inherited rather than introduced — RECORDED as
  blocker `GUEST-NAME-COLLISION-TERMINAL` with its FINDING-D coupling and
  deliberately NOT fixed. Migration `20260722160000` still gated and unapplied,
  the reader still undeployed, Step 4.3 not marked complete, no other blocker's
  disposition changed, no migration applied, no deploy, no push, and no
  Cloudflare or Supabase access)
- docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-INTEGRATION.md
  (local integration: `fix/id-reader-candidate-predicate` merged `--no-ff` into
  `redesign/tm-stats-dashboard-rebuild` as `07a81c19e`, bringing `eaab06545` and
  `949d16009`, so the audit FAIL on the `ID-READER-CLIENT` expand work is
  answered in canonical state instead of sitting on an unmerged branch; the
  harness coverage gap on the coarsened matcher recorded durably with evidence
  class **[PRIOR]** — the recorded `20260720120000` replay-exclusion reason
  refuted, and the real consequence being that `match-oracle-post-contraction.sql`
  is referenced by nothing so a regression re-widening the disclosed
  `match_reason` / `match_score` or removing the candidate-input bound would pass
  the harness clean — and deliberately NOT fixed; the stale "Gated repo file"
  label at `migration-ledger-map.ts:360` determined to be a **structured** `note`
  field of the exported `PRODUCTION_ONLY_ENTRY_PROVENANCE` record rather than a
  comment, so reported BLOCKED and left unchanged; migration `20260722160000`
  still gated and unapplied and the reader still undeployed; Step 4.3 NOT marked
  complete and no other blocker's disposition changed; the owner authorized
  exactly one fast-forward push of this branch to origin and the planning-pack
  publication that follows this commit — the push result and the updater receipt
  are recorded in the handoff, not here; no migration applied, no deploy, and no
  Cloudflare or Supabase access)
- docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-REMEDIATION-CLOSEOUT.md
  (remediation closeout for `eaab0654`, all claims re-derived rather than
  inherited: mutation probe P1 re-proven against the TIGHTENED clause 8b it was
  never re-run against — harness exit 3, `non-import-guest-identity-after.sql:340`,
  sqlstate `P0002` — with the probe's fidelity to the pre-fix logic proven by a
  zero-line diff against `eaab0654^` and byte-identical reversion; `run.sh` echo
  labels corrected to name each deferred file's real production status after
  confirming nothing asserts on its stdout, 116 non-echo executable lines
  unchanged with a zero-line diff; `GUEST-IDENTITY-OVERLOAD-DESIGN-SCOPING.md`
  corrected at all five signature sites and given a dated authority notice; the
  replay-exclusion question answered by four measured harness runs and left
  undecided for the owner, including that `match-oracle-post-contraction.sql` is
  referenced by nothing so the coarsened matcher is asserted nowhere; a stale
  "Gated repo file" phrase in `migration-ledger-map.ts:360` reported and not
  changed; no migration applied, no production read or write, no deploy, no push,
  and FINDING-4 / `DRAFT-NAME-RESIDUE` not opened)
- docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md
  (ID-READER-CLIENT expand REMEDIATED after an independent audit FAIL, all in the
  still-unapplied 20260722160000: the candidate-counting and auto-selection
  predicates disagreed about claimed players — reproduced as count 1 vs selection
  2, `limit 1` returning the claimed player, call failing P0002 — and are now a
  single materialised `v_candidate_ids`; `p_requesting_user_id` made required and
  repositioned to match the four applied gateways; a mutation-proven collision
  proof and an omitted-argument proof added; release-sequence rollback SQL and
  apply-time ledger bookkeeping recorded; `run.sh` header corrected comment-only;
  audit FINDING-4 recorded as blocker DRAFT-NAME-RESIDUE and deliberately NOT
  fixed; no applied migration, no deployed function, no migration applied, no
  deploy, no push, and no blocker disposition changed)
- docs/agent-handoffs/TAG-ICON-INVENTORY-RECONCILIATION-2026-07-22.md
  (documentation-only: all 21 `tm-tag-icons` objects re-measured individually and
  verified over their public URLs; ASSET-INVENTORY.md corrected to 21 objects /
  313,154 bytes at 128×128, with the 2026-07-17 1254×1254 statements retained as
  history; the downscale is dated to a 2026-07-18T06:59Z batch and traced to
  commit `d747c8720`, which records it in code only; `tm-corporation-logos` and
  `tm-score-icons` newly reported stale and deliberately unreconciled; the six
  unmapped tag objects reported, not decided; no Storage, code, schema,
  migration, deploy, or phase change)
- docs/agent-handoffs/SPACE-TAG-ICON-REPLACEMENT-2026-07-22.md
  (owner-authorized single-object production Storage replacement of
  `tm-tag-icons/space.webp`; applied at the live 128×128 lossless WebP
  convention, verified by hash, public URL, alpha, and render; pre-change object
  retained for rollback; no code, schema, migration, deploy, or phase change;
  `ASSET-INVENTORY.md` reported stale for this bucket and deliberately
  unreconciled)
- docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CLIENT-EXPAND-BUILT-LOCAL.md
  (ID-READER-CLIENT repaired LOCALLY: 20260720100000 retired as a no-op
  tombstone; new gated 20260722160000 adds the service_role-only
  create_or_reuse_guest_identity gated on an explicit requesting-user id and
  writing no import alias; both non-import call paths moved to the admin client;
  proven on a disposable cluster; nothing applied, deployed, pushed, or merged;
  the CONTRACT drop and the deploy remain separately gated)
- docs/agent-handoffs/PHASE-04-STEP-03-GUEST-IDENTITY-OVERLOAD-DESIGN-SCOPING.md
  (read-only design scoping for ID-READER-CLIENT + gated 20260720100000: the
  applied source-bound gateways cannot serve the non-import guest path without
  fabricating import evidence; recommends SUPERSEDING 20260720100000 and adding
  one new service_role-only function authorized by an explicit requesting-user
  id under expand/contract; a disposable-cluster experiment shows an overload
  causes 42725 ambiguity, so a distinct name is preferred; PROPOSED SQL only —
  nothing implemented, no migration authored, no production access)
- docs/agent-handoffs/PLANNING-PACK-SYNC-HOOK-INSTRUCTION-SET-COMPLETION.md
  (documentation-only: the planning-pack sync hook is now fully described in
  AGENTS.md — Claude Code-only, manual step still in force for Codex —
  MASTER-RULES.md, and CLAUDE.md; automatic run in the updater's tree is expected
  and a non-tree PENDING is the report; no code, hook, or production change)
- docs/agent-handoffs/PLANNING-PACK-POST-COMMIT-SYNC-HOOK.md
  (post-commit planning-pack synchronization is now enforced by a repository
  PostToolUse/Bash hook; catalog-derived watch set; tooling and governance only,
  no phase, blocker, release, migration, or production change)
- docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CLIENT-INVESTIGATION-STOP.md
  (ID-READER-CLIENT investigated read-only; the recorded one-line admin-client
  swap is wrong because the RPC gates on `auth.uid()`; a correct fix needs an
  owner-authorized overload migration; nothing implemented, no production access)
- docs/agent-handoffs/POST-INTEGRATION-CURRENT-STATE-RECONCILIATION.md
  (documentation-only correction of four stale post-integration current-state
  claims; ledger snapshot reconciled to 113, tooling branch recorded as merged,
  superseded branch quarantined; no production access)
- docs/agent-handoffs/DEPLOY-STATE-PLANNING-PACK-GIT-SOURCE.md
  (planning pack reads DEPLOY-STATE from the production-lineage Git ref;
  tooling and governance only, no production, release, or phase change)
- docs/agent-handoffs/GUEST-IDENTITY-ORACLE-REVOKE-APPLY.md
  (latest production apply record; guest resolver authenticated EXECUTE revoked)
- docs/agent-handoffs/PHASE-04-STEP-03-IMPORT-IDENTITY-MATCHING-REGRESSION-REMEDIATION.md
  (review blocker remediated in place; still stopped at the release boundary)
- docs/agent-handoffs/PHASE-04-STEP-03-IMPORT-IDENTITY-SOURCE-BOUND-MATCHING-IMPLEMENTED-LOCAL.md
  (source-bound replacement built locally; both migrations gated and unapplied)
- docs/agent-handoffs/PHASE-04-STEP-03-IMPORT-IDENTITY-SOURCE-BOUND-MATCHING-STOP.md
  (historical STOP before implementation; both gates since resolved)
- docs/agent-handoffs/PHASE-04-STEP-03-PRE-REMEDIATION-STATE-2026-07-21.md
  (documentation-only state reconciliation before the approved remediation)
- docs/agent-handoffs/PHASE-04-STEP-03-CARRY-106-CLAIM-RPC-PRIVACY-TO-REDESIGN.md
  (ledger #106 carried onto this lineage; ledger snapshot reconciled to 110)
- docs/agent-handoffs/PHASE-04-STEP-03-WS1-LAYER-A-LEDGER-GATE.md
  (bidirectional ledger gate and hazard classification)
- docs/agent-handoffs/PHASE-04-STEP-03B-VENUS-COLONIES-PRODUCTION-COMPLETE-HANDOFF.md
  (production migration and historical backfill verified)

- docs/agent-handoffs/PHASE-03-STEP-04-navigation-and-route-phase-closure.md
  (Phase 3 complete)
- docs/agent-handoffs/PHASE-03-STEP-03-brand-asset-preservation-and-responsive-website-integration.md
- docs/agent-handoffs/PHASE-03-STEP-02-responsive-web-navigation-and-route-context-validation.md
- docs/agent-handoffs/PHASE-03-STEP-01-navigation-and-route-skeletons.md
- docs/agent-handoffs/GLOSSARY-CARD-DATABASE-PRESERVATION-AND-CROSS-LINKING.md
- docs/agent-handoffs/PHASE-02-VALIDATION-REMEDIATION-AND-CLOSURE.md
- docs/agent-handoffs/PHASE-02-STEP-06-analytics-foundation-integration-validation.md
- docs/agent-handoffs/CORPORATION-LOGO-ASSET-REPLACEMENT-AND-REMAPPING.md
  (separately authorized production asset task, post-2.5)
- docs/agent-handoffs/PHASE-02-STEP-05-analytics-repository-query-contracts.md

## Context-delivery handoff

- docs/agent-handoffs/CLAUDE-PROJECT-MASTER-CONTEXT-AUTOMATION.md
  (stable generated master context and Google Drive synchronization contract)

## Production Supabase mutation record

The corporation-logo task applied production Storage uploads and
`public.corporations.logo_path` updates under separate explicit authorization.
These are not represented by Git; their verified results and rollback are in the
handoff and `docs/redesign/assets/corporation-logos/`. No Phase 2 migration, view,
RPC, schema, Storage, or other Supabase state was applied or changed.

**2026-07-23 — EXPAND apply, one mutation.** Migration `20260722160000` was
applied to `qjtwgrjjwnqafbvkkfex` under a single-mutation authorization and
recorded as ledger `20260723082917 add_non_import_guest_identity_creator`
(renamed apply; reconcile by name). Ledger 114 → 115. It added exactly one
function and changed nothing pre-existing; post-apply verification found one
overload and a `service_role`-only ACL. **No deploy, no push, and no second
production statement.** The production ACL read on
`resolve_import_guest_identity` — the CONTRACT step's precondition — was
explicitly out of scope and was not performed. Recorded on the canonical
`DEPLOY-STATE.md` at `5fe94f1f` on
`fix/live-compare-data-remove-declared-style`.

**2026-07-23 — READ-ONLY catalog read. NOT A MUTATION, and listed here only so
this section is not read as the complete production-contact record.** A
separately authorized read-only session issued `SELECT`s only against
`qjtwgrjjwnqafbvkkfex` at 09:40:14Z, reading the guest-identity function
surface. **Nothing was created, altered, granted, revoked or dropped**, no
application table and no personal name was read, and no Cloudflare action was
performed. It made the ACL and signature read the expand session was forbidden
from making, and the production-side caller sweep. Full result, evidence class
**[PRIOR]**, under "The production catalog read" near the top of this document;
recorded on the canonical `DEPLOY-STATE.md` at `0d866559`.

<!-- BEGIN POST-STEP-4-2-IDENTITY-CLARIFICATION -->

## Post-Step 4.2 scope clarification

Step 4.2 remains complete and must not be reopened solely for this clarification.

The next authorized Phase 4 assignment is:

**Phase 4, Step 4.3 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Import, Validation, Evidence Review, and Claimable Guest
Identity Creation**

Step 4.3 must comply with:

`docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`

This clarification does not authorize:

- registration-time claiming
- database schema changes
- migrations
- production identity mutation
- Step 4.4
- Step 4.5
- Phase 5

<!-- END POST-STEP-4-2-IDENTITY-CLARIFICATION -->
