# Curated Board Evidence Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a log-first, curated-only board-evidence import path that can prove supported board-dependent cards and map-specific placement outcomes, prefill only proven values, and guide the user to unresolved manual work with an in-app jump and highlight.

**Architecture:** Build on the existing `/log-game/import` analyze-and-confirm flow instead of creating a separate board parser. Add a small Tharsis space metadata module plus a board snapshot builder from parsed log events, then layer curated board rules and targeted screenshot confirmation on top of that snapshot. Feed the resulting proved or unresolved items into `buildImportReviewModel`, merge only fully proved values into `buildImportDraft`, and carry unresolved follow-up into `/log-game?gameId=...` through local transient state rather than URL parameters.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, React Testing Library, existing import parser and draft builders, browser `sessionStorage`, Sharp-based image helpers where already present

---

## Planned File Structure

- Create: `src/lib/imports/board-space-maps.ts`
- Create: `src/lib/imports/board-space-maps.test.ts`
- Create: `src/lib/imports/build-import-board-snapshot.ts`
- Create: `src/lib/imports/build-import-board-snapshot.test.ts`
- Create: `src/lib/imports/read-board-screenshot-space-confirmations.ts`
- Create: `src/lib/imports/read-board-screenshot-space-confirmations.test.ts`
- Create: `src/lib/imports/score-curated-board-import-items.ts`
- Create: `src/lib/imports/score-curated-board-import-items.test.ts`
- Modify: `src/lib/imports/build-import-review-model.ts`
- Modify: `src/lib/imports/build-import-review-model.test.ts`
- Modify: `src/lib/imports/build-import-draft.ts`
- Modify: `src/lib/imports/build-import-draft.test.ts`
- Create: `src/lib/imports/import-review-jump-state.ts`
- Create: `src/lib/imports/import-review-jump-state.test.ts`
- Modify: `src/app/(app)/log-game/import/page.tsx`
- Modify: `src/features/imports/import-review-panel.tsx`
- Modify: `src/features/imports/web-import-page.tsx`
- Modify: `src/features/imports/web-import-page.test.tsx`
- Modify: `src/features/imports/log-game-import-shell.tsx`
- Modify: `src/features/imports/log-game-import-shell.test.tsx`
- Modify: `src/features/games/log-game/log-game-wizard.tsx`
- Modify: `src/features/games/log-game/log-game-wizard.test.tsx`
- Modify: `src/features/games/log-game/scores-step.tsx`

## Delivery Strategy

Keep the first slice narrow and deterministic:

1. add the tiny board map metadata and board snapshot builder first
2. prove curated board rules against the reconstructed snapshot before touching UI
3. add screenshot confirmation only for targeted spaces and adjacency gaps
4. thread board review items into the existing import review and draft builders
5. add the `Fill manually` jump and transient highlight last, once unresolved items already exist

This keeps the risky work in pure TypeScript tests first and leaves the UI steps for the end.

### Task 1: Build Tharsis Space Metadata And Log-First Board Snapshot

**Files:**
- Create: `src/lib/imports/board-space-maps.ts`
- Create: `src/lib/imports/board-space-maps.test.ts`
- Create: `src/lib/imports/build-import-board-snapshot.ts`
- Create: `src/lib/imports/build-import-board-snapshot.test.ts`
- Modify: `src/app/(app)/log-game/import/page.tsx`

- [ ] **Step 1: Write the failing tests for Tharsis space metadata and log-first board reconstruction**

```ts
// src/lib/imports/board-space-maps.test.ts
import { describe, expect, it } from 'vitest';
import { getBoardSpaceMap } from './board-space-maps';

describe('getBoardSpaceMap', () => {
  it('returns Tharsis space metadata for supported adjacency queries', () => {
    const tharsis = getBoardSpaceMap('tharsis');

    expect(tharsis.mapId).toBe('tharsis');
    expect(tharsis.spaces['21']).toMatchObject({
      id: '21',
      neighbors: expect.any(Array),
    });
    expect(tharsis.spaces['31']).toMatchObject({
      id: '31',
      reservedTile: 'Noctis City',
    });
  });
});
```

```ts
// src/lib/imports/build-import-board-snapshot.test.ts
import { describe, expect, it } from 'vitest';
import { buildImportBoardSnapshot } from './build-import-board-snapshot';

describe('buildImportBoardSnapshot', () => {
  it('reconstructs occupied spaces from parsed tile placements and links named tiles safely', () => {
    const snapshot = buildImportBoardSnapshot({
      events: [
        {
          actor: 'Izzy',
          card: 'Mining Area',
          eventType: 'card_played',
          lineNumber: 64,
          rawLine: 'Izzy played Mining Area',
        },
        {
          actor: 'Izzy',
          eventType: 'tile_placed',
          lineNumber: 66,
          rawLine: 'Izzy placed Mining Area tile at 21',
          space: '21',
          tile: 'Mining Area',
        },
        {
          actor: 'Colette',
          eventType: 'tile_placed',
          lineNumber: 730,
          rawLine: 'Colette placed city tile at 31',
          space: '31',
          tile: 'city',
        },
      ],
      mapId: 'tharsis',
    });

    expect(snapshot.spaces['21']).toMatchObject({
      ownerPlayerName: 'Izzy',
      sourceCardName: 'Mining Area',
      sourceType: 'log_explicit',
      tileKind: 'Mining Area',
    });
    expect(snapshot.spaces['31']).toMatchObject({
      ownerPlayerName: 'Colette',
      tileKind: 'city',
    });
  });

  it('leaves sourceCardName unresolved when a generic placement cannot be linked safely', () => {
    const snapshot = buildImportBoardSnapshot({
      events: [
        {
          actor: 'Corey',
          card: 'City Parks',
          eventType: 'card_played',
          lineNumber: 854,
          rawLine: 'Corey played City Parks',
        },
        {
          actor: 'Corey',
          eventType: 'tile_placed',
          lineNumber: 834,
          rawLine: 'Corey placed city tile at 19',
          space: '19',
          tile: 'city',
        },
      ],
      mapId: 'tharsis',
    });

    expect(snapshot.spaces['19']).toMatchObject({
      ownerPlayerName: 'Corey',
      sourceCardName: null,
      tileKind: 'city',
    });
  });
});
```

