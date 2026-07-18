import { describe, expect, it } from 'vitest';
import {
  getCorporationLogoUrl,
  hasCorporationLogo,
  normalizeCorporationName,
} from './corporation-logo';

describe('corporation logo helpers', () => {
  it('normalizes names by lowercasing and stripping non-alphanumerics', () => {
    expect(normalizeCorporationName('Bio-Sol')).toBe('biosol');
    expect(normalizeCorporationName('Point Luna')).toBe('pointluna');
    expect(normalizeCorporationName("Jenson Boyle & Co")).toBe('jensonboyleco');
  });

  it('resolves a public bucket URL for known corporations', () => {
    expect(getCorporationLogoUrl('Spire')).toContain(
      '/storage/v1/object/public/tm-corporation-logos/corporation-logo-4e187f25db2d17a3c95964614d632cdd3964cd51c2b918f0487e190db66dda56.png',
    );
  });

  it('uses the verified content-hashed Point Luna asset', () => {
    expect(getCorporationLogoUrl('Point Luna')).toContain(
      'corporation-logo-c1ef8aab1384feb7643fca8b8055b3d175df1a5ae34347abdb0ac5700a640a23.png',
    );
  });

  it('matches display names to the current production logo_path snapshot', () => {
    expect(getCorporationLogoUrl('Credicor')).toContain(
      'corporation-logo-fc76d416bb5db8594c6cbef2a7cf922f38d308fa24970f59ed62e7995595a26a.png',
    );
    expect(getCorporationLogoUrl('Credicor')).toContain('?cacheNonce=20260718-v2');
  });

  it('returns null / false for unknown corporations', () => {
    expect(getCorporationLogoUrl('Not A Real Corp')).toBeNull();
    expect(hasCorporationLogo('Not A Real Corp')).toBe(false);
    expect(hasCorporationLogo('Spire')).toBe(true);
  });
});
