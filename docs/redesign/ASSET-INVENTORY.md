# TM Stats Asset Inventory

## Audit metadata

- Phase: Phase 0 — Repository and Analytics Audit
- Substep: Step 0.4 — Asset Inventory
- Audit date: 2026-07-16
- Branch: `redesign/tm-stats-dashboard-rebuild`
- Starting revision: `f63f4803622e126190f878e2eb41479535eb8c98`
- Supabase project: `qjtwgrjjwnqafbvkkfex` (`tm-stats`)
- Production checks: read-only metadata and `select` queries only
- Production writes, migrations, and Storage mutations: none

This document inventories asset data, files, lookup behavior, rendering behavior,
coverage, access control, and known risks. It does not select new artwork or
begin Phase 1 implementation.

## Classification key

Each family receives one primary classification:

- **Production-ready** — a tracked, currently consumed asset with a stable source.
- **Available but missing a shared resolver** — the source exists, but there is no
  reusable typed lookup and rendering path.
- **Available with incomplete coverage** — most of the source exists, but known
  catalog keys are missing or invalid.
- **Local-only** — found outside the clean redesign worktree and not committed.
- **Duplicated across sources** — multiple competing or overlapping sources exist.
- **Referenced but missing** — application or database metadata points to an asset
  that cannot be resolved.
- **Requires further verification** — existence is known, but identity, ownership,
  or correctness is not established.
- **Not currently available** — no authoritative asset source was found.

## Executive summary

Production contains seven Storage buckets and 4,190 objects. The repository's
migrations declare only `tm-card-full`, `tm-card-thumbs`, and
`tm-import-evidence`. The live-only buckets are `tm-corporation-logos`,
`tm-map-images`, `tm-score-icons`, and `tm-tag-icons`. The live
`corporations.logo_path` column is also absent from repository migrations. This
is reproducibility drift that must be resolved before asset behavior is treated
as fully schema-controlled.

The strongest existing sources are the application banner/backgrounds, public
card derivatives, corporation logos, map graphics, score-source icons, and tag
icons. None of the remote families has a shared, tracked resolver. Card images
have a repository-specific fallback chain, while the score profile hardcodes a
project URL, bucket, and filenames inside the component.

The highest-impact gaps are:

1. two canonical card tags (`clone` and `crime`) lack matching icons;
2. one corporation row (`community:marabout-shiritori`) references a missing
   `Marabout_Shiritori.png` object;
3. one card has an external full-image URL and generic `/file.svg` thumbnail;
4. three distinct cards share one Pathfinders image reference;
5. `terra_cimmeria.webp` and `terra_cimmeria_nova.webp` contain identical bytes;
6. no authoritative Prelude, milestone, award, or player-avatar art source exists;
7. private import evidence can be uploaded, but the application has no signed-URL
   reader or image display path;
8. public bucket cache policy, upload constraints, and migration history are
   inconsistent.

No future component should derive an object path directly from display text.
Canonical database identifiers or explicitly stored paths must drive all asset
lookup.

## Family register

| Family | Primary classification | Canonical source/key | Coverage | Earliest likely phase |
| --- | --- | --- | --- | --- |
| Tag graphics | Available with incomplete coverage | approved tag-code map | 15 of 17 database tag values have exact filenames | Phase 13 |
| Point-source graphics | Duplicated across sources | typed score-source key | 10 standard, 10 axis, 1 legacy object | Phase 1, consumed in Phase 3 |
| Corporation logos | Production-ready (replaced 2026-07-17) | `corporations.id` / `logo_path` | 116 of 116 resolve to uniform content-addressed tiles | Phase 14 |
| Prelude graphics | Not currently available | future `preludes.id` asset metadata | 0 of 135 authoritative images | Phase 14 |
| Card images | Available with incomplete coverage | `cards.source_card_id` and stored URLs | 1,082 of 1,083 rows resolve to each derivative bucket | Phase 13 |
| Map graphics | Duplicated across sources | `maps.code` | 11 of 11 WebP names; one content conflict | Phase 8, expanded in Phase 17 |
| Milestone graphics | Not currently available | future `milestones.id` asset metadata | 0 of 45 per-entity images | Phase 18 |
| Award graphics | Not currently available | future `awards.id` asset metadata | 0 of 43 per-entity images | Phase 18 |
| Player avatars | Not currently available | future `user_profiles.id` asset metadata | no column, bucket, or files | Later product decision |
| Application banner/logo | Production-ready | tracked static import | one banner, two consumers | Phase 1 shell work |
| Background imagery | Production-ready | tracked public paths | global and auth backgrounds present | Phase 1 shell work |
| Landing-page imagery | Production-ready | banner plus global background | present | Phase 1 landing work |
| Leaderboard laurels | Production-ready | tracked rank-to-path map | gold, silver, bronze present | Phase 7 |
| Import screenshot evidence | Available but missing a shared resolver | game UUID/object path | 29 private objects; upload only in UI | Phase 4 or 5 |
| Generic fallbacks/scaffold art | Available with incomplete coverage | tracked public paths | one active generic fallback; four unused templates | Phase 20 cleanup |
| Local archive/import sources | Local-only | untracked folders and archives | multiple overlapping sets | Ownership decision before use |

## Supabase Storage architecture

### Live bucket inventory

| Bucket | Public | Objects | Bytes | Formats | Current cache behavior | Declared in migrations | Mutation policy found |
| --- | ---: | ---: | ---: | --- | --- | ---: | --- |
| `tm-card-full` | yes | 1,991 | 62,786,044 | WebP | 934 one year; 1,057 one hour | yes | none for authenticated users |
| `tm-card-thumbs` | yes | 1,991 | 19,586,788 | WebP | 934 one year; 1,057 one hour | yes | none for authenticated users |
| `tm-corporation-logos` | yes | 116 | 153,624,713 | PNG | all one year | no | none for authenticated users |
| `tm-import-evidence` | no | 29 | 58,487,738 | screenshot evidence | private; retrieval path not implemented | yes | scoped insert/select/delete |
| `tm-map-images` | yes | 21 | 2,689,434 | 10 PNG, 11 WebP | PNG one year; WebP one hour | no | none for authenticated users |
| `tm-score-icons` | yes | 21 | 13,816,192 | PNG | standard no-cache; axis/legacy one hour | no | none for authenticated users |
| `tm-tag-icons` | yes | 21 | 260,844 | WebP | all one hour | no | none for authenticated users |

