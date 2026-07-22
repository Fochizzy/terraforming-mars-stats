import { describe, expect, it } from 'vitest';
import { extractGameLogParticipantNames } from './extract-game-log-participant-names';

describe('extractGameLogParticipantNames', () => {
  it('collects unique actor and breakdown names in first-seen order', () => {
    expect(
      extractGameLogParticipantNames({
        cardPointBreakdowns: [
          {
            cardPointsAnimals: 1,
            cardPointsJovian: 0,
            cardPointsMicrobes: 2,
            eventType: 'card_points_breakdown',
            lineNumber: 7,
            playerName: 'Third Seat',
            rawLine: 'Third Seat Microbes 2 Animals 1 Jovian 0',
          },
          {
            cardPointsAnimals: 2,
            cardPointsJovian: 6,
            cardPointsMicrobes: 4,
            eventType: 'card_points_breakdown',
            lineNumber: 8,
            playerName: 'Friday Mars',
            rawLine: 'Friday Mars Microbes 4 Animals 2 Jovian 6',
          },
        ],
        events: [
          {
            actor: 'Friday Mars',
            card: 'Earth Catapult',
            eventType: 'card_played',
            lineNumber: 2,
            rawLine: 'Friday Mars played Earth Catapult',
          },
          {
            actor: 'Second Seat',
            eventType: 'milestone_claimed',
            lineNumber: 3,
            milestone: 'Builder',
            rawLine: 'Second Seat claimed Builder milestone',
          },
          {
            actor: 'Friday Mars',
            award: 'Landlord',
            eventType: 'award_funded',
            lineNumber: 4,
            rawLine: 'Friday Mars funded Landlord award',
          },
        ],
      }),
    ).toEqual(['Friday Mars', 'Second Seat', 'Third Seat']);
  });

  it('accepts a full five-player log', () => {
    expect(
      extractGameLogParticipantNames({
        cardPointBreakdowns: [],
        events: Array.from({ length: 5 }, (_, index) => ({
          actor: `Player ${index}`,
          card: 'Earth Catapult',
          eventType: 'card_played' as const,
          lineNumber: index + 1,
          rawLine: `Player ${index} played Earth Catapult`,
        })),
      }),
    ).toHaveLength(5);
  });

  it('rejects a pasted log that names more players than a game can hold', () => {
    // `parseGameLog` never throws, so the pasted log is an unbounded
    // caller-supplied list of names heading for the identity matcher.
    expect(() =>
      extractGameLogParticipantNames({
        cardPointBreakdowns: [],
        events: Array.from({ length: 64 }, (_, index) => ({
          actor: `Probe ${index}`,
          card: 'Earth Catapult',
          eventType: 'card_played' as const,
          lineNumber: index + 1,
          rawLine: `Probe ${index} played Earth Catapult`,
        })),
      }),
    ).toThrow(/at most 5/);
  });

  it('ignores blank actor names', () => {
    expect(
      extractGameLogParticipantNames({
        cardPointBreakdowns: [],
        events: [
          {
            actor: '',
            card: 'Earth Catapult',
            eventType: 'card_played',
            lineNumber: 2,
            rawLine: ' played Earth Catapult',
          },
        ],
      }),
    ).toEqual([]);
  });
});
