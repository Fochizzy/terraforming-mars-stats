'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AssetImage } from '@/components/assets';
import {
  ClearDashboardSelectionButton,
  CombinedDashboardLayout,
  DashboardDetailSurface,
  DashboardEntitySelector,
  DashboardEvidenceTable,
  DashboardInsightRail,
  DashboardMetricSelector,
  DashboardMetricValue,
  DashboardSelectionSummary,
  SelectableDashboardLegend,
  useCoordinatedDashboard,
  type DashboardEvidenceColumn,
  type DashboardInsightItem,
} from '@/components/dashboard';
import {
  AnalyticsPanel,
  ChartContainer,
  DashboardPageShell,
  FilterToolbar,
  FilterToolbarField,
  FilterToolbarGroup,
  LowSampleNotice,
  MissingDataNotice,
  PageHeader,
  PartialCoverageNotice,
  type DataDisplayState,
} from '@/components/foundations';
import {
  createDashboardUrlStateAdapter,
  type DashboardSelection,
  type DashboardSelectionAvailability,
} from '@/lib/dashboard';
import { resolveTagIconAsset } from '@/lib/assets';
import {
  hasMetricValue,
  missingMetric,
  observedMetric,
  partialMetric,
  unavailableMetric,
  type MetricValue,
} from '@/lib/metrics/metric-value';
import { chartPalette, colorTokens } from '@/lib/theme/tokens';

type FixtureDisplayState = 'ready' | 'loading' | 'empty' | 'unavailable';

type FixtureRow = {
  id: string;
  label: string;
  primary: MetricValue;
  supporting: MetricValue;
  sampleCount: number;
  coverage: { covered: number; total: number };
};

type FixtureChartRow = FixtureRow & {
  primaryChartValue: number | null;
  supportingChartValue: number | null;
};

const fixtureEntities = [
  { id: 'demo-ares', label: 'Demo Ares Collective' },
  {
    id: 'demo-long-name',
    label: 'Demo Entity With An Intentionally Long Responsive Label',
  },
] as const;

const fixtureMetrics = [
  { id: 'demo-output', label: 'Fixture output' },
  { id: 'demo-stability', label: 'Fixture stability' },
  {
    id: 'demo-unavailable-metric',
    label: 'Unavailable fixture metric',
    unavailable: true,
  },
] as const;

const baseRows: readonly FixtureRow[] = [
  {
    id: 'demo-north',
    label: 'North demonstration segment',
    primary: observedMetric(42),
    supporting: observedMetric(12),
    sampleCount: 4,
    coverage: { covered: 4, total: 8 },
  },
  {
    id: 'demo-zero',
    label: 'Explicit zero fixture segment',
    primary: observedMetric(0),
    supporting: observedMetric(8),
    sampleCount: 8,
    coverage: { covered: 8, total: 8 },
  },
  {
    id: 'demo-long',
    label: 'Intentionally Long Demonstration Category Name For Responsive Review',
    primary: partialMetric(27),
    supporting: observedMetric(16),
    sampleCount: 6,
    coverage: { covered: 6, total: 10 },
  },
  {
    id: 'demo-missing',
    label: 'Missing fixture observation',
    primary: missingMetric(),
    supporting: observedMetric(5),
    sampleCount: 0,
    coverage: { covered: 0, total: 8 },
  },
  {
    id: 'demo-unavailable',
    label: 'Unavailable fixture calculation',
    primary: unavailableMetric('Fixture denominator deliberately absent'),
    supporting: unavailableMetric('Fixture denominator deliberately absent'),
    sampleCount: 0,
    coverage: { covered: 0, total: 0 },
  },
] as const;

function scaleMetric(value: MetricValue, factor: number): MetricValue {
  if (value.kind === 'observed') {
    return observedMetric(value.value * factor);
  }
  if (value.kind === 'partial') {
    return partialMetric(value.value * factor);
  }
  return value;
}

