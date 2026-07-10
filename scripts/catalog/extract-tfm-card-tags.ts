/**
 * Reads the card database out of the Terraforming Mars open-source web app,
 * which is the source of truth for cards, tags, corporations and preludes.
 *
 * The app used to inline every card definition into `main.js`, and this module
 * walked that bundle's AST. It has since been code-split: `main.js` now carries
 * only the CardName enum and the webpack chunk map, while the card manifest
 * lives in a lazily loaded chunk as a single `JSON.parse('[...]')` literal.
 * Parsing that literal is both simpler and exact.
 */

export const TFM_CARDS_BASE_URL = 'https://terraforming-mars.herokuapp.com';
export const TFM_CARDS_PAGE_URL = `${TFM_CARDS_BASE_URL}/cards#bio~trbgpcseCmalt`;
export const TFM_CARDS_SOURCE_URL = `${TFM_CARDS_BASE_URL}/main.js`;
export const TFM_CARD_TAGS_SNAPSHOT_PATH =
  'scripts/catalog/source/tfm-card-tags.json';

/**
 * The upstream manifest holds ~1000 cards. A refresh that yields far fewer has
 * not found the manifest, and must fail rather than overwrite the snapshot.
 */
export const MIN_EXPECTED_CARD_RECORDS = 700;
const REQUIRED_CATEGORIES = [
  'corporationCards',
  'preludeCards',
  'projectCards',
] as const;
const MIN_EXPECTED_BY_CATEGORY: Record<
  (typeof REQUIRED_CATEGORIES)[number],
  number
> = {
  corporationCards: 60,
  preludeCards: 50,
  projectCards: 500,
};

export type TfmCardTagRecord = {
  cardNumber: string | null;
  name: string;
  nameKey: string;
  cardType: string | null;
  tags: string[];
  module: string | null;
  category: string | null;
  victoryPoints: TfmCardVictoryPoints;
};

export type TfmCardVictoryPoints =
  | { kind: 'none' }
  | { kind: 'static'; points: number }
  | { kind: 'dynamic' };

// Catalog names that differ from the open-source project's spelling.
export const CATALOG_NAME_ALIASES: Record<string, string> = {
  'allied bank': 'allied banks',
  'designed microorganisms': 'designed micro organisms',
  'refugee camps': 'refugee camp',
};

/** Upstream module ids mapped onto the labels the catalog already stores. */
const MODULE_LABELS: Record<string, string> = {
  ares: 'Ares',
  base: 'Base',
  ceo: 'CEO',
  colonies: 'Colonies',
  community: 'Community',
  corpera: 'Corp Era',
  deltaProject: 'Delta Project',
  moon: 'Moon',
  pathfinders: 'Pathfinders',
  prelude: 'Prelude',
  prelude2: 'Prelude 2',
  promo: 'Promo',
  starwars: 'Star Wars',
  turmoil: 'Turmoil',
  underworld: 'Underworld',
  venus: 'Venus',
};

/** Upstream card types mapped onto the catalog's manifest categories. */
const CATEGORY_BY_TYPE: Record<string, string> = {
  ceo: 'ceoCards',
  corporation: 'corporationCards',
  prelude: 'preludeCards',
  standard_action: 'standardActions',
  standard_project: 'standardProjects',
};
const CARD_TYPE_OVERRIDES: Record<string, string> = {
  ceo: 'leader',
};

export function normalizeCardName(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

type ManifestCard = {
  metadata?: { cardNumber?: unknown };
  module?: unknown;
  name?: unknown;
  tags?: unknown;
  type?: unknown;
  victoryPoints?: unknown;
};

/**
 * `main.js` declares the CardName enum as `e.BIO_SOL="Bio-Sol"`. The manifest
 * only carries display names, so the enum supplies the stable key the catalog
 * diffs against.
 */
export function extractCardNameKeys(mainSource: string) {
  const nameKeysByName = new Map<string, string>();
  const pattern = /\.([A-Z][A-Z0-9_]*)\s*=\s*"((?:[^"\\]|\\.)*)"/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(mainSource))) {
    const name = match[2].replace(/\\(.)/g, '$1');

    if (name && !nameKeysByName.has(name)) {
      nameKeysByName.set(name, match[1]);
    }
  }

  return nameKeysByName;
}

/**
 * Recovers the chunk file names the runtime can request, from the webpack
 * filename helper `r.u=e=>"chunks/"+({22:"help",…}[e]||e)+".js"` plus the
 * numeric chunk ids referenced by `r.e(<id>)`.
 */
export function extractChunkNames(mainSource: string) {
  const nameById = new Map<string, string>();
  const namedMap = /\.u\s*=\s*\w+\s*=>\s*"chunks\/"\s*\+\s*\(\{([^}]*)\}/.exec(
    mainSource,
  );

  if (namedMap) {
    for (const entry of namedMap[1].matchAll(/(\d+)\s*:\s*"([^"]+)"/g)) {
      nameById.set(entry[1], entry[2]);
    }
  }

  const names = new Set<string>();

  // The runtime resolves a chunk id through that map, falling back to the id
  // itself. The manifest lives in a chunk that has no name.
  for (const entry of mainSource.matchAll(/\.e\((\d{1,5})\)/g)) {
    names.add(nameById.get(entry[1]) ?? entry[1]);
  }

  return [...names];
}

