import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import type {
  CardScoringReference,
  ResolvedCardScoringRule,
} from './card-scoring-types';

const curatedRulesByNormalizedName: Record<string, ResolvedCardScoringRule> = {
  [normalizePlayerAlias('Capital')]: {
    adjacentTileKinds: ['ocean'],
    category: 'other',
    confidence: 1,
    humanSummary: '1 VP per adjacent ocean to the city tile placed by this card',
    mode: 'adjacent_tile_count_from_placed_tile',
    pointsPerSet: 1,
    setSize: 1,
    sourceType: 'curated',
  },
  [normalizePlayerAlias('Commercial District')]: {
    adjacentTileKinds: ['city'],
    category: 'other',
    confidence: 1,
    humanSummary: '1 VP per adjacent city to the city tile placed by this card',
    mode: 'adjacent_tile_count_from_placed_tile',
    pointsPerSet: 1,
    setSize: 1,
    sourceType: 'curated',
  },
  [normalizePlayerAlias('Commercial Harbor')]: {
    adjacentTileKinds: ['ocean'],
    category: 'other',
    confidence: 1,
    humanSummary: '1 VP per adjacent ocean to the city tile placed by this card',
    mode: 'adjacent_tile_count_from_placed_tile',
    pointsPerSet: 1,
    setSize: 1,
    sourceType: 'curated',
  },
  [normalizePlayerAlias('Fish')]: {
    category: 'animals',
    confidence: 1,
    humanSummary: '1 VP per animal on this card',
    mode: 'resource_count',
    pointsPerSet: 1,
    resourceType: 'animal',
    scope: 'card',
    setSize: 1,
    sourceType: 'curated',
  },
  [normalizePlayerAlias('Ganymede Colony')]: {
    category: 'jovian',
    confidence: 1,
    humanSummary: '1 VP per Jovian tag you have',
    mode: 'tag_count',
    pointsPerSet: 1,
    scope: 'self',
    setSize: 1,
    sourceType: 'curated',
    tag: 'jovian',
  },
  [normalizePlayerAlias('Pets')]: {
    category: 'animals',
    confidence: 1,
    humanSummary: '1 VP per animal on this card',
    mode: 'resource_count',
    pointsPerSet: 1,
    resourceType: 'animal',
    scope: 'card',
    setSize: 1,
    sourceType: 'curated',
  },
  [normalizePlayerAlias('Stratospheric Birds')]: {
    category: 'animals',
    confidence: 1,
    humanSummary: '1 VP per animal on this card',
    mode: 'resource_count',
    pointsPerSet: 1,
    resourceType: 'animal',
    scope: 'card',
    setSize: 1,
    sourceType: 'curated',
  },
};

export function getCuratedCardScoringRule(
  card: Pick<CardScoringReference, 'cardName'>,
) {
  return curatedRulesByNormalizedName[normalizePlayerAlias(card.cardName)] ?? null;
}
