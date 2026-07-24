# REMEDIATE-RECORD-NAVIGABILITY — audit findings AUD-2, AUD-3 and AUD-4 remediated, plus the migration-scope addendum; nothing amended, decided or authorized

## Header — the facts

1. **Title.** Remediated the three remaining record-navigability defects from the
   read-only coherence audit (`84f4a6d9e`): **AUD-2** stale `DECISIONS.md`-internal
   line-number self-citations, **AUD-3** the colliding identity/analytics Q-series, and
   **AUD-4** the one-directional D-15 ↔ F-1 pointer. Added the **migration-scope
   addendum** (six identity stores plus `game_revisions.snapshot`) that the feasibility
   investigation established but never committed. **Documentation only.** No ruling,
   decision, finding or discrepancy amended.
2. **Date.** 2026-07-24.
3. **Branch.** `redesign/tm-stats-dashboard-rebuild` — the redesign lineage. **Not** the
   production/live-site lineage.
4. **Worktree.** The redesign **primary** checkout,
   `C:\Users\izzyh\Documents\Terraforming Mars Redesign`
   (git-dir `C:/Users/izzyh/Documents/Terraforming Mars/.git/worktrees/Terraforming-Mars-Redesign`).
   No isolated worktree was created; the assignment directed the primary tree because it
   is the tree the planning-pack updater reads.
5. **Base commit.** `51ad6eed939dc824c2650f4901a481c00a1787a9`
   (`docs(reconcile): correct the blocker table's Blocking values to owner ruling R-6 (AUD-1)`),
   verified with `git rev-parse --verify -q 51ad6eed^{commit}`. The tree was **clean** at
   start (`git status --porcelain=v1` returned nothing).
6. **Category.** Documentation-only **record navigability** remediation. It is **not** an
   analytics decision, **not** a ruling amendment, **not** a reclassification, **not** a
   build, **not** a migration, **not** a deploy, and **not** a closure of Step 4.3 or any
   blocker.
7. **Authorization held.** Read-only git and repository inspection; editing
   `docs/redesign/DECISIONS.md` (citation anchors, Q-series qualifiers, the D-15 pointer
   — nothing else); editing `docs/agent-handoffs/RECORD-IDENTITY-FEASIBILITY-FINDINGS.md`
   (the two reference corrections and the addendum); anchor-replacement **only** in
   `docs/redesign/DATA-CAPABILITIES.md` and
   `docs/redesign/CANONICAL-ANALYTICS-DEFINITIONS.md`; editing `docs/REDESIGN_STATE.md`
   to register this handoff; creating **one** handoff; **exactly one** commit.
8. **Authorization NOT held, and what did NOT occur.** Enumerated, each a non-action of
   this session:
   - **No production read or write of any kind.** No Supabase MCP call, no
     `execute_sql`, no `list_migrations`, no `apply_migration`, no ledger read, no
     catalog read, no `pg_catalog` query.
   - **No Cloudflare action.** No `wrangler`, no deploy, no `/api/deploy-info`, no
     worker version read.
   - **No migration** written, applied, retired or registered. `supabase/**` untouched.
   - **No code.** `src/**` and `scripts/**` untouched.
   - **No phase document** edited.
   - **No push, no merge, no rebase, no force-push, no history rewrite**, and nothing on
     any remote.
   - **The planning-pack updater was NOT run by hand**, and
     `sync_installed_updater.py` was not run in any mode. `.claude/.pack-last-sync` was
     not hand-edited.
   - **AUD-5** (the self-disclosed defect-count replication) **not** collapsed — it is
     its own work item.
   - **`MATCHER-MANUAL-ENTRY-REPLACEMENT`'s `Blocking` value NOT reclassified**; that
     needs an owner ruling.
   - **`ID-READER-CONTRACT` was NOT assigned a destination.**
   - **No cross-file line citation corrected** — explicitly out of scope (see
     "Known limitations").

---

## Problem — why this existed

The audit at `84f4a6d9e` returned four findings beyond AUD-1. All three taken here are
**navigability** defects: nothing they touch is factually wrong about the world, but each
one sends a reader to the wrong place, or to no place.

