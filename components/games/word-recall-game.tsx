"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { BookOpen, Check, Play, X } from "lucide-react"
import { GameFrame, GameResult } from "@/components/games/game-frame"
import { Card } from "@/components/common/card"
import { saveGameResult } from "@/lib/api"
import { wordBank } from "@/lib/mock-data"
import { personalBest } from "@/lib/storage"
import { cn } from "@/lib/utils"

const TOTAL_ROUNDS = 3
const STUDY_SECONDS = 8
type Phase = "idle" | "study" | "recall" | "feedback" | "done"

function shuffle<T>(list: T[]): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildRound(roundNumber: number) {
  const targetCount = 3 + roundNumber // 4, 5, 6
  const pool = shuffle(wordBank)
  const targets = pool.slice(0, targetCount)
  const distractors = pool.slice(targetCount, targetCount + targetCount + 2)
  return { targets, options: shuffle([...targets, ...distractors]) }
}

export function WordRecallGame() {
  const [round, setRound] = useState(1)
  const [phase, setPhase] = useState<Phase>("idle")
  const [targets, setTargets] = useState<string[]>([])
  const [options, setOptions] = useState<string[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [countdown, setCountdown] = useState(STUDY_SECONDS)
  const [hits, setHits] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [score, setScore] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [best, setBest] = useState(0)
  const [saved, setSaved] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const reset = useCallback(() => {
    clearTimers()
    setRound(1)
    setPhase("idle")
    setTargets([])
    setOptions([])
    setPicked([])
    setCountdown(STUDY_SECONDS)
    setHits(0)
    setAttempts(0)
    setScore(0)
    setSeconds(0)
    setSaved(false)
    setBest(personalBest("word-recall"))
  }, [])

  useEffect(() => {
    reset()
    return clearTimers
  }, [reset])

  useEffect(() => {
    if (phase === "idle" || phase === "done") return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  // Study countdown
  useEffect(() => {
    if (phase !== "study") return
    if (countdown <= 0) {
      setPhase("recall")
      return
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, countdown])

  const startRound = (roundNumber: number) => {
    const { targets: t, options: o } = buildRound(roundNumber)
    setTargets(t)
    setOptions(o)
    setPicked([])
    setCountdown(STUDY_SECONDS)
    setPhase("study")
  }

  const accuracy = attempts === 0 ? 100 : Math.round((hits / attempts) * 100)

  const finishRound = () => {
    const correct = picked.filter((w) => targets.includes(w)).length
    const wrong = picked.length - correct
    setHits((h) => h + correct)
    setAttempts((a) => a + targets.length + wrong)
    setScore((s) => s + correct * 80 - wrong * 20 + (correct === targets.length && wrong === 0 ? 150 : 0))
    setPhase("feedback")

    const t = setTimeout(() => {
      if (round >= TOTAL_ROUNDS) {
        setPhase("done")
      } else {
        setRound((r) => r + 1)
        startRound(round + 1)
      }
    }, 2200)
    timers.current.push(t)
  }

  useEffect(() => {
    if (phase !== "done" || saved) return
    setSaved(true)
    void saveGameResult({ game: "word-recall", score: Math.max(0, score), accuracy, durationSeconds: seconds })
  }, [phase, saved, score, accuracy, seconds])

  const toggleWord = (word: string) => {
    if (phase !== "recall") return
    setPicked((prev) => (prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word]))
  }

  const instruction =
    phase === "idle"
      ? "You will see a short list of words. Read them calmly, then pick them out from a bigger list. Three easy rounds."
      : phase === "study"
        ? `Read and remember these ${targets.length} words. ${countdown} seconds left.`
        : phase === "recall"
          ? "Tap every word you remember seeing, then press Check my answers."
          : phase === "feedback"
            ? "Green words were correct. Grey ones were in the list but missed."
            : "All rounds complete."

  return (
    <GameFrame
      title="Word Recall"
      instruction={instruction}
      score={Math.max(0, score)}
      accuracy={accuracy}
      seconds={seconds}
      round={phase === "done" ? TOTAL_ROUNDS : round}
      totalRounds={TOTAL_ROUNDS}
      onRestart={reset}
    >
      {phase === "done" ? (
        <GameResult score={Math.max(0, score)} accuracy={accuracy} seconds={seconds} best={best} isNewBest={Math.max(0, score) > best} onRestart={reset} />
      ) : (
        <Card className="flex flex-col gap-6">
          {phase === "idle" ? (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <span className="flex size-20 items-center justify-center rounded-2xl bg-accent/12 text-accent" aria-hidden="true">
                <BookOpen className="size-10" />
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Word Recall</h2>
                <p className="mt-2 max-w-sm text-muted-foreground text-pretty">
                  Simple, everyday words. Read them, then recognise them. Take your time — nothing is timed after the
                  reading phase.
                </p>
              </div>
              <button
                type="button"
                onClick={() => startRound(1)}
                className="tap-target flex h-14 items-center gap-2 rounded-xl bg-accent px-8 font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5"
              >
                <Play className="size-5" aria-hidden="true" />
                Start round 1
              </button>
            </div>
          ) : phase === "study" ? (
            <div className="flex flex-col items-center gap-6 py-4">
              <div
                className="flex size-16 items-center justify-center rounded-full border-3 border-accent font-display text-2xl font-semibold text-accent"
                aria-live="polite"
              >
                {countdown}
              </div>
              <ul className="flex flex-wrap justify-center gap-3">
                {targets.map((word) => (
                  <li
                    key={word}
                    className="rounded-xl border-2 border-accent/40 bg-accent/8 px-6 py-4 font-display text-lg font-semibold tracking-wide sm:text-xl"
                  >
                    {word}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setPhase("recall")}
                className="text-sm font-semibold text-primary hover:underline"
              >
                I am ready — skip ahead
              </button>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {options.map((word) => {
                  const isPicked = picked.includes(word)
                  const isTarget = targets.includes(word)
                  const showResult = phase === "feedback"
                  return (
                    <li key={word}>
                      <button
                        type="button"
                        onClick={() => toggleWord(word)}
                        disabled={showResult}
                        aria-pressed={isPicked}
                        className={cn(
                          "tap-target flex w-full items-center justify-between gap-2 rounded-xl border-2 px-4 py-4 text-left font-medium tracking-wide transition-colors",
                          showResult && isPicked && isTarget && "border-success bg-success/12 text-success",
                          showResult && isPicked && !isTarget && "border-destructive bg-destructive/10 text-destructive",
                          showResult && !isPicked && isTarget && "border-muted-foreground/40 bg-muted text-muted-foreground",
                          showResult && !isPicked && !isTarget && "border-border opacity-50",
                          !showResult && isPicked && "border-primary bg-primary/10 text-primary",
                          !showResult && !isPicked && "border-border hover:border-primary/50",
                        )}
                      >
                        {word}
                        {showResult && isPicked && isTarget ? <Check className="size-5" aria-hidden="true" /> : null}
                        {showResult && isPicked && !isTarget ? <X className="size-5" aria-hidden="true" /> : null}
                      </button>
                    </li>
                  )
                })}
              </ul>

              {phase === "recall" ? (
                <button
                  type="button"
                  onClick={finishRound}
                  disabled={picked.length === 0}
                  className="tap-target flex h-14 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  Check my answers ({picked.length} selected)
                </button>
              ) : (
                <p className="text-center text-sm text-muted-foreground" aria-live="polite">
                  Round {round} of {TOTAL_ROUNDS} finished. Next round starting…
                </p>
              )}
            </>
          )}
        </Card>
      )}
    </GameFrame>
  )
}
