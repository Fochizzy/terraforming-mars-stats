# Handoff — Tag Icon Inventory Reconciliation (2026-07-22)

Documentation-only reconciliation of `docs/redesign/ASSET-INVENTORY.md` against
the live public `tm-tag-icons` Supabase Storage bucket. No phase or substep was
started; Phase 4, Step 4.3 remains blocked at its release boundary exactly as
`docs/CURRENT_STATUS.md` records.

This task resolves the contradiction that
`docs/agent-handoffs/SPACE-TAG-ICON-REPLACEMENT-2026-07-22.md` reported and
deliberately left unreconciled.

## Authorization and scope

The owner assigned: re-measure all 21 objects directly (explicitly, without
extrapolating from a sample), correct the stale `ASSET-INVENTORY.md` rows and
prose, and record the finding — correcting the partly historical statements in a
way that preserves the history rather than silently rewriting it.

Explicitly out of scope and not done: any Storage object change, any application
code change, any schema, migration, policy, bucket-configuration, or deployment
change, and any decision about the six unmapped tag objects.

## Method

Read-only. `storage.list` (recursive, paginated) enumerated the bucket, then
**every** object was downloaded and measured individually with `sharp`; no
value below is inferred from another object. Each object was then re-fetched a
second time over its **anonymous public URL** and compared byte-for-byte against
the object retrieved through the Storage API.

Only `list` and `download` were called. No `upload`, `update`, `move`, `copy`,
`remove`, or bucket/policy call was made in this task.

## Measured state — all 21 objects, `tm-tag-icons`

Project `tm-stats`, ref `qjtwgrjjwnqafbvkkfex`. Measured 2026-07-22
(`2026-07-23T01:24:02Z`).

| Aggregate | Value |
|---|---|
| Objects | 21 |
| Total bytes | 313,154 |
| Dimensions | 128×128 for **all 21** (all square) |
| Format | `image/webp` for all 21 |
| Alpha | 4 channels and non-opaque for all 21 |
| Cache control | `max-age=3600` for all 21 |
| Byte range | 9,446 (`science.webp`) – 22,980 (`earth.webp`) |
| Duplicate-content groups | none |
| Listing size vs downloaded bytes | agrees for all 21 |
| Anonymous public URL | 21/21 returned HTTP 200, `image/webp`, `public, max-age=3600`, SHA-256 matching the object |

Per-object, ordered by name, with the Storage `updated_at` that dates each
write:

| Object | Bytes | Dimensions | `updated_at` |
|---|---:|---|---|
| `animal.webp` | 14,678 | 128×128 | 2026-07-18T06:59:26.808Z |
| `building.webp` | 12,382 | 128×128 | 2026-07-18T06:59:26.911Z |
| `city.webp` | 16,240 | 128×128 | 2026-07-18T06:59:27.005Z |
| `earth.webp` | 22,980 | 128×128 | 2026-07-14T02:35:32.064Z |
| `event.webp` | 12,624 | 128×128 | 2026-07-18T06:59:27.128Z |
| `galactic.webp` | 16,792 | 128×128 | 2026-07-18T06:59:28.308Z |
| `infrastructure.webp` | 12,676 | 128×128 | 2026-07-18T06:59:27.231Z |
| `jovian.webp` | 15,958 | 128×128 | 2026-07-18T06:59:27.338Z |
| `mars.webp` | 15,676 | 128×128 | 2026-07-18T06:59:28.404Z |
| `mercury.webp` | 13,642 | 128×128 | 2026-07-18T06:59:28.501Z |
| `microbe.webp` | 15,196 | 128×128 | 2026-07-18T06:59:27.508Z |
| `moon.webp` | 13,156 | 128×128 | 2026-07-18T06:59:28.599Z |
| `plant.webp` | 12,858 | 128×128 | 2026-07-18T06:59:27.687Z |
| `power.webp` | 12,524 | 128×128 | 2026-07-18T06:59:27.811Z |
| `radiation.webp` | 15,450 | 128×128 | 2026-07-18T06:59:28.719Z |
| `science.webp` | 9,446 | 128×128 | 2026-07-14T02:35:33.832Z |
| `space.webp` | 19,658 | 128×128 | 2026-07-23T01:14:21.263Z |
| `tourism.webp` | 17,352 | 128×128 | 2026-07-18T06:59:28.817Z |
| `venus.webp` | 14,344 | 128×128 | 2026-07-18T06:59:28.099Z |
| `wild.webp` | 14,172 | 128×128 | 2026-07-18T06:59:28.214Z |
| `wild_planet.webp` | 15,350 | 128×128 | 2026-07-18T06:59:28.930Z |

