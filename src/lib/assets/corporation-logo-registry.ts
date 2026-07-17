/**
 * Pure corporation-logo registry validation.
 *
 * Database identity is always `corporations.id`, independently checked against
 * `corporations.code`. Display names, filenames, object paths, and public URLs
 * are metadata only and can never select a corporation.
 */

export type CorporationLogoRegistryEntry = {
  corporationId: string;
  corporationCode: string;
  displayName: string;
  expansionCode: string;
  logoPath: string | null;
};

export type CorporationLogoRegistryIssue =
  | {
      kind: 'duplicate-code';
      corporationCode: string;
      corporationIds: readonly string[];
    }
  | {
      kind: 'duplicate-id';
      corporationId: string;
      corporationCodes: readonly string[];
    }
  | {
      kind: 'invalid-code';
      rowIndex: number;
    }
  | {
      kind: 'invalid-id';
      rowIndex: number;
    };

export type CorporationLogoRegistry = {
  entries: readonly CorporationLogoRegistryEntry[];
  issues: readonly CorporationLogoRegistryIssue[];
};

export type CorporationLogoStableIdentity = {
  corporationId?: string | null;
  corporationCode?: string | null;
};

export type CorporationLogoLookupResult =
  | {
      status: 'matched';
      entry: CorporationLogoRegistryEntry;
    }
  | {
      status: 'ambiguous';
      reason: 'id-code-conflict' | 'registry-duplicate';
    }
  | {
      status: 'invalid-identity';
      reason: 'missing-stable-identity';
    }
  | {
      status: 'unmatched';
      reason: 'unknown-code' | 'unknown-id';
    };

export type SharedCorporationLogoPath = {
  logoPath: string;
  corporations: readonly CorporationLogoRegistryEntry[];
};

export const corporationLogoMappingClassifications = [
  'exact verified match',
  'corporation without replacement image',
  'replacement image without corporation',
  'ambiguous match',
  'multiple replacement images for one corporation',
  'replacement image proposed for multiple corporations',
  'shared current path requiring verification',
  'current registry path missing object',
  'Storage object without active registry mapping',
  'superseded object eligible for later deletion',
  'unrelated object outside scope',
] as const;

export type CorporationLogoMappingClassification =
  (typeof corporationLogoMappingClassifications)[number];

export type CorporationLogoRemapProposal = {
  corporationId: string;
  corporationCode: string;
  sourceSha256: string;
  proposedLogoPath: string;
  classification: CorporationLogoMappingClassification;
  sharedPathStatus: 'not-shared' | 'verified-intentional';
};

export type CorporationLogoRemapIssue =
  | {
      kind: 'ambiguous-or-unverified-classification';
      corporationId: string;
      classification: CorporationLogoMappingClassification;
    }
  | {
      kind: 'duplicate-corporation-target';
      corporationId: string;
    }
  | {
      kind: 'identity-conflict';
      corporationId: string;
      corporationCode: string;
    }
  | {
      kind: 'replacement-proposed-for-multiple-corporations';
      sourceSha256: string;
      corporationIds: readonly string[];
    }
  | {
      kind: 'unknown-corporation';
      corporationId: string;
      corporationCode: string;
    };

export type CorporationLogoRemapValidation = {
  accepted: readonly CorporationLogoRemapProposal[];
  issues: readonly CorporationLogoRemapIssue[];
};

