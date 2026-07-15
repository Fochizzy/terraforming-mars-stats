'use server';

import { revalidatePath } from 'next/cache';
import { setHiddenLeaderboardPlayer } from '@/lib/db/elo-leaderboard-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function toggleHiddenLeaderboardPlayer(playerId: string, hidden: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error ?? new Error('Authentication required');
  await setHiddenLeaderboardPlayer({ hidden, playerId, userId: user.id });
  revalidatePath('/leaderboard');
  revalidatePath('/insights/leaderboard');
}
