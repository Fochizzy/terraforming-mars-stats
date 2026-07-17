import { describe, expect, it } from 'vitest';
import { getInsightsCompatibilityDestination } from './insights-compatibility';

describe('legacy Insights compatibility', () => {
  it('routes legacy scopes to canonical destinations without discarding query state', () => {
    expect(
      getInsightsCompatibilityDestination({
        player: 'player-1',
        scope: 'individual',
        tag: ['space', 'science'],
      }),
    ).toBe('/insights/individual?player=player-1&tag=space&tag=science');
    expect(getInsightsCompatibilityDestination({ scope: 'compare' })).toBe('/compare');
    expect(getInsightsCompatibilityDestination({ scope: 'group' })).toBe('/insights/group');
  });

  it('leaves the unselected legacy Insights owner intact', () => {
    expect(getInsightsCompatibilityDestination({ player: 'player-1' })).toBeNull();
    expect(getInsightsCompatibilityDestination({ scope: 'unknown' })).toBeNull();
  });
});
