# Generic Board-Aware Card Scoring Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable board-aware scoring engine to the Terraforming Mars import flow so explicit repo rules can score supported board-dependent cards and board-derived awards from the exported log first and targeted screenshot confirmations second, while unresolved values stay reviewable and manual.

**Architecture:** Keep `build-import-board-snapshot.ts` as the log-first reconstruction of final occupied spaces, then layer a shared board-evidence context on top of that snapshot for adjacency, ownership, and screenshot-confirmation queries. Extend the main card-scoring pipeline with a board-aware rule mode so cards like `Commercial District`, `Capital`, and `Commercial Harbor` score through `calculateImportCardScores`, use a separate award consumer on the same board context, and stop adding board-card VP a second time in `buildImportDraft`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, React Testing Library, Sharp-based targeted board confirmation helpers, existing import parser, existing draft builder, existing import-review jump state

---

## Planned File Structure

- Create: `src/lib/imports/build-board-evidence-context.ts`
- Create: `src/lib/imports/build-board-evidence-context.test.ts`
- Create: `src/lib/imports/build-board-screenshot-confirmation-requests.ts`
- Create: `src/lib/imports/build-board-screenshot-confirmation-requests.test.ts`
- Create: `src/lib/imports/score-board-aware-award-items.ts`
- Create: `src/lib/imports/score-board-aware-award-items.test.ts`
- Create: `src/lib/imports/card-scoring/score-card-from-evidence.test.ts`
- Create: `src/features/imports/import-review-panel.test.tsx`
- Modify: `src/lib/imports/board-space-maps.ts`
- Modify: `src/lib/imports/board-space-maps.test.ts`
- Modify: `src/lib/imports/build-import-board-snapshot.ts`
- Modify: `src/lib/imports/card-scoring/card-scoring-types.ts`
- Modify: `src/lib/imports/card-scoring/curated-card-scoring-rules.ts`
- Modify: `src/lib/imports/card-scoring/score-card-from-evidence.ts`
- Modify: `src/lib/imports/card-scoring/calculate-import-card-scores.ts`
- Modify: `src/lib/imports/card-scoring/calculate-import-card-scores.test.ts`
- Modify: `src/app/(app)/log-game/import/page.tsx`
- Modify: `src/lib/imports/build-import-draft.ts`
- Modify: `src/lib/imports/build-import-draft.test.ts`
- Modify: `src/features/imports/import-card-scoring-panel.tsx`
- Modify: `src/features/imports/import-card-scoring-panel.test.tsx`
- Modify: `src/features/imports/import-review-panel.tsx`

## Delivery Strategy

Keep the migration narrow and staged:

1. build the shared board-evidence context first so cards and awards ask the same questions
2. extend the main card-scoring engine with one generic board-aware rule shape before wiring UI
3. wire targeted screenshot requests from pending board-aware cards and board-aware awards together
4. move board-card totals fully into `cardScoring` and stop adding them again in `buildImportDraft`
5. reuse the existing manual-fill jump path for unresolved board-aware cards instead of inventing a second review flow

This keeps the risky work in pure TypeScript tests first, delays UI churn, and prevents the final integration from double-counting board card VP.

### Task 1: Build The Shared Board Evidence Context

**Files:**
- Create: `src/lib/imports/build-board-evidence-context.ts`
- Create: `src/lib/imports/build-board-evidence-context.test.ts`
- Modify: `src/lib/imports/board-space-maps.ts`
- Modify: `src/lib/imports/board-space-maps.test.ts`
- Modify: `src/lib/imports/build-import-board-snapshot.ts`

- [ ] **Step 1: Write the failing tests for board evidence queries**

```ts
// src/lib/imports/build-board-evidence-context.test.ts
import { describe, expect, it } from 'vitest';
import { buildBoardEvidenceContext } from './build-board-evidence-context';

describe('buildBoardEvidenceContext', () => {
  it('resolves the tile placed by a played board-scoring card from the log-first snapshot', () => {
    const context = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '21': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Izzy',
            sourceCardName: 'Capital',
            sourceType: 'log_inferred',
            tileKind: 'city',
          },
        },
      },
    });

    expect(
      context.resolvePlacedTileByCard({
        cardName: 'Capital',
        playerName: 'Izzy',
      }),
    ).toEqual({
      notes: [],
      spaceId: '21',
      status: 'proved',
      tileKind: 'city',
    });
  });

  it('counts adjacent matching tiles from log evidence and requests only unresolved spaces', () => {
    const context = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '20': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Friday',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'ocean',
          },
          '21': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Izzy',
            sourceCardName: 'Capital',
            sourceType: 'log_inferred',
            tileKind: 'city',
          },
        },
      },
    });

    expect(
      context.countAdjacentMatchingTiles({
        spaceId: '21',
        tileKinds: ['ocean'],
      }),
    ).toEqual({
      count: 1,
      notes: ['Adjacent spaces 22, 29, 30 still need confirmation.'],
      requestedSpaceIds: ['22', '29', '30'],
      status: 'review_needed',
    });
  });

  it('uses screenshot confirmations to complete an adjacent query without changing the log-owned spaces', () => {
    const context = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '20': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Friday',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'ocean',
          },
          '21': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Izzy',
            sourceCardName: 'Capital',
            sourceType: 'log_inferred',
            tileKind: 'city',
          },
        },
      },
      screenshotConfirmations: {
        '22': { status: 'confirmed', tileKind: 'ocean' },
        '29': { status: 'confirmed', tileKind: 'empty' },
        '30': { status: 'confirmed', tileKind: 'occupied_other' },
      },
    });

    expect(
      context.countAdjacentMatchingTiles({
        spaceId: '21',
        tileKinds: ['ocean'],
      }),
    ).toEqual({
      count: 2,
      notes: ['Adjacent query for 21 was completed with targeted screenshot confirmation.'],
      requestedSpaceIds: [],
      status: 'proved',
    });
  });

  it('counts owned matching tiles for award consumers without changing milestone behavior', () => {
    const context = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'hellas',
        spaces: {
          '18': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Colette',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'greenery',
          },
          '19': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Colette',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'greenery',
          },
        },
      },
    });

    expect(
      context.countOwnedMatchingTiles({
        playerName: 'Colette',
        tileKinds: ['greenery'],
      }),
    ).toEqual({
      count: 2,
      notes: [],
      status: 'proved',
    });
  });
});
```

