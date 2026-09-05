"use client"

import { useCallback, useEffect, useState } from "react"
import { Activity, Flame, Target, TrendingUp } from "lucide-react"
import { Card, CardSubtitle, CardTitle, SectionHeader } from "@/components/common/card"
import { ProgressBar, StatCard } from "@/components/common/stat-card"
import { WeeklyTrendChart } from "@/components/analytics/weekly-trend-chart"
import { GamePerformanceChart } from "@/components/analytics/game-performance-chart"
import { AccuracyDonut } from "@/components/analytics/accuracy-donut"
import { StreakCalendar } from "@/components/analytics/streak-calendar"
import { patientProfile } from "@/lib/mock-data"
import { getAnalytics, type BackendAnalytics } from "@/lib/api"

const ranges = ["7 days", "30 days", "90 days"] as const

export function AnalyticsView() {
  const [range, setRange] = useState<(typeof ranges)[number]>("7 days")
  const [analytics, setAnalytics] = useState<BackendAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getAnalytics()
      setAnalytics(data)
      setOffline(false)
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = analytics?.stats ?? { sessions: 24, accuracy: patientProfile.accuracy, best: 920, minutes: 96 }
  const weeklyScores = analytics?.weeklyScores ?? []
  const bestDay = weeklyScores.length > 0 ? weeklyScores.reduce((best, day) => (day.score > best.score ? day : best), weeklyScores[0]) : null
  const gamePerf = analytics?.gamePerformance ?? []

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading analytics…</p>
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

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Progress analytics</h2>
          <p className="mt-1 text-sm text-muted-foreground">A calm view of how the week has gone.</p>
        </div>
        <div className="flex rounded-xl border border-border p-1" role="group" aria-label="Select time range">
          {ranges.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              aria-pressed={range === option}
              className={
                range === option
                  ? "rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                  : "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cognitive score"
          value={patientProfile.cognitiveScore}
          hint="Blends baseline with your recent sessions"
          icon={<TrendingUp className="size-5" />}
          tone="primary"
        />
        <StatCard
          label="Average accuracy"
          value={stats.accuracy}
          suffix="%"
          hint="Across all games"
          icon={<Target className="size-5" />}
          tone="secondary"
        />
        <StatCard
          label="Sessions"
          value={stats.sessions}
          hint={`${stats.minutes} minutes of practice`}
          icon={<Activity className="size-5" />}
          tone="accent"
        />
        <StatCard
          label="Current streak"
          value={patientProfile.streak}
          suffix=" days"
          hint={bestDay ? `Best day: ${bestDay.label}` : "Play a game to start a streak"}
          icon={<Flame className="size-5" />}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Score trend</CardTitle>
          <CardSubtitle>Cognitive score over the last {range.toLowerCase()}</CardSubtitle>
          <div className="mt-5">
            <WeeklyTrendChart height={280} data={weeklyScores.map((d) => ({ day: d.day, score: d.score }))} />
          </div>
        </Card>

        <Card>
          <CardTitle>Overall accuracy</CardTitle>
          <CardSubtitle>Correct answers versus missed</CardSubtitle>
          <AccuracyDonut height={240} data={analytics?.accuracyBreakdown} />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {stats.sessions > 0
              ? `Based on ${stats.sessions} recorded sessions so far.`
              : "Play a few games to see your accuracy trend build up here."}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Performance by game</CardTitle>
          <CardSubtitle>Where practice is paying off</CardSubtitle>
          <div className="mt-5">
            <GamePerformanceChart height={260} data={gamePerf} />
          </div>
        </Card>

        <Card>
          <CardTitle>Skill breakdown</CardTitle>
          <CardSubtitle>Accuracy per cognitive skill</CardSubtitle>
          <ul className="mt-5 flex flex-col gap-5">
            {gamePerf.map((entry, index) => (
              <li key={entry.game} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-medium">{entry.game}</span>
                  <span className="font-display text-lg font-semibold tabular-nums">{entry.accuracy}%</span>
                </div>
                <ProgressBar
                  value={entry.accuracy}
                  tone={index === 0 ? "primary" : index === 1 ? "secondary" : "accent"}
                  label={`${entry.game} accuracy`}
                />
                <span className="text-xs text-muted-foreground">{entry.sessions} sessions completed</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section>
        <SectionHeader title="Activity calendar" subtitle="Every square is a day of practice over the last 12 weeks" />
        <Card>
          <StreakCalendar data={analytics?.streakCalendar} />
        </Card>
      </section>

      <section>
        <SectionHeader
          title="Recent sessions"
          subtitle={stats.sessions > 0 ? "Synced from your account" : "Play a game to start building your history"}
        />
        <Card className="p-0">
          {stats.sessions === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No sessions recorded yet. Once you play a game, each result will appear here with its score and accuracy.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {weeklyScores
                .filter((d) => d.score > 0)
                .slice(-8)
                .reverse()
                .map((day) => (
                  <li key={day.date} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium">{day.label}</p>
                      <p className="text-sm text-muted-foreground">{day.activities} activities that day</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-sm text-muted-foreground">Avg. score</span>
                      <span className="font-display text-lg font-semibold tabular-nums">{day.score}</span>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  )
}
