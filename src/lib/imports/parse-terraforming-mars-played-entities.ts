import type { ImportGameReferenceCatalog } from '@/lib/db/reference-repo';
import { normalizeDomainText } from '@/lib/ocr/domain-matcher';
import { normalizePlayerAlias } from './normalize-player-alias';

export type ImportPlayedEntityType = 'card' | 'corporation' | 'prelude';

export type ImportPlayedEntityEvidence = {
  candidateEntityIds: string[];
  canonicalId: string | null;
  canonicalName: string | null;
  entityType: ImportPlayedEntityType | null;
  lineNumber: number;
  normalizedPlayerValue: string;
  normalizedValue: string;
  originalLine: string;
  originalPlayerValue: string;
  originalValue: string;
  promoSetSlug: string | null;
  resolution: 'alias' | 'ambiguous' | 'corrected' | 'exact' | 'unknown';
};

export type ImportPlayedEntityCorrection = {
  canonicalId: string;
  entityType: ImportPlayedEntityType;
  lineNumber: number;
};

export type TerraformingMarsPlayedEntityParseResult = {
  errors: string[];
  evidence: ImportPlayedEntityEvidence[];
  promoSetSlugs: string[];
  status: 'error' | 'partial' | 'success';
  warnings: string[];
};

type EntityEntry = {
  aliases: string[];
  id: string;
  name: string;
  normalizedName: string;
  promoSetSlug: string | null;
  type: ImportPlayedEntityType;
};

function stripExporterPrefix(line: string) {
  return line.replace(/^\s*\[\d+\/\d+\]:\s*/, '').trim();
}

function buildEntries(catalog: ImportGameReferenceCatalog) {
  const entries: EntityEntry[] = [
    ...catalog.corporations.map((corporation) => ({
      aliases: catalog.entityAliases
        .filter(
          (alias) =>
            alias.entityType === 'corporation' &&
            alias.entityId === corporation.id,
        )
        .map((alias) => alias.aliasText),
      id: corporation.id,
      name: corporation.name,
      normalizedName: normalizeDomainText(corporation.name),
      promoSetSlug: corporation.promoSetSlug,
      type: 'corporation' as const,
    })),
    ...catalog.preludes.map((prelude) => ({
      aliases: [],
      id: prelude.id,
      name: prelude.name,
      normalizedName: normalizeDomainText(prelude.name),
      promoSetSlug: null,
      type: 'prelude' as const,
    })),
    ...catalog.cards.map((card) => ({
      aliases: catalog.entityAliases
        .filter(
          (alias) => alias.entityType === 'card' && alias.entityId === card.id,
        )
        .map((alias) => alias.aliasText),
      id: card.id,
      name: card.cardName,
      normalizedName: normalizeDomainText(card.cardName),
      promoSetSlug: card.promoSetSlug,
      type: 'card' as const,
    })),
  ];
  const index = new Map<string, Array<{ entry: EntityEntry; method: 'alias' | 'exact' }>>();

  for (const entry of entries) {
    index.set(entry.normalizedName, [
      ...(index.get(entry.normalizedName) ?? []),
      { entry, method: 'exact' },
    ]);
    for (const alias of entry.aliases) {
      const normalized = normalizeDomainText(alias);
      index.set(normalized, [
        ...(index.get(normalized) ?? []),
        { entry, method: 'alias' },
      ]);
    }
  }

  return index;
}

function resolveEvidence(input: {
  index: ReturnType<typeof buildEntries>;
  lineNumber: number;
  originalLine: string;
  originalPlayerValue: string;
  originalValue: string;
}): ImportPlayedEntityEvidence {
  const normalizedValue = normalizeDomainText(input.originalValue);
  const matches = input.index.get(normalizedValue) ?? [];
  const uniqueMatches = [
    ...new Map(matches.map((match) => [`${match.entry.type}:${match.entry.id}`, match])).values(),
  ];
  const base = {
    lineNumber: input.lineNumber,
    normalizedPlayerValue: normalizePlayerAlias(input.originalPlayerValue),
    normalizedValue,
    originalLine: input.originalLine,
    originalPlayerValue: input.originalPlayerValue,
    originalValue: input.originalValue,
  };

  if (uniqueMatches.length === 0) {
    return {
      ...base,
      candidateEntityIds: [],
      canonicalId: null,
      canonicalName: null,
      entityType: null,
      promoSetSlug: null,
      resolution: 'unknown',
    };
  }
  if (uniqueMatches.length > 1) {
    return {
      ...base,
      candidateEntityIds: uniqueMatches.map((match) => match.entry.id),
      canonicalId: null,
      canonicalName: null,
      entityType: null,
      promoSetSlug: null,
      resolution: 'ambiguous',
    };
  }

  const match = uniqueMatches[0];
  return {
    ...base,
    candidateEntityIds: [match.entry.id],
    canonicalId: match.entry.id,
    canonicalName: match.entry.name,
    entityType: match.entry.type,
    promoSetSlug: match.entry.promoSetSlug,
    resolution: match.method,
  };
}

