# Phase 4, Step 4.3 — Guest-identity reader repair: read-only design scoping

**Outcome: a priced design proposal. Nothing was implemented, no migration was
authored under `supabase/migrations/**`, no application code changed, no
production system was read or written.**

This handoff scopes the coupled blocker `ID-READER-CLIENT` +
gated migration `20260720100000`. It does not decide anything. Every proposed
artefact below is **PROPOSED — NOT APPROVED, NOT AUTHORIZED, MUST NOT BE
APPLIED** until the owner records a decision.

Evidence classes are tagged inline: `[GIT] [REPO] [PROJECT-DOC] [PRIOR]
[INFERENCE] [UNVERIFIED]`. No `[LIVE]`/`[PROVIDER]` claim appears — no production
read was authorized or performed. Every statement about the currently deployed
function body, ACL, or data is `[PRIOR]`/`[UNVERIFIED]`, derived from migration
files and the recorded apply evidence, never observed.

---

## Headline

1. **No — the already-applied source-bound gateways cannot serve this path
   without a new migration.** They are the import flow; this path is non-import
   and would have to fabricate import evidence to use them (§1).
2. **Disposition for `20260720100000`: SUPERSEDE it (retire unapplied).** Its
   still-needed capability — non-import guest creation that records no false
   import evidence — moves into one new function that *also* fixes the
   `auth.uid()` reader break and does not re-grant `authenticated` (§2).
3. **Recommendation: one new, distinctly-named, `service_role`-only function**
   authorised by an explicit server-verified `p_requesting_user_id`, deployed
   under expand/contract, then drop the deployed 7-arg function. Prefer a
   **distinct name over an overload** — a disposable-cluster experiment proved
   the overload carries a `42725` ambiguity hazard the rename avoids for free
   (§3, §7). **No option that both keeps the closed oracle closed and repairs
   the reader avoids the requesting-user-id trust downgrade (§5).**

---

## Base and target

- Repository: `Fochizzy/terraforming-mars-stats` [GIT].
- Base branch `redesign/tm-stats-dashboard-rebuild` tip re-derived at
  **`0f2e65d66`** [GIT]. The brief reported `47c607cd6`; that commit is an
  **ancestor** of `0f2e65d66`, and the five intervening commits are
  planning-pack sync-hook docs/tooling only — none touch identity code or
  migrations [GIT]. Work used `0f2e65d66`.
- Task branch `design/guest-identity-overload-scoping` in a fresh worktree
  `C:\tmp\tm-guest-identity-design`; base worktree was clean before branching
  [GIT].

---

## 1. Can the already-applied gateways serve this path with NO new migration? — NO

`createOrReuseGuestPlayerByPersonalName`'s actual job, re-derived from
`src/lib/db/import-player-identity-repo.ts:78-116` and its two callers [REPO]:
reuse-or-create an **unlinked guest from a personal name** on a **non-import**
path, preserving the player id and private evidence, and **recording no import
evidence**. Both callers are non-import:

- `src/app/(app)/group/players/page.tsx:31` — the roster "add player" server
  action; a user types a first/last name to add a shared-roster guest. No game,
  no import, no parsed log [REPO].
- `src/lib/db/log-game-player-resolution.ts:122-127` — the manual Log-a-Game
  resolver's new-player branch; a name typed into the manual form [REPO].

The function's own doc comment states the contract [REPO,
`import-player-identity-repo.ts:74-77`]:

> Non-import guest creation remains on its established guarded RPC. It must not
> record an import alias because no imported source exists on this path.

The four applied gateways in
`supabase/migrations/20260722012658_add_source_bound_import_identity_staging.sql`
[REPO] model the **import** flow and **cannot** serve the non-import path. Three
missing capabilities, each fatal:

1. **Source binding.** `resolve_staged_import_player_identity` requires a
   `p_staging_id` pointing at a `private.import_identity_staging` row whose
   `source_player_texts` came from a parsed import (created via
   `stage_import_player_identity_evidence`, bounded 1–5, attached to a game/
   import). For personal-name mode it enforces
   `v_source_exact in (v_first_name, v_last_name, concat_ws(' ', ...))` →
   `invalid_source_match` otherwise
   (`20260722012658_*.sql:358-364`) [REPO]. The roster and manual paths have no
   imported source; to use the gateway you would **fabricate a staging row whose
   `source_player_texts` equals the typed name**, purely to pass the
   source-binding check.
