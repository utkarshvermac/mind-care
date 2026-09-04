# MindCare — Memory & Cognitive Wellness Platform

A full-stack (MERN) app for cognitive games, daily activities, a chat
assistant, and a caregiver dashboard: Next.js frontend + Express/MongoDB
backend.

## Repo layout

```
/                      Next.js frontend (App Router) — deployed to Vercel
  app/                 Routes (one folder per page)
  components/          UI components (auth, dashboard, games, assistant, analytics)
  lib/
    api.ts             Single integration point — every backend call goes through here
    i18n.tsx           Translations (English, Hindi, and 5 North-East languages)
    mock-data.ts       Fallback demo data, used only if the backend is unreachable
server/                Express + MongoDB backend — deploy separately (see below)
  src/
    models/            Mongoose schemas
    routes/            One file per resource (auth, games, patients, caregivers, ...)
    services/          Business logic
    middleware/        Auth + error handling
```

## Running locally

**Backend** (from `server/`):
```bash
cd server
npm install
cp .env.example .env       # fill in MONGODB_URI and JWT_SECRET — see the Atlas guide
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
- **Backend:** Express 5 + MongoDB (via Mongoose) + JWT auth (bcryptjs) + helmet + rate limiting
- **Voice:** Web Speech API (browser-native, in the Assistant screen)

## Deployment

- **Frontend → Vercel.** Root directory is the repo root. Set the
  `NEXT_PUBLIC_API_URL` environment variable to your deployed backend's URL
  (e.g. `https://your-backend.onrender.com/api`), then redeploy.
- **Backend → Render, Railway, or Vercel Functions.** Root directory is
  `server/`. Because this backend now uses MongoDB Atlas instead of a local
  SQLite file, it has no local disk state — it can run on any host,
  including serverless. See the separate **MongoDB Atlas setup guide** for
  the full walkthrough of creating a free cluster and getting your
  connection string.

## Auth, caregiver linking, privacy, and language

- **No demo mode.** Login/signup are real accounts against the backend.
- **Forgot/reset password** works, but no email service is configured: the
  reset token is returned directly in the API response and shown on screen.
  Wire up a real mailer (Nodemailer, Resend, etc.) in
  `server/src/routes/auth.routes.js` before using this in production.
- **Caregiver ↔ patient linking:** every patient gets a 6-character invite
  code (visible on their Profile page). A caregiver enters that code to
  link accounts. **A caregiver can be linked to more than one patient** —
  the dashboard shows a patient switcher when there's more than one.
- **Privacy:** patients can toggle "share my activity with my caregiver" in
  Settings. When off, the caregiver's dashboard shows only the patient's
  name, not their scores/activity/alerts.
- **Multilingual:** `lib/i18n.tsx` covers English, Hindi, and five
  North-East languages (Assamese, Bodo, Khasi, Mizo, Manipuri/Meitei) for
  the login/signup flow, navigation, and settings. The Bodo, Khasi, Mizo,
  and Manipuri translations are AI-generated first drafts and have **not**
  been reviewed by a native speaker — please have someone fluent check them
  before relying on them for real users. Games, the assistant's live chat
  replies, and chart data stay in English by design.

## Known bugs fixed in this version

- `resolveTargetPatientId` (used by nearly every data route) is async under
  MongoDB — every call site now `await`s it. A missed `await` here was
  silently loading the wrong or stale data.
- Game result IDs previously used a hand-built `${game}-${timestamp}`
  string that could collide if two results saved in the same millisecond,
  causing a score to silently fail to save. MongoDB's own auto-generated
  IDs fix this.
- A caregiver who just signed up had no patient linked and no proper UI for
  it — the app used to silently fall back to demo data instead. There is
  now a dedicated "link a patient" screen instead.
