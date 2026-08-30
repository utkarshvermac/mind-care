# MindCare — Memory & Cognitive Wellness Platform

A full-stack app for cognitive games, daily activities, a chat assistant,
and a caregiver dashboard: Next.js frontend + Express/SQLite backend.

## Repo layout

```
/                      Next.js frontend (App Router) — deployed to Vercel
  app/                 Routes (one folder per page)
  components/          UI components (auth, dashboard, games, assistant, analytics)
  lib/
    api.ts             Single integration point — every backend call goes through here
    mock-data.ts        Fallback demo data, used only if the backend is unreachable
server/                Express + SQLite backend — deploy separately (see below)
  src/
    routes/            One file per resource (auth, games, patients, caregivers, ...)
    controllers/ services/  Business logic
    models/ (via db/schema.sql)  Database schema
    middleware/         Auth + error handling
```

## Running locally

**Backend first** (from `server/`):
```bash
cd server
npm install
cp .env.example .env       # fill in a JWT secret
npm run seed                # optional — creates demo patient + caregiver accounts
npm run dev                  # runs on http://localhost:4000
```

**Frontend** (from the repo root):
```bash
cp .env.local.example .env.local   # points NEXT_PUBLIC_API_URL at localhost:4000/api
npm install
npm run dev                         # runs on http://localhost:3000
```

## Tech stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Recharts
- **Backend:** Express 5 + better-sqlite3 + JWT auth (bcryptjs) + helmet + rate limiting
- **Voice:** Web Speech API (browser-native, in the Assistant screen)

## Deployment

- **Frontend → Vercel.** Root directory is the repo root. Set the
  `NEXT_PUBLIC_API_URL` environment variable in the Vercel project to your
  deployed backend's URL (e.g. `https://your-backend.onrender.com/api`), then
  redeploy.
- **Backend → Render (or Railway).** Root directory is `server/`. SQLite
  writes to disk, so this backend needs a long-running Node process — it
  will **not** work as a Vercel serverless function. See the "Hosting the
  backend" walkthrough shared separately for exact steps.

## Notes for the next contributor

- If the backend is unreachable, the frontend falls back to demo data on
  every screen (dashboards, analytics, assistant) instead of breaking — look
  for the `catch` blocks in each page/component if you need to adjust that
  behavior.
- The "About the Developer" page (`app/about/page.tsx`) is a placeholder —
  fill in your name, bio, and links whenever you're ready.
- `next.config.mjs` currently has `typescript.ignoreBuildErrors: true`. Turn
  this off once you're ready to enforce strict type-checking in CI.
- Automatic caregiver alerts (score drops, missed activities, low
  sleep/water, streak milestones) are evaluated in
  `server/src/services/alertService.js` every time a caregiver loads their
  dashboard.
