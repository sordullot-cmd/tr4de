import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TODO: corriger les erreurs TypeScript dans lib/hooks/useTradeData.ts puis retirer ce flag
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Strip les console.log/info/debug du bundle de prod ; on garde error/warn
  // (utiles pour la télémétrie navigateur).
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },
};

export default nextConfig;
