// Centralized, safe LocalStorage access.
// Every persisted value in MindCare goes through this file so that storage keys
// and failure handling live in exactly one place.

export const STORAGE_KEYS = {
  userRole: "mindcare:userRole",
  userName: "mindcare:userName",
  accounts: "mindcare:accounts",
  preferences: "mindcare:userPreferences",
  gameResults: "mindcare:gameResults",
  chatHistory: "mindcare:chatHistory",
  wellness: "mindcare:wellness",
} as const

export function storageAvailable(): boolean {
  try {
    if (typeof window === "undefined") return false
    const probe = "__mindcare_probe__"
    window.localStorage.setItem(probe, "1")
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export function readValue<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeValue<T>(key: string, value: T): void {
  try {
    if (typeof window === "undefined") return
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage may be unavailable (private mode / quota). The app keeps working
    // with in-memory state only.
  }
}

export function removeValue(key: string): void {
  try {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(key)
  } catch {
    /* no-op */
  }
}

/* ------------------------------ Game results ------------------------------ */

export type GameId = "card-match" | "pattern-recall" | "word-recall"

export type GameResult = {
  id: string
  game: GameId
  score: number
  accuracy: number
  durationSeconds: number
  playedAt: string // ISO date
}

export function getGameResults(): GameResult[] {
  return readValue<GameResult[]>(STORAGE_KEYS.gameResults, [])
}

export function saveGameResultLocal(result: Omit<GameResult, "id" | "playedAt">): GameResult {
  const entry: GameResult = {
    ...result,
    id: `${result.game}-${Date.now()}`,
    playedAt: new Date().toISOString(),
  }
  const all = [entry, ...getGameResults()].slice(0, 200)
  writeValue(STORAGE_KEYS.gameResults, all)
  return entry
}

export function personalBest(game: GameId): number {
  return getGameResults()
    .filter((r) => r.game === game)
    .reduce((max, r) => Math.max(max, r.score), 0)
}
