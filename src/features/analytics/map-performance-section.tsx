'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  chartAxisTick,
  chartGridStroke,
  chartTooltipStyle,
} from '@/components/charts/chart-theme';
import { MapImage, MapImageFallback } from '@/components/ui/map-image';
import type { PlayerMapMetricRow } from '@/lib/db/analytics-repo';
import {
  computeOverallAverages,
  formatMapMetric,
  formatMetricForChart,
  formatMetricTooltip,
  getMetricValue,
  getPerformanceDifference,
  getSampleSizeLabel,
  MAP_METRIC_LABELS,
  MAP_METRIC_Y_LABELS,
  MAP_SORT_LABELS,
  sortMapRows,
  type MapMetric,
  type MapSort,
} from './map-performance-utils';
import styles from './map-performance-section.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type MapPerformanceSectionProps = {
  mapMetricRows?: PlayerMapMetricRow[];
  playerName?: string | null;
  /** Overall averages (across all maps) for the player, to show deltas */
  playerOverallAvgScore?: number | null;
  playerOverallWinRate?: number | null;
};

// ─── Metric selector ─────────────────────────────────────────────────────────

const METRICS: MapMetric[] = ['averageScore', 'winRate', 'gamesPlayed', 'avgGenerations'];

function MapMetricSelector({
  activeMetric,
  onSelect,
}: {
  activeMetric: MapMetric;
  onSelect: (metric: MapMetric) => void;
}) {
  const groupId = useId();

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const next = METRICS[(index + 1) % METRICS.length];
        onSelect(next);
        (document.querySelector(`[data-metric="${next}"]`) as HTMLElement | null)?.focus();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const prev = METRICS[(index - 1 + METRICS.length) % METRICS.length];
        onSelect(prev);
        (document.querySelector(`[data-metric="${prev}"]`) as HTMLElement | null)?.focus();
      }
    },
    [onSelect],
  );

  return (
    <div
      aria-label="Metric"
      className={styles.metricSelector}
      role="tablist"
    >
      {METRICS.map((metric, index) => (
        <button
          aria-pressed={metric === activeMetric}
          aria-selected={metric === activeMetric}
          className={[
            styles.metricBtn,
            metric === activeMetric ? styles.metricBtnActive : '',
          ]
            .filter(Boolean)
            .join(' ')}
          data-metric={metric}
          id={`${groupId}-metric-${metric}`}
          key={metric}
          onClick={() => onSelect(metric)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          role="tab"
          type="button"
        >
          {MAP_METRIC_LABELS[metric]}
        </button>
      ))}
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

type ChartDatum = {
  displayValue: string;
  gamesPlayed: number;
  mapId: string;
  mapName: string;
  rawValue: number;
  value: number;
};

function buildChartData(
  rows: PlayerMapMetricRow[],
  metric: MapMetric,
): ChartDatum[] {
  return rows.map((row) => {
    const raw = getMetricValue(row, metric);
    const value = formatMetricForChart(raw, metric);
    return {
      displayValue: formatMapMetric(raw, metric),
      gamesPlayed: row.gamesPlayed,
      mapId: row.mapId,
      mapName: row.mapName ?? row.mapId,
      rawValue: raw,
      value,
    };
  });
}

function MapPerformanceChart({
  data,
  metric,
  onBarClick,
  overallAverage,
  selectedMapId,
}: {
  data: ChartDatum[];
  metric: MapMetric;
  onBarClick: (mapId: string) => void;
  overallAverage: number | null;
  selectedMapId: string | null;
}) {
  const avgForChart =
    overallAverage !== null ? formatMetricForChart(overallAverage, metric) : null;

  const yLabel = MAP_METRIC_Y_LABELS[metric];

  return (
    <div className={styles.chartWrap}>
      <ResponsiveContainer height={220} width="100%">
        <BarChart
          data={data}
          margin={{ bottom: 8, left: 4, right: 12, top: 8 }}
          onClick={(payload) => {
            // recharts 3: CategoricalChartState type, access activePayload via unknown
            const chartState = payload as unknown as {
              activePayload?: Array<{ payload?: ChartDatum }>;
            };
            const activePayload = chartState?.activePayload?.[0]?.payload;
            if (activePayload?.mapId) {
              onBarClick(activePayload.mapId);
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="mapName"
            tick={{ ...chartAxisTick, fontSize: 11 }}
            tickFormatter={(v: string) =>
              v.length > 10 ? `${v.slice(0, 9)}…` : v
            }
          />
          <YAxis
            label={{
              angle: -90,
              fill: 'var(--tm-muted)',
              fontSize: 10,
              offset: 8,
              position: 'insideLeft',
              style: { textAnchor: 'middle' },
              value: yLabel,
            }}
            tick={chartAxisTick}
            width={48}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: unknown, _name: unknown, entry: any) => [
              formatMetricTooltip(Number(value ?? 0), metric),
              `${MAP_METRIC_LABELS[metric]} (${(entry?.payload as ChartDatum | undefined)?.gamesPlayed ?? 0} games)`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ]) as any}
          />
          {avgForChart !== null && (
            <ReferenceLine
              className={styles.referenceLine}
              label={{
                fill: 'rgba(221, 161, 93, 0.7)',
                fontSize: 10,
                position: 'insideTopRight',
                value: 'Overall avg',
              }}
              stroke="rgba(221, 161, 93, 0.55)"
              strokeDasharray="4 3"
              y={avgForChart}
            />
          )}
          <Bar
            dataKey="value"
            maxBarSize={56}
            name={MAP_METRIC_LABELS[metric]}
            radius={[6, 6, 0, 0]}
          >
            <LabelList
              dataKey="displayValue"
              position="top"
              style={{
                fill: 'var(--tm-muted)',
                fontSize: 10,
                fontVariantNumeric: 'tabular-nums',
              }}
            />
            {data.map((entry) => (
              <Cell
                fill={
                  entry.mapId === selectedMapId
                    ? 'var(--tm-tr)'
                    : 'var(--tm-copper-500)'
                }
                key={entry.mapId}
                stroke={
                  entry.mapId === selectedMapId
                    ? 'rgba(240, 106, 50, 0.6)'
                    : 'transparent'
                }
                strokeWidth={1.5}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Map card ─────────────────────────────────────────────────────────────────

function MapPerformanceCard({
  isSelected,
  metric,
  onSelect,
  overallAverages,
  row,
}: {
  isSelected: boolean;
  metric: MapMetric;
  onSelect: (mapId: string) => void;
  overallAverages: ReturnType<typeof computeOverallAverages>;
  row: PlayerMapMetricRow;
}) {
  const metricValue = getMetricValue(row, metric);
  const overallAvgForMetric: number | null =
    metric === 'winRate'
      ? overallAverages.winRate
      : metric === 'averageScore'
        ? overallAverages.averageScore
        : metric === 'avgGenerations'
          ? overallAverages.avgGenerations
          : null;

  const delta = getPerformanceDifference(
    metric !== 'gamesPlayed' ? metricValue : null,
    overallAvgForMetric,
    metric,
  );

  const sampleLabel = getSampleSizeLabel(row.gamesPlayed);
  const mapCode = (row as PlayerMapMetricRow & { mapCode?: string }).mapCode ?? '';
  const mapName = row.mapName ?? row.mapId;

  return (
    <button
      aria-pressed={isSelected}
      className={[
        styles.mapCard,
        isSelected ? styles.mapCardSelected : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelect(row.mapId)}
      type="button"
    >
      {/* Image */}
      <div className={styles.mapImageWrap}>
        <MapImage
          className={styles.mapImageEl}
          code={mapCode}
          height={180}
          mapName={mapName}
          width={280}
        />
      </div>

      {/* Body */}
      <div className={styles.mapCardBody}>
        <div className={styles.mapCardHeader}>
          <span className={styles.mapCardName}>{mapName}</span>
          <span className={styles.mapCardGames}>{row.gamesPlayed}g</span>
        </div>

        <div>
          <div className={styles.mapCardMetricValue}>
            {formatMapMetric(metricValue, metric)}
          </div>
          <div className={styles.mapCardMetricLabel}>{MAP_METRIC_LABELS[metric]}</div>
        </div>

        {metric !== 'winRate' && (
          <p className={styles.mapCardMeta}>
            {`${formatMapMetric(row.winRate, 'winRate')} win rate`}
            {metric !== 'avgGenerations'
              ? ` · ${formatMapMetric(row.averageGenerations, 'avgGenerations')} avg gens`
              : ''}
          </p>
        )}
        {metric === 'winRate' && (
          <p className={styles.mapCardMeta}>
            {`${formatMapMetric(row.averagePoints, 'averageScore')} avg score · ${formatMapMetric(row.averageGenerations, 'avgGenerations')} avg gens`}
          </p>
        )}

        {delta && (
          <p
            className={[
              styles.mapCardDelta,
              delta.positive ? styles.mapCardDeltaPositive : styles.mapCardDeltaNegative,
            ].join(' ')}
          >
            {delta.formatted}
          </p>
        )}

        <p className={styles.mapCardSampleLabel}>{sampleLabel}</p>
      </div>
    </button>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function MapDetailPanel({
  metric,
  overallAverages,
  row,
}: {
  metric: MapMetric;
  overallAverages: ReturnType<typeof computeOverallAverages>;
  row: PlayerMapMetricRow & {
    highestScore?: number | null;
    lastPlayedAt?: string | null;
    losses?: number;
    recentWinsLast5?: number;
    hasSufficientRecentForm?: boolean;
    mapCode?: string;
  };
}) {
  const mapName = row.mapName ?? row.mapId;
  const mapCode = row.mapCode ?? '';
  const losses = row.losses ?? row.gamesPlayed - row.wins;

  const scoreAvgDelta = getPerformanceDifference(
    row.averagePoints,
    overallAverages.averageScore,
    'averageScore',
  );
  const winRateDelta = getPerformanceDifference(
    row.winRate,
    overallAverages.winRate,
    'winRate',
  );

  const lastPlayed = row.lastPlayedAt
    ? new Date(row.lastPlayedAt).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div aria-label={`Details for ${mapName}`} className={styles.detailPanel}>
      {/* Large map preview */}
      <div className={styles.detailImageWrap}>
        {mapCode ? (
          <MapImage
            className={styles.detailImageEl}
            code={mapCode}
            height={400}
            mapName={mapName}
            width={540}
          />
        ) : (
          <MapImageFallback className={styles.detailImageEl} mapName={mapName} />
        )}
      </div>

      {/* Stats */}
      <div className={styles.detailStats}>
        <h3 className={styles.detailMapName}>{mapName}</h3>

        {/* Primary metric delta chips */}
        <div className={styles.detailDeltaRow}>
          {scoreAvgDelta && (
            <span
              className={[
                styles.detailDeltaChip,
                scoreAvgDelta.positive
                  ? styles.detailDeltaPositive
                  : styles.detailDeltaNegative,
              ].join(' ')}
            >
              {scoreAvgDelta.formatted}
            </span>
          )}
          {winRateDelta && (
            <span
              className={[
                styles.detailDeltaChip,
                winRateDelta.positive
                  ? styles.detailDeltaPositive
                  : styles.detailDeltaNegative,
              ].join(' ')}
            >
              {winRateDelta.formatted}
            </span>
          )}
        </div>

        <div className={styles.detailGrid}>
          <div className={styles.detailStat}>
            <div className={styles.detailStatLabel}>Games played</div>
            <div className={styles.detailStatValue}>{row.gamesPlayed}</div>
            <div className={styles.detailStatMuted}>
              {getSampleSizeLabel(row.gamesPlayed)}
            </div>
          </div>

          <div className={styles.detailStat}>
            <div className={styles.detailStatLabel}>Wins / Losses</div>
            <div className={styles.detailStatValue}>
              {row.wins}W – {losses}L
            </div>
            <div className={styles.detailStatMuted}>
              {formatMapMetric(row.winRate, 'winRate')} win rate
            </div>
          </div>

          <div className={styles.detailStat}>
            <div className={styles.detailStatLabel}>Avg score</div>
            <div className={styles.detailStatValue}>
              {formatMapMetric(row.averagePoints, 'averageScore')}
            </div>
            {row.highestScore != null && row.highestScore > 0 && (
              <div className={styles.detailStatMuted}>
                Best: {row.highestScore}
              </div>
            )}
          </div>

          <div className={styles.detailStat}>
            <div className={styles.detailStatLabel}>Avg gens</div>
            <div className={styles.detailStatValue}>
              {formatMapMetric(row.averageGenerations, 'avgGenerations')}
            </div>
          </div>

          {row.averagePointsPerGeneration > 0 && (
            <div className={styles.detailStat}>
              <div className={styles.detailStatLabel}>Pts / gen</div>
              <div className={styles.detailStatValue}>
                {new Intl.NumberFormat('en-US', {
                  maximumFractionDigits: 1,
                  minimumFractionDigits: 1,
                }).format(row.averagePointsPerGeneration)}
              </div>
            </div>
          )}

          {lastPlayed && (
            <div className={styles.detailStat}>
              <div className={styles.detailStatLabel}>Last played</div>
              <div className={styles.detailStatValue} style={{ fontSize: '0.8rem' }}>
                {lastPlayed}
              </div>
            </div>
          )}
        </div>

        {/* Recent form */}
        {row.hasSufficientRecentForm && row.recentWinsLast5 != null && (
          <div>
            <div
              className={styles.detailStatLabel}
              style={{ marginBottom: '0.35rem' }}
            >
              Recent form (last 5)
            </div>
            <div className={styles.recentFormRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  className={[
                    styles.recentFormDot,
                    i < (row.recentWinsLast5 ?? 0)
                      ? styles.recentFormDotWin
                      : styles.recentFormDotLoss,
                  ].join(' ')}
                  key={i}
                  title={i < (row.recentWinsLast5 ?? 0) ? 'Win' : 'Loss/unknown'}
                />
              ))}
              <span style={{ color: 'var(--tm-muted)', fontSize: '0.72rem' }}>
                {row.recentWinsLast5} of last 5 won
              </span>
            </div>
          </div>
        )}

        {metric !== 'gamesPlayed' && (
          <p className={styles.detailLastPlayed}>
            {getSampleSizeLabel(row.gamesPlayed)} ·{' '}
            {row.gamesPlayed} game{row.gamesPlayed !== 1 ? 's' : ''} on record
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

const EMPTY_ROWS: PlayerMapMetricRow[] = [];

export function MapPerformanceSection({
  mapMetricRows = EMPTY_ROWS,
}: MapPerformanceSectionProps) {
  const [metric, setMetric] = useState<MapMetric>('averageScore');
  const [sort, setSort] = useState<MapSort>('bestPerformance');
  const [filter, setFilter] = useState<'played' | 'all'>('played');
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const sortLabelId = useId();

  // Only played maps for this profile section
  const playedRows = mapMetricRows.filter((r) => r.gamesPlayed > 0);
  const displayRows =
    filter === 'played' ? playedRows : mapMetricRows;
  const sortedRows = sortMapRows(displayRows, sort, metric);

  const overallAverages = computeOverallAverages(playedRows);

  // Keep selected map valid when rows change
  useEffect(() => {
    if (sortedRows.length === 0) {
      setSelectedMapId(null);
      return;
    }
    const stillPresent = sortedRows.some((r) => r.mapId === selectedMapId);
    if (!stillPresent) {
      setSelectedMapId(sortedRows[0]?.mapId ?? null);
    }
  }, [sortedRows, selectedMapId]);

  const selectedRow = sortedRows.find((r) => r.mapId === selectedMapId) ?? null;

  const overallAvgForMetric: number | null =
    metric === 'winRate'
      ? overallAverages.winRate
      : metric === 'averageScore'
        ? overallAverages.averageScore
        : metric === 'avgGenerations'
          ? overallAverages.avgGenerations
          : null;

  const chartData = buildChartData(sortedRows, metric);

  const handleBarClick = (mapId: string) => {
    setSelectedMapId(mapId);
  };

  const handleCardSelect = (mapId: string) => {
    setSelectedMapId(mapId);
  };

  return (
    <section className="tm-panel">
      {/* Header */}
      <div className={styles.header}>
        <p aria-hidden="true" className={styles.eyebrow}>
          Map analysis
        </p>
        <h2 className={styles.title}>Map Performance</h2>
        <p className={styles.description}>
          Compare your results across the board maps you have played.
        </p>
      </div>

      {playedRows.length === 0 ? (
        /* Empty state */
        <div className={styles.emptyState}>
          <p className={styles.emptyStateTitle}>No map data yet</p>
          <p className={styles.emptyStateCopy}>
            Map performance will appear once finalized games are logged and
            metric summaries have refreshed.
          </p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              {/* Filter toggle */}
              <div
                aria-label="Map filter"
                className={styles.filterToggle}
                role="group"
              >
                <button
                  aria-pressed={filter === 'played'}
                  className={[
                    styles.filterBtn,
                    filter === 'played' ? styles.filterBtnActive : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setFilter('played')}
                  type="button"
                >
                  Played maps
                </button>
                <button
                  aria-pressed={filter === 'all'}
                  className={[
                    styles.filterBtn,
                    filter === 'all' ? styles.filterBtnActive : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setFilter('all')}
                  type="button"
                >
                  All maps
                </button>
              </div>
            </div>

            {/* Sort */}
            <div className={styles.sortWrap}>
              <label htmlFor={`${sortLabelId}-sort`} className="sr-only">
                Sort maps by
              </label>
              <select
                className={styles.sortSelect}
                id={`${sortLabelId}-sort`}
                onChange={(e) => setSort(e.target.value as MapSort)}
                value={sort}
              >
                {(Object.keys(MAP_SORT_LABELS) as MapSort[]).map((key) => (
                  <option key={key} value={key}>
                    Sort: {MAP_SORT_LABELS[key]}
                  </option>
                ))}
              </select>
              <svg
                aria-hidden="true"
                className={styles.sortChevron}
                fill="none"
                height="12"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 12 12"
                width="12"
              >
                <path d="M2 4l4 4 4-4" />
              </svg>
            </div>
          </div>

          {/* Metric selector */}
          <MapMetricSelector activeMetric={metric} onSelect={setMetric} />

          {/* Chart */}
          {sortedRows.length > 0 && (
            <MapPerformanceChart
              data={chartData}
              metric={metric}
              onBarClick={handleBarClick}
              overallAverage={overallAvgForMetric}
              selectedMapId={selectedMapId}
            />
          )}

          {/* Card grid */}
          <div className={styles.cardGrid}>
            {sortedRows.map((row) => {
              if (row.gamesPlayed === 0) {
                // Unplayed map in "All maps" view
                return (
                  <div className={styles.mapCard} key={row.mapId} style={{ cursor: 'default' }}>
                    <div className={styles.mapImageWrap}>
                      <MapImageFallback
                        className={styles.mapImageEl}
                        mapName={row.mapName ?? row.mapId}
                      />
                    </div>
                    <div className={styles.mapCardBody}>
                      <div className={styles.mapCardHeader}>
                        <span className={styles.mapCardName}>
                          {row.mapName ?? row.mapId}
                        </span>
                      </div>
                      <p className={styles.mapCardNoData}>No games recorded</p>
                    </div>
                  </div>
                );
              }

              return (
                <MapPerformanceCard
                  isSelected={row.mapId === selectedMapId}
                  key={row.mapId}
                  metric={metric}
                  onSelect={handleCardSelect}
                  overallAverages={overallAverages}
                  row={row}
                />
              );
            })}
          </div>

          {/* Detail panel */}
          {selectedRow && selectedRow.gamesPlayed > 0 && (
            <MapDetailPanel
              metric={metric}
              overallAverages={overallAverages}
              row={selectedRow as Parameters<typeof MapDetailPanel>[0]['row']}
            />
          )}
        </>
      )}
    </section>
  );
}
