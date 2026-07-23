# Migration ↔ Production-Ledger Map

Authoritative mapping between `supabase/migrations/` filenames and the
production migration ledger (`tm-stats` / `qjtwgrjjwnqafbvkkfex`). The
executable source of truth is `src/lib/db/migration-ledger-map.ts`, enforced by
`src/lib/db/migration-ledger-map.test.ts`. Re-verify by re-listing the ledger
read-only and updating both files together.

## Current snapshot

Attested **2026-07-23**: **115 entries**, head
`20260723082917 add_non_import_guest_identity_creator`. The count and head are
pinned in `PRODUCTION_LEDGER_ATTESTATION`, so a later attestation that disagrees
fails rather than silently overwriting. This production snapshot must be re-read
live before any production-sensitive action.

> **Provenance of the 115-entry snapshot — this one WAS read live.** Unlike the
> 114-entry snapshot it replaces, both the count and the head were read directly
> from the production ledger by the session that recorded them. That session
> held a single-mutation authorization to apply `20260722160000` and read the
> ledger immediately before and immediately after the apply:
>
> | Read | Entries | Head |
> | --- | --- | --- |
> | pre-apply | 114 | `20260723014849 repair_snapshot_player_ids` |
> | post-apply | 115 | `20260723082917 add_non_import_guest_identity_creator` |
>
> The pre-apply read **confirms the previous transcribed snapshot was correct**:
> the 114/`20260723014849` values reconciled from `DEPLOY-STATE.md` on
> 2026-07-23 matched production exactly. Exactly one entry was added, and it is
> the authorized apply — no unaccounted entry landed in between.
>
> This is still a snapshot of a moment, not a standing guarantee. Re-attest live
> before the next production-sensitive action.

> **Reconciled 2026-07-22 from repository evidence only.** This section was left
> at the earlier 110-entry snapshot after three further entries landed. It has
> been brought into line with `PRODUCTION_LEDGER_ATTESTATION` and
> `PRODUCTION_LEDGER_VERSIONS` in `src/lib/db/migration-ledger-map.ts`, the
> executable source of truth named at the top of this file. The version array
> there was counted directly rather than taken from its declared count: **113
> literals, 113 unique, maximum `20260722153233`** — an exact match for the
> attested count and head, with exactly 110 entries at or below the previous
> head `20260721201734`. **No live ledger was read for this reconciliation.**
> Nothing in this section is fresh production evidence; it restores agreement
> between two repository files that had diverged.

### The 115th entry — `20260723082917 add_non_import_guest_identity_creator`

Applied to production 08:29Z on 2026-07-23 **from this branch**, under a
single-mutation authorization, as the **EXPAND** half of the `ID-READER-CLIENT`
repair. Repo file `20260722160000`; the apply tool stamped the UTC apply time
over the filename version, so it is a renamed apply paired by **name**.

It **drifted**, unlike the entry below it. That makes the 114th entry the only
non-drifting apply among the ten whose source file is known.

Verified read-only immediately after the apply:

- `public.create_or_reuse_guest_identity` exists in `public`, with **exactly one
  overload** — the eight-argument signature the file declares. The distinct-name
  design that avoids the `42725` ambiguity hazard therefore held.
- ACL is `{postgres=X/postgres,service_role=X/postgres}`. `authenticated` and
  `anon` hold no `EXECUTE`, and the implicit `PUBLIC` grant that
  `CREATE FUNCTION` would otherwise leave is **absent** — the load-bearing
  `revoke … from public` in the file did its job.
- `prosecdef` is true and `search_path` is `""`, as declared.

**Applying it authorized nothing further.** Nothing deployed calls the new
function; the moved reader is **still undeployed**, and the CONTRACT drop of the
deployed 7-argument `resolve_import_guest_identity` remains a separate gate whose
own precondition — a production ACL read on that resolver — has **not** been
performed. The rollback, valid only while nothing calls the function, is a single
`drop function if exists public.create_or_reuse_guest_identity(uuid, uuid, text,
text, text, text, uuid, boolean);` and requires fresh owner authorization.

### The 114th entry — `20260723014849 repair_snapshot_player_ids`

Applied to production ~01:48Z on 2026-07-23 from the live-site lineage as the
**data half** of the saved-game player-label release, ahead of its own frontend.
It repoints 33 stale player ids across 13 finalized games inside
`game_revisions.snapshot`, matching each snapshot player to its `game_players`
row on the six score fields both carry and asserting that map one-to-one,
injective, roster-complete and non-chaining before writing anything.

It is registered **production-only**, with provenance, and its file is
**deliberately not carried** onto this branch. The reasoning is in
"Registered production-only rather than carried" below.

For one full day this entry was absent from this lineage in every form — no
file, no ledger-map entry, no row in this document — while
`PRODUCTION_LEDGER_ATTESTATION` still read 113 with head `20260722153233`. The
`ledger → repo` direction of the gate is what makes such an entry a hard
failure (`LEDGER_INCOMPLETE`) once the snapshot is refreshed, rather than
something that can sit unnoticed. The drift blocked the expand apply of
`20260722160000`, whose precondition is that the attested ledger matches
production; closing it makes that precondition true and nothing else.

That reconciliation was subsequently **confirmed against production**: the
pre-apply live read on 2026-07-23 returned exactly 114 entries with this entry
as head, matching the transcribed record it had produced. The expand apply then
proceeded and is recorded above as the 115th entry.