- [ ] **Step 2: Run the focused tests and verify they fail for missing modules**

Run: `npx.cmd vitest run src/lib/imports/board-space-maps.test.ts src/lib/imports/build-import-board-snapshot.test.ts`

Expected: `FAIL` with module-not-found errors for `board-space-maps.ts` and `build-import-board-snapshot.ts`.

- [ ] **Step 3: Add the minimal Tharsis metadata and board snapshot implementation**

```ts
// src/lib/imports/board-space-maps.ts
export type BoardSpaceDefinition = {
  id: string;
  neighbors: string[];
  reservedTile?: 'Noctis City';
};

export type BoardSpaceMap = {
  mapId: string;
  spaces: Record<string, BoardSpaceDefinition>;
};

const tharsisSpaces: Record<string, BoardSpaceDefinition> = {
  '21': { id: '21', neighbors: ['20', '22', '29', '30'] },
  '31': { id: '31', neighbors: ['30', '32', '39', '40'], reservedTile: 'Noctis City' },
};

export function getBoardSpaceMap(mapId: string): BoardSpaceMap {
  if (mapId !== 'tharsis') {
    throw new Error(`Unsupported board map for curated board import: ${mapId}`);
  }

  return {
    mapId: 'tharsis',
    spaces: tharsisSpaces,
  };
}
```

```ts
// src/lib/imports/build-import-board-snapshot.ts
import type { ParsedActionGameLogEvent } from './parse-game-log';
import { getBoardSpaceMap } from './board-space-maps';

export type ImportBoardOccupant = {
  confidence: 'high' | 'medium';
  notes: string[];
  ownerPlayerName: string;
  sourceCardName: string | null;
  sourceType: 'log_explicit' | 'log_inferred';
  tileKind: string;
};

export type ImportBoardSnapshot = {
  mapId: string;
  spaces: Record<string, ImportBoardOccupant>;
};

export function buildImportBoardSnapshot(input: {
  events: ParsedActionGameLogEvent[];
  mapId: string;
}): ImportBoardSnapshot {
  getBoardSpaceMap(input.mapId);

  const spaces: Record<string, ImportBoardOccupant> = {};

  for (const event of input.events) {
    if (event.eventType !== 'tile_placed') {
      continue;
    }

    spaces[event.space] = {
      confidence: event.tile.toLowerCase() === 'city' ? 'medium' : 'high',
      notes: [],
      ownerPlayerName: event.actor,
      sourceCardName:
        event.tile.toLowerCase() === 'city' ||
        event.tile.toLowerCase() === 'greenery' ||
        event.tile.toLowerCase() === 'ocean'
          ? null
          : event.tile,
      sourceType: 'log_explicit',
      tileKind: event.tile,
    };
  }

  return {
    mapId: input.mapId,
    spaces,
  };
}
```

```ts
// src/app/(app)/log-game/import/page.tsx
import { buildImportBoardSnapshot } from '@/lib/imports/build-import-board-snapshot';

const boardSnapshot = buildImportBoardSnapshot({
  events: parsedGameLog.events,
  mapId: values.mapId,
});
```

- [ ] **Step 4: Re-run the focused tests and keep them green**

Run: `npx.cmd vitest run src/lib/imports/board-space-maps.test.ts src/lib/imports/build-import-board-snapshot.test.ts`

Expected: `PASS`

- [ ] **Step 5: Commit the board foundation**

```bash
git add src/lib/imports/board-space-maps.ts src/lib/imports/board-space-maps.test.ts src/lib/imports/build-import-board-snapshot.ts src/lib/imports/build-import-board-snapshot.test.ts src/app/(app)/log-game/import/page.tsx
git commit -m "feat: add curated import board snapshot foundation"
```

### Task 2: Score Curated Board-Dependent Cards And Map-Specific Placement Outcomes

**Files:**
- Create: `src/lib/imports/score-curated-board-import-items.ts`
- Create: `src/lib/imports/score-curated-board-import-items.test.ts`
- Modify: `src/lib/imports/build-import-review-model.ts`
- Modify: `src/lib/imports/build-import-review-model.test.ts`
- Modify: `src/lib/imports/build-import-draft.ts`
- Modify: `src/lib/imports/build-import-draft.test.ts`
- Modify: `src/app/(app)/log-game/import/page.tsx`

For this task, `mapId` is the authority for all board interpretation. The scorer must use:
- the correct board geometry for `tharsis`, `hellas`, or `elysium`
- the correct award set for the selected map
- the correct milestone set for the selected map

Do not assume Tharsis-specific award or milestone names when evaluating board evidence on Hellas or Elysium.

- [ ] **Step 1: Write the failing tests for curated card scoring, unresolved review items, and proved draft merges**

