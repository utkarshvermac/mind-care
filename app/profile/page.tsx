"use client"

import { useCallback, useEffect, useState } from "react"
import { User, HeartHandshake, CalendarDays, ShieldCheck, Pencil, Check, Users, Copy, CheckCheck, Phone } from "lucide-react"
import { AppShell } from "@/components/common/app-shell"
import { Card } from "@/components/common/card"
import { useApp } from "@/components/app-provider"
import { getMe, updateDisplayName, updatePhone, getInviteCode, type BackendProfile } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

export default function ProfilePage() {
  const { role, displayName, setDisplayName } = useApp()
  const { t } = useTranslation()
  const isCaregiver = role === "caregiver"

  // No mock-data fallback here on purpose: showing someone else's demo
  // profile for a moment while the real one loads was confusing (it looked
  // like a brand new account already had game history). We show a proper
  // loading state instead.
  const [person, setPerson] = useState<BackendProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const { user } = await getMe()
      setPerson(user)
      setOffline(false)
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
    }
    if (!isCaregiver) {
      try {
        const { inviteCode: code } = await getInviteCode()
        setInviteCode(code)
      } catch {
        /* invite code just won't show if this fails */
      }
    }
  }, [isCaregiver])

  useEffect(() => {
    void load()
  }, [load])

  const copyCode = async () => {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard access may be blocked — code is still visible to copy manually */
    }
  }

  const name = displayName || person?.name || ""
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(name)
  const [savingName, setSavingName] = useState(false)

  const [editingPhone, setEditingPhone] = useState(false)
  const [draftPhone, setDraftPhone] = useState("")
  const [savingPhone, setSavingPhone] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const saveName = async () => {
    const trimmed = draftName.trim()
    if (!trimmed) {
      setEditingName(false)
      return
    }
    setSavingName(true)
    setDisplayName(trimmed)
    try {
      const { user } = await updateDisplayName(trimmed)
      setPerson(user)
    } catch {
      /* local display name still updated; will resync on next load */
    } finally {
      setSavingName(false)
      setEditingName(false)
    }
  }

  const savePhone = async () => {
    setPhoneError(null)
    setSavingPhone(true)
    try {
      const { user } = await updatePhone(draftPhone.trim())
      setPerson(user)
      setEditingPhone(false)
    } catch {
      setPhoneError("Please enter a valid phone number.")
    } finally {
      setSavingPhone(false)
    }
  }

  if (loading) {
    return (
      <AppShell title="Profile">
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Profile">
      <div className="flex flex-col gap-6">
        {offline ? (
          <div className="rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 text-sm text-warning">
            Could not reach the server. Please try again shortly.
          </div>
        ) : null}

        <Card className="overflow-hidden p-0">
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex size-24 items-center justify-center rounded-3xl bg-primary text-2xl font-semibold text-primary-foreground shadow-sm">
                {initials || person?.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary">MindCare profile</p>

                {editingName ? (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void saveName()}
                      className="h-11 w-full max-w-xs rounded-lg border border-input bg-card px-3 text-lg font-semibold outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => void saveName()}
                      disabled={savingName}
                      aria-label="Save name"
                      className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      <Check className="size-5" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <h2 className="font-display text-2xl font-semibold tracking-tight">{name}</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftName(name)
                        setEditingName(true)
                      }}
                      aria-label="Edit name"
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </div>
                )}

                <p className="mt-1 text-muted-foreground">
                  {isCaregiver ? "Caregiver" : "Patient"}
                  {!isCaregiver && person?.age ? ` · Age ${person.age}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
            {isCaregiver ? (
              <>
                <Info icon={<Users />} label="Relation to patient" value={person?.relation || "Not set"} />
                <Info
                  icon={<HeartHandshake />}
                  label="Patients linked"
                  value={`${person?.patients ?? 0} ${person?.patients === 1 ? "patient" : "patients"}`}
                />
              </>
            ) : (
              <>
                <Info icon={<HeartHandshake />} label="Caregiver" value={person?.caregiver ?? "Not linked yet"} />
                <Info icon={<CalendarDays />} label="Care started" value={person?.since ?? "—"} />
                <Info icon={<ShieldCheck />} label="Care plan" value={person?.condition ?? "—"} />
              </>
            )}

            {/* Phone number — this used to be a hardcoded fake number on the
                caregiver dashboard's "Call" button with no way to set a real
                one. Now every account can add their own real number here. */}
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Phone className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-muted-foreground">Phone number</span>
                {editingPhone ? (
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      autoFocus
                      type="tel"
                      value={draftPhone}
                      onChange={(e) => setDraftPhone(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void savePhone()}
                      placeholder="+91 98765 43210"
                      className="h-9 w-full max-w-[180px] rounded-lg border border-input bg-card px-2 text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => void savePhone()}
                      disabled={savingPhone}
                      aria-label="Save phone number"
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      <Check className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftPhone(person?.phone || "")
                      setPhoneError(null)
                      setEditingPhone(true)
                    }}
                    className="mt-0.5 block font-semibold text-primary hover:underline"
                  >
                    {person?.phone || "Add a phone number"}
                  </button>
                )}
                {phoneError ? <span className="mt-1 block text-xs text-destructive">{phoneError}</span> : null}
              </span>
            </div>
          </div>
        </Card>

        {!isCaregiver ? (
          <Card>
            <h3 className="font-display text-lg font-semibold">{t("link.inviteCodeTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("link.inviteCodeSubtext")}</p>
            {inviteCode ? (
              <div className="mt-4 flex items-center gap-3">
                <span className="flex-1 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-5 py-4 text-center font-display text-2xl font-semibold tracking-[0.3em] text-primary">
                  {inviteCode}
                </span>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  aria-label="Copy invite code"
                  className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border hover:border-primary hover:text-primary"
                >
                  {copied ? <CheckCheck className="size-5 text-success" /> : <Copy className="size-5" />}
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">{t("common.loading")}</p>
            )}
          </Card>
        ) : null}

        {!isCaregiver ? (
          <Card>
            <h3 className="font-display text-lg font-semibold">Your MindCare snapshot</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your cognitive score starts at a neutral baseline and updates as you play games — it is not based on
              any session yet if you haven't played one.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Stat label="Cognitive score" value={`${person?.cognitiveScore ?? 70}/100`} />
              <Stat label="Weekly change" value={`${(person?.weeklyChange ?? 0) >= 0 ? "+" : ""}${person?.weeklyChange ?? 0}%`} />
              <Stat label="Current streak" value={`${person?.streak ?? 0} days`} />
            </div>
          </Card>
        ) : null}

        <Card>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <h3 className="font-display font-semibold">About this data</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This profile is synced with your MindCare account on the server. Changing your name or phone number
                here updates it everywhere you're signed in.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-muted-foreground">{label}</span>
        <span className="mt-0.5 block font-semibold">{value}</span>
      </span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  )
}
