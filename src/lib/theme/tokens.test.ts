import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { breakpoints, colorTokens, cssVar, fontTokens } from './tokens';

const globalsCss = readFileSync(
  path.resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

describe('design tokens', () => {
  it('keeps every color token aligned with the declaration in globals.css', () => {
    for (const token of Object.values(colorTokens)) {
      expect(globalsCss).toContain(`${token.cssVariable}: ${token.value};`);
    }
  });

  it('keeps every font token aligned with the declaration in globals.css', () => {
    for (const token of Object.values(fontTokens)) {
      expect(globalsCss).toContain(`${token.cssVariable}: ${token.value};`);
    }
  });

  it('does not invent custom properties that globals.css never declares', () => {
    const declared = new Set(
      Array.from(globalsCss.matchAll(/(--tm-[a-z0-9-]+):/g), (match) => match[1]),
    );
    for (const token of [
      ...Object.values(colorTokens),
      ...Object.values(fontTokens),
    ]) {
      expect(declared.has(token.cssVariable)).toBe(true);
    }
  });

  it('builds var() references from tokens', () => {
    expect(cssVar(colorTokens.copper400)).toBe('var(--tm-copper-400)');
    expect(cssVar(fontTokens.display)).toBe('var(--tm-font-display)');
  });

  it('documents the Tailwind default breakpoints used by the app', () => {
    expect(breakpoints).toEqual({
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    });
  });
});
