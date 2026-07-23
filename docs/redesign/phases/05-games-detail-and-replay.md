# Phase 5 — Games Detail and Replay

**This phase is NOT started, and this document does not start it.** It exists
so far only to carry one forward design constraint into the phase that owns the
surface it applies to. Nothing here authorizes work. `/games/[gameId]` and
`/games/[gameId]/replay` are deferred to this phase by
`docs/redesign/phases/03-navigation-and-routes.md`; begin them only on an
explicit assignment.

## Carried constraint — player labelling on game surfaces

### Status

A **design constraint on unbuilt work**, not an open defect and not a blocker.
It is deliberately not filed as one. Nothing on this lineage exhibits the
failure below, because no surface on this lineage labels a saved game at all:
`src/features/games/saved-games-page.tsx`, the shared implementation behind
`/games` and `/saved-games`, selects only
`id, played_on, status, player_count, generation_count, updated_at` and renders
no player name. The constraint becomes live the moment the Games Library, game
detail, or replay surface gains player labelling.

### The three rules

Any code on this lineage that produces a player label for a game must:

1. **Label a finalized game from the authoritative roster (`game_players`), not
   from the frozen `game_revisions.snapshot`.** A draft has no `game_players`
   rows yet and legitimately keeps the snapshot.
2. **Preserve snapshot ordering only where the snapshot and the roster agree.**
   This keeps healthy games listing exactly as before rather than resequencing
   them.
3. **Never render an unresolved uuid-shaped entry as itself.** It must resolve
   to an explicit unknown-player label. A non-uuid name typed into a draft
   before its player row existed may still be shown.

### Why the rules exist

`game_revisions.snapshot` is frozen at save time, so its `selectedPlayerIds` go
stale whenever the roster rows beneath them are merged, superseded, or deleted.
On the production lineage the 2026-07-20 group collapse/split and guest cleanup
left thirteen finalized games' snapshots naming superseded player rows; two of
those rows had been deleted outright, so nothing resolved them, and the label
fallback returned the whole uuid — the list rendered raw uuids where player
names belong. The rules above are the shape of the fix that removed that class
of failure, not merely that one incident.

Rule 3 is the durable one. The 2026-07-20 data is repaired, but any future
roster merge, split, or cleanup can re-open the same gap between a frozen
snapshot and a live roster; rules 1 and 2 close the common path and rule 3
bounds the residual.

### Evidence

- **[GIT]** `c7d6c203a` — *"fix(saved-games): stop rendering raw player ids as
  names"*, `src/lib/db/game-draft-repo.ts` and its test. It is **not** an
  ancestor of this branch; it reaches
  `fix/live-compare-data-remove-declared-style` and
  `fix/saved-game-label-orphan-snapshot-ids` only.
- **[PROJECT-DOC]** The canonical `DEPLOY-STATE.md` on the production lineage,
  section *"Saved-game player-label release — 2026-07-23 01:58Z"*, which
  records the bug, the code half (`c7d6c203a`), the data half (ledger
  `20260723014849 repair_snapshot_player_ids`), and the post-deploy
  saved-games-list smoke test. Read it with
  `git show fix/live-compare-data-remove-declared-style:DEPLOY-STATE.md`.
- **[PROJECT-DOC]** `docs/REDESIGN_STATE.md`, the 2026-07-23 correction
  under the production-only registration section, which records why an earlier
  statement that this lineage *"still labels finalized saved games from
  `game_revisions.snapshot`"* was false.

### This is not a missing merge

`c7d6c203a` sits on the production lineage. **If this lineage ever merges that
lineage, the fix arrives with it**, already applied to
`src/lib/db/game-draft-repo.ts`. The constraint therefore governs **net-new
labelling code written on this lineage** — a new Games Library listing, game
detail header, or replay roster — and must not be read as an outstanding
cherry-pick, backport, or merge obligation. Do not carry the commit across on
the strength of this document.

### Related observation, outside this phase

`getPlayerName` in `src/features/analytics/group-dashboard.tsx` falls back to
the `playerId` itself (`…?.playerName ?? playerId`) when a player has no
matching leaderboard row, and is called once for the Persisted Efficiency
"Top Player" tile on Group Insights. That is a different surface and a
different data path from anything in this phase, and its reachability in live
data has not been tested, but it is the same class of hazard rule 3 addresses.
Recorded here so a future implementer sees the pattern; it belongs to Group
Insights, not to Phase 5, and no blocker was opened for it. **[REPO]**

### Centralized resolution already available

`resolvePublicPlayerName` in `src/lib/player-identity/public-player-name.ts`
already falls back to the `PUBLIC_PLAYER_FALLBACK` constant rather than to an
id, and `getPublicPlayerNames` / `buildPublicPlayerNameMap` in
`src/lib/db/public-player-name-repo.ts` resolve ids through the
`get_public_player_names` RPC, which gates every id on `can_read_player` /
`is_group_member`. New labelling code should resolve through those rather than
introduce a second fallback path. The privacy contract in
`docs/redesign/reference/GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` continues to
govern which identity may be shown.
