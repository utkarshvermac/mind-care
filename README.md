# MindCare — Memory & Cognitive Wellness Platform

A calm, accessible frontend for cognitive games, daily activities, a chat
assistant, and a caregiver dashboard. Built with Next.js (App Router) and
TypeScript. Currently frontend-only — every screen runs on local mock data
and LocalStorage, with a single integration file (`lib/api.ts`) ready to be
swapped for a real backend.

## Tech stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Recharts (analytics charts)
- Web Speech API (voice input/output in the Assistant)
- LocalStorage for persistence (no backend required to run)

## Getting started

```bash
pnpm install   # or npm install / yarn install
pnpm dev       # or npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/                  Next.js routes (one folder per page)
  profile/            User profile (patient & caregiver views, editable name)
  settings/           Theme, elder mode, font scale, motion preferences
  about/              About the developer (placeholder — fill in your info)
  games/[gameId]/     Dynamic route for the three games
components/
  auth/               Login & signup screens, role selector
  common/             App shell (nav), cards, logo, stat widgets
  dashboard/          Patient & caregiver dashboards
  games/              Card Match, Pattern Recall, Word Recall + shared frame
  assistant/          Rule-based chat assistant with voice support
  analytics/          Charts: weekly trend, accuracy donut, streak calendar
lib/
  mock-data.ts        All fictional demo data lives here
  storage.ts           Centralized LocalStorage read/write, all keys
  api.ts               Single integration point — replace with real fetch() calls
  assistant.ts         Rule-based reply logic for the assistant
```

## Connecting a real backend

Every "future backend" touchpoint is marked in `lib/api.ts` with a comment
like `/** FUTURE BACKEND: POST /auth/login */`. Replace the function body
with a real `fetch()` call — no other file needs to change.

## Notes for the next contributor

- The "About the Developer" page (`app/about/page.tsx`) is a placeholder —
  fill in your name, bio, and links whenever you're ready.
- Accounts created via Sign Up are stored locally only (`lib/storage.ts`,
  `STORAGE_KEYS.accounts`) — this is a demo auth flow, not real security.
- `next.config.mjs` currently has `typescript.ignoreBuildErrors: true`. Turn
  this off once you're ready to enforce strict type-checking in CI.
founder - utkarsh
