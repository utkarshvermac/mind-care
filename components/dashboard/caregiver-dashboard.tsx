"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Flame,
  Info,
  Phone,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react"
import { Card, CardSubtitle, CardTitle, SectionHeader } from "@/components/common/card"
import { ProgressBar, StatCard } from "@/components/common/stat-card"
import { WeeklyTrendChart } from "@/components/analytics/weekly-trend-chart"
import { StreakCalendar } from "@/components/analytics/streak-calendar"
import { LinkPatientView } from "@/components/dashboard/link-patient-view"
import { useApp } from "@/components/app-provider"
import { caregiverAlerts, caregiverProfile, dailyActivities, gameNames, gamePerformance, patientProfile, recentActivity } from "@/lib/mock-data"
import {
  dismissAlert as apiDismissAlert,
  getAnalytics,
  getCaregiverData,
  type BackendActivity,
  type BackendAlert,
  type BackendAnalytics,
  type BackendProfile,
} from "@/lib/api"
import { cn } from "@/lib/utils"

const toneStyles = {
  warning: { wrap: "border-warning/35 bg-warning/8", icon: "text-warning", Icon: AlertTriangle },
  info: { wrap: "border-primary/30 bg-primary/8", icon: "text-primary", Icon: Info },
  success: { wrap: "border-success/30 bg-success/8", icon: "text-success", Icon: CheckCircle2 },
} as const

