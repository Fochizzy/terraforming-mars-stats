'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CardWinStats = {
  globalGames: number;
  globalWins: number;
  personalGames: number;
  personalWins: number;
};

function toCount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

// Fetch a single card's win statistics for the card detail dialog. Delegates to
// the SECURITY DEFINER get_card_win_stats RPC, which scopes "personal" to the
// signed-in user's linked players and "global" to every finalized game.
export async function getCardWinStats(cardId: string): Promise<CardWinStats> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_card_win_stats', {
    p_card_id: cardId,
  });

  if (error) {
    throw error;
  }

  const stats = (data ?? {}) as Record<string, unknown>;

  return {
    globalGames: toCount(stats.globalGames),
    globalWins: toCount(stats.globalWins),
    personalGames: toCount(stats.personalGames),
    personalWins: toCount(stats.personalWins),
  };
}
