# DRAFT-NAME-RESIDUE — reachability investigation

Read-only investigation. **Nothing was fixed.** No production read, no
production write, no deploy, no migration applied, no push. One local commit
containing this handoff and its `docs/REDESIGN_STATE.md` pointer.

- Repository: `Fochizzy/terraforming-mars-stats`
- Base branch: `redesign/tm-stats-dashboard-rebuild` at `fa6f56177`
  (the assignment reported `0d1570708`; re-derived, local is one commit ahead
  of `origin` at `0d1570708`, and the assignment said not to pin)
- Task branch: `investigate/draft-name-residue`
- Worktree: `C:\tmp\tm-draft-name-residue` (fresh, real `npm ci`, exit 0)
- Date: 2026-07-23

## Verdict

**The finding is real and was UNDERSTATED.** Reachability was converted from
[INFERENCE] to executed fact against the real save path. Severity stays
**MODERATE**.

## 1. Reachability — PROVEN by execution

A probe drove the **real** save path — `logGameDraftSchema.parse` →
`resolveLogGamePlayerReferences` → `saveDraftGame` → the `game_revisions`
insert — against a disposable PostgreSQL 18 cluster carrying the replayed real
migration history (`supabase/tests/executable/bootstrap.sql` plus the migration
replay used by `supabase/tests/executable/run.sh`). Only the Supabase
**transport** was adapted; every function under test is the shipped one. The
persisted row was then read back with raw SQL, bypassing the application
entirely.

Sentinels only. No real personal name was used anywhere.

The persisted `public.game_revisions.snapshot` contained
`Zsentinelfirst Qsentinellast` — a seat the user had **removed**:

```json
"awardClaims": { "award-landlord": {
    "funded": true,
    "fundedByPlayerId": "Zsentinelfirst Qsentinellast",
    "firstPlaceWinnerPlayerIds": ["Zsentinelfirst Qsentinellast"],
    "secondPlaceWinnerPlayerIds": ["dbe17560-c9e2-4581-929e-85f8c7e0b508"] } },
"playerScores": { "Zsentinelfirst Qsentinellast": { "trPoints": 22, "totalPoints": 63 }, ... },
"playerStyles": { "Zsentinelfirst Qsentinellast": { "primaryStyleCode": "engine", ... } },
"milestoneClaims": { "milestone-builder": {
    "claimed": true, "winnerPlayerId": "Zsentinelfirst Qsentinellast" } },
"playerSelections": { "Zsentinelfirst Qsentinellast": { "corporationId": "corp-a", ... } },
"selectedPlayerIds": ["dbe17560-c9e2-4581-929e-85f8c7e0b508"]
```

**The contrast is what proves the mechanism.** The *retained* seat's typed name
WAS resolved to a real player UUID (`dbe17560-…`) through the real
`create_or_reuse_guest_identity` RPC, exactly as designed. Only the *removed*
reference stayed as raw typed text. The two seats went through the same code in
the same call; the sole difference is membership in `selectedPlayerIds`.

### Mechanism, with line references [REPO]

1. `src/features/games/log-game/players-step.tsx:78-80` — a manually typed
   player who is not on the group roster gets
   `signupFullNameSchema.parse(rawValue)` as its reference. **The reference IS
   the typed personal name.**
2. `src/features/games/log-game/players-step.tsx:95-103` — `handleRemovePlayer`
   removes the reference from `selectedPlayerIds` **only**. It touches none of
   the records keyed by it.
3. `src/lib/db/log-game-player-resolution.ts:87-141` — `replacements` is built
   solely by iterating `form.selectedPlayerIds`. A removed reference is never
   in it.
4. `src/lib/db/log-game-player-resolution.ts:25-29` — `remapRecord` uses
   `replacements.get(key) ?? key`. With no replacement, **the raw typed name is
   the key that gets written.** `remapMilestoneClaims` (`:31-44`) and
   `remapAwardClaims` (`:46-66`) use the same `?? value` fallback.
5. `src/lib/validation/log-game.ts:58-65` — `compactRecord` prunes by **value
   emptiness only**, never by key membership. A record holding a real score
   survives.
6. `src/lib/db/game-draft-repo.ts:336` → `:288-305` — `saveGameRevision` inserts
   the whole parsed form into `game_revisions.snapshot`.

## 2. Exactly what persists, and where

**Database row:** `public.game_revisions.snapshot`, declared
`snapshot jsonb not null` (`supabase/migrations/20260703120000_create_core_tables.sql:75-82`).
Unconstrained jsonb — no schema constraint could have caught this.

