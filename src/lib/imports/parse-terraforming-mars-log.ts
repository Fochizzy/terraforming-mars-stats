import type {
  ImportMapReferenceCatalog,
  MapOption,
} from '@/lib/db/reference-repo';
import { normalizePlayerAlias } from './normalize-player-alias';
import { normalizeDomainText } from '@/lib/ocr/domain-matcher';

export const TERRAFORMING_MARS_LOG_PARSER_IDENTITY =
  'terraforming-mars-exported-log-v1' as const;
export const TERRAFORMING_MARS_LOG_SOURCE_FORMAT =
  'terraforming_mars_exported_log' as const;

const EXPECTED_FIXED_OBJECTIVE_COUNT = 5;

export type ImportObjectiveType = 'award' | 'milestone';

export type ImportReferenceAuditIssue = {
  code:
    | 'alias_missing_objective'
    | 'ambiguous_alias'
    | 'conflicting_objective_name'
    | 'duplicate_map_code'
    | 'duplicate_relationship'
    | 'incomplete_relationship_set'
    | 'relationship_missing_map';
  message: string;
};

export type ImportReferenceAudit = {
  blockingIssues: ImportReferenceAuditIssue[];
  randomizedUnsupportedMaps: MapOption[];
};

export type ImportObjectiveEvidence = {
  candidateEntityIds: string[];
  canonicalId: string | null;
  canonicalName: string | null;
  lineNumber: number;
  normalizedValue: string;
  normalizedPlayerValue: string;
  originalLine: string;
  originalPlayerValue: string;
  originalValue: string;
  resolution: 'alias' | 'ambiguous' | 'corrected' | 'exact' | 'unknown';
  source: 'exported_log' | 'result_pdf' | 'screenshot_ocr';
  type: ImportObjectiveType;
};

export type ImportMapCandidate = {
  code: string;
  id: string;
  matchedAwardCount: number;
  matchedMilestoneCount: number;
  name: string;
};

export type ImportMapDetection = {
  candidates: ImportMapCandidate[];
  confirmedMapId: string | null;
  evidence: ImportObjectiveEvidence[];
  kind: 'ambiguous' | 'conflicting' | 'partial' | 'resolved' | 'unsupported';
  message: string;
  selectedMapId: string | null;
};

export type ImportedPlayerEvidence = {
  lineNumber: number;
  normalizedValue: string;
  originalLine: string;
  originalValue: string;
};

export type TerraformingMarsLogParseResult = {
  errors: string[];
  generationCount: number | null;
  map: ImportMapDetection;
  parserIdentity: typeof TERRAFORMING_MARS_LOG_PARSER_IDENTITY;
  playerCount: number | null;
  players: ImportedPlayerEvidence[];
  referenceAudit: ImportReferenceAudit;
  sourceFormat: typeof TERRAFORMING_MARS_LOG_SOURCE_FORMAT;
  status: 'error' | 'partial' | 'success';
  warnings: string[];
};

export type ImportObjectiveCorrection = {
  canonicalId: string;
  lineNumber: number;
  source?: ImportObjectiveEvidence['source'];
  type: ImportObjectiveType;
};

type ObjectiveEntry = {
  aliases: string[];
  id: string;
  name: string;
  normalizedName: string;
  type: ImportObjectiveType;
};

function isRandomizedUnsupportedMap(map: MapOption) {
  return (
    normalizeDomainText(map.code) === 'hollandia' ||
    normalizeDomainText(map.name) === 'hollandia'
  );
}

function objectiveKey(type: ImportObjectiveType, id: string) {
  return `${type}:${id}`;
}

function buildObjectiveEntries(catalog: ImportMapReferenceCatalog) {
  const entries = new Map<string, ObjectiveEntry>();

  for (const milestone of catalog.milestones) {
    const key = objectiveKey('milestone', milestone.milestoneId);
    const existing = entries.get(key);
    if (!existing) {
      entries.set(key, {
        aliases: [],
        id: milestone.milestoneId,
        name: milestone.milestoneName,
        normalizedName: normalizeDomainText(milestone.milestoneName),
        type: 'milestone',
      });
    }
  }

  for (const award of catalog.awards) {
    const key = objectiveKey('award', award.awardId);
    const existing = entries.get(key);
    if (!existing) {
      entries.set(key, {
        aliases: [],
        id: award.awardId,
        name: award.awardName,
        normalizedName: normalizeDomainText(award.awardName),
        type: 'award',
      });
    }
  }

  for (const alias of catalog.aliases) {
    const entry = entries.get(objectiveKey(alias.entityType, alias.entityId));
    if (entry) {
      entry.aliases.push(alias.aliasText);
    }
  }

  return entries;
}

