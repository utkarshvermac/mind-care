"use client"

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { gamePerformance } from "@/lib/mock-data"

const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"]

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; payload: { sessions: number } }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground">Accuracy: {payload[0].value}%</p>
      <p className="text-muted-foreground">{payload[0].payload.sessions} sessions</p>
    </div>
  )
}

export function GamePerformanceChart({ height = 260 }: { height?: number }) {
  return (
    <div
      style={{ height }}
      role="img"
      aria-label="Bar chart comparing accuracy per game: Card Match 92%, Pattern Recall 81%, Word Recall 86%"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={gamePerformance} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="game" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={13} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
          <Bar dataKey="accuracy" radius={[8, 8, 0, 0]} maxBarSize={64}>
            {gamePerformance.map((entry, index) => (
              <Cell key={entry.game} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
