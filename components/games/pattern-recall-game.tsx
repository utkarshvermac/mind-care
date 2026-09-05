"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Eye, Play, X } from "lucide-react"
import { GameFrame, GameResult } from "@/components/games/game-frame"
import { Card } from "@/components/common/card"
import { saveGameResult } from "@/lib/api"
import { personalBest } from "@/lib/storage"
import { cn } from "@/lib/utils"

const GRID = 9
const TOTAL_ROUNDS = 5
type Phase = "idle" | "showing" | "input" | "feedback" | "done"

function pickPattern(count: number): number[] {
  const pool = Array.from({ length: GRID }, (_, i) => i)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count).sort((a, b) => a - b)
}

export function PatternRecallGame() {
  const [round, setRound] = useState(1)
  const [phase, setPhase] = useState<Phase>("idle")
  const [pattern, setPattern] = useState<number[]>([])
  const [selection, setSelection] = useState<number[]>([])
  const [correctRounds, setCorrectRounds] = useState(0)
  const [tapsCorrect, setTapsCorrect] = useState(0)
  const [tapsTotal, setTapsTotal] = useState(0)
  const [score, setScore] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [best, setBest] = useState(0)
  const [saved, setSaved] = useState(false)
  const [lastRoundOk, setLastRoundOk] = useState<boolean | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const reset = useCallback(() => {
    clearTimers()
    setRound(1)
    setPhase("idle")
    setPattern([])
    setSelection([])
    setCorrectRounds(0)
    setTapsCorrect(0)
    setTapsTotal(0)
    setScore(0)
    setSeconds(0)
    setSaved(false)
    setLastRoundOk(null)
    setBest(personalBest("pattern-recall"))
  }, [])

  useEffect(() => {
    reset()
    return clearTimers
  }, [reset])

  useEffect(() => {
    if (phase === "done" || phase === "idle") return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  const startRound = (roundNumber: number) => {
    const count = Math.min(3 + Math.floor((roundNumber - 1) / 2), 6)
    const next = pickPattern(count)
    setPattern(next)
    setSelection([])
    setLastRoundOk(null)
    setPhase("showing")
    const t = setTimeout(() => setPhase("input"), 1400 + count * 250)
    timers.current.push(t)
  }

  const accuracy = tapsTotal === 0 ? 100 : Math.round((tapsCorrect / tapsTotal) * 100)

  const submit = (finalSelection: number[]) => {
    const hits = finalSelection.filter((i) => pattern.includes(i)).length
    const perfect = hits === pattern.length && finalSelection.length === pattern.length
    setTapsCorrect((c) => c + hits)
    setTapsTotal((t) => t + Math.max(finalSelection.length, pattern.length))
    setScore((s) => s + hits * 60 + (perfect ? 120 : 0))
    if (perfect) setCorrectRounds((c) => c + 1)
    setLastRoundOk(perfect)
    setPhase("feedback")

    const t = setTimeout(() => {
      if (round >= TOTAL_ROUNDS) {
        setPhase("done")
      } else {
        setRound((r) => r + 1)
        startRound(round + 1)
      }
    }, 1500)
    timers.current.push(t)
  }

  const toggleTile = (index: number) => {
    if (phase !== "input") return
    const next = selection.includes(index) ? selection.filter((i) => i !== index) : [...selection, index]
    setSelection(next)
    if (next.length === pattern.length) {
      const t = setTimeout(() => submit(next), 320)
      timers.current.push(t)
    }
  }

  useEffect(() => {
    if (phase !== "done" || saved) return
    setSaved(true)
    void saveGameResult({ game: "pattern-recall", score, accuracy, durationSeconds: seconds })
  }, [phase, saved, score, accuracy, seconds])

  const instruction =
    phase === "idle"
      ? "Press Start, watch which squares light up, then tap those same squares. There are five gentle rounds."
      : phase === "showing"
        ? "Watch carefully — remember the highlighted squares."
        : phase === "input"
          ? `Now tap the ${pattern.length} squares you saw.`
          : phase === "feedback"
            ? lastRoundOk
              ? "Correct! Well remembered."
              : "Not quite — the correct squares are shown in green."
            : "Round complete."

  return (
    <GameFrame
      title="Pattern Recall"
      instruction={instruction}
      score={score}
      accuracy={accuracy}
      seconds={seconds}
      round={phase === "done" ? TOTAL_ROUNDS : round}
      totalRounds={TOTAL_ROUNDS}
      onRestart={reset}
    >
      {phase === "done" ? (
        <GameResult score={score} accuracy={accuracy} seconds={seconds} best={best} isNewBest={score > best} onRestart={reset} />
      ) : (
        <Card className="flex flex-col items-center gap-6">
          {phase === "idle" ? (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <span className="flex size-20 items-center justify-center rounded-2xl bg-secondary/12 text-secondary" aria-hidden="true">
                <Eye className="size-10" />
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Ready when you are</h2>
                <p className="mt-2 max-w-sm text-muted-foreground text-pretty">
                  Squares will light up for a moment. Then tap the same squares back. There is no penalty for mistakes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => startRound(1)}
                className="tap-target flex h-14 items-center gap-2 rounded-xl bg-secondary px-8 font-semibold text-secondary-foreground transition-transform hover:-translate-y-0.5"
              >
                <Play className="size-5" aria-hidden="true" />
                Start round 1
              </button>
            </div>
          ) : (
            <>
              <ul className="grid w-full max-w-md grid-cols-3 gap-3 sm:gap-4">
                {Array.from({ length: GRID }, (_, index) => {
                  const lit = phase === "showing" && pattern.includes(index)
                  const picked = selection.includes(index)
                  const revealCorrect = phase === "feedback" && pattern.includes(index)
                  const revealWrong = phase === "feedback" && picked && !pattern.includes(index)
                  return (
                    <li key={index} className="aspect-square">
                      <button
                        type="button"
                        onClick={() => toggleTile(index)}
                        disabled={phase !== "input"}
                        aria-label={`Square ${index + 1}${picked ? ", selected" : ""}`}
                        aria-pressed={picked}
                        className={cn(
                          "flex size-full items-center justify-center rounded-2xl border-2 transition-all duration-200",
                          lit && "animate-flash border-secondary bg-secondary text-secondary-foreground",
                          revealCorrect && "border-success bg-success/20",
                          revealWrong && "border-destructive bg-destructive/15",
                          !lit && !revealCorrect && !revealWrong && picked && "border-primary bg-primary/15",
                          !lit && !revealCorrect && !revealWrong && !picked && "border-border bg-muted/50",
                          phase === "input" && "hover:border-primary/60",
                        )}
                      >
                        {revealCorrect ? <Check className="size-7 text-success" aria-hidden="true" /> : null}
                        {revealWrong ? <X className="size-7 text-destructive" aria-hidden="true" /> : null}
                      </button>
                    </li>
                  )
                })}
              </ul>

              <p className="text-sm text-muted-foreground" aria-live="polite">
                {phase === "input"
                  ? `${selection.length} of ${pattern.length} selected`
                  : phase === "showing"
                    ? "Memorise the pattern…"
                    : `Round ${round} of ${TOTAL_ROUNDS} · ${correctRounds} perfect so far`}
              </p>
            </>
          )}
        </Card>
      )}
    </GameFrame>
  )
}
