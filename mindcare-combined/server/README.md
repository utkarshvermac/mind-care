# MindCare Backend

A REST API backend for the MindCare memory & cognitive wellness frontend. Node.js + Express + SQLite (`better-sqlite3`), JWT auth, no external services required.

It replaces `lib/mock-data.ts` and `lib/storage.ts` in the frontend with a real database, and is designed to be a drop-in for `lib/api.ts`, which the frontend already documents as its "single integration point" for a future backend.

## Quick start

```bash
npm install
cp .env.example .env      # defaults are fine for local dev
npm run seed               # creates demo patient + caregiver accounts with history
npm run dev                 # http://localhost:4000 (auto-restarts on file changes)
```

Re-running `npm run seed` is safe — it no-ops if the demo accounts already exist. To wipe and reseed: `npm run seed -- --reset`.

### Demo accounts

| Role      | Email                          | Password   |
|-----------|---------------------------------|------------|
| Patient   | `rahul.sharma@mindcare.demo`    | `mindcare` |
| Caregiver | `anjali.sharma@mindcare.demo`   | `mindcare` |

The patient account is pre-populated with ~10 weeks of game sessions, activity completions, wellness logs, and 3 caregiver alerts so every screen has real data on first run. The caregiver account is linked to the patient via `care_links`.

## Auth model

