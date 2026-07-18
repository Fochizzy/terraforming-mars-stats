export const GAME_MECHANIC_PARSER_VERSION = 'tm-export-log-mechanics-v1';

export const gameMechanicStates = [
  'confirmed_present',
  'confirmed_absent',
  'incomplete_evidence',
  'unsupported_log_pattern',
  'conflicting_evidence',
] as const;

export type GameMechanicState = (typeof gameMechanicStates)[number];
export type ParserConfidence = 'high' | 'medium' | 'low';

export type MechanicCoverage = {
  evidenceLineCount: number;
  parsedEventCount: number;
  sourceFormat: 'serialized_game' | 'upstream_log' | 'unknown';
  status: 'complete' | 'partial' | 'unsupported';
  warnings: string[];
};

export type ParsedVenusEvent = {
  afterValue: number | null;
  beforeValue: number | null;
  confidence: ParserConfidence;
  coverage: Record<string, unknown>;
  eventKey: string;
  eventOrder: number;
  generationNumber: number | null;
  rawEvidence: string;
  sourceEntity: string | null;
  sourcePlayerName: string | null;
  trackerSteps: number;
};

export type ParsedColonyEvent = {
  colonyId: string;
  colonyTrackAfter: number | null;
  colonyTrackBefore: number | null;
  confidence: ParserConfidence;
  coverage: Record<string, unknown>;
  eventDetails: Record<string, unknown>;
  eventKey: string;
  eventOrder: number;
  eventType: 'built_colony' | 'traded_with_colony';
  generationNumber: number | null;
  paymentOrFleetInfo: string | null;
  rawEvidence: string;
  sourcePlayerName: string | null;
};

export type ParsedGameMechanics = {
  colonies: {
    coverage: MechanicCoverage;
    events: ParsedColonyEvent[];
    state: GameMechanicState;
  };
  parserVersion: typeof GAME_MECHANIC_PARSER_VERSION;
  sourceCoverage: Record<string, MechanicCoverage>;
  venus: {
    coverage: MechanicCoverage;
    events: ParsedVenusEvent[];
    finalVenusScale: number | null;
    state: GameMechanicState;
  };
};

const colonyIds = new Map(
  [
    'callisto',
    'ceres',
    'enceladus',
    'europa',
    'ganymede',
    'io',
    'leavitt',
    'luna',
    'miranda',
    'pluto',
    'titan',
    'triton',
    'venus',
  ].map((id) => [id, id]),
);

function normalizeLine(line: string) {
  return line.replace(/^\s*\[[^\]]+\]:\s*/, '').trim();
}

