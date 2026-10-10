import type { AppState } from '@/types'
import { createOnboardingState } from '@/lib/seed'
import type { Action } from '@/store/budget-context'

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'transaction/add':
      return {
        ...state,
        transactions: [action.transaction, ...state.transactions].sort((a, b) =>
          a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
        ),
      }
    case 'transaction/import':
      return {
        ...state,
        transactions: [...action.transactions, ...state.transactions].sort((a, b) =>
          a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
        ),
      }
    case 'transaction/update':
      return {
        ...state,
        transactions: state.transactions
          .map((tx) => (tx.id === action.transaction.id ? action.transaction : tx))
          .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
      }
    case 'transaction/delete':
      return { ...state, transactions: state.transactions.filter((tx) => tx.id !== action.id) }
    case 'wallet/add':
      return { ...state, wallets: [...state.wallets, action.wallet] }
    case 'wallet/update':
      return {
        ...state,
        wallets: state.wallets.map((wallet) =>
          wallet.id === action.wallet.id ? action.wallet : wallet,
        ),
      }
    case 'wallet/delete':
      return {
        ...state,
        wallets: state.wallets.filter((wallet) => wallet.id !== action.id),
        transfers: state.transfers.filter(
          (transfer) => transfer.fromWalletId !== action.id && transfer.toWalletId !== action.id,
        ),
        transactions: state.transactions.map((tx) =>
          tx.walletId === action.id ? { ...tx, walletId: null } : tx,
        ),
      }
    case 'project/add':
      return { ...state, projects: [...state.projects, action.project] }
    case 'project/update':
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.project.id ? action.project : project,
        ),
      }
    case 'project/delete':
      return {
        ...state,
        projects: state.projects.filter((project) => project.id !== action.id),
        transactions: state.transactions.map((tx) =>
          tx.projectId === action.id ? { ...tx, projectId: null } : tx,
        ),
      }
    case 'transfer/add':
      return { ...state, transfers: [action.transfer, ...state.transfers] }
    case 'transfer/delete':
      return { ...state, transfers: state.transfers.filter((t) => t.id !== action.id) }
    case 'budget/set': {
      const budgets = { ...state.budgets }
      if (action.limit > 0) budgets[action.categoryId] = action.limit
      else delete budgets[action.categoryId]
      return { ...state, budgets }
    }
    case 'category/add':
      return { ...state, categories: [...state.categories, action.category] }
    case 'category/update':
      return {
        ...state,
        categories: state.categories.map((category) =>
          category.id === action.category.id ? action.category : category,
        ),
      }
    case 'category/delete': {
      const budgets = { ...state.budgets }
      delete budgets[action.id]
      return {
        ...state,
        budgets,
        categories: state.categories.filter((category) => category.id !== action.id),
        transactions: state.transactions.filter((tx) => tx.categoryId !== action.id),
      }
    }
    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.settings } }
    case 'state/import':
      return action.state
    case 'state/reset':
      return createOnboardingState()
    default:
      return state
  }
}
