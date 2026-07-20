import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deployment provenance, injected by `scripts/deploy/deploy-with-stamp.ts`
  // and baked into the artifact at build time so no later vars/secret change
  // can alter what the running worker reports about its own source. Plain
  // `next build` leaves them blank and the stamp reports `unknown`.
  env: {
    TM_STATS_APP_VERSION: process.env.TM_STATS_APP_VERSION ?? '',
    TM_STATS_BUILD_TIMESTAMP: process.env.TM_STATS_BUILD_TIMESTAMP ?? '',
    TM_STATS_DEPLOY_ENVIRONMENT: process.env.TM_STATS_DEPLOY_ENVIRONMENT ?? '',
    TM_STATS_SOURCE_BRANCH: process.env.TM_STATS_SOURCE_BRANCH ?? '',
    TM_STATS_SOURCE_COMMIT: process.env.TM_STATS_SOURCE_COMMIT ?? '',
    TM_STATS_SOURCE_REPOSITORY: process.env.TM_STATS_SOURCE_REPOSITORY ?? '',
  },
  experimental: {
    serverActions: {
      // Game result evidence is submitted through a server action. Screenshots
      // fit inside the 1 MB default, but a printed result PDF embeds the card
      // art and runs to a few megabytes.
      bodySizeLimit: '12mb',
    },
  },
};

export default nextConfig;
