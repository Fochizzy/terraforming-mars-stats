import type { ImportObjectiveEvidence } from './parse-terraforming-mars-log';
import type { ImportPlayedEntityEvidence } from './parse-terraforming-mars-played-entities';
import type { ImportTileAction } from './parse-terraforming-mars-tile-actions';

export type ParsedGameLogEvent = {
  board_space?: string | null;
  card_id: string | null;
  confidence_level: 'high' | 'reviewed';
  event_order: number;
  event_type: string;
  generation_number: number | null;
  line_classification: string;
  payload: Record<string, unknown>;
  raw_line: string;
  tile_type?: string | null;
};

export type ParsedGameLogEventSet = {
  events: ParsedGameLogEvent[];
  lineCount: number;
  parsedLineCount: number;
  unparsedLineCount: number;
};

function stripExporterPrefix(line: string) {
  return line.replace(/^\s*\[\d+\/\d+\]:\s*/, '').trim();
}

export function buildTerraformingMarsLogEvents(input: {
  exportedLogText: string;
  objectiveEvidence: ImportObjectiveEvidence[];
  playedEntityEvidence: ImportPlayedEntityEvidence[];
  tileActions?: ImportTileAction[];
}): ParsedGameLogEventSet {
  const lines = input.exportedLogText.trim()
    ? input.exportedLogText.trim().split(/\r?\n/)
    : [];
  const objectiveByLine = new Map(
    input.objectiveEvidence.map((evidence) => [evidence.lineNumber, evidence]),
  );
  const playedEntityByLine = new Map(
    input.playedEntityEvidence.map((evidence) => [evidence.lineNumber, evidence]),
  );
  const tileActionByLine = new Map(
    (input.tileActions ?? []).map((action) => [action.lineNumber, action]),
  );
  const events: ParsedGameLogEvent[] = [];
  let currentGeneration: number | null = null;

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = stripExporterPrefix(rawLine);
    const generationMatch = /^Generation\s+(\d+)\s*$/i.exec(line);
    if (generationMatch) {
      currentGeneration = Number(generationMatch[1]);
      events.push({
        card_id: null,
        confidence_level: 'high',
        event_order: lineNumber,
        event_type: 'generation_started',
        generation_number: currentGeneration,
        line_classification: 'generation_marker',
        payload: { generation: currentGeneration },
        raw_line: rawLine,
      });
      return;
    }

    const playerMatch = /^Good luck\s+(.+?)!\s*$/i.exec(line);
    if (playerMatch) {
      events.push({
        card_id: null,
        confidence_level: 'high',
        event_order: lineNumber,
        event_type: 'player_identified',
        generation_number: currentGeneration,
        line_classification: 'player_identity',
        payload: { actor: playerMatch[1].trim() },
        raw_line: rawLine,
      });
      return;
    }

    const firstPlayerMatch = /^First player this generation is\s+(.+?)\s*$/i.exec(
      line,
    );
    if (firstPlayerMatch) {
      events.push({
        card_id: null,
        confidence_level: 'high',
        event_order: lineNumber,
        event_type: 'first_player_selected',
        generation_number: currentGeneration,
        line_classification: 'first_player',
        payload: { actor: firstPlayerMatch[1].trim() },
        raw_line: rawLine,
      });
      return;
    }

    const tileAction = tileActionByLine.get(lineNumber);
    if (tileAction) {
      events.push({
        board_space: tileAction.spaceId,
        card_id: null,
        confidence_level: tileAction.isKnownTileType ? 'high' : 'reviewed',
        event_order: lineNumber,
        event_type:
          tileAction.action === 'placed' ? 'tile_placed' : 'tile_removed',
        generation_number: currentGeneration,
        line_classification: `tile_${tileAction.action}`,
        payload: {
          actor: tileAction.actor,
          board: tileAction.board,
          canonical_tile_name: tileAction.canonicalTileName,
          format: tileAction.format,
          is_known_tile_type: tileAction.isKnownTileType,
          raw_tile_type: tileAction.rawTileType,
        },
        raw_line: rawLine,
        tile_type: tileAction.canonicalTileCode ?? tileAction.rawTileType,
      });
      return;
    }

    const objective = objectiveByLine.get(lineNumber);
    if (objective?.canonicalId) {
      events.push({
        card_id: null,
        confidence_level:
          objective.resolution === 'exact' ? 'high' : 'reviewed',
        event_order: lineNumber,
        event_type:
          objective.type === 'milestone'
            ? 'milestone_claimed'
            : 'award_funded',
        generation_number: currentGeneration,
        line_classification: objective.type,
        payload: {
          actor: objective.originalPlayerValue,
          canonical_id: objective.canonicalId,
          canonical_name: objective.canonicalName,
          normalized_actor: objective.normalizedPlayerValue,
          original_value: objective.originalValue,
          resolution: objective.resolution,
        },
        raw_line: rawLine,
      });
      return;
    }

    const playedEntity = playedEntityByLine.get(lineNumber);
    if (playedEntity?.canonicalId && playedEntity.entityType) {
      events.push({
        card_id:
          playedEntity.entityType === 'card'
            ? playedEntity.canonicalId
            : null,
        confidence_level:
          playedEntity.resolution === 'exact' ? 'high' : 'reviewed',
        event_order: lineNumber,
        event_type:
          playedEntity.entityType === 'card'
            ? 'card_played'
            : playedEntity.entityType === 'prelude'
              ? 'prelude_played'
              : 'corporation_selected',
        generation_number: currentGeneration,
        line_classification: `played_${playedEntity.entityType}`,
        payload: {
          actor: playedEntity.originalPlayerValue,
          canonical_id: playedEntity.canonicalId,
          canonical_name: playedEntity.canonicalName,
          normalized_actor: playedEntity.normalizedPlayerValue,
          original_value: playedEntity.originalValue,
          resolution: playedEntity.resolution,
        },
        raw_line: rawLine,
      });
    }
  });

  return {
    events,
    lineCount: lines.length,
    parsedLineCount: events.length,
    unparsedLineCount: Math.max(lines.length - events.length, 0),
  };
}
