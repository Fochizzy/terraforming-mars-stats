import { describe, expect, it } from 'vitest';
import {
  filterCardOptions,
  filterCorporationOptions,
  filterPreludeOptions,
  normalizeSelectedExpansionCodes,
} from './reference-filters';

describe('normalizeSelectedExpansionCodes', () => {
  it('treats base as always available and deduplicates the selected expansions', () => {
    expect(normalizeSelectedExpansionCodes([])).toEqual(['base']);
    expect(normalizeSelectedExpansionCodes(['prelude', 'base', 'prelude'])).toEqual([
      'base',
      'prelude',
    ]);
  });
});

describe('reference option filters', () => {
  const corporationOptions = [
    {
      id: 'corp-base',
      name: 'Tharsis Republic',
      expansionCode: 'base',
      promoSetSlug: null,
      requiredExpansionCodes: ['base'],
    },
    {
      id: 'corp-colonies',
      name: 'Poseidon',
      expansionCode: 'colonies',
      promoSetSlug: null,
      requiredExpansionCodes: ['colonies'],
    },
    {
      id: 'corp-promo',
      name: 'Arcadian Communities',
      expansionCode: 'promo',
      promoSetSlug: 'promo-corporations',
      requiredExpansionCodes: [],
    },
  ];

  const preludeOptions = [
    {
      id: 'prelude-base',
      name: 'Allied Bank',
      expansionCode: 'prelude',
      promoSetSlug: null,
      requiredExpansionCodes: ['prelude'],
    },
    {
      id: 'prelude-promo',
      name: 'Corporate Archives',
      expansionCode: 'prelude',
      promoSetSlug: 'x-series-promos',
      requiredExpansionCodes: ['prelude'],
    },
    {
      id: 'prelude-colony',
      name: 'Colony Trade Hub',
      expansionCode: 'prelude_2',
      promoSetSlug: null,
      requiredExpansionCodes: ['prelude_2', 'colonies'],
    },
  ];

  const cardOptions = [
    {
      id: 'card-base',
      cardNumber: '001',
      cardName: 'Colonizer Training Camp',
      expansionCode: 'base',
      promoSetSlug: null,
      requiredExpansionCodes: ['base'],
    },
    {
      id: 'card-promo',
      cardNumber: 'X09',
      cardName: 'Political Alliance',
      expansionCode: 'promo',
      promoSetSlug: 'x-series-promos',
      requiredExpansionCodes: ['turmoil'],
    },
  ];

  it('keeps only corporations available to the selected expansion profile', () => {
    expect(filterCorporationOptions(corporationOptions, ['base'], [])).toEqual([
      corporationOptions[0],
    ]);

    expect(
      filterCorporationOptions(corporationOptions, ['base', 'colonies'], ['promo-corporations']),
    ).toEqual(corporationOptions);
  });

  it('requires both the right expansions and the right promo set for preludes', () => {
    expect(filterPreludeOptions(preludeOptions, ['base', 'prelude'], [])).toEqual([
      preludeOptions[0],
    ]);

    expect(
      filterPreludeOptions(preludeOptions, ['base', 'prelude'], ['x-series-promos']),
    ).toEqual([preludeOptions[0], preludeOptions[1]]);

    expect(
      filterPreludeOptions(
        preludeOptions,
        ['base', 'prelude', 'prelude_2', 'colonies'],
        ['x-series-promos'],
      ),
    ).toEqual(preludeOptions);
  });

  it('keeps combo promo cards hidden until both the promo bundle and required expansion are selected', () => {
    expect(filterCardOptions(cardOptions, ['base'], ['x-series-promos'])).toEqual([
      cardOptions[0],
    ]);

    expect(filterCardOptions(cardOptions, ['base', 'turmoil'], ['x-series-promos'])).toEqual(
      cardOptions,
    );
  });
});
