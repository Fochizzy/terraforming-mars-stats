# Phase 4, Step 4.3 — Import matcher service-role re-gate: read-only design scoping

Date: 2026-07-23
Branch: `investigate/matcher-overload-scoping`
Base: `redesign/tm-stats-dashboard-rebuild` @ `6a232efa3` (re-derived; unchanged
at start and at commit)
Live-site lineage read: `fix/live-compare-data-remove-declared-style` @
`0d866559f` (re-derived; unchanged during the session)
Worktree: `C:\tmp\tm-overload-scoping`

**Outcome: a priced design proposal. Nothing was implemented. No file under
`supabase/migrations/**`, `src/**`, or `scripts/**` was created or changed on any
lineage. No production system was read or written.**

This handoff scopes the 2026-07-22 owner amendment "interim service-role re-gate
of the import matcher". It **decides nothing**. Every proposed artefact below is
**PROPOSED — NOT APPROVED, NOT AUTHORIZED, MUST NOT BE APPLIED** until the owner
records a decision.

**Authorization actually held:** read-only git/filesystem inspection across both
lineages; disposable PostgreSQL clusters; one handoff; one state pointer; one
local commit. **NOT held:** any Supabase MCP call, `execute_sql` (including
read-only `SELECT`), `list_migrations`, `apply_migration`, wrangler,
`/api/deploy-info`, production logs, direct database connections, browser access
to the live site, any deploy/migration/backfill/grant/revoke, any push or merge.
None of those occurred.

Evidence classes are tagged inline: `[GIT] [REPO] [PROJECT-DOC] [PRIOR]
[INFERENCE] [UNVERIFIED]`. **No `[LIVE]` or `[PROVIDER]` claim appears** — no
production read was authorized or performed. Every statement about the currently
deployed function body, ACL, or Worker configuration is `[PRIOR]` (recorded by a
previously authorized session) or `[UNVERIFIED]`, never observed here.

---

## Headline

1. **The amendment's "overload" wording SURVIVES.** The ambiguity lesson from the
   guest-identity work does **not** transfer, because the hazard there was caused
   by the *base* signature ending in defaulted parameters. The matcher's base
   signature `(p_group_id uuid, p_imported_names text[])` has **no defaults on
   any parameter** [REPO], so an appended third parameter is not forced to carry
   a default, and 2-argument calls stay unambiguous. Proven by execution on a
   disposable PostgreSQL 18 cluster (§3). **One binding constraint:** the third
   parameter must be declared **without a default**. Adding `default null` to it
   — the natural instinct, to "keep old calls working" — reproduces the
   guest-identity `42725` exactly (§3, Case B).
2. **The server-side id-resolution mitigation transfers, and more cheaply than
   the amendment implies.** All three call sites already funnel through one
   wrapper, `matchImportPlayerNames`, which **creates its own Supabase client
   internally** and **already resolves the signed-in user id server-side** from
   `supabase.auth.getUser()` — today for the audit record only [REPO]. No caller
   supplies a client or an id, and none would need to. The amendment's "both call
   sites move to the server-side admin client" is, in the code, a change to
   **one function in one file** (§4).
3. **There are THREE call sites, not the two the amendment names** (§1). The
   third, `roster_display_name_fallback` in `player-repo.ts`, is dormant in
   production today because the column grant it depends on still exists [REPO],
   but it is live code and would become a latent `42501` after the contraction if
   it were missed.
4. **The manual-entry gap is not resolved by the amendment — it is made
   permanent-by-default** (§5). Two of the three call sites are **non-import**
   paths with no parsed-log source evidence, so the applied source-bound
   gateways structurally cannot serve them, for the same three reasons the
   guest-identity scoping recorded for its own non-import path.
5. **The single biggest risk found is a silent-failure mode, not a security
   one** (§9, FINDING-A). If the third parameter's null case is not explicitly
   rejected in SQL, a failed session resolution yields **zero rows and no
   error** — proven on the cluster — and the app would show every imported player
   as unmatched with nothing in the error path. The existing helper the
   implementer would naturally reuse, `resolveAuditUserId`, **deliberately
   returns `null` on failure** [REPO]. The two defects compose into exactly this.
6. **The alternative is materially cheaper than it looks** (§8). The redesign
   lineage contains **zero** matcher call sites — the entire subsystem
   (`import-player-resolution-repo.ts`, `src/lib/observability/`) does not exist
   there [GIT, verified with a positive control]. Deploying the redesign lineage
   satisfies the contraction's real precondition outright, with **no overload
   built at all**.

**This resolves no decision.** Whether to build the overload, deploy the
redesign, or leave the amendment dormant is the owner's.

---

## Document basis

Read 2026-07-23 in this session:

- `docs/redesign/DECISIONS.md` — "Phase 4 Step 4.3 — AMENDMENT: interim
  service-role re-gate of the import matcher" (lines 1305–1351) in full; the
  parent decision (1247–1302); and "Non-import guest identity creation"
  Decisions 1 and 2 (1354–1440), which carry the ambiguity precedent [PROJECT-DOC].
- `docs/agent-handoffs/PHASE-04-STEP-03-GUEST-IDENTITY-OVERLOAD-DESIGN-SCOPING.md`
  — superseding notice and §1/headline [PROJECT-DOC].
- `docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-CANDIDATE-PREDICATE-REMEDIATION.md`
  — §1 and §2.1 (the HIGH finding) [PROJECT-DOC].
- `supabase/migrations/20260720120000_coarsen_import_name_match_reasons.sql` in
  full [REPO].
- `supabase/migrations/20260722012707_retire_free_form_import_name_matcher.sql`
  in full [REPO].
- `supabase/migrations/20260722012658_add_source_bound_import_identity_staging.sql`
  — gateway signatures and grant block [REPO].
- `supabase/migrations/20260719223000_isolate_player_personal_names_from_data_api.sql`
  — the `public.players` revoke/re-grant block [REPO].
- `supabase/migrations/20260703121500_create_core_rls.sql` — `is_group_member`
  [REPO].
