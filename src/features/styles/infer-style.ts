type StyleInput = {
  totalPoints: number;
  trPoints: number;
  cardPointsTotal: number;
  cardPointsJovian?: number | null;
  greeneryPoints: number;
  citiesPoints: number;
};

export function inferPrimaryStyle(input: StyleInput) {
  const jovianPoints = input.cardPointsJovian ?? 0;
  const jovianShare =
    input.cardPointsTotal > 0 ? jovianPoints / input.cardPointsTotal : 0;

  if (jovianPoints >= 15 || (jovianPoints >= 7 && jovianShare >= 0.25)) {
    return { primary: 'jovian_payoff', confidence: 0.86 };
  }

  if (input.greeneryPoints + input.citiesPoints >= input.cardPointsTotal) {
    return { primary: 'board_control', confidence: 0.72 };
  }

  return { primary: 'balanced', confidence: 0.58 };
}
