import { normalizeDomainText } from '@/lib/ocr/domain-matcher';
import {
  reviewContractForCanonicalResolution,
  type GameLogEventConfidenceLevel,
  type GameLogEventReviewState,
} from './game-log-event-contract';
import { normalizePlayerAlias } from './normalize-player-alias';

export const TERRAFORMING_MARS_VENUS_COLONIES_PARSER_VERSION =
  'terraforming-mars-venus-colonies-v1' as const;

export const EXPANSION_DETECTION_STATES = [
  'confirmed_present',
  'confirmed_absent',
  'incomplete_evidence',
  'unsupported_log_pattern',
  'conflicting_evidence',
  'historical_parser_verified_owner_confirmed_absent',
  'historical_owner_confirmed_absent',
] as const;

export type ExpansionDetectionState =
  (typeof EXPANSION_DETECTION_STATES)[number];

export type ExpansionMechanicEventType =
  | 'colony_built'
  | 'colony_setup_added'
  | 'colony_track_decreased'
  | 'colony_track_increased'
  | 'colony_traded'
  | 'venus_scale_decreased'
  | 'venus_scale_increased';

export type TrustedExpansionOptionEvidence = {
  colonies: boolean | null;
  originalEvidence: string;
  // Explicit exported options are the primary source. A result-PDF global
  // parameter table that renders a Venus contribution column is trusted Venus
  // option evidence; the PDF never carries Colonies option evidence, so
  // colonies stays null in that case.
  source: 'exported_game_options' | 'result_pdf_global_parameters';
  venusNext: boolean | null;
};

export type TrustedFinalVenusScaleEvidence = {
  generationNumber?: number | null;
  originalEvidence: string;
  source: 'exported_log' | 'result_pdf';
  value: number;
};

export type ExpansionPlayerResolution = {
  selectedPlayerId: string;
  sourcePlayerText: string;
};

export type ParsedExpansionMechanicEvent = {
  actor: string | null;
  attribution: 'player' | 'unattributed' | 'world_government';
  colonyId: string | null;
  colonyName: string | null;
  confidenceLevel: GameLogEventConfidenceLevel;
  reviewState: GameLogEventReviewState;
  eventIdentity: string;
  eventType: ExpansionMechanicEventType;
  generationNumber: number | null;
  lineNumber: number;
  parameterAfter: number | null;
  parameterBefore: number | null;
  parameterSteps: number | null;
  paymentAmount: number | null;
  paymentResource: string | null;
  playerId: string | null;
  rawLine: string;
  sourceEntity: string | null;
  sourceProvenance: 'exported_log';
  trEffect: number | null;
};

export type ExpansionDetection = {
  evidence: string[];
  state: ExpansionDetectionState;
  unsupportedLineNumbers: number[];
};

export type TerraformingMarsExpansionParseResult = {
  colonies: ExpansionDetection;
  duplicateEventCount: number;
  events: ParsedExpansionMechanicEvent[];
  finalVenusScale: number | null;
  parserVersion: typeof TERRAFORMING_MARS_VENUS_COLONIES_PARSER_VERSION;
  sourceCoverage: {
    complete: boolean;
    finalGreeneryPlacementSeen: boolean;
    gameIdTerminatorSeen: boolean;
    generationNumbers: number[];
    lineCount: number;
    parsedMechanicLineCount: number;
    unsupportedLineCount: number;
  };
  unresolvedPlayerAssociations: Array<{
    actor: string;
    eventIdentity: string;
    lineNumber: number;
  }>;
  venusNext: ExpansionDetection;
  warnings: string[];
};

type CanonicalColony = {
  id: string;
  name: string;
};

