import { notFound } from "next/navigation"
import { CardMatchGame } from "@/components/games/card-match-game"
import { PatternRecallGame } from "@/components/games/pattern-recall-game"
import { WordRecallGame } from "@/components/games/word-recall-game"
import { FaceRecallGame } from "@/components/games/face-recall-game"
import { ClockDrawGame } from "@/components/games/clock-draw-game"

export function generateStaticParams() {
  return [
    { gameId: "card-match" },
    { gameId: "pattern-recall" },
    { gameId: "word-recall" },
    { gameId: "face-recall" },
    { gameId: "clock-draw" },
  ]
}

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params

  if (gameId === "card-match") return <CardMatchGame />
  if (gameId === "pattern-recall") return <PatternRecallGame />
  if (gameId === "word-recall") return <WordRecallGame />
  if (gameId === "face-recall") return <FaceRecallGame />
  if (gameId === "clock-draw") return <ClockDrawGame />

  notFound()
}
