# Deployment & launch

The app is launch-hardened in code. The steps below need your accounts/secrets,
so they're documented rather than executed.

## Prerequisites
- A Vercel account (or any Node host) and this repo pushed to GitHub.
- Optional: an OpenAI API key (live AI), a Sentry account (error monitoring).

## 1. Deploy to Vercel
```bash
npm i -g vercel
vercel link
# set env vars (Production + Preview):
vercel env add OPENAI_API_KEY          # optional — enables live Generate/Explain
vercel env add OPENAI_MODEL            # optional — defaults to gpt-4o-mini
vercel env add NEXT_PUBLIC_SITE_URL    # your prod origin, e.g. https://draw.ai.app
vercel --prod
```
Notes:
- Build command `next build`, install `corepack pnpm@9.15.9 install --frozen-lockfile`.
- Without `OPENAI_API_KEY`, the app still runs: Generate uses a local fallback,
  Cleanup uses local ELK, Explain returns guidance text.

## 2. CI
`.github/workflows/ci.yml` runs lint + unit + build + Playwright (Chromium &
WebKit) on every PR and on `main`. It forces `OPENAI_API_KEY=''` so CI never
spends credits. No setup needed beyond pushing to GitHub.

## 3. Error monitoring (recommended)
```bash
corepack pnpm@9.15.9 add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```
Then report from the boundary: call `Sentry.captureException` in
`components/ErrorBoundary.tsx#componentDidCatch` and wrap the `/api/chat`
handler. Add `SENTRY_DSN` / `SENTRY_AUTH_TOKEN` to Vercel env.

## 4. Verify live AI (manual, ~cents)
On the deployed preview with a real key:
1. Agent panel → type a prompt → Generate → confirm a valid diagram applies.
2. Click Explain → confirm a real explanation (not the offline guidance text).
3. Hammer the endpoint to confirm the rate limit returns HTTP 429.

> The in-memory rate limiter is per-instance. For multi-instance/serverless
> scale, back it with a shared store (e.g. Upstash Redis) before heavy traffic.

## 5. Post-launch backlog (not blocking)
Repair/retry loop on bad AI diffs; text wrapping; edge waypoints/reconnect;
marquee select; fit-to-view; drag-from-palette; full accessibility pass
(focusable nodes, ARIA, contrast) + axe checks; analytics; visual-regression
snapshots; Firefox in CI.

## Known/accepted
- 1 low advisory: `@babel/core` via `next > styled-jsx` (build-time only, not
  runtime-exploitable; resolves when Next bumps styled-jsx). 0 moderate/high/critical.
