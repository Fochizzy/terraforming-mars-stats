# Phase 4 Step 4.3 — tile backfill / guest re-neutralization ordering correction

- Date: 2026-07-23
- Lineage: `redesign/tm-stats-dashboard-rebuild` (redesign primary worktree)
- Base commit: `92d4f6917`
- Mode: **documentation only**. No `src/**`, `supabase/**` or `scripts/**` file
  was created or changed. No production access of any kind — no Supabase MCP
  call, no `execute_sql`, no `list_migrations`, no wrangler, no
  `/api/deploy-info`, no production log read, no direct database connection.
  No deploy, no migration applied, no backfill, grant, or revoke. Nothing
  pushed. Push was not authorized.
- **Decides nothing, authorizes nothing, schedules nothing, fixes nothing.**

## What this corrects

Four passages in the project record placed the tile-attribution backfill and
guest re-neutralization **after** the identity release sequence. A read-only
investigation found that pair **independent** of that sequence and found the
recorded position **unjustified**. This session marked those four passages
superseded, repaired an omission in the current-work router, and recorded a
finding about re-neutralization's durability.

**It does not assert a new schedule.** The pair is not moved earlier, later, or
into parallel. Where to schedule it is an owner decision that has not been made.

## The one thing that did not change

**The backfill MUST run before guest re-neutralization.** This constraint is
confirmed, real, and irreversible if violated:

| Signal | Resolves |
|---|---|
| `players.display_name` first token | 114 / 114 |
| `player_import_aliases` | 45 / 114 |
| `user_profiles.username` | 0 / 114 |
| private personal first name | 0 / 114 |

Two rows (game `46bde90c…`, actor "Jenna") resolve **solely** through the
remaining unlinked guest's `public.players.display_name`. Re-neutralization
overwrites exactly that column for exactly unlinked players, and restoring the
personal labels is deliberately excluded from rollback —
`tile-attribution-rollback.sql` restores `player_id` / `game_player_id` only.
Reversing the order makes those rows **permanently unattributable**, not merely
ambiguous.

Its four authoritative statements were left **byte-unchanged**, and that was
proven rather than asserted (see "Protected locations" below):

- `supabase/verification/tile-attribution-dry-run.sql` — ORDERING CONSTRAINT block
- `supabase/verification/tile-attribution-backfill.sql` — do-not-execute preconditions
- `docs/agent-handoffs/PHASE-04-STEP-03-THIRD-REMEDIATION-PARTIAL-HANDOFF.md` —
  "Load-bearing ordering constraint" and its evidence table
- `docs/REDESIGN_STATE.md` — the "Ordering correction" paragraph

## Verification performed before acting — every claim re-derived

The independence finding reaches this session as assignment text from a
read-only investigation that left no committed handoff on this lineage
(evidence class **[PRIOR]**, the same route the earlier targeted re-audit took).
Its load-bearing halves were re-derived here **[REPO]/[GIT]** before anything
was edited.

### The backfill matches on `display_name` and nothing else — CONFIRMED [REPO]

Identical predicate in both files
(`tile-attribution-dry-run.sql:56-57`, `tile-attribution-backfill.sql:42-43`):

```sql
where lower(btrim(p.display_name)) = lower(u.actor_text)
   or lower(split_part(btrim(p.display_name), ' ', 1)) = lower(u.actor_text)
```

Both branches read `players.display_name`. There is **no** alias, username, or
private personal-name fallback anywhere in either file.

### Neither operation touches an identity-sequence object — CONFIRMED [REPO]

`grep` for `resolve_import_guest_identity`, `create_or_reuse_guest_identity`,
`match_import_player_names`, `player_import_aliases`, `player_legacy_identities`
across all three `tile-attribution-*.sql` files returns **zero hits** (exit 1).
The backfill's object set is `private.mig_backup_tile_attribution_20260720`,
`public.game_log_events`, `public.game_log_imports`, `public.game_players`,
`public.players`.

Converse direction: the three release-sequence migrations `20260722012658`,
`20260722012707` and `20260722160000` contain **no** `update … players`, **no**
grant or revoke on `players`, and **no** reference to `game_log_events` or
`game_players`. (`20260722012658` names `public.game_log_imports` twice — once as
an FK target, once in a join — neither of which the backfill's write to
`game_log_events.player_id` / `game_player_id` affects.)

