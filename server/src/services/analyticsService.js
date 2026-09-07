const GameResult = require("../models/GameResult")
const ActivityCompletion = require("../models/ActivityCompletion")
const { GAME_IDS, gameNames } = require("../data/gamesCatalog")
const { dateKeyDaysAgo, dayStart, weekdayShort, weekdayLong } = require("../utils/dates")

const CALENDAR_DAYS = 84 // 12 weeks, matches the streak calendar's window

/**
 * PERFORMANCE NOTE: this used to fetch one day at a time in a loop (84 days
 * x 2 queries = ~168 sequential round trips to MongoDB just for the streak
 * calendar, plus more for the weekly chart) — on a free-tier Atlas cluster
 * that added up to many seconds of load time on every dashboard/analytics
 * visit. It now fetches everything in exactly 2 queries and does all the
 * day-by-day grouping in memory instead.
 */
async function getAnalytics(userId) {
  const rangeStartKey = dateKeyDaysAgo(CALENDAR_DAYS - 1)
  const rangeStart = new Date(`${rangeStartKey}T00:00:00.000Z`)

  const [allResults, recentCompletions] = await Promise.all([
    GameResult.find({ userId }).select("game score accuracy durationSeconds playedAt").lean(),
    ActivityCompletion.find({ userId, done: true, date: { $gte: rangeStartKey } })
      .select("date")
      .lean(),
  ])

  const resultsByDate = new Map()
  for (const r of allResults) {
    const key = r.playedAt.toISOString().slice(0, 10)
    if (!resultsByDate.has(key)) resultsByDate.set(key, [])
    resultsByDate.get(key).push(r)
  }

  const completionCountByDate = new Map()
  for (const c of recentCompletions) {
    completionCountByDate.set(c.date, (completionCountByDate.get(c.date) || 0) + 1)
  }

  // Last 7 days, oldest -> newest.
  const weeklyScores = []
  for (let i = 6; i >= 0; i--) {
    const key = dateKeyDaysAgo(i)
    const date = dayStart(i)
    const dayResults = resultsByDate.get(key) || []
    const avg = dayResults.length
      ? Math.round(dayResults.reduce((sum, r) => sum + r.accuracy, 0) / dayResults.length)
      : 0
    const activities = dayResults.length + (completionCountByDate.get(key) || 0)
    weeklyScores.push({ date: key, day: weekdayShort(date), label: weekdayLong(date), score: avg, activities })
  }

  // GitHub-style 0-4 intensity per day for the last 12 weeks, oldest -> newest.
  const streakCalendar = []
  for (let i = CALENDAR_DAYS - 1; i >= 0; i--) {
    const key = dateKeyDaysAgo(i)
    const sessions = (resultsByDate.get(key) || []).length
    const activityCount = completionCountByDate.get(key) || 0
    const total = sessions + activityCount
    let intensity = 0
    if (total >= 4) intensity = 4
    else if (total === 3) intensity = 3
    else if (total === 2) intensity = 2
    else if (total === 1) intensity = 1
    streakCalendar.push(intensity)
  }

  // Accuracy + session count per game, all-time, always includes all three games.
  const gamePerformance = GAME_IDS.map((gameId) => {
    const rows = allResults.filter((r) => r.game === gameId)
    const accuracy = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.accuracy, 0) / rows.length) : 0
    return { game: gameNames[gameId], gameId, accuracy, sessions: rows.length }
  })

  // Overall correct vs missed %, all-time.
  const accuracyBreakdown =
    allResults.length === 0
      ? [
          { name: "Correct", value: 0 },
          { name: "Missed", value: 0 },
        ]
      : (() => {
          const avg = Math.round(allResults.reduce((sum, r) => sum + r.accuracy, 0) / allResults.length)
          return [
            { name: "Correct", value: avg },
            { name: "Missed", value: 100 - avg },
          ]
        })()

  // Top-line stats, all-time.
  const stats =
    allResults.length === 0
      ? { sessions: 0, accuracy: 0, best: 0, minutes: 0 }
      : {
          sessions: allResults.length,
          accuracy: Math.round(allResults.reduce((sum, r) => sum + r.accuracy, 0) / allResults.length),
          best: allResults.reduce((max, r) => Math.max(max, r.score), 0),
          minutes: Math.round(allResults.reduce((sum, r) => sum + r.durationSeconds, 0) / 60),
        }

  return { weeklyScores, gamePerformance, accuracyBreakdown, streakCalendar, stats }
}

module.exports = { getAnalytics }
