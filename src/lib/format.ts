import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
})

const compact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatCurrency(value: number, hideValue = false): string {
  if (hideValue) return 'R$ ••••'
  return currency.format(value)
}

export function formatCompact(value: number): string {
  return compact.format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(0)}%`
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "d 'de' MMM", { locale: ptBR })
}

export function formatFullDate(iso: string): string {
  return format(parseISO(iso), "d 'MMM yyyy", { locale: ptBR })
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function monthKeyOf(date: Date): string {
  return format(date, 'yyyy-MM')
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  const label = format(date, 'MMM', { locale: ptBR })
  return `${label}/${year.slice(2)}`
}

export function monthLabelLong(key: string): string {
  const [year, month] = key.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  const label = format(date, 'MMMM', { locale: ptBR })
  return `${label} de ${year}`
}

export function previousMonthKey(key: string): string {
  const [year, month] = key.split('-')
  const date = new Date(Number(year), Number(month) - 2, 1)
  return format(date, 'yyyy-MM')
}

export function lastMonthKeys(count: number, from = new Date()): string[] {
  const keys: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(from.getFullYear(), from.getMonth() - i, 1)
    keys.push(monthKeyOf(date))
  }
  return keys
}

export function relativeDay(iso: string): string {
  const today = toISODate(new Date())
  const yesterday = toISODate(new Date(Date.now() - 86_400_000))
  if (iso === today) return 'Hoje'
  if (iso === yesterday) return 'Ontem'
  return formatDate(iso)
}
