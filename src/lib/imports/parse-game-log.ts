import {
  classifyGameLogLine,
  type GameLogEvent,
} from './classify-game-log-line';

export type ParsedGameLogEvent = GameLogEvent & {
  lineNumber: number;
  rawLine: string;
};

export type ParsedActionGameLogEvent = Exclude<
  GameLogEvent,
  { eventType: 'card_points_breakdown' }
> & {
  lineNumber: number;
  rawLine: string;
};

export type ParsedCardPointBreakdown = Extract<
  GameLogEvent,
  { eventType: 'card_points_breakdown' }
> & {
  lineNumber: number;
  rawLine: string;
};

export type ParsedGameLog = {
  cardPointBreakdowns: ParsedCardPointBreakdown[];
  chattyFillerLineCount: number;
  contextLineCount: number;
  drawInfoLineCount: number;
  events: ParsedActionGameLogEvent[];
  ignoredLineCount: number;
};

export function parseGameLog(rawLogText: string): ParsedGameLog {
  const parsedLog: ParsedGameLog = {
    cardPointBreakdowns: [],
    chattyFillerLineCount: 0,
    contextLineCount: 0,
    drawInfoLineCount: 0,
    events: [],
    ignoredLineCount: 0,
  };

  if (!rawLogText.trim()) {
    return parsedLog;
  }

  rawLogText.split(/\r?\n/).forEach((rawLine, lineIndex) => {
    const classification = classifyGameLogLine(rawLine);

    switch (classification.kind) {
      case 'chatty_filler':
        parsedLog.chattyFillerLineCount += 1;
        parsedLog.ignoredLineCount += 1;
        break;
      case 'context':
        parsedLog.contextLineCount += 1;
        break;
      case 'draw_info':
        parsedLog.drawInfoLineCount += 1;
        break;
      case 'event':
        if (classification.event.eventType === 'card_points_breakdown') {
          parsedLog.cardPointBreakdowns.push({
            ...classification.event,
            lineNumber: lineIndex + 1,
            rawLine,
          });
        } else {
          parsedLog.events.push({
            ...classification.event,
            lineNumber: lineIndex + 1,
            rawLine,
          });
        }
        break;
      case 'ignored_noise':
        parsedLog.ignoredLineCount += 1;
        break;
      default: {
        const exhaustiveCheck: never = classification;
        return exhaustiveCheck;
      }
    }
  });

  return parsedLog;
}
