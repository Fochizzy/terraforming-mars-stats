'use server';

import { setHiddenGroupInsightPlayer } from '@/lib/db/insight-preferences-repo';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function saveHiddenGroupInsightPlayer(groupId: string, canonicalPlayerId: string, hidden: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error ?? new Error('Authentication required');
  await setHiddenGroupInsightPlayer({ canonicalPlayerId, groupId, hidden, userId: user.id });
}
