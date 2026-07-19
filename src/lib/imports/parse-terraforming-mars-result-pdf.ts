import type { ImportGameReferenceCatalog } from '@/lib/db/reference-repo';
import { buildPlayerNameMatchKeys } from './build-player-name-match-keys';
import type { ImportedScoreRow } from './parse-terraforming-mars-endgame-ocr';
import type { ImportObjectiveEvidence } from './parse-terraforming-mars-log';
import type { ImportPlayedEntityEvidence } from './parse-terraforming-mars-played-entities';
import { parseEndgameScoreScreenshot } from './parse-endgame-score-screenshot';
import {
  parseScoreDetailsScreenshot,
  type ImportPlayerCardScoringSummary,
  type ParsedScreenshotAwardPlacement,
  type ParsedScreenshotMilestoneClaim,
} from './parse-score-details-screenshot';
import { normalizePlayerAlias } from './normalize-player-alias';
import { readGameResultPdf } from './read-game-result-pdf';
import type {
  GameResultGlobalParameters,
  ReadGameResultEvidenceResult,
} from './read-game-result-types';

export const TERRAFORMING_MARS_RESULT_PDF_PARSER_IDENTITY =
  'terraforming-mars-result-pdf-text-v1' as const;

export type TerraformingMarsResultPdfParseResult = {
  awardPlacements: ParsedScreenshotAwardPlacement[];
  cardScoring: ImportPlayerCardScoringSummary[];
  generationCount: number | null;
  globalParameters: GameResultGlobalParameters[];
  milestoneClaims: ParsedScreenshotMilestoneClaim[];
  objectiveEvidence: ImportObjectiveEvidence[];
  parserIdentity: typeof TERRAFORMING_MARS_RESULT_PDF_PARSER_IDENTITY;
  rawText: string;
  scoreRows: ImportedScoreRow[];
  warnings: string[];
};

export function isTerraformingMarsResultPdf(file: File) {
  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );
}

function uniqueReferences(
  rows: Array<{ id: string; name: string }>,
) {
  return [
    ...new Map(
      rows.map((row) => [
        `${row.id}:${normalizePlayerAlias(row.name)}`,
        row,
      ]),
    ).values(),
  ];
}

function resolveExpectedPlayer(input: {
  importedPlayerName: string;
  players: Array<{ normalizedValue: string; originalValue: string }>;
}) {
  const importedKey = normalizePlayerAlias(input.importedPlayerName);
  const matches = buildPlayerNameMatchKeys(
    input.players.map((player) => player.originalValue),
  ).filter((candidate) => candidate.keys.includes(importedKey));

  if (matches.length !== 1) {
    return null;
  }

  return (
    input.players.find(
      (player) => player.originalValue === matches[0].playerName,
    ) ?? null
  );
}

function findSourceLine(
  lines: string[],
  value: string,
  prefix?: string,
) {
  const normalizedValue = normalizePlayerAlias(value);
  const normalizedPrefix = prefix ? normalizePlayerAlias(prefix) : '';
  const index = lines.findIndex((line) => {
    const normalizedLine = normalizePlayerAlias(line);
    return (
      normalizedLine.includes(normalizedValue) &&
      (!normalizedPrefix || normalizedLine.includes(normalizedPrefix))
    );
  });

  return {
    line: index >= 0 ? lines[index] : value,
    lineNumber: index >= 0 ? index + 1 : lines.length + 1,
  };
}

function isCompleteScoreRow(
  row: ReturnType<typeof parseEndgameScoreScreenshot>['playerRows'][number],
) {
  return [
    row.awardPoints,
    row.cardPointsTotal,
    row.citiesPoints,
    row.finalMegacredits,
    row.greeneryPoints,
    row.milestonePoints,
    row.totalPoints,
    row.trPoints,
  ].every((value) => typeof value === 'number');
}

