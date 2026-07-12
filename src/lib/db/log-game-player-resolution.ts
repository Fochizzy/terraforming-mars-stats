import {
  signupFullNameSchema,
  usernameHandleSchema,
} from '@/features/auth/username-auth';
import { type LogGameDraftInput } from '@/lib/validation/log-game';
import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import {
  createPlayerIfMissing,
  listPlayers,
  type PlayerRow,
} from './player-repo';

type ResolverDependencies = {
  createPlayerIfMissing?: typeof createPlayerIfMissing;
  listPlayers?: typeof listPlayers;
};

function remapRecord<T>(record: Record<string, T>, replacements: Map<string, string>) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [replacements.get(key) ?? key, value]),
  );
}

function remapMilestoneClaims(
  claims: LogGameDraftInput['milestoneClaims'],
  replacements: Map<string, string>,
) {
  return Object.fromEntries(
    Object.entries(claims).map(([key, value]) => [
      key,
      {
        ...value,
        winnerPlayerId: replacements.get(value.winnerPlayerId) ?? value.winnerPlayerId,
      },
    ]),
  );
}

function remapAwardClaims(
  claims: LogGameDraftInput['awardClaims'],
  replacements: Map<string, string>,
) {
  return Object.fromEntries(
    Object.entries(claims).map(([key, value]) => [
      key,
      {
        ...value,
        fundedByPlayerId:
          replacements.get(value.fundedByPlayerId) ?? value.fundedByPlayerId,
        firstPlaceWinnerPlayerIds: value.firstPlaceWinnerPlayerIds.map(
          (playerId) => replacements.get(playerId) ?? playerId,
        ),
        secondPlaceWinnerPlayerIds: value.secondPlaceWinnerPlayerIds.map(
          (playerId) => replacements.get(playerId) ?? playerId,
        ),
      },
    ]),
  );
}

// A new-player reference is a display name typed in the players step. It can be
// a real name ("James Hodnett") or a username handle ("Revloki"), matching the
// two ways a player is created there, so accept either.
function parsePlayerReferenceName(reference: string) {
  const fullName = signupFullNameSchema.safeParse(reference);

  if (fullName.success) {
    return fullName.data;
  }

  const handle = usernameHandleSchema.safeParse(reference);

  if (handle.success) {
    return handle.data;
  }

  throw new Error(
    fullName.error.issues[0]?.message ?? 'Enter a player name or username.',
  );
}

function buildRosterMaps(players: PlayerRow[]) {
  return {
    byId: new Map(players.map((player) => [player.id, player])),
    byNormalizedName: new Map(
      players.map((player) => [normalizePlayerAlias(player.display_name), player]),
    ),
  };
}

export async function resolveLogGamePlayerReferences(
  form: LogGameDraftInput,
  dependencies: ResolverDependencies = {},
) {
  const listPlayersImpl = dependencies.listPlayers ?? listPlayers;
  const createPlayerIfMissingImpl =
    dependencies.createPlayerIfMissing ?? createPlayerIfMissing;
  const roster = await listPlayersImpl(form.groupId);
  const { byId, byNormalizedName } = buildRosterMaps(roster);
  const replacements = new Map<string, string>();
  const resolvedPlayerIds = new Set<string>();

  for (const reference of form.selectedPlayerIds) {
    const existingById = byId.get(reference);

    if (existingById) {
      if (resolvedPlayerIds.has(existingById.id)) {
        throw new Error('Selected players must be unique within a game.');
      }

      replacements.set(reference, existingById.id);
      resolvedPlayerIds.add(existingById.id);
      continue;
    }

    const displayName = parsePlayerReferenceName(reference);
    const normalizedName = normalizePlayerAlias(displayName);
    const existingByName = byNormalizedName.get(normalizedName);

    if (existingByName) {
      if (resolvedPlayerIds.has(existingByName.id)) {
        throw new Error('Selected players must be unique within a game.');
      }

      replacements.set(reference, existingByName.id);
      resolvedPlayerIds.add(existingByName.id);
      continue;
    }

    const created = await createPlayerIfMissingImpl({
      displayName,
      groupId: form.groupId,
      linkedUserId: null,
    });

    if (resolvedPlayerIds.has(created.id)) {
      throw new Error('Selected players must be unique within a game.');
    }

    replacements.set(reference, created.id);
    resolvedPlayerIds.add(created.id);
    byNormalizedName.set(normalizedName, created);
  }

  return {
    ...form,
    awardClaims: remapAwardClaims(form.awardClaims, replacements),
    milestoneClaims: remapMilestoneClaims(form.milestoneClaims, replacements),
    playerScores: remapRecord(form.playerScores, replacements),
    playerSelections: remapRecord(form.playerSelections, replacements),
    playerStyles: remapRecord(form.playerStyles, replacements),
    selectedPlayerIds: form.selectedPlayerIds.map(
      (reference) => replacements.get(reference) ?? reference,
    ),
  } satisfies LogGameDraftInput;
}
