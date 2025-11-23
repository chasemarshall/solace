/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['tmi.js']
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static-cdn.jtvnw.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.twitch.tv',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Note: CSP headers are managed in middleware.ts for better control and consistency
};

module.exports = nextConfig;
