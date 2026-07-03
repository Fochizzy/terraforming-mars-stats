type StyleInput = {
  totalPoints: number;
  trPoints: number;
  cardPointsTotal: number;
  cardPointsJovian?: number | null;
  greeneryPoints: number;
  citiesPoints: number;
};

export function inferPrimaryStyle(input: StyleInput) {
  if ((input.cardPointsJovian ?? 0) >= 15) {
    return { primary: 'jovian_payoff', confidence: 0.86 };
  }

  if (input.greeneryPoints + input.citiesPoints >= input.cardPointsTotal) {
    return { primary: 'board_control', confidence: 0.72 };
  }

  return { primary: 'balanced', confidence: 0.58 };
}
