# Flat Scoring Card List Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional flat pasted `Scoring Card List` to import review, assign those cards back to players only when the game log proves ownership, learn reusable scoring rules from OCR when confidence is high enough, and expose the same `Fix rule` workflow in both the web import review and the in-app draft review.

**Architecture:** Keep the existing hybrid import pipeline as the backbone. Add a separate pasted-card review layer on top of the current `cardScoring` summaries instead of replacing them: parse and normalize pasted lines, match them against the card catalog, assign owners from exact `card_played` log events, then run the existing scorer only for safely resolved assignments. Persist the raw pasted list plus a review snapshot on `game_log_imports`, and surface that same saved review snapshot in the app review page so rule fixes can happen from either surface.

**Tech Stack:** Next.js App Router, React 19 client/server components, TypeScript, Supabase Postgres/Storage, server actions, Zod, Vitest, React Testing Library, existing `tesseract.js` OCR pipeline

---

## Planned File Structure

- `supabase/migrations/20260708153000_add_flat_card_list_import_review_support.sql`: extend `game_log_imports` with persisted pasted-card evidence and review payload JSON, and extend `card_scoring_rule_cache` with user-correction audit metadata
- `src/lib/db/game-import-repo.ts`: save/load persisted pasted-card evidence and review snapshot with each import
- `src/lib/db/game-import-repo.test.ts`: repository coverage for supplemental evidence and saved review payload round-trips
- `src/lib/db/card-scoring-rule-cache-repo.ts`: add user-corrected rule metadata and a dedicated correction upsert helper
- `src/lib/db/card-scoring-rule-cache-repo.test.ts`: cache repo coverage for corrected-rule writes
- `src/lib/imports/pasted-scoring-card-review-schema.ts`: Zod-backed JSON shapes for persisted pasted-card evidence and review rows
- `src/lib/imports/pasted-scoring-card-list.ts`: normalize raw pasted lines and strip bullet/spacing noise
- `src/lib/imports/pasted-scoring-card-list.test.ts`: parser coverage for pasted whole-game lists
- `src/lib/imports/build-pasted-scoring-card-review.ts`: resolve pasted lines to cards, assign owners from exact log evidence, detect duplicates, and prepare scorer inputs plus review rows
- `src/lib/imports/build-pasted-scoring-card-review.test.ts`: coverage for exact matches, unmatched lines, ambiguous owners, and duplicate rows
- `src/lib/imports/card-scoring/card-scoring-types.ts`: add `user_corrected` rule source and typed pasted-card review rows
- `src/lib/imports/card-scoring/parse-ocr-card-rule.ts`: keep existing OCR parsing but let the caller distinguish high-confidence reusable rules from review-only suggestions
- `src/lib/imports/card-scoring/parse-ocr-card-rule.test.ts`: threshold and `no scoring` regression coverage
- `src/lib/imports/card-scoring/resolve-card-scoring-rule.ts`: curated-first, cache-second, OCR-third rule resolution with `>= 0.85` auto-save gating and user-corrected cache support
- `src/lib/imports/card-scoring/resolve-card-scoring-rule.test.ts`: resolver coverage for high-confidence OCR, low-confidence OCR review, and user-corrected cache reuse
- `src/lib/imports/card-scoring/calculate-import-card-scores.ts`: optionally score only the safely assigned pasted-card rows while preserving current behavior when no pasted list is supplied
- `src/lib/imports/card-scoring/calculate-import-card-scores.test.ts`: scorer coverage for requested-card filtering and unchanged legacy behavior
- `src/lib/imports/build-import-review-model.ts`: add pasted-card review payload to the shared import review model
- `src/lib/imports/build-import-review-model.test.ts`: review-model coverage for saved pasted-card review rows
- `src/lib/imports/import-draft-form-data.ts`: add the flat `scoringCardList` field to the import form contract
- `src/lib/imports/import-draft-form-data.test.ts`: form-data coverage for the new textarea field
- `src/features/imports/web-import-page.tsx`: collect the flat pasted list and feed it into analyze/save actions
- `src/features/imports/web-import-page.test.tsx`: web import flow coverage for the pasted-card textarea and review surface
- `src/features/imports/import-review-panel.tsx`: mount the shared pasted-card review panel inside web import review
- `src/features/imports/import-pasted-scoring-card-panel.tsx`: shared list UI for resolved, review-needed, auto-saved, and corrected pasted-card rows
- `src/features/imports/import-pasted-scoring-card-panel.test.tsx`: UI coverage for row states and `Fix rule`
- `src/features/imports/card-scoring-rule-editor.tsx`: shared lightweight rule editor used by both web import and app review
- `src/features/imports/card-scoring-rule-editor.test.tsx`: editor coverage for mode switches and payload submission
- `src/features/imports/import-evidence-summary.tsx`: show that a saved import includes pasted scoring cards and reviewable rule state
- `src/features/imports/import-saved-card-review-shell.tsx`: client wrapper for app review that renders the shared pasted-card panel and calls server actions
- `src/features/imports/import-saved-card-review-shell.test.tsx`: app-side review interaction coverage
- `src/app/(app)/log-game/import/page.tsx`: analyze/save the pasted-card list, persist the review snapshot, and expose the shared `Fix rule` server action during web import
- `src/app/(app)/log-game/import/page.test.tsx`: page-level coverage for analyze/save with pasted-card data and corrected rules
- `src/app/(app)/log-game/review/page.tsx`: load the saved pasted-card review snapshot for the draft and expose the same `Fix rule` server action in app review

## Delivery Strategy

The repo already has three important pieces we should preserve:

1. `parseGameLog` already extracts exact `card_played` events that are strong enough to prove ownership.
2. `calculateImportCardScores` and `resolveCardScoringRule` already know how to turn a played card plus board/log evidence into card-point totals.
3. The app review page already shows saved import evidence above the draft wizard, which is the right place to surface saved pasted-card review state without forcing users back to `/log-game/import`.

This implementation should therefore stay additive:

1. persist the new raw pasted-card evidence and saved review rows on `game_log_imports`
2. build a dedicated pasted-card review helper that can feed safely assigned cards into the existing scorer
3. tighten OCR auto-save rules so only one-rule `>= 0.85` results are reused globally
4. add a shared rule editor and pasted-card review panel used by both the web import screen and the app review screen
5. keep current board-aware import review and draft-prefill behavior intact when the new textarea is left blank

### Task 1: Persist Flat Pasted Card Evidence And Saved Review Snapshots

**Files:**
- Create: `supabase/migrations/20260708153000_add_flat_card_list_import_review_support.sql`
- Create: `src/lib/imports/pasted-scoring-card-review-schema.ts`
- Modify: `src/lib/db/game-import-repo.ts`
- Modify: `src/lib/db/game-import-repo.test.ts`

- [ ] **Step 1: Write the failing repository tests for supplemental pasted-card evidence and saved review payloads**

