import { describe, expect, it } from 'vitest';
import {
  PLAYER_TAG_CODES,
  derivePlayerTagSummaries,
} from './derive-player-tag-summaries';

describe('derivePlayerTagSummaries', () => {
  it('counts canonical played-card tags per player and reports unresolved cards', () => {
    const summaries = derivePlayerTagSummaries({
      cardReferences: [
        {
          cardName: 'Steel Works',
          id: 'card-steel-works',
          sourceTags: ['Building', 'Power'],
        },
        {
          cardName: 'Research Outpost',
          id: 'card-research-outpost',
          sourceTags: ['Science', 'Earth', 'City'],
        },
        {
          cardName: 'Asteroid Mining Consortium',
          id: 'card-asteroid-mining-consortium',
          sourceTags: ['Jovian', 'Space'],
        },
        {
          cardName: 'Pets',
          id: 'card-pets',
          sourceTags: ['Animal'],
        },
        {
          cardName: 'Duplicate Project',
          fullImageUrl: 'https://example.com/duplicate-project-a.png',
          id: 'card-duplicate-a',
          sourceTags: ['Microbe'],
        },
        {
          cardName: 'Duplicate Project',
          fullImageUrl: 'https://example.com/duplicate-project-b.png',
          id: 'card-duplicate-b',
          sourceTags: ['Plant'],
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Steel Works',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Steel Works',
        },
        {
          actor: 'Friday Mars',
          card: 'Research Outpost',
          eventType: 'card_played',
          lineNumber: 2,
          rawLine: 'Friday Mars played Research Outpost',
        },
        {
          actor: 'Friday Mars',
          card: 'Missing Project',
          eventType: 'card_played',
          lineNumber: 3,
          rawLine: 'Friday Mars played Missing Project',
        },
        {
          actor: 'Second Seat',
          card: 'Asteroid Mining Consortium',
          eventType: 'card_played',
          lineNumber: 4,
          rawLine: 'Second Seat played Asteroid Mining Consortium',
        },
        {
          actor: 'Second Seat',
          card: 'Pets: base',
          eventType: 'card_played',
          lineNumber: 5,
          rawLine: 'Second Seat played Pets: base',
        },
        {
          actor: 'Second Seat',
          card: 'Duplicate Project',
          eventType: 'card_played',
          lineNumber: 6,
          rawLine: 'Second Seat played Duplicate Project',
        },
        {
          actor: 'Friday Mars',
          eventType: 'tile_placed',
          lineNumber: 7,
          rawLine: 'Friday Mars placed greenery tile at 15',
          space: '15',
          tile: 'greenery',
        },
      ],
    });

    expect(PLAYER_TAG_CODES).toEqual([
      'building',
      'space',
      'power',
      'science',
      'jovian',
      'earth',
      'plant',
      'microbe',
      'animal',
      'city',
      'event',
    ]);
    expect(summaries).toEqual([
      expect.objectContaining({
        matchedCardCount: 2,
        playedCardCount: 3,
        playerName: 'Friday Mars',
        tagCounts: expect.objectContaining({
          building: 1,
          city: 1,
          earth: 1,
          power: 1,
          science: 1,
        }),
        totalTags: 5,
        unresolvedCardCount: 1,
        unresolvedCards: [
          expect.objectContaining({
            cardName: 'Missing Project',
            lineNumber: 3,
            reason: 'not_found',
          }),
        ],
      }),
      expect.objectContaining({
        matchedCardCount: 2,
        playedCardCount: 3,
        playerName: 'Second Seat',
        tagCounts: expect.objectContaining({
          animal: 1,
          jovian: 1,
          space: 1,
        }),
        totalTags: 3,
        unresolvedCardCount: 1,
        unresolvedCards: [
          expect.objectContaining({
            candidateCards: [
              {
                cardId: 'card-duplicate-a',
                cardName: 'Duplicate Project',
                imageUrl: 'https://example.com/duplicate-project-a.png',
              },
              {
                cardId: 'card-duplicate-b',
                cardName: 'Duplicate Project',
                imageUrl: 'https://example.com/duplicate-project-b.png',
              },
            ],
            candidateCardIds: ['card-duplicate-a', 'card-duplicate-b'],
            cardName: 'Duplicate Project',
            lineNumber: 6,
            reason: 'ambiguous_match',
          }),
        ],
      }),
    ]);
  });
});
