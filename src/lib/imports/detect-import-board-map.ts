/**
 * Identifies the board map of an imported game and classifies its objective
 * configuration, following the map-and-objective interpretation contract in
 * docs/redesign/MASTER-RULES.md.
 *
 * Signal priority
 * ---------------
 * The upstream export contains no explicit map value, so the placed ocean tiles
 * are the authoritative map signal: a game's oceans are a subset of exactly one
 * map's reserved-ocean set (see {@link ./map-ocean-fingerprints}), give or take a
 * bounded number of off-reserve oceans from specific cards. Objective evidence
 * (claimed milestones / funded awards) is used only to:
 *   - break the Terra Cimmeria / Terra Cimmeria Nova tie (identical boards), and
 *   - identify the map when too few oceans were placed to be decisive.
 *
 * Objectives are never used to infer the map when they were randomized, and a map
 * is never required to have objectives from its default set. When the oceans pin a
 * board but the objectives are not that board's defaults, the objectives were
 * randomized and are classified separately from standard ones. Unknown maps are
 * never defaulted to Tharsis.
 */

import type { ImportMapReferenceCatalog, MapOption } from '@/lib/db/reference-repo';
import type { ImportObjectiveEvidence } from './parse-terraforming-mars-log';
import { MAP_OCEAN_FINGERPRINTS, normalizeMapCode } from './map-ocean-fingerprints';

export type ImportBoardMapObjectiveConfiguration = 'standard' | 'randomized' | 'unknown';

export type ImportBoardMapDetectionKind =
  | 'confident'
  | 'ambiguous'
  | 'conflicting'
  | 'unsupported'
  | 'missing';

export type ImportBoardMapCandidate = {
  code: string;
  id: string;
  name: string;
  randomizedUnsupported: boolean;
  oceanMatched: number;
  oceanMissed: number;
  objectivesInDefaultSet: number;
  objectivesOffDefaultSet: number;
};

export type ImportBoardMapDetection = {
  kind: ImportBoardMapDetectionKind;
  detectedMapCode: string | null;
  detectedMapId: string | null;
  detectedMapName: string | null;
  mapSource: 'oceans' | 'oceans+objectives' | 'objectives' | 'none';
  objectiveConfiguration: ImportBoardMapObjectiveConfiguration;
  oceanSpaceIdCount: number;
  recognizedObjectiveCount: number;
  candidates: ImportBoardMapCandidate[];
  message: string;
};

type MapModel = {
  option: MapOption;
  randomizedUnsupported: boolean;
  oceanEligible: Set<string>;
  defaultObjectiveIds: Set<string>;
};

function buildMapModels(catalog: ImportMapReferenceCatalog): MapModel[] {
  const fingerprintByCode = new Map(
    MAP_OCEAN_FINGERPRINTS.map((fingerprint) => [fingerprint.code, fingerprint]),
  );

  return catalog.maps.flatMap((option) => {
    const fingerprint = fingerprintByCode.get(normalizeMapCode(option.code));
    if (!fingerprint) return [];

    const defaultObjectiveIds = new Set<string>([
      ...catalog.milestones
        .filter((relationship) => relationship.mapId === option.id)
        .map((relationship) => relationship.milestoneId),
      ...catalog.awards
        .filter((relationship) => relationship.mapId === option.id)
        .map((relationship) => relationship.awardId),
    ]);

    return [
      {
        option,
        randomizedUnsupported: fingerprint.randomizedUnsupported,
        oceanEligible: new Set(fingerprint.oceanEligibleSpaceIds),
        defaultObjectiveIds,
      },
    ];
  });
}

// The candidate entity ids for one recognized objective (a single canonical id,
// or the ambiguous set when the log value matched more than one entity).
function objectiveEntityIds(evidence: ImportObjectiveEvidence): string[] {
  if (evidence.canonicalId) return [evidence.canonicalId];
  return evidence.candidateEntityIds;
}

function objectiveMatchesMap(entityIds: string[], model: MapModel): boolean {
  return entityIds.some((id) => model.defaultObjectiveIds.has(id));
}

function toCandidate(
  model: MapModel,
  oceanSpaceIds: string[],
  recognizedObjectives: string[][],
): ImportBoardMapCandidate {
  const oceanMatched = oceanSpaceIds.filter((id) => model.oceanEligible.has(id)).length;
  const objectivesInDefaultSet = recognizedObjectives.filter((ids) =>
    objectiveMatchesMap(ids, model),
  ).length;
  return {
    code: model.option.code,
    id: model.option.id,
    name: model.option.name,
    randomizedUnsupported: model.randomizedUnsupported,
    oceanMatched,
    oceanMissed: oceanSpaceIds.length - oceanMatched,
    objectivesInDefaultSet,
    objectivesOffDefaultSet: recognizedObjectives.length - objectivesInDefaultSet,
  };
}

