# Phase 1, Step 1.2 Handoff — Shared Asset Foundations

## Status

Completed on 2026-07-17.

## Branch and baseline

- Branch: `redesign/tm-stats-dashboard-rebuild`
- Baseline/verified prior step: `331c88c158d5dd293b62db0d838305bd86161955`
  (Phase 1, Step 1.1), clean worktree
- Production behavior changes: none — no existing route, page, component,
  query, formula, navigation item, or production asset consumer was modified
- Database migration created or run: none
- Supabase data, schema, policy, function, bucket, Storage object, or credential
  changed: none
- Image files uploaded, moved, renamed, replaced, or deleted: none
- New dependencies: none
- Deployment: none

## Scope completed

Step 1.2 adds the shared typed asset foundation needed by later owning phases:

- a discriminated `ResolvedAsset` model for available and unavailable assets;
- canonical key and stored-object-path normalization;
- encoded public Storage URL construction using the existing validated
  Supabase URL configuration;
- explicit public Storage, public static, bundled static, external public, and
  private signed source/access types;
- family resolvers for corporations, score sources, tags, cards, maps,
  tracked brand/backgrounds, and pre-authorized import evidence;
- explicit text-fallback resolvers for Prelude, milestone, and award families
  without authoritative per-entity art;
- an accessible, noninteractive `AssetImage` with responsive reserved layout,
  informative/decorative alt behavior, lazy/eager loading control, and a
  one-transition network/decode fallback;
- direct resolver/component tests and a future-consumer usage guide.

Nothing consumes the new system yet. Production integration remains assigned
to later phases.

## Required files inspected

- Governance and state: `AGENTS.md`, `CLAUDE.md`,
  `docs/REDESIGN_STATE.md`, `docs/redesign/MASTER-RULES.md`,
  `docs/redesign/DECISIONS.md`,
  `docs/redesign/phases/01-shared-components.md` (empty),
  `docs/redesign/ASSET-INVENTORY.md`,
  `docs/redesign/MIGRATION-MATRIX.md`, and
  `docs/agent-handoffs/PHASE-01-STEP-01-shared-design-foundations.md`
- Prior commit: full file list/stat and implementation at
  `331c88c158d5dd293b62db0d838305bd86161955`
- Current repository conventions: `src/lib/env.ts`, Supabase browser/server
  clients, `src/lib/db/reference-repo.ts`, `next.config.ts`, Vitest setup,
  Step 1.1 foundation barrel/styles, the landing/banner consumers,
  `PromoSetBrowser`, and `ScoreProfilePanel`

## Read-only prototype references inspected

The four explicitly permitted files in the original worktree were inspected
read-only; the original worktree was not edited, staged, cleaned, or reset:

- `src/lib/assets/terraforming-mars-assets.ts`
- `src/lib/assets/terraforming-mars-assets.test.ts`
- `src/components/assets/terraforming-mars-asset-image.tsx`
- `src/components/assets/terraforming-mars-asset-image.test.tsx`

Useful ideas retained and expanded: environment-derived public URL base,
segment encoding, typed score-source keys, stored corporation logo paths, lazy
loading, and a text fallback. Prototype behavior deliberately not copied:
display-name-derived tag filenames, only three public buckets, null-only
unavailability, no canonical/source/access metadata, no card/map/static/private
boundary, no signed expiry, no loading state, square-only display, and
decorative/informative ambiguity.

## Files created

### Shared asset logic

- `src/lib/assets/asset-types.ts`
- `src/lib/assets/asset-resolver.ts`
- `src/lib/assets/static-assets.ts`
- `src/lib/assets/index.ts`
- `src/lib/assets/asset-resolver.test.ts`

### Shared rendering

- `src/components/assets/asset-image.tsx`
- `src/components/assets/asset-image.test.tsx`
- `src/components/assets/index.ts`

### Documentation

- `docs/redesign/SHARED-ASSET-FOUNDATIONS.md`
- `docs/agent-handoffs/PHASE-01-STEP-02-shared-asset-foundations.md`

## Files modified

- `docs/REDESIGN_STATE.md`

`docs/redesign/DECISIONS.md` is unchanged. Step 1.2 implemented the assigned
foundation while preserving every asset-identity/product blocker already
recorded in the inventory and migration matrix; it approved no new production
mapping, art source, cache policy, route, schema, or visibility policy.

## Asset metadata and resolver behavior

Every `ResolvedAsset` contains:

- `url` (`string` only when available; otherwise `null`);
- normalized canonical key and typed family;
- alt text and decorative intent;
- width/height and aspect ratio when confirmed;
- discriminated source/access metadata;
- deterministic full/compact fallback metadata;
- available/unavailable status and unavailable reason.

Canonical normalization is centralized and applies Unicode compatibility,
trim/case normalization, and stable separator normalization. Object paths are
decoded once, validated, and encoded per segment. Traversal, root-relative
paths, empty segments, backslashes, fragments/queries, controls, and malformed
percent encoding are rejected.

