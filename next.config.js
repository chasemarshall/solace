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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://embed.twitch.tv https://player.twitch.tv https://static.twitchcdn.net https://solace.heysonder.xyz",
              "frame-src 'self' https://player.twitch.tv https://embed.twitch.tv https://www.twitch.tv",
              "connect-src 'self' https://api.twitch.tv https://gql.twitch.tv https://pubsub-edge.twitch.tv wss://pubsub-edge.twitch.tv https://irc-ws.chat.twitch.tv wss://irc-ws.chat.twitch.tv https://solace.heysonder.xyz",
              "img-src 'self' data: https: blob:",
              "media-src 'self' https: blob:",
              "style-src 'self' 'unsafe-inline' https:",
              "font-src 'self' https: data:",
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
