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

  return sorted.map((player, index) => {
    const previous = sorted[index - 1];
    const placement =
      previous &&
      previous.totalPoints === player.totalPoints &&
      previous.finalMegacredits === player.finalMegacredits
        ? index
        : index + 1;

    return {
      ...player,
      placement,
      isWinner: placement === 1,
    };
  });
}
