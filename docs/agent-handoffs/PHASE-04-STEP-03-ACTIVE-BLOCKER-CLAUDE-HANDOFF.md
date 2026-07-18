# Phase 4, Step 4.3 active-blocker handoff to Claude

Date: 2026-07-18
Branch: `redesign/tm-stats-dashboard-rebuild`
Workspace: `C:\Users\izzyh\Documents\Terraforming Mars Redesign`
Status: **Step 4.3 remains active and uncommitted. Do not mark it complete.**

## Scope and hard stops

TM Stats is a responsive website, not a mobile application.

Work only on Phase 4, Step 4.3 — Import, Validation, Evidence Review, and
Claimable Guest Identity Creation. Step 4.2 was not reopened. Do not begin
registration-time claiming, Step 4.4, Step 4.5, Phase 5, a push, or a deploy.

Verified prerequisite commits:

- Step 4.1: `c2d0d5462` — `feat(log-game): unify game entry foundation`
- Step 4.2: `59652ad85` — `feat(log-game): complete responsive wizard and remove expansion tracking`
- Guest identity/privacy contract: `cc03d145f` — `docs(redesign): define guest identity privacy contract`

The worktree is intentionally dirty with the full uncommitted Step 4.3
implementation. Preserve all of it and do not reset or overwrite unrelated
changes.

## User-approved workflow

The initial import form asks only for:

1. the complete game result PDF, with end-game screenshot compatibility; and
2. the complete exported game log.

Map, player count, generation count, date, scores, milestones, awards,
corporations, Preludes, Merger evidence, played cards, winners, ties, and other
supported fields are parsed from those sources and shown only for verification
or correction. The result PDF is preferred because it contains the awards,
placements, exact score rows, and generation evidence. Randomized maps,
randomized milestones, or randomized awards are incompatible with TM Stats.

The restored public instructions route is `/import-instructions`; it explains
saving the complete result page as a landscape PDF with background graphics and
copying the complete log. Four instructional screenshots are present under
`public/import-instructions/`.

## Implemented locally

- Direct PDF text-layer parser restored under `src/lib/imports/pdf/` and adapted
  through `src/lib/imports/parse-terraforming-mars-result-pdf.ts`.
- Browser and server independently parse the PDF; server parsing is
  authoritative before persistence.
- Log parsing, objective evidence, played-entity evidence, canonical
  corrections, player matching, score rows, award placements, milestone
  claims, global parameters, parser identity, raw evidence, and provenance are
  preserved.
- The selected player ID is preserved through draft construction/save/resume.
- Explicit identity states exist for linked registered players, existing
  unlinked guests, new unlinked guests, unresolved, ambiguous, invalid,
  duplicate, inaccessible, and unavailable identities.
- Approved identity modes are username or first and last name. Their
  normalization and persistence semantics remain separate.
- Existing eligible guests are reused only after confirmation; ambiguous
  automatic source matches now display both candidates and require explicit
  selection. The final repair is centralized in
  `findExactImportedSourceCandidates` and covered by regression tests.
- Registration-time claiming was not implemented. Guest identities remain
  unlinked until later registration confirmation.
- Public claimed-player resolution uses registered username only; missing
  username uses neutral `Player`, never a private personal name. Private fields
  are omitted from public DTOs/readers.
- Original result/log evidence remains private. CSS-only hiding was not used.
- The Log a Game background uses the local bundled fallback because no suitable
  authorized Supabase Storage publication was available. Do not claim it was
  uploaded to Storage.

## Real PDF proof

The integrated parser was verified against:

- `C:\Users\izzyh\Downloads\2026 07 11 Cosmic Neutron Stream _ Terraforming Mars.pdf`
  - generation 8
  - James 65 / final MC 52; Corey 65 / 46; Colette 59 / 45; Izzy 58 / 64
  - Rim Settler, Polar Explorer, Energizer
  - Excentric first Colette, second James, funded by Colette
  - no parser warnings
- `C:\Users\izzyh\Downloads\__ Distant Magnet Wave _ Terraforming Mars.pdf`
  - generation 10
  - James 88 / 87; Corey 76 / 69; Colette 58 / 56
  - Polar Explorer, Energizer, Diversifier
  - Excentric, Space Baron, Cultivator placements/funders parsed
  - no parser warnings

## Current blockers — do not work around them

### 1. Identity/privacy migration is prepared but unapplied

`supabase/migrations/20260718050924_claimable_guest_identity_privacy.sql` is
present with static coverage in
`supabase/tests/claimable-guest-identity-privacy-migration.test.ts`.

The live migration ledger confirms it is not applied. The live project lacks:

- `public.player_private_identities`
- `public.player_import_aliases.identity_mode`
- `public.get_public_player_names(uuid[])`
- `public.resolve_import_guest_identity(...)`

