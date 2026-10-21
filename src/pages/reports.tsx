import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { ArrowDownRight, ArrowUpRight, PieChart, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { BalanceChart } from '@/components/charts/balance-chart'
import { CategoryDonut, type DonutEntry } from '@/components/charts/category-donut'
import { rampColor } from '@/components/charts/chart-colors'
import { CashFlowChart } from '@/components/charts/cash-flow-chart'
import { EmptyState } from '@/components/empty-state'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { SegmentedControl } from '@/components/segmented-control'
import { StatCard } from '@/components/stat-card'
import { TransactionRow } from '@/components/transaction-row'
import { WalletExpenses } from '@/components/wallet-expenses'
import { formatDate, monthKey, monthLabelLong, toISODate } from '@/lib/format'
import {
  balanceSeries,
  changeAgainstRange,
  expenseBreakdownFrom,
  monthSeries,
  savingsRate,
  sumByType,
  transactionsInRange,
} from '@/lib/selectors'
import { useBudget } from '@/store/budget-context'
import type { TxType } from '@/types'

const MONTH_COUNT = 12

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function defaultRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: toISODate(from), to: toISODate(to) }
}

function rangeLabel(from: string, to: string) {
  if (monthKey(from) === monthKey(to)) return monthLabelLong(from)
  return `${formatDate(from)} a ${formatDate(to)}`
}

