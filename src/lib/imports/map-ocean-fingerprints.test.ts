import { describe, expect, it } from 'vitest';
import {
  MAP_OCEAN_FINGERPRINTS,
  getMapOceanFingerprint,
  normalizeMapCode,
  type MapOceanFingerprint,
} from './map-ocean-fingerprints';

const byCode = (code: string): MapOceanFingerprint => {
  const fingerprint = MAP_OCEAN_FINGERPRINTS.find((entry) => entry.code === code);
  if (!fingerprint) throw new Error(`missing fingerprint for ${code}`);
  return fingerprint;
};

const fixedMaps = MAP_OCEAN_FINGERPRINTS.filter((entry) => !entry.randomizedUnsupported);

describe('map ocean fingerprints', () => {
  it('uses well-formed, unique, ascending 2-digit space ids in 03..63', () => {
    for (const fingerprint of MAP_OCEAN_FINGERPRINTS) {
      const ids = fingerprint.oceanEligibleSpaceIds;
      for (const id of ids) {
        expect(id).toMatch(/^\d{2}$/);
        const value = Number(id);
        expect(value).toBeGreaterThanOrEqual(3);
        expect(value).toBeLessThanOrEqual(63);
      }
      expect(new Set(ids).size).toBe(ids.length);
      expect([...ids]).toEqual([...ids].sort());
    }
  });

  it('gives every fixed map 12 ocean hexes (Arabia Terra adds 5 ocean-eligible coves)', () => {
    for (const fingerprint of fixedMaps) {
      const expected = fingerprint.code === 'arabia_terra' ? 17 : 12;
      expect(fingerprint.oceanEligibleSpaceIds).toHaveLength(expected);
    }
  });

  it('Hellas fingerprint is a superset of oceans placed in a real Hellas log', () => {
    // Ground truth: Downloads/"2026 07 11 game 1.txt" (generation 8, Hellas).
    const realOceanPlacements = ['03', '08', '14', '21', '26', '27', '34', '35', '46'];
    const hellas = new Set(byCode('hellas').oceanEligibleSpaceIds);
    for (const id of realOceanPlacements) {
      expect(hellas.has(id)).toBe(true);
    }
  });

  it('Terra Cimmeria and Terra Cimmeria Nova share one board (oceans cannot split them)', () => {
    expect(byCode('terra_cimmeria').oceanEligibleSpaceIds).toEqual(
      byCode('terra_cimmeria_nova').oceanEligibleSpaceIds,
    );
  });

  it('Vastitas Borealis and its Nova variant differ (oceans split them)', () => {
    expect(byCode('vastitas_borealis').oceanEligibleSpaceIds).not.toEqual(
      byCode('vastitas_borealis_nova').oceanEligibleSpaceIds,
    );
  });

  it('has exactly one shared ocean-set pair among fixed maps: Terra Cimmeria / Nova', () => {
    const groups = new Map<string, string[]>();
    for (const fingerprint of fixedMaps) {
      const key = fingerprint.oceanEligibleSpaceIds.join(',');
      groups.set(key, [...(groups.get(key) ?? []), fingerprint.code]);
    }
    const shared = [...groups.values()].filter((codes) => codes.length > 1);
    expect(shared).toHaveLength(1);
    expect(new Set(shared[0])).toEqual(new Set(['terra_cimmeria', 'terra_cimmeria_nova']));
    // 10 fixed maps collapse to 9 distinct ocean sets.
    expect(groups.size).toBe(9);
  });

  it('normalizes loosely formatted codes and map names', () => {
    expect(normalizeMapCode('Terra Cimmeria')).toBe('terra_cimmeria');
    expect(normalizeMapCode(' Vastitas-Borealis Nova ')).toBe('vastitas_borealis_nova');
    expect(getMapOceanFingerprint('Amazonis Planitia')?.code).toBe('amazonis_planitia');
    expect(getMapOceanFingerprint('nope')).toBeUndefined();
  });

  it('retains Hollandia only as a randomized/unsupported entry', () => {
    expect(byCode('hollandia').randomizedUnsupported).toBe(true);
    expect(MAP_OCEAN_FINGERPRINTS.filter((entry) => entry.randomizedUnsupported)).toHaveLength(1);
  });
});
