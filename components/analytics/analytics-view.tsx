"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, Flame, Target, TrendingUp } from "lucide-react"
import { Card, CardSubtitle, CardTitle, SectionHeader } from "@/components/common/card"
import { ProgressBar, StatCard } from "@/components/common/stat-card"
import { WeeklyTrendChart } from "@/components/analytics/weekly-trend-chart"
import { GamePerformanceChart } from "@/components/analytics/game-performance-chart"
import { AccuracyDonut } from "@/components/analytics/accuracy-donut"
import { StreakCalendar } from "@/components/analytics/streak-calendar"
import { gameNames, gamePerformance, patientProfile, weeklyScores } from "@/lib/mock-data"
import { getGameResults, type GameResult } from "@/lib/storage"

const ranges = ["7 days", "30 days", "90 days"] as const

export function AnalyticsView() {
  const [range, setRange] = useState<(typeof ranges)[number]>("7 days")
  const [results, setResults] = useState<GameResult[]>([])

  useEffect(() => {
    setResults(getGameResults())
  }, [])

  const stats = useMemo(() => {
    if (results.length === 0) {
      return {
        sessions: 24,
        accuracy: patientProfile.accuracy,
        best: 920,
        minutes: 96,
      }
    }
    return {
      sessions: results.length,
      accuracy: Math.round(results.reduce((sum, r) => sum + r.accuracy, 0) / results.length),
      best: results.reduce((max, r) => Math.max(max, r.score), 0),
      minutes: Math.round(results.reduce((sum, r) => sum + r.durationSeconds, 0) / 60),
    }
  }, [results])

  const bestDay = weeklyScores.reduce((best, day) => (day.score > best.score ? day : best), weeklyScores[0])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Progress analytics</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A calm view of how {patientProfile.firstName} is doing. All data stays on this device.
          </p>
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
          hint={`Up ${patientProfile.weeklyChange}% vs last week`}
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
          hint={`Best day: ${bestDay.label}`}
          icon={<Flame className="size-5" />}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Score trend</CardTitle>
          <CardSubtitle>Cognitive score over the last {range.toLowerCase()}</CardSubtitle>
          <div className="mt-5">
            <WeeklyTrendChart height={280} />
          </div>
        </Card>

        <Card>
          <CardTitle>Overall accuracy</CardTitle>
          <CardSubtitle>Correct answers versus missed</CardSubtitle>
          <AccuracyDonut height={240} />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Accuracy has stayed above 80% for six weeks, which is a strong sign of consistency.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Performance by game</CardTitle>
          <CardSubtitle>Where practice is paying off</CardSubtitle>
          <div className="mt-5">
            <GamePerformanceChart height={260} />
          </div>
        </Card>

        <Card>
          <CardTitle>Skill breakdown</CardTitle>
          <CardSubtitle>Accuracy per cognitive skill</CardSubtitle>
          <ul className="mt-5 flex flex-col gap-5">
            {gamePerformance.map((entry, index) => (
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
          <StreakCalendar />
        </Card>
      </section>

      <section>
        <SectionHeader
          title="Recent sessions"
          subtitle={results.length > 0 ? "Saved on this device" : "Play a game to start building your own history"}
        />
        <Card className="p-0">
          {results.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No sessions recorded yet. Once you play a game, each result will appear here with its score and accuracy.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {results.slice(0, 8).map((result) => (
                <li key={result.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium">{gameNames[result.game]}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(result.playedAt).toLocaleString(undefined, {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-muted-foreground">{result.accuracy}% accuracy</span>
                    <span className="font-display text-lg font-semibold tabular-nums">{result.score}</span>
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
