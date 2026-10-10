import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppState } from '@/types'

interface QueryResult {
  data: unknown
  error: { message: string } | null
}

const { log, upserts, mockClient } = vi.hoisted(() => {
  const log: string[] = []
  const upserts: Array<{ table: string; rows: Array<Record<string, unknown>> }> = []

  function builder(table: string) {
    const api = {
      select: () => {
        log.push(`select:${table}`)
        return api
      },
      delete: () => {
        log.push(`delete:${table}`)
        return api
      },
      upsert: (rows: Array<Record<string, unknown>>) => {
        log.push(`upsert:${table}`)
        upserts.push({ table, rows })
        return api
      },
      eq: (column: string, value: unknown) => {
        log.push(`eq:${table}:${column}:${String(value)}`)
        return api
      },
      in: (column: string, values: unknown[]) => {
        log.push(`in:${table}:${column}:${values.map(String).join('|')}`)
        return api
      },
      maybeSingle: () => api,
      then: (resolve: (value: QueryResult) => void, reject?: (reason: unknown) => void) =>
        Promise.resolve({ data: [], error: null } as QueryResult).then(resolve, reject),
    }
    return api
  }

  return { log, upserts, mockClient: { from: (table: string) => builder(table) } }
})

vi.mock('@/lib/supabase', () => ({ supabase: () => mockClient }))

const { pushFullState, syncDiff, loadRemoteState } = await import('@/lib/remote')

function makeState(): AppState {
  return {
    version: 1,
    categories: [{ id: 'c1', name: 'Lazer', type: 'expense', icon: 'ticket' }],
    wallets: [{ id: 'w1', name: 'Caixa', color: 'indigo', initialBalance: 10 }],
    projects: [{ id: 'p1', name: 'Casamento' }],
    transfers: [
      { id: 't1', fromWalletId: 'w1', toWalletId: 'w2', amount: 5, date: '2026-10-01', note: '' },
    ],
    transactions: [
      {
        id: 'tx1',
        type: 'expense',
        amount: 20,
        categoryId: 'c1',
        walletId: 'w1',
        projectId: 'p1',
        date: '2026-10-02',
        note: 'Cinema',
      },
    ],
    budgets: { c1: 300 },
    settings: { privacyMode: true, compactValues: false },
  }
}

function indexOfOp(op: string): number {
  return log.indexOf(op)
}

beforeEach(() => {
  log.length = 0
  upserts.length = 0
})

describe('pushFullState', () => {
  it('limpa todas as tabelas antes de reinserir', async () => {
    await pushFullState('user-1', makeState())

    for (const table of [
      'transactions',
      'budgets',
      'transfers',
      'projects',
      'categories',
      'wallets',
    ]) {
      expect(log).toContain(`delete:${table}`)
    }
    expect(log).toContain('upsert:settings')
  })

  it('respeita a ordem de dependência entre as remoções (transferências antes de carteiras)', async () => {
    await pushFullState('user-1', makeState())

    expect(indexOfOp('delete:transactions')).toBeLessThan(indexOfOp('delete:transfers'))
    expect(indexOfOp('delete:transfers')).toBeLessThan(indexOfOp('delete:wallets'))
    expect(indexOfOp('delete:budgets')).toBeLessThan(indexOfOp('delete:categories'))
    expect(indexOfOp('delete:transactions')).toBeLessThan(indexOfOp('delete:categories'))

    const lastDelete = Math.max(
      ...log.filter((op) => op.startsWith('delete:')).map((op) => indexOfOp(op)),
    )
    const firstUpsert = Math.min(
      ...log.filter((op) => op.startsWith('upsert:')).map((op) => indexOfOp(op)),
    )
    expect(lastDelete).toBeLessThan(firstUpsert)
  })

  it('grava as linhas com user_id e colunas em snake_case', async () => {
    await pushFullState('user-1', makeState())

    const wallets = upserts.find((item) => item.table === 'wallets')
    expect(wallets?.rows[0]).toEqual({
      user_id: 'user-1',
      id: 'w1',
      name: 'Caixa',
      color: 'indigo',
      initial_balance: 10,
    })

    const transactions = upserts.find((item) => item.table === 'transactions')
    expect(transactions?.rows[0]).toMatchObject({
      user_id: 'user-1',
      id: 'tx1',
      project_id: 'p1',
      wallet_id: 'w1',
    })

    const budgets = upserts.find((item) => item.table === 'budgets')
    expect(budgets?.rows[0]).toEqual({
      user_id: 'user-1',
      category_id: 'c1',
      amount: 300,
    })
  })
})

describe('syncDiff', () => {
  it('remove carteiras e transferências que saíram do estado local', async () => {
    const prev = makeState()
    prev.wallets.push({ id: 'w2', name: 'Banco', color: 'emerald', initialBalance: 0 })
    const next = makeState()
    next.transfers = []

    await syncDiff('user-1', prev, next)

    expect(log).toContain('delete:wallets')
    expect(log).toContain('in:wallets:id:w2')
    expect(log).toContain('delete:transfers')
    expect(log).toContain('in:transfers:id:t1')
  })

  it('faz upsert apenas do que mudou', async () => {
    const prev = makeState()
    const next = makeState()
    next.wallets[0].name = 'Caixa editado'

    await syncDiff('user-1', prev, next)

    expect(log).toContain('upsert:wallets')
    expect(log).not.toContain('upsert:categories')
    expect(log).not.toContain('upsert:transactions')
    expect(log).not.toContain('upsert:settings')
  })

  it('não faz nada quando o estado não mudou', async () => {
    const prev = makeState()

    await syncDiff('user-1', prev, makeState())

    expect(log.filter((op) => op.startsWith('upsert:'))).toHaveLength(0)
    expect(log.filter((op) => op.startsWith('delete:'))).toHaveLength(0)
  })
})

describe('loadRemoteState', () => {
  it('retorna null quando o banco está vazio', async () => {
    expect(await loadRemoteState('user-1')).toBeNull()
  })
})
