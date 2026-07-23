# Phase 4, Step 4.3 — Investigation consolidation (2026-07-23)

Bounded local consolidation. Lands two read-only investigation branches on
`redesign/tm-stats-dashboard-rebuild`, records their outcomes where the blockers
and pending decisions live, publishes the planning pack, pushes the two branches
that were behind their remotes, and removes the two investigation worktrees.

**Decides nothing, builds nothing, fixes nothing.** No production system was
accessed: no Supabase call of any kind, no `wrangler`, no `/api/deploy-info`, no
deploy, no migration application, no backfill, no grant and no revoke. No file
under `src/**`, `supabase/**` or `scripts/**` was created or changed. Everything
recorded below in the "what was recorded" section is evidence class **[PRIOR]**
— it comes from the two merged handoffs, not from work done in this session.

---

## 1. What was landed

Two `--no-ff` merges, in a stated order.

| # | Merge commit | Source | Source tip | Merge-base |
|---|---|---|---|---|
| 1 | `9b912b49b` | `investigate/matcher-overload-scoping` | `9d742aef0` | `6a232efa3` (= pre-merge HEAD) |
| 2 | `bf3711430` | `investigate/draft-name-residue` | `29e166003` | `fa6f56177` (HEAD~1) |

Pre-merge HEAD was `6a232efa3` [GIT]. Both merge commits retain both parents.

**Order and reasoning.** `investigate/matcher-overload-scoping` was merged first
because its merge-base **is** the pre-merge HEAD, so a `--no-ff` merge of it
cannot conflict. `investigate/draft-name-residue`, based one commit further back,
was merged second. Both sources prepend to the same active handoff group, so the
reverse order would have exposed **both** merges to a conflict in that list;
this order bounds it to exactly one.

Each source diff was confirmed to touch **only `docs/**`** before merging [GIT]:

- `investigate/draft-name-residue` — `docs/REDESIGN_STATE.md`,
  `docs/agent-handoffs/PHASE-04-STEP-03-DRAFT-NAME-RESIDUE-INVESTIGATION.md`
- `investigate/matcher-overload-scoping` — `docs/REDESIGN_STATE.md`,
  `docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-DESIGN-SCOPING.md`

### 1.1 The one conflict, and how it was resolved

Merge 2 conflicted in `docs/REDESIGN_STATE.md`, confined to the first contiguous
bullet group under `## Latest handoff`. The conflict was **purely additive**:
`HEAD` carried the MATCHER-OVERLOAD and GUEST-IDENTITY entries, and the incoming
side carried the DRAFT-NAME-RESIDUE entry.

Resolution kept **both sides in full**, newest first by commit timestamp:

1. `PHASE-04-STEP-03-MATCHER-OVERLOAD-DESIGN-SCOPING.md` (06:43:43 −04:00)
2. `PHASE-04-STEP-03-DRAFT-NAME-RESIDUE-INVESTIGATION.md` (06:25:38 −04:00)
3. `PHASE-04-STEP-03-GUEST-IDENTITY-PRODUCTION-CATALOG-READ.md` (06:08:53 −04:00)

followed by the pre-existing entries in their original relative order. That
ordering reproduces exactly what a linear history would have produced.

Nothing was dropped, reordered relative to its neighbours, or reworded, and **no
blank line was introduced inside the group** — a blank line ends the group and
would collapse the validator's active-handoff count. The resolved file was
rebuilt from exact line ranges rather than retyped, and proven line-multiset
identical to the conflicted file minus its three conflict markers, so the
resolution is provably additive [GIT].

Active handoff count: **27 → 29** after the two merges.

---

## 2. What was recorded, and where

`docs/CURRENT_STATUS.md` only. `docs/redesign/DECISIONS.md` was **not** edited,
no blocker's `Blocking` value was changed, nothing was reclassified, and no
pending decision was resolved.

### 2.1 `DRAFT-NAME-RESIDUE` blocker row

Status rewritten to record that the finding is **settled by execution** and that
the independent audit **understated** it on three counts:

1. **reachability is PROVEN**, not `[INFERENCE]` — a probe drove the real save
   path against a disposable cluster replaying the real migration history;
