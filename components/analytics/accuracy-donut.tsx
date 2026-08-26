"use client"

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { accuracyBreakdown } from "@/lib/mock-data"

const colors = ["var(--chart-1)", "var(--muted)"]

export function AccuracyDonut({ height = 220 }: { height?: number }) {
  const correct = accuracyBreakdown[0].value

  return (
    <div className="relative" style={{ height }} role="img" aria-label={`Donut chart showing ${correct}% overall accuracy`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={accuracyBreakdown}
            dataKey="value"
            nameKey="name"
            innerRadius="66%"
            outerRadius="94%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            paddingAngle={2}
          >
            {accuracyBreakdown.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-semibold tracking-tight">{correct}%</span>
        <span className="text-sm text-muted-foreground">accuracy</span>
      </div>
    </div>
  )
}
