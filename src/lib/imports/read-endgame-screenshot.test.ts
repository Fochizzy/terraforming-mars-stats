import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { readEndgameScreenshot } from './read-endgame-screenshot';

const mocks = vi.hoisted(() => {
  const recognize = vi
    .fn()
    .mockResolvedValueOnce({
      data: {
        text: ' Victory point breakdown after 11 generations ',
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: ' Colette 45 0 12 9 10 47 123 82 1:02:21 168 ',
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: [' Colette ', 'Manutech'].join('\n'),
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: ' 45 0 12 9 10 47 123 82 1:02:21 168 ',
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: ' 45 0 12 9 10 47 123 82 1:02:21 168 ',
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: ' 123 82 ',
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: '',
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: [' lzzy ', 'Project Workshop'].join('\n'),
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: ' 30 5 9 3 5 32 ',
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: '',
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: ' 84 43 ',
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: ' Corey 43 10 2 6 10 10 Q1 64 22:56 120 ',
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: [' Corey ', 'Tycho Magnetics'].join('\n'),
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: ' 43 10 2 6 10 10 81 64 22:56 120 ',
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: '',
      },
    })
    .mockResolvedValueOnce({
      data: {
        text: ' 81 64 ',
      },
    })
    .mockResolvedValue({
      data: {
        text: '',
      },
    });

  return {
    recognize,
  };
});

vi.mock('tesseract.js', () => ({
  default: {
    recognize: mocks.recognize,
  },
}));

describe('readEndgameScreenshot', () => {
  it('reads the uploaded image, runs targeted row OCR, and synthesizes player rows with expected names', async () => {
    const pngBuffer = await sharp({
      create: {
        width: 780,
        height: 268,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();
    const file = new File([pngBuffer], 'endgame.png', { type: 'image/png' });

    const ocrLines = await readEndgameScreenshot(file, {
      expectedPlayerCount: 3,
      expectedPlayerNames: ['Colette', 'Izzy', 'Corey'],
    });

    expect(ocrLines).toEqual(
      expect.arrayContaining([
        'Colette 45 0 12 9 10 47 123 82',
        'Izzy 30 5 9 3 5 32 84 43',
        'Corey 43 10 2 6 10 10 81 64',
      ]),
    );
    expect(ocrLines).not.toEqual(
      expect.arrayContaining(['Project Workshop', 'lzzy']),
    );

    expect(mocks.recognize.mock.calls.length).toBeGreaterThanOrEqual(10);
    expect(mocks.recognize).toHaveBeenNthCalledWith(
      1,
      expect.any(Buffer),
      'eng',
    );
  });
});