Six measured retention sites:

| # | Site | Shape |
|---|---|---|
| 1 | `playerScores.<typed name>` | object KEY |
| 2 | `playerSelections.<typed name>` | object KEY |
| 3 | `playerStyles.<typed name>` | object KEY |
| 4 | `milestoneClaims.<milestoneId>.winnerPlayerId` | VALUE |
| 5 | `awardClaims.<awardId>.fundedByPlayerId` | VALUE |
| 6 | `awardClaims.<awardId>.firstPlaceWinnerPlayerIds[]` | VALUE |

`secondPlaceWinnerPlayerIds[]` has the identical shape and code path
(`log-game-player-resolution.ts:59-62`); the probe put the retained seat there,
which is why it shows a UUID above.

**Database row vs client-facing payload: identical.** There is no divergence.
`getDraftGameForm` re-parses the same snapshot through the same schema and
`compactRecord` again prunes nothing. This is worth stating precisely because
the codebase **does** strip a different private field at exactly this boundary:
`normalizedImportedValue` is dropped because zod strips unknown keys
(`src/lib/player-identity/guest-identity.ts:75-85`). No equivalent stripping
exists for these six sites.

## 3. Hydration — traced to the boundary; it does NOT stop

1. `src/app/(app)/log-game/page.tsx:105-110` — `getDraftGameForm` loads the
   snapshot.
2. `src/features/games/log-game/use-log-game-draft.ts:20-53` —
   `mergeDraftIntoInitialValues` is a shallow spread. **No pruning.**
3. `src/app/(app)/log-game/page.tsx:228` — the result is the `initialValues`
   prop of `<LogGameWizard>`, which is `'use client'`
   (`src/features/games/log-game/log-game-wizard.tsx:1`).

A server→client prop on a client component is serialized into the RSC/hydration
payload. The probe captured the exact JSON reaching that prop, sentinel
included, and asserted `selectedPlayerIds` does **not** contain it — i.e. it is
unreferenced residue that no seat renders.

**Honest limit.** I proved the value reaches the `initialValues` prop of a
`'use client'` component. That the Next.js runtime then serializes that prop
into the wire payload is [INFERENCE] from the framework contract, not measured —
I did not run a real Next.js render. It is a strong inference (that is what
`'use client'` props are) but it is an inference, and a browser session would be
required to make it a measurement.

## 4. Survival past finalization — it survives, permanently

- **Revisions are never deleted.** Zero deletes against `game_revisions` in
  `src/**`; zero `delete from public.game_revisions` in `supabase/migrations/**`.
  The only removal path is the FK `on delete cascade` from `games`.
- **Finalization ADDS a revision** (`game-draft-repo.ts:558-563`); it does not
  replace or prune earlier ones. Every draft autosave carrying the residue
  therefore persists on the finalized game forever.
- **The finalized revision itself carries it.** MEASURED:
  `buildFinalizedGamePayload(...).revision.snapshot` contained
  `playerSelections.<typed name>` and `playerStyles.<typed name>`.
  `src/features/games/finalize-game.ts:600-619` copies `input.playerSelections`,
  `input.playerStyles`, `input.awardClaims` and `input.milestoneClaims`
  verbatim. `playerScores` is absent from that shape, so **score residue is
  draft-revision-only** while the other five sites become permanent.
- **Claim residue does not block finalize.** MEASURED: `ACCEPTED — claims naming
  the removed reference did NOT block finalize`. Validation checks only
  `hasValue(claim.winnerPlayerId)` / `hasValue(claim.fundedByPlayerId)`
  (`finalize-game.ts:349, :371`) — presence, never membership in
  `selectedPlayerIds`.
- **Permanent per-player tables stay clean.** `finalizeGameLog` resolves claims
  through `gamePlayerIdByPlayerId.get(...)` and filters unmatched rows
  (`game-draft-repo.ts:459-495`), so a claim naming the removed reference is
  silently dropped from `game_milestones` / `game_awards`. The name never
  reaches `game_players`, `players`, or the objective tables. **It lives only in
  `game_revisions.snapshot`.**
- **Existing compaction does not cover it.** `compactRecord` runs on every parse
  and is value-emptiness only.

## 5. Exposure — from the RLS policies and read path as written

- SELECT policy: `create policy "members can read game revisions" on
  public.game_revisions for select using (public.can_read_game(game_id))`
  (`20260703121500_create_core_rls.sql:189-191`).
