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
    // Deploys go through the stamping wrapper so every release carries a
    // runtime-verifiable source commit; the wrapper still runs the
    // opennextjs-cloudflare build + deploy pair.
    expect(packageJson.scripts?.deploy).toBe(
      'tsx scripts/deploy/deploy-with-stamp.ts',
    );

    const deployScript = readFileSync(
      path.join(repoRoot, 'scripts/deploy/deploy-with-stamp.ts'),
      'utf8',
    );

    expect(deployScript).toContain("['opennextjs-cloudflare', 'build']");
    expect(deployScript).toContain("['opennextjs-cloudflare', 'deploy']");
    expect(deployScript).toContain('buildDeploymentStampEnv');
    expect(packageJson.scripts?.['cf-typegen']).toBe(
      'wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts',
    );
  });

  it('commits the manual Workers config files', () => {
    expect(existsSync(path.join(repoRoot, 'wrangler.jsonc'))).toBe(true);
    expect(existsSync(path.join(repoRoot, 'open-next.config.ts'))).toBe(true);
  });
});
