import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const metroConfig = require('../../../metro.config.js');
const blockList: RegExp[] = Array.isArray(metroConfig.resolver.blockList)
  ? metroConfig.resolver.blockList
  : [metroConfig.resolver.blockList];

describe('Expo route root', () => {
  it('does not keep test files inside native-app', () => {
    const nativeAppDirectory = path.resolve(process.cwd(), 'native-app');
    const entries = readdirSync(nativeAppDirectory, { withFileTypes: true });

    const testFiles = entries
      .filter((entry) => entry.isFile() && /\.test\.[^.]+$/i.test(entry.name))
      .map((entry) => entry.name);

    expect(testFiles).toEqual([]);
  });

  it('keeps Metro blockList regex flags consistent for fresh Expo starts', () => {
    const flags = new Set(blockList.map((pattern) => pattern.flags));
    expect(flags.size).toBe(1);
  });
});