```ts
// src/lib/db/game-import-repo.test.ts
it('persists flat pasted scoring-card evidence and review payload with the import', async () => {
  const importInsert = vi.fn().mockReturnThis();
  const importSelect = vi.fn().mockReturnThis();
  const importSingle = vi.fn().mockResolvedValue({
    data: { id: 'import-1' },
    error: null,
  });

  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === 'game_log_imports') {
        return {
          insert: importInsert,
          select: importSelect,
          single: importSingle,
        };
      }

      if (table === 'game_result_screenshot_imports') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'screen-1' }, error: null }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'ok' }, error: null }),
      })),
    },
  } as never);

  await saveGameLogImport({
    gameId: 'game-1',
    rawLogText: 'Izzy played Project Workshop',
    screenshots: [],
    supplementalEvidence: {
      scoringCardListRawText: ['Pets', 'Tardigrades'].join('\n'),
    },
    reviewPayload: {
      pastedScoringCards: {
        rawText: ['Pets', 'Tardigrades'].join('\n'),
        rows: [
          {
            cardId: 'card-1',
            cardName: 'Pets',
            lineId: 'line-1',
            originalText: 'Pets',
            playerName: 'Izzy',
            reason: null,
            ruleSource: 'curated',
            status: 'resolved',
          },
        ],
      },
    },
    userId: 'user-1',
  });

  expect(importInsert).toHaveBeenCalledWith(
    expect.objectContaining({
      supplemental_evidence: {
        scoringCardListRawText: ['Pets', 'Tardigrades'].join('\n'),
      },
      review_payload: {
        pastedScoringCards: expect.objectContaining({
          rows: [expect.objectContaining({ cardName: 'Pets', status: 'resolved' })],
        }),
      },
    }),
  );
});

it('loads the latest saved pasted-card review snapshot for app review', async () => {
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === 'game_log_imports') {
        return {
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              confidence_summary: {},
              created_at: '2026-07-08T13:00:00.000Z',
              detected_source: 'manual_web_import',
              id: 'import-1',
              line_count: 8,
              parse_status: 'log_parsed',
              raw_log_text: 'Izzy played Project Workshop',
              review_payload: {
                pastedScoringCards: {
                  rawText: 'Pets',
                  rows: [{ lineId: 'line-1', originalText: 'Pets', status: 'resolved' }],
                },
              },
              screenshot_original_name: null,
              supplemental_evidence: {
                scoringCardListRawText: 'Pets',
              },
            },
            error: null,
          }),
          order: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
        };
      }

      if (table === 'game_result_screenshot_imports') {
        return {
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  } as never);

  await expect(
    getLatestGameLogImportDetail({ gameId: 'game-1' }),
  ).resolves.toMatchObject({
    reviewPayload: {
      pastedScoringCards: {
        rawText: 'Pets',
      },
    },
    supplementalEvidence: {
      scoringCardListRawText: 'Pets',
    },
  });
});
```

- [ ] **Step 2: Run the repository tests before the schema and repo contracts exist**

Run: `npm.cmd run test -- src/lib/db/game-import-repo.test.ts`
Expected: `FAIL` because `saveGameLogImport` does not accept `supplementalEvidence` / `reviewPayload`, and there is no `getLatestGameLogImportDetail` reader yet.

- [ ] **Step 3: Add explicit JSON columns for supplemental evidence and review payload**

```sql
-- supabase/migrations/20260708153000_add_flat_card_list_import_review_support.sql
alter table public.game_log_imports
add column if not exists supplemental_evidence jsonb not null default '{}'::jsonb,
add column if not exists review_payload jsonb not null default '{}'::jsonb;

alter table public.card_scoring_rule_cache
drop constraint if exists card_scoring_rule_cache_source_type_check;

alter table public.card_scoring_rule_cache
add column if not exists corrected_at timestamptz,
add column if not exists corrected_by_user_id uuid references auth.users(id) on delete set null,
add column if not exists is_user_corrected boolean not null default false,
add column if not exists original_source_type text;

alter table public.card_scoring_rule_cache
add constraint card_scoring_rule_cache_source_type_check
check (source_type in ('curated', 'ocr', 'user_corrected'));

alter table public.card_scoring_rule_cache
drop constraint if exists card_scoring_rule_cache_original_source_type_check;

alter table public.card_scoring_rule_cache
add constraint card_scoring_rule_cache_original_source_type_check
check (
  original_source_type is null
  or original_source_type in ('curated', 'ocr', 'user_corrected')
);
```

- [ ] **Step 4: Add a typed JSON schema for persisted pasted-card review state**

```ts
// src/lib/imports/pasted-scoring-card-review-schema.ts
import { z } from 'zod';

export const pastedScoringCardRowSchema = z.object({
  cardId: z.string().nullable(),
  cardName: z.string().nullable(),
  confidence: z.number().nullable().optional(),
  humanSummary: z.string().nullable().optional(),
  lineId: z.string(),
  originalText: z.string(),
  playerName: z.string().nullable(),
  reason: z.string().nullable(),
  ruleSource: z.enum(['curated', 'ocr', 'user_corrected']).nullable(),
  status: z.enum([
    'resolved',
    'needs_owner_review',
    'needs_rule_review',
    'needs_card_match_review',
    'needs_duplicate_review',
    'auto_saved_new_rule',
    'user_corrected_rule',
  ]),
});

export const pastedScoringCardReviewSchema = z.object({
  rawText: z.string(),
  rows: z.array(pastedScoringCardRowSchema),
});

export const gameLogImportReviewPayloadSchema = z.object({
  pastedScoringCards: pastedScoringCardReviewSchema.optional(),
});

export const gameLogImportSupplementalEvidenceSchema = z.object({
  scoringCardListRawText: z.string().optional(),
});
```

- [ ] **Step 5: Extend the import repo to save and read the new payloads**

```ts
// src/lib/db/game-import-repo.ts
import {
  gameLogImportReviewPayloadSchema,
  gameLogImportSupplementalEvidenceSchema,
} from '@/lib/imports/pasted-scoring-card-review-schema';

export type GameLogImportDetail = GameLogImportSummary & {
  reviewPayload: z.infer<typeof gameLogImportReviewPayloadSchema>;
  supplementalEvidence: z.infer<typeof gameLogImportSupplementalEvidenceSchema>;
};

export async function saveGameLogImport(input: {
  gameId: string;
  logParseSummary?: { contextLineCount: number; drawInfoLineCount: number; ignoredLineCount: number; parsedEventCount: number };
  rawLogText: string;
  reviewPayload?: z.input<typeof gameLogImportReviewPayloadSchema>;
  screenshotFile?: File | null;
  screenshotParse?: SaveGameLogScreenshotParseInput;
  screenshots?: SaveGameLogScreenshotInput[];
  supplementalEvidence?: z.input<typeof gameLogImportSupplementalEvidenceSchema>;
  userId: string;
}) {
  const reviewPayload = gameLogImportReviewPayloadSchema.parse(
    input.reviewPayload ?? {},
  );
  const supplementalEvidence = gameLogImportSupplementalEvidenceSchema.parse(
    input.supplementalEvidence ?? {},
  );

  const { data, error } = await supabase.from('game_log_imports').insert({
    confidence_summary: input.logParseSummary ?? {},
    created_by_user_id: input.userId,
    detected_source: 'manual_web_import',
    game_id: input.gameId,
    line_count: lineCount,
    parse_status: importParseStatus,
    parser_version: input.logParseSummary ? 'manual-web-import-v2' : 'manual-web-import-v1',
    raw_log_text: normalizedRawLogText,
    review_payload: reviewPayload,
    supplemental_evidence: supplementalEvidence,
    unparsed_line_count: unparsedLineCount,
  }).select('id').single();
}

export async function getLatestGameLogImportDetail(input: {
  gameId: string;
}): Promise<GameLogImportDetail | null> {
  const { data, error } = await supabase
    .from('game_log_imports')
    .select([
      'id',
      'created_at',
      'detected_source',
      'line_count',
      'parse_status',
      'raw_log_text',
      'review_payload',
      'supplemental_evidence',
      'screenshot_original_name',
    ].join(', '))
    .eq('game_id', input.gameId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    createdAt: data.created_at,
    detectedSource: data.detected_source,
    id: data.id,
    lineCount: data.line_count,
    parseStatus: data.parse_status,
    rawLogText: data.raw_log_text,
    reviewPayload: gameLogImportReviewPayloadSchema.parse(data.review_payload ?? {}),
    screenshotOriginalName: data.screenshot_original_name ?? null,
    supplementalEvidence: gameLogImportSupplementalEvidenceSchema.parse(
      data.supplemental_evidence ?? {},
    ),
  };
}
```

- [ ] **Step 6: Re-run the repository tests and validate the migration**

Run: `npm.cmd run test -- src/lib/db/game-import-repo.test.ts`
Expected: `PASS` with the new JSON payloads saved and loaded.

Run: `npx.cmd supabase db reset --local`
Expected: local schema reset succeeds with the new `game_log_imports` JSON columns and expanded `card_scoring_rule_cache` metadata.

- [ ] **Step 7: Commit the persistence layer**

