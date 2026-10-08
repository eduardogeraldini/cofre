import { WalletCards } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Money } from '@/components/money'
import { Progress } from '@/components/ui/progress'
import { expensesByWallet } from '@/lib/selectors'
import { walletDotClass } from '@/lib/wallet-colors'
import { useBudget } from '@/store/budget-store'

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

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => (
        <div key={row.wallet?.id ?? 'sem-carteira'} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              {row.wallet ? (
                <span
                  className={`size-2.5 shrink-0 rounded-full ${walletDotClass(row.wallet.color)}`}
                />
              ) : (
                <WalletCards className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{row.wallet?.name ?? 'Sem carteira'}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              <Money value={row.total} />
              {total > 0 ? ` · ${((row.total / total) * 100).toFixed(0)}%` : ''}
            </span>
          </div>
          <Progress
            value={total > 0 ? (row.total / total) * 100 : 0}
            className="h-1.5"
            indicatorClassName={row.wallet ? walletDotClass(row.wallet.color) : 'bg-muted-foreground'}
          />
        </div>
      ))}
    </div>
  )
}
