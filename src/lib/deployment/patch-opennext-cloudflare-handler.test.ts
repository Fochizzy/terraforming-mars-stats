import { describe, expect, it } from 'vitest';

import {
  alreadyPatchedSnippet,
  patchOpenNextCloudflareHandlerSource,
  targetSnippet,
} from '../../../scripts/patch-opennext-cloudflare-handler.mjs';

describe('patchOpenNextCloudflareHandlerSource', () => {
  it('replaces the middleware manifest lookup with a null return', () => {
    const result = patchOpenNextCloudflareHandlerSource(
      `before ${targetSnippet} after`,
    );

    expect(result.didPatch).toBe(true);
    expect(result.output).toContain(alreadyPatchedSnippet);
    expect(result.output).not.toContain(targetSnippet);
  });

  it('is idempotent when the handler source is already patched', () => {
    const result = patchOpenNextCloudflareHandlerSource(
      `before ${alreadyPatchedSnippet} after`,
    );

    expect(result.didPatch).toBe(false);
    expect(result.output).toContain(alreadyPatchedSnippet);
  });

  it('throws when the expected handler snippet is missing', () => {
    expect(() =>
      patchOpenNextCloudflareHandlerSource('before unrelated after'),
    ).toThrow(/OpenNext handler snippet/);
  });
});
