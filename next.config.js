/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    nodeMiddleware: true,
  },
};

module.exports = nextConfig;
