"use client"

import { useCallback, useEffect, useState } from "react"
import { User, HeartHandshake, CalendarDays, ShieldCheck, Pencil, Check, Users, Copy, CheckCheck } from "lucide-react"
import { AppShell } from "@/components/common/app-shell"
import { Card } from "@/components/common/card"
import { useApp } from "@/components/app-provider"
import { caregiverProfile, patientProfile } from "@/lib/mock-data"
import { getMe, updateDisplayName, getInviteCode, type BackendProfile } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

export default function ProfilePage() {
  const { role, displayName, setDisplayName } = useApp()
  const { t } = useTranslation()
  const isCaregiver = role === "caregiver"

  const [person, setPerson] = useState<BackendProfile>(
    (isCaregiver ? caregiverProfile : patientProfile) as unknown as BackendProfile,
  )
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

  const name = displayName || person.name
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(name)
  const [saving, setSaving] = useState(false)

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const saveName = async () => {
    const trimmed = draftName.trim()
    if (!trimmed) {
      setEditing(false)
      return
    }
    setSaving(true)
    setDisplayName(trimmed)
    try {
      const { user } = await updateDisplayName(trimmed)
      setPerson(user)
    } catch {
      /* local display name still updated; will resync on next load */
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  return (
    <AppShell title="Profile">
      <div className="flex flex-col gap-6">
        {offline ? (
          <div className="rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 text-sm text-warning">
            Could not reach the server — showing your last known profile.
          </div>
        ) : null}

        <Card className="overflow-hidden p-0">
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex size-24 items-center justify-center rounded-3xl bg-primary text-2xl font-semibold text-primary-foreground shadow-sm">
                {initials || person.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary">MindCare profile</p>

                {editing ? (
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
                      disabled={saving}
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
                        setEditing(true)
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
                  {!isCaregiver && person.age ? ` · Age ${person.age}` : ""}
                </p>
              </div>
            </div>
          </div>

          {isCaregiver ? (
            <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
              <Info icon={<Users />} label="Relation" value={person.relation ?? caregiverProfile.relation} />
              <Info icon={<HeartHandshake />} label="Monitoring" value={`${person.patients ?? caregiverProfile.patients} patient`} />
              <Info icon={<User />} label="Account type" value="Caregiver account" />
              <Info icon={<ShieldCheck />} label="Access" value="Full dashboard & alerts" />
            </div>
          ) : (
            <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
              <Info icon={<HeartHandshake />} label="Caregiver" value={person.caregiver ?? "Not linked yet"} />
              <Info icon={<CalendarDays />} label="Care started" value={person.since ?? patientProfile.since} />
              <Info icon={<ShieldCheck />} label="Care plan" value={person.condition ?? patientProfile.condition} />
              <Info icon={<User />} label="Account type" value="Patient account" />
            </div>
          )}
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
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Stat label="Cognitive score" value={`${person.cognitiveScore ?? patientProfile.cognitiveScore}/100`} />
              <Stat label="Weekly change" value={`${(person.weeklyChange ?? patientProfile.weeklyChange) >= 0 ? "+" : ""}${person.weeklyChange ?? patientProfile.weeklyChange}%`} />
              <Stat label="Current streak" value={`${person.streak ?? patientProfile.streak} days`} />
            </div>
          </Card>
        ) : null}

        <Card>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <h3 className="font-display font-semibold">About this data</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This profile is synced with your MindCare account on the server. Changing your name here updates it
                everywhere you're signed in.
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
