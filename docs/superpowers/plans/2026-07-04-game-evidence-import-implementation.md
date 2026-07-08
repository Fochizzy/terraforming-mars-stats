# Game Evidence Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the authenticated `/log-game/import` workflow so users can paste noisy exported logs, upload supported endgame score screenshots, resolve imported players to the correct saved profiles, review editable score candidates, and then hand confirmed data into the shared draft game flow for later analytics.

**Architecture:** Build on the current `src/app/(app)/log-game/import/page.tsx` and `src/features/imports` surface instead of replacing it. Split the work into additive Supabase persistence for raw evidence plus aliases, deterministic parsing/OCR normalization under `src/lib/imports`, a server-side review model that merges both evidence sources, and a client review UI that blocks draft handoff until player links and score candidates are confirmed. Keep `LogGameDraftInput` as the only path into the normal scoring flow so imported evidence enriches the existing validation rules instead of bypassing them, and treat screenshot OCR as supported only for the known digital endgame results and score-source layouts rather than arbitrary phone photos.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase Postgres/Storage, server actions, Zod, Sharp, `tesseract.js`, Vitest, React Testing Library, Playwright

---

## Planned File Structure

- `supabase/migrations/20260704090000_extend_game_import_review_schema.sql`: additive schema changes for parsed log events, separate screenshot import rows, and player alias persistence
- `supabase/tests/import_schema_verification.sql`: SQL contract for import tables, columns, and indexes
- `src/lib/db/game-import-repo.ts`: raw evidence persistence, parsed-event writes, and import review reads
- `src/lib/db/game-import-repo.test.ts`: repository contract tests for split log/screenshot persistence
- `src/lib/db/player-import-alias-repo.ts`: alias lookup and persistence inside the current group
- `src/lib/db/player-import-alias-repo.test.ts`: alias repository tests
- `src/lib/db/import-group-repo.ts`: legacy global roster/group-creation helper that the import route must stop depending on instead of extending
- `src/lib/imports/classify-game-log-line.ts`: classify imported lines as event, context, draw-only, filler, or ignored noise
- `src/lib/imports/classify-game-log-line.test.ts`: classifier tests for chatter and real events
- `src/lib/imports/parse-game-log.ts`: noise-tolerant event extraction and coverage metrics
- `src/lib/imports/parse-game-log.test.ts`: parser tests for supported export lines
- `src/lib/imports/read-endgame-screenshot.ts`: OCR adapter for supported digital results screenshots
- `src/lib/imports/read-endgame-screenshot.test.ts`: OCR adapter smoke test with a mocked OCR engine
- `src/lib/imports/parse-endgame-score-screenshot.ts`: map OCR text into score and score-source candidates
- `src/lib/imports/parse-endgame-score-screenshot.test.ts`: parser tests for score totals and source breakdowns
- `src/lib/imports/resolve-import-player-links.ts`: group-scoped player/profile linking and ambiguity reporting
- `src/lib/imports/resolve-import-player-links.test.ts`: exact, alias, ambiguous, and unmatched player-link tests
- `src/lib/imports/build-import-review-model.ts`: merge parsed log, OCR, and player-link results into a single review payload
- `src/lib/imports/build-import-review-model.test.ts`: review-model tests for mismatches and ignored filler counts
- `src/lib/imports/build-import-draft.ts`: map confirmed review data into `LogGameDraftInput`
- `src/lib/imports/build-import-draft.test.ts`: draft-prefill tests for scores, selected players, and notes
- `src/features/imports/web-import-page.tsx`: two-phase evidence submission and review UI
- `src/features/imports/web-import-page.test.tsx`: import page interaction tests
- `src/features/imports/log-game-import-shell.tsx`: route shell for evidence analysis first, then confirmed draft handoff
- `src/features/imports/log-game-import-shell.test.tsx`: shell tests for success and failure routing
- `src/features/imports/import-review-panel.tsx`: review summary, conflicts, and ignored-line surfacing
- `src/features/imports/import-player-resolution-panel.tsx`: editable player/profile linking UI
- `src/features/imports/import-score-candidates-panel.tsx`: editable OCR score-source candidates
- `src/features/imports/import-evidence-summary.tsx`: draft summary panel for saved raw evidence
- `src/app/(app)/log-game/import/page.tsx`: server actions to persist evidence, build review data, and create the draft
- `src/app/(app)/log-game/page.tsx`: show the saved evidence summary when the draft originated from import
- `src/lib/db/analytics-repo.ts`: import coverage and parser-noise metrics
- `supabase/migrations/20260704100000_add_import_coverage_analytics.sql`: analytics views for import coverage
- `supabase/tests/analytics_verification.sql`: analytics view verification for new import coverage metrics
- `tests/e2e/log-game-import.spec.ts`: end-to-end import workflow coverage

## Delivery Strategy

The current repo already has a partial import route and draft persistence layer, so this plan focuses on reconciling that draft implementation with the approved spec instead of rebuilding from scratch. The current `src/lib/db/import-group-repo.ts` flow searches all players, matches global rosters, and can create new groups, which conflicts with the approved requirement for explicit group-scoped player linking inside the active group. Replace the import route dependency on that path rather than extending it:

