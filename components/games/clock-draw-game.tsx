"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { GameFrame, GameResult } from "@/components/games/game-frame"
import { Card } from "@/components/common/card"
import { saveGameResult, getPersonalBest } from "@/lib/api"
import { cn } from "@/lib/utils"

const TOTAL_ROUNDS = 6
const MINUTE_OPTIONS = [0, 15, 30, 45] as const // number position 12,3,6,9 respectively

const CENTER = 150
const FACE_RADIUS = 130
const NUMBER_RADIUS = 108

function numberPosition(n: number) {
  // n: 1..12. 12 sits at the top; positions go clockwise.
  const angle = ((n % 12) / 12) * 2 * Math.PI - Math.PI / 2
  return { x: CENTER + NUMBER_RADIUS * Math.cos(angle), y: CENTER + NUMBER_RADIUS * Math.sin(angle) }
}

function handEnd(n: number, length: number) {
  const angle = ((n % 12) / 12) * 2 * Math.PI - Math.PI / 2
  return { x: CENTER + length * Math.cos(angle), y: CENTER + length * Math.sin(angle) }
}

function minuteToNumber(minute: number) {
  // maps 0/15/30/45 -> 12/3/6/9
  return [12, 3, 6, 9][MINUTE_OPTIONS.indexOf(minute as (typeof MINUTE_OPTIONS)[number])] ?? 12
}

type Target = { hour: number; minute: number }

function randomTarget(): Target {
  const hour = 1 + Math.floor(Math.random() * 12)
  const minute = MINUTE_OPTIONS[Math.floor(Math.random() * MINUTE_OPTIONS.length)]
  return { hour, minute }
}

function formatTime(t: Target) {
  return `${t.hour}:${String(t.minute).padStart(2, "0")}`
}

