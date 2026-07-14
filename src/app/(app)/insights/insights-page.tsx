import { AppShell } from '@/components/layout/app-shell';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { InsightsDashboard } from '@/features/insights/insights-dashboard';
import { SelectionStatsSection } from '@/features/insights/selection-stats-section';
import {
  buildStyleScope,
  FIELD_SUBJECT,
  GROUP_SUBJECT,
  SELF_SUBJECT,
} from '@/features/insights/style-effectiveness-scopes';
import {
  listMapAwardGroups,
  type MapAwardGroup,
} from '@/lib/db/reference-repo';
import type {
  CrossGroupFocusPerson,
  GroupAnalytics,
  OverallAnalytics,
  SharedGameResultRow,
} from '@/lib/db/analytics-repo';
import {
  buildEmptyGroupAnalytics,
  getCrossGroupFocusData,
  getGroupAnalytics,
  getOverallAnalytics,
  getStyleEffectiveness,
  listSharedGameResultRows,
  type StyleEffectivenessData,
} from '@/lib/db/analytics-repo';
import type { ExtendedGroupAnalytics } from '@/lib/db/extended-analytics-repo';
import { getExtendedGroupAnalytics } from '@/lib/db/extended-analytics-repo';
import {
  getFinalTerraformingActionStats,
  getSelectionDialogData,
  getSelectionStats,
  type FinalTerraformingActionStat,
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
const emptyFinalTerraformingActionStats: FinalTerraformingActionStat[] = [];

const emptyStyleEffectiveness: StyleEffectivenessData = {
  scoreAverages: null,
  styleRows: [],
};

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

export type InsightsPageMode = 'group' | 'individual';

export async function InsightsPageContent({ mode }: { mode: InsightsPageMode }) {
  const context = await requireGroupContextOrRedirect();
  const returnPath = `/insights/${mode}`;
  const title = mode === 'group' ? 'Group Insights' : 'Individual Insights';
  const [
    analytics,
    extendedAnalytics,
    focusPeople,
    overallAnalytics,
    personalSelectionStats,
    globalSelectionStats,
    finalTerraformingActionStats,
    mapAwardGroups,
    groupStyleEffectiveness,
    globalStyleEffectiveness,
    personalStyleEffectiveness,
    sharedGameRows,
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
      'final terraforming action stats',
      mode === 'individual'
        ? getFinalTerraformingActionStats({ scope: 'personal' })
        : Promise.resolve(emptyFinalTerraformingActionStats),
      emptyFinalTerraformingActionStats,
    ),
    loadInsightsDataOrDefault(
      'map award groups',
      listMapAwardGroups(),
      [] as MapAwardGroup[],
    ),
    loadInsightsDataOrDefault(
      'group style effectiveness',
      getStyleEffectiveness('group', context.groupId),
      emptyStyleEffectiveness,
    ),
    loadInsightsDataOrDefault(
      'global style effectiveness',
      getStyleEffectiveness('global'),
      emptyStyleEffectiveness,
    ),
    loadInsightsDataOrDefault(
      'personal style effectiveness',
      getStyleEffectiveness('personal'),
      emptyStyleEffectiveness,
    ),
    loadInsightsDataOrDefault(
      'shared game result rows',
      listSharedGameResultRows(context.userId),
      [] as SharedGameResultRow[],
    ),
  ]);

  const groupStyleScope = buildStyleScope({
    data: groupStyleEffectiveness,
    key: 'group',
    label: 'This group',
    subject: GROUP_SUBJECT,
  });
  const personalStyleScope = buildStyleScope({
    data: personalStyleEffectiveness,
    key: 'personal',
    label: 'Your games',
    subject: SELF_SUBJECT,
  });
  const globalStyleScope = buildStyleScope({
    data: globalStyleEffectiveness,
    key: 'global',
    label: 'Global',
    subject: FIELD_SUBJECT,
  });
  const styleEffectivenessScopes =
    mode === 'group'
      ? [groupStyleScope, personalStyleScope, globalStyleScope]
      : [personalStyleScope, globalStyleScope];

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
      title={title}
      wide
    >
      <InsightsDashboard
        analytics={analytics}
        currentUserCanonicalId={`user:${context.userId}`}
        extended={extendedAnalytics}
        finalTerraformingActionStats={finalTerraformingActionStats}
        focusPeople={focusPeople}
        mapAwardGroups={mapAwardGroups}
        overallAnalytics={overallAnalytics.analytics}
        overallExtended={overallAnalytics.extended}
        personalSelectionStats={personalSelectionStats}
        selectionDialogData={selectionDialogData}
        sharedGameRows={sharedGameRows}
        scopeMode={mode}
        styleEffectivenessScopes={styleEffectivenessScopes}
      >
        {mode === 'group' ? (
          <GroupSwitcher currentGroupId={context.groupId} returnPath={returnPath} />
        ) : null}
      </InsightsDashboard>
      {mode === 'individual' ? (
        <SelectionStatsSection
          dialogData={selectionDialogData}
          finalTerraformingActions={finalTerraformingActionStats}
          global={globalSelectionStats}
          headToHead={emptyHeadToHeadStats}
          mapAwardGroups={mapAwardGroups}
          mergerImpact={emptyMergerImpactStats}
          personal={personalSelectionStats}
        />
      ) : null}
    </AppShell>
  );
}
