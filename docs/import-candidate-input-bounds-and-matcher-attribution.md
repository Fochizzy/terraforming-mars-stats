# Import candidate-name bounds and matcher attribution — (d+3)

**Status:** implemented locally on `fix/import-candidate-input-bounds`. Not
pushed, not deployed, no production write, no migration or grant touched.

**Outcome in one line:** the import enumeration oracle is **NARROWED, not
closed**. A caller who supplies a private name still learns whether it belongs
to a real identity; what changed is that they can now ask about at most 10 names
per request instead of 64, every channel that carries names is bounded at the
game maximum of 5, and every matcher invocation — success included — is now
recorded with the requesting user id, the group id, and counts.

---

## Lineage

| Fact | Value | How established |
| --- | --- | --- |
| Base branch | `fix/live-compare-data-remove-declared-style` | tip re-derived from git: `910a7c24d` |
| Work branch | `fix/import-candidate-input-bounds` | created from `910a7c24d` |
| Worktree | `C:\tmp\tm-import-input-bounds` | fresh, real `npm ci`, not nested under `.npm-cache` |
| Deployed source commit | `4dec49a423013b319a2904b35eb70396b1398800` | `git merge-base --is-ancestor 4dec49a42 fix/live-compare-data-remove-declared-style` → true; also recorded in `DEPLOY-STATE.md` line 61 |
| Live worker | `178229f3-bfa4-4776-826a-e344daf23d72` | `DEPLOY-STATE.md` lines 58 / 332 / 349 (documentary). **Not independently re-verified** — `wrangler` was a hard stop for this task. |