```bash
git add supabase/migrations/20260708153000_add_flat_card_list_import_review_support.sql src/lib/imports/pasted-scoring-card-review-schema.ts src/lib/db/game-import-repo.ts src/lib/db/game-import-repo.test.ts
git commit -m "feat: persist pasted scoring-card import review"
```

### Task 2: Parse The Flat Pasted List And Build Safe Owner Assignments

**Files:**
- Create: `src/lib/imports/pasted-scoring-card-list.ts`
- Create: `src/lib/imports/pasted-scoring-card-list.test.ts`
- Create: `src/lib/imports/build-pasted-scoring-card-review.ts`
- Create: `src/lib/imports/build-pasted-scoring-card-review.test.ts`
- Modify: `src/lib/imports/card-scoring/card-scoring-types.ts`

- [ ] **Step 1: Write the failing parser and review-builder tests**

```ts
// src/lib/imports/pasted-scoring-card-list.test.ts
describe('parsePastedScoringCardList', () => {
  it('strips bullets and blank lines but keeps the original visible card text', () => {
    expect(
      parsePastedScoringCardList([
        '- Pets',
        '',
        '  Tardigrades  ',
        '\t- Stratospheric Birds',
      ].join('\n')),
    ).toEqual([
      { lineId: 'line-1', normalizedText: 'pets', originalText: 'Pets' },
      { lineId: 'line-2', normalizedText: 'tardigrades', originalText: 'Tardigrades' },
      { lineId: 'line-3', normalizedText: 'stratospheric birds', originalText: 'Stratospheric Birds' },
    ]);
  });
});
```

```ts
// src/lib/imports/build-pasted-scoring-card-review.test.ts
it('assigns owners only when exactly one played-card event proves the card owner', async () => {
  const review = await buildPastedScoringCardReview({
    boardEvidenceContext: undefined,
    boardStateTextLines: [],
    cardReferences: [
      {
        cardName: 'Pets',
        cardNumber: '007',
        cardType: 'Project',
        expansionCode: 'base',
        fullImageUrl: 'https://example.com/pets.png',
        id: 'card-pets',
        imageUrl: 'https://example.com/pets.png',
        promoSetSlug: null,
        requiredExpansionCodes: ['base'],
        sourceCardId: 'project:base:007',
        sourceTags: ['Animal'],
        thumbnailUrl: 'https://example.com/pets-thumb.png',
      },
    ],
    events: [
      {
        actor: 'Izzy',
        card: 'Pets',
        eventType: 'card_played',
        lineNumber: 14,
        rawLine: 'Izzy played Pets',
      },
    ],
    rawText: 'Pets',
  });

  expect(review.rows).toEqual([
    expect.objectContaining({
      cardId: 'card-pets',
      cardName: 'Pets',
      playerName: 'Izzy',
      status: 'resolved',
    }),
  ]);
  expect(review.resolvedAssignments).toEqual([
    { cardId: 'card-pets', cardName: 'Pets', playerName: 'Izzy' },
  ]);
});

it('keeps ambiguous or duplicate pasted lines in review instead of guessing', async () => {
  const review = await buildPastedScoringCardReview({
    boardEvidenceContext: undefined,
    boardStateTextLines: [],
    cardReferences: [
      {
        cardName: 'Pets',
        cardNumber: '007',
        cardType: 'Project',
        expansionCode: 'base',
        fullImageUrl: 'https://example.com/pets.png',
        id: 'card-pets',
        imageUrl: 'https://example.com/pets.png',
        promoSetSlug: null,
        requiredExpansionCodes: ['base'],
        sourceCardId: 'project:base:007',
        sourceTags: ['Animal'],
        thumbnailUrl: 'https://example.com/pets-thumb.png',
      },
    ],
    events: [],
    rawText: ['Pets', 'Unknown Card', 'Pets'].join('\n'),
  });

  expect(review.rows).toEqual([
    expect.objectContaining({ cardName: 'Pets', status: 'needs_owner_review' }),
    expect.objectContaining({ originalText: 'Unknown Card', status: 'needs_card_match_review' }),
    expect.objectContaining({ cardName: 'Pets', status: 'needs_duplicate_review' }),
  ]);
});
```

- [ ] **Step 2: Run the tests before the parser and review-builder exist**

Run: `npm.cmd run test -- src/lib/imports/pasted-scoring-card-list.test.ts src/lib/imports/build-pasted-scoring-card-review.test.ts`
Expected: `FAIL` because the new helper files and pasted-card review row types do not exist yet.

- [ ] **Step 3: Add typed pasted-card review rows and statuses**

```ts
// src/lib/imports/card-scoring/card-scoring-types.ts
export type CardScoringRuleSourceType = 'curated' | 'ocr' | 'user_corrected';

export type ImportPastedScoringCardReviewRow = {
  cardId: string | null;
  cardName: string | null;
  confidence?: number | null;
  humanSummary?: string | null;
  lineId: string;
  originalText: string;
  playerName: string | null;
  reason: string | null;
  ruleSource: CardScoringRuleSourceType | null;
  status:
    | 'resolved'
    | 'needs_owner_review'
    | 'needs_rule_review'
    | 'needs_card_match_review'
    | 'needs_duplicate_review'
    | 'auto_saved_new_rule'
    | 'user_corrected_rule';
};
```

- [ ] **Step 4: Implement raw line normalization for pasted whole-game card lists**

```ts
// src/lib/imports/pasted-scoring-card-list.ts
function stripListPrefix(line: string) {
  return line.replace(/^[\s>*\-\u2022]+/, '').trim();
}

function normalizeCardLine(line: string) {
  return stripListPrefix(line)
    .replace(/\s+/g, ' ')
    .trim();
}

export function parsePastedScoringCardList(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map((line) => normalizeCardLine(line))
    .filter(Boolean)
    .map((originalText, index) => ({
      lineId: `line-${index + 1}`,
      normalizedText: originalText.toLowerCase(),
      originalText,
    }));
}
```

- [ ] **Step 5: Build the safe catalog-match and exact-owner review helper**

```ts
// src/lib/imports/build-pasted-scoring-card-review.ts
import { normalizePlayerAlias } from './normalize-player-alias';
import { parsePastedScoringCardList } from './pasted-scoring-card-list';

function normalizeCardName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function buildPastedScoringCardReview(input: {
  boardEvidenceContext?: BoardEvidenceContext;
  boardStateTextLines?: string[];
  cardReferences: CardScoringReference[];
  events: ParsedGameLog['events'];
  rawText: string;
}) {
  const parsedLines = parsePastedScoringCardList(input.rawText);
  const cardReferencesByName = new Map(
    input.cardReferences.map((card) => [normalizeCardName(card.cardName), card] as const),
  );
  const playedOwnersByCardName = new Map<string, string[]>();

  for (const event of input.events) {
    if (event.eventType !== 'card_played') {
      continue;
    }

    const key = normalizeCardName(event.card);
    const existingOwners = playedOwnersByCardName.get(key) ?? [];
    playedOwnersByCardName.set(key, [...existingOwners, event.actor]);
  }

  const resolvedAssignments: Array<{ cardId: string; cardName: string; playerName: string }> = [];
  const rows = parsedLines.map((line, index) => {
    const matchedCard = cardReferencesByName.get(line.normalizedText) ?? null;

    if (!matchedCard) {
      return {
        cardId: null,
        cardName: null,
        lineId: line.lineId,
        originalText: line.originalText,
        playerName: null,
        reason: 'No catalog card matched this pasted line.',
        ruleSource: null,
        status: 'needs_card_match_review' as const,
      };
    }

    const playedOwners = [...new Set(playedOwnersByCardName.get(line.normalizedText) ?? [])];
    const duplicateLineCount = parsedLines.filter(
      (candidate) => candidate.normalizedText === line.normalizedText,
    ).length;

    if (duplicateLineCount > 1 && playedOwners.length !== duplicateLineCount) {
      return {
        cardId: matchedCard.id,
        cardName: matchedCard.cardName,
        lineId: line.lineId,
        originalText: line.originalText,
        playerName: null,
        reason: 'This card was pasted more than once and the log did not prove separate ownership instances.',
        ruleSource: null,
        status: 'needs_duplicate_review' as const,
      };
    }

    if (playedOwners.length !== 1) {
      return {
        cardId: matchedCard.id,
        cardName: matchedCard.cardName,
        lineId: line.lineId,
        originalText: line.originalText,
        playerName: null,
        reason: 'The pasted card matched the catalog, but the log did not prove exactly one owner.',
        ruleSource: null,
        status: 'needs_owner_review' as const,
      };
    }

    const playerName = playedOwners[0];
    resolvedAssignments.push({
      cardId: matchedCard.id,
      cardName: matchedCard.cardName,
      playerName,
    });

    return {
      cardId: matchedCard.id,
      cardName: matchedCard.cardName,
      lineId: line.lineId,
      originalText: line.originalText,
      playerName,
      reason: null,
      ruleSource: null,
      status: 'resolved' as const,
    };
  });

  return {
    rawText: input.rawText,
    resolvedAssignments,
    rows,
  };
}
```

