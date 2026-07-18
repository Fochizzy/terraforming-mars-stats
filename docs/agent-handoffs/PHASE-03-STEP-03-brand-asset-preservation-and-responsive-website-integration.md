# Phase 3, Step 3.3 — Brand Asset Preservation and Responsive Website Integration

## Assignment

Preserve, process, and integrate five explicitly approved TM Stats brand
assets (shared header banner, gold/silver/bronze leaderboard laurels,
authentication Mars-landscape background) into the existing responsive
website, through the existing typed asset registry, without regressing
routes, navigation, authentication, leaderboard data, or analytics.

## Branch and commits

- Branch: `redesign/tm-stats-dashboard-rebuild`
- Starting commit: `2231351f172d966ded75ad33e04f04f373cb5ba7`
  (`feat(navigation): validate responsive web route context`)
- Step 3.2 completion commit: unchanged; Step 3.2 was not reopened, amended,
  or recommitted by this step.
- Final Step 3.3 commit: recorded by the commit immediately following this
  handoff.
- Working tree: clean before this step began; all changes below are staged
  for the one focused Step 3.3 commit.

## Sequencing clarification

- Step 3.2 completed before the Step 3.3 asset decisions were issued.
- The Step 3.2 handoff was not expected to contain asset paths, Storage
  plans, or any mention of the banner/laurels/background — that absence is
  expected, not an error or omission.
- Step 3.2 was not reopened, rewritten, amended, or recommitted by this step.
- Step 3.3 was authorized afterward as a standalone brand-asset-preservation
  and integration assignment.

## Preflight findings

- Confirmed directory, branch, and clean working tree; confirmed the Step 3.2
  completion commit and that Step 3.2 predates this assignment.
- All five approved source files exist in the read-only original repository
  (`C:\Users\izzyh\Documents\Terraforming Mars`), with recorded checksums:

  | Asset | Format | Dimensions | Bytes | SHA-256 |
  | --- | --- | --- | --- | --- |
  | `assets/banner.png` | PNG, no alpha | 1983x793 | 1,973,053 | `990cc11b...da56b8` |
  | `public/laurel-gold.png` | PNG, alpha | 1254x1254 | 2,048,411 | `ce98d809...5e9452e` |
  | `public/laurel-silver.png` | PNG, alpha | 1254x1254 | 2,014,227 | `e850e0ef...d781b4037` |
  | `public/laurel-bronze.png` | PNG, alpha | 1254x1254 | 1,986,396 | `5bfa6721...59e996994a4` |
  | `public/Background.png` | PNG, no alpha | 1672x941 | 2,255,982 | `02c12a28...4d05a3b10` |

- Comparing those against the Redesign repository changed the real scope:
  - **Banner**: `assets/banner.png` in the Redesign repo was already
    checksum-identical to the approved source, and already integrated in
    `AppShell` as a bundled Next.js static import. No new copy/replace was
    needed — only wiring it through the typed registry for the first time.
  - **Laurels**: `public/laurel-{gold,silver,bronze}.png` in the Redesign
    repo already existed and were already wired into the real leaderboard
    (`GroupDashboard`, `/group` — not the `/leaderboard` route stub, which
    remains an unimplemented shell per Step 3.1/3.2), but with different,
    outdated checksums/art (committed at `f292dceff`). Genuine replacement
    work.
  - **Auth background**: the Redesign repo had no `public/Background.png`;
    `/login` used a placeholder SVG (`public/auth-mars-background.svg`,
    committed at `fa1c553ed`). Genuine new integration.
- Supabase Storage inspection (live query against project `qjtwgrjjwnqafbvkkfex`):
  existing buckets are `tm-card-full`, `tm-card-thumbs`, `tm-import-evidence`,
  `tm-tag-icons`, `tm-map-images`, `tm-corporation-logos`, `tm-score-icons` —
  no bucket suitable for generic brand/decorative chrome, and no existing
  precedent for storing this asset category in Storage (see Decision below).
- Baseline: 6 directly relevant test files (24 tests) passed before any edit.

## Decision: repository files, not Supabase Storage