- **AUD-2.** `DECISIONS.md` cited *itself* by line number. The Phase 2 merge inserted
  about twelve lines, and the same commit recorded citations computed against the
  pre-merge file, so five rulings pointed roughly twelve lines high — and the defect
  propagated into two communal reconciliation notes.
- **AUD-3.** `DECISIONS.md` carries **two** independent `Q-1..Q-N` sequences. The
  collision was already tripped: the feasibility handoff cited "analytics Q-3" twice
  where it meant **identity Q-3**, the matcher gate controlling a Phase 5 entry gate.
- **AUD-4.** F-1 points back at D-15, but D-15 carried no pointer to the finding that the
  schema contradicts it, so a reader planning the build would meet F-1 only after scoping.

**Correcting AUD-2's numbers would have fixed today and broken again on the next
insertion above them.** A line number is a fact one document asserts about another
document's current shape — the exact class process rule **P-2** exists to stop. So the
numbers were **replaced**, not corrected.

---

## What was done

### §1 — AUD-2: every `DECISIONS.md`-internal line citation replaced with a section-and-text anchor

**The sweep found ELEVEN citation tokens, against the audit's SEVEN.** The audit named
five rulings plus two propagated notes. The sweep found:

| # | Site | Old citation | New anchor | Resolves? |
|---|---|---|---|---|
| 1 | `DECISIONS.md` R-12, ruling sentence | `docs/redesign/DECISIONS.md:1261-1263` | the "Phase 4 Step 4.3 - Import identity classification and source-bound matching" section, "Exact relationship to the log" bullet, sentence beginning "No substring, prefix, fuzzy, or similarity matching" | **verified** |
| 2 | `DECISIONS.md` R-12, "does NOT touch" bullet | `:1261-1263` | the same "Exact relationship to the log" bullet | **verified** |
| 3 | `DECISIONS.md` R-13 | `docs/redesign/DECISIONS.md:1146-1204` | the three "Phase 7 — Leaderboard" sections, named in full | **verified** (all three) |
| 4 | `DECISIONS.md` R-14 | `DECISIONS.md:1192` | "Phase 7 — Leaderboard eligibility and Confidence marker", bullet beginning "The Win Point Differential metric ranking keeps its own separate minimum-wins" | **verified** |
| 5 | `DECISIONS.md` R-14 | `:1231` | "Phase 7 — Leaderboard opponent-adjustment boundary, tie-breaking, and default scope", bullet beginning "Metric rankings reuse the same shape" | **verified** |
| 6 | `DECISIONS.md` **R-15** | `DECISIONS.md:1204` | "Phase 7 — Leaderboard opponent-adjustment boundary, tie-breaking, and default scope" (the quoted ordering sentence) | **verified** |
| 7 | `DECISIONS.md` R-16 | `DECISIONS.md:643` | "Phase 2 questions that remain undecided", the "baseline for overall point differential" bullet under "Step 2.0 does not decide:" | **verified** |
| 8 | `DECISIONS.md` **analytics Q-5** | `:587-588` | "Phase 2 canonical calculation versioning", bullet beginning "The sole-winner Win Point Differential implementation is winner score minus" | **verified** |
| 9 | `DECISIONS.md` **analytics Q-5** | `:615-616` | "Phase 2 repository and query policy", bullet beginning "The version 1 sole-winner Win Point Differential is supported for game scope" | **verified** |
| 10 | `DATA-CAPABILITIES.md` "Opponent-adjusted performance" → **rating** clause | `DECISIONS.md:1146-1204` | the three "Phase 7 — Leaderboard" sections, named in full | **verified** |
| 11 | `CANONICAL-ANALYTICS-DEFINITIONS.md` **expected-score** bullet | `DECISIONS.md:1146-1204` | the three "Phase 7 — Leaderboard" sections, named in full | **verified** |

**The audit's cited set was again a SUBSET** — the fourth time in this project. Three
tokens the audit did not name as AUD-2 defects:

- **R-15's `:1204`** — the audit saw it (COVERAGE: "spot-checked as part of the −12
  pattern but not exhaustively traced") but did not carry it into the finding. It **was**
  stale: the quoted sentence "The ELO rating is the single opponent-strength model. Phase
  7 produces it; Phase 17 consumes it" lives at `:1216-1217`, while `:1204` is R-14's
  minimum-wins bullet. Confirmed by `grep` returning **zero** hits for that sentence
  anywhere near `:1204` **[REPO]**.
- **Analytics Q-5's `:587-588` and `:615-616`** — these **resolved correctly** and the
  audit recorded them as the contrast case proving the mechanism was localised below the
  merge point. They were replaced anyway: §4 of the assignment governs the **class**, not
  the staleness. A resolving line citation is one insertion away from a stale one.
- **R-12's second token at the "does NOT touch" bullet** — the audit enumerated R-12's
  ruling citation but not its repeat.

**One correction to the audit's framing, recorded rather than argued:** the audit listed
**R-6** among AUD-2's five rulings, but R-6's stale citation is `04-log-a-game.md:476` —
**cross-file**, and explicitly out of this assignment's scope. It is **left as written**.

### §2 — AUD-3: both Q-series disambiguated, neither renumbered

**(a) Qualifiers at both headings.** Each Q-series heading now names its series
(`### Open questions — the IDENTITY Q-series …`, `### Analytics open questions — the
ANALYTICS Q-series …`) and carries a blockquote stating that two independent `Q-1..Q-N`
sequences exist, that **a bare "Q-3" names nothing on its own**, that every reference
**must** be qualified, and that **neither series is renumbered** because renumbering
would invalidate references in already-committed, dated handoffs. The identity bullets
are now labelled `Q-1 (identity)` … `Q-4 (identity)`, matching the analytics series'
existing `Q-n (analytics)` convention; identity Q-3 additionally carries an inline note
that it is the question mis-cited as "analytics Q-3". **No question text changed and no
number changed.**

**(b) The two mislabelled references corrected and MARKED.** In
`RECORD-IDENTITY-FEASIBILITY-FINDINGS.md`:

- **F-7** — read "the **analytics-side** open question recorded as analytics **Q-3**".
  Corrected to **identity Q-3** with a section-and-text anchor. A marked
  `CORRECTION 2026-07-24` blockquote quotes the original wording verbatim and states
  explicitly that **the label was wrong when written, not made wrong by later events**,
  so this is a **correction, not a supersession**.
- **X-1** — read "and analytics Q-3 (`:2225`)". Corrected to **identity Q-3**. Its
  marked blockquote records the distinction the assignment called out: **the LABEL was
  wrong; the LINE CITATION `:2225` was correct.** The line citation was nonetheless
  replaced with an anchor, because this same commit inserts text **above** line 2225 in
  `DECISIONS.md` and would have made a correct citation stale.

**No other cross-reference to either series was found wrong.** The sweep found no further
mislabelled reference to correct, and no merely-unqualified reference in a document this
assignment may edit.

### §3 — AUD-4: a pointer from D-15 to F-1; D-15 itself byte-unchanged

A nested pointer under D-15 records that the schema does not currently implement the
unified-profile model, names **F-1** and its heading, summarises the three schema facts
(group-scoped `players`, global `user_profiles`, the unique username on the table guests
do not have), and states that **D-15 still stands as the target** while F-1 measures the
distance. It also records that the owner design choice F-1 frames — merge the tables, or
introduce a new per-person entity — is **not made** in either document, and cross-links
identity Q-2, which asks the same from the decision side.

**D-15 is NOT amended**, and this is proven rather than asserted: the sha256 of D-15's
three lines is **identical** at `HEAD` and in the worktree —
`5c0558a78e77b0e5a11a6e28c250f6ed3a657ea1f3c05701f1c344ae1cd1297c` in both.

### §4 — the migration-scope addendum

Added to `RECORD-IDENTITY-FEASIBILITY-FINDINGS.md` as a clearly dated **ADDENDUM**,
framed throughout as **scope, not decisions** — every item an **unmade choice**. It
records **six identity stores** (`private.player_private_identities`;
`private.player_legacy_identities`; `public.player_import_aliases`;
`public.players.full_name`; `public.players.username`; `public.players.display_name`)
and, as the **seventh sink**, **`public.game_revisions.snapshot`**.