- `src/lib/db/migration-ledger-map.ts` lines 85–199 [REPO].
- On the live lineage, via `git show`: `src/lib/db/import-player-resolution-repo.ts`,
  `src/lib/db/log-game-player-resolution.ts`, `src/lib/db/player-repo.ts`,
  `src/lib/observability/import-matcher-audit.ts`, `src/lib/supabase/admin.ts`,
  `src/lib/supabase/server.ts`, `src/lib/db/group-context-repo.ts`,
  `src/app/(app)/log-game/import/page.tsx`, `src/app/auth/username-login/route.ts`,
  `docs/deployment.md`, and `DEPLOY-STATE.md` (matcher sections) [REPO].

---

## 1. The call sites

Every execution of `public.match_import_player_names` in deployed application
code goes through **exactly one** `supabase.rpc()` call —
`src/lib/db/import-player-resolution-repo.ts:223` [REPO]. A whole-tree sweep of
the live lineage for the RPC name and the camel-case wrapper spelling finds no
other invocation [GIT]. The wrapper is a **single choke point**.

The wrapper builds its **own** client and resolves its **own** user id; neither
is a parameter [REPO, `import-player-resolution-repo.ts:177-184`]:

```ts
export async function matchImportPlayerNames(
  groupId: string,
  importedNames: string[],
  source: ImportMatcherSource = 'unspecified',
): Promise<ImportNameMatch[]> {
  const distinctNames = collectDistinctCandidateNames(importedNames);
  const supabase = await createSupabaseServerClient();
  const userId = await resolveAuditUserId(supabase);
```

`createSupabaseServerClient()` is the cookie-bound **user-session** client
[REPO, `src/lib/supabase/server.ts`], so today every call executes as the
PostgREST role **`authenticated`**.

The three application call sites are enumerated authoritatively by the audit
type, which exists precisely so each site names itself [REPO,
`src/lib/observability/import-matcher-audit.ts:24-28`]:

```ts
/** Which caller asked. Every call site names itself so probes are locatable. */
export type ImportMatcherSource =
  | 'import_analyze'
  | 'log_game_player_resolution'
  | 'roster_display_name_fallback'
  | 'unspecified';
```

| # | File / line | Source tag | Client → role | Server-verified user id already in scope? |
|---|---|---|---|---|
| 1 | `src/app/(app)/log-game/import/page.tsx:725` | `import_analyze` | session → `authenticated` | Yes, inside the wrapper |
| 2 | `src/lib/db/log-game-player-resolution.ts:139` | `log_game_player_resolution` | session → `authenticated` | Yes, inside the wrapper |
| 3 | `src/lib/db/player-repo.ts` (`findRosterPlayerByDisplayName`) | `roster_display_name_fallback` | session → `authenticated` | Yes, inside the wrapper |

**Site 1 — import analyze.** Inside `handleAnalyzeImportEvidence`, a
`'use server'` server action (directive at line 610; the call is at 725, before
the next action at 787) [REPO]:

```ts
const matches = applyServerPlayerMatches(
  resolved.matches,
  await matchImportPlayerNames(
    analyzeContext.groupId,
    screenshotEvidence.importedNames,
    'import_analyze',
  ),
);
```

**Site 2 — manual Log-a-Game resolution.** Reached from
`src/app/(app)/log-game/review/page.tsx:253` and `:275` [REPO]:

```ts
const serverMatches = await matchImportPlayerNamesImpl(
  form.groupId,
  [displayName],
  'log_game_player_resolution',
);
```

**Site 3 — roster display-name fallback.** Inside `createPlayerIfMissing`'s
helper, fired **only** when the direct probe on
`players.normalized_display_name` returns `42501` [REPO]:

```ts
if (!isInsufficientPrivilegeError(error)) {
  throw error;
}

const matches = await matchImportPlayerNames(
  groupId,
  [displayName],
  'roster_display_name_fallback',
);
```

**Site 3 is dormant today.** `20260719223000` revokes table-wide `SELECT` on
`public.players` from `authenticated` and then re-grants it column-wise
*including* `normalized_display_name`, with a postcondition that fails the
migration if that column is not readable [REPO, lines 102–112 and 145–156]. So
the direct probe succeeds and the fallback does not fire. It is nonetheless
live code on three upstream paths (`group/players/page.tsx:37`,
`log-game/import/page.tsx:1174`, `log-game-player-resolution.ts:153`) [REPO] and
must be treated as a real call site.

**How identity is established elsewhere in that tree.** The tree's established
pattern is `supabase.auth.getUser()` on the session client — token-validated
server-side [REPO, `group-context-repo.ts:65-78`]:

```ts
export async function getCurrentGroupContext(): Promise<CurrentGroupContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
```

The wrapper already uses the same call, via `resolveAuditUserId` — see §4 and
§9/FINDING-A for the consequence.

---

## 2. The admin client

**Yes.** The live-site lineage has a service-role client at
`src/lib/supabase/admin.ts`, and it is functionally identical to the redesign
lineage's [REPO]:

```ts
export function createSupabaseAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }

  return createClient(NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

Nothing needs introducing. Existing consumers on the live lineage [REPO]:

- `src/app/auth/username-login/route.ts:41` — username sign-in (`lookupClient`).
- `src/app/auth/request-pin-reset/route.ts:44` — PIN reset.
- `src/lib/db/import-group-repo.ts:264` and `:468` — import group
  resolution/creation, on the import path itself.

### Is the service-role key configured for that deployment?

**Not determinable from the repository alone. [UNVERIFIED]**

What the repository does establish [REPO]:

- `docs/deployment.md` lists `SUPABASE_SERVICE_ROLE_KEY` under "Runtime env in
  Cloudflare" and states: "The authenticated web import flow now requires
  `SUPABASE_SERVICE_ROLE_KEY` in the deployed Worker so the server can inspect
  existing cross-group rosters while resolving or creating the target group."
- `.env.example:15` declares it; `src/lib/env.ts:23` types it as
  `z.string().min(1).optional()`.

**[INFERENCE]** — labelled as such: two already-deployed paths call
`createSupabaseAdminClient()` unconditionally (username sign-in, import group
resolution). If the secret were unset, both would throw
`SUPABASE_SERVICE_ROLE_KEY is not configured.` on every request. Username
sign-in is the primary authentication route. That the live site functions is
therefore strong circumstantial evidence the secret is bound — but it is an
inference from application structure, **not** an observation of the Worker's
configuration, and it must not be recorded as one.

**Exact reads that would settle it, either sufficient:**

1. `wrangler secret list --name <worker-name>` against the live Worker, checking
   for `SUPABASE_SERVICE_ROLE_KEY`.
2. Cloudflare dashboard → the live Worker → Settings → Variables and Secrets.

The amendment's own risk statement applies here: a service-role client that
throws because the key is unset is a **deployment** failure, and it must be
settled *before* the deploy step of §6, not discovered during it.

---

## 3. Overload or distinct name — SETTLED BY EXECUTION

### 3.1 Does the guest-identity hazard apply here?

**No.** The hazard is a property of the *base* signature, and the two base
signatures differ in exactly the way that matters.

The matcher's parameters, from the only definition in the repository [REPO,
`20260720120000_coarsen_import_name_match_reasons.sql:31-34`]:

```sql
create or replace function public.match_import_player_names(
  p_group_id uuid,
  p_imported_names text[]
)
```

**Neither parameter carries a default.** By contrast, the guest-identity
function's signature ended in three defaulted parameters, which is what forced
the appended parameter to default and produced `42725` [PROJECT-DOC,
`DECISIONS.md:1407-1410`].

`DEPLOY-STATE.md` on the live lineage records, from a previously authorized
production catalog read, that production carries **one overload only**,
`public.match_import_player_names(uuid,text[])`, `prosecdef` true, `proacl`
`{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}`
[PRIOR]. That matches the repository signature.

### 3.2 Proof on a disposable cluster

PostgreSQL 18.4, disposable cluster on port 55987, created by `initdb` into the
session scratchpad and destroyed afterwards. Nothing outside that cluster was
touched.

**Case A — the amendment's shape: base with no defaults, third parameter with no
default.**

```
-- A1 positional 2-arg call:      two
-- A2 NAMED 2-arg call (PostgREST style):   two
-- A3 NAMED 3-arg call:           three
-- A4 overload inventory:
 t.matcher2(uuid,text[])      | p_group_id uuid, p_imported_names text[]
 t.matcher2(uuid,text[],uuid) | p_group_id uuid, p_imported_names text[], p_requesting_user_id uuid
```

Both positional and named 2-argument calls resolve **unambiguously** to the
2-argument function; the 3-argument named call resolves to the new one. **No
ambiguity.**

**Case B — the same thing with `default null` on the third parameter.**

```
-- B1 positional 2-arg call:
ERROR:  function t.matcherb(uuid, text[]) is not unique
HINT:  Could not choose a best candidate function...
-- B2 NAMED 2-arg call:
ERROR:  function t.matcherb(p_group_id => uuid, p_imported_names => text[]) is not unique
```

**Case C — guest-identity control: base signature ending in defaults.**

```
-- C1 appending a NON-defaulted parameter:
ERROR:  input parameters after one with a default value must also have defaults
-- C2 forced to default, then the old-style call:
ERROR:  function t.guest7(uuid, unknown, unknown) is not unique
```

Case C reproduces the recorded guest-identity finding exactly (`42P13` forcing
the default, then `42725`), which confirms the experiment is measuring the right
thing, and Case A shows the matcher does not reach that state.

### 3.3 Verdict

**The amendment's "overload" wording survives.** A three-argument overload is a
correct and safe shape here, and a distinct name is **not required**.

**Binding constraint, and it is the whole finding:** the third parameter must be
declared **without a default**. `p_requesting_user_id uuid` — never
`p_requesting_user_id uuid default null`. Case B shows the defaulted form breaks
every existing 2-argument call with `42725` at the moment the expand migration
is applied, i.e. while the currently-deployed Worker is still calling the
2-argument form. That would be a live outage introduced by the expand step,
which is exactly what the mandatory ordering exists to prevent.

**A separate, unsettled resolution question. [INFERENCE] / [UNVERIFIED]** —
PostgreSQL's resolution is proven above, but PostgREST performs its **own**
overload resolution before the SQL is ever built, matching the JSON body's keys
against parameter-name sets. The two sets here differ by one name, which is the
documented supported case, so it should route correctly — but this session could
not execute PostgREST. It is settled by either a local Supabase stack with both
overloads present, or by the §6 verification step exercising a real
three-argument call. If it mis-resolves, the symptom is `PGRST203`.

**A note on parameter position.** The four already-applied source-bound gateways
place `p_requesting_user_id` **second**, not last [REPO,
`20260722012658:197-201, 242-246, 292-296`], and the shipped guest-identity
function was corrected to match [PROJECT-DOC]. `(uuid, uuid, text[])` is
likewise unambiguous against `(uuid, text[])`. Position is therefore a
consistency choice for the owner, not a correctness one; §7 proposes the
second-position form for consistency with the applied gateways.

---

## 4. The mitigation pattern — IT TRANSFERS

The redesign lineage's mitigation, which `DECISIONS.md:1396-1405` records as part
of the accepted decision and explicitly forbids normalising back to threading
[PROJECT-DOC], is implemented as [REPO,
`src/lib/db/import-player-identity-repo.ts`]:

```ts
const sessionClient = await createSupabaseServerClient();
const { data: { user }, error: userError } = await sessionClient.auth.getUser();

if (userError) throw userError;
if (!user) throw new Error('The guest identity could not be created.');