Recorded in `docs/redesign/DECISIONS.md`. Per the assignment's own stop
condition ("if no suitable bucket exists, stop before creating one and
report"), the user was asked and chose to keep the existing repository-file
convention (bundled-static banner, `public/*` static backgrounds/laurels)
rather than authorize a new `design-assets` Storage bucket. **No Supabase
Storage bucket was created and no Storage upload occurred.** This does not
affect the separately-established Storage convention for gameplay-data asset
families (corporation logos, cards, tags, maps, score icons).

## Asset processing (all via `sharp`, already a project dependency)

### Laurels

- Inspected alpha channel: confirmed genuine transparency (corner pixels
  `[0,0,0,0]`, no baked checkerboard pixels) via a raw-buffer alpha histogram
  per image (~53% fully transparent, ~43% fully opaque, ~4% anti-aliased
  edge, consistent across all three).
- Measured per-laurel alpha bounding boxes: gold `1158x1156`, silver
  `1156x1149`, bronze `1157x1148`, all on the same `1254x1254` canvas and
  aligned within a few pixels of each other. Content already fills ~92%+ of
  the canvas on every side, so no further cropping/recentering was applied —
  doing so would have risked clipping the star or sparkle highlights for
  negligible margin gain. This finding is recorded here rather than silently
  applying an aggressive trim.
- Resized each (alpha preserved) to a single delivered size: 256x256 PNG,
  `compressionLevel: 9`, `kernel: lanczos3`.
- Verified visually via `sharp` composites onto light (`#f5f0e6`), dark
  (`#0d0f14`), and Mars-orange (`#f06a32`) backgrounds: no checkerboard, no
  white halo, no gray fringe, star and gold-sparkle highlights intact, wreath
  leaves crisp, consistent scale/alignment across all three ranks.
- Byte sizes: gold 2,048,411 → 118,258 (94.2% smaller); silver 2,014,227 →
  115,271 (94.3% smaller); bronze 1,986,396 → 114,665 (94.2% smaller).
- Output paths (overwrite existing, same filenames, no code path change
  needed): `public/laurel-gold.png`, `public/laurel-silver.png`,
  `public/laurel-bronze.png`.
- No separate "lossless master" copy is stored in the Redesign repository —
  the untouched, checksummed original source file in the read-only original
  repository (table above) is the master of record, consistent with how this
  repository has never kept separate master/derivative pairs for
  public-static brand assets.

### Authentication background

- Converted to WebP at native resolution (no upsampling): 1672x941, quality
  82, effort 5.
- Byte size: 2,255,982 → 179,688 (92.0% smaller).
- Output path (new file, does not touch the existing
  `public/auth-mars-background.svg`, which remains referenced by nothing
  after this change but was left in place — see Known limitations):
  `public/auth-page-mars-landscape.webp`.
- Visual review: astronaut, biodome, settlement, tower, orange atmospheric
  sky, and horizon all clearly preserved; no visible banding or blocking.

### Banner

- No processing performed. The approved source is byte-identical to what was
  already integrated; only its resolution path changed (see Header
  integration below).

## Files changed

- `src/lib/assets/static-assets.ts` — added `auth-page-mars-landscape`,
  `leaderboard-laurel-gold`, `leaderboard-laurel-silver`,
  `leaderboard-laurel-bronze` to `StaticSiteAssetKey` and their definitions;
  narrowed `resolveStaticSiteAsset`'s return type from `ResolvedAsset` to
  `AvailableAsset & { height: number; width: number }` (accurate to its actual
  behavior — it never returns an unavailable result — and needed so
  `next/image`'s required numeric `width`/`height` props type-check at call
  sites); updated its stale doc comment ("does not integrate any page") since
  it now does.
- `src/components/layout/app-shell.tsx` — banner now resolved via
  `resolveStaticSiteAsset('application-banner')` instead of a hardcoded
  import + literal `alt`/`width`/`height`; identical rendered output (same
  `next/image`, non-fill, `priority`, `sizes="100vw"`).
- `src/features/analytics/group-dashboard.tsx` — replaced the raw
  `getLaurelImageForRank` path lookup with `getLaurelAssetForRank` (returns a
  resolved registry asset for ranks 1-3, `null` for rank 4+); replaced the
  inline laurel `<Image>` with `<LeaderboardRankBadge>`.
- `src/features/analytics/leaderboard-rank-badge.tsx` (new) — small client
  component rendering an always-visible `#N` rank text plus a decorative
  (`alt=""`, `aria-hidden`) laurel image that is dropped (not replaced by a
  fallback chip) if it fails to load, leaving the rank text as the sole,
  still-accurate indicator.
- `src/app/(auth)/login/page.tsx`, `src/app/(auth)/reset-pin/page.tsx`,
  `src/app/auth/reset-pin/page.tsx` — background `url(...)` now resolved via
  `resolveStaticSiteAsset('auth-page-mars-landscape')` instead of the
  hardcoded `/auth-mars-background.svg` literal; gradients, colors, and
  `backgroundColor` fallback unchanged. Per explicit user direction given
  mid-task, both reset-PIN routes were included alongside `/login`.
  `/forgot-pin` has no background today and was intentionally left unchanged.
- `public/laurel-gold.png`, `public/laurel-silver.png`,
  `public/laurel-bronze.png` — replaced with the reprocessed approved art.
- `public/auth-page-mars-landscape.webp` (new) — processed auth background.
- Tests added/updated (see below).
- `.claude/launch.json` (new) — minimal dev-server launch config
  (`npm run dev`, `autoPort: true`), added so this step's live browser
  responsive review was possible; Step 3.2 had recorded being unable to start
  a dev server as a known limitation, so this is also available to future
  steps.
- Documentation: this handoff, `docs/REDESIGN_STATE.md`,
  `docs/redesign/phases/03-navigation-and-routes.md`,
  `docs/redesign/DECISIONS.md`.

## Fallback behavior

- **Header**: banner failure has no custom fallback beyond the browser's
  default broken-image handling — unchanged from before this step (the
  banner was already a plain `next/image` with no error handler). Since the
  asset is a bundled build-time import rather than a runtime-fetched URL, its
  "availability" is a build-time property, not a runtime failure mode, so no
  new fallback logic was added or was necessary here; navigation and header
  text remain fully independent of the banner regardless.
- **Leaderboard**: rank is always shown as visible `#N` text, independent of
  the laurel. If a laurel image fails to load, `LeaderboardRankBadge` removes
  it (via `onError`) and leaves the rank text and row fully intact — verified
  by test (see below).
- **Authentication background**: unchanged mechanism — a CSS
  `background-image` layered over an explicit `backgroundColor: '#080b10'`.
  If the image request fails, the solid dark fallback color already shows
  through automatically; this required no code change since it was already
  the pattern in use.

## Header integration

`AppShell` now resolves the banner through `resolveStaticSiteAsset` instead
of importing it directly, with identical `alt`, `width`, `height`, `src`
(same underlying built asset), `priority`, and `sizes`. No navigation
markup, semantics, active-route handling, or CSS changed.

## Header responsive behavior

Not independently re-reviewed at new viewport widths in this step, because
the banner's rendering path (CSS: full-width, `height: auto`, inside an
`overflow: hidden` frame) is unchanged from Step 3.2, which already reviewed
it; only the value-sourcing mechanism changed. Live verification of the
authenticated header was not possible in this step (see Known limitations).