```ts
// src/lib/imports/board-space-maps.test.ts
import { describe, expect, it } from 'vitest';
import { getBoardSpaceMap } from './board-space-maps';

describe('getBoardSpaceMap', () => {
  it('exposes empty region registries for all three supported maps until a rule needs them', () => {
    expect(getBoardSpaceMap('tharsis').regions).toEqual({});
    expect(getBoardSpaceMap('hellas').regions).toEqual({});
    expect(getBoardSpaceMap('elysium').regions).toEqual({});
  });
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npx.cmd vitest run src/lib/imports/build-board-evidence-context.test.ts src/lib/imports/board-space-maps.test.ts`

Expected: `FAIL` because `build-board-evidence-context.ts` does not exist yet and `board-space-maps.ts` does not expose `regions`.

- [ ] **Step 3: Add the minimal board evidence context and map-region support**

```ts
// src/lib/imports/board-space-maps.ts
export type BoardSpaceMap = {
  mapId: SupportedBoardMapId;
  regions: Record<string, string[]>;
  spaces: BoardSpaceRegistry;
};

const boardSpaceMaps: Record<SupportedBoardMapId, BoardSpaceMap> = {
  tharsis: {
    mapId: 'tharsis',
    regions: {},
    spaces: createBoardSpaces('Noctis City'),
  },
  hellas: {
    mapId: 'hellas',
    regions: {},
    spaces: createBoardSpaces(),
  },
  elysium: {
    mapId: 'elysium',
    regions: {},
    spaces: createBoardSpaces(),
  },
};
```

```ts
// src/lib/imports/build-board-evidence-context.ts
import { getBoardSpaceMap, type SupportedBoardMapId } from './board-space-maps';
import type { ImportBoardSnapshot } from './build-import-board-snapshot';
import { normalizePlayerAlias } from './normalize-player-alias';
import type { BoardSpaceConfirmation } from './read-board-screenshot-space-confirmations';

type MatchingTileQuery = {
  count: number;
  notes: string[];
  requestedSpaceIds: string[];
  status: 'proved' | 'review_needed' | 'conflict';
};

type PlacedTileQuery =
  | {
      notes: string[];
      spaceId: string;
      status: 'proved';
      tileKind: string;
    }
  | {
      notes: string[];
      requestedSpaceIds: string[];
      status: 'review_needed' | 'conflict';
    };

function normalizeName(value: string) {
  return normalizePlayerAlias(value);
}

function isMatchingConfirmedTile(
  confirmation: BoardSpaceConfirmation,
  tileKinds: string[],
) {
  return (
    confirmation.status === 'confirmed' &&
    tileKinds.some((tileKind) => normalizeName(tileKind) === normalizeName(confirmation.tileKind))
  );
}

export function buildBoardEvidenceContext(input: {
  boardSnapshot: ImportBoardSnapshot;
  screenshotConfirmations?: Record<string, BoardSpaceConfirmation>;
}) {
  const map = getBoardSpaceMap(input.boardSnapshot.mapId);

  return {
    getSpacesInRegion(regionId: string) {
      return map.regions[regionId] ?? [];
    },
    resolvePlacedTileByCard(query: {
      cardName: string;
      playerName: string;
    }): PlacedTileQuery {
      const matches = Object.entries(input.boardSnapshot.spaces).filter(
        ([, occupant]) =>
          normalizeName(occupant.ownerPlayerName) === normalizeName(query.playerName) &&
          normalizeName(occupant.sourceCardName ?? '') === normalizeName(query.cardName),
      );

      if (matches.length !== 1) {
        return {
          notes: [`${query.cardName} could not be linked safely to a placed tile from the imported log.`],
          requestedSpaceIds: [],
          status: 'review_needed',
        };
      }

      const [spaceId, occupant] = matches[0]!;

      return {
        notes: [],
        spaceId,
        status: 'proved',
        tileKind: occupant.tileKind,
      };
    },
    countAdjacentMatchingTiles(query: {
      spaceId: string;
      tileKinds: string[];
    }): MatchingTileQuery {
      const definition = map.spaces[query.spaceId];

      if (!definition) {
        return {
          count: 0,
          notes: [`Space ${query.spaceId} is outside supported board coverage for ${input.boardSnapshot.mapId}.`],
          requestedSpaceIds: [],
          status: 'review_needed',
        };
      }

      const requestedSpaceIds: string[] = [];
      let count = 0;
      let usedScreenshotConfirmation = false;

      for (const neighborId of definition.neighbors) {
        const occupant = input.boardSnapshot.spaces[neighborId];

        if (
          occupant &&
          query.tileKinds.some((tileKind) => normalizeName(tileKind) === normalizeName(occupant.tileKind))
        ) {
          count += 1;
          continue;
        }

        if (occupant) {
          continue;
        }

        const confirmation = input.screenshotConfirmations?.[neighborId];

        if (!confirmation || confirmation.status === 'inconclusive' || confirmation.tileKind === 'unknown') {
          requestedSpaceIds.push(neighborId);
          continue;
        }

        if (confirmation.status === 'conflict') {
          return {
            count,
            notes: [`Adjacent spaces for ${query.spaceId} had conflicting screenshot evidence.`],
            requestedSpaceIds: [neighborId],
            status: 'conflict',
          };
        }

        if (isMatchingConfirmedTile(confirmation, query.tileKinds)) {
          count += 1;
        }

        usedScreenshotConfirmation = true;
      }

      if (requestedSpaceIds.length > 0) {
        return {
          count,
          notes: [`Adjacent spaces ${requestedSpaceIds.join(', ')} still need confirmation.`],
          requestedSpaceIds,
          status: 'review_needed',
        };
      }

      return {
        count,
        notes: usedScreenshotConfirmation
          ? [`Adjacent query for ${query.spaceId} was completed with targeted screenshot confirmation.`]
          : [],
        requestedSpaceIds: [],
        status: 'proved',
      };
    },
    countOwnedMatchingTiles(query: {
      playerName: string;
      tileKinds: string[];
    }) {
      const count = Object.values(input.boardSnapshot.spaces).filter(
        (occupant) =>
          normalizeName(occupant.ownerPlayerName) === normalizeName(query.playerName) &&
          query.tileKinds.some((tileKind) => normalizeName(tileKind) === normalizeName(occupant.tileKind)),
      ).length;

      return {
        count,
        notes: [],
        status: 'proved' as const,
      };
    },
    mapId: input.boardSnapshot.mapId as SupportedBoardMapId,
  };
}
```

