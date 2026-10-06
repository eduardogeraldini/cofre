import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from '@/components/charts/chart-primitives'

export interface BalancePoint {
  month: string
  label: string
  balance: number
}

const axisMoney = (value: number) => {
  if (value === 0) return '0'
  const compact = (value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `R$ ${compact}k`
}

interface BalanceChartProps {
  data: BalancePoint[]
  height?: number
}

export function BalanceChart({ data, height = 280 }: BalanceChartProps) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
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
            cursor={{ stroke: 'var(--border)' }}
            content={<ChartTooltip />}
          />
          <Area
            type="monotone"
            dataKey="balance"
            name="Saldo acumulado"
            stroke="var(--chart-3)"
            strokeWidth={2}
            fill="var(--chart-3)"
            fillOpacity={0.12}
            activeDot={{ r: 4, fill: 'var(--chart-3)', stroke: 'var(--card)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