function detectOptionValues(rawLogText: string, mechanic: 'colonies' | 'venus') {
  const patterns =
    mechanic === 'venus'
      ? [
          /["']venusNextExtension["']\s*[:=]\s*(true|false)/gi,
          /\bvenus\s+next(?:\s+(?:option|extension))?\s*(?::|=|is)?\s*(enabled|disabled|true|false|yes|no)\b/gi,
        ]
      : [
          /["']coloniesExtension["']\s*[:=]\s*(true|false)/gi,
          /\bcolonies(?:\s+(?:option|extension))?\s*(?::|=|is)?\s*(enabled|disabled|true|false|yes|no)\b/gi,
        ];
  const values: boolean[] = [];

  for (const pattern of patterns) {
    for (const match of rawLogText.matchAll(pattern)) {
      const value = match[1]?.toLowerCase();
      values.push(value === 'true' || value === 'enabled' || value === 'yes');
    }
  }

  return values;
}

function parseGeneration(line: string, currentGeneration: number | null) {
  const match = line.match(/^generation\s+(\d+)\b/i);
  return match ? Number(match[1]) : currentGeneration;
}

function canonicalColonyId(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/\s+colony(?:\s+tile)?$/i, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return colonyIds.get(normalized) ?? null;
}

function sourcePlayerName(value: string) {
  const normalized = value.trim();

  if (!normalized || /^world government$/i.test(normalized)) {
    return null;
  }

  return normalized;
}

function sourceFormat(rawLogText: string): MechanicCoverage['sourceFormat'] {
  if (/\b(?:venusNextExtension|coloniesExtension|venusScaleLevel)\b/.test(rawLogText)) {
    return 'serialized_game';
  }

  if (/^\s*\[[^\]]+\]:/m.test(rawLogText)) {
    return 'upstream_log';
  }

  return 'unknown';
}

function buildCoverage(input: {
  evidenceLineCount: number;
  parsedEventCount: number;
  sourceFormat: MechanicCoverage['sourceFormat'];
  warnings: string[];
}): MechanicCoverage {
  return {
    evidenceLineCount: input.evidenceLineCount,
    parsedEventCount: input.parsedEventCount,
    sourceFormat: input.sourceFormat,
    status: input.warnings.length > 0 ? 'partial' : 'complete',
    warnings: input.warnings,
  };
}

function deriveState(input: {
  hasCanonicalEvidence: boolean;
  hasUnsupportedEvidence: boolean;
  optionValues: boolean[];
  rawLogText: string;
}): GameMechanicState {
  const hasPresentOption = input.optionValues.includes(true);
  const hasAbsentOption = input.optionValues.includes(false);

  if (hasPresentOption && hasAbsentOption) {
    return 'conflicting_evidence';
  }

  if (hasAbsentOption && input.hasCanonicalEvidence) {
    return 'conflicting_evidence';
  }

  if (hasPresentOption || input.hasCanonicalEvidence) {
    return 'confirmed_present';
  }

  if (hasAbsentOption) {
    return 'confirmed_absent';
  }

  if (input.hasUnsupportedEvidence) {
    return 'unsupported_log_pattern';
  }

  if (!input.rawLogText.trim()) {
    return 'incomplete_evidence';
  }

  return 'confirmed_absent';
}

function lastNumericVenusScale(rawLogText: string) {
  const patterns = [
    /["']venusScaleLevel["']\s*[:=]\s*(\d+)/gi,
    /\bvenus\s+scale\s*(?:is|=|:)\s*(\d+)\b/gi,
  ];
  let value: number | null = null;

  for (const pattern of patterns) {
    for (const match of rawLogText.matchAll(pattern)) {
      value = Number(match[1]);
    }
  }

  return value;
}

export function parseImportedGameMechanics(rawLogText: string): ParsedGameMechanics {
  const lines = rawLogText.split(/\r?\n/);
  const format = sourceFormat(rawLogText);
  const venusOptionValues = detectOptionValues(rawLogText, 'venus');
  const coloniesOptionValues = detectOptionValues(rawLogText, 'colonies');
  const venusWarnings: string[] = [];
  const colonyWarnings: string[] = [];
  const venusEvents: ParsedVenusEvent[] = [];
  const colonyEvents: ParsedColonyEvent[] = [];
  let generationNumber: number | null = null;
  let venusEvidenceLineCount = 0;
  let colonyEvidenceLineCount = 0;
  let hasVenusCanonicalEvidence = false;
  let hasColoniesCanonicalEvidence = false;
  let hasUnsupportedVenusEvidence = false;
  let hasUnsupportedColoniesEvidence = false;

  for (const [eventOrder, rawLine] of lines.entries()) {
    const line = normalizeLine(rawLine);
    if (!line) {
      continue;
    }

    generationNumber = parseGeneration(line, generationNumber);

    const venusStepMatch = line.match(
      /^(.*?)\s+increased\s+venus\s+scale\s+(-?\d+)\s+step\(s\)\.?$/i,
    );
    const venusSnapshotMatch = line.match(
      /^(.*?)?\s*venus\s+scale\s*(\d+)\s*(?:→|->)\s*(\d+)\.?$/i,
    );

    if (venusStepMatch) {
      const steps = Number(venusStepMatch[2]);
      if (steps !== 0) {
        hasVenusCanonicalEvidence = true;
        venusEvidenceLineCount += 1;
        const playerName = sourcePlayerName(venusStepMatch[1] ?? '');
        venusEvents.push({
          afterValue: null,
          beforeValue: null,
          confidence: 'high',
          coverage: { detail: 'tracker_steps_without_snapshot' },
          eventKey: `venus:${eventOrder}`,
          eventOrder,
          generationNumber,
          rawEvidence: rawLine,
          sourceEntity: playerName ? null : venusStepMatch[1]?.trim() || null,
          sourcePlayerName: playerName,
          trackerSteps: steps,
        });
      }
    } else if (venusSnapshotMatch) {
      const beforeValue = Number(venusSnapshotMatch[2]);
      const afterValue = Number(venusSnapshotMatch[3]);
      const steps = afterValue - beforeValue;

      hasVenusCanonicalEvidence = true;
      venusEvidenceLineCount += 1;

      if (steps === 0) {
        venusWarnings.push(`venus_snapshot_without_movement_line_${eventOrder + 1}`);
      } else {
        const playerName = sourcePlayerName(venusSnapshotMatch[1] ?? '');
        venusEvents.push({
          afterValue,
          beforeValue,
          confidence: 'medium',
          coverage: { detail: 'tracker_snapshot' },
          eventKey: `venus:${eventOrder}`,
          eventOrder,
          generationNumber,
          rawEvidence: rawLine,
          sourceEntity: playerName ? null : venusSnapshotMatch[1]?.trim() || null,
          sourcePlayerName: playerName,
          trackerSteps: steps,
        });
      }
    } else if (/\bvenus\s+(?:next|scale|tracker|global\s+parameter|option|extension)\b/i.test(line)) {
      venusEvidenceLineCount += 1;
      if (!/(?:true|false|enabled|disabled|yes|no|\d+)/i.test(line)) {
        hasUnsupportedVenusEvidence = true;
        venusWarnings.push(`unsupported_venus_line_${eventOrder + 1}`);
      }
    }

    const buildMatch = line.match(/^(.*?)\s+built\s+a\s+colony\s+on\s+(.+?)\.?$/i);
    const tradeMatch = line.match(
      /^(.*?)\s+spent\s+(.+?)\s+to\s+trade\s+with\s+(.+?)\.?$/i,
    );
    const directTradeMatch = line.match(/^(.*?)\s+traded\s+with\s+(.+?)\.?$/i);

    if (buildMatch || tradeMatch || directTradeMatch) {
      const actor = buildMatch?.[1] ?? tradeMatch?.[1] ?? directTradeMatch?.[1] ?? '';
      const rawColony = buildMatch?.[2] ?? tradeMatch?.[3] ?? directTradeMatch?.[2] ?? '';
      const colonyId = canonicalColonyId(rawColony);

      hasColoniesCanonicalEvidence = true;
      colonyEvidenceLineCount += 1;

      if (!colonyId) {
        colonyWarnings.push(`unsupported_colony_identifier_line_${eventOrder + 1}`);
      } else {
        colonyEvents.push({
          colonyId,
          colonyTrackAfter: null,
          colonyTrackBefore: null,
          confidence: 'high',
          coverage: { detail: 'upstream_log_action' },
          eventDetails: {},
          eventKey: `colony:${eventOrder}`,
          eventOrder,
          eventType: buildMatch ? 'built_colony' : 'traded_with_colony',
          generationNumber,
          paymentOrFleetInfo: tradeMatch?.[2]?.trim() ?? null,
          rawEvidence: rawLine,
          sourcePlayerName: sourcePlayerName(actor),
        });
      }
    } else if (/\bcolon(?:ies|y)\s+(?:setup|option|extension)\b/i.test(line)) {
      colonyEvidenceLineCount += 1;
      if (!/(?:true|false|enabled|disabled|yes|no)/i.test(line)) {
        hasUnsupportedColoniesEvidence = true;
        colonyWarnings.push(`unsupported_colonies_line_${eventOrder + 1}`);
      }
    }
  }

  const venusState = deriveState({
    hasCanonicalEvidence: hasVenusCanonicalEvidence,
    hasUnsupportedEvidence: hasUnsupportedVenusEvidence,
    optionValues: venusOptionValues,
    rawLogText,
  });
  const coloniesState = deriveState({
    hasCanonicalEvidence: hasColoniesCanonicalEvidence,
    hasUnsupportedEvidence: hasUnsupportedColoniesEvidence,
    optionValues: coloniesOptionValues,
    rawLogText,
  });
  const venusCoverage = buildCoverage({
    evidenceLineCount: venusEvidenceLineCount + venusOptionValues.length,
    parsedEventCount: venusEvents.length,
    sourceFormat: format,
    warnings: venusWarnings,
  });
  const coloniesCoverage = buildCoverage({
    evidenceLineCount: colonyEvidenceLineCount + coloniesOptionValues.length,
    parsedEventCount: colonyEvents.length,
    sourceFormat: format,
    warnings: colonyWarnings,
  });

  return {
    colonies: {
      coverage: coloniesCoverage,
      events: colonyEvents,
      state: coloniesState,
    },
    parserVersion: GAME_MECHANIC_PARSER_VERSION,
    sourceCoverage: {
      colonies: coloniesCoverage,
      venus: venusCoverage,
    },
    venus: {
      coverage: venusCoverage,
      events: venusEvents,
      finalVenusScale: lastNumericVenusScale(rawLogText),
      state: venusState,
    },
  };
}