**This entry did not drift.** Its filename version equals its ledger version, so
it is *not* a renamed apply and appears in neither
`APPLIED_UNDER_DIFFERENT_LEDGER_VERSION` nor the name-keyed map. That is worth
recording rather than passing over: the eight preceding applies whose source
file is known — `20260720221937`, `20260721035955`, `20260721081355`,
`20260721193508`, `20260721201734`, `20260722132159`, `20260722144034` and
`20260722153233` — every one drifted. This is the first that did not, because
its repo copy was written after the apply and named to the ledger version
deliberately; the file says so in its own header.

### Entries added since the 110-entry snapshot

The three entries added between the 110- and 113-entry snapshots. Each is
carried in this repository under a filename version different from its
apply-time ledger version, so all three are paired by **name** in
`APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME`:

| Ledger version | Ledger name | Repo file version |
| --- | --- | --- |
| `20260722132159` | add_source_bound_import_identity_staging | `20260722012658` |
| `20260722144034` | coarsen_import_name_match_reasons | `20260720120000` |
| `20260722153233` | close_authenticated_guest_identity_oracle | `20260722153000` |

Two of those move a file **out of the gated set**: `20260722012658` and
`20260720120000` are applied and are no longer prepared-and-unapplied. One file
later **joined** the gated set on 2026-07-22 — `20260722160000`, the EXPAND half
of the `ID-READER-CLIENT` repair — and then **left it again on 2026-07-23** when
it was applied as `20260723082917`; it is recorded above as renamed drift.
A second file **joined** the gated set on 2026-07-23: `20260723130000`, the
EXPAND half of the matcher service-role re-gate, built locally under owner
decision PD-1 and applied nowhere. `GATED_UNAPPLIED` therefore now holds **six**
entries, and `20260722012707` is still the only remaining half of the
source-bound replacement. Applied is not closed — `20260722144034` was an interim
mitigation that independent review found insufficient as a closure; see the gated
table below.

**Prior snapshots, retained.** The 110-entry snapshot (head
`20260721201734 harden_claim_rpc_privacy`, independently verified 2026-07-21)
was itself preceded by a 108-entry snapshot with head `20260721081355`; those
two additions are recorded below. The 2026-07-21 claim-RPC grant reconciliation
re-attested 110 entries read-only with an exact `PRODUCTION_LEDGER_VERSIONS` set
match — no entry added or removed. What changed there was a *classification*,
not the ledger: `20260720221937 grant_authenticated_claim_rpc_execute` moved
from production-only to renamed drift, because its file is now carried here as
`20260720190000`.

## What the gate enforces

The drift test runs in **both** directions, and the two directions catch
different failures:

| Direction | Property | Failure |
| --- | --- | --- |
| repo → ledger | every migration file resolves to exactly one classification | unclassified file |
| repo → ledger | no gated migration appears applied | `GATED_MIGRATION_APPLIED` |
| repo → ledger | every renamed mapping points at a real ledger version | broken mapping |
| ledger → repo | every ledger version resolves to exactly one classification | `LEDGER_INCOMPLETE` |
| hazard | every migration file declares a hazard class | `CLASSIFICATION_MISSING` |

The ledger → repo direction is what catches a production application made from
a *different* branch. Three such entries landed between the 2026-07-20 and
2026-07-21 attestations and left no trace on this branch; before this direction
existed they would have been invisible to the gate. Two more landed later on
2026-07-21 — `20260721193508` and the ledger #106 hardening `20260721201734`.
The #106 file is now carried on this branch, which is what moves it out of the
production-only register and into renamed drift.

Hazard class is **orthogonal** to classification. Classification answers "what
is this migration's relationship to production history"; hazard class answers
"what does applying it do to a deployed reader or writer". A gated migration
can be an expansion, and an already-applied migration can have been a
contraction.

## Why filenames and ledger versions differ

Migrations applied through the connected management tool (`apply_migration`)
are recorded under the **apply-time timestamp**, not the filename timestamp.
The SQL was verified byte-identical at application time; only the version
label differs. This is expected drift, now documented rather than implicit.

### The one deliberate byte-divergence

`20260718050924_claimable_guest_identity_privacy` is the single exception, and
it is intentional rather than drift. As applied (ledger `20260718181600`) it
ended with six revokes of EXECUTE on `list_claimable_player_profiles()` and
`claim_player_profile(uuid)` from `public`, `anon` and `authenticated`, written
when registration-time claiming was still deferred. Production then restored
that grant — ledger `20260720221937 grant_authenticated_claim_rpc_execute` — so
replaying the file as applied left the claim RPCs unreachable for every
signed-in caller, and a clean-baseline replay of this directory reproduced a
state production has not been in since 2026-07-20.

Those six lines are removed from the repo file, and nothing else in it changed.
The file itself carries the reasoning at that position. Two facts keep this
honest rather than convenient:

- The ledger #106 hardening (`20260721201734`, repo file `20260721173000`)
  changed what those functions **disclose and accept**, never **who may call
  them**. It creates, drops and grants nothing. It does not make the revoke
  safe; the dimensions are orthogonal.
- The file never touched `claim_player_profiles_by_name()`. Replaying the
  revoke therefore disabled the explicitly confirmed, per-profile claim path
  required by `GUEST-PLAYER-IDENTITY-AND-PRIVACY.md` while leaving the
  unconfirmed bulk auto-link path callable — a net privacy regression.

`supabase/tests/claimable-guest-identity-privacy-migration.test.ts` pins the
absence of those revokes, so the block cannot silently return.

### `20260718050924` is not gated, and must never be applied

It is recorded here as renamed drift, and `GATED_UNAPPLIED` does not contain
it. Earlier records — including `DEPLOY-STATE.md` — describe it as a "gated"
migration awaiting reconciliation. That is wrong: only its *version string* is
absent from the ledger; its *content* is applied, as `20260718181600`.

