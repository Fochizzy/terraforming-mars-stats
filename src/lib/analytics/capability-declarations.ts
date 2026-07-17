/**
 * Default analytics capability declarations (Phase 2, Step 2.1).
 *
 * Each entry restates a classification recorded by the Phase 0 data
 * capability audit (`docs/redesign/DATA-CAPABILITIES.md`) in the typed
 * capability contract, so later steps consume audited posture instead of
 * re-deriving it. The registry deliberately stays small: one well-evidenced
 * declaration per audited posture, not an exhaustive metric catalog.
 *
 * Integrity rules for this file:
 *
 * - No declaration invents support. Statuses, reasons, and scope support come
 *   from the audit and inspected repository code.
 * - No declaration carries numeric coverage. Production row coverage has
 *   never been audited, so static declarations must not claim counts.
 * - `populationVerified` is `false` everywhere: the audit verified schema
 *   definitions read-only and never queried production rows.
 * - Undecided product policies (tied-first margin, opponent model, …) remain
 *   undecided; explanations may note them but nothing here resolves them.
 */

import type { AnalyticsCapabilityResult } from './capabilities';

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

/**
 * Declarations ordered alphabetically by capability key so iteration order is
 * deterministic and never mistaken for a ranking.
 */
export const DECLARED_ANALYTICS_CAPABILITIES: readonly AnalyticsCapabilityResult[] =
  deepFreeze<readonly AnalyticsCapabilityResult[]>(([
    {
      key: 'board-control-analytics',
      title: 'Spatial board control',
      status: 'unavailable',
      reason: {
        code: 'required-facts-not-persisted',
        explanation:
          'No canonical board coordinates or verified tile-placement events are recorded, and final city or greenery points cannot substitute for spatial evidence.',
      },
      scopes: { supported: [] },
      requiredData: [
        {
          key: 'canonical-board-coordinates',
          description:
            'A map-aware board-space identity and coordinate model validated per map.',
        },
        {
          key: 'verified-tile-placement-events',
          description:
            'Deduplicated tile-placement events with player linkage, generation, and provenance.',
        },
      ],
      missingData: [
        {
          key: 'canonical-board-coordinates',
          description:
            'A map-aware board-space identity and coordinate model validated per map.',
        },
        {
          key: 'verified-tile-placement-events',
          description:
            'Deduplicated tile-placement events with player linkage, generation, and provenance.',
        },
      ],
      remediation: {
        kind: 'remediable',
        historicalBackfillPossible: false,
        note: 'Requires a future coordinate model and verified placement capture; historical games cannot be backfilled from final score totals.',
      },
      evidence: {
        sources: [
          {
            kind: 'audit-document',
            reference: 'docs/redesign/DATA-CAPABILITIES.md',
            verification: { schemaVerified: true, populationVerified: false },
          },
        ],
      },
    },
    {
      key: 'canonical-win-point-differential',
      title: 'Canonical win point differential',
      status: 'supported',
      reason: {
        code: 'approved-definition-missing',
        explanation:
          'Sole-winner game results are supported. Tied-first games remain explicitly indeterminate because no numeric tie policy is approved.',
      },
      scopes: { supported: ['game'] },
      requiredData: [
        {
          key: 'finalized-final-scores',
          description:
            'Final total points for every player in a finalized game.',
        },
        {
          key: 'winner-and-placement-flags',
          description:
            'Winner flags and placements distinguishing tied first place.',
        },
      ],
      calculationVersion: {
        definitionId: 'metric:win-point-differential',
        version: '1',
        methodologyRef:
          'docs/redesign/CANONICAL-ANALYTICS-DEFINITIONS.md',
      },
      evidence: {
        sources: [
          {
            kind: 'persisted-table',
            reference: 'game_players',
            recordGrain: 'player-game',
            verification: { schemaVerified: true, populationVerified: false },
          },
          {
            kind: 'runtime-derivation',
            reference: 'finalized-game-result.get',
            recordGrain: 'game with player results',
            verification: {
              schemaVerified: true,
              populationVerified: false,
              note:
                'The typed repository preserves missingness and feeds the versioned Step 2.4 utility; production-wide population coverage remains unaudited.',
            },
          },
        ],
      },
    },
    {
      key: 'merger-guaranteed-availability',
      title: 'Merger guaranteed Prelude availability',
      status: 'requires-new-fields',
      reason: {
        code: 'required-facts-not-persisted',
        explanation:
          'The remediation migration defines a nullable saved game rule and canonical card-alias mapping, but it has not been applied to production. Until then, historical availability must remain unknown rather than inferred from selected Preludes or absent log events.',
      },
      scopes: { supported: [] },
      requiredData: [
        {
          key: 'saved-merger-offer-rule',
          description:
            'A game-level nullable guaranteed-Merger snapshot copied from an owner-managed group default for new games.',
        },
        {
          key: 'canonical-merger-card-aliases',
          description:
            'A reviewed mapping from accepted imported card identities to one canonical Prelude identity.',
        },
        {
          key: 'applied-merger-offer-rule-migration',
          description:
            'An approved production application of the tracked migration before production records can be queried or backfilled.',
        },
      ],
      missingData: [
        {
          key: 'applied-merger-offer-rule-migration',
          description:
            'The local migration and historical-policy package require separate production authorization before production records are queried or backfilled.',
        },
      ],
      remediation: {
        kind: 'remediable',
        historicalBackfillPossible: true,
        note: 'The approved historical policy is idempotent and group-scoped; it must not overwrite explicit conflicting snapshots.',
      },
      evidence: {
        sources: [
          {
            kind: 'audit-document',
            reference: 'docs/redesign/PHASE-02-MERGER-OFFER-PRODUCTION-PACKAGE.md',
            verification: { schemaVerified: true, populationVerified: false },
          },
        ],
      },
    },
    {
      key: 'cards-purchased-by-generation',
      title: 'Cards purchased by player and generation',
      status: 'requires-new-fields',
      reason: {
        code: 'required-facts-not-persisted',
        explanation:
          'No purchase events or per-generation purchase aggregates are persisted by the current schema, forms, finalization path, or imports.',
      },
      scopes: { supported: [] },
      requiredData: [
        {
          key: 'card-purchase-facts',
          description:
            'Purchase events or per-player-per-generation purchase aggregates with stable source-event identity.',
        },
        {
          key: 'purchase-source-coverage',
          description:
            'Observed-coverage and provenance metadata distinguishing an explicit zero purchases from an unrecorded game.',
        },
      ],
      missingData: [
        {
          key: 'card-purchase-facts',
          description:
            'Purchase events or per-player-per-generation purchase aggregates with stable source-event identity.',
        },
        {
          key: 'purchase-source-coverage',
          description:
            'Observed-coverage and provenance metadata distinguishing an explicit zero purchases from an unrecorded game.',
        },
      ],
      remediation: {
        kind: 'remediable',
        historicalBackfillPossible: false,
        note: 'Future capture can record new games; historical games remain unavailable and must not be reconstructed from final totals.',
      },
      evidence: {
        sources: [
          {
            kind: 'audit-document',
            reference: 'docs/redesign/DATA-CAPABILITIES.md',
            verification: { schemaVerified: true, populationVerified: false },
          },
        ],
      },
    },
    {
      key: 'corporation-prelude-pairing-dimensions',
      title: 'Typed Corporation and Prelude pairing dimensions',
      status: 'requires-query-work',
      reason: {
        code: 'no-canonical-read-model',
        explanation:
          'Corporation and Prelude identities are persisted, but the current interaction view emits a display label instead of typed dimension IDs.',
      },
      scopes: { supported: [] },
      requiredData: [
        {
          key: 'typed-corporation-prelude-pairing',
          description:
            'A repository or view returning stable Corporation and Prelude IDs per player-game pairing.',
        },
      ],
      remediation: {
        kind: 'remediable',
        historicalBackfillPossible: true,
        note: 'Existing normalized game-player, Corporation, and Prelude relations can supply the typed pairing after approved query work.',
      },
      evidence: {
        sources: [
          {
            kind: 'audit-document',
            reference: 'docs/redesign/DATA-CAPABILITIES.md',
            verification: { schemaVerified: true, populationVerified: false },
          },
        ],
      },
    },
    {
      key: 'final-terraforming-actions',
      title: 'Final terraforming actions',
      status: 'insufficient-evidence',
      reason: {
        code: 'remote-contract-unverified',
        explanation:
          'Final terraforming action statistics come from a remote-only database function whose definition, sources, security, and production population have not been verified in this repository.',
      },
      scopes: { supported: [] },
      remediation: {
        kind: 'remediable',
        note: 'Verify the linked database function definition, source tables, grants, and row-level security before any consumer work.',
      },
      evidence: {
        sources: [
          {
            kind: 'remote-rpc',
            reference: 'get_final_terraforming_action_stats',
            verification: {
              schemaVerified: false,
              populationVerified: false,
              note: 'No local migration or test defines this function.',
            },
          },
        ],
      },
    },
    {
      key: 'opponent-adjusted-performance',
      title: 'Opponent-adjusted performance',
      status: 'requires-view',
      reason: {
        code: 'approved-view-or-rpc-missing',
        explanation:
          'Opponent identities and outcomes are recorded, but no approved rating model or server-side expected-result view exists.',
      },
      scopes: { supported: [] },
      requiredData: [
        {
          key: 'approved-opponent-strength-model',
          description:
            'An approved, versioned rating model with population, time window, minimum history, and no-future-leakage rules.',
        },
        {
          key: 'server-side-expected-result-view',
          description:
            'A server-side view or RPC producing expected results under the approved model.',
        },
      ],
      remediation: {
        kind: 'remediable',
        historicalBackfillPossible: true,
        note: 'A future approved model may evaluate historical finalized outcomes; the model, population, window, and leakage rules are undecided.',
      },
      evidence: {
        sources: [
          {
            kind: 'analytics-view',
            reference: 'analytics.head_to_head',
            recordGrain: 'ordered player pair',
            verification: { schemaVerified: true, populationVerified: false },
          },
          {
            kind: 'persisted-table',
            reference: 'game_players',
            recordGrain: 'player-game',
            verification: { schemaVerified: true, populationVerified: false },
          },
        ],
      },
    },
    {
      key: 'placement-and-winners',
      title: 'Placement and winners',
      status: 'supported',
      scopes: {
        supported: ['group', 'individual', 'game'],
        unsupported: [
          {
            scope: 'global',
            reason: {
              code: 'no-canonical-read-model',
              explanation:
                'No global placement read model over opted-in groups has been established.',
            },
          },
        ],
      },
      requiredData: [
        {
          key: 'finalized-placement-rows',
          description:
            'Placement and winner flags recorded on finalized player results.',
        },
      ],
      evidence: {
        sources: [
          {
            kind: 'persisted-table',
            reference: 'game_players',
            recordGrain: 'player-game',
            verification: { schemaVerified: true, populationVerified: false },
          },
          {
            kind: 'analytics-view',
            reference: 'analytics.player_game_results',
            recordGrain: 'player-game',
            verification: { schemaVerified: true, populationVerified: false },
          },
        ],
      },
    },
    {
      key: 'score-source-breakdown',
      title: 'Score-source breakdown',
      status: 'partially-supported',
      reason: {
        code: 'partial-source-coverage',
        explanation:
          'Final totals and main score components are recorded, but the optional card subcomponents (microbes, animals, Jovian, other cards) are nullable with variable historical coverage, so component-level results can be partial.',
      },
      scopes: { supported: ['group', 'individual'] },
      requiredData: [
        {
          key: 'final-score-components',
          description:
            'The ten persisted score-source columns on finalized player results.',
        },
      ],
      remediation: {
        kind: 'remediable',
        note: 'Coverage improves as games record the optional sources; whether legacy zero defaults need observed flags is a later decision.',
      },
      evidence: {
        sources: [
          {
            kind: 'persisted-table',
            reference: 'game_players',
            recordGrain: 'player-game',
            verification: { schemaVerified: true, populationVerified: false },
          },
          {
            kind: 'analytics-view',
            reference: 'analytics.group_score_source_averages',
            recordGrain: 'group',
            verification: {
              schemaVerified: true,
              populationVerified: false,
              note: 'Coalesces nullable optional sources to zero before averaging; a null-preserving read model is pending.',
            },
          },
          {
            kind: 'analytics-view',
            reference: 'analytics.data_coverage',
            recordGrain: 'group',
            verification: { schemaVerified: true, populationVerified: false },
          },
        ],
      },
    },
    {
      key: 'tr-by-generation',
      title: 'Terraforming Rating by player and generation',
      status: 'requires-new-fields',
      reason: {
        code: 'required-facts-not-persisted',
        explanation:
          'No per-generation Terraforming Rating snapshots or events are persisted; the tr_points column is the final score contribution from TR, not a TR timeline or final TR.',
      },
      scopes: { supported: [] },
      requiredData: [
        {
          key: 'tr-generation-snapshots',
          description:
            'Explicit per-player-per-generation TR snapshots or events with generation uniqueness and provenance.',
        },
      ],
      missingData: [
        {
          key: 'tr-generation-snapshots',
          description:
            'Explicit per-player-per-generation TR snapshots or events with generation uniqueness and provenance.',
        },
      ],
      remediation: {
        kind: 'remediable',
        historicalBackfillPossible: false,
        note: 'Future capture can record new games; generation-level TR must never be reconstructed from final totals or tr_points.',
      },
      evidence: {
        sources: [
          {
            kind: 'audit-document',
            reference: 'docs/redesign/DATA-CAPABILITIES.md',
            verification: { schemaVerified: true, populationVerified: false },
          },
        ],
      },
    },
  ] as AnalyticsCapabilityResult[]).sort((left, right) => left.key.localeCompare(right.key)));

/** Stable keys of the declared capabilities, in registry order. */
export const DECLARED_ANALYTICS_CAPABILITY_KEYS: readonly string[] =
  Object.freeze(
    DECLARED_ANALYTICS_CAPABILITIES.map((capability) => capability.key),
  );

/** Looks up a declared capability by its stable key. */
export function getDeclaredAnalyticsCapability(
  key: string,
): AnalyticsCapabilityResult | null {
  return (
    DECLARED_ANALYTICS_CAPABILITIES.find(
      (capability) => capability.key === key,
    ) ?? null
  );
}
