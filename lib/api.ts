// Single integration point for a future backend.
//
// Today every function below resolves with local mock data or LocalStorage.
// When a real API exists, replace the bodies here with fetch() calls — no other
// file in the app needs to change.

import {
  accuracyBreakdown,
  caregiverAlerts,
  caregiverProfile,
  gamePerformance,
  patientProfile,
  recentActivity,
  weeklyScores,
  type Role,
} from "@/lib/mock-data"
import { getGameResults, saveGameResultLocal, type GameResult } from "@/lib/storage"

const simulate = <T,>(data: T, ms = 320): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(data), ms))

/** FUTURE BACKEND: POST /auth/login */
export async function loginUser(role: Role) {
  return simulate({ role, user: role === "patient" ? patientProfile : caregiverProfile }, 500)
}

/** FUTURE BACKEND: GET /patients/me */
export async function getPatientData() {
  return simulate({
    profile: patientProfile,
    activity: recentActivity,
  })
}

/** FUTURE BACKEND: GET /caregivers/me/overview */
export async function getCaregiverData() {
  return simulate({
    profile: caregiverProfile,
    patient: patientProfile,
    alerts: caregiverAlerts,
  })
}

/** FUTURE BACKEND: POST /game-results */
export async function saveGameResult(result: Omit<GameResult, "id" | "playedAt">) {
  return simulate(saveGameResultLocal(result), 120)
}

/** FUTURE BACKEND: GET /analytics */
export async function getAnalytics() {
  return simulate({
    weeklyScores,
    gamePerformance,
    accuracyBreakdown,
    localResults: getGameResults(),
  })
}
