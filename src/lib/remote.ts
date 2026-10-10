import type {
  AppState,
  Category,
  Project,
  Settings,
  Transaction,
  Transfer,
  TxType,
  Wallet,
} from '@/types'
import { supabase } from '@/lib/supabase'

interface CategoryRow {
  id: string
  name: string
  type: TxType
  icon: string
}

interface WalletRow {
  id: string
  name: string
  color: string
  initial_balance: number | string
}

interface ProjectRow {
  id: string
  name: string
}

interface TransferRow {
  id: string
  from_wallet_id: string
  to_wallet_id: string
  amount: number | string
  date: string
  note: string | null
}

interface TransactionRow {
  id: string
  type: TxType
  amount: number | string
  category_id: string
  wallet_id: string | null
  project_id: string | null
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

function fromWalletRow(row: WalletRow): Wallet {
  return { id: row.id, name: row.name, color: row.color, initialBalance: Number(row.initial_balance) }
}

function fromProjectRow(row: ProjectRow): Project {
  return { id: row.id, name: row.name }
}

function fromTransferRow(row: TransferRow): Transfer {
  return {
    id: row.id,
    fromWalletId: row.from_wallet_id,
    toWalletId: row.to_wallet_id,
    amount: Number(row.amount),
    date: row.date,
    note: row.note ?? '',
  }
}

function fromTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    categoryId: row.category_id,
    walletId: row.wallet_id,
    projectId: row.project_id,
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

function toWalletRow(userId: string, wallet: Wallet) {
  return {
    user_id: userId,
    id: wallet.id,
    name: wallet.name,
    color: wallet.color,
    initial_balance: wallet.initialBalance,
  }
}

function toProjectRow(userId: string, project: Project) {
  return { user_id: userId, id: project.id, name: project.name }
}

function toTransferRow(userId: string, transfer: Transfer) {
  return {
    user_id: userId,
    id: transfer.id,
    from_wallet_id: transfer.fromWalletId,
    to_wallet_id: transfer.toWalletId,
    amount: transfer.amount,
    date: transfer.date,
    note: transfer.note,
  }
}

function toTransactionRow(userId: string, tx: Transaction) {
  return {
    user_id: userId,
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    category_id: tx.categoryId,
    wallet_id: tx.walletId ?? null,
    project_id: tx.projectId ?? null,
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

  const [categories, wallets, projects, transfers, transactions, budgets, settings] =
    await Promise.all([
      db.from('categories').select('id, name, type, icon').eq('user_id', userId),
      db.from('wallets').select('id, name, color, initial_balance').eq('user_id', userId),
      db.from('projects').select('id, name').eq('user_id', userId),
      db
        .from('transfers')
        .select('id, from_wallet_id, to_wallet_id, amount, date, note')
        .eq('user_id', userId),
      db
        .from('transactions')
        .select('id, type, amount, category_id, wallet_id, project_id, date, note')
        .eq('user_id', userId),
      db.from('budgets').select('category_id, amount').eq('user_id', userId),
      db.from('settings').select('privacy_mode, compact_values').eq('user_id', userId).maybeSingle(),
    ])

  must(categories, 'Falha ao carregar categorias')
  must(wallets, 'Falha ao carregar carteiras')
  must(projects, 'Falha ao carregar projetos')
  must(transfers, 'Falha ao carregar transferências')
  must(transactions, 'Falha ao carregar transações')
  must(budgets, 'Falha ao carregar orçamentos')
  must(settings, 'Falha ao carregar configurações')

  const categoryRows = (categories.data ?? []) as CategoryRow[]
  const walletRows = (wallets.data ?? []) as WalletRow[]
  const projectRows = (projects.data ?? []) as ProjectRow[]
  const transferRows = (transfers.data ?? []) as TransferRow[]
  const transactionRows = (transactions.data ?? []) as TransactionRow[]
  const budgetRows = (budgets.data ?? []) as BudgetRow[]
  const settingsRow = settings.data as SettingsRow | null

  if (
    categoryRows.length === 0 &&
    walletRows.length === 0 &&
    projectRows.length === 0 &&
    transferRows.length === 0 &&
    transactionRows.length === 0 &&
    budgetRows.length === 0
  ) {
    return null
  }

  return {
    version: 1,
    categories: categoryRows.map(fromCategoryRow),
    wallets: walletRows.map(fromWalletRow),
    projects: projectRows.map(fromProjectRow),
    transfers: transferRows.map(fromTransferRow),
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

  if (state.wallets.length > 0) {
    const { error } = await db
      .from('wallets')
      .upsert(state.wallets.map((wallet) => toWalletRow(userId, wallet)), {
        onConflict: 'id',
      })
    must({ error }, 'Falha ao salvar carteiras')
  }

  if (state.categories.length > 0) {
    const { error } = await db
      .from('categories')
      .upsert(state.categories.map((category) => toCategoryRow(userId, category)), {
        onConflict: 'user_id,id',
      })
    must({ error }, 'Falha ao salvar categorias')
  }

  if (state.projects.length > 0) {
    const { error } = await db
      .from('projects')
      .upsert(state.projects.map((project) => toProjectRow(userId, project)), {
        onConflict: 'id',
      })
    must({ error }, 'Falha ao salvar projetos')
  }

  if (state.transactions.length > 0) {
    const { error } = await db
      .from('transactions')
      .upsert(state.transactions.map((tx) => toTransactionRow(userId, tx)), {
        onConflict: 'user_id,id',
      })
    must({ error }, 'Falha ao salvar transações')
  }

  if (state.transfers.length > 0) {
    const { error } = await db
      .from('transfers')
      .upsert(state.transfers.map((transfer) => toTransferRow(userId, transfer)), {
        onConflict: 'id',
      })
    must({ error }, 'Falha ao salvar transferências')
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

  const removedTransfers = await db.from('transfers').delete().eq('user_id', userId)
  must(removedTransfers, 'Falha ao limpar transferências')

  const removedProjects = await db.from('projects').delete().eq('user_id', userId)
  must(removedProjects, 'Falha ao limpar projetos')

  const removedCategories = await db.from('categories').delete().eq('user_id', userId)
  must(removedCategories, 'Falha ao limpar categorias')

  const removedWallets = await db.from('wallets').delete().eq('user_id', userId)
  must(removedWallets, 'Falha ao limpar carteiras')

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

  const prevWallets = new Map(prev.wallets.map((wallet) => [wallet.id, wallet]))
  const nextWallets = new Map(next.wallets.map((wallet) => [wallet.id, wallet]))

  const walletsUpsert = next.wallets.filter(
    (wallet) => JSON.stringify(prevWallets.get(wallet.id)) !== JSON.stringify(wallet),
  )
  const walletsRemoved = prev.wallets.filter((wallet) => !nextWallets.has(wallet.id))

  const prevProjects = new Map(prev.projects.map((project) => [project.id, project]))
  const nextProjects = new Map(next.projects.map((project) => [project.id, project]))

  const projectsUpsert = next.projects.filter(
    (project) => JSON.stringify(prevProjects.get(project.id)) !== JSON.stringify(project),
  )
  const projectsRemoved = prev.projects.filter((project) => !nextProjects.has(project.id))

  const prevTransfers = new Map(prev.transfers.map((transfer) => [transfer.id, transfer]))
  const nextTransfers = new Map(next.transfers.map((transfer) => [transfer.id, transfer]))

  const transfersUpsert = next.transfers.filter(
    (transfer) => JSON.stringify(prevTransfers.get(transfer.id)) !== JSON.stringify(transfer),
  )
  const transfersRemoved = prev.transfers.filter((transfer) => !nextTransfers.has(transfer.id))

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

  if (walletsUpsert.length > 0) {
    const { error } = await db
      .from('wallets')
      .upsert(walletsUpsert.map((wallet) => toWalletRow(userId, wallet)), {
        onConflict: 'id',
      })
    must({ error }, 'Falha ao salvar carteiras')
  }

  if (categoriesUpsert.length > 0) {
    const { error } = await db
      .from('categories')
      .upsert(categoriesUpsert.map((category) => toCategoryRow(userId, category)), {
        onConflict: 'user_id,id',
      })
    must({ error }, 'Falha ao salvar categorias')
  }

  if (projectsUpsert.length > 0) {
    const { error } = await db
      .from('projects')
      .upsert(projectsUpsert.map((project) => toProjectRow(userId, project)), {
        onConflict: 'id',
      })
    must({ error }, 'Falha ao salvar projetos')
  }

  if (transactionsUpsert.length > 0) {
    const { error } = await db
      .from('transactions')
      .upsert(transactionsUpsert.map((tx) => toTransactionRow(userId, tx)), {
        onConflict: 'user_id,id',
      })
    must({ error }, 'Falha ao salvar transações')
  }

  if (transfersUpsert.length > 0) {
    const { error } = await db
      .from('transfers')
      .upsert(transfersUpsert.map((transfer) => toTransferRow(userId, transfer)), {
        onConflict: 'id',
      })
    must({ error }, 'Falha ao salvar transferências')
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

  if (transfersRemoved.length > 0) {
    const { error } = await db
      .from('transfers')
      .delete()
      .eq('user_id', userId)
      .in('id', transfersRemoved.map((transfer) => transfer.id))
    must({ error }, 'Falha ao remover transferências')
  }

  if (projectsRemoved.length > 0) {
    const { error } = await db
      .from('projects')
      .delete()
      .eq('user_id', userId)
      .in('id', projectsRemoved.map((project) => project.id))
    must({ error }, 'Falha ao remover projetos')
  }

  if (walletsRemoved.length > 0) {
    const { error } = await db
      .from('wallets')
      .delete()
      .eq('user_id', userId)
      .in('id', walletsRemoved.map((wallet) => wallet.id))
    must({ error }, 'Falha ao remover carteiras')
  }
}
