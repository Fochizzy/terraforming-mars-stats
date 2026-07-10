import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