function stableValue(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function createCorporationLogoRegistry(
  rows: readonly CorporationLogoRegistryEntry[],
): CorporationLogoRegistry {
  const validEntries: CorporationLogoRegistryEntry[] = [];
  const issues: CorporationLogoRegistryIssue[] = [];

  rows.forEach((row, rowIndex) => {
    const corporationId = stableValue(row.corporationId);
    const corporationCode = stableValue(row.corporationCode);
    if (!corporationId) {
      issues.push({ kind: 'invalid-id', rowIndex });
    }
    if (!corporationCode) {
      issues.push({ kind: 'invalid-code', rowIndex });
    }
    if (!corporationId || !corporationCode) {
      return;
    }
    validEntries.push({
      ...row,
      corporationCode,
      corporationId,
      displayName: row.displayName.trim(),
      expansionCode: row.expansionCode.trim(),
      logoPath: stableValue(row.logoPath),
    });
  });

  const byId = new Map<string, CorporationLogoRegistryEntry[]>();
  const byCode = new Map<string, CorporationLogoRegistryEntry[]>();
  for (const entry of validEntries) {
    byId.set(entry.corporationId, [...(byId.get(entry.corporationId) ?? []), entry]);
    byCode.set(entry.corporationCode, [
      ...(byCode.get(entry.corporationCode) ?? []),
      entry,
    ]);
  }

  for (const [corporationId, entries] of byId) {
    if (entries.length > 1) {
      issues.push({
        kind: 'duplicate-id',
        corporationCodes: sortedUnique(entries.map((entry) => entry.corporationCode)),
        corporationId,
      });
    }
  }
  for (const [corporationCode, entries] of byCode) {
    if (entries.length > 1) {
      issues.push({
        kind: 'duplicate-code',
        corporationCode,
        corporationIds: sortedUnique(entries.map((entry) => entry.corporationId)),
      });
    }
  }

  return {
    entries: [...validEntries].sort(
      (left, right) =>
        left.corporationCode.localeCompare(right.corporationCode) ||
        left.corporationId.localeCompare(right.corporationId),
    ),
    issues,
  };
}

export function resolveCorporationLogoRegistryEntry(
  registry: CorporationLogoRegistry,
  identity: CorporationLogoStableIdentity,
): CorporationLogoLookupResult {
  const corporationId = stableValue(identity.corporationId);
  const corporationCode = stableValue(identity.corporationCode);
  if (!corporationId && !corporationCode) {
    return {
      reason: 'missing-stable-identity',
      status: 'invalid-identity',
    };
  }

  const idMatches = corporationId
    ? registry.entries.filter((entry) => entry.corporationId === corporationId)
    : [];
  const codeMatches = corporationCode
    ? registry.entries.filter((entry) => entry.corporationCode === corporationCode)
    : [];

  if (idMatches.length > 1 || codeMatches.length > 1) {
    return { reason: 'registry-duplicate', status: 'ambiguous' };
  }
  if (corporationId && idMatches.length === 0) {
    return { reason: 'unknown-id', status: 'unmatched' };
  }
  if (corporationCode && codeMatches.length === 0) {
    return { reason: 'unknown-code', status: 'unmatched' };
  }
  if (
    idMatches[0] &&
    codeMatches[0] &&
    idMatches[0].corporationId !== codeMatches[0].corporationId
  ) {
    return { reason: 'id-code-conflict', status: 'ambiguous' };
  }

  return { entry: idMatches[0] ?? codeMatches[0]!, status: 'matched' };
}

export function findSharedCorporationLogoPaths(
  registry: CorporationLogoRegistry,
): readonly SharedCorporationLogoPath[] {
  const byPath = new Map<string, CorporationLogoRegistryEntry[]>();
  for (const entry of registry.entries) {
    if (!entry.logoPath) {
      continue;
    }
    byPath.set(entry.logoPath, [...(byPath.get(entry.logoPath) ?? []), entry]);
  }

  return [...byPath.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([logoPath, entries]) => ({
      corporations: [...entries].sort((left, right) =>
        left.corporationCode.localeCompare(right.corporationCode),
      ),
      logoPath,
    }))
    .sort((left, right) => left.logoPath.localeCompare(right.logoPath));
}

export function validateCorporationLogoRemaps(
  registry: CorporationLogoRegistry,
  proposals: readonly CorporationLogoRemapProposal[],
): CorporationLogoRemapValidation {
  const accepted: CorporationLogoRemapProposal[] = [];
  const issues: CorporationLogoRemapIssue[] = [];
  const byCorporationId = new Map<string, CorporationLogoRemapProposal[]>();
  const bySourceSha = new Map<string, CorporationLogoRemapProposal[]>();

  for (const proposal of proposals) {
    const lookup = resolveCorporationLogoRegistryEntry(registry, {
      corporationCode: proposal.corporationCode,
      corporationId: proposal.corporationId,
    });
    if (lookup.status === 'unmatched') {
      issues.push({
        corporationCode: proposal.corporationCode,
        corporationId: proposal.corporationId,
        kind: 'unknown-corporation',
      });
      continue;
    }
    if (lookup.status !== 'matched') {
      issues.push({
        corporationCode: proposal.corporationCode,
        corporationId: proposal.corporationId,
        kind: 'identity-conflict',
      });
      continue;
    }
    if (proposal.classification !== 'exact verified match') {
      issues.push({
        classification: proposal.classification,
        corporationId: proposal.corporationId,
        kind: 'ambiguous-or-unverified-classification',
      });
      continue;
    }

    accepted.push(proposal);
    byCorporationId.set(proposal.corporationId, [
      ...(byCorporationId.get(proposal.corporationId) ?? []),
      proposal,
    ]);
    bySourceSha.set(proposal.sourceSha256, [
      ...(bySourceSha.get(proposal.sourceSha256) ?? []),
      proposal,
    ]);
  }

  for (const [corporationId, matches] of byCorporationId) {
    if (matches.length > 1) {
      issues.push({ kind: 'duplicate-corporation-target', corporationId });
    }
  }

  for (const [sourceSha256, matches] of bySourceSha) {
    if (matches.length < 2) {
      continue;
    }
    const registryEntries = matches
      .map((match) =>
        registry.entries.find(
          (entry) => entry.corporationId === match.corporationId,
        ),
      )
      .filter((entry): entry is CorporationLogoRegistryEntry => Boolean(entry));
    const currentPaths = new Set(registryEntries.map((entry) => entry.logoPath));
    const verifiedIntentional = matches.every(
      (match) => match.sharedPathStatus === 'verified-intentional',
    );
    if (!verifiedIntentional || currentPaths.size !== 1 || currentPaths.has(null)) {
      issues.push({
        corporationIds: sortedUnique(matches.map((match) => match.corporationId)),
        kind: 'replacement-proposed-for-multiple-corporations',
        sourceSha256,
      });
    }
  }

  const rejectedIds = new Set(
    issues.flatMap((issue) => {
      if ('corporationId' in issue) return [issue.corporationId];
      if ('corporationIds' in issue) return issue.corporationIds;
      return [];
    }),
  );

  return {
    accepted: accepted.filter((proposal) => !rejectedIds.has(proposal.corporationId)),
    issues,
  };
}
