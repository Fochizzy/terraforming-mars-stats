import { z } from 'zod';
import { MERGER_OFFER_RULE_SOURCES } from '@/lib/merger/merger-rule-snapshot';

function sanitizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeStringArray(values: Array<string | null | undefined>) {
  return values.map((value) => sanitizeString(value)).filter(Boolean);
}

function isPopulatedSelection(value: {
  corporationId: string;
  preludeIds: string[];
}) {
  return value.corporationId.length > 0 || value.preludeIds.length > 0;
}

function isPopulatedMilestoneClaim(value: {
  claimed: boolean;
  winnerPlayerId: string;
}) {
  return value.claimed || value.winnerPlayerId.length > 0;
}

function isPopulatedAwardClaim(value: {
  funded: boolean;
  fundedByPlayerId: string;
  firstPlaceWinnerPlayerIds: string[];
  secondPlaceWinnerPlayerIds: string[];
}) {
  return (
    value.funded ||
    value.fundedByPlayerId.length > 0 ||
    value.firstPlaceWinnerPlayerIds.length > 0 ||
    value.secondPlaceWinnerPlayerIds.length > 0
  );
}

function isPopulatedScore(value: Record<string, number | undefined>) {
  return Object.values(value).some((entry) => entry !== undefined);
}

function isPopulatedStyle(value: {
  primaryStyleCode: string;
  modifierStyleCodes: string[];
  keyCardIds: string[];
}) {
  return (
    value.primaryStyleCode.length > 0 ||
    value.modifierStyleCodes.length > 0 ||
    value.keyCardIds.length > 0
  );
}

function compactRecord<T>(
  record: Record<string, T>,
  predicate: (value: T) => boolean,
) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => predicate(value)),
  );
}

const optionalNonNegativeNumberSchema = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'number' && Number.isNaN(value)) {
    return undefined;
  }

  return value;
}, z.number().min(0).optional());

const sanitizedStringArraySchema = z
  .array(z.string().optional().nullable())
  .default([])
  .transform(sanitizeStringArray);

const playerSelectionSchema = z.object({
  corporationId: z
    .string()
    .optional()
    .nullable()
    .transform(sanitizeString),
  preludeIds: sanitizedStringArraySchema,
});

const milestoneClaimSchema = z.object({
  claimed: z.boolean().default(false),
  winnerPlayerId: z
    .string()
    .optional()
    .nullable()
    .transform(sanitizeString),
});

const awardClaimSchema = z.object({
  funded: z.boolean().default(false),
  fundedByPlayerId: z
    .string()
    .optional()
    .nullable()
    .transform(sanitizeString),
  firstPlaceWinnerPlayerIds: sanitizedStringArraySchema,
  secondPlaceWinnerPlayerIds: sanitizedStringArraySchema,
});

const playerScoreSchema = z.object({
  citiesPoints: optionalNonNegativeNumberSchema,
  greeneryPoints: optionalNonNegativeNumberSchema,
  cardPointsTotal: optionalNonNegativeNumberSchema,
  cardPointsMicrobes: optionalNonNegativeNumberSchema,
  cardPointsAnimals: optionalNonNegativeNumberSchema,
  cardPointsJovian: optionalNonNegativeNumberSchema,
  trPoints: optionalNonNegativeNumberSchema,
  milestonePoints: optionalNonNegativeNumberSchema,
  awardPoints: optionalNonNegativeNumberSchema,
  totalPoints: optionalNonNegativeNumberSchema,
  finalMegacredits: optionalNonNegativeNumberSchema,
});

const playerStyleSchema = z.object({
  primaryStyleCode: z
    .string()
    .optional()
    .nullable()
    .transform(sanitizeString),
  modifierStyleCodes: sanitizedStringArraySchema,
  keyCardIds: sanitizedStringArraySchema,
});

export const logGameDraftSchema = z.object({
  gameId: z.string().optional(),
  groupId: z.string().uuid(),
  playedOn: z.string(),
  mapId: z.string(),
  playerCount: z.number().min(1).max(5),
  generationCount: z.number().min(1),
  guaranteedMergerOffer: z.boolean().nullable().default(null),
  mergerOfferRuleSource: z.enum(MERGER_OFFER_RULE_SOURCES).default('unknown'),
  expansionCodes: z.array(z.string()).default([]),
  promoSetSlugs: z.array(z.string()).default([]),
  selectedPlayerIds: z.array(z.string()).default([]),
  notes: z.string().default(''),
  playerSelections: z
    .record(z.string(), playerSelectionSchema)
    .default({})
    .transform((record) => compactRecord(record, isPopulatedSelection)),
  milestoneClaims: z
    .record(z.string(), milestoneClaimSchema)
    .default({})
    .transform((record) => compactRecord(record, isPopulatedMilestoneClaim)),
  awardClaims: z
    .record(z.string(), awardClaimSchema)
    .default({})
    .transform((record) => compactRecord(record, isPopulatedAwardClaim)),
  playerScores: z
    .record(z.string(), playerScoreSchema)
    .default({})
    .transform((record) => compactRecord(record, isPopulatedScore)),
  playerStyles: z
    .record(z.string(), playerStyleSchema)
    .default({})
    .transform((record) => compactRecord(record, isPopulatedStyle)),
});

export type LogGameDraftInput = z.output<typeof logGameDraftSchema>;
