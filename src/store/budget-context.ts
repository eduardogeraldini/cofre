import { createContext, useContext, type Dispatch } from 'react'
import type {
  AppState,
  Category,
  Project,
  Settings,
  Transaction,
  Transfer,
  Wallet,
} from '@/types'

export type Action =
  | { type: 'transaction/add'; transaction: Transaction }
  | { type: 'transaction/import'; transactions: Transaction[] }
  | { type: 'transaction/update'; transaction: Transaction }
  | { type: 'transaction/delete'; id: string }
  | { type: 'wallet/add'; wallet: Wallet }
  | { type: 'wallet/update'; wallet: Wallet }
  | { type: 'wallet/delete'; id: string }
  | { type: 'project/add'; project: Project }
  | { type: 'project/update'; project: Project }
  | { type: 'project/delete'; id: string }
  | { type: 'transfer/add'; transfer: Transfer }
  | { type: 'transfer/delete'; id: string }
  | { type: 'budget/set'; categoryId: string; limit: number }
  | { type: 'category/add'; category: Category }
  | { type: 'category/update'; category: Category }
  | { type: 'category/delete'; id: string }
  | { type: 'settings/update'; settings: Partial<Settings> }
  | { type: 'state/import'; state: AppState }
  | { type: 'state/reset' }

export interface BudgetContextValue {
  state: AppState
  dispatch: Dispatch<Action>
  reset: () => void
}

export const BudgetContext = createContext<BudgetContextValue | null>(null)

export function useBudget(): BudgetContextValue {
  const context = useContext(BudgetContext)
  if (!context) throw new Error('useBudget must be used within BudgetProvider')
  return context
}