// Upstream ColonyName values at source commit
// 7a6f98f09ac2a558969c092d317c313806af7b73. Identity is the stable code;
// display text is retained only to resolve exported COLONY log data.
const CANONICAL_COLONIES: CanonicalColony[] = [
  { id: 'callisto', name: 'Callisto' },
  { id: 'ceres', name: 'Ceres' },
  { id: 'deimos', name: 'Deimos' },
  { id: 'enceladus', name: 'Enceladus' },
  { id: 'europa', name: 'Europa' },
  { id: 'ganymede', name: 'Ganymede' },
  { id: 'hygiea', name: 'Hygiea' },
  { id: 'iapetus', name: 'Iapetus' },
  { id: 'iapetus_ii', name: 'Iapetus II' },
  { id: 'io', name: 'Io' },
  { id: 'kuiper', name: 'Kuiper' },
  { id: 'leavitt', name: 'Leavitt' },
  { id: 'leavitt_ii', name: 'Leavitt II' },
  { id: 'luna', name: 'Luna' },
  { id: 'mercury', name: 'Mercury' },
  { id: 'miranda', name: 'Miranda' },
  { id: 'pallas', name: 'Pallas' },
  { id: 'pluto', name: 'Pluto' },
  { id: 'terra', name: 'Terra' },
  { id: 'titan', name: 'Titan' },
  { id: 'titania', name: 'Titania' },
  { id: 'triton', name: 'Triton' },
  { id: 'venus', name: 'Venus' },
];

const COLONY_BY_NORMALIZED_NAME = new Map(
  CANONICAL_COLONIES.map((colony) => [normalizeDomainText(colony.name), colony]),
);

function stripExporterPrefix(line: string) {
  return line.replace(/^\s*\[\d+\/\d+\]:\s*/, '').trim();
}

function resolveColony(value: string) {
  return COLONY_BY_NORMALIZED_NAME.get(normalizeDomainText(value)) ?? null;
}

function buildPlayerResolutionIndex(resolutions: ExpansionPlayerResolution[]) {
  const index = new Map<string, ExpansionPlayerResolution[]>();

  for (const resolution of resolutions) {
    const key = normalizePlayerAlias(resolution.sourcePlayerText);
    index.set(key, [...(index.get(key) ?? []), resolution]);
  }

  return index;
}

function resolvePlayerId(
  actor: string,
  index: ReturnType<typeof buildPlayerResolutionIndex>,
) {
  const matches = index.get(normalizePlayerAlias(actor)) ?? [];
  return matches.length === 1 ? matches[0].selectedPlayerId : null;
}

function normalizePaymentResource(value: string) {
  const normalized = normalizeDomainText(value);

  if (normalized === 'm' || normalized.includes('megacredit')) {
    return 'megacredits';
  }
  if (normalized.includes('energy')) {
    return 'energy';
  }
  if (normalized.includes('titanium')) {
    return 'titanium';
  }
  if (normalized.includes('floater')) {
    return 'floaters';
  }
  if (normalized.includes('data')) {
    return 'data';
  }
  return normalized || value.trim();
}

function isStepSuffix(value: string) {
  return /^step(?:\(s\)|s)?$/i.test(value.trim());
}

function mechanicEvent(input: Omit<ParsedExpansionMechanicEvent, 'eventIdentity' | 'sourceProvenance'>) {
  return {
    ...input,
    eventIdentity: `${input.lineNumber}:${input.eventType}:${input.colonyId ?? 'none'}`,
    sourceProvenance: 'exported_log' as const,
  };
}

function determineState(input: {
  complete: boolean;
  explicitOption: boolean | null;
  historicalOwnerConfirmedAbsent: boolean;
  markerCount: number;
  unsupportedLineNumbers: number[];
}): ExpansionDetectionState {
  const hasPositiveEvidence = input.markerCount > 0;

  if (
    (input.explicitOption === false && hasPositiveEvidence) ||
    (input.historicalOwnerConfirmedAbsent && hasPositiveEvidence)
  ) {
    return 'conflicting_evidence';
  }
  if (input.unsupportedLineNumbers.length > 0) {
    return 'unsupported_log_pattern';
  }
  if (input.explicitOption === true || hasPositiveEvidence) {
    return 'confirmed_present';
  }
  if (input.explicitOption === false) {
    return 'confirmed_absent';
  }
  if (input.historicalOwnerConfirmedAbsent && input.complete) {
    return 'historical_parser_verified_owner_confirmed_absent';
  }
  if (input.complete) {
    return 'confirmed_absent';
  }
  return 'incomplete_evidence';
}

