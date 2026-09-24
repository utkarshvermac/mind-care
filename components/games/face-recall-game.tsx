"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { UserRound, Users } from "lucide-react"
import { GameFrame, GameResult } from "@/components/games/game-frame"
import { Card } from "@/components/common/card"
import { saveGameResult, getPersonalBest, getFamilyMembers, type FamilyMemberRow } from "@/lib/api"
import { cn } from "@/lib/utils"

const MIN_MEMBERS = 3
const MAX_ROUNDS = 8

type Round = { target: FamilyMemberRow; choices: FamilyMemberRow[] }

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildRounds(members: FamilyMemberRow[]): Round[] {
  const order = shuffled(members).slice(0, MAX_ROUNDS)
  return order.map((target) => {
    const others = shuffled(members.filter((m) => m.id !== target.id)).slice(0, 3)
    return { target, choices: shuffled([target, ...others]) }
  })
}

function Avatar({ member, size = "size-24" }: { member: FamilyMemberRow; size?: string }) {
  if (member.photoDataUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={member.photoDataUrl} alt="" className={cn(size, "rounded-2xl object-cover")} />
  }
  return (
    <span className={cn(size, "flex items-center justify-center rounded-2xl bg-primary/10 text-primary")}>
      <UserRound className="size-1/2" aria-hidden="true" />
    </span>
  )
}

export function FaceRecallGame() {
  const [members, setMembers] = useState<FamilyMemberRow[] | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [roundIndex, setRoundIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [paused, setPaused] = useState(false)
  const [finished, setFinished] = useState(false)
  const [best, setBest] = useState(0)
  const [saved, setSaved] = useState(false)

  const loadMembers = useCallback(() => {
    getFamilyMembers()
      .then((data) => setMembers(data.members))
      .catch(() => setMembers([]))
  }, [])

  const reset = useCallback(() => {
    setRoundIndex(0)
    setCorrectCount(0)
    setAnsweredCount(0)
    setSelectedId(null)
    setLocked(false)
    setSeconds(0)
    setPaused(false)
    setFinished(false)
    setSaved(false)
    void getPersonalBest("face-recall").then(setBest)
    loadMembers()
  }, [loadMembers])

  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (members && members.length >= MIN_MEMBERS) setRounds(buildRounds(members))
  }, [members])

  useEffect(() => {
    if (finished || paused || rounds.length === 0) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [finished, paused, rounds.length])

  const accuracy = answeredCount === 0 ? 100 : Math.round((correctCount / answeredCount) * 100)
  const score = useMemo(() => correctCount * 120 - Math.max(0, answeredCount - correctCount) * 20, [correctCount, answeredCount])

  const currentRound = rounds[roundIndex]

  function handleChoice(memberId: string) {
    if (locked || paused || !currentRound) return
    setLocked(true)
    setSelectedId(memberId)
    const isCorrect = memberId === currentRound.target.id
    setAnsweredCount((n) => n + 1)
    if (isCorrect) setCorrectCount((n) => n + 1)

    setTimeout(() => {
      if (roundIndex + 1 >= rounds.length) {
        setFinished(true)
      } else {
        setRoundIndex((r) => r + 1)
        setSelectedId(null)
        setLocked(false)
      }
    }, 700)
  }

  useEffect(() => {
    if (!finished || saved) return
    setSaved(true)
    void saveGameResult({ game: "face-recall", score: Math.max(0, score), accuracy, durationSeconds: seconds })
  }, [finished, saved, score, accuracy, seconds])

  // Loading state
  if (members === null) {
    return (
      <GameFrame
        title="Family & Faces"
        instruction="Loading your family book…"
        score={0}
        accuracy={100}
        seconds={0}
        round={0}
        totalRounds={0}
        onRestart={reset}
      >
        <Card className="py-10 text-center text-muted-foreground">Loading…</Card>
      </GameFrame>
    )
  }

  // Not enough family members added yet
  if (members.length < MIN_MEMBERS) {
    return (
      <GameFrame
        title="Family & Faces"
        instruction="Add at least three family members with a photo to play this game."
        score={0}
        accuracy={100}
        seconds={0}
        round={0}
        totalRounds={0}
        onRestart={reset}
      >
        <Card className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary/12 text-secondary">
            <Users className="size-8" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold">Build your family book first</h2>
            <p className="mt-2 max-w-sm text-muted-foreground">
              You have {members.length} of {MIN_MEMBERS} family members added. Add a few more with names, relations, and
              photos to unlock this game.
            </p>
          </div>
          <Link
            href="/family"
            className="tap-target rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Go to Family & Faces
          </Link>
        </Card>
      </GameFrame>
    )
  }

  return (
    <GameFrame
      title="Family & Faces"
      instruction="Look at the photo, then choose the correct name below."
      score={Math.max(0, score)}
      accuracy={accuracy}
      seconds={seconds}
      round={Math.min(roundIndex + (finished ? 0 : 1), rounds.length)}
      totalRounds={rounds.length}
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
      ) : currentRound ? (
        <Card>
          {paused ? (
            <p className="py-10 text-center text-sm font-medium text-muted-foreground">
              Game paused. Press Resume when you are ready.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <Avatar member={currentRound.target} size="size-32" />
              <div className="grid w-full max-w-sm grid-cols-1 gap-3 sm:grid-cols-2">
                {currentRound.choices.map((choice) => {
                  const isSelected = selectedId === choice.id
                  const isCorrectChoice = choice.id === currentRound.target.id
                  const showState = locked && (isSelected || isCorrectChoice)
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => handleChoice(choice.id)}
                      disabled={locked}
                      className={cn(
                        "tap-target rounded-xl border-2 px-4 py-3 text-center font-medium transition-colors",
                        showState && isCorrectChoice && "border-success bg-success/10 text-success",
                        showState && isSelected && !isCorrectChoice && "border-destructive bg-destructive/10 text-destructive",
                        !showState && "border-border bg-muted/40 hover:border-primary/50",
                      )}
                    >
                      {choice.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </Card>
      ) : null}
    </GameFrame>
  )
}