export function ReportsPage() {
  const { state } = useBudget()
  const [params, setParams] = useSearchParams()
  const series = useMemo(() => monthSeries(state, 6), [state])
  const balance = useMemo(() => balanceSeries(state, MONTH_COUNT), [state])
  const [kind, setKind] = useState<TxType>('expense')

  const fallback = useMemo(() => defaultRange(), [])
  const fromParam = params.get('de')
  const toParam = params.get('ate')
  const from = fromParam && ISO_DATE.test(fromParam) ? fromParam : fallback.from
  const to = toParam && ISO_DATE.test(toParam) ? toParam : fallback.to
  const effFrom = from <= to ? from : to
  const effTo = from <= to ? to : from

  const updateRange = (nextFrom: string, nextTo: string) => {
    const next = new URLSearchParams(params)
    next.set('de', nextFrom)
    next.set('ate', nextTo)
    setParams(next)
  }

  const label = rangeLabel(effFrom, effTo)
  const highlight = { from: effFrom, to: effTo }

  const txs = transactionsInRange(state.transactions, effFrom, effTo)
  const income = sumByType(txs, 'income')
  const expense = sumByType(txs, 'expense')
  const net = income - expense
  const rate = savingsRate(income, expense)
  const delta = changeAgainstRange(state, effFrom, effTo)

  const entries = (() => {
    const breakdown = expenseBreakdownFrom(txs, state.categories, kind)
    const visible = breakdown.slice(0, 6)
    const rest = breakdown.slice(6)
    const list: DonutEntry[] = visible.map((item) => ({
      id: item.categoryId,
      name: item.category?.name ?? 'Sem categoria',
      value: item.value,
    }))
    if (rest.length > 0) {
      list.push({
        id: 'others',
        name: kind === 'expense' ? 'Outras categorias' : 'Outras receitas',
        value: rest.reduce((total, item) => total + item.value, 0),
      })
    }
    return list
  })()

  const breakdownTotal = entries.reduce((total, entry) => total + entry.value, 0)

  const topExpenses = txs
    .filter((tx) => tx.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline="Análise"
        title="Relatórios"
        description="Acompanhe a evolução do saldo e para onde o dinheiro vai no período escolhido."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-from">De</Label>
              <DatePicker
                id="report-from"
                value={parseISO(effFrom)}
                onChange={(next) => {
                  if (next) updateRange(toISODate(next), effTo)
                }}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-to">Até</Label>
              <DatePicker
                id="report-to"
                value={parseISO(effTo)}
                onChange={(next) => {
                  if (next) updateRange(effFrom, toISODate(next))
                }}
                className="w-40"
              />
            </div>
          </div>
        }
      />

      <section className="flex flex-col gap-4">
        <p className="text-overline">Resumo do período</p>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Receitas"
            value={income}
            icon={ArrowUpRight}
            compact
            delta={delta.income}
            deltaGood
            hint={label}
          />
          <StatCard
            label="Despesas"
            value={expense}
            icon={ArrowDownRight}
            compact
            delta={delta.expense}
            deltaGood={delta.expense <= 0}
            hint={label}
          />
          <StatCard
            label="Resultado do período"
            value={net}
            icon={TrendingUp}
            compact
            hint="receitas menos despesas"
          />
          <StatCard
            label="Taxa de economia"
            value={rate}
            icon={Wallet}
            display={
              <span className="font-display text-2xl leading-none font-bold tracking-[-0.03em] tabular-nums">
                {rate.toFixed(0)}%
              </span>
            }
            hint="da receita do período"
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <p className="text-overline">Evolução</p>

        <Card className="gap-0">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
              Evolução do saldo
            </CardTitle>
            <CardDescription>
              Saldo acumulado nos últimos 12 meses · período selecionado em destaque
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <BalanceChart data={balance} highlight={highlight} />
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
              Fluxo de caixa
            </CardTitle>
            <CardDescription>
              Comparativo mensal de entradas e saídas · período selecionado em destaque
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <CashFlowChart data={series} height={240} highlight={highlight} />
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--chart-1)' }} />
                Receitas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: 'var(--chart-2)' }} />
                Despesas
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <p className="text-overline">Composição</p>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="gap-0">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
                    {kind === 'expense' ? 'Despesas' : 'Receitas'} por categoria
                  </CardTitle>
                  <CardDescription>{label}</CardDescription>
                </div>
                <div className="w-56 shrink-0">
                  <SegmentedControl<TxType>
                    label="Mostrar despesas ou receitas"
                    value={kind}
                    onChange={setKind}
                    options={[
                      { value: 'expense', label: 'Despesas', icon: ArrowDownRight },
                      { value: 'income', label: 'Receitas', icon: ArrowUpRight },
                    ]}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              {entries.length > 0 ? (
                <>
                  <CategoryDonut
                    entries={entries}
                    centerLabel={kind === 'expense' ? 'Total gasto' : 'Total recebido'}
                    centerValue={<Money value={breakdownTotal} />}
                  />
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {entries.map((entry, index) => (
                      <li key={entry.id} className="flex items-center gap-2.5 text-sm">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: rampColor(index, entries.length) }}
                        />
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">
                          {entry.name}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          <Money value={entry.value} />
                        </span>
                        <span className="w-10 shrink-0 text-right text-xs text-neutral tabular-nums">
                          {((entry.value / breakdownTotal) * 100).toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <EmptyState
                  icon={<PieChart className="size-6" />}
                  title={kind === 'expense' ? 'Sem despesas no período' : 'Sem receitas no período'}
                  description="Nenhuma movimentação registrada neste período."
                />
              )}
            </CardContent>
          </Card>

          <Card className="gap-0">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
                Despesas por carteira
              </CardTitle>
              <CardDescription>{label}</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <WalletExpenses from={effFrom} to={effTo} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <p className="text-overline">Maiores gastos</p>
        <Card className="gap-0">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
              Top 5 do período
            </CardTitle>
            <CardDescription>Despesas mais altas · {label}</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {topExpenses.length > 0 ? (
              <ul className="divide-y divide-border">
                {topExpenses.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    percent={expense > 0 ? (transaction.amount / expense) * 100 : 0}
                    hideCategory
                  />
                ))}
              </ul>
            ) : (
              <div className="px-4 pt-5">
                <EmptyState
                  icon={<ArrowDownRight className="size-6" />}
                  title="Nada por aqui"
                  description="Ainda não há despesas registradas neste período."
                />
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
