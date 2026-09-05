"use client"

import Link from "next/link"
import { ArrowRight, Pause, Play, RotateCcw, Target, Timer, Trophy } from "lucide-react"
import { AppShell } from "@/components/common/app-shell"
import { Card } from "@/components/common/card"
import { AnimatedNumber } from "@/components/common/stat-card"
import { cn } from "@/lib/utils"

export function GameFrame({
  title,
  instruction,
  score,
  accuracy,
  seconds,
  round,
  totalRounds,
  paused,
  onTogglePause,
  onRestart,
  children,
}: {
  title: string
  instruction: string
  score: number
  accuracy: number
  seconds: number
  round: number
  totalRounds: number
  paused?: boolean
  onTogglePause?: () => void
  onRestart: () => void
  children: React.ReactNode
}) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0")
  const ss = String(seconds % 60).padStart(2, "0")

  return (
    <AppShell title={title} back={{ href: "/games", label: "All games" }}>
      <div className="flex flex-col gap-6">
        <Card className="flex flex-wrap items-center gap-4">
          <div className="flex flex-1 flex-wrap gap-x-8 gap-y-4">
            <Metric icon={<Trophy className="size-4" />} label="Score" value={`${score}`} />
            <Metric icon={<Target className="size-4" />} label="Accuracy" value={`${accuracy}%`} />
            <Metric icon={<Timer className="size-4" />} label="Time" value={`${mm}:${ss}`} />
            <Metric label="Round" value={`${round} / ${totalRounds}`} />
          </div>
          <div className="flex gap-2">
            {onTogglePause ? (
              <button
                type="button"
                onClick={onTogglePause}
                className="tap-target flex h-12 items-center gap-2 rounded-xl border border-border px-4 font-medium transition-colors hover:border-primary hover:text-primary"
              >
                {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
                {paused ? "Resume" : "Pause"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onRestart}
              className="tap-target flex h-12 items-center gap-2 rounded-xl border border-border px-4 font-medium transition-colors hover:border-primary hover:text-primary"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Restart
            </button>
          </div>
        </Card>

        <div className="rounded-xl border border-primary/25 bg-primary/8 px-5 py-4">
          <p className="text-[15px] font-medium text-pretty">{instruction}</p>
        </div>

        {children}
      </div>
    </AppShell>
  )
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-display text-xl font-semibold tracking-tight">{value}</span>
    </div>
  )
}

export function GameResult({
  score,
  accuracy,
  seconds,
  best,
  isNewBest,
  onRestart,
}: {
  score: number
  accuracy: number
  seconds: number
  best: number
  isNewBest: boolean
  onRestart: () => void
}) {
  const message =
    accuracy >= 90
      ? "Outstanding work. Your memory was very sharp today."
      : accuracy >= 70
        ? "Well done. That was a solid, steady round."
        : "Nicely done for showing up. Every round helps."

  return (
    <Card className="animate-rise flex flex-col items-center gap-6 py-10 text-center">
      <span
        className={cn(
          "flex size-20 items-center justify-center rounded-2xl",
          isNewBest ? "bg-warning/15 text-warning" : "bg-success/12 text-success",
        )}
        aria-hidden="true"
      >
        <Trophy className="size-10" />
      </span>

      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {isNewBest ? "New personal best!" : "Round complete"}
        </h2>
        <p className="mt-2 max-w-md text-muted-foreground text-pretty">{message}</p>
      </div>

      <dl className="grid w-full max-w-lg grid-cols-2 gap-4 sm:grid-cols-4">
        <ResultStat label="Score" value={score} />
        <ResultStat label="Accuracy" value={accuracy} suffix="%" />
        <ResultStat label="Seconds" value={seconds} />
        <ResultStat label="Best" value={Math.max(best, score)} />
      </dl>

      <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onRestart}
          className="tap-target flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          <RotateCcw className="size-5" aria-hidden="true" />
          Play again
        </button>
        <Link
          href="/games"
          className="tap-target flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border border-border font-semibold transition-colors hover:border-primary hover:text-primary"
        >
          Other games
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  )
}

function ResultStat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-4 py-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-display text-2xl font-semibold tracking-tight">
        <AnimatedNumber value={value} suffix={suffix} />
      </dd>
    </div>
  )
}