The public buckets serve objects through deterministic Supabase public URLs.
Public reads do not require an authenticated Storage policy. No public-asset
insert, update, or delete policies were found for authenticated application
users, so normal catalog mutation remains an administrative/service process.

`tm-import-evidence` is private. Its repository migration permits:

- `select` for authenticated group members when the first object-path segment is
  the game UUID;
- `insert` and `delete` for authenticated callers accepted by
  `can_edit_group(...)`;
- no general public read and no update policy.

The live project also contains a later linked-participant delete policy not
captured in the asset-creation migration. Current application uploads use a
non-upsert path, so the lack of update is compatible with the present writer.
The application does not create signed URLs for reading evidence.

Only the corporation and score buckets have an explicit 5 MB file limit and
`image/png` MIME restriction. Card, map, tag, and import bucket constraints must
be verified and intentionally codified before future upload tooling is added.

### URL and authorization boundary

- Public catalog assets: construct or retain public URLs from a trusted bucket
  plus encoded object path. Do not use a service-role key in client code.
- Private import evidence: create short-lived signed URLs on the server, in
  batches, after the same authorization decision used for the game. Never turn
  this bucket public to simplify display.
- Database metadata and object delivery have different access behavior. The
  reference tables are authenticated-read, while their public object URLs can be
  fetched anonymously once known.
- The repository has no generated Supabase `Database` type, and the clients are
  not instantiated with one. Live asset-column drift therefore receives no
  compile-time warning.

## Database asset references

| Table/model | Asset field | Canonical key | Coverage and behavior |
| --- | --- | --- | --- |
| `cards` | `image_url`, `thumbnail_path`, `full_image_path` | `source_card_id` | all 1,083 fields populated; one derivative exception and duplicate mappings |
| `catalog_overrides` | `image_url` | catalog override identity | nullable source override; no shared resolver |
| `corporations` | `logo_path` | `id` or `code` | live-only nullable column; all 116 rows populated, 115 resolve |
| `game_log_imports` | `screenshot_object_path` | game/import identity | private object path persisted after upload |
| `game_result_screenshot_imports` | `storage_object_path` | screenshot-import identity | private object path persisted |
| `group_settings` | `image_reference_mode` | group | defaults to `full`; no tracked application consumer found |
| `maps` | none | `code` | bucket filenames can match codes, but this is not stored metadata |
| `preludes` | none | `id` / `code` | no authoritative image reference |
| `milestones` | none | `id` / `code` | no authoritative image reference |
| `awards` | none | `id` / `code` | no authoritative image reference |
| `user_profiles` / players | none | profile/player ID | no avatar reference |

`corporations.logo_path` and four live buckets must be represented in migration
history if they are accepted as durable production contracts. Step 0.4 does not
create that migration.

## Existing asset helpers and components

### Tracked production code

- `src/lib/db/reference-repo.ts` is the server-only card resolver. The canonical
  Card Lookup uses real `cards` rows and chooses
  `thumbnail_path ?? full_image_path ?? image_url` plus
  `full_image_path ?? image_url`; promo-set slugs are resolved in one batch.
- `src/features/catalog/card-lookup-browser.tsx` renders the responsive full
  catalog with `next/image`, `unoptimized`, informative alternative text, and a
  text fallback for missing, known-placeholder, or failed thumbnails. Its detail
  dialog offers stored full art when available. `PromoSetBrowser` remains a
  specialized browser and is not the canonical Card Database.
- `src/features/insights/score-profile-panel.tsx` hardcodes the Supabase project
  URL, bucket, and filenames. Its `<img>` elements are decorative because labels
  are adjacent. They have no loading or error state.
- `src/lib/db/game-import-repo.ts` uploads screenshot evidence and stores its
  object path. It does not retrieve or display the private image.
- `src/features/analytics/award-map-summary.tsx` generates an illustrative inline
  SVG for only All Maps, Elysium, Hellas, and Tharsis. It does not resolve
  `tm-map-images` objects and must not be treated as authoritative map artwork.
- `src/features/analytics/group-dashboard.tsx` maps the top three zero-based ranks
  directly to tracked laurel paths.
- `src/app/page.tsx` and `src/components/layout/app-shell.tsx` import the same
  banner with different image metadata and optimization behavior.

`next.config.ts` has no remote image allow-list. Remote card images therefore use
`unoptimized`. There is no tracked shared asset service, typed asset-family
registry, public-URL builder, signed-URL builder, or reusable error fallback.

### Untracked prototype in the original checkout

The separate, dirty checkout contains untracked files at
`src/lib/assets/terraforming-mars-assets.ts` and
`src/components/assets/terraforming-mars-asset-image.tsx`, plus tests. They
prototype encoded public URLs, score variants, naive tag filenames, corporation
paths, lazy loading, and initials fallback.

These files are **not production code**, are not present on the redesign branch,
and were not copied. Their tag normalization would not solve the `clone`/`crime`
gap; they also omit card/map/private evidence behavior, batching, asset metadata,
and signed-URL expiry. They are evidence of a possible direction, not an accepted
contract.

## Tag graphics

**Classification: Available with incomplete coverage**

- Example entities: Plant, Space, Wild, Clone, and Crime tags.
- Source and location: public `tm-tag-icons`; 21 WebP objects, 260,844 bytes.
- Local directory: none found on the required branch or in the inspected local
  asset folders.
- Database reference: `cards.gameplay_tags`; no asset-path column.
- Canonical lookup key: a reviewed, typed tag code—not raw display text.
- Exact database values: `animal`, `building`, `city`, `clone`, `crime`, `earth`,
  `event`, `jovian`, `mars`, `microbe`, `moon`, `plant`, `power`, `science`,
  `space`, `venus`, `wild`.
- Exact bucket files: `animal.webp`, `building.webp`, `city.webp`, `earth.webp`,
  `event.webp`, `galactic.webp`, `infrastructure.webp`, `jovian.webp`,
  `mars.webp`, `mercury.webp`, `microbe.webp`, `moon.webp`, `plant.webp`,
  `power.webp`, `radiation.webp`, `science.webp`, `space.webp`, `tourism.webp`,
  `venus.webp`, `wild_planet.webp`, and `wild.webp`.
