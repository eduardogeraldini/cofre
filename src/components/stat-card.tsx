import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { cn } from 'cn'
import { Money } from '@/components/money'
import { formatPercent } from '@/lib/format'

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  compact?: boolean
  delta?: number
  deltaGood?: boolean
  hint?: string
  footer?: ReactNode
  className?: string
  display?: ReactNode
}

export function StatCard({
  label,
  value,
  icon: Icon,
  compact = false,
  delta,
  deltaGood = true,
  hint,
  footer,
  className,
  display,
}: StatCardProps) {
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta)
  const rising = (delta ?? 0) >= 0

  return (
    <article className={cn('flex flex-col gap-3 rounded-xl border border-border bg-card p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-overline">{label}</p>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
      </div>

      {display ?? (
        <Money
          value={value}
          compact={compact}
          className="font-display text-2xl leading-none font-bold tracking-[-0.03em]"
        />
      )}

      {hasDelta ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium',
              deltaGood ? 'text-success' : 'text-warning',
            )}
          >
            {rising ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {formatPercent(Math.abs(delta!))}
          </span>
          {hint ?? 'vs. mês anterior'}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}

      {footer}
    </article>
  )
}
