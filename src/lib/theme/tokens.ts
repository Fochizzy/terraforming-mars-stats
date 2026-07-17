export const chartPalette = {
  cities: '#d6b08c',
  greenery: '#6ba83b',
  cards: '#e0d3b8',
  microbes: '#c67c47',
  animals: '#e3b04b',
  jovian: '#8aa8ff',
  tr: '#f06a32',
  milestones: '#c9a45c',
  awards: '#6ec3f4',
};

/**
 * Typed design tokens for the shared design foundations (Phase 1, Step 1.1).
 *
 * The authoritative theme lives in `src/app/globals.css` as `--tm-*` custom
 * properties. These tokens mirror those declarations so TypeScript consumers
 * (charts, inline styles, future asset primitives) can reference theme values
 * without hard-coding hex strings. `tokens.test.ts` verifies every token stays
 * aligned with `globals.css`; changing a value here without changing the CSS
 * (or vice versa) fails the test.
 */
export type ThemeToken = {
  /** CSS custom property declared on `:root` in `src/app/globals.css`. */
  cssVariable: `--tm-${string}`;
  /** Literal value the custom property holds in `globals.css`. */
  value: string;
};

export const colorTokens = {
  space950: { cssVariable: '--tm-space-950', value: '#080b10' },
  space900: { cssVariable: '--tm-space-900', value: '#0d1117' },
  space850: { cssVariable: '--tm-space-850', value: '#141a22' },
  space800: { cssVariable: '--tm-space-800', value: '#1a212a' },
  rust700: { cssVariable: '--tm-rust-700', value: '#8e3d1f' },
  rust600: { cssVariable: '--tm-rust-600', value: '#ad5129' },
  copper500: { cssVariable: '--tm-copper-500', value: '#c97738' },
  copper400: { cssVariable: '--tm-copper-400', value: '#dda15d' },
  dust300: { cssVariable: '--tm-dust-300', value: '#ecd09f' },
  metal500: { cssVariable: '--tm-metal-500', value: '#6f5b4a' },
  metal300: { cssVariable: '--tm-metal-300', value: '#c0a27f' },
  greenery: { cssVariable: '--tm-greenery', value: '#7ba73d' },
  ocean: { cssVariable: '--tm-ocean', value: '#63afd6' },
  tr: { cssVariable: '--tm-tr', value: '#f06a32' },
  text: { cssVariable: '--tm-text', value: '#f6eddf' },
  muted: { cssVariable: '--tm-muted', value: '#d1c1ad' },
  panelBorder: { cssVariable: '--tm-panel-border', value: 'rgba(214, 130, 66, 0.42)' },
  panelHighlight: {
    cssVariable: '--tm-panel-highlight',
    value: 'rgba(255, 226, 184, 0.12)',
  },
  shadow: { cssVariable: '--tm-shadow', value: 'rgba(4, 6, 10, 0.52)' },
} as const satisfies Record<string, ThemeToken>;

export const fontTokens = {
  display: {
    cssVariable: '--tm-font-display',
    value: '"Aldrich", "Orbitron", "Eurostile", "Trebuchet MS", sans-serif',
  },
  body: {
    cssVariable: '--tm-font-body',
    value: '"Rajdhani", "Segoe UI", "Trebuchet MS", sans-serif',
  },
} as const satisfies Record<string, ThemeToken>;

/** `var(--tm-*)` reference for inline styles and SVG/chart props. */
export function cssVar(token: ThemeToken): string {
  return `var(${token.cssVariable})`;
}

/**
 * Responsive breakpoints in CSS pixels. `tailwind.config.ts` does not override
 * the Tailwind defaults, so these are the values behind the `sm:`/`md:`/`lg:`/
 * `xl:`/`2xl:` prefixes used throughout the application.
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;