- Coverage: exact objects exist for 15 of 17 database values. `clone` and `crime`
  are missing. Six extra concepts are not currently emitted by the database:
  `galactic`, `infrastructure`, `mercury`, `radiation`, `tourism`, and
  `wild_planet`.
- Access and URL method: anonymous public URL; no authenticated mutation policy.
- Current helper/display/consumer: none tracked. `/cards` exposes tag metadata and
  current analytics/Insights surfaces use tag text rather than tag images.
- Format and dimensions: WebP; dimensions are not stored in database metadata and
  were not assumed by this audit. Future containers should be square and supply
  explicit dimensions or aspect ratio.
- Dark theme: requires visual review against dark cards; no contrast contract.
- Accessibility: decorative when next to the tag label (`alt=""`); informative
  only when the icon replaces visible text.
- Loading and fallback: none. Future grid use needs lazy loading and a stable
  text/generic-tag fallback preserving dimensions.
- Cache behavior: one hour on all live objects; candidate for versioned,
  immutable, long-cache paths.
- Duplicate/conflict risk: filename normalization is insufficient because
  `wild` and `wild_planet` coexist and two database concepts have no object.
- Migration history: bucket and objects are live-only.
- Future source of truth: approved tag-code-to-object-path registry, backed by
  database vocabulary and captured infrastructure.
- Earliest required phase: Phase 13 (Global Tag Analysis); shared primitives can
  be created in Phase 1.
- Migration risk: high if filenames are inferred or the live-only bucket is
  codified before the vocabulary mismatch is resolved.
- Confidence: high for inventory and mismatch; low for intended semantic mapping
  of extra icons until product/data ownership confirms it.

## Point-source graphics

**Classification: Duplicated across sources**

- Example entities: Terraform Rating, Cities, Animals, Milestones, and Awards.
- Source and location: public `tm-score-icons`; 21 PNG objects. Ten standard
  filenames, ten `axis/` variants, and one UUID-named legacy object.
- Local directory: untracked `assets/transparent_icons`, plus
  `assets/transparent_icons.zip` and `assets/transparent_icons.7z`, in the original
  checkout only.
- Standard keys: Animal, Awards, Card Points, City, Greenery, Jovian, Microbe,
  Milestones, Other Card, and Terraform Rating.
- Exact standard files: `Animal.png`, `Awards.png`, `Card_Points.png`, `City.png`,
  `Greenery.png`, `Jovian.png`, `Microbe.png`, `Milestones.png`,
  `Other_Card.png`, and `Terraform_Rating.png`. The same ten names exist under
  `axis/`; the remaining object is
  `a5bca072-12a2-4080-863c-1b75c8a20889.png`.
- Database reference: none. The source labels correspond to analytics output.
- Canonical lookup key: a typed score-source enum independent of presentation
  label and filename.
- Access and URL method: anonymous public URL; no authenticated mutation policy.
- Current helper/display/consumer: `ScoreProfilePanel` on `/insights` owns the
  filename map and hardcoded URL. Its Cities segment points to legacy
  `a5bca072-12a2-4080-863c-1b75c8a20889.png` rather than `City.png`.
- Format and dimensions: PNG. Current CSS renders decorative sources at about
  1.8 rem, the center source at 3.55 rem, and the orbit at 8.2 rem; segment icons
  disappear below 640 px. The untracked local source set contains seven
  1254-by-1254 RGB images and three 1024-by-1024 ARGB images.
- Dark theme: currently consumed on the dark Insights visualization; visual
  review remains necessary for all standard and axis variants.
- Accessibility: current icons correctly use empty alt text and `aria-hidden`
  because visible source labels carry meaning.
- Loading and fallback: raw images default to eager and show browser-broken-image
  UI on error. Future fallback should keep the label and hide the failed image.
- Cache behavior: standard objects are `no-cache`; axis and legacy objects cache
  for one hour. This should be harmonized with versioned object paths.
- Duplicate/conflict risk: standard, axis, legacy, local folder, ZIP, 7z, and
  untracked helper mappings overlap. The Cities legacy reference is the clearest
  conflicting current mapping.
- Migration history: bucket is live-only.
- Future source of truth: one typed score-source registry with explicit standard
  and axis variants; retire the UUID alias after visual equivalence is confirmed.
- Earliest required phase: shared resolver in Phase 1; active Insights use in
  Phase 3.
- Migration risk: medium; changing the Cities mapping or overwriting cached
  objects without visual verification can silently change the score profile.
- Confidence: high for live objects and current consumer; medium for which City
  variant product owners intend.

## Corporation logos

**Classification: Production-ready (replaced 2026-07-17)**

> **Update — 2026-07-17 (separately authorized asset task).** The gaps below
> (one missing object, incomplete coverage) are resolved. All 116 corporations
> now map to uniform **800×800** content-addressed tiles
> (`corporation-logo-<sha256>.png`) on white/black/orange (`#f06a32`) backgrounds;
> 112 distinct objects (Athena/Eris/Kuiper/Tycho remain intentionally shared).
> Prior objects were retained for rollback. Matching used verified `id`+`code`
> identity only. See `docs/redesign/DECISIONS.md`
> (“Corporation logo asset replacement and presentation”), the handoff
> `CORPORATION-LOGO-ASSET-REPLACEMENT-AND-REMAPPING.md`, and the manifests/rollback
> under `docs/redesign/assets/corporation-logos/`. The pre-task audit findings
> below are preserved as the historical Step 0.4 snapshot.

- Example entities: Athena, Eris, Kuiper Cooperative, Tycho Magnetics, and
  Marabout Shiritori.
- Source and location: public `tm-corporation-logos`; 116 PNG objects totaling
  153,624,713 bytes.
- Local directory: untracked raw `assets/Corps/Corps` and normalized
  `assets/Corps_Transparent_Normalized/Corps_Transparent_Normalized`, plus their
  ZIP archives, in the original checkout only.
- Database reference: live `corporations.logo_path`; the column is absent from
  local migrations and handwritten app types.
- Canonical lookup key: `corporations.id` or `corporations.code`, with the stored
  `logo_path` returned by the repository. Never generate a filename from name.
- Coverage: all 116 rows have a path; 115 paths resolve. Marabout Shiritori
  (`community:marabout-shiritori`) expects `Marabout_Shiritori.png`, which is
  absent.