The migration supplies separate private username/personal-name storage,
normalizers, uniqueness/index rules, member-scoped RLS, guarded import
resolution, centralized public-name resolution, and privacy-preserving reader
replacements. It performs no production identity backfill. The user previously
reauthorized this identity/privacy migration work, but no production schema or
identity mutation was performed in this handoff state.

### 2. Objective aliases require separate explicit authorization

A read-only Supabase audit of project `qjtwgrjjwnqafbvkkfex` found 11 maps:
Amazonis Planitia, Arabia Terra, Elysium, Hellas, Hollandia, Terra Cimmeria,
Terra Cimmeria Nova, Tharsis, Utopia Planitia, Vastitas Borealis, and Vastitas
Borealis Nova.

All ten fixed maps have exactly five milestones and five awards. No fixed pair
has an identical milestone set, award set, or combined set. All map/objective
relationship orphan counts are zero. Hollandia alone has zero/zero fixed
relationships and is explicitly classified as randomized/unsupported.
Historical games currently use Tharsis (10), Hellas (13), and Elysium (19).

Production `domain_text_aliases` has **zero** milestone/award aliases. The
existing table and RLS are sufficient for objective aliases, but a data-only
migration is required to insert the user-approved printed forms against the
existing canonical objective IDs:

- `Amazonis Engineer` → `A. Engineer`
- `Amazonis Zoologist` → `A. Zoologist`
- `Arabia Manufacturer` → `A. Manufacturer`
- `Collector` → `T. Collector`
- `Politician` → `T. Politician`
- `Vastitas Electrician` → `V. Electrician`
- `Vastitas Spacefarer` → `V. Spacefarer`

Use the existing alias normalizer and unique
`(entity_type, normalized_alias_text)` contract with `source = 'catalog'`.
Do not add a UI hard-coded map/objective list. Rollback must delete only these
inserted catalog alias rows. Canonical objective IDs, map relationships,
historical player IDs, and game IDs must not change.

The user explicitly requires separate authorization for any map/reference-data
migration or production reference-data change. **Ask for that authorization
before creating or applying the alias migration.** Do not overload display
names or silently ignore the missing alias catalog.

“Amazonis Planatia” is a filename typo for Amazonis Planitia. Current map
identification is intentionally objective-derived; do not infer a map from the
filename or add a display-string-only map rule.

## Validation completed after the final ambiguity repair

- `npm.cmd test` — exit 0; 149 files, 787 tests passed
- `npx.cmd tsc --noEmit` — exit 0
- `npm.cmd run lint` — exit 0; four accepted pre-existing warnings:
  three `@next/next/no-img-element` warnings in
  `src/features/insights/score-profile-panel.tsx`, and one unused
  `normalizeProfileHeadToHeadRow` warning in `src/lib/db/analytics-repo.ts`
- `npm.cmd run build` — exit 0; 32/32 pages generated
- `npm.cmd run test:e2e` — exit 0; 1/1 Chromium test passed; one Next.js
  future-version `allowedDevOrigins` warning
- `git diff --check` — exit 0; only Windows LF→CRLF notices

Responsive browser review used the real import component plus a real result PDF
at 1440, 1024, 768, and 390 pixels:

- no page-level horizontal overflow at any width
- visible two-pixel focus outline
- no console errors
- initial form has only result evidence and complete log; no manual map input
- PDF/log generated generation 8 and Hellas
- linked, existing guest, ambiguous, and unresolved states rendered
- username mode and separate first/last-name mode both rendered and labeled
- instructions page had four images, all with non-empty alt text

The temporary review route, screenshots, test results, and dev server were
removed/stopped. Workspace `tmp/` is empty.

## Documentation and Git state

`docs/REDESIGN_STATE.md` has been updated to Step 4.3 active/blocked with the
live schema/reference findings and validation counts. It is uncommitted.

Do not create the required completion handoff
`PHASE-04-STEP-03-import-validation-evidence-and-claimable-guest-identity.md`
until both blockers are resolved and every acceptance criterion passes. This
file is an active-blocker handoff only.

No Step 4.3 commit exists. No push or deployment occurred. No service-role
credential was exposed. No production identity, schema, alias, or Storage
object was mutated. Step 4.4 and Phase 5 were not started.

## Recommended next sequence for Claude

1. Read the governing documents in the assignment order and both Phase 4
   handoffs; inspect `docs/REDESIGN_STATE.md` and this file.
2. Confirm the worktree and preserve every current change.
3. Ask the user for explicit authorization for the minimal objective-alias
   data migration described above.
4. If authorized, create a focused data-only migration and rollback test;
   verify exact canonical IDs from the live catalog rather than inventing IDs.
5. Apply/verify migrations only to the extent explicitly authorized. Do not
   backfill or mutate production identities.
6. Re-run the full validation matrix and live read-only catalog/schema audit.
7. Only when every acceptance criterion passes: update state/phase/decisions,
   review the master plan for a durable update, create the required completion
   handoff, make one focused Step 4.3 commit, and verify a clean worktree.
8. Stop. Do not begin Step 4.4 automatically.