Applying the file to production is never correct. It would abort on `42P07`
(its unguarded index names already exist) **after** executing
`create table public.player_private_identities` — the Data-API-exposed table of
guest first names, last names and normalized personal names that
`20260718212339` (ledger `20260719191911`) moved into the `private` schema —
and it would revert the hardened definer functions installed by
`20260719191911` and `20260721035955`. Its non-idempotency is a **safety
property**, documented in the file: guarding those statements would let an
accidental `db push` succeed instead of aborting. No `if not exists` guard may
be added to it, and the migration test pins that too.

## Classifications

### Applied, same version (repo-native)

Every repo file whose version appears verbatim in the ledger (the bulk of
the early history, plus `20260718041532`, `20260718200536`,
`20260715024245`, `20260715113501`, …). These replay cleanly and production
skips them by version.

### Applied under a different ledger version (renamed drift)

| Repo file (version) | Ledger version | Ledger name |
| --- | --- | --- |
| `20260718050924_claimable_guest_identity_privacy` | `20260718181600` | claimable_guest_identity_privacy |
| `20260718114500_sync_upstream_cards_and_tile_catalog` | `20260718154209` | sync_upstream_cards_and_tile_catalog |
| `20260718120000_reconcile_upstream_card_identities` | `20260718154932` | reconcile_upstream_card_identities |
| `20260718212339_remediate_guest_identity_privacy_boundary` | `20260719191911` | remediate_guest_identity_privacy_boundary |
| `20260718212340_harden_game_log_event_contract` | `20260719192054` | harden_game_log_event_contract |
| `20260718212342_add_objective_catalog_aliases` | `20260719192148` | add_objective_catalog_aliases |
| `20260719223000_isolate_player_personal_names_from_data_api` | `20260719203944` | isolate_player_personal_names_from_data_api |
| `20260719223500_enable_rls_on_player_legacy_identities` | `20260719204250` | enable_rls_on_player_legacy_identities |
| `20260719230000_security_invoker_on_import_integrity_audit` | `20260719205420` | security_invoker_on_import_integrity_audit |
| `20260720190000_grant_authenticated_claim_rpc_execute` | `20260720221937` | grant_authenticated_claim_rpc_execute |
| `20260721173000_harden_claim_rpc_privacy` | `20260721201734` | harden_claim_rpc_privacy |
| `20260720120000_coarsen_import_name_match_reasons` | `20260722144034` | coarsen_import_name_match_reasons |
| `20260722012658_add_source_bound_import_identity_staging` | `20260722132159` | add_source_bound_import_identity_staging |
| `20260722153000_close_authenticated_guest_identity_oracle` | `20260722153233` | close_authenticated_guest_identity_oracle |
| `20260722160000_add_non_import_guest_identity_creator` | `20260723082917` | add_non_import_guest_identity_creator |

These files must **never** be renamed to their ledger versions casually and
must never be pushed directly: a plain `supabase db push` would re-apply
their content as new versions.

**The ledger #106 row is keyed by name, not by version.** The file was authored
and applied on the live-site branch `fix/106-claim-rpc-privacy-remediation`
(fix commit `9ddd0de59`, tip `48d612fc8`); `apply_migration` stamped the UTC
apply time `20260721201734` over the filename version `20260721173000`. Nothing
in the ledger points back at the filename, so version cannot be the join key —
and adjacency in time is not a safe substitute either, because the *other*
2026-07-21 addition (`20260721193508`) was stamped with a ledger version that
*precedes* its filename version. What survives the rename is the migration
**name**: `harden_claim_rpc_privacy` appears both in the ledger entry and in the
filename. `APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME` records that pairing
and the drift test asserts it against the real filename on disk, so renaming or
deleting the file fails the gate instead of orphaning the mapping.

This row is why the file is carried here at all. The #106 bodies are live in
production, but the definitions this lineage recorded for the three claim RPCs
were still the pre-fix, vulnerable ones. A redesign deploy or `db diff` taken
against that stale record could have reintroduced the enumeration oracle and
silently reverted production.

**The B-05 grant row is name-keyed for the same reason**, and carried for a
parallel one. `apply_migration` stamped `20260720221937` over the filename
version `20260720190000`; `grant_authenticated_claim_rpc_execute` is the only
key common to the file and the ledger entry. Before it was carried, no file on
this branch restored the `authenticated` EXECUTE that `20260718050924` revoked
— `20260706190000_add_saved_player_claim_functions` grants nothing at all, and
the #106 hardening grants nothing either — so a clean-baseline replay of this
directory ended with the claim RPCs unreachable for every signed-in caller,
which is not the state production is in. Carrying it, together with removing
the revoke block, is what closes that gap.

### Applied under an unconfirmed `remote_only` version

`20260704000000_drop_superseded_reference_policies`,
`20260714183000_force_existing_user_pin_reset`,
`20260715032000_prevent_future_game_log_backfills`,
`20260715043000_add_domain_aware_ocr_corrections` — their content is live in
production (verified behaviorally; for example the `input_sha256` trigger is
active), but the ledger records only name-anonymized `remote_only` entries
(`20260714233758`, `20260715030517`, `20260715031157`, `20260715034351`,
`20260715034414`, `20260715170238`), so the exact pairing cannot be
confirmed from the ledger alone.

### Reconstructed remote-only (same version, restores clean replay)

- `20260711232834_add_find_duplicate_game_log_import` — faithful schema-only
  reconstruction of the deployed function and its ACL.
- `20260712114538_add_player_username_full_name` — faithful schema-only
  reconstruction of the remote-only players column addition.

