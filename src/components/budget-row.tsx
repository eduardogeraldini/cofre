import { useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { CategoryIcon } from '@/components/category-icon'
import { Money } from '@/components/money'
import { parseAmount, toAmountInput } from '@/lib/money'
import type { Category, CategorySummary } from '@/types'

const statusIndicator: Record<CategorySummary['status'], string> = {
  ok: 'bg-success',
  warning: 'bg-warning',
  over: 'bg-destructive',
}

interface BudgetRowProps {
  category: Category
  count: number
  summary: CategorySummary | null
  onCommitLimit: (limit: number) => void
  onEdit: () => void
  onDelete: () => void
}

export function BudgetRow({
  category,
  count,
  summary,
  onCommitLimit,
  onEdit,
  onDelete,
}: BudgetRowProps) {
  const hasLimit = (summary?.limit ?? 0) > 0
  const [draft, setDraft] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const shown = draft ?? (hasLimit ? toAmountInput(summary?.limit ?? 0) : '')

  const commit = () => {
    const parsed = parseAmount(shown)
    if (summary && parsed !== summary.limit) onCommitLimit(parsed)
    setDraft(null)
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/60 sm:grid sm:grid-cols-[minmax(0,1fr)_150px_110px_120px_72px] sm:items-center sm:gap-x-4 sm:gap-y-2 sm:px-5 sm:py-3.5">
      <div className="flex items-center justify-between gap-2 sm:contents">
        <div className="flex min-w-0 items-center gap-3 sm:col-start-1 sm:row-start-1">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <CategoryIcon name={category.icon} className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{category.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {category.type === 'income' ? 'Receita' : 'Despesa'} · {count}{' '}
              {count === 1 ? 'transação' : 'transações'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:col-start-5 sm:row-start-1 sm:justify-end">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Editar ${category.name}`}
            title="Editar categoria"
            onClick={onEdit}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Excluir ${category.name}`}
            title="Excluir categoria"
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1 sm:col-start-2 sm:row-start-1">
        <span className="text-xs text-muted-foreground sm:hidden">Limite mensal</span>
        {summary ? (
          <Input
            ref={inputRef}
            inputMode="decimal"
            placeholder="Definir limite"
            className="h-9 font-mono tabular-nums"
            value={shown}
            aria-label={`Limite mensal de ${category.name}`}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commit()
                inputRef.current?.blur()
              }
            }}
          />
        ) : (
          <span className="flex h-9 items-center px-3.5 text-sm text-muted-foreground">—</span>
        )}
      </div>

      <div className="flex gap-4 sm:contents">
        <div className="flex flex-1 items-baseline justify-between gap-2 sm:col-start-3 sm:row-start-1 sm:flex-none sm:flex-col sm:items-end sm:gap-0.5">
          <span className="text-xs text-muted-foreground sm:hidden">Gasto</span>
          {summary ? (
            <Money value={summary.spent} className="text-sm tabular-nums" />
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>

        <div className="flex flex-1 items-baseline justify-between gap-2 sm:col-start-4 sm:row-start-1 sm:flex-none sm:flex-col sm:items-end sm:gap-0.5">
          <span className="text-xs text-muted-foreground sm:hidden">Restante</span>
          {summary && hasLimit ? (
            <Money
              value={summary.remaining}
              className={`text-sm font-medium tabular-nums ${
                summary.remaining < 0 ? 'text-destructive' : 'text-foreground'
              }`}
            />
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
      </div>

      {summary && hasLimit ? (
        <Progress
          value={Math.min(summary.ratio, 100)}
          indicatorClassName={statusIndicator[summary.status]}
          aria-label={`Percentual usado em ${category.name}`}
          className="sm:col-start-1 sm:col-end-6 sm:row-start-2"
        />
      ) : null}
    </li>
  )
}
