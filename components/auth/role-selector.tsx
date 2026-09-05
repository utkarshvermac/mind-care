"use client"

import { Check, HeartHandshake, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/mock-data"

const options: { value: Role; label: string; detail: string; icon: typeof UserRound }[] = [
  { value: "patient", label: "Patient", detail: "Games, reminders, assistant", icon: UserRound },
  { value: "caregiver", label: "Caregiver", detail: "Monitoring, trends, alerts", icon: HeartHandshake },
]

export function RoleSelector({ value, onChange }: { value: Role; onChange: (role: Role) => void }) {
  return (
    <div role="radiogroup" aria-label="Select your role" className="flex flex-col gap-3 sm:flex-row">
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "tap-target relative flex flex-1 items-center gap-3 rounded-xl border-2 bg-card p-4 text-left transition-colors",
              active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              <option.icon className="size-5" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="font-semibold">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.detail}</span>
            </span>
            {active ? (
              <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3.5" aria-hidden="true" />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
