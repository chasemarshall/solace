# Modern Twitch (Starter)

A clean, modern Twitch web client built with Next.js App Router + Tailwind. Public browsing only (no login). Uses server-side Helix calls with an App Access Token.

## Quick start (local)
```bash
cp .env.example .env
npm install
npm run dev
# open http://localhost:3000
```

## Docker (production build)
```bash
docker compose up --build -d
# open http://localhost:8080
```

Set env vars:
- TWITCH_CLIENT_ID
- TWITCH_CLIENT_SECRET
- NEXT_PUBLIC_BASE_URL (e.g., https://your.domain or http://localhost:8080)
- NEXT_PUBLIC_TWITCH_PARENT (your public hostname for Twitch embed)

> Twitch Player & Chat iframes require the `parent` query param to match your public host.

## Included
- Home: Now Live grid (infinite scroll)
- Watch page: embedded Twitch player + chat
- Channel API: user + live status + VODs + clips
- Top Games API
- Server-side Helix proxy with in-memory token cache
