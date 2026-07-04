import { AppShell } from '@/components/layout/app-shell';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { InsightsDashboard } from '@/features/insights/insights-dashboard';
import { getGroupAnalytics } from '@/lib/db/analytics-repo';
import { listPlayers } from '@/lib/db/player-repo';
import { listPromoCards, listPromoSets } from '@/lib/db/reference-repo';

export default async function InsightsPage() {
  const context = await requireGroupContextOrRedirect();
  const [analytics, players, promoSets, promoCards] = await Promise.all([
    getGroupAnalytics(context.groupId),
    listPlayers(context.groupId),
    listPromoSets(),
    listPromoCards(),
  ]);

  return (
    <AppShell
      headerActions={
        <GroupSwitcher currentGroupId={context.groupId} returnPath="/insights" />
      }
      title="Insights"
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
    </AppShell>
  );
}
