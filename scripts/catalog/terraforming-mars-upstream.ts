import type { NormalizedCardRecord } from '../../src/features/catalog/catalog-record';

export const TERRAFORMING_MARS_CARDS_URL =
  'https://terraforming-mars.herokuapp.com/cards#~trbgpcseCmalt';
export const TERRAFORMING_MARS_SOURCE_ATTRIBUTION =
  'https://terraforming-mars.herokuapp.com/cards';

export type UpstreamCardManifestRecord = {
  compatibility?: unknown;
  cost?: unknown;
  hasAction?: unknown;
  metadata?: {
    cardNumber?: unknown;
    [key: string]: unknown;
  };
  module: string;
  name: string;
  requirements?: unknown;
  tags?: unknown;
  type: string;
  victoryPoints?: unknown;
  [key: string]: unknown;
};

export type UpstreamCardRow = NormalizedCardRecord & {
  gameplay_tags: string[];
  printed_victory_points: number | null;
  required_expansion_codes: string[];
  victory_points_kind: 'dynamic' | 'none' | 'static';
};

const EXPANSION_NAMES: Record<string, string> = {
  ares: 'Ares',
  base: 'Base Game',
  ceo: 'CEOs',
  colonies: 'Colonies',
  community: 'Community',
  corporate_era: 'Corporate Era',
  delta_project: 'Delta Project',
  moon: 'The Moon',
  pathfinders: 'Pathfinders',
  prelude: 'Prelude',
  prelude_2: 'Prelude 2',
  promo: 'Promo',
  star_wars: 'Star Wars',
  turmoil: 'Turmoil',
  underworld: 'Underworld',
  venus_next: 'Venus Next',
};

const TYPE_NAMES: Record<string, string> = {
  active: 'Active',
  automated: 'Automated',
  ceo: 'CEO',
  corporation: 'Corporation',
  event: 'Event',
  prelude: 'Prelude',
  standard_action: 'Standard Action',
  standard_project: 'Standard Project',
};

function normalizeExpansionCode(value: string) {
  const compact = value.trim();
  const aliases: Record<string, string> = {
    corpera: 'corporate_era',
    deltaProject: 'delta_project',
    prelude2: 'prelude_2',
    starwars: 'star_wars',
    venus: 'venus_next',
  };
  return aliases[compact] ?? compact.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string'))].sort();
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sourceCategory(type: string) {
  return ['active', 'automated', 'event'].includes(type) ? 'project' : type;
}

function decodeJavascriptStringLiteral(value: string) {
  let output = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== '\\') {
      output += character;
      continue;
    }

    const escaped = value[index + 1];
    index += 1;
    if (escaped === undefined) throw new Error('Truncated JavaScript string escape.');
    if (escaped === '\n') output += '\n';
    else if (escaped === 'n') output += '\n';
    else if (escaped === 'r') output += '\r';
    else if (escaped === 't') output += '\t';
    else if (escaped === 'b') output += '\b';
    else if (escaped === 'f') output += '\f';
    else if (escaped === 'v') output += '\v';
    else if (escaped === '0') output += '\0';
    else if (escaped === 'x' || escaped === 'u') {
      const width = escaped === 'x' ? 2 : 4;
      const digits = value.slice(index + 1, index + 1 + width);
      if (!new RegExp(`^[0-9a-fA-F]{${width}}$`).test(digits)) {
        throw new Error(`Invalid \\${escaped} escape in upstream bundle.`);
      }
      output += String.fromCharCode(Number.parseInt(digits, 16));
      index += width;
    } else {
      output += escaped;
    }
  }
  return output;
}

function findSingleQuotedArgumentEnd(source: string, start: number) {
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === "'") return index;
  }
  return -1;
}

function isCardManifest(value: unknown): value is UpstreamCardManifestRecord[] {
  return (
    Array.isArray(value) &&
    value.length >= 100 &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).module === 'string' &&
        typeof (item as Record<string, unknown>).name === 'string' &&
        typeof (item as Record<string, unknown>).type === 'string',
    )
  );
}

