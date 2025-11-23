# Improvements Plan

## 0. High-Level Summary

This codebase implements a Next.js alternative Twitch player with enhanced chat features. **Critical Finding:** Despite comprehensive research in the original version of this document recommending against ad-blocking implementation due to Twitch ToS violations and legal risks, the codebase actively implements multiple ad-blocking mechanisms. This poses significant legal, business, and user account risks.

The overall code quality is moderate, with good security practices in some areas (DOMPurify sanitization, SSRF protection) but critical security gaps in others (localStorage for auth tokens, no CSRF protection, permissive CORS). The codebase has **zero test coverage** across 48 TypeScript files, minimal accessibility support, and would not scale well in a serverless/multi-instance deployment due to in-memory caching.

**Top Priority Themes:**

1. **Legal/ToS Violation Risk** - Active ad-blocking implementation violates Twitch Terms of Service
2. **Security Vulnerabilities** - OAuth tokens in localStorage, missing CSRF protection, permissive CORS
3. **Zero Test Coverage** - No tests, no CI/CD for quality assurance
4. **Accessibility Gaps** - Minimal ARIA labels, color-only indicators, missing semantic HTML
5. **Scalability Issues** - In-memory caching incompatible with serverless/distributed deployments
6. **Maintainability** - Large monolithic components (1000+ lines), code duplication
7. **Error Handling** - Inconsistent error boundaries and recovery mechanisms
8. **Performance** - Unnecessary re-renders, inefficient state management
9. **Type Safety** - Use of `any` types, missing validation
10. **Documentation** - Minimal inline documentation, no component prop documentation

---

## 1. Priorities

### 1.1 Priority Batches Overview

- **Batch A – Critical**: Legal/ToS violations, authentication security, data integrity vulnerabilities
- **Batch B – High**: Test infrastructure, accessibility, scalability issues, major security hardening
- **Batch C – Medium**: Code organization, performance optimization, UX improvements
- **Batch D – Low / Nice-to-have**: Enhanced features, visual polish, advanced optimizations

---

## 2. Batches, Stages, Steps

### Batch A – Critical

#### Stage A1 – Legal Compliance & ToS Violations

- **Goal:** Remove all ad-blocking functionality to comply with Twitch Terms of Service and eliminate legal/business risk
- **Preconditions:** Full backup of current codebase; product decision on alternative value proposition
- **Tasks:**

  - [ ] **A1.1: Remove ad-blocking proxy infrastructure**
    - **Context:** `lib/twitch/proxyConfig.ts` defines third-party ad-free proxy endpoints (luminous.dev, cdn-perfprod.com, ttv.lol)
    - **Problem:** Using third-party proxies to circumvent Twitch ads directly violates Twitch ToS Section 9, risks API access revocation, and puts user accounts at risk of permanent suspension
    - **Proposed Change:** Delete `lib/twitch/proxyConfig.ts` and `lib/twitch/proxyFailover.ts`; remove all proxy endpoint configurations
    - **Files / Areas:** `lib/twitch/proxyConfig.ts`, `lib/twitch/proxyFailover.ts`

  - [ ] **A1.2: Remove HLS manifest manipulation code**
    - **Context:** `lib/video/m3u8Filter.ts` (line 25) and `lib/video/m3u8.ts` (line 14) actively filter SCTE-35 ad markers and skip ad segments
    - **Problem:** Manipulating HLS playlists to remove advertisements violates Twitch ToS and is explicitly documented as high-risk in the original IMPROVEMENTS.md research
    - **Proposed Change:** Delete `lib/video/m3u8Filter.ts`; refactor `lib/video/m3u8.ts` to only perform URL rewriting without ad filtering; remove `DEV_SKIP_ENABLED` logic
    - **Files / Areas:** `lib/video/m3u8Filter.ts`, `lib/video/m3u8.ts` (lines 14-141)

  - [ ] **A1.3: Remove dev-proxy ad-blocking API routes**
    - **Context:** `app/api/dev-proxy/route.ts` implements GraphQL query filtering (line 127-171), HLS ad removal (line 79-113), and ad domain blocking (line 20-44)
    - **Problem:** Backend actively intercepts and blocks ad-related requests, which is a clear ToS violation regardless of "dev mode" flag
    - **Proposed Change:** Either delete `/api/dev-proxy` entirely or refactor to be a generic CORS proxy without any ad-blocking logic
    - **Files / Areas:** `app/api/dev-proxy/route.ts`

  - [ ] **A1.4: Replace TtvLolPlayer with standard Twitch embed**
    - **Context:** `components/player/TtvLolPlayer.tsx` (line 46) uses ad-free proxy services; `components/player/EnhancedWatchPlayer.tsx` (line 41) explicitly states "TTV LOL PRO Player - Ad-Free Twitch Streams"
    - **Problem:** Primary player component is built entirely around ad circumvention
    - **Proposed Change:** Refactor `EnhancedWatchPlayer` to use official Twitch Embed API or Twitch Player iframe as primary method; remove TtvLolPlayer component entirely
    - **Files / Areas:** `components/player/TtvLolPlayer.tsx`, `components/player/EnhancedWatchPlayer.tsx`

  - [ ] **A1.5: Remove ad-blocking environment variables and configuration**
    - **Context:** `.env.example` (line 10) has `ENABLE_AD_BLOCKER=true`; `lib/dev/config.ts` (line 16) reads this flag
    - **Problem:** Configuration explicitly enables ad blocking, making intent clear
    - **Proposed Change:** Remove `ENABLE_AD_BLOCKER` from `.env.example`; remove all ad-blocker config from `lib/dev/config.ts`
    - **Files / Areas:** `.env.example` (line 10), `lib/dev/config.ts`

  - [ ] **A1.6: Update CSP to remove proxy domains**
    - **Context:** `middleware.ts` (line 59) and `next.config.js` (line 34) whitelist ad-proxy domains in CSP connect-src
    - **Problem:** CSP configuration allows connections to ad-circumvention services
    - **Proposed Change:** Remove `*.luminous.dev`, `*.cdn-perfprod.com`, `api.ttv.lol`, `twitch.nadeko.net`, `clipr.xyz` from CSP connect-src directives
    - **Files / Areas:** `middleware.ts` (line 59), `next.config.js` (line 34)