2. **Unconditional false import alias.** On creation the gateway always inserts
   `public.player_import_aliases (... source_type 'game_log' ...)` with no
   opt-out (`20260722012658_*.sql:453-459`) [REPO]. `source_type` is constrained
   to import sources, so an alias row asserts "this name appeared in an imported
   game log." For a roster-added / manually-entered guest that assertion is
   **false** — exactly the fabricated provenance that `20260720100000`
   (`p_record_import_alias = false`) and the repo doc comment exist to prevent.
3. **Import lifecycle coupling.** The staging row expires after 30 minutes, is
   attached to a game, and is deleted by
   `private.delete_finalized_import_identity_staging` on game finalisation
   (`20260722012658_*.sql:471-488`) [REPO]. It is an import-flow object; the
   roster path is not part of any import.

Using the gateways here would require **manufacturing import evidence**, which
violates MASTER-RULES ("Do not fabricate missing data") [PROJECT-DOC] and the
privacy contract's import-evidence rules [PROJECT-DOC,
`GUEST-PLAYER-IDENTITY-AND-PRIVACY.md:452-467`], and defeats the source-bound
design. **Missing capability precisely:** a non-import, source-unbound guest
reuse-or-create that records **no** import evidence and is authorised by an
explicit server-verified requesting-user id. That capability exists in **no**
applied object, so a new migration is required. `[INFERENCE]` from the above
`[REPO]` facts.

---

## 2. Is `20260720100000` still wanted? — SUPERSEDE it

**What it actually does** (re-derived from
`supabase/migrations/20260720100000_add_guest_identity_alias_source_control.sql`
in full) [REPO]:

- Drops the 7-arg and 8-arg overloads (`IF EXISTS`, lines 23-28), then creates
  the 8-arg overload adding `p_record_import_alias boolean default true`
  (lines 30-244).
- Purpose (header lines 1-14 + call site): let **non-import** callers pass
  `p_record_import_alias = false` to **skip** the false `game_log` alias insert
  (the two `if p_record_import_alias then …` guards, lines 183-191 and 228-236).
  This is a **privacy/evidence-integrity control** — it lets a non-import
  creation suppress import-alias provenance — not a generic alias feature.
  Confirmed against both callers (§1) and the call site's explicit
  `p_record_import_alias: false` (`import-player-identity-repo.ts:95`) [REPO].
- **Also** `grant execute … to authenticated` (lines 252-254) — which would
  **reopen** the private-name confirmation oracle closed in production by ledger
  `20260722153233` [PRIOR, `GUEST-IDENTITY-ORACLE-REVOKE-APPLY.md`].
- **Does not** fix `ID-READER-CLIENT`: it keeps the `auth.uid()` gate (line 59)
  and `created_by_user_id = (select auth.uid())` (lines 177, 225), so the call
  still fails under both the user-session client (authenticated revoked) and the
  admin client (`auth.uid()` NULL → `42501`, then NOT NULL violation) [REPO].

**Does the false-evidence-suppression need still exist under the applied
source-bound design?** Yes, and it is still **unmet**:

- The source-bound design (`20260722012658`, applied as ledger `20260722132159`
  [PRIOR]) governs the **import** flow only. It does not touch the roster
  "add player" or manual-entry non-import paths, which still create guests via
  `createOrReuseGuestPlayerByPersonalName` → `resolve_import_guest_identity`.
- The gateways cannot serve those paths (§1) and always record aliases. So the
  need for a non-import creation that records **no** import alias remains real
  and unserved.
- Refinement: because the import flow now has its **own** creator
  (`resolve_staged_import_player_identity`, which records its own alias
  appropriately), `resolve_import_guest_identity`'s alias-recording is now
  **vestigial** — no caller anywhere wants it. The live worker has zero callers
  [PRIOR]; the redesign's only caller is non-import and wants no alias. The
  capability is therefore better expressed **structurally** (a function that
  never records an alias) than as a `p_record_import_alias` boolean.

**Dispositions priced:**

