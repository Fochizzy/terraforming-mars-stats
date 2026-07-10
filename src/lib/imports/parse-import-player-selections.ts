import type { CorporationOption, PreludeOption } from '@/lib/db/reference-repo';
import { normalizePlayerAlias } from './normalize-player-alias';

type ImportParticipant = {
  importedName: string;
  playerId: string;
};

type ParsedPlayerSelection = {
  corporationId: string;
  corporationIds: string[];
  midgamePreludeIds: string[];
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

// Preludes are dealt in the opening phase, before anyone takes an action.
// Cards played later can still be preludes — Valley Trust's first action, the
// Board of Directors prelude, and New Partner all play further preludes — so a
// player's opening phase ends at their first action, and preludes found after
// it are recorded separately rather than counted as setup selections.
function lineEndsPreludePhase(normalizedLine: string) {
  return (
    normalizedLine.includes(' took the first action of') ||
    normalizedLine.includes(' used ') ||
    normalizedLine.includes(' passed')
  );
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
    {
      corporationIds: Set<string>;
      midgamePreludeIds: Set<string>;
      preludePhaseOver: boolean;
      preludeIds: Set<string>;
    }
  >();

  for (const participant of input.participants) {
    detected.set(participant.playerId, {
      corporationIds: new Set<string>(),
      midgamePreludeIds: new Set<string>(),
      preludePhaseOver: false,
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

      if (lineEndsPreludePhase(line)) {
        entry.preludePhaseOver = true;
      }

      if (lineMentionsPrelude(line)) {
        const preludeMatches = findMatchingIds(line, input.preludeOptions);

        // A single line naming more than three preludes is a parse we do not
        // trust, so the opening selection is discarded rather than guessed at.
        if (entry.preludePhaseOver) {
          // The number of preludes a player can play mid-game is unbounded —
          // Board of Directors plays one per director — so these are never
          // capped by count.
          for (const preludeId of preludeMatches) {
            if (!entry.preludeIds.has(preludeId)) {
              entry.midgamePreludeIds.add(preludeId);
            }
          }
        } else if (preludeMatches.length > 3) {
          entry.preludeIds.clear();
        } else {
          for (const preludeId of preludeMatches) {
            entry.preludeIds.add(preludeId);
          }
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
      const midgamePreludeIds = [...selection.midgamePreludeIds];

      if (
        corporationIds.length === 0 &&
        preludeIds.length === 0 &&
        midgamePreludeIds.length === 0
      ) {
        return [];
      }

      return [
        [
          playerId,
          { corporationId, corporationIds, midgamePreludeIds, preludeIds },
        ] as const,
      ];
    }),
  );
}
