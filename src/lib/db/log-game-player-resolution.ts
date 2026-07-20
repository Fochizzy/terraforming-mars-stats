import { signupFullNameSchema } from '@/features/auth/username-auth';
import { type LogGameDraftInput } from '@/lib/validation/log-game';
import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import { createOrReuseGuestPlayerByPersonalName } from './import-player-identity-repo';
import { listPlayers, type PlayerRow } from './player-repo';

type ResolverDependencies = {
  createGuestPlayerByPersonalName?: typeof createOrReuseGuestPlayerByPersonalName;
  listPlayers?: typeof listPlayers;
};

/**
 * Splits a validated "First … Last" full name into the explicit first/last
 * components the guest-identity contract stores. The convention is
 * deterministic — first whitespace-separated token is the first name, the
 * remainder is the last name — and it is match-insensitive: the private
 * matching key is the normalized concatenation, so where the split lands
 * never changes which guest a name resolves to.
 */
export function splitValidatedFullName(fullName: string) {
  const [firstName, ...rest] = fullName.split(' ');
  return { firstName, lastName: rest.join(' ') };
}

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
  const createGuestImpl =
    dependencies.createGuestPlayerByPersonalName ??
    createOrReuseGuestPlayerByPersonalName;
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

    const displayName = signupFullNameSchema.parse(reference);
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

    // A new manual reference is a first-and-last-name guest. Creation goes
    // through the guarded guest RPC: the personal name is stored privately,
    // public.players.display_name receives a neutral label, and an existing
    // guest with the same normalized personal name is reused instead of
    // duplicated. The typed name is never written to a readable column.
    const { firstName, lastName } = splitValidatedFullName(displayName);
    const created = await createGuestImpl({
      firstName,
      groupId: form.groupId,
      lastName,
    });

    if (resolvedPlayerIds.has(created.id)) {
      throw new Error('Selected players must be unique within a game.');
    }

    const createdRow: PlayerRow = {
      display_name: created.publicName,
      id: created.id,
      linked_user_id: null,
    };
    replacements.set(reference, created.id);
    resolvedPlayerIds.add(created.id);
    byNormalizedName.set(normalizedName, createdRow);
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
