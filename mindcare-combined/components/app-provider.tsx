"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { STORAGE_KEYS, readValue, removeValue, storageAvailable, writeValue } from "@/lib/storage"
import { clearToken, getPreferences, isAuthenticated, updatePreferencesRemote } from "@/lib/api"
import type { Role } from "@/lib/mock-data"

export type Preferences = {
  theme: "light" | "dark"
  elderMode: boolean
  fontScale: "normal" | "large" | "xlarge"
  reduceMotion: boolean
  notifications: boolean
  sound: boolean
  language: "en" | "hi" | "as"
  shareWithCaregiver: boolean
}

const defaultPreferences: Preferences = {
  theme: "light",
  elderMode: false,
  fontScale: "normal",
  reduceMotion: false,
  notifications: true,
  sound: true,
  language: "en",
  shareWithCaregiver: true,
}

const fontSizes: Record<Preferences["fontScale"], string> = {
  normal: "16px",
  large: "18px",
  xlarge: "21px",
}

type AppContextValue = {
  role: Role | null
  displayName: string | null
  ready: boolean
  storageOk: boolean
  preferences: Preferences
  login: (role: Role, name?: string) => void
  logout: () => void
  setDisplayName: (name: string) => void
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null)
  const [displayName, setDisplayNameState] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [ready, setReady] = useState(false)
  const [storageOk, setStorageOk] = useState(true)

  useEffect(() => {
    setStorageOk(storageAvailable())
    setRole(readValue<Role | null>(STORAGE_KEYS.userRole, null))
    setDisplayNameState(readValue<string | null>(STORAGE_KEYS.userName, null))
    setPreferences({ ...defaultPreferences, ...readValue<Partial<Preferences>>(STORAGE_KEYS.preferences, {}) })
    setReady(true)
  }, [])

  // Once logged in, pull the server copy of preferences so they follow the
  // account across devices. Falls back silently to the local copy if the
  // backend is unreachable.
  useEffect(() => {
    if (!ready || !role || !isAuthenticated()) return
    let cancelled = false
    getPreferences()
      .then((remote) => {
        if (cancelled) return
        setPreferences((prev) => {
          const merged = { ...prev, ...remote }
          writeValue(STORAGE_KEYS.preferences, merged)
          return merged
        })
      })
      .catch(() => {
        /* keep local preferences */
      })
    return () => {
      cancelled = true
    }
  }, [ready, role])

  // Apply preferences to the document root.
  useEffect(() => {
    if (!ready) return
    const root = document.documentElement
    root.classList.toggle("dark", preferences.theme === "dark")
    root.classList.toggle("elder-mode", preferences.elderMode)
    root.classList.toggle("reduce-motion", preferences.reduceMotion)
    const scale = preferences.elderMode && preferences.fontScale === "normal" ? "large" : preferences.fontScale
    root.style.setProperty("--app-font-size", fontSizes[scale])
  }, [preferences, ready])

  const setPreference = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value }
      writeValue(STORAGE_KEYS.preferences, next)
      if (isAuthenticated()) {
        void updatePreferencesRemote({ [key]: value }).catch(() => {
          /* best-effort sync — local value already applied */
        })
      }
      return next
    })
  }, [])

  const login = useCallback((next: Role, name?: string) => {
    writeValue(STORAGE_KEYS.userRole, next)
    setRole(next)
    if (name && name.trim()) {
      writeValue(STORAGE_KEYS.userName, name.trim())
      setDisplayNameState(name.trim())
    }
  }, [])

  const setDisplayName = useCallback((name: string) => {
    writeValue(STORAGE_KEYS.userName, name)
    setDisplayNameState(name)
  }, [])

  const logout = useCallback(() => {
    removeValue(STORAGE_KEYS.userRole)
    clearToken()
    setRole(null)
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({ role, displayName, ready, storageOk, preferences, login, logout, setDisplayName, setPreference }),
    [role, displayName, ready, storageOk, preferences, login, logout, setDisplayName, setPreference],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used inside AppProvider")
  return ctx
}
