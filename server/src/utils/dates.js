// All date bucketing in this backend is done in UTC. This keeps "today",
// streaks, and the weekly/12-week charts deterministic regardless of what
// timezone the server or a given request happens to be in. `played_at` and
// other timestamps are stored as ISO strings (new Date().toISOString()),
// which are UTC, so grouping by the UTC calendar day keeps everything
// consistent.

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

/** Midnight UTC for "today", or offset backwards by `daysAgo`. */
function dayStart(daysAgo = 0) {
  const now = new Date()
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return new Date(utcMidnight - daysAgo * DAY_MS)
}

/** YYYY-MM-DD (UTC) for a Date. */
function toDateKey(date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function todayKey() {
  return toDateKey(dayStart(0))
}

function dateKeyDaysAgo(daysAgo) {
  return toDateKey(dayStart(daysAgo))
}

/** The YYYY-MM-DD portion of an ISO timestamp (already UTC). */
function dateKeyOf(isoString) {
  return isoString.slice(0, 10)
}

/** Human label like "Today", "Yesterday", "3 days ago" for an ISO timestamp. */
function relativeDayLabel(isoString) {
  const thenKey = dateKeyOf(isoString)
  let days = 0
  for (; days < 400; days++) {
    if (dateKeyDaysAgo(days) === thenKey) break
  }
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}

function weekdayShort(date) {
  return WEEKDAY_SHORT[date.getUTCDay()]
}

function weekdayLong(date) {
  return WEEKDAY_LONG[date.getUTCDay()]
}

module.exports = {
  dayStart,
  toDateKey,
  todayKey,
  dateKeyDaysAgo,
  dateKeyOf,
  relativeDayLabel,
  weekdayShort,
  weekdayLong,
  DAY_MS,
}
