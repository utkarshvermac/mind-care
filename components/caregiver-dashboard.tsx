"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
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
  Target,
  TrendingUp,
} from "lucide-react"
import { Card, CardSubtitle, CardTitle, SectionHeader } from "@/components/common/card"
import { ProgressBar, StatCard } from "@/components/common/stat-card"
import { WeeklyTrendChart } from "@/components/analytics/weekly-trend-chart"
import { StreakCalendar } from "@/components/analytics/streak-calendar"
import { useApp } from "@/components/app-provider"
import {
  caregiverAlerts,
  caregiverProfile,
  dailyActivities,
  gameNames,
  gamePerformance,
  patientProfile,
  recentActivity,
} from "@/lib/mock-data"
import { getGameResults, type GameResult } from "@/lib/storage"
import { cn } from "@/lib/utils"

const toneStyles = {
  warning: { wrap: "border-warning/35 bg-warning/8", icon: "text-warning", Icon: AlertTriangle },
  info: { wrap: "border-primary/30 bg-primary/8", icon: "text-primary", Icon: Info },
  success: { wrap: "border-success/30 bg-success/8", icon: "text-success", Icon: CheckCircle2 },
} as const

export function CaregiverDashboard() {
  const { displayName } = useApp()
  const firstName = (displayName || caregiverProfile.firstName).split(" ")[0]
  const [results, setResults] = useState<GameResult[]>([])

  useEffect(() => {
    setResults(getGameResults())
  }, [])

  const sessionCount = results.length || gamePerformance.reduce((sum, g) => sum + g.sessions, 0)
  const activityFeed = results.length
    ? results.slice(0, 4).map((r) => ({
        game: r.game,
        accuracy: r.accuracy,
        score: r.score,
        when: new Date(r.playedAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
      }))
    : recentActivity
  const doneToday = dailyActivities.filter((a) => a.done).length

  return (
    <div className="flex flex-col gap-8">
      {/* Patient header */}
      <section className="surface animate-rise flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent font-display text-xl font-semibold text-primary-foreground">
            {patientProfile.initials}
          </span>
          <div>
            <p className="text-sm text-muted-foreground">
              Hello {firstName} — you are monitoring
            </p>
            <h2 className="mt-0.5 font-display text-2xl font-semibold tracking-tight">{patientProfile.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {patientProfile.age} years · {patientProfile.condition} · Since {patientProfile.since}
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
            Call {patientProfile.firstName}
          </a>
        </div>
      </section>

      {/* Stats */}
      <section aria-label="Patient summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cognitive score" value={patientProfile.cognitiveScore} suffix="/100" hint={`+${patientProfile.weeklyChange}% this week`} icon={<Brain className="size-5" />} tone="primary" />
        <StatCard label="Avg. accuracy" value={patientProfile.accuracy} suffix="%" hint="Last 7 days" icon={<Target className="size-5" />} tone="secondary" />
        <StatCard label="Sessions logged" value={sessionCount} hint="Across all games" icon={<Activity className="size-5" />} tone="accent" />
        <StatCard label="Current streak" value={patientProfile.streak} suffix=" days" hint="Longest this month" icon={<Flame className="size-5" />} tone="warning" />
      </section>

      {/* Alerts */}
      <section aria-label="Alerts and recommendations">
        <SectionHeader title="Alerts & recommendations" subtitle="Generated from the last 7 days of activity." />
        <ul className="grid gap-4 md:grid-cols-3">
          {caregiverAlerts.map((alert) => {
            const style = toneStyles[alert.tone]
            return (
              <li key={alert.id} className={cn("rounded-2xl border p-5", style.wrap)}>
                <style.Icon className={cn("size-6", style.icon)} aria-hidden="true" />
                <h3 className="mt-3 font-display font-semibold tracking-tight">{alert.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground text-pretty">{alert.detail}</p>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Weekly cognitive trend</CardTitle>
              <CardSubtitle>Daily score over the past week.</CardSubtitle>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1.5 text-sm font-semibold text-success">
              <TrendingUp className="size-4" aria-hidden="true" />+{patientProfile.weeklyChange}%
            </span>
          </div>
          <div className="mt-5">
            <WeeklyTrendChart />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>Performance by game</CardTitle>
          <CardSubtitle>Accuracy across cognitive domains.</CardSubtitle>
          <ul className="mt-5 flex flex-col gap-5">
            {gamePerformance.map((game) => (
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
            <StreakCalendar />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Today&apos;s adherence</CardTitle>
              <CardSubtitle>
                {doneToday} of {dailyActivities.length} activities completed.
              </CardSubtitle>
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar value={(doneToday / dailyActivities.length) * 100} tone="success" label="Adherence" />
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
                  <span className="text-sm text-muted-foreground">{entry.when}</span>
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
