# Saved-game labelling record correction — 2026-07-23

Documentation and comment text only. No `src/` file changed, no
`supabase/migrations/` file changed, no executable line changed in any harness
file, no migration applied, no deploy, no push, and no production read or write.

## Outcome

A statement in `docs/REDESIGN_STATE.md` was **false against the code** and had
already premised a full session of work. It is corrected. The true half of the
statement is retained, the false half is marked as superseded rather than
deleted, the mechanism that produced it is recorded, and the genuine forward
constraint it obscured is written into the phase document that owns the surface
it applies to.

## The false statement

`docs/REDESIGN_STATE.md`, under *"Production-only registration of
`20260723014849`"*, in the paragraph headed **"Discrepancy carried forward, not
fixed here."**:

> The **code half** of that same release — `c7d6c203a`, the `listSavedGames`
> labelling fix in `src/lib/db/game-draft-repo.ts` — is **not** an ancestor of
> this branch (`git merge-base --is-ancestor` exit 1). **This lineage still
> labels finalized saved games from `game_revisions.snapshot`.** Production's
> data is already repaired so nothing is visibly broken today, but the
> durability fix the live-site lineage shipped is absent here.

The bolded sentence is false. The sentence before it is true.

## How the error was produced

The authoring session established a true **ancestry** fact with `git` — that
`c7d6c203a` is not an ancestor of this branch — and then inferred a claim about
this lineage's **behaviour** from it: that a lineage lacking the fix must still
exhibit the behaviour the fix corrects. Fact and inference were written into the
document as a single sentence, with no marker distinguishing them, and the
inference was never checked against the code.

**Ancestry is not behaviour.** A lineage can lack a fix because it never had the
defect, which is exactly the case here.

## Evidence that refuted it

Every claim below was re-derived in this session rather than inherited.

### The saved-games surface reads and renders no player name [REPO]

`src/features/games/saved-games-page.tsx` is the shared implementation behind
both `/games` and `/saved-games`. Its only read is:

```ts
const { data: games, error } = await supabase
  .from('games')
  .select('id, played_on, status, player_count, generation_count, updated_at')
  .eq('group_id', context.groupId)
  .order('updated_at', { ascending: false });
```

It renders `game.played_on`, a `Draft` / `Finalized` badge, the line
`{game.player_count} players | {game.generation_count} generations`, and
`Open draft` / `Saved result`. No roster, no snapshot, no player identity column
is selected, and no player name is displayed. There is nothing here to label
from the snapshot, correctly or incorrectly.

### The labelling machinery does not exist on this lineage [REPO]

File counts, `git grep -l … -- src`, this branch versus
`fix/live-compare-data-remove-declared-style`:

| symbol | this branch | production lineage |
| --- | --- | --- |
| `listSavedGames` | 0 | 4 |
| `SavedGameListItem` | 0 | 2 |
| `UNKNOWN_SAVED_GAME_PLAYER_LABEL` | 0 | 1 |
| `labelRosterEntry` | 0 | 1 |
| `getSavedGameForm` | 0 | 4 |
| `reopenSavedGame` | 0 | 3 |
| `saved-games-picker` | 0 | 2 |
| `person-label` | 0 | 4 |

`src/lib/people/person-label.ts` and its test exist on the production lineage
and **do not exist on this branch at all**. `personLabel` and `firstNameOf` —
the two functions `c7d6c203a`'s own message names as the defect mechanism — are
zero-hit here.

The exported surface of `src/lib/db/game-draft-repo.ts` differs accordingly:
this branch exports `saveDraftGame`, `getDraftGameForm`, `finalizeGameLog`; the
production lineage exports those plus `getSavedGameForm`, `listSavedGames`,
`deleteSavedGame`, `reopenSavedGame`, `SavedGameListItem`, and
`UNKNOWN_SAVED_GAME_PLAYER_LABEL`.

### The machinery was never here [GIT]

`git log --oneline -S"listSavedGames" HEAD -- src` returns **nothing**: the
symbol has never appeared on this branch at any commit. The two lineages
diverged at `2e3f5f7cf` (*"feat: prepare app for launch and deployment"*,
2026-07-04), before the saved-games labelling machinery was built. The absence
is a divergence artefact, not a regression or a lost fix.

### The ancestry half is confirmed [GIT]

`git merge-base --is-ancestor c7d6c203a HEAD` → exit **1**.
`git branch -a --contains c7d6c203a` → `fix/live-compare-data-remove-declared-style`
and `fix/saved-game-label-orphan-snapshot-ids` only. That half of the original
statement stands and is retained.

### Could any surface here render a raw uuid as a player name? [REPO]

Searched: every `displayName` / `playerName` / `player_name` / `username`
producer under `src`, and every `?? playerId` / `|| playerId` fallback.

Found **one**. `getPlayerName` in `src/features/analytics/group-dashboard.tsx`:

