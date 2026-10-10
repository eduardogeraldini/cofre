import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import type { AppState } from '@/types'
import { createOnboardingState } from '@/lib/seed'
import { readStateSnapshot, writeStateSnapshot } from '@/lib/offline-state'
import { loadRemoteState, pushFullState, syncDiff } from '@/lib/remote'
import { BudgetContext } from '@/store/budget-context'
import { reducer } from '@/store/budget-reducer'
import { useAuth } from '@/store/auth-context'

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
