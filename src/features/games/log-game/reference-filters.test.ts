import { describe, expect, it } from 'vitest';
import { normalizeSelectedExpansionCodes } from './reference-filters';

describe('normalizeSelectedExpansionCodes', () => {
  it('treats base as always available and deduplicates the selected expansions', () => {
    expect(normalizeSelectedExpansionCodes([])).toEqual(['base']);
    expect(normalizeSelectedExpansionCodes(['prelude', 'base', 'prelude'])).toEqual([
      'base',
      'prelude',
    ]);
  });
});
