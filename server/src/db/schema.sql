-- MindCare backend schema (SQLite)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient','caregiver')),
  initials TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patient_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER,
  condition TEXT NOT NULL DEFAULT 'Memory & cognitive care plan',
  care_since TEXT NOT NULL,
  cognitive_score_base INTEGER NOT NULL DEFAULT 70
);

CREATE TABLE IF NOT EXISTS caregiver_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  relation TEXT NOT NULL DEFAULT 'Caregiver'
);

CREATE TABLE IF NOT EXISTS care_links (
  id TEXT PRIMARY KEY,
  caregiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(caregiver_id, patient_id)
);

CREATE TABLE IF NOT EXISTS preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'light',
  elder_mode INTEGER NOT NULL DEFAULT 0,
  font_scale TEXT NOT NULL DEFAULT 'normal',
  reduce_motion INTEGER NOT NULL DEFAULT 0,
  notifications INTEGER NOT NULL DEFAULT 1,
  sound INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS game_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game TEXT NOT NULL CHECK (game IN ('card-match','pattern-recall','word-recall')),
  score INTEGER NOT NULL,
  accuracy INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  played_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_game_results_user ON game_results(user_id, played_at DESC);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  time_label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS activity_completions (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  UNIQUE(activity_id, date)
);
CREATE INDEX IF NOT EXISTS idx_activity_completions_user_date ON activity_completions(user_id, date);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  time_label TEXT NOT NULL,
  kind TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wellness_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  mood TEXT NOT NULL DEFAULT 'Good',
  sleep_hours REAL NOT NULL DEFAULT 7.5,
  water_glasses INTEGER NOT NULL DEFAULT 0,
  water_goal INTEGER NOT NULL DEFAULT 8,
  steps INTEGER NOT NULL DEFAULT 0,
  step_goal INTEGER NOT NULL DEFAULT 4000,
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS caregiver_alerts (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tone TEXT NOT NULL CHECK (tone IN ('warning','info','success')),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  dismissed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_alerts_patient ON caregiver_alerts(patient_id, dismissed);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  text TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_user_at ON chat_messages(user_id, at);