- **CORRECT** (remove the re-grant, keep the capability): insufficient alone. To
  repair `ID-READER-CLIENT` the function also needs an explicit requesting-user
  id (because `auth.uid()` is unusable under service_role and the call must run
  service-role now that `authenticated` is revoked), which is a signature change
  too. Correcting-in-place turns `20260720100000` into a different function —
  "correct" collapses into "rewrite," on a gated migration the ledger-map
  already tracks. Muddier provenance, no saving.
- **SUPERSEDE** (retire it unapplied; carry the still-needed capability into a
  new migration): **recommended.** `20260720100000` is gated and unapplied
  (`migration-ledger-map.ts:244`, GATED set) [REPO]; nothing deployed depends on
  it. Fold the still-needed capability (non-import creation recording no import
  evidence) + the explicit requesting-user id + `service_role`-only into **one**
  new function (§3), fixing the auth break, the false-alias problem, and the
  re-grant defect together.
- **ABANDON** (capability obsolete): no. Two live product paths need it.

**What must be true for dropping the revoked 7-arg function to be safe, and what
happens to old-signature callers:** no deployed reader may reference it. The
revoke-apply zero-caller sweep (commit `4dec49a42`, 930 files, with a positive
control on `match_import_player_names`) found the live worker has **zero**
references to `resolve_import_guest_identity` [PRIOR,
`GUEST-IDENTITY-ORACLE-REVOKE-APPLY.md:86-108`]. Its only would-be caller is the
redesign's `createOrReuseGuestPlayerByPersonalName`, which must move to the new
function **first** (expand + deploy + verify). After that move the 7-arg is
caller-less on both lineages and the contract drop breaks nobody; the drop also
finally removes the function surface entirely rather than leaving a
revoked-but-present oracle body.

---

## 3. Proposed function (on paper)

