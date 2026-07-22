// Repository-migrations ↔ production-ledger map (audit §18).
//
// The production ledger (project qjtwgrjjwnqafbvkkfex) is captured READ-ONLY
// via the management API; the current snapshot is the 2026-07-21 attestation
// recorded in PRODUCTION_LEDGER_ATTESTATION. Human-readable companion:
// docs/redesign/reference/MIGRATION-LEDGER-MAP.md.
//
// The drift test (migration-ledger-map.test.ts) enforces this map in BOTH
// directions and fails on anything unclassified:
//
//   repo → ledger   every migration file on this branch resolves to exactly
//                   one classification, and to exactly one hazard class.
//   ledger → repo   every version in PRODUCTION_LEDGER_VERSIONS resolves to
//                   exactly one classification (LEDGER_INCOMPLETE otherwise),
//                   so a new production-only entry cannot land unrecorded.
//
// The two dimensions are orthogonal. Classification answers "what is this
// migration's relationship to production history"; hazard class answers "what
// does applying it do to a deployed reader or writer". A gated migration can
// be an expansion; an already-applied migration can have been a contraction.

/**
 * Provenance of the current PRODUCTION_LEDGER_VERSIONS snapshot. Recorded so a
 * later read-only attestation that disagrees on the count or head is a
 * detectable mismatch rather than a silent overwrite.
 */
export const PRODUCTION_LEDGER_ATTESTATION = {
  project: 'tm-stats (qjtwgrjjwnqafbvkkfex)',
  /** Date of the read-only attestation this snapshot reproduces. */
  attestedOn: '2026-07-22',
  /** Total ledger entries at attestation time. */
  entryCount: 113,
  headVersion: '20260722153233',
  headName: 'close_authenticated_guest_identity_oracle',
  /**
   * The previous snapshot (earlier on 2026-07-21) held 108 entries with max
   * 20260721081355. The two entries above it were both applied from the
   * live-site lineage on 2026-07-21:
   *
   *   20260721193508 fold_player_card_outcome_context_into_definer
   *     Production-only relative to this branch; see
   *     PRODUCTION_ONLY_ENTRY_PROVENANCE.
   *   20260721201734 harden_claim_rpc_privacy
   *     The ledger #106 claim-RPC privacy hardening. Its file is now carried
   *     on this branch as 20260721173000, so it is a renamed-drift target
   *     rather than a production-only entry; see
   *     APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME.
   */
  previousEntryCount: 108,
  previousHeadVersion: '20260721081355',
} as const;

/**
 * Every version in the production ledger as of the attestation above
 * (verified read-only; this branch performs no production access).
 */
