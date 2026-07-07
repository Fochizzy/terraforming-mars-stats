import type { CorporationOption, PreludeOption } from '@/lib/db/reference-repo';
import { normalizePlayerAlias } from './normalize-player-alias';

type ImportParticipant = {
  importedName: string;
  playerId: string;
};

type ParsedPlayerSelection = {
  corporationId: string;
  preludeIds: string[];
};

function normalizeImportToken(input: string) {
  return normalizePlayerAlias(input).replace(/\s+/g, ' ');
}

function findMatchingIds(
  normalizedLine: string,
  options: Array<{ id: string; name: string }>,
) {
  return options
    .filter((option) => normalizedLine.includes(normalizeImportToken(option.name)))
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

        if (corporationMatches.length === 1) {
          entry.corporationIds.add(corporationMatches[0]!);
        }

        if (corporationMatches.length > 1) {
          entry.corporationIds.clear();
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
      const corporationId =
        selection.corporationIds.size === 1
          ? [...selection.corporationIds][0]!
          : '';
      const preludeIds =
        selection.preludeIds.size > 0 && selection.preludeIds.size <= 3
          ? [...selection.preludeIds]
          : [];

      if (!corporationId && preludeIds.length === 0) {
        return [];
      }

      return [[playerId, { corporationId, preludeIds }] as const];
    }),
  );
}