- [ ] **Step 6: Re-run the new helper tests**

Run: `npm.cmd run test -- src/lib/imports/pasted-scoring-card-list.test.ts src/lib/imports/build-pasted-scoring-card-review.test.ts`
Expected: `PASS` with exact line normalization, catalog matches, and owner-assignment safety.

- [ ] **Step 7: Commit the pasted-list parsing layer**

```bash
git add src/lib/imports/pasted-scoring-card-list.ts src/lib/imports/pasted-scoring-card-list.test.ts src/lib/imports/build-pasted-scoring-card-review.ts src/lib/imports/build-pasted-scoring-card-review.test.ts src/lib/imports/card-scoring/card-scoring-types.ts
git commit -m "feat: parse pasted scoring card lists safely"
```

### Task 3: Tighten OCR Rule Reuse And Add Global User-Corrected Rules

**Files:**
- Modify: `src/lib/db/card-scoring-rule-cache-repo.ts`
- Modify: `src/lib/db/card-scoring-rule-cache-repo.test.ts`
- Modify: `src/lib/imports/card-scoring/card-scoring-types.ts`
- Modify: `src/lib/imports/card-scoring/parse-ocr-card-rule.ts`
- Modify: `src/lib/imports/card-scoring/parse-ocr-card-rule.test.ts`
- Modify: `src/lib/imports/card-scoring/resolve-card-scoring-rule.ts`
- Modify: `src/lib/imports/card-scoring/resolve-card-scoring-rule.test.ts`

- [ ] **Step 1: Write the failing cache and resolver tests for corrected rules and the new OCR confidence gate**

```ts
// src/lib/db/card-scoring-rule-cache-repo.test.ts
it('upserts a user-corrected rule with audit metadata', async () => {
  const upsert = vi.fn().mockResolvedValue({ error: null });

  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    from: vi.fn(() => ({
      upsert,
    })),
  } as never);

  await saveUserCorrectedCardScoringRule({
    cardId: 'card-1',
    correctedByUserId: 'user-1',
    humanSummary: '1 VP per 2 science tags you have',
    originalSourceType: 'ocr',
    rulePayload: {
      category: 'other',
      mode: 'tag_count',
      pointsPerSet: 1,
      scope: 'self',
      setSize: 2,
      tag: 'science',
    },
  });

  expect(upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      corrected_at: expect.any(String),
      corrected_by_user_id: 'user-1',
      is_user_corrected: true,
      original_source_type: 'ocr',
      source_type: 'user_corrected',
    }),
    expect.objectContaining({ onConflict: 'card_id' }),
  );
});
```

```ts
// src/lib/imports/card-scoring/resolve-card-scoring-rule.test.ts
it('keeps a low-confidence OCR rule in review instead of caching it globally', async () => {
  vi.mocked(getCardScoringRuleCache).mockResolvedValue(null);
  vi.mocked(upsertCardScoringRuleCache).mockResolvedValue(undefined);

  const result = await resolveCardScoringRule({
    card: CARD_REFERENCE,
    ocrTextLines: ['1 VP per city tile'],
  });

  expect(result).toMatchObject({
    status: 'review',
  });
  expect(upsertCardScoringRuleCache).not.toHaveBeenCalled();
});

it('treats OCR no-scoring outcomes as review-only in this milestone', async () => {
  vi.mocked(getCardScoringRuleCache).mockResolvedValue(null);
  vi.mocked(upsertCardScoringRuleCache).mockResolvedValue(undefined);

  const result = await resolveCardScoringRule({
    card: CARD_REFERENCE,
    ocrTextLines: ['Action: gain 2 steel.'],
  });

  expect(result).toMatchObject({
    status: 'review',
  });
  expect(upsertCardScoringRuleCache).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the failing cache and resolver tests**

Run: `npm.cmd run test -- src/lib/db/card-scoring-rule-cache-repo.test.ts src/lib/imports/card-scoring/parse-ocr-card-rule.test.ts src/lib/imports/card-scoring/resolve-card-scoring-rule.test.ts`
Expected: `FAIL` because the cache repo does not expose a corrected-rule helper and the resolver still auto-saves `no_scoring` and sub-0.85 OCR outcomes today.

- [ ] **Step 3: Expand the cache repo types and add a dedicated correction upsert helper**

```ts
// src/lib/db/card-scoring-rule-cache-repo.ts
export type CardScoringRuleCacheEntry = {
  cardId: string;
  confidence: number;
  correctedAt: string | null;
  correctedByUserId: string | null;
  createdAt: string;
  humanSummary: string;
  isUserCorrected: boolean;
  ocrEngineVersion: string | null;
  originalSourceType: 'curated' | 'ocr' | 'user_corrected' | null;
  rulePayload: Record<string, unknown>;
  sourceType: 'curated' | 'ocr' | 'user_corrected';
  updatedAt: string;
};

