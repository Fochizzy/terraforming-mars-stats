import { describe, expect, it, vi } from 'vitest';
import { readBoardScreenshotSpaceConfirmationsSafely } from './read-board-screenshot-space-confirmations-safely';

describe('readBoardScreenshotSpaceConfirmationsSafely', () => {
  it('returns screenshot confirmations when the reader succeeds', async () => {
    const confirmations = {
      '20': {
        confidence: 0.72,
        status: 'confirmed' as const,
        tileKind: 'ocean' as const,
      },
    };
    const readConfirmations = vi.fn().mockResolvedValue(confirmations);

    await expect(
      readBoardScreenshotSpaceConfirmationsSafely({
        input: {
          mapId: 'tharsis',
          requests: [{ spaceId: '20' }],
          screenshots: [],
        },
        readConfirmations,
      }),
    ).resolves.toEqual(confirmations);
    expect(readConfirmations).toHaveBeenCalledTimes(1);
  });

  it('returns undefined when board screenshot confirmation reading throws', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const readConfirmations = vi.fn().mockRejectedValue(
      new TypeError("Cannot read properties of undefined (reading 'endsWith')"),
    );

    await expect(
      readBoardScreenshotSpaceConfirmationsSafely({
        input: {
          mapId: 'tharsis',
          requests: [{ spaceId: '20' }],
          screenshots: [],
        },
        readConfirmations,
      }),
    ).resolves.toBeUndefined();

    expect(readConfirmations).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith(
      'Board screenshot confirmation OCR failed',
      expect.objectContaining({
        message: "Cannot read properties of undefined (reading 'endsWith')",
      }),
    );

    consoleWarn.mockRestore();
  });
});
