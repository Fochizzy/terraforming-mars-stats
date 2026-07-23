# Phase 4, Step 4.3 — production ledger drift closed: `20260723014849` registered production-only

**Date:** 2026-07-23
**Branch:** `redesign/tm-stats-dashboard-rebuild`
**Base commit:** `0d1570708`
**Type:** local ledger reconciliation — documentation, state, and one executable
map file. No migration applied, no migration file added or changed, no deploy,
no push.

## Authorization

**No production read and no production write was authorized or performed.** No
Supabase MCP call, no `execute_sql` (including read-only `SELECT`), no
`list_migrations`, no `wrangler`, no `/api/deploy-info`, no production logs, no
direct database connection. Push was not authorized and was not performed. The
production-lineage worktree `C:\tmp\tm-live-compare-data` was read via `git
show` / `git ls-tree` from the redesign checkout only; nothing in it was edited,
committed, built, tested, or restarted.

Evidence classes used below: **[GIT]**, **[REPO]**, **[PROJECT-DOC]**,
**[PRIOR]**, **[INFERENCE]**. **[LIVE]** and **[PROVIDER]** are deliberately
absent — no production system was contacted.

## The drift

Migration `20260723014849 repair_snapshot_player_ids` is applied in production.
It is the **data half** of the live-site saved-game player-label release,
applied ~01:48Z on 2026-07-23 ahead of its own frontend, repointing 33 stale
player ids across 13 finalized games inside `game_revisions.snapshot`.
**[PROJECT-DOC]** — canonical `DEPLOY-STATE.md` on
`fix/live-compare-data-remove-declared-style`.

This lineage had **no record of it in any form**. Each absence was established
separately **[GIT]**:

| Absence | How established | Result |
| --- | --- | --- |
| No migration file | `git ls-tree redesign/… -- supabase/migrations/20260723014849_…sql` | empty |
| No file at any `20260723*` version | `git ls-tree redesign/… supabase/migrations/ \| grep 20260723` | exit 1 |
| No ledger-map entry, no doc row | `git grep '20260723014849\|repair_snapshot_player_ids' redesign/… -- src/ docs/ supabase/` | exit 1 |
| No working-tree file | `ls supabase/migrations/ \| grep 20260723` | exit 1 |

Meanwhile `PRODUCTION_LEDGER_ATTESTATION` read **113 entries, head
`20260722153233`**, against production's **114, head `20260723014849`**.

**Why it mattered.** The expand apply of `20260722160000` has a precondition
that the attested ledger match production. It was false by exactly one
migration, and a worker session had already stopped on it. Closing the drift
makes that precondition true and does nothing else.

## Treatment: registered production-only; file deliberately NOT carried

The ledger map supports two treatments. A source file for this migration **does
exist** on the production lineage — `75f6e0794`, blob
`1a1d70905bbabe450c90b6a40fc87b1527c9375e` **[GIT]** — and it was still
registered rather than carried.

**The discriminator is not whether a file exists somewhere. It is whether this
lineage records a stale definition the migration corrects.** The #106 carry
(`20260721173000`) was made for a stated reason **[PRIOR]**, quoted from
`REDESIGN_STATE.md`: this lineage's record of the three claim RPCs was still the
"pre-fix, vulnerable" definitions, "so a later redesign deploy or `db diff`
could have reproduced them and silently restored the enumeration oracle in
production. That is what this closes." That hazard requires the migration to
**define** something.

`20260723014849` defines nothing **[REPO]**. Every DDL verb in the file was
enumerated; the complete list is two statements:

```
create table if not exists private.mig_snapshot_player_remap_20260722 as …
create table if not exists private.mig_backup_snapshot_player_ids_20260722 as …
```

No function, view, policy, constraint, column, index or grant is created,
altered or dropped. The substance is an `UPDATE` of
`public.game_revisions.snapshot` row values. There is therefore no definition on
this lineage that is stale and nothing a deploy or diff could reproduce
wrongly — the #106 condition is absent, so its remedy does not apply.

Three further points agree, none specific to this migration:

