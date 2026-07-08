import { describe, expect, it } from 'vitest';
import {
  buildCreateImportDraftFormData,
  parseCreateImportDraftFormData,
} from './import-draft-form-data';

describe('parseCreateImportDraftFormData', () => {
  it('parses a submitted import form payload into draft input values', () => {
    const formData = new FormData();
    const screenshot = new File(['evidence'], 'endgame.png', {
      type: 'image/png',
    });

    formData.set('playedOn', '2026-07-04');
    formData.set('mapId', 'elysium');
    formData.set('playerCount', '3');
    formData.set('generationCount', '12');
    formData.set('exportedGameLog', 'Friday Mars won by 6 points.');
    formData.set(
      'participants',
      ['Friday Mars', 'Second Seat', 'Third Seat'].join('\n'),
    );
    formData.set('endgameScreenshot', screenshot);

    expect(parseCreateImportDraftFormData(formData)).toEqual({
      boardScreenshots: [],
      confirmedPlayerLinks: [],
      endgameScreenshot: screenshot,
      endgameScreenshotName: 'endgame.png',
      exportedGameLog: 'Friday Mars won by 6 points.',
      generationCount: 12,
      mapId: 'elysium',
      participantNames: ['Friday Mars', 'Second Seat', 'Third Seat'],
      playedOn: '2026-07-04',
      playerCount: 3,
    });
  });

  it('parses repeated board screenshots alongside the endgame screenshot', () => {
    const formData = new FormData();
    const endgameScreenshot = new File(['endgame'], 'endgame.png', {
      type: 'image/png',
    });
    const boardOne = new File(['board-one'], 'board-1.png', {
      type: 'image/png',
    });
    const boardTwo = new File(['board-two'], 'board-2.png', {
      type: 'image/png',
    });

    formData.set('playedOn', '2026-07-04');
    formData.set('mapId', 'elysium');
    formData.set('playerCount', '3');
    formData.set('generationCount', '12');
    formData.set('exportedGameLog', 'Friday Mars won by 6 points.');
    formData.set('participants', 'Friday Mars\nSecond Seat');
    formData.set('endgameScreenshot', endgameScreenshot);
    formData.append('boardScreenshots', boardOne);
    formData.append('boardScreenshots', boardTwo);

    expect(parseCreateImportDraftFormData(formData)).toMatchObject({
      boardScreenshots: [boardOne, boardTwo],
      endgameScreenshot,
      endgameScreenshotName: 'endgame.png',
    });
  });

  it('treats an empty screenshot field as no attached image', () => {
    const formData = new FormData();

    formData.set('playedOn', '2026-07-04');
    formData.set('mapId', 'elysium');
    formData.set('playerCount', '3');
    formData.set('generationCount', '12');
    formData.set('exportedGameLog', 'Friday Mars won by 6 points.');
    formData.set('participants', 'Friday Mars\nSecond Seat');
    formData.set('endgameScreenshot', new File([], '', { type: '' }));

    expect(parseCreateImportDraftFormData(formData)).toMatchObject({
      endgameScreenshot: null,
      endgameScreenshotName: null,
      participantNames: ['Friday Mars', 'Second Seat'],
    });
  });

  it('allows manual participants to be omitted until the import review detects them', () => {
    const formData = new FormData();

    formData.set('playedOn', '2026-07-04');
    formData.set('mapId', 'elysium');
    formData.set('playerCount', '3');
    formData.set('generationCount', '12');
    formData.set('exportedGameLog', 'Friday Mars played Earth Catapult.');
    formData.set('participants', '');

    expect(parseCreateImportDraftFormData(formData)).toMatchObject({
      participantNames: [],
    });
  });

  it('allows generation count and map id to be omitted when they will be inferred from evidence', () => {
    const formData = new FormData();

    formData.set('playedOn', '2026-07-04');
    formData.set('playerCount', '3');
    formData.set('exportedGameLog', 'Friday Mars played Earth Catapult.');
    formData.set('participants', '');

    expect(parseCreateImportDraftFormData(formData)).toMatchObject({
      generationCount: null,
      mapId: '',
      participantNames: [],
    });
  });

  it('round-trips zero or more board screenshots through built form data', () => {
    const boardOne = new File(['board-one'], 'board-1.png', {
      type: 'image/png',
    });
    const boardTwo = new File(['board-two'], 'board-2.png', {
      type: 'image/png',
    });

    const formData = buildCreateImportDraftFormData({
      boardScreenshots: [boardOne, boardTwo],
      confirmedPlayerLinks: [],
      endgameScreenshot: null,
      exportedGameLog: 'Friday Mars won by 6 points.',
      generationCount: 12,
      mapId: 'elysium',
      participants: 'Friday Mars\nSecond Seat',
      playedOn: '2026-07-04',
      playerCount: 2,
    });

    expect(formData.getAll('boardScreenshots')).toEqual([boardOne, boardTwo]);
    expect(parseCreateImportDraftFormData(formData)).toMatchObject({
      boardScreenshots: [boardOne, boardTwo],
      endgameScreenshot: null,
    });
  });

  it('round-trips confirmed player links from the import review step', () => {
    const formData = buildCreateImportDraftFormData({
      boardScreenshots: [],
      confirmedPlayerLinks: [
        { importedName: 'James', playerId: 'player-jh' },
        { importedName: 'Friday Mars', playerId: 'player-friday' },
      ],
      endgameScreenshot: null,
      exportedGameLog: 'Friday Mars won by 6 points.',
      generationCount: 12,
      mapId: 'elysium',
      participants: 'James\nFriday Mars',
      playedOn: '2026-07-04',
      playerCount: 2,
    });

    expect(parseCreateImportDraftFormData(formData)).toMatchObject({
      confirmedPlayerLinks: [
        { importedName: 'James', playerId: 'player-jh' },
        { importedName: 'Friday Mars', playerId: 'player-friday' },
      ],
      participantNames: ['James', 'Friday Mars'],
    });
  });
});
