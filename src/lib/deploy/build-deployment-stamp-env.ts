import type { DeploymentStampEnv } from './deployment-stamp';

const FULL_COMMIT_SHA = /^[0-9a-f]{40}$/;

export type DeploymentStampSource = {
  appVersion: string;
  buildTimestamp: string;
  environment: string;
  sourceBranch: string;
  sourceCommit: string;
  sourceRepository: string;
};

/**
 * Validate the provenance resolved by the deploy command and turn it into the
 * env block the build bakes in. This is the release gate the assignment
 * requires: a production deploy is refused outright when the full commit SHA
 * is missing, rather than shipping an artifact whose provenance would have to
 * be reconstructed forensically later.
 */
export function buildDeploymentStampEnv(
  source: DeploymentStampSource,
): Required<DeploymentStampEnv> {
  const commit = source.sourceCommit.trim().toLowerCase();

  if (!FULL_COMMIT_SHA.test(commit)) {
    throw new Error(
      `A full 40-character commit SHA is required to stamp a release; got ${JSON.stringify(
        source.sourceCommit,
      )}. Deploy from a Git worktree (or set TM_STATS_SOURCE_COMMIT) so the deployed code stays provable.`,
    );
  }

  const requireValue = (label: string, raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new Error(`Deployment stamp field ${label} must not be empty.`);
    }
    return trimmed;
  };

  return {
    TM_STATS_APP_VERSION: requireValue('appVersion', source.appVersion),
    TM_STATS_BUILD_TIMESTAMP: requireValue(
      'buildTimestamp',
      source.buildTimestamp,
    ),
    TM_STATS_DEPLOY_ENVIRONMENT: requireValue(
      'environment',
      source.environment,
    ),
    TM_STATS_SOURCE_BRANCH: requireValue('sourceBranch', source.sourceBranch),
    TM_STATS_SOURCE_COMMIT: commit,
    TM_STATS_SOURCE_REPOSITORY: requireValue(
      'sourceRepository',
      source.sourceRepository,
    ),
  };
}
