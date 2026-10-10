import { describe, expect, it } from 'vitest'
import type { AppState, Transaction } from '@/types'
import { reducer } from '@/store/budget-reducer'
import { createOnboardingState } from '@/lib/seed'

function makeState(): AppState {
  return {
    version: 1,
    categories: [
      { id: 'cat-food', name: 'Alimentação', type: 'expense', icon: 'shopping-cart' },
      { id: 'cat-salary', name: 'Salário', type: 'income', icon: 'briefcase' },
    ],
    wallets: [
      { id: 'w1', name: 'Caixa', color: 'indigo', initialBalance: 100 },
      { id: 'w2', name: 'Banco', color: 'emerald', initialBalance: 500 },
    ],
    projects: [{ id: 'p1', name: 'Casamento' }],
    transfers: [
      {
        id: 't1',
        fromWalletId: 'w1',
        toWalletId: 'w2',
        amount: 50,
        date: '2026-10-01',
        note: '',
      },
    ],
    transactions: [
      {
        id: 'tx1',
        type: 'expense',
        amount: 30,
        categoryId: 'cat-food',
        walletId: 'w1',
        projectId: 'p1',
        date: '2026-10-02',
        note: 'Mercado',
      },
      {
        id: 'tx2',
        type: 'income',
        amount: 20,
        categoryId: 'cat-salary',
        walletId: 'w2',
        date: '2026-10-15',
        note: 'Freela',
      },
    ],
    budgets: { 'cat-food': 200 },
    settings: { privacyMode: false, compactValues: true },
  }
}

function tx(id: string, date: string, extra: Partial<Transaction> = {}): Transaction {
  return {
    id,
    type: 'expense',
    amount: 10,
    categoryId: 'cat-food',
    walletId: 'w1',
    date,
    note: '',
    ...extra,
  }
}

describe('reducer: transações', () => {
  it('transaction/add insere no topo ordenado por data desc', () => {
    const state = reducer(makeState(), {
      type: 'transaction/add',
      transaction: tx('tx3', '2026-09-30'),
    })
    expect(state.transactions.map((item) => item.id)).toEqual(['tx2', 'tx1', 'tx3'])
  })

  it('transaction/substitui os dados mantendo a posição de ordenação', () => {
    const state = reducer(makeState(), {
      type: 'transaction/update',
      transaction: { ...tx('tx1', '2026-10-02'), note: 'Mercado atualizado' },
    })
    expect(state.transactions.find((item) => item.id === 'tx1')?.note).toBe(
      'Mercado atualizado',
    )
    expect(state.transactions).toHaveLength(2)
  })

  it('transaction/delete remove a transação', () => {
    const state = reducer(makeState(), { type: 'transaction/delete', id: 'tx1' })
    expect(state.transactions.map((item) => item.id)).toEqual(['tx2'])
  })
})

describe('reducer: carteiras', () => {
  it('wallet/delete remove a carteira, as transferências ligadas e desvincula transações', () => {
    const state = reducer(makeState(), { type: 'wallet/delete', id: 'w1' })
    expect(state.wallets.map((item) => item.id)).toEqual(['w2'])
    expect(state.transfers).toHaveLength(0)
    expect(state.transactions.find((item) => item.id === 'tx1')?.walletId).toBeNull()
    expect(state.transactions.find((item) => item.id === 'tx2')?.walletId).toBe('w2')
  })

  it('wallet/update aplica os novos dados', () => {
    const state = reducer(makeState(), {
      type: 'wallet/update',
      wallet: { id: 'w1', name: 'Caixa novo', color: 'rose', initialBalance: 999 },
    })
    expect(state.wallets.find((item) => item.id === 'w1')?.name).toBe('Caixa novo')
  })
})

describe('reducer: projetos', () => {
  it('project/add adiciona ao final', () => {
    const state = reducer(makeState(), {
      type: 'project/add',
      project: { id: 'p2', name: 'Viagem' },
    })
    expect(state.projects.map((item) => item.id)).toEqual(['p1', 'p2'])
  })

  it('project/delete remove o projeto e desvincula transações', () => {
    const state = reducer(makeState(), { type: 'project/delete', id: 'p1' })
    expect(state.projects).toHaveLength(0)
    expect(state.transactions.find((item) => item.id === 'tx1')?.projectId).toBeNull()
  })
})

describe('reducer: categorias e orçamentos', () => {
  it('category/delete remove categoria, orçamento e transações vinculadas', () => {
    const state = reducer(makeState(), { type: 'category/delete', id: 'cat-food' })
    expect(state.categories.map((item) => item.id)).toEqual(['cat-salary'])
    expect(state.budgets['cat-food']).toBeUndefined()
    expect(state.transactions.map((item) => item.id)).toEqual(['tx2'])
  })

  it('budget/set com limite positivo define o orçamento', () => {
    const state = reducer(makeState(), {
      type: 'budget/set',
      categoryId: 'cat-salary',
      limit: 500,
    })
    expect(state.budgets['cat-salary']).toBe(500)
  })

  it('budget/set com limite zero remove o orçamento', () => {
    const state = reducer(makeState(), { type: 'budget/set', categoryId: 'cat-food', limit: 0 })
    expect(state.budgets['cat-food']).toBeUndefined()
  })
})

describe('reducer: transferências e configurações', () => {
  it('transfer/add insere no topo', () => {
    const state = reducer(makeState(), {
      type: 'transfer/add',
      transfer: {
        id: 't2',
        fromWalletId: 'w2',
        toWalletId: 'w1',
        amount: 10,
        date: '2026-10-20',
        note: '',
      },
    })
    expect(state.transfers.map((item) => item.id)).toEqual(['t2', 't1'])
  })

  it('transfer/delete remove a transferência', () => {
    const state = reducer(makeState(), { type: 'transfer/delete', id: 't1' })
    expect(state.transfers).toHaveLength(0)
  })

  it('settings/update faz merge parcial', () => {
    const state = reducer(makeState(), {
      type: 'settings/update',
      settings: { privacyMode: true },
    })
    expect(state.settings).toEqual({ privacyMode: true, compactValues: true })
  })
})

describe('reducer: importação e reset', () => {
  it('state/import substitui o estado inteiro', () => {
    const next = createOnboardingState()
    const state = reducer(makeState(), { type: 'state/import', state: next })
    expect(state).toBe(next)
  })

  it('state/reset volta ao estado de onboarding', () => {
    const state = reducer(makeState(), { type: 'state/reset' })
    expect(state.categories).toHaveLength(12)
    expect(state.wallets).toHaveLength(1)
    expect(state.transactions).toHaveLength(0)
    expect(state.projects).toHaveLength(0)
  })
})
