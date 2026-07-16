'use client';

import { type ReactNode, useMemo, useState, useTransition } from 'react';
import { EyeOff, Plus } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { saveHiddenGroupInsightPlayer } from '@/app/(app)/insights/group/actions';
import { CoverageBadge } from '@/components/charts/coverage-badge';
import { ChartFrame } from '@/components/charts/chart-frame';
import {
  chartAxisTick,
  chartGridStroke,
  chartSeriesColors,
  chartTooltipStyle,
} from '@/components/charts/chart-theme';
import type {
  CrossGroupFocusPerson,
  GroupAnalytics,
  ScoreSourceAverages,
  SharedGameResultRow,
} from '@/lib/db/analytics-repo';
import type { ExtendedGroupAnalytics } from '@/lib/db/extended-analytics-repo';
import type { MapAwardGroup } from '@/lib/db/reference-repo';
import { AwardMapOverview, deduplicateAwardOutcomeRows } from './award-map-overview';
import { BoardHeatmapSection } from './board-heatmap-section';
import { GameLengthSection } from './game-length-section';
import { GamePaceSection } from './game-pace-section';
import { MapPerformanceSection } from './map-performance-section';
import {
  AwardEconomicsSection,
  MilestoneEconomicsSection,
} from './milestone-award-section';
import {
  buildPlayerCombinationAnalytics,
  buildPlayerCombinationOptions,
} from './player-combination-analytics';
import { PlacementDistributionChart } from './placement-distribution-chart';
import { TableSizeChart } from './table-size-chart';

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatAverage(value: number | null) {
  if (value === null) return '—';

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function buildScoreSourceRows(scoreAverages: ScoreSourceAverages | null) {
  if (!scoreAverages) return [];

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
  ].map((row) => ({ ...row, value: Number(row.value.toFixed(1)) }));
}

function getBaseResultCount(analytics: GroupAnalytics) {
  return (
    analytics.coverage?.finalizedPlayerResults ??
    analytics.leaderboardRows.reduce((sum, row) => sum + row.gamesPlayed, 0)
  );
}

function getBaseGameCount(analytics: GroupAnalytics) {
  return (
    analytics.coverage?.finalizedGames ??
    Math.max(0, ...analytics.leaderboardRows.map((row) => row.gamesPlayed))
  );
}

function getAverageScore(analytics: GroupAnalytics) {
  const resultCount = analytics.leaderboardRows.reduce(
    (sum, row) => sum + row.gamesPlayed,
    0,
  );

  if (resultCount === 0) return null;

  return (
    analytics.leaderboardRows.reduce(
      (sum, row) => sum + row.averageScore * row.gamesPlayed,
      0,
    ) / resultCount
  );
}

