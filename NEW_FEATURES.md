# MindCare — new features in this build

Everything below is wired end-to-end (backend routes + frontend UI) and
passes a full type-check (`npx tsc --noEmit`) and a Node syntax check on
every backend file. It hasn't been run against a live MongoDB instance or
through `next build` in this environment, so do a normal `npm install &&
npm run dev` (both `/` and `/server`) smoke test before deploying.

## New features

**Safety**
- SOS button on the patient dashboard — one tap (with confirmation) raises
  an urgent alert to every linked caregiver
- Emergency contacts list with one-tap calling (`tel:` links)
- "Share my location" — a single opt-in location ping, not continuous
  tracking; caregivers see a Google Maps link and timestamp

**Medication & reminders**
- Reminders can now be confirmed "taken" for the day
- Missed medication automatically raises a caregiver alert (reuses the
  existing alerts panel)

**Family & Faces**
- A photo/name/relation "family book" the patient manages themselves
- Powers a new game, **Face & Name Recall**, that quizzes the patient on
  their own family members (needs 3+ members added first)

**Clock Setting**
- A second new game: a classic clinical-style exercise where the patient
  taps where the clock's hour and minute hands should point for a given time

**Memories**
- A life-story journal (text and/or a short recorded voice note)
- A "Music Memories" list (title/artist/note/optional link — metadata
  only, no audio streaming, since MindCare doesn't hold music licensing)
- An AI-assisted "memory quiz" generated from the patient's own family and
  journal data (uses the existing Gemini integration when configured, with
  a template-based fallback so it always works)

**Accessibility**
- High-contrast mode (new toggle in Settings, alongside the existing elder
  mode / font scale / reduce motion)
- A "Read aloud" button (browser text-to-speech) on the dashboard greeting
  and the daily riddle/proverb card

**Caregiver wellbeing**
- A private, separate daily mood/stress check-in for the caregiver, with a
  short self-care tip — caregiver burnout is real and easy to overlook

**Culture Corner**
- A daily riddle or proverb on the patient dashboard, with a "reveal
  answer" interaction — a lightweight, non-scored way to spark conversation

**Care Report**
- A printable/exportable summary (profile, weekly scores, game
  performance, recent alerts) — use the browser's Print → Save as PDF

**Offline resilience**
- A basic PWA manifest + service worker caching the app shell, so the app
  still loads (without live data) if the connection drops briefly

## Where things live

| Feature | Backend | Frontend |
|---|---|---|
| SOS / emergency contacts / location | `patients.routes.js` | `components/dashboard/safety-card.tsx`, `patient-safety-summary.tsx` |
| Medication confirmation | `reminders.routes.js`, `alertService.js` | `patient-dashboard.tsx` |
| Family & Faces | `family.routes.js`, `FamilyMember.js` | `app/family/page.tsx`, `components/games/face-recall-game.tsx` |
| Clock Setting | `gamesCatalog.js`, `GameResult.js` | `components/games/clock-draw-game.tsx` |
| Journal / Music / quiz | `journal.routes.js`, `music.routes.js`, `assistantService.js` | `app/journal/page.tsx` |
| High contrast | `Preferences.js` | `app-provider.tsx`, `app/settings/page.tsx`, `app/globals.css` |
| Caregiver check-in | `wellness.routes.js`, `CaregiverWellnessLog.js` | `caregiver-selfcare-card.tsx` |
| Culture Corner | — (static content) | `lib/folklore-data.ts`, `culture-corner-card.tsx` |
| Care Report | — (reuses existing endpoints) | `app/reports/page.tsx` |
| Offline shell | `public/sw.js`, `public/manifest.json` | `components/common/pwa-register.tsx` |

## Deliberately not built (need paid third-party infrastructure)

These need external accounts/credentials this environment doesn't have, so
rather than fake them, here's what each would actually take to add:

- **Voice cloning** for reminders/assistant — a provider like ElevenLabs;
  raises real consent questions worth designing deliberately, not bolting on
- **Real telehealth video calls** — Twilio Video or Daily.co, plus a
  provider-matching workflow
- **SMS / email caregiver digests** — Twilio (SMS) or SendGrid/Postmark
  (email), plus a scheduled job (e.g. a cron-triggered serverless function)
- **Wearable sync** (steps, sleep, heart rate) — OAuth apps with Fitbit /
  Google Fit / Apple Health, one per platform
- **Real-time multiplayer / co-op games** — a WebSocket layer (Socket.io or
  similar) and session/matchmaking state; the current games are all
  single-player by design

If any of these become worth pursuing, the cleanest next step is usually
picking one, wiring up a sandbox/developer account for that provider, and
building it as its own vertical slice rather than all at once.
