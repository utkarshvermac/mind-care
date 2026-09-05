const fs = require("fs")
const path = require("path")
const Database = require("better-sqlite3")
const config = require("../config")

// Make sure the folder that holds the sqlite file exists.
fs.mkdirSync(path.dirname(config.dbPath), { recursive: true })

const db = new Database(config.dbPath)
db.pragma("journal_mode = WAL")
db.pragma("foreign_keys = ON")

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8")
db.exec(schema)

// Lightweight migration: CREATE TABLE IF NOT EXISTS won't add new columns to
// a table that already exists from a previous deploy, so patch those in by
// hand. Safe to run every startup — each check is a no-op once applied.
function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all()
  const exists = columns.some((c) => c.name === column)
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

ensureColumn("patient_profiles", "invite_code", "TEXT")
ensureColumn("preferences", "language", "TEXT NOT NULL DEFAULT 'en'")
ensureColumn("preferences", "share_with_caregiver", "INTEGER NOT NULL DEFAULT 1")

module.exports = db
