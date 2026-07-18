import { describe, expect, it } from 'vitest';
import {
  assetFamilies,
  buildAssetFallback,
  buildPublicStorageUrl,
  normalizeAssetLookupKey,
  normalizeStoredAssetPath,
  resolveCardImageAsset,
  resolveCorporationLogoAsset,
  resolveLogGameBackgroundAsset,
  resolveMapGraphicAsset,
  resolveScoreSourceAsset,
  resolveSignedImportEvidenceAsset,
  resolveStaticSiteAsset,
  resolveTagIconAsset,
  resolveUnavailableCatalogAsset,
  type AvailableAsset,
  type ResolvedAsset,
} from '.';

const supabaseUrl = 'https://example.supabase.co/';

function expectAvailable(asset: ResolvedAsset): asserts asset is AvailableAsset {
  expect(asset.status).toBe('available');
  if (asset.status !== 'available') {
    throw new Error(`Expected available asset, received ${asset.source.reason}`);
  }
}

describe('asset key and path normalization', () => {
  it('normalizes stable codes in one place without using display labels', () => {
    expect(normalizeAssetLookupKey('  OTHER_card  ')).toBe('other-card');
    expect(normalizeAssetLookupKey('Community:Marabout-Shiritori')).toBe(
      'community:marabout-shiritori',
    );
    expect(normalizeAssetLookupKey('   ')).toBeNull();
  });

  it('decodes a valid stored path exactly once', () => {
    expect(normalizeStoredAssetPath('axis/Point%20Luna.png')).toBe(
      'axis/Point Luna.png',
    );
  });

  it.each([
    '../private.png',
    'folder//image.png',
    '/file.svg',
    'folder\\image.png',
    'image.png?token=secret',
    'image%2Fnested.png',
    'bad%path.png',
  ])('rejects malformed or ambiguous stored path %s', (path) => {
    expect(normalizeStoredAssetPath(path)).toBeNull();
  });
});

describe('public URL construction', () => {
  it('encodes every object-path segment without hard-coding a project URL', () => {
    expect(
      buildPublicStorageUrl({
        bucket: 'tm-corporation-logos',
        path: 'community logos/Point Luna & Co.png',
        supabaseUrl,
      }),
    ).toBe(
      'https://example.supabase.co/storage/v1/object/public/tm-corporation-logos/community%20logos/Point%20Luna%20%26%20Co.png',
    );
  });

  it('returns null for invalid configuration or malformed paths', () => {
    expect(
      buildPublicStorageUrl({
        bucket: 'tm-tag-icons',
        path: '../plant.webp',
        supabaseUrl,
      }),
    ).toBeNull();
    expect(
      buildPublicStorageUrl({
        bucket: 'tm-tag-icons',
        path: 'plant.webp',
        supabaseUrl: 'not a URL',
      }),
    ).toBeNull();
  });
});

