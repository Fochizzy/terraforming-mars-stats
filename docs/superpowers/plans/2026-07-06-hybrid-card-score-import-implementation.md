# Hybrid Card Score Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Terraforming Mars web import flow so pasted logs plus screenshots can auto-calculate supported endgame card VP with curated rules first, OCR-derived card-rule parsing as a fallback, and explicit review for any partial or ambiguous card.

**Architecture:** Build on the existing `/log-game/import` route, `src/features/imports`, and `src/lib/imports` pipeline instead of replacing it. Split the work into additive schema support for multiple screenshot evidence rows plus OCR-rule caching, a curated-first card rule resolver, conservative evidence derivation from parsed log events and screenshots, and a new review surface that shows resolved card points separately from unresolved cards before the draft is confirmed. Keep `LogGameDraftInput` and the existing finalize flow as the only path into saved scoring so imported evidence enriches the current draft instead of bypassing it.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase Postgres/Storage, server actions, Zod, Sharp, `tesseract.js`, Vitest, React Testing Library

---

## Planned File Structure

- `supabase/migrations/20260706153000_support_hybrid_card_score_imports.sql`: allow multiple screenshot evidence rows per import and add OCR card-rule cache storage
- `src/lib/db/game-import-repo.ts`: persist multiple screenshot evidence rows and read them back for review
- `src/lib/db/game-import-repo.test.ts`: repository tests for multi-screenshot import persistence
- `src/lib/db/card-scoring-rule-cache-repo.ts`: curated/OCR rule cache reads and writes keyed by card id
- `src/lib/db/card-scoring-rule-cache-repo.test.ts`: cache repository tests
- `src/lib/db/reference-repo.ts`: expose card-scoring references with image URLs and metadata needed by the scorer
- `src/lib/imports/import-draft-form-data.ts`: parse endgame screenshot plus repeated board screenshot fields
- `src/lib/imports/import-draft-form-data.test.ts`: form-data tests for repeated board screenshot uploads
- `src/features/imports/web-import-page.tsx`: collect board screenshots separately from the endgame score screenshot
- `src/features/imports/web-import-page.test.tsx`: UI tests for the extra screenshot evidence path
- `src/app/(app)/log-game/import/page.tsx`: orchestrate screenshot OCR, rule resolution, scoring, review, caching, and draft save
- `src/lib/imports/card-scoring/curated-card-scoring-rules.ts`: trusted in-repo scoring rules for known cards
- `src/lib/imports/card-scoring/parse-ocr-card-rule.ts`: normalize OCR card text into a structured VP rule when possible
- `src/lib/imports/card-scoring/resolve-card-scoring-rule.ts`: curated-first, cached-OCR-second rule resolution
- `src/lib/imports/card-scoring/resolve-card-scoring-rule.test.ts`: resolver tests proving curated rules win and OCR only fills gaps
- `src/lib/imports/card-scoring/read-board-state-screenshot.ts`: conservative OCR text extraction for board screenshots
- `src/lib/imports/card-scoring/read-board-state-screenshot.test.ts`: board screenshot OCR adapter tests
- `src/lib/imports/card-scoring/derive-card-score-evidence.ts`: convert parsed log events, card metadata, and screenshot OCR into per-card evidence
- `src/lib/imports/card-scoring/derive-card-score-evidence.test.ts`: evidence-derivation tests for resources, tags, and review-only board hints
- `src/lib/imports/card-scoring/score-card-from-evidence.ts`: evaluate one card against one resolved rule and return `scored`, `partial`, `ambiguous`, or `unsupported`
- `src/lib/imports/card-scoring/score-card-from-evidence.test.ts`: card evaluator tests
- `src/lib/imports/card-scoring/calculate-import-card-scores.ts`: per-player scoring orchestrator plus cache reuse
- `src/lib/imports/card-scoring/calculate-import-card-scores.test.ts`: integration-style scorer tests
- `src/lib/imports/build-import-review-model.ts`: add calculated card scoring output and review reasons to the review payload
- `src/lib/imports/build-import-review-model.test.ts`: review-model tests for resolved and unresolved card scoring
- `src/lib/imports/build-import-draft.ts`: merge high-confidence card scoring into `playerScores` without inventing missing totals
- `src/lib/imports/build-import-draft.test.ts`: draft-prefill tests for high-confidence card scores
- `src/features/imports/import-review-panel.tsx`: existing review shell that will now include card-score review
- `src/features/imports/import-card-scoring-panel.tsx`: grouped UI for auto-scored, pending, and unsupported cards
- `src/features/imports/import-card-scoring-panel.test.tsx`: card-scoring review UI tests

## Delivery Strategy

The current repo already parses played cards, tile placements, and resource changes, and it already accepts one endgame screenshot aimed at score-row OCR. This plan keeps those strengths and adds the new behavior in thin layers:

1. fix the schema and repository contracts so imports can store separate endgame and board screenshots and cache OCR-derived card rules
2. teach the import form and server action to carry repeated board screenshots through the same review flow
3. add a curated-first rule resolver with a card-id cache for OCR-derived rules
4. derive conservative per-card evidence from parsed log events and screenshot OCR
5. score only the cards the system can justify, and route the rest into review
6. show the calculated card-scoring review clearly before the draft is confirmed

The first implementation should prioritize deterministic, log-friendly VP rules such as resources-on-card and tag-count formulas. Board-dependent and opponent-dependent cards should only auto-fill when the rule and evidence are both strong enough; otherwise they remain review items with explicit reasons.

### Task 1: Add Multi-Screenshot Import Storage And OCR Rule Cache

**Files:**
- Create: `supabase/migrations/20260706153000_support_hybrid_card_score_imports.sql`
- Modify: `src/lib/db/game-import-repo.ts`
- Modify: `src/lib/db/game-import-repo.test.ts`
- Create: `src/lib/db/card-scoring-rule-cache-repo.ts`
- Create: `src/lib/db/card-scoring-rule-cache-repo.test.ts`

- [ ] **Step 1: Write the failing repository tests for repeated screenshot evidence and cache upserts**

