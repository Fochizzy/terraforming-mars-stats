import type {
  MapAwardOption,
  MapMilestoneOption,
  MapOption,
} from '@/lib/db/reference-repo';
import type { ParsedGameLog } from './parse-game-log';
import { normalizePlayerAlias } from './normalize-player-alias';

export function inferImportMapFromLog(input: {
  awardOptions: MapAwardOption[];
  mapOptions: MapOption[];
  milestoneOptions: MapMilestoneOption[];
  parsedGameLog: Pick<ParsedGameLog, 'events'>;
}) {
  const validMapIds = new Set(input.mapOptions.map((map) => map.id));
  const matchingMapIds = new Set<string>();
  const milestoneMapIdsByName = new Map<string, string[]>();
  const awardMapIdsByName = new Map<string, string[]>();

  for (const milestone of input.milestoneOptions) {
    if (!validMapIds.has(milestone.mapId)) {
      continue;
    }

    const normalizedName = normalizePlayerAlias(milestone.milestoneName);
    milestoneMapIdsByName.set(normalizedName, [
      ...(milestoneMapIdsByName.get(normalizedName) ?? []),
      milestone.mapId,
    ]);
  }

  for (const award of input.awardOptions) {
    if (!validMapIds.has(award.mapId)) {
      continue;
    }

    const normalizedName = normalizePlayerAlias(award.awardName);
    awardMapIdsByName.set(normalizedName, [
      ...(awardMapIdsByName.get(normalizedName) ?? []),
      award.mapId,
    ]);
  }

  for (const event of input.parsedGameLog.events) {
    if (event.eventType === 'milestone_claimed') {
      for (const mapId of milestoneMapIdsByName.get(
        normalizePlayerAlias(event.milestone),
      ) ?? []) {
        matchingMapIds.add(mapId);
      }
    }

    if (event.eventType === 'award_funded' || event.eventType === 'award_result') {
      for (const mapId of awardMapIdsByName.get(
        normalizePlayerAlias(event.award),
      ) ?? []) {
        matchingMapIds.add(mapId);
      }
    }
  }

  if (matchingMapIds.size !== 1) {
    return null;
  }

  return {
    mapId: [...matchingMapIds][0],
  };
}