1. normalize the schema and repository contracts
2. make the log parser noise-tolerant
3. add OCR plus score-source extraction for supported screenshots
4. make player/profile linking explicit and safe
5. turn the current import page into a true review-and-confirm flow
6. hand confirmed results into the existing draft game flow
7. expose lightweight coverage analytics and verify the full path end to end

### Task 1: Reconcile Import Persistence With The Approved Evidence Model

**Files:**
- Create: `supabase/migrations/20260704090000_extend_game_import_review_schema.sql`
- Modify: `supabase/tests/import_schema_verification.sql`
- Modify: `src/lib/db/game-import-repo.ts`
- Modify: `src/lib/db/game-import-repo.test.ts`
- Create: `src/lib/db/player-import-alias-repo.ts`
- Create: `src/lib/db/player-import-alias-repo.test.ts`

- [ ] **Step 1: Update the import schema verification to describe the split evidence model**

```sql
-- supabase/tests/import_schema_verification.sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'game_log_imports',
    'game_log_events',
    'game_result_screenshot_imports',
    'player_import_aliases'
  )
order by table_name, ordinal_position;
```

- [ ] **Step 2: Run the schema verification before the migration exists**

Run: `npx.cmd supabase db reset --local`
Expected: reset succeeds against the current schema.

Run: `npx.cmd supabase db query --local -f supabase/tests/import_schema_verification.sql`
Expected: `game_log_events`, `game_result_screenshot_imports`, and `player_import_aliases` are missing or incomplete.

- [ ] **Step 3: Add the additive import-review migration**

```sql
-- supabase/migrations/20260704090000_extend_game_import_review_schema.sql
create table public.game_log_events (
  id uuid primary key default gen_random_uuid(),
  game_log_import_id uuid not null references public.game_log_imports(id) on delete cascade,
  game_player_id uuid references public.game_players(id) on delete set null,
  generation_number integer,
  event_order integer not null,
  event_type text not null,
  card_id uuid references public.cards(id) on delete set null,
  resource_type text,
  resource_amount integer,
  tile_type text,
  board_space text,
  confidence_level text not null,
  line_classification text,
  raw_line text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.game_result_screenshot_imports (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  storage_object_path text not null,
  original_name text,
  mime_type text,
  file_size_bytes bigint,
  ocr_engine_version text not null,
  parse_status text not null default 'saved_as_draft',
  detected_layout text,
  confidence_summary jsonb not null default '{}'::jsonb,
  extracted_fields jsonb not null default '{}'::jsonb,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  parsed_at timestamptz
);

create table public.player_import_aliases (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  source_type text not null,
  alias_text text not null,
  normalized_alias text not null,
  created_at timestamptz not null default now(),
  unique (group_id, source_type, normalized_alias)
);
```

- [ ] **Step 4: Refactor the repositories to write raw logs, screenshots, parsed events, and aliases separately**

```ts
// src/lib/db/game-import-repo.ts
export async function saveImportEvidence(input: {
  gameId: string;
  rawLogText: string;
  screenshotFile: File | null;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const normalizedRawLogText = input.rawLogText.trim();
  const { data: logImport, error: logError } = await supabase
    .from('game_log_imports')
    .insert({
      confidence_summary: {},
      created_by_user_id: input.userId,
      detected_source: 'manual_web_import',
      game_id: input.gameId,
      line_count: countImportLines(normalizedRawLogText),
      parse_status: 'saved_as_draft',
      parser_version: 'manual-web-import-v2',
      raw_log_text: normalizedRawLogText,
      unparsed_line_count: 0,
    })
    .select('id')
    .single();

  if (logError) throw logError;

  const screenshotImportId = input.screenshotFile
    ? await saveScreenshotImport({ gameId: input.gameId, screenshotFile: input.screenshotFile, userId: input.userId })
    : null;

  return { logImportId: logImport.id, screenshotImportId };
}
```