- [ ] **Step 4: Re-run the focused tests and keep them green**

Run: `npx.cmd vitest run src/lib/imports/build-board-evidence-context.test.ts src/lib/imports/board-space-maps.test.ts`

Expected: `PASS`

- [ ] **Step 5: Commit the board evidence context**

```bash
git add src/lib/imports/board-space-maps.ts src/lib/imports/board-space-maps.test.ts src/lib/imports/build-board-evidence-context.ts src/lib/imports/build-board-evidence-context.test.ts
git commit -m "feat: add shared board evidence context"
```

### Task 2: Add Board-Aware Rules To The Main Card Scoring Engine

**Files:**
- Modify: `src/lib/imports/card-scoring/card-scoring-types.ts`
- Modify: `src/lib/imports/card-scoring/curated-card-scoring-rules.ts`
- Modify: `src/lib/imports/card-scoring/score-card-from-evidence.ts`
- Create: `src/lib/imports/card-scoring/score-card-from-evidence.test.ts`
- Modify: `src/lib/imports/card-scoring/calculate-import-card-scores.ts`
- Modify: `src/lib/imports/card-scoring/calculate-import-card-scores.test.ts`

- [ ] **Step 1: Write the failing tests for board-aware card scoring**

```ts
// src/lib/imports/card-scoring/score-card-from-evidence.test.ts
import { describe, expect, it } from 'vitest';
import { buildBoardEvidenceContext } from '@/lib/imports/build-board-evidence-context';
import { scoreCardFromEvidence } from './score-card-from-evidence';

describe('scoreCardFromEvidence', () => {
  it('scores Capital through the generic adjacent-tile-count-from-placed-tile rule', () => {
    const boardEvidenceContext = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '20': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Friday',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'ocean',
          },
          '21': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Izzy',
            sourceCardName: 'Capital',
            sourceType: 'log_inferred',
            tileKind: 'city',
          },
          '22': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Corey',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'ocean',
          },
        },
      },
    });

    expect(
      scoreCardFromEvidence({
        boardEvidenceContext,
        evidence: {
          boardStateTextLines: [],
          cardId: 'card-capital',
          cardName: 'Capital',
          playerName: 'Izzy',
          resourceCountsByType: {},
          selfTagCounts: {},
          selfTileCounts: { city: 1 },
          sourceTags: [],
        },
        rule: {
          adjacentTileKinds: ['ocean'],
          category: 'other',
          confidence: 1,
          humanSummary: '1 VP per adjacent ocean to the city tile placed by this card',
          mode: 'adjacent_tile_count_from_placed_tile',
          pointsPerSet: 1,
          setSize: 1,
          sourceType: 'curated',
        },
      }),
    ).toEqual({
      category: 'other',
      evidenceSummary: 'Capital at space 21 had 2 adjacent ocean tiles => 2 VP',
      points: 2,
      status: 'scored',
    });
  });

  it('returns review-needed with requested spaces when a board-aware rule still lacks confirmation', () => {
    const boardEvidenceContext = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '21': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Izzy',
            sourceCardName: 'Commercial Harbor',
            sourceType: 'log_inferred',
            tileKind: 'city',
          },
        },
      },
    });

    expect(
      scoreCardFromEvidence({
        boardEvidenceContext,
        evidence: {
          boardStateTextLines: [],
          cardId: 'card-harbor',
          cardName: 'Commercial Harbor',
          playerName: 'Izzy',
          resourceCountsByType: {},
          selfTagCounts: {},
          selfTileCounts: { city: 1 },
          sourceTags: [],
        },
        rule: {
          adjacentTileKinds: ['ocean'],
          category: 'other',
          confidence: 1,
          humanSummary: '1 VP per adjacent ocean to the city tile placed by this card',
          mode: 'adjacent_tile_count_from_placed_tile',
          pointsPerSet: 1,
          setSize: 1,
          sourceType: 'curated',
        },
      }),
    ).toEqual({
      reason: 'Commercial Harbor still needs board confirmation for spaces 20, 22, 29, 30.',
      requestedSpaceIds: ['20', '22', '29', '30'],
      reviewKind: 'board_evidence',
      status: 'review',
    });
  });
});
```

