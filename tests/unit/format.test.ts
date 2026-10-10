import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatPercent,
  lastMonthKeys,
  monthKey,
  monthKeyOf,
  monthLabel,
  monthLabelLong,
  previousMonthKey,
  toISODate,
} from '@/lib/format'

describe('monthKey', () => {
  it('extrai ano-mês de uma data ISO', () => {
    expect(monthKey('2026-10-05')).toBe('2026-10')
    expect(monthKey('2026-01-31')).toBe('2026-01')
  })
})

describe('monthKeyOf', () => {
  it('gera ano-mês a partir de Date', () => {
    expect(monthKeyOf(new Date(2026, 9, 15))).toBe('2026-10')
    expect(monthKeyOf(new Date(2026, 0, 1))).toBe('2026-01')
  })
})

describe('toISODate', () => {
  it('formata Date como yyyy-MM-dd', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toISODate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('monthLabel', () => {
  it('gera rótulo curto em pt-BR', () => {
    expect(monthLabel('2026-10')).toBe('out/26')
    expect(monthLabel('2026-01')).toBe('jan/26')
  })
})

describe('monthLabelLong', () => {
  it('gera nome completo do mês', () => {
    expect(monthLabelLong('2026-10')).toBe('outubro de 2026')
    expect(monthLabelLong('2026-03')).toBe('março de 2026')
  })
})

describe('previousMonthKey', () => {
  it('retorna o mês anterior', () => {
    expect(previousMonthKey('2026-10')).toBe('2026-09')
  })

  it('vira o ano quando é janeiro', () => {
    expect(previousMonthKey('2026-01')).toBe('2025-12')
  })
})

describe('lastMonthKeys', () => {
  it('gera os N meses até a data informada, em ordem crescente', () => {
    expect(lastMonthKeys(3, new Date(2026, 9, 15))).toEqual(['2026-08', '2026-09', '2026-10'])
  })

  it('atravessa virada de ano', () => {
    expect(lastMonthKeys(3, new Date(2026, 0, 10))).toEqual(['2025-11', '2025-12', '2026-01'])
  })
})

describe('formatCurrency', () => {
  it('formata em reais', () => {
    expect(formatCurrency(1234.5)).toContain('1.234,50')
    expect(formatCurrency(0)).toContain('0,00')
  })

  it('oculta o valor no modo privado', () => {
    expect(formatCurrency(100, true)).toBe('R$ ••••')
  })
})

describe('formatPercent', () => {
  it('arredonda para inteiro com símbolo de porcentagem', () => {
    expect(formatPercent(85.4)).toBe('85%')
    expect(formatPercent(0)).toBe('0%')
  })
})