- Unreferenced objects: `Corporate Era.png`, `Corporation Graph.png`,
  `Marabout.png`, `Nanotec_Industries.png`, and `Slice.png`.
- Shared paths: Athena, Eris, Kuiper Cooperative, and Tycho Magnetics each have
  two catalog codes sharing one object. This may be legitimate cross-edition
  identity, but it should be recorded explicitly rather than inferred.
- Access and URL method: anonymous public URL; 5 MB limit and PNG MIME restriction;
  no authenticated mutation policy.
- Current helper/display/consumer: none tracked. `CorporationOption` does not
  select `logo_path`; `/log-game` selection and `/insights` corporation analytics
  render text.
- Format and dimensions: live objects are PNG. The matching local normalized set
  is 116 1254-by-1254 ARGB files, so future display should use a square container
  and retain transparency.
- Dark theme: transparent normalized logos appear intended for dark surfaces but
  need contrast QA; logos with dark internal marks may require a neutral plate.
- Accessibility: informative when logo replaces the name; decorative with empty
  alt when the visible corporation name remains adjacent.
- Loading and fallback: none tracked. Use reserved square space and corporation
  initials/name fallback.
- Cache behavior: one year for every live object. Changes need versioned paths or
  content revisions to avoid stale logos.
- Duplicate/conflict risk: one missing expected path, five unreferenced objects,
  four shared mappings, and a full untracked local mirror plus ZIP.
- Migration history: bucket and `logo_path` column are live-only.
- Future source of truth: database `logo_path` plus a captured bucket definition;
  normalized local files should remain import provenance, not runtime lookup.
- Earliest required phase: Phase 14 (Corporation and Prelude Analysis).
- Migration risk: high; the live-only column/bucket, missing object, shared paths,
  and year-long cache must be reconciled before schema or object mutation.
- Confidence: high for filenames, coverage, and live metadata; medium for whether
  `Marabout.png` is the intended replacement for the missing path.

## Cards and Preludes

### Prelude graphics

**Classification: Not currently available**

- Example entities: the 135 live Prelude catalog entries selected during game
  logging; no example artwork is authoritative.
- Source and location: no Prelude bucket, directory, asset-path column, resolver,
  or display component was found.
- Database reference and canonical key: 135 live `preludes` rows; future mapping
  should key by `preludes.id` or `code`.
- Card-bucket warning: some card-like artwork may visually resemble Preludes, but
  it is not an authoritative Prelude contract and must not be inferred from names.
- Access/RLS/URL/cache: not applicable until a source is approved.
- Format/dimensions/dark theme: unresolved. Preserve printed-card aspect ratio if
  licensed full-card imagery is later supplied.
- Accessibility/loading/fallback: current Prelude surfaces should remain text;
  future art needs informative alt only when the name is not already visible,
  lazy loading, reserved ratio, and text fallback.
- Current consumers: `/log-game` Prelude selection and Prelude analytics use
  reference names only.
- Duplicate/migration history: none found.
- Future source of truth: an explicit Prelude asset field or registry with source,
  rights, and version provenance.
- Earliest required phase: Phase 14.
- Migration risk: high until art provenance, licensing, canonical identifiers, and
  derivative policy are approved.
- Confidence: high that no current authoritative source exists;
  source and licensing are blocking product questions.

### Card images

**Classification: Available with incomplete coverage**

- Example entities: Merger, Wildlife Sponsors, Soil Detoxification, High Temp.
  Superconductors, and Controlled Bloom.
- Source and location: public `tm-card-full` and `tm-card-thumbs`, each with 1,991
  WebP objects; external URLs remain in `cards.image_url`.
- Local directory: no committed card-art directory; tracked scripts import catalog
  metadata rather than serving local card images.
- Database reference: all 1,083 card rows have `image_url`, `thumbnail_path`, and
  `full_image_path`. `source_card_id` is the canonical lookup key.
- URL distribution: 976 source URLs point to
  `terraforming-mars.herokuapp.com`, 103 directly to `tm-card-full`, and four to
  `cards.hadronikle.com`.
- Coverage: 1,082 of 1,083 full and thumbnail references resolve to their expected
  Storage objects. `prelude:community:Y30` (Wildlife Sponsors) uses an external
  full URL and `/file.svg` generic thumbnail.
- Conflict: Soil Detoxification, High Temp. Superconductors, and Controlled Bloom
  share the same `project-pathfinders-pftmp.webp` reference despite being distinct
  cards.
- Storage residue: each derivative bucket has 911 objects not referenced by a
  card row. Each also has 48 duplicate-content groups spanning 109 objects, with
  as many as four names for one byte-identical image.
- Access and URL method: anonymous public URL; no authenticated mutation policy;
  bucket file/MIME constraints are not explicit.
- Current resolver/helper: `listPromoCards` uses the database fallback chain.
- Current display/consumer: `PromoSetBrowser` on `/cards`; fixed 3:4 thumbnail,
  informative alt, labeled full-image link, no runtime fallback or skeleton.
- Format and dimensions: derivatives are WebP; current thumbnail renders 72 by
  96. Database/object metadata does not provide authoritative intrinsic dimensions.
- Dark theme: full-card art is self-contained; container/focus/broken-state contrast
  still needs dark-theme QA.
- Accessibility: current alt/link labels are useful but should avoid duplicated
  announcements if the card name is already the link text in a redesigned card.
- Loading and fallback: `next/image` default lazy behavior, `unoptimized`; database
  fallback is evaluated before render, but network/decode failure is not handled.
- Cache behavior: mixed one-year and one-hour metadata within both buckets.
- Migration history: buckets and card fields are declared locally; the tracked
  catalog importer preserves source `image_url`, while no tracked derivative
  upload/versioning pipeline was found.
- Future source of truth: card row metadata, with verified versioned derivative
  paths and external source URL retained only as provenance/emergency fallback.
- Earliest required phase: Phase 13 (Card and Tag Analysis); shared primitive in
  Phase 1.
- Migration risk: high for cleanup or URL rewriting because duplicate-content and
  wrong/shared mappings cannot be corrected safely from filenames alone.
- Confidence: high for counts and mismatches; image identity for duplicate-content
  groups needs visual/source review before cleanup.

## Maps, milestones, and awards