```ts
function getPlayerName(playerId: string, leaderboardRows: LeaderboardRow[]) {
  return (
    leaderboardRows.find((row) => row.playerId === playerId)?.playerName ?? playerId
  );
}
```

It is defined once and called once, for the Persisted Efficiency **"Top Player"**
tile on Group Insights, against `topEfficiencySummary.playerId`. A player
present in `playerEfficiencySummaries` but absent from `leaderboardRows` would
render as a uuid. **Whether that is reachable in live data was not tested** — no
production read was authorized — so this is recorded as a latent fallback, not
as a demonstrated defect. It is a different surface and a different data path
from the one `c7d6c203a` fixes, but the same class of hazard.

The other `?? playerId` hits are id→id substitution maps in
`src/lib/db/log-game-player-resolution.ts`, not name rendering.

The centralized resolver is correct: `resolvePublicPlayerName` in
`src/lib/player-identity/public-player-name.ts` falls back to the
`PUBLIC_PLAYER_FALLBACK` constant (`'Player'`), never to an id.

## The correction

`docs/REDESIGN_STATE.md` now:

1. **Retains** the original paragraph verbatim, with an inline marker on the
   false sentence stating that it is superseded, that it was an inference from
   the ancestry fact never checked against the code, and that the ancestry half
   stands. Marking rather than deleting follows this file's established practice
   for dated sections.
2. Adds **"Correction (2026-07-23): this lineage does not label saved games at
   all."** — the evidence above, stated without overclaiming: it says the named
   surface does not exist here, and explicitly **not** that this lineage is
   immune to the hazard.
3. Adds **"How the false sentence was produced"**, two sentences on the
   mechanism, classed `[INFERENCE]`.
4. Adds the `getPlayerName` observation, explicitly **not** a blocker and with
   its untested reachability stated.
5. Points to where the forward constraint now lives.

The separate earlier statement in the same file that `20260722160000` is
"still gated and unapplied" was **deliberately left untouched**: it sits inside
a dated historical section that the later expand-apply record supersedes, and
this project leaves superseded statements inside dated sections as history.

## Where the design constraint now lives, and why

`docs/redesign/phases/05-games-detail-and-replay.md` — previously a committed
empty stub, now carrying the constraint.

Chosen over `docs/redesign/PAGE-ARCHITECTURE.md` because:

- `CLAUDE.md`'s required review order places **the assigned phase file** at
  position 3 and instructs *"Read only the phase or substep named in the task"*.
  A session assigned this surface is therefore guaranteed to open this file.
- `docs/redesign/phases/03-navigation-and-routes.md:218` explicitly defers
  `/games/[gameId]` and `/games/[gameId]/replay` to **Phase 5**, so Phase 5 is
  the documented owner of the surface the constraint governs.
- `docs/redesign/MASTER-PLAN.md:504` confirms Phase 5 is **not started**, so the
  constraint lands before any code exists to violate it.
- `PAGE-ARCHITECTURE.md` is a terse route-and-responsibility index; a three-rule
  data-integrity constraint would be diluted there and out of character.

The phase document records the three rules — label a finalized game from the
authoritative `game_players` roster rather than the frozen
`game_revisions.snapshot`; preserve snapshot ordering only where both agree;
never render an unresolved uuid-shaped entry as itself — why they exist, and
their evidence: `c7d6c203a` `[GIT]` and the canonical `DEPLOY-STATE.md` section
*"Saved-game player-label release — 2026-07-23 01:58Z"* on the production
lineage `[PROJECT-DOC]`.

It also states explicitly that **this is not a missing merge**: if this lineage
ever merges the production lineage, `c7d6c203a` arrives with it, so the
constraint governs **net-new labelling code written here**, not an outstanding
cherry-pick or backport obligation.

It opens by stating that Phase 5 is not started and that the document does not
start it.

**Not filed as a blocker**, per the assignment: it is a design constraint on
unbuilt work, not an open defect. A search of `docs/REDESIGN_STATE.md` and
`docs/CURRENT_STATUS.md` found **no existing blocker row** for the `c7d6c203a`
carry, so nothing needed removing or reclassifying.

## Harness header corrections

Both are **comment text only**, proven two independent ways: no changed line in
either diff fails to begin with `--`, and the non-comment, non-blank line sets
are byte-identical before and after (79 lines in the BEFORE file, 542 in the
AFTER file).

### `supabase/tests/executable/non-import-guest-identity-before.sql`

Was: *"It measures the state production is in today"*. Now: *"It measures the
PRE-EXPAND state"*, with a dated correction block explaining that
`20260722160000` was applied to production on 2026-07-23 as ledger
`20260723082917`, so production now also holds
`public.create_or_reuse_guest_identity`. What the file measures is the state
production was in **before** that apply — which is what a BEFORE proof should
measure. The described objects are otherwise unchanged: the 7-argument
`resolve_import_guest_identity` **is** still deployed with `authenticated`
EXECUTE revoked, because the CONTRACT drop is not authored, so only the "today"
framing was wrong.

