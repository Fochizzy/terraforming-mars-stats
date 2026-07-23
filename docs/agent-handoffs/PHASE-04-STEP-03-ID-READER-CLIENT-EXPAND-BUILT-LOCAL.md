# Phase 4, Step 4.3 — ID-READER-CLIENT: EXPAND built and proven LOCALLY

> **SUPERSEDED IN PART — superseded by commit `eaab0654` (2026-07-22); this
> notice added 2026-07-23. Not the current authority for this subsystem.**
>
> The current authority for `public.create_or_reuse_guest_identity` is
> `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md`
> together with the shipped file
> `supabase/migrations/20260722160000_add_non_import_guest_identity_creator.sql`.
> Read those before relying on anything below.
>
> **The signature changed after this document was written.**
> `p_requesting_user_id` is now **required and positioned second**, matching the
> four applied gateways of `20260722012658`; it is no longer a trailing defaulted
> parameter. The shipped signature is:
>
> ```
> public.create_or_reuse_guest_identity(uuid, uuid, text, text, text, text, uuid, boolean)
> ```
>
> **The candidate search is no longer a verbatim transcription.** §1b as
> originally written said the candidate search *and* the selected-player
> revalidation were both transcribed verbatim from `20260720100000`. That now
> holds for the revalidation only: `eaab0654` rebuilt the candidate predicate as
> a single materialised `v_candidate_ids` after the audit found the counting and
> auto-selection predicates disagreed about claimed players.
>
> §1b has been corrected in place on both points, so this file cannot hand a
> future reader a signature that does not exist. That correction is load-bearing:
> a rollback or CONTRACT drop authored from the superseded text would emit
> `drop function if exists` against a signature nothing ever created, succeed
> silently, and leave the function in place while the session recorded it as
> dropped.
>
> The surrounding record of what that session did — sections 2 through 6, and
> the dated follow-ups in sections 7 through 9 — is left as written, except where
> a statement in it has since become factually false; those carry their own dated
> resolution in place. Where this document and the shipped migration differ, the
> migration and the remediation handoff win.
>
> Everything else here remains a local-implementation record. It authorizes
> nothing.

**Outcome: the owner-approved repair is implemented and executably proven on a
disposable PostgreSQL cluster. Nothing was deployed, applied, pushed, or merged.
No production system was read or written. Step 4.3 is NOT complete.**

This implements the design in
`docs/agent-handoffs/PHASE-04-STEP-03-GUEST-IDENTITY-OVERLOAD-DESIGN-SCOPING.md`
(Option 1), under the owner decision of 2026-07-22 accepting the
`p_requesting_user_id` trust model for this non-import reader and superseding
gated migration `20260720100000`.

Evidence classes are tagged inline: `[GIT] [REPO] [PROJECT-DOC] [PRIOR]
[INFERENCE] [UNVERIFIED]`. No `[LIVE]`/`[PROVIDER]` claim appears — no
production read was authorized or performed. Every statement about the currently
deployed function body, ACL, or data remains `[PRIOR]`/`[UNVERIFIED]`.

Base `redesign/tm-stats-dashboard-rebuild` re-derived at **`0f2e65d66`**; base
worktree clean before branching; task branch
`fix/id-reader-client-guest-identity` in a fresh worktree [GIT].

---

## 1. What changed

### 1a. `20260720100000` retired as a no-op tombstone

`supabase/migrations/20260720100000_add_guest_identity_alias_source_control.sql`
now contains **no executable statement** — only a documented tombstone header
explaining why it was retired and where its capability went [REPO]. The
`grant execute … to authenticated` that would have reopened the oracle closed by
ledger `20260722153233` no longer exists in the file, so it cannot be applied by
any future session.

The file is kept, at its original version, as an auditable record. In
`src/lib/db/migration-ledger-map.ts` it stays classified `GATED_UNAPPLIED` (it is
not in the production ledger and never will be) and its declared hazard class
moves `expansion` → **`neutral`**, because a no-op changes no contract surface
[REPO]. Its previous `expansion` label was itself inaccurate — see §4.

### 1b. New migration — `20260722160000_add_non_import_guest_identity_creator.sql`

Creates `public.create_or_reuse_guest_identity(uuid, uuid, text, text, text,
text, uuid, boolean)`: `security definer`, `set search_path = ''`, authorization
gated on an explicit `p_requesting_user_id` checked against
`public.group_members`, `created_by_user_id` populated from that same argument,
and **no `public.player_import_aliases` insert on any branch**.

