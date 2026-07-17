import { describe, expect, it } from 'vitest';
import {
  GLOSSARY_ROUTE,
  glossaryDestination,
  glossarySlugFromHash,
} from './glossary-destination';

describe('Glossary destinations', () => {
  it('uses stable encoded fragment links and rejects invalid encoding', () => {
    expect(glossaryDestination()).toBe(GLOSSARY_ROUTE);
    expect(glossaryDestination('win rate')).toBe('/glossary#win%20rate');
    expect(glossarySlugFromHash('#win%20rate')).toBe('win rate');
    expect(glossarySlugFromHash('#%E0%A4%A')).toBeNull();
  });
});
