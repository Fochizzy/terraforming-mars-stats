import { describe, expect, it } from 'vitest';
import type { ScoreSourceKey } from '@/lib/assets';
import {
  ANALYTICS_SCORE_SOURCE_KEYS,
  ANALYTICS_SUBJECT_KINDS,
  analyticsSubjectKey,
  analyticsSubjectRefsEqual,
  isAnalyticsScoreSourceKey,
  isAnalyticsSubjectKind,
  validateAnalyticsSubjectRef,
  type AnalyticsScoreSourceKey,
  type AnalyticsSubjectRef,
  type LabeledAnalyticsSubject,
} from './subjects';

const oneRefPerKind: readonly AnalyticsSubjectRef[] = [
  { kind: 'player', playerId: 'player-uuid-1' },
  { kind: 'group', groupId: 'group-uuid-1' },
  { kind: 'game', gameId: 'game-uuid-1' },
  { kind: 'corporation', corporationId: 'corp-uuid-1' },
  { kind: 'prelude', preludeId: 'prelude-uuid-1' },
  {
    kind: 'corporation-prelude-pairing',
    corporationId: 'corp-uuid-1',
    preludeId: 'prelude-uuid-1',
  },
  { kind: 'card', cardId: 'card-uuid-1' },
  { kind: 'tag', tagCode: 'science' },
  { kind: 'score-source', scoreSourceKey: 'tr' },
  { kind: 'style', styleCode: 'engine_builder' },
  { kind: 'map', mapId: 'map-uuid-1' },
  { kind: 'milestone', milestoneId: 'milestone-uuid-1' },
  { kind: 'award', awardId: 'award-uuid-1' },
];

describe('analytics subject kinds', () => {
  it('registers exactly the thirteen evidence-backed kinds', () => {
    expect(ANALYTICS_SUBJECT_KINDS).toHaveLength(13);
    expect(new Set(ANALYTICS_SUBJECT_KINDS).size).toBe(13);
  });

  it('deliberately excludes kinds without stable repository identity', () => {
    const kinds = ANALYTICS_SUBJECT_KINDS as readonly string[];
    expect(kinds).not.toContain('lineup');
    expect(kinds).not.toContain('board-position');
    expect(kinds).not.toContain('opponent');
  });

  it('guards kind membership at runtime', () => {
    expect(isAnalyticsSubjectKind('player')).toBe(true);
    expect(isAnalyticsSubjectKind('corporation-prelude-pairing')).toBe(true);
    expect(isAnalyticsSubjectKind('lineup')).toBe(false);
    expect(isAnalyticsSubjectKind(42)).toBe(false);
    expect(isAnalyticsSubjectKind(null)).toBe(false);
  });
});

describe('analyticsSubjectKey', () => {
  it('produces a deterministic, kind-prefixed key for every kind', () => {
    const keys = oneRefPerKind.map(analyticsSubjectKey);
    expect(new Set(keys).size).toBe(oneRefPerKind.length);
    for (const [index, ref] of oneRefPerKind.entries()) {
      expect(keys[index]!.startsWith(`${ref.kind}:`)).toBe(true);
      expect(analyticsSubjectKey(ref)).toBe(keys[index]);
    }
  });

  it('keeps the same identifier distinct across kinds', () => {
    const asPlayer = analyticsSubjectKey({ kind: 'player', playerId: 'x-1' });
    const asGroup = analyticsSubjectKey({ kind: 'group', groupId: 'x-1' });
    expect(asPlayer).not.toBe(asGroup);
  });

  it('includes both identifiers for a corporation-Prelude pairing', () => {
    const key = analyticsSubjectKey({
      kind: 'corporation-prelude-pairing',
      corporationId: 'corp-a',
      preludeId: 'prelude-b',
    });
    expect(key).toContain('corp-a');
    expect(key).toContain('prelude-b');
    expect(key).not.toBe(
      analyticsSubjectKey({
        kind: 'corporation-prelude-pairing',
        corporationId: 'prelude-b',
        preludeId: 'corp-a',
      }),
    );
  });
});

describe('analyticsSubjectRefsEqual', () => {
  it('treats identical stable identity as equal', () => {
    expect(
      analyticsSubjectRefsEqual(
        { kind: 'corporation', corporationId: 'corp-1' },
        { kind: 'corporation', corporationId: 'corp-1' },
      ),
    ).toBe(true);
  });

  it('never uses display metadata as identity', () => {
    const first: LabeledAnalyticsSubject = {
      subject: { kind: 'corporation', corporationId: 'corp-1' },
      display: { label: 'Helion' },
    };
    const second: LabeledAnalyticsSubject = {
      subject: { kind: 'corporation', corporationId: 'corp-1' },
      display: { label: 'Renamed Helion', shortLabel: 'RH' },
    };
    expect(analyticsSubjectRefsEqual(first.subject, second.subject)).toBe(true);

    const differentIdentity: LabeledAnalyticsSubject = {
      subject: { kind: 'corporation', corporationId: 'corp-2' },
      display: { label: 'Helion' },
    };
    expect(
      analyticsSubjectRefsEqual(first.subject, differentIdentity.subject),
    ).toBe(false);
  });
});

describe('validateAnalyticsSubjectRef', () => {
  it('accepts every well-formed reference', () => {
    for (const ref of oneRefPerKind) {
      expect(validateAnalyticsSubjectRef(ref)).toEqual([]);
    }
  });

  it('rejects blank identifiers, including whitespace-only values', () => {
    const issues = validateAnalyticsSubjectRef({
      kind: 'player',
      playerId: '   ',
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: 'blank-identifier',
      field: 'playerId',
    });
  });

  it('reports each blank identifier of a pairing separately', () => {
    const issues = validateAnalyticsSubjectRef({
      kind: 'corporation-prelude-pairing',
      corporationId: '',
      preludeId: '',
    });
    expect(issues.map((issue) => issue.field).sort()).toEqual([
      'corporationId',
      'preludeId',
    ]);
  });

  it('rejects unregistered score-source keys defensively', () => {
    const issues = validateAnalyticsSubjectRef({
      kind: 'score-source',
      scoreSourceKey: 'megacredits' as AnalyticsScoreSourceKey,
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: 'unknown-score-source-key',
      field: 'scoreSourceKey',
    });
  });
});

describe('score-source key registry', () => {
  it('accepts all ten registered keys', () => {
    expect(ANALYTICS_SCORE_SOURCE_KEYS).toHaveLength(10);
    for (const key of ANALYTICS_SCORE_SOURCE_KEYS) {
      expect(isAnalyticsScoreSourceKey(key)).toBe(true);
      expect(
        validateAnalyticsSubjectRef({ kind: 'score-source', scoreSourceKey: key }),
      ).toEqual([]);
    }
    expect(isAnalyticsScoreSourceKey('megacredits')).toBe(false);
  });

  it('mirrors the Step 1.2 asset ScoreSourceKey vocabulary exactly', () => {
    // Compile-time contract: the two unions are mutually assignable. The
    // asset module exports no runtime key list, so equality is proven by the
    // type checker rather than a weak runtime comparison.
    const analyticsKeysAreAssetKeys: readonly ScoreSourceKey[] =
      ANALYTICS_SCORE_SOURCE_KEYS;
    const assetKeysAreAnalyticsKeys: readonly AnalyticsScoreSourceKey[] =
      [] as readonly ScoreSourceKey[];
    expect(analyticsKeysAreAssetKeys).toHaveLength(10);
    expect(assetKeysAreAnalyticsKeys).toHaveLength(0);
  });
});
