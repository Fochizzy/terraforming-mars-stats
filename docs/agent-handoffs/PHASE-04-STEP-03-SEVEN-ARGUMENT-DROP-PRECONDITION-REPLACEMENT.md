# Phase 4, Step 4.3 — the seven-argument drop's reader-deploy precondition is superseded

Date: 2026-07-23. Documentation only, on
`redesign/tm-stats-dashboard-rebuild` in the primary redesign worktree.

## What this session was and was not

**Was:** a scribe for one owner decision that had already been made, plus the
precondition updates that decision changes.

**Was not:** an authorization, an analysis, or an implementation. **No
production access of any kind occurred** — no Supabase MCP call, no
`execute_sql` (not even a read-only `SELECT`), no `list_migrations`, no
`apply_migration`, no `wrangler`, no `/api/deploy-info`, no production logs, no
direct database connection, no Cloudflare connector call. No migration was
authored or applied, nothing was deployed, nothing was pushed. No `src/**`,
`supabase/**` or `scripts/**` file was touched. **No blocker's `Blocking` value
changed and no other pending decision was resolved.**

Every statement about production in this handoff is evidence class **[PRIOR]** —
a committed record of an earlier authorized read, not a live read.

## The decision

Recorded verbatim in `docs/redesign/DECISIONS.md` →
**"Phase 4 Step 4.3 - The seven-argument resolver drop: replacing the
reader-deploy precondition"**, placed after the 2026-07-22 non-import guest
identity entry (the most recent) and before the project-wide entries, the same
slot the previous decision used. **That text is authoritative over every summary
of it**, including this one.

The recorded precondition on `ID-READER-CONTRACT` — that the drop of the
deployed 7-argument `public.resolve_import_guest_identity` is valid only after
the moved reader is deployed and production-verified — is **SUPERSEDED**, and
replaced by three preconditions.

**Why, in the decision's own terms.** Expand/contract exists to stop a deployed
reader losing something it still needs. Two independent read-only
investigations, each with a positive control, found no reader on any lineage
that calls the function, and an authorized production catalog read found zero
references anywhere inside the database. The moved reader the precondition names
exists only on the redesign lineage; the live lineage creates guests by direct
insert and has no caller to move. Satisfying the precondition as written would
therefore require deploying the redesign application to production — a lineage
cutover of several hundred commits shipping Phase 4 of a twenty-phase rebuild,
onto a branch missing live-site fixes, whose deployability is itself unverified.
That is a launch decision, not a step in Step 4.3.

## The three preconditions that replace it

Binding on the session that authors the drop:

1. **RE-DERIVE THE SIGNATURE LIVE** from the production catalog before writing
   any drop statement. `drop function if exists` against a signature that does
   not exist succeeds silently against nothing — reporting success, changing
   nothing, while the session records the function as dropped.
2. **RE-RUN THE CATALOG SWEEP** for database-internal callers — function bodies,
   view definitions, triggers and dependency records across all non-system
   schemas — with a positive control so an empty result is meaningful. The
   existing sweep is dated 2026-07-23 and production can move.
3. **VERIFY THE DEPLOYED EDGE FUNCTIONS.** The repository records the project's
   only edge function as a disabled stub, but that is a prior record rather than
   an observation, and edge functions are one of the four areas the catalog
   sweep explicitly does not cover.

**Residual risk accepted by the decision:** consumers outside the database
(external clients, scripts, ad-hoc sessions) and dynamic SQL that never stores
the name literally. Recovery is straightforward if that is wrong — the body is
preserved in migration `20260718212339` and can be recreated.

## Tracked consequence the drop session inherits

**Dropping the function in production makes this repository's record of it
permanently stale.** Two migrations on the redesign lineage create it and the
executable harness asserts that it **exists**. Same class of
repository-versus-production divergence the carry convention exists to prevent,
arriving from the opposite direction. **It must be handled as part of the drop's
own work, not discovered afterwards** — and handling it is separately
unauthorized and was not begun here.

Re-verified for this record, evidence class **[REPO]**:

