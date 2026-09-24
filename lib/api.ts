// Single integration point for the MindCare backend (see /server in the repo).
// Every function here calls the real API over fetch(). The JWT returned by
// login/signup/demo-login is cached in LocalStorage and attached to every
// subsequent request automatically.

import { STORAGE_KEYS, readValue, removeValue, writeValue, type GameId, type GameResult } from "@/lib/storage"
import type { Role } from "@/lib/mock-data"

export type { GameId, GameResult }

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getToken(): string | null {
  return readValue<string | null>(STORAGE_KEYS.token, null)
}

function setToken(token: string) {
  writeValue(STORAGE_KEYS.token, token)
}

export function clearToken() {
  removeValue(STORAGE_KEYS.token)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (res.status === 204) return undefined as T

  let body: any = null
  try {
    body = await res.json()
  } catch {
    /* some error responses may not be JSON */
  }

  if (!res.ok) {
    const message = body?.error?.message ?? `Request failed (${res.status})`
    if (res.status === 401) clearToken()
    throw new ApiError(res.status, message)
  }

  return body as T
}

function get<T>(path: string) {
  return request<T>(path)
}
function post<T>(path: string, body?: unknown) {
  return request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined })
}
function patch<T>(path: string, body?: unknown) {
  return request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined })
}
function del<T>(path: string) {
  return request<T>(path, { method: "DELETE" })
}

/* --------------------------------- Types --------------------------------- */

export type BackendProfile = {
  id: string
  name: string
  firstName: string
  role: Role
  initials: string
  // patient-only
  age?: number | null
  condition?: string
  since?: string | null
  cognitiveScore?: number
  weeklyChange?: number
  streak?: number
  accuracy?: number
  activitiesDone?: number
  activitiesTotal?: number
  caregiver?: string | null
  phone?: string | null
  emergencyContacts?: EmergencyContact[]
  lastLocation?: { lat: number; lng: number; updatedAt: string } | null
  // caregiver-only
  relation?: string
  patients?: number
}

export type BackendActivity = { game: GameId; accuracy: number; score: number; when: string; whenLabel?: string }

export type EmergencyContact = { _id?: string; name: string; phone: string; relation: string }

export type BackendAlert = {
  id: string
  tone: "warning" | "info" | "success"
  title: string
  detail: string
  createdAt: string
  dismissed: boolean
}

export type BackendAnalytics = {
  weeklyScores: { date: string; day: string; label: string; score: number; activities: number }[]
  gamePerformance: { game: string; gameId: GameId; accuracy: number; sessions: number }[]
  accuracyBreakdown: { name: string; value: number }[]
  streakCalendar: number[]
  stats: { sessions: number; accuracy: number; best: number; minutes: number }
}

export type BackendReminder = { id: string; title: string; time: string; kind: string; taken: boolean }

export type BackendWellness = {
  date: string
  mood: string
  sleepHours: number
  water: { glasses: number; goal: number }
  steps: { count: number; goal: number }
  activities: { id: string; title: string; timeLabel: string; done: boolean }[]
  activitiesDone: number
  activitiesTotal: number
}

export type BackendPreferences = {
  theme: "light" | "dark"
  elderMode: boolean
  fontScale: "normal" | "large" | "xlarge"
  reduceMotion: boolean
  highContrast: boolean
  notifications: boolean
  sound: boolean
  language: "en" | "hi" | "as" | "brx" | "kha" | "lus" | "mni"
  shareWithCaregiver: boolean
}

export type ChatMessageRow = { id: string; role: "user" | "assistant"; text: string; at: string }

export type FamilyMemberRow = { id: string; name: string; relation: string; note: string; photoDataUrl: string | null }

export type JournalEntryRow = { id: string; title: string; text: string; audioDataUrl: string | null; createdAt: string }

export type MusicMemoryRow = { id: string; title: string; artist: string; note: string; link: string | null }

export type CaregiverWellness = { date: string; mood: number | null; stress: number | null; note: string; tip: string }

export type ReminiscenceQuiz = { questions: { question: string; answer: string }[]; empty: boolean }

/* ---------------------------------- Auth ---------------------------------- */

type AuthResponse = { token: string; role: Role; user: BackendProfile }

/** POST /auth/signup */
export async function signupUser(input: { name: string; email: string; password: string; role: Role }) {
  const data = await post<AuthResponse>("/auth/signup", input)
  setToken(data.token)
  return data
}

/** POST /auth/login */
export async function loginWithPassword(email: string, password: string) {
  const data = await post<AuthResponse>("/auth/login", { email, password })
  setToken(data.token)
  return data
}

