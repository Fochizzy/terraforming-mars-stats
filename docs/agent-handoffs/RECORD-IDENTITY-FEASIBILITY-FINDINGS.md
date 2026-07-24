# RECORD-IDENTITY-FEASIBILITY-FINDINGS — the gap between the recorded identity design and the current schema, written down; nothing amended, reclassified, or decided

**Headline.** A read-only feasibility investigation (`IDENTITY-BUILD-FEASIBILITY-READS`,
step 4.38) answered whether the recorded identity design (D-1–D-33) is buildable on the
current schema. It wrote nothing, so its findings lived only in a chat report. This
work item **commits them**: seven findings **F-1–F-7** about the distance between the
recorded design and the current code, and five discrepancies **X-1–X-5**. It **records
the gap**; it does **not** amend the design, reclassify any blocker, resolve
`MATCHER-MANUAL-ENTRY-REPLACEMENT`, create any missing entry, write any migration, or
perform the production read that would settle X-2.

## Header — the facts

1. **Title.** Recorded the identity-build feasibility findings (F-1–F-7) and
   discrepancies (X-1–X-5). Documentation only.
2. **Date.** 2026-07-23.
3. **Branch.** `redesign/tm-stats-dashboard-rebuild` (redesign lineage).
4. **Worktree.** `C:\Users\izzyh\Documents\Terraforming Mars Redesign` — the redesign
   primary (`git-dir …/worktrees/Terraforming-Mars-Redesign`), the tree the updater
   reads. **No worktree created.**
5. **Findings base vs recording HEAD.** All findings are **[PRIOR]** from the
   feasibility report, derived at HEAD `9fc2c96f063c35737c092d5da661e12c794915be`. This
   recording ran at HEAD `fe3f1538` — three **documentation-only** commits ahead
   (`588218504` identity design, `9b031506` R-12, `fe3f1538` analytics rulings), **none
   of which touched `src/**` or `supabase/**`** [GIT]. So re-derivation of code/schema
   facts at `fe3f1538` is valid for the `9fc2c96f` base. The one place the intervening
   docs commits matter is **X-1** (they added DECISIONS references to the tracked item);
   noted there.
6. **Category.** Documentation and record only. **NOT** a design amendment, a blocker
   reclassification, a disposition change, code, schema, a migration, a production read
   or write, a push/merge/deploy, or a phase advance.
7. **Authorization held.** Read-only git/repo inspection incl. cheap re-derivation; one
   new handoff carrying F-1–F-7 and X-1–X-5; a `REDESIGN_STATE.md` registration +
   outcome; **pointer-only** additions to `CURRENT_STATUS.md` beside the
   `MATCHER-MANUAL-ENTRY-REPLACEMENT` and `GUEST-LABEL-REDIRTY` rows; exactly one commit;
   the publish receipt.
