import { describe, expect, it } from 'vitest';
import { locateGameResultRegions } from './locate-game-result-regions';
import type { OcrPixelData } from './ocr/ocr-ops';

type Rgb = [number, number, number];

const PAGE: Rgb = [10, 10, 10];
const TABLE_HEADER: Rgb = [40, 40, 40];
const RED: Rgb = [200, 50, 50];
const GREEN: Rgb = [50, 200, 50];
const PANEL: Rgb = [30, 30, 30];
const INK: Rgb = [255, 255, 255];

function createCanvas(width: number, height: number) {
  const data = new Uint8Array(width * height * 4);

  const paint = (
    color: Rgb,
    rect: { bottom: number; left: number; right: number; top: number },
  ) => {
    for (let y = rect.top; y <= rect.bottom; y += 1) {
      for (let x = rect.left; x <= rect.right; x += 1) {
        const offset = (y * width + x) * 4;

        data[offset] = color[0];
        data[offset + 1] = color[1];
        data[offset + 2] = color[2];
        data[offset + 3] = 255;
      }
    }
  };

  paint(PAGE, { bottom: height - 1, left: 0, right: width - 1, top: 0 });

  return {
    paint,
    pixels: { data, height, width } satisfies OcrPixelData,
  };
}

/**
 * Mirrors the community app's result page: an icon header row above one solid
 * band per player, then a row of player-coloured column headers each sitting on
 * a card panel.
 */
function createGameResultCanvas() {
  const { paint, pixels } = createCanvas(200, 300);

  paint(TABLE_HEADER, { bottom: 20, left: 10, right: 150, top: 10 });
  paint(RED, { bottom: 40, left: 10, right: 150, top: 21 });
  paint(GREEN, { bottom: 60, left: 10, right: 150, top: 41 });

  for (const top of [21, 41]) {
    // Player name, then the gutter, then the score digits.
    paint(INK, { bottom: top + 12, left: 12, right: 40, top: top + 6 });

    for (const digitLeft of [61, 73, 85, 97, 109, 121, 133]) {
      paint(INK, {
        bottom: top + 12,
        left: digitLeft,
        right: digitLeft + 7,
        top: top + 6,
      });
    }
  }

  paint(RED, { bottom: 112, left: 10, right: 60, top: 100 });
  paint(GREEN, { bottom: 112, left: 70, right: 120, top: 100 });
  paint(PANEL, { bottom: 200, left: 10, right: 60, top: 113 });
  paint(PANEL, { bottom: 170, left: 70, right: 120, top: 113 });

  return pixels;
}

describe('locateGameResultRegions', () => {
  it('locates the player rows, their name boundary, and each detail column', () => {
    const regions = locateGameResultRegions(createGameResultCanvas());

    expect(regions).not.toBeNull();
    // The icon header row is not a player row.
    expect(regions?.scoreTableRows).toEqual([
      { height: 20, left: 10, top: 21, width: 141 },
      { height: 20, left: 10, top: 41, width: 141 },
    ]);
    // The widest gutter inside a row separates the name from the digits.
    expect(regions?.scoreTableStatsLeft).toBe(61);
    expect(regions?.detailColumns).toEqual([
      { height: 101, left: 10, top: 100, width: 51 },
      { height: 71, left: 70, top: 100, width: 51 },
    ]);
  });

  it('reads the heading strip above the table, clamped to the space there is', () => {
    const regions = locateGameResultRegions(createGameResultCanvas());

    expect(regions?.scoreTableHeading).toEqual({
      height: 10,
      left: 10,
      top: 0,
      width: 141,
    });
  });

  it('returns null when the capture holds no score table', () => {
    const { paint, pixels } = createCanvas(200, 300);

    paint(RED, { bottom: 112, left: 10, right: 60, top: 100 });

    expect(locateGameResultRegions(pixels)).toBeNull();
  });

  it('ignores a narrower table below the score table', () => {
    const { paint, pixels } = createCanvas(200, 300);

    paint(TABLE_HEADER, { bottom: 20, left: 10, right: 150, top: 10 });
    paint(RED, { bottom: 40, left: 10, right: 150, top: 21 });
    paint(GREEN, { bottom: 60, left: 10, right: 150, top: 41 });
    // A "Global Parameter Contributions" style table further down the page.
    paint(TABLE_HEADER, { bottom: 220, left: 10, right: 100, top: 210 });
    paint(RED, { bottom: 240, left: 10, right: 100, top: 221 });
    paint(GREEN, { bottom: 260, left: 10, right: 100, top: 241 });

    expect(locateGameResultRegions(pixels)?.scoreTableRows).toEqual([
      { height: 20, left: 10, top: 21, width: 141 },
      { height: 20, left: 10, top: 41, width: 141 },
    ]);
  });
});
