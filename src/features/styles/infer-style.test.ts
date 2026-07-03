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
});
