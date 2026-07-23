# Handoff — Space Tag Icon Replacement (2026-07-22)

Single-object production Storage replacement executed under explicit owner
instruction. No phase or substep was started; Phase 4, Step 4.3 remains blocked
at its release boundary exactly as `docs/CURRENT_STATUS.md` records.

## Production authorization

The owner instructed: "Replace the supabase asset in tags labeled space with
this", supplying the replacement art and then its path:

`C:\Users\izzyh\Documents\Terraforming Mars\assets\Tags\Space.png`

The authorization covers the single `space` tag object. No other Storage object,
bucket, row, or configuration was in scope.

## Target

- Object: `tm-tag-icons/space.webp` (public bucket)
- Project: `tm-stats`, ref `qjtwgrjjwnqafbvkkfex`
- Resolver path: `tagIconPathByCode.space` in `src/lib/assets/asset-resolver.ts`,
  already `space.webp`, so **no code change was required or made**.

## Source

| | |
|---|---|
| Path | `…\Terraforming Mars\assets\Tags\Space.png` |
| Bytes | 1,173,918 |
| SHA-256 | `fc1825e789618d956d1a6740eb315b96b403e1546030562d6e9839ddec15d6b1` |
| Format | PNG, 1024×1024, alpha present |
| Corner alpha | 0 on all four corners; 255 at centre (transparency is real, not a white box) |

This is a different file from the `…\Terraforming Mars\public\Tags\Space.png`
used by the 2026-07-17 replacement (1,898,813 bytes, last written
2026-07-17 23:18). Both were checked; the `assets` path the owner named is the
one applied.

## Geometry decision — the bucket changed since the last handoff

`JOVIAN-MICROBE-PLANT-SPACE-TAG-ICON-REPLACEMENT.md` recorded lossless WebP
conversion **without resizing**, at 1254×1254, and a 14,910,938-byte bucket.
That is no longer the live convention. Measured this session, before mutating
anything, the other 20 objects are **128×128** and 9,446–22,980 bytes each.

The first upload therefore followed the stale documented convention and was
wrong for the current bucket: a 1024×1024 lossless WebP of 477,338 bytes, which
alone would have been 60% of the bucket's bytes and roughly 30× its largest
sibling. It was live from `2026-07-23T01:13:08.465Z` to
`2026-07-23T01:14:21.263Z` (~73 seconds) and was then superseded, in place, by
the correctly sized object below. It was never referenced by a code change and
the canonical path never changed, so no consumer saw a broken or missing asset
at any point — only, briefly, an oversized correct image.

The applied object matches the live convention: 128×128, `fit: contain` onto a
fully transparent background, lossless WebP, no crop, aspect ratio preserved.

## Applied change and verification

| | Pre-change | Applied |
|---|---|---|
| Bytes | 21,056 | 19,658 |
| SHA-256 | `c208aee474d0597561b12b235502e76ae2028597a6bd7ea0f0d93555dd6a165d` | `fdf6f85ec72c8a5a7ed28a7358ab3405c83bbcf5bb5ee2697254aae11e94f52b` |
| Format | WebP 128×128, alpha | WebP 128×128, alpha |

Verified after upload:

- Re-downloaded through the Storage API; SHA-256 matched the prepared bytes.
- Storage metadata reports `image/webp` and `max-age=3600`, unchanged from the
  bucket contract. `updated_at` is `2026-07-23T01:14:21.263Z`.
- The **public URL** was fetched directly and returns HTTP 200,
  `content-type: image/webp`, `cache-control: public, max-age=3600`, 19,658
  bytes — byte-identical to the object.
- Corner/centre alpha is `0,0,0,0 / 255`, identical in pattern to the
  `jovian.webp` sibling, so transparency survived the resize.
- The served bytes were rendered and visually confirmed to be the supplied
  artwork (gold eight-pointed star on a dark disc with a silver rim).
- Final `tm-tag-icons` inventory: 21 objects, 313,154 bytes; every object
  `image/webp` with `max-age=3600`.

Because the canonical path retains a one-hour cache, an already-cached client
may see the prior artwork until its entry expires.

## Objects explicitly unchanged

Every other Storage object was out of scope. No other tag object, score icon,
axis/legacy variant, corporation logo, map, card image, or import-evidence
object changed. No bucket configuration or Storage policy changed.

## Rollback

The immediate pre-change object, the prepared replacement, both run reports, and
the runner scripts are retained in the local ignored scratchpad:

`C:\Users\izzyh\Documents\Terraforming Mars Redesign\.npm-cache\tm-space-tag-replacement-20260722\`

`backup\space.webp` is the exact pre-change object
(`c208aee4…`). Re-uploading it to `tm-tag-icons/space.webp` with
`contentType: image/webp` and `cacheControl: 3600` is a complete rollback. The
apply runner was written to restore that backup and re-verify its hash on any
upload or verification failure; no rollback was needed.

## Contradiction reported, not reconciled

`docs/redesign/ASSET-INVENTORY.md` is stale for this bucket and was **not**
changed by this task, which had no authorization to restate the inventory:

- Line 102 and line 222 record `tm-tag-icons` as 21 objects / **14,910,938
  bytes**; live is 21 objects / **313,154 bytes**.
- Lines 217, 222, and 242 describe the tag objects as **1254×1254**; every live
  object measured is **128×128**.
- No handoff in `docs/agent-handoffs/` and no commit records the downscale, so
  when and by what process the bucket was re-encoded is not established by
  repository evidence. It happened between 2026-07-17 and 2026-07-22.

Separately, the live bucket holds six objects the resolver does not map —
`galactic`, `infrastructure`, `mercury`, `radiation`, `tourism`, `wild_planet` —
while `tagIconPathByCode` maps 15 codes and treats `clone` and `crime` as
`source-unavailable`. That gap predates this task and is unchanged by it.

Reconciling `ASSET-INVENTORY.md` needs its own assignment: it should re-measure
all 21 objects rather than extrapolate from the 7 measured here.

## Repository and application scope

- No application code, database row, schema, migration, RLS/Storage policy,
  bucket configuration, dependency, route, or deployment changed.
- Repository-wide tests were not run because no runtime code was touched.
- Production validation consisted of one backup, one lossless conversion, the
  superseded oversized upload, the corrected upload, post-upload hash
  verification, public-URL verification, alpha verification, visual
  confirmation, and bucket metadata reconciliation.

## Exact next action

None is authorized by this handoff. Step 4.3 remains blocked at its release
boundary. This follow-up grants no permission to change any other asset or to
reconcile `ASSET-INVENTORY.md`.
