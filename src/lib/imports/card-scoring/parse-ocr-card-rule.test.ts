import { describe, expect, it } from 'vitest';
import { parseOcrCardRule } from './parse-ocr-card-rule';

describe('parseOcrCardRule', () => {
  it('parses animal resource scoring from OCR text', () => {
    expect(
      parseOcrCardRule({
        cardName: 'Pets',
        textLines: ['Effect: 1 VP for every animal on this card.'],
      }),
    ).toMatchObject({
      confidence: expect.any(Number),
      humanSummary: '1 VP per animal on this card',
      payload: {
        category: 'animals',
        mode: 'resource_count',
        pointsPerSet: 1,
        resourceType: 'animal',
        setSize: 1,
      },
      status: 'resolved',
    });
  });

  it('parses science tag scoring from OCR text', () => {
    expect(
      parseOcrCardRule({
        cardName: 'Research Network',
        textLines: ['1 VP for every 2 science tags you have.'],
      }),
    ).toMatchObject({
      confidence: expect.any(Number),
      humanSummary: '1 VP per 2 science tags you have',
      payload: {
        category: 'other',
        mode: 'tag_count',
        pointsPerSet: 1,
        setSize: 2,
        tag: 'science',
      },
      status: 'resolved',
    });
  });

  it('returns no_scoring when OCR text has no VP rule', () => {
    expect(
      parseOcrCardRule({
        cardName: 'Electro Catapult',
        textLines: ['Action: spend 1 energy to gain 7 MC.'],
      }),
    ).toMatchObject({
      humanSummary: 'No endgame VP rule detected in the card text.',
      status: 'no_scoring',
    });
  });

  it('flags conflicting OCR formulas for review', () => {
    expect(
      parseOcrCardRule({
        cardName: 'Ambiguous Colony',
        textLines: [
          '1 VP for every Jovian tag you have.',
          '1 VP for every 2 science tags you have.',
        ],
      }),
    ).toEqual({
      reason: 'Multiple endgame scoring formulas were detected for Ambiguous Colony.',
      status: 'review',
    });
  });
});
