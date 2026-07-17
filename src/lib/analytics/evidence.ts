/**
 * Analytics evidence and provenance contracts (Phase 2, Step 2.1).
 *
 * Evidence metadata says where an analytical fact came from, how much
 * qualifying history stands behind it, and how fresh it is. It is a
 * lightweight contract: no loading behavior lives here, `gameIds` is only
 * populated when a caller explicitly loaded them, and timestamps are ISO-8601
 * strings so every value serializes safely across the server/client boundary.
 *
 * Source references name repository objects (tables, views, snapshots, RPCs)
 * at the contract level for provenance and verification. Presentation
 * components should surface the human-readable parts (counts, freshness,
 * verification state), not raw database identifiers.
 */

import type { AnalyticsCoverage } from './coverage';

export const ANALYTICS_EVIDENCE_SOURCE_KINDS = [
  'persisted-table',
  'analytics-view',
  'metric-snapshot',
  'remote-rpc',
  'runtime-derivation',
  'import-evidence',
  'audit-document',
] as const;

export type AnalyticsEvidenceSourceKind =
  (typeof ANALYTICS_EVIDENCE_SOURCE_KINDS)[number];

export function isAnalyticsEvidenceSourceKind(
  value: unknown,
): value is AnalyticsEvidenceSourceKind {
  return (
    typeof value === 'string' &&
    (ANALYTICS_EVIDENCE_SOURCE_KINDS as readonly string[]).includes(value)
  );
}

/**
 * Verification state of one evidence source. The two dimensions are
 * independent: a table can be defined by tracked migrations
 * (`schemaVerified`) while its production row coverage has never been
 * audited (`populationVerified` false). A remote-only RPC is neither.
 */
export type AnalyticsEvidenceVerification = {
  /** The object's definition exists in tracked repository migrations/source. */
  schemaVerified: boolean;
  /** Production population/freshness confirmed by a read-only audit. */
  populationVerified: boolean;
  note?: string;
};

export type AnalyticsEvidenceSource = {
  kind: AnalyticsEvidenceSourceKind;
  /**
   * Stable reference, e.g. `game_players`, `analytics.head_to_head`, or
   * `docs/redesign/DATA-CAPABILITIES.md`.
   */
  reference: string;
  /** What one record represents, e.g. `player-game`. */
  recordGrain?: string;
  verification?: AnalyticsEvidenceVerification;
};

/**
 * Identity and version of the calculation definition that produced a result.
 * The definition registry itself is Step 2.4 work; this is only the metadata
 * shape results carry.
 */
export type AnalyticsCalculationVersion = {
  /** Stable definition identifier, e.g. `purchase-conversion`. */
  definitionId: string;
  /** Version label of the definition, e.g. `1`. */
  version: string;
  /** Stable pointer to the documented methodology, when one exists. */
  methodologyRef?: string;
};

export type AnalyticsEvidence = {
  sources: readonly AnalyticsEvidenceSource[];
  /** Count of games contributing qualifying observations, when known. */
  qualifyingGameCount?: number;
  /**
   * Underlying game IDs when a caller explicitly loaded them. Contracts never
   * require eager loading of ID lists.
   */
  gameIds?: readonly string[];
  /** ISO-8601 timestamp when the result was calculated. */
  calculatedAt?: string;
  /** ISO-8601 timestamp of the newest contributing source data, when known. */
  dataUpdatedAt?: string;
  /** Coverage metadata describing how complete the evidence is. */
  coverage?: AnalyticsCoverage;
};

export const ANALYTICS_EVIDENCE_ISSUE_CODES = [
  'no-sources',
  'blank-source-reference',
  'invalid-game-count',
  'blank-game-id',
  'invalid-timestamp',
] as const;

export type AnalyticsEvidenceIssueCode =
  (typeof ANALYTICS_EVIDENCE_ISSUE_CODES)[number];

export type AnalyticsEvidenceIssue = {
  code: AnalyticsEvidenceIssueCode;
  message: string;
  path?: string;
};

function isValidIsoTimestamp(value: string): boolean {
  return value.trim() !== '' && !Number.isNaN(Date.parse(value));
}

/**
 * Structural validation of evidence metadata. Returns an empty array when the
 * metadata is well-formed.
 */
export function validateAnalyticsEvidence(
  evidence: AnalyticsEvidence,
): readonly AnalyticsEvidenceIssue[] {
  const issues: AnalyticsEvidenceIssue[] = [];

  if (evidence.sources.length === 0) {
    issues.push({
      code: 'no-sources',
      message: 'Evidence must name at least one source',
      path: 'sources',
    });
  }
  evidence.sources.forEach((source, index) => {
    if (source.reference.trim() === '') {
      issues.push({
        code: 'blank-source-reference',
        message: `"sources[${index}].reference" must not be blank`,
        path: `sources[${index}].reference`,
      });
    }
  });

  if (evidence.qualifyingGameCount !== undefined) {
    const count = evidence.qualifyingGameCount;
    if (!Number.isFinite(count) || !Number.isInteger(count) || count < 0) {
      issues.push({
        code: 'invalid-game-count',
        message: 'qualifyingGameCount must be a nonnegative integer',
        path: 'qualifyingGameCount',
      });
    }
  }

  evidence.gameIds?.forEach((gameId, index) => {
    if (gameId.trim() === '') {
      issues.push({
        code: 'blank-game-id',
        message: `"gameIds[${index}]" must not be blank`,
        path: `gameIds[${index}]`,
      });
    }
  });

  if (
    evidence.calculatedAt !== undefined &&
    !isValidIsoTimestamp(evidence.calculatedAt)
  ) {
    issues.push({
      code: 'invalid-timestamp',
      message: 'calculatedAt must be a parseable ISO-8601 timestamp',
      path: 'calculatedAt',
    });
  }
  if (
    evidence.dataUpdatedAt !== undefined &&
    !isValidIsoTimestamp(evidence.dataUpdatedAt)
  ) {
    issues.push({
      code: 'invalid-timestamp',
      message: 'dataUpdatedAt must be a parseable ISO-8601 timestamp',
      path: 'dataUpdatedAt',
    });
  }

  return issues;
}
