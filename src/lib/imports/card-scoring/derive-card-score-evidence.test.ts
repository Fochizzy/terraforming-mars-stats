import { describe, expect, it } from 'vitest';
import { deriveCardScoreEvidence } from './derive-card-score-evidence';

describe('deriveCardScoreEvidence', () => {
  it('derives resource, tag, and tile evidence from parsed log events', () => {
    const evidence = deriveCardScoreEvidence({
      boardStateTextLines: ['Friday Mars 4 cities'],
      cardReferences: [
        {
          cardName: 'Pets',
          cardNumber: '001',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/pets.png',
          id: 'card-pets',
          imageUrl: 'https://example.com/pets.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:001',
          sourceTags: [],
          thumbnailUrl: 'https://example.com/pets-thumb.png',
        },
        {
          cardName: 'Research Network',
          cardNumber: '002',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/research-network.png',
          id: 'card-research-network',
          imageUrl: 'https://example.com/research-network.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:002',
          sourceTags: ['Science'],
          thumbnailUrl: 'https://example.com/research-network-thumb.png',
        },
        {
          cardName: 'Orbital Lab',
          cardNumber: '003',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/orbital-lab.png',
          id: 'card-orbital-lab',
          imageUrl: 'https://example.com/orbital-lab.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:003',
          sourceTags: ['Science'],
          thumbnailUrl: 'https://example.com/orbital-lab-thumb.png',
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Pets',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Pets',
        },
        {
          actor: 'Friday Mars',
          card: 'Research Network',
          eventType: 'card_played',
          lineNumber: 2,
          rawLine: 'Friday Mars played Research Network',
        },
        {
          actor: 'Friday Mars',
          card: 'Orbital Lab',
          eventType: 'card_played',
          lineNumber: 3,
          rawLine: 'Friday Mars played Orbital Lab',
        },
        {
          actor: 'Friday Mars',
          card: 'Pets',
          eventType: 'resource_changed',
          lineNumber: 4,
          operation: 'added',
          rawLine: 'Friday Mars added 4 animals to Pets',
          resourceAmount: 4,
          resourceType: 'animal',
        },
        {
          actor: 'Friday Mars',
          eventType: 'tile_placed',
          lineNumber: 5,
          rawLine: 'Friday Mars placed city tile at 12',
          space: '12',
          tile: 'city',
        },
      ],
    });

    expect(evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          boardStateTextLines: ['Friday Mars 4 cities'],
          cardId: 'card-pets',
          playerName: 'Friday Mars',
          resourceCountsByType: { animal: 4 },
          selfTagCounts: { science: 2 },
          selfTileCounts: { city: 1 },
        }),
        expect.objectContaining({
          cardId: 'card-research-network',
          selfTagCounts: { science: 2 },
          selfTileCounts: { city: 1 },
        }),
      ]),
    );
  });
});
