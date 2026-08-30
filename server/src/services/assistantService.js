// Server-side port of the frontend's `lib/assistant.ts`. Same rule-based,
// no-external-API approach, but grounded in real stored data instead of
// hardcoded mock data. `getAssistantReply` is intentionally async so it can
// later be swapped for a call to a real LLM without touching the routes.

const db = require("../db")
const { getPatientProfile, findLinkedPatient } = require("./profileService")
const { gameNames } = require("../data/gamesCatalog")
const { todayKey, weekdayLong, dayStart } = require("../utils/dates")

function subjectPatientFor(user) {
  if (user.role === "patient") return user
  return findLinkedPatient(user.id)
}

function getReminders(userId) {
  return db.prepare("SELECT * FROM reminders WHERE user_id = ? ORDER BY sort_order ASC").all(userId)
}

function getTodayWellness(userId) {
  return db.prepare("SELECT * FROM wellness_logs WHERE user_id = ? AND date = ?").get(userId, todayKey())
}

function getLatestResult(userId) {
  return db.prepare("SELECT * FROM game_results WHERE user_id = ? ORDER BY played_at DESC LIMIT 1").get(userId)
}

function buildContext(user) {
  const subject = subjectPatientFor(user)
  if (!subject) return null

  const profile = getPatientProfile(subject.id)
  const reminders = getReminders(subject.id)
  const wellness = getTodayWellness(subject.id)
  const latest = getLatestResult(subject.id)

  return {
    isSelf: subject.id === user.id,
    subjectFirstName: profile.firstName,
    profile,
    reminders,
    wellness,
    latest,
  }
}

/** "you" for the patient talking about themself, or their name for a caregiver. */
function subjectWord(ctx) {
  return ctx.isSelf ? "You" : ctx.subjectFirstName
}
function subjectWordLower(ctx) {
  return ctx.isSelf ? "you" : ctx.subjectFirstName
}
function possessive(ctx) {
  return ctx.isSelf ? "your" : `${ctx.subjectFirstName}'s`
}
function areIs(ctx) {
  return ctx.isSelf ? "are" : "is"
}

