import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  PieChart,
  Plus,
  Receipt,
  Shapes,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CategoryIcon } from '@/components/category-icon'
import { EmptyState } from '@/components/empty-state'
import { Money } from '@/components/money'
import { StatCard } from '@/components/stat-card'
import { TransactionRow } from '@/components/transaction-row'
import { TransactionFormDialog } from '@/components/transaction-form-dialog'
import {
  categorySummaries,
  budgetUsage,
  changeAgainstPrevious,
  savingsRate,
  sumByType,
  totalBalance,
  transactionsInMonth,
} from '@/lib/selectors'
import { monthKeyOf, monthLabelLong } from '@/lib/format'
import { useBudget } from '@/store/budget-store'
import type { CategorySummary, Transaction } from '@/types'

const statusIndicator: Record<CategorySummary['status'], string> = {
  ok: 'bg-success',
  warning: 'bg-warning',
  over: 'bg-destructive',
}

export function DashboardPage() {
  const { state } = useBudget()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const current = monthKeyOf(new Date())
  const monthTxs = transactionsInMonth(state.transactions, current)
  const income = sumByType(monthTxs, 'income')
  const expense = sumByType(monthTxs, 'expense')
  const net = income - expense
  const balance = totalBalance(state.transactions)
  const rate = savingsRate(income, expense)
  const delta = changeAgainstPrevious(state, current)
  const usage = budgetUsage(state, current)
  const summaries = categorySummaries(state, current)
    .filter((summary) => summary.limit > 0)
    .slice(0, 5)
  const recent = state.transactions.slice(0, 6)

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (transaction: Transaction) => {
    setEditing(transaction)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border border-border bg-card p-6 sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-overline">Saldo consolidado</p>
            <Money value={balance} className="mt-3 block text-display" />
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge variant={net >= 0 ? 'success' : 'warning'}>
                <TrendingUp className="size-3" />
                <Money value={net} signed className="font-medium" />
              </Badge>
              <span className="text-sm text-muted-foreground">
                no mês de {monthLabelLong(current)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/relatorios">Ver relatórios</Link>
            </Button>
            <Button onClick={openNew}>
              <Plus />
              Nova transação
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Receitas do mês"
          value={income}
          icon={ArrowUpRight}
          delta={delta.income}
          deltaGood
          compact
        />
        <StatCard
          label="Despesas do mês"
          value={expense}
          icon={ArrowDownRight}
          delta={delta.expense}
          deltaGood={delta.expense <= 0}
          compact
        />
        <StatCard
          label="Taxa de economia"
          value={rate}
          icon={TrendingUp}
          hint="da receita do mês"
          display={
            <span className="font-display text-2xl leading-none font-bold tracking-[-0.03em] tabular-nums">
              {rate.toFixed(0)}%
            </span>
          }
          footer={
            <div className="mt-auto flex items-center gap-2">
              <Progress
                value={Math.max(0, Math.min(rate, 100))}
                className="h-1.5"
                indicatorClassName={
                  rate >= 20 ? 'bg-success' : rate >= 10 ? 'bg-warning' : 'bg-destructive'
                }
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {rate.toFixed(0)}%
              </span>
            </div>
          }
        />
        <StatCard
          label="Orçamento restante"
          value={usage.remaining}
          icon={PieChart}
          compact
          hint={`de ${usage.limit > 0 ? 'limite mensal' : 'limite definido'}`}
          footer={
            <div className="mt-auto flex flex-col gap-2">
              <Progress
                value={Math.min(usage.ratio, 100)}
                className="h-1.5"
                indicatorClassName={
                  usage.ratio >= 100
                    ? 'bg-destructive'
                    : usage.ratio >= 80
                      ? 'bg-warning'
                      : 'bg-success'
                }
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {usage.ratio.toFixed(0)}% do limite usado
              </span>
            </div>
          }
        />
      </section>

      <section>
        <Card className="gap-0">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
              Orçamentos do mês
            </CardTitle>
            <CardDescription>
              {usage.limit > 0 ? (
                <>
                  <Money value={usage.spent} /> de <Money value={usage.limit} /> utilizados
                </>
              ) : (
                'Defina limites para acompanhar o gasto'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            {summaries.length > 0 ? (
              <div className="flex flex-col gap-4">
                {summaries.map((summary) => (
                  <div key={summary.category.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-sm">
                        <CategoryIcon
                          name={summary.category.icon}
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                        <span className="truncate">{summary.category.name}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        <Money value={summary.spent} /> / <Money value={summary.limit} />
                      </span>
                    </div>
                    <Progress
                      value={Math.min(summary.ratio, 100)}
                      className="h-1.5"
                      indicatorClassName={statusIndicator[summary.status]}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Shapes className="size-6" />}
                title="Nenhum limite definido"
                description="Crie limites mensais por categoria para ver o progresso aqui."
                action={
                  <Button variant="outline" asChild>
                    <Link to="/orcamentos">Abrir orçamentos</Link>
                  </Button>
                }
              />
            )}

            <Link
              to="/orcamentos"
              className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
            >
              Gerenciar orçamentos
              <ArrowUpRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="gap-0">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
                  Atividade recente
                </CardTitle>
                <CardDescription>
                  {recent.length} {recent.length === 1 ? 'transação' : 'transações'} registradas
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/transacoes">
                  <Receipt />
                  Ver todas
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            {recent.length > 0 ? (
              <ul className="divide-y divide-border">
                {recent.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    onEdit={openEdit}
                  />
                ))}
              </ul>
            ) : (
              <div className="px-4 pt-5">
                <EmptyState
                  icon={<Receipt className="size-6" />}
                  title="Ainda não há transações"
                  description="Registre a primeira entrada ou saída para começar a acompanhar o orçamento."
                  action={
                    <Button onClick={openNew}>
                      <Plus />
                      Nova transação
                    </Button>
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
      />
    </div>
  )
}