```ts
// src/lib/db/game-import-repo.test.ts
it('stores separate endgame and board screenshot rows for one import', async () => {
  const screenshotInsert = vi.fn().mockReturnThis();
  const screenshotSelect = vi.fn().mockReturnThis();
  const screenshotSingle = vi
    .fn()
    .mockResolvedValueOnce({ data: { id: 'screen-1' }, error: null })
    .mockResolvedValueOnce({ data: { id: 'screen-2' }, error: null });

  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === 'game_log_imports') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'import-1' }, error: null }),
        };
      }

      if (table === 'game_result_screenshot_imports') {
        return {
          insert: screenshotInsert,
          select: screenshotSelect,
          single: screenshotSingle,
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    storage: {
      from: vi.fn(() => ({ upload: vi.fn().mockResolvedValue({ data: { path: 'ok' }, error: null }) })),
    },
  } as never);

  await saveGameLogImport({
    gameId: 'game-1',
    rawLogText: 'Friday Mars played Tardigrades',
    screenshots: [
      {
        file: new File(['endgame'], 'endgame.png', { type: 'image/png' }),
        kind: 'endgame_score',
        parse: { parseStatus: 'parsed' },
      },
      {
        file: new File(['board'], 'board.png', { type: 'image/png' }),
        kind: 'board_state',
        parse: { parseStatus: 'parsed' },
      },
    ],
    userId: 'user-1',
  });

  expect(screenshotInsert).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      evidence_kind: 'endgame_score',
      display_order: 0,
    }),
  );
  expect(screenshotInsert).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      evidence_kind: 'board_state',
      display_order: 0,
    }),
  );
});
```

```ts
// src/lib/db/card-scoring-rule-cache-repo.test.ts
it('upserts OCR-derived rules by card id', async () => {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue({
    data: {
      card_id: 'card-1',
      confidence: 0.92,
      human_summary: '1 VP per science tag',
      rule_payload: { mode: 'tag_count', pointsPerTag: 1, scope: 'self', tag: 'science' },
      source_type: 'ocr',
    },
    error: null,
  });

  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    from: vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
      select: vi.fn().mockReturnThis(),
      upsert,
    })),
  } as never);

  await upsertCardScoringRuleCache({
    cardId: 'card-1',
    confidence: 0.92,
    humanSummary: '1 VP per science tag',
    rulePayload: { mode: 'tag_count', pointsPerTag: 1, scope: 'self', tag: 'science' },
    sourceType: 'ocr',
  });

  expect(await getCardScoringRuleCache('card-1')).toMatchObject({
    cardId: 'card-1',
    sourceType: 'ocr',
  });
});
```

- [ ] **Step 2: Run the tests to verify the current repo cannot store multiple screenshots or cache rules yet**

Run: `npm.cmd run test -- src/lib/db/game-import-repo.test.ts src/lib/db/card-scoring-rule-cache-repo.test.ts`
Expected: `FAIL` because `saveGameLogImport` only accepts a single `screenshotFile` today and `card-scoring-rule-cache-repo.ts` does not exist.

- [ ] **Step 3: Add the migration for repeated screenshot evidence and OCR rule caching**

```sql
-- supabase/migrations/20260706153000_support_hybrid_card_score_imports.sql
alter table public.game_result_screenshot_imports
drop constraint if exists game_result_screenshot_imports_import_id_unique;

alter table public.game_result_screenshot_imports
add column if not exists evidence_kind text not null default 'endgame_score',
add column if not exists display_order integer not null default 0;

alter table public.game_result_screenshot_imports
drop constraint if exists game_result_screenshot_imports_evidence_kind_check;

alter table public.game_result_screenshot_imports
add constraint game_result_screenshot_imports_evidence_kind_check
check (evidence_kind in ('endgame_score', 'board_state'));

create unique index if not exists game_result_screenshot_imports_import_kind_order_idx
on public.game_result_screenshot_imports (game_log_import_id, evidence_kind, display_order);

create table if not exists public.card_scoring_rule_cache (
  card_id uuid primary key references public.cards(id) on delete cascade,
  source_type text not null check (source_type in ('curated', 'ocr')),
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1),
  human_summary text not null,
  rule_payload jsonb not null default '{}'::jsonb,
  ocr_engine_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.card_scoring_rule_cache enable row level security;

create policy "authenticated users read card scoring rule cache"
on public.card_scoring_rule_cache for select
to authenticated
using (true);

create policy "authenticated users manage card scoring rule cache"
on public.card_scoring_rule_cache for all
to authenticated
using (true)
with check (true);
```

- [ ] **Step 4: Refactor the repositories to use repeated screenshot inputs and a dedicated cache repo**

```ts
// src/lib/db/game-import-repo.ts
export type SaveImportScreenshotInput = {
  file: File;
  kind: 'board_state' | 'endgame_score';
  parse?: SaveGameLogScreenshotParseInput;
};

export async function saveGameLogImport(input: {
  gameId: string;
  logParseSummary?: {
    contextLineCount: number;
    drawInfoLineCount: number;
    ignoredLineCount: number;
    parsedEventCount: number;
  };
  rawLogText: string;
  screenshots: SaveImportScreenshotInput[];
  userId: string;
}) {
  // keep the raw import insert first, then upload and insert each screenshot row
}
```

```ts
// src/lib/db/card-scoring-rule-cache-repo.ts
export async function getCardScoringRuleCache(cardId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('card_scoring_rule_cache')
    .select('card_id, confidence, human_summary, ocr_engine_version, rule_payload, source_type')
    .eq('card_id', cardId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    cardId: data.card_id,
    confidence: Number(data.confidence),
    humanSummary: data.human_summary,
    ocrEngineVersion: data.ocr_engine_version ?? null,
    rulePayload: data.rule_payload ?? {},
    sourceType: data.source_type as 'curated' | 'ocr',
  };
}

export async function upsertCardScoringRuleCache(input: {
  cardId: string;
  confidence: number;
  humanSummary: string;
  ocrEngineVersion?: string | null;
  rulePayload: Record<string, unknown>;
  sourceType: 'curated' | 'ocr';
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('card_scoring_rule_cache').upsert({
    card_id: input.cardId,
    confidence: input.confidence,
    human_summary: input.humanSummary,
    ocr_engine_version: input.ocrEngineVersion ?? null,
    rule_payload: input.rulePayload,
    source_type: input.sourceType,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}
```

- [ ] **Step 5: Run the focused repo tests and verify the migration shape**

Run: `npm.cmd run test -- src/lib/db/game-import-repo.test.ts src/lib/db/card-scoring-rule-cache-repo.test.ts`
Expected: `PASS` with separate screenshot rows and cache reads/writes.