#### Stage A2 – Authentication & Authorization Security

- **Goal:** Fix critical authentication vulnerabilities that expose user credentials and enable session hijacking
- **Preconditions:** Understanding of OAuth 2.0 flow; access to test Twitch application
- **Tasks:**

  - [ ] **A2.1: Move OAuth tokens from localStorage to httpOnly cookies**
    - **Context:** `components/player/TwitchChat.tsx` (lines 95-99, 102-107) stores `twitch_oauth` in localStorage
    - **Problem:** localStorage is accessible to any JavaScript (including XSS attacks); tokens should never be stored in client-accessible storage
    - **Proposed Change:** Store all OAuth tokens exclusively in httpOnly cookies (already done for main auth flow in `app/api/auth/twitch/callback/route.ts`, but chat component still uses localStorage); create API route to provide chat connection token from cookie
    - **Files / Areas:** `components/player/TwitchChat.tsx` (lines 95-99), create new `/api/auth/chat-token` endpoint

  - [ ] **A2.2: Implement CSRF protection for OAuth flow**
    - **Context:** `app/api/auth/twitch/route.ts` (line 23) initiates OAuth without state parameter; callback at `app/api/auth/twitch/callback/route.ts` doesn't validate state
    - **Problem:** Missing CSRF protection allows attackers to trick users into authorizing attacker's account
    - **Proposed Change:** Generate cryptographically random state parameter, store in httpOnly cookie, validate in callback; reject authorization if state doesn't match
    - **Files / Areas:** `app/api/auth/twitch/route.ts`, `app/api/auth/twitch/callback/route.ts`

  - [ ] **A2.3: Validate and sanitize OAuth redirect URI construction**
    - **Context:** `app/api/auth/twitch/route.ts` (line 17-21) and `callback/route.ts` (line 9-11) dynamically construct redirect URI from request headers
    - **Problem:** Attackers can manipulate `x-forwarded-host` header to redirect OAuth callback to malicious domain (open redirect vulnerability)
    - **Proposed Change:** Use hardcoded `NEXT_PUBLIC_SITE_URL` environment variable; never trust request headers for redirect URI construction; validate redirect URI matches expected domain
    - **Files / Areas:** `app/api/auth/twitch/route.ts` (lines 17-21), `app/api/auth/twitch/callback/route.ts` (lines 9-11)

  - [ ] **A2.4: Add token refresh mechanism**
    - **Context:** `app/api/auth/twitch/callback/route.ts` (line 82) stores refresh_token but never uses it
    - **Problem:** When access token expires, user must re-authenticate; poor UX and unnecessary OAuth flows
    - **Proposed Change:** Create `/api/auth/refresh` endpoint that uses refresh token to obtain new access token; implement client-side retry logic to refresh on 401 responses
    - **Files / Areas:** Create `app/api/auth/refresh/route.ts`, update auth context to handle token refresh

#### Stage A3 – Data Integrity & Input Validation

