# Catalog Source Notes

Keep temporary upstream snapshots here while validating import scripts.
Do not commit raw card image assets to git; upload runtime images to Supabase Storage instead.

`tfm-card-tags.json` is the extracted card database snapshot from the
Terraforming Mars card browser at
`https://terraforming-mars.herokuapp.com/cards#~trbgpcseCmalt`. It drives
cards, tags, corporations, and preludes for `catalog:publish` and is safe to
commit for review/offline use.

The daily GitHub workflow at `.github/workflows/tfm-card-source-check.yml`
refreshes this snapshot from the live card browser, publishes the current cards,
corporations, preludes, and reference dimensions to Supabase, then renders card
images and thumbnails into Supabase Storage. It requires a
`SUPABASE_SERVICE_ROLE_KEY` repository secret because it writes to the live
catalog and storage buckets.