Run: `npx.cmd supabase db reset --local`
Expected: local reset succeeds with the new screenshot and cache migration in place.

- [ ] **Step 6: Commit the persistence layer**

```bash
git add supabase/migrations/20260706153000_support_hybrid_card_score_imports.sql src/lib/db/game-import-repo.ts src/lib/db/game-import-repo.test.ts src/lib/db/card-scoring-rule-cache-repo.ts src/lib/db/card-scoring-rule-cache-repo.test.ts
git commit -m "feat: persist board screenshots and card rule cache"
```

### Task 2: Add Board Screenshot Inputs To The Web Import Form

**Files:**
- Modify: `src/lib/imports/import-draft-form-data.ts`
- Create: `src/lib/imports/import-draft-form-data.test.ts`
- Modify: `src/features/imports/web-import-page.tsx`
- Modify: `src/features/imports/web-import-page.test.tsx`
- Modify: `src/app/(app)/log-game/import/page.tsx`

- [ ] **Step 1: Write the failing form-data and page tests for repeated board screenshots**

```ts
// src/lib/imports/import-draft-form-data.test.ts
import { describe, expect, it } from 'vitest';
import {
  buildCreateImportDraftFormData,
  parseCreateImportDraftFormData,
} from './import-draft-form-data';

describe('import-draft-form-data', () => {
  it('round-trips repeated board screenshots separately from the endgame screenshot', () => {
    const formData = buildCreateImportDraftFormData({
      boardScreenshots: [
        new File(['board-a'], 'board-a.png', { type: 'image/png' }),
        new File(['board-b'], 'board-b.png', { type: 'image/png' }),
      ],
      confirmedPlayerLinks: [],
      endgameScreenshot: new File(['endgame'], 'endgame.png', { type: 'image/png' }),
      exportedGameLog: 'Friday Mars played Tardigrades',
      generationCount: 12,
      mapId: 'tharsis',
      participants: 'Friday Mars',
      playedOn: '2026-07-06',
      playerCount: 1,
    });

    const parsed = parseCreateImportDraftFormData(formData);

    expect(parsed.endgameScreenshot?.name).toBe('endgame.png');
    expect(parsed.boardScreenshots.map((file) => file.name)).toEqual([
      'board-a.png',
      'board-b.png',
    ]);
  });
});
```

```ts
// src/features/imports/web-import-page.test.tsx
it('submits board screenshots separately from the endgame screenshot', async () => {
  const user = userEvent.setup();
  const onAnalyzeImportEvidence = vi.fn().mockResolvedValue({
    message: 'Import evidence analyzed.',
    review: null,
    status: 'success' as const,
  });

  render(<WebImportPage ... onAnalyzeImportEvidence={onAnalyzeImportEvidence} />);

  const endgameScreenshot = new File(['endgame'], 'endgame.png', { type: 'image/png' });
  const boardScreenshot = new File(['board'], 'board.png', { type: 'image/png' });

  await user.upload(screen.getByLabelText(/endgame screenshot/i), endgameScreenshot);
  await user.upload(screen.getByLabelText(/board screenshots/i), [boardScreenshot]);
  await user.click(screen.getByRole('button', { name: /analyze import evidence/i }));

  const formData = onAnalyzeImportEvidence.mock.calls[0]?.[0] as FormData;
  expect(formData.get('endgameScreenshot')).toBe(endgameScreenshot);
  expect(formData.getAll('boardScreenshots')).toEqual([boardScreenshot]);
});
```

- [ ] **Step 2: Run the tests to confirm the current form only supports one screenshot**

Run: `npm.cmd run test -- src/lib/imports/import-draft-form-data.test.ts src/features/imports/web-import-page.test.tsx`
Expected: `FAIL` because `CreateImportDraftFormValues` and the page only know about `endgameScreenshot`.

- [ ] **Step 3: Extend the form-data parser and the import page UI**

```ts
// src/lib/imports/import-draft-form-data.ts
export type CreateImportDraftFormValues = {
  boardScreenshots: File[];
  confirmedPlayerLinks?: Array<{
    importedName: string;
    playerId: string;
  }>;
  endgameScreenshot: File | null;
  exportedGameLog: string;
  generationCount: number;
  mapId: string;
  participants: string;
  playedOn: string;
  playerCount: number;
};

function readOptionalFilesField(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File)
    .filter((file) => file.size > 0 || file.name.length > 0);
}

export function buildCreateImportDraftFormData(values: CreateImportDraftFormValues) {
  const formData = new FormData();
  // existing fields...
  values.boardScreenshots.forEach((file) => formData.append('boardScreenshots', file));
  if (values.endgameScreenshot) {
    formData.set('endgameScreenshot', values.endgameScreenshot);
  }
  return formData;
}

export function parseCreateImportDraftFormData(formData: FormData): CreateImportDraftInput {
  const endgameScreenshot = readOptionalFileField(formData, 'endgameScreenshot');
  return {
    boardScreenshots: readOptionalFilesField(formData, 'boardScreenshots'),
    confirmedPlayerLinks: readConfirmedPlayerLinks(formData),
    endgameScreenshot,
    endgameScreenshotName: endgameScreenshot?.name ?? null,
    exportedGameLog: readTextField(formData, 'exportedGameLog'),
    generationCount: readIntegerField(formData, 'generationCount'),
    mapId: readTextField(formData, 'mapId'),
    participantNames: parseImportParticipants(readTextField(formData, 'participants')),
    playedOn: readTextField(formData, 'playedOn'),
    playerCount: readIntegerField(formData, 'playerCount'),
  };
}
```

```tsx
// src/features/imports/web-import-page.tsx
const [boardScreenshots, setBoardScreenshots] = useState<File[]>([]);

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
  });
}
```

- [ ] **Step 4: Thread the new board screenshot list through the server action**

```ts
// src/app/(app)/log-game/import/page.tsx
const screenshotUploads = [
  ...(values.endgameScreenshot
    ? [{ file: values.endgameScreenshot, kind: 'endgame_score' as const }]
    : []),
  ...values.boardScreenshots.map((file) => ({
    file,
    kind: 'board_state' as const,
  })),
];
```

- [ ] **Step 5: Verify the new screenshot inputs**

Run: `npm.cmd run test -- src/lib/imports/import-draft-form-data.test.ts src/features/imports/web-import-page.test.tsx`
Expected: `PASS` with repeated `boardScreenshots` fields preserved through submit and parse.

