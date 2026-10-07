import { cn } from 'cn'
import { formatCompact, formatCurrency } from '@/lib/format'
import { useBudget } from '@/store/budget-store'

interface MoneyProps {
  value: number
  className?: string
  signed?: boolean
  compact?: boolean
}

export function Money({ value, className, signed = false, compact = false }: MoneyProps) {
  const { state } = useBudget()
  const privacy = state.settings.privacyMode
  const useCompact =
    !privacy &&
    (compact || (state.settings.compactValues === true && Math.abs(value) >= 1000))

  const text = useCompact ? formatCompact(Math.abs(value)) : formatCurrency(Math.abs(value), privacy)

  const prefix = signed ? (value > 0 ? '+ ' : value < 0 ? '− ' : '') : value < 0 ? '− ' : ''

  return (
    <span className={cn('tabular-nums whitespace-nowrap', className)}>
      {prefix}
      {text}
    </span>
  )
}