function isPotentialUnsupportedVenusLine(line: string) {
  return /\bvenus\s+scale\b/i.test(line);
}

function isPotentialUnsupportedColonyLine(line: string) {
  return (
    /\b(?:build|built|trade|traded|increased|decreased)\b.*\bcolony\b/i.test(
      line,
    ) ||
    /\bcolony\s+(?:track|tile)\b/i.test(line)
  );
}

function parseVenusEvent(input: {
  currentGeneration: number | null;
  line: string;
  lineNumber: number;
  playerIndex: ReturnType<typeof buildPlayerResolutionIndex>;
  rawLine: string;
}): ParsedExpansionMechanicEvent | null {
  const worldGovernment =
    /^(.+?)\s+acted as World Government and increased Venus scale\s*$/i.exec(
      input.line,
    );
  if (worldGovernment) {
    return mechanicEvent({
      actor: worldGovernment[1].trim(),
      attribution: 'world_government',
      colonyId: null,
      colonyName: null,
      confidenceLevel: 'high',
      reviewState: 'not_required',
      eventType: 'venus_scale_increased',
      generationNumber: input.currentGeneration,
      lineNumber: input.lineNumber,
      parameterAfter: null,
      parameterBefore: null,
      parameterSteps: 1,
      paymentAmount: null,
      paymentResource: null,
      playerId: null,
      rawLine: input.rawLine,
      sourceEntity: 'world_government_terraforming',
      trEffect: 0,
    });
  }

  const decrease =
    /^(.+?)\s+decreased Venus scale(?: level)?\s+(\d+)\s+(step(?:\(s\)|s)?)\s*$/i.exec(
      input.line,
    );
  if (decrease && isStepSuffix(decrease[3])) {
    const actor = decrease[1].trim();
    return mechanicEvent({
      actor,
      attribution: 'player',
      colonyId: null,
      colonyName: null,
      confidenceLevel: 'high',
      reviewState: 'not_required',
      eventType: 'venus_scale_decreased',
      generationNumber: input.currentGeneration,
      lineNumber: input.lineNumber,
      parameterAfter: null,
      parameterBefore: null,
      parameterSteps: -Number(decrease[2]),
      paymentAmount: null,
      paymentResource: null,
      playerId: resolvePlayerId(actor, input.playerIndex),
      rawLine: input.rawLine,
      sourceEntity: null,
      trEffect: 0,
    });
  }

  const rotator =
    /^(.+?)\s+removed an asteroid resource to increase Venus scale\s+(\d+)\s+(step(?:\(s\)|s)?)\s*$/i.exec(
      input.line,
    );
  if (rotator && isStepSuffix(rotator[3])) {
    const actor = rotator[1].trim();
    const steps = Number(rotator[2]);
    return mechanicEvent({
      actor,
      attribution: 'player',
      colonyId: null,
      colonyName: null,
      confidenceLevel: 'high',
      reviewState: 'not_required',
      eventType: 'venus_scale_increased',
      generationNumber: input.currentGeneration,
      lineNumber: input.lineNumber,
      parameterAfter: null,
      parameterBefore: null,
      parameterSteps: steps,
      paymentAmount: 1,
      paymentResource: 'asteroid_resource',
      playerId: resolvePlayerId(actor, input.playerIndex),
      rawLine: input.rawLine,
      sourceEntity: 'Rotator Impacts',
      trEffect: steps,
    });
  }

  const increase =
    /^(.+?)\s+(?:raised the|increased) Venus scale\s+(\d+)\s+(step(?:\(s\)|s)?)\s*$/i.exec(
      input.line,
    );
  if (increase && isStepSuffix(increase[3])) {
    const actor = increase[1].trim();
    const steps = Number(increase[2]);
    return mechanicEvent({
      actor,
      attribution: 'player',
      colonyId: null,
      colonyName: null,
      confidenceLevel: 'high',
      reviewState: 'not_required',
      eventType: 'venus_scale_increased',
      generationNumber: input.currentGeneration,
      lineNumber: input.lineNumber,
      parameterAfter: null,
      parameterBefore: null,
      parameterSteps: steps,
      paymentAmount: null,
      paymentResource: null,
      playerId: resolvePlayerId(actor, input.playerIndex),
      rawLine: input.rawLine,
      sourceEntity: null,
      trEffect: steps,
    });
  }

  return null;
}

