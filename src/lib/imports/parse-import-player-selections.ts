import type { CorporationOption, PreludeOption } from '@/lib/db/reference-repo';
import { normalizePlayerAlias } from './normalize-player-alias';

type ImportParticipant = {
  importedName: string;
  playerId: string;
};

type ParsedPlayerSelection = {
  corporationId: string;
  corporationIds: string[];
  preludeIds: string[];
};

function normalizeImportToken(input: string) {
  return normalizePlayerAlias(input).replace(/\s+/g, ' ');
}

function extractPlayedName(normalizedLine: string) {
  const playedIndex = normalizedLine.indexOf(' played ');

  return playedIndex >= 0
    ? normalizedLine.slice(playedIndex + ' played '.length).trim()
    : null;
}

function findMatchingIds(
  normalizedLine: string,
  options: Array<{ id: string; name: string }>,
) {
  // "X played <name>" lines name exactly one card/corp/prelude, so the tail
  // must equal the option name — plain substring matching turns cards like
  // "Mohole Lake" into false hits for the "Mohole" prelude. Other mention
  // shapes ("used <name> action") keep substring matching, but only on word
  // boundaries so e.g. "Inspired..." cannot match the corporation "Spire".
  const playedName = extractPlayedName(normalizedLine);

  return options
    .filter((option) => {
      const token = normalizeImportToken(option.name);

      if (playedName !== null) {
        return playedName === token;
      }

      return ` ${normalizedLine} `.includes(` ${token} `);
    })
    .map((option) => option.id);
}

function lineMentionsCorporation(normalizedLine: string) {
  return (
    normalizedLine.includes(' corporation') ||
    normalizedLine.includes(' played ') ||
    normalizedLine.includes(' used ') ||
    normalizedLine.includes(' action')
  );
}

function lineMentionsPrelude(normalizedLine: string) {
  return normalizedLine.includes(' prelude') || normalizedLine.includes(' played ');
}

export function parseImportPlayerSelections(input: {
  corporationOptions: CorporationOption[];
  participants: ImportParticipant[];
  preludeOptions: PreludeOption[];
  rawLogText: string;
}): Record<string, ParsedPlayerSelection> {
  const lines = input.rawLogText
    .split(/\r?\n/)
    .map((line) => normalizeImportToken(line))
    .filter(Boolean);
  const detected = new Map<
    string,
    { corporationIds: Set<string>; preludeIds: Set<string> }
  >();

  for (const participant of input.participants) {
    detected.set(participant.playerId, {
      corporationIds: new Set<string>(),
      preludeIds: new Set<string>(),
    });
  }

  for (const line of lines) {
    for (const participant of input.participants) {
      const participantToken = normalizeImportToken(participant.importedName);

      if (!line.includes(participantToken)) {
        continue;
      }

      const entry = detected.get(participant.playerId);

      if (!entry) {
        continue;
      }

      if (lineMentionsCorporation(line)) {
        const corporationMatches = findMatchingIds(line, input.corporationOptions);

        // A player can control several corporations (e.g. after the Merger
        // prelude), so confident single-corp lines accumulate. A line naming two
        // corporations is ambiguous — we cannot tell which one the player took —
        // so it is skipped rather than discarding the corporations that earlier
        // "<player> played <corporation>" lines already established.
        if (corporationMatches.length === 1) {
          entry.corporationIds.add(corporationMatches[0]!);
        }
      }

      if (lineMentionsPrelude(line)) {
        const preludeMatches = findMatchingIds(line, input.preludeOptions);

        if (preludeMatches.length > 0 && preludeMatches.length <= 3) {
          for (const preludeId of preludeMatches) {
            entry.preludeIds.add(preludeId);
          }
        }

        if (preludeMatches.length > 3) {
          entry.preludeIds.clear();
        }
      }
    }
  }

  return Object.fromEntries(
    [...detected.entries()].flatMap(([playerId, selection]) => {
      const corporationIds =
        selection.corporationIds.size > 0 && selection.corporationIds.size <= 3
          ? [...selection.corporationIds]
          : [];
      const corporationId = corporationIds[0] ?? '';
      const preludeIds =
        selection.preludeIds.size > 0 && selection.preludeIds.size <= 3
          ? [...selection.preludeIds]
          : [];

      if (corporationIds.length === 0 && preludeIds.length === 0) {
        return [];
      }

      return [[playerId, { corporationId, corporationIds, preludeIds }] as const];
    }),
  );
}