Production skips both by version; disposable clusters gain the objects.

### Remote-only ledger history with no repo file

Everything else in the ledger (the analytics/RPC iteration history from
`20260708164000` through `20260717032629`, `20260712112659`,
`20260712115539`, `20260712220257`, plus `20260718212722
[20260718204000_add_game_mechanic_capture]`, `20260718234835
lock_down_public_backup_tables`, and the live-site release `20260719132042
data_capture_hardening_v2`). The repo does not carry these files; the
disposable harness does not need them for the redesign's objects.

`20260720021300 add_import_player_name_matching_rpc` also belongs here. It
was applied from the live-site session and created the SECURITY DEFINER
function `public.match_import_player_names`, which restored server-side
import name matching after the personal-name Data API revokes. It is
production-only with no repo file. The repo file
`20260720120000_coarsen_import_name_match_reasons` amends that deployed
function rather than creating it.

Production findings last independently verified 2026-07-21 (and requiring a
fresh live read before any production-sensitive action) classify that deployed
function as a **confirmed private-name enumeration oracle**. The live-site
reader half is already deployed, bounds its own input, and tolerates both the
fine-grained and coarse response vocabularies. The remaining WS2 work is the
approved server-only replacement. 20260720120000 was applied on 2026-07-22 as
ledger `20260722144034` and is still insufficient as a closure: coarsening the
response hides which private field matched but still confirms that a
caller-supplied private name belongs to a real identity. The oracle is
therefore mitigated, not closed.

Every ledger version in this category is now registered explicitly in
`PRODUCTION_ONLY_LEDGER_VERSIONS` (69 entries), which is what makes the
ledger → repo direction complete. Most are remote-only history whose migration
*names* were never captured, so no name is asserted for them; the entries whose
identity is attested carry provenance in `PRODUCTION_ONLY_ENTRY_PROVENANCE`.

### Applied from another branch (2026-07-20 → 2026-07-21)

Three entries were added to the ledger after the 2026-07-20 snapshot and still
have no file on this branch; each was applied from another branch under a
renamed ledger version.

| Ledger version | Ledger name | Source file (other branch) | Branch |
| --- | --- | --- | --- |
| `20260721035955` | secure_public_player_labels_service_role | `20260721013000_secure_public_player_labels_service_role.sql` | `origin/fix/public-player-label-service-role-boundary` |
| `20260721081355` | fix_event_card_tag_snapshot_correction | `20260720223000_fix_event_card_tag_snapshot_correction.sql` | `origin/fix/event-card-snapshot-migration-bounded-rebuild` |
| `20260721193508` | fold_player_card_outcome_context_into_definer | `20260721194500_fold_player_card_outcome_context_into_definer.sql` | `814e60210` (`fix/live-compare-data-remove-declared-style`) |

The last row is the `player_card_outcomes` timeout remediation. Note that its
ledger version *precedes* its filename version — the reason renamed applications
are paired by name rather than by timestamp order.

Two further entries from this window are **not** listed here, because their
files are now carried on this branch and they are therefore renamed drift with
declared hazard classes rather than production-only entries:
`20260720221937 grant_authenticated_claim_rpc_execute` (carried as
`20260720190000`) and `20260721201734 harden_claim_rpc_privacy` (carried as
`20260721173000`).

Because the three files above are not on this branch they carry no hazard class
here.
Hazard class is declared per **file present on this branch**; if one of these
files is ever brought over it must gain a declaration at that point. Until
then the ledger → repo completeness check is the only property that applies to
them.

### Registered production-only rather than carried

`20260723014849 repair_snapshot_player_ids` is the case that makes the choice
between the two treatments explicit, because a source file for it **does** exist
on the production lineage (`75f6e0794` on
`fix/live-compare-data-remove-declared-style`, blob
`1a1d70905bbabe450c90b6a40fc87b1527c9375e`) and it is still registered here
rather than carried.

The discriminator is not whether a file exists somewhere. It is **whether this
lineage records a stale definition the migration corrects.** The ledger #106
carry (`20260721173000`) was made because this branch's record of the three
claim RPCs was the pre-fix, vulnerable bodies, so a redesign deploy or `db diff`
taken against that record could have reproduced them and silently reverted
production. That hazard requires the migration to *define* something.

`20260723014849` defines nothing. Its only DDL is two
`create table if not exists private.mig_*` audit artifacts — the correction map
and the pre-image backup — and its substance is an `UPDATE` of
`public.game_revisions.snapshot` row values. It creates, alters or drops no
function, view, policy, constraint, column or grant. There is consequently no
definition on this lineage that is stale, and nothing a deploy or diff could
reproduce wrongly. The #106 condition is absent, so the #106 remedy does not
apply.

Three further points agree, and none of them are about this migration
specifically:

- **The nearest structural precedent already went this way.**
  `20260721193508 fold_player_card_outcome_context_into_definer` is also a file
  present on `fix/live-compare-data-remove-declared-style`, and it carries real
  schema surface (a definer-function fold) rather than none. It was registered
  production-only, by the same session that carried #106. Existence of the file
  on the production lineage has never by itself been a reason to carry.
- **Repository convention is uniform and has no counter-example.** No file in
  `supabase/migrations/` creates a `private.mig_*` table or repairs production
  rows — zero of 55. `DEPLOY-STATE.md` records several production data repairs
  that did exactly that (the 2026-07-12 group collapse/split with
  `mig_backup_game_players`, the 2026-07-20 duplicate-group consolidation with
  `private.mig_backup_group_*`); every one is a production-only ledger entry
  with no repo file. Carrying this one would be the first exception.
