import {
  glossaryTerms,
  type GlossaryTerm,
} from './glossary-data';

export type GlossaryTermDefinition = {
  entrySlug: string;
  canonicalTerm: string;
  aliases: readonly string[];
};

export type GlossaryRegistryIssueCode =
  | 'ambiguous-alias'
  | 'duplicate-alias'
  | 'duplicate-slug'
  | 'empty-alias'
  | 'missing-entry';

export type GlossaryRegistryIssue = {
  code: GlossaryRegistryIssueCode;
  label?: string;
  slugs: readonly string[];
};

export type GlossaryLinkTarget = {
  slug: string;
  canonicalTerm: string;
  label: string;
  normalizedLabel: string;
};

export type GlossaryTermRegistry = {
  definitions: readonly GlossaryTermDefinition[];
  issues: readonly GlossaryRegistryIssue[];
  targets: readonly GlossaryLinkTarget[];
};

function normalizeLabel(label: string) {
  return label.trim().toLocaleLowerCase();
}

function toDefinition(term: GlossaryTerm): GlossaryTermDefinition {
  return {
    entrySlug: term.slug,
    canonicalTerm: term.term,
    aliases: term.aliases,
  };
}

export function createGlossaryTermRegistry(input: {
  definitions: readonly GlossaryTermDefinition[];
  knownEntrySlugs: readonly string[];
}): GlossaryTermRegistry {
  const issues: GlossaryRegistryIssue[] = [];
  const knownEntrySlugs = new Set(input.knownEntrySlugs);
  const slugDefinitions = new Map<string, GlossaryTermDefinition[]>();

  for (const definition of input.definitions) {
    const existing = slugDefinitions.get(definition.entrySlug) ?? [];
    existing.push(definition);
    slugDefinitions.set(definition.entrySlug, existing);
  }

  for (const [slug, definitions] of slugDefinitions) {
    if (definitions.length > 1) {
      issues.push({ code: 'duplicate-slug', slugs: [slug] });
    }
    if (!knownEntrySlugs.has(slug)) {
      issues.push({ code: 'missing-entry', slugs: [slug] });
    }
  }

  const labels = new Map<string, Array<GlossaryLinkTarget>>();
  for (const definition of input.definitions) {
    if (!knownEntrySlugs.has(definition.entrySlug)) {
      continue;
    }

    const labelsForDefinition = [
      { label: definition.canonicalTerm, isAlias: false },
      ...definition.aliases.map((label) => ({ label, isAlias: true })),
    ];

    for (const candidate of labelsForDefinition) {
      const normalizedLabel = normalizeLabel(candidate.label);
      if (!normalizedLabel) {
        if (candidate.isAlias) {
          issues.push({
            code: 'empty-alias',
            label: candidate.label,
            slugs: [definition.entrySlug],
          });
        }
        continue;
      }

      const target: GlossaryLinkTarget = {
        slug: definition.entrySlug,
        canonicalTerm: definition.canonicalTerm,
        label: candidate.label.trim(),
        normalizedLabel,
      };
      const existing = labels.get(normalizedLabel) ?? [];
      existing.push(target);
      labels.set(normalizedLabel, existing);
    }
  }

  const targets: GlossaryLinkTarget[] = [];
  for (const [label, candidates] of labels) {
    const slugs = [...new Set(candidates.map((candidate) => candidate.slug))].sort();
    if (slugs.length > 1) {
      issues.push({ code: 'ambiguous-alias', label, slugs });
      continue;
    }
    if (candidates.length > 1) {
      issues.push({ code: 'duplicate-alias', label, slugs });
    }
    targets.push(candidates.find((candidate) => candidate.label === candidates[0]?.canonicalTerm) ?? candidates[0]);
  }

  return {
    definitions: input.definitions,
    issues: issues.sort(
      (left, right) =>
        left.code.localeCompare(right.code) ||
        (left.label ?? '').localeCompare(right.label ?? '') ||
        left.slugs.join(',').localeCompare(right.slugs.join(',')),
    ),
    targets: targets.sort(
      (left, right) =>
        right.label.length - left.label.length ||
        left.normalizedLabel.localeCompare(right.normalizedLabel) ||
        left.slug.localeCompare(right.slug),
    ),
  };
}

export const glossaryTermRegistry = createGlossaryTermRegistry({
  definitions: glossaryTerms.map(toDefinition),
  knownEntrySlugs: glossaryTerms.map((term) => term.slug),
});