**The finding-dissolved / sink-not distinction is stated explicitly**, because it is the
reason the addendum matters: **R-11** dissolved `DRAFT-NAME-RESIDUE` — no real name on a
seat (D-1), aliases never leave the server (D-13) — which is a statement about names **not
yet written**. R-11's own text records the dissolutions as **"prospective on the identity
model being built"**. It says nothing about names **already frozen** in snapshots written
**before** the model changes. **No new real names means no new residue; it does not mean
no residue.** A migration that cleans all six stores and leaves the snapshots untouched is
**only partly done**, and that sink is the one no identity-table sweep will surface.

---

## Evidence

Evidence classes per `tm-evidence-and-report`.

- **[GIT]** Baseline: `git rev-parse HEAD` → `51ad6eed939dc824c2650f4901a481c00a1787a9`;
  `git rev-parse --abbrev-ref HEAD` → `redesign/tm-stats-dashboard-rebuild`;
  `git remote get-url origin` → `https://github.com/Fochizzy/terraforming-mars-stats.git`;
  `git status --porcelain=v1` → empty. `git rev-parse --verify -q 84f4a6d9^{commit}` →
  `84f4a6d9e92ada73b859a85dd8a1d88b59115e5f`.
- **[REPO]** **Anchor resolution, mechanically verified.** A verification script located
  each named heading, took its body to the next same-or-higher heading, normalised
  whitespace, and asserted the quoted text occurs inside it: **14 checks, 0 failures.**
  This covers all eleven replacement anchors (the three-section R-13/`DATA-CAPABILITIES`/
  `CANONICAL` anchor counted once per section) plus the identity Q-3 target used by the
  F-7/X-1 corrections and the F-1 heading used by the D-15 pointer.
- **[REPO]** **No ruling, decision, finding or discrepancy amended — proven by
  word-diff.** `git diff --word-diff=porcelain` deletion tokens across **all four**
  changed files are, in total: the eleven line citations; the four bare identity Q-labels
  (`**Q-1**`…`**Q-4**`) replaced by qualified ones; R-13's shorthand section list replaced
  by the three full section titles; `bullet)` → `bullet under "Step 2.0 does not
  decide:")`; `` `DECISIONS.md` `` → `This document`; and F-7/X-1's four `analytics`
  label tokens. **No substantive sentence was deleted anywhere.**
- **[REPO]** **D-15 byte-identity**: `sha256sum` of D-15's three lines from
  `git show HEAD:docs/redesign/DECISIONS.md` and from the worktree are equal
  (`5c0558a7…1cd1297c`).
- **[REPO]** **No new line-number citation asserting a location.** Every `+` line
  matching a line-citation pattern is either pre-existing text re-wrapped by an adjacent
  edit (`DECISIONS.md:1997`, `:1960`, `CURRENT_STATUS.md:812` — all in X-1, all
  pre-existing and **still resolving**: `:1997` → the R-10 heading, `:1960` → R-6's
  "**Re-registration.**" paragraph) or a **quotation of the old citation** inside a
  correction blockquote, which is required to show what was corrected.
- **[REPO]** Addendum store evidence, re-derived and cited **by object name rather than
  line** so it cannot go stale the way AUD-2's citations did:
  `guest_first_name`/`guest_last_name`/`normalized_personal_name` in
  `20260718050924_claimable_guest_identity_privacy.sql`; `legacy_full_name`/
  `legacy_username` and the "Private preservation of pre-remediation …" table comment in
  `20260719223000`; `player_import_aliases_identity_mode_check` constraining
  `identity_mode` to `null | 'username' | 'personal_name'`; `20260722012658`'s comment
  that a null mode "predates the mode"; `20260712114538_add_player_username_full_name.sql`
  for the X-5 reconstruction; and `snapshot jsonb not null` on `public.game_revisions` in
  `20260703120000_create_core_tables.sql`.