```ts
// src/lib/imports/score-curated-board-import-items.test.ts
import { describe, expect, it } from 'vitest';
import { scoreCuratedBoardImportItems } from './score-curated-board-import-items';

describe('scoreCuratedBoardImportItems', () => {
  it('scores Commercial District when the placed space and adjacent cities are fully known', () => {
    const result = scoreCuratedBoardImportItems({
      boardSnapshot: {
        mapId: 'tharsis',
        spaces: {
          '21': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Izzy',
            sourceCardName: 'Commercial District',
            sourceType: 'log_inferred',
            tileKind: 'Commercial District',
          },
          '20': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Corey',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'city',
          },
          '22': {
            confidence: 'high',
            notes: [],
            ownerPlayerName: 'Colette',
            sourceCardName: null,
            sourceType: 'log_explicit',
            tileKind: 'city',
          },
        },
      },
      events: [],
      mapId: 'tharsis',
      playerNames: ['Izzy'],
    });

    expect(result.items).toContainEqual(
      expect.objectContaining({
        playerName: 'Izzy',
        provedValue: 2,
        status: 'scored',
        targetName: 'Commercial District',
        targetType: 'card',
      }),
    );
  });

  it('creates a review-needed item when Commercial District was played but its board placement is not provable', () => {
    const result = scoreCuratedBoardImportItems({
      boardSnapshot: { mapId: 'tharsis', spaces: {} },
      events: [
        {
          actor: 'Izzy',
          card: 'Commercial District',
          eventType: 'card_played',
          lineNumber: 500,
          rawLine: 'Izzy played Commercial District',
        },
      ],
      mapId: 'tharsis',
      playerNames: ['Izzy'],
    });

    expect(result.items).toContainEqual(
      expect.objectContaining({
        playerName: 'Izzy',
        reason: 'Commercial District was played, but its placed space could not be linked from the log.',
        status: 'review_needed',
        targetName: 'Commercial District',
      }),
    );
  });
});
```

```ts
// src/lib/imports/build-import-review-model.test.ts
it('includes curated board review items alongside score cross-checks', () => {
  expect(
    buildImportReviewModel({
      boardReviewItems: [
        {
          evidenceSummary: 'Commercial District at 21 touches 2 cities.',
          jumpTarget: { field: 'cardPointsTotal', importedName: 'Izzy H.' },
          playerName: 'Izzy H.',
          provedValue: 2,
          requestedSpaceIds: [],
          reason: null,
          status: 'scored',
          targetName: 'Commercial District',
          targetType: 'card',
        },
      ],
      logParse: {
        cardPointBreakdowns: [],
        drawInfoLineCount: 0,
        events: [],
        ignoredLineCount: 0,
      },
      playerLinks: { matches: [], unresolvedCount: 0 },
      screenshotParse: { playerRows: [] },
    }),
  ).toMatchObject({
    boardReviewItems: [
      {
        playerName: 'Izzy H.',
        provedValue: 2,
        status: 'scored',
        targetName: 'Commercial District',
      },
    ],
  });
});
```

```ts
// src/lib/imports/build-import-draft.test.ts
it('adds fully proved curated board card points into the imported draft total without inventing unresolved values', () => {
  const draft = buildImportDraft({
    defaultExpansionCodes: ['base'],
    defaultPromoSetSlugs: [],
    groupId: 'group-1',
    importValues: {
      endgameScreenshotName: null,
      exportedGameLog: 'Izzy played Commercial District',
      generationCount: 10,
      mapId: 'tharsis',
      participantNames: ['Izzy'],
      playedOn: '2026-07-06',
      playerCount: 1,
    },
    playerSelections: [{ importedName: 'Izzy', playerId: 'player-1' }],
    scoredBoardItems: [
      {
        evidenceSummary: 'Commercial District at 21 touches 2 cities.',
        jumpTarget: { field: 'cardPointsTotal', importedName: 'Izzy' },
        playerName: 'Izzy',
        provedValue: 2,
        requestedSpaceIds: [],
        reason: null,
        status: 'scored',
        targetName: 'Commercial District',
        targetType: 'card',
      },
      {
        evidenceSummary: 'Miner funded, but winner not provable.',
        jumpTarget: { field: 'awardPoints', importedName: 'Izzy' },
        playerName: 'Izzy',
        provedValue: null,
        requestedSpaceIds: [],
        reason: 'Miner award was funded, but the supported board query could not prove the winner.',
        status: 'review_needed',
        targetName: 'Miner',
        targetType: 'award',
      },
    ],
    selectedPlayerIds: ['player-1'],
  });

  expect(draft.playerScores['player-1']).toMatchObject({
    cardPointsTotal: 2,
  });
  expect(draft.playerScores['player-1']?.awardPoints).toBeUndefined();
});
```

- [ ] **Step 2: Run the scorer and draft tests to verify they fail before implementation**

Run: `npx.cmd vitest run src/lib/imports/score-curated-board-import-items.test.ts src/lib/imports/build-import-review-model.test.ts src/lib/imports/build-import-draft.test.ts`

Expected: `FAIL` because the scorer module, review model field, and draft merge input do not exist yet.

- [ ] **Step 3: Implement the minimal curated scorer and merge path**

```ts
// src/lib/imports/score-curated-board-import-items.ts
import type { ParsedActionGameLogEvent } from './parse-game-log';
import type { ImportBoardSnapshot } from './build-import-board-snapshot';
import { getBoardSpaceMap } from './board-space-maps';

export type CuratedBoardReviewItem = {
  evidenceSummary: string;
  jumpTarget: {
    field: 'awardPoints' | 'cardPointsTotal';
    importedName: string;
  };
  playerName: string;
  provedValue: number | null;
  requestedSpaceIds: string[];
  reason: string | null;
  status: 'conflict' | 'review_needed' | 'scored';
  targetName: string;
  targetType: 'award' | 'card';
};

export function scoreCuratedBoardImportItems(input: {
  boardSnapshot: ImportBoardSnapshot;
  events: ParsedActionGameLogEvent[];
  mapId: string;
  playerNames: string[];
}): { items: CuratedBoardReviewItem[] } {
  const boardMap = getBoardSpaceMap(input.mapId);
  const items: CuratedBoardReviewItem[] = [];

  for (const event of input.events) {
    if (event.eventType !== 'card_played' || event.card !== 'Commercial District') {
      continue;
    }

    const placedEntry = Object.entries(input.boardSnapshot.spaces).find(
      ([, occupant]) =>
        occupant.ownerPlayerName === event.actor &&
        occupant.sourceCardName === 'Commercial District',
    );

    if (!placedEntry) {
      items.push({
        evidenceSummary: 'The log shows the card was played, but no provable board placement was linked.',
        jumpTarget: { field: 'cardPointsTotal', importedName: event.actor },
        playerName: event.actor,
        provedValue: null,
        requestedSpaceIds: [],
        reason: 'Commercial District was played, but its placed space could not be linked from the log.',
        status: 'review_needed',
        targetName: 'Commercial District',
        targetType: 'card',
      });
      continue;
    }

    const [spaceId] = placedEntry;
    const adjacentCities = (boardMap.spaces[spaceId]?.neighbors ?? []).filter((neighborId) => {
      const neighbor = input.boardSnapshot.spaces[neighborId];
      return neighbor?.tileKind?.toLowerCase() === 'city';
    }).length;

    items.push({
      evidenceSummary: `Commercial District at ${spaceId} touches ${adjacentCities} cities.`,
      jumpTarget: { field: 'cardPointsTotal', importedName: event.actor },
      playerName: event.actor,
      provedValue: adjacentCities,
      reason: null,
      status: 'scored',
      targetName: 'Commercial District',
      targetType: 'card',
    });
  }

  return { items };
}
```