export function GroupInsightsDashboard(props: {
  analytics: GroupAnalytics;
  children?: ReactNode;
  currentUserCanonicalId?: string;
  extended: ExtendedGroupAnalytics;
  focusPeople: CrossGroupFocusPerson[];
  groupId?: string;
  initialHiddenCombinationPlayerIds?: string[];
  mapAwardGroups?: MapAwardGroup[];
  overallExtended: ExtendedGroupAnalytics;
  sharedGameRows?: SharedGameResultRow[];
}) {
  const {
    analytics: baseAnalytics,
    children,
    currentUserCanonicalId,
    extended: baseExtended,
    focusPeople,
    groupId,
    initialHiddenCombinationPlayerIds = [],
    mapAwardGroups = [],
    overallExtended,
    sharedGameRows = [],
  } = props;
  const [draftPlayerIds, setDraftPlayerIds] = useState<string[]>([]);
  const [analyzedPlayerIds, setAnalyzedPlayerIds] = useState<string[]>([]);
  const [hiddenPlayerIds, setHiddenPlayerIds] = useState<string[]>(
    initialHiddenCombinationPlayerIds,
  );
  const [, startPreferenceTransition] = useTransition();
  const playerOptions = useMemo(
    () =>
      buildPlayerCombinationOptions({
        currentUserCanonicalId,
        focusPeople,
        rows: sharedGameRows,
      }),
    [currentUserCanonicalId, focusPeople, sharedGameRows],
  );
  const hiddenPlayerSet = new Set(hiddenPlayerIds);
  const visiblePlayerOptions = playerOptions.filter(
    (option) => !hiddenPlayerSet.has(option.canonicalId),
  );
  const hiddenPlayerOptions = playerOptions.filter((option) =>
    hiddenPlayerSet.has(option.canonicalId),
  );
  const draftPlayerSet = new Set(draftPlayerIds);
  const combinationResult = useMemo(
    () =>
      buildPlayerCombinationAnalytics({
        currentUserCanonicalId,
        focusPeople,
        mapAwardGroups,
        rows: sharedGameRows,
        selectedCanonicalIds: analyzedPlayerIds,
        sourceExtended: overallExtended,
      }),
    [
      analyzedPlayerIds,
      currentUserCanonicalId,
      focusPeople,
      mapAwardGroups,
      overallExtended,
      sharedGameRows,
    ],
  );
  const hasCombinationFilter = analyzedPlayerIds.length > 0;
  const analytics = hasCombinationFilter
    ? combinationResult.analytics
    : baseAnalytics;
  const extended = hasCombinationFilter
    ? combinationResult.extended
    : baseExtended;
  const selectedNames = playerOptions
    .filter((option) => analyzedPlayerIds.includes(option.canonicalId))
    .map((option) => option.displayName);
  const gameCount = hasCombinationFilter
    ? combinationResult.matchingGameCount
    : getBaseGameCount(analytics);
  const resultCount = hasCombinationFilter
    ? combinationResult.matchingResultCount
    : getBaseResultCount(analytics);
  const averageScore = getAverageScore(analytics);
  const leaderboardData = analytics.leaderboardRows.slice(0, 8).map((row) => ({
    name: row.playerName,
    weightedScore: Number(row.weightedScore.toFixed(3)),
  }));
  const scoreSourceRows = buildScoreSourceRows(analytics.scoreAverages);
  const styleRows = analytics.groupStylePerformanceRows.slice(0, 8).map((row) => ({
    gamesPlayed: row.gamesPlayed,
    name: row.styleCode
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    winRate: Math.round(row.winRate * 100),
  }));
  const hasAnalytics =
    analytics.leaderboardRows.length > 0 ||
    analytics.headToHeadRows.length > 0 ||
    analytics.lineupEffectRows.length > 0 ||
    analytics.scoreAverages !== null ||
    extended.groupMapPerformanceRows.length > 0;

  const toggleDraftPlayer = (canonicalId: string) => {
    setDraftPlayerIds((current) =>
      current.includes(canonicalId)
        ? current.filter((id) => id !== canonicalId)
        : [...current, canonicalId],
    );
  };

  const hidePlayer = (canonicalId: string) => {
    setHiddenPlayerIds((current) =>
      current.includes(canonicalId) ? current : [...current, canonicalId],
    );
    setDraftPlayerIds((current) => current.filter((id) => id !== canonicalId));
    setAnalyzedPlayerIds((current) =>
      current.filter((id) => id !== canonicalId),
    );

    if (groupId) {
      startPreferenceTransition(() =>
        saveHiddenGroupInsightPlayer(groupId, canonicalId, true),
      );
    }
  };

  const restorePlayer = (canonicalId: string) => {
    setHiddenPlayerIds((current) =>
      current.filter((id) => id !== canonicalId),
    );

    if (groupId) {
      startPreferenceTransition(() =>
        saveHiddenGroupInsightPlayer(groupId, canonicalId, false),
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ChartFrame
        description="Choose the players whose shared games should define the group analysis. Leave every box clear to use the currently selected group's complete history."
        title="Group Analysis Focus"
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setAnalyzedPlayerIds(
              visiblePlayerOptions
                .filter((option) => draftPlayerSet.has(option.canonicalId))
                .map((option) => option.canonicalId),
            );
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="tm-data-label">Players</p>
            <div className="flex gap-2">
              <button
                className="tm-button-secondary px-4 py-2 text-xs"
                onClick={() => {
                  setDraftPlayerIds([]);
                  setAnalyzedPlayerIds([]);
                }}
                type="button"
              >
                Full group
              </button>
              <button className="tm-button-primary px-4 py-2 text-xs" type="submit">
                Analyze selection
              </button>
            </div>
          </div>

          {visiblePlayerOptions.length === 0 ? (
            <p className="tm-muted-copy text-sm">
              Finalized shared players will appear after games are logged.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visiblePlayerOptions.map((option, index) => {
                const inputId = `group-focus-${index}-${option.canonicalId.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;

                return (
                  <div
                    className="flex min-h-12 items-center gap-2 rounded border border-white/10 bg-black/10 px-3 py-2 text-sm text-stone-100"
                    key={option.canonicalId}
                  >
                    <input
                      checked={draftPlayerSet.has(option.canonicalId)}
                      className="h-4 w-4 accent-[var(--tm-accent)]"
                      id={inputId}
                      onChange={() => toggleDraftPlayer(option.canonicalId)}
                      type="checkbox"
                    />
                    <label className="min-w-0 flex-1 truncate" htmlFor={inputId}>
                      {option.displayName}
                    </label>
                    <span className="tm-muted-copy shrink-0 text-xs">
                      {option.gamesPlayed}
                    </span>
                    <button
                      aria-label={`Hide ${option.displayName} from group selection`}
                      className="tm-button-secondary shrink-0 px-2 py-1 text-xs"
                      onClick={() => hidePlayer(option.canonicalId)}
                      title={`Hide ${option.displayName} from group selection`}
                      type="button"
                    >
                      <EyeOff aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {hiddenPlayerOptions.length > 0 ? (
            <details className="rounded border border-white/10 bg-black/10 px-3 py-2">
              <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-[var(--tm-muted)]">
                Hidden players ({hiddenPlayerOptions.length})
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {hiddenPlayerOptions.map((option) => (
                  <div
                    className="flex min-h-10 items-center gap-2 rounded border border-white/10 px-3 py-2 text-sm text-stone-100"
                    key={option.canonicalId}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {option.displayName}
                    </span>
                    <span className="tm-muted-copy shrink-0 text-xs">
                      {option.gamesPlayed}
                    </span>
                    <button
                      aria-label={`Add ${option.displayName} back to group selection`}
                      className="tm-button-secondary shrink-0 px-2 py-1 text-xs"
                      onClick={() => restorePlayer(option.canonicalId)}
                      title={`Add ${option.displayName} back to group selection`}
                      type="button"
                    >
                      <Plus aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {children ? (
            <div>
              <p className="tm-data-label">Selected Group</p>
              <div className="mt-2">{children}</div>
            </div>
          ) : null}

          <span className="tm-coverage-badge w-fit">
            {hasCombinationFilter
              ? `${gameCount} shared ${gameCount === 1 ? 'game' : 'games'} containing ${selectedNames.join(', ')} | ${resultCount} player results`
              : `${gameCount} finalized group ${gameCount === 1 ? 'game' : 'games'} | ${resultCount} player results`}
          </span>
        </form>
      </ChartFrame>

      {!hasAnalytics ? (
        <ChartFrame title="Group Analytics">
          <p className="tm-muted-copy text-sm">
            Finalize a few games to unlock the full group leaderboard, matchup,
            scoring, map, objective, and coverage analysis.
          </p>
        </ChartFrame>
      ) : (
        <>
          <ChartFrame
            description="A group-level summary of the finalized games in the current focus."
            title="Group Overview"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="tm-stat-card">
                <p className="tm-data-label">Games</p>
                <p className="mt-2 text-2xl font-semibold text-stone-100">{gameCount}</p>
              </article>
              <article className="tm-stat-card">
                <p className="tm-data-label">Player results</p>
                <p className="mt-2 text-2xl font-semibold text-stone-100">{resultCount}</p>
              </article>
              <article className="tm-stat-card">
                <p className="tm-data-label">Players ranked</p>
                <p className="mt-2 text-2xl font-semibold text-stone-100">
                  {analytics.leaderboardRows.length}
                </p>
              </article>
              <article className="tm-stat-card">
                <p className="tm-data-label">Average score</p>
                <p className="mt-2 text-2xl font-semibold text-stone-100">
                  {formatAverage(averageScore)}
                </p>
              </article>
            </div>
          </ChartFrame>

          <ChartFrame
            description="Group ranking based on win rate, placement, and point differential."
            title={hasCombinationFilter ? 'Selection Leaderboard' : 'Weighted Group Leaderboard'}
          >
            {leaderboardData.length === 0 ? (
              <p className="tm-muted-copy text-sm">No leaderboard rows are available.</p>
            ) : (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer height={280} width="100%">
                  <BarChart
                    data={leaderboardData}
                    margin={{ bottom: 44, left: 0, right: 12, top: 12 }}
                  >
                    <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                    <XAxis
                      angle={-20}
                      dataKey="name"
                      height={72}
                      textAnchor="end"
                      tick={chartAxisTick}
                    />
                    <YAxis tick={chartAxisTick} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar
                      dataKey="weightedScore"
                      fill={chartSeriesColors.default}
                      radius={[10, 10, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid gap-3 md:grid-cols-2">
                  {analytics.leaderboardRows.slice(0, 8).map((row, index) => (
                    <article className="tm-stat-card" key={row.playerId}>
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-stone-100">
                          {index + 1}. {row.playerName}
                        </h3>
                        <p className="tm-accent-copy text-sm">
                          {formatAverage(row.weightedScore)}
                        </p>
                      </div>
                      <p className="tm-muted-copy mt-2 text-sm">
                        {formatPercent(row.winRate)} wins | avg place{' '}
                        {formatAverage(row.averagePlacement)} | avg score{' '}
                        {formatAverage(row.averageScore)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </ChartFrame>

          <ChartFrame
            description="Average points by scoring source across the group focus."
            title="Group Scoring Profile"
          >
            {scoreSourceRows.length === 0 ? (
              <p className="tm-muted-copy text-sm">
                Score-source averages will appear after finalized games are logged.
              </p>
            ) : (
              <ResponsiveContainer height={360} width="100%">
                <BarChart
                  data={scoreSourceRows}
                  layout="vertical"
                  margin={{ bottom: 12, left: 58, right: 12, top: 12 }}
                >
                  <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                  <XAxis tick={chartAxisTick} type="number" />
                  <YAxis
                    dataKey="label"
                    tick={chartAxisTick}
                    type="category"
                    width={105}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar
                    dataKey="value"
                    fill={chartSeriesColors.accent}
                    radius={[0, 10, 10, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartFrame>

          <ChartFrame
            description="Direct matchup records among the players in the current group focus."
            title="Group Head-to-Head"
          >
            {analytics.headToHeadRows.length === 0 ? (
              <p className="tm-muted-copy text-sm">
                Head-to-head comparisons will appear after repeated matchups.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {analytics.headToHeadRows.slice(0, 10).map((row) => (
                  <article
                    className="tm-stat-card"
                    key={`${row.leftPlayerId}-${row.rightPlayerId}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">
                        {row.leftPlayerName} vs {row.rightPlayerName}
                      </h3>
                      <p className="tm-accent-copy text-sm">
                        {formatAverage(row.averageScoreDifferential)} pts
                      </p>
                    </div>
                    <p className="tm-muted-copy mt-2 text-sm">
                      {row.leftWins}-{row.rightWins}-{row.ties} over {row.gamesPlayed}{' '}
                      games
                    </p>
                  </article>
                ))}
              </div>
            )}
          </ChartFrame>

          <ChartFrame
            description="How each player's results change with different opponents at the table."
            title="Group Lineup Effects"
          >
            {analytics.lineupEffectRows.length === 0 ? (
              <p className="tm-muted-copy text-sm">
                Lineup effects will appear after repeated group combinations.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {analytics.lineupEffectRows.slice(0, 10).map((row) => (
                  <article
                    className="tm-stat-card"
                    key={`${row.playerId}-${row.lineupLabel}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">{row.playerName}</h3>
                      <p className="tm-accent-copy text-sm">
                        {formatPercent(row.winRate)}
                      </p>
                    </div>
                    <p className="tm-muted-copy mt-2 text-sm">
                      vs {row.lineupLabel} | {row.gamesPlayed} games | avg{' '}
                      {formatAverage(row.averageScore)} points
                    </p>
                  </article>
                ))}
              </div>
            )}
          </ChartFrame>

          <ChartFrame
            description="The inferred styles that perform best across the current group focus."
            title="Group Style Performance"
          >
            {styleRows.length === 0 ? (
              <p className="tm-muted-copy text-sm">
                Style performance will appear once inferred styles are available.
              </p>
            ) : (
              <ResponsiveContainer height={280} width="100%">
                <BarChart
                  data={styleRows}
                  margin={{ bottom: 44, left: 0, right: 12, top: 12 }}
                >
                  <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                  <XAxis
                    angle={-20}
                    dataKey="name"
                    height={72}
                    textAnchor="end"
                    tick={chartAxisTick}
                  />
                  <YAxis domain={[0, 100]} tick={chartAxisTick} unit="%" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar
                    dataKey="winRate"
                    fill={chartSeriesColors.greenery}
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartFrame>

          <PlacementDistributionChart rows={extended.placementDistributionRows} />

          <TableSizeChart
            focusPlayerId={null}
            focusPlayerName={null}
            rows={extended.playerCountPerformanceRows}
          />

          <GameLengthSection
            distributionRows={extended.generationDistributionRows}
            focusPlayerId={null}
            focusPlayerName={null}
            performanceRows={extended.gameLengthPerformanceRows}
          />

          <MapPerformanceSection
            focusPlayerId={null}
            focusPlayerName={null}
            groupRows={extended.groupMapPerformanceRows}
            mapGroups={mapAwardGroups}
            playerRows={extended.playerMapPerformanceRows}
            tileRows={extended.tilePlacementRows}
          />

          <MilestoneEconomicsSection
            focusPlayerId={null}
            focusPlayerName={null}
            groupRows={extended.milestoneEconomicsRows}
            playerRows={extended.playerMilestoneClaimRows}
          />

          <AwardMapOverview
            mapGroups={mapAwardGroups}
            rows={deduplicateAwardOutcomeRows(extended.awardOutcomeRows)}
          />

          <AwardEconomicsSection
            defaultScope="group"
            focusPlayerName={null}
            groupFocusPlayerId={null}
            groupMatrixRows={extended.awardFunderWinnerRows}
            groupOutcomeRows={deduplicateAwardOutcomeRows(
              extended.awardOutcomeRows,
            )}
            groupPlayerAwardRows={extended.playerAwardFundingRows}
            overallFocusPlayerId={null}
            overallMatrixRows={overallExtended.awardFunderWinnerRows}
            overallOutcomeRows={deduplicateAwardOutcomeRows(
              overallExtended.awardOutcomeRows,
            )}
            overallPlayerAwardRows={overallExtended.playerAwardFundingRows}
          />

          <GamePaceSection rows={extended.generationPaceRows} />

          <BoardHeatmapSection
            mapGroups={mapAwardGroups}
            rows={extended.tilePlacementRows}
            title="Group Board Heatmap"
          />

          <ChartFrame
            description="How consistently optional game details were recorded for this group focus."
            title="Group Data Coverage"
          >
            {analytics.coverage ? (
              <div className="flex flex-wrap gap-2">
                <CoverageBadge
                  label="Full card breakdown"
                  value={analytics.coverage.cardBreakdownCoverage}
                />
                <CoverageBadge
                  label="Microbe coverage"
                  value={analytics.coverage.microbeCoverage}
                />
                <CoverageBadge
                  label="Animal coverage"
                  value={analytics.coverage.animalCoverage}
                />
                <CoverageBadge
                  label="Jovian coverage"
                  value={analytics.coverage.jovianCoverage}
                />
                <CoverageBadge
                  label="Declared style coverage"
                  value={analytics.coverage.declaredStyleCoverage}
                />
                <CoverageBadge
                  label="Key-card coverage"
                  value={analytics.coverage.keyCardCoverage}
                />
              </div>
            ) : (
              <p className="tm-muted-copy text-sm">
                Coverage metrics will appear after finalized games are logged.
              </p>
            )}
          </ChartFrame>
        </>
      )}
    </div>
  );
}