export const PRODUCTION_LEDGER_VERSIONS: readonly string[] = [
  '20260703120000', '20260703121500', '20260703123000', '20260703124500',
  '20260703130000', '20260704001728', '20260704030147', '20260704034500',
  '20260704043302', '20260704052314', '20260704071832', '20260704090000',
  '20260704100000', '20260704123000', '20260706132454', '20260706153000',
  '20260706190000', '20260708013125', '20260708013631', '20260708142459',
  '20260708143547', '20260708143922', '20260708150649', '20260708155338',
  '20260708162535', '20260708164000', '20260708182805', '20260708201626',
  '20260708210555', '20260708210608', '20260708210912', '20260708212912',
  '20260709204124', '20260710013517', '20260710013631', '20260710013653',
  '20260710134348', '20260710202359', '20260710205230', '20260710211520',
  '20260711110356', '20260711111553', '20260711120809', '20260711123856',
  '20260711125146', '20260711125251', '20260711134339', '20260711134417',
  '20260711160109', '20260711160409', '20260711215135', '20260711232834',
  '20260712112659', '20260712114538', '20260712115539', '20260712220257',
  '20260713115505', '20260713120000', '20260713120554', '20260713121000',
  '20260713140000', '20260713211040', '20260714064956', '20260714074501',
  '20260714100000', '20260714123000', '20260714133000', '20260714134000',
  '20260714150000', '20260714160000', '20260714170000', '20260714233758',
  '20260715024245', '20260715030517', '20260715031157', '20260715034351',
  '20260715034414', '20260715113501', '20260715123125', '20260715130709',
  '20260715170238', '20260715182325', '20260715182939', '20260716043235',
  '20260716054430', '20260717020330', '20260717020622', '20260717022105',
  '20260717031053', '20260717032629', '20260718041532', '20260718154209',
  '20260718154932', '20260718181600', '20260718200536', '20260718212722',
  '20260718234835', '20260719132042', '20260719191911', '20260719192054',
  '20260719192148', '20260719203944', '20260719204250', '20260719205420',
  // Applied from the live-site session, no repo file: created the
  // SECURITY DEFINER RPC public.match_import_player_names. Repo file
  // 20260720120000 coarsens its disclosed match classification.
  '20260720021300',
  // Added between the 2026-07-20 and 2026-07-21 attestations, all applied
  // from other branches. 20260720221937 is the ledger record of the claim-RPC
  // grant whose file this branch now carries as 20260720190000
  // (APPLIED_UNDER_DIFFERENT_LEDGER_VERSION); the other two have no file here
  // and are registered in PRODUCTION_ONLY_ENTRY_PROVENANCE.
  '20260720221937', '20260721035955', '20260721081355',
  // Added between the two 2026-07-21 attestations, both applied from the
  // live-site lineage. 20260721193508 has no file on this branch
  // (PRODUCTION_ONLY_ENTRY_PROVENANCE); 20260721201734 is the ledger record of
  // the #106 hardening whose file this branch now carries as 20260721173000
  // (APPLIED_UNDER_DIFFERENT_LEDGER_VERSION).
  '20260721193508', '20260721201734',
  // Added on 2026-07-22 from this lineage, both under apply-time renames
  // (APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME):
  //   20260722132159 add_source_bound_import_identity_staging (file 20260722012658)
  //   20260722144034 coarsen_import_name_match_reasons        (file 20260720120000)
  // Both were applied and recorded in docs/agent-handoffs/ before this map was
  // re-attested, so they are registered here rather than left as drift.
  '20260722132159', '20260722144034',
  // Revoked `authenticated` EXECUTE on public.resolve_import_guest_identity,
  // closing the private-guest-name confirmation oracle. File 20260722153000.
  '20260722153233',
];

/**
 * Repo files applied to production under a DIFFERENT ledger version
 * (apply_migration stamped the apply-time version; SQL verified
 * byte-identical at application time). Filename version → ledger version.
 *
 * ONE deliberate exception, recorded so it is never mistaken for drift:
 * 20260718050924 no longer matches the SQL applied as 20260718181600. Its
 * six revokes of EXECUTE on list_claimable_player_profiles() and
 * claim_player_profile(uuid) were removed, because production restored that
 * grant afterwards (ledger 20260720221937) and replaying the revoke left the
 * claim RPCs unreachable for every signed-in caller. The divergence is
 * confined to that block, is explained in the file itself, and is what makes
 * a clean-baseline replay reproduce production's ACL. See
 * docs/redesign/reference/MIGRATION-LEDGER-MAP.md.
 */
export const APPLIED_UNDER_DIFFERENT_LEDGER_VERSION: Readonly<
  Record<string, string>
