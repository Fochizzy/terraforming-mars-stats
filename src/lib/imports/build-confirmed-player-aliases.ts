import type { ImportResolutionPlayer } from '@/lib/db/import-player-resolution-repo';
import { normalizePlayerAlias } from './normalize-player-alias';

type ConfirmedPlayerLink = {
  importedName: string;
  playerId: string;
};

export function buildConfirmedPlayerAliases(input: {
  confirmedPlayerLinks: ConfirmedPlayerLink[];
  participantNames: string[];
  players: ImportResolutionPlayer[];
  screenshotPlayerNames: string[];
}) {
  const participantNameSet = new Set(
    input.participantNames.map((name) => normalizePlayerAlias(name)),
  );
  const screenshotNameSet = new Set(
    input.screenshotPlayerNames.map((name) => normalizePlayerAlias(name)),
  );
  const playerById = new Map(input.players.map((player) => [player.id, player]));
  const aliases = new Map<
    string,
    {
      aliasText: string;
      playerId: string;
      sourceType: 'game_log' | 'screenshot_ocr';
    }
  >();

  for (const link of input.confirmedPlayerLinks) {
    const normalizedImportedName = normalizePlayerAlias(link.importedName);

    if (!normalizedImportedName) {
      continue;
    }

    const player = playerById.get(link.playerId);

    if (!player) {
      continue;
    }

    const normalizedPlayerNames = new Set(
      [
        player.displayName,
        player.linkedFullName ?? '',
        player.linkedUsername ?? '',
      ]
        .map((value) => normalizePlayerAlias(value))
        .filter(Boolean),
    );

    if (normalizedPlayerNames.has(normalizedImportedName)) {
      continue;
    }

    if (participantNameSet.has(normalizedImportedName)) {
      aliases.set(`game_log:${link.playerId}:${normalizedImportedName}`, {
        aliasText: link.importedName,
        playerId: link.playerId,
        sourceType: 'game_log',
      });
    }

    if (screenshotNameSet.has(normalizedImportedName)) {
      aliases.set(`screenshot_ocr:${link.playerId}:${normalizedImportedName}`, {
        aliasText: link.importedName,
        playerId: link.playerId,
        sourceType: 'screenshot_ocr',
      });
    }
  }

  return [...aliases.values()];
}