- [ ] **Step 6: Commit the import-form changes**

```bash
git add src/lib/imports/import-draft-form-data.ts src/lib/imports/import-draft-form-data.test.ts src/features/imports/web-import-page.tsx src/features/imports/web-import-page.test.tsx src/app/"(app)"/log-game/import/page.tsx
git commit -m "feat: accept board screenshots in web import"
```

### Task 3: Add Curated-First Rule Resolution With OCR Fallback

**Files:**
- Modify: `src/lib/db/reference-repo.ts`
- Create: `src/lib/imports/card-scoring/curated-card-scoring-rules.ts`
- Create: `src/lib/imports/card-scoring/parse-ocr-card-rule.ts`
- Create: `src/lib/imports/card-scoring/resolve-card-scoring-rule.ts`
- Create: `src/lib/imports/card-scoring/resolve-card-scoring-rule.test.ts`

- [ ] **Step 1: Write the failing resolver tests for curated-first and cached-OCR behavior**

```ts
// src/lib/imports/card-scoring/resolve-card-scoring-rule.test.ts
import { describe, expect, it, vi } from 'vitest';
import { resolveCardScoringRule } from './resolve-card-scoring-rule';

describe('resolveCardScoringRule', () => {
  it('prefers curated rules over OCR for known cards', async () => {
    const ocrReader = vi.fn();

    const resolved = await resolveCardScoringRule({
      card: {
        cardName: 'Tardigrades',
        fullImageUrl: 'https://example.com/tardigrades.png',
        id: 'card-1',
        syncMetadata: {},
      },
      ocrReader,
    });

    expect(resolved).toMatchObject({
      source: 'curated',
      status: 'resolved',
    });
    expect(ocrReader).not.toHaveBeenCalled();
  });

  it('reuses cached OCR rules before re-reading the card image', async () => {
    const ocrReader = vi.fn();
    const resolved = await resolveCardScoringRule({
      card: {
        cardName: 'Mass Converter',
        fullImageUrl: 'https://example.com/mass-converter.png',
        id: 'card-2',
        syncMetadata: {},
      },
      getCachedRule: vi.fn().mockResolvedValue({
        cardId: 'card-2',
        confidence: 0.93,
        humanSummary: '1 VP per science tag',
        rulePayload: { mode: 'tag_count', pointsPerTag: 1, scope: 'self', tag: 'science' },
        sourceType: 'ocr',
      }),
      ocrReader,
    });

    expect(resolved).toMatchObject({
      source: 'cache',
      status: 'resolved',
    });
    expect(ocrReader).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests before the rule resolver exists**

Run: `npm.cmd run test -- src/lib/imports/card-scoring/resolve-card-scoring-rule.test.ts`
Expected: `FAIL` because the curated rules file, OCR parser, and resolver do not exist.

- [ ] **Step 3: Expose card-scoring references and add the curated rule registry**

```ts
// src/lib/db/reference-repo.ts
export type CardScoringReference = {
  cardName: string;
  fullImageUrl: string;
  id: string;
  syncMetadata: Record<string, unknown>;
};

export async function listCardScoringReferences(): Promise<CardScoringReference[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('cards')
    .select('id, card_name, image_url, full_image_path, sync_metadata')
    .eq('card_type', 'Project')
    .order('card_name');

  if (error) throw error;

  return data.map((card) => ({
    cardName: card.card_name,
    fullImageUrl: card.full_image_path ?? card.image_url,
    id: card.id,
    syncMetadata:
      card.sync_metadata && typeof card.sync_metadata === 'object'
        ? (card.sync_metadata as Record<string, unknown>)
        : {},
  }));
}
```

```ts
// src/lib/imports/card-scoring/curated-card-scoring-rules.ts
export type CardScoringRule =
  | {
      mode: 'resource_per';
      outputField: 'cardPointsAnimals' | 'cardPointsMicrobes';
      pointsPerUnit: number;
      resourceType: 'animal' | 'microbe';
      scope: 'self_card';
      unitsPerPoint: number;
    }
  | {
      mode: 'tag_count';
      outputField: 'cardPointsJovian' | 'cardPointsTotal';
      pointsPerTag: number;
      scope: 'self';
      tag: 'jovian' | 'science';
    };

export const curatedCardScoringRules: Record<string, CardScoringRule> = {
  Tardigrades: {
    mode: 'resource_per',
    outputField: 'cardPointsMicrobes',
    pointsPerUnit: 1,
    resourceType: 'microbe',
    scope: 'self_card',
    unitsPerPoint: 1,
  },
  Livestock: {
    mode: 'resource_per',
    outputField: 'cardPointsAnimals',
    pointsPerUnit: 1,
    resourceType: 'animal',
    scope: 'self_card',
    unitsPerPoint: 1,
  },
  'Mass Converter': {
    mode: 'tag_count',
    outputField: 'cardPointsTotal',
    pointsPerTag: 1,
    scope: 'self',
    tag: 'science',
  },
};
```

- [ ] **Step 4: Implement OCR rule parsing and the curated-first resolver**

```ts
// src/lib/imports/card-scoring/parse-ocr-card-rule.ts
import type { CardScoringRule } from './curated-card-scoring-rules';

export function parseOcrCardRule(lines: string[]) {
  const normalized = lines.join(' ').replace(/\s+/g, ' ').trim().toLowerCase();

  const scienceMatch = normalized.match(/(?<points>\d+) vp? per science tag/);
  if (scienceMatch?.groups?.points) {
    const pointsPerTag = Number(scienceMatch.groups.points);
    const rule: CardScoringRule = {
      mode: 'tag_count',
      outputField: 'cardPointsTotal',
      pointsPerTag,
      scope: 'self',
      tag: 'science',
    };

    return {
      confidence: 0.9,
      humanSummary: `${pointsPerTag} VP per science tag`,
      rule,
      status: 'resolved' as const,
    };
  }

  return {
    confidence: 0,
    humanSummary: 'Unable to normalize a trusted VP formula from OCR text.',
    status: 'unsupported' as const,
  };
}
```

```ts
// src/lib/imports/card-scoring/resolve-card-scoring-rule.ts
import { getCardScoringRuleCache, upsertCardScoringRuleCache } from '@/lib/db/card-scoring-rule-cache-repo';
import { curatedCardScoringRules } from './curated-card-scoring-rules';
import { parseOcrCardRule } from './parse-ocr-card-rule';

