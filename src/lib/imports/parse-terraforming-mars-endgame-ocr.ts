import type { BrowserOcrWord } from '@/lib/ocr/browser-tesseract';
import { normalizePlayerAlias } from './normalize-player-alias';

export const TERRAFORMING_MARS_ENDGAME_OCR_PARSER_IDENTITY =
  'terraforming-mars-endgame-score-table-v1' as const;

export type ImportedScoreRow = {
  awardPoints: number | null;
  cardPointsAnimals?: number | null;
  cardPointsJovian?: number | null;
  cardPointsMicrobes?: number | null;
  cardPointsTotal: number | null;
  citiesPoints: number | null;
  finalMegacredits: number | null;
  greeneryPoints: number | null;
  milestonePoints: number | null;
  normalizedPlayerName: string;
  originalPlayerName: string;
  sourceWords: string[];
  status: 'exact_base_layout' | 'partial' | 'unresolved';
  totalPoints: number | null;
  trPoints: number | null;
  unsupportedComponentCount: number;
};

export type ImportedPlacement = {
  isWinner: boolean;
  normalizedPlayerName: string;
  placement: number;
};

export type TerraformingMarsEndgameOcrParseResult = {
  generationCount: number | null;
  parserIdentity: typeof TERRAFORMING_MARS_ENDGAME_OCR_PARSER_IDENTITY;
  placements: ImportedPlacement[];
  scoreRows: ImportedScoreRow[];
  status: 'partial' | 'success' | 'unresolved';
  warnings: string[];
};

function parseInteger(value: string) {
  const normalized = value.replace(/[,_]/g, '').replace(/[−–—]/g, '-');
  return /^-?\d+$/.test(normalized) ? Number(normalized) : null;
}

function groupWordsByLine(words: BrowserOcrWord[]) {
  const groups = new Map<string, BrowserOcrWord[]>();
  for (const word of words) {
    groups.set(word.lineKey, [...(groups.get(word.lineKey) ?? []), word]);
  }

  return [...groups.values()].map((line) =>
    line.sort((left, right) => left.left - right.left),
  );
}

function findPlayerLine(
  lines: BrowserOcrWord[][],
  normalizedPlayerName: string,
) {
  const matches = lines.filter((line) =>
    normalizePlayerAlias(line.map((word) => word.text).join(' ')).includes(
      normalizedPlayerName,
    ),
  );
  return matches.length === 1 ? matches[0] : null;
}

function buildScoreRow(input: {
  line: BrowserOcrWord[] | null;
  normalizedPlayerName: string;
  originalPlayerName: string;
}): ImportedScoreRow {
  if (!input.line) {
    return {
      awardPoints: null,
      cardPointsTotal: null,
      citiesPoints: null,
      finalMegacredits: null,
      greeneryPoints: null,
      milestonePoints: null,
      normalizedPlayerName: input.normalizedPlayerName,
      originalPlayerName: input.originalPlayerName,
      sourceWords: [],
      status: 'unresolved',
      totalPoints: null,
      trPoints: null,
      unsupportedComponentCount: 0,
    };
  }

  const numericValues = input.line
    .map((word) => parseInteger(word.text))
    .filter((value): value is number => value !== null);
  if (numericValues.length < 7) {
    return {
      awardPoints: numericValues[2] ?? null,
      cardPointsTotal: null,
      citiesPoints: numericValues[4] ?? null,
      finalMegacredits: numericValues.at(-1) ?? null,
      greeneryPoints: numericValues[3] ?? null,
      milestonePoints: numericValues[1] ?? null,
      normalizedPlayerName: input.normalizedPlayerName,
      originalPlayerName: input.originalPlayerName,
      sourceWords: input.line.map((word) => word.text),
      status: 'partial',
      totalPoints: numericValues.length >= 2 ? numericValues.at(-2) ?? null : null,
      trPoints: numericValues[0] ?? null,
      unsupportedComponentCount: 0,
    };
  }

  const unsupportedComponentCount = Math.max(numericValues.length - 8, 0);
  const baseLayout = numericValues.length === 8;
  const trPoints = numericValues[0];
  const milestonePoints = numericValues[1];
  const awardPoints = numericValues[2];
  const greeneryPoints = numericValues[3];
  const citiesPoints = numericValues[4];
  const cardPointsTotal = baseLayout ? numericValues[5] : null;
  const totalPoints = numericValues.at(-2) ?? null;
  const finalMegacredits = numericValues.at(-1) ?? null;
  const reconciles =
    baseLayout &&
    totalPoints ===
      trPoints +
        milestonePoints +
        awardPoints +
        greeneryPoints +
        citiesPoints +
        (cardPointsTotal ?? 0);

  return {
    awardPoints,
    cardPointsTotal,
    citiesPoints,
    finalMegacredits,
    greeneryPoints,
    milestonePoints,
    normalizedPlayerName: input.normalizedPlayerName,
    originalPlayerName: input.originalPlayerName,
    sourceWords: input.line.map((word) => word.text),
    status: reconciles ? 'exact_base_layout' : 'partial',
    totalPoints,
    trPoints,
    unsupportedComponentCount,
  };
}

