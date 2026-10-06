import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Receipt, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/empty-state'
import { FilterChip } from '@/components/filter-chip'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { TransactionRow } from '@/components/transaction-row'
import { TransactionFormDialog } from '@/components/transaction-form-dialog'
import { monthKey, monthLabel } from '@/lib/format'
import { sumByType } from '@/lib/selectors'
import { useBudget } from '@/store/budget-store'
import type { Transaction, TxFilter } from '@/types'

const ALL = 'all'
const PAGE_SIZE = 50

export function TransactionsPage() {
  const { state } = useBudget()
  const [params, setParams] = useSearchParams()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [search, setSearch] = useState(() => params.get('q') ?? '')
  const [type, setType] = useState<TxFilter>('all')
  const [category, setCategory] = useState(ALL)
  const [month, setMonth] = useState(ALL)

  useEffect(() => {
    if (params.get('new') === '1') {
      setFormOpen(true)
      const next = new URLSearchParams(params)
      next.delete('new')
      setParams(next, { replace: true })
    }
  }, [params, setParams])

  const months = useMemo(() => {
    const keys = new Set(state.transactions.map((tx) => monthKey(tx.date)))
    return [...keys].sort().reverse()
  }, [state.transactions])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return state.transactions.filter((tx) => {
      if (type !== 'all' && tx.type !== type) return false
      if (category !== ALL && tx.categoryId !== category) return false
      if (month !== ALL && monthKey(tx.date) !== month) return false
      if (query) {
        const note = tx.note.toLowerCase()
        const categoryName =
          state.categories.find((item) => item.id === tx.categoryId)?.name.toLowerCase() ?? ''
        if (!note.includes(query) && !categoryName.includes(query)) return false
      }
      return true
    })
  }, [state.transactions, state.categories, search, type, category, month])

  const totals = useMemo(
    () => ({
      income: sumByType(filtered, 'income'),
      expense: sumByType(filtered, 'expense'),
    }),
    [filtered],
  )

  const hasFilters = search.trim() !== '' || type !== 'all' || category !== ALL || month !== ALL

  const filterKey = `${search.trim()}|${type}|${category}|${month}`
  const [page, setPage] = useState({ key: filterKey, count: PAGE_SIZE })
  const visible = page.key === filterKey ? page.count : PAGE_SIZE

  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible])

  const loadMore = () => setPage({ key: filterKey, count: visible + PAGE_SIZE })

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (transaction: Transaction) => {
    setEditing(transaction)
    setFormOpen(true)
  }

  const clearFilters = () => {
    setSearch('')
    setType('all')
    setCategory(ALL)
    setMonth(ALL)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline="Movimentação"
        title="Transações"
        description="Todas as entradas e saídas do orçamento, com filtros por categoria e período."
        actions={
          <Button onClick={openNew}>
            <Plus />
            Nova transação
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por descrição…"
            className="pl-9"
            aria-label="Buscar transações"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { value: 'all', label: 'Todas' },
              { value: 'expense', label: 'Despesas' },
              { value: 'income', label: 'Receitas' },
            ] as const
          ).map((option) => (
            <FilterChip
              key={option.value}
              active={type === option.value}
              onClick={() => setType(option.value)}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Filtrar por categoria">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as categorias</SelectItem>
              {state.categories.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por mês">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os meses</SelectItem>
              {months.map((key) => (
                <SelectItem key={key} value={key}>
                  {monthLabel(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="gap-0">
        <CardContent className="px-0">
          <div className="hidden items-center gap-3 border-b border-border px-4 py-2 md:flex">
            <span className="size-9 shrink-0" />
            <span className="flex-1 text-overline">Descrição</span>
            <span className="w-28 text-overline">Categoria</span>
            <span className="w-28 text-right text-overline">Valor</span>
            <span className="w-8" />
          </div>

          {filtered.length > 0 ? (
            <>
              <ul className="divide-y divide-border">
                {shown.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    onEdit={openEdit}
                  />
                ))}
              </ul>

              {filtered.length > shown.length ? (
                <div className="border-t border-border px-4 py-3 text-center">
                  <Button variant="outline" size="sm" onClick={loadMore}>
                    Carregar mais
                  </Button>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
                <span>
                  {filtered.length} {filtered.length === 1 ? 'transação' : 'transações'}
                  {filtered.length > shown.length ? ` · exibindo ${shown.length}` : ''}
                </span>
                <span className="flex flex-wrap items-center gap-4">
                  <span>
                    Receitas <Money value={totals.income} className="text-success" />
                  </span>
                  <span>
                    Despesas <Money value={totals.expense} />
                  </span>
                  <span>
                    Resultado{' '}
                    <Money
                      value={totals.income - totals.expense}
                      signed
                      className={
                        totals.income - totals.expense >= 0 ? 'text-success' : 'text-warning'
                      }
                    />
                  </span>
                </span>
              </div>
            </>
          ) : state.transactions.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<Receipt className="size-6" />}
                title="Nenhuma transação ainda"
                description="Registre sua primeira entrada ou saída para começar a controlar o orçamento."
                action={
                  <Button onClick={openNew}>
                    <Plus />
                    Nova transação
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                title="Nenhum resultado"
                description="Nenhuma transação corresponde aos filtros aplicados."
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionFormDialog open={formOpen} onOpenChange={setFormOpen} transaction={editing} />
    </div>
  )
}