The disposable-cluster experiment (§ "Validation experiment") shows appending a
parameter to `resolve_import_guest_identity` is hazardous **as an overload**,
because the existing signature ends in five defaulted parameters, so an appended
`p_requesting_user_id` is **forced** to have a default (PostgreSQL: *"input
parameters after one with a default value must also have defaults"*), and a
defaulted extra parameter makes the 7-arg and new 8-arg overloads **ambiguous
(`42725`)** for any old-style call. A **distinct name** removes that hazard
entirely, so it is the primary proposal. The overload variant is shown after it
for comparison with the approved matcher amendment.

Authorisation is enforced from the explicit `p_requesting_user_id` (mirroring the
four applied gateways) instead of `auth.uid()`; `created_by_user_id` is populated
from the same argument; **no** import alias is ever recorded; the grant is
`service_role` only and `authenticated` is never granted.

### 3a. PRIMARY — distinct-named function

```sql
-- PROPOSED — NOT APPROVED, NOT AUTHORIZED, MUST NOT BE APPLIED.
-- Non-import, source-unbound guest reuse-or-create for /group/players and the
-- manual Log-a-Game resolver. Authorised by an explicit server-verified
-- requesting-user id; records NO import alias; service_role only.
-- Body derived from 20260720100000 minus the alias inserts, with the auth swap.

create function public.create_or_reuse_guest_identity(
  p_group_id uuid,
  p_identity_mode text,
  p_guest_username text default null,
  p_guest_first_name text default null,
  p_guest_last_name text default null,
  p_selected_player_id uuid default null,
  p_create_new boolean default false,
  p_requesting_user_id uuid default null
)
returns table (
  player_id uuid,
  public_name text,
  resolution_state text,
  normalized_imported_value text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_first_name text;
  v_last_name text;
  v_normalized_value text;
  v_candidate_count integer := 0;
  v_player_id uuid;
  v_display_name text;
begin
  -- AUTH: derive the gate from the explicit requesting-user id, NOT auth.uid().
  if p_requesting_user_id is null or not exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = p_requesting_user_id
  ) then
    raise exception 'The selected group is not available.' using errcode = '42501';
  end if;

  if p_identity_mode = 'username' then
    v_username := nullif(btrim(regexp_replace(coalesce(p_guest_username, ''), '[[:space:]]+', ' ', 'g')), '');
    v_normalized_value := private.normalize_guest_username(v_username);
    if v_username is null or v_normalized_value = '' then
      raise exception 'Enter a guest username using letters or numbers.' using errcode = '22023';
    end if;
  elsif p_identity_mode = 'personal_name' then
    v_first_name := nullif(btrim(regexp_replace(coalesce(p_guest_first_name, ''), '[[:space:]]+', ' ', 'g')), '');
    v_last_name := nullif(btrim(regexp_replace(coalesce(p_guest_last_name, ''), '[[:space:]]+', ' ', 'g')), '');
    v_normalized_value := private.normalize_private_personal_name(v_first_name, v_last_name);
    if v_first_name is null or v_last_name is null or v_normalized_value = '' then
      raise exception 'Enter both a first and last name.' using errcode = '22023';
    end if;
  else
    raise exception 'Choose username or first and last name.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_group_id::text || ':' || p_identity_mode || ':' || v_normalized_value, 0
    )
  );

  -- Candidate search: identical to 20260720100000 (private identities UNION
  -- unlinked import aliases, keyed on group + normalized value). Reproduce the
  -- exact block from 20260720100000 lines 87-132 verbatim; omitted here only for
  -- length. It reads evidence and creates none, so no false provenance arises.
  --   ... v_candidate_count computation ...
  --   ... single-candidate auto-selection into p_selected_player_id ...

  if p_selected_player_id is not null then
    -- Revalidate the selected player matches (verbatim from 20260720100000
    -- lines 134-163), then:
    insert into private.player_private_identities (
      player_id, group_id, identity_mode, guest_username, guest_first_name,
      guest_last_name, normalized_guest_username, normalized_personal_name,
      created_by_user_id
    )
    select
      p_selected_player_id, p_group_id, p_identity_mode,
      case when p_identity_mode = 'username' then v_username end,
      case when p_identity_mode = 'personal_name' then v_first_name end,
      case when p_identity_mode = 'personal_name' then v_last_name end,
      case when p_identity_mode = 'username' then v_normalized_value end,
      case when p_identity_mode = 'personal_name' then v_normalized_value end,
      p_requesting_user_id                          -- was (select auth.uid())
    where not exists (
      select 1 from private.player_private_identities ppi
      where ppi.player_id = p_selected_player_id
    );
    -- NO public.player_import_aliases insert. This path is non-import.

    return query select
      p_selected_player_id,
      coalesce(private.resolve_public_player_name(p_selected_player_id), 'Player'),
      'existing_unlinked_guest'::text,
      v_normalized_value;
    return;
  end if;

  if v_candidate_count > 1 then
    raise exception 'Multiple guest identities match. Select one explicitly.' using errcode = 'P0003';
  end if;
  if not p_create_new then
    raise exception 'Confirm creation of the new guest identity.' using errcode = '22023';
  end if;

  v_player_id := gen_random_uuid();
  v_display_name := private.neutral_unlinked_player_label(v_player_id);

  insert into public.players (id, group_id, linked_user_id, display_name)
  values (v_player_id, p_group_id, null, v_display_name);

  insert into private.player_private_identities (
    player_id, group_id, identity_mode, guest_username, guest_first_name,
    guest_last_name, normalized_guest_username, normalized_personal_name,
    created_by_user_id
  ) values (
    v_player_id, p_group_id, p_identity_mode,
    case when p_identity_mode = 'username' then v_username end,
    case when p_identity_mode = 'personal_name' then v_first_name end,
    case when p_identity_mode = 'personal_name' then v_last_name end,
    case when p_identity_mode = 'username' then v_normalized_value end,
    case when p_identity_mode = 'personal_name' then v_normalized_value end,
    p_requesting_user_id                            -- was (select auth.uid())
  );
  -- NO public.player_import_aliases insert. This path is non-import.

  return query select
    v_player_id,
    v_display_name,
    'newly_created_unlinked_guest'::text,
    v_normalized_value;
end;
$$;

revoke execute on function public.create_or_reuse_guest_identity(
  uuid, text, text, text, text, uuid, boolean, uuid
) from public;
revoke execute on function public.create_or_reuse_guest_identity(
  uuid, text, text, text, text, uuid, boolean, uuid
) from anon;
revoke execute on function public.create_or_reuse_guest_identity(
  uuid, text, text, text, text, uuid, boolean, uuid
) from authenticated;                              -- defensive; never granted
grant execute on function public.create_or_reuse_guest_identity(
  uuid, text, text, text, text, uuid, boolean, uuid
) to service_role;
```

> The two elided blocks (candidate search; selected-player revalidation) must be
> transcribed **verbatim** from `20260720100000` lines 87-163 during
> implementation; they read evidence only and create none, so they introduce no
> provenance. They are elided here solely to keep the proposal readable — this is
> a design document, not a migration.

`p_requesting_user_id` is passed as the **server-verified** authenticated user id
from the server session; it must never be client-supplied, per the privacy
contract's security rules [PROJECT-DOC,
`GUEST-PLAYER-IDENTITY-AND-PRIVACY.md:469-483`].