export function parseTerraformingMarsPlayedEntities(input: {
  catalog: ImportGameReferenceCatalog;
  exportedLogText: string;
}): TerraformingMarsPlayedEntityParseResult {
  const entityIndex = buildEntries(input.catalog);
  const evidence = input.exportedLogText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .flatMap((originalLine, lineIndex) => {
      const line = stripExporterPrefix(originalLine);
      const match = /^(.+?)\s+played\s+(.+?)\s*$/i.exec(line);
      return match
        ? [
            resolveEvidence({
              index: entityIndex,
              lineNumber: lineIndex + 1,
              originalLine,
              originalPlayerValue: match[1].trim(),
              originalValue: match[2].trim(),
            }),
          ]
        : [];
    });
  const errors: string[] = [];
  const warnings: string[] = [];
  const corporationCountByPlayer = new Map<string, number>();

  for (const item of evidence.filter(
    (candidate) => candidate.entityType === 'corporation',
  )) {
    corporationCountByPlayer.set(
      item.normalizedPlayerValue,
      (corporationCountByPlayer.get(item.normalizedPlayerValue) ?? 0) + 1,
    );
  }
  for (const [player, count] of corporationCountByPlayer) {
    if (count > 1) {
      errors.push(`${player} has more than one resolved corporation in the exported log.`);
    }
  }

  const unresolvedCount = evidence.filter(
    (item) => item.resolution === 'unknown',
  ).length;
  const ambiguousCount = evidence.filter(
    (item) => item.resolution === 'ambiguous',
  ).length;
  if (unresolvedCount > 0) {
    warnings.push(`${unresolvedCount} played value${unresolvedCount === 1 ? '' : 's'} remain visible for correction.`);
  }
  if (ambiguousCount > 0) {
    warnings.push(`${ambiguousCount} played value${ambiguousCount === 1 ? '' : 's'} match more than one canonical entity.`);
  }

  return {
    errors,
    evidence,
    promoSetSlugs: [
      ...new Set(
        evidence
          .map((item) => item.promoSetSlug)
          .filter((slug): slug is string => Boolean(slug)),
      ),
    ].sort(),
    status:
      errors.length > 0
        ? 'error'
        : warnings.length > 0
          ? 'partial'
          : 'success',
    warnings,
  };
}

export function applyImportPlayedEntityCorrections(input: {
  catalog: ImportGameReferenceCatalog;
  corrections: ImportPlayedEntityCorrection[];
  evidence: ImportPlayedEntityEvidence[];
}) {
  const correctionByLine = new Map(
    input.corrections.map((correction) => [correction.lineNumber, correction]),
  );

  return input.evidence.map((evidence) => {
    const correction = correctionByLine.get(evidence.lineNumber);
    if (!correction) {
      return evidence;
    }
    const entity =
      correction.entityType === 'corporation'
        ? input.catalog.corporations.find(
            (candidate) => candidate.id === correction.canonicalId,
          )
        : correction.entityType === 'prelude'
          ? input.catalog.preludes.find(
              (candidate) => candidate.id === correction.canonicalId,
            )
          : input.catalog.cards.find(
              (candidate) => candidate.id === correction.canonicalId,
            );
    if (!entity) {
      return evidence;
    }

    return {
      ...evidence,
      candidateEntityIds: [correction.canonicalId],
      canonicalId: correction.canonicalId,
      canonicalName:
        'cardName' in entity ? entity.cardName : entity.name,
      entityType: correction.entityType,
      promoSetSlug: 'promoSetSlug' in entity ? entity.promoSetSlug : null,
      resolution: 'corrected' as const,
    };
  });
}
