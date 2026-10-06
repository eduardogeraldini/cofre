import type { AppState, Category, Settings, Transaction, TxType } from '@/types'
import { supabase } from '@/lib/supabase'

interface CategoryRow {
  id: string
  name: string
  type: TxType
  icon: string
}

interface TransactionRow {
  id: string
  type: TxType
  amount: number | string
  category_id: string
  date: string
  note: string | null
}

interface BudgetRow {
  category_id: string
  amount: number | string
}

interface SettingsRow {
  privacy_mode: boolean
  compact_values: boolean
}

function must(result: { error: { message: string } | null }, context: string): void {
  if (result.error) throw new Error(`${context}: ${result.error.message}`)
}

function fromCategoryRow(row: CategoryRow): Category {
  return { id: row.id, name: row.name, type: row.type, icon: row.icon }
}

function fromTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    categoryId: row.category_id,
    date: row.date,
    note: row.note ?? '',
  }
}

function toCategoryRow(userId: string, category: Category) {
  return {
    user_id: userId,
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon,
  }
}

function toTransactionRow(userId: string, tx: Transaction) {
  return {
    user_id: userId,
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    category_id: tx.categoryId,
    date: tx.date,
    note: tx.note,
  }
}

function toBudgetRow(userId: string, categoryId: string, amount: number) {
  return { user_id: userId, category_id: categoryId, amount }
}

function toSettingsRow(userId: string, settings: Settings) {
  return {
    user_id: userId,
    privacy_mode: settings.privacyMode,
    compact_values: settings.compactValues,
    updated_at: new Date().toISOString(),
  }
}

export async function loadRemoteState(userId: string): Promise<AppState | null> {
  const db = supabase()

  const [categories, transactions, budgets, settings] = await Promise.all([
    db.from('categories').select('id, name, type, icon').eq('user_id', userId),
    db
      .from('transactions')
      .select('id, type, amount, category_id, date, note')
      .eq('user_id', userId),
    db.from('budgets').select('category_id, amount').eq('user_id', userId),
    db.from('settings').select('privacy_mode, compact_values').eq('user_id', userId).maybeSingle(),
  ])

  must(categories, 'Falha ao carregar categorias')
  must(transactions, 'Falha ao carregar transações')
  must(budgets, 'Falha ao carregar orçamentos')
  must(settings, 'Falha ao carregar configurações')

  const categoryRows = (categories.data ?? []) as CategoryRow[]
  const transactionRows = (transactions.data ?? []) as TransactionRow[]
  const budgetRows = (budgets.data ?? []) as BudgetRow[]
  const settingsRow = settings.data as SettingsRow | null

  if (categoryRows.length === 0 && transactionRows.length === 0 && budgetRows.length === 0) {
    return null
  }

  return {
    version: 1,
    categories: categoryRows.map(fromCategoryRow),
    transactions: transactionRows.map(fromTransactionRow),
    budgets: Object.fromEntries(
      budgetRows.map((row) => [row.category_id, Number(row.amount)]),
    ),
    settings: {
      privacyMode: settingsRow?.privacy_mode ?? false,
      compactValues: settingsRow?.compact_values ?? true,
    },
  }
}

async function insertAll(userId: string, state: AppState): Promise<void> {
  const db = supabase()

  if (state.categories.length > 0) {
    const { error } = await db
      .from('categories')
      .upsert(state.categories.map((category) => toCategoryRow(userId, category)), {
        onConflict: 'user_id,id',
      })
    must({ error }, 'Falha ao salvar categorias')
  }

  if (state.transactions.length > 0) {
    const { error } = await db
      .from('transactions')
      .upsert(state.transactions.map((tx) => toTransactionRow(userId, tx)), {
        onConflict: 'user_id,id',
      })
    must({ error }, 'Falha ao salvar transações')
  }

  const budgetEntries = Object.entries(state.budgets)
  if (budgetEntries.length > 0) {
    const { error } = await db
      .from('budgets')
      .upsert(
        budgetEntries.map(([categoryId, amount]) => toBudgetRow(userId, categoryId, amount)),
        { onConflict: 'user_id,category_id' },
      )
    must({ error }, 'Falha ao salvar orçamentos')
  }

  const { error } = await db.from('settings').upsert(toSettingsRow(userId, state.settings), {
    onConflict: 'user_id',
  })
  must({ error }, 'Falha ao salvar configurações')
}

