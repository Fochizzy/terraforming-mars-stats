import { describe, expect, it } from 'vitest';
import { computeSourceDigest, sourceFingerprint } from './source-hash';

describe('computeSourceDigest', () => {
  it('hashes the exact untrimmed bytes and reports the byte length', async () => {
    const original = '\n  Generation 1\nAda passed\n\n';
    const digest = await computeSourceDigest(original);

    expect(digest.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(digest.byteLength).toBe(new TextEncoder().encode(original).byteLength);
  });

  it('produces a different digest when leading/trailing whitespace changes', async () => {
    const trimmed = await computeSourceDigest('Generation 1');
    const untrimmed = await computeSourceDigest('  Generation 1\n');

    expect(trimmed.sha256).not.toBe(untrimmed.sha256);
  });

  it('is stable for identical input (deterministic)', async () => {
    const a = await computeSourceDigest('Generation 1\nAda passed');
    const b = await computeSourceDigest('Generation 1\nAda passed');

    expect(a.sha256).toBe(b.sha256);
    expect(sourceFingerprint(a.sha256)).toBe(sourceFingerprint(b.sha256));
  });
});
