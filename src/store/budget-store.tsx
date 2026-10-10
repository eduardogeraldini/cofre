import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import type {
  AppState,
  Category,
  Project,
  Settings,
  Transaction,
  Transfer,
  Wallet,
} from '@/types'
import { createOnboardingState } from '@/lib/seed'
import { readStateSnapshot, writeStateSnapshot } from '@/lib/offline-state'
import { loadRemoteState, pushFullState, syncDiff } from '@/lib/remote'
import { useAuth } from '@/store/auth-store'

type Action =
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

function reducer(state: AppState, action: Action): AppState {
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

interface BudgetContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  reset: () => void
}

const BudgetContext = createContext<BudgetContextValue | null>(null)

const SYNC_DEBOUNCE_MS = 600
const SYNC_RETRY_MS = 5000

export function BudgetProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const remoteUserId = session?.userId ?? null

  return (
    <BudgetProviderInner key={remoteUserId ?? 'guest'} remoteUserId={remoteUserId}>
      {children}
    </BudgetProviderInner>
  )
}

function BudgetProviderInner({
  remoteUserId,
  children,
}: {
  remoteUserId: string | null
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(reducer, null, () => createOnboardingState())
  const [hydrated, setHydrated] = useState(remoteUserId === null)
  const [syncEnabled, setSyncEnabled] = useState(remoteUserId === null)

  const stateRef = useRef(state)
  const baselineRef = useRef<AppState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const userIdRef = useRef(remoteUserId)
  const notifiedRef = useRef(false)
  const flushRef = useRef<() => void>(() => {})

  useEffect(() => {
    stateRef.current = state
    userIdRef.current = remoteUserId
  }, [state, remoteUserId])

  useEffect(() => {
    if (!remoteUserId) return
    let cancelled = false

    void (async () => {
      try {
        const remote = await loadRemoteState(remoteUserId)
        if (cancelled) return
        if (remote) {
          dispatch({ type: 'state/import', state: remote })
        } else {
          await pushFullState(remoteUserId, stateRef.current)
        }
        if (!cancelled) {
          setSyncEnabled(true)
          setHydrated(true)
        }
      } catch (error) {
        console.error('Supabase: falha ao carregar dados', error)
        if (!cancelled) {
          const snapshot = readStateSnapshot()
          if (snapshot) {
            dispatch({ type: 'state/import', state: snapshot })
            toast.warning('Sem conexão — exibindo os últimos dados salvos.')
          } else {
            toast.error('Não foi possível carregar seus dados.')
          }
          setHydrated(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [remoteUserId])

  const flush = useCallback(() => {
    const userId = userIdRef.current
    const from = baselineRef.current
    const to = stateRef.current
    if (!userId || !from || from === to) return

    baselineRef.current = to
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }

    void syncDiff(userId, from, to)
      .then(() => {
        notifiedRef.current = false
      })
      .catch((error) => {
        baselineRef.current = from
        console.error('Supabase: falha ao sincronizar', error)
        if (!notifiedRef.current) {
          notifiedRef.current = true
          toast.error('Não foi possível salvar seus dados — tentando novamente…')
        }
        if (mountedRef.current) {
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null
            flushRef.current()
          }, SYNC_RETRY_MS)
        }
      })
  }, [])

  useEffect(() => {
    flushRef.current = flush
  }, [flush])

  useEffect(() => {
    if (!remoteUserId || !syncEnabled) return
    writeStateSnapshot(state)
  }, [state, remoteUserId, syncEnabled])

  useEffect(() => {
    if (!remoteUserId || !syncEnabled) return
    if (baselineRef.current === null) {
      baselineRef.current = state
      return
    }
    if (baselineRef.current === state) return
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      flush()
    }, SYNC_DEBOUNCE_MS)
  }, [state, remoteUserId, syncEnabled, flush])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      flush()
    }
  }, [flush])

  const reset = useCallback(() => dispatch({ type: 'state/reset' }), [])

  const value = useMemo(() => ({ state, dispatch, reset }), [state, reset])

  if (!hydrated) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        role="status"
        aria-label="Carregando dados"
      >
        <span className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}

export function useBudget(): BudgetContextValue {
  const context = useContext(BudgetContext)
  if (!context) throw new Error('useBudget must be used within BudgetProvider')
  return context
}