- `can_read_game`, as replaced by
  `20260704071832_allow_linked_player_profile_access.sql:1-26`, is
  `is_group_member(g.group_id)` **OR** (`g.status = 'finalized'` **AND** the
  caller is a linked participant of that game).

Therefore the retained value is readable by:

- **every member of the game's group**, for drafts and finalized games alike;
- **additionally**, once the game is finalized, any linked participant of it
  even if they are not a member of that group.

**Not public.** The predicate requires an `auth.uid()`-backed membership; no
anon path was found.

**Exposed to the browser of a user who never typed it: YES.**
`src/features/games/saved-games-page.tsx:47, :68` renders drafts with a resume
link `/log-game?gameId=${game.id}`, and `getDraftGameForm` is scoped by
`(gameId, groupId)` where `groupId` is the **caller's active group**, not the
drafting user. Any group member who opens that link receives the residue in the
hydration payload.

Noted in passing, not part of this finding: the write policy is
`for all using (public.can_read_game(game_id))`
(`20260704123000_add_username_profiles_and_player_resolution.sql:67-71`) — a
read-level predicate on a FOR ALL policy.

**No production row estimate is given.** Sizing the exposure requires a
production read that was not authorized. The exact read that would settle it is
named in "Remaining risks".

## 6. Existing guards — the case was never covered, nothing is failing

- `compactRecord` (`validation/log-game.ts:58-65`) — value emptiness only.
- `remapRecord` / `remapMilestoneClaims` / `remapAwardClaims`
  (`log-game-player-resolution.ts:25-66`) — the `?? key` fallback **deliberately
  preserves** unknown references.
- `handleRemovePlayer` (`players-step.tsx:95-103`) — single-field removal.
- `game_revisions.snapshot` is unconstrained `jsonb not null` — no schema
  constraint exists or could exist.
- Finalize validation checks presence, not membership (`finalize-game.ts:349,
  :371`).
- **No test asserts it.** `src/lib/db/log-game-player-resolution.test.ts` has
  five tests, none covering a reference absent from `selectedPlayerIds`. The
  only existing "stale" concept is map-change milestone staleness
  (`log-game-wizard.test.tsx:641`), which **surfaces a review message and
  prunes nothing** — a precedent for flagging, not for cleaning.

There is no broken guard here. The case was simply never covered.

## 7. Contract — precise quotes

**Violated.** `docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`,
"Data-boundary requirements":

> Private personal-name fields must not be included in: … browser hydration data

That bullet is unqualified — it is not scoped to public pages — and the measured
behaviour puts a typed personal name into browser hydration data. The sibling
bullet in the same list, "client DTOs used for public pages", is **not** engaged,
because the wizard is authenticated.

Also engaged, in intent: `log-game-player-resolution.ts:117-121` states the
design goal that "The typed name is never written to a readable column."
`create_or_reuse_guest_identity` upholds that for created guests — the probe
confirmed the retained seat got a neutral public label. The residue defeats the
same goal by a different route, writing the typed name into a group-readable
jsonb document.

**NOT violated.** The "Public surfaces" list. A draft snapshot is not a public
surface: RLS confines it to group members and linked participants. Claims such
as "claimed full name does not appear in public game history" are not engaged.

**Partially mitigating, but it does not cover this.** "Import evidence":

> Private source evidence may retain the original imported personal name when
> needed for audit or provenance.
> Private evidence must remain behind the appropriate authenticated and
> authorized boundary.

The snapshot is behind an authenticated boundary. But this residue is **not
evidence** — it is an unreferenced remnant of an abandoned seat serving no
audit, provenance, correction or dispute purpose, and it is delivered to the
browsers of other group members. The allowance does not reach it.

**Important correction to the recorded finding's framing.** The phrase "must
never enter draft snapshots" is **not a contract clause**. It appears in a
**code comment** (`guest-identity.ts:78-80`) describing a *different* field,
`normalizedImportedValue`. The authority for this finding is the "browser
hydration data" bullet above. Both are recorded here because the code comment
reads stronger while the contract is the actual authority.

## 8. Related residue paths — one bug, six sites, one class

**One bug.** The single root cause is that seat removal does not prune records
keyed by — or valuing — the removed reference. It manifests across all five
record types in `logGameDraftSchema` plus both claim value shapes. There is not
a second, independent defect.

