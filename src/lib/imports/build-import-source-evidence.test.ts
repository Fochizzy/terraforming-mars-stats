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
    expect(evidence.sourceHasOuterWhitespace).toBe(false);
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

  it('changes the hash for a trailing newline — the original bytes are never trimmed', async () => {
    const bare = await buildImportSourceEvidence({
      exportedLogText: 'Generation 1',
      parserVersion: 'parser-v1',
    });
    const trailingNewline = await buildImportSourceEvidence({
      exportedLogText: 'Generation 1\n',
      parserVersion: 'parser-v1',
    });

    expect(trailingNewline.originalSha256).not.toBe(bare.originalSha256);
    expect(trailingNewline.originalByteLength).toBe(
      bare.originalByteLength + 1,
    );
    expect(trailingNewline.sourceHasOuterWhitespace).toBe(true);
  });

  it('changes the hash for leading whitespace', async () => {
    const bare = await buildImportSourceEvidence({
      exportedLogText: 'Generation 1',
      parserVersion: 'parser-v1',
    });
    const leadingWhitespace = await buildImportSourceEvidence({
      exportedLogText: '  Generation 1',
      parserVersion: 'parser-v1',
    });

    expect(leadingWhitespace.originalSha256).not.toBe(bare.originalSha256);
    expect(leadingWhitespace.sourceHasOuterWhitespace).toBe(true);
  });

  it('produces different byte hashes for CRLF and LF line endings', async () => {
    const lf = await buildImportSourceEvidence({
      exportedLogText: 'Generation 1\nGeneration 2',
      parserVersion: 'parser-v1',
    });
    const crlf = await buildImportSourceEvidence({
      exportedLogText: 'Generation 1\r\nGeneration 2',
      parserVersion: 'parser-v1',
    });

    expect(crlf.originalSha256).not.toBe(lf.originalSha256);
    expect(crlf.originalByteLength).toBe(lf.originalByteLength + 1);
  });

  it('flags outer whitespace as a source fact without altering the hashed bytes', async () => {
    const padded = await buildImportSourceEvidence({
      exportedLogText: '  Generation 1\n',
      parserVersion: 'parser-v1',
    });
    const exact = await buildImportSourceEvidence({
      exportedLogText: 'Generation 1',
      parserVersion: 'parser-v1',
    });

    expect(padded.sourceHasOuterWhitespace).toBe(true);
    expect(exact.sourceHasOuterWhitespace).toBe(false);
    // The original-byte hash covers the untrimmed submission, so it differs
    // from the hash of the trimmed text rather than silently matching it.
    expect(padded.originalSha256).not.toBe(exact.originalSha256);
  });
});