export function CaregiverDashboard() {
  const { displayName } = useApp()
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [linked, setLinked] = useState(true)
  const [limited, setLimited] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [linkedPatients, setLinkedPatients] = useState<{ id: string; name: string; initials: string }[]>([])

  const [profile, setProfile] = useState<BackendProfile>(caregiverProfile as unknown as BackendProfile)
  const [patient, setPatient] = useState<BackendProfile>(patientProfile as unknown as BackendProfile)
  const [alerts, setAlerts] = useState<BackendAlert[]>(caregiverAlerts as unknown as BackendAlert[])
  const [analytics, setAnalytics] = useState<BackendAnalytics | null>(null)
  const [activityFeed, setActivityFeed] = useState<BackendActivity[]>(recentActivity as BackendActivity[])

  const firstName = (displayName || profile.firstName || "there").split(" ")[0]

  const load = useCallback(async (patientId?: string) => {
    setLoading(true)
    try {
      const overview = await getCaregiverData(patientId)
      setProfile(overview.profile)
      setLinkedPatients(overview.patients)
      setOffline(false)

      if (!overview.linked || !overview.patient) {
        setLinked(false)
        setLoading(false)
        return
      }
      setLinked(true)
      setSelectedPatientId(overview.patient.id)

      if (overview.limited) {
        setLimited(true)
        setPatient(overview.patient)
        setLoading(false)
        return
      }
      setLimited(false)
      setPatient(overview.patient)
      setAlerts(overview.alerts)

      const analyticsData = await getAnalytics(overview.patient.id)
      setAnalytics(analyticsData)
      setActivityFeed(
        analyticsData.weeklyScores
          .slice(-4)
          .reverse()
          .map((d) => ({ game: "card-match" as const, accuracy: d.score, score: d.score, when: d.label })),
      )
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const switchPatient = (patientId: string) => {
    if (patientId === selectedPatientId) return
    void load(patientId)
  }

  const dismissAlert = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    try {
      await apiDismissAlert(id)
    } catch {
      /* it will reappear on next reload if the dismiss didn't actually persist */
    }
  }

  const sessionCount = analytics?.stats.sessions ?? gamePerformance.reduce((sum, g) => sum + g.sessions, 0)
  const gamePerf = analytics?.gamePerformance ?? gamePerformance.map((g) => ({ game: g.game, gameId: "card-match" as const, accuracy: g.accuracy, sessions: g.sessions }))
  const doneToday = patient.activitiesDone ?? dailyActivities.filter((a) => a.done).length
  const totalToday = patient.activitiesTotal ?? dailyActivities.length

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading caregiver overview…</p>
      </div>
    )
  }

  if (!offline && !linked) {
    return <LinkPatientView onLinked={() => void load()} />
  }

  if (!offline && limited) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ShieldCheck className="size-8" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">{patient.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            This patient has chosen not to share their activity data with caregivers right now. You'll only see
            their name here.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {offline ? (
        <div className="rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 text-sm text-warning">
          Could not reach the server — showing demo data instead.
        </div>
      ) : null}

      {linkedPatients.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-2">
          <span className="px-2 text-sm font-medium text-muted-foreground">Viewing:</span>
          {linkedPatients.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => switchPatient(p.id)}
              aria-pressed={p.id === selectedPatientId}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                p.id === selectedPatientId
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-black/10 text-xs font-semibold">
                {p.initials}
              </span>
              {p.name}
            </button>
          ))}
        </div>
      ) : null}

      {/* Patient header */}
      <section className="surface animate-rise flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent font-display text-xl font-semibold text-primary-foreground">
            {patient.initials}
          </span>
          <div>
            <p className="text-sm text-muted-foreground">
              Hello {firstName} — you are monitoring
            </p>
            <h2 className="mt-0.5 font-display text-2xl font-semibold tracking-tight">{patient.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {patient.age} years · {patient.condition} · Since {patient.since}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/analytics"
            className="tap-target flex h-14 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <BarChart3 className="size-5" aria-hidden="true" />
            Full analytics
          </Link>
          <a
            href="tel:+911100000000"
            className="tap-target flex h-14 items-center gap-2 rounded-xl border border-border px-5 font-semibold transition-colors hover:border-primary hover:text-primary"
          >
            <Phone className="size-5" aria-hidden="true" />
            Call {patient.firstName}
          </a>
        </div>
      </section>

      {/* Stats */}
      <section aria-label="Patient summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cognitive score" value={patient.cognitiveScore ?? 0} suffix="/100" hint={`${(patient.weeklyChange ?? 0) >= 0 ? "+" : ""}${patient.weeklyChange ?? 0}% this week`} icon={<Brain className="size-5" />} tone="primary" />
        <StatCard label="Avg. accuracy" value={patient.accuracy ?? 0} suffix="%" hint="Last 7 days" icon={<Target className="size-5" />} tone="secondary" />
        <StatCard label="Sessions logged" value={sessionCount} hint="Across all games" icon={<Activity className="size-5" />} tone="accent" />
        <StatCard label="Current streak" value={patient.streak ?? 0} suffix=" days" hint="Longest this month" icon={<Flame className="size-5" />} tone="warning" />
      </section>

      {/* Alerts */}
      <section aria-label="Alerts and recommendations">
        <SectionHeader title="Alerts & recommendations" subtitle="Generated from the last 7 days of activity." />
        {alerts.length === 0 ? (
          <Card className="text-sm text-muted-foreground">No active alerts right now — everything looks steady.</Card>
        ) : (
          <ul className="grid gap-4 md:grid-cols-3">
            {alerts.map((alert) => {
              const style = toneStyles[alert.tone]
              return (
                <li key={alert.id} className={cn("flex flex-col gap-2 rounded-2xl border p-5", style.wrap)}>
                  <style.Icon className={cn("size-6", style.icon)} aria-hidden="true" />
                  <h3 className="mt-3 font-display font-semibold tracking-tight">{alert.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground text-pretty">{alert.detail}</p>
                  <button
                    type="button"
                    onClick={() => void dismissAlert(alert.id)}
                    className="mt-2 self-start text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Dismiss
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Weekly cognitive trend</CardTitle>
              <CardSubtitle>Daily score over the past week.</CardSubtitle>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1.5 text-sm font-semibold text-success">
              <TrendingUp className="size-4" aria-hidden="true" />
              {(patient.weeklyChange ?? 0) >= 0 ? "+" : ""}
              {patient.weeklyChange ?? 0}%
            </span>
          </div>
          <div className="mt-5">
            <WeeklyTrendChart data={analytics?.weeklyScores.map((d) => ({ day: d.day, score: d.score }))} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>Performance by game</CardTitle>
          <CardSubtitle>Accuracy across cognitive domains.</CardSubtitle>
          <ul className="mt-5 flex flex-col gap-5">
            {gamePerf.map((game) => (
              <li key={game.game} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{game.game}</span>
                  <span className="font-display font-semibold">{game.accuracy}%</span>
                </div>
                <ProgressBar
                  value={game.accuracy}
                  tone={game.accuracy >= 88 ? "success" : game.accuracy >= 80 ? "primary" : "warning"}
                  label={`${game.game} accuracy`}
                />
                <span className="text-sm text-muted-foreground">{game.sessions} sessions</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle>Engagement calendar</CardTitle>
          <CardSubtitle>Last 12 weeks of daily activity.</CardSubtitle>
          <div className="mt-5">
            <StreakCalendar data={analytics?.streakCalendar} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Today&apos;s adherence</CardTitle>
              <CardSubtitle>
                {doneToday} of {totalToday} activities completed.
              </CardSubtitle>
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar value={totalToday > 0 ? (doneToday / totalToday) * 100 : 0} tone="success" label="Adherence" />
          </div>
          <ul className="mt-5 flex flex-col gap-3">
            {dailyActivities.map((activity) => (
              <li key={activity.id} className="flex items-center gap-3">
                <span
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    activity.done ? "bg-success" : "bg-muted-foreground/40",
                  )}
                  aria-hidden="true"
                />
                <span className={cn("flex-1 text-sm", !activity.done && "text-muted-foreground")}>{activity.title}</span>
                <span className="text-sm text-muted-foreground">{activity.time}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section aria-label="Session log">
        <SectionHeader
          title="Session log"
          subtitle="Most recent cognitive game sessions."
          action={
            <Link href="/analytics" className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              View analytics <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {activityFeed.map((entry, index) => (
              <li key={`${entry.game}-${index}`} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent/12 text-accent" aria-hidden="true">
                  <Brain className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{gameNames[entry.game]}</span>
                  <span className="text-sm text-muted-foreground">{entry.whenLabel ?? entry.when}</span>
                </span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-semibold",
                    entry.accuracy >= 85 ? "bg-success/12 text-success" : entry.accuracy >= 75 ? "bg-primary/10 text-primary" : "bg-warning/12 text-warning",
                  )}
                >
                  {entry.accuracy}%
                </span>
                <span className="font-display font-semibold">{entry.score} pts</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  )
}
