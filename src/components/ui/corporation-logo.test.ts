import { describe, expect, it } from 'vitest';
import {
  CORPORATION_LOGO_ASPECT_RATIO,
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
      '/storage/v1/object/public/tm-corporation-logos/corporation-logo-9557a48ea85ae3f3ff2b12dc8f3f9e82d190229cd61dfb5f9c17b10843b4ad5e.png',
    );
  });

  it('uses the verified content-hashed Point Luna asset', () => {
    expect(getCorporationLogoUrl('Point Luna')).toContain(
      'corporation-logo-6cd8a2f042bd2032106761e1ad4b3a7eab711db5051d4aafe585b623e495b5ea.png',
    );
  });

  it('matches display names to the current production logo snapshot', () => {
    expect(getCorporationLogoUrl('Credicor')).toContain(
      'corporation-logo-26dae5e60c5d32abe359764f767175dbe2b4b72368933d9114baed89c6963d74.png',
    );
    expect(getCorporationLogoUrl('Credicor')).toContain('?cacheNonce=20260718-v2');
  });

  it('returns null / false for unknown corporations', () => {
    expect(getCorporationLogoUrl('Not A Real Corp')).toBeNull();
    expect(hasCorporationLogo('Not A Real Corp')).toBe(false);
    expect(hasCorporationLogo('Spire')).toBe(true);
  });

  // The replacement art spells nine corporations differently from the catalog
  // (e.g. the file is "Creditcor.png" but the catalog key is "credicor"). Those
  // are bridged by an explicit alias table in the upload script, so every one of
  // them must still resolve here — a silent miss would blank the logo.
  it('resolves every corporation whose source art is spelled differently', () => {
    const aliased = [
      'Bentenmaru',
      'Credicor',
      'Gagarin Mobile Base',
      'Hadesphere',
      'Hecate Speditions',
      'Henkei Genetics',
      'Jenson Boyle & Co',
      'Robin Haulings',
      'Sagitta Frontier Services',
    ];

    for (const name of aliased) {
      expect(hasCorporationLogo(name), name).toBe(true);
      expect(getCorporationLogoUrl(name), name).toMatch(
        /corporation-logo-[0-9a-f]{64}\.png/,
      );
    }
  });

  it('exposes a 2:1 aspect ratio so the banner art is never squashed', () => {
    // The art carries the corporation name as part of the image; rendering it
    // in a square box would halve its height and letterbox it.
    expect(CORPORATION_LOGO_ASPECT_RATIO).toBe(2);
  });
});
