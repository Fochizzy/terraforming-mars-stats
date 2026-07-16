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
      '/storage/v1/object/public/tm-corporation-logos/Spire.png',
    );
  });

  it('URL-encodes filenames that contain spaces', () => {
    expect(getCorporationLogoUrl('Point Luna')).toContain('Point%20Luna.png');
  });

  it('matches display names to their catalog filename regardless of spelling drift', () => {
    // logo_path is the misspelled "Creditcor.png" while the corp name is Credicor.
    expect(getCorporationLogoUrl('Credicor')).toContain('Creditcor.png');
  });

  it('returns null / false for unknown corporations', () => {
    expect(getCorporationLogoUrl('Not A Real Corp')).toBeNull();
    expect(hasCorporationLogo('Not A Real Corp')).toBe(false);
    expect(hasCorporationLogo('Spire')).toBe(true);
  });
});