describe('family resolvers', () => {
  it('resolves the Log a Game background through the public asset contract', () => {
    const background = resolveLogGameBackgroundAsset({ supabaseUrl });

    expectAvailable(background);
    expect(background).toMatchObject({
      alt: '',
      canonicalKey: 'log-game-mars-horizon-f78061b5',
      decorative: true,
      family: 'background',
      height: 1024,
      source: {
        access: 'public',
        bucket: 'tm-map-images',
        path: 'backgrounds/log-game-mars-horizon-f78061b5.png',
        type: 'public-storage',
      },
      width: 1536,
    });
  });

  it('resolves corporation logos only from canonical identity plus stored path', () => {
    const asset = resolveCorporationLogoAsset(
      {
        corporationId: 'official:point-luna',
        logoPath: 'Point Luna.png',
        name: 'Point Luna',
      },
      { supabaseUrl },
    );

    expectAvailable(asset);
    expect(asset).toMatchObject({
      alt: 'Point Luna logo',
      aspectRatio: 1,
      canonicalKey: 'official:point-luna',
      family: 'corporation-logo',
      source: {
        access: 'public',
        bucket: 'tm-corporation-logos',
        path: 'Point Luna.png',
        type: 'public-storage',
      },
    });
  });

  it('resolves score-source standard and axis variants from typed keys', () => {
    const standard = resolveScoreSourceAsset('tr', { supabaseUrl });
    const axis = resolveScoreSourceAsset('other_card', {
      supabaseUrl,
      variant: 'axis',
    });

    expectAvailable(standard);
    expectAvailable(axis);
    expect(standard.source).toMatchObject({ path: 'Terraform_Rating.png' });
    expect(axis).toMatchObject({ canonicalKey: 'other-card' });
    expect(axis.source).toMatchObject({ path: 'axis/Other_Card.png' });
  });

  it('uses only confirmed tag-code mappings and keeps known gaps unavailable', () => {
    const plant = resolveTagIconAsset({ tagCode: 'PLANT' }, { supabaseUrl });
    const clone = resolveTagIconAsset({ tagCode: 'clone' }, { supabaseUrl });
    const extra = resolveTagIconAsset(
      { tagCode: 'wild_planet' },
      { supabaseUrl },
    );

    expectAvailable(plant);
    expect(plant.source).toMatchObject({ path: 'plant.webp' });
    expect(clone).toMatchObject({
      status: 'unavailable',
      source: { reason: 'source-unavailable' },
    });
    expect(extra).toMatchObject({
      status: 'unavailable',
      source: { reason: 'unsupported-key' },
    });
  });

  it('resolves card object paths and approved external source URLs distinctly', () => {
    const thumbnail = resolveCardImageAsset(
      {
        cardName: 'Merger',
        pathOrUrl: 'promos/Merger.webp',
        sourceCardId: 'promo:merger',
        variant: 'thumbnail',
      },
      { supabaseUrl },
    );
    const external = resolveCardImageAsset({
      cardName: 'Merger',
      pathOrUrl: 'https://cards.example.com/Merger.webp',
      sourceCardId: 'promo:merger',
      variant: 'full',
    });

    expectAvailable(thumbnail);
    expectAvailable(external);
    expect(thumbnail.source).toMatchObject({
      bucket: 'tm-card-thumbs',
      type: 'public-storage',
    });
    expect(external.source).toMatchObject({
      access: 'public',
      type: 'external-url',
    });
  });

  it('resolves map graphics only when a stable map code and explicit path exist', () => {
    const map = resolveMapGraphicAsset(
      {
        mapCode: 'amazonis_planitia',
        mapName: 'Amazonis Planitia',
        path: 'amazonis_planitia.webp',
      },
      { supabaseUrl },
    );

    expectAvailable(map);
    expect(map).toMatchObject({
      canonicalKey: 'amazonis-planitia',
      family: 'map-graphic',
    });
  });

  it.each([
    ['prelude-graphic', 'prelude-1', 'Allied Banks'],
    ['milestone-graphic', 'milestone-1', 'Terraformer'],
    ['award-graphic', 'award-1', 'Landlord'],
  ] as const)(
    'formalizes %s as a text fallback until an authoritative source exists',
    (family, canonicalKey, label) => {
      expect(
        resolveUnavailableCatalogAsset({ family, canonicalKey, label }),
      ).toMatchObject({
        family,
        status: 'unavailable',
        source: { reason: 'source-unavailable' },
      });
    },
  );

  it('formalizes tracked brand and background metadata with real dimensions', () => {
    const banner = resolveStaticSiteAsset('application-banner');
    expect(banner).toMatchObject({
      alt: 'Terraforming Mars Statistics',
      family: 'brand',
      height: 793,
      source: { access: 'bundled', type: 'bundled-static' },
      status: 'available',
      width: 1983,
    });
    expect(banner.url).toEqual(expect.any(String));
    expect(banner.url).not.toHaveLength(0);
    expect(resolveStaticSiteAsset('global-mars-background')).toMatchObject({
      alt: '',
      decorative: true,
      family: 'background',
      height: 549,
      source: { access: 'public', type: 'public-static' },
      width: 975,
    });
  });

  it('resolves the Step 3.3 leaderboard laurels and auth-page background with stable public paths', () => {
    expect(resolveStaticSiteAsset('leaderboard-laurel-gold')).toMatchObject({
      alt: '',
      decorative: true,
      family: 'brand',
      height: 256,
      source: { access: 'public', type: 'public-static' },
      url: '/laurel-gold.png',
      width: 256,
    });
    expect(resolveStaticSiteAsset('leaderboard-laurel-silver')).toMatchObject({
      alt: '',
      decorative: true,
      family: 'brand',
      source: { access: 'public', type: 'public-static' },
      url: '/laurel-silver.png',
    });
    expect(resolveStaticSiteAsset('leaderboard-laurel-bronze')).toMatchObject({
      alt: '',
      decorative: true,
      family: 'brand',
      source: { access: 'public', type: 'public-static' },
      url: '/laurel-bronze.png',
    });
    expect(resolveStaticSiteAsset('auth-page-mars-landscape')).toMatchObject({
      alt: '',
      decorative: true,
      family: 'background',
      height: 941,
      source: { access: 'public', type: 'public-static' },
      url: '/auth-page-mars-landscape.webp',
      width: 1672,
    });
    // No two static site assets share a resolved public path.
    const keys = [
      'application-banner',
      'auth-mars-background',
      'auth-page-mars-landscape',
      'global-mars-background',
      'leaderboard-laurel-gold',
      'leaderboard-laurel-silver',
      'leaderboard-laurel-bronze',
    ] as const;
    const urls = keys.map((key) => resolveStaticSiteAsset(key).url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('keeps every declared family inside the resolver architecture', () => {
    expect(assetFamilies).toEqual([
      'corporation-logo',
      'score-source',
      'tag-icon',
      'card-image',
      'map-graphic',
      'prelude-graphic',
      'milestone-graphic',
      'award-graphic',
      'brand',
      'background',
      'import-evidence',
    ]);
  });
});

describe('unavailable and private boundaries', () => {
  it('returns unavailable metadata when public configuration is missing', () => {
    expect(
      resolveScoreSourceAsset('animal', { supabaseUrl: null }),
    ).toMatchObject({
      status: 'unavailable',
      url: null,
      source: { reason: 'missing-configuration' },
    });
  });

  it('distinguishes missing stored paths from malformed stored paths', () => {
    expect(
      resolveCorporationLogoAsset(
        { corporationId: 'corp-1', logoPath: null, name: 'No Logo Corp' },
        { supabaseUrl },
      ),
    ).toMatchObject({ source: { reason: 'missing-path' } });
    expect(
      resolveCorporationLogoAsset(
        {
          corporationId: 'corp-1',
          logoPath: '../secret.png',
          name: 'Unsafe Corp',
        },
        { supabaseUrl },
      ),
    ).toMatchObject({ source: { reason: 'malformed-path' } });
  });

  it('accepts only an already-authorized, unexpired signed URL for private evidence', () => {
    const asset = resolveSignedImportEvidenceAsset({
      canonicalKey: 'game-1:evidence-1',
      expiresAt: '2999-01-01T00:00:00.000Z',
      label: 'Imported game evidence',
      objectPath: 'game-1/evidence 1.png',
      signedUrl:
        'https://example.supabase.co/storage/v1/object/sign/tm-import-evidence/game-1/evidence%201.png?token=signed-value',
    });

    expectAvailable(asset);
    expect(asset.source).toMatchObject({
      access: 'private',
      bucket: 'tm-import-evidence',
      path: 'game-1/evidence 1.png',
      type: 'signed-storage',
    });
  });

  it('never treats a public URL as signed private evidence', () => {
    expect(
      resolveSignedImportEvidenceAsset({
        canonicalKey: 'game-1:evidence-1',
        expiresAt: '2999-01-01T00:00:00.000Z',
        label: 'Imported game evidence',
        objectPath: 'game-1/evidence.png',
        signedUrl:
          'https://example.supabase.co/storage/v1/object/public/tm-import-evidence/game-1/evidence.png',
      }),
    ).toMatchObject({
      status: 'unavailable',
      source: { reason: 'unsigned-private-url' },
    });
  });

  it('rejects a signed URL that points at a different private object path', () => {
    expect(
      resolveSignedImportEvidenceAsset({
        canonicalKey: 'game-1:evidence-1',
        expiresAt: '2999-01-01T00:00:00.000Z',
        label: 'Imported game evidence',
        objectPath: 'game-1/evidence.png',
        signedUrl:
          'https://example.supabase.co/storage/v1/object/sign/tm-import-evidence/game-2/other.png?token=signed-value',
      }),
    ).toMatchObject({
      status: 'unavailable',
      source: { reason: 'unsigned-private-url' },
    });
  });

  it('returns unavailable metadata for expired signed evidence URLs', () => {
    expect(
      resolveSignedImportEvidenceAsset({
        canonicalKey: 'game-1:evidence-1',
        expiresAt: '2000-01-01T00:00:00.000Z',
        label: 'Imported game evidence',
        objectPath: 'game-1/evidence.png',
        signedUrl:
          'https://example.supabase.co/storage/v1/object/sign/tm-import-evidence/game-1/evidence.png?token=expired-value',
      }),
    ).toMatchObject({
      status: 'unavailable',
      source: { reason: 'expired-signed-url' },
    });
  });
});

describe('deterministic fallback metadata', () => {
  it('uses initials for corporations and stable compact labels for long names', () => {
    expect(buildAssetFallback('corporation-logo', 'Point Luna')).toEqual({
      kind: 'initials',
      label: 'Point Luna',
      message: 'Point Luna image unavailable',
      shortLabel: 'PL',
    });
    expect(
      buildAssetFallback(
        'map-graphic',
        'A Very Long Terraforming Mars Entity Name',
      ).shortLabel,
    ).toBe('AV');
  });
});
