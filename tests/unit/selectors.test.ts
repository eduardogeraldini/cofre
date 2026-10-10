import { describe, expect, it } from 'vitest'
import type { AppState, Transaction } from '@/types'
import {
  balanceBefore,
  budgetUsage,
  categorySummaries,
  changeAgainstPrevious,
  expensesByWallet,
  expenseBreakdown,
  savingsRate,
  searchTransactions,
  sumByType,
  totalBalance,
  transactionsInMonth,
  walletBalance,
} from '@/lib/selectors'

function tx(
  id: string,
  date: string,
  type: Transaction['type'],
  amount: number,
  extra: Partial<Transaction> = {},
): Transaction {
  return { id, date, type, amount, categoryId: 'cat-food', note: '', ...extra }
}

const txs: Transaction[] = [
  tx('a', '2026-10-05', 'expense', 100, { walletId: 'w1' }),
  tx('b', '2026-10-10', 'income', 500, { walletId: 'w1', categoryId: 'cat-salary' }),
  tx('c', '2026-09-30', 'expense', 80, { walletId: 'w2' }),
  tx('d', '2026-10-20', 'expense', 40, { walletId: null, categoryId: 'cat-fun' }),
]

function makeState(): AppState {
  return {
    version: 1,
    categories: [
      { id: 'cat-food', name: 'Alimentação', type: 'expense', icon: 'shopping-cart' },
      { id: 'cat-fun', name: 'Lazer', type: 'expense', icon: 'ticket' },
      { id: 'cat-salary', name: 'Salário', type: 'income', icon: 'briefcase' },
    ],
    wallets: [
      { id: 'w1', name: 'Caixa', color: 'indigo', initialBalance: 1000 },
      { id: 'w2', name: 'Banco', color: 'emerald', initialBalance: 0 },
    ],
    projects: [],
    transfers: [
      { id: 't1', fromWalletId: 'w1', toWalletId: 'w2', amount: 70, date: '2026-10-01', note: '' },
    ],
    transactions: txs,
    budgets: { 'cat-food': 100 },
    settings: { privacyMode: false, compactValues: true },
  }
}

describe('transactionsInMonth', () => {
  it('filtra pelo ano-mês da data', () => {
    expect(transactionsInMonth(txs, '2026-10').map((item) => item.id)).toEqual(['a', 'b', 'd'])
    expect(transactionsInMonth(txs, '2026-11')).toHaveLength(0)
  })
})

describe('sumByType', () => {
  it('soma apenas o tipo informado', () => {
    expect(sumByType(txs, 'expense')).toBe(220)
    expect(sumByType(txs, 'income')).toBe(500)
  })
})

describe('totalBalance', () => {
  it('receitas menos despesas', () => {
    expect(totalBalance(txs)).toBe(280)
  })
})

describe('balanceBefore', () => {
  it('considera apenas meses anteriores ao informado', () => {
    expect(balanceBefore(txs, '2026-10')).toBe(-80)
  })
})

describe('walletBalance', () => {
  it('soma saldo inicial, transações e transferências', () => {
    const state = makeState()
    expect(walletBalance(state, 'w1')).toBe(1000 - 100 + 500 - 70)
    expect(walletBalance(state, 'w2')).toBe(0 - 80 + 70)
  })

  it('retorna 0 para carteira inexistente', () => {
    expect(walletBalance(makeState(), 'nope')).toBe(0)
  })
})

describe('savingsRate', () => {
  it('calcula a taxa de poupança', () => {
    expect(savingsRate(5000, 2000)).toBe(60)
  })

  it('retorna 0 quando não há receita', () => {
    expect(savingsRate(0, 1000)).toBe(0)
  })
})

describe('changeAgainstPrevious', () => {
  it('calcula a variação em relação ao mês anterior', () => {
    const state = makeState()
    const result = changeAgainstPrevious(state, '2026-10')
    expect(result.income).toBe(0)
    expect(result.expense).toBe(75)
  })

  it('retorna 0 quando o mês anterior não tem valores', () => {
    const state = makeState()
    state.transactions = state.transactions.filter((item) => item.date.startsWith('2026-10'))
    const result = changeAgainstPrevious(state, '2026-10')
    expect(result.expense).toBe(0)
  })
})

describe('searchTransactions', () => {
  it('busca pela descrição sem diferenciar maiúsculas', () => {
    const list = [tx('a', '2026-10-01', 'expense', 10, { note: 'Mercado Central' })]
    expect(searchTransactions(list, 'mercado').map((item) => item.id)).toEqual(['a'])
  })

  it('retorna vazio para consulta em branco', () => {
    expect(searchTransactions(txs, '   ')).toHaveLength(0)
  })

  it('respeita o limite', () => {
    const list = Array.from({ length: 10 }, (_, index) =>
      tx(`x${index}`, '2026-10-01', 'expense', 1, { note: 'padaria' }),
    )
    expect(searchTransactions(list, 'padaria', 3)).toHaveLength(3)
  })
})

describe('categorySummaries', () => {
  it('agrupa despesas por categoria com status do orçamento', () => {
    const state = makeState()
    const food = categorySummaries(state, '2026-10').find(
      (item) => item.category.id === 'cat-food',
    )
    expect(food?.spent).toBe(100)
    expect(food?.ratio).toBe(100)
    expect(food?.status).toBe('over')
  })

  it('ignora categorias de receita', () => {
    const state = makeState()
    state.categories.push({ id: 'cat-sal', name: 'Salário', type: 'income', icon: 'briefcase' })
    const ids = categorySummaries(state, '2026-10').map((item) => item.category.id)
    expect(ids).not.toContain('cat-sal')
  })
})

describe('budgetUsage', () => {
  it('soma limites apenas de quem tem orçamento', () => {
    const usage = budgetUsage(makeState(), '2026-10')
    expect(usage.limit).toBe(100)
    expect(usage.spent).toBe(100)
    expect(usage.remaining).toBe(0)
    expect(usage.ratio).toBe(100)
  })
})

describe('expenseBreakdown', () => {
  it('agrupa por categoria, ordena do maior para o menor e ignora desconhecidas', () => {
    const state = makeState()
    const breakdown = expenseBreakdown(state.transactions, '2026-10', state.categories)
    expect(breakdown.map((item) => item.categoryId)).toEqual(['cat-food', 'cat-fun'])
    expect(breakdown[0].value).toBe(100)
  })
})

describe('expensesByWallet', () => {
  it('agrupa despesas do mês por carteira com saldo solto separado', () => {
    const rows = expensesByWallet(makeState(), '2026-10')
    expect(rows).toEqual([
      { wallet: expect.objectContaining({ id: 'w1' }), total: 100 },
      { wallet: null, total: 40 },
    ])
  })
})