export async function resolveCardScoringRule(input: {
  card: {
    cardName: string;
    fullImageUrl: string;
    id: string;
    syncMetadata: Record<string, unknown>;
  };
  getCachedRule?: typeof getCardScoringRuleCache;
  ocrReader?: (fullImageUrl: string) => Promise<string[]>;
  saveCachedRule?: typeof upsertCardScoringRuleCache;
}) {
  const curatedRule = curatedCardScoringRules[input.card.cardName];
  if (curatedRule) {
    return { rule: curatedRule, source: 'curated' as const, status: 'resolved' as const };
  }

  const cachedRule = await (input.getCachedRule ?? getCardScoringRuleCache)(input.card.id);
  if (cachedRule && cachedRule.confidence >= 0.85) {
    return {
      rule: cachedRule.rulePayload,
      source: 'cache' as const,
      status: 'resolved' as const,
    };
  }

  if (!input.ocrReader) {
    return {
      humanSummary: 'No OCR reader available for this card.',
      source: 'none' as const,
      status: 'unsupported' as const,
    };
  }

  const parsedRule = parseOcrCardRule(await input.ocrReader(input.card.fullImageUrl));
  if (parsedRule.status === 'resolved') {
    await (input.saveCachedRule ?? upsertCardScoringRuleCache)({
      cardId: input.card.id,
      confidence: parsedRule.confidence,
      humanSummary: parsedRule.humanSummary,
      rulePayload: parsedRule.rule,
      sourceType: 'ocr',
    });
  }

  return {
    ...parsedRule,
    source: 'ocr' as const,
  };
}
```

- [ ] **Step 5: Verify curated-first resolution**

Run: `npm.cmd run test -- src/lib/imports/card-scoring/resolve-card-scoring-rule.test.ts`
Expected: `PASS` with curated rules bypassing OCR and cached OCR rules bypassing repeated image reads.

- [ ] **Step 6: Commit the rule resolver**

```bash
git add src/lib/db/reference-repo.ts src/lib/imports/card-scoring/curated-card-scoring-rules.ts src/lib/imports/card-scoring/parse-ocr-card-rule.ts src/lib/imports/card-scoring/resolve-card-scoring-rule.ts src/lib/imports/card-scoring/resolve-card-scoring-rule.test.ts
git commit -m "feat: add curated-first card rule resolution"
```

### Task 4: Derive Conservative Card Evidence From Parsed Logs And Board OCR

**Files:**
- Create: `src/lib/imports/card-scoring/read-board-state-screenshot.ts`
- Create: `src/lib/imports/card-scoring/read-board-state-screenshot.test.ts`
- Create: `src/lib/imports/card-scoring/derive-card-score-evidence.ts`
- Create: `src/lib/imports/card-scoring/derive-card-score-evidence.test.ts`

- [ ] **Step 1: Write the failing OCR adapter and evidence-derivation tests**

```ts
// src/lib/imports/card-scoring/derive-card-score-evidence.test.ts
import { describe, expect, it } from 'vitest';
import { deriveCardScoreEvidence } from './derive-card-score-evidence';

describe('deriveCardScoreEvidence', () => {
  it('counts tracked microbes on a played card from resource events', () => {
    const evidence = deriveCardScoreEvidence({
      boardScreenshotOcrLines: [],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Tardigrades',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Tardigrades',
        },
        {
          actor: 'Friday Mars',
          card: 'Tardigrades',
          eventType: 'resource_changed',
          lineNumber: 2,
          operation: 'added',
          rawLine: 'Friday Mars added 2 microbes to Tardigrades',
          resourceAmount: 2,
          resourceType: 'microbe',
        },
      ],
      playerLinks: [{ importedName: 'Friday Mars', playerId: 'player-1' }],
    });

    expect(evidence.playerEvidence['player-1']?.Tardigrades).toMatchObject({
      resourceCount: 2,
      resourceType: 'microbe',
    });
  });

  it('returns board OCR as review evidence when structured board state is still unknown', () => {
    const evidence = deriveCardScoreEvidence({
      boardScreenshotOcrLines: ['CITY 12', 'OCEAN 5', 'Friday Mars'],
      events: [],
      playerLinks: [{ importedName: 'Friday Mars', playerId: 'player-1' }],
    });

    expect(evidence.reviewHints).toContain('Board screenshot OCR captured 3 lines for manual review.');
  });
});
```

```ts
// src/lib/imports/card-scoring/read-board-state-screenshot.test.ts
import { describe, expect, it, vi } from 'vitest';
import * as Tesseract from 'tesseract.js';
import { readBoardStateScreenshot } from './read-board-state-screenshot';

it('normalizes OCR lines from a board screenshot', async () => {
  vi.spyOn(Tesseract, 'recognize').mockResolvedValue({
    data: { text: 'CITY 12\nOCEAN 5\nFriday Mars' },
  } as never);

  const lines = await readBoardStateScreenshot(
    new File(['board'], 'board.png', { type: 'image/png' }),
  );

  expect(lines).toEqual(['CITY 12', 'OCEAN 5', 'Friday Mars']);
});
```

- [ ] **Step 2: Run the tests before the board OCR helper and evidence layer exist**

Run: `npm.cmd run test -- src/lib/imports/card-scoring/read-board-state-screenshot.test.ts src/lib/imports/card-scoring/derive-card-score-evidence.test.ts`
Expected: `FAIL` because neither file exists yet.

- [ ] **Step 3: Implement the conservative board OCR reader**

```ts
// src/lib/imports/card-scoring/read-board-state-screenshot.ts
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

export async function readBoardStateScreenshot(file: File) {
  const imageBuffer = Buffer.from(await file.arrayBuffer());
  const normalizedImage = await sharp(imageBuffer).grayscale().normalize().png().toBuffer();
  const ocrResult = await Tesseract.recognize(normalizedImage, 'eng');

  return ocrResult.data.text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}
```

- [ ] **Step 4: Implement per-card evidence derivation from parsed events and board OCR text**

```ts
// src/lib/imports/card-scoring/derive-card-score-evidence.ts
import { normalizePlayerAlias } from '../normalize-player-alias';

