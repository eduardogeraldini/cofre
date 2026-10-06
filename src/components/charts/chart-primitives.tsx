import { cn } from 'cn'
import { formatCurrency } from '@/lib/format'
import { useBudget } from '@/store/budget-store'

interface ChartTooltipProps {
  active?: boolean
  label?: string
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>
  formatter?: (value: number) => string
}

export function ChartTooltip({ active, label, payload, formatter }: ChartTooltipProps) {
  const { state } = useBudget()

  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      {label ? <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p> : null}
      <div className="flex flex-col gap-1">
        {payload.map((entry, index) => (
          <div key={`${entry.dataKey ?? index}`} className="flex items-center gap-2 text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium text-foreground tabular-nums">
              {formatter
                ? formatter(entry.value ?? 0)
                : formatCurrency(entry.value ?? 0, state.settings.privacyMode)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function rampColor(index: number, total: number): string {
  const t = total <= 1 ? 1 : index / (total - 1)
  const mix = Math.round(96 - t * 64)
  return `color-mix(in oklch, var(--foreground) ${mix}%, var(--background))`
}

export function ChartLegend({
  items,
  className,
}: {
  items: Array<{ label: string; color: string; value?: string }>
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
          {item.value ? <span className="text-neutral">{item.value}</span> : null}
        </span>
      ))}
    </div>
  )
}
