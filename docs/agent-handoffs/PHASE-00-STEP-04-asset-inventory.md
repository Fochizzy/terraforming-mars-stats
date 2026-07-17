# Phase 0, Step 0.4 Handoff — Asset Inventory

## Status

Completed on 2026-07-16.

## Branch and baseline

- Branch: `redesign/tm-stats-dashboard-rebuild`
- Dedicated worktree: `C:\Users\izzyh\Documents\Terraforming Mars Redesign`
- Starting revision: `f63f4803622e126190f878e2eb41479535eb8c98`
- Preflight status: clean
- Original checkout: not used for edits because it is on another branch and has
  unrelated local/untracked work

## Scope completed

Step 0.4 inventoried tracked static files, Supabase Storage architecture, database
asset references, current resolvers/renderers, untracked local sources, asset
coverage, fallbacks, accessibility, responsive behavior, loading, caching,
duplicate/conflicting mappings, and future phase ownership.

No application code, tests, Supabase migration, table row, policy, bucket, or
Storage object was changed. Production inspection was read-only.

## Files inspected

### Governing redesign documents

- `AGENTS.md`
- `CLAUDE.md`
- `docs/REDESIGN_STATE.md`
- `docs/redesign/README.md`
- `docs/redesign/MASTER-RULES.md`
- `docs/redesign/PAGE-ARCHITECTURE.md`
- `docs/redesign/DECISIONS.md`
- `docs/redesign/ANALYTICS-INVENTORY.md`
- `docs/redesign/DATA-CAPABILITIES.md`
- `docs/redesign/CURRENT-ROUTE-MAP.md`
- `docs/redesign/COMPONENT-MIGRATION-MATRIX.md`
- `docs/redesign/phases/00-repository-audit.md`
- `docs/agent-handoffs/PHASE-00-STEP-03-data-capability-audit.md`

### Schema, Storage, and data access

- all `supabase/migrations/*.sql` files, with particular attention to reference
  catalog, Storage, import evidence, reference RLS, group edit semantics, and tag
  metadata migrations
- Supabase clients and environment parsing
- `src/lib/db/reference-repo.ts`
- `src/lib/db/game-import-repo.ts` and its test
- catalog import/publish scripts
- live project bucket, object, policy, table, column, and coverage metadata through
  read-only queries

### Renderers and consumers

- `src/features/catalog/promo-set-browser.tsx` and test
- `src/features/insights/score-profile-panel.tsx` and CSS
- `src/features/analytics/award-map-summary.tsx`
- `src/features/analytics/group-dashboard.tsx`
- `src/components/layout/app-shell.tsx`, CSS, and test
- landing, login, forgot/reset PIN, cards, Insights, group, import, review, and saved
  game routes
- `next.config.ts` and global CSS

### Tracked and local files

- `assets/banner.png`
- all files under `public/`
- local-only corporation, map, and score-icon folders/archives in the original
  checkout
- the original checkout's untracked asset helper/component prototype and tests,
  inspected only as evidence and not copied

## Live Storage inventory

| Bucket | Public | Objects | Bytes | Repository migration |
| --- | ---: | ---: | ---: | --- |
| `tm-card-full` | yes | 1,991 | 62,786,044 | present |
| `tm-card-thumbs` | yes | 1,991 | 19,586,788 | present |
| `tm-corporation-logos` | yes | 116 | 153,624,713 | missing |
| `tm-import-evidence` | no | 29 | 58,487,738 | present |
| `tm-map-images` | yes | 21 | 2,689,434 | missing |
| `tm-score-icons` | yes | 21 | 13,816,192 | missing |
| `tm-tag-icons` | yes | 21 | 260,844 | missing |

Public object delivery is anonymous. No authenticated mutation policy was found
for public catalog-art buckets. Private import evidence has group-scoped select
and edit-scoped insert/delete behavior, but no tracked signed-URL reader.

Cache-control is inconsistent: card objects mix one-hour and one-year values;
map PNG and WebP sets differ; score objects mix no-cache and one hour; tags use
one hour; corporation logos use one year. Only corporation and score buckets have
explicit 5 MB/PNG constraints.

## Database asset references

- `cards.image_url`, `thumbnail_path`, `full_image_path`
- live-only `corporations.logo_path`
- `catalog_overrides.image_url`
- `game_log_imports.screenshot_object_path`
- `game_result_screenshot_imports.storage_object_path`
- unused `group_settings.image_reference_mode`

Maps, tags, Preludes, milestones, awards, and user profiles have no asset-path
column. The application has no generated Supabase database type, so live schema
drift is not compile-time visible.

## Asset families found

### Production-ready tracked families

- application banner: `assets/banner.png`
- global/auth backgrounds: `public/mars-background.png` and
  `public/auth-mars-background.svg`
- rank laurels: gold, silver, bronze
- favicon/application chrome

### Available remote families with gaps or missing resolvers

- cards and thumbnails
- corporation logos
- map graphics
- tag graphics
- point-source graphics
- private import screenshots

### Not currently available

- authoritative Prelude graphics
- per-milestone graphics
- per-award graphics
- player avatars

The generic score icons named Milestones and Awards do not count as per-objective
art. Laurel graphics do not count as award art.

