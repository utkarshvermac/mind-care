const GameResult = require("../models/GameResult")
const { computeStreak } = require("./profileService")

async function getAchievements(userId) {
  const totalSessions = await GameResult.countDocuments({ userId })
  const cardMaster = await GameResult.exists({ userId, game: "card-match", accuracy: { $gte: 90 } })
  const perfect = await GameResult.exists({ userId, accuracy: 100 })
  const streak = await computeStreak(userId)

  return [
    { id: "ach1", title: "7 Day Streak", detail: "Played every day this week", earned: streak >= 7 },
    { id: "ach2", title: "Memory Master", detail: "90%+ accuracy in Card Match", earned: Boolean(cardMaster) },
    { id: "ach3", title: "Perfect Score", detail: "A full round with no mistakes", earned: Boolean(perfect) },
    { id: "ach4", title: "Consistent Learner", detail: "20 sessions completed", earned: totalSessions >= 20 },
  ]
}

module.exports = { getAchievements }