```ts
// src/lib/imports/card-scoring/calculate-import-card-scores.test.ts
it('keeps unresolved board-aware cards pending and includes requested space ids for the second pass', async () => {
  const result = await calculateImportCardScores({
    boardEvidenceContext: buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '21': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Friday Mars',
            sourceCardName: 'Commercial District',
            sourceType: 'log_inferred',
            tileKind: 'city',
          },
        },
      },
    }),
    cardReferences: [
      {
        cardName: 'Commercial District',
        cardNumber: '001',
        cardType: 'Project',
        expansionCode: 'base',
        fullImageUrl: 'https://example.com/commercial-district.png',
        id: 'card-commercial-district',
        imageUrl: 'https://example.com/commercial-district.png',
        promoSetSlug: null,
        requiredExpansionCodes: ['base'],
        sourceCardId: 'project:base:001',
        sourceTags: [],
        thumbnailUrl: 'https://example.com/commercial-district-thumb.png',
      },
    ],
    events: [
      {
        actor: 'Friday Mars',
        card: 'Commercial District',
        eventType: 'card_played',
        lineNumber: 1,
        rawLine: 'Friday Mars played Commercial District',
      },
      {
        actor: 'Friday Mars',
        eventType: 'tile_placed',
        lineNumber: 2,
        rawLine: 'Friday Mars placed city tile at 21',
        space: '21',
        tile: 'city',
      },
    ],
  });

  expect(result).toEqual([
    {
      autoScoredCards: [],
      pendingCards: [
        {
          cardId: 'card-commercial-district',
          cardName: 'Commercial District',
          reason: 'Commercial District still needs board confirmation for spaces 20, 22, 29, 30.',
          requestedSpaceIds: ['20', '22', '29', '30'],
          reviewKind: 'board_evidence',
        },
      ],
      playerName: 'Friday Mars',
      totals: {
        animals: 0,
        complete: false,
        jovian: 0,
        microbes: 0,
        other: 0,
        total: 0,
      },
    },
  ]);
});
```

- [ ] **Step 2: Run the focused card-scoring tests and verify they fail**

Run: `npx.cmd vitest run src/lib/imports/card-scoring/score-card-from-evidence.test.ts src/lib/imports/card-scoring/calculate-import-card-scores.test.ts`

Expected: `FAIL` because the card scoring rule types do not yet support a board-aware mode and `calculateImportCardScores` does not accept a board evidence context.

- [ ] **Step 3: Extend the rule types, curated rules, and scorer with one board-aware mode**

```ts
// src/lib/imports/card-scoring/card-scoring-types.ts
export type CardScoringRulePayload =
  | { mode: 'none' }
  | {
      adjacentTileKinds: string[];
      category: CardScoringCategory;
      mode: 'adjacent_tile_count_from_placed_tile';
      pointsPerSet: number;
      setSize: number;
    }
  | {
      category: CardScoringCategory;
      mode: 'resource_count';
      pointsPerSet: number;
      resourceType: string;
      scope: 'card';
      setSize: number;
    }
  | {
      category: CardScoringCategory;
      mode: 'tag_count';
      pointsPerSet: number;
      scope: 'self';
      setSize: number;
      tag: string;
    }
  | {
      category: CardScoringCategory;
      mode: 'tile_count';
      pointsPerSet: number;
      scope: 'self';
      setSize: number;
      tileType: string;
    };

export type ImportPendingCardScore = {
  cardId: string;
  cardName: string;
  reason: string;
  requestedSpaceIds?: string[];
  reviewKind?: 'board_evidence' | 'ocr_rule';
};
```

```ts
// src/lib/imports/card-scoring/curated-card-scoring-rules.ts
  [normalizePlayerAlias('Capital')]: {
    adjacentTileKinds: ['ocean'],
    category: 'other',
    confidence: 1,
    humanSummary: '1 VP per adjacent ocean to the city tile placed by this card',
    mode: 'adjacent_tile_count_from_placed_tile',
    pointsPerSet: 1,
    setSize: 1,
    sourceType: 'curated',
  },
  [normalizePlayerAlias('Commercial District')]: {
    adjacentTileKinds: ['city'],
    category: 'other',
    confidence: 1,
    humanSummary: '1 VP per adjacent city to the city tile placed by this card',
    mode: 'adjacent_tile_count_from_placed_tile',
    pointsPerSet: 1,
    setSize: 1,
    sourceType: 'curated',
  },
  [normalizePlayerAlias('Commercial Harbor')]: {
    adjacentTileKinds: ['ocean'],
    category: 'other',
    confidence: 1,
    humanSummary: '1 VP per adjacent ocean to the city tile placed by this card',
    mode: 'adjacent_tile_count_from_placed_tile',
    pointsPerSet: 1,
    setSize: 1,
    sourceType: 'curated',
  },
```

```ts
// src/lib/imports/card-scoring/score-card-from-evidence.ts
import type { BoardEvidenceContext } from '@/lib/imports/build-board-evidence-context';

export function scoreCardFromEvidence(input: {
  boardEvidenceContext?: BoardEvidenceContext;
  evidence: CardScoreEvidence;
  rule: ResolvedCardScoringRule;
}) {
  switch (input.rule.mode) {
    case 'adjacent_tile_count_from_placed_tile': {
      const context = input.boardEvidenceContext;

      if (!context) {
        return {
          reason: `${input.evidence.cardName} needs board evidence before it can be scored.`,
          requestedSpaceIds: [],
          reviewKind: 'board_evidence' as const,
          status: 'review' as const,
        };
      }

      const placedTile = context.resolvePlacedTileByCard({
        cardName: input.evidence.cardName,
        playerName: input.evidence.playerName,
      });

      if (placedTile.status !== 'proved') {
        return {
          reason: placedTile.notes[0] ?? `${input.evidence.cardName} could not be linked to its scoring tile.`,
          requestedSpaceIds: placedTile.requestedSpaceIds,
          reviewKind: 'board_evidence' as const,
          status: 'review' as const,
        };
      }

      const adjacent = context.countAdjacentMatchingTiles({
        spaceId: placedTile.spaceId,
        tileKinds: input.rule.adjacentTileKinds,
      });

      if (adjacent.status !== 'proved') {
        return {
          reason:
            adjacent.notes[0] ??
            `${input.evidence.cardName} still needs board confirmation for spaces ${adjacent.requestedSpaceIds.join(', ')}.`,
          requestedSpaceIds: adjacent.requestedSpaceIds,
          reviewKind: 'board_evidence' as const,
          status: 'review' as const,
        };
      }

      const scored = scoreBySets({
        itemCount: adjacent.count,
        itemLabel: `${input.rule.adjacentTileKinds.join('/')} tiles`,
        pointsPerSet: input.rule.pointsPerSet,
        setSize: input.rule.setSize,
      });

      return {
        category: input.rule.category,
        evidenceSummary: `${input.evidence.cardName} at space ${placedTile.spaceId} had ${adjacent.count} adjacent ${input.rule.adjacentTileKinds.join('/')} tiles => ${scored.points} VP`,
        points: scored.points,
        status: 'scored' as const,
      };
    }
```