export async function pushFullState(userId: string, state: AppState): Promise<void> {
  const db = supabase()

  const removedTx = await db.from('transactions').delete().eq('user_id', userId)
  must(removedTx, 'Falha ao limpar transações')

  const removedBudgets = await db.from('budgets').delete().eq('user_id', userId)
  must(removedBudgets, 'Falha ao limpar orçamentos')

  const removedCategories = await db.from('categories').delete().eq('user_id', userId)
  must(removedCategories, 'Falha ao limpar categorias')

  await insertAll(userId, state)
}

export async function syncDiff(
  userId: string,
  prev: AppState,
  next: AppState,
): Promise<void> {
  const db = supabase()

  const prevCategories = new Map(prev.categories.map((category) => [category.id, category]))
  const nextCategories = new Map(next.categories.map((category) => [category.id, category]))

  const categoriesUpsert = next.categories.filter(
    (category) => JSON.stringify(prevCategories.get(category.id)) !== JSON.stringify(category),
  )
  const categoriesRemoved = prev.categories.filter(
    (category) => !nextCategories.has(category.id),
  )

  const prevTx = new Map(prev.transactions.map((tx) => [tx.id, tx]))
  const nextTx = new Map(next.transactions.map((tx) => [tx.id, tx]))
  const transactionsUpsert = next.transactions.filter(
    (tx) => JSON.stringify(prevTx.get(tx.id)) !== JSON.stringify(tx),
  )
  const transactionsRemoved = prev.transactions.filter((tx) => !nextTx.has(tx.id))

  const budgetKeys = new Set([...Object.keys(prev.budgets), ...Object.keys(next.budgets)])
  const budgetsUpsert: string[] = []
  const budgetsRemoved: string[] = []
  for (const key of budgetKeys) {
    const before = prev.budgets[key]
    const after = next.budgets[key]
    if (after === undefined) {
      if (before !== undefined) budgetsRemoved.push(key)
    } else if (before !== after) {
      budgetsUpsert.push(key)
    }
  }

  const settingsChanged = JSON.stringify(prev.settings) !== JSON.stringify(next.settings)

  if (categoriesUpsert.length > 0) {
    const { error } = await db
      .from('categories')
      .upsert(categoriesUpsert.map((category) => toCategoryRow(userId, category)), {
        onConflict: 'user_id,id',
      })
    must({ error }, 'Falha ao salvar categorias')
  }

  if (transactionsUpsert.length > 0) {
    const { error } = await db
      .from('transactions')
      .upsert(transactionsUpsert.map((tx) => toTransactionRow(userId, tx)), {
        onConflict: 'user_id,id',
      })
    must({ error }, 'Falha ao salvar transações')
  }

  if (budgetsUpsert.length > 0) {
    const { error } = await db
      .from('budgets')
      .upsert(
        budgetsUpsert.map((categoryId) =>
          toBudgetRow(userId, categoryId, next.budgets[categoryId] as number),
        ),
        { onConflict: 'user_id,category_id' },
      )
    must({ error }, 'Falha ao salvar orçamentos')
  }

  if (budgetsRemoved.length > 0) {
    const { error } = await db
      .from('budgets')
      .delete()
      .eq('user_id', userId)
      .in('category_id', budgetsRemoved)
    must({ error }, 'Falha ao remover orçamentos')
  }

  if (settingsChanged) {
    const { error } = await db
      .from('settings')
      .upsert(toSettingsRow(userId, next.settings), { onConflict: 'user_id' })
    must({ error }, 'Falha ao salvar configurações')
  }

  if (transactionsRemoved.length > 0) {
    const { error } = await db
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .in('id', transactionsRemoved.map((tx) => tx.id))
    must({ error }, 'Falha ao remover transações')
  }

  if (categoriesRemoved.length > 0) {
    const { error } = await db
      .from('categories')
      .delete()
      .eq('user_id', userId)
      .in('id', categoriesRemoved.map((category) => category.id))
    must({ error }, 'Falha ao remover categorias')
  }
}
