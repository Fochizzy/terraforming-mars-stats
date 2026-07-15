'use server';

import { revalidatePath } from 'next/cache';
import { setSavedLeaderboardPlayer } from '@/lib/db/elo-leaderboard-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function toggleSavedLeaderboardPlayer(playerId: string, saved: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error ?? new Error('Authentication required');
  await setSavedLeaderboardPlayer({ playerId, saved, userId: user.id });
  revalidatePath('/leaderboard');
}
