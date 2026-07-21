# Incident: Confirm Import Draft fails with `permission denied for schema private` (42501)

- **Date observed:** 2026-07-21, 01:12:38Z and 01:14:59Z (two attempts, same user flow)
- **Surface:** `/log-game/import` → **Confirm Import Draft** (`handleCreateImportDraft`)
- **Deployed base:** `9b7a00555f216f4a741e819e8795238c362584f9` (`fix/import-matchscore-client-privacy`)
- **User impact:** the save path aborts with a rendered 42501 banner; the import
  cannot be confirmed. The earlier Analyze step is unaffected.

## What failed, exactly

`handleCreateImportDraft` routes the import through
`resolveOrCreateImportGroup` (`src/lib/db/import-group-repo.ts`), which runs on
the **service-role** client. On the matched-existing-group path it upserted
`group_members`, then resolved roster labels via
`fetchPublicPlayerLabels(admin, …)` → RPC `public.get_public_player_names`.

That RPC was `SECURITY INVOKER` and its body references
`private.resolve_public_player_name`. Grants at time of incident:

| object | authenticated | service_role |
| --- | --- | --- |
| EXECUTE `public.get_public_player_names` | yes | yes |
| USAGE schema `private` | yes | **no** |
| EXECUTE `private.resolve_public_player_name` | yes | **no** |

So the outer call was permitted, but resolving the private schema reference
under invoker rights failed for `service_role` at the schema check —
`permission denied for schema private`, SQLSTATE 42501. Interactive reads of
the same RPC (authenticated sessions) kept succeeding, which is why the bug
only surfaced on the save path.

Not a regression of the deployed candidate: commit `9b7a00555` touched only
client-side candidate shaping/ordering; the RPC, grants, and import-group
routing predate it.

## Partial-write audit (read-only, 01:10Z–01:20Z window)

Zero rows created in: `groups`, `players`, `games`, `game_players`,
`game_log_imports`, `player_import_aliases`, `game_revisions`,
`group_members`. The `group_members` POSTs in the failing bursts were
idempotent upserts that inserted nothing (both attempts matched an existing
group whose memberships already existed; `created_at` audit confirms no new
rows). No `New group` placeholder rows exist.

Residual uncertainty: the matched-path roster upsert uses
`ignoreDuplicates: false`, so an in-place `role` update on an existing
membership row cannot be ruled out from row counts alone (no history table).
Bounded to the matched group's linked participants; no cleanup required.

## Remediation (this branch)

1. **Migration `20260721013000_secure_public_player_labels_service_role.sql`**
   converts `public.get_public_player_names` to a hardened `SECURITY DEFINER`
   function (owner `postgres`, `search_path = ''`, fully-qualified references,
   input bounded to 2000 ids, EXECUTE revoked from `public`/`anon`, granted to
   `authenticated` + `service_role` only). Schema `private` remains closed to
   `service_role` — this was chosen over granting `private` USAGE because at
   least one private function (`neutral_unlinked_player_label`) still carries
   the default PUBLIC execute ACL, so schema USAGE would not be a bounded
   grant. Authenticated visibility is preserved by mirroring the two `players`
   SELECT policies (`can_read_player` OR `is_group_member`) inside the
   function; a `service_role` JWT bypasses the mirror (it already reads
   `players`/`user_profiles` directly, so this widens nothing).
2. **Fail-before-write reordering** in the matched-group path of
   `resolveOrCreateImportGroup`: labels are now resolved *before* the
   membership upserts, so a label failure aborts the save with zero writes.

## Remaining atomicity limitation

The **new-group** path still performs `groups` insert → `group_members`
upserts → `group_settings` upsert → `players` insert → label fetch → group
rename as separate statements. Labels there depend on the freshly inserted
players, so the fetch cannot move earlier; any late failure can still leave a
partially-initialized new group (with its `New group` placeholder name). A
transactional boundary (single RPC) for that path is a separate, larger
follow-up and is intentionally **not** part of this hotfix.

## Policy-mirror maintenance note

If the SELECT policies on `public.players` change, the mirrored predicate in
`get_public_player_names` must change in the same migration.
