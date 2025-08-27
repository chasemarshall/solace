/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { 
        protocol: "https", 
        hostname: "**.ttvnw.net",
        port: '',
        pathname: '/**'
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
        port: '',
        pathname: '/**'
      },
      {
        protocol: "https",
        hostname: "static-cdn.jtvnw.net",
        port: '',
        pathname: '/**'
      },
      {
        protocol: "https",
        hostname: "cdn.betterttv.net",
        port: '',
        pathname: '/**'
      },
      {
        protocol: "https",
        hostname: "cdn.frankerfacez.com",
        port: '',
        pathname: '/**'
      }
    ],
    unoptimized: false,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizePackageImports: ['tmi.js']
  }
};
module.exports = nextConfig;
