import { beforeEach, describe, expect, it, vi } from 'vitest';

const importTracker = vi.hoisted(() => ({
  readBoardScreenshotSpaceConfirmations: 0,
  readBoardStateScreenshot: 0,
  readEndgameScreenshot: 0,
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/lib/imports/read-endgame-screenshot', () => {
  importTracker.readEndgameScreenshot += 1;

  return {
    readEndgameScreenshot: vi.fn(),
  };
});

vi.mock('@/lib/imports/card-scoring/read-board-state-screenshot', () => {
  importTracker.readBoardStateScreenshot += 1;

  return {
    readBoardStateScreenshot: vi.fn(),
  };
});

vi.mock('@/lib/imports/read-board-screenshot-space-confirmations', () => {
  importTracker.readBoardScreenshotSpaceConfirmations += 1;

  return {
    readBoardScreenshotSpaceConfirmations: vi.fn(),
  };
});

describe('LogGameImportPage module loading', () => {
  beforeEach(() => {
    importTracker.readBoardScreenshotSpaceConfirmations = 0;
    importTracker.readBoardStateScreenshot = 0;
    importTracker.readEndgameScreenshot = 0;
    vi.resetModules();
  });

  it('does not eagerly load screenshot OCR modules when the page module is imported', async () => {
    await import('./page');

    expect(importTracker.readEndgameScreenshot).toBe(0);
    expect(importTracker.readBoardStateScreenshot).toBe(0);
    expect(importTracker.readBoardScreenshotSpaceConfirmations).toBe(0);
  });
});
