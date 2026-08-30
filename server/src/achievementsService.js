const db = require("../db")
const { computeStreak } = require("./profileService")

function getAchievements(userId) {
  const totalSessions = db.prepare("SELECT COUNT(*) AS n FROM game_results WHERE user_id = ?").get(userId).n
  const cardMasterRow = db
    .prepare("SELECT 1 FROM game_results WHERE user_id = ? AND game = 'card-match' AND accuracy >= 90 LIMIT 1")
    .get(userId)
  const perfectRow = db
    .prepare("SELECT 1 FROM game_results WHERE user_id = ? AND accuracy = 100 LIMIT 1")
    .get(userId)
  const streak = computeStreak(userId)

  return [
    {
      id: "ach1",
      title: "7 Day Streak",
      detail: "Played every day this week",
      earned: streak >= 7,
    },
    {
      id: "ach2",
      title: "Memory Master",
      detail: "90%+ accuracy in Card Match",
      earned: Boolean(cardMasterRow),
    },
    {
      id: "ach3",
      title: "Perfect Score",
      detail: "A full round with no mistakes",
      earned: Boolean(perfectRow),
    },
    {
      id: "ach4",
      title: "Consistent Learner",
      detail: "20 sessions completed",
      earned: totalSessions >= 20,
    },
  ]
}

module.exports = { getAchievements }
