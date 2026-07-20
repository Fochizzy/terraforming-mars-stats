export type GameLogEvent =
  | {
      eventType: 'generation_started';
      generation: number;
    }
  | {
      actor: string;
      card: string;
      eventType: 'card_played';
    }
  | {
      actor: string;
      /** Grid coordinates, kept when the log gave row/position rather than a flat id. */
      boardPosition?: number;
      boardRow?: number;
      eventType: 'tile_placed';
      /**
       * How the log addressed the space, before it was normalised to `space`.
       * Both classifier branches set it; absent only in older fixtures, which
       * fall back to the flat form.
       */
      placementFormat?: 'flat-id' | 'grid';
      space: string;
      tile: string;
    }
  | {
      actor: string;
      eventType: 'global_parameter_changed';
      parameter: 'ocean' | 'oxygen' | 'temperature';
    }
  | {
      actor: string;
      affectedPlayer?: string;
      card?: string;
      deltaKind?: 'production' | 'resource';
      eventType: 'resource_changed';
      operation: 'added' | 'removed';
      resourceAmount: number;
      resourceType: string;
    }
  | {
      cardPointsAnimals: number;
      cardPointsJovian: number;
      cardPointsMicrobes: number;
      eventType: 'card_points_breakdown';
      playerName: string;
    }
  | {
      actor: string;
      eventType: 'milestone_claimed';
      milestone: string;
    }
  | {
      actor: string;
      award: string;
      eventType: 'award_funded';
    }
  | {
      actor: string;
      award: string;
      eventType: 'award_result';
      placement: 'first' | 'second';
    };

import { boardSpaceFromRowPosition } from './board-space-from-row-position';

export type GameLogLineClassification =
  | {
      kind: 'chatty_filler';
    }
  | {
      card: string;
      kind: 'draw_info';
    }
  | {
      event: GameLogEvent;
      kind: 'event';
    }
  | {
      kind: 'context';
      text: string;
    }
  | {
      kind: 'ignored_noise';
    };

function normalizeGlobalParameter(
  value: string,
): 'ocean' | 'oxygen' | 'temperature' {
  const normalized = value.trim().toLowerCase();

  if (normalized.startsWith('oxygen')) {
    return 'oxygen';
  }

  if (normalized.startsWith('ocean')) {
    return 'ocean';
  }

  return 'temperature';
}

function normalizeResourceType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/s$/, '');
}

function normalizeResourceDelta(value: string): {
  deltaKind: 'production' | 'resource';
  resourceType: string;
} {
  const normalized = value.trim().toLowerCase().replace(/[-_]+/g, ' ');
  const deltaKind = /\bproduction\b/i.test(normalized)
    ? 'production'
    : 'resource';
  const resourceType = normalizeResourceType(
    normalized.replace(/\bproduction\b/gi, '').trim() || normalized,
  );

  return { deltaKind, resourceType };
}

