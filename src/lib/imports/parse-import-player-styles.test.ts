import { describe, expect, it } from 'vitest';
import { parseImportPlayerStyles } from './parse-import-player-styles';

describe('parseImportPlayerStyles', () => {
  it('extracts modifier styles and high-signal key cards from parsed log events', () => {
    expect(
      parseImportPlayerStyles({
        cardOptions: [
          {
            cardName: 'Earth Catapult',
            cardNumber: '001',
            expansionCode: 'base',
            id: 'card-1',
            promoSetSlug: null,
            requiredExpansionCodes: ['base'],
          },
          {
            cardName: 'Tardigrades',
            cardNumber: '002',
            expansionCode: 'base',
            id: 'card-2',
            promoSetSlug: null,
            requiredExpansionCodes: ['base'],
          },
          {
            cardName: 'Media Group',
            cardNumber: '003',
            expansionCode: 'base',
            id: 'card-3',
            promoSetSlug: null,
            requiredExpansionCodes: ['base'],
          },
        ],
        events: [
          {
            actor: 'Friday Mars',
            eventType: 'milestone_claimed',
            lineNumber: 1,
            milestone: 'Builder',
            rawLine: 'Friday Mars claimed Builder milestone',
          },
          {
            actor: 'Friday Mars',
            award: 'Landlord',
            eventType: 'award_funded',
            lineNumber: 2,
            rawLine: 'Friday Mars funded Landlord award',
          },
          {
            actor: 'Friday Mars',
            card: 'Earth Catapult',
            eventType: 'card_played',
            lineNumber: 3,
            rawLine: 'Friday Mars played Earth Catapult',
          },
          {
            actor: 'Friday Mars',
            card: 'Tardigrades',
            eventType: 'card_played',
            lineNumber: 4,
            rawLine: 'Friday Mars played Tardigrades',
          },
          {
            actor: 'Friday Mars',
            card: 'Media Group',
            eventType: 'card_played',
            lineNumber: 5,
            rawLine: 'Friday Mars played Media Group',
          },
          {
            actor: 'Friday Mars',
            card: 'Tardigrades',
            eventType: 'resource_changed',
            lineNumber: 6,
            operation: 'added',
            rawLine: 'Friday Mars added 2 microbes to Tardigrades',
            resourceAmount: 2,
            resourceType: 'microbe',
          },
        ],
        participants: [{ importedName: 'Friday Mars', playerId: 'p1' }],
        styleOptions: [
          {
            code: 'milestone_aggression',
          },
          {
            code: 'award_pressure',
          },
        ],
      }),
    ).toEqual({
      p1: {
        keyCardIds: ['card-2', 'card-3', 'card-1'],
        modifierStyleCodes: ['milestone_aggression', 'award_pressure'],
        primaryStyleCode: '',
      },
    });
  });

  it('matches export-log card names that include promo suffixes', () => {
    expect(
      parseImportPlayerStyles({
        cardOptions: [
          {
            cardName: 'Magnetic Field Generators',
            cardNumber: 'X01',
            expansionCode: 'promo',
            id: 'card-promo',
            promoSetSlug: 'seasonal',
            requiredExpansionCodes: ['base'],
          },
        ],
        events: [
          {
            actor: 'Corey',
            card: 'Magnetic Field Generators:promo',
            eventType: 'card_played',
            lineNumber: 1,
            rawLine: 'Corey played Magnetic Field Generators:promo',
          },
        ],
        participants: [{ importedName: 'Corey', playerId: 'p2' }],
      }),
    ).toEqual({
      p2: {
        keyCardIds: ['card-promo'],
        modifierStyleCodes: [],
        primaryStyleCode: '',
      },
    });
  });
});