> = {
  '20260718050924': '20260718181600',
  '20260718114500': '20260718154209',
  '20260718120000': '20260718154932',
  '20260718212339': '20260719191911',
  '20260718212340': '20260719192054',
  '20260718212342': '20260719192148',
  '20260719223000': '20260719203944',
  '20260719223500': '20260719204250',
  '20260719230000': '20260719205420',
  // B-05 claim-RPC grant. Applied from the live-site branch
  // fix/b05-claim-rpc-authenticated-grants (b11cae71b); the apply tool stamped
  // the UTC apply time (20260720221937) over the filename version
  // (20260720190000). Carried onto this branch so a clean-baseline replay
  // reproduces production's explicit `authenticated` EXECUTE on the claim RPCs
  // instead of leaving them unreachable. Pairing is by NAME — see
  // APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME.
  '20260720190000': '20260720221937',
  // Ledger #106. Applied from the live-site branch
  // fix/106-claim-rpc-privacy-remediation; the Supabase apply tool stamped the
  // UTC apply time (20260721201734) over the filename version (20260721173000).
  // The pairing is established by NAME — see
  // APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME.
  '20260721173000': '20260721201734',
  // Owner-authorized 2026-07-22 expansion half of the source-bound import
  // identity split. The apply tool stamped the UTC apply time (20260722132159)
  // over the filename version (20260722012658). Pairing is by NAME.
  '20260722012658': '20260722132159',
  // Interim mitigation of the import name-match oracle, applied 2026-07-22
  // after its own zero-caller gate. Stamped 20260722144034 over the filename
  // version 20260720120000. Pairing is by NAME.
  '20260720120000': '20260722144034',
  // Owner-confirmed 2026-07-22 revoke of `authenticated` EXECUTE on
  // public.resolve_import_guest_identity. Stamped 20260722153233 over the
  // filename version 20260722153000. Pairing is by NAME.
  '20260722153000': '20260722153233',
};

/**
 * The subset of APPLIED_UNDER_DIFFERENT_LEDGER_VERSION whose pairing is
 * established by migration NAME rather than inferred from adjacency in time.
 *
 * Version is the wrong join key for a renamed apply: the filename version and
 * the ledger version differ by construction, and nothing in the ledger points
 * back at the file. The name does survive the rename — apply_migration
 * rewrites the version but carries the name through — so `<fileVersion>_<name>.sql`
 * on this branch and `<ledgerVersion> <name>` in the ledger identify the same
 * application. The drift test asserts that correspondence against the real
 * filename, so renaming or removing the file breaks the gate instead of
 * silently orphaning the mapping.
 */
export interface NameKeyedRenamedApply {
  /** Filename version of the migration file on this branch. */
  readonly fileVersion: string;
  /** Version the apply tool stamped in the production ledger. */
  readonly ledgerVersion: string;
}

export const APPLIED_UNDER_DIFFERENT_LEDGER_VERSION_BY_NAME: Readonly<
  Record<string, NameKeyedRenamedApply>
> = {
  grant_authenticated_claim_rpc_execute: {
    fileVersion: '20260720190000',
    ledgerVersion: '20260720221937',
  },
  harden_claim_rpc_privacy: {
    fileVersion: '20260721173000',
    ledgerVersion: '20260721201734',
  },
  add_source_bound_import_identity_staging: {
    fileVersion: '20260722012658',
    ledgerVersion: '20260722132159',
  },
  coarsen_import_name_match_reasons: {
    fileVersion: '20260720120000',
    ledgerVersion: '20260722144034',
  },
  close_authenticated_guest_identity_oracle: {
    fileVersion: '20260722153000',
    ledgerVersion: '20260722153233',
  },
};

/**
 * Repo files whose content is applied in production but whose ledger record
 * is one of the name-anonymized 'remote_only' versions — the exact pairing
 * cannot be confirmed from the ledger alone. Content-presence was verified
 * behaviorally (for example, the input_sha256 backfill-prevention trigger is
 * live in production).
 */
export const APPLIED_UNDER_UNCONFIRMED_REMOTE_VERSION: readonly string[] = [
  '20260704000000',
  '20260714183000',
  '20260715032000',
  '20260715043000',
];

/**
 * Repo files that faithfully reconstruct remote-only ledger entries under
 * the SAME version, restoring clean-baseline replay; production skips them
 * by version.
 */
export const RECONSTRUCTED_REMOTE_ONLY: readonly string[] = [
  '20260711232834',
  '20260712114538',
];

/**
 * Prepared migrations that are NOT applied to production. Applying any of
 * them requires separate explicit authorization under the per-mutation
 * protocol (and, for contractions, the expand/contract deployment order).
 */
