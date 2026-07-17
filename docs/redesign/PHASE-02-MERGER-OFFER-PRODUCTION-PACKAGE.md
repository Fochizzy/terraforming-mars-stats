# Phase 2 Merger Offer Production Execution Package

## Status

Prepared for review only. Nothing in this package has been applied to a linked
database, production schema, production data, Storage, or deployment.

## Approval checkpoint

An owner must approve the exact target group UUID after reviewing the dry-run
counts. Do not substitute a group display name for the UUID and do not run the
mutating backfill if the catalog gate is incomplete or any conflict count is
nonzero.

## Migration

Apply exactly:

```text
supabase/migrations/20260717190000_add_merger_offer_rule_snapshots.sql
```

It adds an owner-managed group default, nullable game snapshot plus provenance,
and a reference-only canonical Prelude-to-card alias mapping. Legacy game
snapshots remain null/unknown; the migration does not apply the historical
policy itself.

## Pre-migration checks

1. Run `supabase/tests/merger_offer_rule_schema_verification.sql` against a
   disposable local database after applying the migration locally.
2. Replace `<TARGET_GROUP_UUID>` in
   `supabase/verification/merger-offer-historical-policy-dry-run.sql` with the
   owner-reviewed UUID and run it read-only.
3. Stop if either accepted catalog identity (`promo:p39`, `promo:merger`) is
   present without exactly one `merger` Prelude binding, or if both identities
   bind to different Prelude IDs.
4. Stop if `conflicting_records` is nonzero. A saved false value or a
   non-historical explicit true value must be reviewed, never overwritten.

The dry run reports the total policy scope, enabled, disabled, unknown,
would-change, excluded, conflicts, imported logs, detected plays, stored manual
selections, and unresolved actor mappings.

## Authorized execution sequence after separate approval

```powershell
npx.cmd supabase db push --linked
npx.cmd supabase db query --linked --file supabase/verification/merger-offer-historical-policy-dry-run.sql
npx.cmd supabase db query --linked --file supabase/verification/merger-offer-historical-policy-backfill.sql
npx.cmd supabase db query --linked --file supabase/verification/merger-offer-historical-policy-dry-run.sql
```

These commands are intentionally not executed by this assignment. The SQL files
contain the target-group placeholder so the owner can review exactly which
historical group is in scope before substituting it.

## Post-execution invariants

- The post-backfill `would_change` count is zero.
- The `already_marked_enabled` count increased by exactly the prior
  `would_change` count.
- `marked_disabled` and `conflicting_records` did not change.
- No row outside the selected group changed.
- All backfilled rows have `historical_policy` provenance.
- Imported evidence remains evidence only: no Prelude selection is silently
  inserted or deleted.

## Rollback

Before application writes using the new schema make a schema rollback unsafe,
the group-scoped historical-policy rows can be reverted with
`supabase/verification/merger-offer-historical-policy-rollback.sql` after
replacing the same reviewed target UUID. It only clears rows that are still
`true` with `historical_policy` provenance; explicit/editor/imported values are
untouched. Do not drop the new columns or alias table while the application is
writing them.

## Stopping conditions

Stop and roll back the active transaction when the target UUID is not owner
approved, counts drift from the dry run, the catalog gate is unresolved, a
conflict is present, a query is unauthorized, or any error exposes a raw
database diagnostic. Obtain a new owner decision rather than broadening the
historical-policy scope.
