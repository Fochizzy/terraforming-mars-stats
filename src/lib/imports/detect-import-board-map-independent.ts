import type {
  ImportMapReferenceCatalog,
  MapOption,
} from '@/lib/db/reference-repo';
import {
  classifyImportObjectiveConfiguration,
  type ImportObjectiveConfiguration,
} from './objective-configuration';
import { MAP_OCEAN_FINGERPRINTS, normalizeMapCode } from './map-ocean-fingerprints';
import type { ImportObjectiveEvidence } from './parse-terraforming-mars-log';

export type IndependentMapDetectionKind =
  | 'ambiguous'
  | 'confident'
  | 'conflicting'
  | 'missing';

export type IndependentMapCandidate = {
  code: string;
  id: string;
  name: string;
  oceanMatched: number;
  oceanMissed: number;
  objectivesInDefaultSet: number;
  objectivesOffDefaultSet: number;
  requiresRandomizedObjectives: boolean;
};

export type IndependentMapDetection = {
  candidates: IndependentMapCandidate[];
  detectedMapCode: string | null;
  detectedMapId: string | null;
  detectedMapName: string | null;
  kind: IndependentMapDetectionKind;
  mapSource: 'none' | 'objectives' | 'oceans' | 'oceans+objectives';
  message: string;
  objectiveConfiguration: ImportObjectiveConfiguration;
};

type MapModel = {
  defaultObjectiveIds: Set<string>;
  oceanEligible: Set<string>;
  option: MapOption;
  requiresRandomizedObjectives: boolean;
};

function objectiveIds(evidence: ImportObjectiveEvidence) {
  return evidence.canonicalId
    ? [evidence.canonicalId]
    : evidence.candidateEntityIds;
}

function buildModels(catalog: ImportMapReferenceCatalog): MapModel[] {
  const fingerprintByCode = new Map(
    MAP_OCEAN_FINGERPRINTS.map((fingerprint) => [fingerprint.code, fingerprint]),
  );
  return catalog.maps.flatMap((option) => {
    const fingerprint = fingerprintByCode.get(normalizeMapCode(option.code));
    if (!fingerprint) return [];
    return [{
      defaultObjectiveIds: new Set([
        ...catalog.milestones
          .filter((item) => item.mapId === option.id)
          .map((item) => item.milestoneId),
        ...catalog.awards
          .filter((item) => item.mapId === option.id)
          .map((item) => item.awardId),
      ]),
      oceanEligible: new Set(fingerprint.oceanEligibleSpaceIds),
      option,
      requiresRandomizedObjectives: fingerprint.randomizedUnsupported,
    }];
  });
}

function allObjectivesMatch(objectives: string[][], model: MapModel) {
  return (
    objectives.length > 0 &&
    objectives.every((ids) => ids.some((id) => model.defaultObjectiveIds.has(id)))
  );
}

