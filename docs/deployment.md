# Deployment Notes

## Runtime env in Cloudflare

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE`

Do not add `SUPABASE_SERVICE_ROLE_KEY` to the deployed Worker unless a future server-only feature truly requires it.

## Local-only admin and catalog env

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_STORAGE_BUCKET_CARD_FULL`
- `SUPABASE_STORAGE_BUCKET_CARD_THUMBS`

## Launch order

1. Create the new Supabase project.
2. Apply the repo migrations with `npx.cmd supabase db push`.
3. The seed migration now loads the stable expansion, map, and style dimensions automatically when you push schema changes.
4. Run `npm.cmd run catalog:publish` to create a catalog snapshot row and upsert any richer corporation, prelude, promo-set, and card data you have prepared.
5. Add the remaining corporation, prelude, promo-set, milestone, award, and card imports before inviting the first group.
6. Set the Cloudflare runtime env vars and deploy the Worker.
7. Set Supabase Auth Site URL to the live `workers.dev` domain and add the `/auth/callback` redirect.
8. Run `npm.cmd run test`, `npm.cmd run build`, and `npx.cmd opennextjs-cloudflare build` before calling the deployment path ready.