`910a7c24d` is **five commits ahead of the deployed `4dec49a42`**: one
committed-but-not-deployed code fix (`540f27243`, "show pending feedback while
insights focus recalculates") and four deploy-ledger / deploy-lock docs commits
(`c1d18f32d`, `f84cc56ac`, `83dd8ce14`, `910a7c24d`). This branch therefore
carries that undeployed fix along with the change below — worth knowing before
this branch is ever deployed.

---

## A. The maximum, and its evidence

**A Terraforming Mars game in this product has at most 5 players.**

Three independent, mutually consistent sources:

1. `public.games.player_count integer not null check (player_count between 1 and 5)`
   — `supabase/migrations/20260703120000_create_core_tables.sql:34`. Also
   `global_player_count_metric_summaries.player_count primary key check
   (player_count between 1 and 5)`.
2. `logGameDraftSchema.playerCount: z.number().min(1).max(5)` —
   `src/lib/validation/log-game.ts:171`, applied by `saveDraftGame`
   (`src/lib/db/game-draft-repo.ts:130/236/664`).
3. `buildImportDraft` derives `playerCount` from `selectedPlayerIds.length`
   (`src/lib/imports/build-import-draft.ts:623`), and the import confirm path
   builds `selectedPlayerIds` one-per-resolved-participant.

Chained together, these mean **a six-participant import already cannot be
saved** — it fails zod validation before it reaches the check constraint.
Rejecting a sixth candidate name at analyze time therefore breaks nothing that
could otherwise have succeeded; it moves an existing failure earlier and gives
it a comprehensible message.

### The one legitimate case that exceeds 5 — reported, not ignored

The task asked me to look for a legitimate flow producing more candidate names
than the maximum. **There is one, and it is real, not hypothetical.**

`parseGameResultEvidence` builds the matcher's input as

```
evidencePlayerNames = endgame score-table row names  ∪  score-details detected names
```

Those two lists can name the *same* person differently:

- the end-game score table carries the **in-game** name the screenshot shows
  ("Izzy");
- `resolveExpectedPlayerName`
  (`src/lib/imports/parse-score-details-screenshot.ts:205`) resolves each
  score-details column against `expectedPlayerNames`, which is seeded from the
  **participants field** — so it returns the roster spelling ("Izzy Hodnett")
  for the same column.

The existing comment at `src/app/(app)/log-game/import/page.tsx:544` documents
exactly this two-spelling situation as a live problem. So for a five-player game
with a score-details screenshot and a participants field spelled differently
from the game, **ten distinct candidate names is legitimate**.

### Chosen bounds

| Constant | Value | Meaning |
| --- | --- | --- |
| `MAX_IMPORT_PLAYERS` | **5** | the game maximum; the bound on every individual input channel |
| `MAX_IMPORT_CANDIDATE_NAMES` | **10** (`5 × 2`) | the backstop on the array that actually reaches the matcher; two spellings per player |
| `MAX_IMPORT_CANDIDATE_NAME_LENGTH` | **128** | unchanged, mirrors the RPC's own per-element bound |

Every *source* is bounded at 5. Only their union is allowed to reach 10, and
only because each contributing source was already independently capped. An
attacker cannot post 10 names through one channel.

Both existing outer constants (`MAX_MATCH_CANDIDATE_NAMES = 64`,
`MAX_MATCH_CANDIDATE_LENGTH = 128`) are retained in
`import-player-resolution-repo.ts` as the documented outer backstop that mirrors
the coarsened RPC's own contract. The new bound is strictly tighter and sits
earlier.

---

## B. What is bounded, and where

All four enforcement points are **server-side**. `parseImportParticipants` and
`extractGameLogParticipantNames` also run in the browser as a preview; the
server re-derives both, so the server copy is the authoritative one.

| Channel | Enforced in | Bound |
| --- | --- | --- |
| `participants` form text | `src/lib/imports/parse-import-participants.ts` (called by `parseCreateImportDraftFormData`) | 5 |
| `exportedGameLog` actors | `src/lib/imports/extract-game-log-participant-names.ts` | 5 |
| `screenshotOcr` end-game score table | `src/app/(app)/log-game/import/page.tsx`, `parseGameResultEvidence` | 5 |
| `screenshotOcr` score-details columns | same | 5 |
| final array passed to the matcher | `src/lib/db/import-player-resolution-repo.ts`, `matchImportPlayerNames` | 10 |

Per-name length is enforced at every one of those points at 128 characters.

**Over-limit input fails cleanly; it is never silently truncated.** The previous
code `.slice(0, 64)`-ed and dropped over-length names without telling anyone.
Silently dropping the tail would let a legitimate importer save a game with the
wrong players and never know. Every rejection throws an `Error` whose message
names the offending channel and the limit; `describeUnknownError` passes
`Error.message` straight through, so the importer sees, e.g.:

> The uploaded game result names 6 players, but a Terraforming Mars game has at
> most 5. Check that this evidence belongs to a single game before continuing.

The client already routes both `handleAnalyzeSubmit` and `handleConfirmImport`
failures through `getImportErrorMessage`, so no client change was required.

---

## C. The logging contract

New module: `src/lib/observability/import-matcher-audit.ts`.
Emitted from `matchImportPlayerNames`, so **no call site can forget it** — the
import analyze action, the manual-entry resolution path
(`resolveLogGamePlayerReferences`) and the roster display-name fallback
(`player-repo.findRosterPlayerByDisplayName`) are all covered by construction,
and each passes a `source` label so a probe is locatable.

One `console.info` line per invocation, JSON, event name
`import.player_name_match`. **Success is logged as well as failure** — previously
only failures reached the console, which is exactly backwards for detecting
probing, because a probe succeeds.

Fields, and nothing else:

| Field | Value |
| --- | --- |
| `event` | `import.player_name_match` |
| `source` | `import_analyze` \| `log_game_player_resolution` \| `roster_display_name_fallback` \| `unspecified` |
| `userId` | requesting user id, or `null` if the session could not be resolved |
| `groupId` | the group the match ran against |
| `candidateNameCount` | count of distinct candidate names |
| `matchCount` | count of rows returned |
| `outcome` | `matched` \| `rejected` (bounds) \| `failed` (RPC error) |
| `errorCode` | a PostgREST `code` or an `Error.name` — **never a message** |

### Privacy constraint — explicit

**The candidate name strings, the matched public labels, and every private
identity value (full name, username, alias text) are never logged.** Counts and
opaque ids only. A log that quoted the probed names would recreate, inside the
log stream, precisely the disclosure the security-definer matcher exists to keep
out of client payloads.

`errorCode` deliberately excludes error *messages*: a PostgREST error can quote
the argument that caused it, and that argument is a candidate name.
`describeMatcherFailureCode` reduces any failure to a code or an `Error.name`.

Resolving the user id can never change matching: `resolveAuditUserId` swallows
its own failure and degrades to `userId: null`, so the invocation is still
recorded rather than dropped, and the RPC still runs under the caller's own RLS.

### Is structured logging sufficient?

**For detection, yes — for now.** Cloudflare Workers observability is enabled on
this worker, `console.info` is captured and indexed, and the fields above are
enough to answer "which user asked the matcher about how many names, from where,
how often". That is the question that was previously unanswerable.

**Its limits, stated plainly:**

- Workers observability retention is bounded (days, not months). A slow probe
  spread over weeks would age out.
- Logs are not queryable from inside the application, so nothing can *rate-limit*
  on them. This change observes; it does not throttle.
- A log line is not tamper-evident and is not an audit record in the compliance
  sense.

**Recommendation (follow-up, deliberately NOT built here):** a durable
`import_matcher_invocations` table — `(id, user_id, group_id,
candidate_name_count, match_count, outcome, source, created_at)`, no name column,
insert-only, service-role write, RLS denying all client reads. That buys
retention, in-application rate limiting, and a real audit trail.

Cost: one new table + migration + grants (a separately authorized production
operation on this lineage), one insert per matcher invocation on the import
analyze path (~1 per analyze, ≤5 per manual-entry save), and a decision about
what to do when the insert fails — it must not block a legitimate import, so it
would need the same degrade-to-null tolerance the logging has. Estimate: a
half-day of work plus a gated migration. **Not authorized and not started.**

---

## D. Matching behaviour is unchanged

The array handed to `match_import_player_names` is built by identical logic
(`collectDistinctCandidateNames` is a lift of the previous inline
`[...new Set(trim/filter)]`), the RPC arguments are byte-identical, and the
row→`ImportNameMatch` mapping and `coarsenMatchReason` are untouched. For any
input a real game can produce, the same names resolve to the same players with
the same exact/partial status.

Two behaviours *did* change, both on inputs no real game can produce, both
intentional and both required by the task:

1. more than 10 distinct candidate names now throws instead of being sliced to 64;
2. a candidate name longer than 128 characters now throws instead of being
   silently dropped.

---

## Validation (at commit)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean, no output |
| `npm run lint` | 8 warnings, **all pre-existing**, none in any file touched here |
| `npm run build` | succeeded, all routes emitted |
| `npm run check:schema` | `Schema OK: all 51 referenced tables exist` (14 dynamic call sites noted, as before) |
| `git diff --check` | clean |
| `npx vitest run` (full suite) | **1089 passed, 8 failed in 5 files** |

The 8 failures are **pre-existing baseline failures**, confirmed by stashing the
entire change and re-running exactly those five files at the untouched branch
tip: identical 8 failures. They are `src/app/auth/callback/route.test.ts` (4),
`src/app/auth/reset-pin/page.test.tsx`, `src/lib/env.test.ts`,
`src/features/insights/global-loss-cards-section.test.ts`,
`src/app/(app)/group/page.test.tsx` — none touches imports or identity matching.

Every import- and identity-related suite passes:
`import-candidate-name-bounds`, `import-matcher-audit`,
`parse-import-participants`, `extract-game-log-participant-names`,
`import-player-resolution-repo`, `log-game-player-resolution`, `player-repo`,
`private-name-sentinel`, and the real-action `log-game/import/page` suite
(23 tests).

### New coverage

- each channel accepts a full five-player game and rejects the sixth name;
- a 64-name bulk probe is rejected at the participants field, at the pasted log,
  at the posted OCR payload, and at the matcher;
- an over-length name is rejected rather than dropped;
- a full five-player import still analyzes successfully end to end through the
  real page action, and the matcher is called with exactly that game's names
  plus the `import_analyze` source label;
- the audit line is emitted on success, on bounds rejection, and on RPC failure;
- **explicit negative assertions that no candidate name, matched label, or
  probe string appears in the emitted audit record.** No test asserts a name
  *does* appear in a log, and none does.

---

## What this does not do

- It does **not close** the oracle. Within the bound, a caller still learns
  whether a supplied private name matches a real identity.
- It does **not** rate-limit. There is no cap on requests per user per minute.
- It does **not** touch the matcher RPC, its grants, or any migration. This is
  an application-layer change only.
- It does **not** begin the service-role re-gate (d), the contraction, or the
  source-bound port (a1).