export async function saveUserCorrectedCardScoringRule(input: {
  cardId: string;
  correctedByUserId: string;
  humanSummary: string;
  originalSourceType: 'curated' | 'ocr' | 'user_corrected' | null;
  rulePayload: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from('card_scoring_rule_cache').upsert(
    {
      card_id: input.cardId,
      confidence: 1,
      corrected_at: now,
      corrected_by_user_id: input.correctedByUserId,
      human_summary: input.humanSummary,
      is_user_corrected: true,
      original_source_type: input.originalSourceType,
      rule_payload: input.rulePayload,
      source_type: 'user_corrected',
      updated_at: now,
    },
    { onConflict: 'card_id' },
  );

  if (error) throw error;
}
```

- [ ] **Step 4: Keep OCR parsing intact but let the resolver decide whether a parsed rule is reusable**

```ts
// src/lib/imports/card-scoring/resolve-card-scoring-rule.ts
const AUTO_SAVE_OCR_CONFIDENCE = 0.85;

if (parsedRule.status === 'resolved') {
  const suggestedRule = {
    ...parsedRule.payload,
    confidence: parsedRule.confidence,
    humanSummary: parsedRule.humanSummary,
    sourceType: 'ocr' as const,
  };

  if (parsedRule.confidence >= AUTO_SAVE_OCR_CONFIDENCE) {
    await upsertCardScoringRuleCache({
      cardId: input.card.id,
      confidence: parsedRule.confidence,
      humanSummary: parsedRule.humanSummary,
      ocrEngineVersion: 'tesseract.js-v7',
      rulePayload: toRulePayload(suggestedRule),
      sourceType: 'ocr',
    });

    return {
      auditStatus: 'auto_saved_new_rule' as const,
      rule: suggestedRule,
      status: 'resolved',
    };
  }

  return {
    confidence: parsedRule.confidence,
    humanSummary: parsedRule.humanSummary,
    suggestedRule: suggestedRule,
    reason: `${input.card.cardName} OCR found a plausible scoring rule, but it was not confident enough to auto-save globally.`,
    status: 'review',
  };
}

if (parsedRule.status === 'no_scoring') {
  return {
    confidence: parsedRule.confidence,
    humanSummary: parsedRule.humanSummary,
    reason: `${input.card.cardName} looks like a no-scoring card, but no-scoring OCR outcomes still require review in this milestone.`,
    status: 'review',
  };
}
```

- [ ] **Step 5: Re-run the cache and resolver tests**

Run: `npm.cmd run test -- src/lib/db/card-scoring-rule-cache-repo.test.ts src/lib/imports/card-scoring/parse-ocr-card-rule.test.ts src/lib/imports/card-scoring/resolve-card-scoring-rule.test.ts`
Expected: `PASS` with corrected-rule cache writes and `>= 0.85` OCR reuse only.

- [ ] **Step 6: Commit the rule-reuse and rule-correction layer**

```bash
git add src/lib/db/card-scoring-rule-cache-repo.ts src/lib/db/card-scoring-rule-cache-repo.test.ts src/lib/imports/card-scoring/card-scoring-types.ts src/lib/imports/card-scoring/parse-ocr-card-rule.ts src/lib/imports/card-scoring/parse-ocr-card-rule.test.ts src/lib/imports/card-scoring/resolve-card-scoring-rule.ts src/lib/imports/card-scoring/resolve-card-scoring-rule.test.ts
git commit -m "feat: support corrected card scoring rules"
```

### Task 4: Feed Pasted-Card Assignments Into Import Review And Draft Save

**Files:**
- Modify: `src/lib/imports/card-scoring/calculate-import-card-scores.ts`
- Modify: `src/lib/imports/card-scoring/calculate-import-card-scores.test.ts`
- Modify: `src/lib/imports/build-import-review-model.ts`
- Modify: `src/lib/imports/build-import-review-model.test.ts`
- Modify: `src/lib/imports/import-draft-form-data.ts`
- Create: `src/lib/imports/import-draft-form-data.test.ts`
- Modify: `src/app/(app)/log-game/import/page.tsx`
- Modify: `src/app/(app)/log-game/import/page.test.tsx`

- [ ] **Step 1: Write the failing form-data, scorer, and page tests for the new `scoringCardList` flow**

```ts
// src/lib/imports/import-draft-form-data.test.ts
it('round-trips the optional flat scoring-card list field', () => {
  const formData = buildCreateImportDraftFormData({
    boardScreenshots: [],
    confirmedPlayerLinks: [],
    endgameScreenshot: null,
    exportedGameLog: 'Izzy played Pets',
    generationCount: null,
    mapId: 'tharsis',
    participants: 'Izzy',
    playedOn: '2026-07-08',
    playerCount: 1,
    scoringCardList: ['Pets', 'Tardigrades'].join('\n'),
  });

  const parsed = parseCreateImportDraftFormData(formData);

  expect(parsed.scoringCardList).toBe(['Pets', 'Tardigrades'].join('\n'));
});
```

```ts
// src/lib/imports/card-scoring/calculate-import-card-scores.test.ts
it('scores only the safely assigned pasted-card rows when a flat card list is supplied', async () => {
  const result = await calculateImportCardScores({
    boardEvidenceContext: undefined,
    boardStateTextLines: [],
    cardReferences: CARD_REFERENCES,
    events: [
      {
        actor: 'Izzy',
        card: 'Pets',
        eventType: 'card_played',
        lineNumber: 1,
        rawLine: 'Izzy played Pets',
      },
      {
        actor: 'Izzy',
        card: 'Acquired Company',
        eventType: 'card_played',
        lineNumber: 2,
        rawLine: 'Izzy played Acquired Company',
      },
    ],
    requestedCards: [
      { cardId: 'card-pets', cardName: 'Pets', playerName: 'Izzy' },
    ],
  });

  expect(result).toEqual([
    expect.objectContaining({
      autoScoredCards: [expect.objectContaining({ cardName: 'Pets' })],
      playerName: 'Izzy',
    }),
  ]);
});
```

```ts
// src/app/(app)/log-game/import/page.test.tsx
it('persists the flat scoring-card list and saved pasted-card review snapshot with the import', async () => {
  const shellProps = await renderPageAndCaptureShellProps();
  const createDraftFormData = buildCreateImportDraftFormData({
    boardScreenshots: [new File(['board'], 'board.png', { type: 'image/png' })],
    confirmedPlayerLinks: [{ importedName: 'Friday Mars', playerId: 'player-1' }],
    endgameScreenshot: null,
    exportedGameLog: 'Friday Mars played Pets',
    generationCount: 10,
    mapId: 'tharsis',
    participants: 'Friday Mars',
    playedOn: '2026-07-08',
    playerCount: 1,
    scoringCardList: 'Pets',
  });

  await shellProps.onCreateImportDraft(createDraftFormData);

  expect(mockState.saveGameLogImport).toHaveBeenCalledWith(
    expect.objectContaining({
      reviewPayload: {
        pastedScoringCards: expect.objectContaining({
          rawText: 'Pets',
          rows: [expect.objectContaining({ cardName: 'Pets' })],
        }),
      },
      supplementalEvidence: {
        scoringCardListRawText: 'Pets',
      },
    }),
  );
});
```

- [ ] **Step 2: Run the failing form-data, scorer, and page tests**

Run: `npm.cmd run test -- src/lib/imports/import-draft-form-data.test.ts src/lib/imports/card-scoring/calculate-import-card-scores.test.ts src/app/(app)/log-game/import/page.test.tsx`
Expected: `FAIL` because the form contract, scorer input shape, and page save flow do not know about `scoringCardList` yet.

- [ ] **Step 3: Add the new form field and round-trip it through analyze/save actions**

```ts
// src/lib/imports/import-draft-form-data.ts
export type CreateImportDraftFormValues = {
  boardScreenshots?: File[];
  confirmedPlayerLinks?: Array<{ importedName: string; playerId: string }>;
  endgameScreenshot: File | null;
  exportedGameLog: string;
  generationCount?: number | null;
  mapId?: string | null;
  participants: string;
  playedOn: string;
  playerCount: number;
  scoringCardList?: string;
};

export type ParsedCreateImportDraftFormData = CreateImportDraftInput & {
  boardScreenshots: File[];
  scoringCardList: string;
};

export function buildCreateImportDraftFormData(values: CreateImportDraftFormValues) {
  const formData = new FormData();
  // existing fields...
  formData.set('scoringCardList', values.scoringCardList?.trim() ?? '');
  return formData;
}

export function parseCreateImportDraftFormData(formData: FormData): ParsedCreateImportDraftFormData {
  return {
    boardScreenshots: readOptionalFileListField(formData, 'boardScreenshots'),
    confirmedPlayerLinks: readConfirmedPlayerLinks(formData),
    endgameScreenshot,
    endgameScreenshotName: endgameScreenshot?.name ?? null,
    exportedGameLog: readTextField(formData, 'exportedGameLog'),
    generationCount: readOptionalIntegerField(formData, 'generationCount'),
    mapId: readTextField(formData, 'mapId'),
    participantNames: parseImportParticipants(readTextField(formData, 'participants')),
    playedOn: readTextField(formData, 'playedOn'),
    playerCount: readIntegerField(formData, 'playerCount'),
    scoringCardList: readTextField(formData, 'scoringCardList'),
  };
}
```

- [ ] **Step 4: Let the scorer optionally use only the safely assigned pasted cards**

```ts
// src/lib/imports/card-scoring/calculate-import-card-scores.ts
export async function calculateImportCardScores(input: {
  boardEvidenceContext?: BoardEvidenceContext;
  boardStateTextLines?: string[];
  cardReferences: CardScoringReference[];
  events: ParsedGameLog['events'];
  ocrTextLinesByCardId?: Record<string, string[]>;
  requestedCards?: Array<{ cardId: string; cardName: string; playerName: string }>;
}) {
  const evidenceRows = deriveCardScoreEvidence({
    boardStateTextLines: input.boardStateTextLines,
    cardReferences: input.cardReferences,
    events: input.events,
  });

  const requestedCardKeySet = input.requestedCards
    ? new Set(
        input.requestedCards.map(
          (card) => `${card.playerName.toLowerCase()}::${card.cardId}`,
        ),
      )
    : null;

  const filteredEvidenceRows =
    requestedCardKeySet == null
      ? evidenceRows
      : evidenceRows.filter((evidence) =>
          requestedCardKeySet.has(
            `${evidence.playerName.toLowerCase()}::${evidence.cardId}`,
          ),
        );

  // keep the rest of the current scorer unchanged
}
```

- [ ] **Step 5: Build the pasted-card review during analyze/save and attach it to the shared import review model**

```ts
// src/lib/imports/build-import-review-model.ts
import type { ImportPastedScoringCardReviewRow } from './card-scoring/card-scoring-types';

export type ImportReviewModel = {
  boardReviewItems?: CuratedBoardImportItem[];
  cardScoring?: ImportPlayerCardScoringSummary[];
  detectedParticipantNames: string[];
  drawInfoLineCount: number;
  ignoredLineCount: number;
  logScoreCandidates?: ParsedEndgameScoreScreenshot['playerRows'];
  parsedEventCount: number;
  pastedScoringCards?: {
    rawText: string;
    rows: ImportPastedScoringCardReviewRow[];
  };
  playerLinks: ImportPlayerLinkMatch[];
  requiresPlayerConfirmation: boolean;
  scoreCrossChecks?: ImportScoreCrossCheck[];
  scoreCandidates: ParsedEndgameScoreScreenshot['playerRows'];
};
```

```ts
// src/app/(app)/log-game/import/page.tsx
const pastedCardReview =
  values.scoringCardList.trim().length > 0
    ? await buildPastedScoringCardReview({
        boardEvidenceContext: finalBoardEvidenceContext,
        boardStateTextLines,
        cardReferences: cardScoringReferences,
        events: parsedGameLog.events,
        rawText: values.scoringCardList,
      })
    : null;

const cardScoring = await calculateImportCardScoresSafely({
  boardEvidenceContext: finalBoardEvidenceContext,
  boardStateTextLines,
  cardReferences: cardScoringReferences,
  events: parsedGameLog.events,
  requestedCards: pastedCardReview?.resolvedAssignments,
});

return {
  status: 'success' as const,
  message: buildImportSuccessMessage(...),
  review: buildImportReviewModel({
    boardReviewItems: curatedBoardItems,
    cardScoring,
    logParse: parsedGameLog,
    pastedScoringCards: pastedCardReview
      ? { rawText: pastedCardReview.rawText, rows: pastedCardReview.rows }
      : undefined,
    playerLinks,
    screenshotParse: parsedScreenshot,
  }),
};
```

```ts
// src/app/(app)/log-game/import/page.tsx save path
const review = buildImportReviewModel({
  boardReviewItems: curatedBoardItems,
  cardScoring,
  logParse: parsedGameLog,
  pastedScoringCards: pastedCardReview
    ? { rawText: pastedCardReview.rawText, rows: pastedCardReview.rows }
    : undefined,
  playerLinks,
  screenshotParse: parsedScreenshot,
});

await saveGameLogImport({
  gameId: draft.gameId,
  logParseSummary: { ... },
  rawLogText: values.exportedGameLog,
  reviewPayload: {
    pastedScoringCards: review.pastedScoringCards,
  },
  screenshots: [...],
  supplementalEvidence: {
    scoringCardListRawText: values.scoringCardList.trim() || undefined,
  },
  userId: activeUser.id,
});
```

- [ ] **Step 6: Re-run the focused tests for form-data, scorer filtering, and import-page persistence**

Run: `npm.cmd run test -- src/lib/imports/import-draft-form-data.test.ts src/lib/imports/card-scoring/calculate-import-card-scores.test.ts src/lib/imports/build-import-review-model.test.ts src/app/(app)/log-game/import/page.test.tsx`
Expected: `PASS` with the new textarea field, saved pasted-card review snapshot, and unchanged legacy scorer behavior when no list is provided.

- [ ] **Step 7: Commit the import-flow integration**

```bash
git add src/lib/imports/import-draft-form-data.ts src/lib/imports/import-draft-form-data.test.ts src/lib/imports/card-scoring/calculate-import-card-scores.ts src/lib/imports/card-scoring/calculate-import-card-scores.test.ts src/lib/imports/build-import-review-model.ts src/lib/imports/build-import-review-model.test.ts src/app/"(app)"/log-game/import/page.tsx src/app/"(app)"/log-game/import/page.test.tsx
git commit -m "feat: attach pasted scoring card review to imports"
```

### Task 5: Build The Shared Web Review Panel And `Fix rule` Editor

**Files:**
- Create: `src/features/imports/card-scoring-rule-editor.tsx`
- Create: `src/features/imports/card-scoring-rule-editor.test.tsx`
- Create: `src/features/imports/import-pasted-scoring-card-panel.tsx`
- Create: `src/features/imports/import-pasted-scoring-card-panel.test.tsx`
- Modify: `src/features/imports/import-review-panel.tsx`
- Modify: `src/features/imports/web-import-page.tsx`
- Modify: `src/features/imports/web-import-page.test.tsx`
- Modify: `src/app/(app)/log-game/import/page.tsx`

- [ ] **Step 1: Write the failing UI tests for pasted-card rows and the shared rule editor**

```tsx
// src/features/imports/import-pasted-scoring-card-panel.test.tsx
it('renders resolved, review-needed, and user-corrected pasted-card rows and exposes Fix rule', async () => {
  const user = userEvent.setup();
  const onFixRule = vi.fn();

  render(
    <ImportPastedScoringCardPanel
      onFixRule={onFixRule}
      review={{
        rawText: 'Pets\nMystery Science Card',
        rows: [
          {
            cardId: 'card-1',
            cardName: 'Pets',
            lineId: 'line-1',
            originalText: 'Pets',
            playerName: 'Izzy',
            reason: null,
            ruleSource: 'curated',
            status: 'resolved',
          },
          {
            cardId: 'card-2',
            cardName: 'Mystery Science Card',
            lineId: 'line-2',
            originalText: 'Mystery Science Card',
            playerName: 'Izzy',
            reason: 'OCR found a plausible rule, but it still needs review.',
            ruleSource: 'ocr',
            status: 'needs_rule_review',
          },
        ],
      }}
    />,
  );

  expect(screen.getByText(/scoring card list review/i)).toBeInTheDocument();
  expect(screen.getByText(/Pets/i)).toBeInTheDocument();
  expect(screen.getByText(/Mystery Science Card/i)).toBeInTheDocument();

  await user.click(
    screen.getByRole('button', { name: /fix rule mystery science card/i }),
  );

  expect(onFixRule).toHaveBeenCalledWith(
    expect.objectContaining({ cardId: 'card-2', cardName: 'Mystery Science Card' }),
  );
});
```

```tsx
// src/features/imports/card-scoring-rule-editor.test.tsx
it('submits a no-scoring rule and a tag-count rule with the expected payload', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();

  render(
    <CardScoringRuleEditor
      cardName="Stratospheric Birds"
      initialValue={null}
      onCancel={vi.fn()}
      onSave={onSave}
    />,
  );

  await user.selectOptions(screen.getByLabelText(/scoring mode/i), 'tag_count');
  await user.type(screen.getByLabelText(/tag/i), 'animal');
  await user.clear(screen.getByLabelText(/set size/i));
  await user.type(screen.getByLabelText(/set size/i), '1');
  await user.clear(screen.getByLabelText(/points per set/i));
  await user.type(screen.getByLabelText(/points per set/i), '1');
  await user.click(screen.getByRole('button', { name: /save rule/i }));

  expect(onSave).toHaveBeenCalledWith({
    category: 'animals',
    mode: 'tag_count',
    pointsPerSet: 1,
    scope: 'self',
    setSize: 1,
    tag: 'animal',
  });
});
```

- [ ] **Step 2: Run the web-review UI tests before the shared panel exists**

Run: `npm.cmd run test -- src/features/imports/import-pasted-scoring-card-panel.test.tsx src/features/imports/card-scoring-rule-editor.test.tsx src/features/imports/web-import-page.test.tsx`
Expected: `FAIL` because the shared panel, editor, and web form field are not implemented yet.

- [ ] **Step 3: Build the shared rule editor**

```tsx
// src/features/imports/card-scoring-rule-editor.tsx
export function CardScoringRuleEditor(input: {
  cardName: string;
  initialValue: VariableCardScoringRulePayload | null;
  onCancel: () => void;
  onSave: (rule: CardScoringRulePayload) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<CardScoringRulePayload['mode']>(
    input.initialValue?.mode ?? 'none',
  );
  const [setSize, setSetSize] = useState(String(
    input.initialValue && input.initialValue.mode !== 'none'
      ? input.initialValue.setSize
      : 1,
  ));
  const [pointsPerSet, setPointsPerSet] = useState(String(
    input.initialValue && input.initialValue.mode !== 'none'
      ? input.initialValue.pointsPerSet
      : 1,
  ));
  const [tag, setTag] = useState(
    input.initialValue?.mode === 'tag_count' ? input.initialValue.tag : '',
  );

  async function handleSave() {
    if (mode === 'none') {
      await input.onSave({ mode: 'none' });
      return;
    }

    await input.onSave({
      category: tag === 'animal' ? 'animals' : tag === 'jovian' ? 'jovian' : 'other',
      mode,
      pointsPerSet: Number(pointsPerSet),
      scope: 'self',
      setSize: Number(setSize),
      tag,
    } as CardScoringRulePayload);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <h4 className="tm-data-label text-xs">Fix rule - {input.cardName}</h4>
      {/* mode select plus numeric inputs */}
      <div className="mt-4 flex gap-3">
        <button className="tm-button-secondary" onClick={input.onCancel} type="button">
          Cancel
        </button>
        <button className="tm-button-primary" onClick={handleSave} type="button">
          Save rule
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build the shared pasted-card review panel and mount it in web import review**

```tsx
// src/features/imports/import-pasted-scoring-card-panel.tsx
export function ImportPastedScoringCardPanel(input: {
  onFixRule?: (row: ImportPastedScoringCardReviewRow) => void;
  review: {
    rawText: string;
    rows: ImportPastedScoringCardReviewRow[];
  } | null | undefined;
}) {
  if (!input.review || input.review.rows.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4">
      <h3 className="tm-data-label text-xs">Scoring Card List Review</h3>
      <ul className="mt-3 flex flex-col gap-3 text-sm">
        {input.review.rows.map((row) => (
          <li className="rounded-xl bg-white/[0.03] px-3 py-3" key={row.lineId}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-stone-100">
                  {row.cardName ?? row.originalText}
                </p>
                <p className="text-xs text-stone-300">
                  {row.playerName ? `${row.playerName} - ` : ''}{row.status.replace(/_/g, ' ')}
                </p>
                {row.reason ? <p className="mt-1 text-xs text-amber-100">{row.reason}</p> : null}
              </div>
              {row.cardId && row.playerName ? (
                <button
                  aria-label={`Fix rule ${row.cardName ?? row.originalText}`}
                  className="tm-button-secondary shrink-0"
                  onClick={() => input.onFixRule?.(row)}
                  type="button"
                >
                  Fix rule
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// src/features/imports/import-review-panel.tsx
<ImportPastedScoringCardPanel
  onFixRule={onFixPastedCardRule}
  review={review.pastedScoringCards}
/>
```

- [ ] **Step 5: Add the textarea, client state, and server action plumbing to web import**

```tsx
// src/features/imports/web-import-page.tsx
const [scoringCardList, setScoringCardList] = useState('');

function buildCurrentFormData() {
  return buildCreateImportDraftFormData({
    boardScreenshots,
    confirmedPlayerLinks: review
      ? review.playerLinks.flatMap((link) => {
          const playerId = playerSelections[link.importedName]?.trim() ?? '';
          return playerId ? [{ importedName: link.importedName, playerId }] : [];
        })
      : [],
    endgameScreenshot,
    exportedGameLog: exportedGameLog.trim(),
    generationCount,
    mapId,
    participants: participantsText,
    playedOn,
    playerCount,
    scoringCardList,
  });
}

<div className="flex flex-col gap-2">
  <StepHeading step="03B" title="Scoring Card List (Optional)" />
  <textarea
    aria-label="Scoring Card List"
    className="tm-input min-h-24"
    onChange={(event) => setScoringCardList(event.target.value)}
    placeholder="Paste one scoring card name per line for the whole game."
    value={scoringCardList}
  />
</div>
```

```ts
// src/app/(app)/log-game/import/page.tsx
async function handleSaveCardScoringRuleCorrection(input: {
  cardId: string;
  cardName: string;
  rule: CardScoringRulePayload;
}) {
  'use server';

  const activeSupabase = await createSupabaseServerClient();
  const {
    data: { user: activeUser },
    error,
  } = await activeSupabase.auth.getUser();

  if (error) throw error;
  if (!activeUser) throw new Error('Sign in again before correcting a scoring rule.');

  const cachedRule = await getCardScoringRuleCache(input.cardId);
  const humanSummary = describeCardScoringRule(input.rule);

  await saveUserCorrectedCardScoringRule({
    cardId: input.cardId,
    correctedByUserId: activeUser.id,
    humanSummary,
    originalSourceType: cachedRule?.sourceType ?? null,
    rulePayload: input.rule,
  });

  return {
    humanSummary,
    status: 'success' as const,
  };
}
```

- [ ] **Step 6: Re-run the shared UI and web-import tests**

Run: `npm.cmd run test -- src/features/imports/card-scoring-rule-editor.test.tsx src/features/imports/import-pasted-scoring-card-panel.test.tsx src/features/imports/web-import-page.test.tsx src/features/imports/import-review-panel.test.tsx`
Expected: `PASS` with the new textarea, shared pasted-card review rows, and `Fix rule` action wiring.

- [ ] **Step 7: Commit the shared web review experience**

```bash
git add src/features/imports/card-scoring-rule-editor.tsx src/features/imports/card-scoring-rule-editor.test.tsx src/features/imports/import-pasted-scoring-card-panel.tsx src/features/imports/import-pasted-scoring-card-panel.test.tsx src/features/imports/import-review-panel.tsx src/features/imports/web-import-page.tsx src/features/imports/web-import-page.test.tsx src/app/"(app)"/log-game/import/page.tsx
git commit -m "feat: review pasted scoring cards during web import"
```

### Task 6: Surface The Same Saved Review And `Fix rule` Flow In App Review

**Files:**
- Modify: `src/app/(app)/log-game/review/page.tsx`
- Modify: `src/features/imports/import-evidence-summary.tsx`
- Create: `src/features/imports/import-saved-card-review-shell.tsx`
- Create: `src/features/imports/import-saved-card-review-shell.test.tsx`

- [ ] **Step 1: Write the failing app-review test for saved pasted-card review state**

```tsx
// src/features/imports/import-saved-card-review-shell.test.tsx
it('renders the saved pasted-card review in app review and forwards Fix rule', async () => {
  const user = userEvent.setup();
  const onSaveRuleCorrection = vi.fn().mockResolvedValue({
    humanSummary: '1 VP per 2 science tags you have',
    status: 'success',
  });

  render(
    <ImportSavedCardReviewShell
      onSaveRuleCorrection={onSaveRuleCorrection}
      review={{
        rawText: 'Research Outpost',
        rows: [
          {
            cardId: 'card-1',
            cardName: 'Research Outpost',
            lineId: 'line-1',
            originalText: 'Research Outpost',
            playerName: 'Izzy',
            reason: 'OCR found a plausible rule, but it still needs review.',
            ruleSource: 'ocr',
            status: 'needs_rule_review',
          },
        ],
      }}
    />,
  );

  expect(screen.getByText(/scoring card list review/i)).toBeInTheDocument();

  await user.click(
    screen.getByRole('button', { name: /fix rule research outpost/i }),
  );

  expect(
    await screen.findByRole('heading', { name: /fix rule - research outpost/i }),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the failing app-review tests**

Run: `npm.cmd run test -- src/features/imports/import-saved-card-review-shell.test.tsx`
Expected: `FAIL` because there is no app-side client wrapper that renders the shared pasted-card review yet.

- [ ] **Step 3: Build the app-side saved-review wrapper using the same shared panel and editor**

```tsx
// src/features/imports/import-saved-card-review-shell.tsx
'use client';

export function ImportSavedCardReviewShell(input: {
  onSaveRuleCorrection: (payload: {
    cardId: string;
    cardName: string;
    rule: CardScoringRulePayload;
  }) => Promise<{ humanSummary: string; status: 'success' }>;
  review: {
    rawText: string;
    rows: ImportPastedScoringCardReviewRow[];
  } | null | undefined;
}) {
  const [editingRow, setEditingRow] =
    useState<ImportPastedScoringCardReviewRow | null>(null);

  if (!input.review || input.review.rows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <ImportPastedScoringCardPanel
        onFixRule={setEditingRow}
        review={input.review}
      />
      {editingRow?.cardId ? (
        <CardScoringRuleEditor
          cardName={editingRow.cardName ?? editingRow.originalText}
          initialValue={null}
          onCancel={() => setEditingRow(null)}
          onSave={async (rule) => {
            await input.onSaveRuleCorrection({
              cardId: editingRow.cardId!,
              cardName: editingRow.cardName ?? editingRow.originalText,
              rule,
            });
            setEditingRow(null);
          }}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Load the saved review snapshot in app review and render it above the draft wizard**

```tsx
// src/app/(app)/log-game/review/page.tsx
import { getLatestGameLogImportDetail } from '@/lib/db/game-import-repo';
import { ImportSavedCardReviewShell } from '@/features/imports/import-saved-card-review-shell';

const importDetail =
  savedDraft && draftGameId
    ? await getLatestGameLogImportDetail({ gameId: draftGameId })
    : null;

async function handleSaveImportRuleCorrection(input: {
  cardId: string;
  cardName: string;
  rule: CardScoringRulePayload;
}) {
  'use server';

  const activeContext = await requireCurrentGroupContext();
  const cachedRule = await getCardScoringRuleCache(input.cardId);
  const humanSummary = describeCardScoringRule(input.rule);

  await saveUserCorrectedCardScoringRule({
    cardId: input.cardId,
    correctedByUserId: activeContext.userId,
    humanSummary,
    originalSourceType: cachedRule?.sourceType ?? null,
    rulePayload: input.rule,
  });

  revalidatePath('/log-game/review');

  return {
    humanSummary,
    status: 'success' as const,
  };
}

{importDetail?.reviewPayload.pastedScoringCards ? (
  <ImportSavedCardReviewShell
    onSaveRuleCorrection={handleSaveImportRuleCorrection}
    review={importDetail.reviewPayload.pastedScoringCards}
  />
) : null}
```

- [ ] **Step 5: Re-run the app-review tests**

Run: `npm.cmd run test -- src/features/imports/import-saved-card-review-shell.test.tsx src/app/(app)/log-game/import/page.test.tsx`
Expected: `PASS` with the same `Fix rule` flow available in app review.

- [ ] **Step 6: Commit the app-review surface**

```bash
git add src/app/"(app)"/log-game/review/page.tsx src/features/imports/import-evidence-summary.tsx src/features/imports/import-saved-card-review-shell.tsx src/features/imports/import-saved-card-review-shell.test.tsx
git commit -m "feat: show saved scoring card review in app draft review"
```

### Task 7: Run Full Focused Verification And Regression Checks

**Files:**
- Modify: `src/features/imports/import-review-panel.tsx`
- Modify: `src/features/imports/web-import-page.tsx`
- Modify: `src/app/(app)/log-game/import/page.tsx`
- Modify: `src/app/(app)/log-game/review/page.tsx`

- [ ] **Step 1: Run the full focused test sweep across the touched import and scoring surfaces**

Run:

```bash
npm.cmd run test -- src/lib/db/game-import-repo.test.ts src/lib/db/card-scoring-rule-cache-repo.test.ts src/lib/imports/pasted-scoring-card-list.test.ts src/lib/imports/build-pasted-scoring-card-review.test.ts src/lib/imports/import-draft-form-data.test.ts src/lib/imports/build-import-review-model.test.ts src/lib/imports/card-scoring/parse-ocr-card-rule.test.ts src/lib/imports/card-scoring/resolve-card-scoring-rule.test.ts src/lib/imports/card-scoring/calculate-import-card-scores.test.ts src/features/imports/card-scoring-rule-editor.test.tsx src/features/imports/import-pasted-scoring-card-panel.test.tsx src/features/imports/import-review-panel.test.tsx src/features/imports/web-import-page.test.tsx src/features/imports/import-saved-card-review-shell.test.tsx src/app/(app)/log-game/import/page.test.tsx
```

Expected: `PASS` across the new pasted-card review flow and the older hybrid card-scoring behavior.

- [ ] **Step 2: Run TypeScript verification**

Run: `npx.cmd tsc --noEmit --pretty false`
Expected: no TypeScript errors.

- [ ] **Step 3: Run focused lint on the touched files**

Run:

```bash
npx.cmd next lint --file "src/app/(app)/log-game/import/page.tsx" --file "src/app/(app)/log-game/review/page.tsx" --file "src/features/imports/web-import-page.tsx" --file "src/features/imports/import-review-panel.tsx" --file "src/features/imports/import-pasted-scoring-card-panel.tsx" --file "src/features/imports/card-scoring-rule-editor.tsx" --file "src/features/imports/import-saved-card-review-shell.tsx" --file "src/lib/imports/build-pasted-scoring-card-review.ts" --file "src/lib/imports/import-draft-form-data.ts" --file "src/lib/imports/build-import-review-model.ts" --file "src/lib/imports/card-scoring/resolve-card-scoring-rule.ts"
```

Expected: no lint errors or warnings in the touched import-review surfaces.

- [ ] **Step 4: Commit the final verification sweep**

```bash
git add src/app/"(app)"/log-game/import/page.tsx src/app/"(app)"/log-game/review/page.tsx src/features/imports/web-import-page.tsx src/features/imports/import-review-panel.tsx src/features/imports/import-pasted-scoring-card-panel.tsx src/features/imports/card-scoring-rule-editor.tsx src/features/imports/import-saved-card-review-shell.tsx src/lib/imports/build-pasted-scoring-card-review.ts src/lib/imports/build-import-review-model.ts src/lib/imports/card-scoring/resolve-card-scoring-rule.ts
git commit -m "test: verify pasted scoring card import review flow"
```

## Self-Review

### Spec Coverage

- Optional flat whole-game pasted card list is covered by Task 4 form-data and page wiring plus Task 5 web UI.
- Exact log-based owner assignment and no-guess behavior are covered by Task 2.
- OCR reuse with `>= 0.85` auto-save only, and review-only `no scoring`, are covered by Task 3.
- Global user-corrected reusable rules for any signed-in user are covered by Task 3 cache changes plus Task 5 and Task 6 server actions.
- Shared review payload between website and app is covered by Task 1 persisted review snapshots and Task 6 app loading.
- Same `Fix rule` flow on website import and in app review is covered by Task 5 and Task 6.
- Persisting raw pasted-card evidence and structured review state is covered by Task 1 and Task 4.
- Preserving existing screenshot-assisted and hybrid scoring behavior when the new textarea is blank is covered by Task 4 scorer filtering and Task 7 regression tests.

### Placeholder Scan

- No `TODO`, `TBD`, or `implement later` placeholders remain.
- Every task names exact files, focused commands, and concrete code snippets.
- Verification commands are explicit and scoped to the actual touched surfaces.

### Type Consistency

- Rule source types consistently use `curated`, `ocr`, and `user_corrected`.
- Pasted-card row states consistently use `resolved`, `needs_owner_review`, `needs_rule_review`, `needs_card_match_review`, `needs_duplicate_review`, `auto_saved_new_rule`, and `user_corrected_rule`.
- The saved import JSON payload consistently uses `supplementalEvidence.scoringCardListRawText` and `reviewPayload.pastedScoringCards`.
- The scorer's optional filtering input consistently uses `requestedCards`.
