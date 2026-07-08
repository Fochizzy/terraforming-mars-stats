import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

describe('Cloudflare deployment config', () => {
  it('adds the Workers adapter scripts and dependencies', () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };

    expect(packageJson.dependencies?.['@opennextjs/cloudflare']).toBeTruthy();
    expect(packageJson.devDependencies?.wrangler).toBeTruthy();
    expect(packageJson.devDependencies?.tsx).toBeTruthy();
    expect(packageJson.scripts?.preview).toBe(
      'opennextjs-cloudflare build && opennextjs-cloudflare preview',
    );
    expect(packageJson.scripts?.deploy).toBe(
      'opennextjs-cloudflare build && opennextjs-cloudflare deploy',
    );
    expect(packageJson.scripts?.['cf-typegen']).toBe(
      'wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts',
    );
  });

  it('commits the manual Workers config files', () => {
    expect(existsSync(path.join(repoRoot, 'wrangler.jsonc'))).toBe(true);
    expect(existsSync(path.join(repoRoot, 'open-next.config.ts'))).toBe(true);
  });

  it('keeps the Cloudflare Next.js dev init hook and static asset headers', () => {
    const nextConfig = readFileSync(
      path.join(repoRoot, 'next.config.ts'),
      'utf8',
    );

    expect(nextConfig).toContain('initOpenNextCloudflareForDev');

    const headersFile = readFileSync(
      path.join(repoRoot, 'public', '_headers'),
      'utf8',
    );

    expect(headersFile).toContain('/_next/static/*');
    expect(headersFile).toContain(
      'Cache-Control: public,max-age=31536000,immutable',
    );
  });
});
