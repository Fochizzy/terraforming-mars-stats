import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadOverallViewOrEmpty } from './overall-analytics-degradation';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadOverallViewOrEmpty', () => {
  it('passes a resolved view through untouched', async () => {
    const rows = [{ id: 'row-1' }];

    await expect(
      loadOverallViewOrEmpty('player_interactions', Promise.resolve(rows)),
    ).resolves.toBe(rows);
  });

  it('keeps an empty result distinguishable from a failure in the log', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      loadOverallViewOrEmpty('player_interactions', Promise.resolve([])),
    ).resolves.toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('degrades a rejected view to no rows and names it in the log', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const timeout = Object.assign(new Error('canceling statement due to statement timeout'), {
      code: '57014',
    });

    await expect(
      loadOverallViewOrEmpty('player_card_outcomes', Promise.reject(timeout)),
    ).resolves.toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('player_card_outcomes'),
      timeout,
    );
  });
});