```ts
// src/lib/imports/build-import-review-model.ts
import type { CuratedBoardReviewItem } from './score-curated-board-import-items';

export type ImportReviewModel = {
  boardReviewItems: CuratedBoardReviewItem[];
  detectedParticipantNames: string[];
  drawInfoLineCount: number;
  ignoredLineCount: number;
  logScoreCandidates?: ParsedEndgameScoreScreenshot['playerRows'];
  parsedEventCount: number;
  playerLinks: ImportPlayerLinkMatch[];
  requiresPlayerConfirmation: boolean;
  scoreCrossChecks?: ImportScoreCrossCheck[];
  scoreCandidates: ParsedEndgameScoreScreenshot['playerRows'];
};

export function buildImportReviewModel(input: {
  boardReviewItems?: CuratedBoardReviewItem[];
  logScoreCandidates?: ParsedEndgameScoreScreenshot['playerRows'];
  logParse: Pick<
    ParsedGameLog,
    'cardPointBreakdowns' | 'drawInfoLineCount' | 'events' | 'ignoredLineCount'
  >;
  playerLinks: {
    matches: ImportPlayerLinkMatch[];
    unresolvedCount: number;
  };
  screenshotParse: ParsedEndgameScoreScreenshot;
}): ImportReviewModel {
  const logScoreCandidates = input.logScoreCandidates ?? [];

  return {
    boardReviewItems: input.boardReviewItems ?? [],
    detectedParticipantNames: extractGameLogParticipantNames(input.logParse),
    drawInfoLineCount: input.logParse.drawInfoLineCount,
    ignoredLineCount: input.logParse.ignoredLineCount,
    logScoreCandidates,
    parsedEventCount: input.logParse.events.length,
    playerLinks: input.playerLinks.matches,
    requiresPlayerConfirmation: input.playerLinks.unresolvedCount > 0,
    scoreCrossChecks: buildScoreCrossChecks({
      logScoreCandidates,
      screenshotScoreCandidates: input.screenshotParse.playerRows,
    }),
    scoreCandidates: input.screenshotParse.playerRows,
  };
}
```

```ts
// src/lib/imports/build-import-draft.ts
import type { CuratedBoardReviewItem } from './score-curated-board-import-items';

const scoredBoardItems = input.scoredBoardItems ?? [];
const playerScores: LogGameDraftInput['playerScores'] = {};

for (const item of scoredBoardItems) {
    if (item.status !== 'scored' || item.provedValue == null) {
      continue;
    }

    const playerId = playerIdByImportedName.get(
      normalizePlayerAlias(item.playerName),
    );

    if (!playerId) {
      continue;
    }

    playerScores[playerId] = playerScores[playerId] ?? {};

    if (item.targetType === 'card' && item.jumpTarget.field === 'cardPointsTotal') {
      playerScores[playerId].cardPointsTotal =
        (playerScores[playerId].cardPointsTotal ?? 0) + item.provedValue;
    }

    if (item.targetType === 'award' && item.jumpTarget.field === 'awardPoints') {
      playerScores[playerId].awardPoints =
        (playerScores[playerId].awardPoints ?? 0) + item.provedValue;
    }
}
```

```ts
// src/app/(app)/log-game/import/page.tsx
import { scoreCuratedBoardImportItems } from '@/lib/imports/score-curated-board-import-items';

const boardReview = scoreCuratedBoardImportItems({
  boardSnapshot,
  events: parsedGameLog.events,
  mapId: values.mapId,
  playerNames: detectedParticipantNames,
});
```

- [ ] **Step 4: Re-run the focused scorer tests and keep them green**

Run: `npx.cmd vitest run src/lib/imports/score-curated-board-import-items.test.ts src/lib/imports/build-import-review-model.test.ts src/lib/imports/build-import-draft.test.ts`

Expected: `PASS`

- [ ] **Step 5: Commit the curated scoring layer**

```bash
git add src/lib/imports/score-curated-board-import-items.ts src/lib/imports/score-curated-board-import-items.test.ts src/lib/imports/build-import-review-model.ts src/lib/imports/build-import-review-model.test.ts src/lib/imports/build-import-draft.ts src/lib/imports/build-import-draft.test.ts src/app/(app)/log-game/import/page.tsx
git commit -m "feat: score curated board import items"
```

### Task 3: Add Targeted Board Screenshot Confirmation For Curated Gaps

**Files:**
- Create: `src/lib/imports/read-board-screenshot-space-confirmations.ts`
- Create: `src/lib/imports/read-board-screenshot-space-confirmations.test.ts`
- Modify: `src/app/(app)/log-game/import/page.tsx`
- Modify: `src/lib/imports/score-curated-board-import-items.ts`
- Modify: `src/lib/imports/score-curated-board-import-items.test.ts`

- [ ] **Step 1: Write the failing tests for narrow screenshot confirmation**

