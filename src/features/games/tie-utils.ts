type RankedPlayerInput = {
  playerId: string;
  totalPoints: number;
  finalMegacredits: number;
};

export function rankPlayers(players: RankedPlayerInput[]) {
  const sorted = [...players].sort((left, right) => {
    if (right.totalPoints !== left.totalPoints) {
      return right.totalPoints - left.totalPoints;
    }

    return right.finalMegacredits - left.finalMegacredits;
  });

  let previousPlacement = 0;

  return sorted.map((player, index) => {
    const previous = sorted[index - 1];
    const placement =
      previous &&
      previous.totalPoints === player.totalPoints &&
      previous.finalMegacredits === player.finalMegacredits
        ? previousPlacement
        : index + 1;

    previousPlacement = placement;

    return {
      ...player,
      placement,
      isWinner: placement === 1,
    };
  });
}