### 3b. OVERLOAD variant (shown for comparison — NOT recommended)

Same body, but named `public.resolve_import_guest_identity` with the extra
parameter `p_requesting_user_id uuid default null` appended (8-arg). Because the
deployed 7-arg overload remains during expand, and the extra parameter is forced
to default, **any old-style 7-arg call is ambiguous (`42725`)** — proven in the
experiment. It is safe only if *every* call passes `p_requesting_user_id`. The
matcher amendment could choose an overload because `match_import_player_names`
has no trailing defaults; this function has five, so the same pattern is
hazardous here. The rename avoids the hazard at zero cost.

### On dropping vs retaining the old signature

Either variant **retains** the deployed 7-arg `resolve_import_guest_identity`
through expand + deploy + verify, then **drops** it in the contract phase (§4).
Retaining it longer leaves a revoked-but-present oracle body; dropping it before
the reader moves breaks the reader (`42883`).

---

## 4. Expand/contract sequence (distinct-name variant)

Each step needs its **own** separate owner authorisation; none is authorised now.

1. **EXPAND** (new migration): create `public.create_or_reuse_guest_identity`,
   `service_role` only. Leave the deployed 7-arg `resolve_import_guest_identity`
   untouched; retire `20260720100000` **unapplied** (never apply it).
   *Wrong order:* dropping the 7-arg here breaks the redesign reader (`42883`).