export function deriveCardScoreEvidence(input: {
  boardScreenshotOcrLines: string[];
  events: Array<Record<string, unknown>>;
  playerLinks: Array<{ importedName: string; playerId: string }>;
}) {
  const playerIdByImportedName = new Map(
    input.playerLinks.map((link) => [normalizePlayerAlias(link.importedName), link.playerId]),
  );
  const playerEvidence: Record<string, Record<string, Record<string, unknown>>> = {};

  for (const event of input.events) {
    if (event.eventType !== 'resource_changed' || typeof event.actor !== 'string') {
      continue;
    }

    const playerId = playerIdByImportedName.get(normalizePlayerAlias(event.actor));
    if (!playerId || typeof event.card !== 'string') {
      continue;
    }

    const playerCardEvidence = playerEvidence[playerId] ?? {};
    const cardEvidence = playerCardEvidence[event.card] ?? {
      resourceCount: 0,
      resourceType: event.resourceType,
    };

    const delta =
      event.operation === 'removed'
        ? -Number(event.resourceAmount ?? 0)
        : Number(event.resourceAmount ?? 0);

    cardEvidence.resourceCount = Number(cardEvidence.resourceCount ?? 0) + delta;
    playerCardEvidence[event.card] = cardEvidence;
    playerEvidence[playerId] = playerCardEvidence;
  }

  return {
    playerEvidence,
    reviewHints:
      input.boardScreenshotOcrLines.length > 0
        ? [`Board screenshot OCR captured ${input.boardScreenshotOcrLines.length} lines for manual review.`]
        : [],
  };
}
```

- [ ] **Step 5: Verify the evidence layer**

Run: `npm.cmd run test -- src/lib/imports/card-scoring/read-board-state-screenshot.test.ts src/lib/imports/card-scoring/derive-card-score-evidence.test.ts`
Expected: `PASS` with resource totals derived from parsed events and board OCR stored as review-only hints.

- [ ] **Step 6: Commit the evidence layer**

```bash
git add src/lib/imports/card-scoring/read-board-state-screenshot.ts src/lib/imports/card-scoring/read-board-state-screenshot.test.ts src/lib/imports/card-scoring/derive-card-score-evidence.ts src/lib/imports/card-scoring/derive-card-score-evidence.test.ts
git commit -m "feat: derive conservative card evidence from logs and board OCR"
```

### Task 5: Score Cards And Merge High-Confidence Results Into Review And Drafts

**Files:**
- Create: `src/lib/imports/card-scoring/score-card-from-evidence.ts`
- Create: `src/lib/imports/card-scoring/score-card-from-evidence.test.ts`
- Create: `src/lib/imports/card-scoring/calculate-import-card-scores.ts`
- Create: `src/lib/imports/card-scoring/calculate-import-card-scores.test.ts`
- Modify: `src/lib/imports/build-import-review-model.ts`
- Modify: `src/lib/imports/build-import-review-model.test.ts`
- Modify: `src/lib/imports/build-import-draft.ts`
- Modify: `src/lib/imports/build-import-draft.test.ts`
- Modify: `src/app/(app)/log-game/import/page.tsx`

- [ ] **Step 1: Write the failing scoring and draft-merge tests**

```ts
// src/lib/imports/card-scoring/score-card-from-evidence.test.ts
import { describe, expect, it } from 'vitest';
import { scoreCardFromEvidence } from './score-card-from-evidence';

