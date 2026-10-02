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

/**
 * The current hour-of-day (0-23) in a timezone `offsetMinutes` east of UTC.
 * Used only for "is this overdue yet" alert comparisons against wall-clock
 * `timeLabel`s — day-bucketing elsewhere in the app stays in UTC on purpose
 * (see the note at the top of this file).
 */
function localHourNow(offsetMinutes = 0) {
  return new Date(Date.now() + offsetMinutes * 60000).getUTCHours()
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/**
 * A readable "now" timestamp in the timezone `offsetMinutes` east of UTC —
 * e.g. "Sep 30, 2026, 2:30 PM". Used for caregiver-facing alert text instead
 * of Date#toLocaleString(), which reflects the server's own locale/timezone
 * rather than the patient's.
 */
function localTimestampString(offsetMinutes = 0) {
  const shifted = new Date(Date.now() + offsetMinutes * 60000)
  const hour24 = shifted.getUTCHours()
  const hour12 = hour24 % 12 || 12
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0")
  const ampm = hour24 >= 12 ? "PM" : "AM"
  return `${MONTHS_SHORT[shifted.getUTCMonth()]} ${shifted.getUTCDate()}, ${shifted.getUTCFullYear()}, ${hour12}:${minutes} ${ampm}`
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
  localHourNow,
  localTimestampString,
  DAY_MS,
}
