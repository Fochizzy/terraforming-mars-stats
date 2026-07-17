# Corporation Logo Replacement — Rollback

Production Supabase project: `tm-stats` (`qjtwgrjjwnqafbvkkfex`),
bucket `tm-corporation-logos` (public, PNG-only, 5 MB limit).

This task replaced every corporation logo with a uniform, background-treated,
content-addressed tile and remapped `public.corporations.logo_path`. It did
**not** delete any prior object, so a full rollback needs only a database
revert — the previous objects still exist in the bucket.

## What changed

- 116 `public.corporations.logo_path` values were updated to new
  content-addressed objects named `corporation-logo-<sha256>.png`.
- 112 distinct tiles were uploaded (4 logos are intentionally shared by two
  corporation records each: Athena, Eris, Kuiper Cooperative, Tycho Magnetics).
- No corporation `id`, `code`, `name`, or other field changed.
- No bucket configuration, RLS, or policy changed.
- No object was deleted; the bucket now holds 228 objects (116 prior + 112 new).

## Backup / source of truth

- `corporation-logo-rollback-manifest.csv` — one row per corporation with
  `old_logo_path` (the value before this task) and `new_object_name`.
- `production-corporations-export.csv` — full pre-change corporation export.
- `production-storage-objects-export.csv` — pre-change object inventory.
- `corporation-logo-final-remap-manifest.csv` — the applied mapping, with the
  background chosen per corporation, effective source, sha256, and tile size.

## Restore the database mappings

The prior objects were never removed, so restoring `logo_path` fully reverts the
visible logos. Using the rollback manifest, run one guarded update per row (only
where both `id` and `code` match), e.g. the batched form:

```sql
-- Build v(id, code, old_path) from corporation-logo-rollback-manifest.csv
WITH v(id, code, old_path) AS (VALUES
  ('<uuid>'::uuid, '<code>', '<old_logo_path>')
  -- ... one row per corporation ...
)
UPDATE public.corporations c
SET logo_path = v.old_path
FROM v
WHERE c.id = v.id AND c.code = v.code;
```

After reverting, reconcile:

```sql
SELECT count(*) AS broken
FROM public.corporations c
WHERE NOT EXISTS (
  SELECT 1 FROM storage.objects o
  WHERE o.bucket_id = 'tm-corporation-logos' AND o.name = c.logo_path
);
-- expect 1: community:marabout-shiritori referenced a missing object before
-- this task (Marabout_Shiritori.png). That is the pre-existing broken state.
```

## Restore / remove objects

- No object needs restoring — the 116 prior objects are untouched.
- The 112 new `corporation-logo-<sha256>.png` objects are orphaned after a
  database revert and may be left in place or deleted. Deleting them is safe
  only after confirming no corporation row references them.

## Notes

- New object names are content-addressed, so re-running the upload is
  idempotent and never collides with the prior long-cached objects.
- Secrets (service-role key, tokens, signed URLs) are intentionally excluded
  from every file in this directory.