```ts
// src/lib/imports/card-scoring/calculate-import-card-scores.ts
import type { BoardEvidenceContext } from '@/lib/imports/build-board-evidence-context';

export async function calculateImportCardScores(input: {
  boardEvidenceContext?: BoardEvidenceContext;
  boardStateTextLines?: string[];
  cardReferences: CardScoringReference[];
  events: ParsedGameLog['events'];
  ocrTextLinesByCardId?: Record<string, string[]>;
}) {
  // unchanged setup above

  const scoredCard = scoreCardFromEvidence({
    boardEvidenceContext: input.boardEvidenceContext,
    evidence,
    rule: resolution.rule,
  });

  if (scoredCard.status === 'review') {
    playerSummary.pendingCards.push({
      cardId: card.id,
      cardName: card.cardName,
      reason: scoredCard.reason,
      requestedSpaceIds: scoredCard.requestedSpaceIds,
      reviewKind: scoredCard.reviewKind,
    });
    playerSummary.totals.complete = false;
    summariesByPlayerName.set(evidence.playerName, playerSummary);
    continue;
  }
```

- [ ] **Step 4: Re-run the focused card-scoring tests and keep them green**

Run: `npx.cmd vitest run src/lib/imports/card-scoring/score-card-from-evidence.test.ts src/lib/imports/card-scoring/calculate-import-card-scores.test.ts`

Expected: `PASS`

- [ ] **Step 5: Commit the board-aware card-scoring engine slice**

```bash
git add src/lib/imports/card-scoring/card-scoring-types.ts src/lib/imports/card-scoring/curated-card-scoring-rules.ts src/lib/imports/card-scoring/score-card-from-evidence.ts src/lib/imports/card-scoring/score-card-from-evidence.test.ts src/lib/imports/card-scoring/calculate-import-card-scores.ts src/lib/imports/card-scoring/calculate-import-card-scores.test.ts
git commit -m "feat: add board-aware rules to import card scoring"
```

### Task 3: Wire Two-Pass Screenshot Requests And Shared Award Consumers

**Files:**
- Create: `src/lib/imports/build-board-screenshot-confirmation-requests.ts`
- Create: `src/lib/imports/build-board-screenshot-confirmation-requests.test.ts`
- Create: `src/lib/imports/score-board-aware-award-items.ts`
- Create: `src/lib/imports/score-board-aware-award-items.test.ts`
- Modify: `src/app/(app)/log-game/import/page.tsx`

- [ ] **Step 1: Write the failing tests for request collection and award scoring**

```ts
// src/lib/imports/build-board-screenshot-confirmation-requests.test.ts
import { describe, expect, it } from 'vitest';
import { buildBoardScreenshotConfirmationRequests } from './build-board-screenshot-confirmation-requests';

describe('buildBoardScreenshotConfirmationRequests', () => {
  it('deduplicates unresolved space requests from board-aware cards and awards', () => {
    expect(
      buildBoardScreenshotConfirmationRequests({
        awardItems: [
          {
            awardName: 'Landlord',
            fundedByPlayerName: 'Friday',
            itemType: 'award',
            mapId: 'tharsis',
            notes: ['Landlord still needs targeted ocean confirmation.'],
            requestedSpaceIds: ['20', '22'],
            sourceType: 'log_and_board',
            status: 'review_needed',
          },
        ],
        cardScoring: [
          {
            autoScoredCards: [],
            pendingCards: [
              {
                cardId: 'card-1',
                cardName: 'Capital',
                reason: 'Capital still needs board confirmation for spaces 22, 29.',
                requestedSpaceIds: ['22', '29'],
                reviewKind: 'board_evidence',
              },
            ],
            playerName: 'Izzy',
            totals: {
              animals: 0,
              complete: false,
              jovian: 0,
              microbes: 0,
              other: 0,
              total: 0,
            },
          },
        ],
      }),
    ).toEqual([{ spaceId: '20' }, { spaceId: '22' }, { spaceId: '29' }]);
  });
});
```

```ts
// src/lib/imports/score-board-aware-award-items.test.ts
import { describe, expect, it } from 'vitest';
import { buildBoardEvidenceContext } from './build-board-evidence-context';
import { scoreBoardAwareAwardItems } from './score-board-aware-award-items';

describe('scoreBoardAwareAwardItems', () => {
  it('uses the shared board evidence context for Cultivator when explicit award results are absent', () => {
    const boardEvidenceContext = buildBoardEvidenceContext({
      boardSnapshot: {
        mapId: 'hellas',
        spaces: {
          '18': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Colette',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'greenery',
          },
          '19': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Colette',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'greenery',
          },
          '20': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Corey',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'greenery',
          },
        },
      },
    });

    expect(
      scoreBoardAwareAwardItems({
        boardEvidenceContext,
        events: [
          {
            actor: 'Friday',
            award: 'Cultivator',
            eventType: 'award_funded',
            lineNumber: 1,
            rawLine: 'Friday funded Cultivator award',
          },
        ],
        mapId: 'hellas',
        participantNames: ['Colette', 'Corey', 'Friday'],
      }),
    ).toContainEqual(
      expect.objectContaining({
        awardName: 'Cultivator',
        firstPlacePlayerNames: ['Colette'],
        secondPlacePlayerNames: ['Corey'],
        status: 'proved',
      }),
    );
  });

  it('keeps explicit award results authoritative even when a board-derived rule exists', () => {
    const boardEvidenceContext = buildBoardEvidenceContext({
      boardSnapshot: { mapId: 'hellas', spaces: {} },
    });

    expect(
      scoreBoardAwareAwardItems({
        boardEvidenceContext,
        events: [
          {
            actor: 'Friday',
            award: 'Cultivator',
            eventType: 'award_funded',
            lineNumber: 1,
            rawLine: 'Friday funded Cultivator award',
          },
          {
            actor: 'Corey',
            award: 'Cultivator',
            eventType: 'award_result',
            lineNumber: 2,
            placement: 'first',
            rawLine: 'Corey won first place on Cultivator award',
          },
        ],
        mapId: 'hellas',
        participantNames: ['Corey', 'Friday'],
      }),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the focused request and award tests and verify they fail**

Run: `npx.cmd vitest run src/lib/imports/build-board-screenshot-confirmation-requests.test.ts src/lib/imports/score-board-aware-award-items.test.ts`

Expected: `FAIL` because neither helper exists yet.

- [ ] **Step 3: Add the request collector, award scorer, and page-level two-pass wiring**

```ts
// src/lib/imports/build-board-screenshot-confirmation-requests.ts
import type { ImportPlayerCardScoringSummary } from './card-scoring/card-scoring-types';
import type { CuratedBoardAwardImportItem } from './score-board-aware-award-items';

