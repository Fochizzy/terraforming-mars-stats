import { describe, expect, it } from 'vitest';
import {
  buildStyleEffectivenessSummary,
  namedSubject,
  SELF_SUBJECT,
  type StylePerformanceInput,
} from './style-effectiveness';

function styleRow(
  overrides: Partial<StylePerformanceInput> &
    Pick<StylePerformanceInput, 'styleCode' | 'gamesPlayed'>,
): StylePerformanceInput {
  return {
    averagePlacement: 2,
    averageScore: 80,
    winRate: 0.4,
    wins: Math.round((overrides.winRate ?? 0.4) * overrides.gamesPlayed),
    ...overrides,
  };
}

describe('buildStyleEffectivenessSummary', () => {
  it('returns null when no styles have games', () => {
    expect(
      buildStyleEffectivenessSummary({
        scoreEntries: [],
        styleRows: [styleRow({ gamesPlayed: 0, styleCode: 'board_control' })],
        subject: SELF_SUBJECT,
      }),
    ).toBeNull();
  });

  it('leads with the top score sources and the most-played style', () => {
    const summary = buildStyleEffectivenessSummary({
      scoreEntries: [
        { label: 'Cities', value: 12 },
        { label: 'Greenery', value: 9 },
        { label: 'Terraform Rating', value: 30 },
      ],
      styleRows: [
        styleRow({ gamesPlayed: 8, styleCode: 'board_control', winRate: 0.5 }),
        styleRow({ gamesPlayed: 3, styleCode: 'engine_building', winRate: 0.2 }),
      ],
      subject: SELF_SUBJECT,
    });

    expect(summary?.lead).toBe(
      'Your points come mostly from terraform rating, city tiles, and greenery tiles, which most often plays as Board Control.',
    );
    expect(summary?.styles).toHaveLength(2);
    expect(summary?.styles[0].styleCode).toBe('board_control');
    expect(summary?.styles[0].sentence).toContain('leans on city and greenery placements');
  });

  it('calls out a strong style and a weak style relative to the baseline', () => {
    const summary = buildStyleEffectivenessSummary({
      scoreEntries: [{ label: 'Card Points', value: 20 }],
      styleRows: [
        styleRow({
          averagePlacement: 1.5,
          gamesPlayed: 6,
          styleCode: 'board_control',
          winRate: 0.66,
        }),
        styleRow({
          averagePlacement: 2.8,
          gamesPlayed: 6,
          styleCode: 'engine_building',
          winRate: 0.1,
        }),
      ],
      subject: namedSubject('Fochizzy'),
    });

    expect(summary?.lead).toContain("Fochizzy's points come mostly from");
    expect(summary?.styles[0].sentence).toContain('real strength for Fochizzy');
    expect(summary?.styles[1].sentence).toContain('less effective for Fochizzy');
  });

  it('uses a group subject and guards small samples', () => {
    const summary = buildStyleEffectivenessSummary({
      scoreEntries: [{ label: 'Milestones', value: 10 }],
      styleRows: [
        styleRow({ gamesPlayed: 2, styleCode: 'milestone_aggression', winRate: 1 }),
      ],
      subject: { possessive: "this group's", subject: 'this group' },
    });

    expect(summary?.lead).toContain("This group's points come mostly from");
    expect(summary?.styles[0].sentence).toContain("sample's still small");
  });
});
