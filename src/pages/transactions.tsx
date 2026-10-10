import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileUp, Plus, Receipt, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/empty-state'
import { FilterChip } from '@/components/filter-chip'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { TransactionRow } from '@/components/transaction-row'
import { TransactionFormDialog } from '@/components/transaction-form-dialog'
import { OfxImportDialog } from '@/components/ofx-import-dialog'
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
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [search, setSearch] = useState(() => params.get('q') ?? '')
  const [type, setType] = useState<TxFilter>('all')
  const [category, setCategory] = useState(ALL)
  const [walletFilter, setWalletFilter] = useState(ALL)
  const [projectFilter, setProjectFilter] = useState(ALL)
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
      if (walletFilter === 'none' && tx.walletId) return false
      if (walletFilter !== ALL && walletFilter !== 'none' && tx.walletId !== walletFilter)
        return false
      if (projectFilter === 'none' && tx.projectId) return false
      if (projectFilter !== ALL && projectFilter !== 'none' && tx.projectId !== projectFilter)
        return false
      if (month !== ALL && monthKey(tx.date) !== month) return false
      if (query) {
        const note = tx.note.toLowerCase()
        const categoryName =
          state.categories.find((item) => item.id === tx.categoryId)?.name.toLowerCase() ?? ''
        const walletName =
          state.wallets.find((item) => item.id === tx.walletId)?.name.toLowerCase() ?? ''
        const projectName =
          state.projects.find((item) => item.id === tx.projectId)?.name.toLowerCase() ?? ''
        if (
          !note.includes(query) &&
          !categoryName.includes(query) &&
          !walletName.includes(query) &&
          !projectName.includes(query)
        )
          return false
      }
      return true
    })
  }, [
    state.transactions,
    state.categories,
    state.wallets,
    state.projects,
    search,
    type,
    category,
    walletFilter,
    projectFilter,
    month,
  ])

  const totals = useMemo(
    () => ({
      income: sumByType(filtered, 'income'),
      expense: sumByType(filtered, 'expense'),
    }),
    [filtered],
  )

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = []
    if (category !== ALL) {
      const name = state.categories.find((item) => item.id === category)?.name
      if (name) {
        chips.push({ key: 'category', label: `Categoria: ${name}`, onRemove: () => setCategory(ALL) })
      }
    }
    if (walletFilter !== ALL) {
      const name =
        walletFilter === 'none'
          ? 'Sem carteira'
          : state.wallets.find((item) => item.id === walletFilter)?.name
      if (name) {
        chips.push({ key: 'wallet', label: `Carteira: ${name}`, onRemove: () => setWalletFilter(ALL) })
      }
    }
    if (projectFilter !== ALL) {
      const name =
        projectFilter === 'none'
          ? 'Sem projeto'
          : state.projects.find((item) => item.id === projectFilter)?.name
      if (name) {
        chips.push({
          key: 'project',
          label: `Projeto: ${name}`,
          onRemove: () => setProjectFilter(ALL),
        })
      }
    }
    if (month !== ALL) {
      chips.push({ key: 'month', label: `Mês: ${monthLabel(month)}`, onRemove: () => setMonth(ALL) })
    }
    return chips
  }, [category, walletFilter, projectFilter, month, state.categories, state.wallets, state.projects])

  const filterKey = `${search.trim()}|${type}|${category}|${walletFilter}|${projectFilter}|${month}`
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
    setWalletFilter(ALL)
    setProjectFilter(ALL)
    setMonth(ALL)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline="Movimentação"
        title="Transações"
        description="Todas as entradas e saídas do orçamento, com filtros por categoria e período."
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp />
              Importar OFX
            </Button>
            <Button onClick={openNew}>
              <Plus />
              Nova transação
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3">
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

          <div className="flex flex-1 items-center gap-2 sm:justify-end">
            <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <SlidersHorizontal />
                Filtros
                {activeChips.length > 0 ? (
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {activeChips.length}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-overline">Categoria</span>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full" aria-label="Filtrar por categoria">
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
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-overline">Carteira</span>
                  <Select value={walletFilter} onValueChange={setWalletFilter}>
                    <SelectTrigger className="w-full" aria-label="Filtrar por carteira">
                      <SelectValue placeholder="Carteira" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todas as carteiras</SelectItem>
                      <SelectItem value="none">Sem carteira</SelectItem>
                      {state.wallets.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {state.projects.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-overline">Projeto</span>
                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                      <SelectTrigger className="w-full" aria-label="Filtrar por projeto">
                        <SelectValue placeholder="Projeto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>Todos os projetos</SelectItem>
                        <SelectItem value="none">Sem projeto</SelectItem>
                        {state.projects.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="flex flex-col gap-1.5">
                  <span className="text-overline">Mês</span>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="w-full" aria-label="Filtrar por mês">
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
                </div>

                {activeChips.length > 0 ? (
                  <>
                    <Separator />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      aria-label="Limpar todos os filtros"
                      onClick={clearFilters}
                    >
                      Limpar filtros
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum filtro aplicado.</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
          </div>
        </div>

        {activeChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                aria-label={`Remover filtro ${chip.label}`}
              >
                {chip.label}
                <X className="size-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Card className="gap-0">
        <CardContent className="px-0">
          <div className="hidden items-center gap-3 border-b border-border px-4 py-2 md:flex">
            <span className="size-9 shrink-0" />
            <span className="flex-1 text-overline">Descrição</span>
            <span className="w-28 text-overline">Categoria</span>
            <span className="w-28 text-overline">Carteira</span>
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
                icon={<Search className="size-6" />}
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
      <OfxImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
