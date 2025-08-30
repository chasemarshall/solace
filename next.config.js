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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://embed.twitch.tv https://player.twitch.tv https://static.twitchcdn.net https://solace.heysonder.xyz https://*.twitch.tv",
              "frame-src 'self' https://player.twitch.tv https://embed.twitch.tv https://www.twitch.tv https://*.twitch.tv",
              "connect-src 'self' https://api.twitch.tv https://gql.twitch.tv https://id.twitch.tv https://static-cdn.jtvnw.net https://vitals.vercel-insights.com wss://irc-ws.chat.twitch.tv https://api.betterttv.net https://api.frankerfacez.com https://7tv.io https://cdn.7tv.app",
              "img-src 'self' data: https: blob: https://*.twitch.tv https://static-cdn.jtvnw.net https://cdn.betterttv.net https://cdn.frankerfacez.com https://cdn.7tv.app",
              "media-src 'self' https: blob: https://*.twitch.tv https://static-cdn.jtvnw.net",
              "style-src 'self' 'unsafe-inline' https: https://*.twitch.tv",
              "font-src 'self' https: data: https://*.twitch.tv",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'"
            ].join('; ')
          }
        ]
      }
    ]
  }
};

module.exports = nextConfig;