export const GATED_UNAPPLIED: readonly string[] = [
  '20260717190000',
  '20260719234500',
  '20260720100000',
  '20260720110000',
  // The contraction half of the owner-approved source-bound replacement. Its
  // expansion half (20260722012658) is applied; this one is not, and retiring
  // the free-form matcher still requires the deployed reader to move first.
  '20260722012707',
];

/**
 * Ledger versions with no migration file on this branch — production-only
 * relative to this branch. Membership here is what makes the ledger→repo
 * direction complete; an attested ledger entry that is not repo-native, not a
 * renamed-drift target, not a reconstruction, and not listed here fails the
 * gate as LEDGER_INCOMPLETE.
 *
 * Most of these are remote-only history whose migration NAMES were not part
 * of the captured attestations, so no name is asserted for them. The entries
 * whose identity IS attested carry provenance in
 * PRODUCTION_ONLY_ENTRY_PROVENANCE.
 */
export const PRODUCTION_ONLY_LEDGER_VERSIONS: readonly string[] = [
  // Remote-only analytics/RPC iteration history (names not captured).
  '20260708164000', '20260708182805', '20260708201626', '20260708210555',
  '20260708210608', '20260708210912', '20260708212912', '20260709204124',
  '20260710013517', '20260710013631', '20260710013653', '20260710134348',
  '20260710202359', '20260710205230', '20260710211520', '20260711110356',
  '20260711111553', '20260711120809', '20260711123856', '20260711125146',
  '20260711125251', '20260711134339', '20260711134417', '20260711160109',
  '20260711160409', '20260711215135', '20260712112659', '20260712115539',
  '20260712220257', '20260713115505', '20260713120000', '20260713120554',
  '20260713121000', '20260713140000', '20260713211040', '20260714064956',
  '20260714074501', '20260714100000', '20260714123000', '20260714133000',
  '20260714134000', '20260714150000', '20260714160000', '20260714170000',
  // Name-anonymized 'remote_only' entries. The content of the four files in
  // APPLIED_UNDER_UNCONFIRMED_REMOTE_VERSION is live in production behind
  // some subset of these, but the exact pairing is not confirmable.
  '20260714233758', '20260715030517', '20260715031157', '20260715034351',
  '20260715034414', '20260715170238',
  // Further remote-only history (names not captured).
  '20260715123125', '20260715130709', '20260715182325', '20260715182939',
  '20260716043235', '20260716054430', '20260717020330', '20260717020622',
  '20260717022105', '20260717031053', '20260717032629',
  // Attested identities; see PRODUCTION_ONLY_ENTRY_PROVENANCE.
  // 20260720221937 was registered here until its file (20260720190000) was
  // carried onto this branch; it is now a renamed-drift target instead.
  '20260718212722', '20260718234835', '20260719132042', '20260720021300',
  '20260721035955', '20260721081355', '20260721193508',
];

export interface ProductionOnlyProvenance {
  /** Ledger name as attested. */
  readonly name: string;
  /**
   * Filename version of the source file on the branch it was applied from,
   * when that differs from the ledger version (apply-time rename). Null when
   * no source file is known outside production.
   */
  readonly sourceFileVersion: string | null;
  /** Source filename on that branch, or null when unknown. */
  readonly sourceFileName: string | null;
  /** Branch or commit the application was made from, or null when unknown. */
  readonly sourceRef: string | null;
  readonly note: string;
}

/**
 * Identity and provenance for the production-only entries whose names are
 * attested. None of these files exist on this branch, so none of them carry a
 * hazard class here — hazard class is declared per FILE present on this
 * branch (see MIGRATION_HAZARD_CLASS). If one of these files is ever brought
 * onto this branch it must gain a hazard-class declaration at that point;
 * until then the ledger→repo completeness check is the only property that
 * applies to it.
 */
export const PRODUCTION_ONLY_ENTRY_PROVENANCE: Readonly<
  Record<string, ProductionOnlyProvenance>
