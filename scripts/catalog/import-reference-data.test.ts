import { describe, expect, it } from 'vitest';
import {
  buildCatalogImportPayload,
  extractHadronikleCardsFromHtml,
} from './import-reference-data';

describe('extractHadronikleCardsFromHtml', () => {
  it('pulls the embedded CARDS payload from the upstream homepage html', () => {
    const html = `
      <html>
        <body>
          <script>
            const CARDS = [{"cat":"Project","exp":"Base","primary":"Base","tags":["Base"],"num":"001","name":"Colonizer Training Camp","img":"https://example.com/full.png","thumb":"https://example.com/thumb.png"}];
            let slowMode = false;
          </script>
        </body>
      </html>
    `;

    expect(extractHadronikleCardsFromHtml(html)).toEqual([
      {
        cat: 'Project',
        exp: 'Base',
        primary: 'Base',
        tags: ['Base'],
        num: '001',
        name: 'Colonizer Training Camp',
        img: 'https://example.com/full.png',
        thumb: 'https://example.com/thumb.png',
      },
    ]);
  });
});

describe('buildCatalogImportPayload', () => {
  it('builds cards, corporations, and preludes from the upstream catalog while excluding fake corp backs', () => {
    const payload = buildCatalogImportPayload([
      {
        cat: 'Project',
        exp: 'Promo',
        primary: 'Promo',
        tags: ['Promo', 'Turmoil'],
        num: 'X09',
        name: 'Political Alliance',
        img: 'https://example.com/political-alliance.png',
        thumb: 'https://example.com/political-alliance-thumb.png',
      },
      {
        cat: 'Corporation',
        exp: 'Promo',
        primary: 'Promo',
        tags: ['Promo'],
        num: '',
        name: 'Arcadian Communities',
        img: 'https://example.com/arcadian-communities.png',
        thumb: 'https://example.com/arcadian-communities-thumb.png',
      },
      {
        cat: 'Prelude',
        exp: 'Prelude',
        primary: 'Prelude',
        tags: ['Prelude', 'Promo'],
        num: 'X39',
        name: 'Corporate Archives',
        img: 'https://example.com/corporate-archives.png',
        thumb: 'https://example.com/corporate-archives-thumb.png',
      },
      {
        cat: 'Corporation',
        exp: 'Corp Back',
        primary: 'Corp Back',
        tags: ['Corp Back'],
        num: '',
        name: 'Black and White',
        img: 'https://example.com/corp-back.png',
        thumb: 'https://example.com/corp-back-thumb.png',
      },
    ]);

    expect(payload.cards).toHaveLength(3);
    expect(payload.cards[0]).toMatchObject({
      source_card_id: 'project:promo:X09',
      card_number: 'X09',
      card_name: 'Political Alliance',
      card_type: 'Project',
      expansion_code: 'promo',
      expansion_name: 'Promo',
      image_url: 'https://example.com/political-alliance.png',
      thumbnail_path: 'https://example.com/political-alliance-thumb.png',
      full_image_path: 'https://example.com/political-alliance.png',
      promo_set_id: null,
    });
    expect(payload.cards[0]?.sync_metadata).toMatchObject({
      category: 'Project',
      promoSetSlug: '2019-turmoil-promos',
      requiredExpansionCodes: ['turmoil'],
      sourcePrimary: 'Promo',
      sourceTags: ['Promo', 'Turmoil'],
    });

    expect(payload.corporations).toEqual([
      {
        code: 'promo:arcadian-communities',
        expansion_code: 'promo',
        name: 'Arcadian Communities',
        promo_set_slug: '2018-boardgamegeek-promos',
        required_expansion_codes: [],
      },
    ]);

    expect(payload.preludes).toEqual([
      {
        code: 'X39',
        expansion_code: 'prelude',
        name: 'Corporate Archives',
        promo_set_slug: '2022-seasonal-promos',
        required_expansion_codes: ['prelude'],
      },
    ]);
  });

  it('maps later promo cards to their fandom-backed year and release set', () => {
    const payload = buildCatalogImportPayload([
      {
        cat: 'Project',
        exp: 'Promo',
        primary: 'Promo',
        tags: ['Promo'],
        num: 'X44',
        name: '16 Psyche',
        img: 'https://example.com/16-psyche.png',
        thumb: 'https://example.com/16-psyche-thumb.png',
      },
      {
        cat: 'Project',
        exp: 'Promo',
        primary: 'Promo',
        tags: ['Promo'],
        num: 'X72',
        name: 'Casinos',
        img: 'https://example.com/casinos.png',
        thumb: 'https://example.com/casinos-thumb.png',
      },
      {
        cat: 'Project',
        exp: 'Promo',
        primary: 'Promo',
        tags: ['Promo'],
        num: 'X79',
        name: 'Sterling Vents',
        img: 'https://example.com/sterling-vents.png',
        thumb: 'https://example.com/sterling-vents-thumb.png',
      },
    ]);

    expect(payload.cards.map((card) => card.sync_metadata?.promoSetSlug)).toEqual([
      '2023-spielbox-promos',
      '2024-wsbg-promos',
      '2026-seasonal-promos',
    ]);
  });
});
