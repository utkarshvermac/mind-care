"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { Card, CardTitle, CardSubtitle } from "@/components/common/card"
import { entryOfTheDay } from "@/lib/folklore-data"
import { ReadAloudButton } from "@/components/common/read-aloud-button"

export function CultureCornerCard() {
  const [revealed, setRevealed] = useState(false)
  const entry = entryOfTheDay()

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>{entry.type === "riddle" ? "Riddle of the day" : "A saying to think about"}</CardTitle>
          <CardSubtitle>A little something to chat about together.</CardSubtitle>
        </div>
        <Sparkles className="mt-1 size-5 shrink-0 text-muted-foreground" />
      </div>

      <p className="mt-4 text-lg font-medium leading-relaxed">{entry.prompt}</p>

      {revealed ? (
        <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
          {entry.answer}
          {entry.origin ? <span className="mt-1 block text-xs italic">— {entry.origin}</span> : null}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="tap-target mt-3 rounded-full border border-border bg-muted/60 px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          {entry.type === "riddle" ? "Reveal answer" : "Reveal meaning"}
        </button>
      )}

      <div className="mt-4">
        <ReadAloudButton text={`${entry.prompt}. ${entry.answer}`} />
      </div>
    </Card>
  )
}
