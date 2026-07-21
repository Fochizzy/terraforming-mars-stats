'use client';

import { type ReactNode, useMemo, useState, useTransition } from 'react';
import { EyeOff, Plus } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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
  CoverageRow,
  CrossGroupFocusBundle,
  CrossGroupFocusPerson,
  FocusedHeadToHeadRow,
  GroupAnalytics,
  GroupHeadToHeadRow,
  GroupInteractionRow,
  GroupStylePerformanceRow,
  LeaderboardRow,
  ScoreSourceAverages,
  SharedGameResultRow,
  TrendRow,
} from '@/lib/db/analytics-repo';
import type {
  CardOutcomeRow,
  ExtendedGroupAnalytics,
  GameLengthPerformanceRow,
  GenerationPaceRow,
  PlayerMapPerformanceRow,
  TilePlacementRow,
} from '@/lib/db/extended-analytics-repo';
import type { MapAwardGroup } from '@/lib/db/reference-repo';
import type {
  FinalTerraformingActionStat,
  SelectionDialogData,
  SelectionStats,
} from '@/lib/db/selection-stats-repo';
import { GlossaryLink } from '@/features/glossary/glossary-link';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import { saveHiddenGroupInsightPlayer } from '@/app/(app)/insights/group/actions';
import { buildInsightCards, type InsightCard } from './build-insight-cards';
import { PlayerComparisonSummary } from './player-comparison-summary';
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
import { ScoreProfilePanel } from './score-profile-panel';
import { ScoreSourceRadar } from './score-source-radar';
import { SelectionPairLabel } from './selection-name-link';
import {
  StyleEffectivenessPanel,
  type StyleEffectivenessScopeInput,
} from './style-effectiveness';
import { TableSizeChart } from './table-size-chart';
import { TagOutcomesSection } from './tag-outcomes-section';
import {
  buildPlayerCombinationAnalytics,
  buildPlayerCombinationOptions,
} from './player-combination-analytics';

type InsightsDashboardProps = {
  analytics: GroupAnalytics;
  children?: ReactNode;
  currentUserCanonicalId?: string;
  extended: ExtendedGroupAnalytics;
  finalTerraformingActionStats?: FinalTerraformingActionStat[];
  focusPeople: CrossGroupFocusPerson[];
  groupId?: string;
  initialHiddenCombinationPlayerIds?: string[];
  mapAwardGroups?: MapAwardGroup[];
  overallAnalytics: GroupAnalytics;
  overallExtended: ExtendedGroupAnalytics;
  personalSelectionStats?: SelectionStats;
  selectionDialogData?: SelectionDialogData;
  sharedGameRows?: SharedGameResultRow[];
  scopeMode?: 'all' | 'group' | 'individual';
  styleEffectivenessScopes?: StyleEffectivenessScopeInput[];
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

type FocusScope = 'group' | 'overall';

type OverallLeaderboardRow = LeaderboardRow & {
  canonicalId: string;
};

type ExpandedIndividualMetric = {
  confidenceLabel: string;
  metrics: Array<{
    detail?: string;
    label: string;
    value: string;
  }>;
  sampleSize: number;
  summary: string;
  title: string;
};

const scoreSourceKeys = [
  'averageAnimalPoints',
  'averageAwardPoints',
  'averageCardPoints',
  'averageCitiesPoints',
  'averageGreeneryPoints',
  'averageJovianPoints',
  'averageMicrobePoints',
  'averageMilestonePoints',
  'averageOtherCardPoints',
  'averageTrPoints',
] as const satisfies ReadonlyArray<keyof ScoreSourceAverages>;

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

function roundNumber(value: number, digits = 3) {
  return Number(value.toFixed(digits));
}

type LeaderboardDatum = {
  isFocused: boolean;
  name: string;
  rank: number;
  weightedScore: number;
  winRate: number;
};

function LeaderboardTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: LeaderboardDatum }>;
}) {
  const datum = payload?.[0]?.payload;

  if (!active || !datum) {
    return null;
  }

  return (
    <div className="px-3 py-2 text-xs" style={chartTooltipStyle}>
      <p className="font-semibold">
        #{datum.rank} {datum.name}
        {datum.isFocused ? ' · focus' : ''}
      </p>
      <p className="tm-muted-copy mt-1">
        Weighted score {datum.weightedScore.toFixed(3)}
      </p>
      <p className="tm-muted-copy">Win rate {datum.winRate}%</p>
    </div>
  );
}

function weightedAverage(entries: Array<{ value: number; weight: number }>) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return null;
  }

  return (
    entries.reduce((sum, entry) => sum + entry.value * entry.weight, 0) /
    totalWeight
  );
}

function buildOverallLeaderboardRows(
  people: CrossGroupFocusPerson[],
): OverallLeaderboardRow[] {
  return people
    .flatMap((person) => {
      if (!person.bundle.performance) {
        return [];
      }

      return [
        {
          ...person.bundle.performance,
          canonicalId: person.canonicalId,
          playerId: person.canonicalId,
          playerName: person.displayName,
        },
      ];
    })
    .sort(
      (left, right) =>
        right.weightedScore - left.weightedScore ||
        right.gamesPlayed - left.gamesPlayed ||
        left.playerName.localeCompare(right.playerName),
    );
}

function buildOverallScoreAverages(
  people: CrossGroupFocusPerson[],
): ScoreSourceAverages | null {
  const entries = people
    .map((person) => ({
      averages: person.bundle.scoreAverages,
      weight: person.bundle.performance?.gamesPlayed ?? person.bundle.trendRows.length,
    }))
    .filter(
      (entry): entry is { averages: ScoreSourceAverages; weight: number } =>
        entry.averages !== null && entry.weight > 0,
    );

  if (entries.length === 0) {
    return null;
  }

  return scoreSourceKeys.reduce((averages, key) => {
    averages[key] = roundNumber(
      weightedAverage(
        entries.map((entry) => ({
          value: entry.averages[key],
          weight: entry.weight,
        })),
      ) ?? 0,
    );
    return averages;
  }, {} as ScoreSourceAverages);
}

function buildOverallCoverage(people: CrossGroupFocusPerson[]): CoverageRow | null {
  const entries = people
    .map((person) => ({
      coverage: person.bundle.coverage,
      weight:
        person.bundle.coverage?.finalizedGames ??
        person.bundle.performance?.gamesPlayed ??
        person.bundle.trendRows.length,
    }))
    .filter(
      (entry): entry is { coverage: CoverageRow; weight: number } =>
        entry.coverage !== null && entry.weight > 0,
    );

  if (entries.length === 0) {
    return null;
  }

  const coverageKeys = [
    'animalCoverage',
    'cardBreakdownCoverage',
    'declaredStyleCoverage',
    'jovianCoverage',
    'keyCardCoverage',
    'microbeCoverage',
  ] as const satisfies ReadonlyArray<
    keyof Pick<
      CoverageRow,
      | 'animalCoverage'
      | 'cardBreakdownCoverage'
      | 'declaredStyleCoverage'
      | 'jovianCoverage'
      | 'keyCardCoverage'
      | 'microbeCoverage'
    >
  >;

  const finalizedGames = entries.reduce(
    (sum, entry) => sum + entry.coverage.finalizedGames,
    0,
  );
  const finalizedPlayerResults = entries.reduce(
    (sum, entry) => sum + entry.coverage.finalizedPlayerResults,
    0,
  );
  const aggregate: CoverageRow = {
    animalCoverage: 0,
    cardBreakdownCoverage: 0,
    declaredStyleCoverage: 0,
    finalizedGames,
    finalizedPlayerResults,
    groupId: 'all-shared-groups',
    jovianCoverage: 0,
    keyCardCoverage: 0,
    microbeCoverage: 0,
  };

  for (const key of coverageKeys) {
    aggregate[key] = roundNumber(
      weightedAverage(
        entries.map((entry) => ({
          value: entry.coverage[key],
          weight: entry.weight,
        })),
      ) ?? 0,
      4,
    );
  }

  return aggregate;
}

function buildOverallHeadToHeadRows(
  people: CrossGroupFocusPerson[],
): FocusedHeadToHeadRow[] {
  const rowsByPair = new Map<
    string,
    {
      differentialEntries: Array<{ value: number; weight: number }>;
      gamesPlayed: number;
      label: string;
      losses: number;
      ties: number;
      wins: number;
    }
  >();

  for (const person of people) {
    for (const row of person.bundle.headToHeadRows) {
      const labelParts = row.label.split(' vs ');
      const sortedParts =
        labelParts.length === 2 ? [...labelParts].sort() : [row.label];
      const pairKey = sortedParts.join(' vs ');
      const isReversed = labelParts.length === 2 && labelParts[0] !== sortedParts[0];

      if (rowsByPair.has(pairKey)) {
        continue;
      }

      const existing = rowsByPair.get(pairKey) ?? {
        differentialEntries: [],
        gamesPlayed: 0,
        label: pairKey,
        losses: 0,
        ties: 0,
        wins: 0,
      };

      existing.gamesPlayed += row.gamesPlayed;
      existing.wins += isReversed ? row.losses : row.wins;
      existing.losses += isReversed ? row.wins : row.losses;
      existing.ties += row.ties;
      existing.differentialEntries.push({
        value: isReversed
          ? row.averageScoreDifferential * -1
          : row.averageScoreDifferential,
        weight: row.gamesPlayed,
      });
      rowsByPair.set(pairKey, existing);
    }
  }

  return [...rowsByPair.values()]
    .map((row) => ({
      averageScoreDifferential: roundNumber(
        weightedAverage(row.differentialEntries) ?? 0,
      ),
      gamesPlayed: row.gamesPlayed,
      label: row.label,
      losses: row.losses,
      ties: row.ties,
      wins: row.wins,
    }))
    .sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        Math.abs(right.averageScoreDifferential) -
          Math.abs(left.averageScoreDifferential) ||
        left.label.localeCompare(right.label),
    );
}

