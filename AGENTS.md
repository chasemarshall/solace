# AGENTS.md — Agent Guide for solace

## Commands
- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — ESLint code linting
- `npm run typecheck` — TypeScript type checking

## Code Style
- **Imports**: ES modules with `@/` path aliases
- **Components**: PascalCase, functional with hooks (`useState`, `useEffect`)
- **Variables/Functions**: camelCase
- **Types**: Strict TypeScript with interfaces for props
- **Error Handling**: Try/catch with descriptive messages, `err instanceof Error`
- **Styling**: Tailwind CSS with custom dark theme colors
- **Formatting**: ESLint with Next.js rules, 2-space indentation

## Architecture
- **Framework**: Next.js 14+ App Router, React 18+
- **State**: React Context for global state, localStorage for persistence
- **API**: RESTful endpoints in `app/api/`, client-side fetch with error handling
- **Components**: Feature-based organization in `components/`
- **Utils**: Shared logic in `lib/utils/`, context providers in `contexts/`

## Conventions
- Clean up effects in `useEffect` return functions
- Use `ErrorBoundary` for error isolation
- Prefer controlled components with proper TypeScript types
- Follow existing patterns: hooks in `hooks/`, contexts in `contexts/`
- Commit messages: `<type>(<scope>): brief summary` (feat, fix, refactor, docs)