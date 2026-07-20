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
          cardType: 'Automated',
          id: 'card-steel-works',
          sourceTags: ['Building', 'Power'],
        },
        {
          cardName: 'Research Outpost',
          cardType: 'Automated',
          id: 'card-research-outpost',
          sourceTags: ['Science', 'Earth', 'City'],
        },
        {
          cardName: 'Asteroid Mining Consortium',
          cardType: 'Active',
          id: 'card-asteroid-mining-consortium',
          sourceTags: ['Jovian', 'Space'],
        },
        {
          cardName: 'Pets',
          cardType: 'Active',
          id: 'card-pets',
          sourceTags: ['Animal'],
        },
        {
          cardName: 'Duplicate Project',
          cardType: 'Automated',
          fullImageUrl: 'https://example.com/duplicate-project-a.png',
          id: 'card-duplicate-a',
          sourceTags: ['Microbe'],
        },
        {
          cardName: 'Duplicate Project',
          cardType: 'Automated',
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
      'venus',
      'plant',
      'microbe',
      'animal',
      'city',
      'wild',
      'moon',
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

  it('counts repeated tags on a single card once per printed occurrence', () => {
    const summaries = derivePlayerTagSummaries({
      cardReferences: [
        {
          cardName: 'Luna Trade Station',
          cardType: 'Automated',
          id: 'card-luna-trade-station',
          sourceTags: ['Moon', 'Moon', 'Space'],
        },
        {
          cardName: 'Research',
          cardType: 'Automated',
          id: 'card-research',
          sourceTags: ['Science', 'Science'],
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Luna Trade Station',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Luna Trade Station',
        },
        {
          actor: 'Friday Mars',
          card: 'Research',
          eventType: 'card_played',
          lineNumber: 2,
          rawLine: 'Friday Mars played Research',
        },
      ],
    });

    expect(summaries).toEqual([
      expect.objectContaining({
        matchedCardCount: 2,
        tagCounts: expect.objectContaining({ moon: 2, science: 2, space: 1 }),
        totalTags: 5,
      }),
    ]);
  });

  it('auto-resolves duplicate card printings sharing an identical type and tags', () => {
    const summaries = derivePlayerTagSummaries({
      cardReferences: [
        {
          cardName: 'Deimos Down',
          cardType: 'Event',
          id: 'card-deimos-down-base',
          sourceTags: ['Space', 'Event'],
        },
        {
          cardName: 'Deimos Down',
          cardType: 'Event',
          id: 'card-deimos-down-promo',
          sourceTags: ['Event', 'Space'],
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Deimos Down',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Deimos Down',
        },
      ],
    });

    expect(summaries).toEqual([
      expect.objectContaining({
        matchedCardCount: 1,
        playedCardCount: 1,
        tagCounts: expect.objectContaining({ event: 0, space: 0 }),
        totalTags: 0,
        unresolvedCardCount: 0,
      }),
    ]);
  });

  it('treats identically-named printings with different canonical types as ambiguous', () => {
    const summaries = derivePlayerTagSummaries({
      cardReferences: [
        {
          cardName: 'Ambiguous Reprint',
          cardType: 'Event',
          id: 'card-ambiguous-reprint-event',
          sourceTags: ['Space'],
        },
        {
          cardName: 'Ambiguous Reprint',
          cardType: 'Automated',
          id: 'card-ambiguous-reprint-automated',
          sourceTags: ['Space'],
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Ambiguous Reprint',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Ambiguous Reprint',
        },
      ],
    });

    expect(summaries).toEqual([
      expect.objectContaining({
        matchedCardCount: 0,
        playedCardCount: 1,
        totalTags: 0,
        unresolvedCardCount: 1,
        unresolvedCards: [
          expect.objectContaining({
            cardName: 'Ambiguous Reprint',
            reason: 'ambiguous_match',
          }),
        ],
      }),
    ]);
  });

  it('counts zero tags for a played Event card, including the event tag itself', () => {
    const summaries = derivePlayerTagSummaries({
      cardReferences: [
        {
          cardName: 'Asteroid',
          cardType: 'Event',
          id: 'card-asteroid',
          sourceTags: ['Event', 'Space'],
        },
        {
          cardName: 'Interplanetary Trade',
          cardType: 'Automated',
          id: 'card-interplanetary-trade',
          sourceTags: ['Space'],
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Asteroid',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Asteroid',
        },
        {
          actor: 'Friday Mars',
          card: 'Interplanetary Trade',
          eventType: 'card_played',
          lineNumber: 2,
          rawLine: 'Friday Mars played Interplanetary Trade',
        },
      ],
    });

    expect(summaries).toEqual([
      expect.objectContaining({
        matchedCardCount: 2,
        tagCounts: expect.objectContaining({ event: 0, space: 1 }),
        totalTags: 1,
      }),
    ]);
  });

  it('counts zero tags for an Event card even when it carries no literal event tag', () => {
    const summaries = derivePlayerTagSummaries({
      cardReferences: [
        {
          cardName: 'Jovian Event',
          cardType: 'Event',
          id: 'card-jovian-event',
          sourceTags: ['Space', 'Jovian'],
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Jovian Event',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Jovian Event',
        },
      ],
    });

    expect(summaries).toEqual([
      expect.objectContaining({
        matchedCardCount: 1,
        tagCounts: expect.objectContaining({ jovian: 0, space: 0 }),
        totalTags: 0,
      }),
    ]);
  });

  it('does not treat a non-Event card as an Event just because it carries an event tag', () => {
    const summaries = derivePlayerTagSummaries({
      cardReferences: [
        {
          cardName: 'Mislabeled Project',
          cardType: 'Automated',
          id: 'card-mislabeled-project',
          sourceTags: ['Event', 'Space'],
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

    expect(summaries).toEqual([
      expect.objectContaining({
        tagCounts: expect.objectContaining({ event: 1, space: 1 }),
        totalTags: 2,
      }),
    ]);
  });

  it('leaves playedCardCount unchanged for an Event card while tagCounts stay at zero', () => {
    const summaries = derivePlayerTagSummaries({
      cardReferences: [
        {
          cardName: 'Asteroid',
          cardType: 'Event',
          id: 'card-asteroid',
          sourceTags: ['Event', 'Space'],
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Asteroid',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Asteroid',
        },
      ],
    });

    expect(summaries).toEqual([
      expect.objectContaining({
        matchedCardCount: 1,
        playedCardCount: 1,
        totalTags: 0,
      }),
    ]);
  });

  it('contributes no fabricated tags for a card that cannot be resolved at all', () => {
    const summaries = derivePlayerTagSummaries({
      cardReferences: [
        {
          cardName: 'Known Project',
          cardType: 'Automated',
          id: 'card-known-project',
          sourceTags: ['Science'],
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Completely Unknown Card',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Completely Unknown Card',
        },
      ],
    });

    expect(summaries).toEqual([
      expect.objectContaining({
        matchedCardCount: 0,
        playedCardCount: 1,
        totalTags: 0,
        unresolvedCardCount: 1,
        unresolvedCards: [
          expect.objectContaining({
            cardName: 'Completely Unknown Card',
            reason: 'not_found',
          }),
        ],
      }),
    ]);
  });

  it('reports player total tags as the sum of eligible per-tag counts', () => {
    const summaries = derivePlayerTagSummaries({
      cardReferences: [
        {
          cardName: 'Event Card',
          cardType: 'Event',
          id: 'card-event-card',
          sourceTags: ['Event', 'Earth'],
        },
        {
          cardName: 'Building Card',
          cardType: 'Automated',
          id: 'card-building-card',
          sourceTags: ['Building'],
        },
        {
          cardName: 'Science Card',
          cardType: 'Active',
          id: 'card-science-card',
          sourceTags: ['Science', 'Science'],
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Event Card',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Event Card',
        },
        {
          actor: 'Friday Mars',
          card: 'Building Card',
          eventType: 'card_played',
          lineNumber: 2,
          rawLine: 'Friday Mars played Building Card',
        },
        {
          actor: 'Friday Mars',
          card: 'Science Card',
          eventType: 'card_played',
          lineNumber: 3,
          rawLine: 'Friday Mars played Science Card',
        },
      ],
    });

    const summary = summaries[0]!;
    const summedFromTagCounts = Object.values(summary.tagCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    expect(summedFromTagCounts).toBe(summary.totalTags);
    expect(summary.totalTags).toBe(3);
  });
});
