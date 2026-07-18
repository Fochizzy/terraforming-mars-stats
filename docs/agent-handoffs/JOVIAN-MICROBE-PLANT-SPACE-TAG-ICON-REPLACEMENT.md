# Handoff — Jovian, Microbe, Plant, and Space Tag Icon Replacement

Separately approved four-object production Storage follow-up executed after the
2026-07-17 tag/standard-score and Other Card replacements. Phase 4, Step 4.2 was
**not** started.

## Production authorization

The user explicitly authorized replacement of only the supplied Jovian,
Microbe, Plant, and Space tag images in Supabase.

## Target and source mapping

- `Tags/Jovian.png` → `tm-tag-icons/jovian.webp`
- `Tags/Microbe.png` → `tm-tag-icons/microbe.webp`
- `Tags/Plant.png` → `tm-tag-icons/plant.webp`
- `Tags/Space.png` → `tm-tag-icons/space.webp`

Project: `tm-stats`, ref `qjtwgrjjwnqafbvkkfex`.

Every supplied PNG is 1254×1254 with alpha. Each was converted to lossless WebP
without resizing so the established canonical path, MIME family, transparency,
and one-hour cache contract remain valid.

## Production change and verification

Each current target was downloaded and backed up before mutation. Each uploaded
replacement was downloaded again and matched to its prepared SHA-256:

| Object | Final bytes | Final SHA-256 |
| --- | ---: | --- |
| `jovian.webp` | 1,014,346 | `f11df0e564c28a9ffb85db8b6e2a5ff2886bd71e6ec236f0986ed7b99fc79ce5` |
| `microbe.webp` | 810,314 | `d62e6c1a8d64ae7d7083a2ba5d3f45e41d0d30ffaaf69f0b32aa43efbf76b1b4` |
| `plant.webp` | 717,660 | `37d801636096ba3b27a6decdf67c4ae1f368d7c02cd926fd841f2047d01951bd` |
| `space.webp` | 1,285,564 | `6154bcd12710fb01cec90f408af428b07eef0aa4c618adbb9c88a234b2b25326` |

Supabase metadata reports `image/webp` and `max-age=3600` for all four. Their
production `updated_at` timestamps fall between `2026-07-18 03:21:04.442225Z`
and `2026-07-18 03:21:06.428946Z` (`2026-07-17 23:21` America/New_York).
Final `tm-tag-icons` inventory: 21 WebP objects, 14,910,938 bytes.

## Objects explicitly unchanged

Every other Storage object was outside scope. No fifth tag object, score icon,
axis/legacy variant, corporation logo, map, card image, or import-evidence object
changed.

## Rollback

The immediate pre-change objects, prepared WebPs, and before/after verification
report are retained in the local ignored scratchpad:

`C:\Users\izzyh\Documents\Terraforming Mars Redesign\.npm-cache\tm-four-tag-replacement-20260717\`

The runner was configured to restore all successfully changed objects in reverse
order and verify their hashes if any upload failed. No rollback was needed.
Because these canonical paths retain a one-hour cache, an already-cached client
may temporarily see the prior artwork until its cache entry expires.

## Repository and application scope

- No application code, database row, schema, migration, RLS/Storage policy,
  bucket configuration, dependency, route, or deployment changed.
- Repository-wide tests were not run because runtime code was untouched.
- Production validation consisted of four backups, four lossless conversions,
  four upserts, post-upload hash verification, and metadata reconciliation.

## Exact next action

Await explicit assignment for Phase 4, Step 4.2. This follow-up grants no
permission to change any other asset.