**Corrected 2026-07-23** (see the notice at the top of this file). Two claims in
this paragraph were superseded by `eaab0654` and are shown above as shipped, not
as originally written:

- the **argument order**. As first written this paragraph recorded
  `(uuid, text, text, text, text, uuid, boolean, uuid)`, with
  `p_requesting_user_id` trailing and defaulted. That ordering was never applied
  anywhere; `p_requesting_user_id` is required and second;
- the **candidate search**. As first written this paragraph said the candidate
  search and the selected-player revalidation were both transcribed verbatim
  from `20260720100000` lines 87-163. Only the **selected-player revalidation**
  is a verbatim transcription (of its lines 137-163). The candidate search is
  deliberately **not** one: it is evaluated once into `v_candidate_ids`, from
  which both the count and the auto-selection derive, because the two predicates
  it was transcribed from had drifted apart [REPO].

Grants: `service_role` only. `authenticated` is never granted; `public`, `anon`
and `authenticated` are explicitly revoked (the `public` revoke is load-bearing,
because `CREATE FUNCTION` grants EXECUTE to PUBLIC by default) [REPO].

A **distinct name** rather than an overload, per the design's disposable-cluster
finding: the existing signature ends in five defaulted parameters, so an appended
parameter is forced to default and the old-style call becomes ambiguous
(`42725`).

It is **additive**. The deployed 7-argument
`public.resolve_import_guest_identity` is deliberately left in place; dropping it
is the separate CONTRACT phase.

### 1c. Both non-import call paths moved to the service-role client

`createOrReuseGuestPlayerByPersonalName`
(`src/lib/db/import-player-identity-repo.ts`) now resolves the authenticated user
from the **server session** via `supabase.auth.getUser()`, then calls the new
function through `createSupabaseAdminClient()`, passing that verified id as
`p_requesting_user_id` [REPO].

Both product paths — `/group/players` roster add
(`src/app/(app)/group/players/page.tsx`) and the Log-a-Game manual-entry resolver
(`src/lib/db/log-game-player-resolution.ts`) — call that one function, so both
moved with it. Neither call site's signature changed.

**Why the id is resolved inside the repo rather than threaded from the callers.**
The four applied gateways receive `requestingUserId` from `activeContext.userId`
in their server action. Threading it the same way here would require editing
`src/app/(app)/log-game/page.tsx`, which is outside this task's permitted file
set. Resolving it in the repo uses the *same* server-verified source
(`supabase.auth.getUser()`, exactly what `getCurrentGroupContext` uses [REPO])
and is strictly stronger for the security property the design is worried about:
the function accepts no caller-supplied id at all, so there is no parameter
through which an attacker-influenced value could ever be passed. A missing or
unverifiable session throws before any RPC is issued.

---

## 2. Executable proof (disposable cluster, nothing persisted, no production)

`bash supabase/tests/executable/run.sh` — **exit 0**,
`ALL EXECUTABLE MIGRATION TESTS PASSED`. Two new pinned proofs:

- `non-import-guest-identity-before.sql` → `ID_READER_CLIENT_BEFORE_REPRODUCED`,
  run against **production history only**, above the gated line.
- `non-import-guest-identity-after.sql` → `ID_READER_CLIENT_AFTER_PROVEN`, run
  after the new migration is applied twice for repeat-safety.

| Required proof | Result |
|---|---|
| BEFORE — reader broken on post-revoke state | `authenticated` and `anon` hold no EXECUTE; the reader's 8-key payload raises **42883** (PostgREST `PGRST202`); a `service_role` call raises **42501**; and calling as the owner — bypassing the ACL entirely — *still* raises **42501**, isolating the `auth.uid()` gate as an independent failure |
| AFTER — success for a group member | `newly_created_unlinked_guest`, neutral `Guest XXXXXXXX` label |
| AUTHORIZATION HELD — non-member rejected | non-member requesting id → **42501**, and the rejected call wrote nothing; a null requesting id is rejected too |
| NO IMPORT ALIAS | zero `public.player_import_aliases` rows for the created guest, on both the create and the reuse branch |
| `created_by` attribution | equals the passed requesting-user id, non-null |
| Grant model | `service_role` yes; `authenticated`/`anon` no (which also proves PUBLIC holds none) |
| Additive | the deployed 7-argument function still exists and is still un-granted to `authenticated` |
| Tombstone inert | applying `20260720100000` twice creates no 8-argument overload, drops nothing, and restores no grant |

**The two decisive assertions were mutation-tested, so they are not vacuous:**