```ts
// src/lib/imports/read-board-screenshot-space-confirmations.test.ts
import { describe, expect, it } from 'vitest';
import { readBoardScreenshotSpaceConfirmations } from './read-board-screenshot-space-confirmations';

describe('readBoardScreenshotSpaceConfirmations', () => {
  it('returns targeted confirmation results for requested spaces from the real board screenshot fixture', async () => {
    const confirmations = await readBoardScreenshotSpaceConfirmations({
      files: [
        new File(['fixture'], 'board.png', { type: 'image/png' }),
      ],
      mapId: 'tharsis',
      requests: [
        { expectedKinds: ['city', 'Commercial District'], spaceId: '21' },
        { expectedKinds: ['city'], spaceId: '20' },
      ],
    });

    expect(confirmations['21']).toMatchObject({
      status: expect.stringMatching(/confirmed|inconclusive/),
    });
    expect(confirmations['20']).toMatchObject({
      status: expect.stringMatching(/confirmed|inconclusive/),
    });
  });
});
```

```ts
// src/lib/imports/score-curated-board-import-items.test.ts
it('uses screenshot confirmation to keep Commercial District review-only when an adjacent space is still inconclusive', () => {
  const result = scoreCuratedBoardImportItems({
    boardSnapshot: {
      mapId: 'tharsis',
      spaces: {
        '21': {
          confidence: 'high',
          notes: [],
          ownerPlayerName: 'Izzy',
          sourceCardName: 'Commercial District',
          sourceType: 'log_inferred',
          tileKind: 'Commercial District',
        },
      },
    },
    events: [
      {
        actor: 'Izzy',
        card: 'Commercial District',
        eventType: 'card_played',
        lineNumber: 500,
        rawLine: 'Izzy played Commercial District',
      },
    ],
    mapId: 'tharsis',
    playerNames: ['Izzy'],
    screenshotConfirmations: {
      '20': { status: 'inconclusive' },
      '22': { status: 'confirmed', tileKind: 'city' },
    },
  });

  expect(result.items).toContainEqual(
    expect.objectContaining({
      reason: 'Adjacent city count is incomplete because board confirmation for spaces 20 and 22 was inconclusive.',
      status: 'review_needed',
      targetName: 'Commercial District',
    }),
  );
});
```

- [ ] **Step 2: Run the targeted screenshot tests and verify they fail**

Run: `npx.cmd vitest run src/lib/imports/read-board-screenshot-space-confirmations.test.ts src/lib/imports/score-curated-board-import-items.test.ts`

Expected: `FAIL` because the screenshot confirmation reader and confirmation-aware scorer input do not exist yet.

- [ ] **Step 3: Implement the minimal confirmation reader and pass confirmations into the scorer**

```ts
// src/lib/imports/read-board-screenshot-space-confirmations.ts
export type BoardSpaceConfirmation = {
  status: 'confirmed' | 'conflict' | 'inconclusive';
  tileKind?: string;
};

export async function readBoardScreenshotSpaceConfirmations(input: {
  files: File[];
  mapId: string;
  requests: Array<{
    expectedKinds: string[];
    spaceId: string;
  }>;
}): Promise<Record<string, BoardSpaceConfirmation>> {
  const results: Record<string, BoardSpaceConfirmation> = {};

  for (const request of input.requests) {
    results[request.spaceId] = { status: 'inconclusive' };
  }

  return results;
}
```

```ts
// src/lib/imports/score-curated-board-import-items.ts
export function scoreCuratedBoardImportItems(input: {
  boardSnapshot: ImportBoardSnapshot;
  events: ParsedActionGameLogEvent[];
  mapId: string;
  playerNames: string[];
  screenshotConfirmations?: Record<string, { status: 'confirmed' | 'conflict' | 'inconclusive'; tileKind?: string }>;
}) {
  const boardMap = getBoardSpaceMap(input.mapId);
  const items: CuratedBoardReviewItem[] = [];

  for (const event of input.events) {
    if (event.eventType !== 'card_played' || event.card !== 'Commercial District') {
      continue;
    }

    const placedEntry = Object.entries(input.boardSnapshot.spaces).find(
      ([, occupant]) =>
        occupant.ownerPlayerName === event.actor &&
        occupant.sourceCardName === 'Commercial District',
    );

    if (!placedEntry) {
      items.push({
        evidenceSummary: 'The log shows the card was played, but no provable board placement was linked.',
        jumpTarget: { field: 'cardPointsTotal', importedName: event.actor },
        playerName: event.actor,
        provedValue: null,
        reason: 'Commercial District was played, but its placed space could not be linked from the log.',
        status: 'review_needed',
        targetName: 'Commercial District',
        targetType: 'card',
      });
      continue;
    }

    const [spaceId] = placedEntry;
    const unresolvedNeighbors: string[] = [];
    let adjacentCities = 0;

    for (const neighborId of boardMap.spaces[spaceId]?.neighbors ?? []) {
      const neighbor = input.boardSnapshot.spaces[neighborId];

      if (neighbor?.tileKind?.toLowerCase() === 'city') {
        adjacentCities += 1;
        continue;
      }

      const confirmation = input.screenshotConfirmations?.[neighborId];

      if (confirmation?.status === 'confirmed' && confirmation.tileKind === 'city') {
        adjacentCities += 1;
        continue;
      }

      if (!neighbor || confirmation?.status === 'inconclusive') {
        unresolvedNeighbors.push(neighborId);
      }
    }

    if (unresolvedNeighbors.length > 0) {
      items.push({
        evidenceSummary: `Commercial District at ${spaceId} still needs confirmation for adjacent spaces ${unresolvedNeighbors.join(', ')}.`,
        jumpTarget: { field: 'cardPointsTotal', importedName: event.actor },
        playerName: event.actor,
        provedValue: null,
        requestedSpaceIds: unresolvedNeighbors,
        reason: `Adjacent city count is incomplete because board confirmation for spaces ${unresolvedNeighbors.join(' and ')} was inconclusive.`,
        status: 'review_needed',
        targetName: 'Commercial District',
        targetType: 'card',
      });
      continue;
    }

    items.push({
      evidenceSummary: `Commercial District at ${spaceId} touches ${adjacentCities} cities.`,
      jumpTarget: { field: 'cardPointsTotal', importedName: event.actor },
      playerName: event.actor,
      provedValue: adjacentCities,
      requestedSpaceIds: [],
      reason: null,
      status: 'scored',
      targetName: 'Commercial District',
      targetType: 'card',
    });
  }

  return { items };
}
```

