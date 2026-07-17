# Handoff — Corporation Logo Asset Replacement and Remapping

Separately approved production task, executed between Phase 2 Step 2.5 and
Step 2.6. Step 2.6 was **not** started.

## Production authorization

Explicit, task-scoped authorization to replace corporation-logo objects in the
`tm-corporation-logos` Storage bucket and to update only
`public.corporations.logo_path`. No other Storage bucket, corporation field,
schema, RLS policy, bucket configuration, or unrelated asset was modified.
No deployment was performed.

## Environment

- Project: `tm-stats`, ref `qjtwgrjjwnqafbvkkfex`,
  `https://qjtwgrjjwnqafbvkkfex.supabase.co`
- Bucket: `tm-corporation-logos` — public, `image/png` only, 5 MB limit, objects
  at bucket root (unchanged).
- Authoritative registry: `public.corporations`; stable identity
  `id` + `code`; display-only `name`; mapping field `logo_path`.

## Source images

- Base source: user-supplied `assets/Corps_Transparent_Normalized.zip` from the
  protected original checkout `C:\Users\izzyh\Documents\Terraforming Mars`,
  extracted read-only to a session scratchpad (112 PNGs). The original checkout
  was not modified, staged, or committed.
- User-supplied replacement art (16 corporations): 10 for the previously-missing
  corporations whose zip art shipped with a baked-in checkerboard
  (Aristarchus, Bentenmaru, Colonial One, Labour Union, Mars Coalition, Palladin
  Shipping, Project 10, Secret Santa Society, Spaceways, Tempest Inc); 1 for
  Hecate Speditions (the zip art was garbled); and 5 restyled/enlarged logos
  (Aridor, Mars Direct, Steelaris, Thorgate, Viron) to remove an orange-on-orange
  "double orange" and an unreadably-small Aridor. Each replacement was matched to
  its corporation by reading the embedded wordmark, never by filename.

## Stable identity

Every mapping was verified against `public.corporations.id` and `code`. Filenames
(UUID downloads and zip names), display names, prior `logo_path`, object names,
and URLs were never treated as identity. Five near-miss filenames were adjudicated
by the user (Storm_Craft→stormcraft-incorporated, Sagitta→sagitta-frontier-services,
Hadesphere Industries→hadesphere, Hecatate/Hecate→hecate-speditions,
Henkei→henkei-genetics).

## Original baseline audit (re-verified this task)

- 116 corporation records, 116 non-null `logo_path`, 116 objects, 112 distinct
  paths.
- 1 corporation path with no object (`community:marabout-shiritori` →
  `Marabout_Shiritori.png`).
- 5 unreferenced objects (`Corporate Era.png`, `Corporation Graph.png`,
  `Marabout.png`, `Nanotec_Industries.png`, `Slice.png`).
- 4 paths shared by two corporations each (Athena, Eris, Kuiper Cooperative,
  Tycho Magnetics).

## Presentation decisions (approved)

- Every logo is rendered on a uniform **800×800** tile: trimmed to content,
  upscaled/downscaled to fit with a consistent margin, centered, and flattened
  onto one of three backgrounds chosen per logo for readability against the app
  surface `#141a22`.
- Backgrounds: **white `#ffffff`**, **black `#000000`**, **orange `#f06a32`**
  (the app `--tm-tr` accent). Final distribution: white 60, black 46, orange 10.
- Object naming is content-addressed (`corporation-logo-<sha256>.png`) to bust
  the bucket's one-year cache without overwriting prior objects.
- Shared logos remain shared: both records in each of the 4 pairs point to one
  tile (user-approved).

## Matching results

- 116/116 corporations resolved: 16 verified replacements, 4 near-miss, 96 name
  matches. 0 unmatched, 0 ambiguous, 0 duplicate corporation targets.
- 112 distinct effective tiles (4 shared pairs collapse 116 → 112).
- No corporation without a replacement; no replacement image without a
  corporation; no ambiguous or duplicate mapping remained.

## Production changes applied and verified

- Uploaded 112 tiles to `tm-corporation-logos`; each verified public,
  `image/png`, byte-exact (sha256) after upload. Largest tile 742,762 bytes.
- Updated 116 `logo_path` values, matched on `id` AND `code` (updated_rows=116).
- Post-change reconciliation: 116 resolvable, 0 broken, 112 distinct paths, 228
  total objects (116 prior retained + 112 new), 0 non-PNG among referenced new
  objects.
- One transcription typo (a stray space in Vitor's object name during the manual
  UPDATE) was detected by the reconciliation check and corrected; final state has
  0 broken.

## Objects removed / retained

- Removed: none. All prior objects were retained for rollback safety; the
  content-addressed scheme avoids collisions.
- The pre-existing missing object for `community:marabout-shiritori` is resolved:
  that corporation now points to a valid uploaded tile.

## Accessibility

The approved corporation-logo alt/labeling policy in `DECISIONS.md` is unchanged:
informative standalone logo → corporation name; logo beside a visible name →
empty alt; logo-only control → accessible name containing the corporation name;
missing/failed → text fallback; embedded image text is never relied on for
screen readers. Every tile embeds the corporation wordmark, and the app resolver
continues to supply the accessible name from `corporations.name`, not the image.

## Application validation

- `src/lib/assets/asset-resolver.ts` `resolveCorporationLogoAsset` builds the
  public URL from bucket + normalized `logo_path`; the new content-addressed
  names pass path normalization and encode to valid public URLs (verified during
  upload, HTTP 200, byte-exact).
- `src/lib/db/reference-repo.ts` `listCorporations` now selects `code` and
  `logo_path` so consumers can resolve logos by stable identity.
- `src/lib/assets/corporation-logo-registry.ts` provides pure ID/code-verified
  registry lookup, shared-path detection, and remap validation.

## Tests

- `src/lib/assets/corporation-logo-registry.test.ts` — identity resolution,
  duplicate/ambiguous rejection, no display-name/filename/URL identity,
  shared-path reporting, remap acceptance/rejection.
- Updated `asset-image.test.tsx` (logo-only accessible control) and
  `log-game-wizard.test.tsx` (corporation option carries `code`/`logoPath`).
- Asset suite: 48/48 passing. Repository typecheck clean.

## Full validation

See `REDESIGN_STATE.md` for the exact commands and counts recorded at commit.

## Rollback

`docs/redesign/assets/corporation-logos/ROLLBACK.md` plus
`corporation-logo-rollback-manifest.csv`. A database revert of `logo_path`
fully restores prior logos; no object restore is required.

## Known limitations

- Thorgate's restyled art is a dark moon-plate on black; legible but slightly
  boxy. Mars Direct's crimson wordmark on orange is legible but lower-contrast.
  These are user-approved.
- The corporation-logo display surface in the product UI is future redesign work;
  this task delivers the asset + data layer (Storage objects, `logo_path`,
  resolver, registry, tests). Frontend code changes are committed but not
  deployed (deployment is out of scope).

## Repository commit

Recorded in `REDESIGN_STATE.md` at completion.

## Exact next action

Step 2.6 — Analytics Foundation Integration Validation, only when separately
assigned. This task did not begin it.
