const db = require("../db")
const { GAME_IDS, gameNames } = require("../data/gamesCatalog")
const { dateKeyDaysAgo, dayStart, weekdayShort, weekdayLong } = require("../utils/dates")

function resultsOnDate(userId, dateKey) {
  return db
    .prepare("SELECT * FROM game_results WHERE user_id = ? AND substr(played_at,1,10) = ?")
    .all(userId, dateKey)
}

function completedActivitiesOnDate(userId, dateKey) {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM activity_completions WHERE user_id = ? AND date = ? AND done = 1")
    .get(userId, dateKey)
  return row.n
}

/** Last 7 days (oldest -> newest), one point per day. */
function weeklyScores(userId) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const key = dateKeyDaysAgo(i)
    const date = dayStart(i)
    const dayResults = resultsOnDate(userId, key)
    const avg = dayResults.length
      ? Math.round(dayResults.reduce((sum, r) => sum + r.accuracy, 0) / dayResults.length)
      : 0
    const activities = dayResults.length + completedActivitiesOnDate(userId, key)
    days.push({
      date: key,
      day: weekdayShort(date),
      label: weekdayLong(date),
      score: avg,
      activities,
    })
  }
  return days
}

/** Accuracy + session count per game, always includes all three games. */
function gamePerformance(userId) {
  return GAME_IDS.map((gameId) => {
    const rows = db.prepare("SELECT accuracy FROM game_results WHERE user_id = ? AND game = ?").all(userId, gameId)
    const accuracy = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.accuracy, 0) / rows.length) : 0
    return { game: gameNames[gameId], gameId, accuracy, sessions: rows.length }
  })
}

/** Overall correct vs missed % across every session. */
function accuracyBreakdown(userId) {
  const rows = db.prepare("SELECT accuracy FROM game_results WHERE user_id = ?").all(userId)
  if (rows.length === 0) return [{ name: "Correct", value: 0 }, { name: "Missed", value: 0 }]
  const avg = Math.round(rows.reduce((sum, r) => sum + r.accuracy, 0) / rows.length)
  return [
    { name: "Correct", value: avg },
    { name: "Missed", value: 100 - avg },
  ]
}

/** GitHub-style 0-4 intensity per day for the last `weeks` weeks, oldest -> newest. */
function streakCalendar(userId, weeks = 12) {
  const totalDays = weeks * 7
  const values = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const key = dateKeyDaysAgo(i)
    const sessions = resultsOnDate(userId, key).length
    const activityCount = completedActivitiesOnDate(userId, key)
    const total = sessions + activityCount
    let intensity = 0
    if (total >= 4) intensity = 4
    else if (total === 3) intensity = 3
    else if (total === 2) intensity = 2
    else if (total === 1) intensity = 1
    values.push(intensity)
  }
  return values
}

/** Top-line stats: total sessions, average accuracy, best score, total minutes played. */
function overallStats(userId) {
  const rows = db.prepare("SELECT * FROM game_results WHERE user_id = ?").all(userId)
  if (rows.length === 0) return { sessions: 0, accuracy: 0, best: 0, minutes: 0 }
  return {
    sessions: rows.length,
    accuracy: Math.round(rows.reduce((sum, r) => sum + r.accuracy, 0) / rows.length),
    best: rows.reduce((max, r) => Math.max(max, r.score), 0),
    minutes: Math.round(rows.reduce((sum, r) => sum + r.duration_seconds, 0) / 60),
  }
}

function getAnalytics(userId) {
  return {
    weeklyScores: weeklyScores(userId),
    gamePerformance: gamePerformance(userId),
    accuracyBreakdown: accuracyBreakdown(userId),
    streakCalendar: streakCalendar(userId),
    stats: overallStats(userId),
  }
}

module.exports = {
  weeklyScores,
  gamePerformance,
  accuracyBreakdown,
  streakCalendar,
  overallStats,
  getAnalytics,
}