| Artifact | Location | What it asserts |
|---|---|---|
| Creating migration | `supabase/migrations/20260718050924_claimable_guest_identity_privacy.sql` | `create or replace function public.resolve_import_guest_identity` |
| Creating migration | `supabase/migrations/20260718212339_remediate_guest_identity_privacy_boundary.sql` | same; this is the file the decision names as the preserved body |
| Harness | `supabase/tests/executable/run.sh:254` | fails when `to_regprocedure('public.resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean)')` **is null** |
| Harness | `supabase/tests/executable/non-import-guest-identity-after.sql:71,77` | names the same 7-argument signature |

## What the decision explicitly does not do

- **It closes no oracle.** Authenticated EXECUTE was revoked in production on
  2026-07-22 as ledger `20260722153233`, and the ACL is `{postgres,service_role}`
  only as of the authorized catalog read of 2026-07-23 09:40:14Z — **[PRIOR]**,
  re-derived live by precondition 1 before any drop. The security objective was
  met by that revoke; the drop completes expand/contract and removes a dead
  object. **No status line or summary may describe it as closing or mitigating
  an exposure.**
- **It does not authorize the drop**, nor the authorized production session that
  would discharge the three preconditions. Both need new owner authorization.
- **Contraction `20260722012707` is untouched and remains genuinely
  deploy-gated.** The deployed application calls `public.match_import_player_names`
  through a user-session client, so it executes as `authenticated`, and that
  migration revokes exactly that grant; applying it against the current
  deployment would break live import matching. It is unblocked by the
  service-role matcher overload, not by this decision.
- **`ID-READER-DEPLOY` is NOT dissolved, removed, or completed.** The redesign
  reader is still undeployed and will eventually need to ship, and it still
  gates the contraction above. Only its reach changed: it is no longer a
  precondition of the 7-argument drop.

## Premise check performed before recording

Each load-bearing premise in the decision text was checked against this
repository before the text was committed. **All reproduced**; nothing was
corrected, and no premise failure was found.

| Premise | Result |
|---|---|
| ACL is `postgres` and `service_role` only | **Confirmed** [PROJECT-DOC]/[PRIOR] — `REDESIGN_STATE.md` §B and `CURRENT_STATUS.md` both record `proacl` `{postgres=X/postgres,service_role=X/postgres}`, confirmed two ways (raw `proacl`, and `has_function_privilege` across 11 roles) |
| Catalog read timestamp 2026-07-23 09:40:14Z | **Confirmed** [PROJECT-DOC] — `REDESIGN_STATE.md` §"The production catalog read (2026-07-23 09:40:14Z)" |
| Revoke on 2026-07-22 as ledger `20260722153233` | **Confirmed** [PROJECT-DOC] |
| Zero database-internal references, all non-system schemas | **Confirmed** [PRIOR] — 172 function bodies, 41 views, 0 matviews, 13 triggers, 12 schemas, 0 `pg_depend` rows on OID `21767`, positive controls clean |
| Two independent sweeps, each with a positive control | **Confirmed** [PROJECT-DOC] — the repository-side sweep and the production-side catalog sweep |
| Live lineage creates guests by direct insert, no caller to move | **Confirmed** [GIT]/[REPO] — the `GUEST-LABEL-REDIRTY` row records three direct-`players` writers at `865df0108f` and a zero-hit RPC sweep across `src/` |
| "Several hundred commits" cutover | **Confirmed** [GIT] — `git rev-list --count 865df0108f..HEAD` = **268** |
| Body preserved in `20260718212339` | **Confirmed** [REPO] |
| Two creating migrations; harness asserts existence | **Confirmed** [REPO] — see the table above |
| Only edge function is a disabled stub | **Confirmed** [REPO] — `supabase/migrations/20260722153000_close_authenticated_guest_identity_oracle.sql:40-41`: `temporary-asset-uploader`, "a two-line disabled stub returning 410". `supabase/functions/` does not exist in this tree, which is why the decision treats this as a prior record rather than an observation |
| `20260722012707` deploy-gated via user-session client | **Confirmed** [GIT]/[REPO] — `import-player-resolution-repo.ts:223` through `createSupabaseServerClient()` |

## Locations updated

Original text retained everywhere; supersession marked in each file's
established `**SUPERSEDED …**` style.

**`docs/REDESIGN_STATE.md`**

- New section "OWNER DECISION (2026-07-23): the reader-deploy precondition on
  the 7-argument drop is SUPERSEDED and replaced by three", placed immediately
  before the finding it supersedes.