8. **Authorization NOT held.** No amendment/correction/reinterpretation of any recorded
   identity decision; no blocker reclassification or disposition/requirement/status-cell
   change; no DECISIONS entry for `MATCHER-MANUAL-ENTRY-REPLACEMENT`; no
   `is_username_available` (or any) migration/schema/code change; no unification design;
   **no production read or write** (X-2's count stays unresolved); no edit to any phase
   document, specialist contract, or `GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`; no more than
   one commit; no push/merge/deploy/apply/rebase/force-push; the updater was not run
   manually.

## Evidence-class key

- **[PRIOR]** — inherited from the feasibility report at `9fc2c96f`, not re-derived here.
- **[REPO, re-derived]** — re-verified this session against the working tree at
  `fe3f1538` (valid for `9fc2c96f` per fact 5).
- **[REPO, absence]** — verified by an exhaustive search returning nothing.
- **[UNVERIFIED]** — asserted by neither; needs a source (production read or provider
  docs) nobody has consulted.

---

# THE FINDINGS — F-1 … F-7

## F-1 — the schema does not currently implement the unified-profile model (quoted in full)

> **This is the finding that resizes the identity build.**
> - `public.players` is **GROUP-SCOPED**: `group_id NOT NULL`, one row per person per
>   group, unique on `(group_id, normalized_display_name)`. A person in three groups is
>   three rows. For a registered user those rows are joined by `linked_user_id`; **for a
>   guest they are not joined at all.**
> - `public.user_profiles` is **GLOBAL**: `user_id` PK referencing `auth.users`, created
>   by the `handle_new_auth_user` trigger. It exists only for registered users.
> - The two are joined only **THROUGH `auth.users`**, on
>   `user_profiles.user_id = players.linked_user_id`.
> - **THE UNIQUE LOGIN AND SEARCH USERNAME LIVES ON `user_profiles`** (`NOT NULL
>   UNIQUE`, plus the normalized-username unique index added by `20260722012658` at
>   lines 45-47). `players.username` is nullable, unconstrained, un-indexed, and its
>   client `SELECT` is revoked — it holds pre-remediation import values, not the login
>   identity.
> - **Consequence:** there is no per-person profile row for a guest to attach an email
>   to, and no place a guest's username could live under the recorded design.
>
> This does **NOT** invalidate the recorded design — it establishes the **distance** to
> it. Whether unification means **merging the tables** or **introducing a new per-person
> entity with `players` demoted to a participation row** is an owner design choice and is
> **NOT made here.**

**Evidence.** Re-derived this session **[REPO, re-derived]**: `public.players` is
group-scoped — `group_id uuid not null references public.groups(id)` and `linked_user_id
uuid references auth.users(id)` (`20260703120000_create_core_tables.sql:26-29`);
`user_profiles.username text not null unique`
(`20260704123000_add_username_profiles_and_player_resolution.sql:3`); the
normalized-username unique index `user_profiles_normalized_username_key`
(`20260722012658_add_source_bound_import_identity_staging.sql:45`); the
`handle_new_auth_user()` trigger (`20260714183000_force_existing_user_pin_reset.sql:10,38`);
`players.username` a plain nullable text column with no index/constraint
(`20260712114538_add_player_username_full_name.sql:12-18`, and see X-5). **[PRIOR]** (not
independently re-derived here): the exact `(group_id, normalized_display_name)` unique
key and the client-`SELECT` revoke on `players.username` — the latter corroborated by
`CURRENT_STATUS.md:818` ("`authenticated`/`anon` cannot read `full_name` or `username`").

## F-2 — the PIN login model is already shipped

The recorded login decision describes **existing behaviour**, not new work.
**[REPO, re-derived]:** `pinSchema = /^\d{6}$/` (`src/features/auth/username-auth.ts:26-28`);
sign-in calls `signInWithPassword({ email, password: parsedPin })`
(`src/features/auth/submit-username-auth.ts:145-148`) — the PIN **is** the Supabase Auth
password; `lookupAuthEmailForUsername` accepts an email directly or resolves a username to
`user_profiles.email` (`src/features/auth/username-email-lookup.ts:25-49`); PIN reset uses
GoTrue recovery via `auth.admin.generateLink({ …, type: 'recovery' })`
(`src/features/auth/request-pin-reset.ts:96-104`).

## F-3 — per-account lockout does not exist

**The substantive auth build item: login works; the protection the design relies on does
not.** No lockout, rate-limit, failed-attempt, or throttle implementation appears
anywhere in `src/**` **[REPO, absence — re-derived]** (a case-insensitive search for
`lockout|rate.?limit|throttle|failed.?attempt|backoff|attempt…count` over `src/` returned
zero matches). A six-digit PIN is a 10^6 space; its brute-force resistance depends
entirely on the per-account lockout the design specifies. Whatever GoTrue enforces
natively is understood to be per-IP or global rather than per-account, and that remains
**[UNVERIFIED]** — it needs provider documentation nobody has consulted.

## F-4 — guests cannot authenticate today

**[PRIOR]**, following from F-1 + F-2: PIN login and PIN reset both require a
`user_profiles.email` and an `auth.users` account. An unregistered guest has neither.
Login is inherently a **registered-account** capability under the current schema.

## F-5 — identity is split across three scopes, not two

**[PRIOR]:** global account (`user_profiles`); group-scoped participant (`players`); and
private guest evidence (`private.player_private_identities`,
`private.player_legacy_identities`, `public.player_import_aliases`). Any unification
touches **all three**.

## F-6 — the unification touched surface

Enumerated inbound foreign keys to `public.players(id)` **[REPO, re-derived]**:
`game_players` (`20260703120000:56`); the import-review composite
(`20260704090000:163` and `…(group_id, id)` `:174`); persisted metric snapshots (multiple
FK columns in `20260708142459` — `[PRIOR]` characterised as "five references"; the file
carries player/winner/funder FK columns at `:6,133,159,182,184,207,246`);
Venus/Colonies facts (`20260718200536:79`); `game_log_events.owner_player_id`
(`20260718212340:61`); `private.player_private_identities` (`20260718050924:53`);
`private.player_legacy_identities` (`20260719223000:60`); `public.player_import_aliases`
(**[PRIOR]**). Plus the RLS policies, the claim and resolve RPCs, and the
`src/lib/db` identity repositories **[PRIOR]**.

## F-7 — MATCHER-MANUAL-ENTRY-REPLACEMENT: one tension resolved, one open

The requirement text lives at `docs/CURRENT_STATUS.md:812` **[REPO, re-derived]** — "Design
a source-bound (or otherwise structured) replacement for the manual-entry
player-matching paths". The **substring tension is now resolved** by the recorded
substring-matching override (DECISIONS ruling **R-12**, recorded earlier this session):
substring search is permitted over usernames and aliases within a group, while the
prohibition stays in force over private personal-name stores and the claim path is
excluded. **THE SECOND TENSION IS OPEN and is an owner judgement:** does "otherwise
structured" admit a **membership-derived candidate list**, or does the owner intend
**source-binding specifically** for these paths? Recorded as **OPEN**; not resolved, and
this item's disposition is **not changed**. (It intersects the open question recorded as
**identity Q-3** — `docs/redesign/DECISIONS.md` → "Open questions — the IDENTITY
Q-series", the Q-3 bullet beginning "Does group-scoped structured search (D-8/D-9)
satisfy `MATCHER-MANUAL-ENTRY-REPLACEMENT`?" — which asks the same of group-scoped structured
search — also left open.)