```ts
// src/lib/db/player-import-alias-repo.ts
export async function savePlayerImportAlias(input: {
  groupId: string;
  playerId: string;
  sourceType: 'game_log' | 'screenshot_ocr';
  aliasText: string;
}) {
  const supabase = await createSupabaseServerClient();
  const normalizedAlias = normalizePlayerAlias(input.aliasText);

  const { error } = await supabase.from('player_import_aliases').upsert({
    alias_text: input.aliasText,
    group_id: input.groupId,
    normalized_alias: normalizedAlias,
    player_id: input.playerId,
    source_type: input.sourceType,
  });

  if (error) throw error;
}

export async function listPlayerImportAliasesForGroup(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('player_import_aliases')
    .select('alias_text, normalized_alias, player_id, source_type')
    .eq('group_id', groupId);

  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 5: Verify the repository contract and local schema**

Run: `npm.cmd run test -- src/lib/db/game-import-repo.test.ts src/lib/db/player-import-alias-repo.test.ts`
Expected: `PASS` with the repository now inserting into the split evidence tables.

Run: `npx.cmd supabase db reset --local`
Expected: local reset replays the new migration successfully.

Run: `npx.cmd supabase db query --local -f supabase/tests/import_schema_verification.sql`
Expected: rows for `game_log_imports`, `game_log_events`, `game_result_screenshot_imports`, and `player_import_aliases`.

- [ ] **Step 6: Commit the schema and repository reconciliation**

```bash
git add supabase/migrations/20260704090000_extend_game_import_review_schema.sql supabase/tests/import_schema_verification.sql src/lib/db/game-import-repo.ts src/lib/db/game-import-repo.test.ts src/lib/db/player-import-alias-repo.ts src/lib/db/player-import-alias-repo.test.ts
git commit -m "feat: split import evidence persistence"
```

### Task 2: Add Noise-Tolerant Exported Log Classification And Parsing

**Files:**
- Create: `src/lib/imports/classify-game-log-line.ts`
- Create: `src/lib/imports/classify-game-log-line.test.ts`
- Create: `src/lib/imports/parse-game-log.ts`
- Create: `src/lib/imports/parse-game-log.test.ts`

- [ ] **Step 1: Add failing tests for supported events, filler chatter, and perspective-specific lines**

```ts
// src/lib/imports/classify-game-log-line.test.ts
import { describe, expect, it } from 'vitest';
import { classifyGameLogLine } from './classify-game-log-line';

describe('classifyGameLogLine', () => {
  it('marks greetings as chatty filler', () => {
    expect(classifyGameLogLine('Good luck Corey!')).toMatchObject({
      kind: 'chatty_filler',
    });
  });

  it('marks perspective draw lines as draw-only context', () => {
    expect(classifyGameLogLine('You drew Micro-Mills')).toMatchObject({
      kind: 'draw_info',
    });
  });

  it('marks played-card lines as actionable events', () => {
    expect(classifyGameLogLine('Izzy played Earth Catapult')).toMatchObject({
      kind: 'event',
      eventType: 'card_played',
    });
  });
});
```

```ts
// src/lib/imports/parse-game-log.test.ts
import { describe, expect, it } from 'vitest';
import { parseGameLog } from './parse-game-log';