describe('scoreCardFromEvidence', () => {
  it('scores a microbe card when the rule and evidence are complete', () => {
    expect(
      scoreCardFromEvidence({
        cardEvidence: { resourceCount: 4, resourceType: 'microbe' },
        cardName: 'Tardigrades',
        rule: {
          mode: 'resource_per',
          outputField: 'cardPointsMicrobes',
          pointsPerUnit: 1,
          resourceType: 'microbe',
          scope: 'self_card',
          unitsPerPoint: 1,
        },
      }),
    ).toMatchObject({
      points: 4,
      status: 'scored',
    });
  });

  it('returns partial when a tag-count rule has no derived tag total', () => {
    expect(
      scoreCardFromEvidence({
        cardEvidence: {},
        cardName: 'Mass Converter',
        rule: {
          mode: 'tag_count',
          outputField: 'cardPointsTotal',
          pointsPerTag: 1,
          scope: 'self',
          tag: 'science',
        },
      }),
    ).toMatchObject({
      reason: 'Missing derived science tag count.',
      status: 'partial',
    });
  });
});
```

```ts
// src/lib/imports/build-import-draft.test.ts
it('prefills only the trusted subset of calculated card scores', () => {
  expect(
    buildImportDraft({
      defaultExpansionCodes: ['base'],
      defaultPromoSetSlugs: [],
      groupId: '11111111-1111-4111-8111-111111111111',
      importValues: {
        endgameScreenshotName: 'endgame.png',
        exportedGameLog: 'Friday Mars played Tardigrades',
        generationCount: 11,
        mapId: 'tharsis',
        participantNames: ['Friday Mars'],
        playedOn: '2026-07-06',
        playerCount: 1,
      },
      calculatedCardScores: {
        perPlayer: {
          'player-1': {
            cardPointsMicrobes: 4,
          },
        },
        reviewItems: [],
      },
      playerSelections: [{ importedName: 'Friday Mars', playerId: 'player-1' }],
      selectedPlayerIds: ['player-1'],
    }).playerScores['player-1'],
  ).toMatchObject({
    cardPointsMicrobes: 4,
  });
});
```

- [ ] **Step 2: Run the focused scorer tests before the scoring engine exists**

Run: `npm.cmd run test -- src/lib/imports/card-scoring/score-card-from-evidence.test.ts src/lib/imports/build-import-draft.test.ts src/lib/imports/build-import-review-model.test.ts`
Expected: `FAIL` because the scorer and calculated-card-score merge points do not exist.

- [ ] **Step 3: Implement single-card evaluation and the per-import scorer**

```ts
// src/lib/imports/card-scoring/score-card-from-evidence.ts
export function scoreCardFromEvidence(input: {
  cardEvidence: Record<string, unknown>;
  cardName: string;
  rule: Record<string, unknown>;
}) {
  if (input.rule.mode === 'resource_per') {
    const resourceCount = Number(input.cardEvidence.resourceCount ?? NaN);
    if (!Number.isFinite(resourceCount)) {
      return {
        cardName: input.cardName,
        reason: `Missing derived ${input.rule.resourceType} count.`,
        status: 'partial' as const,
      };
    }

    return {
      cardName: input.cardName,
      outputField: input.rule.outputField,
      points: Math.floor(resourceCount / input.rule.unitsPerPoint) * input.rule.pointsPerUnit,
      status: 'scored' as const,
    };
  }

  if (input.rule.mode === 'tag_count') {
    const tagCount = Number(input.cardEvidence.tagCount ?? NaN);
    if (!Number.isFinite(tagCount)) {
      return {
        cardName: input.cardName,
        reason: `Missing derived ${input.rule.tag} tag count.`,
        status: 'partial' as const,
      };
    }

    return {
      cardName: input.cardName,
      outputField: input.rule.outputField,
      points: tagCount * input.rule.pointsPerTag,
      status: 'scored' as const,
    };
  }

  return {
    cardName: input.cardName,
    reason: 'Unsupported scoring rule payload.',
    status: 'unsupported' as const,
  };
}
```

```ts
// src/lib/imports/card-scoring/calculate-import-card-scores.ts
export async function calculateImportCardScores(input: {
  boardScreenshotOcrLines: string[];
  cards: Array<{ cardName: string; fullImageUrl: string; id: string; syncMetadata: Record<string, unknown> }>;
  parsedEvents: Array<Record<string, unknown>>;
  playerSelections: Array<{ importedName: string; playerId: string }>;
}) {
  const evidence = deriveCardScoreEvidence({
    boardScreenshotOcrLines: input.boardScreenshotOcrLines,
    events: input.parsedEvents,
    playerLinks: input.playerSelections,
  });

  const perPlayer: Record<string, Record<string, number>> = {};
  const reviewItems: Array<Record<string, unknown>> = [];

  for (const selection of input.playerSelections) {
    const playerCardEvidence = evidence.playerEvidence[selection.playerId] ?? {};
    for (const [cardName, cardEvidence] of Object.entries(playerCardEvidence)) {
      const card = input.cards.find((candidate) => candidate.cardName === cardName);
      if (!card) {
        reviewItems.push({ cardName, playerId: selection.playerId, reason: 'Card reference not found.', status: 'unsupported' });
        continue;
      }

      const resolvedRule = await resolveCardScoringRule({ card });
      if (resolvedRule.status !== 'resolved') {
        reviewItems.push({ cardName, playerId: selection.playerId, reason: resolvedRule.humanSummary, status: 'unsupported' });
        continue;
      }

      const scoredCard = scoreCardFromEvidence({
        cardEvidence,
        cardName,
        rule: resolvedRule.rule,
      });

      if (scoredCard.status === 'scored') {
        const currentPlayerScores = perPlayer[selection.playerId] ?? {};
        currentPlayerScores[scoredCard.outputField] =
          (currentPlayerScores[scoredCard.outputField] ?? 0) + scoredCard.points;
        perPlayer[selection.playerId] = currentPlayerScores;
      } else {
        reviewItems.push({
          cardName,
          playerId: selection.playerId,
          reason: scoredCard.reason,
          status: scoredCard.status,
        });
      }
    }
  }

  return {
    perPlayer,
    reviewHints: evidence.reviewHints,
    reviewItems,
  };
}
```

- [ ] **Step 4: Merge calculated scores into the review model and draft builder conservatively**

```ts
// src/lib/imports/build-import-review-model.ts
export type ImportCardScoreReviewItem = {
  cardName: string;
  playerId: string;
  reason: string;
  status: 'ambiguous' | 'partial' | 'unsupported';
};

export type ImportReviewModel = {
  calculatedCardScores?: Record<string, Record<string, number>>;
  cardScoreReviewItems?: ImportCardScoreReviewItem[];
  // existing fields...
};
```

```ts
// src/lib/imports/build-import-draft.ts
const calculatedCardScoresByPlayerId = input.calculatedCardScores?.perPlayer ?? {};

const mergedScore = {
  awardPoints:
    logScore.awardPoints ??
    scoreCandidate?.awardPoints ??
    expectedAwardPointsByPlayerId.get(playerId),
  cardPointsAnimals:
    calculatedCardScoresByPlayerId[playerId]?.cardPointsAnimals ??
    logScore.cardPointsAnimals ??
    cardPointBreakdown?.cardPointsAnimals ??
    scoreCandidate?.cardPointsAnimals,
  cardPointsMicrobes:
    calculatedCardScoresByPlayerId[playerId]?.cardPointsMicrobes ??
    logScore.cardPointsMicrobes ??
    cardPointBreakdown?.cardPointsMicrobes ??
    scoreCandidate?.cardPointsMicrobes,
  cardPointsJovian:
    calculatedCardScoresByPlayerId[playerId]?.cardPointsJovian ??
    logScore.cardPointsJovian ??
    cardPointBreakdown?.cardPointsJovian ??
    scoreCandidate?.cardPointsJovian,
  // keep total conservative unless fully supported elsewhere
};
```

- [ ] **Step 5: Verify the scoring engine and conservative draft merge**

Run: `npm.cmd run test -- src/lib/imports/card-scoring/score-card-from-evidence.test.ts src/lib/imports/card-scoring/calculate-import-card-scores.test.ts src/lib/imports/build-import-review-model.test.ts src/lib/imports/build-import-draft.test.ts`
Expected: `PASS` with supported card subtotals prefilled and unresolved cards preserved for review.

- [ ] **Step 6: Commit the scoring engine**

```bash
git add src/lib/imports/card-scoring/score-card-from-evidence.ts src/lib/imports/card-scoring/score-card-from-evidence.test.ts src/lib/imports/card-scoring/calculate-import-card-scores.ts src/lib/imports/card-scoring/calculate-import-card-scores.test.ts src/lib/imports/build-import-review-model.ts src/lib/imports/build-import-review-model.test.ts src/lib/imports/build-import-draft.ts src/lib/imports/build-import-draft.test.ts src/app/"(app)"/log-game/import/page.tsx
git commit -m "feat: calculate supported card scores during import review"
```

### Task 6: Show Calculated Card Scoring In Review And Run Final Verification

**Files:**
- Modify: `src/features/imports/import-review-panel.tsx`
- Create: `src/features/imports/import-card-scoring-panel.tsx`
- Create: `src/features/imports/import-card-scoring-panel.test.tsx`
- Modify: `src/features/imports/web-import-page.test.tsx`
- Modify: `src/features/imports/log-game-import-shell.tsx`

- [ ] **Step 1: Write the failing UI test for resolved and unresolved card scoring**

```tsx
// src/features/imports/import-card-scoring-panel.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImportCardScoringPanel } from './import-card-scoring-panel';

