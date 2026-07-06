import { createSupabaseServerClient } from '@/lib/supabase/server';

type ClaimCandidateRow = {
  exact_match: boolean;
  group_id: string;
  group_name: string;
  match_reason: 'exact' | 'partial';
  player_id: string;
  player_name: string;
};

type ClaimResultRow = {
  group_id: string;
  group_name: string;
  player_name: string;
};

export type ClaimablePlayerProfile = {
  exactMatch: boolean;
  groupId: string;
  groupName: string;
  matchReason: 'exact' | 'partial';
  playerId: string;
  playerName: string;
};

export type SavedPlayerClaimResult = {
  groupId: string;
  groupName: string;
  playerName: string;
  status: 'claimed-and-joined';
};

export type SavedPlayerAutoClaimResult =
  | SavedPlayerClaimResult
  | {
      candidates: ClaimablePlayerProfile[];
      status: 'needs-manual-claim';
    };

export async function listClaimablePlayerProfiles(): Promise<
  ClaimablePlayerProfile[]
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('list_claimable_player_profiles');

  if (error) {
    throw error;
  }

  return ((data ?? []) as ClaimCandidateRow[]).map((candidate) => ({
    exactMatch: candidate.exact_match,
    groupId: candidate.group_id,
    groupName: candidate.group_name,
    matchReason: candidate.match_reason,
    playerId: candidate.player_id,
    playerName: candidate.player_name,
  }));
}

export async function claimSavedPlayerProfile(
  playerId: string,
): Promise<SavedPlayerClaimResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('claim_player_profile', {
    p_player_id: playerId,
  });

  if (error) {
    throw error;
  }

  const claimResult = (data as ClaimResultRow[] | null)?.[0];

  if (!claimResult) {
    throw new Error('Could not claim that saved player profile.');
  }

  return {
    groupId: claimResult.group_id,
    groupName: claimResult.group_name,
    playerName: claimResult.player_name,
    status: 'claimed-and-joined',
  };
}

export async function resolveSavedPlayerAutoClaim(): Promise<SavedPlayerAutoClaimResult> {
  const candidates = await listClaimablePlayerProfiles();
  const exactMatches = candidates.filter((candidate) => candidate.exactMatch);

  if (exactMatches.length !== 1) {
    return {
      candidates,
      status: 'needs-manual-claim',
    };
  }

  return claimSavedPlayerProfile(exactMatches[0].playerId);
}