/** POST /auth/forgot-password — no email service is configured, so the
 * backend returns the reset token directly for this demo build. */
export async function requestPasswordReset(email: string) {
  return post<{ message: string; devResetToken?: string; devNote?: string }>("/auth/forgot-password", { email })
}

/** POST /auth/reset-password */
export async function resetPassword(token: string, newPassword: string) {
  return post<{ message: string }>("/auth/reset-password", { token, newPassword })
}

/** GET /auth/me */
export async function getMe() {
  return get<{ role: Role; user: BackendProfile }>("/auth/me")
}

export function isAuthenticated() {
  return Boolean(getToken())
}

/* --------------------------------- Users --------------------------------- */

/** PATCH /users/me */
export async function updateDisplayName(name: string) {
  return patch<{ role: Role; user: BackendProfile }>("/users/me", { name })
}

/** PATCH /users/me — set or clear the phone number shown for calling this person */
export async function updatePhone(phone: string) {
  return patch<{ role: Role; user: BackendProfile }>("/users/me", { phone })
}

/** GET /users/me/preferences */
export async function getPreferences() {
  return get<BackendPreferences>("/users/me/preferences")
}

/** PATCH /users/me/preferences */
export async function updatePreferencesRemote(patch_: Partial<BackendPreferences>) {
  return patch<BackendPreferences>("/users/me/preferences", patch_)
}

/* ----------------------------- Patient / caregiver ----------------------------- */

/** GET /patients/me */
export async function getPatientData() {
  return get<{ profile: BackendProfile; activity: BackendActivity[] }>("/patients/me")
}

/** GET /patients/me/invite-code — the code a patient shares with their caregiver */
export async function getInviteCode() {
  return get<{ inviteCode: string }>("/patients/me/invite-code")
}

/** GET /caregivers/me/overview?patientId= — patient is null and linked:false until a caregiver links a patient.
 * `patients` lists every linked patient (id/name/initials) so the UI can offer a switcher. */
export async function getCaregiverData(patientId?: string) {
  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : ""
  return get<{
    profile: BackendProfile
    patient: (BackendProfile & { limited?: boolean }) | null
    patients: { id: string; name: string; initials: string }[]
    alerts: BackendAlert[]
    linked: boolean
    limited?: boolean
  }>(`/caregivers/me/overview${query}`)
}

/** POST /caregivers/me/link — link a caregiver account to a patient via their invite code */
export async function linkPatient(code: string) {
  return post<{ patient: BackendProfile }>("/caregivers/me/link", { code })
}

/** PATCH /caregivers/me/alerts/:id */
export async function dismissAlert(id: string) {
  return patch<BackendAlert>(`/caregivers/me/alerts/${id}`, { dismissed: true })
}

/* ---------------------------------- Games ---------------------------------- */

/** POST /game-results — falls back to a local-only save if the backend is unreachable. */
export async function saveGameResult(result: Omit<GameResult, "id" | "playedAt">) {
  try {
    const saved = await post<{
      id: string
      game: GameId
      score: number
      accuracy: number
      durationSeconds: number
      playedAt: string
    }>("/game-results", result)
    return saved
  } catch {
    // Offline / backend unreachable: keep working locally so the game screen
    // doesn't break, and sync is simply deferred.
    const { saveGameResultLocal } = await import("@/lib/storage")
    return saveGameResultLocal(result)
  }
}

/** GET /game-results/personal-best/:game */
export async function getPersonalBest(game: GameId) {
  try {
    const data = await get<{ game: GameId; best: number }>(`/game-results/personal-best/${game}`)
    return data.best
  } catch {
    const { personalBest } = await import("@/lib/storage")
    return personalBest(game)
  }
}

/* --------------------------------- Analytics --------------------------------- */

/** GET /analytics?patientId= */
export async function getAnalytics(patientId?: string) {
  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : ""
  return get<BackendAnalytics>(`/analytics${query}`)
}

/** GET /achievements */
export async function getAchievements() {
  return get<{ achievements: { id: string; title: string; detail: string; earned: boolean }[] }>("/achievements")
}

/* --------------------------------- Wellness --------------------------------- */

/** GET /wellness/today */
export async function getWellnessToday() {
  return get<BackendWellness>("/wellness/today")
}

/** PATCH /wellness/today */
export async function updateWellnessToday(body: { water?: number; mood?: string; sleepHours?: number; steps?: number }) {
  return patch<BackendWellness>("/wellness/today", body)
}

