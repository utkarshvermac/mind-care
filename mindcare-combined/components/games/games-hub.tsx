"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Brain, Clock, Grid3x3, Trophy, Type } from "lucide-react"
import { AppShell } from "@/components/common/app-shell"
import { Card, CardSubtitle, CardTitle, SectionHeader } from "@/components/common/card"
import { StatCard } from "@/components/common/stat-card"
import { games } from "@/lib/mock-data"
import { getGameResults, personalBest, type GameId, type GameResult } from "@/lib/storage"
import { cn } from "@/lib/utils"

const gameIcons: Record<GameId, typeof Brain> = {
  "card-match": Grid3x3,
  "pattern-recall": Brain,
  "word-recall": Type,
}

const accents = {
  primary: { chip: "bg-primary/10 text-primary", btn: "bg-primary text-primary-foreground" },
  secondary: { chip: "bg-secondary/12 text-secondary", btn: "bg-secondary text-secondary-foreground" },
  accent: { chip: "bg-accent/12 text-accent", btn: "bg-accent text-accent-foreground" },
} as const

export function GamesHub() {
  const [results, setResults] = useState<GameResult[]>([])

  useEffect(() => {
    setResults(getGameResults())
  }, [])

  const totalSessions = results.length
  const bestScore = results.reduce((max, r) => Math.max(max, r.score), 0)
  const avgAccuracy = totalSessions ? Math.round(results.reduce((s, r) => s + r.accuracy, 0) / totalSessions) : 0

  return (
    <AppShell title="Cognitive Games">
      <div className="flex flex-col gap-8">
        <section className="animate-rise overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-primary to-accent p-6 text-primary-foreground sm:p-8">
          <h2 className="max-w-xl font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Three short exercises. Play at your own pace.
          </h2>
          <p className="mt-3 max-w-xl text-primary-foreground/85 text-pretty">
            Every game is fully playable, keeps score, and saves your result. There is no time pressure and no way to
            lose — the only goal is to keep your mind gently active.
          </p>
        </section>

        <section aria-label="Your game stats" className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Sessions played" value={totalSessions} hint="Saved on this device" icon={<Clock className="size-5" />} tone="primary" animate={false} />
          <StatCard label="Best score" value={bestScore} hint="Across all games" icon={<Trophy className="size-5" />} tone="warning" animate={false} />
          <StatCard label="Average accuracy" value={avgAccuracy} suffix="%" hint={totalSessions ? "Your running average" : "Play a game to begin"} icon={<Brain className="size-5" />} tone="secondary" animate={false} />
        </section>

        <section aria-label="Available games">
          <SectionHeader title="Choose a game" subtitle="Each one trains a different kind of memory." />
          <ul className="grid gap-5 md:grid-cols-3">
            {games.map((game) => {
              const Icon = gameIcons[game.id]
              const accent = accents[game.accent]
              const best = personalBest(game.id)
              return (
                <Card as="li" key={game.id} className="flex flex-col gap-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn("flex size-14 items-center justify-center rounded-2xl", accent.chip)} aria-hidden="true">
                      <Icon className="size-7" />
                    </span>
                    {best > 0 ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-warning/12 px-3 py-1.5 text-xs font-semibold text-warning">
                        <Trophy className="size-3.5" aria-hidden="true" />
                        Best {best}
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <CardTitle>{game.name}</CardTitle>
                    <CardSubtitle>{game.description}</CardSubtitle>
                  </div>

                  <dl className="flex flex-wrap gap-2 text-xs">
                    <div className="rounded-full bg-muted px-3 py-1.5">
                      <dt className="sr-only">Difficulty</dt>
                      <dd className="font-medium text-muted-foreground">{game.difficulty}</dd>
                    </div>
                    <div className="rounded-full bg-muted px-3 py-1.5">
                      <dt className="sr-only">Duration</dt>
                      <dd className="font-medium text-muted-foreground">{game.minutes} min</dd>
                    </div>
                    <div className="rounded-full bg-muted px-3 py-1.5">
                      <dt className="sr-only">Skill</dt>
                      <dd className="font-medium text-muted-foreground">{game.skill}</dd>
                    </div>
                  </dl>

                  <Link
                    href={`/games/${game.id}`}
                    className={cn(
                      "tap-target mt-auto flex h-14 items-center justify-center gap-2 rounded-xl font-semibold transition-transform hover:-translate-y-0.5",
                      accent.btn,
                    )}
                  >
                    Play {game.name}
                    <ArrowRight className="size-5" aria-hidden="true" />
                  </Link>
                </Card>
              )
            })}
          </ul>
        </section>
      </div>
    </AppShell>
  )
}
