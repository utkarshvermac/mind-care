"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Bell, Heart, Leaf, Moon, Star, Sun } from "lucide-react"
import { GameFrame, GameResult } from "@/components/games/game-frame"
import { Card } from "@/components/common/card"
import { saveGameResult } from "@/lib/api"
import { personalBest } from "@/lib/storage"
import { cn } from "@/lib/utils"

const icons = { Sun, Moon, Leaf, Heart, Star, Bell } as const
type SymbolName = keyof typeof icons

type Tile = { id: number; symbol: SymbolName; matched: boolean }

const symbols: SymbolName[] = ["Sun", "Moon", "Leaf", "Heart", "Star", "Bell"]

function buildDeck(): Tile[] {
  const deck = [...symbols, ...symbols].map((symbol, index) => ({ id: index, symbol, matched: false }))
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck.map((tile, index) => ({ ...tile, id: index }))
}

const tileTone = ["text-primary", "text-secondary", "text-accent", "text-warning", "text-success", "text-primary"]

export function CardMatchGame() {
  const [deck, setDeck] = useState<Tile[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [paused, setPaused] = useState(false)
  const [finished, setFinished] = useState(false)
  const [locked, setLocked] = useState(false)
  const [best, setBest] = useState(0)
  const [saved, setSaved] = useState(false)

  const reset = useCallback(() => {
    setDeck(buildDeck())
    setFlipped([])
    setMoves(0)
    setMatches(0)
    setSeconds(0)
    setPaused(false)
    setFinished(false)
    setLocked(false)
    setSaved(false)
    setBest(personalBest("card-match"))
  }, [])

  useEffect(() => {
    reset()
  }, [reset])

  useEffect(() => {
    if (finished || paused || deck.length === 0) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [finished, paused, deck.length])

  const accuracy = moves === 0 ? 100 : Math.round((matches / moves) * 100)
  const score = useMemo(
    () => (finished ? Math.max(120, 1000 - moves * 25 - seconds * 4) : Math.max(0, matches * 100 - moves * 10)),
    [finished, matches, moves, seconds],
  )

  // Resolve a pair
  useEffect(() => {
    if (flipped.length !== 2) return
    setLocked(true)
    const [a, b] = flipped
    const tileA = deck.find((t) => t.id === a)
    const tileB = deck.find((t) => t.id === b)
    const isMatch = tileA && tileB && tileA.symbol === tileB.symbol

    const timeout = setTimeout(
      () => {
        if (isMatch) {
          setDeck((prev) => prev.map((t) => (t.id === a || t.id === b ? { ...t, matched: true } : t)))
          setMatches((m) => m + 1)
        }
        setFlipped([])
        setLocked(false)
      },
      isMatch ? 420 : 760,
    )
    return () => clearTimeout(timeout)
  }, [flipped, deck])

  // Finish
  useEffect(() => {
    if (deck.length > 0 && matches === symbols.length && !finished) {
      setFinished(true)
    }
  }, [matches, deck.length, finished])

  useEffect(() => {
    if (!finished || saved) return
    setSaved(true)
    void saveGameResult({ game: "card-match", score, accuracy, durationSeconds: seconds })
  }, [finished, saved, score, accuracy, seconds])

  const handleFlip = (tile: Tile) => {
    if (locked || paused || tile.matched || flipped.includes(tile.id) || flipped.length === 2) return
    if (flipped.length === 1) setMoves((m) => m + 1)
    setFlipped((prev) => [...prev, tile.id])
  }

  return (
    <GameFrame
      title="Card Match"
      instruction="Tap two cards to turn them over. If the pictures match they stay open. Find all six pairs — take as long as you like."
      score={score}
      accuracy={accuracy}
      seconds={seconds}
      round={matches}
      totalRounds={symbols.length}
      paused={paused}
      onTogglePause={finished ? undefined : () => setPaused((p) => !p)}
      onRestart={reset}
    >
      {finished ? (
        <GameResult score={score} accuracy={accuracy} seconds={seconds} best={best} isNewBest={score > best} onRestart={reset} />
      ) : (
        <Card>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
            {deck.map((tile, index) => {
              const isOpen = tile.matched || flipped.includes(tile.id)
              const Icon = icons[tile.symbol]
              return (
                <li key={tile.id} className="aspect-square [perspective:1000px]">
                  <button
                    type="button"
                    onClick={() => handleFlip(tile)}
                    aria-label={isOpen ? `${tile.symbol} card, face up` : "Face down card"}
                    disabled={paused || tile.matched}
                    className={cn("flip-3d relative size-full rounded-2xl outline-none", isOpen && "is-flipped")}
                  >
                    {/* Back */}
                    <span
                      className={cn(
                        "flip-face absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-border bg-gradient-to-br from-muted to-card transition-colors",
                        !paused && "hover:border-primary/50",
                      )}
                    >
                      <span className="font-display text-2xl font-semibold text-muted-foreground/50">?</span>
                    </span>
                    {/* Front */}
                    <span
                      className={cn(
                        "flip-face flip-back absolute inset-0 flex items-center justify-center rounded-2xl border-2",
                        tile.matched ? "border-success bg-success/10" : "border-primary bg-primary/8",
                      )}
                    >
                      <Icon className={cn("size-9 sm:size-11", tileTone[index % tileTone.length])} aria-hidden="true" />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {paused ? (
            <p className="mt-5 rounded-xl bg-muted px-4 py-3 text-center text-sm font-medium text-muted-foreground">
              Game paused. Press Resume when you are ready.
            </p>
          ) : (
            <p className="mt-5 text-center text-sm text-muted-foreground">
              {matches} of {symbols.length} pairs found · {moves} moves
            </p>
          )}
        </Card>
      )}
    </GameFrame>
  )
}
