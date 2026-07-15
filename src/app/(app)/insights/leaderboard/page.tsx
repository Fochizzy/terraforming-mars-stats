import { AppShell } from '@/components/layout/app-shell';
import { EloLeaderboard } from '@/features/leaderboard/elo-leaderboard';
import { getEloLeaderboard } from '@/lib/db/elo-leaderboard-repo';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const rows = await getEloLeaderboard();
  return <AppShell title="Leaderboard" wide><EloLeaderboard rows={rows} /></AppShell>;
}