- **[PRIOR]** That typed names persist in **existing** `game_revisions.snapshot` rows —
  from the feasibility investigation. **No production read was made here**, so the actual
  current contents are **[UNVERIFIED]**.
- **[PRIOR]** The live-site writers `createPlayerIfMissing`, `updatePlayerIdentity` and
  `resolveOrCreateImportGroup` — from R-11, with X-4's lineage caveat.

---

## Files changed

- `docs/redesign/DECISIONS.md` — nine anchor replacements (§1), both Q-series qualifiers
  and the identity bullet labels (§2a), the D-15 → F-1 pointer (§3).
- `docs/agent-handoffs/RECORD-IDENTITY-FEASIBILITY-FINDINGS.md` — the two marked
  reference corrections (§2b) and the migration-scope addendum (§4).
- `docs/redesign/DATA-CAPABILITIES.md` — **anchor replacement only**, one site.
- `docs/redesign/CANONICAL-ANALYTICS-DEFINITIONS.md` — **anchor replacement only**, one
  site.
- `docs/agent-handoffs/REMEDIATE-RECORD-NAVIGABILITY.md` — this handoff.
- `docs/REDESIGN_STATE.md` — outcome note and this handoff's registration at the head of
  the active `## Latest handoff` group.

---

## Documents reviewed / updated / intentionally NOT changed

- **Read (2026-07-24):** `docs/CURRENT_STATUS.md` (current phase, objective, blocker and
  sequence sections), `docs/REDESIGN_STATE.md` (`## Latest handoff` group),
  `docs/redesign/DECISIONS.md` (R-5–R-17, D-1–D-33, both Q-series, the Phase 2 and Phase
  7 sections, the 1259 matcher section), `docs/redesign/MASTER-RULES.md` (P-1/P-2),
  `docs/agent-handoffs/AUDIT-SESSION-RECORDS-2026-07-23.md` (AUD-2/AUD-3/AUD-4/AUD-5,
  COVERAGE), `docs/agent-handoffs/RECORD-IDENTITY-FEASIBILITY-FINDINGS.md` (in full),
  `docs/redesign/DATA-CAPABILITIES.md`, `docs/redesign/CANONICAL-ANALYTICS-DEFINITIONS.md`
  and `docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md` (the R-13–R-17
  reconciliation notes), and migrations `20260703120000`, `20260712114538`,
  `20260718050924`, `20260719223000`, `20260722012658` (targeted, for the addendum's
  object evidence).
- **Updated:** the six files listed above.
- **Intentionally unchanged, each tested against that document's own maintenance rule:**
  - `docs/CURRENT_STATUS.md` — `CLAUDE.md` → "Required review after work" requires an
    update when "current work or release state changed". **None changed**: no phase,
    blocker, release, migration or next-action state moved. This work corrected how a
    record is navigated, not what it says.
  - `docs/AUTHORITATIVE_DOCUMENTS.md` — updated when an authority is "added, moved,
    superseded, or archived". **No authority changed**; no document gained, lost or moved
    rank.
  - `docs/redesign/MASTER-PLAN.md` — updated when approved work changes goals, governance,
    phase structure, durable architecture, analytics semantics, or the documented current
    phase. **None of those changed.**
  - `docs/redesign/MASTER-RULES.md` and `docs/redesign/PAGE-ARCHITECTURE.md` — no rule,
    route or page contract changed. P-2 is **applied** here, not amended.
  - `docs/redesign/CLAUDE-PROJECT-SOURCES.json` — no catalog routing changed and no new
    durable guidance document was created; this handoff is an ordinary
    `docs/agent-handoffs/` record.
  - `docs/redesign/METRIC-SAMPLE-COVERAGE-ELIGIBILITY-CONTRACTS.md` — swept and **carries
    no `DECISIONS.md` line citation**; it already references by section anchor. Nothing to
    replace.
  - `docs/agent-handoffs/AUDIT-SESSION-RECORDS-2026-07-23.md` — a **dated audit record**
    this project does not rewrite, and editing any handoff other than the feasibility one
    is outside this assignment. See "Known limitations".
  - All phase documents, all other contracts, all migrations, `src/**`, `scripts/**`,
    `supabase/**` — untouched.

