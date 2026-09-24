"use client"

import { useEffect, useState } from "react"
import { HeartHandshake } from "lucide-react"
import { Card, CardTitle, CardSubtitle } from "@/components/common/card"
import { getCaregiverWellnessToday, updateCaregiverWellnessToday, type CaregiverWellness } from "@/lib/api"

const MOODS = [
  { value: 1, emoji: "😞" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "😄" },
]

/** A quick, private daily check-in for the caregiver's own wellbeing —
 * separate from the patient's dashboard. Caregiver burnout is real and
 * easy to overlook. */
export function CaregiverSelfCareCard() {
  const [log, setLog] = useState<CaregiverWellness | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCaregiverWellnessToday()
      .then(setLog)
      .catch(() => setLog(null))
  }, [])

  async function setMood(mood: number) {
    setSaving(true)
    try {
      setLog(await updateCaregiverWellnessToday({ mood }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>How are you doing today?</CardTitle>
          <CardSubtitle>A quick, private check-in — just for you.</CardSubtitle>
        </div>
        <HeartHandshake className="mt-1 size-5 shrink-0 text-muted-foreground" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        {MOODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMood(m.value)}
            disabled={saving}
            aria-label={`Mood ${m.value} of 5`}
            aria-pressed={log?.mood === m.value}
            className={`tap-target flex-1 rounded-xl border py-2 text-2xl transition ${
              log?.mood === m.value ? "border-primary bg-primary/10" : "border-border bg-muted/40 hover:bg-muted"
            }`}
          >
            {m.emoji}
          </button>
        ))}
      </div>

      {log?.tip && <p className="mt-4 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">{log.tip}</p>}
    </Card>
  )
}
