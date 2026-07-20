// Repository-migrations ↔ production-ledger map (audit §18).
//
// The production ledger (project qjtwgrjjwnqafbvkkfex) was captured READ-ONLY
// via the management API on 2026-07-20. Human-readable companion:
// docs/redesign/reference/MIGRATION-LEDGER-MAP.md. The drift test
// (migration-ledger-map.test.ts) partitions every repo file and every ledger
// version through this map and fails on anything unclassified — an
// unexplained new file, a gated migration that appears applied, or a ledger
// entry nothing accounts for.

/** Every version in the production ledger as of 2026-07-20 (verified read-only). */
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
];

/**
 * Repo files applied to production under a DIFFERENT ledger version
 * (apply_migration stamped the apply-time version; SQL verified
 * byte-identical at application time). Filename version → ledger version.
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
  // Pairs with the live-site reader move off private personal-name columns.
  // Must be applied only after a compatible reader is deployed and verified.
  '20260720120000',
];
