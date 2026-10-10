import { WalletCards } from 'lucide-react'
import { CategoryDonut, type DonutEntry } from '@/components/charts/category-donut'
import { rampColor } from '@/components/charts/chart-colors'
import { EmptyState } from '@/components/empty-state'
import { Money } from '@/components/money'
import { expensesByWallet } from '@/lib/selectors'
import { walletHex } from '@/lib/wallet-colors'
import { useBudget } from '@/store/budget-context'

export function WalletExpenses({ month }: { month: string }) {
  const { state } = useBudget()
  const rows = expensesByWallet(state, month)
  const total = rows.reduce((sum, row) => sum + row.total, 0)

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<WalletCards className="size-6" />}
        title="Sem despesas no mês"
        description="Nenhuma saída registrada neste período."
      />
    )
  }

  const entries: DonutEntry[] = rows.map((row) => ({
    id: row.wallet?.id ?? 'sem-carteira',
    name: row.wallet?.name ?? 'Sem carteira',
    value: row.total,
    color: row.wallet ? walletHex(row.wallet.color) : undefined,
  }))

  return (
    <>
      <CategoryDonut
        entries={entries}
        centerLabel="Total gasto"
        centerValue={<Money value={total} />}
      />
      <ul className="mt-4 flex flex-col gap-2.5">
        {entries.map((entry, index) => (
          <li key={entry.id} className="flex items-center gap-2.5 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color ?? rampColor(index, entries.length) }}
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{entry.name}</span>
            <span className="shrink-0 font-medium tabular-nums">
              <Money value={entry.value} />
            </span>
            <span className="w-10 shrink-0 text-right text-xs text-neutral tabular-nums">
              {((entry.value / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