function detection(
  partial: Omit<ImportBoardMapDetection, 'candidates' | 'oceanSpaceIdCount' | 'recognizedObjectiveCount'>,
  candidates: ImportBoardMapCandidate[],
  oceanSpaceIdCount: number,
  recognizedObjectiveCount: number,
): ImportBoardMapDetection {
  return { ...partial, candidates, oceanSpaceIdCount, recognizedObjectiveCount };
}

/**
 * @param offReserveOceanAllowance number of placed oceans permitted to fall
 *   outside the identified map's reserved set, e.g. because an off-reserve ocean
 *   card (Artificial Lake) was played. Callers derive it from the exception-card
 *   catalogue; the default of 0 requires an exact subset.
 */
export function detectImportBoardMap(input: {
  oceanSpaceIds: string[];
  objectiveEvidence: ImportObjectiveEvidence[];
  catalog: ImportMapReferenceCatalog;
  offReserveOceanAllowance?: number;
}): ImportBoardMapDetection {
  const allowance = Math.max(0, input.offReserveOceanAllowance ?? 0);
  const oceanSpaceIds = [...new Set(input.oceanSpaceIds)];
  const models = buildMapModels(input.catalog);

  const recognizedObjectives = input.objectiveEvidence
    .filter((evidence) => evidence.resolution !== 'unknown')
    .map(objectiveEntityIds)
    .filter((ids) => ids.length > 0);

  const candidates = models
    .map((model) => toCandidate(model, oceanSpaceIds, recognizedObjectives))
    .sort(
      (left, right) =>
        left.oceanMissed - right.oceanMissed ||
        right.oceanMatched - left.oceanMatched ||
        right.objectivesInDefaultSet - left.objectivesInDefaultSet,
    );

  const supported = models.filter((model) => !model.randomizedUnsupported);
  const finish = (
    partial: Omit<
      ImportBoardMapDetection,
      'candidates' | 'oceanSpaceIdCount' | 'recognizedObjectiveCount'
    >,
  ) => detection(partial, candidates, oceanSpaceIds.length, recognizedObjectives.length);

  // A map whose default objective set contains every recognized objective — a
  // standard-objective match.
  const standardObjectiveMaps = (pool: MapModel[]) =>
    recognizedObjectives.length === 0
      ? []
      : pool.filter((model) =>
          recognizedObjectives.every((ids) => objectiveMatchesMap(ids, model)),
        );

  // ---- No ocean evidence: objectives-only, or genuinely missing. ----
  if (oceanSpaceIds.length === 0) {
    if (recognizedObjectives.length === 0) {
      return finish({
        kind: 'missing',
        detectedMapCode: null,
        detectedMapId: null,
        detectedMapName: null,
        mapSource: 'none',
        objectiveConfiguration: 'unknown',
        message: 'No ocean placements or objective evidence were found to identify the map.',
      });
    }

    const objectiveMaps = standardObjectiveMaps(supported);
    if (objectiveMaps.length === 1) {
      const map = objectiveMaps[0];
      return finish({
        kind: 'confident',
        detectedMapCode: map.option.code,
        detectedMapId: map.option.id,
        detectedMapName: map.option.name,
        mapSource: 'objectives',
        objectiveConfiguration: 'standard',
        message: `Map identified from its standard milestone and award set (no ocean placements were available).`,
      });
    }
    if (objectiveMaps.length > 1) {
      return finish({
        kind: 'ambiguous',
        detectedMapCode: null,
        detectedMapId: null,
        detectedMapName: null,
        mapSource: 'objectives',
        objectiveConfiguration: 'standard',
        message: 'The objective set matches more than one map and there are no ocean placements to disambiguate. Confirm the map.',
      });
    }
    // Objectives match no single map's defaults and there are no oceans: the map
    // cannot be determined (likely randomized objectives without board evidence).
    return finish({
      kind: 'missing',
      detectedMapCode: null,
      detectedMapId: null,
      detectedMapName: null,
      mapSource: 'none',
      objectiveConfiguration: 'unknown',
      message: 'The objectives do not match any map default set and no ocean placements are available, so the map cannot be determined. Confirm the map.',
    });
  }

  // ---- Ocean evidence present. ----
  const minMissed = Math.min(...candidates.map((candidate) => candidate.oceanMissed));

  // Oceans fit no map within the allowed off-reserve tolerance.
  if (minMissed > allowance) {
    const objectiveMaps = standardObjectiveMaps(supported);
    if (objectiveMaps.length === 1) {
      const map = objectiveMaps[0];
      return finish({
        kind: 'conflicting',
        detectedMapCode: map.option.code,
        detectedMapId: map.option.id,
        detectedMapName: map.option.name,
        mapSource: 'objectives',
        objectiveConfiguration: 'standard',
        message: `The ocean placements do not fit any known map, but the objectives match ${map.option.name}. Confirm the map and check for an unsupported board.`,
      });
    }
    return finish({
      kind: 'ambiguous',
      detectedMapCode: null,
      detectedMapId: null,
      detectedMapName: null,
      mapSource: 'oceans',
      objectiveConfiguration: 'unknown',
      message: 'The ocean placements do not fit any known map within the allowed tolerance. Confirm the map or check for an unsupported board.',
    });
  }

  const bestByOcean = models.filter((model) => {
    const matched = oceanSpaceIds.filter((id) => model.oceanEligible.has(id)).length;
    return oceanSpaceIds.length - matched === minMissed;
  });

  const supportedBest = bestByOcean.filter((model) => !model.randomizedUnsupported);

  // The oceans best fit an unsupported (randomized) board and nothing else.
  if (supportedBest.length === 0) {
    const hollandia = bestByOcean[0];
    return finish({
      kind: 'unsupported',
      detectedMapCode: hollandia.option.code,
      detectedMapId: hollandia.option.id,
      detectedMapName: hollandia.option.name,
      mapSource: 'oceans',
      objectiveConfiguration: 'unknown',
      message: `The board matches ${hollandia.option.name}, which uses randomized objectives and is not supported for import.`,
    });
  }

  // ---- Unique supported board from oceans. ----
  if (supportedBest.length === 1) {
    const map = supportedBest[0];
    const confident = (
      objectiveConfiguration: ImportBoardMapObjectiveConfiguration,
      mapSource: 'oceans' | 'oceans+objectives',
      message: string,
    ) =>
      finish({
        kind: 'confident',
        detectedMapCode: map.option.code,
        detectedMapId: map.option.id,
        detectedMapName: map.option.name,
        mapSource,
        objectiveConfiguration,
        message,
      });

    if (recognizedObjectives.length === 0) {
      return confident('unknown', 'oceans', `Map identified from ocean placements (${map.option.name}). No objective evidence was available to classify the objective set.`);
    }

    const allObjectivesStandard = recognizedObjectives.every((ids) =>
      objectiveMatchesMap(ids, map),
    );
    if (allObjectivesStandard) {
      return confident('standard', 'oceans+objectives', `Map identified from ocean placements and corroborated by its standard objective set (${map.option.name}).`);
    }

    // Oceans pin the board, but the objectives are not this map's defaults. If
    // they cleanly match a different map's defaults, that is a conflict to
    // confirm; otherwise the objectives were randomized.
    const conflictMaps = standardObjectiveMaps(supported).filter(
      (candidate) => candidate.option.id !== map.option.id,
    );
    if (conflictMaps.length > 0) {
      return finish({
        kind: 'conflicting',
        detectedMapCode: map.option.code,
        detectedMapId: map.option.id,
        detectedMapName: map.option.name,
        mapSource: 'oceans',
        objectiveConfiguration: 'standard',
        message: `Ocean placements indicate ${map.option.name}, but the objectives are the standard set for ${conflictMaps[0].option.name}. Confirm the map.`,
      });
    }
    return confident('randomized', 'oceans', `Map identified from ocean placements (${map.option.name}); the objectives are not this map's default set, so they are treated as randomized and kept separate from standard objectives.`);
  }

  // ---- Ocean tie among supported boards (identical Terra Cimmeria / Nova, or
  // too few oceans to be decisive): objectives must disambiguate. ----
  const objectiveWinners = standardObjectiveMaps(supportedBest);
  if (objectiveWinners.length === 1) {
    const map = objectiveWinners[0];
    return finish({
      kind: 'confident',
      detectedMapCode: map.option.code,
      detectedMapId: map.option.id,
      detectedMapName: map.option.name,
      mapSource: 'oceans+objectives',
      objectiveConfiguration: 'standard',
      message: `Ocean placements narrowed the board to ${supportedBest.length} maps; the standard objective set identifies ${map.option.name}.`,
    });
  }

  const tiedNames = supportedBest.map((model) => model.option.name).join(', ');
  const objectiveConfiguration: ImportBoardMapObjectiveConfiguration =
    recognizedObjectives.length > 0 && objectiveWinners.length === 0 ? 'randomized' : 'unknown';
  return finish({
    kind: 'ambiguous',
    detectedMapCode: null,
    detectedMapId: null,
    detectedMapName: null,
    mapSource: 'oceans',
    objectiveConfiguration,
    message:
      objectiveConfiguration === 'randomized'
        ? `Ocean placements narrowed the board to ${tiedNames}, but the objectives are randomized and cannot distinguish them. Confirm the map.`
        : `Ocean placements are consistent with more than one map (${tiedNames}) and the objectives do not resolve it. Confirm the map.`,
  });
}
