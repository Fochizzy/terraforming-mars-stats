import { describe, expect, it } from 'vitest';
import { buildConfirmedPlayerAliases } from './build-confirmed-player-aliases';

describe('buildConfirmedPlayerAliases', () => {
  const players = [
    {
      displayName: 'James Hodnett',
      gamesPlayed: 12,
      id: 'player-jh',
      linkedFullName: 'James Hodnett',
      linkedUsername: 'jhodnett',
    },
    {
      displayName: 'Friday Mars',
      gamesPlayed: 8,
      id: 'player-friday',
      linkedFullName: 'Friday Mars',
      linkedUsername: 'friday-mars',
    },
  ];

  it('saves confirmed non-exact participant names as game-log aliases', () => {
    expect(
      buildConfirmedPlayerAliases({
        confirmedPlayerLinks: [
          { importedName: 'James H', playerId: 'player-jh' },
          { importedName: 'Friday Mars', playerId: 'player-friday' },
        ],
        participantNames: ['James H', 'Friday Mars'],
        players,
        screenshotPlayerNames: [],
      }),
    ).toEqual([
      {
        aliasText: 'James H',
        playerId: 'player-jh',
        sourceType: 'game_log',
      },
    ]);
  });

  it('saves screenshot-only OCR names separately and skips exact username matches', () => {
    expect(
      buildConfirmedPlayerAliases({
        confirmedPlayerLinks: [
          { importedName: 'James H', playerId: 'player-jh' },
          { importedName: 'friday-mars', playerId: 'player-friday' },
        ],
        participantNames: [],
        players,
        screenshotPlayerNames: ['James H', 'friday-mars'],
      }),
    ).toEqual([
      {
        aliasText: 'James H',
        playerId: 'player-jh',
        sourceType: 'screenshot_ocr',
      },
    ]);
  });
});
