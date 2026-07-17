import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  DashboardEvidenceTable,
  DashboardMetricValue,
  type DashboardEvidenceColumn,
} from '@/components/dashboard/dashboard-evidence-table';
import { getCanonicalAnalyticsDefinition, canonicalAnalyticsCalculationVersion } from './canonical-definitions';
import { DECLARED_ANALYTICS_CAPABILITIES } from './capability-declarations';
import { calculateWinPointDifferential } from './calculations';
import { evaluateAnalyticsCoverage } from './coverage';
import { parseAndNormalizeAnalyticsUrlState } from './filter-url-state';
import { createReadyAnalyticsMetricResult } from './metric-result';
import {
  FINALIZED_GAME_RESULTS_ORDERING,
  buildFinalizedGameResultsCoverage,
  buildFinalizedGameResultsEvidence,
  toWinPointDifferentialInputs,
} from './repository-records';
import {
  createAnalyticsRepositoryDataResult,
  createAnalyticsRepositoryError,
  getActiveAnalyticsFilterKeys,
} from './repository-contracts';
import { evaluateAnalyticsMinimumSample, type AnalyticsSample } from './sample';
import { mapFinalizedGameSourceRecords } from '@/lib/db/analytics/finalized-game-results-repo';

const IDS = {
  game: '00000000-0000-4000-8000-000000000101',
  group: '00000000-0000-4000-8000-000000000102',
  playerOne: '00000000-0000-4000-8000-000000000103',
  playerTwo: '00000000-0000-4000-8000-000000000104',
  gamePlayerOne: '00000000-0000-4000-8000-000000000105',
  gamePlayerTwo: '00000000-0000-4000-8000-000000000106',
} as const;

function sourceRecord(input: { winnerPoints?: number | null; loserPoints?: number | null } = {}) {
  return mapFinalizedGameSourceRecords({
    games: [
      {
        id: IDS.game,
        group_id: IDS.group,
        played_on: '2026-07-01',
        map_id: null,
        player_count: 2,
        generation_count: 10,
        status: 'finalized',
        created_at: '2026-07-01T12:00:00.000Z',
        updated_at: '2026-07-02T12:00:00.000Z',
      },
    ],
    players: [
      {
        id: IDS.gamePlayerOne,
        game_id: IDS.game,
        player_id: IDS.playerOne,
        placement: 1,
        is_winner: true,
        total_points: input.winnerPoints === undefined ? 10 : input.winnerPoints,
      },
      {
        id: IDS.gamePlayerTwo,
        game_id: IDS.game,
        player_id: IDS.playerTwo,
        placement: 2,
        is_winner: false,
        total_points: input.loserPoints === undefined ? 0 : input.loserPoints,
      },
    ],
    imports: [],
  })[0]!;
}

function repositoryResult(record = sourceRecord()) {
  const url = parseAndNormalizeAnalyticsUrlState(
    new URLSearchParams(`from=2026-07-01&to=2026-07-31&point=${IDS.gamePlayerOne}`),
    { scope: { type: 'group', groupId: IDS.group } },
  );
  const coverage = buildFinalizedGameResultsCoverage([record]);

  return createAnalyticsRepositoryDataResult({
    query: {
      operationId: 'finalized-game-results.list',
      scope: { type: 'group', groupId: IDS.group },
      filters: url.applicableState.filters,
      selectionContext: {
        state: url.applicableState.selection,
        role: 'focus-only',
      },
      appliedFilters: getActiveAnalyticsFilterKeys(url.applicableState.filters),
      ordering: FINALIZED_GAME_RESULTS_ORDERING,
      pagination: { kind: 'offset', offset: 0, limit: 25, returned: 1, hasMore: false },
      authorizationBoundary: 'current-user-rls',
    },
    data: {
      records: [record],
      coverage,
      evidence: buildFinalizedGameResultsEvidence([record], coverage),
    },
    partial: record.completeness === 'partial',
  });
}