- **Goal:** Prevent injection attacks and ensure all user inputs are properly validated
- **Preconditions:** Schema validation library (Zod already installed); security testing tools
- **Tasks:**

  - [ ] **A3.1: Add input validation to all API routes**
    - **Context:** `app/api/search/route.ts` (line 6), `app/api/streams/route.ts` (line 15-19) accept query parameters without validation
    - **Problem:** No validation of query parameter types, ranges, or formats; could lead to unexpected behavior or API abuse
    - **Proposed Change:** Use Zod schemas to validate all API route inputs; return 400 Bad Request with detailed error messages for invalid inputs
    - **Files / Areas:** `app/api/search/route.ts`, `app/api/streams/route.ts`, `app/api/games/top/route.ts`, `app/api/channel/[login]/route.ts`

  - [ ] **A3.2: Validate channel parameter in watch routes**
    - **Context:** `app/watch/[channel]/page.tsx` accepts any channel parameter without validation
    - **Problem:** No validation that channel parameter matches expected format (alphanumeric, underscores); could be used for injection or traversal attacks
    - **Proposed Change:** Add server-side validation using Zod schema: channel must match `/^[a-zA-Z0-9_]{1,25}$/`; return 404 for invalid channels
    - **Files / Areas:** `app/watch/[channel]/page.tsx`, `app/dev/watch/[channel]/page.tsx`

  - [ ] **A3.3: Add rate limiting to message sending**
    - **Context:** `components/player/TwitchChat.tsx` (line 870) sends chat messages without client-side rate limiting
    - **Problem:** User can spam messages, potentially getting banned; no protection against automated abuse
    - **Proposed Change:** Implement client-side rate limiting (max 20 messages per 30 seconds, matching Twitch's limits); show warning UI when approaching limit
    - **Files / Areas:** `components/player/TwitchChat.tsx`, create `hooks/useRateLimit.ts`

---

### Batch B – High Priority

#### Stage B1 – Test Infrastructure & Quality Assurance

- **Goal:** Establish comprehensive testing infrastructure and achieve minimum viable test coverage
- **Preconditions:** Install testing dependencies (Jest, React Testing Library, Playwright)
- **Tasks:**

  - [ ] **B1.1: Set up Jest and React Testing Library**
    - **Context:** Zero test files exist; `package.json` has no test dependencies
    - **Problem:** No automated tests means bugs are caught in production; refactoring is risky; code quality degrades over time
    - **Proposed Change:** Install Jest, @testing-library/react, @testing-library/jest-dom; configure jest.config.js; add test script to package.json
    - **Files / Areas:** Create `jest.config.js`, update `package.json`, create `__tests__` directory structure

  - [ ] **B1.2: Write unit tests for critical utility functions**
    - **Context:** `lib/video/m3u8.ts`, `lib/twitch/api.ts`, `lib/utils/*` have no tests
    - **Problem:** Core business logic is untested; bugs in these functions cascade throughout application
    - **Proposed Change:** Write unit tests covering: M3U8 parsing, Twitch API token management, URL validation, sanitization functions; aim for >80% coverage of lib/ directory
    - **Files / Areas:** Create `lib/__tests__/`, test all utility modules

  - [ ] **B1.3: Write integration tests for API routes**
    - **Context:** All API routes in `app/api/` are untested
    - **Problem:** API contract breakage isn't caught before deployment; authentication flows untested
    - **Proposed Change:** Write integration tests for each API route covering: success cases, error handling, authentication, input validation
    - **Files / Areas:** Create `app/api/__tests__/`, test all routes

  - [ ] **B1.4: Write component tests for critical UI**
    - **Context:** 19 components in `components/` have no tests
    - **Problem:** UI regressions slip through; accessibility issues not caught
    - **Proposed Change:** Write component tests for: ErrorBoundary, TwitchChat, player components, authentication flows; test user interactions, accessibility, edge cases
    - **Files / Areas:** Create `components/__tests__/`, prioritize complex components

  - [ ] **B1.5: Set up end-to-end testing with Playwright**
    - **Context:** No E2E tests exist
    - **Problem:** Critical user flows (OAuth, watching streams, chat) are never tested in browser environment
    - **Proposed Change:** Install Playwright; write E2E tests for: homepage, channel search, watch page load, OAuth flow (mocked), chat connection
    - **Files / Areas:** Create `e2e/` directory, create `playwright.config.ts`

  - [ ] **B1.6: Add CI pipeline for testing and quality checks**
    - **Context:** Only Claude Code workflows exist; no automated testing on PR/merge
    - **Problem:** Tests aren't run automatically; broken code can be merged
    - **Proposed Change:** Create `.github/workflows/ci.yml` that runs on PR: type checking, linting, unit tests, integration tests, build verification
    - **Files / Areas:** Create `.github/workflows/ci.yml`

#### Stage B2 – Accessibility Improvements

- **Goal:** Make application accessible to users with disabilities per WCAG 2.1 AA standards
- **Preconditions:** Install axe-core for testing; review WCAG guidelines
- **Tasks:**

  - [ ] **B2.1: Add ARIA labels to all interactive elements**
    - **Context:** `app/watch/[channel]/WatchPageClient.tsx` (lines 74-90) has buttons with only title attributes; missing aria-label
    - **Problem:** Screen readers can't properly announce button purposes; keyboard navigation is confusing
    - **Proposed Change:** Add aria-label to all buttons and interactive elements; ensure label text is descriptive; remove redundant title attributes
    - **Files / Areas:** `app/watch/[channel]/WatchPageClient.tsx`, `components/player/TwitchChat.tsx`, `components/layout/Header.tsx`, all UI components

  - [ ] **B2.2: Add semantic HTML and ARIA roles**
    - **Context:** Chat component uses generic divs; no semantic structure
    - **Problem:** Screen readers can't understand page structure; no landmarks for navigation
    - **Proposed Change:** Replace divs with semantic HTML (<nav>, <main>, <aside>, <article>); add ARIA landmarks (role="region", aria-labelledby); proper heading hierarchy
    - **Files / Areas:** `components/player/TwitchChat.tsx`, `app/watch/[channel]/WatchPageClient.tsx`, `components/layout/LayoutContent.tsx`

  - [ ] **B2.3: Fix color contrast issues**
    - **Context:** `app/watch/[channel]/WatchPageClient.tsx` (line 67) uses low-contrast text colors
    - **Problem:** Insufficient color contrast violates WCAG AA (4.5:1 for normal text, 3:1 for large text)
    - **Proposed Change:** Audit all text colors; ensure minimum 4.5:1 contrast ratio; update Tailwind theme with accessible color palette
    - **Files / Areas:** `tailwind.config.ts`, update color variables in CSS

  - [ ] **B2.4: Add keyboard navigation support**
    - **Context:** Chat scrolling requires mouse; no keyboard shortcuts for common actions
    - **Problem:** Keyboard-only users cannot efficiently use the application
    - **Proposed Change:** Implement keyboard shortcuts: Space for pause/play, M for mute, F for fullscreen, / to focus chat input, Escape to close modals; add focus indicators to all interactive elements
    - **Files / Areas:** `components/player/`, `components/ui/`, create `hooks/useKeyboardShortcuts.ts`

  - [ ] **B2.5: Add screen reader announcements for dynamic content**
    - **Context:** Chat messages arrive with no announcement; stream status changes silently
    - **Problem:** Screen reader users miss important updates
    - **Proposed Change:** Use ARIA live regions (aria-live="polite" for chat, aria-live="assertive" for errors); announce stream status changes, new messages (throttled)
    - **Files / Areas:** `components/player/TwitchChat.tsx`, `components/stream/StreamStatus.tsx`

  - [ ] **B2.6: Fix missing alt text and ARIA labels for media**
    - **Context:** `components/player/EnhancedWatchPlayer.tsx` (line 25-34) iframe has no title attribute; emote images in chat have generic alt text
    - **Problem:** Screen readers can't describe iframe content or emote meaning
    - **Proposed Change:** Add descriptive title to iframe ("Twitch video player for {channel}"); improve emote alt text to include emote name and type
    - **Files / Areas:** `components/player/EnhancedWatchPlayer.tsx`, `components/player/TwitchChat.tsx` (emote rendering)

#### Stage B3 – Security Hardening

- **Goal:** Implement defense-in-depth security measures across application
- **Preconditions:** Security audit tools (npm audit, Snyk); CSP testing tools
- **Tasks:**

  - [ ] **B3.1: Remove 'unsafe-inline' and 'unsafe-eval' from CSP**
    - **Context:** `middleware.ts` (line 55) and `next.config.js` (line 32) allow 'unsafe-inline' and 'unsafe-eval' in script-src
    - **Problem:** These directives weaken CSP and allow XSS attacks if any injection vulnerability exists
    - **Proposed Change:** Use nonces for inline scripts; refactor to eliminate eval usage; use strict CSP with only hashes for necessary inline scripts
    - **Files / Areas:** `middleware.ts` (line 55), `next.config.js` (line 32), audit all inline scripts

  - [ ] **B3.2: Restrict CORS to specific origins**
    - **Context:** `app/api/proxy/route.ts` (line 82) and `app/api/hls/route.ts` (line 76) use `Access-Control-Allow-Origin: *`
    - **Problem:** Allows any domain to make requests to API; enables CSRF and data leakage
    - **Proposed Change:** Restrict CORS to whitelist of allowed origins from environment variable; validate origin header against whitelist
    - **Files / Areas:** `app/api/proxy/route.ts`, `app/api/hls/route.ts`, create `lib/cors.ts` helper

  - [ ] **B3.3: Implement request signing for sensitive operations**
    - **Context:** API routes have no protection against replay attacks
    - **Problem:** Attacker can capture and replay valid requests
    - **Proposed Change:** Implement HMAC request signing for state-changing operations; include timestamp and nonce; reject requests older than 5 minutes
    - **Files / Areas:** Create `lib/security/requestSigning.ts`, apply to auth endpoints

  - [ ] **B3.4: Add security headers for all responses**
    - **Context:** `middleware.ts` (line 42-50) sets some security headers but could be more comprehensive
    - **Problem:** Missing Permissions-Policy, missing some recommended CSP directives
    - **Proposed Change:** Add Permissions-Policy header restricting unnecessary features; add CSP report-uri for monitoring violations; add Expect-CT header
    - **Files / Areas:** `middleware.ts`

  - [ ] **B3.5: Implement secrets scanning and rotation**
    - **Context:** Secrets in environment variables with no rotation policy
    - **Problem:** Long-lived credentials increase risk of compromise
    - **Proposed Change:** Document secret rotation procedure; add pre-commit hook to prevent committing secrets; use secret management service (AWS Secrets Manager, Vault) if available
    - **Files / Areas:** Create `.husky/pre-commit` hook, document in `SECURITY.md`

  - [ ] **B3.6: Add dependency vulnerability scanning**
    - **Context:** Dependencies are not regularly scanned for vulnerabilities
    - **Problem:** Known vulnerabilities in dependencies may exist undetected
    - **Proposed Change:** Add `npm audit` to CI pipeline; set up Dependabot for automated dependency updates; add Snyk or similar for deeper scanning
    - **Files / Areas:** `.github/workflows/ci.yml`, `.github/dependabot.yml`

#### Stage B4 – Scalability & Production Readiness

- **Goal:** Ensure application can scale horizontally and handle production traffic
- **Preconditions:** Understanding of serverless architecture; Redis or similar distributed cache
- **Tasks:**

  - [ ] **B4.1: Replace in-memory caching with distributed cache**
    - **Context:** `lib/twitch/api.ts` (line 5-6) uses in-memory variable for token caching; `app/api/twitch/token/route.ts` (line 3) also uses in-memory cache
    - **Problem:** Won't work with multiple server instances or serverless functions; each instance has separate cache leading to unnecessary API calls and potential rate limiting
    - **Proposed Change:** Implement Redis or Vercel KV for distributed caching; use cache-aside pattern with proper TTL
    - **Files / Areas:** `lib/twitch/api.ts`, `app/api/twitch/token/route.ts`, create `lib/cache/redis.ts`

  - [ ] **B4.2: Replace in-memory rate limiting with distributed solution**
    - **Context:** `middleware.ts` (line 5-36) uses Map for rate limiting state
    - **Problem:** Rate limits are per-instance, not per-user globally; attackers can bypass by hitting different instances
    - **Proposed Change:** Use Redis or similar for distributed rate limiting; implement sliding window counter algorithm; consider using a service like Upstash
    - **Files / Areas:** `middleware.ts`, create `lib/rateLimit/distributed.ts`

  - [ ] **B4.3: Add database for persistent user data**
    - **Context:** User preferences and favorites stored only in localStorage; no persistence
    - **Problem:** Users lose data when clearing cache; no cross-device sync; no backup
    - **Proposed Change:** Add PostgreSQL or similar database; migrate user preferences, favorites, watch history to database; implement sync mechanism
    - **Files / Areas:** Set up database (Prisma or similar), create `lib/db/`, migrate storage from localStorage

  - [ ] **B4.4: Implement proper logging and monitoring**
    - **Context:** Scattered console.log statements; no structured logging
    - **Problem:** Can't debug production issues; no visibility into errors or performance
    - **Proposed Change:** Implement structured logging (Pino, Winston); send logs to aggregation service (Datadog, CloudWatch); add error tracking (Sentry)
    - **Files / Areas:** Create `lib/logger.ts`, replace all console.log, add error tracking

  - [ ] **B4.5: Add performance monitoring and metrics**
    - **Context:** Vercel Analytics installed but limited metrics captured
    - **Problem:** No visibility into Core Web Vitals, API response times, or custom business metrics
    - **Proposed Change:** Implement comprehensive performance monitoring; track: API response times, player load times, chat connection success rate, error rates
    - **Files / Areas:** Enhance existing Vercel Analytics, add custom metrics, create dashboard

  - [ ] **B4.6: Implement health check and readiness endpoints**
    - **Context:** No health check endpoint for load balancers
    - **Problem:** Can't determine if application is healthy; no graceful degradation
    - **Proposed Change:** Create `/api/health` endpoint checking: database connection, Twitch API accessibility, cache availability; return 200 only if all critical systems healthy
    - **Files / Areas:** Create `app/api/health/route.ts`

---

### Batch C – Medium Priority

#### Stage C1 – Code Organization & Maintainability

- **Goal:** Improve code structure, reduce technical debt, enhance developer experience
- **Preconditions:** Understanding of component composition patterns; refactoring tools
- **Tasks:**

  - [ ] **C1.1: Split TwitchChat component into smaller modules**
    - **Context:** `components/player/TwitchChat.tsx` is 1092 lines with multiple responsibilities
    - **Problem:** Hard to understand, test, and modify; violates single responsibility principle
    - **Proposed Change:** Extract into separate components: ChatMessage, ChatInput, EmoteRenderer, BadgeRenderer, MessageList; extract hooks: useEmoteFetching, useChatConnection, useScrollManagement
    - **Files / Areas:** Create `components/player/chat/` directory with subcomponents

  - [ ] **C1.2: Consolidate duplicate emote fetching logic**
    - **Context:** Three separate functions for BTTV, FFZ, 7TV with similar structure (lines 286-502)
    - **Problem:** Code duplication; changes must be made in three places; inconsistent error handling
    - **Proposed Change:** Create generic emote fetcher with provider-specific configurations; use single implementation with different configs
    - **Files / Areas:** Create `lib/emotes/fetchEmotes.ts`, refactor chat component

  - [ ] **C1.3: Create reusable hooks for common patterns**
    - **Context:** State management and effect logic repeated across components
    - **Problem:** Duplicate code; inconsistent implementations
    - **Proposed Change:** Extract reusable hooks: useLocalStorage, useDebounce, useIntersectionObserver, useMediaQuery; document and test thoroughly
    - **Files / Areas:** Create `hooks/` directory with custom hooks

  - [ ] **C1.4: Add JSDoc comments to public APIs**
    - **Context:** Functions and components lack documentation
    - **Problem:** Developers must read implementation to understand usage; no IntelliSense hints
    - **Proposed Change:** Add comprehensive JSDoc comments to all exported functions, components, and types; include examples for complex APIs
    - **Files / Areas:** All `lib/` files, all component prop interfaces

  - [ ] **C1.5: Reduce 'any' type usage**
    - **Context:** Multiple uses of `any` type (e.g., `lib/twitch/api.ts` line 38, chat component line 85)
    - **Problem:** Loses type safety; defeats purpose of TypeScript
    - **Proposed Change:** Define proper types for all data structures; use generics where appropriate; enable `noImplicitAny` in tsconfig
    - **Files / Areas:** All files with `any`, update `tsconfig.json`

  - [ ] **C1.6: Consolidate environment variable access**
    - **Context:** process.env accessed directly throughout codebase
    - **Problem:** No validation; typos not caught; hard to track which env vars are required
    - **Proposed Change:** Create `lib/env.ts` with Zod schema validating all env vars; export typed config object; use only this module for env access
    - **Files / Areas:** Create `lib/env.ts`, refactor all files using process.env

#### Stage C2 – Performance Optimization

- **Goal:** Improve application performance, reduce bundle size, optimize rendering
- **Preconditions:** Performance profiling tools; bundle analyzer
- **Tasks:**

  - [ ] **C2.1: Implement code splitting and lazy loading**
    - **Context:** All components loaded upfront; large initial bundle
    - **Problem:** Slow initial page load; users download code they may never use
    - **Proposed Change:** Use Next.js dynamic imports for: player components, chat (only load when visible), dev tools, large dependencies (hls.js)
    - **Files / Areas:** `app/watch/[channel]/page.tsx`, `components/player/`, use `next/dynamic`

  - [ ] **C2.2: Optimize TwitchChat rendering performance**
    - **Context:** Chat re-renders on every message; expensive operations in render path
    - **Problem:** UI lags during high message volume; poor performance in active chats
    - **Proposed Change:** Implement virtual scrolling for message list (react-window); memoize expensive operations (parseMessage, badge rendering); use React.memo for message components
    - **Files / Areas:** `components/player/TwitchChat.tsx`, add react-window

  - [ ] **C2.3: Implement image optimization for emotes**
    - **Context:** Emotes loaded directly from CDNs; no optimization or caching
    - **Problem:** Many HTTP requests; no size optimization; no lazy loading
    - **Proposed Change:** Use Next.js Image component for emotes with proper sizing; implement loading="lazy"; consider service worker for aggressive caching
    - **Files / Areas:** `components/player/TwitchChat.tsx` (emote rendering)

  - [ ] **C2.4: Reduce bundle size**
    - **Context:** No bundle analysis; potentially large dependencies included
    - **Problem:** Slow page loads; high bandwidth usage
    - **Proposed Change:** Run bundle analyzer; replace large dependencies (date-fns → native Intl); tree-shake unused code; enable minification and compression
    - **Files / Areas:** Add `@next/bundle-analyzer`, audit dependencies in `package.json`

  - [ ] **C2.5: Optimize API route responses**
    - **Context:** API routes return full objects without pagination or field selection
    - **Problem:** Large response payloads; slow API responses; unnecessary data transfer
    - **Proposed Change:** Implement pagination for `/api/streams`; add field selection (GraphQL-style); enable HTTP/2 server push for related resources
    - **Files / Areas:** `app/api/streams/route.ts`, `app/api/search/route.ts`

  - [ ] **C2.6: Add service worker for offline support**
    - **Context:** No offline capabilities; app breaks without network
    - **Problem:** Poor user experience on flaky connections
    - **Proposed Change:** Implement service worker with Workbox; cache static assets and API responses; show offline UI when network unavailable
    - **Files / Areas:** Create `public/sw.js`, configure Next.js for PWA

#### Stage C3 – User Experience Improvements

- **Goal:** Polish user interface and improve overall user experience
- **Preconditions:** User research or feedback data; design mockups
- **Tasks:**

  - [ ] **C3.1: Add loading states and skeletons**
    - **Context:** Minimal loading feedback; users see blank screens during loads
    - **Problem:** Poor perceived performance; users unsure if app is working
    - **Proposed Change:** Add skeleton screens for: stream cards, chat messages, player; add loading spinners with progress indicators where appropriate
    - **Files / Areas:** All components that fetch data, create `components/ui/Skeleton.tsx`

  - [ ] **C3.2: Improve error messages and recovery**
    - **Context:** Error messages are technical and unhelpful (e.g., "Processing error")
    - **Problem:** Users don't know what went wrong or how to fix it
    - **Proposed Change:** Write user-friendly error messages; add specific recovery actions (retry, contact support); categorize errors (network, permission, server)
    - **Files / Areas:** All error boundaries, API route error responses, `components/ui/ErrorBoundary.tsx`

  - [ ] **C3.3: Add user preferences and settings**
    - **Context:** Limited customization; emote preferences hidden in localStorage
    - **Problem:** Users can't easily configure experience; no discoverability of features
    - **Proposed Change:** Create settings modal with: emote preferences, chat display options, quality preferences, keyboard shortcuts help, theme selection
    - **Files / Areas:** Create `components/ui/SettingsModal.tsx`, create settings context

  - [ ] **C3.4: Implement toast notifications**
    - **Context:** No feedback for user actions (favorite, follow, etc.)
    - **Problem:** Users unsure if actions succeeded
    - **Proposed Change:** Add toast notification system for: action confirmations, error alerts, informational messages; use react-hot-toast or similar
    - **Files / Areas:** Create `components/ui/Toast.tsx`, add to layout

  - [ ] **C3.5: Add search history and suggestions**
    - **Context:** Search on homepage has no history or autocomplete
    - **Problem:** Users must retype frequent searches; discovery is difficult
    - **Proposed Change:** Store recent searches in localStorage; show suggestions based on history and trending streams; clear history option
    - **Files / Areas:** `app/page.tsx`, create search component with history

  - [ ] **C3.6: Improve mobile responsiveness**
    - **Context:** Chat and player layout suboptimal on mobile
    - **Problem:** Poor mobile user experience; touch targets too small
    - **Proposed Change:** Redesign mobile layout: vertical stack on small screens, collapsible chat, larger touch targets, swipe gestures for chat toggle
    - **Files / Areas:** `app/watch/[channel]/WatchPageClient.tsx`, update Tailwind breakpoints

---

### Batch D – Low Priority / Nice-to-Have

#### Stage D1 – Enhanced Features

- **Goal:** Add features that improve user experience but aren't critical
- **Preconditions:** Core functionality stable; good test coverage
- **Tasks:**

  - [ ] **D1.1: Add picture-in-picture support**
    - **Context:** No PiP functionality
    - **Problem:** Users can't multitask while watching
    - **Proposed Change:** Implement PiP using Picture-in-Picture API; add PiP button to player controls; persist PiP state
    - **Files / Areas:** Player components, add PiP hooks

  - [ ] **D1.2: Implement keyboard shortcuts help modal**
    - **Context:** Keyboard shortcuts exist but no documentation
    - **Problem:** Users don't discover shortcuts
    - **Proposed Change:** Create modal showing all keyboard shortcuts; trigger with "?" key; categorize by function
    - **Files / Areas:** Create `components/ui/KeyboardShortcutsModal.tsx`

  - [ ] **D1.3: Add theater mode**
    - **Context:** Only normal and immersive modes exist
    - **Problem:** Immersive mode too extreme; no middle ground
    - **Proposed Change:** Add theater mode that expands player to full width while keeping header/chat; toggle with "t" key
    - **Files / Areas:** `app/watch/[channel]/WatchPageClient.tsx`, update context

  - [ ] **D1.4: Add watch history**
    - **Context:** No tracking of previously watched channels
    - **Problem:** Users must remember channel names
    - **Proposed Change:** Store watch history in database or localStorage; show recent channels on homepage; clear history option
    - **Files / Areas:** Create watch history component and hooks

  - [ ] **D1.5: Implement clip creation**
    - **Context:** No clip functionality
    - **Problem:** Users can't save highlights
    - **Proposed Change:** Integrate Twitch Clips API; add clip button to player; show user's clips
    - **Files / Areas:** Add clip API routes, add clip UI

  - [ ] **D1.6: Add multi-stream layout**
    - **Context:** Can only watch one stream at a time
    - **Problem:** Users watching events with multiple POVs have poor experience
    - **Proposed Change:** Create split-screen layout supporting 2-4 simultaneous streams; sync controls; grid and PiP layouts
    - **Files / Areas:** Create multi-stream page and components

#### Stage D2 – Developer Experience

- **Goal:** Improve development workflow and onboarding
- **Preconditions:** Documentation platform; code quality tools
- **Tasks:**

  - [ ] **D2.1: Add Storybook for component development**
    - **Context:** Components developed in context of full app
    - **Problem:** Slow iteration; hard to test edge cases
    - **Proposed Change:** Set up Storybook; create stories for all UI components; document props and variants
    - **Files / Areas:** Create `.storybook/`, add stories for components/

  - [ ] **D2.2: Create comprehensive README and documentation**
    - **Context:** Minimal setup documentation
    - **Problem:** New contributors struggle to get started
    - **Proposed Change:** Write comprehensive README with: architecture overview, setup instructions, development workflow, deployment guide, contribution guidelines
    - **Files / Areas:** Update `README.md`, create `docs/` directory

  - [ ] **D2.3: Add pre-commit hooks**
    - **Context:** No automated checks before commit
    - **Problem:** Broken code gets committed; inconsistent formatting
    - **Proposed Change:** Set up Husky with pre-commit hooks: run linter, type check, format with Prettier, run tests on affected files
    - **Files / Areas:** Add Husky, create `.husky/pre-commit`

  - [ ] **D2.4: Set up development database seeding**
    - **Context:** Must manually create test data
    - **Problem:** Slow development; inconsistent test environments
    - **Proposed Change:** Create database seeding scripts; include sample users, channels, watch history; document seeding process
    - **Files / Areas:** Create `prisma/seed.ts` or similar

  - [ ] **D2.5: Add API documentation**
    - **Context:** API routes lack documentation
    - **Problem:** Frontend developers must read code to understand APIs
    - **Proposed Change:** Generate API documentation with OpenAPI/Swagger; document all endpoints with request/response schemas, examples, error codes
    - **Files / Areas:** Create OpenAPI spec, add Swagger UI

  - [ ] **D2.6: Implement design system documentation**
    - **Context:** No documentation of design tokens, components, patterns
    - **Problem:** Inconsistent UI; designers and developers out of sync
    - **Proposed Change:** Document design system: color palette, typography, spacing, component guidelines; create design tokens file
    - **Files / Areas:** Create `docs/design-system.md`, extract Tailwind config

---

## 3. Per-Area Notes

### Backend

**Summary of key issues:**
- **Critical**: Ad-blocking proxy infrastructure violates Twitch ToS and poses legal risk
- **Security**: OAuth tokens in localStorage, missing CSRF protection, permissive CORS, in-memory caching
- **Scalability**: In-memory rate limiting and token caching won't work in distributed/serverless environments
- **Validation**: Insufficient input validation on API routes
- **Error handling**: Inconsistent error responses; technical error messages exposed to users
- **Testing**: Zero test coverage for any API routes

**Key files requiring attention:**
- `app/api/dev-proxy/route.ts` - Remove entirely or strip ad-blocking logic
- `app/api/hls/route.ts` - Remove HLS manipulation, implement proper validation
- `app/api/auth/twitch/*.ts` - Add CSRF protection, fix redirect URI validation
- `lib/twitch/api.ts` - Replace in-memory cache with distributed solution
- `middleware.ts` - Harden CSP, implement distributed rate limiting

### Frontend / UI

**Summary of key issues:**
- **Critical**: TtvLolPlayer component built entirely around ToS violations
- **Accessibility**: Minimal ARIA labels, color-only indicators, missing semantic HTML
- **Maintainability**: 1000+ line components, code duplication, tight coupling
- **Performance**: No code splitting, inefficient re-renders, no virtualization for long lists
- **Error handling**: Generic error messages, limited error boundaries
- **Testing**: Zero component test coverage

**Key components requiring attention:**
- `components/player/TtvLolPlayer.tsx` - Remove entirely, replace with compliant player
- `components/player/TwitchChat.tsx` - Split into 5-7 smaller components, add virtualization
- `components/player/EnhancedWatchPlayer.tsx` - Refactor to use official Twitch embed
- `app/watch/[channel]/WatchPageClient.tsx` - Add accessibility, improve mobile layout
- `components/ui/ErrorBoundary.tsx` - Enhance with error reporting, better UX

**Accessibility priorities:**
1. Add ARIA labels to all interactive elements
2. Implement keyboard navigation throughout
3. Fix color contrast issues
4. Add live regions for dynamic content
5. Use semantic HTML structure

### Tests & CI

**Summary of issues:**
- **Critical**: Zero test coverage across entire codebase (48 TypeScript files)
- **CI/CD**: No automated testing, linting, or type checking on pull requests
- **Quality**: No code coverage tracking, no performance benchmarks
- **Documentation**: No testing guidelines or examples

**Implementation priorities:**
1. Set up Jest + React Testing Library infrastructure
2. Write unit tests for `lib/` utilities (aim for >80% coverage)
3. Write integration tests for API routes (all routes)
4. Write component tests for critical UI (chat, player, auth)
5. Set up Playwright for E2E tests (core user flows)
6. Create CI pipeline running tests on every PR
7. Add code coverage reporting and enforcement (minimum 70%)
8. Set up automated dependency updates (Dependabot)

**Recommended testing stack:**
- Unit/Integration: Jest + React Testing Library
- E2E: Playwright
- Coverage: Istanbul (built into Jest)
- CI: GitHub Actions
- Visual regression (future): Percy or Chromatic

---

## 4. Outdated / Historical Items

The original `IMPROVEMENTS.md` file was a **feature wishlist** focused on potential enhancements like chat timestamps, quality selectors, theater mode, multi-stream support, etc. While those features remain valid nice-to-have additions, they are **not** improvements to code quality, security, or maintainability.

**Key items from original document:**

### Preserved as valid feature requests (moved to Batch D):
- [ ] Picture-in-picture support
- [ ] Theater mode
- [ ] Keyboard shortcuts
- [ ] Quality selector (partially implemented)
- [ ] Chat font size options
- [ ] VOD playback
- [ ] Clip support
- [ ] Multi-stream support

### Items requiring legal/policy review before implementation:
- [ ] **Monetization integration** - Original document includes well-researched plan for compliant subscription deep-linking (section starting line 152). This is a GOOD approach that should be implemented AFTER ad-blocking is removed.
- [ ] **Ad blocking research** (lines 223-353) - Comprehensive analysis correctly identified ad-blocking as high-risk ToS violation and recommended AGAINST implementation. **However, the codebase ignored this recommendation and implemented ad-blocking anyway.** This research should be preserved as documentation of why ad-blocking must be removed.

### Items that became obsolete:
- Error boundaries - Already implemented (though could be enhanced)
- HTTP-only cookie storage - Partially implemented (main auth flow uses it, but chat still uses localStorage)

**Note:** The comprehensive monetization and ad-blocking research sections (lines 152-353 of original file) contain valuable analysis and should be preserved in a separate `RESEARCH.md` document for reference, but are not part of the improvement plan itself.