export function buildBoardScreenshotConfirmationRequests(input: {
  awardItems: CuratedBoardAwardImportItem[];
  cardScoring: ImportPlayerCardScoringSummary[];
}) {
  const seen = new Set<string>();
  const ordered: Array<{ spaceId: string }> = [];

  for (const summary of input.cardScoring) {
    for (const card of summary.pendingCards) {
      for (const spaceId of card.requestedSpaceIds ?? []) {
        if (!seen.has(spaceId)) {
          seen.add(spaceId);
          ordered.push({ spaceId });
        }
      }
    }
  }

  for (const item of input.awardItems) {
    for (const spaceId of item.requestedSpaceIds ?? []) {
      if (!seen.has(spaceId)) {
        seen.add(spaceId);
        ordered.push({ spaceId });
      }
    }
  }

  return ordered;
}
```

```ts
// src/lib/imports/score-board-aware-award-items.ts
import type { BoardEvidenceContext } from './build-board-evidence-context';
import { normalizePlayerAlias } from './normalize-player-alias';
import type { ParsedActionGameLogEvent } from './parse-game-log';
import type { SupportedBoardMapId } from './board-space-maps';

export type CuratedBoardAwardImportItem = {
  awardName: string;
  firstPlacePlayerNames?: string[];
  fundedByPlayerName: string;
  itemType: 'award';
  mapId: SupportedBoardMapId;
  notes: string[];
  requestedSpaceIds?: string[];
  secondPlacePlayerNames?: string[];
  sourceType: 'log' | 'log_and_board';
  status: 'proved' | 'review_needed';
};

export function scoreBoardAwareAwardItems(input: {
  boardEvidenceContext: BoardEvidenceContext;
  events: ParsedActionGameLogEvent[];
  mapId: SupportedBoardMapId;
  participantNames?: string[];
}) {
  // Keep explicit award_result precedence first.
  // For Hellas Cultivator, use boardEvidenceContext.countOwnedMatchingTiles(...)
  // For Tharsis Landlord and Elysium Desert Settler / Estate Dealer, keep review-needed notes.
}
```

```ts
// src/app/(app)/log-game/import/page.tsx
import { buildBoardEvidenceContext } from '@/lib/imports/build-board-evidence-context';
import { buildBoardScreenshotConfirmationRequests } from '@/lib/imports/build-board-screenshot-confirmation-requests';
import { scoreBoardAwareAwardItems } from '@/lib/imports/score-board-aware-award-items';

const initialBoardEvidenceContext =
  boardSnapshot == null
    ? null
    : buildBoardEvidenceContext({
        boardSnapshot,
      });

const initialCardScoring =
  initialBoardEvidenceContext == null
    ? []
    : await calculateImportCardScores({
        boardEvidenceContext: initialBoardEvidenceContext,
        boardStateTextLines,
        cardReferences: await listCardScoringReferences(),
        events: parsedGameLog.events,
      });

const initialAwardItems =
  initialBoardEvidenceContext == null
    ? []
    : scoreBoardAwareAwardItems({
        boardEvidenceContext: initialBoardEvidenceContext,
        events: parsedGameLog.events,
        mapId: boardSnapshot.mapId,
        participantNames: detectedParticipantNames,
      });

const boardScreenshotConfirmationRequests = buildBoardScreenshotConfirmationRequests({
  awardItems: initialAwardItems,
  cardScoring: initialCardScoring,
});

const finalBoardEvidenceContext =
  boardSnapshot == null
    ? null
    : buildBoardEvidenceContext({
        boardSnapshot,
        screenshotConfirmations: boardScreenshotConfirmations,
      });