### Map graphics

**Classification: Duplicated across sources**

- Example entities: Tharsis, Elysium, Hellas, Terra Cimmeria, and Terra Cimmeria
  Nova.
- Source and location: public `tm-map-images` with 11 code-keyed WebP objects and
  10 legacy title-case PNG objects; an untracked local folder mirrors the PNG set.
- Local directory: untracked `assets/Maps` in the original checkout only.
- Database reference: 11 `maps` rows and no asset column.
- Canonical lookup key: `maps.code`. Every live code has an exact WebP filename.
- Exact code-keyed files: `amazonis_planitia.webp`, `arabia_terra.webp`,
  `elysium.webp`, `hellas.webp`, `hollandia.webp`, `terra_cimmeria.webp`,
  `terra_cimmeria_nova.webp`, `tharsis.webp`, `utopia_planitia.webp`,
  `vastitas_borealis.webp`, and `vastitas_borealis_nova.webp`.
- Content conflict: `terra_cimmeria.webp` and `terra_cimmeria_nova.webp` have the
  same content hash. The PNG legacy set has no Terra Cimmeria Nova file.
- Access and URL method: anonymous public URL; no authenticated mutation policy or
  explicit file/MIME limits.
- Current resolver/helper: none tracked.
- Current display/consumer: `/log-game` and `/insights` use map names as text.
  `AwardMapSummary` creates a 4:3 inline SVG for four aggregate labels and does
  not use this bucket.
- Format and dimensions: canonical candidates are WebP. Legacy local PNGs are
  near-square ARGB images from 490–625 px wide and 482–566 px high. The future
  component must use explicit metadata rather than assume these dimensions.
- Dark theme: requires visual verification; likely needs a controlled neutral
  plate or overlay treatment.
- Accessibility: a full map preview is informative and should identify the map;
  a small icon next to a visible map name is decorative.
- Loading and fallback: none tracked. Use a fixed map ratio, lazy loading, and map
  name fallback.
- Cache behavior: PNG objects cache for one year; WebP objects for one hour.
- Duplicate/migration history: WebP and PNG sets overlap, the PNG set is mirrored
  locally, the bucket is live-only, and Terra Cimmeria variants conflict.
- Future source of truth: `maps.code` to verified WebP path, preferably captured as
  database metadata if filenames may change.
- Earliest required phase: Phase 8 for map comparison context; expanded map use in
  Phase 17.
- Migration risk: high if the Nova image is accepted by filename alone; medium for
  codifying the bucket after identity and cache rules are settled.
- Confidence: high for coverage and duplicate bytes; low that the Nova artwork is
  semantically correct.

### Milestone graphics

**Classification: Not currently available**

- Example entities: Terraformer, Mayor, Gardener, Builder, and Planner.
- Source and location: no per-milestone bucket, local directory, asset field,
  resolver, or component. The generic `Milestones.png` score-source icon is not
  per-objective art.
- Database reference/canonical key: 45 `milestones` rows; future lookup by stable
  ID/code, not name.
- Current consumers: `/log-game` forms and `/insights` analytics render milestone
  text.
- Access/RLS/URL/format/dimensions/cache: not applicable until a source exists.
- Dark theme/accessibility/loading/fallback: retain visible text. Any future art
  should reserve a consistent aspect ratio and use the objective name as fallback.
- Duplicate/migration history: no authoritative family found.
- Future source of truth: explicit database asset metadata and approved art source.
- Earliest required phase: Phase 18.
- Migration risk: high until per-objective art provenance and rights are resolved.
- Confidence: high for absence; rights, attribution, and art scope
  are unresolved.

### Award graphics

**Classification: Not currently available**

- Example entities: Landlord, Banker, Scientist, Thermalist, and Miner.
- Source and location: no per-award bucket, local directory, asset field, resolver,
  or component. `Awards.png` is a generic score-source icon; laurels are rank
  decoration, not award artwork.
- Database reference/canonical key: 43 `awards` rows; future lookup by stable ID/code.
- Current consumers: `/log-game` forms and `/insights` analytics render award
  text. `AwardMapSummary` is a map illustration, not award art.
- Access/RLS/URL/format/dimensions/cache: not applicable until a source exists.
- Dark theme/accessibility/loading/fallback: preserve award text and do not use an
  unrelated generic icon as if it identifies a specific award.
- Duplicate/migration history: no authoritative family found.
- Future source of truth: explicit database asset metadata and approved art source.
- Earliest required phase: Phase 18.
- Migration risk: high until per-objective art provenance and rights are resolved.
- Confidence: high for absence; rights, attribution, and art scope
  are unresolved.

## Player avatars

**Classification: Not currently available**

- Example entities: authenticated user profiles and saved player identities.
- Source and location: no user/player avatar bucket, local files, profile column,
  resolver, display component, or upload workflow found.
- Canonical lookup key: a future authenticated profile ID, never display name.
- Access/RLS/URL/cache: future avatars would require owner-scoped mutation and an
  explicit public-versus-private delivery decision.
- Format/dimensions/dark theme: unresolved; a square crop and small responsive
  derivatives would be expected if the feature is approved.
- Accessibility/loading/fallback: visible player name or initials should remain the
  durable fallback; adjacent avatars are normally decorative.
- Duplicate/migration history: none.
- Future source of truth: product decision plus profile metadata and Storage policy.
- Earliest required phase: not required by the current redesign sequence.
- Current consumers: player names and initials appear across group, profile,
  logging, and analytics surfaces; no image is consumed.
- Migration risk: high because avatar privacy, ownership, deletion, and public-read
  behavior would require a new product and RLS contract.
- Confidence: high for absence.

## General site imagery

### Application logos, backgrounds, and landing imagery

### Banner / application identity

**Classification: Production-ready**

- Example entity: the Terraforming Mars Statistics brand banner.
- Source and location: tracked `assets/banner.png`, 1,983 by 793 RGB PNG,
  1,973,053 bytes.
- Database/Storage/RLS: none; bundled static import.
- Canonical lookup: direct tracked import.
- Current consumers: landing page and authenticated `AppShell`.
- Rendering: landing declares 1920 by 1080 while the imported source is 1983 by
  793, uses `priority` and `unoptimized`; AppShell declares the actual dimensions,
  uses `priority` and `sizes="100vw"`.
