import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from '@/components/charts/chart-primitives'
import type { MonthPoint } from '@/types'

const axisMoney = (value: number) => {
  if (value === 0) return '0'
  const compact = (value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `R$ ${compact}k`
}

interface CashFlowChartProps {
  data: MonthPoint[]
  height?: number
}

export function CashFlowChart({ data, height = 260 }: CashFlowChartProps) {
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
          />
          <Bar
            dataKey="expense"
            name="Despesas"
            fill="var(--chart-2)"
            radius={[4, 4, 0, 0]}
            barSize={14}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