> = {
  '20260718212722': {
    name: 'add_game_mechanic_capture',
    sourceFileVersion: '20260718204000',
    sourceFileName: '20260718204000_add_game_mechanic_capture.sql',
    sourceRef: null,
    note: 'Live-site capture work; no file on this branch.',
  },
  '20260718234835': {
    name: 'lock_down_public_backup_tables',
    sourceFileVersion: null,
    sourceFileName: null,
    sourceRef: null,
    note: 'Backup-table security remediation applied from the live-site session.',
  },
  '20260719132042': {
    name: 'data_capture_hardening_v2',
    sourceFileVersion: null,
    sourceFileName: null,
    sourceRef: null,
    note: 'Live-site data-capture v2 release; the redesign reads it through readCanonicalGameCapture and never writes game_capture_* rows.',
  },
  '20260720021300': {
    name: 'add_import_player_name_matching_rpc',
    sourceFileVersion: null,
    sourceFileName: null,
    sourceRef: null,
    note: 'Created the SECURITY DEFINER RPC public.match_import_player_names. Gated repo file 20260720120000 coarsens its disclosed classification and is therefore a REPLACE of this deployed predecessor, not a CREATE.',
  },
  '20260721035955': {
    name: 'secure_public_player_labels_service_role',
    sourceFileVersion: '20260721013000',
    sourceFileName: '20260721013000_secure_public_player_labels_service_role.sql',
    sourceRef: 'origin/fix/public-player-label-service-role-boundary',
    note: 'Applied under a renamed ledger version.',
  },
  '20260721081355': {
    name: 'fix_event_card_tag_snapshot_correction',
    sourceFileVersion: '20260720223000',
    sourceFileName: '20260720223000_fix_event_card_tag_snapshot_correction.sql',
    sourceRef: 'origin/fix/event-card-snapshot-migration-bounded-rebuild',
    note: 'Applied under a renamed ledger version.',
  },
  '20260721193508': {
    name: 'fold_player_card_outcome_context_into_definer',
    sourceFileVersion: '20260721194500',
    sourceFileName:
      '20260721194500_fold_player_card_outcome_context_into_definer.sql',
    sourceRef: '814e60210 (fix/live-compare-data-remove-declared-style)',
    note: 'player_card_outcomes timeout remediation, applied from the live-site lineage; no file on this branch. Applied under a renamed ledger version, and here the ledger version precedes the filename version, so time order is not a safe pairing rule — the name is.',
  },
};

/**
 * Hazard class of a migration file, orthogonal to its ledger classification.
 *
 * Declared explicitly per file — never derived from the SQL, because the
 * hazard depends on what was DEPLOYED before the migration, which the SQL
 * alone does not record. A file with no declaration is a hard failure
 * (CLASSIFICATION_MISSING), so a new migration cannot slip in unclassified.
 *
 * - `contraction` — removes or narrows a contract surface that existed before
 *   this migration and does not restore an equal-or-broader replacement in
 *   the same file: REVOKE on a pre-existing object, a dropped object with no
 *   replacement, a tightened CHECK or constraint on an existing table, a
 *   narrowed vocabulary, or a rebuilt function that discloses less. These
 *   require the expand/contract order recorded in DECISIONS.md: deploy the
 *   reader or writer that no longer needs the old shape, verify, contract.
 * - `expansion` — only adds or widens: new tables, columns, functions,
 *   policies or grants; relaxed constraints; a replacement that accepts every
 *   previously valid call. Safe to apply ahead of the code that uses it.
 * - `neutral` — no contract surface change at all: data-only seeds and
 *   reconciliations, comments, and no-op history placeholders.
 *
 * Where a file mixes hazards, the strongest present wins.
 */
export type MigrationHazardClass = 'contraction' | 'expansion' | 'neutral';

/**
 * Declared hazard class for every migration FILE on this branch, keyed by
 * filename version. Production-only entries with no file here are covered by
 * the ledger→repo completeness check instead.
 */
export const MIGRATION_HAZARD_CLASS: Readonly<
  Record<string, MigrationHazardClass>