export function auditImportMapReferenceCatalog(
  catalog: ImportMapReferenceCatalog,
): ImportReferenceAudit {
  const blockingIssues: ImportReferenceAuditIssue[] = [];
  const mapById = new Map(catalog.maps.map((map) => [map.id, map]));
  const normalizedMapCodes = new Map<string, MapOption[]>();
  const entries = buildObjectiveEntries(catalog);

  for (const map of catalog.maps) {
    const normalizedCode = normalizeDomainText(map.code);
    normalizedMapCodes.set(normalizedCode, [
      ...(normalizedMapCodes.get(normalizedCode) ?? []),
      map,
    ]);
  }

  for (const [normalizedCode, maps] of normalizedMapCodes) {
    if (maps.length > 1) {
      blockingIssues.push({
        code: 'duplicate_map_code',
        message: `Map code ${normalizedCode} resolves to more than one map.`,
      });
    }
  }

  const relationshipKeys = new Set<string>();
  for (const relationship of [
    ...catalog.milestones.map((row) => ({
      entityId: row.milestoneId,
      mapId: row.mapId,
      type: 'milestone' as const,
    })),
    ...catalog.awards.map((row) => ({
      entityId: row.awardId,
      mapId: row.mapId,
      type: 'award' as const,
    })),
  ]) {
    if (!mapById.has(relationship.mapId)) {
      blockingIssues.push({
        code: 'relationship_missing_map',
        message: `${relationship.type} relationship refers to missing map ${relationship.mapId}.`,
      });
    }

    const key = `${relationship.type}:${relationship.mapId}:${relationship.entityId}`;
    if (relationshipKeys.has(key)) {
      blockingIssues.push({
        code: 'duplicate_relationship',
        message: `Duplicate ${relationship.type} relationship ${relationship.entityId} exists for map ${relationship.mapId}.`,
      });
    }
    relationshipKeys.add(key);
  }

  for (const map of catalog.maps.filter(
    (candidate) => !isRandomizedUnsupportedMap(candidate),
  )) {
    const milestoneCount = new Set(
      catalog.milestones
        .filter((relationship) => relationship.mapId === map.id)
        .map((relationship) => relationship.milestoneId),
    ).size;
    const awardCount = new Set(
      catalog.awards
        .filter((relationship) => relationship.mapId === map.id)
        .map((relationship) => relationship.awardId),
    ).size;

    if (
      milestoneCount !== EXPECTED_FIXED_OBJECTIVE_COUNT ||
      awardCount !== EXPECTED_FIXED_OBJECTIVE_COUNT
    ) {
      blockingIssues.push({
        code: 'incomplete_relationship_set',
        message: `${map.name} has ${milestoneCount} milestones and ${awardCount} awards; fixed maps require ${EXPECTED_FIXED_OBJECTIVE_COUNT} of each.`,
      });
    }
  }

  const normalizedNames = new Map<string, ObjectiveEntry[]>();
  for (const entry of entries.values()) {
    const key = `${entry.type}:${entry.normalizedName}`;
    normalizedNames.set(key, [...(normalizedNames.get(key) ?? []), entry]);
  }
  for (const [key, matchingEntries] of normalizedNames) {
    if (matchingEntries.length > 1) {
      blockingIssues.push({
        code: 'conflicting_objective_name',
        message: `Canonical objective name ${key} refers to multiple records.`,
      });
    }
  }

  const normalizedAliases = new Map<string, Set<string>>();
  for (const alias of catalog.aliases) {
    const key = objectiveKey(alias.entityType, alias.entityId);
    if (!entries.has(key)) {
      blockingIssues.push({
        code: 'alias_missing_objective',
        message: `${alias.entityType} alias ${alias.aliasText} refers to missing objective ${alias.entityId}.`,
      });
      continue;
    }

    const normalizedAliasKey = `${alias.entityType}:${normalizeDomainText(alias.aliasText)}`;
    const ids = normalizedAliases.get(normalizedAliasKey) ?? new Set<string>();
    ids.add(alias.entityId);
    normalizedAliases.set(normalizedAliasKey, ids);
  }
  for (const [key, ids] of normalizedAliases) {
    if (ids.size > 1) {
      blockingIssues.push({
        code: 'ambiguous_alias',
        message: `Approved alias ${key} resolves to more than one objective.`,
      });
    }
  }

  return {
    blockingIssues,
    randomizedUnsupportedMaps: catalog.maps.filter(isRandomizedUnsupportedMap),
  };
}

