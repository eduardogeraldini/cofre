import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from '@/components/charts/chart-primitives'
import { monthKey } from '@/lib/format'

export interface BalancePoint {
  month: string
  label: string
  balance: number
}

export interface ChartHighlight {
  from: string
  to: string
}

const axisMoney = (value: number) => {
  if (value === 0) return '0'
  const compact = (value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `R$ ${compact}k`
}

interface BalanceChartProps {
  data: BalancePoint[]
  height?: number
  highlight?: ChartHighlight | null
}

export function BalanceChart({ data, height = 280, highlight = null }: BalanceChartProps) {
  const startKey = highlight ? monthKey(highlight.from) : null
  const endKey = highlight ? monthKey(highlight.to) : null
  const inRange = (month: string) =>
    (!startKey || month >= startKey) && (!endKey || month <= endKey)
  const band = startKey && endKey ? data.filter((point) => inRange(point.month)) : []
  const bandFrom = band[0]?.label
  const bandTo = band[band.length - 1]?.label

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          {bandFrom && bandTo ? (
            <ReferenceArea
              x1={bandFrom}
              x2={bandTo}
              fill="var(--chart-3)"
              fillOpacity={0.1}
              stroke="none"
            />
          ) : null}
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