## Leaderboard integration

- Rank 1 → `leaderboard-laurel-gold`, rank 2 → `leaderboard-laurel-silver`,
  rank 3 → `leaderboard-laurel-bronze`, rank 4+ → no laurel — enforced by
  `getLaurelAssetForRank` and covered by test.
- Rank text (`#1`, `#2`, ...) is now rendered for every row, not just the top
  three, so rank is legible without any image at any position.
- Sorting, ranking source (`leaderboardRows` order from
  `getGroupAnalytics`), ties, scores, names, and links are unchanged — no
  analytics or formula code was touched.

## Login and registration integration

There is no separate registration route; sign-up is a mode toggle on
`/login`, which shares the same background layer, so it required no separate
integration. Auth form semantics, labels, validation, autocomplete,
password-manager (PIN-manager) compatibility, keyboard order, focus,
recovery/login links, return-path handling (`normalizeNextPath`), and
middleware were not touched.

## Authentication behavior preservation

Verified unchanged: `LoginForm`'s sign-in/sign-up toggle, username/PIN
fields, submit behavior; `ResetPinForm`'s recovery-session check
(`getSession`/`setSession`) and its "invalid or expired" error path (observed
live — see Visual review below); return-path preservation via
`normalizeNextPath`. No authentication architecture, provider, or validation
rule changed.

## Tests added/updated

- `src/lib/assets/asset-resolver.test.ts` — resolves the 4 new keys with
  correct `alt`/`decorative`/`family`/`dimensions`/`source`/`url`; asserts no
  two static-site asset keys resolve to the same URL.
- `src/features/analytics/leaderboard-rank-badge.test.tsx` (new) — rank text
  always visible; image renders when an asset is provided and is
  `aria-hidden`/`alt=""`; no image when `laurelAsset` is `null`; image is
  removed (via `fireEvent.error`) while rank text remains, on load failure.
- `src/features/analytics/group-dashboard.test.tsx` — new case: 4
  leaderboard rows resolve to gold/silver/bronze/no-laurel respectively (by
  `src` substring), all three images `aria-hidden`/`alt=""`, and `#1`-`#4`
  rank text all present.
- `src/app/(auth)/login/page.test.tsx` — new case: background resolves
  through the registry (`main` element's inline style contains
  `/auth-page-mars-landscape.webp`) with the `#080b10` fallback color still
  set.
- `src/app/(auth)/reset-pin/page.test.tsx` (new), `src/app/auth/reset-pin/page.test.tsx`
  (new) — same background-resolution assertion for both reset-PIN routes,
  plus their respective headings ("Create A New PIN" / "Set A New PIN");
  `@/lib/supabase/browser` mocked (matching the existing `login-form.test.tsx`
  pattern) since these render `ResetPinForm`, which calls
  `createSupabaseBrowserClient` and `supabase.auth.getSession` on mount.

