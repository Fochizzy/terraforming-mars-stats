import { AppShell } from '@/components/layout/app-shell';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { InsightsDashboard } from '@/features/insights/insights-dashboard';
import { SelectionStatsSection } from '@/features/insights/selection-stats-section';
import {
  listMapAwardGroups,
  type MapAwardGroup,
} from '@/lib/db/reference-repo';
import type {
  CrossGroupFocusPerson,
  GroupAnalytics,
  OverallAnalytics,
} from '@/lib/db/analytics-repo';
import {
  buildEmptyGroupAnalytics,
  getCrossGroupFocusData,
  getGroupAnalytics,
  getOverallAnalytics,
} from '@/lib/db/analytics-repo';
import type { ExtendedGroupAnalytics } from '@/lib/db/extended-analytics-repo';
import { getExtendedGroupAnalytics } from '@/lib/db/extended-analytics-repo';
import {
  getHeadToHeadStats,
  getMergerImpactStats,
  getSelectionDialogData,
  getSelectionStats,
  type HeadToHeadStats,
  type MergerImpactStat,
  type SelectionDialogData,
  type SelectionStats,
} from '@/lib/db/selection-stats-repo';

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
  cardOutcomeRows: [],
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

const emptyOverallAnalytics: OverallAnalytics = {
  analytics: buildEmptyGroupAnalytics(),
  extended: emptyExtendedAnalytics,
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
  totalGames: 0,
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

export default async function InsightsPage() {
  const context = await requireGroupContextOrRedirect();
  const [
    analytics,
    extendedAnalytics,
    focusPeople,
    overallAnalytics,
    personalSelectionStats,
    globalSelectionStats,
    headToHeadStats,
    mergerImpactStats,
    mapAwardGroups,
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
      'cross-group focus players',
      getCrossGroupFocusData(context.userId, context.groupId),
      [] as CrossGroupFocusPerson[],
    ),
    loadInsightsDataOrDefault(
      'overall cross-group analytics',
      getOverallAnalytics(context.userId),
      emptyOverallAnalytics,
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
    loadInsightsDataOrDefault(
      'map award groups',
      listMapAwardGroups(),
      [] as MapAwardGroup[],
    ),
  ]);

  const selectionDialogData = await loadInsightsDataOrDefault<
    SelectionDialogData | undefined
  >(
    'selection dialog data',
    getSelectionDialogData(personalSelectionStats, globalSelectionStats),
    undefined,
  );

  return (
    <AppShell
      showReviewSavedGamesLink
      title="Insights"
      wide
    >
      <InsightsDashboard
        analytics={analytics}
        extended={extendedAnalytics}
        focusPeople={focusPeople}
        mapAwardGroups={mapAwardGroups}
        overallAnalytics={overallAnalytics.analytics}
        overallExtended={overallAnalytics.extended}
        selectionDialogData={selectionDialogData}
      >
        <GroupSwitcher currentGroupId={context.groupId} returnPath="/insights" />
      </InsightsDashboard>
      <SelectionStatsSection
        dialogData={selectionDialogData}
        global={globalSelectionStats}
        headToHead={headToHeadStats}
        mapAwardGroups={mapAwardGroups}
        mergerImpact={mergerImpactStats}
        personal={personalSelectionStats}
      />
    </AppShell>
  );
}
