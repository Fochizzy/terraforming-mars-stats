import {
  signupFullNameSchema,
  usernameHandleSchema,
} from '@/features/auth/username-auth';
import { type LogGameDraftInput } from '@/lib/validation/log-game';
import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import { matchImportPlayerNames } from './import-player-resolution-repo';
import {
  createPlayerIfMissing,
  listPlayers,
  type PlayerRow,
} from './player-repo';

type ResolverDependencies = {
  createPlayerIfMissing?: typeof createPlayerIfMissing;
  listPlayers?: typeof listPlayers;
  matchImportPlayerNames?: typeof matchImportPlayerNames;
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
    // Keyed by the public label the person typing can actually see. Real
    // roster and personal names are matched server-side instead.
    byNormalizedLabel: new Map(
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
  const matchImportPlayerNamesImpl =
    dependencies.matchImportPlayerNames ?? matchImportPlayerNames;
  const roster = await listPlayersImpl(form.groupId);
  const { byId, byNormalizedLabel } = buildRosterMaps(roster);
  const replacements = new Map<string, string>();
  const resolvedPlayerIds = new Set<string>();

  const assignPlayer = (reference: string, player: Pick<PlayerRow, 'id'>) => {
    if (resolvedPlayerIds.has(player.id)) {
      throw new Error('Selected players must be unique within a game.');
    }

    replacements.set(reference, player.id);
    resolvedPlayerIds.add(player.id);
  };

  for (const reference of form.selectedPlayerIds) {
    const existingById = byId.get(reference);

    if (existingById) {
      assignPlayer(reference, existingById);
      continue;
    }

    const displayName = parsePlayerReferenceName(reference);
    const normalizedName = normalizePlayerAlias(displayName);
    const existingByLabel = byNormalizedLabel.get(normalizedName);

    if (existingByLabel) {
      assignPlayer(reference, existingByLabel);
      continue;
    }

    // The roster is labeled with public names only, so a typed roster/personal
    // name has to be matched server-side, where the security-definer matcher
    // still sees the private columns. Only an exact match that belongs to this
    // group's roster counts — a cross-group match is not this roster's player.
    const serverMatches = await matchImportPlayerNamesImpl(
      form.groupId,
      [displayName],
      'log_game_player_resolution',
    );
    const exactRosterMatch = serverMatches.find(
      (match) => match.matchReason === 'exact' && byId.has(match.playerId),
    );

    if (exactRosterMatch) {
      assignPlayer(reference, { id: exactRosterMatch.playerId });
      continue;
    }

    const created = await createPlayerIfMissingImpl({
      displayName,
      groupId: form.groupId,
      linkedUserId: null,
    });

    assignPlayer(reference, created);
    byNormalizedLabel.set(normalizedName, created);
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
