import { classifyGameLogLine } from '../classify-game-log-line';
import { boardSpaceFromRowPosition } from '../board-space-from-row-position';
import { normalizePlayerAlias } from '../normalize-player-alias';
import { sourceFingerprint } from './source-hash';
import {
  CAPTURE_PARSER_VERSION,
  type BoardPlacement,
  type CanonicalEvent,
  type CanonicalTileType,
  type CaptureCoverage,
  type CoverageState,
  type EventCategory,
  type GameCaptureResult,
  type MapDetection,
  type MechanicState,
  type ParameterType,
  type ParserConfidence,
  type PreAttributionStatus,
  type UnsupportedEvidence,
} from './types';

export type ObjectiveMapIndex = {
  awardToMapCodes: Map<string, string[]>;
  milestoneToMapCodes: Map<string, string[]>;
};

export type ParseGameCaptureInput = {
  cardIdByName?: Map<string, string>;
  objectiveMapIndex?: ObjectiveMapIndex;
  rawText: string;
  screenshotLines?: string[];
  sourceSha256: string;
};

const CANONICAL_COLONIES = new Set([
  'callisto', 'ceres', 'enceladus', 'europa', 'ganymede', 'io', 'leavitt',
  'luna', 'miranda', 'pluto', 'titan', 'triton', 'venus',
]);

function normalizeLine(line: string): string {
  // Some upstream exports prefix a "[timestamp]:" token; strip it for matching
  // but keep the original for evidence.
  return line.replace(/^\s*\[[^\]]+\]:\s*/, '').trim();
}

function sourcePlayerName(value: string | undefined | null): string | null {
  const normalized = (value ?? '').trim();
  if (!normalized || /^world government$/i.test(normalized)) {
    return null;
  }
  return normalized;
}

// Resolves the explicit actor on an action line. World Government is a neutral
// game actor, not a player, so its actions are unattributed -- never guessed to
// a nearby player. Handles both "World Government" and "<player> acted as World
// Government and ..." phrasings.
function resolveActor(value: string | undefined | null): {
  name: string | null;
  worldGovernment: boolean;
} {
  const normalized = (value ?? '').trim();
  if (/world government/i.test(normalized)) {
    return { name: null, worldGovernment: true };
  }
  return { name: sourcePlayerName(normalized), worldGovernment: false };
}

function canonicalTileType(raw: string): CanonicalTileType {
  const value = raw.trim().toLowerCase();
  if (value === 'ocean') return 'ocean';
  if (value === 'city') return 'city';
  if (value === 'greenery') return 'greenery';
  if (!value) return 'unresolved';
  return 'special';
}

function canonicalColonyId(value: string): string | null {
  const normalized = value
    .toLowerCase()
    .replace(/\s+colony(?:\s+tile)?$/i, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return CANONICAL_COLONIES.has(normalized) ? normalized : null;
}

function stripCardCostPrefix(card: string): string {
  // Upstream logs render card plays as "played <cost> <Card Name>". Keep the
  // canonical card name for entity resolution; the raw line is preserved intact.
  return card.replace(/^\d+\s+/, '').trim();
}

function detectSourceFormat(
  rawText: string,
): GameCaptureResult['sourceFormat'] {
  if (/\b(?:venusNextExtension|coloniesExtension|venusScaleLevel)\b/.test(rawText)) {
    return 'serialized_game';
  }
  if (/^\s*\[[^\]]+\]:/m.test(rawText)) {
    return 'upstream_log';
  }
  return 'manual_web_import';
}

function detectOptionValues(rawText: string, mechanic: 'venus' | 'colonies'): boolean[] {
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
    for (const match of rawText.matchAll(pattern)) {
      const value = match[1]?.toLowerCase();
      values.push(value === 'true' || value === 'enabled' || value === 'yes');
    }
  }
  return values;
}

