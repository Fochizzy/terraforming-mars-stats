import { describe, expect, it } from 'vitest';
import { normalizePlayerAlias } from './normalize-player-alias';
import { parseTerraformingMarsTileActions } from './parse-terraforming-mars-tile-actions';
import type { ImportPlayedEntityEvidence } from './parse-terraforming-mars-played-entities';
import { resolveOffReserveOceanEvidence } from './resolve-off-reserve-ocean-evidence';

const cards = [
  { cardNumber: '116', id: 'card-artificial-lake' },
  { cardNumber: 'Pf37', id: 'card-small-comet' },
  { cardNumber: 'UP09', id: 'card-central-reservoir' },
  { cardNumber: 'U015', id: 'card-subterranean-sea' },
  { cardNumber: '008', id: 'card-unrelated' },
];

function cardPlay(input: {
  canonicalId: string | null;
  lineNumber: number;
  player: string;
}): ImportPlayedEntityEvidence {
  return {
    candidateEntityIds: input.canonicalId ? [input.canonicalId] : [],
    canonicalId: input.canonicalId,
    canonicalName: 'Card',
    entityType: 'card',
    lineNumber: input.lineNumber,
    normalizedPlayerValue: normalizePlayerAlias(input.player),
    normalizedValue: 'card',
    originalLine: `${input.player} played Card`,
    originalPlayerValue: input.player,
    originalValue: 'Card',
    promoSetSlug: null,
    resolution: 'exact',
  };
}

const log = [
  'Generation 3', // 1
  'Alice played Artificial Lake', // 2
  'Alice placed ocean tile on row 4 position 2', // 3
  'Bob placed ocean tile at 07', // 4
  'Alice placed ocean tile at 09', // 5
].join('\n');
const tileActions = parseTerraformingMarsTileActions(log).actions;
const aliceFirstOcean = tileActions.find(
  (action) => action.actor === 'Alice' && action.lineNumber === 3,
);

describe('resolveOffReserveOceanEvidence', () => {
  it('links a qualifying card play to the subsequent ocean placement by the same actor', () => {
    const result = resolveOffReserveOceanEvidence({
      cards,
      playedEntityEvidence: [
        cardPlay({ canonicalId: 'card-artificial-lake', lineNumber: 2, player: 'Alice' }),
      ],
      tileActions,
    });

    expect(result.exceptionSpaceIds).toEqual([aliceFirstOcean?.spaceId]);
    expect(result.exceptions).toEqual([
      {
        cardId: 'card-artificial-lake',
        cardLineNumber: 2,
        normalizedActor: normalizePlayerAlias('Alice'),
        oceanLineNumber: 3,
        spaceId: aliceFirstOcean?.spaceId,
      },
    ]);
  });

  it('does not link an ocean placed by a different actor', () => {
    const result = resolveOffReserveOceanEvidence({
      cards,
      playedEntityEvidence: [
        // Carol plays the card but never places an ocean; Bob's ocean must not
        // be borrowed for Carol's card.
        cardPlay({ canonicalId: 'card-small-comet', lineNumber: 2, player: 'Carol' }),
      ],
      tileActions,
    });

    expect(result.exceptionSpaceIds).toEqual([]);
    expect(result.exceptions).toEqual([]);
  });

  it('ignores a card that is not a source-backed off-reserve ocean card', () => {
    const result = resolveOffReserveOceanEvidence({
      cards,
      playedEntityEvidence: [
        cardPlay({ canonicalId: 'card-unrelated', lineNumber: 2, player: 'Alice' }),
      ],
      tileActions,
    });

    expect(result.exceptions).toEqual([]);
  });

  it('claims each linked ocean at most once across multiple qualifying plays', () => {
    const result = resolveOffReserveOceanEvidence({
      cards,
      playedEntityEvidence: [
        cardPlay({ canonicalId: 'card-artificial-lake', lineNumber: 2, player: 'Alice' }),
        cardPlay({ canonicalId: 'card-central-reservoir', lineNumber: 2, player: 'Alice' }),
      ],
      tileActions,
    });

    // Alice placed two oceans (lines 3 and 5); each card claims a distinct one.
    expect(result.exceptions.map((exception) => exception.oceanLineNumber)).toEqual([
      3, 5,
    ]);
  });

  it('resolves nothing when the catalog has none of the source-backed cards', () => {
    const result = resolveOffReserveOceanEvidence({
      cards: [{ cardNumber: '008', id: 'card-unrelated' }],
      playedEntityEvidence: [
        cardPlay({ canonicalId: 'card-artificial-lake', lineNumber: 2, player: 'Alice' }),
      ],
      tileActions,
    });

    expect(result.exceptions).toEqual([]);
  });
});
