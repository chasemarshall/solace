# CLAUDE.md — Project Agent Guide

This file is automatically ingested by Claude Code at session start. It helps ground Claude in this project's conventions, tooling, and expectations. Keep it concise and regularly updated.

---

##  Project Overview
- **Purpose**: This is a Next.js (App Router) + React 18 project for embedding Twitch livestreams in two modes: **basic** (iframe fallback) and **enhanced** (Twitch SDK + custom emotes/chat).
- **Key components**:
  - `app/watch/[channel]/Player.tsx` – main player component
  - `lib/twitch/loadSdk.ts` – SDK loader
  - `next.config.js` – CSP headers configuration

---

##  Tech Stack & Scripts
- **Stack**: Next.js 14+, React 18+, TypeScript, CSS Modules or Tailwind (if used)
- **Scripts**:
  - `npm run dev` — start local server
  - `npm run build && npm start` — prod build & start
  - `npm run lint` — code linting
  - `npm run test` — run tests
  - `npm run preview` — deployment preview testing

---

##  Code Style & Conventions
- Use ES module syntax: `import … from …`.
- Prefer functional components with `useEffect`, `useRef`; avoid side effects in render.
- Always clean up effects (e.g. `player.remove()` if DOM exists).
- Use camelCase for variables, PascalCase for React components.
- Keep CSP headers strict; only add new domains with justification.
- **UI styling**: Always use `rounded-xl` for external rounded boxes to maintain consistent corner radius across the application.

---

##  Embeds & Behavior Guidelines
- **Basic mode**: Must render Twitch via iframe with correct `allow` and `sandbox` props.
- **Enhanced mode**:
  - Load Twitch embed script as singleton.
  - Guard against double embeds/removeChild errors.
  - Ensure container visibility before autoplay for Twitch requirements.
  - On failure, fallback to iframe only after synthetic failure (not timeout).
- **Parent domains**: Dynamically compute from `window.location.hostname` + always include dev hosts (`localhost`, `127.0.0.1`).

---

##  Common Issues & Pitfalls
- `removeChild` errors often caused by duplicated DOM cleanup.
- "Autoplay disabled: style visibility" means the container hasn’t been rendered/visible yet.
- Sandbox warnings: overly permissive sandbox (e.g. both `allow-scripts` and `allow-same-origin`) may lead to security risks.
- Emote load failures (e.g., FFZ 404) should not break the player.

---

##  Workflow Tips
- Use **plan mode** for multi-step tasks: ask Claude to diagnose & plan, then confirm with “go ahead” before generating patches.
- Use `/clear` to reload updates to this file.
- Encourage Claude to **think through** (via CoT) before proposing changes: “pause and outline a plan and root cause analysis first.”
- Ask Claude to update this file if it learns a new useful project rule.

---

##  Etiquette & Pull Requests
- Branch naming: `feature/your-description`, `bugfix/summary`.
- Commit messages: `<type>(<scope>): brief summary`
  - types: `feat`, `fix`, `chore`, `refactor`, `docs`
- Never overwrite existing working logic; tests should pass before merging.

---

**To the Claude instance**:  
Use this file to guide your actions. Always reference project conventions before editing. Ask for clarification if assumptions are required.