- Dark theme: visually designed for the existing dark shell.
- Accessibility: informative brand alt (`Terraforming Mars Statistics`).
- Loading/fallback/cache: build-managed static URL; no custom fallback. Both
  consumers mark it priority, so shell/LCP behavior should be measured in Step 0.5
  or later implementation validation.
- Duplicate risk: one file with duplicated rendering configuration, not duplicate
  files.
- Future source of truth: one tracked image plus a shared brand/banner wrapper or
  metadata constant.
- Earliest required phase: Phase 1.
- Migration risk: low because the source is tracked; performance and aspect
  metadata should change without replacing the visual identity accidentally.
- Confidence: high; oversized payload and landing aspect metadata
  are the main concerns.

### Background imagery

**Classification: Production-ready**

- Example entities: the global Mars surface scene and auth-route Mars scene.
- `public/mars-background.png`: 975 by 549 RGB PNG, 806,071 bytes; fixed global
  cover background from `globals.css`.
- `public/auth-mars-background.svg`: 512-by-341 viewBox with embedded WebP,
  11,307 bytes; used behind dark gradients on login and both reset-PIN routes.
- Database/Storage/RLS: none; public tracked files.
- Canonical lookup: fixed public path.
- Dark theme: both are explicitly used under dark surfaces/overlays.
- Accessibility: decorative CSS backgrounds, so no alternative text is required.
- Loading/fallback/cache: browser-managed public assets; solid background colors
  must remain usable while images load or fail.
- Duplicate risk: related Mars scenes with separate global/auth roles; not proven
  byte or semantic duplicates.
- Future source of truth: tracked public files; consolidate duplicate auth-page
  style declarations during their owning phase.
- Earliest required phase: Phase 1.
- Current consumers: global `body` styling plus `/login`, `/forgot-pin`, and both
  reset-PIN route implementations.
- Migration risk: low; the main risk is changing contrast or duplicating requests
  while consolidating auth layouts.
- Confidence: high.

### Landing imagery

**Classification: Production-ready**

- Example entity and current consumer: the `/` landing hero.
- Source of truth, local paths, format, dimensions, URL method, cache, theme,
  accessibility, loading, fallback, duplicates, and migration history inherit the
  banner and global-background records above; there is no separate illustration.
- Canonical lookup: tracked banner import plus fixed background path; no database,
  bucket, resolver, or RLS dependency.
- Future source of truth: reuse those tracked sources unless a product decision
  deliberately replaces them.
- Earliest required phase: Phase 1.
- Migration risk: low; preserve brand alt and decorative background semantics.
- Confidence: high.

## Leaderboard laurels

**Classification: Production-ready**

- Example entities: first-, second-, and third-place rank decoration.
- Source and location: `public/laurel-gold.png`, `laurel-silver.png`, and
  `laurel-bronze.png`; each is 1254 by 1254 RGB PNG and approximately 2.26–2.52 MB.
- Database/Storage/RLS: none; tracked public paths.
- Canonical lookup: rank 1/2/3 via `getLaurelImageForRank` in `GroupDashboard`.
- Current display: `next/image`, 48-by-48 fill container, `unoptimized`.
- Dark theme: already used in the dark group dashboard.
- Accessibility: current alts are `1st place`, `2nd place`, and `3rd place`; because
  rank text is also visible, the future component should avoid redundant speech
  and may treat the laurel as decorative.
- Loading/fallback/cache: only three small display slots, no explicit fallback;
  rank text remains a durable fallback.
- Duplicate risk: no duplicate files found. Source payloads are far larger than
  their 48 px display requirement and should receive optimized derivatives.
- Future source of truth: tracked rank decoration set.
- Earliest required phase: Phase 7.
- Migration risk: low; optimization must preserve transparency/appearance and the
  visible text fallback.
- Confidence: high.

## Import screenshot evidence

**Classification: Available but missing a shared resolver**

- Example entities: uploaded screenshots supporting imported game logs.
- Source and location: private `tm-import-evidence`, 29 objects totaling
  58,487,738 bytes.
- Database reference: `game_log_imports.screenshot_object_path` and
  `game_result_screenshot_imports.storage_object_path`.
- Canonical lookup: persisted object path scoped under the relevant game UUID.
- Access/RLS: authenticated, group-scoped select and edit-scoped insert/delete;
  no public access. Live policy history contains additional drift.
- URL method: none for reads today. Future display must issue short-lived signed
  URLs server-side after authorization, preferably in a batch.
- Current helper/display/consumer: `/log-game/import` uploads through
  `game-import-repo`; `/log-game/review` shows extracted/summary data but no
  evidence image component.
- Format/dimensions/dark theme: user screenshots vary; metadata is not normalized.
  Use a bounded preview with intrinsic dimensions when available and a full-view
  action that does not distort the image.
- Accessibility: informative alt should identify the associated imported game or
  evidence purpose.
- Loading/fallback/cache: private signed URLs need expiry-aware caching, a reserved
  preview state, and a textual unavailable-evidence fallback.
- Duplicate risk: no content-hash audit was performed for private user evidence;
  duplicate removal must not occur without ownership and retention rules.
- Migration history: bucket and principal policies are tracked; live policy drift
  remains.
- Future source of truth: database object paths plus server-side signed access.
- Earliest required phase: Phase 4 review workflow or Phase 5 game detail.
- Migration risk: high because making the bucket public, persisting signed URLs,
  or widening the path policy would expose user evidence.
- Confidence: high for storage/access inventory; medium for intended retention
  and end-user viewing requirements.

## Generic fallbacks and scaffold imagery

**Classification: Available with incomplete coverage**

- Example entities: a generic file placeholder and the favicon; unused globe,
  Next.js, Vercel, and window scaffold art.
- `public/file.svg` is actively referenced by one card row as a generic thumbnail.
  It does not preserve a card-art experience and is not an asset-family resolver.
- `public/globe.svg`, `next.svg`, `vercel.svg`, and `window.svg` have no tracked
  source consumers and appear to be scaffold leftovers.
- `src/app/favicon.ico` is a 32-by-32, 25,931-byte application icon consumed through
  framework metadata and is valid application chrome.
- Fallback accessibility: the card name must remain visible; the generic file icon
  should be decorative if retained.
- Future source of truth: a deliberate family-aware fallback component, not a
  database path to framework starter art.