function lastNumericVenusScale(rawText: string): number | null {
  const patterns = [
    /["']venusScaleLevel["']\s*[:=]\s*(\d+)/gi,
    /\bvenus\s+scale\s*(?:is|=|:)\s*(\d+)\b/gi,
  ];
  let value: number | null = null;
  for (const pattern of patterns) {
    for (const match of rawText.matchAll(pattern)) {
      value = Number(match[1]);
    }
  }
  return value;
}

// v2 state derivation. Unlike v1, a content-bearing log only yields
// confirmed_absent when it is an authoritative full-game export (recognizable
// game structure). A content-bearing log with no recognizable structure stays
// incomplete_evidence rather than being silently defaulted to absent.
function deriveMechanicState(input: {
  hasAbsentOption: boolean;
  hasCanonicalEvidence: boolean;
  hasPresentOption: boolean;
  hasUnsupportedEvidence: boolean;
  isAuthoritativeFullExport: boolean;
  isBlank: boolean;
}): MechanicState {
  if (input.hasPresentOption && input.hasAbsentOption) return 'conflicting_evidence';
  if (input.hasAbsentOption && input.hasCanonicalEvidence) return 'conflicting_evidence';
  if (input.hasPresentOption || input.hasCanonicalEvidence) return 'confirmed_present';
  if (input.hasAbsentOption) return 'confirmed_absent';
  if (input.hasUnsupportedEvidence) return 'unsupported_log_pattern';
  if (input.isBlank) return 'incomplete_evidence';
  return input.isAuthoritativeFullExport ? 'confirmed_absent' : 'incomplete_evidence';
}

type WorkingEvent = Omit<CanonicalEvent, 'eventUid'> & {
  linkedPlacement?: Omit<BoardPlacement, 'eventUid' | 'placementUid'>;
};

function buildMapDetection(input: {
  events: WorkingEvent[];
  objectiveMapIndex?: ObjectiveMapIndex;
  rawText: string;
  screenshotLines?: string[];
}): MapDetection {
  const exportedMapValue =
    input.rawText.match(/["']?\bmap["']?\s*[:=]\s*["']?([A-Za-z ]+)["']?/)?.[1]?.trim() ?? null;

  const objectiveMapCodes = new Set<string>();
  const objectiveEvidence: string[] = [];

  if (input.objectiveMapIndex) {
    for (const event of input.events) {
      if (event.eventCategory === 'milestone' && event.canonicalEntityId) {
        const codes = input.objectiveMapIndex.milestoneToMapCodes.get(
          normalizePlayerAlias(event.canonicalEntityId),
        );
        if (codes) {
          objectiveEvidence.push(`milestone:${event.canonicalEntityId}`);
          codes.forEach((code) => objectiveMapCodes.add(code));
        }
      }
      if (event.eventCategory === 'award' && event.canonicalEntityId) {
        const codes = input.objectiveMapIndex.awardToMapCodes.get(
          normalizePlayerAlias(event.canonicalEntityId),
        );
        if (codes) {
          objectiveEvidence.push(`award:${event.canonicalEntityId}`);
          codes.forEach((code) => objectiveMapCodes.add(code));
        }
      }
    }
  }

  const candidateMapCodes = [...objectiveMapCodes].sort();
  const oceanSpaces = input.events
    .filter((event) => event.linkedPlacement?.tileType === 'ocean')
    .map((event) => event.linkedPlacement?.canonicalBoardSpaceId)
    .filter((space): space is string => Boolean(space));

  const oceanEvidence: Record<string, unknown> = {
    oceanPlacementCount: oceanSpaces.length,
    oceanSpaces: [...new Set(oceanSpaces)].sort(),
  };
  const objectiveEvidenceRecord: Record<string, unknown> = {
    matches: objectiveEvidence,
  };

  let detectionState: MapDetection['detectionState'];
  let detectedMapCode: string | null = null;
  let confidence: ParserConfidence = 'low';
  let conflictState: MapDetection['conflictState'] = null;

  if (candidateMapCodes.length === 1) {
    detectionState = 'confident';
    detectedMapCode = candidateMapCodes[0];
    confidence = 'high';
    conflictState = 'none';
  } else if (candidateMapCodes.length > 1) {
    detectionState = 'ambiguous';
    confidence = 'low';
    conflictState = 'multiple_candidates';
  } else if (exportedMapValue) {
    detectionState = 'confident';
    detectedMapCode = exportedMapValue;
    confidence = 'medium';
    conflictState = 'none';
  } else {
    // No exported value and no objective evidence: preserve the ambiguity;
    // never default an unresolved map to Tharsis.
    detectionState = 'missing';
    confidence = 'low';
  }

  return {
    candidateMapCodes,
    confidence,
    conflictState,
    detectedMapCode,
    detectionState,
    exportedMapValue,
    objectiveEvidence: objectiveEvidenceRecord,
    oceanEvidence,
    provenance: 'parser_derived',
    randomizedObjectives: null,
    unsupportedMap: false,
  };
}

export function parseGameCapture(input: ParseGameCaptureInput): GameCaptureResult {
  const fingerprint = sourceFingerprint(input.sourceSha256);
  const rawLines = input.rawText.split(/\r?\n/);
  const sourceFormat = detectSourceFormat(input.rawText);

  const working: WorkingEvent[] = [];
  const unsupported: UnsupportedEvidence[] = [];

  let sequence = 0;
  let generationNumber: number | null = null;

  // Coverage accounting.
  let totalLines = 0;
  let recognizedLines = 0;
  let unsupportedLineCount = 0;
  let generationCount = 0;
  let actionLineCount = 0;
  let passCount = 0;
  let unresolvedEntities = 0;
  let unresolvedBoardSpaces = 0;
  let unresolvedTileTypes = 0;

  // Venus / Colonies evidence flags.
  let hasVenusCanonicalEvidence = false;
  let hasColoniesCanonicalEvidence = false;
  let hasUnsupportedVenusEvidence = false;
  let hasUnsupportedColoniesEvidence = false;

  const pushEvent = (
    partial: Omit<WorkingEvent, 'eventSequence' | 'generationNumber'>,
  ): WorkingEvent => {
    const event: WorkingEvent = {
      ...partial,
      eventSequence: sequence,
      generationNumber,
    };
    working.push(event);
    sequence += 1;
    return event;
  };

  rawLines.forEach((rawLine, lineIndex) => {
    const lineNumber = lineIndex + 1;
    const line = normalizeLine(rawLine);
    if (!line) {
      return;
    }
    totalLines += 1;

    // --- Generation boundary --------------------------------------------
    const generationMatch = line.match(/^generation\s+(\d+)\b/i);
    if (generationMatch) {
      generationNumber = Number(generationMatch[1]);
      generationCount += 1;
      recognizedLines += 1;
      pushEvent({
        amount: null,
        attributionStatus: 'not_applicable',
        canonicalEntityId: String(generationNumber),
        confidence: 'high',
        coverageState: 'complete',
        detail: {},
        eventCategory: 'generation',
        eventType: 'generation_started',
        normalizedText: line,
        parameterType: null,
        provenance: 'parser_derived',
        sourceLineNumber: lineNumber,
        sourcePlayerName: null,
        sourceText: rawLine,
        valueAfter: null,
        valueBefore: null,
      });
      return;
    }

    // --- Pass ------------------------------------------------------------
    const passMatch = line.match(/^(.+?)\s+passed\b.*$/i);
    if (passMatch) {
      recognizedLines += 1;
      passCount += 1;
      const actor = sourcePlayerName(passMatch[1]);
      pushEvent({
        amount: null,
        attributionStatus: actor ? 'explicit_unresolved' : 'unattributed',
        canonicalEntityId: null,
        confidence: 'high',
        coverageState: 'complete',
        detail: {},
        eventCategory: 'pass',
        eventType: 'player_passed',
        normalizedText: line,
        parameterType: null,
        provenance: 'parser_derived',
        sourceLineNumber: lineNumber,
        sourcePlayerName: actor,
        sourceText: rawLine,
        valueAfter: null,
        valueBefore: null,
      });
      return;
    }

    // --- Venus tracker changes ------------------------------------------
    const venusStepMatch = line.match(
      /^(.*?)\s+increased\s+venus\s+scale\s+(-?\d+)\s+step\(s\)\.?$/i,
    );
    if (venusStepMatch) {
      const steps = Number(venusStepMatch[2]);
      recognizedLines += 1;
      actionLineCount += 1;
      if (steps !== 0) {
        hasVenusCanonicalEvidence = true;
        const { name: actor, worldGovernment } = resolveActor(venusStepMatch[1]);
        pushEvent({
          amount: steps,
          attributionStatus: actor ? 'explicit_unresolved' : 'unattributed',
          canonicalEntityId: 'venus',
          confidence: 'high',
          coverageState: 'complete',
          detail: { trackerSteps: steps, ...(worldGovernment ? { worldGovernment: true } : {}) },
          eventCategory: 'venus',
          eventType: 'venus_raised',
          normalizedText: line,
          parameterType: 'venus',
          provenance: 'parser_derived',
          sourceLineNumber: lineNumber,
          sourcePlayerName: actor,
          sourceText: rawLine,
          valueAfter: null,
          valueBefore: null,
        });
      }
      return;
    }

    const venusSnapshotMatch = line.match(
      /^(.*?)?\s*venus\s+scale\s*(\d+)\s*(?:→|->)\s*(\d+)\.?$/i,
    );
    if (venusSnapshotMatch) {
      const before = Number(venusSnapshotMatch[2]);
      const after = Number(venusSnapshotMatch[3]);
      recognizedLines += 1;
      hasVenusCanonicalEvidence = true;
      if (after !== before) {
        const { name: actor, worldGovernment } = resolveActor(venusSnapshotMatch[1]);
        pushEvent({
          amount: after - before,
          attributionStatus: actor ? 'explicit_unresolved' : 'unattributed',
          canonicalEntityId: 'venus',
          confidence: 'medium',
          coverageState: 'complete',
          detail: { trackerSteps: after - before, ...(worldGovernment ? { worldGovernment: true } : {}) },
          eventCategory: 'venus',
          eventType: 'venus_tracker_change',
          normalizedText: line,
          parameterType: 'venus',
          provenance: 'parser_derived',
          sourceLineNumber: lineNumber,
          sourcePlayerName: actor,
          sourceText: rawLine,
          valueAfter: after,
          valueBefore: before,
        });
      }
      return;
    }

    if (/\bvenus\s+(?:next|scale|tracker|global\s+parameter|option|extension)\b/i.test(line)) {
      recognizedLines += 1;
      if (!/(?:true|false|enabled|disabled|yes|no|\d+)/i.test(line)) {
        hasUnsupportedVenusEvidence = true;
        unsupportedLineCount += 1;
        unsupported.push({
          normalizedPattern: 'venus_reference_without_value',
          rawEvidence: rawLine,
          reason: 'unsupported_venus_wording',
          sourceLineNumber: lineNumber,
        });
      }
      return;
    }

    // --- Colonies --------------------------------------------------------
    const buildMatch = line.match(/^(.*?)\s+built\s+a\s+colony\s+on\s+(.+?)\.?$/i);
    const tradeMatch = line.match(/^(.*?)\s+spent\s+(.+?)\s+to\s+trade\s+with\s+(.+?)\.?$/i);
    const directTradeMatch = line.match(/^(.*?)\s+traded\s+with\s+(.+?)\.?$/i);
    if (buildMatch || tradeMatch || directTradeMatch) {
      const actorRaw = buildMatch?.[1] ?? tradeMatch?.[1] ?? directTradeMatch?.[1] ?? '';
      const rawColony = buildMatch?.[2] ?? tradeMatch?.[3] ?? directTradeMatch?.[2] ?? '';
      const colonyId = canonicalColonyId(rawColony);
      recognizedLines += 1;
      actionLineCount += 1;
      hasColoniesCanonicalEvidence = true;
      if (!colonyId) {
        unresolvedEntities += 1;
        unsupportedLineCount += 1;
        hasUnsupportedColoniesEvidence = true;
        unsupported.push({
          normalizedPattern: 'colony_action_unknown_colony',
          rawEvidence: rawLine,
          reason: 'unsupported_colony_identifier',
          sourceLineNumber: lineNumber,
        });
        return;
      }
      const { name: actor } = resolveActor(actorRaw);
      pushEvent({
        amount: null,
        attributionStatus: actor ? 'explicit_unresolved' : 'unattributed',
        canonicalEntityId: colonyId,
        confidence: 'high',
        coverageState: 'complete',
        detail: buildMatch
          ? {}
          : { paymentOrFleetInfo: tradeMatch?.[2]?.trim() ?? null },
        eventCategory: 'colony',
        eventType: buildMatch ? 'built_colony' : 'traded_with_colony',
        normalizedText: line,
        parameterType: null,
        provenance: 'parser_derived',
        sourceLineNumber: lineNumber,
        sourcePlayerName: actor,
        sourceText: rawLine,
        valueAfter: null,
        valueBefore: null,
      });
      return;
    }

    if (/\bcolon(?:ies|y)\s+(?:setup|option|extension)\b/i.test(line)) {
      recognizedLines += 1;
      if (!/(?:true|false|enabled|disabled|yes|no)/i.test(line)) {
        hasUnsupportedColoniesEvidence = true;
        unsupportedLineCount += 1;
        unsupported.push({
          normalizedPattern: 'colonies_reference_without_value',
          rawEvidence: rawLine,
          reason: 'unsupported_colonies_wording',
          sourceLineNumber: lineNumber,
        });
      }
      return;
    }

    // --- World Government neutral global-parameter raise -----------------
    const worldGovernmentMatch = line.match(
      /acted as world government and (?:raised|increased)\s+(?:the\s+)?(temperature|oxygen|ocean)(?:\s+level)?(?:\s+by\s+(\d+))?/i,
    );
    if (worldGovernmentMatch) {
      recognizedLines += 1;
      actionLineCount += 1;
      const parameter = worldGovernmentMatch[1].toLowerCase() as ParameterType;
      const amount = worldGovernmentMatch[2] ? Number(worldGovernmentMatch[2]) : null;
      pushEvent({
        amount,
        attributionStatus: 'unattributed',
        canonicalEntityId: parameter,
        confidence: 'high',
        coverageState: 'complete',
        detail: { worldGovernment: true },
        eventCategory: 'global_parameter',
        eventType: parameter === 'ocean' ? 'ocean_raised' : `${parameter}_raised`,
        normalizedText: line,
        parameterType: parameter,
        provenance: 'parser_derived',
        sourceLineNumber: lineNumber,
        sourcePlayerName: null,
        sourceText: rawLine,
        valueAfter: null,
        valueBefore: null,
      });
      return;
    }

    // --- Tile placement (preserve row/position AND the flat space id) ----
    const tileAtMatch = line.match(
      /^(.+?)\s+placed\s+(.+?)\s+tile\s+at\s+([0-9A-Za-z]+)$/i,
    );
    const tileRowPosMatch = line.match(
      /^(.+?)\s+placed\s+(.+?)\s+tile\s+on\s+row\s+(\d+)\s+position\s+(\d+)$/i,
    );
    if (tileAtMatch || tileRowPosMatch) {
      recognizedLines += 1;
      actionLineCount += 1;
      const actorRaw = tileAtMatch?.[1] ?? tileRowPosMatch?.[1] ?? '';
      const tileRaw = tileAtMatch?.[2] ?? tileRowPosMatch?.[2] ?? '';
      const tileType = canonicalTileType(tileRaw);
      if (tileType === 'unresolved') unresolvedTileTypes += 1;

      let boardRow: number | null = null;
      let boardPosition: number | null = null;
      let spaceId: string | null = null;
      if (tileAtMatch) {
        spaceId = tileAtMatch[3].trim() || null;
      } else if (tileRowPosMatch) {
        boardRow = Number(tileRowPosMatch[3]);
        boardPosition = Number(tileRowPosMatch[4]);
        // Convert to the upstream flat id without discarding row/position.
        spaceId = boardSpaceFromRowPosition(boardRow, boardPosition);
      }
      const upstreamNumeric = spaceId && /^\d+$/.test(spaceId) ? Number(spaceId) : null;
      if (!spaceId) unresolvedBoardSpaces += 1;

      const { name: actor } = resolveActor(actorRaw);
      const attribution: PreAttributionStatus = actor ? 'explicit_unresolved' : 'unattributed';
      const placementAction = /\bremoved\b/i.test(line)
        ? 'remove'
        : /\breplaced\b/i.test(line)
          ? 'replace'
          : 'place';
      pushEvent({
        amount: null,
        attributionStatus: attribution,
        canonicalEntityId: spaceId,
        confidence: 'high',
        coverageState: 'complete',
        detail: { boardPosition, boardRow, boardSpaceId: spaceId, tileType },
        eventCategory: 'tile_placement',
        eventType: 'tile_placed',
        normalizedText: line,
        parameterType: null,
        provenance: 'parser_derived',
        sourceLineNumber: lineNumber,
        sourcePlayerName: actor,
        sourceText: rawLine,
        valueAfter: null,
        valueBefore: null,
        linkedPlacement: {
          attributionStatus: attribution,
          boardPosition,
          boardRow,
          canonicalBoardSpaceId: spaceId,
          confidence: 'high',
          eventSequence: 0,
          generationNumber: null,
          mapCode: null,
          ownershipState: actor ? 'owned' : 'neutral',
          placementAction,
          provenance: 'parser_derived',
          rawActorText: actorRaw.trim() || null,
          rawEvidence: rawLine,
          sourceCardOrAction: null,
          sourcePlayerName: actor,
          tileType,
          upstreamNumericSpaceId: upstreamNumeric,
        },
      });
      return;
    }

    // --- Base taxonomy via the shared classifier ------------------------
    const classification = classifyGameLogLine(line);
    if (classification.kind === 'chatty_filler' || classification.kind === 'draw_info') {
      recognizedLines += 1;
      return;
    }
    if (classification.kind === 'context') {
      // Recognized as prose/context noise, not an unsupported mechanic.
      recognizedLines += 1;
      return;
    }
    if (classification.kind === 'ignored_noise') {
      // Non-empty lines never classify as ignored noise (empty lines are
      // skipped earlier); this narrows the union for the switch below.
      return;
    }

    recognizedLines += 1;
    const event = classification.event;

    switch (event.eventType) {
      case 'generation_started':
        // Already handled above; keep parity if the classifier reaches here.
        generationNumber = event.generation;
        pushEvent({
          amount: null,
          attributionStatus: 'not_applicable',
          canonicalEntityId: String(event.generation),
          confidence: 'high',
          coverageState: 'complete',
          detail: {},
          eventCategory: 'generation',
          eventType: 'generation_started',
          normalizedText: line,
          parameterType: null,
          provenance: 'parser_derived',
          sourceLineNumber: lineNumber,
          sourcePlayerName: null,
          sourceText: rawLine,
          valueAfter: null,
          valueBefore: null,
        });
        break;
      case 'card_played': {
        actionLineCount += 1;
        const cardName = stripCardCostPrefix(event.card);
        const cardId = input.cardIdByName?.get(normalizePlayerAlias(cardName)) ?? null;
        if (input.cardIdByName && !cardId) {
          unresolvedEntities += 1;
        }
        const actor = sourcePlayerName(event.actor);
        pushEvent({
          amount: null,
          attributionStatus: actor ? 'explicit_unresolved' : 'unattributed',
          canonicalEntityId: cardId ? `card:${cardId}` : `name:${normalizePlayerAlias(cardName)}`,
          confidence: 'high',
          coverageState: 'complete',
          detail: { cardName, cardId },
          eventCategory: 'card_play',
          eventType: 'card_played',
          normalizedText: line,
          parameterType: null,
          provenance: 'parser_derived',
          sourceLineNumber: lineNumber,
          sourcePlayerName: actor,
          sourceText: rawLine,
          valueAfter: null,
          valueBefore: null,
        });
        break;
      }
      case 'tile_placed': {
        actionLineCount += 1;
        const tileType = canonicalTileType(event.tile);
        if (tileType === 'unresolved') unresolvedTileTypes += 1;
        const spaceId = event.space?.trim() || null;
        if (!spaceId) unresolvedBoardSpaces += 1;
        const upstreamNumeric = spaceId && /^\d+$/.test(spaceId) ? Number(spaceId) : null;
        const actor = sourcePlayerName(event.actor);
        pushEvent({
          amount: null,
          attributionStatus: actor ? 'explicit_unresolved' : 'unattributed',
          canonicalEntityId: spaceId,
          confidence: 'high',
          coverageState: 'complete',
          detail: { tileType, boardSpaceId: spaceId },
          eventCategory: 'tile_placement',
          eventType: 'tile_placed',
          normalizedText: line,
          parameterType: null,
          provenance: 'parser_derived',
          sourceLineNumber: lineNumber,
          sourcePlayerName: actor,
          sourceText: rawLine,
          valueAfter: null,
          valueBefore: null,
          linkedPlacement: {
            attributionStatus: actor ? 'explicit_unresolved' : 'unattributed',
            boardPosition: null,
            boardRow: null,
            canonicalBoardSpaceId: spaceId,
            confidence: 'high',
            eventSequence: 0,
            generationNumber: null,
            mapCode: null,
            ownershipState: actor ? 'owned' : 'neutral',
            placementAction: /\bremoved\b/i.test(line)
              ? 'remove'
              : /\breplaced\b/i.test(line)
                ? 'replace'
                : 'place',
            provenance: 'parser_derived',
            rawActorText: event.actor,
            rawEvidence: rawLine,
            sourceCardOrAction: null,
            sourcePlayerName: actor,
            tileType,
            upstreamNumericSpaceId: upstreamNumeric,
          },
        });
        break;
      }
      case 'global_parameter_changed': {
        actionLineCount += 1;
        const actor = sourcePlayerName(event.actor);
        // "placed ocean" arrives here as parameter=ocean without a space id.
        pushEvent({
          amount: null,
          attributionStatus: actor ? 'explicit_unresolved' : 'unattributed',
          canonicalEntityId: event.parameter,
          confidence: 'high',
          coverageState: 'complete',
          detail: {},
          eventCategory: 'global_parameter',
          eventType:
            event.parameter === 'ocean' ? 'ocean_placed' : `${event.parameter}_raised`,
          normalizedText: line,
          parameterType: event.parameter,
          provenance: 'parser_derived',
          sourceLineNumber: lineNumber,
          sourcePlayerName: actor,
          sourceText: rawLine,
          valueAfter: null,
          valueBefore: null,
        });
        break;
      }
      case 'milestone_claimed': {
        actionLineCount += 1;
        const actor = sourcePlayerName(event.actor);
        pushEvent({
          amount: null,
          attributionStatus: actor ? 'explicit_unresolved' : 'unattributed',
          canonicalEntityId: event.milestone,
          confidence: 'high',
          coverageState: 'complete',
          detail: { milestoneName: event.milestone },
          eventCategory: 'milestone',
          eventType: 'milestone_claimed',
          normalizedText: line,
          parameterType: null,
          provenance: 'parser_derived',
          sourceLineNumber: lineNumber,
          sourcePlayerName: actor,
          sourceText: rawLine,
          valueAfter: null,
          valueBefore: null,
        });
        break;
      }
      case 'award_funded':
      case 'award_result': {
        actionLineCount += 1;
        const actor = sourcePlayerName(event.actor);
        pushEvent({
          amount: null,
          attributionStatus: actor ? 'explicit_unresolved' : 'unattributed',
          canonicalEntityId: event.award,
          confidence: 'high',
          coverageState: 'complete',
          detail:
            event.eventType === 'award_result'
              ? { awardName: event.award, placement: event.placement }
              : { awardName: event.award },
          eventCategory: 'award',
          eventType: event.eventType,
          normalizedText: line,
          parameterType: null,
          provenance: 'parser_derived',
          sourceLineNumber: lineNumber,
          sourcePlayerName: actor,
          sourceText: rawLine,
          valueAfter: null,
          valueBefore: null,
        });
        break;
      }
      case 'card_points_breakdown': {
        pushEvent({
          amount: null,
          attributionStatus: 'not_applicable',
          canonicalEntityId: null,
          confidence: 'high',
          coverageState: 'complete',
          detail: {
            cardPointsAnimals: event.cardPointsAnimals,
            cardPointsJovian: event.cardPointsJovian,
            cardPointsMicrobes: event.cardPointsMicrobes,
            playerName: event.playerName,
          },
          eventCategory: 'card_points',
          eventType: 'card_points_breakdown',
          normalizedText: line,
          parameterType: null,
          provenance: 'parser_derived',
          sourceLineNumber: lineNumber,
          sourcePlayerName: sourcePlayerName(event.playerName),
          sourceText: rawLine,
          valueAfter: null,
          valueBefore: null,
        });
        break;
      }
      case 'resource_changed':
        // Fine-grained resource deltas remain in the legacy game_log_events
        // store; the v2 envelope intentionally captures canonical actions.
        // Counted as recognized above; no envelope event emitted.
        break;
      default:
        break;
    }
  });

  const isBlank = totalLines === 0;
  const isAuthoritativeFullExport =
    generationCount >= 1 && actionLineCount >= 1 && (passCount >= 1 || generationCount >= 2);

  const venusOptionValues = detectOptionValues(input.rawText, 'venus');
  const coloniesOptionValues = detectOptionValues(input.rawText, 'colonies');

  const venusState = deriveMechanicState({
    hasAbsentOption: venusOptionValues.includes(false),
    hasCanonicalEvidence: hasVenusCanonicalEvidence,
    hasPresentOption: venusOptionValues.includes(true),
    hasUnsupportedEvidence: hasUnsupportedVenusEvidence,
    isAuthoritativeFullExport,
    isBlank,
  });
  const coloniesState = deriveMechanicState({
    hasAbsentOption: coloniesOptionValues.includes(false),
    hasCanonicalEvidence: hasColoniesCanonicalEvidence,
    hasPresentOption: coloniesOptionValues.includes(true),
    hasUnsupportedEvidence: hasUnsupportedColoniesEvidence,
    isAuthoritativeFullExport,
    isBlank,
  });

  const conflictingEvidence =
    (venusState === 'conflicting_evidence' ? 1 : 0) +
    (coloniesState === 'conflicting_evidence' ? 1 : 0);

  // Assign deterministic identities now that ordering is fixed.
  const events: CanonicalEvent[] = [];
  const placements: BoardPlacement[] = [];
  for (const workingEvent of working) {
    const seq4 = String(workingEvent.eventSequence).padStart(4, '0');
    const eventUid = `${fingerprint}:${workingEvent.eventCategory}:${seq4}:${workingEvent.sourceLineNumber}`;
    const { linkedPlacement, ...canonical } = workingEvent;
    events.push({ ...canonical, eventUid });

    if (linkedPlacement) {
      placements.push({
        ...linkedPlacement,
        eventSequence: workingEvent.eventSequence,
        eventUid,
        generationNumber: workingEvent.generationNumber,
        placementUid: `${fingerprint}:place:${seq4}:${workingEvent.sourceLineNumber}`,
      });
    }
  }

  const representedByEvents = new Set(events.map((event) => event.sourceLineNumber)).size;
  const uidCounts = new Map<string, number>();
  for (const event of events) {
    uidCounts.set(event.eventUid, (uidCounts.get(event.eventUid) ?? 0) + 1);
  }
  const duplicateCandidates = [...uidCounts.values()].filter((count) => count > 1).length;

  let overallState: CoverageState;
  if (isBlank) {
    overallState = 'unsupported_pattern';
  } else if (conflictingEvidence > 0) {
    overallState = 'conflicting';
  } else if (recognizedLines === 0) {
    overallState = 'unsupported_pattern';
  } else if (unsupportedLineCount > 0 || unresolvedEntities > 0 || unresolvedBoardSpaces > 0) {
    overallState = 'partial';
  } else {
    overallState = 'complete';
  }

  const coverage: CaptureCoverage = {
    conflictingEvidence,
    duplicateCandidates,
    overallState,
    parserExceptions: 0,
    recognizedLines,
    representedByEvents,
    totalLines,
    unresolvedBoardSpaces,
    unresolvedEntities,
    // Filled in by the resolution layer once source names are matched to
    // exact participants; the parser cannot resolve players on its own.
    unresolvedPlayers: 0,
    unresolvedTileTypes,
    unsupportedLines: unsupportedLineCount,
  };

  const mapDetection = buildMapDetection({
    events: working,
    objectiveMapIndex: input.objectiveMapIndex,
    rawText: input.rawText,
    screenshotLines: input.screenshotLines,
  });

  return {
    colonies: {
      events: events.filter((event) => event.eventCategory === 'colony'),
      finalVenusScale: null,
      state: coloniesState,
    },
    coverage,
    events,
    mapDetection,
    parserVersion: CAPTURE_PARSER_VERSION,
    placements,
    sourceFormat,
    unsupported,
    venus: {
      events: events.filter((event) => event.eventCategory === 'venus'),
      finalVenusScale: lastNumericVenusScale(input.rawText),
      state: venusState,
    },
  };
}
