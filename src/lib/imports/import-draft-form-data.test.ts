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
      clientEndgameLines: [],
      confirmedPlayerLinks: [],
      endgameScreenshot: screenshot,
      endgameScreenshotName: 'endgame.png',
      exportedGameLog: 'Friday Mars won by 6 points.',
      generationCount: 12,
      mapId: 'elysium',
      participantNames: ['Friday Mars', 'Second Seat', 'Third Seat'],
      playedOn: '2026-07-04',
      playerCount: 3,
      scoreDetailsScreenshot: null,
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
      scoreDetailsScreenshot: null,
    });
  });

  it('round-trips an optional score details screenshot alongside the endgame screenshot', () => {
    const formData = new FormData();
    const endgameScreenshot = new File(['endgame'], 'endgame.png', {
      type: 'image/png',
    });
    const scoreDetailsScreenshot = new File(['details'], 'score-details.png', {
      type: 'image/png',
    });

    formData.set('playedOn', '2026-07-04');
    formData.set('mapId', 'elysium');
    formData.set('playerCount', '2');
    formData.set('generationCount', '12');
    formData.set('exportedGameLog', 'Friday Mars won by 6 points.');
    formData.set('participants', 'Friday Mars\nSecond Seat');
    formData.set('endgameScreenshot', endgameScreenshot);
    formData.set('scoreDetailsScreenshot', scoreDetailsScreenshot);

    expect(parseCreateImportDraftFormData(formData)).toMatchObject({
      endgameScreenshot,
      endgameScreenshotName: 'endgame.png',
      scoreDetailsScreenshot,
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
      scoreDetailsScreenshot: null,
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
      scoreDetailsScreenshot: null,
    });

    expect(formData.getAll('boardScreenshots')).toEqual([boardOne, boardTwo]);
    expect(parseCreateImportDraftFormData(formData)).toMatchObject({
      boardScreenshots: [boardOne, boardTwo],
      endgameScreenshot: null,
      scoreDetailsScreenshot: null,
    });
  });

  it('round-trips confirmed player links from the import review step', () => {
    const formData = buildCreateImportDraftFormData({
      boardScreenshots: [],
      clientEndgameLines: [],
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
      scoreDetailsScreenshot: null,
    });

    expect(parseCreateImportDraftFormData(formData)).toMatchObject({
      confirmedPlayerLinks: [
        { importedName: 'James', playerId: 'player-jh' },
        { importedName: 'Friday Mars', playerId: 'player-friday' },
      ],
      participantNames: ['James', 'Friday Mars'],
    });
  });

  it('round-trips client endgame OCR lines from the browser fallback', () => {
    const clientEndgameLines = [
      'Victory points breakdown after 12 generations',
      'Friday Mars 18 5 2 0 0 1 26 8',
    ];

    const formData = buildCreateImportDraftFormData({
      boardScreenshots: [],
      clientEndgameLines,
      confirmedPlayerLinks: [],
      endgameScreenshot: null,
      exportedGameLog: 'Friday Mars won by 6 points.',
      generationCount: 12,
      mapId: 'elysium',
      participants: 'Friday Mars',
      playedOn: '2026-07-04',
      playerCount: 1,
      scoreDetailsScreenshot: null,
    });

    expect(JSON.parse(String(formData.get('clientEndgameLines')))).toEqual(
      clientEndgameLines,
    );
    expect(parseCreateImportDraftFormData(formData)).toMatchObject({
      clientEndgameLines,
    });
  });
});
