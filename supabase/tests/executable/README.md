# Executable migration + integration tests (Phase 4 Step 4.3 remediation)

These tests run the real migration SQL against a real PostgreSQL engine, rather
than asserting on migration text. They exist because Docker/`supabase start` is
unavailable in this environment; a disposable, trust-authenticated PostgreSQL 18
cluster is created on a spare port instead (see the
`docker-wsl-unavailable-native-pg` note).

## What it validates

`run.sh` creates a throwaway cluster, applies a Supabase-compatible bootstrap
(`bootstrap.sql`: `anon`/`authenticated`/`service_role` roles, an `auth` schema
with `auth.uid()`, a minimal `storage` schema, `pgcrypto`), then:

1. **Production-history replay** — every migration in `supabase/migrations/`
   that is actually applied to production applies cleanly, including
   `20260718212339` (privacy), `20260718212340` (event contract) and
   `20260718212342` (objective aliases). The alias migration is deferred until
   the objective catalogue is seeded, because its precondition correctly
   refuses to run against a catalogue that does not match the approved mapping
   (the catalogue is seed data, not a migration).

   **No migration in `GATED_UNAPPLIED` runs in this half.** The baseline
   assertions below are claims about the state production is in today, so a
   gated migration applied before them would make them assert against a
   database production does not have.

   One production-only ledger entry has no repo file and is needed here:
   `20260720021300`, which created `public.match_import_player_names`. It is
   modelled by
   `production-preimage-20260720021300-match-import-player-names.sql` — a
   reconstruction from repository-local evidence only, whose scope and limits
   are stated in its own header.
2. **Production-state baselines**:
   - `pre-split-compat.sql` — the redesign's emitted payload (including the
     `review_state` key) is accepted by the deployed pre-split RPC, and
     `review_state` cannot yet persist.
   - `match-oracle-pre-contraction.sql` — the deployed
     `match_import_player_names` discloses the fine-grained matched field
     (`display_name_exact` / `full_name_exact` / `username_exact` /
     `alias_exact` / `display_name_partial`) with the 1:1 score, accepts an
     unbounded candidate batch, and rejects a non-member. This is the oracle
     the gated contraction closes.
3. **Gated migrations** — every migration in `GATED_UNAPPLIED` is then applied
   in ledger-version order, each twice for repeat-safety: `20260717190000`
   (merger snapshots), `20260719234500` (confidence/review-state split — after
   two legacy overloaded `confidence_level = 'reviewed'` rows are seeded, so
   its deterministic data mapping runs against real rows), `20260720100000`
   (guest-identity alias source control), `20260720110000` (canonical
   placement contract) and `20260720120000` (match-reason contraction).
   `match-oracle-post-contraction.sql` then proves the contraction is a true
   REPLACE of its deployed predecessor: the disclosure is coarsened to
   `exact`/`partial` and 2/1, every probe still resolves to the *same* player
   (internal ranking unchanged), candidate input is now bounded, and the ACL
   survived `create or replace` — the migration grants nothing of its own, so
   the post-contraction call as `authenticated` can only succeed on the
   inherited grant.
4. **Behavioural assertions** (`assertions.sql`):
   - 23 canonical colonies and 7 catalog aliases are present.
   - the overloaded confidence `reviewed` is **rejected** after the split; an
     unsupported confidence is rejected; every canonical `review_state`
     persists and an unsupported one is rejected; a missing `review_state`
     defaults to `not_required`.
   - the seeded legacy rows were split deterministically: the
     importer-corrected row became `high`/`reviewed`, the unresolved-colony row
     became `low`/`needs_review`, and no `reviewed` confidence survives.
   - the `event_type` allowlist rejects unknown types.
   - a tile event missing typed placement identity/provenance is rejected.
   - a malformed deterministic `event_identity` is rejected.
   - a `colony_id` outside the canonical catalogue is rejected; a valid one is
     accepted.
   - an ordinary `authenticated` member cannot directly read
     `private.player_private_identities` or `public.player_import_aliases`.
   - `replace_game_log_events` rejects a non-member caller (42501) before any
     write; for an authorized editor it rejects duplicate event identities,
     an unrelated player UUID, and the overloaded confidence `reviewed`, and
     persists the split `confidence_level`/`review_state` values end to end.