function buildOverallFocusBundle(
  people: CrossGroupFocusPerson[],
): CrossGroupFocusBundle | null {
  const trendRows = people
    .flatMap((person) => person.bundle.trendRows)
    .sort(
      (left, right) =>
        left.playedOn.localeCompare(right.playedOn) ||
        left.playerName.localeCompare(right.playerName),
    );
  const bundle: CrossGroupFocusBundle = {
    coverage: buildOverallCoverage(people),
    headToHeadRows: buildOverallHeadToHeadRows(people),
    performance: null,
    scoreAverages: buildOverallScoreAverages(people),
    trendRows,
  };

  if (
    bundle.coverage ||
    bundle.headToHeadRows.length > 0 ||
    bundle.scoreAverages ||
    bundle.trendRows.length > 0
  ) {
    return bundle;
  }

  return null;
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

function confidenceForSample(sampleSize: number): InsightCard['confidence'] {
  if (sampleSize >= 5) {
    return 'high';
  }

  if (sampleSize >= 2) {
    return 'medium';
  }

  return 'low';
}

// When a focused person lives outside the active group we can't reuse the
// group-keyed insight cards, so build a small set straight from their
// cross-group bundle instead.
function buildCrossGroupFocusCards(person: CrossGroupFocusPerson): InsightCard[] {
  const cards: InsightCard[] = [];
  const performance = person.bundle.performance;

  if (performance) {
    cards.push({
      body: `${performance.wins} wins in ${performance.gamesPlayed} games (${formatPercent(
        performance.winRate,
      )}), averaging ${formatAverage(performance.averageScore)} points and ${formatAverage(
        performance.averagePlacement,
      )} place across every shared group.`,
      confidence: confidenceForSample(performance.gamesPlayed),
      sampleSize: performance.gamesPlayed,
      title: `${person.displayName} overall`,
      tone: 'performance',
    });
  }

  const topMatchup = person.bundle.headToHeadRows[0];

  if (topMatchup) {
    cards.push({
      body: `${topMatchup.label}: ${topMatchup.wins}-${topMatchup.losses}-${topMatchup.ties} over ${topMatchup.gamesPlayed} games with a ${formatAverage(
        topMatchup.averageScoreDifferential,
      )} average point margin.`,
      confidence: confidenceForSample(topMatchup.gamesPlayed),
      sampleSize: topMatchup.gamesPlayed,
      title: 'Most-played matchup',
      tone: 'rivalry',
    });
  }

  return cards;
}

function buildOverallFocusCards(
  bundle: CrossGroupFocusBundle,
  leaderboardRows: OverallLeaderboardRow[],
): InsightCard[] {
  const cards: InsightCard[] = [];
  const topPlayer = leaderboardRows[0] ?? null;

  if (topPlayer) {
    cards.push({
      body: `${topPlayer.playerName} leads your shared-game field with a ${formatPercent(
        topPlayer.winRate,
      )} win rate, ${formatAverage(
        topPlayer.weightedScore,
      )} weighted score, and ${formatAverage(
        topPlayer.averageScore,
      )} average points across ${topPlayer.gamesPlayed} finalized games.`,
      confidence: confidenceForSample(topPlayer.gamesPlayed),
      sampleSize: topPlayer.gamesPlayed,
      title: 'Overall Leader',
      tone: 'performance',
    });
  }

  if (bundle.trendRows.length > 0) {
    const sharedGames = new Set(bundle.trendRows.map((row) => row.gameId)).size;

    cards.push({
      body: `${bundle.trendRows.length} finalized player results across ${sharedGames} games are included in this overall view.`,
      confidence: confidenceForSample(sharedGames),
      sampleSize: sharedGames,
      title: 'Shared Game Sample',
      tone: 'coverage',
    });
  }

  const topMatchup = bundle.headToHeadRows[0] ?? null;

  if (topMatchup) {
    cards.push({
      body: `${topMatchup.label}: ${topMatchup.wins}-${topMatchup.losses}-${topMatchup.ties} over ${topMatchup.gamesPlayed} shared-game matchups with a ${formatAverage(
        Math.abs(topMatchup.averageScoreDifferential),
      )}-point average score swing.`,
      confidence: confidenceForSample(topMatchup.gamesPlayed),
      sampleSize: topMatchup.gamesPlayed,
      title: 'Top Overall Matchup',
      tone: 'rivalry',
    });
  }

  return cards;
}

function averageValues(values: number[]) {
  const finiteValues = values.filter(Number.isFinite);

  if (finiteValues.length === 0) {
    return null;
  }

  return (
    finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length
  );
}

function sumValues(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}

function standardDeviationValues(values: number[]) {
  const average = averageValues(values);

  if (average === null) {
    return null;
  }

  const variance = averageValues(values.map((value) => (value - average) ** 2));

  return variance === null ? null : Math.sqrt(variance);
}

function formatMetricAverage(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'n/a';
  }

  return formatAverage(value);
}

function formatMetricDelta(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'n/a';
  }

  return `${value >= 0 ? '+' : ''}${formatAverage(value)}`;
}

function formatMetricPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'n/a';
  }

  return formatPercent(value);
}

function formatMetricPercentDelta(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'n/a';
  }

  const points = Math.round(value * 100);

  return `${points >= 0 ? '+' : ''}${points} pts`;
}

function expandedMetricEntry(
  label: string,
  value: string,
  detail?: string,
): ExpandedIndividualMetric['metrics'][number] {
  return detail ? { detail, label, value } : { label, value };
}

function expandedMetric(input: Omit<ExpandedIndividualMetric, 'sampleSize'> & {
  sampleSize?: number;
}): ExpandedIndividualMetric {
  return {
    ...input,
    sampleSize: input.sampleSize ?? 0,
  };
}

const individualScoreSources = [
  { getValue: (row: SharedGameResultRow) => row.trPoints, label: 'TR' },
  { getValue: (row: SharedGameResultRow) => row.cardPointsTotal, label: 'Cards' },
  {
    getValue: (row: SharedGameResultRow) => row.greeneryPoints,
    label: 'Greenery',
  },
  { getValue: (row: SharedGameResultRow) => row.citiesPoints, label: 'Cities' },
  {
    getValue: (row: SharedGameResultRow) => row.milestonePoints,
    label: 'Milestones',
  },
  { getValue: (row: SharedGameResultRow) => row.awardPoints, label: 'Awards' },
  {
    getValue: (row: SharedGameResultRow) => row.cardPointsJovian ?? 0,
    label: 'Jovian',
  },
  {
    getValue: (row: SharedGameResultRow) => row.cardPointsMicrobes ?? 0,
    label: 'Microbe',
  },
  {
    getValue: (row: SharedGameResultRow) => row.cardPointsAnimals ?? 0,
    label: 'Animal',
  },
] as const;

function getGenerationBucket(generationCount: number) {
  if (generationCount <= 9) {
    return { code: 'short', label: 'Short' };
  }

  if (generationCount >= 12) {
    return { code: 'long', label: 'Long' };
  }

  return { code: 'standard', label: 'Standard' };
}

function getWinRate(rows: Array<{ isWinner: boolean }>) {
  if (rows.length === 0) {
    return null;
  }

  return rows.filter((row) => row.isWinner).length / rows.length;
}

function matchesFocus(playerId: string | null | undefined, focusPlayerId: string | null) {
  return !focusPlayerId || playerId === focusPlayerId;
}

function filterPaceRows(
  rows: GenerationPaceRow[],
  focusPlayerId: string | null,
) {
  return rows.filter((row) => matchesFocus(row.playerId, focusPlayerId));
}

function getActionCount(row: GenerationPaceRow) {
  return (
    row.awardsFunded +
    row.cardsPlayed +
    row.citiesPlaced +
    row.greeneriesPlaced +
    row.milestonesClaimed
  );
}

function getTerraformingActionCount(row: GenerationPaceRow) {
  return row.citiesPlaced + row.greeneriesPlaced + row.tilesPlaced;
}

function getMostCommonAction(rows: GenerationPaceRow[]) {
  const actionCounts = new Map<string, number>();

  for (const row of rows) {
    actionCounts.set('Cards', (actionCounts.get('Cards') ?? 0) + row.cardsPlayed);
    actionCounts.set(
      'Greeneries',
      (actionCounts.get('Greeneries') ?? 0) + row.greeneriesPlaced,
    );
    actionCounts.set('Cities', (actionCounts.get('Cities') ?? 0) + row.citiesPlaced);
    actionCounts.set(
      'Milestones',
      (actionCounts.get('Milestones') ?? 0) + row.milestonesClaimed,
    );
    actionCounts.set(
      'Awards',
      (actionCounts.get('Awards') ?? 0) + row.awardsFunded,
    );
  }

  return [...actionCounts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0] ?? null;
}

function buildWinConditionDeltaMetric(
  targetRows: SharedGameResultRow[],
): ExpandedIndividualMetric {
  const winRows = targetRows.filter((row) => row.isWinner);
  const lossRows = targetRows.filter((row) => !row.isWinner);
  const rows = individualScoreSources.map((source) => {
    const winAverage = averageValues(winRows.map(source.getValue));
    const lossAverage = averageValues(lossRows.map(source.getValue));

    return {
      delta:
        winAverage !== null && lossAverage !== null ? winAverage - lossAverage : null,
      label: source.label,
      lossAverage,
      winAverage,
    };
  });
  const bestLift =
    [...rows]
      .filter((row) => row.delta !== null)
      .sort((left, right) => (right.delta ?? 0) - (left.delta ?? 0))[0] ?? null;
  const lossDrag =
    [...rows]
      .filter((row) => row.delta !== null)
      .sort((left, right) => (left.delta ?? 0) - (right.delta ?? 0))[0] ?? null;
  const averageWinScore = averageValues(winRows.map((row) => row.totalPoints));
  const averageLossScore = averageValues(lossRows.map((row) => row.totalPoints));

  return expandedMetric({
    confidenceLabel:
      winRows.length > 0 && lossRows.length > 0
        ? 'Compares final score-source averages in wins against losses.'
        : 'Needs both wins and losses to show a true win/loss delta.',
    metrics: [
      expandedMetricEntry(
        'Top win lift',
        bestLift?.label ?? 'n/a',
        bestLift ? `${formatMetricDelta(bestLift.delta)} points in wins` : undefined,
      ),
      expandedMetricEntry(
        'Loss drag',
        lossDrag?.label ?? 'n/a',
        lossDrag ? `${formatMetricDelta(lossDrag.delta)} points in wins` : undefined,
      ),
      expandedMetricEntry('Avg win score', formatMetricAverage(averageWinScore)),
      expandedMetricEntry('Avg loss score', formatMetricAverage(averageLossScore)),
    ],
    sampleSize: targetRows.length,
    summary:
      bestLift && bestLift.delta !== null
        ? `${bestLift.label} is the clearest scoring separator, moving ${formatMetricDelta(
            bestLift.delta,
          )} points from losses to wins.`
        : 'Score-source rows are ready, but the selected slice needs both wins and losses for a sharper comparison.',
    title: 'Win Condition Delta',
  });
}