- **The import draft path is NOT affected.**
  `src/lib/imports/build-import-draft.ts:84-191` keys every record by
  `resolvePlayerId(...)`, a resolved player UUID. Import-origin drafts never
  create name keys. (A user can still add a manual player to a *resumed* import
  draft, so the wizard bug applies to any draft once opened in the wizard.)
- **Separate and contract-sanctioned, not part of this finding:**
  `importedPlayerResolutions[].sourcePlayerText` carries original imported
  player text into the draft snapshot and hydration **by design**
  (`guest-identity.ts:86-105`; permitted by the contract's "Import evidence"
  section behind an authenticated boundary).
- **Removing a roster player's seat** leaves the identical orphan records, but
  keyed by a UUID. That is a data-hygiene issue, not a privacy one. The privacy
  severity depends entirely on whether the reference is a typed personal name.

## 9. Fix options

None of these rewrites rows already stored — see "Remediation" below, which is
the expensive half.

### Option A — prune in `logGameDraftSchema` (RECOMMENDED half)

- **Where:** `src/lib/validation/log-game.ts`, a whole-object transform after
  the existing per-field transforms.
- **Changes:** one file. Covers **save, load, and finalize at once**, because
  all three call `logGameDraftSchema.parse`.
- **Risks:** the parse also runs on **load**, so pruning there silently discards
  data from legacy snapshots — including the "remove a seat, re-add it, get my
  scores back" affordance. Ordering matters: the cross-field transform must run
  after `compactRecord`. Blast radius is medium because every draft parse
  changes shape.
- **Migration:** none.
- **Executable test:** yes — the probe converts directly into a regression test.
- **Time:** 2–4 h with tests. **Tail risk:** interaction with import-draft resume
  and the `objectiveConfiguration` "resume as unknown" behaviour; budget +2 h.
- **Unique benefit:** because it prunes on load, it **stops the browser exposure
  for already-stored rows without any data migration.** The row stays dirty; the
  hydration payload does not.

### Option B — prune at seat removal in the wizard

- **Where:** `src/features/games/log-game/players-step.tsx`, extend
  `handleRemovePlayer`.
- **Changes:** one client file.
- **Risks:** lowest risk to existing data, but **client-only**: it does not
  defend the server action, does not fix a single stored draft, and any other
  path that mutates `selectedPlayerIds` (reducing `playerCount`, import
  re-resolution) needs the same treatment. Also removes the re-add affordance,
  which is a product decision, not a technical one.
- **Migration:** none. **Executable test:** yes (Testing Library).
- **Time:** 1–2 h. **Tail risk:** finding the other mutation sites; +1 h.

### Option C — prune server-side in `resolveLogGamePlayerReferences`

- **Where:** `src/lib/db/log-game-player-resolution.ts`, drop keys absent from
  `selectedPlayerIds` instead of `?? key`.
- **Changes:** one server file; covers both `handleSaveDraft` and
  `handleFinalizeGame`, which both call it.
- **Risks:** the `?? key` fallback is load-bearing. Predicate must be precisely
  "absent from `selectedPlayerIds`", **not** "unresolved", or it would mask a
  genuine resolution bug. Does not touch the load path, so it does **not**
  neutralize existing bad snapshots at hydration.
- **Migration:** none. **Executable test:** yes — the probe already exercises
  exactly this function.
- **Time:** 1–3 h. **Tail risk:** low.

### Remediation of existing stored drafts — the expensive half

Required for full closure under **any** option, because none rewrites stored
rows. Shape: a data migration UPDATEing `game_revisions.snapshot` to drop keys
and claim values absent from that snapshot's own `selectedPlayerIds`.

Precedent exists: production ledger `20260723014849 repair_snapshot_player_ids`
is the same class of jsonb snapshot repair
(`src/lib/db/migration-ledger-map.ts:447-477`).

Cost: needs its own authorization, a production read to size it, a reversible
backup, and it is **irreversible for the data it removes**. Estimate 4–8 h plus
authorization latency. **Not included** in the code-fix estimates above.

## 10. Recommendation

**Take Option A, with Option C as a defence-in-depth companion**, and land the
probe as a regression test. A is the only option that stops browser exposure for
rows already written, without a data migration; C makes the write path correct
at source so no new residue is created even if a future caller bypasses the
schema. **Do not take B alone** — client-only, undefended server, zero effect on
stored rows.

**What I would NOT do:** bundle the data migration into the same change. It
needs separate authorization, a production read to size it, and a backup, and it
mixes an irreversible change into a reversible one.

