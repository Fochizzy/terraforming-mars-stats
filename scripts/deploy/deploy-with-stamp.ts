import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDeploymentStampEnv } from '../../src/lib/deploy/build-deployment-stamp-env';

/**
 * Stamped production deploy.
 *
 * Wraps `opennextjs-cloudflare build && opennextjs-cloudflare deploy` so every
 * release carries machine-verifiable provenance: repository, branch, full
 * commit SHA, build timestamp, and environment, baked into the artifact via
 * `next.config.ts` and served by `/api/deploy-info`.
 *
 * The release is refused when:
 *   - the commit SHA cannot be resolved (unstamped deploys are how production
 *     provenance was lost in the first place);
 *   - the working tree is dirty (the deployed artifact would not match the
 *     stamped commit).
 *
 * `npm run deploy` still runs the schema-compatibility gate first through the
 * `predeploy` hook; this script is the step after that gate passes.
 */

function git(args: string[]) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function resolveRepositoryIdentifier() {
  const explicit = process.env.TM_STATS_SOURCE_REPOSITORY?.trim();
  if (explicit) {
    return explicit;
  }

  const remoteUrl = git(['config', '--get', 'remote.origin.url']);
  return remoteUrl
    .replace(/^git@([^:]+):/, '$1/')
    .replace(/^https?:\/\//, '')
    .replace(/\.git$/, '');
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`);
  }
}

function main() {
  const dirtyPaths = git(['status', '--porcelain']);
  if (dirtyPaths) {
    throw new Error(
      `Refusing to deploy from a dirty working tree; the artifact would not match the stamped commit. Offending paths:\n${dirtyPaths}`,
    );
  }

  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
  ) as { version?: string };

  const stampEnv = buildDeploymentStampEnv({
    appVersion: packageJson.version ?? '0.0.0',
    buildTimestamp: new Date().toISOString(),
    environment: process.env.TM_STATS_DEPLOY_ENVIRONMENT?.trim() || 'production',
    sourceBranch:
      process.env.TM_STATS_SOURCE_BRANCH?.trim() ||
      git(['rev-parse', '--abbrev-ref', 'HEAD']),
    sourceCommit:
      process.env.TM_STATS_SOURCE_COMMIT?.trim() || git(['rev-parse', 'HEAD']),
    sourceRepository: resolveRepositoryIdentifier(),
  });

  console.log('Deployment stamp for this release:');
  for (const [key, value] of Object.entries(stampEnv)) {
    console.log(`  ${key}=${value}`);
  }

  const env = { ...process.env, ...stampEnv };

  run('npx', ['opennextjs-cloudflare', 'build'], env);
  run('npx', ['opennextjs-cloudflare', 'deploy'], env);

  console.log(
    [
      '',
      'Deployed with stamp. Now:',
      '  1. run `npx wrangler deployments list` and record the new version id',
      '     with this commit in DEPLOY-STATE.md;',
      '  2. verify /api/deploy-info on production reports',
      `     sourceCommit=${stampEnv.TM_STATS_SOURCE_COMMIT}.`,
    ].join('\n'),
  );
}

main();