- Earliest required phase: fallback primitive in Phase 1; stale-file cleanup in
  Phase 20.
- Migration risk: low for unused-file cleanup, but medium for removing `file.svg`
  before the Wildlife Sponsors database reference is repaired.
- Confidence: high.

## Local and untracked asset folders

**Classification: Local-only**

This family covers raw corporation art, normalized corporation outputs, legacy map
art, score-source inputs, and their archive copies. Their current source of truth
is the original checkout filesystem, not the redesign branch, database, or live
application. They have no URL method, RLS policy, resolver, display component, or
runtime consumer. PNG dimensions vary by family: normalized corporations are
1254-by-1254 ARGB, maps are near-square 490–625 by 482–566 ARGB, and score inputs
are 1254-by-1254 or 1024-by-1024. Dark-theme suitability is plausible for
transparent outputs but unverified. Loading, alt, fallback, and cache behavior are
not applicable until a file is deliberately promoted into a production family.

The required branch was clean at preflight. The following items exist only in the
original, dirty checkout and are not ignored by `.gitignore`:

| Local source | Contents | Interpretation |
| --- | --- | --- |
| `assets/Corps.zip` | 171,403,191 bytes | raw archive/transfer artifact |
| `assets/Corps/Corps` | 101 PNG, 172,575,971 bytes | raw corporation source set |
| `assets/Corps_Transparent_Normalized.zip` | 153,084,078 bytes | normalized archive/transfer artifact |
| `assets/Corps_Transparent_Normalized/Corps_Transparent_Normalized` | 116 PNG, 153,624,713 bytes | exact count/aggregate size match to live corporation bucket |
| `assets/Maps` | 10 PNG, 2,197,026 bytes | exact filename/count/size match to live legacy PNG set |
| `assets/transparent_icons` | 10 PNG, 12,812,122 bytes | score-source upload input; not identical in total size to live standard set |
| `assets/transparent_icons.zip` | 12,678,016 bytes | duplicate archive |
| `assets/transparent_icons.7z` | 12,818,999 bytes | duplicate archive |

The normalized corporation set contains all 101 raw names plus 15 more. It should
be treated as upload provenance, not a runtime dependency. The map folder and
score-icon archives have the same concern. These large sources need an explicit
retention, licensing, and archival decision before they are either committed,
ignored, or removed. Step 0.4 changes none of them.

- Example entities: normalized corporation logos, the ten legacy map PNGs, and the
  ten score-source PNGs.
- Canonical lookup: none approved; filenames are migration-input labels only.
- Historical/incomplete coverage: the normalized corporation folder appears to
  mirror the live logo bucket exactly by count and aggregate bytes; the map folder
  mirrors the legacy PNG subset; score-source totals differ from live standard
  objects.
- Duplicate sources: extracted folders coexist with ZIP and/or 7z archives and
  overlap live buckets.
- Recommended future source of truth: versioned production Storage plus captured
  database/migration metadata; retain raw provenance in an approved external
  archive if required.
- Recommended migration phase: ownership decision before any relevant Phase 13–18
  asset implementation; cleanup/ignore decision in Phase 20.
- Migration risk: high if these large untracked sources are accidentally committed,
  treated as runtime dependencies, or deleted before provenance/licensing review.
- Confidence: high for filesystem status, counts, sizes, and overlap; medium for
  original creation history.

## Duplicate and conflicting sources

1. Card buckets contain 911 unreferenced objects each and 48 duplicate-content
   groups (109 objects) each.
2. Three Pathfinders cards reference one image despite distinct names.
3. Corporation rows have one missing expected object, five unreferenced objects,
   and four multi-code shared paths.
4. Tag database vocabulary and bucket vocabulary disagree.
5. Map PNG and WebP sets overlap, and the two Terra Cimmeria WebPs are byte-identical.
6. Score icons have standard, axis, legacy UUID, local folder, ZIP, 7z, and
   component-local mappings.
7. The banner is one source with inconsistent consumer metadata.
8. Large local archives duplicate extracted directories and some live bucket data.

No deletion or remapping is safe until identity and ownership are confirmed.

## Missing assets and fallback behavior

| Missing or broken case | Current fallback | Required future behavior |
| --- | --- | --- |
| tag `clone` | text label only | keep text; use generic tag only if deliberately designed |
| tag `crime` | text label only | keep text; use generic tag only if deliberately designed |
| Marabout Shiritori logo | none in tracked UI | corporation name/initials; resolve correct path |
| Wildlife Sponsors thumbnail | generic `/file.svg` | card name and verified full/source art fallback |
| Pathfinders image conflict | wrong/shared image risk | verified per-card derivative |
| Terra Cimmeria Nova | byte-identical Terra Cimmeria image | map name plus verified distinct art or explicit shared-art decision |
| any score icon request failure | browser broken image | retain source label and hide failed image |
| Prelude/milestone/award art | text | continue text until authoritative art exists |
| player avatar | player name | stable initials/name fallback |
| private evidence URL failure/expiry | no reader today | retry/re-sign action plus evidence-unavailable text |

Fallbacks must preserve information and layout. A missing decorative icon should
never block analytics; a missing informative card/map/logo should retain its
entity name and a stable aspect-ratio placeholder.

## Accessibility and responsive-image requirements

### Alternative text contract

- Informative images: card art without an adjacent name, standalone map previews,
  evidence screenshots, and standalone brand identity receive concise alt text.
- Decorative images: tag/score/corporation icons beside visible labels, Mars
  backgrounds, and likely laurels beside visible rank use `alt=""` and do not add
  redundant ARIA labels.
- Interactive images: the control/link describes the action and entity; the image
  alt should not duplicate the whole accessible name.

### Layout contract

- Every component reserves the correct square, card, map, or screenshot ratio
  before the request completes.
- Remote lists use lazy loading outside the initial viewport and avoid one Storage
  API request per row.
- The banner and true LCP image may be priority; decorative/list imagery should not
  be.
- Mobile behavior must resize or intentionally hide decoration without hiding the
  adjacent text. The current score orbit already hides segment icons under 640 px.

### Error and loading contract

- Loading: family-specific skeleton or neutral block at the final aspect ratio.
- Missing metadata: render the entity label/initials before attempting a URL.
- Network/decode error: swap once to the family fallback; avoid retry loops.
- Private expiry: reauthorize and issue a new signed URL rather than caching a
  failed/expired URL indefinitely.