/** PATCH /wellness/today/activities/:activityId */
export async function toggleActivity(activityId: string, done: boolean) {
  return patch<BackendWellness>(`/wellness/today/activities/${activityId}`, { done })
}

/* --------------------------------- Reminders --------------------------------- */

/** GET /reminders */
export async function getReminders() {
  return get<{ reminders: BackendReminder[] }>("/reminders")
}

/** PATCH /reminders/:id/complete — confirm (or unconfirm) a reminder as done for today. */
export async function markReminderTaken(id: string, done: boolean) {
  return patch<{ reminders: BackendReminder[] }>(`/reminders/${id}/complete`, { done })
}

/* ----------------------------- Family & Faces ----------------------------- */

/** GET /family */
export async function getFamilyMembers() {
  return get<{ members: FamilyMemberRow[] }>("/family")
}

/** POST /family — photoDataUrl (optional) should already be a compressed image data: URL. */
export async function addFamilyMember(input: { name: string; relation: string; note?: string; photoDataUrl?: string | null }) {
  return post<FamilyMemberRow>("/family", input)
}

/** DELETE /family/:id */
export async function deleteFamilyMember(id: string) {
  return del<void>(`/family/${id}`)
}

/* --------------------------------- Journal --------------------------------- */

/** GET /journal */
export async function getJournalEntries() {
  return get<{ entries: JournalEntryRow[] }>("/journal")
}

/** POST /journal — audioDataUrl (optional) should already be an audio data: URL. */
export async function addJournalEntry(input: { title: string; text?: string; audioDataUrl?: string | null }) {
  return post<JournalEntryRow>("/journal", input)
}

/** DELETE /journal/:id */
export async function deleteJournalEntry(id: string) {
  return del<void>(`/journal/${id}`)
}

/* ------------------------------ Music Memories ------------------------------ */

/** GET /music */
export async function getMusicMemories() {
  return get<{ memories: MusicMemoryRow[] }>("/music")
}

/** POST /music */
export async function addMusicMemory(input: { title: string; artist?: string; note?: string; link?: string | null }) {
  return post<MusicMemoryRow>("/music", input)
}

/** DELETE /music/:id */
export async function deleteMusicMemory(id: string) {
  return del<void>(`/music/${id}`)
}

/* ------------------------------ Safety: SOS ------------------------------ */

/** GET /patients/me/emergency-contacts */
export async function getEmergencyContacts() {
  return get<{ contacts: EmergencyContact[] }>("/patients/me/emergency-contacts")
}

/** POST /patients/me/emergency-contacts */
export async function addEmergencyContact(input: { name: string; phone: string; relation?: string }) {
  return post<{ contacts: EmergencyContact[] }>("/patients/me/emergency-contacts", input)
}

/** DELETE /patients/me/emergency-contacts/:contactId */
export async function deleteEmergencyContact(contactId: string) {
  return del<{ contacts: EmergencyContact[] }>(`/patients/me/emergency-contacts/${contactId}`)
}

/** POST /patients/me/location — a single opt-in "share my location now" ping. */
export async function shareLocation(lat: number, lng: number) {
  return post<{ lastLocation: { lat: number; lng: number; updatedAt: string } }>("/patients/me/location", { lat, lng })
}

/** POST /patients/me/sos — immediately raises an urgent alert for every linked caregiver. */
export async function triggerSOS(note?: string) {
  return post<{ ok: true }>("/patients/me/sos", { note })
}

/* ------------------------------ Caregiver wellness ------------------------------ */

/** GET /wellness/caregiver-today — the signed-in caregiver's own daily check-in. */
export async function getCaregiverWellnessToday() {
  return get<CaregiverWellness>("/wellness/caregiver-today")
}

/** PATCH /wellness/caregiver-today */
export async function updateCaregiverWellnessToday(body: { mood?: number; stress?: number; note?: string }) {
  return patch<CaregiverWellness>("/wellness/caregiver-today", body)
}

/* --------------------------------- Assistant --------------------------------- */

/** POST /assistant/message */
export async function sendAssistantMessage(message: string) {
  return post<ChatMessageRow>("/assistant/message", { message })
}

/** GET /assistant/history */
export async function getAssistantHistory() {
  return get<{ messages: ChatMessageRow[] }>("/assistant/history")
}

/** DELETE /assistant/history */
export async function clearAssistantHistory() {
  return del<void>("/assistant/history")
}

/** GET /assistant/reminiscence-quiz — a short personal quiz built from the patient's
 * own Family & Faces and Journal entries. */
export async function getReminiscenceQuiz() {
  return get<ReminiscenceQuiz>("/assistant/reminiscence-quiz")
}