Public Storage URLs use `NEXT_PUBLIC_SUPABASE_URL` through `getPublicEnv()` and
contain no API key. Missing configuration returns `missing-configuration`.
External public card URLs reject credentials and signed/token-bearing URLs.
Private evidence accepts only an already-authorized, unexpired signed URL for
`tm-import-evidence`; the foundation never signs, authorizes, refreshes,
persists, or exposes private content.

## Asset families supported

### Available when required metadata/configuration is supplied

- Corporation logos — `corporations.id`/code plus stored `logo_path`
- Score-source icons — typed ten-key standard/axis registry
- Tag icons — explicit 15-code registry
- Card images — `source_card_id`, full/thumb variant, stored path or approved
  external URL
- Map graphics — `maps.code` plus an explicit path (no display-name inference)
- Brand/background — tracked banner, global Mars background, and auth Mars
  background metadata with confirmed dimensions
- Import evidence — pre-authorized signed private descriptor only

### Formalized unavailable/text-fallback families

- Prelude graphics
- Milestone graphics
- Award graphics

## Deliberately unsupported or unresolved mappings

- Tag `clone` and `crime`: `source-unavailable`
- Six bucket-only tag concepts including `wild_planet`: not aliases for the
  database vocabulary and return `unsupported-key`
- Legacy UUID Cities score icon: not made canonical; current production
  consumer remains untouched
- Marabout Shiritori: no `Marabout.png` remap
- Wildlife Sponsors and three Pathfinders cards: no URL/data repair
- Terra Cimmeria Nova: no identity decision or inferred mapping
- Prelude, milestone, and award art: text fallback until authoritative licensed
  sources exist
- Player avatars and generic scaffold imagery: outside Step 1.2 family scope
- Private evidence authorization, signing, refresh, retention, and display:
  remains in Phase 4/5/20

## Fallback and rendering behavior

- Stable full labels, two-character compact labels, and explicit unavailable
  messages are generated from family plus entity label.
- Informative fallbacks use `role="img"` with the complete unavailable message.
- Decorative images/fallbacks use empty alt/`aria-hidden` and do not duplicate
  adjacent visible labels.
- The fallback displays a visible `!`, so unavailable state is not color-only.
- Long names remain in the label/message/title even when constrained UI shows
  compact initials.
- Loading reserves the final display dimensions/aspect ratio and announces only
  informative image loading.
- A network/decode error removes the failed image and swaps to fallback once;
  browser broken-image UI is never left visible.
- The wrapper is keyboard-neutral; interactive semantics belong to an owning
  link/control.
- Theme presentation uses existing `--tm-*` tokens.

## Tests added

Two files / 34 tests cover:

- path encoding and decode-once behavior;
- canonical lookup normalization;
- malformed/traversal/root-relative/missing paths;
- public URL construction and missing environment configuration;
- every declared asset family and the source/access discriminants;
- confirmed score variants and tag mappings;
- known tag gaps and unavailable catalog art;
- card public-Storage versus external sources;
- corporation/map stored-path behavior;
- tracked static dimensions;
- signed/private path matching, separation, and expiry contract;
- deterministic fallback labels and long names;
- informative alt text and decorative semantics;
- loading completion, failed image removal, missing metadata fallback;
- explicit dimensions/aspect ratio; and
- keyboard-neutral rendering.

## Validation results

Compared with the Step 1.1 handoff baseline (70 files / 221 tests; four lint
warnings; build 22/22):

- Focused asset tests — 2 files / 34 tests passed, 0 failed.
- `npm test` — 72 files / 255 tests passed, 0 failed (+2 files / +34 tests).
- `npx tsc --noEmit` — passed, no errors.
- `npm run lint` — exit 0 with exactly the four baseline warnings: three
  `@next/next/no-img-element` warnings in `score-profile-panel.tsx` and the
  unused `normalizeProfileHeadToHeadRow` warning in `analytics-repo.ts`, plus
  the existing `next lint` deprecation notice. No new warning; no baseline
  warning changed.
- `npm run build` — passed; 22/22 pages generated; the same four baseline
  warnings only.
- `git diff --check` — passed.

## Assumptions and limitations

- A resolver proves metadata/configuration validity, not remote object
  existence; an object missing at delivery time uses the component error
  fallback.
- Map art requires an explicit caller-supplied path because current map rows do
  not carry asset metadata and the Nova identity is unresolved.
- Card source/path selection is formalized but not wired into the current
  repository fallback chain in this step.
- The named standard Cities score file is confirmed to exist, but the current
  legacy UUID visual identity remains unverified. No consumer was migrated.
- The primitive has direct DOM/accessibility/state tests. Page-level visual and
  LCP verification belongs to the first authorized production consumer.
- No Step 1.3 name or scope is documented in the empty Phase 1 file or current
  migration matrix. The next agent must receive an explicit substep assignment
  rather than infer one.

## Next action

Await explicit assignment of the next approved Phase 1 substep. Do not begin
Phase 2, page integration, route/navigation work, schema work, asset repair,
Storage mutation, or deployment without that assignment.

## Commit

The completion commit containing this handoff includes only Step 1.2 code,
tests, state, and documentation. Its hash is reported after the commit is
created.
