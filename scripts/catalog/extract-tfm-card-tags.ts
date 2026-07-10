import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

export const TFM_CARDS_PAGE_URL =
  'https://terraforming-mars.herokuapp.com/cards#bio~trbgpcseCmalt';
export const TFM_CARDS_SOURCE_URL =
  'https://terraforming-mars.herokuapp.com/main.js';
export const TFM_CARD_TAGS_SNAPSHOT_PATH =
  'scripts/catalog/source/tfm-card-tags.json';

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

type AnyNode = acorn.Node & Record<string, any>;

const MANIFEST_CATEGORIES = [
  'projectCards',
  'corporationCards',
  'preludeCards',
  'ceoCards',
  'standardProjects',
  'standardActions',
  'globalEvents',
] as const;

// Cards the bundle parser cannot reach because their name flows through a
// shared base-class constructor instead of an object literal or default
// parameter. Tags here mirror the printed cards.
export const KNOWN_TAG_FIXUPS: Record<string, string[]> = {
  'Mining Area': ['building'],
  'Mining Rights': ['building'],
  'Pharmacy Union': ['microbe', 'microbe'],
};

// Catalog names that differ from the open-source project's spelling.
export const CATALOG_NAME_ALIASES: Record<string, string> = {
  'allied bank': 'allied banks',
  'designed microorganisms': 'designed micro organisms',
  'refugee camps': 'refugee camp',
};

