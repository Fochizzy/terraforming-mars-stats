# Phase 4, Step 4.3 - Source-Bound Import Identity Matching STOP Handoff

## Status

**STOPPED before implementation.** The current import flow does not persist
the parsed source before identity matching, and production does not enforce
global registered-username uniqueness after normalization. Both are explicit
STOP conditions in the owner-approved assignment.

No application code, SQL migration, RPC, or disposable-PostgreSQL proof was
created. This handoff records only worktree reads, catalog-only production
introspection, the governing decision cleanup, and the blocker.

## Repository state

- Branch: `fix/import-identity-source-bound-matching`
- Worktree: `C:\Users\izzyh\Documents\Terraforming Mars Redesign\.npm-cache\tm-import-identity-worktree`
- Re-derived base: `5597817fc6790fa4831ff968629ff49c81f16705`
  (`redesign/tm-stats-dashboard-rebuild`)
- Main redesign worktree: read for base/status only; not modified
- Production project introspected read-only: `qjtwgrjjwnqafbvkkfex`

## STOP 1 - matching precedes persisted source evidence

The current authoritative server action orders the relevant work as follows:

| Order | Worktree evidence | Operation |
| --- | --- | --- |
| 1 | `create-import-draft.ts:359` | `resolveImportPlayerIdentities(...)` |
| 2 | `import-player-identity-repo.ts:156` | `resolve_import_guest_identity` may match, reuse, or create a guest |
| 3 | `create-import-draft.ts:436` | `saveDraftGame(...)` creates/saves the draft |
| 4 | `create-import-draft.ts:445` | `buildImportSourceEvidence(...)` hashes the original source |
| 5 | `create-import-draft.ts:516` | `saveGameLogImport(...)` inserts the persisted import/evidence row |

Matching therefore runs before the immutable source has a persisted
import/evidence reference. The proposed matcher cannot derive candidate text
from persisted source because no such row exists at identity-resolution time.

The existing table is not an already-available staging seam:
`game_log_imports.game_id` is a non-null foreign key. The current draft save
is after identity resolution and builds a form whose player records use the
resolved player IDs. Moving the insert earlier is a workflow and partial-state
redesign, not a mechanical reorder.

The assignment explicitly says to stop here rather than invent a persistence
step. Accordingly, no new matcher or migration was designed or written.

## STOP 2 - registered normalized uniqueness is not enforced

Two catalog-only production reads inspected definitions, ACLs, columns,
constraints, indexes, triggers, and normalizer definitions. They returned no
table rows or personal values.

| Required guarantee | Production metadata finding | Result |
| --- | --- | --- |
| Registered usernames globally unique after normalization | `public.user_profiles.username` is plain `text`; only raw `UNIQUE (username)` exists; no trigger and no normalized expression index | **Not enforced** |
| Guest usernames unique within group after normalization | Valid unique index on `private.player_private_identities (group_id, normalized_guest_username)` where the normalized value is non-null | **Enforced** |

`private.normalize_guest_username(text)` is immutable and lowercases input,
collapses whitespace, replaces non-alphanumeric runs with `-`, and trims `-`.
Raw uniqueness therefore does not imply normalized uniqueness.

The minimum intended database contract would be a unique expression index
equivalent to:

```sql
create unique index user_profiles_normalized_username_key
on public.user_profiles ((private.normalize_guest_username(username)));
```

That statement was **not** created or executed. It may fail if existing raw
usernames collide after normalization. Determining whether collisions exist
requires reading table values, even if reduced to an aggregate, which the
assignment explicitly prohibits. Its prerequisite says to stop when this
conflict cannot be excluded from constraints/indexes; that condition is met.

## Deployed matcher re-derived catalog-only

`public.match_import_player_names(uuid, text[])` is currently:

- `SECURITY DEFINER`, stable, `search_path = ''`;
- executable by `authenticated`, `service_role`, and `postgres`, not `anon`;
- caller-controlled through an arbitrary `text[]`;
- comparing exact and prefix forms against display name, private full name,
  registered username, and import aliases; and
- returning the matched player plus fine-grained `match_reason` and
  `match_score`.

This is the deployed predecessor a future disposable harness must model. It
confirms the live enumeration-oracle premise. No function or ACL was changed.

## Owner choices required to resume

1. **Private pre-resolution evidence staging (recommended for isolation).**
   Authorize a service-only/private staging record containing the immutable
   source and parser-derived player-seat evidence before matching. The matcher
   would accept that evidence ID plus one structured identity classification.
   The owner must also approve lifecycle, authorization, expiry/cleanup, and
   linkage into the eventual `game_log_imports` record.
2. **Two-stage draft/import persistence.** Authorize creation of a minimal draft
   shell and import evidence before player resolution, followed by locked
   resolution and completion of the editable draft. This reuses the existing
   import table but requires a recoverable partial-state contract and changes
   the current draft-save dependency on resolved player IDs.
3. **Reduced scope: no private automatic matching.** Keep preview limited to
   public/neutral candidates and explicit existing-player selection, with no
   source-bound private matcher until one persistence model is approved. This
   avoids the oracle but does not deliver approved automatic matching.

Separately, authorize a privacy-safe way to prove registered usernames have no
existing normalized collisions before a unique normalized index is prepared.

## Documentation changes

- `docs/redesign/DECISIONS.md`: removed an accidentally pasted PowerShell block
  and duplicate partial copy from the already-approved source-bound identity
  decision; retained one complete decision entry.
- `docs/REDESIGN_STATE.md`: recorded both STOP findings, catalog-only live
  evidence, and the owner choices.
- This handoff: added as the complete closeout record.

The master plan was reviewed after the stop. It was not updated: this is an
immediate blocker and unapproved persistence choice, not a new durable
project-wide direction.

## Validation and evidence

- **Worktree read:** exact parse/match/save order above; `game_id` non-null
  import-table dependency; existing server repository behavior.
- **Live read:** two `SELECT`-only catalog queries over `pg_proc`, ACL helpers,
  columns, constraints, indexes, triggers, and function definitions.
- **Git:** branch and base re-derived; main worktree left untouched.
- **Diff:** `git diff --check` passed before the documentation-only commit.

The requested PostgreSQL BEFORE/AFTER proof and application validation
commands were not run because there is no implementation after the mandatory
STOP. Their absence is not represented as a pass.

## Boundaries held

- No production write of any kind.
- No `apply_migration`, writing SQL, DDL, DML, GRANT, REVOKE, or DROP against
  production.
- No production table-row or personal-data read.
- No migration created, edited, applied, or superseded.
- `20260720120000_coarsen_import_name_match_reasons.sql` was read only and left
  unchanged; it remains insufficient as oracle closure.
- No registration-time claiming, claim-RPC modification, closure audit,
  converge work, Step 4.4, deploy, Wrangler action, or push.
- `.codex/` and `DEPLOY-STATE.md` untouched.

## Next approved action

The owner must choose and authorize a pre-match persistence model and a safe
normalized-collision preflight. Only then should a fresh implementation branch
build the expansion/contract migrations, structured matcher, save-time
lock-then-judge revalidation, and disposable PostgreSQL BEFORE/AFTER proof.
