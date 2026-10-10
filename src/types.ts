export type TxType = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  type: TxType
  icon: string
}

export interface Wallet {
  id: string
  name: string
  color: string
  initialBalance: number
}

export interface Project {
  id: string
  name: string
}

export interface Transfer {
  id: string
  fromWalletId: string
  toWalletId: string
  amount: number
  date: string
  note: string
}

export interface Transaction {
  id: string
  type: TxType
  amount: number
  categoryId: string
  walletId?: string | null
  projectId?: string | null
  date: string
  note: string
}

export interface Settings {
  privacyMode: boolean
  compactValues: boolean
}

export interface AppState {
  version: number
  categories: Category[]
  wallets: Wallet[]
  projects: Project[]
  transfers: Transfer[]
  transactions: Transaction[]
  budgets: Record<string, number>
  settings: Settings
}

export type TxFilter = 'all' | TxType

export interface CategorySummary {
  category: Category
  spent: number
  limit: number
  remaining: number
  ratio: number
  status: 'ok' | 'warning' | 'over'
}

export interface MonthPoint {
  month: string
  label: string
  income: number
  expense: number
  net: number
}