function winPointDifferentialMetric(record = sourceRecord()) {
  const result = repositoryResult(record);
  if (result.status !== 'ready') {
    throw new Error(`Expected a ready repository fixture, received ${result.status}`);
  }
  const mapping = toWinPointDifferentialInputs(result.data.records[0]!).find(
    (candidate) => candidate.gamePlayerId === IDS.gamePlayerOne,
  );
  if (mapping?.status !== 'mapped') {
    throw new Error('The winner source record must map to a calculation input');
  }
  const evaluation = calculateWinPointDifferential(mapping.input);
  const definition = getCanonicalAnalyticsDefinition('metric:win-point-differential');
  const capability = DECLARED_ANALYTICS_CAPABILITIES.find(
    (candidate) => candidate.key === 'canonical-win-point-differential',
  );
  if (!definition || !capability) {
    throw new Error('The approved win-point-differential definition and capability are required');
  }

  const sample: AnalyticsSample = {
    definition: {
      population: {
        population: 'authorized-group-games',
        requiresGlobalOptIn: false,
        groupId: IDS.group,
      },
      observationUnit: { kind: 'game' },
      filters: result.query.filters,
      selectionContext: result.query.selectionContext,
    },
    counts: { candidate: 1, eligible: 1, included: 1, excluded: 0 },
    exclusions: [],
    denominator: { kind: 'not-applicable' },
  };

  return createReadyAnalyticsMetricResult({
    definition,
    scope: 'game',
    value: evaluation.value,
    sample,
    coverage: evaluateAnalyticsCoverage(result.data.coverage),
    eligibility: evaluation.eligibility,
    minimumSample: evaluateAnalyticsMinimumSample({
      policy: definition.minimumSamplePolicy,
      sampleCount: sample.counts.included,
    }),
    capabilities: [capability],
    evidence: result.data.evidence,
    calculationVersion: canonicalAnalyticsCalculationVersion(definition),
  });
}

describe('Phase 2 analytics foundation integration', () => {
  it('connects canonical URL filters, non-sample point focus, normalized repository data, the canonical calculation, and a Phase 1 evidence table', () => {
    const repository = repositoryResult();
    expect(repository).toMatchObject({
      status: 'ready',
      query: {
        appliedFilters: ['date-range'],
        selectionContext: { role: 'focus-only', state: { pointId: IDS.gamePlayerOne } },
      },
    });

    const metric = winPointDifferentialMetric();
    expect(metric.value).toEqual({ kind: 'observed', value: 10 });
    expect(metric.sample.definition.filters.from).toBe('2026-07-01');
    expect(metric.sample.definition.selectionContext?.state.pointId).toBe(IDS.gamePlayerOne);

    type Row = { id: string; label: string; value: typeof metric.value };
    const rows: readonly Row[] = [
      { id: IDS.gamePlayerOne, label: 'Winner margin', value: metric.value },
    ];
    const columns: readonly DashboardEvidenceColumn<Row>[] = [
      { id: 'label', header: 'Metric', render: (row) => row.label },
      {
        id: 'value',
        header: 'Value',
        align: 'numeric',
        render: (row) => <DashboardMetricValue value={row.value} />,
      },
    ];

    render(
      <DashboardEvidenceTable
        columns={columns}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.label}
        label="Phase 2 integration evidence"
        onActivateRow={() => undefined}
        rows={rows}
        selectedRowId={metric.sample.definition.selectionContext?.state.pointId}
      />,
    );

    expect(screen.getByText('10')).toHaveAttribute('data-metric-kind', 'observed');
    expect(screen.getByRole('row', { name: 'Focus Winner margin' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('keeps repository failure, missing score evidence, and unavailable capability distinct instead of converting any to empty or zero', () => {
    const error = createAnalyticsRepositoryError({
      operationId: 'finalized-game-results.list',
      category: 'query-failure',
      message: 'Finalized results could not be loaded.',
      retryable: true,
    });
    expect(error).toMatchObject({ status: 'error', error: { category: 'query-failure' } });

    const partial = repositoryResult(sourceRecord({ winnerPoints: null }));
    expect(partial.status).toBe('partial');
    const mapping = toWinPointDifferentialInputs(
      partial.status === 'partial' ? partial.data.records[0]! : sourceRecord(),
    )[0]!;
    expect(mapping.status).toBe('mapped');
    if (mapping.status === 'mapped') {
      expect(calculateWinPointDifferential(mapping.input).value.kind).toBe('missing');
    }

    const unavailable = DECLARED_ANALYTICS_CAPABILITIES.find(
      (candidate) => candidate.key === 'cards-purchased-by-generation',
    );
    expect(unavailable).toMatchObject({ status: 'requires-new-fields' });
  });
});