describe('parseGameLog', () => {
  it('extracts events while tracking ignored filler coverage', () => {
    const parsed = parseGameLog([
      'Good luck Izzy!',
      'Generation 4',
      'Izzy played Earth Catapult',
      'You drew Micro-Mills',
      'Izzy placed greenery tile at 29',
    ].join('\n'));

    expect(parsed.events.map((event) => event.eventType)).toEqual([
      'generation_started',
      'card_played',
      'tile_placed',
    ]);
    expect(parsed.ignoredLineCount).toBe(1);
    expect(parsed.drawInfoLineCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run the parser tests before the parser exists**

Run: `npm.cmd run test -- src/lib/imports/classify-game-log-line.test.ts src/lib/imports/parse-game-log.test.ts`
Expected: `FAIL` because the classifier and parser files do not exist yet.

- [ ] **Step 3: Implement deterministic line classification and parsing**

```ts
// src/lib/imports/classify-game-log-line.ts
const GREETING_PATTERN = /^Good luck .+!$/i;
const DRAW_PATTERN = /^You drew /i;
const GENERATION_PATTERN = /^Generation (?<generation>\d+)$/i;
const PLAYED_CARD_PATTERN = /^(?<player>.+) played (?<card>.+)$/i;
const TILE_PATTERN = /^(?<player>.+) placed (?<tile>.+) tile at (?<space>[0-9A-Za-z]+)$/i;

export function classifyGameLogLine(line: string) {
  const trimmed = line.trim();

  if (!trimmed) return { kind: 'ignored_noise' as const };
  if (GREETING_PATTERN.test(trimmed)) return { kind: 'chatty_filler' as const };
  if (DRAW_PATTERN.test(trimmed)) return { kind: 'draw_info' as const };

  const generationMatch = trimmed.match(GENERATION_PATTERN);
  if (generationMatch?.groups?.generation) {
    return {
      kind: 'event' as const,
      eventType: 'generation_started' as const,
      generationNumber: Number(generationMatch.groups.generation),
    };
  }

  const playedCardMatch = trimmed.match(PLAYED_CARD_PATTERN);
  if (playedCardMatch?.groups) {
    return {
      kind: 'event' as const,
      actorName: playedCardMatch.groups.player.trim(),
      cardName: playedCardMatch.groups.card.trim(),
      eventType: 'card_played' as const,
    };
  }

  const tileMatch = trimmed.match(TILE_PATTERN);
  if (tileMatch?.groups) {
    return {
      kind: 'event' as const,
      actorName: tileMatch.groups.player.trim(),
      boardSpace: tileMatch.groups.space.trim(),
      eventType: 'tile_placed' as const,
      tileType: tileMatch.groups.tile.trim(),
    };
  }

  return { kind: 'context' as const };
}
```

```ts
// src/lib/imports/parse-game-log.ts
export function parseGameLog(rawLogText: string) {
  const lines = rawLogText.split(/\r?\n/);
  const events = [];
  let drawInfoLineCount = 0;
  let ignoredLineCount = 0;

  for (const [index, line] of lines.entries()) {
    const classified = classifyGameLogLine(line);

    if (classified.kind === 'draw_info') {
      drawInfoLineCount += 1;
      continue;
    }

    if (classified.kind === 'chatty_filler' || classified.kind === 'ignored_noise') {
      ignoredLineCount += 1;
      continue;
    }

    if (classified.kind === 'event') {
      events.push({
        confidenceLevel: 'high',
        eventOrder: index + 1,
        ...classified,
        rawLine: line,
      });
    }
  }

  return { drawInfoLineCount, events, ignoredLineCount };
}
```

- [ ] **Step 4: Verify the parser handles noise without breaking event extraction**

Run: `npm.cmd run test -- src/lib/imports/classify-game-log-line.test.ts src/lib/imports/parse-game-log.test.ts`
Expected: `PASS` with greetings counted as filler and `You drew ...` lines retained as low-authority context.

- [ ] **Step 5: Commit the noise-tolerant parser**

```bash
git add src/lib/imports/classify-game-log-line.ts src/lib/imports/classify-game-log-line.test.ts src/lib/imports/parse-game-log.ts src/lib/imports/parse-game-log.test.ts
git commit -m "feat: add noise-tolerant game log parser"
```

### Task 3: Parse Supported Endgame Score Screenshots And Score-Source Breakdowns

**Files:**
- Modify: `package.json`
- Create: `src/lib/imports/read-endgame-screenshot.ts`
- Create: `src/lib/imports/read-endgame-screenshot.test.ts`
- Create: `src/lib/imports/parse-endgame-score-screenshot.ts`
- Create: `src/lib/imports/parse-endgame-score-screenshot.test.ts`

- [ ] **Step 1: Add the OCR dependency and a failing parser test for score-source rows**

```bash
npm.cmd install tesseract.js
```

```ts
// src/lib/imports/parse-endgame-score-screenshot.test.ts
import { describe, expect, it } from 'vitest';
import { parseEndgameScoreScreenshot } from './parse-endgame-score-screenshot';

describe('parseEndgameScoreScreenshot', () => {
  it('parses totals and visible score-source rows from OCR lines', () => {
    const parsed = parseEndgameScoreScreenshot([
      'Izzy 18 5 10 7 22 62 8',
      'Corey 16 0 4 6 19 45 3',
      'Card Points',
      'Izzy Microbes 4 Animals 2 Jovian 6',
      'Corey Microbes 0 Animals 0 Jovian 3',
    ]);

    expect(parsed.playerRows[0]).toMatchObject({
      cardPointsAnimals: 2,
      cardPointsJovian: 6,
      cardPointsMicrobes: 4,
      totalPoints: 62,
      trPoints: 18,
    });
  });
});
```

- [ ] **Step 2: Run the OCR parser test before the parser exists**

Run: `npm.cmd run test -- src/lib/imports/parse-endgame-score-screenshot.test.ts`
Expected: `FAIL` because the screenshot parser does not exist yet.

- [ ] **Step 3: Implement the OCR line parser for the known digital layout**

```ts
// src/lib/imports/parse-endgame-score-screenshot.ts
type ParsedScreenshotPlayerRow = {
  playerName: string;
  trPoints?: number;
  greeneryPoints?: number;
  citiesPoints?: number;
  milestonePoints?: number;
  awardPoints?: number;
  cardPointsTotal?: number;
  totalPoints?: number;
  finalMegacredits?: number;
  cardPointsMicrobes?: number;
  cardPointsAnimals?: number;
  cardPointsJovian?: number;
};

export function parseEndgameScoreScreenshot(lines: string[]) {
  const playerRows: ParsedScreenshotPlayerRow[] = [];
  const normalizedLines = lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);

  for (const line of normalizedLines) {
    const totalMatch = line.match(/^(?<name>[A-Za-z ]+)\s+(?<tr>\d+)\s+(?<milestone>\d+)\s+(?<award>\d+)\s+(?<greenery>\d+)\s+(?<card>\d+)\s+(?<total>\d+)\s+(?<mc>\d+)$/);
    if (totalMatch?.groups) {
      playerRows.push({
        awardPoints: Number(totalMatch.groups.award),
        cardPointsTotal: Number(totalMatch.groups.card),
        finalMegacredits: Number(totalMatch.groups.mc),
        greeneryPoints: Number(totalMatch.groups.greenery),
        milestonePoints: Number(totalMatch.groups.milestone),
        playerName: totalMatch.groups.name.trim(),
        totalPoints: Number(totalMatch.groups.total),
        trPoints: Number(totalMatch.groups.tr),
      });
      continue;
    }

    const breakdownMatch = line.match(/^(?<name>[A-Za-z ]+) Microbes (?<microbes>\d+) Animals (?<animals>\d+) Jovian (?<jovian>\d+)$/);
    if (breakdownMatch?.groups) {
      const playerRow = playerRows.find((row) => row.playerName === breakdownMatch.groups.name.trim());
      if (playerRow) {
        playerRow.cardPointsMicrobes = Number(breakdownMatch.groups.microbes);
        playerRow.cardPointsAnimals = Number(breakdownMatch.groups.animals);
        playerRow.cardPointsJovian = Number(breakdownMatch.groups.jovian);
      }
    }
  }

  return { playerRows };
}
```

- [ ] **Step 4: Add the OCR adapter with a mocked smoke test**

```ts
// src/lib/imports/read-endgame-screenshot.ts
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

export async function readEndgameScreenshot(file: File) {
  const imageBuffer = Buffer.from(await file.arrayBuffer());
  const normalizedImage = await sharp(imageBuffer).grayscale().normalize().png().toBuffer();
  const ocrResult = await Tesseract.recognize(normalizedImage, 'eng');

  return ocrResult.data.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
```

- [ ] **Step 5: Verify screenshot parsing and OCR adapter tests**

Run: `npm.cmd run test -- src/lib/imports/parse-endgame-score-screenshot.test.ts src/lib/imports/read-endgame-screenshot.test.ts`
Expected: `PASS` with visible microbe/animal/Jovian rows captured when the supported layout exposes them.

- [ ] **Step 6: Commit the screenshot OCR layer**

```bash
git add package.json package-lock.json src/lib/imports/read-endgame-screenshot.ts src/lib/imports/read-endgame-screenshot.test.ts src/lib/imports/parse-endgame-score-screenshot.ts src/lib/imports/parse-endgame-score-screenshot.test.ts
git commit -m "feat: add supported endgame screenshot OCR"
```

### Task 4: Resolve Imported Participants To The Correct Saved Profiles

**Files:**
- Create: `src/lib/imports/resolve-import-player-links.ts`
- Create: `src/lib/imports/resolve-import-player-links.test.ts`
- Modify: `src/lib/db/player-import-alias-repo.ts`
- Modify: `src/lib/db/player-import-alias-repo.test.ts`

- [ ] **Step 1: Add failing tests for exact matches, alias matches, ambiguity, and unmatched players**

```ts
// src/lib/imports/resolve-import-player-links.test.ts
import { describe, expect, it } from 'vitest';
import { resolveImportPlayerLinks } from './resolve-import-player-links';

describe('resolveImportPlayerLinks', () => {
  const groupPlayers = [
    { displayName: 'Izzy', id: 'player-1' },
    { displayName: 'Corey', id: 'player-2' },
    { displayName: 'Colette', id: 'player-3' },
  ];

  it('auto-links exact matches', () => {
    expect(resolveImportPlayerLinks(['Izzy', 'Corey'], groupPlayers, [])).toMatchObject({
      unresolvedCount: 0,
    });
  });

  it('suggests alias-based matches without hiding ambiguity', () => {
    expect(
      resolveImportPlayerLinks(
        ['Izzy H.'],
        groupPlayers,
        [{ aliasText: 'Izzy H.', normalizedAlias: 'izzy h', playerId: 'player-1', sourceType: 'screenshot_ocr' }],
      ).matches[0],
    ).toMatchObject({
      playerId: 'player-1',
      status: 'alias',
    });
  });

  it('blocks ambiguous links from auto-finalizing', () => {
    expect(
      resolveImportPlayerLinks(
        ['Chris'],
        [{ displayName: 'Chris A', id: 'player-a' }, { displayName: 'Chris B', id: 'player-b' }],
        [],
      ).matches[0],
    ).toMatchObject({ status: 'ambiguous' });
  });
});
```

- [ ] **Step 2: Run the player-link tests before the resolver exists**

Run: `npm.cmd run test -- src/lib/imports/resolve-import-player-links.test.ts`
Expected: `FAIL` because the resolver has not been created yet.

- [ ] **Step 3: Implement group-scoped player matching and alias reuse**

```ts
// src/lib/imports/resolve-import-player-links.ts
export function resolveImportPlayerLinks(
  importedNames: string[],
  players: Array<{ displayName: string; id: string }>,
  aliases: Array<{ aliasText: string; normalizedAlias: string; playerId: string; sourceType: string }>,
) {
  const matches = importedNames.map((importedName) => {
    const normalizedImportedName = normalizePlayerAlias(importedName);
    const exactMatch = players.find(
      (player) => normalizePlayerAlias(player.displayName) === normalizedImportedName,
    );

    if (exactMatch) {
      return { importedName, playerId: exactMatch.id, status: 'exact' as const };
    }

    const aliasMatch = aliases.find(
      (alias) => alias.normalizedAlias === normalizedImportedName,
    );

    if (aliasMatch) {
      return { importedName, playerId: aliasMatch.playerId, status: 'alias' as const };
    }

    const partialMatches = players.filter((player) =>
      normalizePlayerAlias(player.displayName).includes(normalizedImportedName),
    );

    if (partialMatches.length > 1) {
      return { importedName, options: partialMatches, status: 'ambiguous' as const };
    }

    return { importedName, status: 'unmatched' as const };
  });

  return {
    matches,
    unresolvedCount: matches.filter((match) => match.status === 'ambiguous' || match.status === 'unmatched').length,
  };
}
```

- [ ] **Step 4: Verify alias persistence and matching**

Run: `npm.cmd run test -- src/lib/imports/resolve-import-player-links.test.ts src/lib/db/player-import-alias-repo.test.ts`
Expected: `PASS` with alias-backed matches suggested and unresolved matches still blocking automatic finalization.

- [ ] **Step 5: Commit the player-linking layer**

```bash
git add src/lib/imports/resolve-import-player-links.ts src/lib/imports/resolve-import-player-links.test.ts src/lib/db/player-import-alias-repo.ts src/lib/db/player-import-alias-repo.test.ts
git commit -m "feat: add explicit imported player matching"
```

### Task 5: Turn The Import Page Into A True Review-And-Confirm Workflow

**Files:**
- Create: `src/lib/imports/build-import-review-model.ts`
- Create: `src/lib/imports/build-import-review-model.test.ts`
- Modify: `src/features/imports/web-import-page.tsx`
- Modify: `src/features/imports/web-import-page.test.tsx`
- Modify: `src/features/imports/log-game-import-shell.tsx`
- Modify: `src/features/imports/log-game-import-shell.test.tsx`
- Modify: `src/features/imports/import-review-panel.tsx`
- Create: `src/features/imports/import-player-resolution-panel.tsx`
- Create: `src/features/imports/import-score-candidates-panel.tsx`
- Modify: `src/app/(app)/log-game/import/page.tsx`

- [ ] **Step 1: Add a failing review-model test that merges OCR, parsed events, and player links**

```ts
// src/lib/imports/build-import-review-model.test.ts
import { describe, expect, it } from 'vitest';
import { buildImportReviewModel } from './build-import-review-model';

describe('buildImportReviewModel', () => {
  it('surfaces ignored filler, OCR scores, and unresolved players together', () => {
    const review = buildImportReviewModel({
      logParse: {
        drawInfoLineCount: 1,
        events: [{ eventType: 'card_played', rawLine: 'Izzy played Earth Catapult' }],
        ignoredLineCount: 2,
      },
      playerLinks: {
        matches: [{ importedName: 'Izzy H.', status: 'unmatched' }],
        unresolvedCount: 1,
      },
      screenshotParse: {
        playerRows: [{ playerName: 'Izzy H.', totalPoints: 62, trPoints: 18 }],
      },
    });

    expect(review.ignoredLineCount).toBe(2);
    expect(review.playerLinks[0]?.status).toBe('unmatched');
    expect(review.scoreCandidates[0]?.totalPoints).toBe(62);
  });
});
```

- [ ] **Step 2: Run the review-model and UI tests before the review flow exists**

Run: `npm.cmd run test -- src/lib/imports/build-import-review-model.test.ts src/features/imports/web-import-page.test.tsx src/features/imports/log-game-import-shell.test.tsx`
Expected: `FAIL` because the current page submits directly into draft creation without an editable review stage.

- [ ] **Step 3: Implement the server-built review model**

```ts
// src/lib/imports/build-import-review-model.ts
export function buildImportReviewModel(input: {
  logParse: { drawInfoLineCount: number; events: Array<{ eventType: string; rawLine: string }>; ignoredLineCount: number };
  playerLinks: { matches: Array<{ importedName: string; playerId?: string; status: string }>; unresolvedCount: number };
  screenshotParse: { playerRows: Array<Record<string, unknown>> };
}) {
  return {
    ignoredLineCount: input.logParse.ignoredLineCount,
    parsedEventCount: input.logParse.events.length,
    playerLinks: input.playerLinks.matches,
    requiresPlayerConfirmation: input.playerLinks.unresolvedCount > 0,
    scoreCandidates: input.screenshotParse.playerRows,
  };
}
```

- [ ] **Step 4: Replace the direct submit flow with a two-phase review UI**

```tsx
// src/features/imports/log-game-import-shell.tsx
const [review, setReview] = useState<ImportReviewModel | null>(null);

async function handleAnalyzeImport(values: WebImportDraftValues) {
  const result = await onAnalyzeImportEvidence(values);

  if (result.status === 'success') {
    setReview(result.review);
  }

  return result;
}
```

```tsx
// src/features/imports/import-review-panel.tsx
export function ImportReviewPanel({ review }: { review: ImportReviewModel | null }) {
  if (!review) return null;

  return (
    <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
      <h2 className="font-serif text-xl font-semibold text-stone-50">Import Review</h2>
      <p className="mt-2 text-sm text-cyan-100/90">
        Parsed {review.parsedEventCount} actionable log events and ignored {review.ignoredLineCount} filler lines.
      </p>
    </section>
  );
}
```

- [ ] **Step 5: Verify the import page now blocks on unresolved players and shows score candidates**

Run: `npm.cmd run test -- src/lib/imports/build-import-review-model.test.ts src/features/imports/web-import-page.test.tsx src/features/imports/log-game-import-shell.test.tsx`
Expected: `PASS` with unresolved player links and OCR score candidates rendered before the draft handoff continues.

- [ ] **Step 6: Commit the review workflow**

```bash
git add src/lib/imports/build-import-review-model.ts src/lib/imports/build-import-review-model.test.ts src/features/imports/web-import-page.tsx src/features/imports/web-import-page.test.tsx src/features/imports/log-game-import-shell.tsx src/features/imports/log-game-import-shell.test.tsx src/features/imports/import-review-panel.tsx src/features/imports/import-player-resolution-panel.tsx src/features/imports/import-score-candidates-panel.tsx src/app/'(app)'/log-game/import/page.tsx
git commit -m "feat: add reviewable game evidence import flow"
```

### Task 6: Hand Confirmed Import Data Into The Shared Draft Game Flow

**Files:**
- Modify: `src/lib/imports/build-import-draft.ts`
- Modify: `src/lib/imports/build-import-draft.test.ts`
- Modify: `src/app/(app)/log-game/import/page.tsx`
- Modify: `src/features/imports/import-evidence-summary.tsx`
- Modify: `src/app/(app)/log-game/page.tsx`

- [ ] **Step 1: Add a failing draft-builder test for prefilled players and score candidates**

```ts
// src/lib/imports/build-import-draft.test.ts
it('maps confirmed player links and screenshot scores into the shared draft', () => {
  expect(
    buildImportDraft({
      defaultExpansionCodes: ['base'],
      defaultPromoSetSlugs: [],
      groupId: 'group-1',
      importValues: {
        endgameScreenshotName: 'endgame.png',
        exportedGameLog: 'Izzy played Earth Catapult',
        generationCount: 11,
        mapId: 'tharsis',
        participantNames: ['Izzy', 'Corey'],
        playedOn: '2026-07-04',
        playerCount: 2,
      },
      playerSelections: [
        { importedName: 'Izzy', playerId: 'player-1' },
        { importedName: 'Corey', playerId: 'player-2' },
      ],
      scoreCandidates: [
        { playerName: 'Izzy', totalPoints: 62, trPoints: 18 },
        { playerName: 'Corey', totalPoints: 45, trPoints: 16 },
      ],
    }).playerScores['player-1'],
  ).toMatchObject({
    totalPoints: 62,
    trPoints: 18,
  });
});
```

- [ ] **Step 2: Run the draft-builder test before the draft mapper supports confirmed review data**

Run: `npm.cmd run test -- src/lib/imports/build-import-draft.test.ts`
Expected: `FAIL` because the current builder only writes notes and selected player IDs.

- [ ] **Step 3: Extend the draft builder and route action to create the draft only after confirmation**

```ts
// src/lib/imports/build-import-draft.ts
export function buildImportDraft(input: {
  defaultExpansionCodes: string[];
  defaultPromoSetSlugs: string[];
  groupId: string;
  importValues: ImportDraftValues;
  playerSelections: Array<{ importedName: string; playerId: string }>;
  scoreCandidates: Array<{ playerName: string; totalPoints?: number; trPoints?: number }>;
}): LogGameDraftInput {
  const playerScores = Object.fromEntries(
    input.playerSelections.map(({ importedName, playerId }) => {
      const scoreCandidate = input.scoreCandidates.find(
        (candidate) => candidate.playerName === importedName,
      );

      return [
        playerId,
        {
          totalPoints: scoreCandidate?.totalPoints,
          trPoints: scoreCandidate?.trPoints,
        },
      ];
    }),
  );

  return {
    // existing fields...
    playerScores,
    selectedPlayerIds: input.playerSelections.map((selection) => selection.playerId),
  };
}
```

```ts
// src/app/(app)/log-game/import/page.tsx
export async function confirmImportReview(input: ConfirmImportReviewInput) {
  const context = await requireCurrentGroupContext();
  const gameId = await saveDraftGame(buildImportDraft({
    defaultExpansionCodes,
    defaultPromoSetSlugs,
    groupId: context.groupId,
    importValues: input.importValues,
    playerSelections: input.playerSelections,
    scoreCandidates: input.scoreCandidates,
  }));

  return { gameId, status: 'success' as const };
}
```

- [ ] **Step 4: Surface saved evidence on the shared log-game draft page**

```tsx
// src/app/(app)/log-game/page.tsx
const importSummary = gameId
  ? await getLatestGameLogImportSummary({ gameId })
  : null;

return (
  <AppShell title="Log Game">
    {importSummary ? <ImportEvidenceSummary importSummary={importSummary} /> : null}
    <LogGameWizard ... />
  </AppShell>
);
```

- [ ] **Step 5: Verify the draft builder and evidence summary integration**

Run: `npm.cmd run test -- src/lib/imports/build-import-draft.test.ts src/features/imports/import-evidence-summary.test.tsx`
Expected: `PASS` with score candidates prefilled into the draft and saved evidence visible on the shared log-game page.

- [ ] **Step 6: Commit the draft handoff**

```bash
git add src/lib/imports/build-import-draft.ts src/lib/imports/build-import-draft.test.ts src/app/'(app)'/log-game/import/page.tsx src/features/imports/import-evidence-summary.tsx src/app/'(app)'/log-game/page.tsx
git commit -m "feat: hand confirmed import review into draft scoring"
```

### Task 7: Add Import Coverage Analytics And End-To-End Verification

**Files:**
- Create: `supabase/migrations/20260704100000_add_import_coverage_analytics.sql`
- Modify: `supabase/tests/analytics_verification.sql`
- Modify: `src/lib/db/analytics-repo.ts`
- Create: `tests/e2e/log-game-import.spec.ts`

- [ ] **Step 1: Add a failing analytics verification for import coverage views**

```sql
-- supabase/tests/analytics_verification.sql
select table_schema, table_name
from information_schema.views
where table_schema = 'analytics'
  and table_name like '%import%'
order by table_name;
```

- [ ] **Step 2: Run the analytics verification before the new views exist**

Run: `npx.cmd supabase db query --local -f supabase/tests/analytics_verification.sql`
Expected: no rows for import coverage views yet.

- [ ] **Step 3: Add coverage views for parser noise and screenshot score-source coverage**

```sql
-- supabase/migrations/20260704100000_add_import_coverage_analytics.sql
create or replace view analytics.import_coverage
with (security_invoker = true) as
select
  gli.game_id,
  gli.line_count,
  gli.unparsed_line_count,
  count(gle.id) filter (where gle.line_classification = 'chatty_filler') as ignored_filler_lines,
  count(gsi.id) as screenshot_count,
  (gsi.extracted_fields ? 'scoreBreakdown') as has_score_source_breakdown
from public.game_log_imports gli
left join public.game_log_events gle on gle.game_log_import_id = gli.id
left join public.game_result_screenshot_imports gsi on gsi.game_id = gli.game_id
group by gli.game_id, gli.line_count, gli.unparsed_line_count, gsi.extracted_fields;
```

```ts
// src/lib/db/analytics-repo.ts
export type ImportCoverageRow = {
  gameId: string;
  hasScoreSourceBreakdown: boolean;
  ignoredFillerLines: number;
  lineCount: number;
  screenshotCount: number;
  unparsedLineCount: number;
};
```

- [ ] **Step 4: Add an end-to-end test for the import route**

```ts
// tests/e2e/log-game-import.spec.ts
import { expect, test } from '@playwright/test';

test('web import requires a signed-in user and opens the evidence form', async ({ page }) => {
  await page.goto('/log-game/import');
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 5: Verify analytics coverage and e2e wiring**

Run: `npx.cmd supabase db reset --local`
Expected: reset succeeds and includes the new analytics migration.

Run: `npx.cmd supabase db query --local -f supabase/tests/analytics_verification.sql`
Expected: a row for `analytics.import_coverage`.

Run: `npm.cmd run test:e2e -- tests/e2e/log-game-import.spec.ts`
Expected: `1 passed`

- [ ] **Step 6: Commit the analytics and e2e coverage**

```bash
git add supabase/migrations/20260704100000_add_import_coverage_analytics.sql supabase/tests/analytics_verification.sql src/lib/db/analytics-repo.ts tests/e2e/log-game-import.spec.ts
git commit -m "feat: add import coverage analytics"
```

## Self-Review

### Spec Coverage

- The authenticated combined import webpage is covered by Tasks 5 and 6.
- Raw evidence persistence, separate screenshot storage, parsed events, and alias persistence are covered by Task 1.
- Noise-tolerant parsing of filler text and perspective-specific lines is covered by Task 2.
- Supported digital screenshot OCR plus score-source breakdown extraction is covered by Task 3, and arbitrary phone-photo OCR remains out of scope.
- Explicit player/profile linking and alias reuse are covered by Task 4.
- Editable review, conflict surfacing, removal of the global import-group dependency, and confirmed draft handoff are covered by Tasks 5 and 6.
- Import coverage analytics for ignored filler and score-source OCR are covered by Task 7.

### Placeholder Scan

- No `TODO`, `TBD`, or "similar to above" shortcuts remain.
- Every task includes exact file paths, concrete snippets, runnable commands, and expected outcomes.
- The plan intentionally scopes to the approved game-evidence import subsystem and does not pretend to re-plan the entire product surface already covered elsewhere.

### Type Consistency

- The plan consistently uses `game_log_imports`, `game_log_events`, `game_result_screenshot_imports`, and `player_import_aliases`, with aliases scoped by `group_id`.
- OCR score fields stay aligned with `LogGameDraftInput` naming: `trPoints`, `totalPoints`, `cardPointsTotal`, `cardPointsMicrobes`, `cardPointsAnimals`, and `cardPointsJovian`.
- Player linking stays group-scoped throughout the plan; no later task reintroduces the earlier global roster or group-creation behavior.