function parseColonyEvent(input: {
  currentGeneration: number | null;
  line: string;
  lineNumber: number;
  playerIndex: ReturnType<typeof buildPlayerResolutionIndex>;
  rawLine: string;
}): ParsedExpansionMechanicEvent | null {
  const build = /^(.+?)\s+built a colony on\s+(.+?)\s*$/i.exec(input.line);
  if (build) {
    return colonyEvent(input, {
      actor: build[1].trim(),
      colonyText: build[2].trim(),
      eventType: 'colony_built',
    });
  }

  const paidTrade =
    /^(.+?)\s+spent\s+(\d+)\s+(.+?)(?:\s+from\s+(.+?))?\s+to trade with\s+(.+?)\s*$/i.exec(
      input.line,
    );
  if (paidTrade) {
    return colonyEvent(input, {
      actor: paidTrade[1].trim(),
      colonyText: paidTrade[5].trim(),
      eventType: 'colony_traded',
      paymentAmount: Number(paidTrade[2]),
      paymentResource: normalizePaymentResource(paidTrade[3]),
      sourceEntity: paidTrade[4]?.trim() ?? null,
    });
  }

  const actionTrade =
    /^(.+?)\s+used\s+(.+?)\s+action to trade with\s+(.+?)\s*$/i.exec(
      input.line,
    );
  if (actionTrade) {
    return colonyEvent(input, {
      actor: actionTrade[1].trim(),
      colonyText: actionTrade[3].trim(),
      eventType: 'colony_traded',
      sourceEntity: actionTrade[2].trim(),
    });
  }

  const freeTrade = /^(.+?)\s+traded with\s+(.+?)\s*$/i.exec(input.line);
  if (freeTrade) {
    return colonyEvent(input, {
      actor: freeTrade[1].trim(),
      colonyText: freeTrade[2].trim(),
      eventType: 'colony_traded',
    });
  }

  const trackMovement =
    /^(.+?)\s+(increased|decreased)\s+(.+?)\s+colony track\s+(\d+)\s+(step(?:\(s\)|s)?)\s*$/i.exec(
      input.line,
    );
  if (trackMovement && isStepSuffix(trackMovement[5])) {
    const amount = Number(trackMovement[4]);
    return colonyEvent(input, {
      actor: trackMovement[1].trim(),
      colonyText: trackMovement[3].trim(),
      eventType:
        trackMovement[2].toLowerCase() === 'increased'
          ? 'colony_track_increased'
          : 'colony_track_decreased',
      parameterSteps:
        trackMovement[2].toLowerCase() === 'increased' ? amount : -amount,
    });
  }

  const setup =
    /^(.+?)\s+added a new Colony tile:\s+(.+?)\s*$/i.exec(input.line);
  if (setup) {
    return colonyEvent(input, {
      actor: setup[1].trim(),
      colonyText: setup[2].trim(),
      eventType: 'colony_setup_added',
    });
  }

  return null;
}

function colonyEvent(
  input: {
    currentGeneration: number | null;
    lineNumber: number;
    playerIndex: ReturnType<typeof buildPlayerResolutionIndex>;
    rawLine: string;
  },
  event: {
    actor: string;
    colonyText: string;
    eventType: Extract<ExpansionMechanicEventType, `colony_${string}`>;
    parameterSteps?: number;
    paymentAmount?: number;
    paymentResource?: string;
    sourceEntity?: string | null;
  },
) {
  const colony = resolveColony(event.colonyText);
  // An unknown colony name is preserved as low-confidence evidence that needs
  // review; the canonical id stays null rather than being guessed.
  const colonyReview = reviewContractForCanonicalResolution(colony !== null);
  return mechanicEvent({
    actor: event.actor,
    attribution: 'player',
    colonyId: colony?.id ?? null,
    colonyName: colony?.name ?? event.colonyText,
    confidenceLevel: colonyReview.confidenceLevel,
    reviewState: colonyReview.reviewState,
    eventType: event.eventType,
    generationNumber: input.currentGeneration,
    lineNumber: input.lineNumber,
    parameterAfter: null,
    parameterBefore: null,
    parameterSteps: event.parameterSteps ?? null,
    paymentAmount: event.paymentAmount ?? null,
    paymentResource: event.paymentResource ?? null,
    playerId: resolvePlayerId(event.actor, input.playerIndex),
    rawLine: input.rawLine,
    sourceEntity: event.sourceEntity ?? null,
    trEffect: null,
  });
}