- §"Finding (2026-07-23): the 7-argument drop's reader dependency has no found
  caller" — opening paragraph marked superseded as to the reader-deploy
  precondition only.
- Same section, "**The precondition is NOT relaxed.**" bullet — marked
  superseded; the owner decision it said "has not been made" has now been made.
- Same section, the "SATISFIED 2026-07-23 09:40:14Z" bullet — "the reader-deploy
  precondition stays in force" marked superseded; its other clauses reinforced,
  two of them now being preconditions 1 and 2.
- §"The production catalog read", part C — "The reader-deploy precondition is
  **NOT** relaxed" marked superseded; "no blocker is reclassified" unchanged.

**`docs/CURRENT_STATUS.md`**

- "In progress" — the "NOT relaxed … remains in force" bullet marked superseded;
  a new bullet records the decision.
- §"The production catalog read", "`ID-READER-DEPLOY` still stands" marked
  superseded as to that clause only; "not authorization to drop" unchanged.
- §"Next work item" — item 4 amended (**not** dissolved: it still stands and
  still gates item 6) and item 5's "only then" / "Step 4 … still gates this
  step" marked superseded.
- §"Note (2026-07-23): steps 4–6 span TWO distinct expand/contract pairs" —
  "they share step 4's reader-deploy gate" marked superseded; they no longer do.
- Step 5's "the precondition is left standing anyway" marked superseded.
- **New section "The seven-argument drop's preconditions (owner decision,
  2026-07-23)"** — the three preconditions, the residual risk, the tracked
  stale-record consequence, and the closes-no-oracle constraint.
- Blocker row **`ID-READER-CONTRACT`** — preconditions replaced by the three;
  tracked consequence recorded in the row. **`Blocking` value unchanged
  ("Step 4.3 closure").**
- Blocker row **`ID-READER-DEPLOY`** — records that it is no longer a
  precondition of the drop. **Not dissolved, not removed, not marked complete;
  `Blocking` value unchanged ("Legacy contraction").**

## Known gap left open, deliberately

**`docs/redesign/reference/MIGRATION-LEDGER-MAP.md` was NOT updated.** Its
passage "**The precondition stands and is NOT relaxed by this finding.** …
Changing, narrowing, or removing the reader-deploy precondition on this drop is
an **owner decision** and has not been made" (around lines 552–557) asserts the
superseded precondition and is now stale. That file was outside this task's
permitted edit set, so the correction is **outstanding** and is flagged in the
`ID-READER-CONTRACT` blocker row so it cannot be lost.

Historical handoffs that assert the old precondition
(`PHASE-04-STEP-03-GUEST-IDENTITY-PRODUCTION-CATALOG-READ.md:173`,
`PHASE-04-STEP-03-ID-READER-EXPAND-APPLIED.md:219`, and others) were **not**
rewritten, consistent with this project's convention that a handoff is a record
of what a session found rather than a live statement of current state.

## Validation

- `npm.cmd run validate:claude-context -- --require-maintenance` — run
  pre-commit, as required.
- `git diff --check` — clean.

**Deliberately skipped, and NOT claimed:** `tsc`, `vitest`, `lint`,
`supabase/tests/executable/run.sh`, and `npm run build`. This change touches no
code, and other sessions were using the machine.

**Known pre-existing validator failure, measured at the base commit on a clean
tree before any edit:** six `documents[24] (deploy-state)` provenance errors
(`source_tip_commit`, `path_commit`, `path_commit_time`, `body_sha256`, stale
body, and `generated_at` predating the source commit). These are planning-pack
staleness following a commit to `DEPLOY-STATE.md` on
`fix/live-compare-data-remove-declared-style` at `1b4c2350`, **not** anything
this session introduced, and they must not be "fixed" by hand — the post-commit
hook republishes the pack.

## Authorization boundary — what still requires new owner authorization

- the authorized production session that discharges the three preconditions;
- authoring or applying the drop migration;
- handling the stale-record consequence;
- pushing `redesign/tm-stats-dashboard-rebuild`;
- contraction `20260722012707`; the matcher overload's build, apply, deploy or
  verification; the tile-attribution backfill; guest re-neutralization; the
  closure audit; Step 4.4.

**No downstream work was started.**
