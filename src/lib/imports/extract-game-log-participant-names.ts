import type { ParsedGameLog } from './parse-game-log';
import { normalizePlayerAlias } from './normalize-player-alias';

export function extractGameLogParticipantNames(
  input: Pick<ParsedGameLog, 'cardPointBreakdowns' | 'events'>,
) {
  const participantNames: string[] = [];
  const seenNames = new Set<string>();
  const nameEntries = [
    ...input.events.flatMap((event) =>
      'actor' in event && typeof event.actor === 'string'
        ? [{ lineNumber: event.lineNumber, name: event.actor }]
        : [],
    ),
    ...input.cardPointBreakdowns.map((breakdown) => ({
      lineNumber: breakdown.lineNumber,
      name: breakdown.playerName,
    })),
  ].sort((left, right) => left.lineNumber - right.lineNumber);

  function rememberName(name: string) {
    const trimmedName = name.trim();
    const normalizedName = normalizePlayerAlias(trimmedName);

    if (!normalizedName || seenNames.has(normalizedName)) {
      return;
    }

    seenNames.add(normalizedName);
    participantNames.push(trimmedName);
  }

  for (const entry of nameEntries) {
    rememberName(entry.name);
  }

  return participantNames;
}