2. **DEPLOY app**: move both call sites (`createOrReuseGuestPlayerByPersonalName`
   and its two callers) to the admin/`service_role` client and call the new
   function, passing the **server-verified** `p_requesting_user_id`.
   *Wrong order:* deploying before the expand migration lands → `42883` on every
   roster-add and manual new-guest. The expand migration must land **and verify**
   in the database first — the same discipline the matcher amendment mandates
   ("The 2-arg function must remain granted and working until the deploy is
   verified" [PROJECT-DOC, `DECISIONS.md:1342-1343`]).
3. **VERIFY in production** (authorised read): roster-add and manual new-guest
   both succeed via the new function; **no** `player_import_aliases` row is
   created for them; `created_by_user_id` equals the requesting user;
   `authenticated` cannot call the new function directly.
4. **CONTRACT** (new migration): drop the deployed 7-arg
   `resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean)`.
   *Wrong order:* dropping before step 3 verifies breaks the reader. Must be
   last, and only after a fresh zero-caller re-sweep of the live worker.

The other outstanding contraction `20260722012707` (retire the free-form
matcher) is an **independent** surface, separately gated [REPO,
`migration-ledger-map.ts:249`]; it is not part of this sequence, but the closure
audit before Step 4.4 depends on both being resolved [PROJECT-DOC].

---

## 5. Security delta — stated precisely

- **Today** [REPO, `20260720100000:59`, `is_group_member` at
  `20260703121500:9-22`]: the gate is `auth.uid()` /
  `is_group_member(auth.uid())`. The database itself establishes the caller
  identity from the verified JWT; an application bug **cannot** make the database
  act as a different user. An authorization bypass is structurally impossible.
- **Under the proposal**: the database trusts `p_requesting_user_id` passed by
  the server. A server-side defect that passes an attacker-influenced id becomes
  a **full bypass** (create/reuse guests in arbitrary groups as an arbitrary
  user, and stamp `created_by_user_id` to an arbitrary user).

**Compared to the 2026-07-22 matcher amendment** [PROJECT-DOC,
`DECISIONS.md:1334-1338`], which states verbatim:

> Security cost being accepted. The database will trust the application to pass a
> truthful requesting-user id. Today auth.uid() makes an authorization bypass
> structurally impossible; afterwards, a server-action defect that passes an
> attacker-influenced id becomes a full bypass. This is the same trust model as
> the four applied source-bound gateways, but newly load-bearing on a matching
> function.

This is the **same trust model** and arguably a **smaller** surface. The matcher
amendment left an enumeration oracle open ("It does not close the import
enumeration oracle … the same probe remains available through the analyze server
action" [PROJECT-DOC, `DECISIONS.md:1328-1332`]); it re-gated a read/matching
function that "still accepts an arbitrary array of candidate names and still
returns an exact/partial classification with a player id"
[`DECISIONS.md:1318-1322`]. The guest resolver is a narrower, write-oriented
reuse-or-create scoped to one group, with no arbitrary-array probe. And the
identical explicit-requesting-user model is **already deployed and accepted** for
the four source-bound gateways [PRIOR]. So the proposal adds no new *kind* of
trust — it extends an already-accepted, already-in-production model to one more
`service_role` function.

**Most important sentence.** No option in §1 or §2 avoids this downgrade. The
gateways (§1) cannot serve the path *and* already use the same trust model. The
only thing that would keep `auth.uid()` as the identity source is the prior
handoff's Option B — restore the `authenticated` grant and keep the user-session
client — but that **reopens the private-name confirmation oracle deliberately
closed by ledger `20260722153233`**, contradicting `DECISIONS.md:1349-1351`, a
strictly worse privacy regression. **Therefore no acceptable option both keeps
the closed oracle closed and repairs the reader without accepting the
requesting-user-id trust downgrade. The downgrade is the price of doing both.**

---

## 6. Cost per surviving option

| Option | Files | Migrations | Deploys | Tests | Working-time (tail risk) |
|---|---|---|---|---|---|
| **1 — SUPERSEDE + distinct name (recommended)** | new migration; retire `20260720100000` (governance only); `import-player-identity-repo.ts` + its test; thread server-verified user id through `group/players/page.tsx` and `log-game-player-resolution.ts`; `migration-ledger-map.ts` | 1 expand + 1 contract | 1 redesign deploy (between them) | repo unit (modes, no-alias, requesting-user gate); executable DB test (disposable cluster or MCP begin/rollback); privacy tests (no alias row, no private-name leak) | ~1.5–3 focused days. Tail: prod verify + contract drop each need their own authorization + a live window; if the requesting-user plumbing is wrong the reader deploy reworks; DEPLOY-STATE fork + closure-audit-before-4.4 still outstanding |
| **2 — SUPERSEDE + overload (same name)** | same as 1 | 1 expand + 1 contract | 1 | same as 1 + overload-resolution coverage | as 1, **plus** a `42725` ambiguity hazard during expand; must guarantee every call passes `p_requesting_user_id` and keep the window tight; no offsetting benefit over the rename |
| **3 — CORRECT `20260720100000` in place** | edit the gated migration + code + ledger-map | collapses into 2 (rewrites the migration) | 1 | as 2 | as 2, muddier provenance editing a tracked gated migration; not recommended |
| **B — restore `authenticated` grant (no signature change)** | one grant | 1 | 0 | — | cheapest, but **reopens the closed oracle**; unacceptable; priced only to reject |

---

## 7. Recommendation

**Adopt Option 1.** SUPERSEDE `20260720100000` (retire it unapplied) and, under a
separately authorised expand/contract sequence, add one new distinctly-named
`service_role`-only function `public.create_or_reuse_guest_identity(...)` that
(a) authorises on and stamps `created_by_user_id` from an explicit
server-verified `p_requesting_user_id`, (b) never records an import alias, and
(c) is granted to `service_role` only, never `authenticated`; move the two
non-import callers to the admin client passing the server-verified user id;
verify in production; then drop the deployed 7-arg `resolve_import_guest_identity`.
Prefer the **distinct name** over an overload — the experiment shows the overload
carries a `42725` ambiguity hazard the rename removes for free.

**Residual risk the owner accepts:** the explicit-requesting-user trust
downgrade (§5) — the same class already accepted for the four gateways and the
matcher amendment, on a narrower surface. The reader now depends on the
application passing a truthful, server-verified user id.

**What I would NOT do, and why:** (1) apply `20260720100000` as written — it
re-grants `authenticated` and reopens the closed oracle; (2) restore the
`authenticated` grant — same reason; (3) route the non-import paths through the
source-bound gateways — fabricates false import provenance (§1); (4) use an
overload sharing the name — a needless `42725` hazard (§3, experiment).

**Honest uncertainty.** Everything about the **currently deployed** function
body, ACL, and data is `[PRIOR]`/`[UNVERIFIED]` — no production read was
authorized. The expand-phase "zero deployed callers" safety and the contract
drop both hinge on facts only a live read can settle. Named reads (not
performed): (a) the deployed `resolve_import_guest_identity` signature(s), body,
and ACL — confirm 7-arg only, `authenticated` revoked, no 8-arg present; (b) a
fresh zero-caller re-sweep of the current live worker for the new function name
before the contract drop; (c) an executable test of the new function against the
real schema (MCP `begin … rollback`) to confirm no other NOT NULL/trigger
constraint references `auth.uid()` on this write path beyond the one confirmed
(`player_private_identities.created_by_user_id`, `20260718050924:61` [REPO]).

---

## Validation experiment (disposable, local, nothing persisted)

A throwaway PostgreSQL 18.4 cluster (native install; TCP `127.0.0.1:55442`;
data dir + socket dir under the session scratchpad / `C:\tmp\pgs442`) was
initialised, used, then stopped with `-m immediate` and deleted. No production
system was contacted; no data persisted. Toy functions with the exact target
signatures were created and resolution was observed:

- **TEST A** — against only the deployed 7-arg, the current 8-key call (incl
  `p_record_import_alias`) → **`function … does not exist`**. Reproduces today's
  `PGRST202`/`42883` [REPO-behaviour].
- **TEST B** — with both overloads present, a call passing `p_requesting_user_id`
  resolves **uniquely** to the new overload.
- **TEST C** — with both present and the new overload's extra param **defaulted**
  (the only form PostgreSQL allows here), an old-style 7-arg named call →
  **`ERROR: function … is not unique` (`42725`)**.
- **CREATE with no default rejected**: *"input parameters after one with a
  default value must also have defaults"* — the existing signature's five
  trailing defaults **force** `p_requesting_user_id` to default, which is what
  makes TEST C ambiguous.

Conclusion: the overload approach carries an inherent `42725` ambiguity during
coexistence that a distinct-named function avoids. This is the concrete basis for
preferring the rename (§3, §7).

---

## Canonical documents reviewed

- `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` — reviewed; the
  proposal complies (non-import creation is a governed path; no fabricated
  provenance; server-side authorised operations; no private-name leak). No change
  required.
- `docs/redesign/DECISIONS.md` — reviewed, **intentionally unchanged**. Recording
  a decision on this proposal is the owner's act. §2/§5 cite the base decision
  (`:1247-1302`) and the 2026-07-22 amendment (`:1305-1351`).
- `docs/CURRENT_STATUS.md`, `docs/redesign/phases/04-log-a-game.md`,
  `docs/redesign/MASTER-RULES.md` — reviewed; no change required.
- `supabase/migrations/**` — read only; **nothing authored or edited**. The
  proposed SQL lives only in this handoff and the task report.

No private name, alias, personal name, or identifying value appears in this
handoff.

## Discrepancies recorded

1. `20260722012658`'s file header still reads **"GATED / UNAPPLIED"**, but the
   ledger-map (`:156, :199-201`), `GUEST-IDENTITY-ORACLE-REVOKE-APPLY.md` §9, and
   `REDESIGN_STATE.md:19-20` all record it **applied** as ledger `20260722132159`
   [REPO/PRIOR]. The apply record is stronger for *status* (though unverifiable
   from here → `[PRIOR]`); the stale header changes no analysis, which rests on
   the SQL body.
2. `GUEST-IDENTITY-ORACLE-REVOKE-APPLY.md` §8 and `migration-ledger-map.ts:481-483`
   describe `20260720100000` as an "expansion … whose new parameter defaults to
   the previous behavior, so every previously valid call still resolves" and
   class it `expansion`. True for a call that *omits* the new param against a
   world where only the 8-arg exists — but it understates two hazards the STOP
   investigation and this one confirm: the migration **re-grants `authenticated`
   (reopens the closed oracle)** and does **not** repair the `auth.uid()` reader
   break. The STOP handoff's correction is the stronger record.
