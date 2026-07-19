// Source-evidence identity for the production import action (Workstream 5).
//
// The server derives `game_log_imports.input_sha256` from the STORED
// raw_log_text, which is trimmed before persistence. This module additionally
// fingerprints the ORIGINAL submitted text before any trimming, so the import
// evidence records exactly what the importer supplied, and gives the import a
// deterministic parser-run identity mirroring the live-site v2 rule that one
// parser run is identified by (source hash, parser version).
//
// Web Crypto is used deliberately: it exists in Node and in the Cloudflare
// Workers runtime the application deploys to.

export type ImportSourceEvidence = {
  /** SHA-256 (hex) of the original submitted text, before any trimming. */
  originalSha256: string;
  /** UTF-8 byte length of the original submitted text. */
  originalByteLength: number;
  /**
   * Deterministic parser-run identity: the same source parsed by the same
   * parser version always yields the same identity; a rerun with a newer
   * parser version yields a new one.
   */
  parserRunIdentity: string;
  parserVersion: string;
  /**
   * Whether the stored raw_log_text differs from the original submission
   * because of the persistence layer's trim. When true, the server-derived
   * input_sha256 (stored text) and originalSha256 (submitted text) digest
   * different byte sequences — both are preserved, neither replaces the
   * other.
   */
  storedTextTrimmed: boolean;
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
    storedTextTrimmed: input.exportedLogText !== input.exportedLogText.trim(),
  };
}