export function normalizeCardName(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function mentionsEnum(node: AnyNode, enumName: string) {
  let found = false;
  walk.simple(node, {
    MemberExpression(member: AnyNode) {
      if (member.property.type === 'Identifier' && member.property.name === enumName) {
        found = true;
      }
    },
  });
  return found;
}

function collectAssignments(
  scopeNode: AnyNode,
  varName: string,
  map: Record<string, string>,
) {
  walk.simple(scopeNode, {
    AssignmentExpression(assignment: AnyNode) {
      if (
        assignment.left.type === 'MemberExpression' &&
        assignment.left.object.type === 'Identifier' &&
        assignment.left.object.name === varName &&
        assignment.left.property.type === 'Identifier' &&
        assignment.right.type === 'Literal' &&
        typeof assignment.right.value === 'string'
      ) {
        map[assignment.left.property.name] = assignment.right.value;
      }
    },
  });
}

// TypeScript enums appear in two minified shapes:
//   A) !function(e){e.KEY="value",...}(t.EnumName||(t.EnumName={}))
//   B) (a=t.EnumName||(t.EnumName={})).KEY="value",a.KEY2="value2",...
function collectEnum(ast: AnyNode, enumName: string) {
  const map: Record<string, string> = {};

  walk.simple(ast, {
    CallExpression(node: AnyNode) {
      if (
        node.arguments.length === 1 &&
        (node.callee.type === 'FunctionExpression' ||
          node.callee.type === 'ArrowFunctionExpression') &&
        node.callee.params.length === 1 &&
        node.callee.params[0].type === 'Identifier' &&
        mentionsEnum(node.arguments[0], enumName)
      ) {
        collectAssignments(node.callee.body, node.callee.params[0].name, map);
      }
    },
  });

  walk.ancestor(ast, {
    AssignmentExpression(node: AnyNode, _state: unknown, ancestors: AnyNode[]) {
      if (
        node.left.type === 'MemberExpression' &&
        node.left.object.type === 'AssignmentExpression' &&
        node.left.object.left.type === 'Identifier' &&
        node.left.property.type === 'Identifier' &&
        node.right.type === 'Literal' &&
        typeof node.right.value === 'string' &&
        mentionsEnum(node.left.object.right, enumName)
      ) {
        map[node.left.property.name] = node.right.value;
        const tempVar = node.left.object.left.name;

        for (let index = ancestors.length - 1; index >= 0; index--) {
          const ancestor = ancestors[index]!;
          if (
            ancestor.type === 'FunctionExpression' ||
            ancestor.type === 'ArrowFunctionExpression' ||
            ancestor.type === 'FunctionDeclaration'
          ) {
            collectAssignments(ancestor.body, tempVar, map);
            break;
          }
        }
      }
    },
  });

  return map;
}

function memberEnumKey(node: AnyNode | null | undefined, enumName: string) {
  return node &&
    node.type === 'MemberExpression' &&
    node.object.type === 'MemberExpression' &&
    node.object.property.type === 'Identifier' &&
    node.object.property.name === enumName &&
    node.property.type === 'Identifier'
    ? (node.property.name as string)
    : null;
}

function readLiteralString(node: AnyNode | null | undefined) {
  return node?.type === 'Literal' && typeof node.value === 'string'
    ? node.value
    : null;
}

function readStaticNumber(node: AnyNode | null | undefined): number | null {
  if (node?.type === 'Literal' && typeof node.value === 'number') {
    return node.value;
  }

  if (
    node?.type === 'UnaryExpression' &&
    node.operator === '-' &&
    node.argument.type === 'Literal' &&
    typeof node.argument.value === 'number'
  ) {
    return -node.argument.value;
  }

  return null;
}

function readVictoryPoints(node: AnyNode | null | undefined): TfmCardVictoryPoints {
  if (!node) {
    return { kind: 'none' };
  }

  const staticPoints = readStaticNumber(node);
  if (staticPoints !== null) {
    return { kind: 'static', points: staticPoints };
  }

  return { kind: 'dynamic' };
}

function readMetadataProperty(
  metadataNode: AnyNode | null | undefined,
  propertyName: string,
) {
  if (!metadataNode || metadataNode.type !== 'ObjectExpression') {
    return null;
  }

  for (const property of metadataNode.properties) {
    if (
      property.type === 'Property' &&
      property.key.type === 'Identifier' &&
      property.key.name === propertyName
    ) {
      return property.value as AnyNode;
    }
  }

  return null;
}

function resolveNameKeyFromDefaultParam(
  identifier: string,
  ancestors: AnyNode[],
) {
  for (let index = ancestors.length - 1; index >= 0; index--) {
    const ancestor = ancestors[index]!;
    if (
      ancestor.type !== 'FunctionExpression' &&
      ancestor.type !== 'ArrowFunctionExpression' &&
      ancestor.type !== 'FunctionDeclaration'
    ) {
      continue;
    }

    for (const param of ancestor.params) {
      if (
        param.type === 'AssignmentPattern' &&
        param.left.type === 'Identifier' &&
        param.left.name === identifier
      ) {
        return memberEnumKey(param.right, 'CardName');
      }
    }
    return null;
  }

  return null;
}

export function extractTfmCardTags(bundleSource: string): TfmCardTagRecord[] {
  const ast = acorn.parse(bundleSource, { ecmaVersion: 'latest' }) as AnyNode;

  const cardNames = collectEnum(ast, 'CardName');
  const tagValues = collectEnum(ast, 'Tags');
  const cardTypeValues = collectEnum(ast, 'CardType');
  const moduleValues = collectEnum(ast, 'GameModule');

  // Card definitions are object literals containing name/tags/cardType that
  // reference the CardName/Tags/CardType enums. Ares-variant cards pass the
  // name through a constructor default parameter instead:
  //   constructor(e = X.CardName.KEY) { super({name: e, ...}) }
  const definitions = new Map<
    string,
    {
      cardNumber: string | null;
      cardType: string | null;
      tags: string[] | null;
      victoryPoints: TfmCardVictoryPoints | null;
    }
  >();

  walk.ancestor(ast, {
    ObjectExpression(node: AnyNode, _state: unknown, ancestors: AnyNode[]) {
      let nameKey: string | null = null;
      let cardNumber: string | null = null;
      let tags: string[] | null = null;
      let cardType: string | null = null;
      let victoryPoints: TfmCardVictoryPoints | null = null;

      for (const property of node.properties) {
        if (property.type !== 'Property' || property.key.type !== 'Identifier') {
          continue;
        }

        if (property.key.name === 'name') {
          nameKey = memberEnumKey(property.value, 'CardName');
          if (!nameKey && property.value.type === 'Identifier') {
            nameKey = resolveNameKeyFromDefaultParam(
              property.value.name,
              ancestors,
            );
          }
        } else if (property.key.name === 'cardType') {
          cardType = memberEnumKey(property.value, 'CardType');
        } else if (property.key.name === 'metadata') {
          cardNumber = readLiteralString(
            readMetadataProperty(property.value, 'cardNumber'),
          );
          victoryPoints = readVictoryPoints(
            readMetadataProperty(property.value, 'victoryPoints'),
          );
        } else if (property.key.name === 'victoryPoints') {
          victoryPoints = readVictoryPoints(property.value);
        } else if (
          property.key.name === 'tags' &&
          property.value.type === 'ArrayExpression'
        ) {
          const keys = property.value.elements.map((element: AnyNode) =>
            memberEnumKey(element, 'Tags'),
          );
          if (keys.every(Boolean)) {
            tags = keys as string[];
          }
        }
      }

      if (nameKey && (tags !== null || cardType !== null)) {
        const existing = definitions.get(nameKey);
        definitions.set(nameKey, {
          cardNumber: cardNumber ?? existing?.cardNumber ?? null,
          tags: tags ?? existing?.tags ?? null,
          cardType: cardType ?? existing?.cardType ?? null,
          victoryPoints: victoryPoints ?? existing?.victoryPoints ?? null,
        });
      }
    },
  });

  // Module manifests link cards to their expansion module and category.
  const manifestInfo = new Map<string, { module: string; category: string }>();

  walk.simple(ast, {
    ObjectExpression(node: AnyNode) {
      const properties = new Map<string, AnyNode>(
        node.properties
          .filter(
            (property: AnyNode) =>
              property.type === 'Property' && property.key.type === 'Identifier',
          )
          .map((property: AnyNode) => [property.key.name, property.value]),
      );
      const moduleKey = memberEnumKey(properties.get('module'), 'GameModule');

      if (!moduleKey) {
        return;
      }

      for (const category of MANIFEST_CATEGORIES) {
        const cardList = properties.get(category);
        if (!cardList || cardList.type !== 'ArrayExpression') {
          continue;
        }

        for (const element of cardList.elements) {
          if (!element || element.type !== 'ObjectExpression') {
            continue;
          }
          for (const property of element.properties) {
            if (
              property.type === 'Property' &&
              property.key.type === 'Identifier' &&
              property.key.name === 'cardName'
            ) {
              const nameKey = memberEnumKey(property.value, 'CardName');
              if (nameKey) {
                manifestInfo.set(nameKey, { module: moduleKey, category });
              }
            }
          }
        }
      }
    },
  });

  const records: TfmCardTagRecord[] = [];

  for (const [nameKey, definition] of definitions) {
    const displayName = cardNames[nameKey];
    if (!displayName) {
      continue;
    }

    const info = manifestInfo.get(nameKey);
    const tags = (definition.tags ?? [])
      .map((tagKey) => tagValues[tagKey])
      .filter((tag): tag is string => Boolean(tag));

    // Physical event cards carry the printed Event tag; the open-source data
    // encodes it through cardType instead, so add it back.
    if (definition.cardType === 'EVENT' && !tags.includes('event')) {
      tags.push('event');
    }

    const fixupTags = KNOWN_TAG_FIXUPS[displayName];

    records.push({
      cardNumber: definition.cardNumber,
      name: displayName,
      nameKey,
      cardType: definition.cardType
        ? cardTypeValues[definition.cardType] ?? definition.cardType
        : null,
      tags: tags.length === 0 && fixupTags ? [...fixupTags] : tags,
      module: info ? moduleValues[info.module] ?? info.module : null,
      category: info?.category ?? null,
      victoryPoints: definition.victoryPoints ?? { kind: 'none' },
    });
  }

  for (const [displayName, fixupTags] of Object.entries(KNOWN_TAG_FIXUPS)) {
    if (!records.some((record) => record.name === displayName)) {
      records.push({
        cardNumber: null,
        name: displayName,
        nameKey: displayName.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
        cardType: null,
        tags: [...fixupTags],
        module: null,
        category: 'projectCards',
        victoryPoints: { kind: 'none' },
      });
    }
  }

  return records.sort((left, right) => left.name.localeCompare(right.name));
}
