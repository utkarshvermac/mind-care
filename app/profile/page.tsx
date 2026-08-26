"use client"

import { useState } from "react"
import { User, HeartHandshake, CalendarDays, ShieldCheck, Pencil, Check, Users } from "lucide-react"
import { AppShell } from "@/components/common/app-shell"
import { Card } from "@/components/common/card"
import { useApp } from "@/components/app-provider"
import { caregiverProfile, patientProfile } from "@/lib/mock-data"

export default function ProfilePage() {
  const { role, displayName, setDisplayName } = useApp()
  const isCaregiver = role === "caregiver"

  // The app is frontend-only for now, so the detailed stats come from
  // mock-data. Only the display name reflects what the person actually
  // entered at signup — everything else is demo data ready to be replaced
  // by a real backend later.
  const person = isCaregiver ? caregiverProfile : patientProfile
  const name = displayName || person.name

  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(name)

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const saveName = () => {
    if (draftName.trim()) setDisplayName(draftName.trim())
    setEditing(false)
  }

  return (
    <AppShell title="Profile">
      <div className="flex flex-col gap-6">
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
                      onKeyDown={(e) => e.key === "Enter" && saveName()}
                      className="h-11 w-full max-w-xs rounded-lg border border-input bg-card px-3 text-lg font-semibold outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={saveName}
                      aria-label="Save name"
                      className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
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
                  {!isCaregiver ? ` · Age ${patientProfile.age}` : ""}
                </p>
              </div>
            </div>
          </div>

          {isCaregiver ? (
            <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
              <Info icon={<Users />} label="Relation" value={caregiverProfile.relation} />
              <Info icon={<HeartHandshake />} label="Monitoring" value={`${caregiverProfile.patients} patient`} />
              <Info icon={<User />} label="Account type" value="Demo caregiver account" />
              <Info icon={<ShieldCheck />} label="Access" value="Full dashboard & alerts" />
            </div>
          ) : (
            <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
              <Info icon={<HeartHandshake />} label="Caregiver" value={patientProfile.caregiver} />
              <Info icon={<CalendarDays />} label="Care started" value={patientProfile.since} />
              <Info icon={<ShieldCheck />} label="Care plan" value={patientProfile.condition} />
              <Info icon={<User />} label="Account type" value="Demo patient account" />
            </div>
          )}
        </Card>

        {!isCaregiver ? (
          <Card>
            <h3 className="font-display text-lg font-semibold">Your MindCare snapshot</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Stat label="Cognitive score" value={`${patientProfile.cognitiveScore}/100`} />
              <Stat label="Weekly change" value={`+${patientProfile.weeklyChange}%`} />
              <Stat label="Current streak" value={`${patientProfile.streak} days`} />
            </div>
          </Card>
        ) : (
          <Card>
            <h3 className="font-display text-lg font-semibold">Patient you&apos;re monitoring</h3>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 font-display text-lg font-semibold text-primary">
                {patientProfile.initials}
              </div>
              <div>
                <p className="font-semibold">{patientProfile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {patientProfile.age} years · {patientProfile.condition}
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <h3 className="font-display font-semibold">About this data</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your name is saved on this device. Everything else here is demo data for the frontend prototype — a
                real backend can replace it later without changing this page's structure.
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