const rules = [
  {
    match: /\b(hello|hi|hey|good morning|good evening|namaste)\b/i,
    reply: (ctx) =>
      ctx.isSelf
        ? `Hello ${ctx.subjectFirstName}. It is good to see you. Would you like to start today's activity?`
        : `Hello. ${ctx.subjectFirstName} last checked in recently. Would you like an update on their progress?`,
  },
  {
    match: /\b(game|play|puzzle|exercise|activity)\b/i,
    reply: (ctx) => {
      if (!ctx.latest) {
        return `${subjectWord(ctx)} can try Card Match, Pattern Recall, or Word Recall today. Card Match is the gentlest place to begin - it takes about five minutes.`
      }
      return `Last time, ${subjectWordLower(ctx)} played ${gameNames[ctx.latest.game]} and scored ${ctx.latest.score} points with ${ctx.latest.accuracy}% accuracy. Nice work. Card Match, Pattern Recall, and Word Recall are all ready when ${ctx.isSelf ? "you are" : "needed"}.`
    },
  },
  {
    match: /\b(week|progress|doing|score|improv|better)\b/i,
    reply: (ctx) =>
      `${possessive(ctx)[0].toUpperCase()}${possessive(ctx).slice(1)} cognitive score is ${ctx.profile.cognitiveScore} out of 100, which is ${ctx.profile.weeklyChange >= 0 ? "up" : "down"} ${Math.abs(ctx.profile.weeklyChange)}% vs last week. ${subjectWord(ctx)} ${areIs(ctx)} averaging around ${ctx.profile.accuracy}% accuracy and ${ctx.isSelf ? "are" : "is"} on a ${ctx.profile.streak} day streak.`,
  },
  {
    match: /\b(remind|routine|schedule|medicine|medication|pill)\b/i,
    reply: (ctx) => {
      if (ctx.reminders.length === 0) return "There are no reminders set up yet."
      const list = ctx.reminders.map((r) => `${r.title} at ${r.time_label}`).join(", ")
      return `Here is ${possessive(ctx)} routine: ${list}. I will keep it simple and remind ${ctx.isSelf ? "you" : "them"} one thing at a time.`
    },
  },
  {
    match: /\b(water|drink|thirsty|hydrate)\b/i,
    reply: (ctx) => {
      const glasses = ctx.wellness ? ctx.wellness.water_glasses : 0
      const goal = ctx.wellness ? ctx.wellness.water_goal : 8
      const remaining = Math.max(0, goal - glasses)
      return `${subjectWord(ctx)} ${areIs(ctx)} had ${glasses} glasses of water today. ${remaining} more would be perfect. Would you like a reminder in an hour?`
    },
  },
  {
    match: /\b(sleep|tired|rest|nap)\b/i,
    reply: (ctx) => {
      const hours = ctx.wellness ? ctx.wellness.sleep_hours : 7.5
      return `${subjectWord(ctx)} slept about ${hours} hours last night, which is healthy. If ${ctx.isSelf ? "you feel" : "they feel"} tired, a short rest is absolutely fine.`
    },
  },
  {
    match: /\b(sad|lonely|worried|anxious|upset|scared|confus)\b/i,
    reply: (ctx) =>
      `Thank you for telling me. Those feelings are normal and ${ctx.isSelf ? "you are" : "they are"} not alone. Try a slow breath in, and a slow breath out.${ctx.isSelf ? " Would you like me to notify your caregiver?" : ""}`,
  },
  {
    match: /\b(who am i|my name|where am i|what day)\b/i,
    reply: (ctx) => {
      const today = weekdayLong(dayStart(0))
      if (ctx.isSelf) {
        return `You are ${ctx.profile.name}, you are ${ctx.profile.age ?? "—"} years old, and you are safe at home. Today is ${today}.`
      }
      return `${ctx.profile.name} is ${ctx.profile.age ?? "—"} years old. Today is ${today}.`
    },
  },
  {
    match: /\b(caregiver|daughter|anjali|family|call)\b/i,
    reply: (ctx) =>
      ctx.profile.caregiver
        ? `${ctx.profile.caregiver} is ${ctx.isSelf ? "your" : "the"} caregiver and can see ${ctx.isSelf ? "your" : "their"} progress. ${ctx.isSelf ? "They are" : "You are"} only a phone call away whenever needed.`
        : "No caregiver is linked to this account yet.",
  },
  {
    match: /\b(thank|thanks|great|good job|nice)\b/i,
    reply: () => "You are very welcome. I am here whenever you need me.",
  },
  {
    match: /\b(help|what can you do|options)\b/i,
    reply: () =>
      "I can suggest an activity, share how the week is going, read out the daily routine, or point you to a memory game. Just ask in your own words.",
  },
]

const fallbacks = [
  "I am still learning, so I may not have that answer. You could try a memory game, or ask how the week is going.",
  "I did not quite catch that. Would you like to see today's activities instead?",
  "Let's keep it simple. I can help with games, progress, or the daily routine.",
]

function replyTo(message, ctx) {
  if (!ctx) return "I don't see a linked patient on this account yet, so I can only help with general questions."
  const rule = rules.find((r) => r.match.test(message))
  if (rule) return rule.reply(ctx)
  return fallbacks[Math.floor(Math.random() * fallbacks.length)]
}

async function getAssistantReply(user, message) {
  const ctx = buildContext(user)
  return replyTo(message, ctx)
}

function greetingFor(user) {
  const ctx = buildContext(user)
  const name = ctx ? ctx.subjectFirstName : subjectPatientFor(user)?.name?.split(" ")[0] || "there"
  return `Hello ${name}. I am your MindCare assistant. You can type, or press the microphone and speak to me. What would you like to do today?`
}

module.exports = { getAssistantReply, greetingFor }