**Residual risk the owner accepts by taking A+C without the migration:** the
typed names already written to `game_revisions.snapshot` **remain in the
database**, readable by `service_role` and by anything that bypasses the parse —
a raw jsonb query, an export, a future analytics view over `game_revisions`, or
a dump. Browser exposure stops; at-rest exposure does not.

### Stated uncertainty

- **Frequency is unmeasured.** Reachability is proven; how often real users
  remove a manually-typed seat after entering values is unknown and needs a
  production read I did not have.
- **The final hydration hop is [INFERENCE].** I proved the value reaches the
  `initialValues` prop of a `'use client'` component. That Next.js serializes
  that prop onto the wire is the framework contract, not something I measured.
- **The classification is genuinely contestable.** Whether group-member exposure
  violates the contract turns on reading "browser hydration data" as
  unqualified. I quote it; the classification is the owner's.

### Does this block Step 4.3 closure?

**My assessment: it should be RECORDED as a known open privacy defect, but it
need not block closure — provided the owner registers it explicitly.**

For not blocking: it is pre-existing and untouched by Step 4.3's work; exposure
is confined to authenticated group members and linked participants, so it is not
a public leak; and the contract's Public-surfaces prohibitions are not engaged.

Against: the privacy contract **is** Step 4.3's own contract, and its "browser
hydration data" bullet is unqualified — so a strict closure audit can legitimately
call this non-conformance.

That is a judgement call I am explicitly leaving to the owner. It is the same
class of contested classification already registered for
`GUEST-NAME-COLLISION-TERMINAL`. **If the owner wants a closure with no open
privacy items, Option A is 2–4 h and closes the browser half of it.**

## Discrepancies — recorded finding vs code

1. The audit said the name "can survive into a draft snapshot and hydration
   payload". **Confirmed, and understated twice**: it also survives into the
   **finalized** revision snapshot permanently, and it is **six sites across
   five record types plus both claim shapes**, not one class of record.
2. The audit's phrase "must never enter draft snapshots" tracks a **code
   comment** about a different field, not a contract clause (see §7). The code
   is the weaker authority here; the contract's hydration bullet is the
   applicable one.
3. The audit recorded reachability as [INFERENCE]. It is now executed [REPO].
   The **MODERATE** severity stands: authenticated-only exposure keeps it below
   HIGH; permanent survival past finalization keeps it above LOW.

## Probe — setup, result, reversion

- **Setup:** disposable PostgreSQL 18 cluster (`initdb`, trust auth, port
  55987), real `bootstrap.sql`, real migration replay. Probe file at the
  repository ROOT (`probe-draft-name-residue.test.ts`) — deliberately **not**
  under `src/**`, `supabase/**` or `scripts/**`, so no shipped tree was touched.
  `pg` installed with `npm install --no-save` (node_modules is gitignored;
  `package.json` and `package-lock.json` unchanged).
- **Result:** as recorded in §1–§4. Every load-bearing claim above tagged
  [REPO] was read from source; every one described as MEASURED was executed.
- **Reversion:** probe deleted. `git write-tree` =
  `f985cd95853bf91348aa4d4d4edc2b8d724ea00d`, **byte-identical** to the
  pre-probe tree hash recorded before any probe ran. `git status --porcelain`
  empty. Cluster stopped and its data directory discarded.

## Validation

| Check | Result |
|---|---|
| `npm.cmd ci` | exit 0 |
| `npx.cmd tsc --noEmit` | exit 0 |
| `npx.cmd vitest run --no-file-parallelism` | exit 0 — 178 files, 982 tests passed, 0 failed (no new failure) |
| `git diff --check` | clean |
| `npm.cmd run validate:claude-context -- --require-maintenance` | run pre-commit |

The full harness and `npm run build` were **not** run. This task changes no
shipped code, and `npm run build` is known to fail in any worktree for an
unrelated reason (missing `.env.local`).

## What was NOT done

- **Nothing was fixed.** No prune, patch or guard was added. No production code
  path was changed.
- No production read or write, no Supabase MCP call, no deploy, no migration
  applied, no push.
- No production row count was estimated.
- No real personal name appears in any probe, fixture, log, or in this document.

## Requires new owner authorization

- Implementing any of Options A/B/C.
- Remediating existing stored `game_revisions.snapshot` rows.
- Any production read, including the one that would size the exposure:
  `select count(*) from public.game_revisions where snapshot::text ~ ...` over
  the record keys, which is the exact read named in §5.
- Classifying this finding for Step 4.3 closure.