1. **The nearest structural precedent already went this way.** **[REPO]**
   `20260721193508 fold_player_card_outcome_context_into_definer` is also a file
   present on `fix/live-compare-data-remove-declared-style` (`814e60210`), and it
   carries real schema surface — a definer-function fold — unlike this one. It
   was registered production-only, by the same session that carried #106.
   Presence of a file on the production lineage has never by itself been a
   reason to carry.
2. **Repository convention is uniform, with no counter-example.** **[REPO]** No
   file in `supabase/migrations/` creates a `private.mig_*` table or repairs
   production rows — zero of 55, verified by grep. `DEPLOY-STATE.md` records
   several production data repairs that did exactly that (2026-07-12 group
   collapse/split with `mig_backup_game_players`; 2026-07-20 duplicate-group
   consolidation with `private.mig_backup_group_*`) **[PROJECT-DOC]**; every one
   is a production-only ledger entry with no repo file. Carrying this would be
   the first exception.
3. **Carrying would corrupt what the harness models.** **[REPO]**
   `supabase/tests/executable/run.sh:143` replays every non-deferred file in
   `supabase/migrations/` against a clean baseline, and `seed.sql` does not load
   until line 162. A one-time repair of production rows that cannot exist at
   that point models nothing and would leave two empty `private.mig_*` tables in
   every disposable cluster.

**Conclusion.** Registered in `PRODUCTION_ONLY_LEDGER_VERSIONS` with an entry in
`PRODUCTION_ONLY_ENTRY_PROVENANCE`. It is recorded as **applied**, and it is
**not** in `GATED_UNAPPLIED`.

## Hazard class: `neutral`, derived from the SQL

- No `REVOKE`, no `DROP`, no tightened constraint, no narrowed vocabulary, no
  rebuilt function → **not a contraction**.
- The two tables it adds live in `private` — outside Data API reach since
  `20260719191911` — carry no grant and have no reader, so **no contract surface
  is widened** either. The additive DDL is audit bookkeeping, not a surface any
  deployed reader or writer depends on.
- What remains is a data-only reconciliation, which is the `neutral` definition:
  "no contract surface change at all: data-only seeds and reconciliations".

Corroboration, independently derived: the canonical `DEPLOY-STATE.md` describes
it as "a data-only repair of `game_revisions.snapshot`: no DDL on any
application table, no grant, no revoke … schema-neutral in both directions" —
the property that also makes rolling its paired frontend back safe.
**[PROJECT-DOC]**