export function buildTerraformingMarsResultPdfParse(input: {
  catalog: ImportGameReferenceCatalog;
  evidence: ReadGameResultEvidenceResult;
  playedEntityEvidence: ImportPlayedEntityEvidence[];
  players: Array<{ normalizedValue: string; originalValue: string }>;
}): TerraformingMarsResultPdfParseResult {
  const parsedScores = parseEndgameScoreScreenshot(input.evidence.endgameLines, {
    generationCount: input.evidence.generationCount,
    layout: input.evidence.endgameLayout,
  });
  const scoreDetails = parseScoreDetailsScreenshot({
    awardReferences: uniqueReferences([
      ...input.catalog.awards.map((award) => ({
        id: award.awardId,
        name: award.awardName,
      })),
      ...input.catalog.aliases
        .filter((alias) => alias.entityType === 'award')
        .map((alias) => ({ id: alias.entityId, name: alias.aliasText })),
    ]),
    cardReferences: input.catalog.cards.map((card) => ({
      cardName: card.cardName,
      id: card.id,
      sourceTags: card.sourceTags,
    })),
    events: input.playedEntityEvidence.flatMap((evidence) =>
      evidence.entityType === 'card' && evidence.canonicalName
        ? [
            {
              actor: evidence.originalPlayerValue,
              card: evidence.canonicalName,
              eventType: 'card_played',
            },
          ]
        : [],
    ),
    expectedAwardPointsByPlayerName: Object.fromEntries(
      parsedScores.playerRows.flatMap((row) =>
        typeof row.awardPoints === 'number'
          ? [[row.playerName, row.awardPoints]]
          : [],
      ),
    ),
    expectedCardPointTotalsByPlayerName: Object.fromEntries(
      parsedScores.playerRows.flatMap((row) =>
        typeof row.cardPointsTotal === 'number'
          ? [[row.playerName, row.cardPointsTotal]]
          : [],
      ),
    ),
    expectedMilestonePointsByPlayerName: Object.fromEntries(
      parsedScores.playerRows.flatMap((row) =>
        typeof row.milestonePoints === 'number'
          ? [[row.playerName, row.milestonePoints]]
          : [],
      ),
    ),
    expectedPlayerNames: parsedScores.playerRows.map((row) => row.playerName),
    milestoneReferences: uniqueReferences([
      ...input.catalog.milestones.map((milestone) => ({
        id: milestone.milestoneId,
        name: milestone.milestoneName,
      })),
      ...input.catalog.aliases
        .filter((alias) => alias.entityType === 'milestone')
        .map((alias) => ({ id: alias.entityId, name: alias.aliasText })),
    ]),
    ocrColumns: input.evidence.scoreDetailsColumns,
  });
  const cardScoringByPlayer = new Map(
    scoreDetails.cardScoring.map((summary) => [
      normalizePlayerAlias(summary.playerName),
      summary,
    ]),
  );
  const scoreRows = parsedScores.playerRows.map((row): ImportedScoreRow => {
    const resolvedPlayer = resolveExpectedPlayer({
      importedPlayerName: row.playerName,
      players: input.players,
    });
    const cardScoring = cardScoringByPlayer.get(
      normalizePlayerAlias(row.playerName),
    );
    const hasCardCategory = (
      category: 'animals' | 'jovian' | 'microbes',
    ) =>
      cardScoring?.autoScoredCards.some(
        (card) => card.category === category,
      ) ?? false;
    const sourceLine = input.evidence.endgameLines.find((line) =>
      normalizePlayerAlias(line).startsWith(
        normalizePlayerAlias(row.playerName),
      ),
    );

    return {
      awardPoints: row.awardPoints ?? null,
      cardPointsAnimals: hasCardCategory('animals')
        ? cardScoring?.totals.animals ?? null
        : null,
      cardPointsJovian: hasCardCategory('jovian')
        ? cardScoring?.totals.jovian ?? null
        : null,
      cardPointsMicrobes: hasCardCategory('microbes')
        ? cardScoring?.totals.microbes ?? null
        : null,
      cardPointsTotal: row.cardPointsTotal ?? null,
      citiesPoints: row.citiesPoints ?? null,
      finalMegacredits: row.finalMegacredits ?? null,
      greeneryPoints: row.greeneryPoints ?? null,
      milestonePoints: row.milestonePoints ?? null,
      normalizedPlayerName:
        resolvedPlayer?.normalizedValue ?? normalizePlayerAlias(row.playerName),
      originalPlayerName: resolvedPlayer?.originalValue ?? row.playerName,
      sourceWords: sourceLine?.split(/\s+/) ?? [],
      status: isCompleteScoreRow(row) ? 'exact_base_layout' : 'partial',
      totalPoints: row.totalPoints ?? null,
      trPoints: row.trPoints ?? null,
      unsupportedComponentCount: 0,
    };
  });
  const detailLines = input.evidence.scoreDetailsColumns.flatMap(
    (column) => column.textLines,
  );
  const milestoneEvidence = scoreDetails.milestoneClaims.map(
    (claim): ImportObjectiveEvidence => {
      const source = findSourceLine(detailLines, claim.milestoneName, 'claimed');
      const canonicalMilestone = input.catalog.milestones.find(
        (milestone) => milestone.milestoneId === claim.matchedMilestoneId,
      );
      const isAlias =
        canonicalMilestone &&
        normalizePlayerAlias(canonicalMilestone.milestoneName) !==
          normalizePlayerAlias(claim.milestoneName);
      return {
        candidateEntityIds: claim.matchedMilestoneId
          ? [claim.matchedMilestoneId]
          : [],
        canonicalId: claim.matchedMilestoneId,
        canonicalName: canonicalMilestone?.milestoneName ?? null,
        lineNumber: source.lineNumber,
        normalizedPlayerValue: normalizePlayerAlias(claim.playerName),
        normalizedValue: normalizePlayerAlias(claim.milestoneName),
        originalLine: source.line,
        originalPlayerValue: claim.playerName,
        originalValue: claim.milestoneName,
        resolution: canonicalMilestone ? (isAlias ? 'alias' : 'exact') : 'unknown',
        source: 'result_pdf',
        type: 'milestone',
      };
    },
  );
  const uniqueAwardPlacements = [
    ...new Map(
      scoreDetails.awardPlacements.map((placement) => [
        placement.matchedAwardId ?? normalizePlayerAlias(placement.awardName),
        placement,
      ]),
    ).values(),
  ];
  const awardEvidence = uniqueAwardPlacements.map(
    (placement): ImportObjectiveEvidence => {
      const source = findSourceLine(
        detailLines,
        placement.awardName,
        `${placement.placement === 1 ? '1st' : '2nd'} place`,
      );
      const canonicalAward = input.catalog.awards.find(
        (award) => award.awardId === placement.matchedAwardId,
      );
      const isAlias =
        canonicalAward &&
        normalizePlayerAlias(canonicalAward.awardName) !==
          normalizePlayerAlias(placement.awardName);
      return {
        candidateEntityIds: placement.matchedAwardId
          ? [placement.matchedAwardId]
          : [],
        canonicalId: placement.matchedAwardId,
        canonicalName: canonicalAward?.awardName ?? null,
        lineNumber: source.lineNumber,
        normalizedPlayerValue: normalizePlayerAlias(
          placement.fundedByPlayerName ?? '',
        ),
        normalizedValue: normalizePlayerAlias(placement.awardName),
        originalLine: source.line,
        originalPlayerValue: placement.fundedByPlayerName ?? '',
        originalValue: placement.awardName,
        resolution: canonicalAward ? (isAlias ? 'alias' : 'exact') : 'unknown',
        source: 'result_pdf',
        type: 'award',
      };
    },
  );
  const rawText = [
    ...input.evidence.endgameLines,
    ...detailLines,
    ...(input.evidence.globalParameters ?? []).map(
      (row) =>
        `${row.playerName} temperature ${row.temperature} oxygen ${row.oxygen} oceans ${row.oceans}${
          row.venus != null ? ` venus ${row.venus}` : ''
        } total ${row.total}`,
    ),
  ].join('\n');
  const warnings: string[] = [];
  if (scoreRows.some((row) => row.status !== 'exact_base_layout')) {
    warnings.push('One or more PDF score rows require correction.');
  }
  if (
    scoreDetails.milestoneClaims.some((claim) => !claim.matchedMilestoneId) ||
    scoreDetails.awardPlacements.some((placement) => !placement.matchedAwardId)
  ) {
    warnings.push(
      'One or more PDF milestones or awards are not in the canonical catalog.',
    );
  }

  return {
    awardPlacements: scoreDetails.awardPlacements,
    cardScoring: scoreDetails.cardScoring,
    generationCount: parsedScores.generationCount ?? null,
    globalParameters: input.evidence.globalParameters ?? [],
    milestoneClaims: scoreDetails.milestoneClaims,
    objectiveEvidence: [...milestoneEvidence, ...awardEvidence],
    parserIdentity: TERRAFORMING_MARS_RESULT_PDF_PARSER_IDENTITY,
    rawText,
    scoreRows,
    warnings,
  };
}

export async function parseTerraformingMarsResultPdf(input: {
  bytes: Uint8Array;
  catalog: ImportGameReferenceCatalog;
  playedEntityEvidence: ImportPlayedEntityEvidence[];
  players: Array<{ normalizedValue: string; originalValue: string }>;
}) {
  const evidence = await readGameResultPdf(input.bytes, {
    expectedPlayerNames: input.players.map((player) => player.originalValue),
  });

  return buildTerraformingMarsResultPdfParse({
    catalog: input.catalog,
    evidence,
    playedEntityEvidence: input.playedEntityEvidence,
    players: input.players,
  });
}