## Exact validation results

- `npx vitest run` (full suite): **124 test files passed, 614 tests passed**.
  (10 files / 60 tests were the directly affected/new set, run first and
  confirmed green before the full run.)
- `npx tsc --noEmit`: clean, no errors.
- `npx eslint .`: **0 errors, 4 warnings** — the same pre-existing baseline
  warnines recorded in the Step 3.2 handoff (`score-profile-panel.tsx` ×3
  `no-img-element`, `analytics-repo.ts` ×1 `no-unused-vars`); no new warning
  introduced.
- `npm run build`: succeeded, **31/31 pages generated**, same 4 lint warnings
  surfaced during the build's lint pass, no build errors.
- No repository-provided asset-validation, image-dimension-validation, or
  Storage-validation script exists to run (none was found in `package.json`
  during preflight); none was skipped, since none exists.

## Responsive and visual review

- Live browser (via a new `.claude/launch.json` dev-server config,
  `http://localhost` on an auto-assigned port since 3000 was occupied by an
  unrelated process): `/login` and `/reset-pin` reviewed at 390x844, 768x1024,
  and 1440x900. At all three: background renders correctly, dark
  gradient/color overlay keeps form text and fields at strong contrast, no
  horizontal scroll, no clipped controls. At 390px the astronaut is cropped
  out of the centered `background-position: center` crop (explicitly
  permitted — "the astronaut does not have to remain visible at every
  viewport width"); at 768px and 1440px the astronaut, dome, and tower are
  all visible. `/reset-pin` (legacy `auth/reset-pin` route) was also loaded
  directly with no recovery token and correctly showed its existing "invalid
  or expired" error state and heading, confirming authentication/recovery
  behavior is untouched.
- The three leaderboard laurels were visually reviewed via `sharp`-rendered
  composites against light/dark/Mars-orange backgrounds (see Asset processing
  above) rather than in a live authenticated browser session — no
  authenticated test credentials exist in this environment, the same
  limitation Step 3.2 recorded. The header banner (identical asset, only its
  resolution path changed) was likewise not independently re-screenshotted
  live for the same reason. Both are additionally covered by the automated
  test suite (rank/laurel mapping, decorative semantics, fallback behavior).
- No repository-provided accessibility-scanning script exists to run; manual
  review confirmed decorative-image semantics (`alt=""`, `aria-hidden`) and
  that rank text is real, non-`aria-hidden` content.

## Performance observations

- Laurels: ~2.0-2.5 MB → ~115-118 KB each (delivered at their actual 48px
  CSS display size with headroom for high-DPI screens, versus the prior
  1254x1254 originals served at 48px).
- Auth background: ~2.26 MB PNG → ~180 KB WebP at native resolution.
- Banner: unchanged (already an optimized bundled asset before this step).
- No before/after page-weight measurement tool is present in the repository;
  the byte-size deltas above are direct file measurements, not a claimed
  Lighthouse/network measurement.

## Known limitations / deferred

- Live authenticated browser verification of the header banner and
  leaderboard laurels was not performed, for the same reason recorded in the
  Step 3.2 handoff (no authenticated test credentials; the dev fixture at
  `/dev/combined-dashboard` does not render `AppShell`/`GroupDashboard`).
  Substituted with `sharp` composite rendering plus automated test coverage,
  recorded above rather than claimed as live verification.
- `public/auth-mars-background.svg` and the `auth-mars-background` registry
  key are now unreferenced by any page (all three consumers were moved to the
  new asset), but neither was deleted — this predates Step 3.3 and removing
  it is not one of the five approved assets in scope; left as a candidate for
  a future cleanup step rather than acted on here.
- `docs/redesign/ASSET-INVENTORY.md` was not updated with the new laurel/
  background byte sizes; it is a Phase 0 inventory snapshot rather than a
  living document this step's authority order requires maintaining, so it was
  left as-is.

## Explicitly not changed

- No analytics, formula, schema, migration, Storage, or production data
  action occurred.
- No database migration was created or applied; no database asset record was
  inserted or updated.
- No service-role credential was exposed; no client-side upload capability
  was added.
- No Merger migration or backfill was performed.
- No push or deployment was performed.
- TM Stats is a responsive website, not a mobile application; no app-style
  mobile navigation, mobile bottom navigation, or separate mobile information
  architecture was introduced.
- Gold represents first place, silver second, bronze third; fourth place and
  below receive no top-three laurel.
- Authentication behavior and return paths were preserved.
- Step 3.4 and Phase 4 were not started.

## Next action

Await explicit assignment for Phase 3, Step 3.4 — Navigation and Route Phase
Closure.
