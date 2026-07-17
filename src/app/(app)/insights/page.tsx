import { AppShell } from '@/components/layout/app-shell';
import { CorporationPreludePairingsPanel } from '@/features/analytics/corporation-prelude-pairings-panel';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { GamePaceReplay } from '@/features/insights/game-pace-replay';
import { InsightsDashboard } from '@/features/insights/insights-dashboard';
import { ScoreProfilePanel } from '@/features/insights/score-profile-panel';
import { getGroupAnalytics } from '@/lib/db/analytics-repo';
import { listGamePaceReplays } from '@/lib/db/game-pace-repo';
import { listPlayers } from '@/lib/db/player-repo';
import { redirect } from 'next/navigation';
import { LegacyInsightsHashRedirect } from '@/features/navigation/legacy-insights-hash-redirect';
import {
  getInsightsCompatibilityDestination,
  type InsightsSearchParams,
} from '@/features/navigation/insights-compatibility';

export default async function InsightsPage({
  searchParams,
}: {
  searchParams?: Promise<InsightsSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const compatibilityTarget = getInsightsCompatibilityDestination(resolvedSearchParams);
  if (compatibilityTarget) {
    redirect(compatibilityTarget);
  }

  const context = await requireGroupContextOrRedirect();
  const [analytics, players, gamePaceReplays] = await Promise.all([
    getGroupAnalytics(context.groupId),
    listPlayers(context.groupId),
    listGamePaceReplays(context.groupId),
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
  const scoreProfileEntries = analytics.scoreAverages
    ? [
        { label: 'Terraform Rating', value: analytics.scoreAverages.averageTrPoints },
        { label: 'Card Points', value: analytics.scoreAverages.averageCardPoints },
        { label: 'Other Card', value: analytics.scoreAverages.averageOtherCardPoints },
        { label: 'Greenery', value: analytics.scoreAverages.averageGreeneryPoints },
        { label: 'Cities', value: analytics.scoreAverages.averageCitiesPoints },
        { label: 'Milestones', value: analytics.scoreAverages.averageMilestonePoints },
        { label: 'Awards', value: analytics.scoreAverages.averageAwardPoints },
        { label: 'Jovian', value: analytics.scoreAverages.averageJovianPoints },
        { label: 'Microbe', value: analytics.scoreAverages.averageMicrobePoints },
        { label: 'Animal', value: analytics.scoreAverages.averageAnimalPoints },
      ]
    : [];

  return (
    <AppShell
      hasActiveGroup
      headerActions={
        <GroupSwitcher
          currentGroupId={context.groupId}
          returnPath="/insights"
        />
      }
      title="Insights"
    >
      <LegacyInsightsHashRedirect />
      <div className="flex flex-col gap-4">
        <CorporationPreludePairingsPanel
          baselineWinRate={baselineWinRate}
          rows={pairingRows}
          scoreAverages={analytics.scoreAverages}
        />
        <GamePaceReplay games={gamePaceReplays} />
        <div className="[&>div>section:last-child]:hidden">
          <InsightsDashboard
            analytics={dashboardAnalytics}
            players={players.map((player) => ({
              id: player.id,
              displayName: player.display_name,
            }))}
            promoCards={[]}
            promoSets={[]}
          />
        </div>
        <ScoreProfilePanel entries={scoreProfileEntries} />
      </div>
    </AppShell>
  );
}
