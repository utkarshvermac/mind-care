"use client"

import { streakCalendar } from "@/lib/mock-data"

const levelClass = [
  "bg-muted",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
]

const labels = ["No activity", "Light", "Moderate", "Good", "Excellent"]

export function StreakCalendar() {
  // 12 columns of 7 days.
  const weeks: number[][] = []
  for (let i = 0; i < streakCalendar.length; i += 7) {
    weeks.push(streakCalendar.slice(i, i + 7))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="img" aria-label="Activity calendar for the last 12 weeks">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1.5">
            {week.map((level, dayIndex) => (
              <span
                key={dayIndex}
                title={`${labels[level]} — week ${weekIndex + 1}, day ${dayIndex + 1}`}
                className={`size-4 shrink-0 rounded-[5px] ${levelClass[level]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        {levelClass.map((cls, index) => (
          <span key={index} className={`size-3.5 rounded-[4px] ${cls}`} aria-hidden="true" />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
