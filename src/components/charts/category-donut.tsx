import { useState, type ReactNode } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { rampColor } from '@/components/charts/chart-primitives'

export interface DonutEntry {
  id: string
  name: string
  value: number
}

interface CategoryDonutProps {
  entries: DonutEntry[]
  centerLabel: string
  centerValue: ReactNode
  height?: number
  onSelect?: (id: string) => void
}

export function CategoryDonut({
  entries,
  centerLabel,
  centerValue,
  height = 240,
  onSelect,
}: CategoryDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const entry = payload[0].payload as DonutEntry
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
                  <p className="text-xs font-medium text-foreground">{entry.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(entry.value)}
                  </p>
                </div>
              )
            }}
          />
          <Pie
            data={entries}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={96}
            paddingAngle={1.5}
            stroke="var(--card)"
            strokeWidth={2}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={(_, index) => onSelect?.(entries[index]?.id)}
          >
            {entries.map((entry, index) => (
              <Cell
                key={entry.id}
                fill={activeIndex === index ? 'var(--primary)' : rampColor(index, entries.length)}
                className="cursor-pointer transition-colors"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-overline">{centerLabel}</span>
        <span className="mt-1 font-display text-lg font-bold tracking-[-0.03em] tabular-nums">
          {centerValue}
        </span>
      </div>
    </div>
  )
}
