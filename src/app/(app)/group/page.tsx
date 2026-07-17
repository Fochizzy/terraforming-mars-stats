import { AppShell } from '@/components/layout/app-shell';
import { GroupDashboard } from '@/features/analytics/group-dashboard';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { FinalTerraformingActionTable } from '@/features/insights/final-terraforming-action-table';
import { getGroupAnalytics } from '@/lib/db/analytics-repo';
import {
  getFinalTerraformingActionStats,
  type FinalTerraformingActionStat,
} from '@/lib/db/final-terraforming-action-repo';
import { pageMetadata } from '@/lib/navigation/route-metadata';

export const metadata = pageMetadata('/group');

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

export default async function GroupPage() {
  const context = await requireGroupContextOrRedirect();
  const [groupAnalytics, finalTerraformingActionStats] = await Promise.all([
    getGroupAnalytics(context.groupId),
    loadFinalTerraformingActionStats(context.groupId),
  ]);

  return (
    <AppShell
      hasActiveGroup
      headerActions={
        <GroupSwitcher currentGroupId={context.groupId} returnPath="/group" />
      }
      title="Group"
    >
      <div className="flex flex-col gap-6">
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
          headToHeadRows={groupAnalytics.headToHeadRows}
          leaderboardRows={groupAnalytics.leaderboardRows}
          lineupEffectRows={groupAnalytics.lineupEffectRows}
          playerEfficiencySummaries={groupAnalytics.playerEfficiencySummaries}
          playerMapMetricRows={groupAnalytics.playerMapMetricRows}
          scoreAverages={groupAnalytics.scoreAverages}
          styleAgreementRows={groupAnalytics.styleAgreementRows}
        />
        <FinalTerraformingActionTable rows={finalTerraformingActionStats} />
      </div>
    </AppShell>
  );
}
