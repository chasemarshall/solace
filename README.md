# Modern Twitch (Starter)

A clean, modern Twitch web client built with Next.js App Router + Tailwind. Public browsing only (no login). Uses server-side Helix calls with an App Access Token.

## Quick start (local)
```bash
cp .env.example .env
npm install
npm run dev
# open http://localhost:3000
```

## Environment Setup

Create a `.env` file with the following variables:

```env
# Twitch API Credentials (Required)
# Get these from https://dev.twitch.tv/console
TWITCH_CLIENT_ID=your_twitch_client_id_here
TWITCH_CLIENT_SECRET=your_twitch_client_secret_here

# Base URL for your application (Required)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Twitch Player Parent Domains (Required)
# Comma-separated list of domains where the Twitch player can be embedded
NEXT_PUBLIC_TWITCH_PARENT=localhost,127.0.0.1,your-domain.com

# Chat Configuration (Optional)
# Only needed if you want to send chat messages
TWITCH_CHAT_USERNAME=your_twitch_username
TWITCH_CHAT_OAUTH=oauth:your_oauth_token_here
```

## Docker (production build)
```bash
docker compose up --build -d
# open http://localhost:8080
```

## Player Modes

The app includes two player modes:

- **Basic Mode**: Uses Twitch's iframe embed (more reliable, fewer features)
- **Enhanced Mode**: Uses Twitch's JavaScript SDK (more features, better control)

The player automatically falls back to Basic mode if Enhanced mode fails to load.

## Troubleshooting

### Player Issues
- **Blank player / CSP errors**: Ensure your domain is listed in `NEXT_PUBLIC_TWITCH_PARENT`
- **Enhanced mode not working**: Check browser console for CORS errors. Basic mode works without restrictions
- **iOS playback stuck**: Enhanced mode starts muted for autoplay compatibility. Use the "Unmute Stream" button
- **Player not loading**: Try switching between Basic and Enhanced modes using the toggle buttons

### Chat Issues
- **Can't send chat messages**: Set `TWITCH_CHAT_USERNAME` and `TWITCH_CHAT_OAUTH` in your `.env`
- **Chat not connecting**: Check your network connection and firewall settings

### General Issues
- **API errors**: Verify your Twitch API credentials are correct
- **Build errors**: Ensure all dependencies are installed with `npm install`

## Features

- **Enhanced Player**: Better control, unmute prompts, error recovery
- **Auto-fallback**: Automatically switches to Basic mode if Enhanced mode fails
- **Error Handling**: Detailed error messages and retry logic
- **Responsive Design**: Works on desktop and mobile devices
- **Chat Integration**: Real-time chat with emote support
- **Stream Discovery**: Browse live streams and top games

## Included
- Home: Now Live grid (infinite scroll)
- Watch page: embedded Twitch player + chat
- Channel API: user + live status + VODs + clips
- Top Games API
- Server-side Helix proxy with in-memory token cache
