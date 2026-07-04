import type {
  CardOption,
  CorporationOption,
  PreludeOption,
} from '@/lib/db/reference-repo';

function includesAllRequiredExpansions(
  selectedExpansionCodes: string[],
  requiredExpansionCodes: string[],
) {
  return requiredExpansionCodes.every((code) => selectedExpansionCodes.includes(code));
}

function matchesPromoSelection(
  selectedPromoSetSlugs: string[],
  promoSetSlug: string | null,
) {
  return !promoSetSlug || selectedPromoSetSlugs.includes(promoSetSlug);
}

export function normalizeSelectedExpansionCodes(expansionCodes: string[]) {
  return [...new Set(['base', ...expansionCodes.filter(Boolean)])];
}

export function filterCorporationOptions(
  corporationOptions: CorporationOption[],
  expansionCodes: string[],
  promoSetSlugs: string[],
) {
  const normalizedExpansionCodes = normalizeSelectedExpansionCodes(expansionCodes);

  return corporationOptions.filter(
    (corporation) =>
      includesAllRequiredExpansions(
        normalizedExpansionCodes,
        corporation.requiredExpansionCodes,
      ) && matchesPromoSelection(promoSetSlugs, corporation.promoSetSlug),
  );
}

export function filterPreludeOptions(
  preludeOptions: PreludeOption[],
  expansionCodes: string[],
  promoSetSlugs: string[],
) {
  const normalizedExpansionCodes = normalizeSelectedExpansionCodes(expansionCodes);

  return preludeOptions.filter(
    (prelude) =>
      includesAllRequiredExpansions(
        normalizedExpansionCodes,
        prelude.requiredExpansionCodes,
      ) && matchesPromoSelection(promoSetSlugs, prelude.promoSetSlug),
  );
}

export function filterCardOptions(
  cardOptions: CardOption[],
  expansionCodes: string[],
  promoSetSlugs: string[],
) {
  const normalizedExpansionCodes = normalizeSelectedExpansionCodes(expansionCodes);

  return cardOptions.filter(
    (card) =>
      includesAllRequiredExpansions(normalizedExpansionCodes, card.requiredExpansionCodes) &&
      matchesPromoSelection(promoSetSlugs, card.promoSetSlug),
  );
}
