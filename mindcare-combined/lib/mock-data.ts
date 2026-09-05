// Fictional demo data used across MindCare. No network calls, no real people.

import type { GameId } from "@/lib/storage"

export type Role = "patient" | "caregiver"

export const patientProfile = {
  name: "Rahul Sharma",
  firstName: "Rahul",
  age: 67,
  role: "patient" as Role,
  initials: "RS",
  condition: "Memory & cognitive care plan",
  since: "March 2025",
  cognitiveScore: 84,
  weeklyChange: 8,
  streak: 7,
  accuracy: 89,
  activitiesDone: 4,
  activitiesTotal: 5,
  caregiver: "Anjali Sharma",
}

export const caregiverProfile = {
  name: "Anjali Sharma",
  firstName: "Anjali",
  role: "caregiver" as Role,
  initials: "AS",
  relation: "Daughter · Primary caregiver",
  patients: 1,
}

export const games: {
  id: GameId
  name: string
  tagline: string
  description: string
  difficulty: "Easy" | "Medium" | "Hard"
  minutes: number
  accent: "primary" | "secondary" | "accent"
  skill: string
}[] = [
  {
    id: "card-match",
    name: "Card Match",
    tagline: "Find the matching pairs",
    description: "A short memory exercise designed to keep your mind active.",
    difficulty: "Easy",
    minutes: 5,
    accent: "primary",
    skill: "Visual memory",
  },
  {
    id: "pattern-recall",
    name: "Pattern Recall",
    tagline: "Remember the lit squares",
    description: "Watch a pattern light up, then tap the same squares back.",
    difficulty: "Medium",
    minutes: 4,
    accent: "secondary",
    skill: "Working memory",
  },
  {
    id: "word-recall",
    name: "Word Recall",
    tagline: "Remember the word list",
    description: "Read a few words, then pick out the ones you saw.",
    difficulty: "Easy",
    minutes: 3,
    accent: "accent",
    skill: "Verbal memory",
  },
]

export const gameNames: Record<GameId, string> = {
  "card-match": "Card Match",
  "pattern-recall": "Pattern Recall",
  "word-recall": "Word Recall",
}

export const weeklyScores = [
  { day: "Mon", label: "Monday", score: 72, activities: 3 },
  { day: "Tue", label: "Tuesday", score: 76, activities: 4 },
  { day: "Wed", label: "Wednesday", score: 74, activities: 3 },
  { day: "Thu", label: "Thursday", score: 79, activities: 5 },
  { day: "Fri", label: "Friday", score: 83, activities: 4 },
  { day: "Sat", label: "Saturday", score: 81, activities: 4 },
  { day: "Sun", label: "Sunday", score: 84, activities: 4 },
]

export const gamePerformance = [
  { game: "Card Match", accuracy: 92, sessions: 14 },
  { game: "Pattern Recall", accuracy: 81, sessions: 11 },
  { game: "Word Recall", accuracy: 86, sessions: 9 },
]

export const accuracyBreakdown = [
  { name: "Correct", value: 89 },
  { name: "Missed", value: 11 },
]

export const recentActivity: {
  game: GameId
  accuracy: number
  when: string
  score: number
}[] = [
  { game: "card-match", accuracy: 92, when: "Today", score: 820 },
  { game: "word-recall", accuracy: 84, when: "Yesterday", score: 640 },
  { game: "pattern-recall", accuracy: 76, when: "2 days ago", score: 580 },
]

export const dailyActivities = [
  { id: "a1", title: "Morning memory warm-up", time: "8:30 AM", done: true },
  { id: "a2", title: "Card Match session", time: "11:00 AM", done: true },
  { id: "a3", title: "Short walk with Anjali", time: "4:00 PM", done: true },
  { id: "a4", title: "Word Recall session", time: "6:00 PM", done: true },
  { id: "a5", title: "Evening breathing exercise", time: "8:30 PM", done: false },
]

export const reminders = [
  { id: "r1", title: "Take evening medicine", time: "8:00 PM", kind: "Medicine" },
  { id: "r2", title: "Call Anjali", time: "6:30 PM", kind: "Family" },
  { id: "r3", title: "Drink a glass of water", time: "Every 2 hours", kind: "Wellness" },
]

export const wellnessDefaults = {
  mood: "Good",
  sleepHours: 7.5,
  waterGlasses: 5,
  waterGoal: 8,
  steps: 2400,
  stepGoal: 4000,
}

export const caregiverAlerts = [
  {
    id: "al1",
    tone: "warning" as const,
    title: "Activity level decreased this week",
    detail: "Rahul completed 4 fewer activities than last week, mostly in the evenings.",
  },
  {
    id: "al2",
    tone: "info" as const,
    title: "Encourage a short cognitive activity today",
    detail: "Pattern Recall accuracy dipped to 76%. A 4 minute session would help.",
  },
  {
    id: "al3",
    tone: "success" as const,
    title: "7 day streak reached",
    detail: "Consistency is the strongest signal in the last 30 days. Keep it going.",
  },
]

export const achievements = [
  { id: "ach1", title: "7 Day Streak", detail: "Played every day this week", earned: true },
  { id: "ach2", title: "Memory Master", detail: "90%+ accuracy in Card Match", earned: true },
  { id: "ach3", title: "Perfect Score", detail: "A full round with no mistakes", earned: false },
  { id: "ach4", title: "Consistent Learner", detail: "20 sessions completed", earned: true },
]

// GitHub-style 12 week activity calendar (0-4 intensity), fictional.
export const streakCalendar: number[] = [
  0, 1, 2, 1, 0, 2, 3, 1, 2, 2, 0, 1, 3, 2, 1, 0, 2, 4, 3, 2, 1, 1, 0, 2, 3, 4, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 3,
  3, 4, 2, 1, 2, 0, 1, 3, 4, 3, 2, 2, 1, 3, 4, 4, 2, 1, 0, 2, 3, 4, 4, 3, 2, 1, 2, 3, 4, 3, 3, 2, 4, 3, 4, 4, 3, 2, 3,
  4, 4, 3, 2, 4, 4,
]

export const wordBank = [
  "APPLE",
  "RIVER",
  "BOOK",
  "FLOWER",
  "CHAIR",
  "TRAIN",
  "GARDEN",
  "CANDLE",
  "MARKET",
  "BRIDGE",
  "LETTER",
  "WINDOW",
  "MIRROR",
  "PENCIL",
  "BASKET",
  "SILVER",
]

export const cardSymbols = ["Sun", "Moon", "Leaf", "Heart", "Star", "Bell"] as const