function buildGameLengthFitMetric(
  targetRows: SharedGameResultRow[],
  fallbackRows: GameLengthPerformanceRow[],
  focusPlayerId: string | null,
): ExpandedIndividualMetric {
  const grouped = new Map<
    string,
    { label: string; rows: SharedGameResultRow[] }
  >();

  for (const row of targetRows) {
    const bucket = getGenerationBucket(row.generationCount);
    const existing = grouped.get(bucket.code) ?? { label: bucket.label, rows: [] };
    existing.rows.push(row);
    grouped.set(bucket.code, existing);
  }

  const derivedRows = [...grouped.entries()].map(([code, entry]) => {
    const averageScore = averageValues(entry.rows.map((row) => row.totalPoints));
    const averageGenerationCount = averageValues(
      entry.rows.map((row) => row.generationCount),
    );

    return {
      averagePointsPerGeneration:
        averageScore !== null && averageGenerationCount !== null
          ? averageScore / averageGenerationCount
          : null,
      averageScore,
      gamesPlayed: entry.rows.length,
      label: entry.label,
      winRate: getWinRate(entry.rows),
      wins: entry.rows.filter((row) => row.isWinner).length,
      code,
    };
  });
  const extendedRows =
    derivedRows.length > 0
      ? derivedRows
      : fallbackRows
          .filter((row) => matchesFocus(row.playerId, focusPlayerId))
          .map((row) => ({
            averagePointsPerGeneration: row.averagePointsPerGeneration,
            averageScore: row.averageScore,
            code: row.lengthBucket,
            gamesPlayed: row.gamesPlayed,
            label: humanizeStyleCode(row.lengthBucket),
            winRate: row.winRate,
            wins: row.wins,
          }));
  const best =
    [...extendedRows].sort(
      (left, right) =>
        (right.winRate ?? -1) - (left.winRate ?? -1) ||
        (right.averagePointsPerGeneration ?? -1) -
          (left.averagePointsPerGeneration ?? -1),
    )[0] ?? null;
  const weakest =
    [...extendedRows].sort(
      (left, right) =>
        (left.winRate ?? 2) - (right.winRate ?? 2) ||
        (left.averagePointsPerGeneration ?? Infinity) -
          (right.averagePointsPerGeneration ?? Infinity),
    )[0] ?? null;
  const averageGenerationCount = averageValues(
    targetRows.map((row) => row.generationCount),
  );

  return expandedMetric({
    confidenceLabel:
      extendedRows.length > 0
        ? 'Buckets finalized games into short, standard, and long generation lengths.'
        : 'Needs finalized games with generation counts.',
    metrics: [
      expandedMetricEntry('Best length', best?.label ?? 'n/a'),
      expandedMetricEntry('Weakest length', weakest?.label ?? 'n/a'),
      expandedMetricEntry(
        'Best win rate',
        formatMetricPercent(best?.winRate ?? null),
      ),
      expandedMetricEntry('Avg generations', formatMetricAverage(averageGenerationCount)),
    ],
    sampleSize: targetRows.length,
    summary: best
      ? `${best.label} games fit best so far, with ${formatMetricPercent(
          best.winRate,
        )} wins and ${formatMetricAverage(
          best.averagePointsPerGeneration,
        )} points per generation.`
      : 'Game length fit will appear once finalized games include generation counts.',
    title: 'Game Length Fit',
  });
}

function buildOpeningTempoMetric(
  generationPaceRows: GenerationPaceRow[],
  focusPlayerId: string | null,
): ExpandedIndividualMetric {
  const earlyRows = filterPaceRows(generationPaceRows, focusPlayerId).filter(
    (row) => row.generationNumber <= 3,
  );
  const gameCount = new Set(earlyRows.map((row) => row.gameId)).size;
  const cardsPerGame =
    gameCount > 0 ? sumValues(earlyRows.map((row) => row.cardsPlayed)) / gameCount : null;
  const terraformingPerGame =
    gameCount > 0
      ? sumValues(earlyRows.map(getTerraformingActionCount)) / gameCount
      : null;
  const milestonesPerGame =
    gameCount > 0
      ? sumValues(earlyRows.map((row) => row.milestonesClaimed)) / gameCount
      : null;
  const mostCommonAction = getMostCommonAction(earlyRows);

  return expandedMetric({
    confidenceLabel:
      gameCount > 0
        ? 'Uses generation 1-3 card, tile, greenery, city, milestone, and award logs.'
        : 'Needs imported logs with generation-level actions.',
    metrics: [
      expandedMetricEntry('Cards / game', formatMetricAverage(cardsPerGame)),
      expandedMetricEntry(
        'Terraform / game',
        formatMetricAverage(terraformingPerGame),
      ),
      expandedMetricEntry('Milestones / game', formatMetricAverage(milestonesPerGame)),
      expandedMetricEntry('Opening lean', mostCommonAction?.[0] ?? 'n/a'),
    ],
    sampleSize: gameCount,
    summary:
      cardsPerGame !== null || terraformingPerGame !== null
        ? `Early tempo currently leans ${
            (cardsPerGame ?? 0) >= (terraformingPerGame ?? 0)
              ? 'card development'
              : 'board terraforming'
          }, based on the first three generations.`
        : 'Opening tempo will unlock as imported logs capture the first three generations.',
    title: 'Opening Tempo Profile',
  });
}

function buildEndgameConversionMetric({
  finalTerraformingActionStats,
  focusPlayerId,
  generationPaceRows,
  targetPlayerIds,
}: {
  finalTerraformingActionStats: FinalTerraformingActionStat[];
  focusPlayerId: string | null;
  generationPaceRows: GenerationPaceRow[];
  targetPlayerIds: Set<string> | null;
}): ExpandedIndividualMetric {
  const paceRows = filterPaceRows(generationPaceRows, focusPlayerId);
  const maxGenerationByGame = new Map<string, number>();

  for (const row of paceRows) {
    maxGenerationByGame.set(
      row.gameId,
      Math.max(maxGenerationByGame.get(row.gameId) ?? 0, row.generationNumber),
    );
  }

  const finalRows = paceRows.filter((row) => {
    const maxGeneration = maxGenerationByGame.get(row.gameId) ?? row.generationNumber;

    return row.generationNumber >= Math.max(1, maxGeneration - 1);
  });
  const gameCount = maxGenerationByGame.size;
  const actionsPerGame =
    gameCount > 0 ? sumValues(finalRows.map(getActionCount)) / gameCount : null;
  const terraformingPerGame =
    gameCount > 0
      ? sumValues(finalRows.map(getTerraformingActionCount)) / gameCount
      : null;
  const mostCommonAction = getMostCommonAction(finalRows);
  const actionStats = finalTerraformingActionStats.filter(
    (row) => !targetPlayerIds || targetPlayerIds.has(row.player_id),
  );
  const actionStat =
    [...actionStats].sort(
      (left, right) =>
        right.final_action_games - left.final_action_games ||
        (right.win_rate_delta ?? -Infinity) - (left.win_rate_delta ?? -Infinity),
    )[0] ?? null;

  return expandedMetric({
    confidenceLabel:
      gameCount > 0 || actionStat
        ? 'Uses final two logged generations plus final terraforming action stats when available.'
        : 'Needs imported logs with late-generation actions.',
    metrics: [
      expandedMetricEntry('Final actions / game', formatMetricAverage(actionsPerGame)),
      expandedMetricEntry(
        'Terraform / game',
        formatMetricAverage(terraformingPerGame),
      ),
      expandedMetricEntry(
        'Common closer',
        actionStat?.most_common_action_type ?? mostCommonAction?.[0] ?? 'n/a',
      ),
      expandedMetricEntry(
        'Closer win lift',
        formatMetricPercentDelta(actionStat?.win_rate_delta ?? null),
      ),
    ],
    sampleSize: Math.max(gameCount, actionStat?.imported_games ?? 0),
    summary:
      actionsPerGame !== null
        ? `Endgame conversion is averaging ${formatMetricAverage(
            actionsPerGame,
          )} logged actions across the final two generations.`
        : 'Endgame conversion will sharpen once final-generation action logs are available.',
    title: 'Endgame Conversion',
  });
}

function buildOpponentAdjustedMetric({
  allRows,
  focusedHeadToHeadRows,
  targetPlayerIds,
  targetRows,
}: {
  allRows: SharedGameResultRow[];
  focusedHeadToHeadRows: FocusedHeadToHeadRow[];
  targetPlayerIds: Set<string> | null;
  targetRows: SharedGameResultRow[];
}): ExpandedIndividualMetric {
  const rowsByGame = new Map<string, SharedGameResultRow[]>();

  for (const row of allRows) {
    const existing = rowsByGame.get(row.gameId) ?? [];
    existing.push(row);
    rowsByGame.set(row.gameId, existing);
  }

  const adjustedRows = targetRows.flatMap((row) => {
    const gameRows = rowsByGame.get(row.gameId) ?? [];
    const opponentRows = gameRows.filter((candidate) =>
      targetPlayerIds
        ? !targetPlayerIds.has(candidate.playerId)
        : candidate.playerId !== row.playerId,
    );
    const opponentAverage = averageValues(
      opponentRows.map((candidate) => candidate.totalPoints),
    );

    return opponentAverage === null
      ? []
      : [
          {
            isWinner: row.isWinner,
            opponentAverage,
            scoreEdge: row.totalPoints - opponentAverage,
          },
        ];
  });
  const averageOpponentScore = averageValues(
    adjustedRows.map((row) => row.opponentAverage),
  );
  const averageScoreEdge = averageValues(adjustedRows.map((row) => row.scoreEdge));
  const strongTableRows =
    averageOpponentScore === null
      ? []
      : adjustedRows.filter((row) => row.opponentAverage >= averageOpponentScore);
  const bestMatchup =
    [...focusedHeadToHeadRows].sort(
      (left, right) =>
        right.averageScoreDifferential - left.averageScoreDifferential ||
        right.wins - left.wins,
    )[0] ?? null;
  const hardestMatchup =
    [...focusedHeadToHeadRows].sort(
      (left, right) =>
        left.averageScoreDifferential - right.averageScoreDifferential ||
        right.losses - left.losses,
    )[0] ?? null;

  return expandedMetric({
    confidenceLabel:
      adjustedRows.length > 0
        ? 'Compares each result to the average opponent score in that game.'
        : 'Needs shared games with opponent result rows.',
    metrics: [
      expandedMetricEntry('Vs opponent avg', formatMetricDelta(averageScoreEdge)),
      expandedMetricEntry('Strong-table wins', formatMetricPercent(getWinRate(strongTableRows))),
      expandedMetricEntry('Best matchup', bestMatchup?.label ?? 'n/a'),
      expandedMetricEntry('Hardest matchup', hardestMatchup?.label ?? 'n/a'),
    ],
    sampleSize: adjustedRows.length,
    summary:
      averageScoreEdge !== null
        ? `Opponent-adjusted scoring is ${formatMetricDelta(
            averageScoreEdge,
          )} points versus the average tablemate.`
        : 'Opponent-adjusted performance will appear once opponent rows are available.',
    title: 'Opponent-Adjusted Performance',
  });
}

