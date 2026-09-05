"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const tones = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/12 text-secondary",
  accent: "bg-accent/12 text-accent",
  warning: "bg-warning/12 text-warning",
  success: "bg-success/12 text-success",
} as const

export type Tone = keyof typeof tones

export function AnimatedNumber({
  value,
  suffix = "",
  duration = 900,
}: {
  value: number
  suffix?: string
  duration?: number
}) {
  const [display, setDisplay] = useState(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.classList.contains("reduce-motion"))
    if (reduced) {
      setDisplay(value)
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased * 10) / 10)
      if (progress < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [value, duration])

  const rounded = Number.isInteger(value) ? Math.round(display) : display
  return (
    <span>
      {rounded}
      {suffix}
    </span>
  )
}

export function StatCard({
  label,
  value,
  suffix,
  hint,
  icon,
  tone = "primary",
  animate = true,
}: {
  label: string
  value: number | string
  suffix?: string
  hint?: string
  icon: React.ReactNode
  tone?: Tone
  animate?: boolean
}) {
  return (
    <div className="surface flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex size-10 items-center justify-center rounded-xl", tones[tone])} aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {typeof value === "number" && animate ? <AnimatedNumber value={value} suffix={suffix} /> : value}
        {typeof value === "number" && animate ? null : suffix}
      </p>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function ProgressRing({
  value,
  size = 168,
  stroke = 14,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  children?: React.ReactNode
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const [offset, setOffset] = useState(circumference)

  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(circumference - (value / 100) * circumference))
    return () => cancelAnimationFrame(id)
  }, [value, circumference])

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${value}% complete`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-primary-foreground/25"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-primary-foreground transition-[stroke-dashoffset] duration-1000 ease-out"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

export function ProgressBar({
  value,
  tone = "primary",
  label,
}: {
  value: number
  tone?: Tone
  label?: string
}) {
  const bar = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    accent: "bg-accent",
    warning: "bg-warning",
    success: "bg-success",
  }[tone]

  return (
    <div
      className="h-3 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-1000 ease-out", bar)} style={{ width: `${value}%` }} />
    </div>
  )
}
