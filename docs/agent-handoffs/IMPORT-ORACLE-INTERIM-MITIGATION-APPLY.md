# Import name-match oracle — interim mitigation applied to production

**Status: APPLIED to production 2026-07-22 14:40 UTC. This is an INTERIM
MITIGATION, NOT A CLOSURE. The enumeration oracle remains OPEN.**

Database-only change. No application deploy, no `wrangler deploy`, no push.

---

## 1. What this is, and what it is not

`public.match_import_player_names(uuid, text[])` is `SECURITY DEFINER`,
`authenticated` holds `EXECUTE`, and it is called by the live site on every
import analyze.

Before this change it returned a **field-identifying** `match_reason`
(`display_name_exact`, `full_name_exact`, `alias_exact`, `username_exact`, and
the `*_partial` variants) plus a `match_score` mapping 1:1 onto it, with **no
input bounds at all**. Any caller permitted to import into a group could submit
candidate strings and read back which private field matched — confirming
`players.full_name` and stored alias texts field by field, defeating the Data
API revokes `20260719192054` / `20260719203944`.

This migration coarsens the disclosed classification to `exact` / `partial` and
bounds input to 64 names × 128 characters.

**It does not close the oracle.** Independent review previously found it
insufficient as a closure, and that finding stands. A caller can still submit a
private name and learn from the presence of a returned row that the name
belongs to a real identity. What is removed is *which field* matched and the
ability to batch unbounded probes cheaply.

It was applied now **solely to reduce exposure** while the real fix is built.

---

## 2. Pre-state (evidence: direct production introspection)

| Item | Value |
|---|---|
| Working tree | clean, no tracked uncommitted changes |
| Branch | `redesign/tm-stats-dashboard-rebuild` |
| HEAD | `37065ec9b6b763688c720de218431ef2f5e34a66` |
| Migration file | `supabase/migrations/20260720120000_coarsen_import_name_match_reasons.sql` |
| Migration SHA-256 | `6523e26b61ec4786714e8e07927e7a25b4d04d8302759caad43858ec20fc552b` |
| Project | tm-stats / `qjtwgrjjwnqafbvkkfex`, ACTIVE_HEALTHY, PG 17.6.1.141 |
| Ledger before | **111** entries, head `20260722132159` |

Deployed function before the change:

| Property | Value |
|---|---|
| Signature | `match_import_player_names(uuid,text[])` |
| Language | `sql` |
| Volatility / security | STABLE, SECURITY DEFINER, `search_path=""` |
| Body length | **3335** bytes |
| Body SHA-256 | `2c8c9395cee6b8d127557a7cb05324f1ccef6a14fd2374ee385c091aa4da4d19` |
| Body MD5 | `e8f7a61577e52c94ba8c102d3fb7b9cd` |
| Return signature | `TABLE(imported_name text, player_id uuid, public_name text, is_linked boolean, match_reason text, match_score integer)` |
| Return sig SHA-256 | `d8d91a90d69afcf8f8ba4543530e0a589b756ac60d292094ae52180b05d52b68` |
| ACL | `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` |
| ACL SHA-256 | `6517848c484bcb249056945f10da14673ac18bf9b93c911c4be0676468c7b5cc` |

**Rollback pre-image.** The full pre-change body was captured verbatim via
`pg_get_functiondef` and transcribed to a file whose SHA-256 was verified to be
**byte-identical** to the value production reported (`2c8c9395…`, 3335 bytes).
The rollback is therefore genuinely available, not merely described. Full text
in §7.

---

## 3. Pre-apply gates — all four passed

**(a) Premise not stale — PASS.** The deployed body still emitted the
fine-grained field-identifying reasons with their 1:1 scores
(400/350/300/250/200/175/150) and contained no input bounds whatsoever.
Production had not already been changed by another session.

**(b) Return signature identical — PASS.** The deployed
`pg_get_function_result` and the migration's `returns table(...)` match
column-for-column in name, type and order (SHA-256 `d8d91a90…` both sides), so
`create or replace` succeeds without dropping a live function. Argument names
(`p_group_id`, `p_imported_names`) are also unchanged, which `create or replace`
requires.

**(c) No privilege changes, no other objects — PASS.** The migration has exactly
two top-level statements: `create or replace function` (line 31) and
`comment on function` (line 168). Zero occurrences of
grant/revoke/drop/alter/truncate/insert/update/delete anywhere in the file.

**(d) Deployed reader tolerates coarse reasons — PASS.**
`wrangler deployments list` (read-only) confirmed the live worker is **still
`178229f3-bfa4-4776-826a-e344daf23d72`** (created 2026-07-21T19:49:49Z, 100%
traffic) — unchanged since tolerance was first established, so the prior
verification still applies. This was not taken on trust; tolerance was
re-derived from the deployed source
`4dec49a42:src/lib/db/import-player-resolution-repo.ts`:

- `coarsenMatchReason(raw)` → `raw === 'exact' || raw.endsWith('_exact')
  ? 'exact' : 'partial'` — accepts both the old fine-grained values **and** the
  new coarse `'exact'` / `'partial'`.
- `MAX_MATCH_CANDIDATE_NAMES = 64`, `MAX_MATCH_CANDIDATE_LENGTH = 128` — exactly
  the migration's bounds, so the client cannot trip the new exceptions. (The
  client filter uses JS UTF-16 length, which is ≥ Postgres `length()`, so the
  client bound is the stricter one.)
- `match_score` reference count: **0**. The reader maps only `imported_name`,
  `match_reason` (coarsened), `player_id`, `public_name`.

**Line endings.** The migration file was already pure LF; the normalized copy
hashed identically to the source, so nothing was rewritten.

---

## 4. Operator confirmation

The complete SQL was printed in full before execution, together with a one-line
summary, an explicit statement that it replaces a live function the production
site calls, and an explicit statement that it is an interim mitigation and not a
closure.

The operator (repository owner, izzy.hodnett@gmail.com) then typed the required
literal confirmation:

```
CONFIRM APPLY 20260720120000
```

No statement was executed against production before that confirmation.

---

## 5. Applied ledger entry

Applied under the ledger name `coarsen_import_name_match_reasons`.

| | |
|---|---|
| Repo filename version | `20260720120000` |
| **Actual recorded ledger version** | **`20260722144034`** |
| Ledger name | `coarsen_import_name_match_reasons` |
| Ledger after | **112** entries (exactly +1), new entry at head |

**Ledger-version drift is expected**: the apply tool stamps apply-time UTC
rather than the filename version. Same precedent as
`20260722012658`→`20260722132159`, `20260720190000`→`20260720221937`, and
`20260721173000`→`20260721201734`. **Reconcile by migration *name*, never by
version.**

Ledger head after the apply:

| Version | Name |
|---|---|
| `20260722144034` | `coarsen_import_name_match_reasons` |
| `20260722132159` | `add_source_bound_import_identity_staging` |
| `20260721201734` | `harden_claim_rpc_privacy` |

---

## 6. Post-apply verification — all checks passed

**(a) Coarsening and bounds are live — PASS.**

| Check | Result |
|---|---|
| `display_name_exact` present in deployed body | **false** |
| `full_name_exact` present | **false** |
| `alias_exact` present | **false** |
| `username_exact` present | **false** |
| any `_exact'` reason literal present | **false** |
| `v_max_names constant integer := 64` present | **true** |
| `v_max_name_length constant integer := 128` present | **true** |

Function comment now reads: "Resolves imported player names to public
identities for import review. Discloses only a coarse match classification
(exact/partial) and never which private field matched, so it cannot be used to
confirm private personal names or stored alias texts. Candidate input is
bounded."

**(b) ACL UNCHANGED — PASS.** Post-apply ACL SHA-256 is
`6517848c484bcb249056945f10da14673ac18bf9b93c911c4be0676468c7b5cc` —
**hash-identical to pre-state**. `authenticated=X/postgres` is still present;
`authenticated` still holds `EXECUTE`. Nothing was granted or revoked.
`SECURITY DEFINER` = true, `proconfig` = `search_path=""`, volatility = STABLE:
all survived the replace.

**(c) Return signature unchanged — PASS.** Post-apply SHA-256
`d8d91a90d69afcf8f8ba4543530e0a589b756ac60d292094ae52180b05d52b68` — identical
to pre-state. The deployed client's row mapping is unaffected.

**(d) Ledger +1 with the new entry at head — PASS.** 111 → 112.

Post-apply body: language `plpgsql`, 4511 bytes, SHA-256
`22247dcbb3b93b48869efd5e85e306e381a4bf89f88e1c088c1d9fea04909537`.

---

## 7. Rollback (staged, NOT executed)

Rollback is a single `create or replace` of the exact pre-image body below —
**that body only, no grants, no other statements.** It restores the vulnerable
fine-grained behaviour, so it is a service-restoration measure of last resort,
not a preference.

Verify any transcription before running it: the file must be **3335 bytes** with
SHA-256 `2c8c9395cee6b8d127557a7cb05324f1ccef6a14fd2374ee385c091aa4da4d19`.