describe('ImportCardScoringPanel', () => {
  it('renders auto-scored cards and review-required cards separately', () => {
    render(
      <ImportCardScoringPanel
        calculatedCardScores={{
          'player-1': { cardPointsMicrobes: 4 },
        }}
        playerLabels={{ 'player-1': 'Friday Mars' }}
        reviewHints={['Board screenshot OCR captured 3 lines for manual review.']}
        reviewItems={[
          {
            cardName: 'Mass Converter',
            playerId: 'player-1',
            reason: 'Missing derived science tag count.',
            status: 'partial',
          },
        ]}
      />,
    );

    expect(screen.getByText(/calculated card scoring/i)).toBeInTheDocument();
    expect(screen.getByText(/friday mars/i)).toBeInTheDocument();
    expect(screen.getByText(/cardpointsmicrobes: 4/i)).toBeInTheDocument();
    expect(screen.getByText(/mass converter/i)).toBeInTheDocument();
    expect(screen.getByText(/missing derived science tag count/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the review UI test before the new panel exists**

Run: `npm.cmd run test -- src/features/imports/import-card-scoring-panel.test.tsx`
Expected: `FAIL` because the review panel does not render calculated card scoring yet.

- [ ] **Step 3: Add the dedicated calculated-card-scoring panel and mount it in the review shell**

```tsx
// src/features/imports/import-card-scoring-panel.tsx
export function ImportCardScoringPanel(input: {
  calculatedCardScores?: Record<string, Record<string, number>>;
  playerLabels: Record<string, string>;
  reviewHints?: string[];
  reviewItems?: Array<{
    cardName: string;
    playerId: string;
    reason: string;
    status: 'ambiguous' | 'partial' | 'unsupported';
  }>;
}) {
  const calculatedCardScores = input.calculatedCardScores ?? {};
  const reviewItems = input.reviewItems ?? [];

  if (Object.keys(calculatedCardScores).length === 0 && reviewItems.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="tm-data-label text-xs">Calculated Card Scoring</h3>
      {Object.entries(calculatedCardScores).map(([playerId, scores]) => (
        <div key={playerId} className="mt-3">
          <p className="text-sm font-semibold text-stone-100">
            {input.playerLabels[playerId] ?? playerId}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-stone-200">
            {Object.entries(scores).map(([field, value]) => (
              <li key={`${playerId}-${field}`}>{field}: {value}</li>
            ))}
          </ul>
        </div>
      ))}
      {reviewItems.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2 text-sm text-amber-100">
          {reviewItems.map((item) => (
            <li key={`${item.playerId}-${item.cardName}`}>
              {item.cardName}: {item.reason}
            </li>
          ))}
        </ul>
      ) : null}
      {input.reviewHints?.length ? (
        <ul className="mt-4 flex flex-col gap-1 text-xs text-cyan-100">
          {input.reviewHints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
```

```tsx
// src/features/imports/import-review-panel.tsx
<ImportCardScoringPanel
  calculatedCardScores={review.calculatedCardScores}
  playerLabels={Object.fromEntries(
    review.playerLinks.map((link) => [
      link.selectedPlayerId ?? link.importedName,
      link.importedName,
    ]),
  )}
  reviewHints={review.cardScoreReviewHints}
  reviewItems={review.cardScoreReviewItems}
/>
```

- [ ] **Step 4: Run focused verification across types, UI, and compile safety**

Run: `npm.cmd run test -- src/lib/db/game-import-repo.test.ts src/lib/db/card-scoring-rule-cache-repo.test.ts src/lib/imports/import-draft-form-data.test.ts src/features/imports/web-import-page.test.tsx src/lib/imports/card-scoring/resolve-card-scoring-rule.test.ts src/lib/imports/card-scoring/read-board-state-screenshot.test.ts src/lib/imports/card-scoring/derive-card-score-evidence.test.ts src/lib/imports/card-scoring/score-card-from-evidence.test.ts src/lib/imports/card-scoring/calculate-import-card-scores.test.ts src/lib/imports/build-import-review-model.test.ts src/lib/imports/build-import-draft.test.ts src/features/imports/import-card-scoring-panel.test.tsx`
Expected: `PASS` across the focused hybrid-scoring surfaces.

Run: `npx.cmd tsc --noEmit --pretty false`
Expected: no TypeScript errors.

Run: `npx.cmd next lint --file "src/app/(app)/log-game/import/page.tsx" --file "src/features/imports/web-import-page.tsx" --file "src/features/imports/import-review-panel.tsx" --file "src/features/imports/import-card-scoring-panel.tsx" --file "src/lib/imports/build-import-review-model.ts" --file "src/lib/imports/build-import-draft.ts"`
Expected: no lint errors or warnings in the touched import and scoring files.

- [ ] **Step 5: Commit the review UI and verification sweep**

```bash
git add src/features/imports/import-review-panel.tsx src/features/imports/import-card-scoring-panel.tsx src/features/imports/import-card-scoring-panel.test.tsx src/features/imports/web-import-page.test.tsx src/features/imports/log-game-import-shell.tsx
git commit -m "feat: review calculated import card scoring"
```

## Self-Review

### Spec Coverage

- Multi-screenshot evidence storage and OCR-rule caching are covered by Task 1.
- Separate board screenshot input and endgame screenshot input are covered by Task 2.
- Curated-first rule resolution with OCR fallback and per-card cache reuse are covered by Task 3.
- Conservative evidence derivation from parsed log events and board OCR text is covered by Task 4.
- High-confidence scoring, partial review items, and conservative draft prefills are covered by Task 5.
- The new `Calculated Card Scoring` review surface and full focused verification are covered by Task 6.

### Placeholder Scan

- No `TODO`, `TBD`, or `implement later` placeholders remain.
- Each task lists exact file paths, commands, and concrete code changes.
- Review-only behavior for partial cards is explicit rather than implied.

### Type Consistency

- Screenshot evidence consistently uses `endgame_score` and `board_state`.
- Rule resolution consistently distinguishes `curated`, `cache`, and `ocr`.
- Card scoring outcomes consistently use `scored`, `partial`, `ambiguous`, and `unsupported`.
- Draft merges only use supported per-field totals and do not assume a full `cardPointsTotal`.