```

- [ ] **Step 4: Re-run the focused request and award tests and keep them green**

Run: `npx.cmd vitest run src/lib/imports/build-board-screenshot-confirmation-requests.test.ts src/lib/imports/score-board-aware-award-items.test.ts`

Expected: `PASS`

- [ ] **Step 5: Commit the shared second-pass request and award wiring**

```bash
git add src/lib/imports/build-board-screenshot-confirmation-requests.ts src/lib/imports/build-board-screenshot-confirmation-requests.test.ts src/lib/imports/score-board-aware-award-items.ts src/lib/imports/score-board-aware-award-items.test.ts src/app/(app)/log-game/import/page.tsx
git commit -m "feat: share board screenshot requests across cards and awards"
```

### Task 4: Stop Double Counting And Reuse The Manual-Fill Review Path

**Files:**
- Modify: `src/lib/imports/build-import-draft.ts`
- Modify: `src/lib/imports/build-import-draft.test.ts`
- Modify: `src/features/imports/import-card-scoring-panel.tsx`
- Modify: `src/features/imports/import-card-scoring-panel.test.tsx`
- Modify: `src/features/imports/import-review-panel.tsx`
- Create: `src/features/imports/import-review-panel.test.tsx`

- [ ] **Step 1: Write the failing tests for no-double-count draft merges and manual-fill review buttons**

```ts
// src/lib/imports/build-import-draft.test.ts
it('uses board-aware card scoring totals directly and does not add proved board card points a second time', () => {
  expect(
    buildImportDraft({
      cardScoring: [
        {
          autoScoredCards: [
            {
              cardId: 'card-capital',
              cardName: 'Capital',
              category: 'other',
              evidenceSummary: 'Capital at space 21 had 2 adjacent ocean tiles => 2 VP',
              humanSummary: '1 VP per adjacent ocean to the city tile placed by this card',
              points: 2,
              sourceType: 'curated',
            },
          ],
          pendingCards: [],
          playerName: 'Friday Mars',
          totals: {
            animals: 3,
            complete: true,
            jovian: 0,
            microbes: 0,
            other: 2,
            total: 5,
          },
        },
      ],
      curatedBoardItems: [
        {
          awardName: 'Cultivator',
          firstPlacePlayerNames: ['Friday Mars'],
          fundedByPlayerName: 'Second Seat',
          itemType: 'award',
          mapId: 'hellas',
          notes: ['Greenery placements from the board evidence context proved the ranking.'],
          secondPlacePlayerNames: [],
          sourceType: 'log_and_board',
          status: 'proved',
        },
      ],
      defaultExpansionCodes: ['base'],
      defaultPromoSetSlugs: [],
      groupId: '11111111-1111-4111-8111-111111111111',
      importValues: {
        endgameScreenshotName: null,
        exportedGameLog: 'Imported score breakdown rows.',
        generationCount: 12,
        mapId: 'hellas',
        participantNames: ['Friday Mars', 'Second Seat'],
        playedOn: '2026-07-06',
        playerCount: 2,
      },
      playerSelections: [
        { importedName: 'Friday Mars', playerId: 'player-1' },
        { importedName: 'Second Seat', playerId: 'player-2' },
      ],
      selectedPlayerIds: ['player-1', 'player-2'],
      awardOptions: [{ awardId: 'award-1', awardName: 'Cultivator', mapId: 'hellas' }],
    }).playerScores,
  ).toMatchObject({
    'player-1': {
      awardPoints: 5,
      cardPointsTotal: 5,
    },
  });
});
```

```tsx
// src/features/imports/import-review-panel.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportReviewPanel } from './import-review-panel';

describe('ImportReviewPanel', () => {
  it('lets unresolved board-aware pending cards reuse the manual-fill jump flow', () => {
    const onSelectManualReviewJumpTarget = vi.fn();

    render(
      <ImportReviewPanel
        onSelectionChange={() => {}}
        onSelectManualReviewJumpTarget={onSelectManualReviewJumpTarget}
        playerSelections={{}}
        review={{
          boardReviewItems: [],
          cardScoring: [
            {
              autoScoredCards: [],
              pendingCards: [
                {
                  cardId: 'card-capital',
                  cardName: 'Capital',
                  reason: 'Capital still needs board confirmation for spaces 22, 29.',
                  requestedSpaceIds: ['22', '29'],
                  reviewKind: 'board_evidence',
                },
              ],
              playerName: 'Friday Mars',
              totals: {
                animals: 0,
                complete: false,
                jovian: 0,
                microbes: 0,
                other: 0,
                total: 0,
              },
            },
          ],
          detectedParticipantNames: ['Friday Mars'],
          drawInfoLineCount: 0,
          ignoredLineCount: 0,
          parsedEventCount: 2,
          playerLinks: [],
          requiresPlayerConfirmation: false,
          scoreCandidates: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /fill manually capital for friday mars/i }));

    expect(onSelectManualReviewJumpTarget).toHaveBeenCalledWith({
      itemLabel: 'Capital',
      message: 'Capital still needs board confirmation for spaces 22, 29.',
      playerName: 'Friday Mars',
      scoreField: 'cardPointsTotal',
    });
  });
});
```

- [ ] **Step 2: Run the draft and review tests and verify they fail**

Run: `npx.cmd vitest run src/lib/imports/build-import-draft.test.ts src/features/imports/import-card-scoring-panel.test.tsx src/features/imports/import-review-panel.test.tsx`

Expected: `FAIL` because `buildImportDraft` still adds proved curated board card points on top of `cardScoring.totals.total` and the card-scoring review UI does not yet expose manual-fill buttons for board-evidence pending cards.

- [ ] **Step 3: Remove the double count and expose manual-fill for board-aware pending cards**

```ts
// src/lib/imports/build-import-draft.ts
// Remove expectedCuratedBoardCardPointsByPlayerId entirely.
const completeCalculatedCardPointsTotal =
  cardScoringSummary?.totals.complete
    ? cardScoringSummary.totals.total
    : undefined;

const mergedScore = {
  // existing fields above
  cardPointsTotal:
    logScore.cardPointsTotal ??
    scoreCandidate?.cardPointsTotal ??
    completeCalculatedCardPointsTotal,
  // existing fields below
};
```

```tsx
// src/features/imports/import-card-scoring-panel.tsx
import type { ImportReviewJumpTarget } from '@/lib/imports/import-review-jump-state';

type ImportCardScoringPanelProps = {
  onSelectManualReviewJumpTarget?: (target: ImportReviewJumpTarget) => void;
  selectedManualReviewJumpTarget?: ImportReviewJumpTarget | null;
  summaries: ImportPlayerCardScoringSummary[];
};

