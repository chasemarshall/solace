/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://embed.twitch.tv https://player.twitch.tv https://static.twitchcdn.net https://solace.heysonder.xyz https://*.twitch.tv",
              "frame-src 'self' https://player.twitch.tv https://embed.twitch.tv https://www.twitch.tv https://*.twitch.tv",
              "connect-src 'self' https://api.twitch.tv https://gql.twitch.tv https://pubsub-edge.twitch.tv wss://pubsub-edge.twitch.tv https://irc-ws.chat.twitch.tv wss://irc-ws.chat.twitch.tv https://solace.heysonder.xyz https://*.twitch.tv",
              "img-src 'self' data: https: blob: https://*.twitch.tv https://static-cdn.jtvnw.net",
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
