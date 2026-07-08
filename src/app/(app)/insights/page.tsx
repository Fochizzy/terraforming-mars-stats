import { AppShell } from '@/components/layout/app-shell';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { InsightsDashboard } from '@/features/insights/insights-dashboard';
import type { GroupHeadToHeadRow } from '@/lib/db/analytics-repo';
import { getGroupAnalytics } from '@/lib/db/analytics-repo';
import { listPlayers } from '@/lib/db/player-repo';
import { listPromoCards, listPromoSets } from '@/lib/db/reference-repo';

type InsightPlayerOption = {
  displayName: string;
  id: string;
};

type InsightPlayerRow = {
  display_name: string;
  id: string;
  linked_user_id?: string | null;
};

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
  const [analytics, players, promoSets, promoCards] = await Promise.all([
    getGroupAnalytics(context.groupId),
    listPlayers(context.groupId),
    listPromoSets(),
    listPromoCards(),
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
      title="Insights"
      wide
    >
      <InsightsDashboard
        analytics={analytics}
        players={selectablePlayers}
        promoCards={promoCards}
        promoSets={promoSets}
      />
    </AppShell>
  );
}
