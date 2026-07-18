// Byte-for-byte source hashing for the immutable capture source record.
//
// Uses Web Crypto (`crypto.subtle`), which is available in both the Node test
// runtime and the Cloudflare Workers runtime that serves production. The hash
// is computed over the exact original UTF-8 bytes -- the caller must pass the
// untrimmed source so the digest and byte length describe the real evidence.

export type SourceDigest = {
  byteLength: number;
  sha256: string;
};

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function computeSourceDigest(
  originalSourceText: string,
): Promise<SourceDigest> {
  const bytes = new TextEncoder().encode(originalSourceText);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return {
    byteLength: bytes.byteLength,
    sha256: toHex(digest),
  };
}

// A short, stable prefix used to seed deterministic event identities so the
// same source parsed twice yields identical ids without hashing every line.
export function sourceFingerprint(sha256: string): string {
  return sha256.slice(0, 12);
}
