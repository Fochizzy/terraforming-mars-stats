import { AppShell } from '@/components/layout/app-shell';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { InsightsDashboard } from '@/features/insights/insights-dashboard';
import { SelectionStatsSection } from '@/features/insights/selection-stats-section';
import type { GroupAnalytics, GroupHeadToHeadRow } from '@/lib/db/analytics-repo';
import { getGroupAnalytics } from '@/lib/db/analytics-repo';
import type { ExtendedGroupAnalytics } from '@/lib/db/extended-analytics-repo';
import { getExtendedGroupAnalytics } from '@/lib/db/extended-analytics-repo';
import {
  getHeadToHeadStats,
  getMergerImpactStats,
  getSelectionStats,
  type HeadToHeadStats,
  type MergerImpactStat,
  type SelectionStats,
} from '@/lib/db/selection-stats-repo';
import { listPlayers } from '@/lib/db/player-repo';

type InsightPlayerOption = {
  displayName: string;
  id: string;
};

type InsightPlayerRow = {
  display_name: string;
  id: string;
  linked_user_id: string | null;
};

const emptyGroupAnalytics: GroupAnalytics = {
  coverage: null,
  groupInteractionRows: [],
  groupStylePerformanceRows: [],
  headToHeadRows: [],
  importCoverageRows: [],
  leaderboardRows: [],
  lineupEffectRows: [],
  playerCoverages: [],
  playerInteractionRows: [],
  playerScoreAverages: [],
  playerStylePerformanceRows: [],
  playerTrendRows: [],
  scoreAverages: null,
  styleAgreementRows: [],
};

const emptyExtendedAnalytics: ExtendedGroupAnalytics = {
  awardFunderWinnerRows: [],
  awardOutcomeRows: [],
  gameLengthPerformanceRows: [],
  generationDistributionRows: [],
  generationPaceRows: [],
  groupMapPerformanceRows: [],
  milestoneEconomicsRows: [],
  placementDistributionRows: [],
  playerCountPerformanceRows: [],
  playerMapPerformanceRows: [],
  playerMilestoneClaimRows: [],
  tagOutcomeRows: [],
  tilePlacementRows: [],
};

const emptySelectionStats: SelectionStats = {
  awardFunding: [],
  baselineWinRate: 0,
  cards: [],
  corporations: [],
  corporationTags: [],
  pairs: [],
  preludes: [],
  tagWins: [],
};

const emptyHeadToHeadStats: HeadToHeadStats = {
  corporationMatchups: [],
  pairs: [],
};

const emptyMergerImpactStats: MergerImpactStat[] = [];

async function loadInsightsDataOrDefault<T>(
  label: string,
  loadData: Promise<T>,
  fallback: T,
) {
  try {
    return await loadData;
  } catch (error) {
    console.error(`[insights] Failed to load ${label}`, error);
    return fallback;
  }
}

function buildSelectableInsightPlayers(input: {
  headToHeadRows: GroupHeadToHeadRow[];
  players: InsightPlayerRow[];
  userId: string;
}): InsightPlayerOption[] {
  const linkedPlayerIds = new Set(
    input.players
      .filter((player) => player.linked_user_id === input.userId)
      .map((player) => player.id),
  );

  if (linkedPlayerIds.size === 0) {
    return [];
  }

  const selectablePlayerIds = new Set(linkedPlayerIds);

  for (const row of input.headToHeadRows) {
    if (linkedPlayerIds.has(row.leftPlayerId)) {
      selectablePlayerIds.add(row.rightPlayerId);
    }

    if (linkedPlayerIds.has(row.rightPlayerId)) {
      selectablePlayerIds.add(row.leftPlayerId);
    }
  }

  return input.players
    .filter((player) => selectablePlayerIds.has(player.id))
    .map((player) => ({
      id: player.id,
      displayName: player.display_name,
    }));
}

export default async function InsightsPage() {
  const context = await requireGroupContextOrRedirect();
  const [
    analytics,
    extendedAnalytics,
    players,
    personalSelectionStats,
    globalSelectionStats,
    headToHeadStats,
    mergerImpactStats,
  ] = await Promise.all([
    loadInsightsDataOrDefault(
      'group analytics',
      getGroupAnalytics(context.groupId),
      emptyGroupAnalytics,
    ),
    loadInsightsDataOrDefault(
      'extended analytics',
      getExtendedGroupAnalytics(context.groupId),
      emptyExtendedAnalytics,
    ),
    loadInsightsDataOrDefault(
      'players',
      listPlayers(context.groupId),
      [] as InsightPlayerRow[],
    ),
    loadInsightsDataOrDefault(
      'personal selection stats',
      getSelectionStats('personal'),
      emptySelectionStats,
    ),
    loadInsightsDataOrDefault(
      'global selection stats',
      getSelectionStats('global'),
      emptySelectionStats,
    ),
    loadInsightsDataOrDefault(
      'head-to-head selection stats',
      getHeadToHeadStats(context.groupId),
      emptyHeadToHeadStats,
    ),
    loadInsightsDataOrDefault(
      'Merger impact stats',
      getMergerImpactStats(context.groupId),
      emptyMergerImpactStats,
    ),
  ]);
  const selectablePlayers = buildSelectableInsightPlayers({
    headToHeadRows: analytics.headToHeadRows,
    players,
    userId: context.userId,
  });

  return (
    <AppShell
      headerActions={
        <GroupSwitcher currentGroupId={context.groupId} returnPath="/insights" />
      }
      showReviewSavedGamesLink
      title="Insights"
      wide
    >
      <InsightsDashboard
        analytics={analytics}
        extended={extendedAnalytics}
        players={selectablePlayers}
      />
      <SelectionStatsSection
        global={globalSelectionStats}
        headToHead={headToHeadStats}
        mergerImpact={mergerImpactStats}
        personal={personalSelectionStats}
      />
    </AppShell>
  );
}
