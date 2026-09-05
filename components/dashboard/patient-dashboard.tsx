"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  ArrowRight,
  Bell,
  Bot,
  Brain,
  CheckCircle2,
  Circle,
  Droplets,
  Flame,
  Footprints,
  Moon,
  Smile,
  Target,
  TrendingUp,
} from "lucide-react"
import { Card, CardSubtitle, CardTitle, SectionHeader } from "@/components/common/card"
import { AnimatedNumber, ProgressBar, ProgressRing, StatCard } from "@/components/common/stat-card"
import { useApp } from "@/components/app-provider"
import { dailyActivities, gameNames, games, patientProfile, recentActivity, reminders, wellnessDefaults } from "@/lib/mock-data"
import {
  getPatientData,
  getReminders,
  getWellnessToday,
  toggleActivity as apiToggleActivity,
  updateWellnessToday,
  type BackendActivity,
  type BackendProfile,
  type BackendReminder,
  type BackendWellness,
} from "@/lib/api"
import { cn } from "@/lib/utils"

const greetingFor = (hour: number) => {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

const accentClasses = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/12 text-secondary",
  accent: "bg-accent/12 text-accent",
} as const

export function PatientDashboard() {
  const { displayName } = useApp()
  const [greeting, setGreeting] = useState("Hello")
  const [today, setToday] = useState("")
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)

  const [profile, setProfile] = useState<BackendProfile>(patientProfile as unknown as BackendProfile)
  const [activityFeed, setActivityFeed] = useState<BackendActivity[]>(recentActivity as BackendActivity[])
  const [wellness, setWellness] = useState<BackendWellness | null>(null)
  const [remindersList, setRemindersList] = useState<BackendReminder[]>(reminders)

  const firstName = (displayName || profile.firstName || "there").split(" ")[0]

  const load = useCallback(async () => {
    try {
      const [patientData, wellnessData, remindersData] = await Promise.all([
        getPatientData(),
        getWellnessToday(),
        getReminders(),
      ])
      setProfile(patientData.profile)
      setActivityFeed(patientData.activity)
      setWellness(wellnessData)
      setRemindersList(remindersData.reminders)
      setOffline(false)
    } catch {
      // Backend unreachable — keep the screen usable with demo data instead of breaking.
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const now = new Date()
    setGreeting(greetingFor(now.getHours()))
    setToday(now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }))
    void load()
  }, [load])

  const toggleActivity = async (activityId: string, currentlyDone: boolean) => {
    if (!wellness) return
    // Optimistic update so the tap feels instant.
    setWellness((prev) =>
      prev
        ? {
            ...prev,
            activities: prev.activities.map((a) => (a.id === activityId ? { ...a, done: !currentlyDone } : a)),
            activitiesDone: prev.activitiesDone + (currentlyDone ? -1 : 1),
          }
        : prev,
    )
    try {
      const updated = await apiToggleActivity(activityId, !currentlyDone)
      setWellness(updated)
    } catch {
      // leave the optimistic update in place; will resync on next load
    }
  }

  const addWater = async () => {
    if (!wellness) return
    const next = Math.min(wellness.water.glasses + 1, wellness.water.goal)
    setWellness((prev) => (prev ? { ...prev, water: { ...prev.water, glasses: next } } : prev))
    try {
      const updated = await updateWellnessToday({ water: next })
      setWellness(updated)
    } catch {
      /* optimistic update stands */
    }
  }

  const doneCount = wellness ? wellness.activitiesDone : dailyActivities.filter((a) => a.done).length
  const totalCount = wellness ? wellness.activitiesTotal : dailyActivities.length
  const completion = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const liveScore = profile.cognitiveScore ?? patientProfile.cognitiveScore
  const displayActivities = wellness
    ? wellness.activities
    : dailyActivities.map((a) => ({ id: a.id, title: a.title, timeLabel: a.time, done: a.done }))

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading your dashboard…</p>
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

      {/* Hero */}
      <section className="animate-rise overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-accent p-6 text-primary-foreground sm:p-8">
        <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-lg">
            <p className="text-sm text-primary-foreground/80">{today}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {greeting}, {firstName}
            </h2>
            <p className="mt-3 text-primary-foreground/85 text-pretty">
              You have completed {doneCount} of {totalCount} activities today. A short memory game is a lovely way to
              keep going.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/games"
                className="tap-target flex h-14 items-center gap-2 rounded-xl bg-primary-foreground px-6 font-semibold text-primary transition-transform hover:-translate-y-0.5"
              >
                <Brain className="size-5" aria-hidden="true" />
                Start today&apos;s game
              </Link>
              <Link
                href="/assistant"
                className="tap-target flex h-14 items-center gap-2 rounded-xl border border-primary-foreground/35 px-6 font-semibold transition-colors hover:bg-primary-foreground/10"
              >
                <Bot className="size-5" aria-hidden="true" />
                Talk to assistant
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-6">
            <ProgressRing value={liveScore}>
              <span className="font-display text-4xl font-semibold">
                <AnimatedNumber value={liveScore} />
              </span>
              <span className="text-xs text-primary-foreground/80">Cognitive score</span>
            </ProgressRing>
            <div className="hidden flex-col gap-4 sm:flex">
              <div>
                <p className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                  <TrendingUp className="size-4" aria-hidden="true" /> This week
                </p>
                <p className="font-display text-xl font-semibold">
                  {(profile.weeklyChange ?? 0) >= 0 ? "+" : ""}
                  {profile.weeklyChange ?? 0}%
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                  <Flame className="size-4" aria-hidden="true" /> Streak
                </p>
                <p className="font-display text-xl font-semibold">{profile.streak ?? 0} days</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section aria-label="Your numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cognitive score" value={liveScore} suffix="/100" hint={`${(profile.weeklyChange ?? 0) >= 0 ? "+" : ""}${profile.weeklyChange ?? 0}% vs last week`} icon={<Brain className="size-5" />} tone="primary" />
        <StatCard label="Day streak" value={profile.streak ?? 0} hint="Keep it going today" icon={<Flame className="size-5" />} tone="warning" />
        <StatCard label="Accuracy" value={profile.accuracy ?? 0} suffix="%" hint="Across all games" icon={<Target className="size-5" />} tone="secondary" />
        <StatCard label="Activities today" value={doneCount} suffix={`/${totalCount}`} hint={`${completion}% complete`} icon={<CheckCircle2 className="size-5" />} tone="success" animate={false} />
      </section>

      {/* Games */}
      <section aria-label="Recommended games">
        <SectionHeader
          title="Today's games"
          subtitle="Short, gentle sessions. Pick whichever feels right."
          action={
            <Link href="/games" className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              See all <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />
        <ul className="grid gap-4 md:grid-cols-3">
          {games.map((game) => (
            <Card as="li" key={game.id} className="flex flex-col gap-4">
              <span className={cn("flex size-12 items-center justify-center rounded-xl", accentClasses[game.accent])} aria-hidden="true">
                <Brain className="size-6" />
              </span>
              <div>
                <CardTitle>{game.name}</CardTitle>
                <CardSubtitle>{game.tagline}</CardSubtitle>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">{game.difficulty}</span>
                <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">{game.minutes} min</span>
              </div>
              <Link
                href={`/games/${game.id}`}
                className="tap-target mt-auto flex h-13 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Play now
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Card>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activities */}
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Daily activities</CardTitle>
              <CardSubtitle>Tap an item to mark it done. Your progress is saved.</CardSubtitle>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
              {doneCount}/{totalCount}
            </span>
          </div>

          <div className="mt-4">
            <ProgressBar value={completion} label="Daily activity completion" />
          </div>

          <ul className="mt-5 flex flex-col gap-2">
            {displayActivities.map((activity) => {
              const done = Boolean(activity.done)
              return (
                <li key={activity.id}>
                  <button
                    type="button"
                    onClick={() => void toggleActivity(activity.id, done)}
                    aria-pressed={done}
                    className={cn(
                      "tap-target flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left transition-colors",
                      done ? "border-success/30 bg-success/8" : "border-border hover:border-primary/40 hover:bg-muted/50",
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <Circle className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn("font-medium", done && "text-muted-foreground line-through")}>{activity.title}</span>
                      <span className="text-sm text-muted-foreground">{"time" in activity ? activity.time : activity.timeLabel}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* Wellness + reminders */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardTitle>Wellness today</CardTitle>
            <ul className="mt-4 flex flex-col gap-4">
              <li className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent/12 text-accent" aria-hidden="true">
                  <Smile className="size-5" />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-sm text-muted-foreground">Mood</span>
                  <span className="font-semibold">{wellness?.mood ?? wellnessDefaults.mood}</span>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                  <Moon className="size-5" />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-sm text-muted-foreground">Sleep</span>
                  <span className="font-semibold">{wellness?.sleepHours ?? wellnessDefaults.sleepHours} hours</span>
                </span>
              </li>
              <li className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-secondary/12 text-secondary" aria-hidden="true">
                    <Droplets className="size-5" />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm text-muted-foreground">Water</span>
                    <span className="font-semibold">
                      {wellness?.water.glasses ?? wellnessDefaults.waterGlasses} of {wellness?.water.goal ?? wellnessDefaults.waterGoal} glasses
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void addWater()}
                    className="rounded-lg bg-secondary/12 px-3 py-2 text-sm font-semibold text-secondary hover:bg-secondary/20"
                  >
                    +1
                  </button>
                </div>
                <ProgressBar
                  value={((wellness?.water.glasses ?? wellnessDefaults.waterGlasses) / (wellness?.water.goal ?? wellnessDefaults.waterGoal)) * 100}
                  tone="secondary"
                  label="Water intake"
                />
              </li>
              <li className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-warning/12 text-warning" aria-hidden="true">
                    <Footprints className="size-5" />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm text-muted-foreground">Steps</span>
                    <span className="font-semibold">
                      {(wellness?.steps.count ?? wellnessDefaults.steps).toLocaleString()} of {(wellness?.steps.goal ?? wellnessDefaults.stepGoal).toLocaleString()}
                    </span>
                  </span>
                </div>
                <ProgressBar
                  value={((wellness?.steps.count ?? wellnessDefaults.steps) / (wellness?.steps.goal ?? wellnessDefaults.stepGoal)) * 100}
                  tone="warning"
                  label="Steps"
                />
              </li>
            </ul>
          </Card>

          <Card>
            <CardTitle>Reminders</CardTitle>
            <ul className="mt-4 flex flex-col gap-3">
              {remindersList.map((reminder) => (
                <li key={reminder.id} className="flex items-start gap-3 rounded-xl bg-muted/60 px-4 py-3">
                  <Bell className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{reminder.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {reminder.time} · {reminder.kind}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Recent activity */}
      <section aria-label="Recent sessions">
        <SectionHeader title="Recent sessions" subtitle="Your last few games." />
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {activityFeed.map((entry, index) => (
              <li key={`${entry.game}-${index}`} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                  <Brain className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{gameNames[entry.game]}</span>
                  <span className="text-sm text-muted-foreground">{entry.whenLabel ?? entry.when}</span>
                </span>
                <span className="flex flex-col items-end">
                  <span className="font-display font-semibold">{entry.score} pts</span>
                  <span className="text-sm text-muted-foreground">{entry.accuracy}% accuracy</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  )
}
