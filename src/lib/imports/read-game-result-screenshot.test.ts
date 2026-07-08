import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { readGameResultScreenshot } from './read-game-result-screenshot';

const mocks = vi.hoisted(() => ({
  cropMetadata: [] as Array<{ height?: number; width?: number }>,
  readEndgameScreenshot: vi.fn(),
  readOcrTextLinesFromBuffer: vi.fn(),
  readScoreDetailsScreenshot: vi.fn(),
}));

vi.mock('./read-endgame-screenshot', () => ({
  readEndgameScreenshot: mocks.readEndgameScreenshot,
}));

vi.mock('./card-scoring/read-ocr-text-lines', () => ({
  readOcrTextLinesFromBuffer: mocks.readOcrTextLinesFromBuffer,
}));

vi.mock('./read-score-details-screenshot', () => ({
  readScoreDetailsScreenshot: mocks.readScoreDetailsScreenshot,
}));

describe('readGameResultScreenshot', () => {
  it('retries the combined-result endgame OCR with a taller crop when the focused crop finds no score rows', async () => {
    mocks.cropMetadata.length = 0;
    mocks.readEndgameScreenshot.mockReset();
    mocks.readOcrTextLinesFromBuffer.mockReset();
    mocks.readScoreDetailsScreenshot.mockReset();

    mocks.readEndgameScreenshot
      .mockImplementationOnce(async (file: File) => {
        const metadata = await sharp(
          Buffer.from(await file.arrayBuffer()),
        ).metadata();
        mocks.cropMetadata.push({
          height: metadata.height,
          width: metadata.width,
        });

        return ['Victory points breakdown after 12 generations'];
      })
      .mockImplementationOnce(async (file: File) => {
        const metadata = await sharp(
          Buffer.from(await file.arrayBuffer()),
        ).metadata();
        mocks.cropMetadata.push({
          height: metadata.height,
          width: metadata.width,
        });

        return [
          'Victory points breakdown after 12 generations',
          'James 59 5 15 6 8 52 145 105',
          'Izzy 39 10 0 4 6 23 82 82',
        ];
      });
    mocks.readOcrTextLinesFromBuffer.mockResolvedValue([
      'Victory points breakdown after 12 generations',
    ]);
    mocks.readScoreDetailsScreenshot.mockResolvedValue({
      columns: [],
    });

    const pngBuffer = await sharp({
      create: {
        width: 1138,
        height: 2048,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();
    const file = new File([pngBuffer], 'game-result.png', { type: 'image/png' });

    const result = await readGameResultScreenshot(file, {
      expectedPlayerCount: 2,
      expectedPlayerNames: ['James', 'Izzy'],
    });

    expect(mocks.readEndgameScreenshot).toHaveBeenCalledTimes(2);
    expect(mocks.cropMetadata[1]?.height).toBeGreaterThan(
      mocks.cropMetadata[0]?.height ?? 0,
    );
    expect(result.endgameLines).toEqual(
      expect.arrayContaining([
        'Victory points breakdown after 12 generations',
        'James 59 5 15 6 8 52 145 105',
        'Izzy 39 10 0 4 6 23 82 82',
      ]),
    );
  });

  it('keeps the focused crop when it already finds multiplayer score rows', async () => {
    mocks.cropMetadata.length = 0;
    mocks.readEndgameScreenshot.mockReset();
    mocks.readOcrTextLinesFromBuffer.mockReset();
    mocks.readScoreDetailsScreenshot.mockReset();

    mocks.readEndgameScreenshot.mockImplementationOnce(async (file: File) => {
      const metadata = await sharp(
        Buffer.from(await file.arrayBuffer()),
      ).metadata();
      mocks.cropMetadata.push({
        height: metadata.height,
        width: metadata.width,
      });

      return [
        'Victory points breakdown after 12 generations',
        'James 59 5 15 6 8 52 145 105',
        'Izzy 39 10 0 4 6 23 82 82',
      ];
    });
    mocks.readOcrTextLinesFromBuffer.mockResolvedValue([
      'Victory points breakdown after 12 generations',
    ]);
    mocks.readScoreDetailsScreenshot.mockResolvedValue({
      columns: [],
    });

    const pngBuffer = await sharp({
      create: {
        width: 1138,
        height: 2048,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();
    const file = new File([pngBuffer], 'game-result.png', { type: 'image/png' });

    const result = await readGameResultScreenshot(file, {
      expectedPlayerCount: 2,
      expectedPlayerNames: ['James', 'Izzy'],
    });

    expect(mocks.readEndgameScreenshot).toHaveBeenCalledTimes(1);
    expect(result.endgameLines).toEqual(
      expect.arrayContaining([
        'Victory points breakdown after 12 generations',
        'James 59 5 15 6 8 52 145 105',
        'Izzy 39 10 0 4 6 23 82 82',
      ]),
    );
  });
});
