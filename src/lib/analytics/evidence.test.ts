import { describe, expect, it } from 'vitest';
import {
  isAnalyticsEvidenceSourceKind,
  validateAnalyticsEvidence,
  type AnalyticsEvidence,
} from './evidence';

const validEvidence: AnalyticsEvidence = {
  sources: [
    {
      kind: 'persisted-table',
      reference: 'game_players',
      recordGrain: 'player-game',
      verification: { schemaVerified: true, populationVerified: false },
    },
    {
      kind: 'analytics-view',
      reference: 'analytics.head_to_head',
    },
  ],
  qualifyingGameCount: 42,
  calculatedAt: '2026-07-17T12:00:00.000Z',
  dataUpdatedAt: '2026-07-16T09:30:00.000Z',
  coverage: { eligibleRecords: 42, recordsWithRequiredData: 40 },
};

describe('isAnalyticsEvidenceSourceKind', () => {
  it('accepts registered kinds and rejects everything else', () => {
    expect(isAnalyticsEvidenceSourceKind('persisted-table')).toBe(true);
    expect(isAnalyticsEvidenceSourceKind('remote-rpc')).toBe(true);
    expect(isAnalyticsEvidenceSourceKind('audit-document')).toBe(true);
    expect(isAnalyticsEvidenceSourceKind('spreadsheet')).toBe(false);
    expect(isAnalyticsEvidenceSourceKind(7)).toBe(false);
  });
});

describe('validateAnalyticsEvidence', () => {
  it('accepts well-formed evidence', () => {
    expect(validateAnalyticsEvidence(validEvidence)).toEqual([]);
  });

  it('requires at least one source', () => {
    expect(validateAnalyticsEvidence({ sources: [] })).toContainEqual(
      expect.objectContaining({ code: 'no-sources' }),
    );
  });

  it('rejects blank source references', () => {
    expect(
      validateAnalyticsEvidence({
        sources: [{ kind: 'persisted-table', reference: '  ' }],
      }),
    ).toContainEqual(
      expect.objectContaining({
        code: 'blank-source-reference',
        path: 'sources[0].reference',
      }),
    );
  });

  it('rejects invalid qualifying game counts', () => {
    for (const count of [-1, 1.5, Number.NaN]) {
      expect(
        validateAnalyticsEvidence({
          sources: validEvidence.sources,
          qualifyingGameCount: count,
        }),
      ).toContainEqual(expect.objectContaining({ code: 'invalid-game-count' }));
    }
    expect(
      validateAnalyticsEvidence({
        sources: validEvidence.sources,
        qualifyingGameCount: 0,
      }),
    ).toEqual([]);
  });

  it('rejects blank game IDs', () => {
    expect(
      validateAnalyticsEvidence({
        sources: validEvidence.sources,
        gameIds: ['game-1', ' '],
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'blank-game-id', path: 'gameIds[1]' }),
    );
  });

  it('rejects unparseable timestamps and accepts ISO-8601 values', () => {
    expect(
      validateAnalyticsEvidence({
        sources: validEvidence.sources,
        calculatedAt: 'not-a-time',
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'invalid-timestamp', path: 'calculatedAt' }),
    );
    expect(
      validateAnalyticsEvidence({
        sources: validEvidence.sources,
        dataUpdatedAt: '',
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'invalid-timestamp', path: 'dataUpdatedAt' }),
    );
    expect(
      validateAnalyticsEvidence({
        sources: validEvidence.sources,
        calculatedAt: '2026-07-17T12:00:00Z',
      }),
    ).toEqual([]);
  });
});

describe('evidence serializability', () => {
  it('round-trips through JSON without loss', () => {
    const roundTripped = JSON.parse(
      JSON.stringify(validEvidence),
    ) as AnalyticsEvidence;
    expect(roundTripped).toEqual(validEvidence);
  });
});
