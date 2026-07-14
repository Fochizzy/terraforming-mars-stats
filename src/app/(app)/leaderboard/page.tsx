import { AppShell } from '@/components/layout/app-shell';
import { EloLeaderboard } from '@/features/leaderboard/elo-leaderboard';
import { getEloLeaderboard, getSavedLeaderboardPlayerIds } from '@/lib/db/elo-leaderboard-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [rows, savedIds] = await Promise.all([
    getEloLeaderboard(),
    user ? getSavedLeaderboardPlayerIds(user.id) : Promise.resolve([]),
  ]);
  return <AppShell title="Leaderboard" wide><EloLeaderboard initialSavedIds={savedIds} rows={rows} /></AppShell>;
}
