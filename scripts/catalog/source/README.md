# Catalog Source Notes

Keep temporary upstream snapshots here while validating import scripts.
Do not commit raw card image assets to git; upload runtime images to Supabase Storage instead.

`tfm-card-tags.json` is the extracted card -> gameplay-tag snapshot from the
open-source terraforming-mars client bundle (see `catalog:sync-tags`). It is
regenerated on every sync run and safe to commit for review/offline use.
