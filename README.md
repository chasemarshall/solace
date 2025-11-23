# Solace

A modern, feature-rich Twitch streaming platform built with Next.js 14, React 18, TypeScript, and Tailwind CSS. Experience Twitch with enhanced chat, immersive viewing modes, persistent user data, and seamless authentication.

**Live Demo**: [solacestreams.vercel.app](https://solacestreams.vercel.app)

Built with love using Claude Code and vibe coding ✨

## Table of Contents
- [Quick Start](#quick-start-local)
- [Features](#features)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Architecture](#architecture)
- [Deployment](#deployment)
- [Contributing](#contributing--development)

## Quick Start (Local)

```bash
# 1. Clone and install dependencies
cp .env.example .env
npm install

# 2. Set up your environment variables (see Environment Setup below)
# Edit .env with your Twitch API credentials and database URL

# 3. Set up the database
npm run db:push

# 4. Start the development server
npm run dev
# open http://localhost:3000
```

## Environment Setup

Create a `.env` file with the following variables:

```env
# Database (Required)
# For Supabase: Use POSTGRES_PRISMA_URL (pooled connection optimized for Prisma)
# For Vercel Postgres: Create a database in Storage tab and use POSTGRES_PRISMA_URL
# For local dev: Use a local Postgres instance connection string
POSTGRES_PRISMA_URL=postgresql://user:password@host:5432/database

# Twitch API Credentials (Required)
# Get these from https://dev.twitch.tv/console/apps
TWITCH_CLIENT_ID=your_twitch_client_id_here
TWITCH_CLIENT_SECRET=your_twitch_client_secret_here

# Base URL (Required)
# This is used for OAuth redirect URIs and should match your deployed domain
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Twitch Player Parent Domains (Required)
# Comma-separated list of domains where the Twitch player can be embedded
NEXT_PUBLIC_TWITCH_PARENT=localhost,127.0.0.1,solacestreams.vercel.app

# Chat Credentials (Optional - for sending chat messages)
# Get OAuth token from https://twitchapps.com/tmi/
TWITCH_CHAT_USERNAME=your_twitch_username
TWITCH_CHAT_OAUTH=oauth:your_oauth_token

# Dev Mode Configuration (Optional)
ENABLE_AD_BLOCKER=true
NODE_ENV=development
DEV_MODE_ENABLED=true
DEV_ANALYTICS_ENABLED=true
DEV_DEBUG_LOGGING=true
DEV_EXPORT_DATA=true

# Security Settings for Dev Environment (Optional)
DEV_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
DEV_MAX_REQUESTS_PER_MINUTE=1000
```

### Twitch App Configuration

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Create a new application or edit existing
3. Add OAuth Redirect URL: `https://your-domain.com/api/auth/twitch/callback`
4. Add OAuth Redirect URL for local dev: `http://localhost:3000/api/auth/twitch/callback`
5. Note your Client ID and Client Secret for the `.env` file

## Database Setup

This project uses **PostgreSQL** with **Prisma ORM** for persistent user data. See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions.

### Quick Setup

```bash
# Option 1: Push schema to database (recommended for first-time setup)
npm run db:push

# Option 2: Run migrations (recommended for production)
npm run db:migrate

# View/edit database with Prisma Studio
npm run db:studio
```

### Database Features

- **User Management**: Stores user profiles linked to Twitch accounts
- **Favorites**: Save favorite streamers with database persistence (auto-migrates from localStorage)
- **Follows**: Track followed channels with timestamps (auto-migrates from localStorage)
- **User Preferences**: Chat settings, proxy selection, and more (auto-migrates from localStorage)

The app automatically migrates data from localStorage to the database on first authenticated visit.

## Docker (Production Build)

```bash
docker compose up --build -d
# open http://localhost:8080
```

## Features

### 🎮 **Enhanced Streaming Experience**
- **Dual Player Modes**:
  - Enhanced SDK player with Twitch Embed API
  - TTV LOL Pro Player with ad-free proxy support
  - Basic iframe fallback for maximum compatibility
- **Immersive Mode**: Full-screen viewing with minimal UI, perfect for focused watching
- **Smart Auto-fallback**: Automatically switches modes if primary player fails
- **Stream Discovery**: Browse live streams with infinite scroll and pagination
- **Top Games**: Explore trending games and find new content

### 💬 **Advanced Chat System**
- **Real-time Chat**: Live Twitch chat with full TMI.js IRC integration
- **Third-party Emotes**: Support for BTTV, FFZ, and 7TV emotes with auto-loading
- **Enhanced Chat Features**:
  - Smart auto-scroll with manual resume controls
  - Chat badge visibility toggle
  - Reply-to functionality with visual threading
  - User color enhancement for improved readability
  - Customizable font size
  - Optional timestamps
  - Chat message sending (with proper OAuth)

### 🔐 **Authentication & User Management**
- **OAuth 2.0 Integration**: Secure one-click Twitch login
- **Storage Access API**: Enhanced iframe authentication for modern browsers
- **Database-backed Sessions**: Persistent user data across devices
- **Automatic Migration**: Seamlessly migrates localStorage data to database

### ⭐ **Personalization & Persistence**
- **Favorites System**: Save favorite streamers with database persistence
- **Follows Tracking**: Track followed channels with timestamps and live status
- **User Preferences**:
  - Chat settings (font size, timestamps)
  - Proxy selection preferences
  - Player mode preferences
- **Profile Management**: Clean dropdown interface for account settings and logout

### 🎨 **Modern Interface**
- **Clean Design**: Tailwind CSS with consistent component styling
- **Responsive Layout**: Optimized for desktop and mobile viewing
- **Dark Theme**: Professional dark theme easy on the eyes
- **Consistent UI**: Perfectly aligned buttons and controls
- **Error Boundaries**: Graceful error handling with fallback UI
- **Loading States**: Smooth loading indicators and skeleton screens

### 🔧 **Developer Features**
- **Dev Mode**: Special `/dev/watch/[channel]` route with advanced debugging
- **HLS Analytics**: Real-time stream analytics and quality monitoring
- **Debug Logging**: Detailed console logging for troubleshooting
- **Data Export**: Export analytics data for analysis
- **CSP Configuration**: Strict Content Security Policy for enhanced security
- **TypeScript**: Full type safety across the entire application

## Architecture

### **Tech Stack**
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, TypeScript, Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Video**: HLS.js for stream playback, Twitch Embed API
- **Chat**: TMI.js for Twitch IRC integration
- **State**: React Context API, Zustand
- **Icons**: Lucide React
- **Sanitization**: DOMPurify for XSS protection
- **Analytics**: Vercel Analytics

### **Project Structure**
```
solace/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes (Next.js Route Handlers)
│   │   ├── auth/           # Twitch OAuth flow & token management
│   │   ├── channel/        # Channel data & stream status
│   │   ├── dev-proxy/      # Development proxy for testing
│   │   ├── favorites/      # User favorites CRUD
│   │   ├── follows/        # User follows CRUD
│   │   ├── games/          # Top games from Twitch
│   │   ├── hls/            # HLS stream proxy
│   │   ├── preferences/    # User preferences management
│   │   ├── proxy/          # Twitch API proxy
│   │   ├── search/         # Channel search
│   │   ├── streams/        # Live streams discovery
│   │   └── twitch/         # Twitch token management
│   ├── channel/[login]/    # Channel profile pages
│   ├── dev/watch/[channel]/ # Dev mode watch page
│   ├── watch/[channel]/    # Main watch page
│   ├── layout.tsx          # Root layout with header
│   └── page.tsx            # Home page (live streams grid)
├── components/
│   ├── dev/               # Dev mode components (analytics, debug)
│   ├── layout/            # Header, navigation, user profile
│   ├── player/            # Player components & chat
│   ├── stream/            # Stream cards, favorites, follow buttons
│   └── ui/                # Reusable UI (tooltips, error boundaries)
├── contexts/               # React contexts (favorites, immersive mode)
├── hooks/                  # Custom React hooks
├── lib/
│   ├── dev/               # Dev mode configuration
│   ├── twitch/            # Twitch API integration & proxies
│   ├── utils/             # General utilities
│   └── video/             # Video playback & HLS utilities
├── prisma/
│   ├── migrations/        # Database migrations
│   └── schema.prisma      # Database schema
├── public/                # Static assets
└── types/                 # TypeScript type definitions
```

### **API Routes**

#### Authentication
- `GET /api/auth/twitch` - Initiate OAuth flow
- `GET /api/auth/twitch/callback` - OAuth callback handler
- `GET /api/auth/chat-token` - Get chat authentication token
- `GET /api/twitch/token` - Get Twitch API token

#### Streams & Channels
- `GET /api/streams` - Browse live streams (paginated)
- `GET /api/channel/[login]` - Get channel info & stream status
- `GET /api/search` - Search for channels
- `GET /api/games/top` - Get top games on Twitch

#### User Data (Database-backed)
- `GET /api/favorites` - Get user's favorite channels
- `POST /api/favorites` - Add a favorite
- `DELETE /api/favorites` - Remove a favorite
- `GET /api/follows` - Get user's followed channels
- `POST /api/follows` - Follow a channel
- `DELETE /api/follows` - Unfollow a channel
- `PATCH /api/follows` - Update last live timestamp
- `GET /api/preferences` - Get user preferences
- `PATCH /api/preferences` - Update user preferences

#### Proxies & Dev Tools
- `GET /api/proxy` - Proxy Twitch Helix API calls
- `GET /api/hls` - HLS stream proxy
- `POST /api/dev-proxy` - Development proxy with analytics

### **Key Pages**
- **Home** (`/`): Live stream grid with infinite scroll, favorites section
- **Watch** (`/watch/[channel]`): Full streaming experience with player, chat, and controls
- **Channel** (`/channel/[login]`): Channel profile and stream information
- **Dev Watch** (`/dev/watch/[channel]`): Development mode with HLS analytics

### **State Management**
- **React Context API**:
  - `FavoritesContext` - Favorites state synced with database
  - `ImmersiveContext` - Immersive mode toggle
- **Zustand**: Lightweight state management for UI state
- **Prisma Client**: Database queries and mutations
- **TMI.js**: Real-time chat state and IRC events

### **Database Schema**
- **User**: Twitch user profiles (twitchId, username, email, avatar)
- **Favorite**: User's favorite channels (many-to-many with User)
- **Follow**: User's followed channels with timestamps
- **UserPreference**: Chat settings, proxy preferences, etc.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Add Vercel Postgres database from Storage tab
5. Deploy
6. After first deployment, run migrations:
   ```bash
   # In Vercel terminal or locally with production DATABASE_URL
   npm run db:migrate
   ```

### Docker

```bash
# Build and run
docker compose up --build -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Manual Deployment

```bash
# 1. Set up environment variables
# 2. Set up PostgreSQL database
# 3. Run migrations
npm run db:migrate

# 4. Build
npm run build

# 5. Start
npm start
```

## Troubleshooting

### Player Issues
- **Blank player / CSP errors**: Ensure your domain is listed in `NEXT_PUBLIC_TWITCH_PARENT`
- **Enhanced mode not working**: Check browser console for CORS errors
- **iOS playback stuck**: Enhanced mode starts muted for autoplay compatibility - use the unmute button
- **Player not loading**: Try switching between different player modes using toggle buttons
- **"Autoplay disabled" error**: Container visibility issue - refresh the page

### Chat Issues
- **Can't send chat messages**: Set `TWITCH_CHAT_USERNAME` and `TWITCH_CHAT_OAUTH` in `.env`
- **Chat not connecting**: Check network connection and firewall settings for WebSocket connections
- **Emotes not loading**: Check browser console for BTTV/FFZ/7TV API errors
- **Chat colors not showing**: Ensure DOMPurify is not blocking inline styles

### Database Issues
- **"Prisma Client not generated"**: Run `npx prisma generate`
- **"Table does not exist"**: Run `npm run db:push` or `npm run db:migrate`
- **Connection errors**: Verify `POSTGRES_PRISMA_URL` is correct and database is accessible
- **Migration hanging on Vercel**: Run migrations separately before build (see Database Setup)

### Authentication Issues
- **OAuth redirect error**: Ensure callback URL is added to Twitch app settings
- **"Invalid client" error**: Verify `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` are correct
- **User not staying logged in**: Check that cookies are enabled in browser
- **CORS errors**: Ensure `NEXT_PUBLIC_BASE_URL` matches your actual domain

### Build Issues
- **TypeScript errors**: Run `npm run typecheck` to see all type errors
- **ESLint errors**: Run `npm run lint` to see linting issues
- **Build hanging**: Check that database is accessible (builds skip migrations by default)
- **Out of memory**: Increase Node.js heap size: `NODE_OPTIONS=--max-old-space-size=4096 npm run build`

### General Issues
- **API rate limiting**: Twitch API has rate limits - implement caching if hitting limits
- **HTTPS required for some features**: Storage Access API and some OAuth features require HTTPS
- **Ad-blocking concerns**: See [IMPROVEMENTS.md](./IMPROVEMENTS.md) for legal/ToS considerations

## Contributing & Development

### Development Workflow

This project was built using **Claude Code** (Anthropic's CLI coding assistant) with a focus on:
- Modern React patterns and best practices
- Clean, maintainable code architecture
- Comprehensive TypeScript typing
- Responsive design principles
- Performance optimization

The development process embraced "vibe coding" - letting creativity and user experience drive feature implementation while maintaining high code quality standards.

### Code Style

- Follow the conventions in [CLAUDE.md](./CLAUDE.md)
- Use TypeScript for all new code
- Follow ESLint rules: `npm run lint`
- Use Tailwind CSS for styling
- Prefer functional components with hooks
- Add proper error boundaries for new features

### Branch Naming
- `feature/your-description` - New features
- `bugfix/issue-description` - Bug fixes
- `refactor/component-name` - Refactoring

### Commit Messages
Format: `<type>(<scope>): brief summary`

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`

Examples:
- `feat(chat): add emote autocomplete`
- `fix(player): resolve autoplay issue on iOS`
- `docs(readme): update setup instructions`

### Key Documentation
- [CLAUDE.md](./CLAUDE.md) - Project conventions and guidelines
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Database setup instructions
- [IMPROVEMENTS.md](./IMPROVEMENTS.md) - Comprehensive improvement plan and code analysis
- [AGENTS.md](./AGENTS.md) - Information about AI agents
- [CHANGES.md](./CHANGES.md) - Changelog

### Testing
Currently, the project has zero test coverage. Contributions adding tests are highly welcome!

Suggested testing frameworks:
- Jest + React Testing Library for components
- Playwright for E2E testing
- Vitest for faster unit tests

---

## Important Notes

### Legal & Terms of Service

This project includes features that may violate Twitch's Terms of Service, particularly:
- Ad-blocking proxy implementations
- HLS manifest manipulation to skip ads
- Third-party proxy services for ad-free playback

**⚠️ Warning**: Using these features may result in:
- Account suspension or ban
- API access revocation
- Legal action from Twitch

See [IMPROVEMENTS.md](./IMPROVEMENTS.md) for a comprehensive analysis of ToS violations and legal risks.

**Recommendation**: For production use, remove ad-blocking features and use official Twitch Embed API only.

---

## License

MIT License - Built with ❤️ by the open source community

Feel free to fork, modify, and improve! Contributions are welcome.

---

**Tech Stack**: Next.js 14 • React 18 • TypeScript • Tailwind CSS • PostgreSQL • Prisma • TMI.js • HLS.js