function buildPendingCardJumpTarget(input: {
  cardName: string;
  playerName: string;
  reason: string;
  reviewKind?: 'board_evidence' | 'ocr_rule';
}): ImportReviewJumpTarget | null {
  if (input.reviewKind !== 'board_evidence') {
    return null;
  }

  return {
    itemLabel: input.cardName,
    message: input.reason,
    playerName: input.playerName,
    scoreField: 'cardPointsTotal',
  };
}
```

```tsx
// src/features/imports/import-review-panel.tsx
<ImportCardScoringPanel
  onSelectManualReviewJumpTarget={onSelectManualReviewJumpTarget}
  selectedManualReviewJumpTarget={selectedManualReviewJumpTarget}
  summaries={cardScoring}
/>
```

- [ ] **Step 4: Re-run the draft and review tests and keep them green**

Run: `npx.cmd vitest run src/lib/imports/build-import-draft.test.ts src/features/imports/import-card-scoring-panel.test.tsx src/features/imports/import-review-panel.test.tsx`

Expected: `PASS`

- [ ] **Step 5: Commit the draft merge and manual-review integration**

```bash
git add src/lib/imports/build-import-draft.ts src/lib/imports/build-import-draft.test.ts src/features/imports/import-card-scoring-panel.tsx src/features/imports/import-card-scoring-panel.test.tsx src/features/imports/import-review-panel.tsx src/features/imports/import-review-panel.test.tsx
git commit -m "feat: reuse manual fill for board-aware card review"
```

### Task 5: Run The Full Focused Verification For The Generic Engine Migration

**Files:**
- Modify: only the files touched in Tasks 1 through 4

- [ ] **Step 1: Run the focused board-aware import suite**

Run:

```bash
npx.cmd vitest run src/lib/imports/board-space-maps.test.ts src/lib/imports/build-import-board-snapshot.test.ts src/lib/imports/build-board-evidence-context.test.ts src/lib/imports/build-board-screenshot-confirmation-requests.test.ts src/lib/imports/read-board-screenshot-space-confirmations.test.ts src/lib/imports/score-board-aware-award-items.test.ts src/lib/imports/card-scoring/score-card-from-evidence.test.ts src/lib/imports/card-scoring/calculate-import-card-scores.test.ts src/lib/imports/build-import-draft.test.ts src/features/imports/import-card-scoring-panel.test.tsx src/features/imports/import-review-panel.test.tsx src/features/imports/log-game-import-shell.test.tsx src/features/games/log-game/log-game-wizard.test.tsx
```

Expected: `PASS`

- [ ] **Step 2: Run the TypeScript verification**

Run: `npx.cmd tsc --noEmit --pretty false`

Expected: no output and exit code `0`

- [ ] **Step 3: Run diff hygiene on the touched files**

Run:

```bash
git diff --check -- src/lib/imports/board-space-maps.ts src/lib/imports/board-space-maps.test.ts src/lib/imports/build-board-evidence-context.ts src/lib/imports/build-board-evidence-context.test.ts src/lib/imports/build-board-screenshot-confirmation-requests.ts src/lib/imports/build-board-screenshot-confirmation-requests.test.ts src/lib/imports/score-board-aware-award-items.ts src/lib/imports/score-board-aware-award-items.test.ts src/lib/imports/card-scoring/card-scoring-types.ts src/lib/imports/card-scoring/curated-card-scoring-rules.ts src/lib/imports/card-scoring/score-card-from-evidence.ts src/lib/imports/card-scoring/score-card-from-evidence.test.ts src/lib/imports/card-scoring/calculate-import-card-scores.ts src/lib/imports/card-scoring/calculate-import-card-scores.test.ts src/app/(app)/log-game/import/page.tsx src/lib/imports/build-import-draft.ts src/lib/imports/build-import-draft.test.ts src/features/imports/import-card-scoring-panel.tsx src/features/imports/import-card-scoring-panel.test.tsx src/features/imports/import-review-panel.tsx src/features/imports/import-review-panel.test.tsx
```

Expected: no whitespace errors

- [ ] **Step 4: Commit the verification pass if the branch is otherwise ready**

```bash
git add src/lib/imports/board-space-maps.ts src/lib/imports/board-space-maps.test.ts src/lib/imports/build-board-evidence-context.ts src/lib/imports/build-board-evidence-context.test.ts src/lib/imports/build-board-screenshot-confirmation-requests.ts src/lib/imports/build-board-screenshot-confirmation-requests.test.ts src/lib/imports/score-board-aware-award-items.ts src/lib/imports/score-board-aware-award-items.test.ts src/lib/imports/card-scoring/card-scoring-types.ts src/lib/imports/card-scoring/curated-card-scoring-rules.ts src/lib/imports/card-scoring/score-card-from-evidence.ts src/lib/imports/card-scoring/score-card-from-evidence.test.ts src/lib/imports/card-scoring/calculate-import-card-scores.ts src/lib/imports/card-scoring/calculate-import-card-scores.test.ts src/app/(app)/log-game/import/page.tsx src/lib/imports/build-import-draft.ts src/lib/imports/build-import-draft.test.ts src/features/imports/import-card-scoring-panel.tsx src/features/imports/import-card-scoring-panel.test.tsx src/features/imports/import-review-panel.tsx src/features/imports/import-review-panel.test.tsx
git commit -m "feat: add generic board-aware import scoring engine"
```

## Self-Review

1. **Spec coverage:** The plan covers the shared board evidence context, generic board-aware card rule mode, two-pass targeted screenshot confirmation, award consumers on the same context, no-double-count draft merge, manual-fill jump reuse, and the explicit constraint that milestones remain log-authoritative.
2. **Placeholder scan:** No `TODO`, `TBD`, "implement later", or "similar to Task N" shortcuts remain in this plan.
3. **Type consistency:** The same names are used throughout the plan for `buildBoardEvidenceContext`, `buildBoardScreenshotConfirmationRequests`, `scoreBoardAwareAwardItems`, `adjacent_tile_count_from_placed_tile`, `requestedSpaceIds`, and `reviewKind: 'board_evidence'`.
