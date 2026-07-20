import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDeploymentStampEnv } from './build-deployment-stamp-env';
import {
  UNKNOWN_STAMP_VALUE,
  resolveDeploymentStamp,
} from './deployment-stamp';

describe('resolveDeploymentStamp', () => {
  it('returns the configured values exactly', () => {
    const stamp = resolveDeploymentStamp({
      TM_STATS_APP_VERSION: '0.1.0',
      TM_STATS_BUILD_TIMESTAMP: '2026-07-20T18:00:00.000Z',
      TM_STATS_DEPLOY_ENVIRONMENT: 'production',
      TM_STATS_SOURCE_BRANCH: 'release/step-43-production-compatibility',
      TM_STATS_SOURCE_COMMIT: 'a'.repeat(40),
      TM_STATS_SOURCE_REPOSITORY:
        'github.com/Fochizzy/terraforming-mars-stats',
    });

    expect(stamp).toEqual({
      appVersion: '0.1.0',
      buildTimestamp: '2026-07-20T18:00:00.000Z',
      environment: 'production',
      sourceBranch: 'release/step-43-production-compatibility',
      sourceCommit: 'a'.repeat(40),
      sourceRepository: 'github.com/Fochizzy/terraforming-mars-stats',
    });
  });

  it('reports absent or blank metadata as unknown rather than fabricating it', () => {
    const stamp = resolveDeploymentStamp({
      TM_STATS_BUILD_TIMESTAMP: '   ',
      TM_STATS_SOURCE_COMMIT: undefined,
    });

    expect(stamp.appVersion).toBe(UNKNOWN_STAMP_VALUE);
    expect(stamp.buildTimestamp).toBe(UNKNOWN_STAMP_VALUE);
    expect(stamp.environment).toBe(UNKNOWN_STAMP_VALUE);
    expect(stamp.sourceBranch).toBe(UNKNOWN_STAMP_VALUE);
    expect(stamp.sourceCommit).toBe(UNKNOWN_STAMP_VALUE);
    expect(stamp.sourceRepository).toBe(UNKNOWN_STAMP_VALUE);
  });

  it('never serializes secret environment values, even when they are present', () => {
    const hostileEnv = {
      NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: 'secret-actions-key',
      RESEND_API_KEY: 'secret-resend-key',
      SUPABASE_SERVICE_ROLE_KEY: 'secret-service-role',
      TM_STATS_SOURCE_COMMIT: 'b'.repeat(40),
    };

    const serialized = JSON.stringify(
      resolveDeploymentStamp(hostileEnv as never),
    );

    expect(serialized).toContain('b'.repeat(40));
    expect(serialized).not.toContain('secret-actions-key');
    expect(serialized).not.toContain('secret-resend-key');
    expect(serialized).not.toContain('secret-service-role');
    expect(serialized).not.toContain('SERVICE_ROLE');
  });

  it('does not substitute a local Git value when the stamp is absent in production mode', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    // NODE_ENV is read-only in the type surface; tests may rewrite it.
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

    try {
      const stamp = resolveDeploymentStamp({});
      expect(stamp.sourceCommit).toBe(UNKNOWN_STAMP_VALUE);
      expect(stamp.sourceBranch).toBe(UNKNOWN_STAMP_VALUE);
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV =
        previousNodeEnv;
    }
  });

  it('has no Git or shell escape hatch it could silently fall back to', () => {
    const source = readFileSync(
      resolve(__dirname, 'deployment-stamp.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/child_process|execSync|spawn|git rev-parse/);
  });
});

describe('buildDeploymentStampEnv', () => {
  const validSource = {
    appVersion: '0.1.0',
    buildTimestamp: '2026-07-20T18:00:00.000Z',
    environment: 'production',
    sourceBranch: 'release/step-43-production-compatibility',
    sourceCommit: 'c'.repeat(40),
    sourceRepository: 'github.com/Fochizzy/terraforming-mars-stats',
  };

  it('produces the env block for a fully specified release', () => {
    expect(buildDeploymentStampEnv(validSource)).toEqual({
      TM_STATS_APP_VERSION: '0.1.0',
      TM_STATS_BUILD_TIMESTAMP: '2026-07-20T18:00:00.000Z',
      TM_STATS_DEPLOY_ENVIRONMENT: 'production',
      TM_STATS_SOURCE_BRANCH: 'release/step-43-production-compatibility',
      TM_STATS_SOURCE_COMMIT: 'c'.repeat(40),
      TM_STATS_SOURCE_REPOSITORY:
        'github.com/Fochizzy/terraforming-mars-stats',
    });
  });

  it.each([
    ['', 'empty'],
    ['abc123', 'short'],
    ['c'.repeat(39), '39 characters'],
    ['not-a-sha-not-a-sha-not-a-sha-not-a-sha!', 'non-hex'],
  ])('blocks the release when the commit SHA is %s (%s)', (sourceCommit) => {
    expect(() =>
      buildDeploymentStampEnv({ ...validSource, sourceCommit }),
    ).toThrow(/full 40-character commit SHA/);
  });

  it('blocks the release when any other stamp field is empty', () => {
    expect(() =>
      buildDeploymentStampEnv({ ...validSource, sourceBranch: '  ' }),
    ).toThrow(/sourceBranch/);
    expect(() =>
      buildDeploymentStampEnv({ ...validSource, environment: '' }),
    ).toThrow(/environment/);
  });

  it('normalizes the commit to lowercase without altering its identity', () => {
    const env = buildDeploymentStampEnv({
      ...validSource,
      sourceCommit: 'C'.repeat(40),
    });

    expect(env.TM_STATS_SOURCE_COMMIT).toBe('c'.repeat(40));
  });
});