function buildStyleFitMetric({
  selectedStylePerformanceRows,
}: {
  selectedStylePerformanceRows: GroupStylePerformanceRow[];
}): ExpandedIndividualMetric {
  const mostPlayed =
    [...selectedStylePerformanceRows].sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed || right.winRate - left.winRate,
    )[0] ?? null;
  const best =
    [...selectedStylePerformanceRows].sort(
      (left, right) =>
        right.winRate - left.winRate ||
        right.gamesPlayed - left.gamesPlayed ||
        right.averageScore - left.averageScore,
    )[0] ?? null;
  const winRateGap =
    mostPlayed && best ? best.winRate - mostPlayed.winRate : null;

  return expandedMetric({
    confidenceLabel:
      selectedStylePerformanceRows.length > 0
        ? 'Compares most-played inferred style to best-performing inferred style.'
        : 'Needs inferred styles on finalized games.',
    metrics: [
      expandedMetricEntry(
        'Most played',
        mostPlayed ? humanizeStyleCode(mostPlayed.styleCode) : 'n/a',
      ),
      expandedMetricEntry(
        'Best style',
        best ? humanizeStyleCode(best.styleCode) : 'n/a',
      ),
      expandedMetricEntry('Win-rate gap', formatMetricPercentDelta(winRateGap)),
      expandedMetricEntry(
        'Games in best style',
        best ? `${best.gamesPlayed}` : 'n/a',
      ),
    ],
    sampleSize: selectedStylePerformanceRows.reduce(
      (sum, row) => sum + row.gamesPlayed,
      0,
    ),
    summary:
      mostPlayed && best
        ? mostPlayed.styleCode === best.styleCode
          ? `${humanizeStyleCode(best.styleCode)} is both the most common and best-performing style.`
          : `${humanizeStyleCode(mostPlayed.styleCode)} is most common, but ${humanizeStyleCode(
              best.styleCode,
            )} is performing better.`
        : 'Style fit will appear once inferred style performance rows exist.',
    title: 'Style Fit Gap',
  });
}

function buildSignatureSelectionLiftMetric({
  cardOutcomeRows,
  currentUserCanonicalId,
  focusPlayerId,
  personalSelectionStats,
  selectedPersonCanonicalId,
  targetRows,
}: {
  cardOutcomeRows: CardOutcomeRow[];
  currentUserCanonicalId?: string;
  focusPlayerId: string | null;
  personalSelectionStats?: SelectionStats;
  selectedPersonCanonicalId: string | null;
  targetRows: SharedGameResultRow[];
}): ExpandedIndividualMetric {
  const canUsePersonalSelections = Boolean(
    personalSelectionStats &&
      personalSelectionStats.totalGames > 0 &&
      selectedPersonCanonicalId !== null &&
      selectedPersonCanonicalId === currentUserCanonicalId,
  );
  const baseline = canUsePersonalSelections
    ? personalSelectionStats?.baselineWinRate ?? 0
    : getWinRate(targetRows);

  if (canUsePersonalSelections && personalSelectionStats) {
    const personalBaseline = personalSelectionStats.baselineWinRate;
    const candidates = [
      ...personalSelectionStats.corporations.map((row) => ({
        label: 'Corporation',
        name: row.corporation_name,
        plays: row.plays,
        winRate: row.win_rate,
      })),
      ...personalSelectionStats.preludes.map((row) => ({
        label: 'Prelude',
        name: row.prelude_name,
        plays: row.plays,
        winRate: row.win_rate,
      })),
      ...personalSelectionStats.pairs.map((row) => ({
        label: 'Corp + Prelude',
        name: `${row.corporation_name} + ${row.prelude_name}`,
        plays: row.plays,
        winRate: row.win_rate,
      })),
      ...personalSelectionStats.cards.map((row) => ({
        label: 'Card',
        name: row.card_name,
        plays: row.plays,
        winRate: row.win_rate_when_played,
      })),
    ].filter((row) => row.plays > 0);
    const best =
      [...candidates].sort(
        (left, right) =>
          right.winRate - personalBaseline - (left.winRate - personalBaseline) ||
          right.plays - left.plays,
      )[0] ?? null;

    return expandedMetric({
      confidenceLabel:
        'Uses personal corporation, prelude, pair, and card win-rate lift over baseline.',
      metrics: [
        expandedMetricEntry('Best signature', best?.name ?? 'n/a'),
        expandedMetricEntry('Type', best?.label ?? 'n/a'),
        expandedMetricEntry(
          'Win lift',
          best ? formatMetricPercentDelta(best.winRate - personalBaseline) : 'n/a',
        ),
        expandedMetricEntry('Plays', best ? formatAverage(best.plays) : 'n/a'),
      ],
      sampleSize: personalSelectionStats.totalGames,
      summary: best
        ? `${best.name} is the strongest signature selection, running ${formatMetricPercentDelta(
            best.winRate - personalBaseline,
          )} above baseline.`
        : 'Signature lift will appear once personal selection rows have repeated plays.',
      title: 'Signature Selection Lift',
    });
  }

  const cardRows = cardOutcomeRows.filter((row) =>
    matchesFocus(row.playerId, focusPlayerId),
  );
  const cardsByName = new Map<string, { plays: number; wins: number }>();

  for (const row of cardRows) {
    const existing = cardsByName.get(row.cardName) ?? { plays: 0, wins: 0 };
    existing.plays += 1;
    existing.wins += row.isWinner ? 1 : 0;
    cardsByName.set(row.cardName, existing);
  }

  const best =
    [...cardsByName.entries()]
      .map(([name, row]) => ({
        lift: baseline === null ? null : row.wins / row.plays - baseline,
        name,
        plays: row.plays,
        winRate: row.wins / row.plays,
      }))
      .sort(
        (left, right) =>
          (right.lift ?? -Infinity) - (left.lift ?? -Infinity) ||
          right.plays - left.plays,
      )[0] ?? null;

  return expandedMetric({
    confidenceLabel:
      'Uses card outcome lift when personal setup selection stats are not available for this focus.',
    metrics: [
      expandedMetricEntry('Best card', best?.name ?? 'n/a'),
      expandedMetricEntry('Win lift', formatMetricPercentDelta(best?.lift ?? null)),
      expandedMetricEntry('Card win rate', formatMetricPercent(best?.winRate ?? null)),
      expandedMetricEntry('Plays', best ? formatAverage(best.plays) : 'n/a'),
    ],
    sampleSize: cardRows.length,
    summary: best
      ? `${best.name} is the clearest repeated signature card in this slice.`
      : 'Signature lift needs repeated card, corporation, or prelude selections.',
    title: 'Signature Selection Lift',
  });
}

function buildInteractionResilienceMetric({
  focusedHeadToHeadRows,
  selectedInteractionRows,
  targetRows,
}: {
  focusedHeadToHeadRows: FocusedHeadToHeadRow[];
  selectedInteractionRows: DashboardInteractionRow[];
  targetRows: SharedGameResultRow[];
}): ExpandedIndividualMetric {
  const closeRows = targetRows.filter((row) => {
    const margin = row.isWinner ? row.winDifferentialPoints : row.lossGapPoints;

    return margin !== null && margin <= 5;
  });
  const closeWinRate = getWinRate(closeRows);
  const hardest =
    [...focusedHeadToHeadRows].sort(
      (left, right) =>
        left.averageScoreDifferential - right.averageScoreDifferential ||
        right.losses - left.losses,
    )[0] ?? null;
  const baseline = getWinRate(targetRows);
  const resilientPairing =
    [...selectedInteractionRows].sort(
      (left, right) =>
        (right.winRate - (baseline ?? 0)) - (left.winRate - (baseline ?? 0)) ||
        right.gamesPlayed - left.gamesPlayed,
    )[0] ?? null;

  return expandedMetric({
    confidenceLabel:
      'Uses close-game outcomes, hardest head-to-head rows, and setup interaction pairings.',
    metrics: [
      expandedMetricEntry('Close-game wins', formatMetricPercent(closeWinRate)),
      expandedMetricEntry('Close games', formatAverage(closeRows.length)),
      expandedMetricEntry('Pressure matchup', hardest?.label ?? 'n/a'),
      expandedMetricEntry('Best resilient pair', resilientPairing?.label ?? 'n/a'),
    ],
    sampleSize: targetRows.length,
    summary:
      closeRows.length > 0
        ? `The selected slice wins ${formatMetricPercent(
            closeWinRate,
          )} of games decided by five points or fewer.`
        : 'Interaction resilience will sharpen as close games and repeated matchup pressure accumulate.',
    title: 'Interaction Resilience',
  });
}