- **Carrying it would corrupt what the harness models.**
  `supabase/tests/executable/run.sh` replays every non-deferred file in
  `supabase/migrations/` against a clean baseline *before* `seed.sql` loads any
  data. A one-time repair of production rows that cannot exist at that point
  would model nothing and would leave two empty `private.mig_*` tables in every
  disposable cluster.

**Its hazard class, derived from the SQL, would be `neutral`** — recorded here
because a production-only entry carries no `MIGRATION_HAZARD_CLASS` declaration
by construction, and the drift test actively rejects one for a version with no
file on this branch. There is no `REVOKE`, no `DROP`, no tightened constraint,
no narrowed vocabulary and no rebuilt function, so it is not a contraction. The
two tables it adds sit in `private` — outside Data API reach since
`20260719191911` — carry no grant and have no reader, so no contract surface is
widened either; the additive DDL is audit bookkeeping, not a surface anything
depends on. What remains is a data-only reconciliation, which is the `neutral`
definition. The canonical `DEPLOY-STATE.md` characterises it independently as
"a data-only repair of `game_revisions.snapshot`: no DDL on any application
table, no grant, no revoke … schema-neutral in both directions" — the property
that also makes rolling the paired frontend back safe.

### Prepared and NOT applied (gated)

| Repo file | Hazard | Purpose | Gate |
| --- | --- | --- | --- |
| `20260717190000_add_merger_offer_rule_snapshots` | expansion | Phase 2 Merger package | owner-approved group UUID + dry run + explicit authorization |
| `20260719234500_separate_event_confidence_from_review_state` | **contraction** | confidence/review split (repeat-safe) | per-mutation protocol; pre-apply gate includes verifying no deployed writer emits the retired `'reviewed'` confidence (expand/contract) |
| `20260720100000_add_guest_identity_alias_source_control` | neutral | **RETIRED / SUPERSEDED — no-op tombstone.** The file is kept at its original version as an auditable record and now contains no executable statement | none applicable. Applying it is impossible-by-content rather than merely gated; it is not in the production ledger and never will be. Its still-needed capability moved to `20260722160000`, which also does **not** re-grant `authenticated` |
| `20260720110000_extend_canonical_board_placement_contract` | **contraction** | full placement contract | per-mutation protocol; expand/contract order. The pre-apply gate must confirm no `game_log_events` row carries owner ids with a non-`explicit_owner` `ownership_state`: the added CHECK is not `not valid`, so one such row fails the `ALTER TABLE` |
| `20260722012707_retire_free_form_import_name_matcher` | **contraction** | removes authenticated execution from the deployed arbitrary `text[]` matcher | apply only after the expansion and compatible reader are live and verified; separate explicit authorization required. **RE-GATES, DOES NOT CLOSE**: it revokes from `public`/`anon`/`authenticated` only, drops nothing, and leaves `service_role`'s `EXECUTE` intact, so the two-argument function survives as a live callable object and free-form matching continues under `service_role`. Every post-contraction status line must say "re-gated", never "closed" — asserted executably by `supabase/tests/executable/matcher-service-role-overload-post-contraction.sql` |
| `20260723130000_add_service_role_import_name_matcher_overload` | expansion | EXPAND half of the 2026-07-22 matcher amendment: adds the `service_role`-only three-argument `match_import_player_names(uuid, uuid, text[])`, whose authorization gate **and** candidate pool both derive from an explicit requesting-user id instead of `auth.uid()`. Built locally 2026-07-23 under owner decision PD-1. It names the deployed `(uuid, text[])` signature in no statement, so that function is untouched | apply BEFORE `20260722012707` **and before** deploying the moved reader; separate explicit authorization required. Its reader lives on the **live-site** lineage (branch `fix/matcher-service-role-overload-callsite`), so this file's caller is not observable from this branch — which is precisely why the apply and the deploy are separate gates. Deploying that reader first breaks import analyze and both manual player-resolution paths with `PGRST202`/`42883` |

This table is now the **six** entries of `GATED_UNAPPLIED` — `20260723130000`
joined the set on 2026-07-23. **Three files have left it and are recorded above
as renamed drift instead — two on 2026-07-22 and one on 2026-07-23:**

- `20260722012658_add_source_bound_import_identity_staging` — the expansion half
  of the source-bound replacement, applied as `20260722132159`. Its contraction
  half `20260722012707` is still gated, and the compatible server reader is
  still not deployed, so the pairing rule is unchanged: reader first, then
  contraction, under separate explicit authorization.
- `20260720120000_coarsen_import_name_match_reasons` — applied as
  `20260722144034`. **Applied is not closed.** It was an interim mitigation and
  independent review found it insufficient as a closure: it coarsens the
  disclosed reason and score but leaves the private-name confirmation oracle
  open, and it is not part of the source-bound replacement proof. Do not cite it
  as the closure. The closure is `20260722012707`, still gated.
- `20260722160000_add_non_import_guest_identity_creator` — the EXPAND half of the
  `ID-READER-CLIENT` repair. It **joined** the gated set on 2026-07-22 and
  **left** it on 2026-07-23, applied as `20260723082917` under a single-mutation
  authorization. **Applied is not deployed and not closed.** Nothing calls the
  new function yet: the moved reader is still undeployed, and the CONTRACT drop
  of the deployed 7-argument `resolve_import_guest_identity` is still gated, with
  its own precondition — a production ACL read on that resolver — outstanding.

When `20260722160000` joined the set on 2026-07-22, `20260720100000` stopped
being an applicable expansion in the same change: it stays listed in
`GATED_UNAPPLIED`, but only as a retired no-op tombstone kept for audit, and its
declared hazard class moved `expansion` → `neutral`.