---

## Known limitations, and a defect this remediation itself created

1. **This change moved three line citations inside the dated audit record, and they are
   deliberately left stale.** `AUDIT-SESSION-RECORDS-2026-07-23.md` cites
   `DECISIONS.md:2125` (D-15, now `:2126`), `:2219` (the identity Q-series) and `:2368`
   (the analytics Q-series). Inserting the D-15 pointer and the two Q-series qualifiers
   moved all three. **This is AUD-2's own mechanism, demonstrated live** — and it is
   precisely why the assignment required anchors rather than corrected numbers. Editing
   that handoff is forbidden here; it is a **dated record of what an audit found**, not a
   living document. Recorded, not fixed.
2. **Cross-file line citations are untouched and still drift.** R-6's
   `04-log-a-game.md:476` (stale; the sentence is at `:488`), R-14's and R-16's phase
   sites, `DATA-CAPABILITIES.md:399`/`:421`/`:581-584`, `METRIC-SAMPLE…:103-109`/`:105`,
   and every `src/**` and migration line cite across the handoffs remain line-based.
   Explicitly out of scope; a larger sweep, and its own work item.
3. **Other handoffs still cite `DECISIONS.md` by line.** At least nine handoffs do
   (`PHASE-04-STEP-03-MATCHER-OVERLOAD-DESIGN-SCOPING.md`, `…-BUILT-LOCAL.md`,
   `…-GUEST-IDENTITY-OVERLOAD-DESIGN-SCOPING.md`, `…-ID-READER-CLIENT-INVESTIGATION-STOP.md`,
   `…-CLOSURE-CRITERION-ESTABLISHED.md`, `RECORD-ANALYTICS-RULINGS.md`,
   `RECONCILE-BLOCKER-TABLE-TO-R6.md`, `AUDIT-SESSION-RECORDS-2026-07-23.md`, and
   `RECORD-IDENTITY-FEASIBILITY-FINDINGS.md`'s surviving `:1997`/`:1960`). **All of their
   targets sit above this change's lowest edit and are unmoved**, verified for
   `RECORD-IDENTITY-FEASIBILITY-FINDINGS.md`'s two. They are dated records; converting
   them is not this work item.
4. **The addendum performs no production read.** Whether `game_revisions.snapshot`
   currently contains typed names in any given row is **[UNVERIFIED]** here and rests on
   **[PRIOR]** from the feasibility investigation.
5. **AUD-5 is untouched and still open.**

---

## Production and external effects

**None.** Every non-action in header fact 8 holds. The post-commit planning-pack hook is
expected to fire on this commit (`docs/REDESIGN_STATE.md` is a pack source) and publish;
that automatic run is expected behaviour, **not** an action this session took, and the
updater was **not** run by hand. **Two earlier publishes were outstanding at the start of
this work** — `84f4a6d9`'s run died on temp cleanup and `51ad6eed`'s never fired at all
(it was committed through a tool the hook's `Bash` matcher does not match) — so a higher
than usual `updated` count in the receipt is expected, not an anomaly.

---

## Next approved action, and what is NOT approved

- **Next (future assignments, not started):** **AUD-5**, collapsing the replicated
  planning-layer defect count to one canonical statement with pointers; the cross-file
  citation sweep (limitation 2); the owner ruling
  `MATCHER-MANUAL-ENTRY-REPLACEMENT`'s `Blocking` reclassification needs; assigning
  `ID-READER-CONTRACT` a destination; and the seven unmade migration-scope choices the
  addendum records. Each is a separate, explicitly authorized assignment.
- **NOT approved by this record:** amending any ruling, decision, finding or discrepancy;
  renumbering either Q-series; reclassifying any blocker; deciding any of the addendum's
  seven choices; writing any migration or code; any production read or write; any
  push/merge/deploy/apply; beginning any phase, Step 4.4, or the Step 4.3 closure audit.

**This record corrects how the record is navigated. It decides, resolves, and authorizes
nothing.**

**No downstream work was started.**