```ts
// src/app/(app)/log-game/import/page.tsx
import { readBoardScreenshotSpaceConfirmations } from '@/lib/imports/read-board-screenshot-space-confirmations';

const initialBoardReview = scoreCuratedBoardImportItems({
  boardSnapshot,
  events: parsedGameLog.events,
  mapId: values.mapId,
  playerNames: detectedParticipantNames,
});

const screenshotConfirmationRequests = Array.from(
  new Set(
    initialBoardReview.items.flatMap((item) =>
      item.requestedSpaceIds.map((spaceId) => `${item.targetName}:${spaceId}`),
    ),
  ),
).map((requestKey) => {
  const [, spaceId] = requestKey.split(':');
  return {
    expectedKinds: ['city'],
    spaceId,
  };
});

const screenshotConfirmations =
  values.boardScreenshots.length > 0 && screenshotConfirmationRequests.length > 0
    ? await readBoardScreenshotSpaceConfirmations({
        files: values.boardScreenshots,
        mapId: values.mapId,
        requests: screenshotConfirmationRequests,
      })
    : {};

const boardReview = scoreCuratedBoardImportItems({
  boardSnapshot,
  events: parsedGameLog.events,
  mapId: values.mapId,
  playerNames: detectedParticipantNames,
  screenshotConfirmations,
});
```

- [ ] **Step 4: Re-run the focused confirmation tests**

Run: `npx.cmd vitest run src/lib/imports/read-board-screenshot-space-confirmations.test.ts src/lib/imports/score-curated-board-import-items.test.ts`

Expected: `PASS`

- [ ] **Step 5: Commit the screenshot confirmation layer**

```bash
git add src/lib/imports/read-board-screenshot-space-confirmations.ts src/lib/imports/read-board-screenshot-space-confirmations.test.ts src/lib/imports/score-curated-board-import-items.ts src/lib/imports/score-curated-board-import-items.test.ts src/app/(app)/log-game/import/page.tsx
git commit -m "feat: confirm curated board import gaps from screenshots"
```

### Task 4: Surface Review Items And Add Draft Jump + Highlight

**Files:**
- Create: `src/lib/imports/import-review-jump-state.ts`
- Create: `src/lib/imports/import-review-jump-state.test.ts`
- Modify: `src/features/imports/import-review-panel.tsx`
- Modify: `src/features/imports/web-import-page.tsx`
- Modify: `src/features/imports/web-import-page.test.tsx`
- Modify: `src/features/imports/log-game-import-shell.tsx`
- Modify: `src/features/imports/log-game-import-shell.test.tsx`
- Modify: `src/features/games/log-game/log-game-wizard.tsx`
- Modify: `src/features/games/log-game/log-game-wizard.test.tsx`
- Modify: `src/features/games/log-game/scores-step.tsx`

- [ ] **Step 1: Write the failing tests for unresolved review UI and transient jump state**

```ts
// src/lib/imports/import-review-jump-state.test.ts
import { describe, expect, it } from 'vitest';
import {
  clearImportReviewJumpState,
  readImportReviewJumpState,
  writeImportReviewJumpState,
} from './import-review-jump-state';

describe('import review jump state', () => {
  it('round-trips a highlighted unresolved score target through session storage', () => {
    writeImportReviewJumpState({
      field: 'cardPointsTotal',
      gameId: 'game-1',
      importedName: 'Izzy',
      reason: 'Commercial District was played, but its placed space could not be linked from the log.',
    });

    expect(readImportReviewJumpState()).toMatchObject({
      field: 'cardPointsTotal',
      gameId: 'game-1',
      importedName: 'Izzy',
    });

    clearImportReviewJumpState();
    expect(readImportReviewJumpState()).toBeNull();
  });
});
```

```tsx
// src/features/imports/log-game-import-shell.test.tsx
it('stores unresolved review jump state before routing into the saved draft flow', async () => {
  const user = userEvent.setup();
  const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
    status: 'success' as const,
    review: {
      boardReviewItems: [
        {
          evidenceSummary: 'The log shows the card was played, but no provable board placement was linked.',
          jumpTarget: { field: 'cardPointsTotal', importedName: 'Friday Mars' },
          playerName: 'Friday Mars',
          provedValue: null,
          requestedSpaceIds: [],
          reason: 'Commercial District was played, but its placed space could not be linked from the log.',
          status: 'review_needed' as const,
          targetName: 'Commercial District',
          targetType: 'card' as const,
        },
      ],
      detectedParticipantNames: ['Friday Mars'],
      drawInfoLineCount: 0,
      ignoredLineCount: 0,
      parsedEventCount: 1,
      playerLinks: [],
      requiresPlayerConfirmation: false,
      scoreCandidates: [],
    },
  });
  const onCreateImportDraft = vi.fn().mockResolvedValue({
    status: 'success' as const,
    gameId: 'game-1',
    message: 'Import draft saved.',
  });

  render(
    <LogGameImportShell
      initialValues={{
        generationCount: 10,
        mapId: 'tharsis',
        playedOn: '2026-07-03',
        playerCount: 4,
      }}
      mapOptions={[{ code: 'tharsis', id: 'tharsis', name: 'Tharsis' }]}
      onAnalyzeImportEvidence={onAnalyzeImportEvidence}
      onCreateImportDraft={onCreateImportDraft}
    />,
  );

  await user.type(screen.getByLabelText(/exported game log/i), 'Friday Mars played Commercial District');
  await user.click(screen.getByRole('button', { name: /analyze import evidence/i }));
  await user.click(screen.getByRole('button', { name: /fill manually/i }));
  await user.click(screen.getByRole('button', { name: /confirm import draft/i }));

  expect(
    JSON.parse(window.sessionStorage.getItem('tm-import-review-jump-state') ?? '{}'),
  ).toMatchObject({
    field: 'cardPointsTotal',
    gameId: 'game-1',
    importedName: 'Friday Mars',
  });
  expect(navigationMocks.push).toHaveBeenCalledWith('/log-game?gameId=game-1');
});
```

