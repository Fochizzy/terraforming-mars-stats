import { AppShell } from '@/components/layout/app-shell';
import { InsightsDashboard } from '@/features/insights/insights-dashboard';
import { getGroupAnalytics } from '@/lib/db/analytics-repo';
import { requireCurrentGroupContext } from '@/lib/db/group-context-repo';
import { listPlayers } from '@/lib/db/player-repo';
import { listPromoCards, listPromoSets } from '@/lib/db/reference-repo';

export default async function InsightsPage() {
  const context = await requireCurrentGroupContext();
  const [analytics, players, promoSets, promoCards] = await Promise.all([
    getGroupAnalytics(context.groupId),
    listPlayers(context.groupId),
    listPromoSets(),
    listPromoCards(),
  ]);

  return (
    <AppShell title="Insights">
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
