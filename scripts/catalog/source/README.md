# Catalog Source Notes

Keep temporary upstream snapshots here while validating import scripts.
Do not commit raw card image assets to git; upload runtime images to Supabase Storage instead.

`tfm-card-tags.json` is the extracted card database snapshot from the
Terraforming Mars card browser at
`https://terraforming-mars.herokuapp.com/cards#bio~trbgpcseCmalt`. It drives
cards, tags, corporations, and preludes for `catalog:publish` and is safe to
commit for review/offline use.