```sql
CREATE OR REPLACE FUNCTION public.match_import_player_names(p_group_id uuid, p_imported_names text[])
 RETURNS TABLE(imported_name text, player_id uuid, public_name text, is_linked boolean, match_reason text, match_score integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with names as (
    select distinct
      btrim(n.name) as imported_name,
      public.normalize_claim_player_name(n.name) as norm,
      regexp_replace(lower(coalesce(n.name, '')), '[^a-z0-9]+', '', 'g') as compact
    from unnest(coalesce(p_imported_names, array[]::text[])) as n(name)
    where btrim(coalesce(n.name, '')) <> ''
  ),
  candidates as (
    select
      p.id,
      p.linked_user_id is not null as is_linked,
      public.normalize_claim_player_name(p.display_name) as norm_display,
      public.normalize_claim_player_name(p.full_name) as norm_full,
      public.normalize_claim_player_name(up.username) as norm_username,
      regexp_replace(lower(coalesce(up.username, '')), '[^a-z0-9]+', '', 'g') as compact_username,
      (select count(*) from public.game_players gp where gp.player_id = p.id) as games_played
    from public.players p
    left join public.user_profiles up on up.user_id = p.linked_user_id
    -- Match across every group the caller plays in, mirroring the candidate
    -- pool, so a player known from another group is still recognised.
    where p.group_id in (
      select gm.group_id
      from public.group_members gm
      where gm.user_id = auth.uid()
    )
  ),
  scored as (
    select
      n.imported_name,
      c.id,
      c.is_linked,
      c.games_played,
      s.match_reason,
      s.match_score
    from names n
    cross join candidates c
    cross join lateral (
      select v.match_reason, v.match_score
      from (values
        ('display_name_exact', 400,
          c.norm_display <> '' and c.norm_display = n.norm),
        ('full_name_exact', 350,
          c.norm_full <> '' and c.norm_full = n.norm),
        ('username_exact', 300,
          c.norm_username <> ''
          and (c.norm_username = n.norm or c.compact_username = n.compact)),
        ('alias_exact', 250, exists (
          select 1
          from public.player_import_aliases a
          where a.player_id = c.id
            and a.group_id = p_group_id
            and a.normalized_alias = n.norm
        )),
        ('display_name_partial', 200,
          length(n.norm) >= 3 and c.norm_display <> ''
          and (c.norm_display like n.norm || ' %' or n.norm like c.norm_display || ' %')),
        ('full_name_partial', 175,
          length(n.norm) >= 3 and c.norm_full <> ''
          and (c.norm_full like n.norm || ' %' or n.norm like c.norm_full || ' %')),
        ('username_partial', 150,
          length(n.norm) >= 3 and c.norm_username <> ''
          and (c.norm_username like n.norm || ' %' or n.norm like c.norm_username || ' %'))
      ) as v(match_reason, match_score, matched)
      where v.matched
    ) as s
  )
  select distinct on (sc.imported_name)
    sc.imported_name,
    sc.id as player_id,
    private.resolve_public_player_name(sc.id) as public_name,
    sc.is_linked,
    sc.match_reason,
    sc.match_score
  from scored sc
  where public.is_group_member(p_group_id)
  order by sc.imported_name, sc.match_score desc, sc.games_played desc, sc.id;
$function$
```

---

## 8. Owner smoke test — REQUIRED, not yet done

This replaced a function the live site calls on **every import analyze**. The
deployed reader was written to survive the coarse reasons and the bounds, and
that was verified at the source level (§3d) — but it has **never been exercised
against production**.

Exercise an import on the live site (tm-stats.com): run **Analyze** and open the
**review screen**, and confirm that player matching still behaves — names resolve
to the same players as before, matched/unmatched states look right, and the
dropdown still populates.

If anything looks wrong, the rollback in §7 is staged and byte-verified.

---

## 9. Remaining sequence — the oracle is still open

The mitigation buys time. It does not complete the work. In order:

1. **Design the manual-entry path.** Decide how an importer resolves a player
   the source-bound reader cannot match, without reintroducing a free-form
   name probe. This is the design decision the contraction is blocked on.
2. **Build or port the compatible source-bound reader.** It must consume the
   source-bound staging added by `20260722132159` (applied 2026-07-22 13:21 UTC)
   rather than free-form candidate names, and must not depend on
   `public.match_import_player_names`.
3. **Deploy that reader** and record the deploy in `DEPLOY-STATE.md`. Per the
   expand/contract rule, the reader that no longer needs the free-form matcher
   must be live and verified **before** anything is retired.
4. **Verify in production** that imports resolve identities through the new path
   only.
5. **Separately authorize and apply the contraction `20260722012707`
   (`retire_free_form_import_name_matcher`).** This is **not** authorized today.
   Until it lands, `authenticated` still holds `EXECUTE` on a `SECURITY DEFINER`
   function that confirms whether a submitted private name belongs to a real
   identity — **the enumeration oracle is OPEN.**

## 10. Recorded, not fixed: the `DEPLOY-STATE.md` fork

`DEPLOY-STATE.md` has forked. The copy on
`redesign/tm-stats-dashboard-rebuild` (updated by this work) is stale in its
"Current production" block — it names worker `c23bfbd7` @ `59dda6c0f`, six
deploys behind the live `178229f3`. The canonical copy lives on the live-site
lineage (newest `docs/*` deploy-record branch) and **also needs both database
entries**, `20260722132159` and `20260722144034`.

Reconciling the fork was explicitly out of scope here and is a separate task.