2. the name persists at **six sites**, not one class of record;
3. it **survives finalization permanently** — revisions are never deleted, and
   the finalized snapshot itself carries the residue.

Also recorded: **exposure** is every group member plus any linked participant of
a finalized game, and it reaches the browser of someone who never typed the name
— not the drafting user alone.

A fourth correction, to the finding's wording: the phrase "must never enter
draft snapshots" tracks a **code comment about a different field**, not a
contract clause. The clause actually engaged is the privacy contract's
**unqualified "browser hydration data"** boundary.

**The `Blocking` value is deliberately UNCHANGED.** Whether this blocks Step 4.3
closure is an owner decision, and the row now says so explicitly.

### 2.2 The audit trail is not rewritten

`docs/agent-handoffs/PHASE-04-STEP-03-ID-READER-INDEPENDENT-AUDIT-TRAIL.md` is a
historical record of what each audit found and was **left untouched**. The
correction was made to the current record instead, with a pointer added beside
the audit-trail bullet in `CURRENT_STATUS.md` so a reader of that bullet is sent
to it.

### 2.3 PD-1 — the three-argument matcher overload

Five scoping findings recorded, **without resolving PD-1**:

1. the overload **shape survives** the ambiguity lesson, because the base
   signature carries no defaults — proven on a cluster with the guest-identity
   failure reproduced as a control;
2. the third parameter **must carry no default**; `default null` reproduces
   `42725` on every existing two-argument call at expand time, and the amendment
   does not say so;
3. **HIGH** — a null requesting-user id yields zero rows and **no error**, and
   the helper an implementer would naturally reuse returns `null` on failure by
   design, so verification must confirm **non-zero matches**, not absence of
   error;
4. there are **three** call sites, not the two the amendment names, all
   funnelling through one wrapper;
5. the contraction **re-gates rather than closes** — its body revokes from
   `public`/`anon`/`authenticated` only, so `service_role` keeps `EXECUTE` and
   the two-argument function survives as a live callable object. Any
   post-contraction status line must say **"re-gated"**, never "closed".

Also recorded: whether `SUPABASE_SERVICE_ROLE_KEY` is bound on the live Worker
is **[UNVERIFIED]** and is a precondition of any overload build. The repository
cannot settle it.

---

## 3. Canonical documents reviewed, updated, or intentionally unchanged

| Document | Disposition |
|---|---|
| `docs/CURRENT_STATUS.md` | **Updated** — blocker row, audit-trail pointer, PD-1 |
| `docs/REDESIGN_STATE.md` | **Updated** — conflict resolution plus this entry |
| `docs/redesign/DECISIONS.md` | **Intentionally unchanged** — resolving PD-1 is the owner's act |
| `docs/agent-handoffs/…-ID-READER-INDEPENDENT-AUDIT-TRAIL.md` | **Intentionally unchanged** — historical record |
| `docs/AUTHORITATIVE_DOCUMENTS.md` | **Intentionally unchanged** — no authority added, moved, superseded or archived |
| `docs/redesign/CLAUDE-PROJECT-SOURCES.json` | **Intentionally unchanged** — no new durable cross-project guidance document |
| `docs/redesign/MASTER-PLAN.md` | **Reviewed, intentionally unchanged** — no change to goals, governance, phase structure, durable architecture, contracts, gates or the documented current phase; this is consolidation of already-recorded findings |
| `docs/redesign/MASTER-RULES.md`, `CLAUDE.md` | **Intentionally unchanged** — governing rules |

---

## 4. Scope boundary

This consolidation authorizes nothing. It does not start, and must not be read
as starting:

- building the three-argument overload, or any part of it;
- fixing `DRAFT-NAME-RESIDUE`;
- resolving PD-1, PD-2, PD-3, or the `DRAFT-NAME-RESIDUE` closure question;
- the `ID-READER-CONTRACT` drop, contraction `20260722012707`, the reader
  deploy, or any production read;
- the tile-attribution backfill, guest re-neutralization, the closure audit, or
  Step 4.4.

**Step 4.3 is not marked complete.** No blocker's disposition changed.
