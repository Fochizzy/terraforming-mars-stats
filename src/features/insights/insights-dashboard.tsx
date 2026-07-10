'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CoverageBadge } from '@/components/charts/coverage-badge';
import { ChartFrame } from '@/components/charts/chart-frame';
import {
  chartAxisTick,
  chartGridStroke,
  chartSeriesColors,
  chartTooltipStyle,
} from '@/components/charts/chart-theme';
import { SelectChevron } from '@/components/ui/select-chevron';
import type {
  GroupAnalytics,
  GroupHeadToHeadRow,
  GroupInteractionRow,
  GroupStylePerformanceRow,
  TrendRow,
} from '@/lib/db/analytics-repo';
import type { ExtendedGroupAnalytics } from '@/lib/db/extended-analytics-repo';
import { buildInsightCards } from './build-insight-cards';
import { BoardHeatmapSection } from './board-heatmap-section';
import { CardOutcomesSection } from './card-outcomes-section';
import { GameLengthSection } from './game-length-section';
import { GamePaceSection } from './game-pace-section';
import { MapPerformanceSection } from './map-performance-section';
import {
  AwardEconomicsSection,
  MilestoneEconomicsSection,
} from './milestone-award-section';
import { PlacementDistributionChart } from './placement-distribution-chart';
import { ScoreSourceRadar } from './score-source-radar';
import { TableSizeChart } from './table-size-chart';
import { TagOutcomesSection } from './tag-outcomes-section';

type PlayerOption = {
  displayName: string;
  id: string;
};

type InsightsDashboardProps = {
  analytics: GroupAnalytics;
  extended: ExtendedGroupAnalytics;
  players: PlayerOption[];
};

type FocusedHeadToHeadRow = {
  averageScoreDifferential: number;
  gamesPlayed: number;
  label: string;
  losses: number;
  ties: number;
  wins: number;
};

type ScoreSourceShape = {
  averageAnimalPoints: number;
  averageAwardPoints: number;
  averageCardPoints: number;
  averageCitiesPoints: number;
  averageGreeneryPoints: number;
  averageJovianPoints: number;
  averageMicrobePoints: number;
  averageMilestonePoints: number;
  averageOtherCardPoints: number;
  averageTrPoints: number;
};

type TrendChartPoint = {
  count: number;
  label: string;
  score: number;
  styleLabel: string;
  winRate: number;
};