export function parseTerraformingMarsExpansionMechanics(input: {
  exportedLogText: string;
  finalVenusScaleEvidence?: TrustedFinalVenusScaleEvidence | null;
  historicalOwnerConfirmedAbsent?: boolean;
  optionEvidence?: TrustedExpansionOptionEvidence | null;
  playerResolutions?: ExpansionPlayerResolution[];
}): TerraformingMarsExpansionParseResult {
  const lines = input.exportedLogText.replace(/^\uFEFF/, '').trim()
    ? input.exportedLogText.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
    : [];
  const playerIndex = buildPlayerResolutionIndex(input.playerResolutions ?? []);
  const events: ParsedExpansionMechanicEvent[] = [];
  const venusUnsupportedLines: number[] = [];
  const colonyUnsupportedLines: number[] = [];
  const generationNumbers: number[] = [];
  let currentGeneration: number | null = null;
  let finalGreeneryPlacementSeen = false;
  let gameIdTerminatorSeen = false;

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = stripExporterPrefix(rawLine);
    const generation = /^Generation\s+(\d+)\s*$/i.exec(line);
    if (generation) {
      currentGeneration = Number(generation[1]);
      generationNumbers.push(currentGeneration);
    }
    finalGreeneryPlacementSeen ||= /^Final greenery placement\s*$/i.test(line);
    gameIdTerminatorSeen ||= /^This game id was\s+\S+\s*$/i.test(line);

    const venusEvent = parseVenusEvent({
      currentGeneration,
      line,
      lineNumber,
      playerIndex,
      rawLine,
    });
    if (venusEvent) {
      events.push(venusEvent);
    } else if (isPotentialUnsupportedVenusLine(line)) {
      venusUnsupportedLines.push(lineNumber);
    }

    const colonyEventResult = parseColonyEvent({
      currentGeneration,
      line,
      lineNumber,
      playerIndex,
      rawLine,
    });
    if (colonyEventResult) {
      events.push(colonyEventResult);
      if (!colonyEventResult.colonyId) {
        colonyUnsupportedLines.push(lineNumber);
      }
    } else if (isPotentialUnsupportedColonyLine(line)) {
      colonyUnsupportedLines.push(lineNumber);
    }
  });

  const uniqueEvents = [
    ...new Map(events.map((event) => [event.eventIdentity, event])).values(),
  ];
  const duplicateEventCount = events.length - uniqueEvents.length;
  const complete = finalGreeneryPlacementSeen && gameIdTerminatorSeen;
  const finalVenusScale = input.finalVenusScaleEvidence?.value ?? null;
  const invalidFinalVenusScale =
    finalVenusScale !== null &&
    (!Number.isInteger(finalVenusScale) ||
      finalVenusScale < 0 ||
      finalVenusScale > 30 ||
      finalVenusScale % 2 !== 0);
  const venusEvents = uniqueEvents.filter((event) =>
    event.eventType.startsWith('venus_'),
  );
  const colonyEvents = uniqueEvents.filter((event) =>
    event.eventType.startsWith('colony_'),
  );
  const optionEvidence = input.optionEvidence ?? null;
  const historicalOwnerConfirmedAbsent =
    input.historicalOwnerConfirmedAbsent ?? false;
  const venusState = invalidFinalVenusScale
    ? 'conflicting_evidence'
    : determineState({
        complete,
        explicitOption: optionEvidence?.venusNext ?? null,
        historicalOwnerConfirmedAbsent,
        markerCount: venusEvents.length + (finalVenusScale === null ? 0 : 1),
        unsupportedLineNumbers: venusUnsupportedLines,
      });
  const coloniesState = determineState({
    complete,
    explicitOption: optionEvidence?.colonies ?? null,
    historicalOwnerConfirmedAbsent,
    markerCount: colonyEvents.length,
    unsupportedLineNumbers: colonyUnsupportedLines,
  });
  const unresolvedPlayerAssociations = uniqueEvents.flatMap((event) =>
    event.attribution === 'player' && event.actor && !event.playerId
      ? [
          {
            actor: event.actor,
            eventIdentity: event.eventIdentity,
            lineNumber: event.lineNumber,
          },
        ]
      : [],
  );
  const warnings: string[] = [];
  if (venusUnsupportedLines.length > 0) {
    warnings.push('One or more Venus scale lines use an unsupported log pattern.');
  }
  if (colonyUnsupportedLines.length > 0) {
    warnings.push('One or more Colony action lines use an unsupported log pattern or colony identifier.');
  }
  if (unresolvedPlayerAssociations.length > 0) {
    warnings.push('One or more mechanic events could not be associated with a stable player ID.');
  }
  if (!complete) {
    warnings.push('The exported log is missing one or more complete-game terminators.');
  }
  if (invalidFinalVenusScale) {
    warnings.push('Trusted final Venus scale evidence is outside the canonical 0-30 even-step range.');
  }

  return {
    colonies: {
      evidence: [
        ...(optionEvidence?.colonies === null || optionEvidence === null
          ? []
          : [optionEvidence.originalEvidence]),
        ...colonyEvents.map((event) => event.rawLine),
      ],
      state: coloniesState,
      unsupportedLineNumbers: colonyUnsupportedLines,
    },
    duplicateEventCount,
    events: uniqueEvents,
    finalVenusScale: invalidFinalVenusScale ? null : finalVenusScale,
    parserVersion: TERRAFORMING_MARS_VENUS_COLONIES_PARSER_VERSION,
    sourceCoverage: {
      complete,
      finalGreeneryPlacementSeen,
      gameIdTerminatorSeen,
      generationNumbers: [...new Set(generationNumbers)],
      lineCount: lines.length,
      parsedMechanicLineCount: new Set(
        uniqueEvents.map((event) => event.lineNumber),
      ).size,
      unsupportedLineCount: new Set([
        ...venusUnsupportedLines,
        ...colonyUnsupportedLines,
      ]).size,
    },
    unresolvedPlayerAssociations,
    venusNext: {
      evidence: [
        ...(optionEvidence?.venusNext === null || optionEvidence === null
          ? []
          : [optionEvidence.originalEvidence]),
        ...venusEvents.map((event) => event.rawLine),
        ...(input.finalVenusScaleEvidence
          ? [input.finalVenusScaleEvidence.originalEvidence]
          : []),
      ],
      state: venusState,
      unsupportedLineNumbers: venusUnsupportedLines,
    },
    warnings,
  };
}

export function buildGameExpansionFactInput(
  result: TerraformingMarsExpansionParseResult,
) {
  return {
    coloniesState: result.colonies.state,
    colonyBuiltCount: result.events.filter(
      (event) => event.eventType === 'colony_built',
    ).length,
    colonyTradeCount: result.events.filter(
      (event) => event.eventType === 'colony_traded',
    ).length,
    detectionProvenance: {
      colonies_evidence: result.colonies.evidence,
      colonies_unsupported_line_numbers:
        result.colonies.unsupportedLineNumbers,
      venus_evidence: result.venusNext.evidence,
      venus_unsupported_line_numbers:
        result.venusNext.unsupportedLineNumbers,
    },
    finalVenusScale: result.finalVenusScale,
    parserVersion: result.parserVersion,
    sourceCoverage: result.sourceCoverage,
    venusEventCount: result.events.filter((event) =>
      event.eventType.startsWith('venus_'),
    ).length,
    venusNextState: result.venusNext.state,
  };
}
