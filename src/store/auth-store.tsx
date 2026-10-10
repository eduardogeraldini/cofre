import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import {
  signIn as authenticate,
  signOut as clearSession,
  signUp as register,
  type Session,
} from '@/lib/auth'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { AuthContext } from '@/store/auth-context'

function sessionFromUser(user: User): Session {
  const metaName = (user.user_metadata?.name as string | undefined)?.trim()
  return {
    userId: user.id,
    name: metaName || (user.email ?? '').split('@')[0] || 'Usuário',
    email: user.email ?? '',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true

    void supabase()
      .auth.getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session ? sessionFromUser(data.session.user) : null)
        setReady(true)
      })

    const { data: subscription } = supabase().auth.onAuthStateChange((_event, next) => {
      if (!active) return
      setSession(next ? sessionFromUser(next.user) : null)
      setReady(true)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setSession(await authenticate(email, password))
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setSession(await register(name, email, password))
  }, [])

  const signOut = useCallback(() => {
    setSession(null)
    void clearSession()
  }, [])

  const value = useMemo(
    () => ({ session, ready, signIn, signUp, signOut }),
    [session, ready, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
