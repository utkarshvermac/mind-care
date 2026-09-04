# MindCare Backend (MERN — MongoDB + Express)

REST API for the MindCare frontend, rewritten from SQLite to a full MERN
stack: MongoDB Atlas via Mongoose, Express, JWT auth.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- `MONGODB_URI` — your MongoDB Atlas connection string (see the separate
  Atlas setup guide for how to get this, start to finish)
- `JWT_SECRET` — any long random string
- `CORS_ORIGIN` — your frontend's URL (e.g. `http://localhost:3000` locally,
  or your Vercel URL in production)

Seed demo data (optional, recommended for testing):
```bash
npm run seed
```

Run:
```bash
npm run dev
```

## What changed from the SQLite version

- Every table is now a Mongoose model in `src/models/`.
- All service/route logic is `async` throughout — MongoDB calls are
  asynchronous, so every function that touches the database now returns a
  Promise. If you add new routes, remember to `await` calls into
  `services/profileService.js` (`resolveTargetPatientId`,
  `findLinkedPatient`, etc.) — forgetting `await` here was a real bug in an
  earlier version of this backend and caused wrong/stale data to load.
- Game result IDs are now MongoDB's own auto-generated ObjectId instead of a
  hand-built `${game}-${Date.now()}` string. The old approach could
  collide if two results were saved in the same millisecond, silently
  failing to save a score — this is fixed now.
- Caregivers can be linked to **more than one patient**. The
  `GET /caregivers/me/overview` endpoint now accepts `?patientId=` and also
  returns a `patients` list (id/name/initials for everyone linked) so the
  frontend can offer a patient switcher.
- Supported preference languages expanded to 7: English, Hindi, Assamese,
  Bodo, Khasi, Mizo, and Manipuri (Meitei) — see `SUPPORTED_LANGUAGES` in
  `src/routes/users.routes.js`.

## Project structure

```
src/
  models/        Mongoose schemas — one file per collection
  routes/        One file per resource, same URL shape as before
  services/      Business logic (profile calculations, alerts, analytics, assistant)
  middleware/    JWT auth, error handling
  utils/         Date helpers, JWT signing, async wrapper, ApiError
  db/
    connect.js   MongoDB connection
    seed.js      Demo data generator
  data/
    gamesCatalog.js   Static game metadata
```

## Deploying

Works on Render, Railway, or any host that runs a persistent Node process
(this backend is stateless now — no local file writes — so it also works
fine on serverless platforms like Vercel Functions, unlike the old SQLite
version). Set the same environment variables as `.env.example` in your
host's dashboard.