## Recommended shared asset architecture

### Typed model

Use a discriminated family union, for example `card`, `corporation`, `map`, `tag`,
`score-source`, `rank`, `brand`, and `import-evidence`. A resolver should return a
structured descriptor rather than a string:

```text
family, canonical key, bucket/path, resolved URL, public/private access,
alt/decorative intent, width, height, aspect ratio, format, cache/version,
signed-url expiry, and fallback state
```

Do not put service credentials in the resolver or browser bundle.

### Canonical lookup

- Cards: `source_card_id` plus stored derivative fields.
- Corporations: `id`/`code` plus stored `logo_path`.
- Maps: `maps.code`, after the Terra Cimmeria conflict is resolved.
- Tags: approved tag enum and explicit mapping, after vocabulary reconciliation.
- Score sources: typed analytics enum and explicit standard/axis variants.
- Private evidence: persisted object path after game authorization.
- Static brand/rank/background assets: tracked import/path registry.

### Query and batching strategy

Repositories should return asset metadata with their entity rows or preload one
lookup map per page. Do not perform a Storage list, signed-URL, or database lookup
per rendered row. Signed evidence URLs should be generated server-side in one
request with a defined short expiry and returned only for authorized objects.

### Cache strategy

Public catalog art should use versioned or content-addressed paths and a consistent
long immutable cache. Updating bytes behind the same one-year-cached path risks
stale UI. Private signed URLs should use short, explicit expiry and must not be
stored as permanent database URLs. Current mixed one-hour/one-year/no-cache object
metadata should be normalized only after a versioning decision.

### Rendering primitive

A shared component should enforce:

- family-specific aspect ratio and responsive `sizes`;
- informative versus decorative alt behavior;
- loading state and single-transition error fallback;
- dark-theme fallback contrast;
- public URL encoding and private URL expiry behavior;
- optional optimized delivery or an explicit, documented reason to use raw images.

### Required tests

- canonical mapping for every family and variant;
- path encoding, malformed/missing path, and unknown key;
- database path does not resolve to object;
- public versus private behavior and no service key exposure;
- signed-URL batch ordering, authorization, expiry, and refresh;
- duplicate shared paths where explicitly allowed;
- loading/error transition without loops;
- informative/decorative accessible names;
- aspect-ratio and responsive-size contract;
- cache/version selection;
- tag vocabulary and map/corporation/card coverage fixtures.

## Required work by implementation phase

| Phase | Asset work that belongs there |
| --- | --- |
| Phase 1 | shared typed public resolver/rendering primitive; banner/background shell integration; loading, fallback, alt, and sizing contracts |
| Phase 2 | capture accepted bucket/schema drift and generated database types if approved; no asset redesign without a decision |
| Phase 3 | migrate score-source visualization from hardcoded URL/filenames |
| Phase 4–5 | authorized signed evidence preview/download if the review and detail requirements include screenshots |
| Phase 7 | reuse/optimize leaderboard laurels and remove redundant alt announcements |
| Phase 8 | introduce verified map imagery only where it improves comparison context |
| Phase 13 | reconcile tag vocabulary; repair card mappings; use card/tag resolver |
| Phase 14 | expose `logo_path`, repair Marabout mapping, add corporation fallback; add Prelude art only if an authoritative source is approved |
| Phase 17 | use verified map-code assets and resolve Terra Cimmeria Nova |
| Phase 18 | add milestone/award art only from approved per-entity sources |
| Phase 20 | remove scaffold leftovers, settle local archive retention, normalize cache/limits/policies, and verify production asset coverage |

## Blocking questions

1. Are all four live-only public buckets and `corporations.logo_path` accepted
   production contracts that must be backfilled into migrations?
2. What is the authoritative tag vocabulary, and what should `clone`, `crime`,
   and the six extra bucket concepts map to?
3. Is Terra Cimmeria Nova intentionally using Terra Cimmeria art?
4. Is `Marabout.png` the intended object for Marabout Shiritori, or is a distinct
   normalized logo missing?
5. Which Pathfinders images belong to the three cards sharing one reference?
6. May unreferenced/duplicate card objects be archived after a provenance review?
7. Which external card-image source is authoritative, and may production retire
   Heroku/Hadronikle dependencies after derivatives are verified?
8. Are public reads intentional for corporation, map, score, tag, and card art?
9. Should users see original import screenshots, and what retention/expiry rules
   apply?
10. What licensed/attributed sources, if any, may provide Prelude, milestone, and
    award artwork?
11. Where should the large local raw/normalized archives be retained, and should
    their paths be ignored after provenance is recorded?
12. What versioning and cache-control standard should all public art follow?

None of these questions blocks completion of the inventory. They block specific
future asset implementation or cleanup decisions.

## Audit limits

- Production queries were read-only and did not download or modify private user
  evidence.
- Image identity was checked through names, paths, object metadata, and content
  hashes where available; not every remote object received visual inspection.
- No baseline tests, lint, build, migration, bucket change, or application edit was
  performed. Baseline Validation Review remains Step 0.5.

## Confirmed corporation logo mapping

Approved corporation logos contain the corporation name within the artwork.
A separate visible corporation-name label is not required when the logo is
large enough for that embedded name to remain clearly legible.

A visible text label is still required when:

- the logo is rendered too small for its embedded name to be read reliably
- the logo is missing or fails to load
- the context requires a compact textual identity
- accessibility or interaction requirements need additional visible context

All logo-only interactive controls must retain an accessible name containing
the corporation name.

| Corporation ID | Canonical slug | Display name | Storage bucket | Asset path | Width | Height | Transparent | Name embedded | Minimum logo-only size | Mapping status |
|---|---|---|---|---|---:|---:|---|---|---:|---|
| _Add confirmed mapping_ |  |  |  |  |  |  |  | Yes |  | Pending |

Mapping-status values:

- Confirmed
- Pending
- Missing
- Ambiguous
- Replacement required

Do not guess corporation IDs, slugs, bucket names, paths, dimensions, or
minimum readable sizes. Add them only after verification.

| corporation-id | canonical-slug | Corporation Name | bucket-name | corporations/file.png | 800 | 400 | Yes | Yes | 96px | Confirmed |
