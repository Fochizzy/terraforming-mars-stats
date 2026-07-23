# Project-record reconciliation — 2026-07-23

Documentation and comment text only. **No code change, no migration, no
production read or write, no deploy, no push.** Step 4.3 is not marked
complete, no blocker's disposition changed, and no precondition was relaxed.

Branch `redesign/tm-stats-dashboard-rebuild`, base commit `44eed2e21`,
performed in the primary redesign worktree (the planning-pack updater's tree).

---

## 1. Why this exists

A read-only investigation established that the governing documents misstated
current state in ten places, conflated two different release gates under one
phrase, and bound a production drop to a dependency no code on any lineage
supports. Three recent sessions were sent down false premises by those
documents.

**That investigation wrote nothing.** It was read-only, so its findings existed
only in the owner's session record — the same gap that left both independent
`ID-READER-CLIENT` audits unrecorded until
`PHASE-04-STEP-03-ID-READER-INDEPENDENT-AUDIT-TRAIL.md`. This handoff closes
that gap for the investigation.

**Provenance boundary, stated plainly.** This session did **not** observe the
investigation. Its conduct and its account of itself are **[PRIOR]** — taken
from the assignment text. Every load-bearing factual claim below was
**independently re-derived** from the repository by this session and is tagged
**[GIT]** or **[REPO]** accordingly. Where the two agree, that is stated. No
claim is carried forward on the investigation's authority alone.

## 2. Evidence classes used

`[GIT]` re-derived from git objects · `[REPO]` re-derived from working-tree
files · `[PROJECT-DOC]` a governing document says so · `[PRIOR]` reported by an
earlier session or the canonical ledger, not observed here ·
`[INFERENCE]` reasoning, explicitly labelled · `[UNVERIFIED]` asserted, not
checked.

No `[LIVE]` or `[PROVIDER]` class appears anywhere in this record. **No
production read was authorized or performed.** Every statement about what
production currently holds is `[PRIOR]`, read from the canonical
`DEPLOY-STATE.md` via
`git show fix/live-compare-data-remove-declared-style:DEPLOY-STATE.md`
(tip `5fe94f1f1`), never observed.

## 3. The three questions, and their answers

### Q1 — Does anything on the deployed lineage call `resolve_import_guest_identity`?

**Answer: no caller was found, on any lineage examined.** `[GIT]`

Swept at production source commit
`865df0108f2f7b9df000ad3aeb8fcd394e6242a5` — the commit named in the canonical
`DEPLOY-STATE.md` "Current production" table. The commit identity itself is
`[PRIOR]`.

| Lineage | Commit | `src/` occurrences |
| --- | --- | --- |
| Production source | `865df0108` | **0** — only `DEPLOY-STATE.md` prose matches |
| Rollback target | `d12e33ad0` | **0** |
| Redesign (this branch) | `44eed2e21` | comments, the ledger map, and a test asserting the RPC is **not** called |

**Positive control.** On `865df0108`, the same command finds `.rpc(` in
fourteen `src/` files and finds `match_import_player_names` at
`src/lib/db/import-player-resolution-repo.ts:223`. The empty result for the
resolver is therefore a real absence, not a broken search.

**What the sweep does not cover — four gaps, all open:**

1. database-internal callers (functions, triggers, views, policies, defaults)
   since the expand landed — no repository sweep can answer this;
2. edge functions as deployed;
3. consumers outside this repository;
4. whether `865df0108` is what production actually serves. The canonical ledger
   itself records the authenticated `/api/deploy-info` `sourceCommit`
   confirmation as outstanding.

**`[INFERENCE]`, labelled as such:** the absence of a repository caller makes it
*plausible* that the deployed 7-argument resolver is unreferenced by application
code. It is **not** a demonstration that dropping it is safe — the four gaps
above are precisely where a caller would hide. **The reader-deploy precondition
on that drop was left standing and was not relaxed.**

### Q2 — Does anything call `match_import_player_names`, and under which role?

**Answer: yes, and as `authenticated`.** `[GIT]`/`[REPO]`

At `865df0108`, `src/lib/db/import-player-resolution-repo.ts:223`:

```ts
const { data, error } = await supabase.rpc('match_import_player_names', {
  p_group_id: groupId,
  p_imported_names: names,
});
```

The handle is `const supabase = await createSupabaseServerClient();`, and
`src/lib/supabase/server.ts:5` builds it with `createServerClient` from
`@supabase/ssr` using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` plus the request
cookie store — a **user-session client**, not the admin client. A signed-in
caller therefore executes the RPC as the **`authenticated`** database role.

`supabase/migrations/20260722012707_retire_free_form_import_name_matcher.sql`
line 6 revokes exactly that grant:

```sql
revoke execute on function public.match_import_player_names(uuid, text[]) from authenticated;
```

**Consequence, and it is a derivation rather than an inference:** applying
`20260722012707` against the currently deployed frontend would break live import
name matching. This contraction's reader-first gate is evidenced, not merely
procedural.

### Q3 — Does the three-argument `match_import_player_names` overload exist?

**Answer: no. It exists in no repository migration on any ref checked.** `[REPO]`

`docs/redesign/DECISIONS.md` records an explicit owner decision of 2026-07-22
adopting it — a 3-argument overload taking an explicit requesting-user id,
granted to `service_role` only, with both live call sites moved to the admin
client — expressly to unblock the contraction without a full redesign deploy.

Every `create or replace function public.match_import_player_names(` under
`supabase/migrations/`, across all local and remote refs searched, declares the
**2-argument** `(p_group_id uuid, p_imported_names text[])` signature, and only
in `20260720120000`.

**Could not be settled.** Why it does not exist. Two possibilities were
examined and **could not be distinguished** from the repository record:

- **(a)** the amendment was **superseded** by later work with no record written;
- **(b)** it was **adopted and never built**.

`[PROJECT-DOC]` The decision's own closing clause — "Defines the design; does
not authorize implementation" — is *consistent with* (b). `[INFERENCE]` That
consistency is suggestive, not decisive: no positive evidence for (a) was found
either, and absence of a supersession record is exactly what (a) predicts.
**Registered as an owner decision, not resolved.**

## 4. The ten record disagreements

Nine are stale facts, corrected. The tenth is a structural defect in the record,
recorded rather than corrected. All ten are `[REPO]` unless noted.

| # | Where | What it said | Actual | Treatment |
| --- | --- | --- | --- | --- |
| 1 | `MASTER-PLAN.md` "Current status" | `20260722012658` "gated and unapplied" | **APPLIED**, ledger `20260722132159` | marked superseded + correction |
| 2 | `MASTER-PLAN.md` source-bound design section | "Both files are currently gated and unapplied" | half false — the expansion is applied | marked superseded |
| 3 | `MASTER-PLAN.md` Current Maintenance Header | "Gated and unapplied migrations (**seven**)" | `GATED_UNAPPLIED` holds **five**; only **four** applicable | bullet marked superseded, corrected bullet added |
| 4 | `MASTER-PLAN.md` ×2 | `20260720120000` "unapplied" | **APPLIED**, ledger `20260722144034` | marked superseded |
| 5 | `MASTER-PLAN.md` ×2 | `20260720100000` listed for application | retired **no-op tombstone** | marked superseded |
| 6 | `REDESIGN_STATE.md` blocker item 1 | `20260722012658` application "still outstanding" | applied | marked superseded |
| 7 | `REDESIGN_STATE.md` blocker item 4 | `20260720100000` to apply; "MUST NOT be applied as written"; `ID-READER-CLIENT` "downstream of this migration" | tombstone; capability moved to `20260722160000`, itself applied | marked superseded, hazard record retained |
| 8 | `REDESIGN_STATE.md` "Next action" | three stale claims (items 1, 4, 5 above) | as above | correction block appended |
| 9 | `phases/04-log-a-game.md` status paragraph | `20260720100000` "prepared, not applied" | no longer *prepared* — retired | status observation only |
| 10 | four documents | "deploy and verify the compatible reader" used for **two different gates** | two distinct pairs | **recorded, not corrected** — see §5 |

**Superseded text was marked, never deleted**, following this repository's
established style (`REDESIGN_STATE.md` §"Correction (2026-07-23): this lineage
does not label saved games at all"). Every count and version was re-derived from
`src/lib/db/migration-ledger-map.ts` and the canonical ledger, not copied from
the assignment.

**Documents that needed no correction**, checked and found already current:
`docs/CURRENT_STATUS.md` (already recorded five gated entries and every apply),
`docs/redesign/reference/MIGRATION-LEDGER-MAP.md`, and
`src/lib/db/migration-ledger-map.ts`.

## 5. The two-gate conflation

One phrase, two gates. They share a reader-deploy step and nothing else:

| | Guest-identity pair | Matcher pair |
| --- | --- | --- |
| Expand | `20260722160000` → ledger `20260723082917` (applied) | `20260722012658` → ledger `20260722132159` (applied) |
| Contract | **drop of the 7-argument `resolve_import_guest_identity`** (`ID-READER-CONTRACT`) | **`20260722012707`** (`ID-LEGACY-ORACLE`) |
| Deploy dependency | **no caller found** — Q1 | **evidenced** — Q2 |

Satisfying one does not satisfy the other. Recorded in
`MIGRATION-LEDGER-MAP.md` and `CURRENT_STATUS.md` **without restructuring or
renumbering either sequence**, and without changing what any step requires.

## 6. Registered, not resolved — three owner decisions

Recorded in `docs/CURRENT_STATUS.md` → "Pending owner decisions". Each is stated
neutrally with what is established and what is not. **Nothing is recommended and
nothing is resolved.**

- **PD-1** — build the 3-argument matcher overload, retire the amendment, or
  leave it dormant. `docs/redesign/DECISIONS.md` was **deliberately not
  edited**: recording an implementation-status question about a decision is not
  amending the decision, and amending it is the owner's act.
- **PD-2** — may Step 4.3 close with `ID-LEGACY-ORACLE` still open? The phase
  contract's sole stated closure criterion is a fresh independent read-only
  audit and mentions no deployment; the state files list that oracle as a Step
  4.3 closure blocker; and `AUTHORITATIVE_DOCUMENTS.md` ranks the state files
  **above** the phase file, so the phase contract does not simply win. **The
  documents do not resolve it.**
- **PD-3** — is `GUEST-NAME-COLLISION-TERMINAL` a Step 4.3 contract
  non-conformance? The phase contract requires that an importer be able to
  "select an existing unlinked guest" and "resolve an ambiguous match
  explicitly"; the terminal `P0003` state makes neither possible; the blocker is
  classified as blocking nothing. **Recorded as CONTESTED and NOT
  reclassified.** It interacts with PD-2.

## 7. Observations for the owner — not actions, and deliberately not implemented

`[PROJECT-DOC]`, both verified in this session:

1. **`docs/redesign/MASTER-RULES.md` contains no expand/contract rule.** The
   whole remaining-work sequence relies on one; grepping the file for
   expand/contract governance returns only unrelated Venus/Colonies
   gameplay-expansion text. The rule is enforced today through
   `DECISIONS.md`, `MIGRATION-LEDGER-MAP.md`, and per-file hazard classes —
   not through the master rules.
2. **`docs/redesign/phases/04-log-a-game.md` does not specify the
   reader-deploy step at all.** Its Step 4.3 scope, obligations, prohibitions,
   and closure criterion never mention deploying or verifying a compatible
   reader, though that step now gates two contractions.

**Adding an expand/contract rule to `MASTER-RULES.md`, or specifying the
reader-deploy step in the phase contract, is the owner's act. Neither was
done.** They are recorded here so the decision can be made deliberately rather
than by accretion.

## 8. Convention note

Every inference in this document is labelled `[INFERENCE]`. That convention is
the direct lesson of the sessions that produced the errors corrected here: the
`listSavedGames` false statement was "an inference from ancestry never checked
against the code" that had already premised a full session of work, and the
same failure mode produced record disagreements 1–9. An inference that is
labelled can be checked; one that is written as a fact gets inherited.

## 9. Files changed

- `docs/redesign/MASTER-PLAN.md` — five stale statements marked superseded;
  corrections and a re-derived gated-migration bullet added.
- `docs/REDESIGN_STATE.md` — blocker items 1 and 4 marked superseded;
  "Next action" correction block; Q1's finding recorded beside the CONTRACT
  precondition.
- `docs/CURRENT_STATUS.md` — two-gate note after the sequence; Q1's finding and
  its limits in the `ID-READER-CONTRACT` row; PD-3 contest noted in the
  `GUEST-NAME-COLLISION-TERMINAL` row without reclassifying it; new "Pending
  owner decisions" section.
- `docs/redesign/reference/MIGRATION-LEDGER-MAP.md` — the two-gate comparison
  with evidence, and the unsupported-dependency finding with its four
  uncovered areas.
- `docs/redesign/phases/04-log-a-game.md` — **status observation only.** No
  scope item, obligation, prohibition, or closure criterion was touched.
- `src/lib/db/migration-ledger-map.ts` — **comment text only**, on the
  `20260722012707` entry in `GATED_UNAPPLIED`. No executable line changed; the
  drift test imports the constants and never parses source text.
- this handoff.

**Unchanged, as required:** `docs/redesign/DECISIONS.md`,
`docs/redesign/MASTER-RULES.md`, `CLAUDE.md`, `AGENTS.md`,
`docs/AUTHORITATIVE_DOCUMENTS.md`, and everything under `supabase/`.

## 10. What this does not do

It authorizes no migration, deploy, push, production read or write, closure
audit, or next substep. It resolves no owner decision, relaxes no precondition,
reclassifies no blocker, and restructures no sequence.
