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

type BulkClaimResultRow = {
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

export type SavedPlayerBulkClaimResult = {
  groups: { groupId: string; groupName: string }[];
  playerName: string;
  status: 'claimed-and-joined';
};

export type SavedPlayerAutoClaimResult =
  | SavedPlayerBulkClaimResult
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

export async function claimAllExactPlayerProfiles(): Promise<SavedPlayerBulkClaimResult | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('claim_player_profiles_by_name');

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as BulkClaimResultRow[];

  if (rows.length === 0) {
    return null;
  }

  return {
    groups: rows.map((row) => ({
      groupId: row.group_id,
      groupName: row.group_name,
    })),
    playerName: rows[0].player_name,
    status: 'claimed-and-joined',
  };
}

export async function resolveSavedPlayerAutoClaim(): Promise<SavedPlayerAutoClaimResult> {
  const candidates = await listClaimablePlayerProfiles();
  const hasExactMatch = candidates.some((candidate) => candidate.exactMatch);

  if (!hasExactMatch) {
    return {
      candidates,
      status: 'needs-manual-claim',
    };
  }

  const claimed = await claimAllExactPlayerProfiles();

  // A concurrent claim can empty the exact matches between listing and claiming;
  // fall back to whatever remains for a manual decision.
  if (!claimed) {
    return {
      candidates: await listClaimablePlayerProfiles(),
      status: 'needs-manual-claim',
    };
  }

  return claimed;
}