type DashboardInteractionRow = GroupInteractionRow & {
  playerId?: string;
  playerName?: string;
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatAverage(value: number | null) {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function truncateLabel(value: string, length = 18) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length - 1)}…`;
}

function humanizeStyleCode(styleCode: string | null) {
  if (!styleCode) {
    return 'Unclassified';
  }

  return styleCode
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function humanizeInteractionType() {
  return 'Corporation + Prelude';
}

function isSupportedDashboardInteractionRow(row: DashboardInteractionRow) {
  return row.interactionType === 'corporation_prelude_pair';
}

function buildScoreSourceEntries(scoreAverages: ScoreSourceShape) {
  return [
    { label: 'Terraform Rating', value: scoreAverages.averageTrPoints },
    { label: 'Card Points', value: scoreAverages.averageCardPoints },
    { label: 'Other Card', value: scoreAverages.averageOtherCardPoints },
    { label: 'Greenery', value: scoreAverages.averageGreeneryPoints },
    { label: 'Cities', value: scoreAverages.averageCitiesPoints },
    { label: 'Milestones', value: scoreAverages.averageMilestonePoints },
    { label: 'Awards', value: scoreAverages.averageAwardPoints },
    { label: 'Jovian', value: scoreAverages.averageJovianPoints },
    { label: 'Microbe', value: scoreAverages.averageMicrobePoints },
    { label: 'Animal', value: scoreAverages.averageAnimalPoints },
  ];
}

function buildStylePerformanceChartData(rows: GroupStylePerformanceRow[]) {
  return rows.slice(0, 5).map((row) => ({
    averageScore: Number(row.averageScore.toFixed(1)),
    gamesPlayed: row.gamesPlayed,
    styleLabel: humanizeStyleCode(row.styleCode),
    winRate: Math.round(row.winRate * 100),
  }));
}

function buildTrendChartData(rows: TrendRow[], isFocusedPlayer: boolean) {
  if (isFocusedPlayer) {
    return [...rows]
      .sort(
        (left, right) =>
          left.playedOn.localeCompare(right.playedOn) ||
          left.playerName.localeCompare(right.playerName),
      )
      .map((row) => ({
        count: 1,
        label: row.playedOn,
        score: row.totalPoints,
        styleLabel: humanizeStyleCode(row.inferredPrimaryStyleCode),
        winRate: row.isWinner ? 100 : 0,
      }));
  }

  const grouped = rows.reduce<Record<string, TrendChartPoint>>((accumulator, row) => {
    const existing = accumulator[row.playedOn] ?? {
      count: 0,
      label: row.playedOn,
      score: 0,
      styleLabel: '',
      winRate: 0,
    };

    existing.count += 1;
    existing.score += row.totalPoints;
    existing.winRate += row.isWinner ? 1 : 0;

    accumulator[row.playedOn] = existing;
    return accumulator;
  }, {});

  const styleByDate = rows.reduce<Record<string, Record<string, number>>>(
    (accumulator, row) => {
      if (!row.inferredPrimaryStyleCode) {
        return accumulator;
      }

      const dateEntry = accumulator[row.playedOn] ?? {};
      dateEntry[row.inferredPrimaryStyleCode] =
        (dateEntry[row.inferredPrimaryStyleCode] ?? 0) + 1;
      accumulator[row.playedOn] = dateEntry;
      return accumulator;
    },
    {},
  );

  return Object.values(grouped)
    .map((entry) => {
      const styleCounts = Object.entries(styleByDate[entry.label] ?? {}).sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      );
      return {
        ...entry,
        score: Number((entry.score / entry.count).toFixed(1)),
        styleLabel: humanizeStyleCode(styleCounts[0]?.[0] ?? null),
        winRate: Math.round((entry.winRate / entry.count) * 100),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

function normalizeHeadToHeadRows(
  rows: GroupHeadToHeadRow[],
  focusPlayerId: string | null,
  focusPlayerName: string | null,
): FocusedHeadToHeadRow[] {
  if (!focusPlayerId || !focusPlayerName) {
    return rows.slice(0, 6).map((row) => ({
      label: `${row.leftPlayerName} vs ${row.rightPlayerName}`,
      gamesPlayed: row.gamesPlayed,
      wins: row.leftWins,
      losses: row.rightWins,
      ties: row.ties,
      averageScoreDifferential: row.averageScoreDifferential,
    }));
  }

  return rows
    .map((row) => {
      if (row.leftPlayerId === focusPlayerId) {
        return {
          label: `${focusPlayerName} vs ${row.rightPlayerName}`,
          gamesPlayed: row.gamesPlayed,
          wins: row.leftWins,
          losses: row.rightWins,
          ties: row.ties,
          averageScoreDifferential: row.averageScoreDifferential,
        };
      }

      if (row.rightPlayerId === focusPlayerId) {
        return {
          label: `${focusPlayerName} vs ${row.leftPlayerName}`,
          gamesPlayed: row.gamesPlayed,
          wins: row.rightWins,
          losses: row.leftWins,
          ties: row.ties,
          averageScoreDifferential: row.averageScoreDifferential * -1,
        };
      }

      return null;
    })
    .filter((row): row is FocusedHeadToHeadRow => Boolean(row))
    .sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        Math.abs(right.averageScoreDifferential) -
          Math.abs(left.averageScoreDifferential) ||
        left.label.localeCompare(right.label),
    )
    .slice(0, 6);
}

export function InsightsDashboard({
  analytics,
  extended,
  players,
}: InsightsDashboardProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('all');

  const selectedPlayer =
    selectedPlayerId === 'all'
      ? null
      : players.find((player) => player.id === selectedPlayerId) ?? null;
  const focusedPlayerScoreAverages = selectedPlayer
    ? analytics.playerScoreAverages.find(
        (row) => row.playerId === selectedPlayer.id,
      ) ?? null
    : null;
  const selectedStylePerformanceRows: GroupStylePerformanceRow[] = selectedPlayer
    ? analytics.playerStylePerformanceRows.filter(
        (row) => row.playerId === selectedPlayer.id,
      )
    : analytics.groupStylePerformanceRows;
  const selectedTrendRows = selectedPlayer
    ? analytics.playerTrendRows.filter((row) => row.playerId === selectedPlayer.id)
    : analytics.playerTrendRows;
  const selectedScoreProfile = selectedPlayer
    ? analytics.playerScoreAverages.find((row) => row.playerId === selectedPlayer.id) ??
      analytics.scoreAverages
    : analytics.scoreAverages;
  const selectedCoverage = selectedPlayer
    ? analytics.playerCoverages.find((row) => row.playerId === selectedPlayer.id) ??
      analytics.coverage
    : analytics.coverage;
  const selectedStyleRows = selectedPlayer
    ? analytics.styleAgreementRows.filter((row) => row.playerId === selectedPlayer.id)
    : analytics.styleAgreementRows.slice(0, 6);
  const selectedLineupRows = selectedPlayer
    ? analytics.lineupEffectRows.filter((row) => row.playerId === selectedPlayer.id)
    : analytics.lineupEffectRows.slice(0, 6);
  const selectedInteractionRows: DashboardInteractionRow[] = (
    selectedPlayer
      ? analytics.playerInteractionRows.filter((row) => row.playerId === selectedPlayer.id)
      : analytics.groupInteractionRows
  )
    .filter(isSupportedDashboardInteractionRow)
    .slice(0, 6);
  const focusedHeadToHeadRows = useMemo(
    () =>
      normalizeHeadToHeadRows(
        analytics.headToHeadRows,
        selectedPlayer?.id ?? null,
        selectedPlayer?.displayName ?? null,
      ),
    [analytics.headToHeadRows, selectedPlayer],
  );

  const insightCards = useMemo(
    () =>
      buildInsightCards({
        coverage: selectedCoverage,
        focusPlayerId: selectedPlayer?.id ?? null,
        focusPlayerName: selectedPlayer?.displayName ?? null,
        headToHeadRows: analytics.headToHeadRows,
        interactionRows: selectedInteractionRows,
        leaderboardRows: analytics.leaderboardRows,
        lineupEffectRows: analytics.lineupEffectRows,
        stylePerformanceRows: selectedStylePerformanceRows,
        styleAgreementRows: analytics.styleAgreementRows,
        trendRows: analytics.playerTrendRows,
      }),
    [
      analytics.headToHeadRows,
      analytics.leaderboardRows,
      analytics.lineupEffectRows,
      analytics.playerTrendRows,
      analytics.styleAgreementRows,
      selectedCoverage,
      selectedInteractionRows,
      selectedPlayer,
      selectedStylePerformanceRows,
    ],
  );

  const leaderboardChartData = analytics.leaderboardRows.slice(0, 6).map((row) => ({
    name: row.playerName,
    weightedScore: Number(row.weightedScore.toFixed(3)),
    isFocused: row.playerId === selectedPlayer?.id,
    winRate: Math.round(row.winRate * 100),
  }));
  const scoreSourceData = selectedScoreProfile
    ? buildScoreSourceEntries(selectedScoreProfile).map((entry) => ({
        label: entry.label,
        value: Number(entry.value.toFixed(1)),
      }))
    : [];
  const styleAgreementData = selectedStyleRows.map((row) => ({
    exact: Math.round(row.exactMatchRate * 100),
    mismatch: Math.round(row.mismatchRate * 100),
    partial: Math.round(row.partialMatchRate * 100),
    playerName: row.playerName,
  }));
  const stylePerformanceData = buildStylePerformanceChartData(selectedStylePerformanceRows);
  const trendChartData = buildTrendChartData(
    selectedTrendRows,
    Boolean(selectedPlayer),
  );
  const coverageData = selectedCoverage
    ? [
        {
          label: 'Full Card',
          value: Math.round(selectedCoverage.cardBreakdownCoverage * 100),
        },
        { label: 'Microbe', value: Math.round(selectedCoverage.microbeCoverage * 100) },
        { label: 'Animal', value: Math.round(selectedCoverage.animalCoverage * 100) },
        { label: 'Jovian', value: Math.round(selectedCoverage.jovianCoverage * 100) },
        {
          label: 'Declared',
          value: Math.round(selectedCoverage.declaredStyleCoverage * 100),
        },
        { label: 'Key Cards', value: Math.round(selectedCoverage.keyCardCoverage * 100) },
      ]
    : [];

  const hasAnalytics =
    analytics.leaderboardRows.length > 0 ||
    analytics.headToHeadRows.length > 0 ||
    selectedInteractionRows.length > 0 ||
    analytics.lineupEffectRows.length > 0 ||
    analytics.styleAgreementRows.length > 0 ||
    analytics.scoreAverages !== null ||
    analytics.coverage !== null;

  return (
    <div className="flex flex-col gap-4">
      <ChartFrame title="Insights Lab">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[220px] flex-1">
              <label className="tm-data-label" htmlFor="player-focus-select">
                Player Focus
              </label>
              <select
                aria-label="Player focus"
                className="tm-input mt-2 w-full appearance-none pr-9"
                id="player-focus-select"
                onChange={(event) => setSelectedPlayerId(event.target.value)}
                value={selectedPlayerId}
              >
                <option value="all">All players</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.displayName}
                  </option>
                ))}
              </select>
              <span className="mt-2 block">
                <SelectChevron />
              </span>
            </div>
            <span className="tm-coverage-badge">
              {selectedPlayer
                ? `Focused on ${selectedPlayer.displayName}`
                : 'Focused on group-wide finalized results'}
            </span>
          </div>
          <p className="tm-body-copy text-sm">
            Compare weighted leaderboard form, score-source patterns, style
            agreement, head-to-head edges, lineup effects, interaction pairings,
            and coverage signals from finalized games only.
          </p>
        </div>
      </ChartFrame>

      <ChartFrame title="What These Metrics Mean">
        <dl className="grid gap-4">
          <div>
            <dt className="tm-data-label">Weighted Score</dt>
            <dd className="tm-muted-copy mt-1 text-sm">
              A single ranking number that blends how a player finishes rather
              than just their raw points: 50% win rate, 30% average finishing
              placement, and 20% average score margin against opponents (capped
              at ±20 points). Higher is better, and it drives the weighted
              leaderboard order.
            </dd>
          </div>
          <div>
            <dt className="tm-data-label">Optional Data Coverage</dt>
            <dd className="tm-muted-copy mt-1 text-sm">
              The share of a player&apos;s or group&apos;s finalized games that
              recorded the optional breakdown details — full card-point
              breakdowns, microbe / animal / Jovian points, declared play style,
              and key cards. A low value means that detail is simply missing from
              those games, not that the value was zero, so treat the dependent
              charts as partial samples.
            </dd>
          </div>
          <div>
            <dt className="tm-data-label">Play Style</dt>
            <dd className="tm-muted-copy mt-1 text-sm">
              A game&apos;s strategic archetype (for example greenery-heavy,
              card-engine, or milestone-and-award focused). Each game can carry a
              declared style the player chose up front and an inferred style
              derived from how their points actually came together; the style
              sections compare the two and track which styles win most.
            </dd>
          </div>
        </dl>
      </ChartFrame>

      {hasAnalytics ? (
        <>
          <ChartFrame title="Insight Cards">
            <div className="grid gap-3 md:grid-cols-2">
              {insightCards.map((card) => (
                <article className="tm-stat-card" key={`${card.title}-${card.body}`}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-stone-100">{card.title}</h3>
                    <p className="tm-accent-copy text-xs uppercase tracking-[0.2em]">
                      {card.confidence}
                    </p>
                  </div>
                  <p className="tm-muted-copy mt-2 text-sm">{card.body}</p>
                  <p className="mt-3 text-xs" style={{ color: 'var(--tm-muted)' }}>
                    Sample size: {card.sampleSize}
                  </p>
                </article>
              ))}
            </div>
          </ChartFrame>

          <ChartFrame title="Weighted Leaderboard Comparison">
            {leaderboardChartData.length === 0 ? (
              <p className="tm-muted-copy text-sm">
                Finalized leaderboard rows will appear here once games are logged.
              </p>
            ) : (
              <ResponsiveContainer height={260} width="100%">
                <BarChart
                  data={leaderboardChartData}
                  margin={{ bottom: 36, left: 0, right: 12, top: 12 }}
                >
                  <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                  <XAxis
                    angle={-20}
                    dataKey="name"
                    height={60}
                    textAnchor="end"
                    tick={chartAxisTick}
                  />
                  <YAxis tick={chartAxisTick} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="weightedScore" radius={[10, 10, 0, 0]}>
                    {leaderboardChartData.map((row) => (
                      <Cell
                        fill={
                          row.isFocused
                            ? chartSeriesColors.accent
                            : chartSeriesColors.default
                        }
                        key={row.name}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartFrame>

          <PlacementDistributionChart
            rows={extended.placementDistributionRows}
          />

          <ChartFrame
            title={
              selectedPlayer
                ? `Score Profile for ${selectedPlayer.displayName}`
                : 'Group Score Profile'
            }
          >
            {scoreSourceData.length === 0 ? (
              <p className="tm-muted-copy text-sm">
                Score-source averages will appear here after finalized games exist.
              </p>
            ) : (
              <ResponsiveContainer height={340} width="100%">
                <BarChart
                  data={scoreSourceData}
                  layout="vertical"
                  margin={{ bottom: 12, left: 48, right: 12, top: 12 }}
                >
                  <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                  <XAxis tick={chartAxisTick} type="number" />
                  <YAxis
                    dataKey="label"
                    tick={chartAxisTick}
                    type="category"
                    width={88}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="value" fill={chartSeriesColors.accent} radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartFrame>

          <ScoreSourceRadar
            focusPlayerName={selectedPlayer?.displayName ?? null}
            groupAverages={analytics.scoreAverages}
            playerAverages={focusedPlayerScoreAverages}
          />

          <ChartFrame
            title={
              selectedPlayer
                ? `Style Agreement for ${selectedPlayer.displayName}`
                : 'Group Style Agreement'
            }
          >
            {styleAgreementData.length === 0 ? (
              <p className="tm-muted-copy text-sm">
                Declared-versus-inferred style comparisons will appear once both
                style inputs are recorded.
              </p>
            ) : (
              <ResponsiveContainer height={260} width="100%">
                <BarChart
                  data={styleAgreementData}
                  margin={{ bottom: 36, left: 0, right: 12, top: 12 }}
                >
                  <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                  <XAxis
                    angle={-20}
                    dataKey="playerName"
                    height={60}
                    textAnchor="end"
                    tick={chartAxisTick}
                  />
                  <YAxis tick={chartAxisTick} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="exact" fill={chartSeriesColors.greenery} stackId="style" />
                  <Bar dataKey="partial" fill={chartSeriesColors.partial} stackId="style" />
                  <Bar dataKey="mismatch" fill={chartSeriesColors.danger} stackId="style" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartFrame>

          <ChartFrame title="Best Style Snapshot">
            {stylePerformanceData.length === 0 ? (
              <p className="tm-muted-copy text-sm">
                Best-style snapshots will appear once inferred styles have been
                recorded on finalized games.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer height={260} width="100%">
                  <BarChart
                    data={stylePerformanceData}
                    margin={{ bottom: 36, left: 0, right: 12, top: 12 }}
                  >
                    <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                    <XAxis
                      angle={-20}
                      dataKey="styleLabel"
                      height={72}
                      textAnchor="end"
                      tick={chartAxisTick}
                    />
                    <YAxis tick={chartAxisTick} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="winRate" fill={chartSeriesColors.tr} radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid gap-3">
                  {selectedStylePerformanceRows.slice(0, 3).map((row) => (
                    <article
                      className="tm-stat-card"
                      key={`${row.styleCode}-${row.gamesPlayed}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-stone-100">
                          {humanizeStyleCode(row.styleCode)}
                        </h3>
                        <p className="tm-accent-copy text-sm">
                          {formatPercent(row.winRate)}
                        </p>
                      </div>
                      <p className="tm-muted-copy mt-2 text-sm">
                        {row.gamesPlayed} games | avg {formatAverage(row.averageScore)} points
                        | avg place {formatAverage(row.averagePlacement)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </ChartFrame>

          <ChartFrame title="Trend Over Time">
            {trendChartData.length === 0 ? (
              <p className="tm-muted-copy text-sm">
                Trend evidence will appear after finalized games are logged.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer height={280} width="100%">
                  <LineChart
                    data={trendChartData}
                    margin={{ bottom: 36, left: 0, right: 12, top: 12 }}
                  >
                    <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                    <XAxis
                      angle={-20}
                      dataKey="label"
                      height={72}
                      textAnchor="end"
                      tick={chartAxisTick}
                    />
                    <YAxis tick={chartAxisTick} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Line
                      dataKey="score"
                      dot
                      stroke={chartSeriesColors.accent}
                      strokeWidth={3}
                      type="monotone"
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="grid gap-3">
                  {trendChartData.slice(-4).reverse().map((row) => (
                    <article className="tm-stat-card" key={`${row.label}-${row.styleLabel}`}>
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-stone-100">{row.label}</h3>
                        <p className="tm-accent-copy text-sm">
                          {formatAverage(row.score)} pts
                        </p>
                      </div>
                      <p className="tm-muted-copy mt-2 text-sm">
                        {row.styleLabel} | {row.winRate}% win rate
                        {row.count > 1 ? ` | ${row.count} results` : ''}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </ChartFrame>

          <TableSizeChart
            focusPlayerId={selectedPlayer?.id ?? null}
            focusPlayerName={selectedPlayer?.displayName ?? null}
            rows={extended.playerCountPerformanceRows}
          />

          <GameLengthSection
            distributionRows={extended.generationDistributionRows}
            focusPlayerId={selectedPlayer?.id ?? null}
            focusPlayerName={selectedPlayer?.displayName ?? null}
            performanceRows={extended.gameLengthPerformanceRows}
          />

          <MapPerformanceSection
            focusPlayerId={selectedPlayer?.id ?? null}
            focusPlayerName={selectedPlayer?.displayName ?? null}
            groupRows={extended.groupMapPerformanceRows}
            playerRows={extended.playerMapPerformanceRows}
          />

          <ChartFrame title="Head-to-Head Lens">
            {focusedHeadToHeadRows.length === 0 ? (
              <p className="tm-muted-copy text-sm">
                Head-to-head comparisons will appear after repeated finalized
                matchups are logged.
              </p>
            ) : (
              <div className="grid gap-3">
                {focusedHeadToHeadRows.map((row) => (
                  <article className="tm-stat-card" key={row.label}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">{row.label}</h3>
                      <p className="tm-accent-copy text-sm">
                        {formatAverage(row.averageScoreDifferential)} pts
                      </p>
                    </div>
                    <p className="tm-muted-copy mt-2 text-sm">
                      {row.wins}-{row.losses}-{row.ties} over {row.gamesPlayed} games
                    </p>
                  </article>
                ))}
              </div>
            )}
          </ChartFrame>

          <ChartFrame title="Lineup Effects">
            {selectedLineupRows.length === 0 ? (
              <p className="tm-muted-copy text-sm">
                Lineup effects will appear after repeated finalized group mixes are
                logged.
              </p>
            ) : (
              <div className="grid gap-3">
                {selectedLineupRows.map((row) => (
                  <article
                    className="tm-stat-card"
                    key={`${row.playerId}-${row.lineupLabel}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">
                        {selectedPlayer ? row.lineupLabel : row.playerName}
                      </h3>
                      <p className="tm-accent-copy text-sm">
                        {formatPercent(row.winRate)}
                      </p>
                    </div>
                    <p className="tm-muted-copy mt-2 text-sm">
                      {selectedPlayer
                        ? `${row.gamesPlayed} games | avg ${formatAverage(row.averageScore)} points | ${formatAverage(row.averageGenerationCount)} gens`
                        : `${truncateLabel(row.lineupLabel)} | ${row.gamesPlayed} games | avg ${formatAverage(row.averageScore)} points`}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </ChartFrame>

          <MilestoneEconomicsSection
            focusPlayerId={selectedPlayer?.id ?? null}
            focusPlayerName={selectedPlayer?.displayName ?? null}
            groupRows={extended.milestoneEconomicsRows}
            playerRows={extended.playerMilestoneClaimRows}
          />

          <AwardEconomicsSection
            focusPlayerId={selectedPlayer?.id ?? null}
            focusPlayerName={selectedPlayer?.displayName ?? null}
            matrixRows={extended.awardFunderWinnerRows}
            outcomeRows={extended.awardOutcomeRows}
          />

          <CardOutcomesSection
            focusPlayerId={selectedPlayer?.id ?? null}
            focusPlayerName={selectedPlayer?.displayName ?? null}
            rows={extended.cardOutcomeRows}
          />

          <TagOutcomesSection
            focusPlayerId={selectedPlayer?.id ?? null}
            focusPlayerName={selectedPlayer?.displayName ?? null}
            rows={extended.tagOutcomeRows}
          />

          <GamePaceSection rows={extended.generationPaceRows} />

          <BoardHeatmapSection rows={extended.tilePlacementRows} />

          {selectedInteractionRows.length > 0 ? (
            <ChartFrame title="Interaction Insights">
              <div className="grid gap-3">
                {selectedInteractionRows.map((row) => (
                  <article
                    className="tm-stat-card"
                    key={`${row.playerId ?? 'group'}-${row.interactionType}-${row.label}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">{row.label}</h3>
                      <p className="tm-accent-copy text-sm">
                        {formatPercent(row.winRate)}
                      </p>
                    </div>
                    <p className="tm-muted-copy mt-2 text-sm">
                      {humanizeInteractionType()} | {row.gamesPlayed} results | avg{' '}
                      {formatAverage(row.averageScore)} points | avg place{' '}
                      {formatAverage(row.averagePlacement)}
                    </p>
                  </article>
                ))}
              </div>
            </ChartFrame>
          ) : null}

          <ChartFrame
            title={
              selectedPlayer
                ? `Optional Data Coverage for ${selectedPlayer.displayName}`
                : 'Group Optional Data Coverage'
            }
          >
            {coverageData.length === 0 ? (
              <p className="tm-muted-copy text-sm">
                Coverage metrics will appear after finalized games are logged.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer height={260} width="100%">
                  <BarChart
                    data={coverageData}
                    margin={{ bottom: 36, left: 0, right: 12, top: 12 }}
                  >
                    <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                    <XAxis
                      angle={-20}
                      dataKey="label"
                      height={60}
                      textAnchor="end"
                      tick={chartAxisTick}
                    />
                    <YAxis tick={chartAxisTick} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="value" fill={chartSeriesColors.accent} radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2">
                  {selectedCoverage ? (
                    <>
                      <CoverageBadge
                        label="Full card breakdown"
                        value={selectedCoverage.cardBreakdownCoverage}
                      />
                      <CoverageBadge
                        label="Microbe coverage"
                        value={selectedCoverage.microbeCoverage}
                      />
                      <CoverageBadge
                        label="Animal coverage"
                        value={selectedCoverage.animalCoverage}
                      />
                      <CoverageBadge
                        label="Jovian coverage"
                        value={selectedCoverage.jovianCoverage}
                      />
                      <CoverageBadge
                        label="Declared style coverage"
                        value={selectedCoverage.declaredStyleCoverage}
                      />
                      <CoverageBadge
                        label="Key-card coverage"
                        value={selectedCoverage.keyCardCoverage}
                      />
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </ChartFrame>
        </>
      ) : (
        <ChartFrame title="Insights Waiting on Finalized Games">
          <p className="tm-body-copy text-sm">
            Finalize a few games to unlock leaderboard, style, lineup, and
            coverage insights.
          </p>
        </ChartFrame>
      )}
    </div>
  );
}
