// Source-evidence identity for the production import action (Workstream 5,
// remediated for audit finding H6).
//
// The SHA-256 here digests the EXACT original submitted text — the client no
// longer trims before submission and the persistence layer no longer trims
// before storage, so `original_sha256` genuinely covers the original bytes
// and the stored raw_log_text is byte-identical to the submission. The
// server-derived `game_log_imports.input_sha256` (a database trigger over the
// stored text) therefore digests the same bytes for new imports, while
// remaining a distinct fact: historical imports were stored trimmed, so their
// input_sha256 covers trimmed text and their original bytes were never
// captured (never inferred).
//
// Parsing may use a separately trimmed value; the immutable source and this
// hash never do.
//
// Web Crypto is used deliberately: it exists in Node and in the Cloudflare
// Workers runtime the application deploys to.

export type ImportSourceEvidence = {
  /** SHA-256 (hex) of the exact original submitted text — no trimming, no
   * line-ending or Unicode normalization, no re-encoding. */
  originalSha256: string;
  /** UTF-8 byte length of the exact original submitted text. */
  originalByteLength: number;
  /**
   * Deterministic parser-run identity: the same source parsed by the same
   * parser version always yields the same identity; a rerun with a newer
   * parser version yields a new one.
   */
  parserRunIdentity: string;
  parserVersion: string;
  /**
   * Whether the original submission carries leading or trailing whitespace
   * (a fact about the source, preserved because the parser input is a
   * separately trimmed value). The stored text always matches the original
   * byte-for-byte regardless of this flag.
   */
  sourceHasOuterWhitespace: boolean;
};

export async function buildImportSourceEvidence(input: {
  exportedLogText: string;
  parserVersion: string;
}): Promise<ImportSourceEvidence> {
  const bytes = new TextEncoder().encode(input.exportedLogText);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const originalSha256 = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return {
    originalByteLength: bytes.byteLength,
    originalSha256,
    parserRunIdentity: `${originalSha256}:${input.parserVersion}`,
    parserVersion: input.parserVersion,
    sourceHasOuterWhitespace:
      input.exportedLogText !== input.exportedLogText.trim(),
  };
}
