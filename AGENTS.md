# AGENTS.md — Agent Guide for solace

This file is automatically ingested by agentic coding assistants at session start. It helps ground agents in this project's conventions, tooling, and expectations. Keep it concise and regularly updated.

---

## Project Overview
- **Purpose**: This is a Next.js (App Router) + React 18 project for browsing and watching Twitch livestreams with a clean, modern interface.
- **Key components**:
  - `app/watch/[channel]/` – main watch pages and player components
  - `components/stream/LiveCard.tsx` – stream card components
  - `contexts/FavoritesContext.tsx` – favorites state management
  - `lib/twitch/api.ts` – Twitch API integration

---

## Tech Stack & Scripts
- **Stack**: Next.js 14+, React 18+, TypeScript, Tailwind CSS
- **Scripts**:
  - `npm run dev` — start local server
  - `npm run build` — production build
  - `npm run start` — start production server
  - `npm run lint` — ESLint code linting
  - `npm run typecheck` — TypeScript type checking

---

## Code Style & Conventions
- **Imports**: ES modules with `@/` path aliases
- **Components**: PascalCase, functional with hooks (`useState`, `useEffect`)
- **Variables/Functions**: camelCase
- **Types**: Strict TypeScript with interfaces for props
- **Error Handling**: Try/catch with descriptive messages, `err instanceof Error`
- **Styling**: Tailwind CSS with custom dark theme colors
- **Formatting**: ESLint with Next.js rules, 2-space indentation

---

## Architecture
- **Framework**: Next.js 14+ App Router, React 18+
- **State**: React Context for global state, localStorage for persistence
- **API**: RESTful endpoints in `app/api/`, client-side fetch with error handling
- **Components**: Feature-based organization in `components/`
- **Utils**: Shared logic in `lib/utils/`, context providers in `contexts/`

---

## Common Issues & Pitfalls
- Race conditions with favorites - use `FavoritesContext` instead of direct localStorage
- Mobile viewport issues - ensure proper viewport meta tags and CSS handling
- Twitch API errors - handle gracefully with fallbacks and user feedback
- State synchronization - use React Context for shared state, avoid multiple localStorage listeners

---

## Workflow Tips
- Use **plan mode** for multi-step tasks: analyze and plan, then confirm with "go ahead" before implementing
- Test mobile layouts thoroughly - viewport changes can cause layout shifts
- Always run `npm run typecheck` and `npm run lint` before committing
- Use React Context for global state instead of prop drilling

---

## Etiquette & Pull Requests
- Branch naming: `feature/your-description`, `bugfix/summary`
- Commit messages: `<type>(<scope>): brief summary`
  - types: `feat`, `fix`, `chore`, `refactor`, `docs`
- Never overwrite existing working logic; tests should pass before merging

---

**To the agent instance**:
Use this file to guide your actions. Always reference project conventions before editing. Ask for clarification if assumptions are required.