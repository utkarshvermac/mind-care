"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { weeklyScores } from "@/lib/mock-data"

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground">Score: {payload[0].value}</p>
    </div>
  )
}

export function WeeklyTrendChart({ height = 260 }: { height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Line chart showing cognitive score rising from 72 on Monday to 84 on Sunday">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={weeklyScores} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={13} tickLine={false} axisLine={false} />
          <YAxis domain={[60, 100]} stroke="var(--muted-foreground)" fontSize={13} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--chart-1)"
            strokeWidth={3}
            fill="url(#trendFill)"
            dot={{ r: 4, fill: "var(--chart-1)", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