**It is recorded in prose only, not in `MIGRATION_HAZARD_CLASS`.** A
production-only entry carries no hazard declaration by construction, and the
drift test actively fails a declaration for a version with no file on this
branch ("hazard class declared for X, which has no migration file on this
branch"). The derivation is recorded in the constant's comment, the reference
document, `REDESIGN_STATE.md`, and here.

**Considered and rejected:** `expansion`, on the literal reading that the file
creates two new tables and "the strongest present wins". Rejected because the
hazard dimension asks "what does applying it do to a deployed reader or writer",
and two ungranted, unreachable `private` audit artifacts are not a surface any
reader has. Both classes are non-gating, so the operational conclusion is
identical either way; `neutral` is the accurate one.

## Version drift: none, stated explicitly

Filename version `20260723014849` **equals** ledger version `20260723014849`.
It is neither a renamed apply nor a name-keyed pairing, and appears in neither
`APPLIED_UNDER_DIFFERENT_LEDGER_VERSION` nor
`APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME`.

This is recorded rather than passed over because the **eight** preceding applies
whose source file is known all drifted **[REPO]**: `20260720221937`,
`20260721035955`, `20260721081355`, `20260721193508`, `20260721201734`,
`20260722132159`, `20260722144034`, `20260722153233`. This is the first that did
not. The reason is visible in the file's own header — its repo copy was written
after the apply and named to the ledger version deliberately.

## Attestation provenance — recorded honestly

`PRODUCTION_LEDGER_ATTESTATION` is a constant whose name asserts a production
attestation. **This session made no production read.** The values are
transcribed from the canonical `DEPLOY-STATE.md` on the production lineage,
where an earlier **authorized** session recorded them from two independent live
reads on 2026-07-23 **[PROJECT-DOC]**:

1. the "Current production" row, re-derived during the 01:58Z saved-game
   player-label deploy (`wrangler deployments list`, a read-only
   `supabase_migrations.schema_migrations` query, HTTP probes);
2. the read-only "Snapshot repair verification" that followed it, which
   re-derived **the same 114 entries and the same head**.

That provenance is written into the constant's own comment, the reference
document, and `docs/CURRENT_STATUS.md`. These values are a committed repository
record **of** a live read — not a live read. Re-attest live before any
production-sensitive action, as the standing rule already requires.

## Changes

| File | Change |
| --- | --- |
| `src/lib/db/migration-ledger-map.ts` | attestation → 114 / `20260723014849` / `repair_snapshot_player_ids` / 2026-07-23 with provenance comment; previous snapshot → 113 / `20260722153233`; `20260723014849` appended to `PRODUCTION_LEDGER_VERSIONS` and `PRODUCTION_ONLY_LEDGER_VERSIONS`; provenance entry added with the treatment and hazard reasoning; header comment date corrected |
| `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` | snapshot → 114 with a provenance blockquote; new "The 114th entry" section; new "Registered production-only rather than carried" section; production-only register 68 → **69**; hazard totals re-counted and confirmed unchanged |
| `docs/CURRENT_STATUS.md` | attestation line replaced; expand-apply precondition now satisfied and still unauthorized |
| `docs/REDESIGN_STATE.md` | current-substep note; full reconciliation section; this handoff added to the active group |
| `docs/agent-handoffs/PHASE-04-STEP-03-LEDGER-DRIFT-20260723014849-RECONCILED.md` | this file |

**No file under `supabase/migrations/` was added, changed, or removed.** The
only `src/` file touched is `migration-ledger-map.ts`.

Every figure was re-derived from the executable file and the migrations
directory, not copied: 113 → 114 ledger literals (all unique, ascending, head
matching); production-only register 68 → 69; hazard declarations unchanged at
**16 contraction / 30 expansion / 9 neutral across 55 files**, because no file
was added.

## Validation

All exit codes read directly.

| Check | Result |
| --- | --- |
| `npx vitest run src/lib/db/migration-ledger-map.test.ts` | 11/11 pass — the bidirectional gate, both directions |
| `npm run validate:claude-context -- --require-maintenance` | see commit record |
| `npx tsc --noEmit` | see commit record |
| `npx vitest run --no-file-parallelism` | see commit record |
| `npm run lint` | four baseline warnings, none new |
| `bash supabase/tests/executable/run.sh` | passes end to end |
| `npm run build` | see commit record |
| `git diff --check` | clean |

**What the new entry does in the harness: nothing, and that is the
confirmation.** No file was added, so the clean-baseline replay is byte-for-byte
the same set of 55 migrations as before; the reconciliation cannot have affected
it. Had the file been carried it would have replayed against an empty
`game_revisions` — its selection CTE finding no affected games, every `RAISE`
assertion evaluating zero rows and passing — a clean but meaningless no-op that
left two empty audit tables behind.

## Not changed

- **Step 4.3 is not marked complete.**
- No other blocker's disposition moved.
- `20260722160000` remains **gated and unapplied**. Its ledger precondition is
  now satisfied; the apply itself requires a new explicit authorization.
- `20260722012707`, the reader deploy, the CONTRACT drop, the production ACL
  read, the tile backfill, guest re-neutralization, the closure audit, and Step
  4.4 are all untouched.

## Discrepancy carried forward — not fixed here

The **code half** of the same production release — `c7d6c203a`, the
`listSavedGames` labelling fix in `src/lib/db/game-draft-repo.ts` — is **not** an
ancestor of this branch (`git merge-base --is-ancestor` exit 1) **[GIT]**. This
lineage still labels finalized saved games from `game_revisions.snapshot`, the
frozen document the live-site lineage moved away from. Production's data is
already repaired, so nothing is visibly broken today, but the durability fix is
absent here and a future roster rewrite would reintroduce the raw-uuid symptom on
this lineage. Out of scope for this assignment; recorded for the owner.

## Next

Nothing is started. The expand apply of `20260722160000` is the next gate and
requires a new explicit owner authorization.
