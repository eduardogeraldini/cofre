import { describe, expect, it } from 'vitest'
import { parseAmount, toAmountInput } from '@/lib/money'

describe('parseAmount', () => {
  it('interpreta formato pt-BR com milhar e decimal', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56)
    expect(parseAmount('R$ 1.234,56')).toBe(1234.56)
  })

  it('interpreta decimal simples', () => {
    expect(parseAmount('12,5')).toBe(12.5)
    expect(parseAmount('12.5')).toBe(12.5)
  })

  it('aceita negativos', () => {
    expect(parseAmount('-10,50')).toBe(-10.5)
  })

  it('retorna 0 para entradas vazias ou inválidas', () => {
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('abc')).toBe(0)
    expect(parseAmount('R$ ')).toBe(0)
  })

  it('ignora símbolos de moeda no meio', () => {
    expect(parseAmount('45,90')).toBe(45.9)
    expect(parseAmount('0')).toBe(0)
  })
})

describe('toAmountInput', () => {
  it('formata com duas casas e vírgula decimal', () => {
    expect(toAmountInput(1234.5)).toBe('1234,50')
    expect(toAmountInput(0)).toBe('0,00')
    expect(toAmountInput(45.99)).toBe('45,99')
  })

  it('reverte com parseAmount', () => {
    expect(parseAmount(toAmountInput(99.9))).toBe(99.9)
    expect(parseAmount(toAmountInput(1000))).toBe(1000)
  })
})
