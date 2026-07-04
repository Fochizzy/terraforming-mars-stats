import { describe, expect, it, vi } from 'vitest';
import { readEndgameScreenshot } from './read-endgame-screenshot';

const mocks = vi.hoisted(() => {
  const recognize = vi.fn().mockResolvedValue({
    data: {
      text: [' Izzy 18 5 10 7 22 62 8 ', '', 'Corey 16 0 4 6 19 45 3'].join(
        '\n',
      ),
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
  it('reads the uploaded image and returns non-empty OCR lines', async () => {
    const file = new File(['raw-image'], 'endgame.png', { type: 'image/png' });

    await expect(readEndgameScreenshot(file)).resolves.toEqual([
      'Izzy 18 5 10 7 22 62 8',
      'Corey 16 0 4 6 19 45 3',
    ]);

    expect(mocks.recognize).toHaveBeenCalledWith(
      Buffer.from('raw-image'),
      'eng',
    );
  });
});