/** Deterministic fixture transformation; not a production analytics formula. */
function buildFixtureRows(entityId: string | null, metricId: string | null) {
  const entityFactor = entityId === 'demo-long-name' ? 0.75 : 1;
  const metricFactor = metricId === 'demo-stability' ? 0.5 : 1;
  return baseRows.map((row) => ({
    ...row,
    primary: scaleMetric(row.primary, entityFactor * metricFactor),
    supporting: scaleMetric(row.supporting, entityFactor),
  }));
}

function buildChartRows(rows: readonly FixtureRow[]): FixtureChartRow[] {
  return rows.map((row) => ({
    ...row,
    primaryChartValue: hasMetricValue(row.primary) ? row.primary.value : null,
    supportingChartValue: hasMetricValue(row.supporting)
      ? row.supporting.value
      : null,
  }));
}

const demoUrlAdapter = createDashboardUrlStateAdapter({
  selectedEntityId: 'demoEntity',
  selectedMetricId: 'demoMetric',
  selectedDataPointId: 'demoItem',
  activeTableRowId: 'demoRow',
  activeLegendItemId: 'demoLegend',
  openDetailItemId: 'demoDetail',
});

const fixtureAvailability: DashboardSelectionAvailability = {
  entityIds: fixtureEntities.map((item) => item.id),
  metricIds: fixtureMetrics
    .filter((item) => !('unavailable' in item && item.unavailable))
    .map((item) => item.id),
  dataPointIds: baseRows.map((item) => item.id),
  tableRowIds: baseRows.map((item) => item.id),
  detailItemIds: baseRows.map((item) => item.id),
  legendItemIds: ['demo-primary-series', 'demo-supporting-series'],
};

const evidenceColumns: readonly DashboardEvidenceColumn<FixtureRow>[] = [
  {
    id: 'segment',
    header: 'Fixture segment',
    render: (row) => <span className="break-words font-semibold">{row.label}</span>,
  },
  {
    align: 'numeric',
    id: 'primary',
    header: 'Primary value',
    render: (row) => <DashboardMetricValue value={row.primary} />,
  },
  {
    align: 'numeric',
    id: 'supporting',
    header: 'Supporting value',
    render: (row) => <DashboardMetricValue value={row.supporting} />,
  },
  {
    align: 'numeric',
    id: 'sample',
    header: 'Sample',
    render: (row) => `n = ${row.sampleCount}`,
  },
];

function labelForId(
  items: readonly { id: string; label: string }[],
  id: string | null,
) {
  return items.find((item) => item.id === id)?.label ?? null;
}

function displayStateForFixture(
  displayState: FixtureDisplayState,
): DataDisplayState {
  switch (displayState) {
    case 'loading':
      return { status: 'loading', label: 'Loading deterministic demo data' };
    case 'empty':
      return {
        status: 'empty',
        title: 'No demo rows in this fixture state',
        description: 'This is a deliberate development-only empty state.',
      };
    case 'unavailable':
      return {
        status: 'unavailable',
        title: 'Demo metric unavailable',
        description: 'The fixture deliberately withholds the required source fact.',
      };
    case 'ready':
      return { status: 'ready' };
  }
}

function replaceFixtureUrl(selection: DashboardSelection) {
  if (typeof window === 'undefined') {
    return;
  }
  const next = demoUrlAdapter.write(
    selection,
    new URLSearchParams(window.location.search),
  );
  const query = next.toString();
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
  );
}

function ChartPointControls({
  label,
  rows,
  selectedId,
  onSelect,
}: {
  label: string;
  rows: readonly FixtureRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div aria-label={label} className="mt-3 flex flex-wrap gap-2" role="group">
      {rows.map((row) => (
        <button
          aria-pressed={selectedId === row.id}
          className="tm-button-secondary tm-focus-ring min-h-11 min-w-0 max-w-full break-words"
          key={row.id}
          onClick={() => onSelect(row.id)}
          type="button"
        >
          Focus {row.label}
        </button>
      ))}
    </div>
  );
}