export function extractCardManifestFromBundle(bundle: string) {
  const marker = "JSON.parse('";
  let cursor = 0;

  while (cursor < bundle.length) {
    const start = bundle.indexOf(marker, cursor);
    if (start === -1) break;
    const contentStart = start + marker.length;
    const end = findSingleQuotedArgumentEnd(bundle, contentStart);
    if (end === -1) break;

    try {
      const parsed: unknown = JSON.parse(
        decodeJavascriptStringLiteral(bundle.slice(contentStart, end)),
      );
      if (isCardManifest(parsed)) return parsed;
    } catch {
      // Other generated JSON payloads are allowed; only the validated card array wins.
    }
    cursor = end + 1;
  }

  return null;
}

export function discoverWebpackChunkUrls(mainJavascript: string, origin: string) {
  const chunkIds = [...mainJavascript.matchAll(/\.e\((\d+)\)/g)].map(
    (match) => match[1],
  );
  return [...new Set(chunkIds)].map(
    (chunkId) => new URL(`/chunks/${chunkId}.js`, origin).href,
  );
}

export function normalizeUpstreamCard(
  card: UpstreamCardManifestRecord,
): UpstreamCardRow {
  const expansionCode = normalizeExpansionCode(card.module);
  const cardNumber =
    typeof card.metadata?.cardNumber === 'string'
      ? card.metadata.cardNumber.trim()
      : '';
  const stableKey =
    card.type === 'standard_action'
      ? `${cardNumber || 'unnumbered'}:${slugify(card.name)}`
      : cardNumber || slugify(card.name);
  const numericVictoryPoints =
    typeof card.victoryPoints === 'number' && Number.isFinite(card.victoryPoints)
      ? card.victoryPoints
      : null;
  const victoryPointsKind =
    card.victoryPoints === undefined
      ? 'none'
      : numericVictoryPoints === null
        ? 'dynamic'
        : 'static';

  return {
    card_name: card.name.trim(),
    card_number: cardNumber,
    card_type: TYPE_NAMES[card.type] ?? card.type,
    expansion_code: expansionCode,
    expansion_name: EXPANSION_NAMES[expansionCode] ?? expansionCode,
    gameplay_tags: normalizeStringList(card.tags),
    image_url: TERRAFORMING_MARS_CARDS_URL,
    printed_victory_points: numericVictoryPoints,
    required_expansion_codes: normalizeStringList(card.compatibility).map(
      normalizeExpansionCode,
    ),
    source_attribution: TERRAFORMING_MARS_SOURCE_ATTRIBUTION,
    source_card_id: `${sourceCategory(card.type)}:${expansionCode}:${stableKey}`,
    sync_metadata: {
      upstream: {
        rawManifest: card,
        source: TERRAFORMING_MARS_SOURCE_ATTRIBUTION,
      },
    },
    victory_points_kind: victoryPointsKind,
  };
}

export async function fetchTerraformingMarsCardManifest(
  fetcher: typeof fetch = fetch,
) {
  const pageResponse = await fetcher(TERRAFORMING_MARS_SOURCE_ATTRIBUTION);
  if (!pageResponse.ok) {
    throw new Error(`Cards page request failed with ${pageResponse.status}.`);
  }
  const page = await pageResponse.text();
  const mainPath = page.match(/<script[^>]+src="([^"]*main\.js)"/)?.[1];
  if (!mainPath) throw new Error('Could not discover main.js from the Cards page.');

  const mainUrl = new URL(mainPath, TERRAFORMING_MARS_SOURCE_ATTRIBUTION).href;
  const mainResponse = await fetcher(mainUrl);
  if (!mainResponse.ok) {
    throw new Error(`Upstream main.js request failed with ${mainResponse.status}.`);
  }
  const chunkUrls = discoverWebpackChunkUrls(
    await mainResponse.text(),
    TERRAFORMING_MARS_SOURCE_ATTRIBUTION,
  );
  if (chunkUrls.length === 0) throw new Error('No upstream webpack chunks discovered.');

  const candidates = await Promise.all(
    chunkUrls.map(async (url) => {
      const response = await fetcher(url);
      if (!response.ok) return null;
      return extractCardManifestFromBundle(await response.text());
    }),
  );
  const manifest = candidates.find((candidate) => candidate !== null) ?? null;
  if (!manifest) throw new Error('No validated upstream card manifest was found.');

  const normalized = manifest.map(normalizeUpstreamCard);
  if (new Set(normalized.map((card) => card.source_card_id)).size !== normalized.length) {
    throw new Error('The upstream manifest produced duplicate stable card identities.');
  }
  return manifest;
}
