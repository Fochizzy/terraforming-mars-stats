import { AppShell } from '@/components/layout/app-shell';
import { EloLeaderboard } from '@/features/leaderboard/elo-leaderboard';
import { getEloLeaderboard, getHiddenLeaderboardPlayerIds } from '@/lib/db/elo-leaderboard-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [rows, hiddenIds] = await Promise.all([
    getEloLeaderboard(),
    user ? getHiddenLeaderboardPlayerIds(user.id) : Promise.resolve([]),
  ]);
  return <AppShell title="Leaderboard" wide><EloLeaderboard initialHiddenIds={hiddenIds} rows={rows} /></AppShell>;
}
