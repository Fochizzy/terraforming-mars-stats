'use client';

import { type ReactNode, useMemo, useState } from 'react';
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
  TrendRow,
} from '@/lib/db/analytics-repo';
import type { ExtendedGroupAnalytics } from '@/lib/db/extended-analytics-repo';
import { GlossaryLink } from '@/features/glossary/glossary-link';
import { buildInsightCards, type InsightCard } from './build-insight-cards';
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

type InsightsDashboardProps = {
  analytics: GroupAnalytics;
  children?: ReactNode;
  extended: ExtendedGroupAnalytics;
  focusPeople: CrossGroupFocusPerson[];
  overallAnalytics: GroupAnalytics;
  overallExtended: ExtendedGroupAnalytics;
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

export function InsightsDashboard({
  analytics,
  children: groupSwitcher,
  extended,
  focusPeople,
  overallAnalytics,
  overallExtended,
}: InsightsDashboardProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string>('all');
  const [focusScope, setFocusScope] = useState<FocusScope>('overall');

  const selectedPerson =
    selectedPersonId === 'all'
      ? null
      : focusPeople.find((person) => person.canonicalId === selectedPersonId) ?? null;
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
  const selectedStyleRows = sectionFocusPlayerId
    ? sectionAnalytics.styleAgreementRows.filter(
        (row) => row.playerId === sectionFocusPlayerId,
      )
    : sectionAnalytics.styleAgreementRows.slice(0, 6);
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
        styleAgreementRows: analytics.styleAgreementRows,
        trendRows: analytics.playerTrendRows,
      });
    },
    [
      activeGroupPlayerId,
      analytics.headToHeadRows,
      analytics.leaderboardRows,
      analytics.lineupEffectRows,
      analytics.playerTrendRows,
      analytics.styleAgreementRows,
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
  const leaderboardChartData = leaderboardRows.slice(0, 6).map((row) => ({
    name: row.playerName,
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
  const styleAgreementData = selectedStyleRows.map((row) => ({
    exact: Math.round(row.exactMatchRate * 100),
    mismatch: Math.round(row.mismatchRate * 100),
    partial: Math.round(row.partialMatchRate * 100),
    playerName: row.playerName,
  }));
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
  const focusBadgeText = isGroupScope
    ? focusPlayerName
      ? selectedPerson?.inActiveGroup
        ? `Focused on ${focusPlayerName} in selected group`
        : `${focusPlayerName} is outside selected group`
      : 'Focused on selected group'
    : focusPlayerName
      ? `Focused on ${focusPlayerName} overall`
      : 'Focused on all shared players';
  const scoreProfileTitle = focusPlayerName
    ? isGroupScope
      ? `Score Profile for ${focusPlayerName} in Selected Group`
      : `Score Profile for ${focusPlayerName}`
    : isGroupScope
      ? 'Group Score Profile'
      : 'Overall Score Profile';
  const radarGroupAverages = isGroupScope
    ? analytics.scoreAverages
    : overallFocusBundle?.scoreAverages ?? selectedScoreProfile;
  const radarPlayerAverages = isGroupScope
    ? groupPlayerScoreAverages
    : selectedPerson?.bundle.scoreAverages ?? null;
  const leaderboardTitle = isGroupScope
    ? 'Weighted Leaderboard Comparison'
    : 'Overall Weighted Leaderboard';
  const coverageTitle = focusPlayerName
    ? isGroupScope
      ? `Optional Data Coverage for ${focusPlayerName} in Selected Group`
      : `Optional Data Coverage for ${focusPlayerName}`
    : isGroupScope
      ? 'Group Optional Data Coverage'
      : 'Overall Optional Data Coverage';

  const hasAnalytics =
    bundle !== null ||
    analytics.leaderboardRows.length > 0 ||
    analytics.headToHeadRows.length > 0 ||
    selectedInteractionRows.length > 0 ||
    analytics.lineupEffectRows.length > 0 ||
    analytics.styleAgreementRows.length > 0 ||
    analytics.scoreAverages !== null ||
    analytics.coverage !== null;

  return (
    <div className="flex flex-col gap-4">
      <ChartFrame
        description="Pick a player and a scope to refocus every chart below. All figures are built from finalized games only."
        title="Insights Lab"
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
            <div className="relative">
              <label className="tm-data-label" htmlFor="player-focus-select">
                Player Focus
              </label>
              <select
                aria-label="Player focus"
                className="tm-input mt-2 w-full appearance-none pr-9"
                id="player-focus-select"
                onChange={(event) => setSelectedPersonId(event.target.value)}
                value={selectedPersonId}
              >
                <option value="all">All players</option>
                {focusPeople.map((person) => (
                  <option key={person.canonicalId} value={person.canonicalId}>
                    {person.displayName}
                  </option>
                ))}
              </select>
              <span className="mt-2 block">
                <SelectChevron />
              </span>
            </div>
            <div className="relative">
              <label className="tm-data-label" htmlFor="insight-scope-select">
                Scope
              </label>
              <select
                aria-label="Insight scope"
                className="tm-input mt-2 w-full appearance-none pr-9"
                id="insight-scope-select"
                onChange={(event) => setFocusScope(event.target.value as FocusScope)}
                value={focusScope}
              >
                <option value="overall">Overall</option>
                <option value="group">Selected group</option>
              </select>
              <span className="mt-2 block">
                <SelectChevron />
              </span>
            </div>
            {groupSwitcher ? (
              <div className="lg:col-span-2">
                <p className="tm-data-label">Selected Group</p>
                <div className="mt-2">{groupSwitcher}</div>
              </div>
            ) : null}
            <div className="lg:col-span-2">
              <span className="tm-coverage-badge">{focusBadgeText}</span>
            </div>
          </div>
          <p className="tm-body-copy text-sm">
            Compare{' '}
            <GlossaryLink slug="weighted-score">weighted leaderboard</GlossaryLink>{' '}
            form,{' '}
            <GlossaryLink slug="score-sources">score-source</GlossaryLink>{' '}
            patterns,{' '}
            <GlossaryLink slug="style-agreement">style agreement</GlossaryLink>,{' '}
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
                  <p className="tm-muted-copy mt-2 text-sm">{card.body}</p>
                  <p className="mt-3 text-xs" style={{ color: 'var(--tm-muted)' }}>
                    Sample size: {card.sampleSize}
                  </p>
                </article>
              ))}
            </div>
          </ChartFrame>

          {isGroupScope && selectedPerson && !selectedPerson.inActiveGroup ? (
            <ChartFrame title="Selected Group Unavailable">
              <p className="tm-body-copy text-sm">
                {focusPlayerName} doesn&apos;t have a player row in the selected
                group, so group-only breakdowns are unavailable for that
                combination.
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

          {showExtendedSections ? (
          <ChartFrame
            description="How often each player's declared play style matched the style inferred from their actual scoring — exact, partial, or mismatched."
            title={
              sectionFocusPlayerName
                ? `Style Agreement for ${sectionFocusPlayerName}`
                : 'Style Agreement'
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
                playerRows={sectionExtended.playerMapPerformanceRows}
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

          <MilestoneEconomicsSection
            focusPlayerId={sectionFocusPlayerId}
            focusPlayerName={sectionFocusPlayerName}
            groupRows={sectionExtended.milestoneEconomicsRows}
            playerRows={sectionExtended.playerMilestoneClaimRows}
          />

          <AwardEconomicsSection
            focusPlayerName={selectedPerson?.displayName ?? null}
            groupFocusPlayerId={selectedPerson?.activeGroupPlayerId ?? null}
            groupMatrixRows={extended.awardFunderWinnerRows}
            groupOutcomeRows={extended.awardOutcomeRows}
            overallFocusPlayerId={selectedPerson?.canonicalId ?? null}
            overallMatrixRows={overallExtended.awardFunderWinnerRows}
            overallOutcomeRows={overallExtended.awardOutcomeRows}
          />

          <CardOutcomesSection
            focusPlayerId={sectionFocusPlayerId}
            focusPlayerName={sectionFocusPlayerName}
            rows={sectionExtended.cardOutcomeRows}
          />

          <TagOutcomesSection
            focusPlayerId={sectionFocusPlayerId}
            focusPlayerName={sectionFocusPlayerName}
            rows={sectionExtended.tagOutcomeRows}
          />

          <GamePaceSection rows={sectionExtended.generationPaceRows} />

          <BoardHeatmapSection rows={sectionExtended.tilePlacementRows} />

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