- injecting an alias insert into the creation branch →
  `ID-READER AFTER FAIL: 1 import alias row(s) written on the non-import path`;
- removing the `group_members` enforcement →
  `ID-READER AUTHZ FAIL: a non-member created a guest identity`.

Both mutations were reverted and the migration restored byte-identical.

No private name, alias, personal name, or identifying value appears in any test,
log, or output. Sentinel values only.

---

## 3. Validation

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run --no-file-parallelism` | exit 0 — 178 files, 982 tests, 0 failures |
| `npm run lint` | exit 0 — 4 pre-existing warnings, none new |
| `npm run build` | see task report |
| `bash supabase/tests/executable/run.sh` | exit 0 |
| `npm run validate:claude-context -- --require-maintenance` | see task report |
| `git diff --check` | clean |

---

## 4. Discrepancies recorded

1. **`service_role` EXECUTE on the deployed resolver.** `20260718212339`
   (the source of the deployed 7-argument function, applied as ledger
   `20260719191911`) grants EXECUTE to `authenticated` **only** — it never grants
   `service_role` (`:290-298`) [REPO]. A clean replay of repo history therefore
   leaves `service_role` with no EXECUTE here. The header of `20260722153000`
   records the observed **production** pre-state ACL as
   `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}`
   [PRIOR]. The two disagree, and the divergence is not resolvable from here
   because no production read is authorized.

   It changes no conclusion: the reader fails with `42501` under either reading
   — at the privilege check without the grant, or from the `auth.uid()` gate in
   the body with it. The BEFORE proof therefore asserts the **outcome** and
   isolates the body-level gate by calling as the owner, rather than asserting an
   ACL it cannot confirm. The new function does not inherit this ambiguity: it
   grants `service_role` explicitly.

2. **`20260720100000`'s recorded hazard class was wrong.** `migration-ledger-map.ts`
   described it as an expansion "whose new parameter defaults to the previous
   behavior, so every previously valid call still resolves" [REPO]. That
   understated two hazards: it re-granted `authenticated` (reopening the closed
   oracle) and it dropped the deployed 7-argument signature. The
   `ID-READER-CLIENT` investigation STOP handoff is the stronger record. Now moot
   — the file is a `neutral` tombstone.

3. **The design handoff is not on the base branch.**
   `PHASE-04-STEP-03-GUEST-IDENTITY-OVERLOAD-DESIGN-SCOPING.md` exists only on
   `design/guest-identity-overload-scoping` (`8478badb1`) and is not merged into
   `redesign/tm-stats-dashboard-rebuild` [GIT]. It was read via
   `git show`. Merging that design branch was not authorized here.

   **Resolved 2026-07-23.** No longer true: `design/guest-identity-overload-scoping`
   was merged into `redesign/tm-stats-dashboard-rebuild` as `8e331cffb`, so the
   design handoff is on the base branch and readable in the working tree [GIT].
   It has since been superseded in part and carries its own dated authority
   notice.

---

## 5. What is NOT done, and still needs its own authorization

- **Applying `20260722160000` to production.** Gated and unapplied.
- **Deploying the moved reader**, then **verifying it in production**.
- **CONTRACT: dropping the deployed 7-argument
  `public.resolve_import_guest_identity`.** Only after the above verifies, and
  only after a fresh zero-caller re-sweep. Not authored here.
- Contraction `20260722012707`, the tile-attribution backfill, guest
  re-neutralization, the Step 4.3 closure audit, the owner smoke tests, and
  Step 4.4 — all untouched and unchanged in disposition.
- Nothing was pushed or merged.

`ID-READER-CLIENT` is **resolved locally only**. `ID-READER-DEPLOY` remains open.

---

## 6. Canonical documents reviewed

- `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` — reviewed; the
  implementation complies (neutral public label, private-only personal name, no
  fabricated import provenance, server-side authorized operation). No change
  required.
- `docs/redesign/DECISIONS.md` — reviewed, **intentionally unchanged**. Recording
  the owner's decision is the owner's act, not this task's. **Resolved
  2026-07-22:** the owner has since recorded it; see section 9.
- `docs/CURRENT_STATUS.md`, `docs/REDESIGN_STATE.md` — updated with this outcome.
- `docs/redesign/MASTER-RULES.md`, `docs/redesign/phases/04-log-a-game.md` —
  reviewed; no change required.
- `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` — **needed a follow-up
  update** (see the task report): it still described `20260720100000` as an
  applicable expansion and did not list `20260722160000`. It is the
  human-readable companion to `migration-ledger-map.ts`; the executable drift
  gate reads only the `.ts`, which is current. Editing it was outside this
  task's permitted file set. **Resolved by the integration task below.**

---

## 7. Follow-up corrections applied at integration (2026-07-23)

This branch was merged into `redesign/tm-stats-dashboard-rebuild` as `4b9523b8`
(after `design/guest-identity-overload-scoping` as `8e331cff`). The integration
task carried a permitted file set that this task did not, and used it to correct
the three records this work left stale. Documentation and comment text only — no
logic, migration, schema, deploy, or production change, and no blocker changed
disposition.

- `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` — reconciled to
  `src/lib/db/migration-ledger-map.ts` at the merged HEAD, citing the executable
  file as the evidence. `20260720100000` is now recorded as a RETIRED no-op
  tombstone with hazard class `neutral` (still listed in `GATED_UNAPPLIED` for
  audit), `20260722160000` is registered gated/unapplied with hazard class
  `expansion`, the gated table is six entries, and the hazard totals read
  16 contraction / 30 expansion / 9 neutral over 55 files. No ledger count,
  ledger head, or production attestation was changed or invented.
- `src/lib/db/player-repo.ts` — the read-only-repository comment claimed **every**
  guest-creation path goes through `resolve_import_guest_identity`. Corrected to
  name the two RPCs that actually serve them: imports through
  `resolve_staged_import_player_identity`, the two NON-import paths through the
  `service_role`-only `create_or_reuse_guest_identity`.
- `src/lib/player-identity/guest-identity.ts` — the `importedPlayerResolutionSchema`
  comment placed server-side matching "entirely inside the
  `resolve_import_guest_identity` RPC". Corrected the same way. Note this comment
  was **already** stale before this branch: the source-bound replacement
  (repository `20260722012658`, applied as ledger `20260722132159`) had already
  moved import-side matching to `resolve_staged_import_player_identity`. This
  branch made it stale in the second direction as well.

Still outstanding after those corrections:
`src/lib/player-identity/guest-identity.test.ts:14` carries the same superseded
`resolve_import_guest_identity` claim and was outside the integration task's
permitted file set.

---

## 8. Third and final stale comment corrected (2026-07-23)

`src/lib/player-identity/guest-identity.test.ts` — the F-01 privacy-boundary
header comment placed existing-guest reuse, ambiguity, and duplicate detection
"server-side in `resolve_import_guest_identity`". Corrected the same way as the
two records in section 7: imports resolve through
`resolve_staged_import_player_identity`, the two NON-import paths through the
`service_role`-only `create_or_reuse_guest_identity`, and
`resolve_import_guest_identity` no longer serves either path.

Comment text only — every changed line is a `//` comment. No statement,
expression, import, assertion, or test name changed, so the file's executable
behaviour is byte-for-byte equivalent. No logic, migration, schema, deploy, or
production change, and no blocker changed disposition.

