# Phase 4, Step 4.3 — ID-READER-CLIENT investigation: STOP before implementation

**Outcome: Phase 1 verdict (b) — UNSAFE SWAP. Nothing was implemented.**

Read-only investigation of blocker `ID-READER-CLIENT`. No production read, no
production write, no deploy, no push, no migration authored. Step 4.3 is **not**
marked complete and no other blocker row changed.

The recorded recommendation — "move it to the admin client, the same pattern the
same file already uses at lines 125, 148, 162 and 182, so the fix is a one-line
client swap" — **does not hold**. It is wrong on the mechanism and incomplete on
the sequencing. Evidence below.

## 1. The call site

`src/lib/db/import-player-identity-repo.ts`, in
`createOrReuseGuestPlayerByPersonalName`, lines 87–97 [REPO]:

```ts
const supabase = await createSupabaseServerClient();          // line 87
const { data, error } = await supabase.rpc('resolve_import_guest_identity', {
  p_create_new: true,
  p_group_id: input.groupId,
  p_guest_first_name: input.firstName,
  p_guest_last_name: input.lastName,
  p_guest_username: null,
  p_identity_mode: 'personal_name',
  p_record_import_alias: false,
  p_selected_player_id: null,
});
```

Line 87 is the user-session client, so the RPC runs as `authenticated`. The
result is mapped to `{ id, publicName, resolutionState }` (lines 108–115).

Two production call paths reach it [REPO]:

- `src/app/(app)/group/players/page.tsx:31` — the roster "add player" server
  action;
- `src/lib/db/log-game-player-resolution.ts:84` — the manual-entry resolver
  default.

## 2. The function's authorization model — from migration SQL only

`public.resolve_import_guest_identity` is `security definer` with
`set search_path = ''` in both the deployed and the gated definition [REPO].

Its gate is the first statement of the body. Deployed 7-argument definition,
`supabase/migrations/20260718212339_remediate_guest_identity_privacy_boundary.sql:107`
— and character-identical in the gated 8-argument definition,
`supabase/migrations/20260720100000_add_guest_identity_alias_source_control.sql`
[REPO]:

```sql
if (select auth.uid()) is null or not public.is_group_member(p_group_id) then
  raise exception 'The selected group is not available for import.' using errcode = '42501';
end if;
```

`public.is_group_member` resolves the caller itself —
`supabase/migrations/20260703121500_create_core_rls.sql:16-21` [REPO]:

```sql
select exists (
  select 1
  from public.group_members gm
  where gm.group_id = target_group_id
    and gm.user_id = auth.uid()
);
```

**What the gate evaluates to under service_role.** `auth.uid()` is NULL, so the
first disjunct is true and the function **raises `42501` immediately**. The
second disjunct would also fail independently, because `is_group_member`
compares `gm.user_id = auth.uid()` and `= NULL` is never true, so it returns
false. Both halves fail. The call does not proceed with authorization skipped —
**it fails outright, with the same SQLSTATE the revoke produces.**

That `auth.uid()` is NULL under service_role is corroborated inside this
repository: the executable harness defines it as
`select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid`
(`supabase/tests/executable/bootstrap.sql:30-36`) [REPO], and the four
service-role gateways were each given an explicit requesting-user parameter
precisely because `auth.uid()` is unavailable to them (§4) [REPO].

**The candidate pool is not auth.uid()-derived.** The candidate search keys on
`p_group_id` and the normalized value only [REPO]. So the pool is unaffected;
what depends on `auth.uid()` is the gate and the created-by attribution.

**A second, independent failure past the gate.** Both insert branches write
`created_by_user_id` as `(select auth.uid())`, and the column is
`created_by_user_id uuid not null references auth.users(id)`
(`supabase/migrations/20260718050924_claimable_guest_identity_privacy.sql:61`)
[REPO]. Under service_role that write is NULL and violates the NOT NULL
constraint. **There is no variant of a client-only swap that works.**

## 3. The four other admin-client call sites — a different pattern

Lines 125, 148, 162 and 182 are indeed the `createSupabaseAdminClient()` lines
[REPO]. That is where the resemblance ends. Every function they call takes an
**explicit `p_requesting_user_id uuid`** and enforces authorization against that
argument rather than the session
(`supabase/migrations/20260722012658_add_source_bound_import_identity_staging.sql`)
[REPO]:

| Line | Function called | Explicit requesting-user arg | How authorization is enforced |
|---|---|---|---|
| 125 | `stage_import_player_identity_evidence` | yes (`:199`) | `where gm.group_id = p_group_id and gm.user_id = p_requesting_user_id` (`:216`) |
| 148 | `attach_import_identity_staging` | yes (`:244`) | `s.created_by_user_id = p_requesting_user_id` plus game/import ownership (`:258, :265-266`) |
| 162 | `discard_import_identity_staging` | yes (`:276`) | `where id = p_staging_id and created_by_user_id = p_requesting_user_id` (`:285`) |
| 182 | `resolve_staged_import_player_identity` | yes (`:294`) | `s.created_by_user_id = p_requesting_user_id` and `gm.user_id = p_requesting_user_id` (`:331, :335`) |

All four are granted to `service_role` **only**, with `authenticated` explicitly
revoked (`:495-513`) [REPO]. They were co-designed with the service-role trust
model. `resolve_import_guest_identity` has **no** requesting-user parameter and
gates purely on `auth.uid()`.

**The four sites share a client, not a pattern.** The recorded claim is
inaccurate, and it is the load-bearing premise of the "one-line swap"
recommendation.

## 4. Verdict — (b) UNSAFE SWAP

