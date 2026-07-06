import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  getBoardScreenshotSpaceRegistry,
  readBoardScreenshotSpaceConfirmations,
} from './read-board-screenshot-space-confirmations';

const curatedSpaceIds = ['20', '21', '22', '29', '30', '31', '32', '39', '40'];

async function readFixtureFile() {
  const imageBuffer = await readFile(
    'src/lib/imports/fixtures/board-screenshot-task3.png',
  );

  return new File([imageBuffer], 'board-screenshot-task3.png', {
    type: 'image/png',
  });
}

describe('readBoardScreenshotSpaceConfirmations', () => {
  it('exposes the curated space registry for each supported map', () => {
    expect(Object.keys(getBoardScreenshotSpaceRegistry('tharsis')).sort()).toEqual(
      curatedSpaceIds,
    );
    expect(Object.keys(getBoardScreenshotSpaceRegistry('hellas')).sort()).toEqual(
      curatedSpaceIds,
    );
    expect(Object.keys(getBoardScreenshotSpaceRegistry('elysium')).sort()).toEqual(
      curatedSpaceIds,
    );
  });

  it('classifies the requested curated spaces from the real board screenshot fixture', async () => {
    const confirmations = await readBoardScreenshotSpaceConfirmations({
      mapId: 'tharsis',
      requests: curatedSpaceIds.map((spaceId) => ({ spaceId })),
      screenshots: [await readFixtureFile()],
    });

    const confirmationList = Object.values(confirmations);

    expect(confirmationList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'confirmed',
          tileKind: 'city',
        }),
        expect.objectContaining({
          status: 'confirmed',
          tileKind: 'greenery',
        }),
        expect.objectContaining({
          status: 'confirmed',
          tileKind: 'ocean',
        }),
      ]),
    );
  });

  it('fails closed for off-layout screenshots instead of guessing', async () => {
    const blankPng = await sharp({
      create: {
        width: 552,
        height: 437,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const confirmations = await readBoardScreenshotSpaceConfirmations({
      mapId: 'tharsis',
      requests: [
        { spaceId: '21' },
        { spaceId: '30' },
      ],
      screenshots: [
        new File([blankPng], 'blank-board.png', {
          type: 'image/png',
        }),
      ],
    });

    expect(confirmations).toEqual({
      '21': {
        status: 'inconclusive',
        tileKind: 'unknown',
      },
      '30': {
        status: 'inconclusive',
        tileKind: 'unknown',
      },
    });
  });
});