Every protected route expects `Authorization: Bearer <token>`. Get a token from:
- `POST /api/auth/signup` — create a brand-new account
- `POST /api/auth/login` — email + password
- `POST /api/auth/demo` — `{ "role": "patient" | "caregiver" }`, logs into the seeded demo account (for the frontend's "Continue as Patient / Caregiver" buttons)

Tokens are valid for 7 days by default (`JWT_EXPIRES_IN` in `.env`).

## Wiring it into the frontend

`lib/api.ts` in the frontend has five functions, each already commented with the endpoint it's meant to call. Here's the mapping plus what changes:

| `lib/api.ts` function | Backend endpoint | Notes |
|---|---|---|
| `loginUser(role)` | `POST /api/auth/demo` | Frontend's role-only quick login. For a real login form, use `POST /api/auth/login` with `{ email, password }` instead — see below. |
| `getPatientData()` | `GET /api/patients/me` | Needs `Authorization` header now. |
| `getCaregiverData()` | `GET /api/caregivers/me/overview` | Same. |
| `saveGameResult(result)` | `POST /api/game-results` | Body: `{ game, score, accuracy, durationSeconds }`. |
| `getAnalytics()` | `GET /api/analytics` | Response now also includes `streakCalendar` and `stats` (sessions/accuracy/best/minutes), which `components/analytics/analytics-view.tsx` can use directly instead of computing from `localResults`. |

Example rewrite of `lib/api.ts`:

```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("mindcare_token") : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers },
  })
  if (!res.ok) throw new Error((await res.json()).error?.message ?? "Request failed")
  return res.json()
}

export async function loginUser(role: Role) {
  const data = await api<{ token: string; role: Role; user: any }>("/auth/demo", {
    method: "POST",
    body: JSON.stringify({ role }),
  })
  localStorage.setItem("mindcare_token", data.token)
  return { role: data.role, user: data.user }
}

export async function getPatientData() {
  return api("/patients/me")
}

export async function getCaregiverData() {
  return api("/caregivers/me/overview")
}

export async function saveGameResult(result: Omit<GameResult, "id" | "playedAt">) {
  return api("/game-results", { method: "POST", body: JSON.stringify(result) })
}

export async function getAnalytics() {
  return api("/analytics")
}
```

Two things beyond `lib/api.ts` worth updating once real accounts exist:
- `components/auth/login-view.tsx` and `signup-view.tsx` currently read/write accounts straight to `localStorage` (see `readValue`/`writeValue` in `lib/storage.ts`), bypassing `lib/api.ts`. Point the "Log in" submit at `POST /api/auth/login` and "Create account" at `POST /api/auth/signup` instead.
- Set `CORS_ORIGIN` in `.env` to your frontend's dev URL (e.g. `http://localhost:3000`) instead of `*` once you're past local testing.

The backend intentionally covers more ground than the current `lib/api.ts` (wellness, reminders, achievements, the assistant, preferences) — those didn't have a "FUTURE BACKEND" comment in the frontend because they were pure LocalStorage before. Endpoints for all of them are below if you want to wire them up too.

## Full endpoint reference

All paths are prefixed with `/api`. 🔒 = requires `Authorization: Bearer <token>`.

### Auth
| Method & path | Auth | Body | Description |
|---|---|---|---|
| `POST /auth/signup` | – | `{ name, email, password, role }` | Create an account. `role` is `"patient"` or `"caregiver"`. |
| `POST /auth/login` | – | `{ email, password }` | |
| `POST /auth/demo` | – | `{ role }` | Logs into the seeded demo account for that role. |
| `GET /auth/me` | 🔒 | – | Current user's shaped profile. |

### Users
| Method & path | Auth | Body | Description |
|---|---|---|---|
| `GET /users/me` | 🔒 | – | Same as `/auth/me`. |
| `PATCH /users/me` | 🔒 | `{ name }` | Update display name. |
| `GET /users/me/preferences` | 🔒 | – | `{ theme, elderMode, fontScale, reduceMotion, notifications, sound }` |
| `PATCH /users/me/preferences` | 🔒 | any subset of the above | Partial update. |

### Patients / Caregivers
| Method & path | Auth | Description |
|---|---|---|
| `GET /patients/me` | 🔒 patient | `{ profile, activity }` — profile stats are computed live from stored game sessions & activity completions, not static. |
| `GET /caregivers/me/overview` | 🔒 caregiver | `{ profile, patient, alerts }` for their first linked patient. |
| `GET /caregivers/me/patients` | 🔒 caregiver | List of all linked patients (for multi-patient caregivers). |
| `GET /caregivers/me/alerts?patientId=` | 🔒 caregiver | Active (non-dismissed) alerts. |
| `PATCH /caregivers/me/alerts/:id` | 🔒 caregiver | `{ dismissed: true }` |

### Games
| Method & path | Auth | Description |
|---|---|---|
| `GET /games` | – | Catalog of the 3 games (metadata + config, e.g. word bank / card symbols). |
| `GET /games/:id` | – | Single game. |

### Game results
| Method & path | Auth | Body | Description |
|---|---|---|---|
| `POST /game-results` | 🔒 patient | `{ game, score, accuracy, durationSeconds }` | Also nudges the patient's long-term cognitive-score baseline. |
| `GET /game-results?limit=&patientId=` | 🔒 | – | History, most recent first. Caregivers must pass `patientId` (or omit to use their default linked patient). |
| `GET /game-results/personal-best/:game?patientId=` | 🔒 | – | `{ game, best }` |

### Analytics & achievements
| Method & path | Auth | Description |
|---|---|---|
| `GET /analytics?patientId=` | 🔒 | `{ weeklyScores, gamePerformance, accuracyBreakdown, streakCalendar, stats }`, all computed from real `game_results`/`activity_completions` rows. |
| `GET /achievements?patientId=` | 🔒 | 4 badges with `earned: boolean`, computed from real streak/accuracy/session-count data. |

### Wellness & daily activities
| Method & path | Auth | Body | Description |
|---|---|---|---|
| `GET /wellness/today?patientId=` | 🔒 | – | Mood, sleep, water, steps, and today's checklist with completion state. |
| `PATCH /wellness/today` | 🔒 patient | `{ water?, mood?, sleepHours?, steps? }` | Partial update of today's log. |
| `PATCH /wellness/today/activities/:activityId` | 🔒 patient | `{ done }` | Toggle one checklist item for today. |
| `POST /wellness/activities` | 🔒 patient | `{ title, timeLabel }` | Add a new checklist item. |
| `DELETE /wellness/activities/:activityId` | 🔒 patient | – | Remove a checklist item. |

### Reminders
| Method & path | Auth | Body | Description |
|---|---|---|---|
| `GET /reminders?patientId=` | 🔒 | – | |
| `POST /reminders` | 🔒 patient | `{ title, time, kind }` | |
| `DELETE /reminders/:id` | 🔒 patient | – | |

### Assistant
| Method & path | Auth | Body | Description |
|---|---|---|---|
| `POST /assistant/message` | 🔒 | `{ message }` | Rule-based reply (server-side port of `lib/assistant.ts`), grounded in the caller's real data. Persists both messages. |
| `GET /assistant/history` | 🔒 | – | Full chat history (or a greeting if empty). |
| `DELETE /assistant/history` | 🔒 | – | Clear history. |

All error responses look like `{ "error": { "message": "..." } }` with an appropriate HTTP status (400/401/403/404/409).

## How the numbers are computed

Nothing in the "live" data is hardcoded — it's derived from real rows so it changes as the patient actually plays games and checks off activities:

- **Streak**: consecutive days (ending today) with ≥1 game session or ≥1 completed activity.
- **Cognitive score**: blends a slow-moving baseline (`patient_profiles.cognitive_score_base`, nudged ~10% toward each new session's accuracy) with the average accuracy of the last 5 sessions.
- **Weekly change**: average accuracy this week vs. the 7 days before.
- **Streak calendar / weekly scores / game performance / accuracy breakdown**: all grouped straight from `game_results` and `activity_completions`, bucketed by UTC calendar day.

## Project structure

```
src/
  app.js, server.js       Express app + entry point
  config.js                 env var loading
  db/
    schema.sql              table definitions
    index.js                 opens the sqlite file, applies schema
    seed.js                   demo data generator
  middleware/                auth (JWT), error handling
  routes/                     one file per resource
  services/                   business logic (profile stats, analytics, achievements, assistant rules, account creation)
  data/gamesCatalog.js      static game metadata (ported from lib/mock-data.ts)
  utils/                       ApiError, JWT helpers, date helpers
data/mindcare.sqlite3       the database file (gitignored)
```

## Environment variables

See `.env.example`. Notably `JWT_SECRET` — change it before deploying anywhere real.

## Troubleshooting

**`npm install` fails while building `better-sqlite3`** (a `node-gyp rebuild` / native compilation error): this package compiles a small native addon on install. Usually a retry fixes it (the compiler occasionally hits a transient network error fetching Node headers). If it keeps failing, make sure Python 3 and a C++ toolchain (`build-essential` on Debian/Ubuntu) are installed, or use a Node version with prebuilt binaries available for your platform.

