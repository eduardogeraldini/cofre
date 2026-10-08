import type { AppState, CategorySummary, MonthPoint, Transaction, TxType, Wallet } from '@/types'
import { lastMonthKeys, monthKey, monthLabel, previousMonthKey } from '@/lib/format'

export function transactionsInMonth(transactions: Transaction[], key: string): Transaction[] {
  return transactions.filter((tx) => monthKey(tx.date) === key)
}

export function sumByType(transactions: Transaction[], type: 'income' | 'expense'): number {
  return transactions
    .filter((tx) => tx.type === type)
    .reduce((total, tx) => total + tx.amount, 0)
}

export function totalBalance(transactions: Transaction[]): number {
  return transactions.reduce(
    (total, tx) => total + (tx.type === 'income' ? tx.amount : -tx.amount),
    0,
  )
}

export function walletBalance(state: AppState, walletId: string): number {
  const wallet = state.wallets.find((item) => item.id === walletId)
  if (!wallet) return 0

  let total = wallet.initialBalance
  for (const tx of state.transactions) {
    if (tx.walletId !== walletId) continue
    total += tx.type === 'income' ? tx.amount : -tx.amount
  }
  for (const transfer of state.transfers) {
    if (transfer.toWalletId === walletId) total += transfer.amount
    if (transfer.fromWalletId === walletId) total -= transfer.amount
  }
  return total
}

export function totalWealth(state: AppState): number {
  return state.wallets.reduce((total, wallet) => total + walletBalance(state, wallet.id), 0)
}

export function walletMonthFlow(state: AppState, walletId: string, key: string) {
  const txs = transactionsInMonth(state.transactions, key).filter(
    (tx) => tx.walletId === walletId,
  )
  return { income: sumByType(txs, 'income'), expense: sumByType(txs, 'expense') }
}

export interface WalletExpense {
  wallet: Wallet | null
  total: number
}

export function expensesByWallet(state: AppState, key: string): WalletExpense[] {
  const byId = new Map<string, number>()
  let loose = 0
  for (const tx of state.transactions) {
    if (tx.type !== 'expense' || monthKey(tx.date) !== key) continue
    if (tx.walletId) {
      byId.set(tx.walletId, (byId.get(tx.walletId) ?? 0) + tx.amount)
    } else {
      loose += tx.amount
    }
  }
  const rows: WalletExpense[] = []
  for (const wallet of state.wallets) {
    const total = byId.get(wallet.id) ?? 0
    if (total > 0) rows.push({ wallet, total })
    byId.delete(wallet.id)
  }
  for (const total of byId.values()) loose += total
  if (loose > 0) rows.push({ wallet: null, total: loose })
  return rows.sort((a, b) => b.total - a.total)
}

export function balanceBefore(transactions: Transaction[], key: string): number {
  return transactions
    .filter((tx) => monthKey(tx.date) < key)
    .reduce((total, tx) => total + (tx.type === 'income' ? tx.amount : -tx.amount), 0)
}

export function monthSeries(state: AppState, count = 6): MonthPoint[] {
  const keys = lastMonthKeys(count)
  return keys.map((key) => {
    const txs = transactionsInMonth(state.transactions, key)
    const income = sumByType(txs, 'income')
    const expense = sumByType(txs, 'expense')
    return { month: key, label: monthLabel(key), income, expense, net: income - expense }
  })
}

export function categorySummaries(state: AppState, key: string): CategorySummary[] {
  const txs = transactionsInMonth(state.transactions, key)

  return state.categories
    .filter((category) => category.type === 'expense')
    .map((category) => {
      const spent = txs
        .filter((tx) => tx.categoryId === category.id)
        .reduce((total, tx) => total + tx.amount, 0)
      const limit = state.budgets[category.id] ?? 0
      const ratio = limit > 0 ? (spent / limit) * 100 : 0
      const status: CategorySummary['status'] =
        limit <= 0 ? 'ok' : ratio >= 100 ? 'over' : ratio >= 80 ? 'warning' : 'ok'
      return {
        category,
        spent,
        limit,
        remaining: limit - spent,
        ratio,
        status,
      }
    })
    .sort((a, b) => b.spent - a.spent)
}

export function expenseBreakdown(
  transactions: Transaction[],
  key: string,
  categories: AppState['categories'],
  type: TxType = 'expense',
) {
  const txs = transactionsInMonth(transactions, key)
  const totals = new Map<string, number>()

  for (const tx of txs) {
    if (tx.type !== type) continue
    totals.set(tx.categoryId, (totals.get(tx.categoryId) ?? 0) + tx.amount)
  }

  return [...totals.entries()]
    .map(([categoryId, value]) => ({
      category: categories.find((category) => category.id === categoryId),
      categoryId,
      value,
    }))
    .filter((entry) => Boolean(entry.category))
    .sort((a, b) => b.value - a.value)
}

export function balanceSeries(state: AppState, count = 12) {
  const keys = lastMonthKeys(count)
  const first = keys[0]

  let running = state.transactions
    .filter((tx) => monthKey(tx.date) < first)
    .reduce((total, tx) => total + (tx.type === 'income' ? tx.amount : -tx.amount), 0)

  return keys.map((key) => {
    running += transactionsInMonth(state.transactions, key).reduce(
      (total, tx) => total + (tx.type === 'income' ? tx.amount : -tx.amount),
      0,
    )
    return { month: key, label: monthLabel(key), balance: running }
  })
}

export function savingsRate(income: number, expense: number): number {
  if (income <= 0) return 0
  return ((income - expense) / income) * 100
}

export function changeAgainstPrevious(state: AppState, key: string) {
  const previous = previousMonthKey(key)
  const currentTxs = transactionsInMonth(state.transactions, key)
  const previousTxs = transactionsInMonth(state.transactions, previous)

  const delta = (type: 'income' | 'expense') => {
    const now = sumByType(currentTxs, type)
    const before = sumByType(previousTxs, type)
    if (before === 0) return 0
    return ((now - before) / before) * 100
  }

  return { income: delta('income'), expense: delta('expense') }
}

export function budgetUsage(state: AppState, key: string) {
  const summaries = categorySummaries(state, key)
  const withLimit = summaries.filter((summary) => summary.limit > 0)
  const limit = withLimit.reduce((total, summary) => total + summary.limit, 0)
  const spent = withLimit.reduce((total, summary) => total + summary.spent, 0)
  return { limit, spent, remaining: limit - spent, ratio: limit > 0 ? (spent / limit) * 100 : 0 }
}

export function searchTransactions(transactions: Transaction[], query: string, limit = 6) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []
  return transactions
    .filter((tx) => tx.note.toLowerCase().includes(normalized))
    .slice(0, limit)
}
