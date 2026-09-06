// Frontend-only, rule based assistant.
// No external AI API, no keys, no network. The shape of `getAssistantReply` is
// intentionally async so it can later be swapped for a real model call.

import { patientProfile, reminders } from "@/lib/mock-data"
import { getGameResults } from "@/lib/storage"

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  at: string
}

export const suggestedPrompts = [
  "What should I do today?",
  "How am I doing this week?",
  "Let's play a memory game.",
  "Remind me about my routine.",
]

type Rule = {
  match: RegExp
  reply: () => string
}

const rules: Rule[] = [
  {
    match: /\b(hello|hi|hey|good morning|good evening|namaste)\b/i,
    reply: () => `Hello ${patientProfile.firstName}. It is good to see you. Would you like to start today's activity?`,
  },
  {
    match: /\b(game|play|puzzle|exercise|activity)\b/i,
    reply: () => {
      const played = getGameResults()
      if (played.length === 0) {
        return "You can try Card Match, Pattern Recall, or Word Recall today. Card Match is the gentlest place to begin - it takes about five minutes."
      }
      const last = played[0]
      return `Last time you played and scored ${last.score} points with ${last.accuracy}% accuracy. Nice work. Card Match, Pattern Recall, and Word Recall are all ready when you are.`
    },
  },
  {
    match: /\b(week|progress|doing|score|improv|better)\b/i,
    reply: () => {
      const results = getGameResults()
      const avg = results.length
        ? Math.round(results.reduce((sum, r) => sum + r.accuracy, 0) / results.length)
        : patientProfile.accuracy
      return `Your cognitive score is ${patientProfile.cognitiveScore} out of 100, which is ${patientProfile.weeklyChange}% higher than last week. Your average accuracy is around ${avg}% and you are on a ${patientProfile.streak} day streak.`
    },
  },
  {
    match: /\b(remind|routine|schedule|medicine|medication|pill)\b/i,
    reply: () =>
      `Here is your routine: ${reminders.map((r) => `${r.title} at ${r.time}`).join(", ")}. I will keep it simple and remind you one thing at a time.`,
  },
  {
    match: /\b(water|drink|thirsty|hydrate)\b/i,
    reply: () => "You have had 5 glasses of water today. Two or three more would be perfect. Would you like a reminder in an hour?",
  },
  {
    match: /\b(sleep|tired|rest|nap)\b/i,
    reply: () => "You slept about 7 and a half hours last night, which is healthy. If you feel tired, a short rest is absolutely fine.",
  },
  {
    match: /\b(sad|lonely|worried|anxious|upset|scared|confus)\b/i,
    reply: () =>
      "Thank you for telling me. Those feelings are normal and you are not alone. Try a slow breath in, and a slow breath out. Would you like me to call Anjali, your caregiver?",
  },
  {
    match: /\b(who am i|my name|where am i|what day)\b/i,
    reply: () =>
      `You are ${patientProfile.name}, you are ${patientProfile.age} years old, and you are safe at home. Today is ${new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}.`,
  },
  {
    match: /\b(caregiver|daughter|anjali|family|call)\b/i,
    reply: () => "Anjali is your caregiver and she can see your progress. She is only a phone call away whenever you need her.",
  },
  {
    match: /\b(thank|thanks|great|good job|nice)\b/i,
    reply: () => "You are very welcome. I am here whenever you need me.",
  },
  {
    match: /\b(help|what can you do|options)\b/i,
    reply: () =>
      "I can suggest an activity, tell you how your week is going, read out your routine, or start a memory game. Just ask in your own words.",
  },
]

const fallbacks = [
  "I am still learning, so I may not have that answer. You could try a memory game, or ask me how your week is going.",
  "I did not quite catch that. Would you like to see today's activities instead?",
  "Let's keep it simple. I can help with games, your progress, or your daily routine.",
]

export function replyTo(message: string): string {
  const rule = rules.find((r) => r.match.test(message))
  if (rule) return rule.reply()
  return fallbacks[Math.floor(Math.random() * fallbacks.length)]
}

/** FUTURE BACKEND: swap this body for a real model call. */
export async function getAssistantReply(message: string): Promise<string> {
  return new Promise((resolve) => setTimeout(() => resolve(replyTo(message)), 520))
}

export const greetingMessage: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text: `Hello ${patientProfile.firstName}. I am your MindCare assistant. You can type, or press the microphone and speak to me. What would you like to do today?`,
  at: new Date().toISOString(),
}
