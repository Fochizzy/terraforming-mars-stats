import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  resolvePublicGroupLabel,
  resolvePublicGroupLabels,
} from './group-label-resolution';

type ClaimCandidateRow = {
  exact_match: boolean;
  group_id: string;
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

  // `group_name` on this RPC's row is the raw stored `groups.name`, which the
  // requesting user is not yet a member of — there is no RLS-safe way to
  // resolve a roster-derived public label for it in code-only, so it is
  // dropped by never being picked into the output rather than forwarded.
  return ((data ?? []) as ClaimCandidateRow[]).map((candidate) => ({
    exactMatch: candidate.exact_match,
    groupId: candidate.group_id,
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

  // The claim RPC just added this user to the group, so the roster is now
  // readable under RLS — the label is resolved from it rather than trusting
  // the RPC's raw `group_name`, which may still hold a private-name
  // concatenation from before this resolver existed.
  const groupName = await resolvePublicGroupLabel(
    supabase,
    claimResult.group_id,
  );

  return {
    groupId: claimResult.group_id,
    groupName,
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

  // Same as the single-claim path: this RPC just added the user to every
  // returned group, so each roster is resolved fresh rather than trusting the
  // RPC's raw `group_name`.
  const labelByGroupId = await resolvePublicGroupLabels(
    supabase,
    rows.map((row) => row.group_id),
  );

  return {
    groups: rows.map((row) => ({
      groupId: row.group_id,
      groupName: labelByGroupId.get(row.group_id) ?? 'Group',
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