export function ClockDrawGame() {
  const [round, setRound] = useState(0)
  const [target, setTarget] = useState<Target>(() => randomTarget())
  const [phase, setPhase] = useState<"hour" | "minute" | "reveal">("hour")
  const [chosenHour, setChosenHour] = useState<number | null>(null)
  const [chosenMinuteNumber, setChosenMinuteNumber] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [paused, setPaused] = useState(false)
  const [finished, setFinished] = useState(false)
  const [best, setBest] = useState(0)
  const [saved, setSaved] = useState(false)

  const reset = useCallback(() => {
    setRound(0)
    setTarget(randomTarget())
    setPhase("hour")
    setChosenHour(null)
    setChosenMinuteNumber(null)
    setCorrectCount(0)
    setSeconds(0)
    setPaused(false)
    setFinished(false)
    setSaved(false)
    void getPersonalBest("clock-draw").then(setBest)
  }, [])

  useEffect(() => {
    reset()
  }, [reset])

  useEffect(() => {
    if (finished || paused) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [finished, paused])

  const accuracy = round === 0 ? 100 : Math.round((correctCount / round) * 100)
  const score = useMemo(() => correctCount * 130 - Math.max(0, round - correctCount) * 15, [correctCount, round])

  function handleTapNumber(n: number) {
    if (paused || phase === "reveal") return
    if (phase === "hour") {
      setChosenHour(n)
      setPhase("minute")
      return
    }
    // phase === "minute"
    setChosenMinuteNumber(n)
    setPhase("reveal")

    const chosenMinute = MINUTE_OPTIONS[[12, 3, 6, 9].indexOf(n)] ?? null
    const isCorrect = chosenHour === target.hour && chosenMinute === target.minute
    if (isCorrect) setCorrectCount((c) => c + 1)

    setTimeout(() => {
      const nextRound = round + 1
      setRound(nextRound)
      if (nextRound >= TOTAL_ROUNDS) {
        setFinished(true)
      } else {
        setTarget(randomTarget())
        setPhase("hour")
        setChosenHour(null)
        setChosenMinuteNumber(null)
      }
    }, 1300)
  }

  useEffect(() => {
    if (!finished || saved) return
    setSaved(true)
    void saveGameResult({ game: "clock-draw", score: Math.max(0, score), accuracy, durationSeconds: seconds })
  }, [finished, saved, score, accuracy, seconds])

  const isRevealCorrect =
    phase === "reveal" && chosenHour === target.hour && chosenMinuteNumber === minuteToNumber(target.minute)

  return (
    <GameFrame
      title="Clock Setting"
      instruction={
        phase === "hour"
          ? `Tap the number where the SHORT hour hand should point for ${formatTime(target)}.`
          : phase === "minute"
            ? `Now tap where the LONG minute hand should point (12 = :00, 3 = :15, 6 = :30, 9 = :45).`
            : "Here's how the clock looks with your choices."
      }
      score={Math.max(0, score)}
      accuracy={accuracy}
      seconds={seconds}
      round={Math.min(round + (finished ? 0 : 1), TOTAL_ROUNDS)}
      totalRounds={TOTAL_ROUNDS}
      paused={paused}
      onTogglePause={finished ? undefined : () => setPaused((p) => !p)}
      onRestart={reset}
    >
      {finished ? (
        <GameResult
          score={Math.max(0, score)}
          accuracy={accuracy}
          seconds={seconds}
          best={best}
          isNewBest={score > best}
          onRestart={reset}
        />
      ) : (
        <Card className="flex flex-col items-center gap-5">
          <p className="font-display text-2xl font-semibold tracking-tight">Set the clock to {formatTime(target)}</p>

          {paused ? (
            <p className="py-10 text-center text-sm font-medium text-muted-foreground">
              Game paused. Press Resume when you are ready.
            </p>
          ) : (
            <>
              <svg viewBox="0 0 300 300" className="w-full max-w-xs" role="img" aria-label="Clock face">
                <circle cx={CENTER} cy={CENTER} r={FACE_RADIUS} className="fill-muted/40 stroke-border" strokeWidth={2} />

                {/* hands, once both chosen */}
                {chosenHour !== null && (
                  <line
                    x1={CENTER}
                    y1={CENTER}
                    x2={handEnd(chosenHour, 55).x}
                    y2={handEnd(chosenHour, 55).y}
                    className="stroke-primary"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                )}
                {chosenMinuteNumber !== null && (
                  <line
                    x1={CENTER}
                    y1={CENTER}
                    x2={handEnd(chosenMinuteNumber, 92).x}
                    y2={handEnd(chosenMinuteNumber, 92).y}
                    className="stroke-secondary"
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                )}
                <circle cx={CENTER} cy={CENTER} r={6} className="fill-foreground" />

                {/* tappable numbers */}
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                  const pos = numberPosition(n)
                  const isChosenHour = phase !== "hour" && chosenHour === n
                  const isChosenMinute = phase === "reveal" && chosenMinuteNumber === n
                  return (
                    <g key={n} transform={`translate(${pos.x}, ${pos.y})`}>
                      <circle
                        r={18}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isChosenHour && "fill-primary/20 stroke-primary",
                          isChosenMinute && "fill-secondary/20 stroke-secondary",
                          !isChosenHour && !isChosenMinute && "fill-card stroke-border hover:fill-muted",
                        )}
                        strokeWidth={2}
                        onClick={() => handleTapNumber(n)}
                        role="button"
                        aria-label={`Set hand to ${n}`}
                      />
                      <text textAnchor="middle" dominantBaseline="central" className="pointer-events-none select-none fill-foreground text-sm font-medium">
                        {n}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {phase === "reveal" && (
                <p className={cn("text-sm font-medium", isRevealCorrect ? "text-success" : "text-destructive")}>
                  {isRevealCorrect ? "Correct!" : `Not quite — the time was ${formatTime(target)}.`}
                </p>
              )}
            </>
          )}
        </Card>
      )}
    </GameFrame>
  )
}