export function detectImportBoardMapIndependent(input: {
  catalog: ImportMapReferenceCatalog;
  objectiveConfiguration: ImportObjectiveConfiguration;
  objectiveEvidence: ImportObjectiveEvidence[];
  oceanSpaceIds: string[];
  offReserveOceanAllowance?: number;
  offReserveOceanExceptionSpaceIds?: string[];
}): IndependentMapDetection {
  const models = buildModels(input.catalog);
  const oceans = [...new Set(input.oceanSpaceIds)];
  const objectives = input.objectiveEvidence
    .filter((evidence) => evidence.resolution !== 'unknown')
    .map(objectiveIds)
    .filter((ids) => ids.length > 0);
  const objectiveClass = classifyImportObjectiveConfiguration(
    input.objectiveConfiguration,
  );
  const mayUseObjectives = objectiveClass === 'standard';
  const allowance = Math.max(0, input.offReserveOceanAllowance ?? 0);
  const exceptionSpaces = new Set(input.offReserveOceanExceptionSpaceIds ?? []);
  // A verified off-reserve ocean — one linked to a source-backed exception card
  // play — that lands on a non-reserved hex is explained evidence, so it is not
  // counted against the map's reserved-ocean fingerprint.
  const oceanMissedFor = (model: (typeof models)[number]) =>
    oceans.filter(
      (space) => !model.oceanEligible.has(space) && !exceptionSpaces.has(space),
    ).length;
  const candidates = models
    .map((model) => {
      const oceanMatched = oceans.filter((space) => model.oceanEligible.has(space)).length;
      const objectivesInDefaultSet = objectives.filter((ids) =>
        ids.some((id) => model.defaultObjectiveIds.has(id)),
      ).length;
      return {
        code: model.option.code,
        id: model.option.id,
        name: model.option.name,
        oceanMatched,
        oceanMissed: oceanMissedFor(model),
        objectivesInDefaultSet,
        objectivesOffDefaultSet: objectives.length - objectivesInDefaultSet,
        requiresRandomizedObjectives: model.requiresRandomizedObjectives,
      };
    })
    .sort(
      (left, right) =>
        left.oceanMissed - right.oceanMissed ||
        right.oceanMatched - left.oceanMatched ||
        left.name.localeCompare(right.name),
    );
  const finish = (
    partial: Omit<IndependentMapDetection, 'candidates' | 'objectiveConfiguration'>,
  ): IndependentMapDetection => ({
    ...partial,
    candidates,
    objectiveConfiguration: input.objectiveConfiguration,
  });

  const standardObjectiveMaps = models.filter((model) =>
    allObjectivesMatch(objectives, model),
  );

  if (oceans.length === 0) {
    if (mayUseObjectives && standardObjectiveMaps.length === 1) {
      const model = standardObjectiveMaps[0];
      return finish({
        detectedMapCode: model.option.code,
        detectedMapId: model.option.id,
        detectedMapName: model.option.name,
        kind: 'confident',
        mapSource: 'objectives',
        message: `Map identified from the confirmed board-defined objective set (${model.option.name}).`,
      });
    }
    return finish({
      detectedMapCode: null,
      detectedMapId: null,
      detectedMapName: null,
      kind: objectives.length > 0 ? 'ambiguous' : 'missing',
      mapSource: 'none',
      message: mayUseObjectives
        ? 'The board-defined objectives do not uniquely identify a map. Confirm the map.'
        : 'No ocean evidence identifies the map. Randomized or unknown objectives are intentionally not used as a map signal.',
    });
  }

  const minMissed = Math.min(...candidates.map((candidate) => candidate.oceanMissed));
  if (minMissed > allowance) {
    const objectiveMap = mayUseObjectives && standardObjectiveMaps.length === 1
      ? standardObjectiveMaps[0]
      : null;
    return finish({
      detectedMapCode: objectiveMap?.option.code ?? null,
      detectedMapId: objectiveMap?.option.id ?? null,
      detectedMapName: objectiveMap?.option.name ?? null,
      kind: objectiveMap ? 'conflicting' : 'ambiguous',
      mapSource: objectiveMap ? 'objectives' : 'oceans',
      message: objectiveMap
        ? `Ocean placements conflict with the board geometry, while board-defined objectives indicate ${objectiveMap.option.name}. Confirm the map and log evidence.`
        : 'Ocean placements do not fit a known map within the allowed off-reserve tolerance. Confirm the map.',
    });
  }

  const bestModels = models.filter(
    (model) => oceanMissedFor(model) === minMissed,
  );
  if (bestModels.length === 1) {
    const model = bestModels[0];
    if (model.requiresRandomizedObjectives && objectiveClass === 'standard') {
      return finish({
        detectedMapCode: model.option.code,
        detectedMapId: model.option.id,
        detectedMapName: model.option.name,
        kind: 'conflicting',
        mapSource: 'oceans',
        message: `${model.option.name} is identified from ocean placements and requires randomized objectives. Correct the objective configuration.`,
      });
    }
    if (mayUseObjectives && objectives.length > 0 && !allObjectivesMatch(objectives, model)) {
      return finish({
        detectedMapCode: model.option.code,
        detectedMapId: model.option.id,
        detectedMapName: model.option.name,
        kind: 'conflicting',
        mapSource: 'oceans',
        message: `Ocean placements identify ${model.option.name}, but the confirmed board-defined objectives do not belong to that map.`,
      });
    }
    return finish({
      detectedMapCode: model.option.code,
      detectedMapId: model.option.id,
      detectedMapName: model.option.name,
      kind: 'confident',
      mapSource:
        mayUseObjectives && objectives.length > 0 ? 'oceans+objectives' : 'oceans',
      message: `Map identified from ocean placements (${model.option.name}).`,
    });
  }

  if (mayUseObjectives) {
    const objectiveWinners = bestModels.filter((model) =>
      allObjectivesMatch(objectives, model),
    );
    if (objectiveWinners.length === 1) {
      const model = objectiveWinners[0];
      return finish({
        detectedMapCode: model.option.code,
        detectedMapId: model.option.id,
        detectedMapName: model.option.name,
        kind: 'confident',
        mapSource: 'oceans+objectives',
        message: `Ocean placements narrowed the board; the confirmed board-defined objectives identify ${model.option.name}.`,
      });
    }
  }

  return finish({
    detectedMapCode: null,
    detectedMapId: null,
    detectedMapName: null,
    kind: 'ambiguous',
    mapSource: 'oceans',
    message:
      objectiveClass === 'randomized'
        ? 'Ocean placements fit more than one map. Randomized objectives are intentionally ignored; confirm the map.'
        : 'Ocean placements fit more than one map and the allowed objective evidence does not resolve it. Confirm the map.',
  });
}
