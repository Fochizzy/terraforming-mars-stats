import { describe, expect, it } from 'vitest';
import type { BrowserOcrWord } from '@/lib/ocr/browser-tesseract';
import { parseTerraformingMarsEndgameOcr } from './parse-terraforming-mars-endgame-ocr';

function lineWords(lineKey: string, values: string[]): BrowserOcrWord[] {
  return values.map((text, index) => ({
    confidence: 0.98,
    height: 20,
    left: index * 100,
    lineKey,
    text,
    top: Number(lineKey) * 25,
    width: 80,
  }));
}

describe('Terraforming Mars end-game screenshot parser', () => {
  it('maps the base score layout and derives tied winners', () => {
    const result = parseTerraformingMarsEndgameOcr({
      players: [
        { normalizedValue: 'friday mars', originalValue: 'Friday Mars' },
        { normalizedValue: 'izzy', originalValue: 'Izzy' },
      ],
      rawText: 'Victory point breakdown after 12 generations',
      words: [
        ...lineWords('1', ['Friday', 'Mars', '40', '5', '5', '12', '8', '20', '90', '12']),
        ...lineWords('2', ['Izzy', '45', '5', '5', '10', '7', '18', '90', '12']),
      ],
    });

    expect(result.status).toBe('success');
    expect(result.generationCount).toBe(12);
    expect(result.scoreRows[0]).toMatchObject({
      awardPoints: 5,
      cardPointsTotal: 20,
      citiesPoints: 8,
      finalMegacredits: 12,
      greeneryPoints: 12,
      milestonePoints: 5,
      status: 'exact_base_layout',
      totalPoints: 90,
      trPoints: 40,
    });
    expect(result.placements).toEqual([
      { isWinner: true, normalizedPlayerName: 'friday mars', placement: 1 },
      { isWinner: true, normalizedPlayerName: 'izzy', placement: 1 },
    ]);
  });

  it('keeps expansion columns explicit instead of shifting them into card points', () => {
    const result = parseTerraformingMarsEndgameOcr({
      players: [{ normalizedValue: 'friday', originalValue: 'Friday' }],
      rawText: 'Victory point breakdown after 10 generations',
      words: lineWords('1', [
        'Friday',
        '40',
        '5',
        '5',
        '12',
        '8',
        '3',
        '20',
        '93',
        '8',
      ]),
    });

    expect(result.status).toBe('partial');
    expect(result.scoreRows[0]).toMatchObject({
      cardPointsTotal: null,
      status: 'partial',
      totalPoints: 93,
      unsupportedComponentCount: 1,
    });
    expect(result.warnings.join(' ')).toMatch(/expansion score component/i);
  });

  it('does not fabricate scores when structured OCR positions are unavailable', () => {
    const result = parseTerraformingMarsEndgameOcr({
      players: [{ normalizedValue: 'friday', originalValue: 'Friday' }],
      rawText: 'Friday 40 5 5 12 8 20 90 8',
      words: [],
    });

    expect(result.status).toBe('unresolved');
    expect(result.scoreRows[0].totalPoints).toBeNull();
    expect(result.warnings.join(' ')).toMatch(/positions were unavailable/i);
  });
});