function derivePlacements(scoreRows: ImportedScoreRow[]): ImportedPlacement[] {
  if (
    scoreRows.length === 0 ||
    scoreRows.some(
      (row) => row.totalPoints === null || row.finalMegacredits === null,
    )
  ) {
    return [];
  }

  const ordered = [...scoreRows].sort(
    (left, right) =>
      (right.totalPoints ?? 0) - (left.totalPoints ?? 0) ||
      (right.finalMegacredits ?? 0) - (left.finalMegacredits ?? 0),
  );
  let previous: ImportedScoreRow | null = null;
  let previousPlacement = 0;

  return ordered.map((row, index) => {
    const tiedWithPrevious =
      previous?.totalPoints === row.totalPoints &&
      previous?.finalMegacredits === row.finalMegacredits;
    const placement = tiedWithPrevious ? previousPlacement : index + 1;
    previous = row;
    previousPlacement = placement;
    return {
      isWinner: placement === 1,
      normalizedPlayerName: row.normalizedPlayerName,
      placement,
    };
  });
}

export function parseTerraformingMarsEndgameOcr(input: {
  players: Array<{ normalizedValue: string; originalValue: string }>;
  rawText: string;
  words: BrowserOcrWord[];
}): TerraformingMarsEndgameOcrParseResult {
  const generationMatch = /Victory point breakdown after\s+(\d+)\s+generations?/i.exec(
    input.rawText,
  );
  const lines = groupWordsByLine(input.words);
  const scoreRows = input.players.map((player) =>
    buildScoreRow({
      line: findPlayerLine(lines, player.normalizedValue),
      normalizedPlayerName: player.normalizedValue,
      originalPlayerName: player.originalValue,
    }),
  );
  const warnings: string[] = [];
  const unresolvedCount = scoreRows.filter(
    (row) => row.status === 'unresolved',
  ).length;
  const partialCount = scoreRows.filter((row) => row.status === 'partial').length;
  const unsupportedComponentCount = scoreRows.reduce(
    (total, row) => total + row.unsupportedComponentCount,
    0,
  );

  if (input.words.length === 0) {
    warnings.push(
      'Structured OCR positions were unavailable, so score columns could not be assigned safely.',
    );
  }
  if (unresolvedCount > 0) {
    warnings.push(`${unresolvedCount} player score row${unresolvedCount === 1 ? '' : 's'} could not be located.`);
  }
  if (partialCount > 0) {
    warnings.push(`${partialCount} player score row${partialCount === 1 ? '' : 's'} require verification.`);
  }
  if (unsupportedComponentCount > 0) {
    warnings.push(
      `${unsupportedComponentCount} expansion score component${unsupportedComponentCount === 1 ? '' : 's'} remain visible but are not mapped to TM Stats score columns.`,
    );
  }

  return {
    generationCount: generationMatch ? Number(generationMatch[1]) : null,
    parserIdentity: TERRAFORMING_MARS_ENDGAME_OCR_PARSER_IDENTITY,
    placements: derivePlacements(scoreRows),
    scoreRows,
    status:
      scoreRows.length > 0 && scoreRows.every((row) => row.status === 'exact_base_layout')
        ? 'success'
        : scoreRows.some((row) => row.status !== 'unresolved')
          ? 'partial'
          : 'unresolved',
    warnings,
  };
}
