// Two-tier assistant: if GEMINI_API_KEY is configured, replies come from a
// real LLM call grounded in the patient's actual stored data (see
// buildSystemPrompt below). If it's not configured, or the API call fails
// for any reason (rate limit, network, bad key), this falls back to the
// original rule-based engine automatically — the assistant never breaks.

const Reminder = require("../models/Reminder")
const WellnessLog = require("../models/WellnessLog")
const GameResult = require("../models/GameResult")
const { getPatientProfile, findLinkedPatient } = require("./profileService")
const { gameNames } = require("../data/gamesCatalog")
const { todayKey, weekdayLong, dayStart } = require("../utils/dates")
const geminiService = require("./geminiService")

async function subjectPatientFor(user) {
  if (user.role === "patient") return user
  return findLinkedPatient(user.id)
}

async function getReminders(userId) {
  return Reminder.find({ userId }).sort({ sortOrder: 1 }).lean()
}

async function getTodayWellness(userId) {
  return WellnessLog.findOne({ userId, date: todayKey() }).lean()
}

async function getLatestResult(userId) {
  return GameResult.findOne({ userId }).sort({ playedAt: -1 }).lean()
}

async function buildContext(user) {
  const subject = await subjectPatientFor(user)
  if (!subject) return null

  const subjectId = subject.id || subject._id
  const profile = await getPatientProfile(subjectId)
  const reminders = await getReminders(subjectId)
  const wellness = await getTodayWellness(subjectId)
  const latest = await getLatestResult(subjectId)

  return {
    isSelf: subjectId === user.id,
    subjectFirstName: profile.firstName,
    profile,
    reminders,
    wellness,
    latest,
  }
}

/** Builds the grounding context + persona instructions sent to Gemini as the system prompt. */
function buildSystemPrompt(ctx) {
  const who = ctx.isSelf
    ? `You are talking directly to ${ctx.subjectFirstName}, the patient.`
    : `You are talking to a caregiver asking about their patient, ${ctx.subjectFirstName}.`

  const reminders = ctx.reminders.length
    ? ctx.reminders.map((r) => `${r.title} at ${r.timeLabel}`).join("; ")
    : "none set up yet"

  const wellness = ctx.wellness
    ? `mood: ${ctx.wellness.mood}, slept ${ctx.wellness.sleepHours}h, drank ${ctx.wellness.waterGlasses}/${ctx.wellness.waterGoal} glasses of water`
    : "no wellness data logged today yet"

  const lastSession = ctx.latest
    ? `Last game: ${gameNames[ctx.latest.game]}, scored ${ctx.latest.score} points at ${ctx.latest.accuracy}% accuracy.`
    : "No games played yet."

  return `You are the MindCare assistant, a warm and patient AI companion inside a memory and cognitive wellness app for people managing memory/cognitive challenges and their family caregivers, in India's North-East region.

${who}

Real data about ${ctx.subjectFirstName} right now:
- Cognitive score: ${ctx.profile.cognitiveScore}/100 (${ctx.profile.weeklyChange >= 0 ? "up" : "down"} ${Math.abs(ctx.profile.weeklyChange)}% this week)
- Current streak: ${ctx.profile.streak} days
- Average accuracy: ${ctx.profile.accuracy}%
- ${lastSession}
- Today's reminders: ${reminders}
- Today's wellness: ${wellness}

How to respond:
- Keep replies short: 2-4 sentences, plain everyday language, no medical jargon.
- Be warm, encouraging, and calm — never clinical or robotic.
- Ground your answer in the real data above when relevant; don't invent numbers.
- If asked about medication dosages, diagnoses, or anything requiring medical judgment, gently say to check with their doctor or caregiver instead of guessing.
- If the person expresses sadness, confusion, or distress, respond with empathy first, in simple reassuring words.
- Address ${ctx.isSelf ? "them as \"you\"" : `${ctx.subjectFirstName} in the third person, since you're speaking with their caregiver`}.`
}

/** Recent chat history for this user, oldest first — gives the LLM real conversational memory. */
async function recentHistoryFor(userId, limit = 10) {
  const ChatMessage = require("../models/ChatMessage")
  const rows = await ChatMessage.find({ userId }).sort({ at: -1 }).limit(limit).lean()
  return rows.reverse().map((m) => ({ role: m.role, text: m.text }))
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
      const list = ctx.reminders.map((r) => `${r.title} at ${r.timeLabel}`).join(", ")
      return `Here is ${possessive(ctx)} routine: ${list}. I will keep it simple and remind ${ctx.isSelf ? "you" : "them"} one thing at a time.`
    },
  },
  {
    match: /\b(water|drink|thirsty|hydrate)\b/i,
    reply: (ctx) => {
      const glasses = ctx.wellness ? ctx.wellness.waterGlasses : 0
      const goal = ctx.wellness ? ctx.wellness.waterGoal : 8
      const remaining = Math.max(0, goal - glasses)
      return `${subjectWord(ctx)} ${areIs(ctx)} had ${glasses} glasses of water today. ${remaining} more would be perfect. Would you like a reminder in an hour?`
    },
  },
  {
    match: /\b(sleep|tired|rest|nap)\b/i,
    reply: (ctx) => {
      const hours = ctx.wellness ? ctx.wellness.sleepHours : 7.5
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
        return `You are ${ctx.profile.name}, you are ${ctx.profile.age ?? "unknown"} years old, and you are safe at home. Today is ${today}.`
      }
      return `${ctx.profile.name} is ${ctx.profile.age ?? "unknown"} years old. Today is ${today}.`
    },
  },
  {
    match: /\b(caregiver|daughter|family|call)\b/i,
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
  const ctx = await buildContext(user)
  if (!ctx) return "I don't see a linked patient on this account yet, so I can only help with general questions."

  if (geminiService.isConfigured()) {
    try {
      const history = await recentHistoryFor(user.id)
      const systemPrompt = buildSystemPrompt(ctx)
      return await geminiService.generateReply(systemPrompt, history, message)
    } catch (err) {
      console.error("[assistantService] Gemini call failed, falling back to rule-based reply:", err.message)
    }
  }

  return replyTo(message, ctx)
}

async function greetingFor(user) {
  const ctx = await buildContext(user)
  const subject = ctx ? null : await subjectPatientFor(user)
  const name = ctx ? ctx.subjectFirstName : subject?.name?.split(" ")[0] || "there"
  return `Hello ${name}. I am your MindCare assistant. You can type, or press the microphone and speak to me. What would you like to do today?`
}

module.exports = { getAssistantReply, greetingFor }
