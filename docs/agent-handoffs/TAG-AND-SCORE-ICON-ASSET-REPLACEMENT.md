# Handoff — Tag and Standard Score Icon Asset Replacement

Separately approved production Storage task executed after Phase 4, Step 4.1.
Phase 4, Step 4.2 was **not** started.

## Production authorization

The user explicitly authorized direct replacement of the images supplied in
`Tags.zip` and `icons.zip` in the `tm-stats` Supabase project. Authorization was
limited to the corresponding canonical tag and standard score-icon root objects.

## Environment

- Project: `tm-stats`, ref `qjtwgrjjwnqafbvkkfex`
- Public buckets: `tm-tag-icons`, `tm-score-icons`
- Existing paths, MIME families, and cache behavior were preserved.

## Source images

- `C:\Users\izzyh\Documents\Terraforming Mars\public\Tags.zip`: 19 PNGs.
- `C:\Users\izzyh\Documents\Terraforming Mars\public\icons.zip`: 10 PNGs.
- The protected original checkout and both source archives were read only and
  were not modified, staged, or committed.

## Mapping and transformation

- The 19 tag PNGs replaced the same canonical lowercase WebP paths. The source
  typo `galatic.png` intentionally maps to `galactic.webp` per explicit user
  direction.
- Tag PNGs were converted to lossless WebP without resizing. Eighteen remain
  1254×1254; Venus remains 732×732 with alpha.
- The 10 score PNGs were uploaded byte-exact to their standard root paths.
  `terraforming_rating.png` maps to canonical `Terraform_Rating.png`.
- No filename inference beyond these explicit source-to-canonical mappings was
  used.

## Production changes and verification

- Replaced 19/19 requested objects in `tm-tag-icons`.
- Replaced 10/10 requested standard objects in `tm-score-icons`.
- Before every upsert, the existing object was downloaded and retained locally.
- After every upsert, the object was downloaded again and its SHA-256 matched
  the prepared replacement; 29/29 passed.
- Final Supabase metadata reconciliation:
  - `tm-tag-icons`: 21 objects, 14,921,436 bytes, WebP only; replacement set
    retains `max-age=3600`.
  - `tm-score-icons`: 21 objects, 12,583,743 bytes, PNG only; standard
    replacement set retains `max-age=0, no-cache`.
- Production `updated_at` timestamps for the 29 targets fall between
  `2026-07-18 03:08:05Z` and `2026-07-18 03:08:20Z`
  (`2026-07-17 23:08` America/New_York).

## Objects explicitly unchanged

- `tm-tag-icons/earth.webp`
- `tm-tag-icons/science.webp`
- all ten `tm-score-icons/axis/` objects
- `tm-score-icons/a5bca072-12a2-4080-863c-1b75c8a20889.png`

Their prior production timestamps and bytes were rechecked after the replacement.

## Rollback

Pre-change object bytes plus before/after verification reports are retained in
the local ignored scratchpad:

`C:\Users\izzyh\Documents\Terraforming Mars Redesign\.npm-cache\tm-asset-replacement-backup-20260717\`

The upload runner was configured to restore every successfully changed object in
reverse order if any upload or hash verification failed. No rollback was needed.
Because the canonical tag paths retain a one-hour cache, an already-cached client
may temporarily see the prior tag art until that cache entry expires.

## Repository and application scope

- No application source file changed for this production task.
- No database row, schema, migration, RLS policy, Storage policy, bucket
  configuration, dependency, route, or deployment changed.
- Repository-wide tests were not run because runtime code was untouched. The
  production verification gate was object backup, upload, byte/hash comparison,
  MIME/cache reconciliation, and explicit unchanged-object reconciliation.

## Exact next action

Await explicit assignment for Phase 4, Step 4.2. This asset task does not grant
permission to begin it or to refresh the axis/legacy icon variants.
