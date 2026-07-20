/**
 * Runtime-verifiable deployment provenance.
 *
 * The values are injected by the deploy command (`npm run deploy`, which runs
 * `scripts/deploy/deploy-with-stamp.ts`) and baked into the build through the
 * `env` block in `next.config.ts`. They are compile-time constants of the
 * artifact: a later `wrangler secret put` or vars change publishes a new worker
 * version but cannot alter what this module reports, so the stamp always
 * describes the code that is actually running.
 *
 * Absent values are reported as the literal string `unknown` — never derived
 * from the local Git checkout, timestamps, migration names, or package
 * metadata. A stamp of unknowns means the build was produced outside the
 * stamped deploy path and is not provable; that is a fact worth surfacing, not
 * papering over.
 *
 * The stamp is not secret (it is compiled into the served bundles), so it must
 * only ever carry provenance facts: repository, branch, commit, build time,
 * environment, app version. Secrets and connection strings must never be added
 * here.
 */

export const UNKNOWN_STAMP_VALUE = 'unknown';

export type DeploymentStamp = {
  appVersion: string;
  buildTimestamp: string;
  environment: string;
  sourceBranch: string;
  sourceCommit: string;
  sourceRepository: string;
};

export type DeploymentStampEnv = {
  TM_STATS_APP_VERSION?: string | undefined;
  TM_STATS_BUILD_TIMESTAMP?: string | undefined;
  TM_STATS_DEPLOY_ENVIRONMENT?: string | undefined;
  TM_STATS_SOURCE_BRANCH?: string | undefined;
  TM_STATS_SOURCE_COMMIT?: string | undefined;
  TM_STATS_SOURCE_REPOSITORY?: string | undefined;
};

function stampValue(raw: string | undefined) {
  const trimmed = raw?.trim() ?? '';
  return trimmed ? trimmed : UNKNOWN_STAMP_VALUE;
}

/**
 * Build the stamp from an explicit env snapshot. Only the six allow-listed
 * keys are ever read, and only the six stamp fields are ever returned, so no
 * other environment value can leak through this path.
 */
export function resolveDeploymentStamp(env: DeploymentStampEnv): DeploymentStamp {
  return {
    appVersion: stampValue(env.TM_STATS_APP_VERSION),
    buildTimestamp: stampValue(env.TM_STATS_BUILD_TIMESTAMP),
    environment: stampValue(env.TM_STATS_DEPLOY_ENVIRONMENT),
    sourceBranch: stampValue(env.TM_STATS_SOURCE_BRANCH),
    sourceCommit: stampValue(env.TM_STATS_SOURCE_COMMIT),
    sourceRepository: stampValue(env.TM_STATS_SOURCE_REPOSITORY),
  };
}

/**
 * The deployed artifact's stamp. Each `process.env` member is referenced
 * explicitly so `next build` inlines the value that was present at build time.
 */
export function getDeploymentStamp(): DeploymentStamp {
  return resolveDeploymentStamp({
    TM_STATS_APP_VERSION: process.env.TM_STATS_APP_VERSION,
    TM_STATS_BUILD_TIMESTAMP: process.env.TM_STATS_BUILD_TIMESTAMP,
    TM_STATS_DEPLOY_ENVIRONMENT: process.env.TM_STATS_DEPLOY_ENVIRONMENT,
    TM_STATS_SOURCE_BRANCH: process.env.TM_STATS_SOURCE_BRANCH,
    TM_STATS_SOURCE_COMMIT: process.env.TM_STATS_SOURCE_COMMIT,
    TM_STATS_SOURCE_REPOSITORY: process.env.TM_STATS_SOURCE_REPOSITORY,
  });
}
