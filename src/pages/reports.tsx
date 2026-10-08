import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, PieChart, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BalanceChart } from '@/components/charts/balance-chart'
import { CategoryDonut, type DonutEntry } from '@/components/charts/category-donut'
import { rampColor } from '@/components/charts/chart-primitives'
import { CashFlowChart } from '@/components/charts/cash-flow-chart'
import { EmptyState } from '@/components/empty-state'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { SegmentedControl } from '@/components/segmented-control'
import { StatCard } from '@/components/stat-card'
import { TransactionRow } from '@/components/transaction-row'
import { WalletExpenses } from '@/components/wallet-expenses'
import { lastMonthKeys, monthKeyOf, monthLabel, monthLabelLong } from '@/lib/format'
import {
  balanceSeries,
  changeAgainstPrevious,
  expenseBreakdown,
  monthSeries,
  savingsRate,
  sumByType,
  transactionsInMonth,
} from '@/lib/selectors'
import { useBudget } from '@/store/budget-store'
import type { TxType } from '@/types'

const MONTH_COUNT = 12
const CURRENT_MONTH = monthKeyOf(new Date())

export function ReportsPage() {
  const { state } = useBudget()
  const [params, setParams] = useSearchParams()
  const months = useMemo(() => lastMonthKeys(MONTH_COUNT).reverse(), [])
  const [kind, setKind] = useState<TxType>('expense')

  const monthParam = params.get('mes')
  const month =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam) && months.includes(monthParam)
      ? monthParam
      : CURRENT_MONTH

  const changeMonth = (key: string) => {
    const next = new URLSearchParams(params)
    next.set('mes', key)
    setParams(next)
  }

  const txs = transactionsInMonth(state.transactions, month)
  const income = sumByType(txs, 'income')
  const expense = sumByType(txs, 'expense')
  const net = income - expense
  const rate = savingsRate(income, expense)
  const delta = changeAgainstPrevious(state, month)

  const series = useMemo(() => monthSeries(state, 6), [state])
  const balance = useMemo(() => balanceSeries(state, MONTH_COUNT), [state])

  const entries = (() => {
    const breakdown = expenseBreakdown(state.transactions, month, state.categories, kind)
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

  const topExpenses = useMemo(
    () =>
      txs
        .filter((tx) => tx.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    [txs],
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline="Análise"
        title="Relatórios"
        description="Acompanhe a evolução do saldo e para onde o dinheiro vai a cada mês."
        actions={
          <Select value={month} onValueChange={changeMonth}>
            <SelectTrigger className="w-full sm:w-52" aria-label="Selecionar mês">
              <SelectValue placeholder="Mês de referência" />
            </SelectTrigger>
            <SelectContent>
              {months.map((key) => (
                <SelectItem key={key} value={key}>
                  {monthLabelLong(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Receitas"
          value={income}
          icon={ArrowUpRight}
          compact
          delta={delta.income}
          deltaGood
          hint={`em ${monthLabel(month)}`}
        />
        <StatCard
          label="Despesas"
          value={expense}
          icon={ArrowDownRight}
          compact
          delta={delta.expense}
          deltaGood={delta.expense <= 0}
          hint={`em ${monthLabel(month)}`}
        />
        <StatCard
          label="Resultado do mês"
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
          hint="da receita do mês"
        />
      </section>

      <section>
        <Card className="gap-0">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
              Evolução do saldo
            </CardTitle>
            <CardDescription>Saldo acumulado nos últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <BalanceChart data={balance} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="gap-0">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
                  {kind === 'expense' ? 'Despesas' : 'Receitas'} por categoria
                </CardTitle>
                <CardDescription>{monthLabelLong(month)}</CardDescription>
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
                title={kind === 'expense' ? 'Sem despesas no mês' : 'Sem receitas no mês'}
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
            <CardDescription>{monthLabelLong(month)}</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <WalletExpenses month={month} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-5">
        <Card className="gap-0 lg:col-span-3">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
              Fluxo de caixa
            </CardTitle>
            <CardDescription>Comparativo mensal de entradas e saídas</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <CashFlowChart data={series} height={240} />
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

        <Card className="gap-0 lg:col-span-2">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
              Maiores gastos
            </CardTitle>
            <CardDescription>Top 5 despesas de {monthLabelLong(month)}</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {topExpenses.length > 0 ? (
              <ul className="divide-y divide-border">
                {topExpenses.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    percent={expense > 0 ? (transaction.amount / expense) * 100 : 0}
                  />
                ))}
              </ul>
            ) : (
              <div className="px-4 pt-5">
                <EmptyState
                  icon={<ArrowDownRight className="size-6" />}
                  title="Nada por aqui"
                  description="Ainda não há despesas registradas neste mês."
                />
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
