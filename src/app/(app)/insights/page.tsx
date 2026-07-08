import { AppShell } from '@/components/layout/app-shell';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { InsightsDashboard } from '@/features/insights/insights-dashboard';
import { SelectionStatsSection } from '@/features/insights/selection-stats-section';
import { getGroupAnalytics } from '@/lib/db/analytics-repo';
import {
  getHeadToHeadStats,
  getSelectionStats,
} from '@/lib/db/selection-stats-repo';
import { listPlayers } from '@/lib/db/player-repo';
import { listPromoCards, listPromoSets } from '@/lib/db/reference-repo';

export default async function InsightsPage() {
  const context = await requireGroupContextOrRedirect();
  const [
    analytics,
    players,
    promoSets,
    promoCards,
    personalSelectionStats,
    globalSelectionStats,
    headToHeadStats,
  ] = await Promise.all([
    getGroupAnalytics(context.groupId),
    listPlayers(context.groupId),
    listPromoSets(),
    listPromoCards(),
    getSelectionStats('personal'),
    getSelectionStats('global'),
    getHeadToHeadStats(context.groupId),
  ]);

  return (
    <AppShell
      headerActions={
        <GroupSwitcher currentGroupId={context.groupId} returnPath="/insights" />
      }
      title="Insights"
      wide
    >
      <InsightsDashboard
        analytics={analytics}
        players={players.map((player) => ({
          id: player.id,
          displayName: player.display_name,
        }))}
        promoCards={promoCards}
        promoSets={promoSets}
      />
      <SelectionStatsSection
        global={globalSelectionStats}
        headToHead={headToHeadStats}
        personal={personalSelectionStats}
      />
    </AppShell>
  );
}