const supabase = createSupabaseAdminClient();
const { data, error } = await supabase.rpc('create_or_reuse_guest_identity', {
  ...
  p_requesting_user_id: user.id,
```

**The same pattern applies to the matcher, and the groundwork is already
there.** `matchImportPlayerNames` builds its own session client and already
resolves the user id from it, at lines 183–184 — thirty-nine lines above the RPC
call it would feed [REPO]. The id is currently used only for the audit record.
No caller passes a client, an id, or anything else identity-bearing; the three
call sites pass `(groupId, names[], sourceTag)` only. **No threading is required
and none should be introduced.**

The change is therefore confined to one function:

- keep `createSupabaseServerClient()` for identity resolution;
- add `createSupabaseAdminClient()` for the RPC call;
- pass the server-resolved id as `p_requesting_user_id`;
- **do not** add a user-id parameter to `matchImportPlayerNames`.

### The one non-obvious change, and it is load-bearing

`resolveAuditUserId` **swallows failures by design** [REPO,
`import-player-resolution-repo.ts:138-162`]:

```ts
/**
 * The signed-in user id, for the audit record only.
 *
 * Resolution failure must never change whether a legitimate import matches, so
 * a lapsed or unreadable session degrades to a null id and the invocation is
 * still recorded. The RPC itself remains gated by RLS on the caller's session.
 */
```

That comment is correct **today** and becomes wrong the moment the id becomes
the authorization gate — the final sentence in particular, because after the
move there is no session on the RPC to be gated by. Reusing `resolveAuditUserId`
unchanged for the new purpose is the natural implementation and is a defect. The
id must be resolved with a **hard failure** on `null`, in the pattern quoted
above; `resolveAuditUserId` should be left as-is for the audit line only, or
retired in favour of one strict resolver used for both. See §9/FINDING-A for
what happens if this is missed.

---

## 5. The manual-entry gap

The amendment states its benefit as unblocking the contraction "without first
designing a replacement for the manual-entry path" [PROJECT-DOC,
`DECISIONS.md:1324-1327`].

**What it refers to:** call site 2, `resolveLogGamePlayerReferences`
(`log-game-player-resolution.ts:139`) — the Log-a-Game flow where a person
**types a player name** into the manual form and the server must decide whether
that text refers to an existing roster player or a new one. Call site 3 belongs
to the same family.

**What is unresolved about it:** the parent decision's durable replacement is
source-bound matching — "The replacement accepts parser-derived evidence plus
structured identity fields, never an arbitrary array of candidate names"
[PROJECT-DOC, `DECISIONS.md:1277-1283`]. The four applied gateways implement
exactly that, and **structurally cannot serve a typed name**, for the same three
reasons the guest-identity scoping recorded for its own non-import path
[PROJECT-DOC, §1] and which are visible in the migration [REPO]:

1. `resolve_staged_import_player_identity` requires a `p_staging_id` pointing at
   a `private.import_identity_staging` row whose `source_player_texts` came from
   a parsed import, and enforces exact source-text binding. A typed name has no
   parsed source; using the gateway would mean **fabricating a staging row whose
   source text is the typed name**, purely to pass the binding check.
2. `private.import_identity_staging` is FK-bound to `public.games` and
   `public.game_log_imports`, and constrained to 1–5 `source_player_texts`. The
   roster "add player" path has no game at all.
3. Creation through the gateway writes a `public.player_import_aliases` row with
   `source_type 'game_log'` unconditionally, asserting the name appeared in an
   imported log. For a manually typed name that assertion is false — and
   fabricating import provenance is precisely what the source-bound design
   exists to prevent.

**Does the overload resolve it? No — and it changes its character.** The overload
keeps the free-form matcher alive for `service_role` and points the manual paths
at it. The manual-entry path therefore continues to use arbitrary-candidate-array
matching **indefinitely**, with no replacement designed and no forcing function
to design one. The amendment anticipates this ("must not become permanent by
default … ships with a recorded commitment … and a dated review") [PROJECT-DOC],
but that commitment is prose, not a gate.

**What the owner needs to know before committing to build:** the amendment's own
scope leaves the manual-entry design open, and building the overload is the
action that makes leaving it open comfortable. Two of the three call sites — the
majority — are on the unresolved side. The contraction it unblocks retires
`authenticated` access to the matcher; it does not retire free-form matching,
which continues under `service_role` on the paths that have no designed
replacement.

---

## 6. The sequence

The live-site lineage deploys normally (Cloudflare Worker, `tm-stats.com`)
[PROJECT-DOC, `docs/deployment.md`]. A structural note first:

**The migrations live on the redesign lineage; the callers live on the live-site
lineage.** The live lineage's `supabase/migrations/` contains no definition of
the matcher, no coarsening, and no contraction [GIT]. The original creating
migration has **no repository file on any lineage** — it was applied from a
live-site session and is registered as production-only, ledger `20260720021300`
[REPO, `migration-ledger-map.ts:104-107`]. So the expand migration would be
authored on the redesign lineage alongside the other Step 4.3 migrations, while
the application change ships from the live-site lineage. Each step below names
its lineage.

### Step 0 — settle the service-role key (precondition to everything)

- **What:** confirm `SUPABASE_SERVICE_ROLE_KEY` is bound on the live Worker (§2).
- **Must be true first:** nothing.
- **If skipped:** the deploy in step 2 ships code that throws
  `SUPABASE_SERVICE_ROLE_KEY is not configured.` on every import and every manual
  player resolution. This is the amendment's own named failure and must not be
  discovered during a production deploy.
- **Evidence:** `wrangler secret list`, or the Worker's Variables and Secrets pane.

### Step 1 — EXPAND (redesign lineage; separate authorization)

- **What:** one new migration adding the three-argument overload, granted to
  `service_role` only. The two-argument function is **not** modified and its
  `authenticated` grant is **not** touched.
- **Must be true first:** step 0; the third parameter carries no default (§3);
  the gate and the candidate pool both derive from the new parameter, and
  `is_group_member()` is **not** called (§9/FINDING-B).
- **If reversed** (contraction before expand, or expand with the parameter
  defaulted): the deployed Worker still calls the two-argument form, so
  contracting first breaks every import and both manual paths with `42501`; a
  defaulted third parameter breaks them with `42725` at expand time (§3, Case B).
- **Evidence:** post-apply catalog read showing **two** overloads;
  `proacl` on the new one containing `service_role` and **not** `authenticated`;
  `proacl` on the two-argument one **byte-identical** to its pre-apply value
  (the pattern `IMPORT-IDENTITY-EXPANSION-APPLY` already used [PROJECT-DOC]).

### Step 2 — DEPLOY (live-site lineage; separate authorization)

- **What:** the one-file change to `matchImportPlayerNames` (§4, §7) plus tests.
- **Must be true first:** step 1 applied and verified. The two-argument function
  must remain granted and working throughout, because the *previous* Worker
  version serves traffic until the new one is live and is the rollback target.
- **If reversed** (deploy before expand): the new Worker calls a three-argument
  function that does not exist — `PGRST202` / `42883` on every import.
- **Evidence:** the live commit pinned by a served-chunk content probe
  (`/api/deploy-info` is 401 anonymous [PROJECT-DOC]).

### Step 3 — VERIFY IN PRODUCTION (separate authorization)

- **What:** exercise all three paths against production and confirm the RPC
  resolves and matches.
- **Must be true first:** step 2 deployed.
- **Evidence, and this is the step most likely to be under-specified:**
  - a real import analyze that **returns matches** — not merely "no error",
    because the null-id failure mode is a silent empty result (§9/FINDING-A);
  - a manual Log-a-Game resolution that recognises an existing player by a typed
    name rather than creating a duplicate;
  - the audit line `import.player_name_match` in Worker logs showing
    `outcome: "matched"` with a **non-zero** `matchCount` and a **non-null**
    `userId`;
  - a negative control: a caller who is not a member of the target group
    receives `42501`.
- **If skipped:** the contraction removes the rollback path while the replacement
  is unproven.

### Step 4 — CONTRACT: `20260722012707` (separate authorization)

- **What:** revoke `EXECUTE` on `public.match_import_player_names(uuid, text[])`
  from `public`, `anon`, `authenticated` [REPO].
- **Its real precondition — stated precisely:** *no deployed code executes the
  two-argument matcher as `authenticated`.* Not "the overload exists"; not "the
  migration applied". Only step 3's evidence establishes it.
- **Note on what it does and does not remove.** Production `proacl` is
  `{postgres,authenticated,service_role}` [PRIOR], and the contraction revokes
  from `public`/`anon`/`authenticated` only — so **`service_role`'s grant
  survives** and the two-argument function remains callable by the admin client.
  That is intentional under this design (the file's own comment calls it a
  "Legacy service-only compatibility matcher"), but it means the contraction is
  an ACL change, not a removal. Dropping the two-argument function is separate,
  unauthorized, and not part of this sequence.
- **If reversed** (contraction before step 3): every import and both manual paths
  fail with `42501` and the only remedy is re-granting `authenticated`, which
  re-opens what the contraction closed.
- **Rollback is one statement:**
  `grant execute on function public.match_import_player_names(uuid, text[]) to authenticated;`

**A necessary correction to the mental model.** Moving the call sites to the
admin client is **not** sufficient on its own — the overload is genuinely
required. The two-argument function's gate is `public.is_group_member(p_group_id)`,
which is `auth.uid()`-based [REPO, `20260703121500_create_core_rls.sql:9-21`],
and its candidate pool is `where gm.user_id = (select auth.uid())` [REPO,
`20260720120000:108-112`]. Under `service_role`, `auth.uid()` is `NULL`, so the
gate raises `42501` and the pool would be empty — the same double failure
`DECISIONS.md:1360-1366` records for `resolve_import_guest_identity`
[PROJECT-DOC]. The amendment is coherent on this point.

---

## 7. The proposed shape

### 7.1 Migration SQL

```
PROPOSED — NOT APPROVED, NOT AUTHORIZED, MUST NOT BE APPLIED
```

```sql
-- GATED / UNAPPLIED expansion migration. PROPOSED ONLY.
-- Adds a service_role-only overload of the import name matcher that derives
-- BOTH the authorization gate and the candidate pool from an explicit
-- requesting-user id instead of auth.uid(), so the matcher can be called by the
-- server-side admin client. The two-argument function is deliberately NOT
-- modified and its grants are NOT touched: the deployed Worker still calls it
-- and it is the rollback target until the moved reader is verified.
--
-- p_requesting_user_id carries NO DEFAULT. A default would make every existing
-- two-argument call ambiguous (42725) the moment this is applied — proven on a
-- disposable cluster. Position two matches the four applied source-bound
-- gateways of 20260722012658.

create or replace function public.match_import_player_names(
  p_group_id uuid,
  p_requesting_user_id uuid,
  p_imported_names text[]
)
returns table(
  imported_name text,
  player_id uuid,
  public_name text,
  is_linked boolean,
  match_reason text,   -- coarse only: 'exact' | 'partial'
  match_score integer  -- coarse only: 2 = exact, 1 = partial
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_max_names        constant integer := 64;
  v_max_name_length  constant integer := 128;
  v_submitted        integer;
  v_longest          integer;
begin
  -- A null id must NEVER degrade to an empty candidate pool: that returns zero
  -- rows with no error, which the application cannot distinguish from "nobody
  -- matched". Reject it explicitly, before anything else.
  if p_requesting_user_id is null then
    raise exception 'A requesting user is required.'
      using errcode = '22023';
  end if;

  -- The authorization gate. public.is_group_member() is deliberately NOT used:
  -- it reads auth.uid(), which is NULL under service_role, so it would reject
  -- every call. The gate and the candidate pool below must derive from the SAME
  -- identity source or they drift apart.
  if not exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_requesting_user_id
  ) then
    raise exception 'The selected group is not available for import.'
      using errcode = '42501';
  end if;

  select
    coalesce(pg_catalog.array_length(p_imported_names, 1), 0),
    coalesce(pg_catalog.max(pg_catalog.length(n.name)), 0)
  into v_submitted, v_longest
  from pg_catalog.unnest(coalesce(p_imported_names, array[]::text[])) as n(name);

  if v_submitted > v_max_names then
    raise exception 'Too many names submitted (% of at most %).',
      v_submitted, v_max_names
      using errcode = '22023';
  end if;

  if v_longest > v_max_name_length then
    raise exception 'A submitted name exceeds % characters.', v_max_name_length
      using errcode = '22023';
  end if;

  -- Body identical to the deployed two-argument function EXCEPT the candidate
  -- pool's identity source. Coarse disclosure, internal fine-grained ranking,
  -- bounds, and the cross-group pool are all preserved verbatim.
  return query
  with names as (
    select distinct
      pg_catalog.btrim(n.name) as imported_name,
      public.normalize_claim_player_name(n.name) as norm,
      pg_catalog.regexp_replace(
        pg_catalog.lower(coalesce(n.name, '')), '[^a-z0-9]+', '', 'g'
      ) as compact
    from pg_catalog.unnest(coalesce(p_imported_names, array[]::text[])) as n(name)
    where pg_catalog.btrim(coalesce(n.name, '')) <> ''
  ),
  candidates as (
    select
      p.id,
      p.linked_user_id is not null as is_linked,
      public.normalize_claim_player_name(p.display_name) as norm_display,
      public.normalize_claim_player_name(p.full_name) as norm_full,
      public.normalize_claim_player_name(up.username) as norm_username,
      pg_catalog.regexp_replace(
        pg_catalog.lower(coalesce(up.username, '')), '[^a-z0-9]+', '', 'g'
      ) as compact_username,
      (
        select pg_catalog.count(*)
        from public.game_players gp
        where gp.player_id = p.id
      ) as games_played
    from public.players p
    left join public.user_profiles up on up.user_id = p.linked_user_id
    -- CHANGED: the requesting user is explicit, not auth.uid(). Same predicate
    -- shape, same cross-group pool.
    where p.group_id in (
      select gm.group_id
      from public.group_members gm
      where gm.user_id = p_requesting_user_id
    )
  ),
  scored as (
    select
      n.imported_name,
      c.id,
      c.is_linked,
      c.games_played,
      s.internal_rank,
      case when s.internal_rank >= 250 then 'exact' else 'partial' end
        as coarse_reason,
      case when s.internal_rank >= 250 then 2 else 1 end
        as coarse_score
    from names n
    cross join candidates c
    cross join lateral (
      select v.internal_rank
      from (values
        (400, c.norm_display <> '' and c.norm_display = n.norm),
        (350, c.norm_full <> '' and c.norm_full = n.norm),
        (300, c.norm_username <> ''
              and (c.norm_username = n.norm or c.compact_username = n.compact)),
        (250, exists (
          select 1
          from public.player_import_aliases a
          where a.player_id = c.id
            and a.group_id = p_group_id
            and a.normalized_alias = n.norm
        )),
        (200, pg_catalog.length(n.norm) >= 3 and c.norm_display <> ''
              and (c.norm_display like n.norm || ' %'
                or n.norm like c.norm_display || ' %')),
        (175, pg_catalog.length(n.norm) >= 3 and c.norm_full <> ''
              and (c.norm_full like n.norm || ' %'
                or n.norm like c.norm_full || ' %')),
        (150, pg_catalog.length(n.norm) >= 3 and c.norm_username <> ''
              and (c.norm_username like n.norm || ' %'
                or n.norm like c.norm_username || ' %'))
      ) as v(internal_rank, matched)
      where v.matched
    ) as s
  )
  select distinct on (sc.imported_name)
    sc.imported_name,
    sc.id,
    private.resolve_public_player_name(sc.id),
    sc.is_linked,
    sc.coarse_reason,
    sc.coarse_score
  from scored sc
  order by sc.imported_name, sc.internal_rank desc, sc.games_played desc, sc.id;
end;
$function$;

revoke execute on function public.match_import_player_names(uuid, uuid, text[]) from public;
revoke execute on function public.match_import_player_names(uuid, uuid, text[]) from anon;
revoke execute on function public.match_import_player_names(uuid, uuid, text[]) from authenticated;
grant  execute on function public.match_import_player_names(uuid, uuid, text[]) to service_role;

comment on function public.match_import_player_names(uuid, uuid, text[]) is
  'Service-role-only import name matcher. Authorization and the candidate pool '
  'both derive from the explicit requesting-user id, because auth.uid() is NULL '
  'under service_role. Discloses only a coarse exact/partial classification. '
  'Interim re-gate per the 2026-07-22 amendment; source-bound matching remains '
  'the durable contract.';
```

**A deliberate trade-off, flagged for the owner.** The body above is duplicated
from the two-argument function rather than factored into a shared
`private.` helper that both delegate to. Factoring would avoid drift — the exact
class of defect the ID-READER HIGH finding was [PROJECT-DOC] — but it requires
`create or replace`-ing the **live** two-argument function during the expand
step, which the amendment's ordering exists to avoid ("The 2-arg function must
remain granted and working until the deploy is verified"). Duplication confines
the expand's blast radius to a brand-new object at the cost of a duplicated body
for the length of the window, after which the two-argument function is dead.
Recommendation, offered as an option and not a decision: duplicate now, fold into
a shared helper when the two-argument function is retired. If the owner prefers
factoring up front, the postcondition must assert that both functions return
identical results for the same inputs.

### 7.2 Call-site change

```
PROPOSED — NOT APPROVED, NOT AUTHORIZED, MUST NOT BE APPLIED
```

**One file, `src/lib/db/import-player-resolution-repo.ts`, on the live-site
lineage.** The three call sites are unchanged — no signature change, no
threading (§4).

```ts
// add to the existing imports
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * The requesting user, resolved HERE from the server session and never accepted
 * as an argument. The database now trusts this id for authorization and for the
 * candidate pool, so there must be exactly one place it can come from and no way
 * for a caller to supply one. `getUser()` validates the token server-side.
 *
 * Unlike `resolveAuditUserId`, this MUST fail closed: a null id is an
 * authorization failure, not a degraded audit line.
 */
async function requireRequestingUserId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error('Player matching requires a signed-in user.');

  return user.id;
}
```

and, inside `matchImportPlayerNames`, replacing only the client and the rpc call:

```ts
  const sessionClient = await createSupabaseServerClient();
  const userId = await requireRequestingUserId(sessionClient);
  // ... bounds checks unchanged, `userId` still feeds the audit line ...

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc('match_import_player_names', {
    p_group_id: groupId,
    p_imported_names: names,
    p_requesting_user_id: userId,
  });
```

Note that `userId` changes type from `string | null` to `string`, which the
compiler will surface at the `logImportMatcherInvocation` call sites; the audit
record's `userId: string | null` field can stay as-is.

---

## 8. Cost, tail risk, and the alternative

### 8.1 Building the overload

| Item | Count | Notes |
|---|---|---|
| Migration files | 1 | new, on the redesign lineage |
| Application files changed | 1 | `import-player-resolution-repo.ts` (live lineage) |
| Test files changed | 1 | `import-player-resolution-repo.test.ts` (19 existing cases; the client mock and the audit-userId cases need rework) |
| Disposable-cluster proofs | 1 harness | gate, null rejection, pool equivalence vs the 2-arg body, overload resolution |
| Migrations applied to production | 2 | expand, then contraction `20260722012707` |
| Production deploys | 1 | the live Worker |
| Production verification passes | 1 | three paths + negative control (§6 step 3) |
| Independent read-only review | 1 | the release gate requires PASS before authorization [PROJECT-DOC] |
| Documentation | 3–4 | handoff, `DEPLOY-STATE` ledger entries ×2, `REDESIGN_STATE`/`CURRENT_STATUS` |

**Working time, assuming nothing goes wrong: roughly 2–3 focused sessions.** One
to build and prove locally, one for the independent review and its remediation,
one for the apply/deploy/verify/contract sequence — which is four separately
authorized production actions and realistically does not fit in one sitting with
the owner.

**[INFERENCE]** — that estimate is derived from the shape and volume of the
directly comparable ID-READER-CLIENT work recorded in this repository (expand
built local → independent audit FAIL → candidate-predicate remediation →
integration → closeout → expand applied: **six** handoffs) [PROJECT-DOC]. It is
not a measurement.

**Tail risk — what makes it materially longer:**

1. **The independent review returns FAIL.** This is the base case on this
   lineage, not the exception: the equivalent guest-identity expand failed its
   audit on a HIGH finding and needed a full remediation cycle [PROJECT-DOC].
   Budget a remediation round rather than hoping to skip it. **Largest single
   contributor.**
2. **The service-role key turns out to be unbound** (§2, currently
   `[UNVERIFIED]`). Discovering this at deploy time converts a code release into
   a secrets change plus redeploy — and this repository's recorded history shows
   secret-then-deploy ordering has bitten before.
3. **PostgREST mis-resolves the overload** (§3.3, `[INFERENCE]`). Surfaces only
   in a real PostgREST, i.e. at step 3, after both a migration and a deploy. The
   remedy would be a distinct function name — which is a **new migration, a new
   deploy, and a re-verification**, roughly restarting steps 1–3.
4. **The verification step passes vacuously.** The null-id failure is a silent
   empty result (§9/FINDING-A), so a verification that checks only "no error" can
   green-light a matcher that matches nobody. The cost lands later, as a
   user-visible import regression with a clean log.
5. **Concurrent-session interference.** This repository has ~70 live worktrees
   and a recorded history of concurrent agents on the same lineage. A
   four-production-action sequence is exactly the window where that hurts.

### 8.2 The alternative: deploy the redesign lineage

Not priced precisely — characterised for comparison, as instructed.

**The decisive fact: the redesign lineage has zero matcher call sites.** A
whole-tree sweep for the RPC name and the camel-case wrapper finds only three
comments in `migration-ledger-map.ts` [GIT]. `src/lib/db/import-player-resolution-repo.ts`
and `src/lib/observability/` **do not exist** on that lineage at all [GIT]; the
subsystem was replaced by `import-player-identity-repo.ts` on the four applied
source-bound gateways. The sweep was run with `list_import_player_identity_candidates`
as a **positive control**, which returns hits on the same tree, so the empty
result is a proven absence rather than a broken search — the same technique
`DEPLOY-STATE` records for the guest-identity zero-caller proof [PROJECT-DOC].

**Consequences for the comparison:**

- The contraction's real precondition (§6 step 4) is satisfied **by
  construction** once the redesign lineage is the deployed code. No overload, no
  expand migration, no interim trust downgrade on a matching function.
- It also resolves the manual-entry gap (§5) rather than deferring it, because
  the redesign lineage carries the source-bound design the parent decision
  adopted.
- It does not require accepting the amendment's explicitly-recorded deviation
  from the parent decision's structured-input and indistinguishable-failure
  clauses [PROJECT-DOC, `DECISIONS.md:1318-1322`].

**What makes it the larger and riskier option:**

- It is a **full application release**, not a one-file change: every redesign
  difference ships at once, with a blast radius across the whole app rather than
  one repository function.
- `DEPLOY-STATE` records at least one known forward dependency that had to be
  fixed before any redesign deploy [PROJECT-DOC], and the redesign lineage has
  its own open blockers and an unfinished Step 4.3. Whether it is currently
  deployable at all is **[UNVERIFIED]** here and is the thing to settle before
  comparing seriously.
- Memory of this project's deploy history: a frontend/DB version mismatch blanks
  Insights sections. A redesign deploy must land against a database whose
  migration state matches it.

**The honest comparison.** The overload is small, well-understood, reversible in
one statement, and buys a partial risk reduction that the amendment itself says
does **not** close the oracle. The redesign deploy is large, less reversible, and
closes the matter — including the part the overload leaves permanently open. The
overload is not a cheaper route to the same destination; it is a different, lesser
destination reached sooner. **That is the owner's call and this document does not
make it.**

---

## 9. Anything else

### FINDING-A (HIGH) — the null requesting-user id fails **silently**, not loudly

The most likely implementation defect produces no error and no log signal.

If the three-argument function derives its candidate pool from
`p_requesting_user_id` without an explicit null check — the obvious way to write
it — a null id yields an **empty pool**, and an empty pool yields **zero rows**.
Proven on the disposable cluster:

```
-- N1 truthful id:                1 row
-- N2 NULL id:                    (0 rows)
-- N3 row count for the NULL case:
 rows_returned |      note
---------------+-----------------
             0 | no error raised
```

The guarded shape behaves correctly:

```
-- G1 NULL id:       ERROR:  A requesting user is required.        (22023)
-- G2 non-member id: ERROR:  The selected group is not available for import.  (42501)
-- G3 truthful id:   1 row
```

**Why this is more than a theoretical edge case.** The existing helper an
implementer would naturally reuse, `resolveAuditUserId`, is *documented* to
return null on failure and to let the call proceed [REPO] — correct for an audit
line, wrong for an authorization argument. Compose the two and a lapsed or
unreadable session produces: `matchImportPlayerNames` returns `[]` →
`applyServerPlayerMatches` marks every name unresolved → the import review shows
every player as unmatched → the audit line records `outcome: "matched"` with
`matchCount: 0`, which is indistinguishable from a genuine no-match. No
exception, no `42501`, nothing in the error path.

**Mitigations, both required, neither optional:** the explicit null rejection in
SQL (§7.1) *and* the fail-closed resolver in TypeScript (§7.2). The SQL check is
the load-bearing one, because it holds even if a future caller is written
carelessly.

### FINDING-B (MEDIUM) — the gate and the pool must move together

The two-argument function derives the caller's identity **twice**, through two
different mechanisms: the gate `public.is_group_member(p_group_id)` and the pool
predicate `where gm.user_id = (select auth.uid())` [REPO]. `is_group_member` is a
`SECURITY DEFINER` function that reads `auth.uid()` internally
[REPO, `20260703121500_create_core_rls.sql:9-21`] — the dependency is **invisible
at the call site**, which reads like a pure function of `p_group_id`.

An implementer converting the pool to `p_requesting_user_id` and leaving the gate
line untouched produces a function that raises `42501` on **every** call under
`service_role`. That is at least loud. The reverse — replacing the gate but
leaving the pool on `auth.uid()` — is the dangerous one: it authorizes correctly
and then matches against an empty pool, collapsing into FINDING-A.

This is the same defect class as the ID-READER HIGH finding, where the counting
query and the selection query eleven lines apart applied different predicates
[PROJECT-DOC]. **Any review of this migration should diff the two identity
predicates against each other explicitly**, not merely read each in isolation.

### FINDING-C (MEDIUM) — the amendment names two call sites; there are three

`DECISIONS.md:1311-1316` says "Both live call sites (import analyze, manual-entry
resolution) move to the server-side admin client" [PROJECT-DOC]. The code has
three (§1). The third, `roster_display_name_fallback`, is dormant because
`players.normalized_display_name` is still granted to `authenticated` [REPO].

The practical risk is low **because** all three route through one wrapper, so
moving the wrapper moves all three whether or not the implementer noticed. But
it is worth recording, because the amendment's undercount would have been a real
defect had the call sites each held their own client — and because a future
tightening that revokes the `normalized_display_name` grant would wake site 3 up
without anyone revisiting this decision.

### FINDING-D (LOW) — the wrapper's doc comment becomes false

`import-player-resolution-repo.ts:143` states "The RPC itself remains gated by
RLS on the caller's session" [REPO]. After the move there is no session on the
RPC; the gate is the explicit id. Comments in this repository are load-bearing —
the ID-READER work turned on exactly such a contract statement. It should be
rewritten in the same change, not left to a follow-up.

### FINDING-E (LOW) — the contraction does not remove the enumeration probe, and this is easy to misread

The amendment is explicit that the oracle stays open [PROJECT-DOC,
`DECISIONS.md:1328-1332`], and `DEPLOY-STATE` repeats it [PRIOR]. Recorded here
because the sequence's shape — expand, deploy, verify, contract — reads like a
closure and will be summarised as one by anyone reading only the step names. The
contraction removes **direct PostgREST access by `authenticated`**. The probe
remains available through the analyze server action, which forwards
browser-supplied names, unrate-limited. Any post-contraction status line should
say "re-gated", never "closed".

---

## Validation

| What | Result |
|---|---|
| Disposable PostgreSQL 18.4 cluster, port 55987 | created, used, stopped, deleted |
| Case A — 3rd param, no default, positional + named 2-arg calls | resolved unambiguously to the 2-arg function |
| Case A — named 3-arg call | resolved to the 3-arg function |
| Case B — 3rd param with `default null` | `ERROR: function ... is not unique` (42725), both positional and named |
| Case C1 — non-defaulted param appended after defaults | `ERROR: input parameters after one with a default value must also have defaults` (42P13) |
| Case C2 — guest-identity control, old-style call | `ERROR: function ... is not unique` (42725) |
| Null-id naive shape | 0 rows, **no error raised** |
| Null-id guarded shape | 22023 on null; 42501 on non-member; 1 row on truthful id |
| Redesign-lineage matcher sweep, with positive control | 0 call sites; control returns hits |

No production system was read or written. No Supabase MCP call was made.

---

## Remaining unknowns

| Unknown | Exact evidence that would settle it |
|---|---|
| Is `SUPABASE_SERVICE_ROLE_KEY` bound on the live Worker? **[UNVERIFIED]** | `wrangler secret list --name <worker>`, or the Worker's Variables and Secrets pane |
| Does PostgREST resolve the two overloads correctly? **[INFERENCE]** | a local Supabase stack carrying both overloads, or §6 step 3 in production; failure surfaces as `PGRST203` |
| Is the current production two-argument body byte-identical to `20260720120000`? **[PRIOR]** | `md5(prosrc)` against the recorded `522f8cb0a2647c57e35da0a081f90480` in an authorized catalog read |
| Is the redesign lineage currently deployable? **[UNVERIFIED]** | a build and forward-dependency sweep on that lineage against the current production schema |

---

## Downstream work

**No downstream work was started.** No migration was authored, no application
code changed, no production action taken, and no decision made or implied.

Requires new owner authorization before any of it begins: building the overload
or any part of it; any migration, deploy, or production read; merging or pushing
this branch; contraction `20260722012707`; the CONTRACT drop; the reader deploy.