Moving line 87 to `createSupabaseAdminClient()` would **break the call**, not fix
it: it converts a privilege-level `42501` into a body-level `42501`, and would
additionally violate a NOT NULL constraint if the gate were ever passed. It
would also remove the structural authorization guarantee that `auth.uid()`
provides, with nothing equivalent available — because the function cannot
receive a requesting-user id without a signature change.

Implementation therefore stopped. Per the assignment, widening the signature,
passing a caller-supplied identity into a function not designed to receive one,
or authoring a migration are all out of scope and require new owner
authorization.

## 5. A prior blocker the records did not sequence

The call site passes **8** named arguments, including `p_record_import_alias`.
Production's deployed function is the **7**-argument overload: the applied
revoke names `(uuid, text, text, text, text, uuid, boolean)`
(`supabase/migrations/20260722153000_close_authenticated_guest_identity_oracle.sql`)
[REPO], and the 8-argument overload exists only in `20260720100000`, which its
own header declares "**GATED**: prepared and executable-tested, NOT applied to
production" [REPO].

So this path would fail `PGRST202`/`42883` **before** reaching any `42501` — the
code handles exactly that at lines 100–105 [REPO]. `ID-READER-CLIENT` is not a
standalone one-line defect; it is downstream of applying `20260720100000`.

## 6. New finding — `20260720100000` as written would reopen the closed oracle

`20260720100000` drops the 7-argument function — the one whose `authenticated`
grant was revoked as ledger `20260722153233` — and creates the 8-argument
overload ending with [REPO]:

```sql
grant execute on function public.resolve_import_guest_identity(
  uuid, text, text, text, text, uuid, boolean, boolean
) to authenticated;
```

Applying that file unchanged would **restore `authenticated` EXECUTE and undo
the closure**. This file was not edited (editing `supabase/migrations/**` is out
of scope here). It must be resolved before that migration is ever applied.

## 7. DECISIONS amendment status

**An amendment exists**, and it is directly on point: "Phase 4 Step 4.3 —
AMENDMENT: interim service-role re-gate of the import matcher",
`docs/redesign/DECISIONS.md:1305-1351`, decided by explicit owner decision on
2026-07-22 [PROJECT-DOC]. For `public.match_import_player_names` it adopts
exactly the change shape this blocker needs — a new overload taking an explicit
requesting-user id, deriving "both the authorization gate and the candidate
pool from that argument instead of auth.uid()", granted to `service_role` only,
under mandatory expand-then-contract ordering — and it explicitly prices the
security cost: "Today auth.uid() makes an authorization bypass structurally
impossible; afterwards, a server-action defect that passes an
attacker-influenced id becomes a full bypass."

That amendment covers the **matcher**. There is **no** equivalent amendment for
`resolve_import_guest_identity`. The only sentence about it (`:1349-1351`) says
the *revoke* is pure tightening and needs no amendment; it says nothing about how
the reader is to be repaired.

## 8. Options for the owner — priced honestly

**Option A — new overload with an explicit requesting-user id.** Mirrors the
approved matcher amendment: a migration adding
`resolve_import_guest_identity(..., p_requesting_user_id uuid)` that derives both
the gate and `created_by_user_id` from that argument, granted `service_role`
only; both call sites (§1) move to the admin client and pass the server-verified
user id. Cost: one migration, an expand/contract deploy sequence, and an owner
decision accepting the same security downgrade the matcher amendment accepted.
Must be reconciled with §6 in the same change. **Recommended, but it needs new
owner authorization — it is a design change, not a repair.**

**Option B — keep the user-session client and restore the `authenticated`
grant.** Cost: reopens the private-name confirmation oracle that ledger
`20260722153233` deliberately closed, and contradicts
`docs/redesign/DECISIONS.md:1349-1351`. **Not recommended.**

**Option C — remove the non-import guest-creation path.** Cost: a product change
to `/group/players` and manual entry plus a designed replacement. Larger than a
repair, and it does not preserve current behavior.

## 9. Production read that was not authorized and not performed

No production read was authorized, so every statement about the *currently
deployed* function body or ACL is [PRIOR]/[UNVERIFIED], derived from migration
files and the apply record — never observed. The conclusion above does **not**
depend on such a read: the gate is identical in both the deployed and the gated
definition, so the verdict holds either way.

## 10. Canonical documents reviewed

- `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` — reviewed; no
  change required.
- `docs/CURRENT_STATUS.md` — updated (the `ID-READER-CLIENT` row only).
- `docs/REDESIGN_STATE.md` — updated (this outcome plus the active handoff
  group).
- `docs/redesign/DECISIONS.md` — reviewed, **intentionally unchanged**; §7
  records the amendment status. Recording a new decision is the owner's.
- `docs/redesign/phases/04-log-a-game.md`, `docs/redesign/MASTER-RULES.md` —
  reviewed; no change required.
- `supabase/migrations/**` — read only; **nothing authored or edited**.

No private name, alias, personal name, or identifying value appears in this
handoff or in any output produced by this task.

## 11. Integration cross-reference (2026-07-22)

This handoff was merged into `redesign/tm-stats-dashboard-rebuild` as a
documentation-only `--no-ff` merge. In the same integration, the §6 finding was
propagated to the one project record that contradicted it: the remaining-Step-4.3
sequence in `docs/REDESIGN_STATE.md` listed `20260720100000` for application
under the per-mutation protocol with no warning. That entry now records that the
migration **must not be applied as written**, that it would restore the
`authenticated` grant revoked as ledger `20260722153233` and reopen the closed
guest-identity oracle, that it requires correction under separate owner
authorization, and that `ID-READER-CLIENT` is downstream of it (§5).

The drop and the re-grant were re-verified directly from
`supabase/migrations/20260720100000_add_guest_identity_alias_source_control.sql`
during that integration, not taken from this handoff. No migration file was
edited, no production system was read, and no continuation was authorized.