### "Deploy and verify the compatible reader" names TWO different gates

Recorded 2026-07-23. The project record uses one phrase — deploy and verify the
compatible reader, then contract — for two **distinct** expand/contract pairs
with different contractions, different readers, and different evidence. They are
not interchangeable, and satisfying one does not satisfy the other. Nothing
below restructures either sequence or changes what either step requires.

| | **Guest-identity pair** | **Matcher pair** |
| --- | --- | --- |
| Expand | `20260722160000` → ledger `20260723082917`, applied 2026-07-23. Adds `public.create_or_reuse_guest_identity`, `service_role` only | `20260722012658` → ledger `20260722132159`, applied 2026-07-22. Adds source-bound staging and service-only gateways |
| Reader to deploy | the moved non-import guest-creation call sites (`createOrReuseGuestPlayerByPersonalName` and its two product paths), on the admin client | the source-bound, server-only import-identity reader |
| Contract | **the DROP of the deployed 7-argument `resolve_import_guest_identity`** — not authored, not authorized. Tracked as `ID-READER-CONTRACT` | **migration `20260722012707`** `retire_free_form_import_name_matcher`. Tracked as `ID-LEGACY-ORACLE` |
| Blocker for the reader step | `ID-READER-DEPLOY` | `ID-READER-DEPLOY` |

Both contractions are gated. What differs is the **evidence** behind each gate,
and only one of the two currently has a demonstrated deployed dependency.

