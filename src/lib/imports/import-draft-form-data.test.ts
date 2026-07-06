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

  it('round-trips confirmed player links from the import review step', () => {
    const formData = buildCreateImportDraftFormData({
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