function buildObjectiveIndex(catalog: ImportMapReferenceCatalog) {
  const entries = buildObjectiveEntries(catalog);
  const index = new Map<string, ObjectiveEntry[]>();

  for (const entry of entries.values()) {
    const values = [entry.name, ...entry.aliases];
    for (const value of values) {
      const key = `${entry.type}:${normalizeDomainText(value)}`;
      index.set(key, [...(index.get(key) ?? []), entry]);
    }
  }

  return index;
}

function resolveObjectiveEvidence(
  evidence: Omit<
    ImportObjectiveEvidence,
    | 'candidateEntityIds'
    | 'canonicalId'
    | 'canonicalName'
    | 'normalizedValue'
    | 'resolution'
  >,
  index: Map<string, ObjectiveEntry[]>,
): ImportObjectiveEvidence {
  const normalizedValue = normalizeDomainText(evidence.originalValue);
  const entries = index.get(`${evidence.type}:${normalizedValue}`) ?? [];

  if (entries.length === 0) {
    return {
      ...evidence,
      candidateEntityIds: [],
      canonicalId: null,
      canonicalName: null,
      normalizedValue,
      resolution: 'unknown',
    };
  }

  if (entries.length > 1) {
    return {
      ...evidence,
      candidateEntityIds: entries.map((entry) => entry.id),
      canonicalId: null,
      canonicalName: null,
      normalizedValue,
      resolution: 'ambiguous',
    };
  }

  const entry = entries[0];
  return {
    ...evidence,
    candidateEntityIds: [entry.id],
    canonicalId: entry.id,
    canonicalName: entry.name,
    normalizedValue,
    resolution:
      normalizedValue === entry.normalizedName ? 'exact' : 'alias',
  };
}

function objectiveIdsForMap(
  catalog: ImportMapReferenceCatalog,
  mapId: string,
  type: ImportObjectiveType,
) {
  return new Set(
    type === 'milestone'
      ? catalog.milestones
          .filter((relationship) => relationship.mapId === mapId)
          .map((relationship) => relationship.milestoneId)
      : catalog.awards
          .filter((relationship) => relationship.mapId === mapId)
          .map((relationship) => relationship.awardId),
  );
}