5. **Matcher service-role overload** (`20260723130000`, GATED / UNAPPLIED) —
   applied twice for repeat-safety BETWEEN the source-bound AFTER proof and the
   legacy-matcher contraction, which is the mandatory expand-then-contract
   order. `matcher-service-role-overload-before.sql` pins the deployed
   two-argument function's body hash, ACL, comment, volatility, security
   attributes and settings, and installs `Matchprobe*` fixtures plus a second
   group with its own member. `matcher-service-role-overload.sql` then asserts:
   - the expand added **exactly one** object and both signatures still resolve;
   - the two-argument function is byte-identical and still granted to
     `authenticated` — the expand must not pre-empt the gated contraction;
   - the new overload's ACL is `service_role` only, with no surviving `PUBLIC`
     entry and no `authenticated`/`anon`;
   - `p_requesting_user_id` carries **no default**;
   - two-argument calls still resolve unambiguously, positionally and by name;
   - a truthful member id returns a **non-zero, exactly enumerated** match set
     with `auth.uid()` NULL — the count is asserted, not the absence of an
     error, because the failure this catches is silent;
   - a NULL requesting user raises `22023` rather than returning zero rows;
   - a non-member raises `42501`; a member of another group raises `42501` here
     and still matches in their own group;
   - **the gate and the candidate pool agree** — the two functions select the
     same non-empty `(imported_name, player_id, is_linked)` set, and poisoning
     `auth.uid()` with an unrelated user changes nothing.

   `matcher-service-role-overload-post-contraction.sql` runs after the
   contraction and pins that it **re-gates rather than closes**: the overload
   survives and still matches, and the two-argument function still exists.

   Every assertion above is mutation-proven; see
   `docs/agent-handoffs/PHASE-04-STEP-03-MATCHER-OVERLOAD-BUILT-LOCAL.md`.
   Probe names must avoid `sentinel`, which `assertions.sql` K3/K4/K6/K8 use as
   their own leak detector over `public.players`.
6. **Idempotency** — re-applying the alias migration leaves exactly 7 aliases.
7. **Rollback** — deleting the seven deterministic alias ids removes only them
   and leaves unrelated aliases untouched.

The test database sets `check_function_bodies = off`, mirroring how the
migration tool applies functions (one historical OCR function has a stale body
that a later migration replaces before it is ever called).

## Running

```bash
PGBIN="/c/Program Files/PostgreSQL/18/bin" bash supabase/tests/executable/run.sh
```

Override `PGBIN`, `PGPORT`, or `PGDATA` as needed. The cluster is torn down on
exit. A non-zero exit status indicates a failure.

## Rollback scope of the remediation migrations

- **`20260718212342` (aliases)** — reversible by deleting only the seven
  deterministic alias row ids (tested above). Canonical objectives, maps,
  relationships, and historical game ids are untouched.
- **`20260718212339` (privacy)** — structurally reversible: move
  `player_private_identities` back to `public`, restore the two member-scoped
  policies and grants, and restore the invoker-security resolver. The one-way
  effect is the neutralised `players.display_name` values for unlinked guests;
  restoring the original personal-name labels is intentionally **not** part of
  rollback, since removing them from the public column is the point.
- **`20260718212340` (event contract)** — the additive columns, constraints,
  indexes, and the `terraforming_mars_colonies` table can be dropped, and the
  confidence constraint restored to `high/medium/low`, to reverse the schema.
  The `replace_game_log_events` function reverts to its prior definition from
  `20260718200536`.
