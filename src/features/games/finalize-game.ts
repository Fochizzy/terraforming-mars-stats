import { rankPlayers } from './tie-utils';

type RankedPlayerInput = {
  playerId: string;
  totalPoints: number;
  finalMegacredits: number;
};

export function buildFinalizedGameSnapshot(input: {
  players: RankedPlayerInput[];
  catalogSnapshotId: string;
  declaredStyleCodes?: string[];
  keyCardIds?: string[];
}) {
  const rankedPlayers = rankPlayers(input.players);

  return {
    gameUpdate: {
      status: 'finalized',
      catalog_snapshot_id: input.catalogSnapshotId,
    },
    players: rankedPlayers,
    declaredStyles: input.declaredStyleCodes ?? [],
    keyCards: input.keyCardIds ?? [],
    revision: {
      snapshot: {
        players: rankedPlayers,
        declaredStyleCodes: input.declaredStyleCodes ?? [],
        keyCardIds: input.keyCardIds ?? [],
        catalogSnapshotId: input.catalogSnapshotId,
      },
      reason: 'Finalize game results',
    },
    finalizedAt: new Date().toISOString(),
  };
}