export function CombinedDashboardFixture({
  initialSearchParams = {},
}: {
  initialSearchParams?: Record<string, string | string[] | undefined>;
}) {
  const initialUrlSelection = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(initialSearchParams)) {
      if (typeof value === 'string') {
        params.set(key, value);
      }
    }
    return demoUrlAdapter.read(params);
  }, [initialSearchParams]);
  const [fixtureDisplayState, setFixtureDisplayState] =
    useState<FixtureDisplayState>('ready');
  const controller = useCoordinatedDashboard({
    availability: fixtureAvailability,
    defaultValue: {
      selectedEntityId: 'demo-ares',
      selectedMetricId: 'demo-output',
      ...initialUrlSelection,
    },
    onChange: replaceFixtureUrl,
  });
  const { selection } = controller;

  useEffect(() => {
    replaceFixtureUrl(selection);
  }, [selection]);

  const rows = useMemo(
    () => buildFixtureRows(selection.selectedEntityId, selection.selectedMetricId),
    [selection.selectedEntityId, selection.selectedMetricId],
  );
  const chartRows = useMemo(() => buildChartRows(rows), [rows]);
  const selectedRow =
    rows.find((row) => row.id === selection.selectedDataPointId) ?? null;
  const openDetailRow =
    rows.find((row) => row.id === selection.openDetailItemId) ?? null;
  const selectedLabel = selectedRow?.label ?? null;
  const chartState = displayStateForFixture(fixtureDisplayState);
  const rowState = fixtureDisplayState === 'ready' ? undefined : chartState;
  const buildingTag = resolveTagIconAsset({
    decorative: true,
    tagCode: 'building',
  });
  const insights: readonly DashboardInsightItem[] = [
    {
      id: 'demo-insight-north',
      title: 'Fixture-only descriptive finding',
      finding:
        'This sentence is supplied by the fixture and is not a generated production conclusion.',
      evidence: 'Linked to the North demonstration segment.',
      relatedItemId: 'demo-north',
      sample: { count: 4, lowSampleThreshold: 6, unit: 'demo rows' },
      coverage: { covered: 4, total: 8 },
    },
    {
      id: 'demo-insight-missing',
      title: 'Missing observation example',
      finding: 'The underlying fixture observation was not recorded.',
      relatedItemId: 'demo-missing',
      valueState: 'missing',
    },
    {
      id: 'demo-insight-unavailable',
      title: 'Unavailable calculation example',
      finding: 'The fixture intentionally has no eligible denominator.',
      relatedItemId: 'demo-unavailable',
      valueState: 'unavailable',
    },
  ];
  const activePrimary =
    selection.activeLegendItemId !== 'demo-supporting-series';
  const activeSupporting =
    selection.activeLegendItemId !== 'demo-primary-series';

  const toolbar = (
    <FilterToolbar label="Combined dashboard demo controls">
      <div className="flex items-center gap-2 self-center">
        <AssetImage asset={buildingTag} height={40} width={40} />
        <span className="tm-data-label">Shared asset preview</span>
      </div>
      <DashboardEntitySelector
        label="Demo entity"
        onChange={controller.selectEntity}
        options={fixtureEntities}
        value={selection.selectedEntityId}
      />
      <DashboardMetricSelector
        label="Demo metric"
        onChange={controller.selectMetric}
        options={fixtureMetrics}
        value={selection.selectedMetricId}
      />
      <FilterToolbarField label="Fixture display state">
        <select
          className="tm-input tm-focus-ring min-h-11"
          onChange={(event) =>
            setFixtureDisplayState(event.target.value as FixtureDisplayState)
          }
          value={fixtureDisplayState}
        >
          <option value="ready">Ready with mixed values</option>
          <option value="loading">Loading</option>
          <option value="empty">Empty</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </FilterToolbarField>
      <SelectableDashboardLegend
        activeItemId={selection.activeLegendItemId}
        items={[
          {
            color: chartPalette.tr,
            id: 'demo-primary-series',
            label: 'Primary fixture series',
          },
          {
            color: colorTokens.ocean.value,
            id: 'demo-supporting-series',
            label: 'Supporting fixture series with a deliberately long label',
          },
          {
            id: 'demo-unavailable-series',
            label: 'Unavailable fixture series',
            unavailable: true,
          },
        ]}
        onChange={controller.activateLegendItem}
      />
      <FilterToolbarGroup label="Selection actions">
        <ClearDashboardSelectionButton
          disabled={
            selection.selectedDataPointId === null &&
            selection.activeLegendItemId === null
          }
          onClear={controller.clearSelection}
        />
        <button
          className="tm-button-secondary tm-focus-ring min-h-11"
          disabled={selection.selectedDataPointId === null}
          onClick={() => {
            if (selection.selectedDataPointId) {
              controller.openDetail(selection.selectedDataPointId);
            }
          }}
          type="button"
        >
          Open selected detail
        </button>
      </FilterToolbarGroup>
      <DashboardSelectionSummary
        labels={{
          entity: labelForId(fixtureEntities, selection.selectedEntityId),
          metric: labelForId(fixtureMetrics, selection.selectedMetricId),
          item: selectedLabel,
          legend:
            selection.activeLegendItemId === 'demo-primary-series'
              ? 'Primary fixture series'
              : selection.activeLegendItemId === 'demo-supporting-series'
                ? 'Supporting fixture series'
                : null,
        }}
      />
    </FilterToolbar>
  );

  const primary = (
    <AnalyticsPanel
      badges={
        <PartialCoverageNotice coverage={{ covered: 18, total: 26 }} />
      }
      description="Recharts bar view coordinated through opaque fixture IDs. Use the buttons below as its keyboard-accessible selection surface."
      state={chartState}
      title="Dominant fixture visualization"
    >
      <ChartContainer
        label="Dominant fixture chart"
        minHeight={340}
        srSummary="Five deterministic demo categories, including explicit zero, partial, missing, and unavailable values. The evidence table is the complete chart alternative."
      >
        <ResponsiveContainer height={340} width="100%">
          <BarChart data={chartRows} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
            <CartesianGrid stroke="rgba(192, 162, 127, 0.16)" vertical={false} />
            <XAxis dataKey="id" tick={false} />
            <YAxis stroke={colorTokens.muted.value} width={36} />
            <RechartsTooltip />
            <Bar
              dataKey="primaryChartValue"
              fill={chartPalette.tr}
              isAnimationActive={false}
              name="Primary fixture value"
            >
              {chartRows.map((row) => (
                <Cell
                  fillOpacity={
                    activePrimary &&
                    (!selection.selectedDataPointId ||
                      selection.selectedDataPointId === row.id)
                      ? 1
                      : 0.24
                  }
                  key={row.id}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <ChartPointControls
          label="Dominant chart data-point controls"
          onSelect={controller.focusItem}
          rows={rows}
          selectedId={selection.selectedDataPointId}
        />
      </ChartContainer>
    </AnalyticsPanel>
  );

  const supporting = (
    <AnalyticsPanel
      badges={
        <LowSampleNotice
          sample={{ count: 4, lowSampleThreshold: 6, unit: 'demo rows' }}
        />
      }
      description="A second Recharts view reads the same coordinated selection."
      state={chartState}
      title="Supporting fixture visualization"
    >
      <ChartContainer
        label="Supporting fixture chart"
        minHeight={260}
        srSummary="Supporting deterministic fixture values for the same categories as the evidence table."
      >
        <ResponsiveContainer height={260} width="100%">
          <LineChart data={chartRows} margin={{ left: 0, right: 12, top: 8 }}>
            <CartesianGrid stroke="rgba(192, 162, 127, 0.16)" vertical={false} />
            <XAxis dataKey="id" tick={false} />
            <YAxis stroke={colorTokens.muted.value} width={34} />
            <RechartsTooltip />
            {selection.selectedDataPointId ? (
              <ReferenceLine
                stroke={colorTokens.copper400.value}
                strokeDasharray="4 4"
                x={selection.selectedDataPointId}
              />
            ) : null}
            <Line
              dataKey="supportingChartValue"
              dot={{ fill: colorTokens.ocean.value, r: 4 }}
              isAnimationActive={false}
              name="Supporting fixture value"
              stroke={colorTokens.ocean.value}
              strokeOpacity={activeSupporting ? 1 : 0.24}
              strokeWidth={3}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
        <ChartPointControls
          label="Supporting chart data-point controls"
          onSelect={controller.focusItem}
          rows={rows}
          selectedId={selection.selectedDataPointId}
        />
      </ChartContainer>
    </AnalyticsPanel>
  );

  const evidence = (
    <AnalyticsPanel
      description="The native table is the complete alternative to both fixture charts. Activate a row with click, Enter, or Space to synchronize the charts and open details."
      title="Fixture evidence"
    >
      <DashboardEvidenceTable
        caption="Development-only values; zero, missing, partial, and unavailable remain distinct."
        columns={evidenceColumns}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.label}
        label="Combined dashboard fixture evidence"
        onActivateRow={(rowId) => {
          controller.activateTableRow(rowId);
          controller.openDetail(rowId);
        }}
        rows={rows}
        selectedRowId={selection.activeTableRowId}
        state={rowState}
      />
    </AnalyticsPanel>
  );

  const details = openDetailRow ? (
    <DashboardDetailSurface
      description="Persistent non-modal panel on larger screens; accessible modal surface on narrow screens."
      onClear={controller.clearSelection}
      onClose={controller.closeDetail}
      open
      state={
        openDetailRow.primary.kind === 'unavailable'
          ? {
              status: 'unavailable',
              title: 'Fixture detail unavailable',
              description: openDetailRow.primary.reason,
            }
          : undefined
      }
      title={`${openDetailRow.label} detail`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="tm-stat-card">
          <p className="tm-data-label">Primary fixture value</p>
          <p className="mt-2 text-lg">
            <DashboardMetricValue value={openDetailRow.primary} />
          </p>
        </div>
        <div className="tm-stat-card">
          <p className="tm-data-label">Supporting fixture value</p>
          <p className="mt-2 text-lg">
            <DashboardMetricValue value={openDetailRow.supporting} />
          </p>
        </div>
      </div>
      {openDetailRow.primary.kind === 'missing' ? (
        <p className="mt-3">
          <MissingDataNotice label="This fixture value was not recorded" />
        </p>
      ) : null}
    </DashboardDetailSurface>
  ) : null;

  return (
    <main className="min-h-screen bg-[color:var(--tm-space-950)] py-6">
      <DashboardPageShell
        header={
          <PageHeader
            description="Development-only deterministic data. This route does not query production analytics or define Phase 2 scope semantics."
            eyebrow="Phase 1 fixture"
            title="Combined Dashboard Foundation"
          />
        }
        withContainer
      >
        <div
          className="tm-notice mb-4 w-fit"
          data-tone="warning"
          role="note"
        >
          <span aria-hidden="true">▲</span>
          Development/demo data only
        </div>
        <CombinedDashboardLayout
          detail={details}
          evidence={evidence}
          insights={
            <DashboardInsightRail
              description="Descriptions come from fixture input; the shared component generates no conclusions."
              items={insights}
              onFocusItem={controller.focusItem}
              selectedItemId={selection.selectedDataPointId}
              title="Fixture insight rail"
            />
          }
          primary={primary}
          supporting={supporting}
          toolbar={toolbar}
        />
      </DashboardPageShell>
    </main>
  );
}