function buildBoardControlEfficiencyMetric({
  focusPlayerId,
  playerMapPerformanceRows,
  targetRows,
  tilePlacementRows,
}: {
  focusPlayerId: string | null;
  playerMapPerformanceRows: PlayerMapPerformanceRow[];
  targetRows: SharedGameResultRow[];
  tilePlacementRows: TilePlacementRow[];
}): ExpandedIndividualMetric {
  const boardPoints = sumValues(
    targetRows.map((row) => row.greeneryPoints + row.citiesPoints),
  );
  const boardPointsPerGame =
    targetRows.length > 0 ? boardPoints / targetRows.length : null;
  const tileRows = tilePlacementRows.filter((row) =>
    matchesFocus(row.playerId, focusPlayerId),
  );
  const boardTileRows = tileRows.filter((row) =>
    ['city', 'greenery'].some((tileType) =>
      row.tileType.toLowerCase().includes(tileType),
    ),
  );
  const greeneryRows = tileRows.filter((row) =>
    row.tileType.toLowerCase().includes('greenery'),
  );
  const pointsPerBoardTile =
    boardTileRows.length > 0 ? boardPoints / boardTileRows.length : null;
  const bestMap =
    [...playerMapPerformanceRows]
      .filter((row) => matchesFocus(row.playerId, focusPlayerId))
      .sort(
        (left, right) =>
          right.winRate - left.winRate ||
          right.gamesPlayed - left.gamesPlayed ||
          right.averageScore - left.averageScore,
      )[0] ?? null;

  return expandedMetric({
    confidenceLabel:
      tileRows.length > 0
        ? 'Uses imported tile placements plus final city and greenery points.'
        : 'Uses final city and greenery points; tile efficiency improves with imported board logs.',
    metrics: [
      expandedMetricEntry('Board pts / game', formatMetricAverage(boardPointsPerGame)),
      expandedMetricEntry('Pts / board tile', formatMetricAverage(pointsPerBoardTile)),
      expandedMetricEntry(
        'Greenery share',
        boardTileRows.length > 0
          ? formatMetricPercent(greeneryRows.length / boardTileRows.length)
          : 'n/a',
      ),
      expandedMetricEntry('Best map', bestMap?.mapName ?? 'n/a'),
    ],
    sampleSize: Math.max(targetRows.length, tileRows.length),
    summary:
      boardPointsPerGame !== null
        ? `Board scoring is averaging ${formatMetricAverage(
            boardPointsPerGame,
          )} city and greenery points per game.`
        : 'Board-control efficiency needs finalized scores or imported tile placements.',
    title: 'Board Control Efficiency',
  });
}

function buildReliabilityMetric(targetRows: SharedGameResultRow[]): ExpandedIndividualMetric {
  const scores = targetRows.map((row) => row.totalPoints);
  const scoreDeviation = standardDeviationValues(scores);
  const floor = scores.length > 0 ? Math.min(...scores) : null;
  const ceiling = scores.length > 0 ? Math.max(...scores) : null;
  const closeRows = targetRows.filter((row) => {
    const margin = row.isWinner ? row.winDifferentialPoints : row.lossGapPoints;

    return margin !== null && margin <= 5;
  });
  const averageWinMargin = averageValues(
    targetRows
      .map((row) => row.winDifferentialPoints)
      .filter((value): value is number => value !== null),
  );
  const averageLossGap = averageValues(
    targetRows
      .map((row) => row.lossGapPoints)
      .filter((value): value is number => value !== null),
  );

  return expandedMetric({
    confidenceLabel:
      targetRows.length > 1
        ? 'Uses score floor, ceiling, standard deviation, and close-game results.'
        : 'Needs multiple finalized games for volatility.',
    metrics: [
      expandedMetricEntry('Score floor', formatMetricAverage(floor)),
      expandedMetricEntry('Score ceiling', formatMetricAverage(ceiling)),
      expandedMetricEntry('Score volatility', formatMetricAverage(scoreDeviation)),
      expandedMetricEntry('Close-game wins', formatMetricPercent(getWinRate(closeRows))),
    ],
    sampleSize: targetRows.length,
    summary:
      scoreDeviation !== null
        ? `Scores range from ${formatMetricAverage(floor)} to ${formatMetricAverage(
            ceiling,
          )}, with ${formatMetricAverage(scoreDeviation)} standard deviation. Average win margin is ${formatMetricAverage(
            averageWinMargin,
          )}; average loss gap is ${formatMetricAverage(averageLossGap)}.`
        : 'Reliability and volatility will appear once multiple finalized games are available.',
    title: 'Reliability / Volatility',
  });
}

function buildExpandedIndividualMetrics({
  allRows,
  cardOutcomeRows,
  currentUserCanonicalId,
  finalTerraformingActionStats,
  focusPlayerId,
  focusedHeadToHeadRows,
  gameLengthRows,
  generationPaceRows,
  personalSelectionStats,
  playerMapPerformanceRows,
  selectedInteractionRows,
  selectedPersonCanonicalId,
  selectedStylePerformanceRows,
  targetPlayerIds,
  targetRows,
  tilePlacementRows,
}: {
  allRows: SharedGameResultRow[];
  cardOutcomeRows: CardOutcomeRow[];
  currentUserCanonicalId?: string;
  finalTerraformingActionStats: FinalTerraformingActionStat[];
  focusPlayerId: string | null;
  focusedHeadToHeadRows: FocusedHeadToHeadRow[];
  gameLengthRows: GameLengthPerformanceRow[];
  generationPaceRows: GenerationPaceRow[];
  personalSelectionStats?: SelectionStats;
  playerMapPerformanceRows: PlayerMapPerformanceRow[];
  selectedInteractionRows: DashboardInteractionRow[];
  selectedPersonCanonicalId: string | null;
  selectedStylePerformanceRows: GroupStylePerformanceRow[];
  targetPlayerIds: Set<string> | null;
  targetRows: SharedGameResultRow[];
  tilePlacementRows: TilePlacementRow[];
}): ExpandedIndividualMetric[] {
  return [
    buildWinConditionDeltaMetric(targetRows),
    buildGameLengthFitMetric(targetRows, gameLengthRows, focusPlayerId),
    buildOpeningTempoMetric(generationPaceRows, focusPlayerId),
    buildEndgameConversionMetric({
      finalTerraformingActionStats,
      focusPlayerId,
      generationPaceRows,
      targetPlayerIds,
    }),
    buildOpponentAdjustedMetric({
      allRows,
      focusedHeadToHeadRows,
      targetPlayerIds,
      targetRows,
    }),
    buildStyleFitMetric({ selectedStylePerformanceRows }),
    buildSignatureSelectionLiftMetric({
      cardOutcomeRows,
      currentUserCanonicalId,
      focusPlayerId,
      personalSelectionStats,
      selectedPersonCanonicalId,
      targetRows,
    }),
    buildInteractionResilienceMetric({
      focusedHeadToHeadRows,
      selectedInteractionRows,
      targetRows,
    }),
    buildBoardControlEfficiencyMetric({
      focusPlayerId,
      playerMapPerformanceRows,
      targetRows,
      tilePlacementRows,
    }),
    buildReliabilityMetric(targetRows),
  ];
}

