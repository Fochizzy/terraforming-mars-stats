import { describe, expect, it } from 'vitest';
import { getTagIconUrl, hasTagIcon, normalizeTagIconCode } from './tag-icon';

describe('tag icon helpers', () => {
  it('normalizes tag labels to their Supabase object names', () => {
    expect(normalizeTagIconCode('Wild Planet')).toBe('wild_planet');
  });

  it('uses the versioned Supabase tag asset', () => {
    expect(getTagIconUrl('Science')).toContain(
      '/storage/v1/object/public/tm-tag-icons/science.webp?cacheNonce=',
    );
  });

  it('does not build broken URLs for unknown tags', () => {
    expect(getTagIconUrl('not-a-real-tag')).toBeNull();
    expect(hasTagIcon('not-a-real-tag')).toBe(false);
  });
});
