import { ChartFrame } from '@/components/charts/chart-frame';
import { AppShell } from '@/components/layout/app-shell';
import { CorporationScoreSourceChart } from '@/features/analytics/corporation-score-source-chart';
import { GroupDashboard } from '@/features/analytics/group-dashboard';
import { GroupPlayerFilter } from '@/features/groups/group-player-filter';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { FinalTerraformingActionTable } from '@/features/insights/final-terraforming-action-table';
import { getGroupAnalytics } from '@/lib/db/analytics-repo';
import { listCorporationScoreSources } from '@/lib/db/corporation-score-source-repo';
import {
  getFinalTerraformingActionStats,
  type FinalTerraformingActionStat,
} from '@/lib/db/final-terraforming-action-repo';
import { listPlayers } from '@/lib/db/player-repo';

async function loadFinalTerraformingActionStats(
  groupId: string,
): Promise<FinalTerraformingActionStat[]> {
  try {
    return await getFinalTerraformingActionStats({
      groupId,
      scope: 'group',
    });
  } catch (error) {
    console.error(
      '[group] Failed to load final terraforming action statistics',
      error,
    );
    return [];
  }
}

async function loadCorporationScoreSources(groupId: string) {
  try {
    return await listCorporationScoreSources(groupId);
  } catch (error) {
    console.error('[group] Failed to load corporation score-source analytics', error);
    return [];
  }
}

export default async function GroupPage({
  searchParams,
}: {
  searchParams: Promise<{ players?: string }>;
}) {
  const context = await requireGroupContextOrRedirect();
  const params = await searchParams;
  const [
    groupAnalytics,
    finalTerraformingActionStats,
    corporationScoreSources,
    players,
  ] = await Promise.all([
    getGroupAnalytics(context.groupId),
    loadFinalTerraformingActionStats(context.groupId),
    loadCorporationScoreSources(context.groupId),
    listPlayers(context.groupId),
  ]);

  const availablePlayerIds = new Set(players.map((player) => player.id));
  const requestedPlayerIds = (params.players ?? '')
    .split(',')
    .filter((playerId) => availablePlayerIds.has(playerId));
  const selectedPlayerIds = params.players === undefined
    ? players.map((player) => player.id)
    : requestedPlayerIds;
  const selectedPlayerIdSet = new Set(selectedPlayerIds);

  const leaderboardRows = groupAnalytics.leaderboardRows.filter((row) =>
    selectedPlayerIdSet.has(row.playerId),
  );
  const lineupEffectRows = groupAnalytics.lineupEffectRows.filter((row) =>
    selectedPlayerIdSet.has(row.playerId),
  );
  const playerEfficiencySummaries = groupAnalytics.playerEfficiencySummaries.filter((row) =>
    selectedPlayerIdSet.has(row.playerId),
  );
  const playerMapMetricRows = groupAnalytics.playerMapMetricRows.filter((row) =>
    selectedPlayerIdSet.has(row.playerId),
  );
  const styleAgreementRows = groupAnalytics.styleAgreementRows.filter((row) =>
    selectedPlayerIdSet.has(row.playerId),
  );
  const headToHeadRows = groupAnalytics.headToHeadRows.filter(
    (row) =>
      selectedPlayerIdSet.has(row.leftPlayerId) &&
      selectedPlayerIdSet.has(row.rightPlayerId),
  );

  return (
    <AppShell title="Group">
      <div className="flex flex-col gap-6">
        <GroupPlayerFilter
          players={players}
          selectedPlayerIds={selectedPlayerIds}
        />
        <ChartFrame title="Scoring Composition by Corporation">
          <CorporationScoreSourceChart rows={corporationScoreSources} />
        </ChartFrame>
        <GroupDashboard
          coverage={groupAnalytics.coverage}
          globalAwardMetricRows={groupAnalytics.globalAwardMetricRows}
          globalCorporationMetricRows={groupAnalytics.globalCorporationMetricRows}
          globalGenerationMetricRows={groupAnalytics.globalGenerationMetricRows}
          globalMapMetricRows={groupAnalytics.globalMapMetricRows}
          globalMilestoneMetricRows={groupAnalytics.globalMilestoneMetricRows}
          globalPlayerCountMetricRows={groupAnalytics.globalPlayerCountMetricRows}
          globalStyleMetricRows={groupAnalytics.globalStyleMetricRows}
          globalTagMetricRows={groupAnalytics.globalTagMetricRows}
          headToHeadRows={headToHeadRows}
          leaderboardRows={leaderboardRows}
          lineupEffectRows={lineupEffectRows}
          playerEfficiencySummaries={playerEfficiencySummaries}
          playerMapMetricRows={playerMapMetricRows}
          scoreAverages={groupAnalytics.scoreAverages}
          styleAgreementRows={styleAgreementRows}
        />
        <FinalTerraformingActionTable rows={finalTerraformingActionStats} />
      </div>
    </AppShell>
  );
}
