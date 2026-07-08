import('@opennextjs/cloudflare').then((module) =>
  module.initOpenNextCloudflareForDev(),
);

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
