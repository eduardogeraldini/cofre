import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from '@/components/charts/chart-primitives'
import { monthKey } from '@/lib/format'
import type { ChartHighlight } from '@/components/charts/balance-chart'
import type { MonthPoint } from '@/types'

const axisMoney = (value: number) => {
  if (value === 0) return '0'
  const compact = (value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `R$ ${compact}k`
}

interface CashFlowChartProps {
  data: MonthPoint[]
  height?: number
  highlight?: ChartHighlight | null
}

export function CashFlowChart({ data, height = 260, highlight = null }: CashFlowChartProps) {
  const startKey = highlight ? monthKey(highlight.from) : null
  const endKey = highlight ? monthKey(highlight.to) : null
  const inRange = (month: string) =>
    (!startKey || month >= startKey) && (!endKey || month <= endKey)

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickFormatter={axisMoney}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)' }}
            content={<ChartTooltip />}
            labelStyle={{ display: 'none' }}
          />
          <Bar
            dataKey="income"
            name="Receitas"
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
            barSize={14}
          >
            {data.map((point) => (
              <Cell
                key={point.month}
                fill="var(--chart-1)"
                fillOpacity={inRange(point.month) ? 1 : 0.3}
              />
            ))}
          </Bar>
          <Bar
            dataKey="expense"
            name="Despesas"
            fill="var(--chart-2)"
            radius={[4, 4, 0, 0]}
            barSize={14}
          >
            {data.map((point) => (
              <Cell
                key={point.month}
                fill="var(--chart-2)"
                fillOpacity={inRange(point.month) ? 1 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