> = {
  // Baseline creation: nothing was deployed against these objects yet.
  '20260703120000': 'expansion', // create_core_tables
  '20260703121500': 'expansion', // create_core_rls
  '20260703123000': 'expansion', // create_reference_catalog
  '20260703124500': 'expansion', // create_storage_policies
  '20260703130000': 'expansion', // create_analytics_views
  // Drops 11 pre-existing reference policies and creates none.
  '20260704000000': 'contraction', // drop_superseded_reference_policies
  '20260704001728': 'expansion', // add_group_write_and_reference_rls
  '20260704030147': 'expansion', // add_game_log_imports_and_evidence_storage
  // "owners manage *" policies replaced by broader "members manage *".
  '20260704034500': 'expansion', // make_group_members_equally_privileged
  '20260704043302': 'neutral', // seed_reference_dimensions (inserts only)
  '20260704052314': 'expansion', // add_catalog_filter_metadata
  // Same-name policy replacement that widens linked-participant access.
  '20260704071832': 'expansion', // allow_linked_player_profile_access
  '20260704090000': 'expansion', // extend_game_import_review_schema
  '20260704100000': 'expansion', // add_import_coverage_analytics
  // "editors ..." policies replaced by broader "members ...".
  '20260704123000': 'expansion', // add_username_profiles_and_player_resolution
  '20260706132454': 'neutral', // seed_all_map_milestones_and_awards
  // Drops a unique constraint and widens an evidence-kind CHECK.
  '20260706153000': 'expansion', // support_hybrid_card_score_imports
  '20260706190000': 'expansion', // add_saved_player_claim_functions
  '20260708013125': 'expansion', // grant_import_coverage_permissions
  // create or replace of one function body; no contract surface change.
  '20260708013631': 'neutral', // fix_replace_game_log_events_conflict_target
  // New tables/functions, locked down at birth; policy drops are same-name
  // replacements on tables this file creates.
  '20260708142459': 'expansion', // add_persisted_metric_snapshots
  '20260708143547': 'neutral', // remote_history_placeholder (no-op)
  '20260708143922': 'neutral', // remote_history_placeholder (no-op)
  '20260708150649': 'neutral', // remote_history_placeholder (no-op)
  '20260708155338': 'expansion', // add_card_gameplay_tags (widened CHECK)
  '20260708162535': 'neutral', // remote_history_placeholder (no-op)
  // Reconstruction: creates the function and reproduces the deployed ACL.
  '20260711232834': 'expansion', // add_find_duplicate_game_log_import
  '20260712114538': 'expansion', // add_player_username_full_name
  // Adds a column with a default, marks existing rows, replaces the trigger.
  '20260714183000': 'expansion', // force_existing_user_pin_reset
  // New column plus a unique index on it; no deployed writer could conflict.
  '20260715024245': 'expansion', // add_user_profile_email
  // Adds triggers that reject writes the deployed contract accepted.
  '20260715032000': 'contraction', // prevent_future_game_log_backfills
  '20260715043000': 'expansion', // add_domain_aware_ocr_corrections
  // Revokes PUBLIC/anon execute on the already-deployed confirmation
  // function (20260715043000 granted none of those revokes).
  '20260715113501': 'contraction', // restore_ocr_confirmation_function
  '20260717190000': 'expansion', // add_merger_offer_rule_snapshots
  // Drops public.game_expansions, group_default_expansions, expansions.
  '20260718041532': 'contraction', // remove_game_expansion_tracking
  // Revokes on pre-existing functions and the private schema; drops
  // pre-existing player_import_aliases constraints.
  '20260718050924': 'contraction', // claimable_guest_identity_privacy
  '20260718114500': 'expansion', // sync_upstream_cards_and_tile_catalog
  // Column additions, an index, and a data reconciliation update.
  '20260718120000': 'expansion', // reconcile_upstream_card_identities
  '20260718200536': 'expansion', // add_venus_colonies_import_facts
  // Drops member-read policies on private identities and revokes execute on
  // a pre-existing candidate-listing function.
  '20260718212339': 'contraction', // remediate_guest_identity_privacy_boundary
  // Tightens CHECKs on the already-deployed game_log_events contract.
  '20260718212340': 'contraction', // harden_game_log_event_contract
  '20260718212342': 'neutral', // add_objective_catalog_aliases (inserts only)
  // The Data API revokes that broke the deployed frontend on 2026-07-19 —
  // the incident that made expand/contract a standing gate.
  '20260719223000': 'contraction', // isolate_player_personal_names_from_data_api
  // Enabling RLS narrows access that was previously unrestricted.
  '20260719223500': 'contraction', // enable_rls_on_player_legacy_identities
  // security_invoker moves the view to the caller's rights.
  '20260719230000': 'contraction', // security_invoker_on_import_integrity_audit
  // Retires 'reviewed' from the confidence vocabulary; its pre-apply gate
  // already requires proving no deployed writer still emits it.
  '20260719234500': 'contraction', // separate_event_confidence_from_review_state
  // Drops the deployed 7-argument signature but creates an 8-argument
  // superset whose new parameter defaults to the previous behavior, so every
  // previously valid call still resolves.
  '20260720100000': 'expansion', // add_guest_identity_alias_source_control
  // Mixed hazard, so the strongest present wins. It widens the placement
  // action and ownership vocabularies and adds nullable columns, but it also
  // adds game_log_events_owner_requires_explicit_state — a CHECK on the
  // PRE-EXISTING owner_player_id/owner_game_player_id/ownership_state columns,
  // and NOT `not valid`, so it validates existing rows. The deployed contract
  // accepts owner ids alongside ownership_state 'unknown'; afterwards that row
  // is rejected and the ALTER TABLE itself fails if any such row exists. The
  // rebuilt RPC likewise adds rejections its predecessor did not have (owner
  // consistency, and the Mars/Moon board-layout format checks). Applying it
  // therefore requires the expand/contract order, not an ahead-of-code apply.
  '20260720110000': 'contraction', // extend_canonical_board_placement_contract
  // Narrows the disclosed match classification a deployed caller can read
  // (fine-grained match_reason/match_score → coarse exact/partial).
  '20260720120000': 'contraction', // coarsen_import_name_match_reasons
  // Private short-lived staging plus new service-only gateways. It does not
  // remove the deployed matcher or any existing caller contract.
  '20260722012658': 'expansion', // add_source_bound_import_identity_staging
  // Revokes authenticated execution on the deployed free-form matcher.
  '20260722012707': 'contraction', // retire_free_form_import_name_matcher
  // Revokes `authenticated` EXECUTE on the deployed SECURITY DEFINER function
  // public.resolve_import_guest_identity, closing a private-guest-name
  // confirmation oracle. It removes a surface `authenticated` held before the
  // migration and restores no replacement, so it is a contraction even though
  // the zero-caller sweep proved no deployed reader depends on it.
  '20260722153000': 'contraction', // close_authenticated_guest_identity_oracle
  // B-05. Revokes only the PUBLIC pseudo-role grant (and anon on
  // claim_player_profiles_by_name) while granting explicit EXECUTE to
  // `authenticated` on all three claim RPCs. The revoked PUBLIC grant is the
  // implicit CREATE FUNCTION default, not a surface any deployed reader was
  // written against; every real signed-in caller gains access rather than
  // losing it, and no anonymous caller could get past the functions' own
  // `auth.uid() is null` gate anyway. Nothing is stranded, so it is an
  // expansion despite containing REVOKE statements.
  '20260720190000': 'expansion', // grant_authenticated_claim_rpc_execute
  // Ledger #106. Rebuilds three deployed claim RPCs to disclose less and
  // accept less: prefix/substring name matching is replaced by exact whole-name
  // matching, a 3-character input floor and a 10-row cap are imposed, the
  // private-first-name label fallback becomes a neutral placeholder, and
  // group_name is returned null. Every one of those narrows a surface the
  // deployed reader could previously rely on, and the file restores no
  // equal-or-broader replacement, so it is a contraction even though it
  // creates, drops and grants nothing.
  '20260721173000': 'contraction', // harden_claim_rpc_privacy
};