This closes the stale-record set opened in section 7. All three instances of the
superseded `resolve_import_guest_identity` routing claim are now corrected. The
remaining `resolve_import_guest_identity` references in `src/` are current and
intentional: the historical entries in `src/lib/db/migration-ledger-map.ts`, the
two "no longer serves either path" corrections themselves, and the assertions in
`src/lib/db/import-player-identity-repo.test.ts` that prove the RPC is *not*
called.

---

## 9. The owner decision behind this work is now recorded (2026-07-22)

Section 6 left `docs/redesign/DECISIONS.md` **intentionally unchanged**, on the
grounds that recording the owner's decision was the owner's act and not this
task's. That follow-up is now **resolved**.

The decision is recorded in `docs/redesign/DECISIONS.md` as "Phase 4 Step 4.3 -
Non-import guest identity creation: accepted requesting-user trust model and
retirement of 20260720100000", placed immediately after the 2026-07-22 matcher
amendment it references. It covers both decisions this handoff implements:
accepting the explicit `p_requesting_user_id` trust model for the non-import
guest path, and superseding gated `20260720100000` rather than correcting it in
place. Until then, the implemented authorization model had no canonical
authorization behind it, while the matcher's equivalent downgrade already did.

Documentation only — no code, migration, schema, deploy, or production change,
and no blocker changed disposition. `ID-READER-CLIENT` remains resolved locally
only and `ID-READER-DEPLOY` remains open. The recorded entry's own "Scope
authorized by this decision" section, not this handoff, governs what it does and
does not authorize.
