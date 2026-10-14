import { describe, expect, it } from 'vitest'
import type { AppState, Transaction } from '@/types'
import {
  balanceBefore,
  budgetUsage,
  categorySummaries,
  changeAgainstPrevious,
  daysUntil,
  expensesByWallet,
  expenseBreakdown,
  invoiceCutoff,
  invoicePaymentRows,
  invoicePayments,
  invoicePurchases,
  lastClosingDate,
  nextDueDate,
  openInvoice,
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
      { id: 'w1', name: 'Caixa', color: 'indigo', kind: 'account', closingDay: null, dueDay: null, initialBalance: 1000 },
      { id: 'w2', name: 'Banco', color: 'emerald', kind: 'account', closingDay: null, dueDay: null, initialBalance: 0 },
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

describe('openInvoice', () => {
  const makeCardState = (): AppState => ({
    version: 1,
    categories: [{ id: 'c1', name: 'Lazer', type: 'expense', icon: 'ticket' }],
    wallets: [
      { id: 'acc', name: 'Conta', color: 'indigo', kind: 'account', closingDay: null, dueDay: null, initialBalance: 0 },
      { id: 'card', name: 'Cartão', color: 'rose', kind: 'card', closingDay: null, dueDay: null, initialBalance: 0 },
      { id: 'paid', name: 'Cartão quitado', color: 'rose', kind: 'card', closingDay: null, dueDay: null, initialBalance: 0 },
    ],
    projects: [],
    transfers: [],
    transactions: [
      {
        id: 't1',
        date: '2026-10-05',
        type: 'expense',
        amount: 120.5,
        categoryId: 'c1',
        note: '',
        walletId: 'card',
      },
      {
        id: 't2',
        date: '2026-10-06',
        type: 'expense',
        amount: 30,
        categoryId: 'c1',
        note: '',
        walletId: 'acc',
      },
    ],
    budgets: {},
    settings: { privacyMode: false, compactValues: true },
  })

  it('cartão com saldo negativo vira fatura positiva', () => {
    expect(openInvoice(makeCardState(), 'card')).toBe(120.5)
  })

  it('conta com saldo negativo não tem fatura', () => {
    const state = makeCardState()
    state.wallets[0].initialBalance = 0
    state.transactions.push({
      id: 't3',
      date: '2026-10-07',
      type: 'expense',
      amount: 50,
      categoryId: 'c1',
      note: '',
      walletId: 'acc',
    })
    expect(walletBalance(state, 'acc')).toBe(-80)
    expect(openInvoice(state, 'acc')).toBe(0)
  })

  it('cartão sem saldo negativo está quitado', () => {
    expect(openInvoice(makeCardState(), 'paid')).toBe(0)
  })

  it('pagamento por transferência zera a fatura', () => {
    const state = makeCardState()
    state.transfers.push({
      id: 'tf',
      fromWalletId: 'acc',
      toWalletId: 'card',
      amount: 120.5,
      date: '2026-11-10',
      note: '',
    })
    expect(openInvoice(state, 'card')).toBe(0)
    expect(walletBalance(state, 'card')).toBe(0)
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

describe('lastClosingDate / nextDueDate / daysUntil', () => {
  const from = new Date(2026, 9, 13) // 13 de outubro de 2026

  it('último fechamento: dia já passou usa o mês atual', () => {
    expect(lastClosingDate(5, from)).toBe('2026-10-05')
  })

  it('último fechamento: dia ainda não passou usa o mês anterior', () => {
    expect(lastClosingDate(20, from)).toBe('2026-09-20')
  })

  it('próximo vencimento: dia ainda não passou é este mês', () => {
    expect(nextDueDate(20, from)).toBe('2026-10-20')
  })

  it('próximo vencimento: dia já passou é o próximo mês', () => {
    expect(nextDueDate(5, from)).toBe('2026-11-05')
  })

  it('daysUntil conta dias corridos', () => {
    expect(daysUntil('2026-10-20', from)).toBe(7)
    expect(daysUntil('2026-10-13', from)).toBe(0)
    expect(daysUntil('2026-10-12', from)).toBe(-1)
  })
})

describe('invoiceCutoff / invoicePurchases / invoicePayments', () => {
  const makeInvoiceState = (): AppState => ({
    version: 1,
    categories: [{ id: 'c1', name: 'Compras', type: 'expense', icon: 'package' }],
    wallets: [
      { id: 'acc', name: 'Conta', color: 'indigo', kind: 'account', closingDay: null, dueDay: null, initialBalance: 0 },
      { id: 'card', name: 'Cartão', color: 'rose', kind: 'card', closingDay: 5, dueDay: 10, initialBalance: 0 },
      { id: 'open', name: 'Sem fechamento', color: 'rose', kind: 'card', closingDay: null, dueDay: null, initialBalance: 0 },
    ],
    projects: [],
    transfers: [
      { id: 'tf1', fromWalletId: 'acc', toWalletId: 'open', amount: 50, date: '2026-10-01', note: '' },
      { id: 'tf2', fromWalletId: 'acc', toWalletId: 'card', amount: 200, date: '2026-10-08', note: '' },
    ],
    transactions: [
      { id: 'old', date: '2026-09-20', type: 'expense', amount: 200, categoryId: 'c1', note: '', walletId: 'card' },
      { id: 'new', date: '2026-10-08', type: 'expense', amount: 80, categoryId: 'c1', note: '', walletId: 'card' },
      { id: 'open1', date: '2026-10-05', type: 'expense', amount: 30, categoryId: 'c1', note: '', walletId: 'open' },
    ],
    budgets: {},
    settings: { privacyMode: false, compactValues: true },
  })

  it('com fechamento definido, corte é o último fechamento', () => {
    const state = makeInvoiceState()
    expect(invoiceCutoff(state, 'card')).toBe(lastClosingDate(5))
  })

  it('sem fechamento, corte é o último pagamento recebido', () => {
    const state = makeInvoiceState()
    expect(invoiceCutoff(state, 'open')).toBe('2026-10-01')
  })

  it('extrato lista apenas despesas após o corte, da mais recente', () => {
    const state = makeInvoiceState()
    expect(invoicePurchases(state, 'card').map((item) => item.id)).toEqual(['new'])
  })

  it('pagamentos após o corte por fechamento contam no total', () => {
    const state = makeInvoiceState()
    expect(invoicePayments(state, 'card')).toBe(200)
  })

  it('sem fechamento, o último pagamento é só o corte (não conta)', () => {
    const state = makeInvoiceState()
    expect(invoicePayments(state, 'open')).toBe(0)
  })

  it('extrato de pagamentos lista por fechamento quando definido', () => {
    const state = makeInvoiceState()
    expect(invoicePaymentRows(state, 'card').map((item) => item.id)).toEqual(['tf2'])
  })

  it('extrato de pagamentos sem fechamento lista todos', () => {
    const state = makeInvoiceState()
    expect(invoicePaymentRows(state, 'open').map((item) => item.id)).toEqual(['tf1'])
  })

  it('extrato de pagamentos ignora conta não-cartão', () => {
    const state = makeInvoiceState()
    expect(invoicePaymentRows(state, 'acc')).toEqual([])
  })
})