### `supabase/tests/executable/non-import-guest-identity-after.sql`

Was: *"once **gated** migration 20260722160000 has been applied"*. The migration
is no longer gated. Corrected with a dated block recording the apply and noting
that what remains gated is the CONTRACT drop, and that the file's own behaviour
is unchanged — the harness still applies the migration itself, twice, against a
disposable cluster.

**Both replacement statements were verified against the repository, not against
the assignment text**, from two independent records:

- `src/lib/db/migration-ledger-map.ts` — `'20260722160000': '20260723082917'` in
  `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME`, with `20260723082917` in the
  applied set and the attestation at 115 entries. `[REPO]`
- The canonical `DEPLOY-STATE.md` on
  `fix/live-compare-data-remove-declared-style`, ledger table row
  `2026-07-23 08:29 | 20260723082917 | 20260722160000 |
  add_non_import_guest_identity_creator | expansion`. `[PROJECT-DOC]`

## Recommendation for the owner — not implemented

**This is the second occasion an inference has been written into
`docs/REDESIGN_STATE.md` as fact and then acted on.** The first is on the
repository record at `docs/REDESIGN_STATE.md:548` — the recorded reason for
excluding migration `20260720120000` from the harness's production-history
replay was that applying it *"would coarsen the very pre-image the contraction
proof measures against"*. That was a causal inference, recorded as the reason,
**acted on** (the migration was excluded on its strength), and later **refuted
by measurement**: the replay does coarsen the matcher, but `MATCH_PREIMAGE`
runs afterwards and `create or replace`s the fine-grained predecessor back over
it, so nothing ever observes the coarsening.

In both cases an unverified inference was recorded in the same register as
verified fact, with nothing marking which was which, and a later session read
the whole thing as established.

A convention of **labelling inferences as inferences** in that document — the
existing `[INFERENCE]` evidence class already exists and is simply not applied
to prose claims — would have caught both, because the false sentence would have
carried `[INFERENCE]` and the session that acted on it would have known to
verify first.

**This is a recommendation only.** No governing rule was changed. `MASTER-RULES.md`,
`CLAUDE.md`, `AGENTS.md`, and `docs/redesign/DECISIONS.md` are untouched — that
decision is the owner's.

## Canonical documents reviewed or updated

| document | disposition |
| --- | --- |
| `docs/REDESIGN_STATE.md` | **updated** — correction, mechanism, observation, pointer |
| `docs/redesign/phases/05-games-detail-and-replay.md` | **updated** — constraint recorded (was an empty stub) |
| `supabase/tests/executable/non-import-guest-identity-before.sql` | **updated** — comment only |
| `supabase/tests/executable/non-import-guest-identity-after.sql` | **updated** — comment only |
| `docs/CURRENT_STATUS.md` | **checked, intentionally unchanged** — it names the "saved-game player-label release" only as the release the data half belonged to; it carries no claim about this lineage's labelling behaviour and no pointer to the false statement |
| `docs/redesign/DECISIONS.md` | intentionally unchanged — no durable decision was approved |
| `docs/redesign/MASTER-PLAN.md` | reviewed, intentionally unchanged — no project-wide goal, phase structure, architecture, or contract changed |
| `docs/AUTHORITATIVE_DOCUMENTS.md` | intentionally unchanged — no authority added, moved, superseded, or archived |
| `docs/redesign/CLAUDE-PROJECT-SOURCES.json` | intentionally unchanged — no new durable cross-project guidance document; phase files are not catalog entries |
| `docs/redesign/MASTER-RULES.md`, `CLAUDE.md`, `AGENTS.md` | forbidden by the assignment, untouched |

## State after this task

- Step 4.3 is **NOT** marked complete.
- **No blocker's disposition changed.** No blocker was opened, closed, or
  reclassified; none existed for this.
- `ID-READER-DEPLOY` remains the active gate. The contraction `20260722012707`
  remains gated and unapplied. The CONTRACT drop is not authored.
- The `getPlayerName` uuid fallback on Group Insights is **recorded as an
  observation only**, with its reachability untested.

## Do not do next without new authorization

- Pushing this branch.
- Adopting the inference-labelling convention recommended above, or any other
  change to a governing rule.
- Carrying `c7d6c203a` onto this lineage. The constraint document explicitly
  says not to do this on its strength.
- Investigating or changing the `getPlayerName` fallback.
- The reader deploy; the CONTRACT drop; the production ACL read on
  `resolve_import_guest_identity`; contraction `20260722012707`; the tile
  backfill; guest re-neutralization; the closure audit; Step 4.4.
