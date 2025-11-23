# Solace

A modern, feature-rich Twitch streaming platform built with Next.js 14, React 18, and Tailwind CSS. Experience Twitch like never before with enhanced chat, immersive viewing modes, and seamless authentication.

**Live Demo**: [solacestreams.vercel.app](https://solacestreams.vercel.app)

Built with love using Claude Code and vibe coding ✨

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
# Get these from https://dev.twitch.tv/console/apps
TWITCH_CLIENT_ID=your_twitch_client_id_here
TWITCH_CLIENT_SECRET=your_twitch_client_secret_here

# Site URL for OAuth and redirects (Required for production)
# This is used for OAuth redirect URIs and should match your deployed domain
NEXT_PUBLIC_SITE_URL=https://solacestreams.vercel.app

# Twitch Player Parent Domains (Required)
# Comma-separated list of domains where the Twitch player can be embedded
NEXT_PUBLIC_TWITCH_PARENT=localhost,127.0.0.1,solacestreams.vercel.app

# Development HLS Source (Optional)
# Only needed for development/testing features
NEXT_PUBLIC_DEV_HLS_SRC=your_test_hls_stream_url
```

### Database migrations

Run database migrations separately from the Next.js build so Vercel deployments don't hang waiting for a database connection:

```bash
npm run db:migrate
npm run build
```

### Twitch App Configuration

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Create a new application or edit existing
3. Add OAuth Redirect URL: `https://your-domain.com/api/auth/twitch/callback`
4. Note your Client ID and Client Secret for the `.env` file

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

### 🎮 **Enhanced Streaming Experience**
- **Dual Player Modes**: Enhanced SDK player with iframe fallback for maximum compatibility
- **Immersive Mode**: Full-screen viewing with minimal UI, perfect for focused watching
- **Smart Auto-fallback**: Automatically switches modes if primary player fails

### 💬 **Advanced Chat System**
- **Real-time Chat**: Live Twitch chat with full IRC integration
- **Third-party Emotes**: Support for BTTV, FFZ, and 7TV emotes
- **Enhanced Features**: 
  - Smart auto-scroll with manual resume controls
  - Chat badge visibility toggle
  - Reply-to functionality with visual threading
  - Improved user color enhancement for readability

### 🔐 **Seamless Authentication**
- **OAuth Integration**: One-click Twitch login with secure token handling
- **Storage Access API**: Enhanced iframe authentication for modern browsers
- **Persistent Sessions**: Your login state is remembered across visits

### ⭐ **Personalization**
- **Favorites System**: Save your favorite streamers with localStorage persistence
- **User Settings**: Customizable chat preferences and viewing options
- **Profile Management**: Clean dropdown interface for account settings

### 🎨 **Modern Interface**
- **Clean Design**: Tailwind CSS with consistent component styling
- **Responsive Layout**: Optimized for desktop and mobile viewing
- **Dark Theme**: Easy on the eyes with professional aesthetics
- **Consistent UI**: Perfectly aligned buttons and controls

## Architecture

### **Frontend Components**
```
components/
├── layout/          # Header, navigation, user profile
├── player/          # Enhanced player, chat, storage access
├── stream/          # Stream cards, favorites, follow buttons  
├── ui/              # Reusable UI elements, tooltips, error boundaries
└── dev/             # Development tools and analytics
```

### **API Routes**
- **Stream Discovery**: `/api/streams` - Live stream browsing with pagination
- **Channel Data**: `/api/channel/[login]` - User profiles, stream status, VODs
- **Search**: `/api/search` - Channel search functionality  
- **OAuth Flow**: `/api/auth/twitch/*` - Complete authentication system
- **Twitch Proxy**: Server-side Helix API calls with token management

### **Key Pages**
- **Home** (`/`): Live stream grid with infinite scroll and favorites
- **Watch** (`/watch/[channel]`): Full streaming experience with player and chat
- **Channel** (`/channel/[login]`): Channel profile and stream information

### **State Management**
- **React Context**: Immersive mode and Storage Access management
- **localStorage**: Favorites, chat preferences, authentication tokens
- **Real-time**: TMI.js for live chat and IRC events

### **Development Features**
- **Dev Mode**: HLS analytics and debugging tools at `/dev/watch/[channel]`
- **TypeScript**: Full type safety across the application
- **ESLint**: Code quality and consistency enforcement

---

## Contributing & Development

This project was built using **Claude Code** (Anthropic's CLI coding assistant) with a focus on:
- Modern React patterns and best practices
- Clean, maintainable code architecture  
- Comprehensive TypeScript typing
- Responsive design principles
- Performance optimization

The development process embraced "vibe coding" - letting creativity and user experience drive feature implementation while maintaining high code quality standards.

**Tech Stack**: Next.js 14 • React 18 • TypeScript • Tailwind CSS • TMI.js • HLS.js

---

## License

Built with ❤️ by the open source community. Feel free to fork, modify, and improve!