function readVictoryPoints(value: unknown): TfmCardVictoryPoints {
  if (typeof value === 'number') {
    return { kind: 'static', points: value };
  }

  if (value === undefined || value === null) {
    return { kind: 'none' };
  }

  // "special" and the resource-scaling objects both mean the printed value is
  // not a fixed number.
  return { kind: 'dynamic' };
}

function readTags(value: unknown) {
  return Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === 'string')
    : [];
}

/**
 * Pulls the manifest out of a chunk. Returns an empty list when the chunk does
 * not contain one, so callers can probe several chunks.
 */
export function extractTfmCardManifest(input: {
  chunkSource: string;
  nameKeysByName: Map<string, string>;
}): TfmCardTagRecord[] {
  const pattern = /JSON\.parse\('((?:[^'\\]|\\.)*)'\)/g;
  const records: TfmCardTagRecord[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input.chunkSource))) {
    // Undo the JavaScript string escaping so JSON.parse sees the original text.
    const source = match[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    let parsed: unknown;

    try {
      parsed = JSON.parse(source);
    } catch {
      continue;
    }

    if (!Array.isArray(parsed)) {
      continue;
    }

    for (const entry of parsed as ManifestCard[]) {
      // Other chunks embed milestones, awards, colonies and global events the
      // same way. Only cards carry a `type`, which keeps them out.
      if (
        !entry ||
        typeof entry.name !== 'string' ||
        !entry.name ||
        typeof entry.type !== 'string' ||
        !entry.type
      ) {
        continue;
      }

      const type = entry.type;
      const moduleId = typeof entry.module === 'string' ? entry.module : null;
      const cardNumber =
        typeof entry.metadata?.cardNumber === 'string'
          ? entry.metadata.cardNumber
          : null;

      records.push({
        cardNumber,
        cardType: CARD_TYPE_OVERRIDES[type] ?? type,
        category: CATEGORY_BY_TYPE[type] ?? 'projectCards',
        module: moduleId ? (MODULE_LABELS[moduleId] ?? moduleId) : null,
        name: entry.name,
        nameKey: input.nameKeysByName.get(entry.name) ?? '',
        tags: readTags(entry.tags),
        victoryPoints: readVictoryPoints(entry.victoryPoints),
      });
    }
  }

  return records;
}

/**
 * Guards the snapshot against a silently truncated refresh. The extractor
 * previously read a bundle that no longer held the manifest, produced three
 * cards and exited successfully, which would have wiped the card catalog.
 */
export function assertUsableTfmCardRecords(records: TfmCardTagRecord[]) {
  if (records.length < MIN_EXPECTED_CARD_RECORDS) {
    throw new Error(
      `Extracted only ${records.length} Terraforming Mars cards, expected at least ${MIN_EXPECTED_CARD_RECORDS}. The upstream bundle layout has probably changed; refusing to overwrite the snapshot.`,
    );
  }

  for (const category of REQUIRED_CATEGORIES) {
    const count = records.filter(
      (record) => record.category === category,
    ).length;

    if (count < MIN_EXPECTED_BY_CATEGORY[category]) {
      throw new Error(
        `Extracted only ${count} ${category}, expected at least ${MIN_EXPECTED_BY_CATEGORY[category]}. Refusing to overwrite the snapshot.`,
      );
    }
  }

  const missingNameKeys = records.filter((record) => !record.nameKey).length;

  if (missingNameKeys > records.length / 2) {
    throw new Error(
      `Could not resolve a CardName key for ${missingNameKeys} of ${records.length} cards. The CardName enum was not found in the bundle entry point.`,
    );
  }

  return records;
}

async function fetchText(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

/**
 * Merges manifest records from several chunks, keeping the first definition of
 * each card. The upstream bundle spreads the manifest across chunks -- the bulk
 * of the cards in one, with expansion modules and the create-game screen's own
 * copy in others -- so every chunk has to be read, not just the largest.
 */
export function mergeTfmCardRecords(recordGroups: TfmCardTagRecord[][]) {
  const recordsByName = new Map<string, TfmCardTagRecord>();

  for (const records of recordGroups) {
    for (const record of records) {
      if (!recordsByName.has(record.name)) {
        recordsByName.set(record.name, record);
      }
    }
  }

  return [...recordsByName.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

/**
 * Fetches the entry point, then reads the card manifest out of every chunk it
 * references. Throws when the result looks truncated, rather than returning a
 * partial list that would overwrite the snapshot.
 */
export async function fetchTfmCardRecords(): Promise<TfmCardTagRecord[]> {
  const mainSource = await fetchText(TFM_CARDS_SOURCE_URL);
  const nameKeysByName = extractCardNameKeys(mainSource);
  const chunkNames = extractChunkNames(mainSource);
  const recordGroups: TfmCardTagRecord[][] = [];

  for (const chunkName of chunkNames) {
    let chunkSource: string;

    try {
      chunkSource = await fetchText(
        `${TFM_CARDS_BASE_URL}/chunks/${chunkName}.js`,
      );
    } catch {
      // Not every referenced chunk is served; skip the ones that 404 or 500.
      continue;
    }

    const records = extractTfmCardManifest({ chunkSource, nameKeysByName });

    if (records.length > 0) {
      recordGroups.push(records);
    }
  }

  if (recordGroups.length === 0) {
    throw new Error(
      `Could not find the card manifest in any of the ${chunkNames.length} chunks referenced by ${TFM_CARDS_SOURCE_URL}. The upstream bundle layout has changed.`,
    );
  }

  return assertUsableTfmCardRecords(mergeTfmCardRecords(recordGroups));
}