## The downscale is dated, and the repository does record it — in code

The prior handoff stated that no commit records the downscale. That is correct
about handoffs and about any Storage-mutation record, but **commit `d747c8720`
does record the event**, which this task found:

- `updated_at` places the re-encode in a single batch of **18 tag objects**
  between `2026-07-18T06:59:26.808Z` and `2026-07-18T06:59:28.930Z` — a
  2.1-second window, i.e. automation, not hand uploads.
- Commit `d747c8720` "feat: serve refreshed Supabase game assets", authored
  `2026-07-18T07:21:22Z` — 22 minutes after that batch — adds
  `src/lib/assets/supabase-game-assets.ts` containing
  `GAME_ASSET_CACHE_NONCE = '20260718-v2'` and the comment: "The three asset
  families were replaced in Supabase on 2026-07-18. Keeping the version in the
  URL prevents a browser from reusing an older object that was uploaded at the
  same Storage path."

That commit is the authoritative repository evidence for the event. It records
neither dimensions nor bytes and did not update `ASSET-INVENTORY.md`, which is
exactly how the inventory went stale while the repository still "knew" the
replacement had happened.

The three objects outside that batch are accounted for:

- `earth.webp` and `science.webp` have been unwritten since
  `2026-07-14T02:35Z`. They were therefore already 128×128 on the 2026-07-16
  audit date, and were the bucket's only small objects at that time. This is
  consistent with — and now completes — the 2026-07-17 record that they were
  never supplied and never changed, whose "dimensions remain unaudited" note is
  now resolved.
- `space.webp` carries `2026-07-23T01:14:21.263Z` from the separately authorized
  single-object replacement in
  `SPACE-TAG-ICON-REPLACEMENT-2026-07-22.md`. Its pre-change object was also
  128×128, so it was almost certainly in the 2026-07-18 batch, but that
  timestamp has been overwritten and the repository does not prove it. Stated as
  probable, not established.

## Documentation changes

`docs/redesign/ASSET-INVENTORY.md` only. History was preserved rather than
overwritten: the two dated 2026-07-17 blocks are retained verbatim and are now
introduced as the historical record, explicitly marked as accurate when written
and superseded on 2026-07-18.

1. **Live bucket inventory table** — `tm-tag-icons` bytes corrected
   `14,910,938` → `313,154`, with a correction note under the table recording
   the prior value, its measurement date, and that the change is a production
   re-encode rather than an original-audit error.
2. **Tag graphics, dated blocks** — added a lead-in marking the two 2026-07-17
   blocks as historical, and a third `Correction — 2026-07-22` block carrying
   the full measured state, the public-URL verification, the `updated_at`
   dating, the `d747c8720` correlation, and the `earth`/`science`/`space`
   exceptions.
3. **Tag graphics, "Source and location"** — corrected to 313,154 bytes, with
   the prior figure retained inline as history.
4. **Tag graphics, "Format and dimensions"** — corrected to all-21 128×128 with
   alpha and the measured byte range. The 2026-07-17 "eighteen 1254-by-1254 plus
   one 732-by-732 (`venus.webp`)" statement is retained and marked accurate when
   written; the previously unaudited `earth.webp`/`science.webp` are now
   measured. Adds a caution that containers should still not assume 128×128,
   because the convention has now changed twice with no captured contract.