**The matcher contraction IS genuinely deploy-gated — evidenced.** Evidence
class **[GIT]**/**[REPO]**, swept at production source commit
`865df0108f2f7b9df000ad3aeb8fcd394e6242a5` (the commit named in the canonical
`DEPLOY-STATE.md` "Current production" table):

- `src/lib/db/import-player-resolution-repo.ts:223` on that commit calls
  `await supabase.rpc('match_import_player_names', { p_group_id, p_imported_names })`.
- The `supabase` handle in that function is
  `const supabase = await createSupabaseServerClient();`, and
  `src/lib/supabase/server.ts:5` builds it with `createServerClient` from
  `@supabase/ssr` using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` plus the request
  cookie store — a **user-session client**. A signed-in caller therefore
  executes the RPC as the **`authenticated`** database role.
- `20260722012707` line 6 is
  `revoke execute on function public.match_import_player_names(uuid, text[]) from authenticated;`
  — exactly the grant that call site depends on.

Applying `20260722012707` against the currently deployed frontend would
therefore break live import name matching. The reader-first order for this pair
is not merely procedural; it is required by evidence.

### The 7-argument drop's reader dependency is currently unsupported by any found caller

Recorded 2026-07-23 as a **finding**, not as a change of disposition. The record
states that the CONTRACT drop of the deployed 7-argument
`resolve_import_guest_identity` is valid only after the moved reader is deployed
and production-verified. A read-only sweep found **no reader on any lineage that
calls that function**.

**What was swept.** Evidence class **[GIT]**:

- Production source commit `865df0108f2f7b9df000ad3aeb8fcd394e6242a5` — zero
  occurrences of `resolve_import_guest_identity` anywhere under `src/`. The only
  hits in that tree are in `DEPLOY-STATE.md` prose.
- Rollback target `d12e33ad0` — zero occurrences under `src/`.
- `redesign/tm-stats-dashboard-rebuild` @ `44eed2e21` — occurrences are
  comments, `src/lib/db/migration-ledger-map.ts`, and a test that asserts the
  RPC is **not** called
  (`import-player-identity-repo.test.ts:157`, `expect(rpc).not.toHaveBeenCalledWith('resolve_import_guest_identity', …)`).

**Positive control.** On the same commit and with the same command, the sweep
does find `.rpc(` in fourteen `src/` files and finds
`match_import_player_names` at `import-player-resolution-repo.ts:223`, so the
empty result is a real absence and not a broken search.

**What the sweep does NOT cover.** All four are open:

1. **Database-internal callers** — other functions, triggers, views, policies or
   defaults inside the production database that invoke the resolver. Nothing in
   the repository can answer this; it needs a production-side catalog sweep.
2. **Edge functions as deployed**, which are not necessarily reproduced by any
   commit in this repository.
3. **Consumers outside this repository** entirely.
4. **Whether the swept commit is what production actually serves.** The commit
   is taken from the canonical ledger — evidence class **[PRIOR]** — and the
   authenticated `/api/deploy-info` confirmation of `sourceCommit` is recorded
   there as still outstanding.

**The precondition stands and is NOT relaxed by this finding.** "No caller was
found" is not "the drop is safe", and the four gaps above are exactly where a
caller would hide. Changing, narrowing, or removing the reader-deploy
precondition on this drop is an **owner decision** and has not been made.

**SUPERSEDED 2026-07-23 as to the reader-deploy precondition; the paragraph
immediately above is retained verbatim as history.** That owner decision **has
since been made**. The reader-deploy precondition on the seven-argument drop is
**replaced**, and the drop's preconditions are now **three**:

1. **Re-derive the signature LIVE** from the production catalog before any drop
   statement is written — `drop function if exists` against a signature that
   does not exist succeeds silently against nothing.
2. **Re-run the catalog sweep** for database-internal callers — function
   bodies, view definitions, triggers and dependency records across all
   non-system schemas — with a positive control, because the existing sweep is
   dated 2026-07-23 and production can move.
3. **Verify the deployed edge functions**, the area the catalog sweep
   explicitly does not cover and for which this repository holds only a prior
   record rather than an observation.

Decision text, which is authoritative over this summary:
`docs/redesign/DECISIONS.md` → "Phase 4 Step 4.3 - The seven-argument resolver
drop: replacing the reader-deploy precondition". Blocker state:
`docs/CURRENT_STATUS.md` → `ID-READER-CONTRACT`.

**What is NOT superseded**, and stays in force exactly as written above: the
first clause — "no caller was found" is still not "the drop is safe". That is
precisely why two of the four uncovered gaps became preconditions 2 and 3
rather than being dismissed. **`ID-READER-DEPLOY` is not dissolved, removed, or
marked complete**: the moved redesign reader is still undeployed, still needs to
ship, and still gates contraction `20260722012707`. Only its *reach* changed —
it is no longer a precondition of this drop.

**No other precondition in this file is changed by this note**, and the drop
itself remains unauthorized.

**Preconditions that are real regardless of how that decision goes**, and that
remain outstanding:

- the **authorized production ACL and signature read** on
  `resolve_import_guest_identity` — deliberately not performed by the expand
  session, which held no authorization for it; and
- a **fresh production-side catalog sweep for database-internal callers**,
  which no repository-only sweep can substitute for.

## Hazard classes

Every migration **file** on this branch declares one hazard class in
`MIGRATION_HAZARD_CLASS`. The declaration is explicit and never derived from
the SQL: the hazard depends on what was *deployed before* the migration, which
the SQL alone does not record. A file with no declaration fails as
`CLASSIFICATION_MISSING`.

- **`contraction`** — removes or narrows a contract surface that existed
  before this migration and does not restore an equal-or-broader replacement
  in the same file: a `REVOKE` on a pre-existing object, a dropped object with
  no replacement, a tightened `CHECK` or constraint on an existing table, a
  narrowed vocabulary, or a rebuilt function that discloses less. These
  require the expand/contract order recorded in `DECISIONS.md`.
- **`expansion`** — only adds or widens: new tables, columns, functions,
  policies or grants; relaxed constraints; a replacement that accepts every
  previously valid call.
- **`neutral`** — no contract surface change: data-only seeds and
  reconciliations, comments, no-op history placeholders.

Where a file mixes hazards, the strongest present wins. Current declarations:
**16 contraction, 31 expansion, 9 neutral** (56 files) — counted from
`MIGRATION_HAZARD_CLASS` and reconciled against `supabase/migrations/` on
2026-07-23, re-counted rather than assumed.

The 56th file is `20260723130000_add_service_role_import_name_matcher_overload`,
added on 2026-07-23 and declared `expansion`: it creates one new signature and
names the deployed `(uuid, text[])` matcher in no statement, so it removes and
narrows nothing a deployed reader holds. Read `expansion` strictly as "what
applying it does to a deployed reader" — it is **not** a statement about how much
trust the file moves, and this one downgrades the matcher's authorization from
`auth.uid()` to an application-supplied id, which the amendment records as an
accepted security cost.

The two earlier 2026-07-23 changes each added a ledger entry but **no file**: the
morning ledger reconciliation carried no file by decision, and the
`20260722160000` expand apply used a file that was already on this branch. The
55th file is `20260722160000`, whose declaration is below; **applying it did not
change its hazard class**, which was re-confirmed as `expansion` against the SQL
that actually landed and against the post-apply catalog. On 2026-07-22 `20260720100000` moved `expansion` → `neutral` when it was
retired as a no-op tombstone, which is why the expansion count is unchanged at
30 while the neutral count rose from 8 to 9.

### Contractions

| File | Narrowing |
| --- | --- |
| `20260704000000_drop_superseded_reference_policies` | drops 11 pre-existing policies, creates none |
| `20260715032000_prevent_future_game_log_backfills` | triggers reject writes the deployed contract accepted |
| `20260715113501_restore_ocr_confirmation_function` | revokes PUBLIC/anon execute on the already-deployed confirmation function |
| `20260718041532_remove_game_expansion_tracking` | drops `game_expansions`, `group_default_expansions`, `expansions` |
| `20260718050924_claimable_guest_identity_privacy` | revokes on pre-existing functions and the `private` schema; drops alias constraints; drops two `domain_text_aliases` read policies and replaces them with a narrower one. Still a contraction after the claim-RPC revokes were removed — none of those other narrowings changed |
| `20260718212339_remediate_guest_identity_privacy_boundary` | drops member-read policies on private identities; revokes execute on a pre-existing function |
| `20260718212340_harden_game_log_event_contract` | tightens CHECKs on the deployed `game_log_events` contract |
| `20260719223000_isolate_player_personal_names_from_data_api` | the Data API revokes that broke the deployed frontend on 2026-07-19 |
| `20260719223500_enable_rls_on_player_legacy_identities` | enabling RLS narrows previously unrestricted access |
| `20260719230000_security_invoker_on_import_integrity_audit` | moves the view to the caller's rights |
| `20260719234500_separate_event_confidence_from_review_state` | retires `'reviewed'` from the confidence vocabulary |
| `20260720110000_extend_canonical_board_placement_contract` | mixed, so the strongest wins. It widens the action/ownership vocabularies and adds nullable columns, but `game_log_events_owner_requires_explicit_state` is a CHECK on the pre-existing `owner_player_id`/`owner_game_player_id`/`ownership_state` columns, and not `not valid`. The deployed contract accepts owner ids alongside `ownership_state = 'unknown'`; afterwards that write is rejected and the `ALTER TABLE` fails if any such row already exists. The rebuilt RPC adds rejections its predecessor lacked (owner consistency; the Mars/Moon board-layout format checks) |
| `20260720120000_coarsen_import_name_match_reasons` | narrows the disclosed match classification a deployed caller can read |
| `20260721173000_harden_claim_rpc_privacy` | rebuilds three deployed claim RPCs to disclose less and accept less: prefix/substring name matching becomes exact whole-name matching, a 3-character normalized-input floor and a 10-row cap are imposed, the private-first-name label fallback becomes a neutral placeholder, and `group_name` is returned null in the candidate list |
| `20260722012707_retire_free_form_import_name_matcher` | revokes authenticated/public/anon execution on the pre-existing arbitrary-name matcher; intentionally separate from the expansion |
| `20260722153000_close_authenticated_guest_identity_oracle` | revokes `authenticated` EXECUTE on the pre-existing `public.resolve_import_guest_identity`, removing a surface that role held before the migration and restoring no replacement. Applied as ledger `20260722153233`; a contraction even though the pre-apply zero-caller sweep proved no deployed reader depends on it |

`20260721173000` is the case where the *ledger* classification and the *hazard*
classification pull in opposite directions, which is exactly why the two
dimensions are kept orthogonal. It is already applied to production, so nothing
about it is pending; but it is still a contraction, because a reader written
against the pre-fix bodies — one that expected prefix matches, a populated
`group_name`, or a personal-name label — would break against the deployed
result. It creates, drops and grants nothing: `authenticated` keeps EXECUTE on
all three functions (ledger `20260720221937`), and the live claim flow depends
on that. The narrowing is entirely in what the bodies disclose and accept.

Three declarations deserve their reasoning stated, because the raw SQL reads
the other way:

- `20260720190000_grant_authenticated_claim_rpc_execute` contains four `REVOKE`
  statements, and is still an `expansion`. What it revokes is the implicit
  `PUBLIC` EXECUTE that `CREATE FUNCTION` grants by default (plus `anon` on
  `claim_player_profiles_by_name()`), and it grants explicit EXECUTE to
  `authenticated` on all three claim RPCs in the same file. No deployed reader
  was written against the `PUBLIC` grant, and the functions' own
  `auth.uid() is null` gate already rejected anonymous callers, so nothing is
  stranded: every real signed-in caller gains access rather than losing it.
  Declared `expansion`.
- `20260722160000_add_non_import_guest_identity_creator` contains `REVOKE`
  statements and is still an `expansion`. Every revoke targets the function the
  same file creates — including the load-bearing `from public` revoke that
  removes `CREATE FUNCTION`'s implicit `PUBLIC` grant — so nothing deployed is
  stranded. It creates one new `service_role`-only function, drops no object,
  narrows no pre-existing grant, tightens no constraint, and leaves the deployed
  7-argument `resolve_import_guest_identity` exactly as it is. Declared
  `expansion`, and **confirmed against production** after the 2026-07-23 apply:
  the post-apply catalog read returned one overload and the ACL
  `{postgres=X/postgres,service_role=X/postgres}` — no `authenticated`, no
  `anon`, no surviving `PUBLIC` grant.
- `20260704034500`, `20260704071832` and `20260704123000` drop policies and
  recreate them under equal-or-broader definitions (`owners …` → `members …`,
  `editors …` → `members …`). Declared `expansion`.

### Neutral

| File | Why |
| --- | --- |
| `20260704043302_seed_reference_dimensions` | inserts only |
| `20260706132454_seed_all_map_milestones_and_awards` | inserts only |
| `20260708013631_fix_replace_game_log_events_conflict_target` | one function body; no contract surface change |
| `20260708143547`, `20260708143922`, `20260708150649`, `20260708162535` `_remote_history_placeholder` | no-ops |
| `20260718212342_add_objective_catalog_aliases` | inserts only |
| `20260720100000_add_guest_identity_alias_source_control` | retired no-op tombstone; contains no executable statement, so applying it changes no contract surface at all. Its previous body was **not** neutral: it dropped the deployed 7-argument `resolve_import_guest_identity` and re-granted `authenticated` EXECUTE on the replacement, which would have reopened the private-guest-name confirmation oracle production closed as ledger `20260722153233`, and it still gated on `auth.uid()` so it did not repair `ID-READER-CLIENT` either. The capability moved to `20260722160000` |

## Deployment rules

- `supabase/migrations/` is **not** a safe direct `db push` source against
  production: the renamed-drift files would re-apply, and the ledger holds
  remote-only history the repo does not. Production changes go through the
  per-mutation protocol (exact SQL, expected rows, rollback, re-run
  preflight, stop conditions) with `apply_migration`, in version order for
  the pending gated set.
- Clean-baseline replay of `supabase/migrations/` is correct and
  executable-tested end to end by `supabase/tests/executable/run.sh`, which
  runs in two separated halves: production history first (no gated migration
  may precede a baseline assertion about the state production is in today),
  then every gated migration in ledger-version order, each applied twice for
  repeat-safety.
- The harness models the one production-only ledger entry the gated work
  depends on, `20260720021300`, so that `20260720120000` is exercised as a
  true REPLACE of its deployed predecessor rather than silently created.
  `production-preimage-20260720021300-match-import-player-names.sql` is a
  reconstruction from repository-local evidence only — no production system
  was read to produce it. Its fidelity is asserted only for the surface the
  contraction changes (signature, return shape, ACL, disclosed classification,
  absence of an input bound); it must never be promoted into
  `supabase/migrations/` or cited as evidence about production.
- Contractions (REVOKE / DROP / constraint tightening) additionally follow
  the expand/contract order recorded in `DECISIONS.md`: deploy the reader or
  writer that no longer needs the old shape, verify, then contract.
