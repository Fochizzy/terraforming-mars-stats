import { describe, expect, it } from 'vitest';
import { buildImportSourceEvidence } from './build-import-source-evidence';

describe('buildImportSourceEvidence', () => {
  it('computes the SHA-256 of the original submitted bytes (known vector)', async () => {
    const evidence = await buildImportSourceEvidence({
      exportedLogText: 'abc',
      parserVersion: 'terraforming-mars-log-v1',
    });
    // FIPS 180-2 test vector for "abc".
    expect(evidence.originalSha256).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(evidence.originalByteLength).toBe(3);
    expect(evidence.storedTextTrimmed).toBe(false);
  });

  it('is deterministic for a rerun of the same source and distinct per parser version', async () => {
    const first = await buildImportSourceEvidence({
      exportedLogText: 'Generation 1\nGeneration 2',
      parserVersion: 'parser-v1',
    });
    const rerun = await buildImportSourceEvidence({
      exportedLogText: 'Generation 1\nGeneration 2',
      parserVersion: 'parser-v1',
    });
    const newerParser = await buildImportSourceEvidence({
      exportedLogText: 'Generation 1\nGeneration 2',
      parserVersion: 'parser-v2',
    });

    expect(rerun.parserRunIdentity).toBe(first.parserRunIdentity);
    expect(newerParser.parserRunIdentity).not.toBe(first.parserRunIdentity);
    expect(newerParser.originalSha256).toBe(first.originalSha256);
  });

  it('records when the stored trimmed text differs from the original submission', async () => {
    const padded = await buildImportSourceEvidence({
      exportedLogText: '  Generation 1\n',
      parserVersion: 'parser-v1',
    });
    const exact = await buildImportSourceEvidence({
      exportedLogText: 'Generation 1',
      parserVersion: 'parser-v1',
    });

    expect(padded.storedTextTrimmed).toBe(true);
    expect(exact.storedTextTrimmed).toBe(false);
    // The original-byte hash is over the untrimmed submission, so it differs
    // from the hash of the trimmed text rather than silently matching it.
    expect(padded.originalSha256).not.toBe(exact.originalSha256);
  });
});