export function InsightsDashboard({
  analytics: baseAnalytics,
  children: groupSwitcher,
  currentUserCanonicalId,
  extended: baseExtended,
  finalTerraformingActionStats = [],
  focusPeople,
  groupId,
  initialHiddenCombinationPlayerIds = [],
  mapAwardGroups = [],
  overallAnalytics,
  overallExtended,
  personalSelectionStats,
  selectionDialogData,
  sharedGameRows = [],
  scopeMode = 'all',
  styleEffectivenessScopes = [],
}: InsightsDashboardProps) {
  const initialSelectedPersonId =
    scopeMode === 'individual' &&
    currentUserCanonicalId &&
    focusPeople.some((person) => person.canonicalId === currentUserCanonicalId)
      ? currentUserCanonicalId
      : 'all';
  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    initialSelectedPersonId,
  );
  const [draftPersonId, setDraftPersonId] = useState<string>(initialSelectedPersonId);
  const [comparePersonId, setComparePersonId] = useState<string>('none');
  const [draftCombinationPlayerIds, setDraftCombinationPlayerIds] = useState<
    string[]
  >([]);
  const [analyzedCombinationPlayerIds, setAnalyzedCombinationPlayerIds] =
    useState<string[]>([]);
  const [hiddenCombinationPlayerIds, setHiddenCombinationPlayerIds] = useState<
    string[]
  >(initialHiddenCombinationPlayerIds);
  const [, startPreferenceTransition] = useTransition();
  const isPlayerCombinationMode = scopeMode === 'group';
  const combinationOptions = useMemo(
    () =>
      buildPlayerCombinationOptions({
        currentUserCanonicalId,
        focusPeople,
        rows: sharedGameRows,
      }),
    [currentUserCanonicalId, focusPeople, sharedGameRows],
  );
  const hiddenCombinationSet = new Set(hiddenCombinationPlayerIds);
  const visibleCombinationOptions = combinationOptions.filter(
    (option) => !hiddenCombinationSet.has(option.canonicalId),
  );
  const hiddenCombinationOptions = combinationOptions.filter((option) =>
    hiddenCombinationSet.has(option.canonicalId),
  );
  const combinationResult = useMemo(
    () =>
      buildPlayerCombinationAnalytics({
        currentUserCanonicalId,
        focusPeople,
        mapAwardGroups,
        rows: sharedGameRows,
        selectedCanonicalIds: analyzedCombinationPlayerIds,
        sourceExtended: overallExtended,
      }),
    [
      analyzedCombinationPlayerIds,
      currentUserCanonicalId,
      focusPeople,
      mapAwardGroups,
      overallExtended,
      sharedGameRows,
    ],
  );
  const analytics = isPlayerCombinationMode
    ? combinationResult.analytics
    : baseAnalytics;
  const extended = isPlayerCombinationMode
    ? combinationResult.extended
    : baseExtended;
  const fixedFocusScope: FocusScope | null =
    scopeMode === 'group'
      ? 'group'
      : scopeMode === 'individual'
        ? 'overall'
        : null;
  const [selectedFocusScope, setSelectedFocusScope] =
    useState<FocusScope>('overall');
  const focusScope = fixedFocusScope ?? selectedFocusScope;

  const effectiveSelectedPersonId = selectedPersonId;
  const selectedPerson =
    isPlayerCombinationMode || effectiveSelectedPersonId === 'all'
      ? null
      : focusPeople.find(
          (person) => person.canonicalId === effectiveSelectedPersonId,
        ) ?? null;
  const comparePerson =
    !isPlayerCombinationMode &&
    selectedPerson !== null &&
    comparePersonId !== 'none' &&
    comparePersonId !== effectiveSelectedPersonId
      ? focusPeople.find((person) => person.canonicalId === comparePersonId) ?? null
      : null;
  const overallFocusBundle = useMemo(
    () => buildOverallFocusBundle(focusPeople),
    [focusPeople],
  );
  const overallLeaderboardRows = useMemo(
    () => buildOverallLeaderboardRows(focusPeople),
    [focusPeople],
  );
  const isGroupScope = focusScope === 'group';
  const bundle = isGroupScope
    ? null
    : selectedPerson?.bundle ?? overallFocusBundle;
  const focusPlayerName = selectedPerson?.displayName ?? null;
  const showGroupContext =
    isGroupScope && (!selectedPerson || selectedPerson.inActiveGroup);
  const activeGroupPlayerId = isGroupScope
    ? selectedPerson?.activeGroupPlayerId ?? null
    : null;
  const selectedPlayer = useMemo(
    () =>
      isGroupScope && selectedPerson && activeGroupPlayerId
        ? { displayName: selectedPerson.displayName, id: activeGroupPlayerId }
        : null,
    [activeGroupPlayerId, isGroupScope, selectedPerson],
  );

  // The extended / style / lineup / interaction sections render from a
  // scope-aware source: the active group's analytics in Selected-group scope, or
  // the canonical-merged cross-group analytics ("everyone you've played") in
  // Overall scope. In Overall scope a focused person is keyed by canonical id,
  // matching how the overall datasets collapse each person's per-group rows.
  const sectionAnalytics = isGroupScope ? analytics : overallAnalytics;
  const sectionExtended = isGroupScope ? extended : overallExtended;
  const sectionFocusPlayerId = isGroupScope
    ? selectedPlayer?.id ?? null
    : selectedPerson?.canonicalId ?? null;
  const sectionFocusPlayerName = isGroupScope
    ? selectedPlayer?.displayName ?? null
    : selectedPerson?.displayName ?? null;
  const showExtendedSections = isGroupScope ? showGroupContext : true;

  const groupPlayerScoreAverages = selectedPlayer
    ? analytics.playerScoreAverages.find((row) => row.playerId === selectedPlayer.id) ??
      null
    : null;
  const selectedStylePerformanceRows: GroupStylePerformanceRow[] = sectionFocusPlayerId
    ? sectionAnalytics.playerStylePerformanceRows.filter(
        (row) => row.playerId === sectionFocusPlayerId,
      )
    : sectionAnalytics.groupStylePerformanceRows;
  const selectedScoreProfile = isGroupScope
    ? selectedPlayer
      ? groupPlayerScoreAverages ?? analytics.scoreAverages
      : analytics.scoreAverages
    : bundle?.scoreAverages ?? null;
  const groupPlayerCoverage = selectedPlayer
    ? analytics.playerCoverages.find((row) => row.playerId === selectedPlayer.id) ?? null
    : null;
  const selectedCoverage = isGroupScope
    ? selectedPlayer
      ? groupPlayerCoverage ?? analytics.coverage
      : analytics.coverage
    : bundle?.coverage ?? null;
  const selectedLineupRows = sectionFocusPlayerId
    ? sectionAnalytics.lineupEffectRows.filter(
        (row) => row.playerId === sectionFocusPlayerId,
      )
    : sectionAnalytics.lineupEffectRows.slice(0, 6);
  const selectedInteractionRows: DashboardInteractionRow[] = (
    sectionFocusPlayerId
      ? sectionAnalytics.playerInteractionRows.filter(
          (row) => row.playerId === sectionFocusPlayerId,
        )
      : sectionAnalytics.groupInteractionRows
  )
    .filter(isSupportedDashboardInteractionRow)
    .slice(0, 6);
  const focusedHeadToHeadRows = useMemo(
    () => {
      if (!isGroupScope) {
        return bundle?.headToHeadRows.slice(0, 6) ?? [];
      }

      return normalizeHeadToHeadRows(
        analytics.headToHeadRows,
        selectedPlayer?.id ?? null,
        selectedPlayer?.displayName ?? null,
      );
    },
    [analytics.headToHeadRows, bundle, isGroupScope, selectedPlayer],
  );

  const insightCards = useMemo(
    () => {
      if (!isGroupScope) {
        if (selectedPerson) {
          return buildCrossGroupFocusCards(selectedPerson);
        }

        return overallFocusBundle
          ? buildOverallFocusCards(overallFocusBundle, overallLeaderboardRows)
          : [];
      }

      if (selectedPerson && !selectedPerson.inActiveGroup) {
        return [];
      }

      return buildInsightCards({
        coverage: selectedCoverage,
        focusPlayerId: activeGroupPlayerId,
        focusPlayerName,
        headToHeadRows: analytics.headToHeadRows,
        interactionRows: selectedInteractionRows,
        leaderboardRows: analytics.leaderboardRows,
        lineupEffectRows: analytics.lineupEffectRows,
        stylePerformanceRows: selectedStylePerformanceRows,
        trendRows: analytics.playerTrendRows,
      });
    },
    [
      activeGroupPlayerId,
      analytics.headToHeadRows,
      analytics.leaderboardRows,
      analytics.lineupEffectRows,
      analytics.playerTrendRows,
      isGroupScope,
      focusPlayerName,
      overallFocusBundle,
      overallLeaderboardRows,
      selectedCoverage,
      selectedInteractionRows,
      selectedPerson,
      selectedStylePerformanceRows,
    ],
  );

  const leaderboardRows = isGroupScope ? analytics.leaderboardRows : overallLeaderboardRows;
  const leaderboardChartData = leaderboardRows.slice(0, 6).map((row, index) => ({
    name: row.playerName,
    rank: index + 1,
    weightedScore: Number(row.weightedScore.toFixed(3)),
    isFocused: isGroupScope
      ? row.playerId === activeGroupPlayerId
      : selectedPerson
        ? 'canonicalId' in row && row.canonicalId === selectedPerson.canonicalId
        : false,
    winRate: Math.round(row.winRate * 100),
  }));
  const scoreSourceData = selectedScoreProfile
    ? buildScoreSourceEntries(selectedScoreProfile).map((entry) => ({
        label: entry.label,
        value: Number(entry.value.toFixed(1)),
      }))
    : [];
  const stylePerformanceData = buildStylePerformanceChartData(selectedStylePerformanceRows);
  const trendRows = isGroupScope
    ? selectedPlayer
      ? analytics.playerTrendRows.filter((row) => row.playerId === selectedPlayer.id)
      : analytics.playerTrendRows
    : bundle?.trendRows ?? [];
  const trendChartData = buildTrendChartData(
    trendRows,
    isGroupScope ? Boolean(selectedPlayer) : Boolean(selectedPerson),
  );
  const targetPlayerIds = useMemo(
    () => (selectedPerson ? new Set(selectedPerson.playerIds) : null),
    [selectedPerson],
  );
  const targetSharedGameRows = useMemo(
    () =>
      targetPlayerIds
        ? sharedGameRows.filter((row) => targetPlayerIds.has(row.playerId))
        : sharedGameRows,
    [sharedGameRows, targetPlayerIds],
  );
  const expandedIndividualMetrics = useMemo(
    () =>
      scopeMode === 'individual'
        ? buildExpandedIndividualMetrics({
            allRows: sharedGameRows,
            cardOutcomeRows: sectionExtended.cardOutcomeRows,
            currentUserCanonicalId,
            finalTerraformingActionStats,
            focusPlayerId: sectionFocusPlayerId,
            focusedHeadToHeadRows,
            gameLengthRows: sectionExtended.gameLengthPerformanceRows,
            generationPaceRows: sectionExtended.generationPaceRows,
            personalSelectionStats,
            playerMapPerformanceRows: sectionExtended.playerMapPerformanceRows,
            selectedInteractionRows,
            selectedPersonCanonicalId: selectedPerson?.canonicalId ?? null,
            selectedStylePerformanceRows,
            targetPlayerIds,
            targetRows: targetSharedGameRows,
            tilePlacementRows: sectionExtended.tilePlacementRows,
          })
        : [],
    [
      currentUserCanonicalId,
      finalTerraformingActionStats,
      focusedHeadToHeadRows,
      personalSelectionStats,
      scopeMode,
      sectionExtended.cardOutcomeRows,
      sectionExtended.gameLengthPerformanceRows,
      sectionExtended.generationPaceRows,
      sectionExtended.playerMapPerformanceRows,
      sectionExtended.tilePlacementRows,
      sectionFocusPlayerId,
      selectedInteractionRows,
      selectedPerson,
      selectedStylePerformanceRows,
      sharedGameRows,
      targetPlayerIds,
      targetSharedGameRows,
    ],
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
        { label: 'Key Cards', value: Math.round(selectedCoverage.keyCardCoverage * 100) },
      ]
    : [];
  const selectedCombinationLabel =
    combinationResult.selectedPlayerNames.length > 0
      ? combinationResult.selectedPlayerNames.join(', ')
      : 'all shared games';
  const combinationGameWord =
    combinationResult.matchingGameCount === 1 ? 'game' : 'games';
  const combinationBadgeText =
    combinationResult.selectedPlayerNames.length > 0
      ? `${combinationResult.matchingGameCount} ${combinationGameWord} containing ${selectedCombinationLabel}`
      : `${combinationResult.matchingGameCount} shared ${combinationGameWord}`;
  const focusBadgeText = isPlayerCombinationMode
    ? `${combinationBadgeText} | ${combinationResult.matchingResultCount} player results`
    : isGroupScope
    ? focusPlayerName
      ? selectedPerson?.inActiveGroup
        ? `Focused on ${focusPlayerName} in selected group`
        : `${focusPlayerName} is outside selected group`
      : 'Focused on selected group'
    : focusPlayerName
      ? `Focused on ${focusPlayerName} overall`
      : 'Focused on all shared players';
  const labTitle =
    scopeMode === 'group'
      ? 'Group Insights Lab'
      : scopeMode === 'individual'
        ? 'Individual Insights Lab'
        : 'Insights Lab';
  const labDescription =
    scopeMode === 'group'
      ? 'Choose every player in the lineup, including yourself when applicable, then compare finalized games containing that exact selected mix.'
      : scopeMode === 'individual'
        ? 'Pick a player to refocus every individual chart below. All figures are built from finalized games only.'
        : 'Pick a player and a scope to refocus every chart below. All figures are built from finalized games only.';
  const scoreProfileTitle = focusPlayerName
    ? isGroupScope
      ? `Score Profile for ${focusPlayerName} in Selected Group`
      : `Score Profile for ${focusPlayerName}`
    : isGroupScope
      ? isPlayerCombinationMode
        ? 'Combination Score Profile'
        : 'Group Score Profile'
      : 'Overall Score Profile';
  const radarGroupAverages = isGroupScope
    ? analytics.scoreAverages
    : overallFocusBundle?.scoreAverages ?? selectedScoreProfile;
  const radarPlayerAverages = isGroupScope
    ? groupPlayerScoreAverages
    : selectedPerson?.bundle.scoreAverages ?? null;
  const leaderboardTitle = isGroupScope
    ? isPlayerCombinationMode
      ? 'Combination Leaderboard'
      : 'Leaderboard Comparison'
    : 'Overall Leaderboard';
  const coverageTitle = focusPlayerName
    ? isGroupScope
      ? `Optional Data Coverage for ${focusPlayerName} in Selected Group`
      : `Optional Data Coverage for ${focusPlayerName}`
    : isGroupScope
      ? isPlayerCombinationMode
        ? 'Combination Optional Data Coverage'
        : 'Group Optional Data Coverage'
      : 'Overall Optional Data Coverage';
  const draftCombinationSet = new Set(draftCombinationPlayerIds);
  const toggleDraftCombinationPlayer = (canonicalId: string) => {
    setDraftCombinationPlayerIds((currentIds) =>
      currentIds.includes(canonicalId)
        ? currentIds.filter((currentId) => currentId !== canonicalId)
        : [...currentIds, canonicalId],
    );
  };
  const hideCombinationPlayer = (canonicalId: string) => {
    setHiddenCombinationPlayerIds((currentIds) =>
      currentIds.includes(canonicalId)
        ? currentIds
        : [...currentIds, canonicalId],
    );
    setDraftCombinationPlayerIds((currentIds) =>
      currentIds.filter((currentId) => currentId !== canonicalId),
    );
    setAnalyzedCombinationPlayerIds((currentIds) =>
      currentIds.filter((currentId) => currentId !== canonicalId),
    );
    if (groupId) startPreferenceTransition(() => saveHiddenGroupInsightPlayer(groupId, canonicalId, true));
  };
  const restoreCombinationPlayer = (canonicalId: string) => {
    setHiddenCombinationPlayerIds((currentIds) =>
      currentIds.filter((currentId) => currentId !== canonicalId),
    );
    if (groupId) startPreferenceTransition(() => saveHiddenGroupInsightPlayer(groupId, canonicalId, false));
  };

  const hasAnalytics =
    bundle !== null ||
    sectionAnalytics.leaderboardRows.length > 0 ||
    sectionAnalytics.headToHeadRows.length > 0 ||
    selectedInteractionRows.length > 0 ||
    sectionAnalytics.lineupEffectRows.length > 0 ||
    sectionAnalytics.scoreAverages !== null ||
    selectedCoverage !== null;

  return (
    <div className="flex flex-col gap-4">
      <ChartFrame
        description={labDescription}
        title={labTitle}
      >
        <div className="flex flex-col gap-4">
          <div
            className={
              fixedFocusScope
                ? 'grid gap-3 lg:grid-cols-[minmax(0,1fr)]'
                : 'grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]'
            }
          >
            {isPlayerCombinationMode ? (
              <form
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  setAnalyzedCombinationPlayerIds(
                    visibleCombinationOptions
                      .filter((option) =>
                        draftCombinationSet.has(option.canonicalId),
                      )
                      .map((option) => option.canonicalId),
                  );
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="tm-data-label">Players</p>
                  <button
                    className="tm-button-primary px-4 py-2 text-xs"
                    type="submit"
                  >
                    Analyze
                  </button>
                </div>
                {combinationOptions.length === 0 ? (
                  <p className="tm-muted-copy text-sm">
                    Finalized shared players will appear here once games are
                    logged.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {visibleCombinationOptions.length === 0 ? (
                      <p className="tm-muted-copy text-sm">
                        All players are hidden from group selection.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {visibleCombinationOptions.map((option, optionIndex) => {
                          const optionId = `combination-player-${optionIndex}-${option.canonicalId.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;

                          return (
                            <div
                              className="flex min-h-12 items-center gap-2 rounded border border-white/10 bg-black/10 px-3 py-2 text-sm text-stone-100"
                              key={option.canonicalId}
                            >
                              <input
                                checked={draftCombinationSet.has(
                                  option.canonicalId,
                                )}
                                className="h-4 w-4 accent-[var(--tm-accent)]"
                                id={optionId}
                                onChange={() =>
                                  toggleDraftCombinationPlayer(
                                    option.canonicalId,
                                  )
                                }
                                type="checkbox"
                              />
                              <label
                                className="min-w-0 flex-1 truncate"
                                htmlFor={optionId}
                              >
                                {option.displayName}
                              </label>
                              <span className="tm-muted-copy shrink-0 text-xs">
                                {option.gamesPlayed}
                              </span>
                              <button
                                aria-label={`Hide ${option.displayName} from group selection`}
                                className="tm-button-secondary shrink-0 px-2 py-1 text-xs"
                                onClick={() =>
                                  hideCombinationPlayer(option.canonicalId)
                                }
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
                    {hiddenCombinationOptions.length > 0 ? (
                      <details className="rounded border border-white/10 bg-black/10 px-3 py-2">
                        <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-[var(--tm-muted)]">
                          Hidden players ({hiddenCombinationOptions.length})
                        </summary>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {hiddenCombinationOptions.map((option) => (
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
                                onClick={() =>
                                  restoreCombinationPlayer(option.canonicalId)
                                }
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
                  </div>
                )}
              </form>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <label className="tm-data-label" htmlFor="player-focus-select">
                    Player Focus
                  </label>
                  <select
                    aria-label="Player focus"
                    className="tm-input mt-2 w-full appearance-none pr-9"
                    id="player-focus-select"
                    onChange={(event) => {
                      if (scopeMode === 'individual') {
                        setDraftPersonId(event.target.value);
                      } else {
                        setSelectedPersonId(event.target.value);
                        setDraftPersonId(event.target.value);
                        setComparePersonId('none');
                      }
                    }}
                    value={draftPersonId}
                  >
                    {scopeMode !== 'individual' ? (
                      <option value="all">All players</option>
                    ) : null}
                    {focusPeople.map((person) => (
                      <option key={person.canonicalId} value={person.canonicalId}>
                        {person.displayName}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block">
                    <SelectChevron />
                  </span>
                  {scopeMode === 'individual' ? (
                    <button
                      className="tm-button-primary mt-2 px-4 py-1.5 text-xs"
                      disabled={draftPersonId === selectedPersonId}
                      onClick={() => {
                        setSelectedPersonId(draftPersonId);
                        setComparePersonId('none');
                      }}
                      type="button"
                    >
                      OK
                    </button>
                  ) : null}
                </div>
                {selectedPerson !== null && focusPeople.length > 1 ? (
                  <div className="relative">
                    <label className="tm-data-label" htmlFor="player-compare-select">
                      Compare With
                    </label>
                    <select
                      aria-label="Compare with player"
                      className="tm-input mt-2 w-full appearance-none pr-9"
                      id="player-compare-select"
                      onChange={(event) => setComparePersonId(event.target.value)}
                      value={comparePersonId}
                    >
                      <option value="none">— no comparison —</option>
                      {focusPeople
                        .filter((person) => person.canonicalId !== effectiveSelectedPersonId)
                        .map((person) => (
                          <option key={person.canonicalId} value={person.canonicalId}>
                            {person.displayName}
                          </option>
                        ))}
                    </select>
                     <span className="mt-2 block">
                       <SelectChevron />
                     </span>
                   </div>
                 ) : null}
              </div>
            )}
            {fixedFocusScope ? null : (
              <div className="relative">
                <label className="tm-data-label" htmlFor="insight-scope-select">
                  Scope
                </label>
                <select
                  aria-label="Insight scope"
                  className="tm-input mt-2 w-full appearance-none pr-9"
                  id="insight-scope-select"
                  onChange={(event) =>
                    setSelectedFocusScope(event.target.value as FocusScope)
                  }
                  value={focusScope}
                >
                  <option value="overall">Overall</option>
                  <option value="group">Selected group</option>
                </select>
                <span className="mt-2 block">
                  <SelectChevron />
                </span>
              </div>
            )}
            {groupSwitcher ? (
              <div className={fixedFocusScope ? '' : 'lg:col-span-2'}>
                <p className="tm-data-label">Selected Group</p>
                <div className="mt-2">{groupSwitcher}</div>
              </div>
            ) : null}
            <div className={fixedFocusScope ? '' : 'lg:col-span-2'}>
              <span className="tm-coverage-badge">{focusBadgeText}</span>
            </div>
          </div>
          <p className="tm-body-copy text-sm">
            Compare{' '}
            <GlossaryLink slug="weighted-score">leaderboard</GlossaryLink>{' '}
            form,{' '}
            <GlossaryLink slug="score-sources">score-source</GlossaryLink>{' '}
            patterns,{' '}
            <GlossaryLink slug="inferred-style">inferred style</GlossaryLink>{' '}
            performance,{' '}
            <GlossaryLink slug="head-to-head">head-to-head</GlossaryLink> edges,{' '}
            <GlossaryLink slug="lineup-effects">lineup effects</GlossaryLink>,{' '}
            <GlossaryLink slug="interaction-insights">
              interaction pairings
            </GlossaryLink>
            , and{' '}
            <GlossaryLink slug="optional-data-coverage">coverage</GlossaryLink>{' '}
            signals from finalized games only. New to a term?{' '}
            <GlossaryLink>Browse the full glossary</GlossaryLink>.
          </p>
        </div>
      </ChartFrame>

      {scopeMode === 'group' ? (
        <ScoreProfilePanel averages={baseAnalytics.scoreAverages} />
      ) : null}

      {hasAnalytics ? (
        <>
          <ChartFrame
            description="Auto-generated highlights — the strongest signals for the current focus, each tagged with its sample size and confidence."
            title="Insight Cards"
          >
            <div className="grid gap-3 md:grid-cols-2">
              {insightCards.map((card) => (
                <article className="tm-stat-card" key={`${card.title}-${card.body}`}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-stone-100">{card.title}</h3>
                    <p className="tm-accent-copy text-xs uppercase tracking-[0.2em]">
                      {card.confidence}
                    </p>
                  </div>
                  <p className="tm-muted-copy mt-2 text-sm">
                    <GlossaryRichText>{card.body}</GlossaryRichText>
                  </p>
                  <p className="mt-3 text-xs" style={{ color: 'var(--tm-muted)' }}>
                    Sample size: {card.sampleSize}
                  </p>
                </article>
              ))}
            </div>
          </ChartFrame>

          {expandedIndividualMetrics.length > 0 ? (
            <ChartFrame
              description="Ten player-specific lenses that explain what is driving wins, losses, tempo, style fit, and consistency."
              title="Expanded Individual Metrics"
            >
              <div className="grid gap-3 lg:grid-cols-2">
                {expandedIndividualMetrics.map((metric) => (
                  <article className="tm-stat-card" key={metric.title}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">
                        {metric.title}
                      </h3>
                      <p className="tm-accent-copy text-xs uppercase tracking-[0.2em]">
                        {metric.sampleSize} sample
                        {metric.sampleSize === 1 ? '' : 's'}
                      </p>
                    </div>
                    <p className="tm-muted-copy mt-2 text-sm">
                      <GlossaryRichText>{metric.summary}</GlossaryRichText>
                    </p>
                    <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                      {metric.metrics.map((entry) => (
                        <div
                          className="rounded-md border border-white/10 bg-black/10 p-3"
                          key={`${metric.title}-${entry.label}`}
                        >
                          <dt className="tm-data-label">{entry.label}</dt>
                          <dd className="mt-1 break-words text-sm font-semibold text-stone-100">
                            {entry.value}
                          </dd>
                          {entry.detail ? (
                            <dd className="tm-muted-copy mt-1 text-xs">
                              <GlossaryRichText>{entry.detail}</GlossaryRichText>
                            </dd>
                          ) : null}
                        </div>
                      ))}
                    </dl>
                    <p className="tm-muted-copy mt-3 text-xs">
                      <GlossaryRichText>{metric.confidenceLabel}</GlossaryRichText>
                    </p>
                  </article>
                ))}
              </div>
            </ChartFrame>
          ) : null}

          {comparePerson !== null ? (
            <PlayerComparisonSummary
              analytics={overallAnalytics}
              currentUserCanonicalId={currentUserCanonicalId}
              extended={overallExtended}
              focusPeople={focusPeople}
              selectedCanonicalIds={[
                effectiveSelectedPersonId,
                comparePerson.canonicalId,
              ]}
            />
          ) : null}

          {isGroupScope && selectedPerson && !selectedPerson.inActiveGroup ? (
            <ChartFrame title="Selected Group Unavailable">
              <p className="tm-body-copy text-sm">
                <GlossaryRichText>
                  {`${focusPlayerName} does not have a player row in the selected group, so group-only breakdowns are unavailable for that combination.`}
                </GlossaryRichText>
              </p>
            </ChartFrame>
          ) : null}

          {!isGroupScope || showGroupContext ? (
            <ChartFrame
              description="Players ranked by weighted score, which blends win rate, average placement, and score margin. Taller bars rank higher; the highlighted bar is the current focus."
              title={leaderboardTitle}
            >
              {leaderboardChartData.length === 0 ? (
                <p className="tm-muted-copy text-sm">
                  <GlossaryRichText>
                    Finalized leaderboard rows will appear here once games are logged.
                  </GlossaryRichText>
                </p>
              ) : (
                <ResponsiveContainer height={260} width="100%">
                  <BarChart
                    data={leaderboardChartData}
                    margin={{ bottom: 36, left: 0, right: 12, top: 24 }}
                  >
                    <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                    <XAxis
                      angle={-20}
                      dataKey="name"
                      height={60}
                      textAnchor="end"
                      tick={chartAxisTick}
                    />
                    <YAxis
                      domain={[0, (dataMax: number) => roundNumber(dataMax * 1.15)]}
                      tick={chartAxisTick}
                    />
                    <Tooltip content={<LeaderboardTooltip />} cursor={{ fill: chartGridStroke }} />
                    <Bar dataKey="weightedScore" radius={[10, 10, 0, 0]}>
                      {leaderboardChartData.map((row) => (
                        <Cell
                          fill={
                            row.isFocused
                              ? chartSeriesColors.accent
                              : chartSeriesColors.default
                          }
                          key={row.name}
                          stroke={row.isFocused ? 'var(--tm-text)' : undefined}
                          strokeWidth={row.isFocused ? 2 : 0}
                        />
                      ))}
                      <LabelList
                        dataKey="weightedScore"
                        fill="var(--tm-muted)"
                        fontSize={11}
                        formatter={(value) =>
                          typeof value === 'number' ? value.toFixed(2) : value
                        }
                        position="top"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartFrame>
          ) : null}

          {showExtendedSections ? (
            <PlacementDistributionChart
              rows={sectionExtended.placementDistributionRows}
            />
          ) : null}

          <ChartFrame
            description="Average victory points broken out by where they came from, showing which sources drive the scores."
            title={scoreProfileTitle}
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
            focusPlayerName={focusPlayerName}
            groupAverages={radarGroupAverages}
            playerAverages={radarPlayerAverages}
          />

          {styleEffectivenessScopes.length > 0 && !isPlayerCombinationMode ? (
            <StyleEffectivenessPanel scopes={styleEffectivenessScopes} />
          ) : null}

          {showExtendedSections ? (
            <ChartFrame
              description="Win rate by inferred play style, with the three best-performing styles broken out below the chart."
              title="Best Style Snapshot"
            >
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
          ) : null}

          <ChartFrame
            description="Average score by game date, tracing how form moves over time. The most recent results are listed under the line."
            title="Trend Over Time"
          >
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

          {showExtendedSections ? (
            <>
              <TableSizeChart
                focusPlayerId={sectionFocusPlayerId}
                focusPlayerName={sectionFocusPlayerName}
                rows={sectionExtended.playerCountPerformanceRows}
              />

              <GameLengthSection
                distributionRows={sectionExtended.generationDistributionRows}
                focusPlayerId={sectionFocusPlayerId}
                focusPlayerName={sectionFocusPlayerName}
                performanceRows={sectionExtended.gameLengthPerformanceRows}
              />

              <MapPerformanceSection
                focusPlayerId={sectionFocusPlayerId}
                focusPlayerName={sectionFocusPlayerName}
                groupRows={sectionExtended.groupMapPerformanceRows}
                mapGroups={mapAwardGroups}
                playerRows={sectionExtended.playerMapPerformanceRows}
                tileRows={sectionExtended.tilePlacementRows}
              />
            </>
          ) : null}

          <ChartFrame
            description="Direct matchup records between players — wins-losses-ties and the average point margin across their shared games."
            title="Head-to-Head Lens"
          >
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

          {showExtendedSections ? (
            <>
          <ChartFrame
            description="How win rate and average score shift depending on which players are at the table together."
            title="Lineup Effects"
          >
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
                        {sectionFocusPlayerId ? row.lineupLabel : row.playerName}
                      </h3>
                      <p className="tm-accent-copy text-sm">
                        {formatPercent(row.winRate)}
                      </p>
                    </div>
                    <p className="tm-muted-copy mt-2 text-sm">
                      {sectionFocusPlayerId
                        ? `${row.gamesPlayed} games | avg ${formatAverage(row.averageScore)} points | ${formatAverage(row.averageGenerationCount)} gens`
                        : `${truncateLabel(row.lineupLabel)} | ${row.gamesPlayed} games | avg ${formatAverage(row.averageScore)} points`}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </ChartFrame>

          {!isPlayerCombinationMode ? (
            <>
              <MilestoneEconomicsSection
                focusPlayerId={sectionFocusPlayerId}
                focusPlayerName={sectionFocusPlayerName}
                groupRows={sectionExtended.milestoneEconomicsRows}
                playerRows={sectionExtended.playerMilestoneClaimRows}
              />

              <AwardEconomicsSection
                defaultScope={scopeMode === 'individual' ? 'all' : 'group'}
                focusPlayerName={selectedPerson?.displayName ?? null}
                groupFocusPlayerId={selectedPerson?.activeGroupPlayerId ?? null}
                groupMatrixRows={extended.awardFunderWinnerRows}
                groupOutcomeRows={extended.awardOutcomeRows}
                groupPlayerAwardRows={extended.playerAwardFundingRows}
                overallFocusPlayerId={selectedPerson?.canonicalId ?? null}
                overallMatrixRows={overallExtended.awardFunderWinnerRows}
                overallOutcomeRows={overallExtended.awardOutcomeRows}
                overallPlayerAwardRows={overallExtended.playerAwardFundingRows}
              />
            </>
          ) : null}

          <CardOutcomesSection
            focusPlayerId={sectionFocusPlayerId}
            focusPlayerName={sectionFocusPlayerName}
            rows={sectionExtended.cardOutcomeRows}
          />

          <TagOutcomesSection
            dialogData={selectionDialogData}
            focusPlayerId={sectionFocusPlayerId}
            focusPlayerName={sectionFocusPlayerName}
            rows={sectionExtended.tagOutcomeRows}
          />

          <GamePaceSection rows={sectionExtended.generationPaceRows} />

          <BoardHeatmapSection
            mapGroups={mapAwardGroups}
            rows={sectionExtended.tilePlacementRows}
            title={scopeMode === 'all' ? 'Global Board Heatmap' : 'Board Heatmap'}
          />

          {selectedInteractionRows.length > 0 ? (
            <ChartFrame
              description="Win rates for specific corporation-and-prelude pairings, ranked by how often they show up."
              title="Interaction Insights"
            >
              <div className="grid gap-3">
                {selectedInteractionRows.map((row) => (
                  <article
                    className="tm-stat-card"
                    key={`${row.playerId ?? 'group'}-${row.interactionType}-${row.label}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-stone-100">
                        <SelectionPairLabel
                          dialogData={selectionDialogData}
                          label={row.label}
                        />
                      </h3>
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
            </>
          ) : null}

          <ChartFrame
            description="Share of finalized games that recorded each optional breakdown detail. Low bars mean the detail is missing from those games, not that it was zero."
            title={coverageTitle}
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
            <GlossaryRichText>
              Finalize a few games to unlock leaderboard, style, lineup, and coverage insights.
            </GlossaryRichText>
          </p>
        </ChartFrame>
      )}
    </div>
  );
}
