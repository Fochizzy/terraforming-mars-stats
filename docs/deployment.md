# Deployment Notes

1. Create a Supabase project and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
2. Run the schema migrations before uploading catalog data.
3. Create `tm-card-full` and `tm-card-thumbs` buckets if the migration has not already done so.
4. Import reference data before inviting the first group so maps, corporations, preludes, milestones, awards, and promo sets are selectable.
5. Run `npm run build`, `npm run test`, and `npm run test:e2e` before each release.
