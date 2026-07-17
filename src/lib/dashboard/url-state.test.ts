import { describe, expect, it } from 'vitest';
import { createDashboardSelection } from './selection';
import { createDashboardUrlStateAdapter } from './url-state';

const adapter = createDashboardUrlStateAdapter({
  selectedEntityId: 'fixtureEntity',
  selectedMetricId: 'fixtureMetric',
  selectedDataPointId: 'fixturePoint',
});

describe('dashboard URL-state adapter boundary', () => {
  it('round-trips caller-named selection fields without choosing production names', () => {
    const selection = {
      ...createDashboardSelection(),
      selectedEntityId: 'entity-a',
      selectedMetricId: 'metric-a',
      selectedDataPointId: 'point-a',
    };
    const encoded = adapter.write(selection);

    expect(encoded.toString()).toBe(
      'fixtureEntity=entity-a&fixtureMetric=metric-a&fixturePoint=point-a',
    );
    expect(adapter.read(encoded)).toEqual({
      selectedEntityId: 'entity-a',
      selectedMetricId: 'metric-a',
      selectedDataPointId: 'point-a',
    });
  });

  it('preserves unrelated query state and deletes cleared mapped fields', () => {
    const current = new URLSearchParams(
      'unrelated=keep&fixturePoint=stale&fixtureEntity=stale',
    );
    const encoded = adapter.write(createDashboardSelection(), current);

    expect(encoded.get('unrelated')).toBe('keep');
    expect(encoded.has('fixturePoint')).toBe(false);
    expect(encoded.has('fixtureEntity')).toBe(false);
  });

  it('ignores empty URL values for later availability reconciliation', () => {
    expect(
      adapter.read(
        new URLSearchParams('fixtureEntity=&fixtureMetric=%20&fixturePoint=point-a'),
      ),
    ).toEqual({ selectedDataPointId: 'point-a' });
  });

  it('rejects duplicate caller parameter names', () => {
    expect(() =>
      createDashboardUrlStateAdapter({
        selectedEntityId: 'duplicate',
        selectedMetricId: 'duplicate',
      }),
    ).toThrow('must be unique');
  });
});