> **CORRECTION 2026-07-24 by `REMEDIATE-RECORD-NAVIGABILITY`, answering audit finding
> AUD-3. Marked, not silently edited.** As committed, the parenthesis above read: "It
> intersects the **analytics-side** open question recorded as analytics **Q-3**, which
> asks the same of group-scoped structured search — also left open." **That label was
> wrong when written** — not made wrong by any later event — so this is a **correction,
> not a supersession**. `DECISIONS.md` carries **two independent Q-series**: **analytics
> Q-3** is the R-16 ranking-metric question ("which of the two is the ranking metric?"),
> unrelated to this finding, while **identity Q-3** is the matcher gate that asks exactly
> what F-7 asks and whose answer would take a Phase 5 entry gate off the board. A reader
> following the original reference landed on the wrong question. **Corrected: the label
> and its "analytics-side" framing only.** The finding, its evidence, its disposition,
> and the **OPEN** state of its second tension are **unchanged**.

---

# THE DISCREPANCIES — X-1 … X-5

## X-1 — MATCHER-MANUAL-ENTRY-REPLACEMENT exists in only one document

**[PRIOR]** (at `9fc2c96f`): the tracked item is named only in `docs/CURRENT_STATUS.md:812`;
`DECISIONS.md` carried the underlying 2026-07-22 amendment commitment it cites, but no
item by that name. The asymmetry is recorded; the missing entry is **not** created.
**Re-derivation nuance [REPO, re-derived]:** since `9fc2c96f`, the intervening
identity-recording commit (`588218504`, this session's series) added DECISIONS **rulings**
that name the item — R-10 ("`MATCHER-MANUAL-ENTRY-REPLACEMENT` is the sixth tracked open
item", `DECISIONS.md:1997`), R-6's Phase-5 re-registration (`:1960`), and **identity Q-3**
(`DECISIONS.md` → "Open questions — the IDENTITY Q-series", the Q-3 bullet beginning "Does
group-scoped structured search (D-8/D-9) satisfy `MATCHER-MANUAL-ENTRY-REPLACEMENT`?").
So the literal "named only in `CURRENT_STATUS.md:812`" is now **superseded**:
the name appears in DECISIONS. But those are **rulings referencing** the item; there is
still **no defining blocker entry** for it in DECISIONS — the item's requirement and
disposition live only in the `CURRENT_STATUS.md:812` table row. The asymmetry X-1 records
(the definition lives in one document) therefore persists; only its "named only" phrasing
is dated. **The missing entry is deliberately not created.**

> **CORRECTION 2026-07-24 by `REMEDIATE-RECORD-NAVIGABILITY`, answering audit finding
> AUD-3. Marked, not silently edited.** As committed, the third item in the list above
> read "and analytics Q-3 (`:2225`)". **The LABEL was wrong when written; the LINE
> CITATION was correct.** `DECISIONS.md:2225` did resolve to the **identity** Q-3 bullet
> at the time of writing — so this is a **correction of the label only**, not a
> supersession, and not a claim that the original pointed at the wrong line. Calling that
> bullet "analytics Q-3" mis-routes a reader to the R-16 ranking-metric question, which
> does **not** name `MATCHER-MANUAL-ENTRY-REPLACEMENT` and so would not support the
> sentence it was cited for. **Two changes, both mechanical:** the label is corrected to
> **identity Q-3**, and the line citation `:2225` is replaced with a section-and-text
> anchor — because the same commit that carries this correction inserts text **above**
> line 2225 in `DECISIONS.md`, which would have made a correct citation stale. The
> discrepancy, its evidence, and its standing conclusion (the asymmetry persists; the
> missing entry is not created) are **unchanged**.

## X-2 — the guest-row count is six, not one

**[PRIOR]:** the recorded transition scope (design decision **D-25**) says **one** guest;
the most recent repository figure is **SIX** unlinked players — dated 2026-07-19, embedded
in migration `20260719223000` (verified to exist **[REPO, re-derived]**) and echoed at
`CURRENT_STATUS.md:818` ("the 6 unlinked rows were preserved into
`private.player_legacy_identities` on 2026-07-19", verified **[REPO, re-derived]**). Work
post-dating 2026-07-19 may have changed it. **The live count is a production read that has
NOT been performed** and is forbidden here, so the conflict is recorded **unresolved**;
the six figure stays **[PRIOR]** and the current live count is **[UNVERIFIED]**.

## X-3 — is_username_available is called but defined nowhere

**[REPO, re-derived]:** `submit-username-auth.ts:182` calls
`rpc('is_username_available', { p_username })`; **no committed migration defines it** (a
search of `supabase/` for `is_username_available` returns zero files). It **fails open** —
the comment at `:186-187` says errors "fall through to `signUp` so the unique constraint
still guards", so the `UNIQUE(username)` constraint is the actual guard. Either a migration
was applied and never committed, or the function does not exist in production. Recorded;
**the migration is not written.**

## X-4 — player-repo.ts differs between lineages

**[REPO, re-derived]:** at redesign HEAD (`fe3f1538`) `src/lib/db/player-repo.ts` is
**read-only** — 56 lines, exporting `listPlayers`, with an explicit comment "This
repository is deliberately read-only. The former `createPlayerIfMissing` …" (`:43`);
its writers are removed. `CURRENT_STATUS.md:818` (GUEST-LABEL-REDIRTY) describes
`createPlayerIfMissing` (`player-repo.ts:141`) and `updatePlayerIdentity`
(`player-repo.ts:183`) writing personal-name material into `public.players` at **production
commit `865df0108f`** — a different lineage. **Both are accurate for different lineages.**
Recorded so a reader does not apply the live-site finding to redesign HEAD.
**GUEST-LABEL-REDIRTY is NOT reclassified.**

## X-5 — players.full_name and players.username are a schema-only reconstruction

**[REPO, re-derived]:** migration `20260712114538_add_player_username_full_name.sql:1-3`
states it is a "Faithful, schema-only reconstruction of the production migration recorded
in the live ledger as version 20260712114538 …, which was applied remotely and never
committed to this repository", and `:12-15` records the reconstruction evidence
(read-only against production, 2026-07-19: both columns plain nullable text, no default,
no index/constraint). The columns are **real in production [PRIOR]**; their **repository
definition is a faithful reconstruction, not the original.**

---

# ADDENDUM (added 2026-07-24 by `REMEDIATE-RECORD-NAVIGABILITY`) — what a migration off personal names must DECIDE, per store

**THIS IS SCOPE, NOT DECISIONS.** Every item below is an **unmade choice**. Nothing here
decides a migration, recommends one, amends F-1–F-7 or X-1–X-5, resolves any of them,
reclassifies any blocker, or authorizes any write. **No migration is written and none is
authorized.**

**Why it is here.** The feasibility investigation established what a migration off
personal names would have to decide, **store by store**. That did not reach the committed
F-series, so a session scoping the migration would have had to rediscover it. It is
recorded now so the scope is found **before** scoping rather than after.

## The identity stores — SIX decisions

| # | Store | The unmade choice |
|---|---|---|
| 1 | `private.player_private_identities` | **Retain or remove** `guest_first_name`, `guest_last_name`, `normalized_personal_name`. |
| 2 | `private.player_legacy_identities` | **Keep as evidence, or purge.** |
| 3 | `public.player_import_aliases` | **Partition by `identity_mode`.** Only `personal_name` rows and rows whose mode is **null** carry name material; `username` rows do not. |
| 4 | `public.players.full_name` | **Drop or neutralize — AND stop the live-site writers**, or re-dirtying continues. |
| 5 | `public.players.username` | Same choice as (4), and it travels with it: both columns are written by the same live-site paths. |
| 6 | `public.players.display_name` | **Neutral at HEAD**, but **legacy rows may still hold typed names.** |

**Object and column evidence [REPO, re-derived 2026-07-24]** — cited by object name rather
than by line, so these references do not go stale the way the ones AUD-2 found did:
`private.player_private_identities` declares `guest_first_name`, `guest_last_name` and
`normalized_personal_name` in `20260718050924_claimable_guest_identity_privacy.sql`.
`private.player_legacy_identities` (`20260719223000`) declares `legacy_full_name` /
`legacy_username`, and its own table comment describes it as the "Private preservation of
pre-remediation public.players.full_name/username for unlinked players".
`player_import_aliases.identity_mode` is constrained by
`player_import_aliases_identity_mode_check` to `null | 'username' | 'personal_name'` (same
migration), and `20260722012658` comments that a **null** mode means "an alias … predates
the mode" — which is why the partition has **three** classes, not two.
`public.players.full_name` and `public.players.username` are the schema-only
reconstruction **X-5** records (`20260712114538_add_player_username_full_name.sql`).
**[PRIOR]** for the live-site writers: **R-11** records `createPlayerIfMissing` and
`updatePlayerIdentity` (`src/lib/db/player-repo.ts`) and `resolveOrCreateImportGroup`
(`src/lib/db/import-group-repo.ts`) as still writing personal-name material — and **X-4**
records that they are **removed at redesign HEAD but live on the production lineage**,
which is exactly why "stop the writers" belongs inside choices (4)/(5) rather than beside
them.

## The seventh sink, and the reason this addendum matters — `game_revisions.snapshot`

`public.game_revisions.snapshot` is declared **`jsonb not null`** on
`public.game_revisions` in `20260703120000_create_core_tables.sql`
**[REPO, re-derived]**. **Typed names persist in existing snapshots [PRIOR]** — recorded
from the feasibility investigation; no production read was made here and none is
authorized.

**THE FINDING IS DISSOLVED; THE SINK IS NOT.** Owner ruling **R-11** dissolved
`DRAFT-NAME-RESIDUE`: under the identity model no real name is stored on a seat (D-1) and
aliases never leave the server (D-13), so there is "no personal name that could survive
into a draft snapshot". **That is a statement about names not yet written.** R-11's own
text records the dissolutions as **"prospective on the identity model being built"** — it
says **nothing** about names **already frozen** in snapshots written **before** the model
changes. **No new real names means no new residue; it does not mean no residue.**

**Consequence for scoping, stated so it cannot be missed:** a migration that cleans all
six stores above and leaves `game_revisions.snapshot` untouched is **only partly done**.
Whether existing snapshots are rewritten, redacted, or deliberately retained as historical
evidence is **the seventh unmade choice** — and it is the one no sweep of the identity
tables will surface, because the sink is **not** an identity table.

## What this addendum does NOT do

It does not decide any of the seven choices, rank them, sequence them, or estimate them. It
does not amend or reopen **R-11** — the dissolution of `DRAFT-NAME-RESIDUE` stands exactly
as ruled, and the distinction drawn here is the one R-11's own "prospective" wording
already implies. It does not reclassify `GUEST-LABEL-REDIRTY` or any other blocker. It
performs no production read, so the actual contents of `game_revisions.snapshot` remain
**[UNVERIFIED]** here. It authorizes no migration, no write, and no phase.

---

## What this record does NOT do

It does not amend the recorded identity design (F-1 establishes distance to it, not an
error in it; F-2/F-3 record implementation status, not a change of decision). It does not
reclassify any blocker, resolve `MATCHER-MANUAL-ENTRY-REPLACEMENT` (F-7's second tension
stays open), create the missing DECISIONS entry (X-1), write the missing migration (X-3),
or perform the production read that would settle X-2.

## Files changed (this session)

- `docs/agent-handoffs/RECORD-IDENTITY-FEASIBILITY-FINDINGS.md` — this handoff (the
  deliverable).
- `docs/REDESIGN_STATE.md` — recording-outcome note and this handoff's registration at
  the head of the "Latest handoff" group.
- `docs/CURRENT_STATUS.md` — **pointer-only** additions beside the
  `MATCHER-MANUAL-ENTRY-REPLACEMENT` (`:812`) and `GUEST-LABEL-REDIRTY` (`:818`) rows,
  pointing here. No disposition, wording, or classification change.

## Documents reviewed / intentionally NOT changed

- **Read (2026-07-23):** `CURRENT_STATUS.md` (blocker rows `:806-818`), `DECISIONS.md`
  (MATCHER references), the auth files under `src/features/auth`, `src/lib/db/player-repo.ts`,
  and migrations `20260703120000`, `20260704123000`, `20260708142459`, `20260712114538`,
  `20260714183000`, `20260718050924`, `20260718200536`, `20260718212340`, `20260719223000`,
  `20260722012658` (targeted).
- **Intentionally unchanged:** the recorded identity design (`DECISIONS.md` D-1–D-33 and
  rulings); every blocker disposition/requirement/status cell; all phase documents;
  every specialist contract; `GUEST-PLAYER-IDENTITY-AND-PRIVACY.md`; all migrations and
  `src/**`. No DECISIONS entry for `MATCHER-MANUAL-ENTRY-REPLACEMENT` was created; the
  `is_username_available` migration was not written; X-2's production read was not made.

## Next approved action, and what is NOT approved

- **Next (future assignments, not started):** the owner design choice F-1 frames (merge
  the tables vs a new per-person entity); building per-account lockout (F-3); the
  production read that settles X-2's count; resolving F-7's second tension; deciding
  whether `is_username_available` exists in production (X-3). Each is a separate, explicitly
  authorized assignment.
- **NOT approved by this record:** amending the design; reclassifying any blocker;
  creating the DECISIONS entry; writing any migration or code; designing or beginning the
  unification; any production read or write; any push/merge/deploy/apply; beginning any
  phase.

**No downstream work was started.**