## Current resolver and rendering findings

- Card promo lookup has a repository-specific database fallback chain.
- Promo cards use fixed 72-by-96 unoptimized remote images and have no runtime
  error fallback or skeleton.
- Score Profile hardcodes the entire Supabase URL/bucket/filename map in its
  component and uses a UUID alias for Cities.
- Map analytics use text or an invented inline SVG rather than Storage map art.
- Corporation and tag analytics use text only.
- Screenshot evidence uploads successfully but has no signed read/display path.
- The same banner has inconsistent dimensions/optimization configuration between
  landing and shell consumers.
- No tracked shared asset registry, typed family resolver, signed-URL helper, or
  reusable fallback component exists.

## Coverage and identity problems

### Cards

- all 1,083 rows have three image fields;
- 1,082 full and 1,082 thumbnail references resolve to their derivative buckets;
- Wildlife Sponsors uses an external full URL and `/file.svg` thumbnail;
- three distinct Pathfinders cards share one image;
- each derivative bucket has 911 unreferenced objects;
- each derivative bucket has 48 duplicate-content groups spanning 109 objects;
- source URLs still depend on Heroku and Hadronikle hosts.

### Corporations

- 116 database paths; 115 resolve;
- Marabout Shiritori expects missing `Marabout_Shiritori.png`;
- five bucket objects are unreferenced;
- four object paths are shared by two catalog codes each;
- the live bucket and `logo_path` column are absent from migrations.

### Tags

- database vocabulary has 17 values;
- exact icons exist for 15;
- `clone` and `crime` are missing;
- six bucket concepts are currently unused by database tags;
- normalization alone cannot safely determine intended mappings.

### Maps

- all 11 map codes have exact WebP filenames;
- 10 overlapping legacy PNGs also exist;
- Terra Cimmeria and Terra Cimmeria Nova WebPs are byte-identical;
- the bucket is absent from migrations.

### Score sources

- 10 standard files, 10 axis variants, and one UUID legacy file exist;
- Cities currently uses the UUID object, not `City.png`;
- cache controls and local/live sources conflict;
- the bucket is absent from migrations.

## Local-only sources

The original checkout contains untracked extracted folders and large archives for
corporation logos, maps, and score icons. The normalized corporation folder's
116-file count and aggregate bytes exactly match the live corporation bucket.
The local map folder likewise matches the live legacy PNG subset. Score folders
and two archive formats overlap but are not fully byte-identical to the live set.

The original checkout also contains an untracked asset resolver/image component
prototype. It was not copied because it is not part of the required clean branch,
its tag normalization cannot resolve known vocabulary gaps, and it does not cover
private URLs, batching, maps, cards, cache versions, or complete metadata.

## Security and RLS findings

- no service-role key was exposed or used in application/browser code;
- no production write occurred during the audit;
- public art is intentionally retrievable without authenticated object policies;
- private import evidence must remain private and use authorized short-lived
  signed URLs for display;
- Storage and table authorization are separate boundaries;
- repository migration history does not reproduce four buckets, one asset column,
  and all observed live policy state;
- future batch resolvers must avoid per-row Storage calls and must not move signing
  credentials into the browser.

## Recommended architecture

Create one typed family registry/resolver that returns structured asset metadata:
family, canonical key, path/URL, access mode, dimensions/aspect, alt/decorative
intent, version/cache data, signed expiry, and fallback state. Database repositories
should return asset metadata with rows or preload one lookup map per page. Private
signed URLs should be server-generated in batches after authorization.

Use versioned paths and consistent long immutable caching for public art. Use
short explicit expiry for private evidence. Reserve family-specific aspect ratios,
distinguish informative from decorative images, lazy-load list art, retain visible
text/initials on failure, and test error/expiry/coverage behavior.

## Unresolved questions

The inventory records twelve later-phase questions. The primary blockers are:

- whether live-only buckets and `logo_path` are accepted contracts to capture;
- authoritative tag vocabulary and missing mappings;
- Terra Cimmeria Nova and Marabout Shiritori image identity;
- correct Pathfinders card images;
- asset cleanup/retention and versioning policy;
- public-read intent;
- private screenshot visibility and retention;
- licensed sources for Prelude, milestone, and award art;
- disposition of large untracked archives.

These do not block Step 0.5.

## Documentation changed

- `docs/redesign/ASSET-INVENTORY.md`
- `docs/REDESIGN_STATE.md`
- `docs/agent-handoffs/PHASE-00-STEP-04-asset-inventory.md`

## Validation performed

- clean required branch/worktree confirmed before edits;
- required governing docs read;
- all migration files searched for asset/storage references;
- tracked asset files and code consumers enumerated;
- live bucket/object/table/policy metadata queried read-only;
- database-to-object coverage and duplicate mappings checked;
- original-checkout local-only sources distinguished from production code;
- final documentation path/scope and whitespace validation performed before commit.

No baseline test, lint, or build run was performed because that is Step 0.5 and
the assignment explicitly stops after Step 0.4.

## Next action

Begin Phase 0, Step 0.5 — Baseline Validation Review only when explicitly assigned.
Do not begin Phase 1 from this handoff.
