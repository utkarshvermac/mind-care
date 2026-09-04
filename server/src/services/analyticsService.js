const GameResult = require("../models/GameResult")
const ActivityCompletion = require("../models/ActivityCompletion")
const { GAME_IDS, gameNames } = require("../data/gamesCatalog")
const { dateKeyDaysAgo, dayStart, weekdayShort, weekdayLong } = require("../utils/dates")

function dayRange(dateKey) {
  const start = new Date(`${dateKey}T00:00:00.000Z`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { $gte: start, $lt: end }
}

async function resultsOnDate(userId, dateKey) {
  return GameResult.find({ userId, playedAt: dayRange(dateKey) }).lean()
}

async function completedActivitiesOnDate(userId, dateKey) {
  return ActivityCompletion.countDocuments({ userId, date: dateKey, done: true })
}

/** Last 7 days (oldest -> newest), one point per day. */
async function weeklyScores(userId) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const key = dateKeyDaysAgo(i)
    const date = dayStart(i)
    const dayResults = await resultsOnDate(userId, key)
    const avg = dayResults.length
      ? Math.round(dayResults.reduce((sum, r) => sum + r.accuracy, 0) / dayResults.length)
      : 0
    const activities = dayResults.length + (await completedActivitiesOnDate(userId, key))
    days.push({ date: key, day: weekdayShort(date), label: weekdayLong(date), score: avg, activities })
  }
  return days
}

/** Accuracy + session count per game, always includes all three games. */
async function gamePerformance(userId) {
  const results = []
  for (const gameId of GAME_IDS) {
    const rows = await GameResult.find({ userId, game: gameId }).select("accuracy").lean()
    const accuracy = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.accuracy, 0) / rows.length) : 0
    results.push({ game: gameNames[gameId], gameId, accuracy, sessions: rows.length })
  }
  return results
}

/** Overall correct vs missed % across every session. */
async function accuracyBreakdown(userId) {
  const rows = await GameResult.find({ userId }).select("accuracy").lean()
  if (rows.length === 0) return [{ name: "Correct", value: 0 }, { name: "Missed", value: 0 }]
  const avg = Math.round(rows.reduce((sum, r) => sum + r.accuracy, 0) / rows.length)
  return [
    { name: "Correct", value: avg },
    { name: "Missed", value: 100 - avg },
  ]
}

/** GitHub-style 0-4 intensity per day for the last `weeks` weeks, oldest -> newest. */
async function streakCalendar(userId, weeks = 12) {
  const totalDays = weeks * 7
  const values = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const key = dateKeyDaysAgo(i)
    const sessions = (await resultsOnDate(userId, key)).length
    const activityCount = await completedActivitiesOnDate(userId, key)
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
async function overallStats(userId) {
  const rows = await GameResult.find({ userId }).lean()
  if (rows.length === 0) return { sessions: 0, accuracy: 0, best: 0, minutes: 0 }
  return {
    sessions: rows.length,
    accuracy: Math.round(rows.reduce((sum, r) => sum + r.accuracy, 0) / rows.length),
    best: rows.reduce((max, r) => Math.max(max, r.score), 0),
    minutes: Math.round(rows.reduce((sum, r) => sum + r.durationSeconds, 0) / 60),
  }
}

async function getAnalytics(userId) {
  return {
    weeklyScores: await weeklyScores(userId),
    gamePerformance: await gamePerformance(userId),
    accuracyBreakdown: await accuracyBreakdown(userId),
    streakCalendar: await streakCalendar(userId),
    stats: await overallStats(userId),
  }
}

module.exports = { weeklyScores, gamePerformance, accuracyBreakdown, streakCalendar, overallStats, getAnalytics }
