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
      eventType: 'tile_placed';
      space: string;
      tile: string;
    }
  | {
      actor: string;
      card: string;
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
        space: tileMatch[3].trim(),
        tile: tileMatch[2].trim(),
      },
      kind: 'event',
    };
  }

  const resourceMatch =
    /^(.+) (added|removed) (\d+) ([A-Za-z]+) to (.+)$/i.exec(
      trimmedLine,
    );
  if (
    resourceMatch?.[1] &&
    resourceMatch[2] &&
    resourceMatch[3] &&
    resourceMatch[4] &&
    resourceMatch[5]
  ) {
    return {
      event: {
        actor: resourceMatch[1].trim(),
        card: resourceMatch[5].trim(),
        eventType: 'resource_changed',
        operation: resourceMatch[2].toLowerCase() as 'added' | 'removed',
        resourceAmount: Number(resourceMatch[3]),
        resourceType: resourceMatch[4]
          .trim()
          .toLowerCase()
          .replace(/s$/, ''),
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