5. **Tag graphics, "Coverage"** — records that coverage is unchanged by both the
   re-encode and the replacement (bytes only, never object identity), plus a new
   verified bullet that `tagIconPathByCode` maps exactly the same 15 codes and
   classifies `clone`/`crime` as `source-unavailable`, so code and bucket agree.
6. **New "Related unreconciled bucket rows"** — see below.

## The six unmapped objects — reported, not decided

The live bucket holds six objects `tagIconPathByCode` does not map:
`galactic.webp`, `infrastructure.webp`, `mercury.webp`, `radiation.webp`,
`tourism.webp`, `wild_planet.webp`. Verified this session: the resolver maps
exactly 15 codes and treats `clone` and `crime` as `source-unavailable`, so code
and bucket agree on every mapped code and the gap is only these six extras plus
the two missing database values.

**No decision was made.** This audit had no authorization to change the resolver
or to assign an object to a database tag value, and no icon should be mapped on
filename resemblance alone. It remains blocking question 2 in
`ASSET-INVENTORY.md` and needs an owner decision.

## Newly detected: two more stale bucket rows

Because `d747c8720` names **three** asset families, a read-only listing check was
run against the other two. Both diverge from the inventory table:

| Bucket | Documented | Live (listing) | `updated_at` distribution |
|---|---|---|---|
| `tm-corporation-logos` | 116 objects / 153,624,713 bytes | 389 objects / 180,640,350 bytes | 116 on 2026-07-16, 112 on 2026-07-17, 161 on 2026-07-21 |
| `tm-score-icons` | 21 objects / 12,842,804 bytes | 21 objects / 12,114,777 bytes | 1 on 2026-07-16, 20 on 2026-07-18 |

These are listing-metadata aggregates only. **No object in either bucket was
downloaded, measured, or hashed**, so this task makes and corrects no dimension
or per-object claim about them — the 800×800 corporation figure and the
1254-by-1254 score-icon figure elsewhere in the inventory remain unverified
against the live buckets. The `tm-score-icons` group of 20 on 2026-07-18 is
consistent with the same batch; the `tm-corporation-logos` group of 161 on
2026-07-21 is a later, separate event this check did not identify.

Both rows were left unchanged and are recorded in the inventory as known-stale
pending their own assignment, applying the same discipline the prior handoff
applied to the tag row. Correcting them requires the same full per-object
measurement.

## Verification performed

- 21/21 objects listed, downloaded, and measured individually.
- 21/21 re-fetched anonymously over their public URLs; status, content type,
  cache header, and SHA-256 all matched the Storage object.
- Listing `metadata.size` agrees with downloaded byte length for all 21.
- `updated_at` read for all 21 and used to date the re-encode.
- `d747c8720` inspected in full (message, diff, author date) to confirm the
  in-code record of the 2026-07-18 replacement.
- `src/lib/assets/asset-resolver.ts` read to confirm the 15 mapped codes and the
  `clone`/`crime` `source-unavailable` classification.
- `npm.cmd run validate:claude-context -- --require-maintenance` run before
  commit.

Repository-wide tests were not run: no runtime code, test, fixture, or
configuration was touched. The only changed files are this handoff,
`ASSET-INVENTORY.md`, and the `REDESIGN_STATE.md` handoff pointer.

## Repository and production scope

- No Storage object, bucket configuration, or Storage policy changed.
- No application code, database row, schema, migration, RLS policy, dependency,
  route, or deployment changed.
- No production write occurred, so the `DEPLOY-STATE.md` production-action rule
  is not engaged. Read-only Storage `list`/`download` is not a production write.

## Exact next action

None is authorized by this handoff. Step 4.3 remains blocked at its release
boundary. Two follow-ups are now recorded and each needs its own explicit
assignment:

1. decide whether `galactic`, `infrastructure`, `mercury`, `radiation`,
   `tourism`, and `wild_planet` should be mapped or are intentionally unused
   (blocking question 2); and
2. reconcile the `tm-corporation-logos` and `tm-score-icons` inventory rows by
   full per-object measurement.
