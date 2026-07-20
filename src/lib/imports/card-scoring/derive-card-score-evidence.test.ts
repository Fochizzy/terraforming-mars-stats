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

  it('excludes every tag of a played Event card from self tag counts', () => {
    const evidence = deriveCardScoreEvidence({
      cardReferences: [
        {
          cardName: 'Lagrange Observatory',
          cardNumber: '004',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/lagrange-observatory.png',
          id: 'card-lagrange-observatory',
          imageUrl: 'https://example.com/lagrange-observatory.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:004',
          sourceTags: ['Science', 'Space'],
          thumbnailUrl: 'https://example.com/lagrange-observatory-thumb.png',
        },
        {
          cardName: 'Large Convoy',
          cardNumber: '005',
          cardType: 'Event',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/large-convoy.png',
          id: 'card-large-convoy',
          imageUrl: 'https://example.com/large-convoy.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:005',
          sourceTags: ['Event', 'Space', 'Earth'],
          thumbnailUrl: 'https://example.com/large-convoy-thumb.png',
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Lagrange Observatory',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Lagrange Observatory',
        },
        {
          actor: 'Friday Mars',
          card: 'Large Convoy',
          eventType: 'card_played',
          lineNumber: 2,
          rawLine: 'Friday Mars played Large Convoy',
        },
      ],
    });

    expect(evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardId: 'card-lagrange-observatory',
          selfTagCounts: { science: 1, space: 1 },
        }),
        expect.objectContaining({
          cardId: 'card-large-convoy',
          selfTagCounts: { science: 1, space: 1 },
        }),
      ]),
    );
  });

  it('keeps tags for a non-Event card that happens to carry an event tag', () => {
    const evidence = deriveCardScoreEvidence({
      cardReferences: [
        {
          cardName: 'Mislabeled Project',
          cardNumber: '006',
          cardType: 'Automated',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/mislabeled-project.png',
          id: 'card-mislabeled-project',
          imageUrl: 'https://example.com/mislabeled-project.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:006',
          sourceTags: ['Event', 'Space'],
          thumbnailUrl: 'https://example.com/mislabeled-project-thumb.png',
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Mislabeled Project',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Mislabeled Project',
        },
      ],
    });

    expect(evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardId: 'card-mislabeled-project',
          selfTagCounts: { event: 1, space: 1 },
        }),
      ]),
    );
  });

  it('does not double-count a card referenced by more than one event', () => {
    const cardReferences = [
      {
        cardName: 'Pets',
        cardNumber: '001',
        cardType: 'Active',
        expansionCode: 'base',
        fullImageUrl: 'https://example.com/pets.png',
        id: 'card-pets',
        imageUrl: 'https://example.com/pets.png',
        promoSetSlug: null,
        requiredExpansionCodes: ['base'],
        sourceCardId: 'project:base:001',
        sourceTags: ['Animal'],
        thumbnailUrl: 'https://example.com/pets-thumb.png',
      },
    ];
    const events = [
      {
        actor: 'Friday Mars',
        card: 'Pets',
        eventType: 'card_played' as const,
        lineNumber: 1,
        rawLine: 'Friday Mars played Pets',
      },
      {
        actor: 'Friday Mars',
        card: 'Pets',
        eventType: 'resource_changed' as const,
        lineNumber: 2,
        operation: 'added' as const,
        rawLine: 'Friday Mars added 4 animals to Pets',
        resourceAmount: 4,
        resourceType: 'animal',
      },
      {
        actor: 'Friday Mars',
        card: 'Pets',
        eventType: 'resource_changed' as const,
        lineNumber: 3,
        operation: 'added' as const,
        rawLine: 'Friday Mars added 2 animals to Pets',
        resourceAmount: 2,
        resourceType: 'animal',
      },
    ];

    const evidence = deriveCardScoreEvidence({ cardReferences, events });

    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toEqual(
      expect.objectContaining({
        cardId: 'card-pets',
        resourceCountsByType: { animal: 6 },
        selfTagCounts: { animal: 1 },
      }),
    );
  });

  it('is idempotent across repeated calls with the same input', () => {
    const input = {
      cardReferences: [
        {
          cardName: 'Large Convoy',
          cardNumber: '005',
          cardType: 'Event',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/large-convoy.png',
          id: 'card-large-convoy',
          imageUrl: 'https://example.com/large-convoy.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:005',
          sourceTags: ['Event', 'Space', 'Earth'],
          thumbnailUrl: 'https://example.com/large-convoy-thumb.png',
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Large Convoy',
          eventType: 'card_played' as const,
          lineNumber: 1,
          rawLine: 'Friday Mars played Large Convoy',
        },
      ],
    };

    expect(deriveCardScoreEvidence(input)).toEqual(
      deriveCardScoreEvidence(input),
    );
  });
});
