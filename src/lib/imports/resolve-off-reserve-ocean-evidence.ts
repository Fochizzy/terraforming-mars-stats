import { normalizePlayerAlias } from './normalize-player-alias';
import type { ImportPlayedEntityEvidence } from './parse-terraforming-mars-played-entities';
import type { ImportTileAction } from './parse-terraforming-mars-tile-actions';

/**
 * Source-backed upstream cards that allow placing an ocean tile on an area not
 * reserved for ocean, at pinned upstream commit
 * 7a6f98f09ac2a558969c092d317c313806af7b73. Identity is the upstream card
 * number; product display names are never the authority.
 *
 *   116  Artificial Lake
 *   Pf37 Small Comet
 *   UP09 Central Reservoir
 *   U015 Subterranean Sea
 */
export const OFF_RESERVE_OCEAN_CARD_NUMBERS: ReadonlySet<string> = new Set([
  '116',
  'Pf37',
  'UP09',
  'U015',
]);

export type OffReserveOceanException = {
  cardId: string;
  cardLineNumber: number;
  normalizedActor: string;
  oceanLineNumber: number;
  spaceId: string;
};

export type OffReserveOceanEvidence = {
  exceptionSpaceIds: string[];
  exceptions: OffReserveOceanException[];
};

/**
 * Derives, from exact resolved card evidence, the set of ocean placements that
 * an upstream-supported card allowed onto a non-reserved area. Each qualifying
 * card play is linked to the first subsequent ocean placement by the same
 * normalized actor. Missing or ambiguous evidence stays unresolved — no count
 * is guessed and no allowance is defaulted.
 */
export function resolveOffReserveOceanEvidence(input: {
  cards: ReadonlyArray<{ cardNumber: string | null; id: string }>;
  playedEntityEvidence: ImportPlayedEntityEvidence[];
  tileActions: ImportTileAction[];
}): OffReserveOceanEvidence {
  const offReserveCardIds = new Set(
    input.cards
      .filter(
        (card) =>
          card.cardNumber != null &&
          OFF_RESERVE_OCEAN_CARD_NUMBERS.has(card.cardNumber),
      )
      .map((card) => card.id),
  );

  if (offReserveCardIds.size === 0) {
    return { exceptionSpaceIds: [], exceptions: [] };
  }

  const qualifyingPlays = input.playedEntityEvidence
    .filter(
      (evidence) =>
        evidence.entityType === 'card' &&
        evidence.canonicalId != null &&
        offReserveCardIds.has(evidence.canonicalId),
    )
    .sort((left, right) => left.lineNumber - right.lineNumber);

  const oceanPlacements = input.tileActions
    .filter(
      (action) =>
        action.action === 'placed' &&
        action.board === 'mars' &&
        action.canonicalTileCode === 'ocean',
    )
    .sort((left, right) => left.lineNumber - right.lineNumber);

  const claimedOceanLines = new Set<number>();
  const exceptions: OffReserveOceanException[] = [];

  for (const play of qualifyingPlays) {
    const normalizedActor = play.normalizedPlayerValue;
    const ocean = oceanPlacements.find(
      (action) =>
        action.lineNumber > play.lineNumber &&
        !claimedOceanLines.has(action.lineNumber) &&
        normalizePlayerAlias(action.actor) === normalizedActor,
    );

    if (!ocean) {
      // No subsequent same-actor ocean placement: the evidence does not link,
      // so the exception is left unresolved rather than guessed.
      continue;
    }

    claimedOceanLines.add(ocean.lineNumber);
    exceptions.push({
      cardId: play.canonicalId as string,
      cardLineNumber: play.lineNumber,
      normalizedActor,
      oceanLineNumber: ocean.lineNumber,
      spaceId: ocean.spaceId,
    });
  }

  return {
    exceptionSpaceIds: [...new Set(exceptions.map((exception) => exception.spaceId))],
    exceptions,
  };
}