export function classifyGameLogLine(line: string): GameLogLineClassification {
  const trimmedLine = line.trim();

  if (trimmedLine.length === 0) {
    return { kind: 'ignored_noise' };
  }

  if (/^Good luck .+!$/i.test(trimmedLine)) {
    return { kind: 'chatty_filler' };
  }

  const drawMatch = /^You drew (.+)$/i.exec(trimmedLine);
  if (drawMatch?.[1]) {
    return {
      card: drawMatch[1].trim(),
      kind: 'draw_info',
    };
  }

  const generationMatch = /^Generation (\d+)$/i.exec(trimmedLine);
  if (generationMatch?.[1]) {
    return {
      event: {
        eventType: 'generation_started',
        generation: Number(generationMatch[1]),
      },
      kind: 'event',
    };
  }

  const tileMatch =
    /^(.+) placed (.+) tile at ([0-9A-Za-z]+)$/i.exec(trimmedLine);
  if (tileMatch?.[1] && tileMatch[2] && tileMatch[3]) {
    return {
      event: {
        actor: tileMatch[1].trim(),
        eventType: 'tile_placed',
        placementFormat: 'flat-id',
        space: tileMatch[3].trim(),
        tile: tileMatch[2].trim(),
      },
      kind: 'event',
    };
  }

  const tileRowPositionMatch =
    /^(.+) placed (.+) tile on row (\d+) position (\d+)$/i.exec(trimmedLine);
  if (
    tileRowPositionMatch?.[1] &&
    tileRowPositionMatch[2] &&
    tileRowPositionMatch[3] &&
    tileRowPositionMatch[4]
  ) {
    const space = boardSpaceFromRowPosition(
      Number(tileRowPositionMatch[3]),
      Number(tileRowPositionMatch[4]),
    );

    if (space) {
      return {
        event: {
          actor: tileRowPositionMatch[1].trim(),
          boardPosition: Number(tileRowPositionMatch[4]),
          boardRow: Number(tileRowPositionMatch[3]),
          eventType: 'tile_placed',
          placementFormat: 'grid',
          space,
          tile: tileRowPositionMatch[2].trim(),
        },
        kind: 'event',
      };
    }
  }

  const oceanPlacementMatch =
    /^(.+) placed (?:an? )?ocean(?: tile)?$/i.exec(trimmedLine);
  if (oceanPlacementMatch?.[1]) {
    return {
      event: {
        actor: oceanPlacementMatch[1].trim(),
        eventType: 'global_parameter_changed',
        parameter: 'ocean',
      },
      kind: 'event',
    };
  }

  const globalParameterMatch =
    /^(.+?) (?:raised|increased) (?:the )?(temperature|oxygen(?: level)?|oceans?|ocean(?: level)?)(?: (?:by|to) .+)?$/i.exec(
      trimmedLine,
    );
  if (globalParameterMatch?.[1] && globalParameterMatch[2]) {
    return {
      event: {
        actor: globalParameterMatch[1].trim(),
        eventType: 'global_parameter_changed',
        parameter: normalizeGlobalParameter(globalParameterMatch[2]),
      },
      kind: 'event',
    };
  }

  const resourceMatch =
    /^(.+) (added|removed) (\d+) ([A-Za-z][A-Za-z -]*?) to (.+)$/i.exec(
      trimmedLine,
    );
  if (
    resourceMatch?.[1] &&
    resourceMatch[2] &&
    resourceMatch[3] &&
    resourceMatch[4] &&
    resourceMatch[5]
  ) {
    const resourceDelta = normalizeResourceDelta(resourceMatch[4]);

    return {
      event: {
        actor: resourceMatch[1].trim(),
        card: resourceMatch[5].trim(),
        deltaKind: resourceDelta.deltaKind,
        eventType: 'resource_changed',
        operation: resourceMatch[2].toLowerCase() as 'added' | 'removed',
        resourceAmount: Number(resourceMatch[3]),
        resourceType: resourceDelta.resourceType,
      },
      kind: 'event',
    };
  }

  const targetedRemovalMatch =
    /^(.+) removed (\d+) ([A-Za-z][A-Za-z -]*?) from (.+)$/i.exec(
      trimmedLine,
    );
  if (
    targetedRemovalMatch?.[1] &&
    targetedRemovalMatch[2] &&
    targetedRemovalMatch[3] &&
    targetedRemovalMatch[4]
  ) {
    const resourceDelta = normalizeResourceDelta(targetedRemovalMatch[3]);

    return {
      event: {
        actor: targetedRemovalMatch[1].trim(),
        affectedPlayer: targetedRemovalMatch[4].trim(),
        deltaKind: resourceDelta.deltaKind,
        eventType: 'resource_changed',
        operation: 'removed',
        resourceAmount: Number(targetedRemovalMatch[2]),
        resourceType: resourceDelta.resourceType,
      },
      kind: 'event',
    };
  }

  const cardBreakdownMatch =
    /^([A-Za-z][A-Za-z0-9 .'-]*?) Microbes (\d+) Animals (\d+) Jovian (\d+)$/i.exec(
      trimmedLine,
    );
  if (
    cardBreakdownMatch?.[1] &&
    cardBreakdownMatch[2] &&
    cardBreakdownMatch[3] &&
    cardBreakdownMatch[4]
  ) {
    return {
      event: {
        cardPointsAnimals: Number(cardBreakdownMatch[3]),
        cardPointsJovian: Number(cardBreakdownMatch[4]),
        cardPointsMicrobes: Number(cardBreakdownMatch[2]),
        eventType: 'card_points_breakdown',
        playerName: cardBreakdownMatch[1].trim(),
      },
      kind: 'event',
    };
  }

  const milestoneMatch = /^(.+) claimed (.+) milestone$/i.exec(trimmedLine);
  if (milestoneMatch?.[1] && milestoneMatch[2]) {
    return {
      event: {
        actor: milestoneMatch[1].trim(),
        eventType: 'milestone_claimed',
        milestone: milestoneMatch[2].trim(),
      },
      kind: 'event',
    };
  }

  const awardFundedMatch = /^(.+) funded (.+) award$/i.exec(trimmedLine);
  if (awardFundedMatch?.[1] && awardFundedMatch[2]) {
    return {
      event: {
        actor: awardFundedMatch[1].trim(),
        award: awardFundedMatch[2].trim(),
        eventType: 'award_funded',
      },
      kind: 'event',
    };
  }

  const awardResultMatch =
    /^(.+) won (first|second) place on (.+) award$/i.exec(trimmedLine);
  if (awardResultMatch?.[1] && awardResultMatch[2] && awardResultMatch[3]) {
    return {
      event: {
        actor: awardResultMatch[1].trim(),
        award: awardResultMatch[3].trim(),
        eventType: 'award_result',
        placement: awardResultMatch[2].toLowerCase() as 'first' | 'second',
      },
      kind: 'event',
    };
  }

  const playedMatch = /^(.+) played (.+)$/i.exec(trimmedLine);
  if (playedMatch?.[1] && playedMatch[2]) {
    return {
      event: {
        actor: playedMatch[1].trim(),
        card: playedMatch[2].trim(),
        eventType: 'card_played',
      },
      kind: 'event',
    };
  }

  return {
    kind: 'context',
    text: trimmedLine,
  };
}