export function getObjectiveCorrectionOptions(
  catalog: ImportMapReferenceCatalog,
  mapId: string,
  type: ImportObjectiveType,
) {
  const entries = buildObjectiveEntries(catalog);
  const ids = objectiveIdsForMap(catalog, mapId, type);

  return [...ids]
    .map((id) => entries.get(objectiveKey(type, id)))
    .filter((entry): entry is ObjectiveEntry => Boolean(entry))
    .map((entry) => ({ id: entry.id, name: entry.name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function applyImportObjectiveCorrections(input: {
  catalog: ImportMapReferenceCatalog;
  corrections: ImportObjectiveCorrection[];
  evidence: ImportObjectiveEvidence[];
}) {
  const entries = buildObjectiveEntries(input.catalog);
  const correctionByKey = new Map(
    input.corrections.map((correction) => [
      `${correction.source ?? '*'}:${correction.type}:${correction.lineNumber}`,
      correction,
    ]),
  );

  return input.evidence.map((evidence) => {
    const correction =
      correctionByKey.get(
        `${evidence.source}:${evidence.type}:${evidence.lineNumber}`,
      ) ??
      correctionByKey.get(`*:${evidence.type}:${evidence.lineNumber}`);
    if (!correction) {
      return evidence;
    }
    const entry = entries.get(objectiveKey(evidence.type, correction.canonicalId));
    if (!entry) {
      return evidence;
    }

    return {
      ...evidence,
      candidateEntityIds: [entry.id],
      canonicalId: entry.id,
      canonicalName: entry.name,
      resolution: 'corrected' as const,
    };
  });
}

export function detectImportMapFromObjectiveEvidence(
  catalog: ImportMapReferenceCatalog,
  evidence: ImportObjectiveEvidence[],
): ImportMapDetection {
  const recognized = evidence.filter(
    (item) => item.resolution !== 'unknown',
  );
  if (recognized.length === 0) {
    return {
      candidates: [],
      confirmedMapId: null,
      evidence,
      kind: 'unsupported',
      message:
        evidence.length === 0
          ? 'No milestone or award evidence was found in the supplied source.'
          : 'The milestone and award values are not in the approved canonical catalog.',
      selectedMapId: null,
    };
  }

  const eligibleMaps = catalog.maps.filter((map) => {
    if (isRandomizedUnsupportedMap(map)) {
      return false;
    }
    return (
      objectiveIdsForMap(catalog, map.id, 'milestone').size ===
        EXPECTED_FIXED_OBJECTIVE_COUNT &&
      objectiveIdsForMap(catalog, map.id, 'award').size ===
        EXPECTED_FIXED_OBJECTIVE_COUNT
    );
  });

  const candidates = eligibleMaps
    .filter((map) => {
      const milestoneIds = objectiveIdsForMap(catalog, map.id, 'milestone');
      const awardIds = objectiveIdsForMap(catalog, map.id, 'award');
      return recognized.every((item) => {
        const validIds = item.type === 'milestone' ? milestoneIds : awardIds;
        return item.candidateEntityIds.some((id) => validIds.has(id));
      });
    })
    .map((map) => ({
      code: map.code,
      id: map.id,
      matchedAwardCount: recognized.filter(
        (item) =>
          item.type === 'award' &&
          item.candidateEntityIds.some((id) =>
            objectiveIdsForMap(catalog, map.id, 'award').has(id),
          ),
      ).length,
      matchedMilestoneCount: recognized.filter(
        (item) =>
          item.type === 'milestone' &&
          item.candidateEntityIds.some((id) =>
            objectiveIdsForMap(catalog, map.id, 'milestone').has(id),
          ),
      ).length,
      name: map.name,
    }));

  if (candidates.length === 0) {
    return {
      candidates: [],
      confirmedMapId: null,
      evidence,
      kind: 'conflicting',
      message:
        'The resolved milestone and award evidence belongs to conflicting maps.',
      selectedMapId: null,
    };
  }

  if (candidates.length > 1) {
    return {
      candidates,
      confirmedMapId: null,
      evidence,
      kind: 'ambiguous',
      message: 'The objective evidence matches more than one supported map.',
      selectedMapId: null,
    };
  }

  const containsUncertainEvidence = evidence.some(
    (item) => item.resolution === 'ambiguous' || item.resolution === 'unknown',
  );
  if (containsUncertainEvidence || recognized.length < 2) {
    return {
      candidates,
      confirmedMapId: null,
      evidence,
      kind: 'partial',
      message: `${candidates[0].name} is the current candidate, but the evidence requires confirmation.`,
      selectedMapId: null,
    };
  }

  return {
    candidates,
    confirmedMapId: candidates[0].id,
    evidence,
    kind: 'resolved',
    message: `${candidates[0].name} was identified from canonical milestone and award evidence.`,
    selectedMapId: candidates[0].id,
  };
}

function stripExporterPrefix(line: string) {
  return line.replace(/^\s*\[\d+\/\d+\]:\s*/, '').trim();
}

function collectSourceEvidence(
  text: string,
  source: ImportObjectiveEvidence['source'],
  objectiveIndex: Map<string, ObjectiveEntry[]>,
) {
  const objectives: ImportObjectiveEvidence[] = [];
  const players: ImportedPlayerEvidence[] = [];
  const generations: number[] = [];

  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((originalLine, index) => {
    const line = stripExporterPrefix(originalLine);
    const lineNumber = index + 1;
    const generationMatch = /^Generation\s+(\d+)\s*$/i.exec(line);
    if (generationMatch) {
      generations.push(Number(generationMatch[1]));
    }

    const playerMatch = /^Good luck\s+(.+?)!\s*$/i.exec(line);
    if (playerMatch && normalizeDomainText(playerMatch[1]) !== 'you') {
      players.push({
        lineNumber,
        normalizedValue: normalizePlayerAlias(playerMatch[1]),
        originalLine,
        originalValue: playerMatch[1].trim(),
      });
    }

    const milestoneMatch = /^(.+?)\s+claimed\s+(.+?)\s+milestone\s*$/i.exec(
      line,
    );
    if (milestoneMatch) {
      objectives.push(
        resolveObjectiveEvidence(
          {
            lineNumber,
            originalLine,
            normalizedPlayerValue: normalizePlayerAlias(milestoneMatch[1]),
            originalPlayerValue: milestoneMatch[1].trim(),
            originalValue: milestoneMatch[2].trim(),
            source,
            type: 'milestone',
          },
          objectiveIndex,
        ),
      );
    }

    const awardMatch = /^(.+?)\s+funded\s+(.+?)\s+award\s*$/i.exec(line);
    if (awardMatch) {
      objectives.push(
        resolveObjectiveEvidence(
          {
            lineNumber,
            originalLine,
            normalizedPlayerValue: normalizePlayerAlias(awardMatch[1]),
            originalPlayerValue: awardMatch[1].trim(),
            originalValue: awardMatch[2].trim(),
            source,
            type: 'award',
          },
          objectiveIndex,
        ),
      );
    }
  });

  return { generations, objectives, players };
}

function uniquePlayers(players: ImportedPlayerEvidence[]) {
  const byNormalizedValue = new Map<string, ImportedPlayerEvidence>();
  for (const player of players) {
    if (!byNormalizedValue.has(player.normalizedValue)) {
      byNormalizedValue.set(player.normalizedValue, player);
    }
  }
  return [...byNormalizedValue.values()];
}

export function parseTerraformingMarsLog(input: {
  catalog: ImportMapReferenceCatalog;
  exportedLogText: string;
  screenshotOcrText?: string | null;
}): TerraformingMarsLogParseResult {
  const referenceAudit = auditImportMapReferenceCatalog(input.catalog);
  const objectiveIndex = buildObjectiveIndex(input.catalog);
  const logEvidence = collectSourceEvidence(
    input.exportedLogText,
    'exported_log',
    objectiveIndex,
  );
  const screenshotEvidence = collectSourceEvidence(
    input.screenshotOcrText ?? '',
    'screenshot_ocr',
    objectiveIndex,
  );
  const players = uniquePlayers(logEvidence.players);
  const generationCount =
    logEvidence.generations.length > 0
      ? Math.max(...logEvidence.generations)
      : null;
  const objectiveEvidence = [
    ...logEvidence.objectives,
    ...screenshotEvidence.objectives,
  ];
  const map = detectImportMapFromObjectiveEvidence(
    input.catalog,
    objectiveEvidence,
  );
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.exportedLogText.trim()) {
    errors.push('Paste the complete exported game log.');
  }
  if (generationCount === null) {
    errors.push('No generation markers were found in the exported game log.');
  }
  if (players.length === 0) {
    errors.push('No player identities were found in the exported game log.');
  } else if (players.length > 5) {
    errors.push('TM Stats supports at most five imported players.');
  }
  if (referenceAudit.blockingIssues.length > 0) {
    errors.push('The canonical map reference catalog is incomplete or conflicting.');
  }
  if (map.kind !== 'resolved') {
    warnings.push(map.message);
  }
  const unknownObjectives = objectiveEvidence.filter(
    (evidence) => evidence.resolution === 'unknown',
  );
  if (unknownObjectives.length > 0) {
    warnings.push(
      `${unknownObjectives.length} objective value${unknownObjectives.length === 1 ? '' : 's'} remain visible for correction.`,
    );
  }

  return {
    errors,
    generationCount,
    map,
    parserIdentity: TERRAFORMING_MARS_LOG_PARSER_IDENTITY,
    playerCount: players.length > 0 ? players.length : null,
    players,
    referenceAudit,
    sourceFormat: TERRAFORMING_MARS_LOG_SOURCE_FORMAT,
    status:
      errors.length > 0
        ? 'error'
        : map.kind === 'resolved'
          ? 'success'
          : 'partial',
    warnings,
  };
}