**Recorded nuance, in favour of the finding.** `create_or_reuse_guest_identity`
does write `public.players.display_name`, but only when **inserting a new row**,
and it writes an already-neutral `private.neutral_unlinked_player_label(...)`
value (`20260722160000:296-299`). It never updates an existing row's
`display_name`, so it cannot destroy the backfill's evidence and the backfill
cannot disturb it. The shared object is the pre-existing table `public.players`,
which the release sequence neither creates, drops, nor re-grants.

### The position was never justified — CONFIRMED [PROJECT-DOC]/[GIT]

Each of the four passages gives a reason **only** for the pair-internal
ordering (backfill before re-neutralization). **None** states any reason for
placing the pair after the identity work. `git log -S "backfill before guest
re-neutralization" -- docs/` returns a single commit (`3e7b1b183`, "reconcile
Step 4.3 state before remediation") that introduces the ordering without
justifying that placement.

### The router omission — CONFIRMED [REPO]

At base commit `92d4f6917`, `grep -in "neutraliz"` and
`grep -in "tile.attribution\|backfill"` against `docs/CURRENT_STATUS.md` both
returned **exit 1 — no matches**. A reader following the designated first-read
router alone would not have learned the constraint exists.

### Re-neutralization has no package — CONFIRMED [REPO]

`git grep -i neutraliz` across `supabase/`, `scripts/` and `src/` returns only
the two tile-attribution SQL files (which reference re-neutralization as a
constraint) and an unrelated `src/lib/imports/fixtures/FIXTURES.md` line. No
file is named `*neutral*`. **No SQL file, no dry run, no rollback, and no
expected row count for re-neutralization exists anywhere in the repository.**

### The three live writers — CONFIRMED [GIT], and stronger than reported

Swept at production source commit
`865df0108f2f7b9df000ad3aeb8fcd394e6242a5` (on
`fix/live-compare-data-remove-declared-style`, the production lineage). Exactly
three code paths write personal-name material into `public.players`:

1. **`createPlayerIfMissing`** — `src/lib/db/player-repo.ts:141`

   ```ts
   .from('players')
   .insert({
     display_name: input.displayName,
     full_name: normalizeOptionalText(input.fullName),
     group_id: input.groupId,
     linked_user_id: input.linkedUserId ?? null,
     username: normalizeOptionalText(input.username),
   })
   ```

2. **`updatePlayerIdentity`** — `src/lib/db/player-repo.ts:183`

   ```ts
   .from('players')
   .update({
     full_name: normalizeOptionalText(input.fullName),
     username: normalizeOptionalText(input.username),
   })
   ```

   Its own doc comment: "Used when an import is confirmed so the identity typed
   in review lands on the routed group's player."

3. **`resolveOrCreateImportGroup`** — `src/lib/db/import-group-repo.ts:595`,
   through the **admin** client

   ```ts
   .from('players')
   .insert(
     participantIdentities.map((participant) => ({
       display_name: participant.displayName,
       group_id: group.id,
       linked_user_id: participant.linkedUserId,
     })),
   )
   ```

**The bypass is total, not partial.** `git grep` for
`create_or_reuse_guest_identity` or `resolve_import_guest_identity` across
`src/` at that commit returns **zero hits** — the deployed source calls neither
identity RPC anywhere.

**None of the three is touched by** the expand (`20260722160000`), the reader
deploy (`ID-READER-DEPLOY`), the 7-argument drop (`ID-READER-CONTRACT`), or
contraction `20260722012707` [REPO].

## The finding that matters most — `GUEST-LABEL-REDIRTY`

**Re-neutralization is a one-shot cleanup that ordinary live use re-dirties.**

Consequence, stated plainly: **re-neutralization will be undone by the next
import that creates participants, and its durability is gated on a LIVE-SITE
CODE CHANGE that appears nowhere in the recorded release sequence.** The record
currently orders re-neutralization after the identity work as though that would
make it stick; **it will not**. That last step is **[INFERENCE]** — drawn from
the three writers plus the zero-hit RPC sweep — and the inference is simply that
ordering alone cannot keep a repeatedly-written column neutral.

Recorded as its own tracked item `GUEST-LABEL-REDIRTY` in the
`docs/CURRENT_STATUS.md` blocker table, with `Blocking` = "Nothing today;
re-neutralization durability". **No existing blocker was reclassified.**

**Not scoped, not designed, not begun.** The identity RPC path is clean — it
inserts new rows already neutral-labelled — so routing these writers through it
is the obvious direction, but choosing and building that fix is a **separate
assignment** and was deliberately not started.

### Secondary observation — flagged, not adjudicated

`public.players.full_name` and `username` continue to be written by writers (1)
and (2) after the 6 unlinked rows were preserved into
`private.player_legacy_identities` on 2026-07-19
(`docs/redesign/reports/phase-04-step-03-privacy/f01-completion-production.md`).
That private preservation is therefore a **point-in-time snapshot that ongoing
writes have moved past**. Read **access** is contained by the existing column
revokes — `authenticated`/`anon` cannot read `full_name` or `username`. The
**accumulation** is not contained. Whether that matters is an owner question and
is **not answered here**.

## Corrections made — four locations

| # | Location | Before | After |
|---|---|---|---|
| 1 | `docs/REDESIGN_STATE.md`, "Remaining Step 4.3 blockers, in required order", items 2–3 | Ordered list places backfill (2) and re-neutralization (3) after the identity fix (1); no reason given for that placement | Items 2 and 3 left **verbatim**; a bracketed note inserted after item 3 marking their **POSITION** superseded, restating that the constraint inside item 2 is not, and stating that no new position replaces it |
| 2 | `docs/REDESIGN_STATE.md`, "Next action" | "After that authorization gate, the required sequence is: tile-attribution backfill before guest re-neutralization; guest re-neutralization; …" | Paragraph left **verbatim**; a bracketed `[SUPERSEDED IN ONE RESPECT]` note appended, scoped to the placement only, reaffirming the final sentence as exact and absolute |
| 3 | `docs/redesign/MASTER-PLAN.md`, "Step 4.3 stays blocked in this order" | "… run the tile-attribution backfill before guest re-neutralization; perform guest re-neutralization; …" | Clause left **verbatim**; a second `[SEPARATELY SUPERSEDED]` bracket added beside the existing one, in that file's established style |
| 4 | `docs/redesign/MASTER-PLAN.md`, "Next gated work" | "Then tile attribution before guest re-neutralization; guest re-neutralization; …" | Clause left **verbatim**; a second `[SEPARATELY SUPERSEDED]` bracket added beside the existing one |

In all four, the original text is **retained as history** and the pair-internal
constraint is restated prominently alongside the superseding note.

### A fifth occurrence, deliberately not edited

`docs/agent-handoffs/PHASE-04-STEP-03-THIRD-REMEDIATION-PARTIAL-HANDOFF.md`
§"Next actions" items 3–4 also place the pair after other work. That file is one
of the four protected locations and is outside this session's permitted edit
set; it is a **historical record of what that session recommended** and is
correctly left byte-unchanged. This handoff is where the correction lives.

## Router repair — `docs/CURRENT_STATUS.md`

Added, under "Next work item":

- a new subsection "**Also outstanding: the tile-attribution backfill and guest
  re-neutralization**", opening with the ordering constraint stated plainly and
  prominently, with the 114/45/0/0 evidence coverage and the rollback exclusion;
- the explicit record that their position in the numbered sequence is
  superseded, that they are independent, that **no new position replaces it**,
  and that scheduling is an owner decision;
- a requirements table contrasting the two: the backfill has a full package and
  is reversible; **re-neutralization has NONE — no SQL file, no dry run, no
  rollback, no expected row count** — and is irreversible for the personal
  labels;
- the pinned population (114 rows / 3 games / 3 imports / 0 excluded, measured
  2026-07-20) recorded as **[UNVERIFIED]** against production today, with the
  note that the package fails closed on drift and may need re-review before it
  can run at all;
- the new `GUEST-LABEL-REDIRTY` tracked row in the blocker table.

## Protected locations — proof, not assertion

| Location | Proof | Result |
|---|---|---|
| `tile-attribution-dry-run.sql` | blob `453e52b7d85f3350bda0d3e783cda384010b2869` == `HEAD:` | **IDENTICAL** |
| `tile-attribution-backfill.sql` | blob `fb25793871efb3b3d155ea677d4871a9453e4382` == `HEAD:` | **IDENTICAL** |
| `THIRD-REMEDIATION-PARTIAL-HANDOFF.md` | blob `07b3214744d4b27c2ce9f92abee1a17a06fee47f` == `HEAD:` | **IDENTICAL** |
| `REDESIGN_STATE.md` "Ordering correction" | `git diff -U0` hunk headers are `@@ -1232,0 +1233,35 @@` and `@@ -2196,0 +2232,21 @@` — both `-N,0`, i.e. **pure insertions, zero lines removed anywhere in the file** | **IDENTICAL** (shifted 1302→1337) |

`git status --porcelain -- supabase src scripts` is empty: nothing under those
trees changed. `tile-attribution-rollback.sql` is also unchanged
(`613117a56d27d829e895eaef9f05a38476c53128`).

## Validation

| Check | Result |
|---|---|
| `npm.cmd run validate:claude-context -- --require-maintenance` (pre-edit baseline) | exit 1 with **only** the two expected maintenance requirements; **no** deploy-state provenance error, so the pack is not stale |
| `npm.cmd run validate:claude-context -- --require-maintenance` (pre-commit) | pass |
| `git diff --check` | clean |
| Active handoff count | 30 → 31, exactly one higher; no blank line introduced in the group |

**Deliberately skipped, and NOT claimed:** `npx tsc --noEmit`, `vitest`,
`npm run lint`, `bash supabase/tests/executable/run.sh`, and `npm run build`.
This change touches no code — no `src/**`, `supabase/**` or `scripts/**` file —
so those checks would prove nothing about it, and another session was running a
heavy build on the same machine that they would have contended with for CPU.
Their last known-green results stand from the runs already recorded in the
project state; this session did not re-run them and does not assert them.

## Scope discipline

- **No schedule asserted.** Neither operation is said to run first, in parallel,
  or at any particular point.
- **Nothing authorized.** Executing the backfill, executing re-neutralization,
  running a fresh dry run, building a re-neutralization package, fixing the live
  writers, pushing this branch, and every step of the identity release sequence
  all remain unauthorized and were not started.
- **No blocker reclassified**, no pending decision resolved, PD-1/PD-2/PD-3 left
  untouched, Step 4.3 **not** marked complete, Step 4.4 not started.
- `docs/redesign/DECISIONS.md`, `MASTER-RULES.md`, `CLAUDE.md` and every
  governing rule file left untouched.

## Documents reviewed

| Document | Disposition |
|---|---|
| `docs/CURRENT_STATUS.md` | **Updated** — new subsection + `GUEST-LABEL-REDIRTY` row |
| `docs/REDESIGN_STATE.md` | **Updated** — two superseded markers + this handoff at the head of the active group |
| `docs/redesign/MASTER-PLAN.md` | **Updated** — two superseded brackets |
| `docs/AUTHORITATIVE_DOCUMENTS.md` | Reviewed, intentionally unchanged — no authority added, moved, superseded, or archived |
| `docs/redesign/DECISIONS.md` | Reviewed, intentionally unchanged — no durable decision was approved |
| `docs/redesign/MASTER-RULES.md`, `CLAUDE.md`, `PAGE-ARCHITECTURE.md` | Reviewed, intentionally unchanged |
| `supabase/verification/tile-attribution-*.sql` | Read only; **byte-unchanged** |
| `PHASE-04-STEP-03-THIRD-REMEDIATION-PARTIAL-HANDOFF.md` | Read only; **byte-unchanged** |
| `docs/redesign/reports/phase-04-step-03-privacy/f01-completion-production.md` | Read only — source of the private-preservation baseline |
| Production lineage `865df0108f` (`src/lib/db/player-repo.ts`, `import-group-repo.ts`) | Read only via `git show` / `git grep` |

## Next actions — none started

1. **Owner decision:** when to schedule the tile-attribution backfill and guest
   re-neutralization, now that their recorded position is superseded and no
   replacement is asserted. The pair-internal order is fixed; the pair's position
   is not.
2. **Owner decision:** whether to build a re-neutralization package at all,
   given it has none, and whether the backfill's 2026-07-20 population needs
   re-measuring first.
3. **Separate assignment:** `GUEST-LABEL-REDIRTY` — the three live-lineage
   writers. Not scoped here.
4. Everything already gated remains gated: `ID-READER-DEPLOY`,
   `ID-READER-CONTRACT`, `ID-LEGACY-ORACLE`, the closure audit, Step 4.4.