```tsx
// src/features/games/log-game/log-game-wizard.test.tsx
it('highlights the unresolved imported score field after an import review jump', async () => {
  window.sessionStorage.setItem(
    'tm-import-review-jump-state',
    JSON.stringify({
      field: 'cardPointsTotal',
      gameId: 'game-1',
      importedName: 'Friday Mars',
      reason: 'Commercial District was played, but its placed space could not be linked from the log.',
    }),
  );

  render(
    <LogGameWizard
      awardOptions={[]}
      cardOptions={[]}
      corporationOptions={[]}
      expansionOptions={[{ id: 'e1', code: 'base', name: 'Base Game' }]}
      initialValues={{
        awardClaims: {},
        gameId: 'game-1',
        generationCount: 10,
        groupId: 'group-1',
        mapId: 'tharsis',
        milestoneClaims: {},
        notes: '',
        playerCount: 1,
        playerScores: {},
        playerSelections: {},
        playerStyles: {},
        playedOn: '2026-07-06',
        expansionCodes: ['base'],
        promoSetSlugs: [],
        selectedPlayerIds: ['p1'],
      }}
      mapOptions={[{ id: 'tharsis', code: 'tharsis', name: 'Tharsis' }]}
      milestoneOptions={[]}
      onFinalizeGame={vi.fn().mockResolvedValue({ gameId: 'game-1', message: 'ok', status: 'success' })}
      onSaveDraft={vi.fn().mockResolvedValue({ gameId: 'game-1', message: 'ok', status: 'success' })}
      playerOptions={[{ id: 'p1', display_name: 'Friday Mars' }]}
      preludeOptions={[]}
      promoSetOptions={[]}
      styleOptions={[]}
    />,
  );

  expect(
    screen.getByText(/commercial district was played, but its placed space could not be linked from the log\./i),
  ).toBeInTheDocument();
  expect(
    screen.getByLabelText(/friday mars total card points/i),
  ).toHaveAttribute('data-import-review-highlight', 'true');
});
```

- [ ] **Step 2: Run the UI and state tests to verify they fail first**

Run: `npx.cmd vitest run src/lib/imports/import-review-jump-state.test.ts src/features/imports/log-game-import-shell.test.tsx src/features/games/log-game/log-game-wizard.test.tsx src/features/imports/web-import-page.test.tsx`

Expected: `FAIL` because the storage helper, review actions, and highlight props do not exist yet.

- [ ] **Step 3: Implement the review action, transient storage helper, and highlight path**

```ts
// src/lib/imports/import-review-jump-state.ts
const importReviewJumpStateKey = 'tm-import-review-jump-state';

export type ImportReviewJumpState = {
  field: 'awardPoints' | 'cardPointsTotal';
  gameId: string;
  importedName: string;
  reason: string;
};

export function writeImportReviewJumpState(value: ImportReviewJumpState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(importReviewJumpStateKey, JSON.stringify(value));
}

export function readImportReviewJumpState(): ImportReviewJumpState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(importReviewJumpStateKey);
  return rawValue ? (JSON.parse(rawValue) as ImportReviewJumpState) : null;
}

export function clearImportReviewJumpState() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(importReviewJumpStateKey);
}
```

```tsx
// src/features/imports/import-review-panel.tsx
type ImportReviewPanelProps = {
  creatingImportedName?: string | null;
  onCreatePlayer?: (importedName: string) => Promise<void>;
  onFillBoardReviewItem?: (item: CuratedBoardReviewItem) => void;
  onSelectionChange: (importedName: string, playerId: string) => void;
  review: ImportReviewModel | null;
  playerSelections: Record<string, string>;
};

{review.boardReviewItems.length > 0 ? (
  <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
    <h3 className="tm-data-label text-xs">Curated Board Review</h3>
    <ul className="mt-3 flex flex-col gap-3 text-sm">
      {review.boardReviewItems.map((item) => (
        <li key={`${item.playerName}-${item.targetType}-${item.targetName}`}>
          <p className="text-stone-100">
            {item.playerName}: {item.targetName}
            {item.status === 'scored' && item.provedValue != null
              ? ` proved at ${item.provedValue} VP.`
              : ` needs review. ${item.reason}`}
          </p>
          {item.status !== 'scored' ? (
            <button
              className="tm-button-secondary mt-2"
              onClick={() => onFillBoardReviewItem?.(item)}
              type="button"
            >
              Fill Manually
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  </div>
) : null}
```

```tsx
// src/features/imports/web-import-page.tsx
const [pendingBoardReviewJumpItem, setPendingBoardReviewJumpItem] =
  useState<CuratedBoardReviewItem | null>(null);

type WebImportPageProps = {
  initialValues: Omit<
    WebImportDraftValues,
    'boardScreenshots' | 'endgameScreenshot' | 'exportedGameLog' | 'participantNames'
  >;
  mapOptions: MapOption[];
  onAnalyzeImportEvidence: (formData: FormData) => Promise<WebImportActionResult>;
  onCreateImportPlayer?: (
    importedName: string,
  ) => Promise<WebImportCreatePlayerResult>;
  onConfirmImportReview: (
    formData: FormData,
    pendingJumpItem?: CuratedBoardReviewItem | null,
  ) => Promise<WebImportActionResult>;
};

async function handleConfirmImport() {
  setIsConfirming(true);

  try {
    const result = await onConfirmImportReview(
      buildCurrentFormData(),
      pendingBoardReviewJumpItem,
    );

    setFeedback(result);
  } finally {
    setIsConfirming(false);
  }
}
```

