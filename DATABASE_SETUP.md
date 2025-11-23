# Database Setup Guide

This project uses PostgreSQL (via Supabase/Vercel Postgres) for persistent user data storage.

## Prerequisites

- PostgreSQL database (Supabase, Vercel Postgres, or any PostgreSQL provider)
- Environment variable `POSTGRES_URL` set with your database connection string

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

This will automatically run `prisma generate` via the postinstall script.

### 2. Push Database Schema

For the first-time setup or when deploying to a new environment:

```bash
npm run db:push
```

This command uses `prisma db push` to sync your Prisma schema with your database without creating migration files.

### 3. (Alternative) Run Migrations

If you prefer using migrations (recommended for production):

```bash
# Create a new migration
npx prisma migrate dev --name init

# Deploy migrations in production
npm run db:migrate
```

## Database Schema

The database includes the following tables:

### User
- Stores user information
- Links to Twitch account via `twitchId`
- One-to-many relationships with Favorite, Follow, and UserPreference

### Favorite
- Stores favorited channels per user
- Unique constraint on `userId` + `channelLogin`

### Follow
- Stores followed channels per user
- Includes `displayName`, `followedAt`, and `lastLive` timestamps
- Unique constraint on `userId` + `channelLogin`

### UserPreference
- Stores user preferences (proxy selection, chat settings, etc.)
- One-to-one relationship with User

## Migration from localStorage

The application automatically migrates data from localStorage to the database on first load:

1. **Favorites**: Migrates from `twitch-favorites` localStorage key
2. **Follows**: Migrates from `solace_follows` localStorage key
3. **Preferences**: Migrates from `proxy_selection` localStorage key

After successful migration, the localStorage data is automatically cleared.

## Vercel Deployment

When deploying to Vercel with the Vercel Postgres integration:

1. The `POSTGRES_URL` environment variable is automatically set
2. `prisma generate` runs automatically during build (via postinstall script)
3. You need to manually run database migrations:
   - Option 1: Use `npx prisma db push` in Vercel's terminal after first deployment
   - Option 2: Add a custom build command in Vercel: `npm run db:push && npm run build`

## Development

### View/Edit Database

To open Prisma Studio (a GUI for your database):

```bash
npm run db:studio
```

### Making Schema Changes

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name your_migration_name`
3. Commit the migration files
4. Deploy with `npm run db:migrate` in production

## Environment Variables

Required environment variables:

```bash
POSTGRES_URL="postgresql://..."
# Or if using Vercel Postgres, these are set automatically:
# POSTGRES_DATABASE
# POSTGRES_HOST
# POSTGRES_PASSWORD
# POSTGRES_PRISMA_URL
# POSTGRES_URL
# POSTGRES_URL_NON_POOLING
# POSTGRES_USER
```

## Troubleshooting

### "Prisma Client could not be generated"

Run:
```bash
npx prisma generate
```

### "Database connection failed"

1. Check that `POSTGRES_URL` is set correctly
2. Verify your database is accessible
3. Check firewall/network settings

### "Table does not exist"

Run the database push or migration:
```bash
npm run db:push
```

## API Endpoints

The following API endpoints are available for database operations:

- `GET /api/favorites` - Get user's favorites
- `POST /api/favorites` - Add a favorite
- `DELETE /api/favorites` - Remove a favorite
- `GET /api/follows` - Get user's follows
- `POST /api/follows` - Follow a channel
- `DELETE /api/follows` - Unfollow a channel
- `PATCH /api/follows` - Update last live time
- `GET /api/preferences` - Get user preferences
- `PATCH /api/preferences` - Update user preferences
