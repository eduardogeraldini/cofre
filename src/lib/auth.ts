import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export interface Session {
  userId: string
  name: string
  email: string
}

function requireSupabase(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado — preencha o arquivo .env com as chaves do projeto.')
  }
}

function mapSignUpError(message: string): string {
  if (/already registered|user already/i.test(message)) return 'Já existe uma conta com este e-mail'
  if (/at least 6/i.test(message)) return 'A senha precisa de pelo menos 6 caracteres'
  if (/valid email/i.test(message)) return 'E-mail inválido'
  if (/rate limit/i.test(message)) return 'Muitas tentativas — aguarde um instante e tente de novo'
  return message
}

function mapSignInError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos'
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar'
  if (/failed to fetch|network/i.test(message)) return 'Falha de conexão com o servidor'
  return 'E-mail ou senha incorretos'
}

function toSession(user: {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}): Session {
  const metaName = (user.user_metadata?.name as string | undefined)?.trim()
  return {
    userId: user.id,
    name: metaName || (user.email ?? '').split('@')[0] || 'Usuário',
    email: user.email ?? '',
  }
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<Session> {
  requireSupabase()
  const normalized = email.trim().toLowerCase()

  const { data, error } = await supabase().auth.signUp({
    email: normalized,
    password,
    options: { data: { name: name.trim() } },
  })
  if (error) throw new Error(mapSignUpError(error.message))
  const user = data.user
  if (!user) throw new Error('Não foi possível criar a conta')
  if (!data.session) {
    throw new Error('Confirme o e-mail enviado para ativar sua conta e depois entre.')
  }

  const session = toSession(user)
  if (!session.name) session.name = name.trim()
  return session
}

export async function signIn(email: string, password: string): Promise<Session> {
  requireSupabase()
  const normalized = email.trim().toLowerCase()

  const { data, error } = await supabase().auth.signInWithPassword({
    email: normalized,
    password,
  })
  if (error || !data.user) throw new Error(mapSignInError(error?.message ?? ''))
  return toSession(data.user)
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) return
  await supabase().auth.signOut()
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}