```tsx
// src/features/imports/log-game-import-shell.tsx
import {
  clearImportReviewJumpState,
  writeImportReviewJumpState,
} from '@/lib/imports/import-review-jump-state';

async function handleStartImport(
  formData: FormData,
  pendingJumpItem?: CuratedBoardReviewItem | null,
): Promise<WebImportActionResult> {
  const result = await onCreateImportDraft(formData);

  if (result.status === 'success' && result.gameId && pendingJumpItem?.reason) {
    writeImportReviewJumpState({
      field: pendingJumpItem.jumpTarget.field,
      gameId: result.gameId,
      importedName: pendingJumpItem.jumpTarget.importedName,
      reason: pendingJumpItem.reason,
    });
  } else {
    clearImportReviewJumpState();
  }

  if (result.status === 'success' && result.gameId) {
    router.push(`/log-game?gameId=${result.gameId}`);
  }
  return result;
}
```

```tsx
// src/features/games/log-game/log-game-wizard.tsx
const [importReviewJumpState, setImportReviewJumpState] =
  useState<ImportReviewJumpState | null>(null);

useEffect(() => {
  const nextJumpState = readImportReviewJumpState();

  if (!nextJumpState || nextJumpState.gameId !== form.getValues('gameId')) {
    return;
  }

  setImportReviewJumpState(nextJumpState);
  clearImportReviewJumpState();
}, [form]);
```

```tsx
// src/features/games/log-game/scores-step.tsx
type ScoresStepProps = {
  highlightedImportReviewField?: {
    field: 'awardPoints' | 'cardPointsTotal';
    importedName: string;
    reason: string;
  } | null;
  register: UseFormRegister<LogGameDraftInput>;
  selectedPlayers: Array<{
    id: string;
    display_name: string;
  }>;
};

const isHighlighted =
  highlightedImportReviewField?.importedName === player.display_name &&
  highlightedImportReviewField.field === 'cardPointsTotal';

{isHighlighted ? (
  <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
    {highlightedImportReviewField.reason} This card was not read and still needs manual entry.
  </p>
) : null}
```

- [ ] **Step 4: Re-run the focused UI and state tests**

Run: `npx.cmd vitest run src/lib/imports/import-review-jump-state.test.ts src/features/imports/log-game-import-shell.test.tsx src/features/games/log-game/log-game-wizard.test.tsx src/features/imports/web-import-page.test.tsx`

Expected: `PASS`

- [ ] **Step 5: Commit the review jump and highlight flow**

```bash
git add src/lib/imports/import-review-jump-state.ts src/lib/imports/import-review-jump-state.test.ts src/features/imports/import-review-panel.tsx src/features/imports/web-import-page.test.tsx src/features/imports/log-game-import-shell.tsx src/features/imports/log-game-import-shell.test.tsx src/features/games/log-game/log-game-wizard.tsx src/features/games/log-game/log-game-wizard.test.tsx src/features/games/log-game/scores-step.tsx
git commit -m "feat: highlight unresolved curated import review items"
```

### Task 5: Run The Full Focused Verification Pass

**Files:**
- Modify: none expected

- [ ] **Step 1: Run the full focused import verification suite**

Run:

```bash
npx.cmd vitest run src/lib/imports/board-space-maps.test.ts src/lib/imports/build-import-board-snapshot.test.ts src/lib/imports/read-board-screenshot-space-confirmations.test.ts src/lib/imports/score-curated-board-import-items.test.ts src/lib/imports/build-import-review-model.test.ts src/lib/imports/build-import-draft.test.ts src/lib/imports/import-review-jump-state.test.ts src/features/imports/web-import-page.test.tsx src/features/imports/log-game-import-shell.test.tsx src/features/games/log-game/log-game-wizard.test.tsx
```

Expected: `PASS`

- [ ] **Step 2: Run TypeScript validation**

Run: `npx.cmd tsc --noEmit --pretty false`

Expected: `PASS`

- [ ] **Step 3: Run diff hygiene on the touched files**

Run:

```bash
git diff --check -- src/lib/imports/board-space-maps.ts src/lib/imports/build-import-board-snapshot.ts src/lib/imports/read-board-screenshot-space-confirmations.ts src/lib/imports/score-curated-board-import-items.ts src/lib/imports/build-import-review-model.ts src/lib/imports/build-import-draft.ts src/lib/imports/import-review-jump-state.ts src/features/imports/import-review-panel.tsx src/features/imports/log-game-import-shell.tsx src/features/games/log-game/log-game-wizard.tsx src/features/games/log-game/scores-step.tsx src/app/(app)/log-game/import/page.tsx
```

Expected: no new whitespace errors aside from any pre-existing CRLF warnings already present in the repo

- [ ] **Step 4: Commit the final verification checkpoint if any test-only fixups were needed**

```bash
git add -A
git commit -m "test: verify curated board evidence import flow"
```

## Self-Review

### Spec Coverage

- Log-first board reconstruction: covered by Task 1.
- Screenshot only for targeted confirmation: covered by Task 3.
- Curated cards and awards only: covered by Task 2.
- Prefill only proved values: covered by Task 2 draft merge tests.
- Review-needed output with reasons: covered by Task 2 review-model tests and Task 4 UI.
- Jump and highlight without URL state: covered by Task 4.

No uncovered spec requirements remain for the approved narrow slice.

### Placeholder Scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Commands, files, and concrete test examples are present in every task.
- The screenshot confirmation task intentionally starts with `inconclusive` as the minimal implementation so the TDD path stays honest while the real image logic is filled in during execution.

### Type Consistency

- `CuratedBoardReviewItem` is the single review item type used by the scorer, review model, and draft merge.
- `ImportReviewJumpState` uses the same `field` domain as `CuratedBoardReviewItem['jumpTarget']['field']`.
- The planned score targets are intentionally limited to `cardPointsTotal` and `awardPoints` for this slice.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-06-curated-board-evidence-import-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
