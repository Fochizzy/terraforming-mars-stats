import { describe, expect, it } from 'vitest';
import { inferPrimaryStyle } from './infer-style';

describe('inferPrimaryStyle', () => {
  it('flags Jovian-heavy results as jovian_payoff', () => {
    const inferred = inferPrimaryStyle({
      totalPoints: 94,
      trPoints: 18,
      cardPointsTotal: 36,
      cardPointsJovian: 22,
      greeneryPoints: 8,
      citiesPoints: 4,
    });

    expect(inferred.primary).toBe('jovian_payoff');
  });

  it('treats a strong Jovian share as jovian_payoff even below the highest raw threshold', () => {
    const inferred = inferPrimaryStyle({
      totalPoints: 80,
      trPoints: 20,
      cardPointsTotal: 24,
      cardPointsJovian: 7,
      greeneryPoints: 8,
      citiesPoints: 6,
    });

    expect(inferred.primary).toBe('jovian_payoff');
  });
});
