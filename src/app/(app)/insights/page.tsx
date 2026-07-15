import { AppShell } from '@/components/layout/app-shell';
import { CorporationPreludePairingsPanel } from '@/features/analytics/corporation-prelude-pairings-panel';
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

  const pairingRows = analytics.groupInteractionRows.filter(
    (row) => row.interactionType === 'corporation_prelude_pair',
  );
  const dashboardAnalytics = {
    ...analytics,
    groupInteractionRows: analytics.groupInteractionRows.filter(
      (row) => row.interactionType !== 'corporation_prelude_pair',
    ),
    playerInteractionRows: analytics.playerInteractionRows.filter(
      (row) => row.interactionType !== 'corporation_prelude_pair',
    ),
  };
  const baselineGames = analytics.leaderboardRows.reduce(
    (total, row) => total + row.gamesPlayed,
    0,
  );
  const baselineWins = analytics.leaderboardRows.reduce(
    (total, row) => total + row.wins,
    0,
  );
  const baselineWinRate =
    baselineGames > 0 ? baselineWins / baselineGames : null;

  return (
    <AppShell
      headerActions={
        <GroupSwitcher
          currentGroupId={context.groupId}
          returnPath="/insights"
        />
      }
      title="Insights"
    >
      <div className="flex flex-col gap-4">
        <CorporationPreludePairingsPanel
          baselineWinRate={baselineWinRate}
          rows={pairingRows}
          scoreAverages={analytics.scoreAverages}
        />
        <InsightsDashboard
          analytics={dashboardAnalytics}
          players={players.map((player) => ({
            id: player.id,
            displayName: player.display_name,
          }))}
          promoCards={promoCards}
          promoSets={promoSets}
        />
      </div>
    </AppShell>
  );
}
