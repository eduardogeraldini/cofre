import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Monitor,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { SegmentedControl } from '@/components/segmented-control'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/auth-store'
import { useBudget } from '@/store/budget-store'
import type { AppState } from '@/types'

type ThemeValue = 'light' | 'dark' | 'system'

const themeOptions: Array<{ value: ThemeValue; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

const palette = [
  { name: 'Primary', value: '#6366F1' },
  { name: 'Secondary', value: '#20970B' },
  { name: 'Background', value: '#FAFAFA' },
  { name: 'Surface', value: '#FFFFFF' },
  { name: 'Border', value: '#E8E8EC' },
  { name: 'Text', value: '#0A0A0A' },
]

export function SettingsPage() {
  const { state, dispatch, reset } = useBudget()
  const { session } = useAuth()
  const { theme, setTheme } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [tokens, setTokens] = useState<IntegrationToken[]>([])
  const [tokenLabel, setTokenLabel] = useState('iPhone')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [tokenBusy, setTokenBusy] = useState(false)

  const refreshStatus = useCallback(async () => {
    const { data, error } = await supabase()
      .from('integration_tokens')
      .select('id, label, created_at, last_used_at')
      .order('created_at', { ascending: false })
    if (error) {
      toast.error('Não foi possível carregar a integração', { description: integrationHint(error) })
      return
    }
    setTokens((data ?? []) as IntegrationToken[])
  }, [])

  useEffect(() => {
    let cancelled = false
    void supabase()
      .from('integration_tokens')
      .select('id, label, created_at, last_used_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          toast.error('Não foi possível carregar a integração', {
            description: integrationHint(error),
          })
          return
        }
        setTokens((data ?? []) as IntegrationToken[])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const generateToken = async () => {
    const userId = session?.userId
    if (!userId) {
      toast.error('Sessão expirada', { description: 'Entre de novo para gerar tokens.' })
      return
    }
    setTokenBusy(true)
    try {
      const bytes = new Uint8Array(24)
      crypto.getRandomValues(bytes)
      const token = 'cofre_sk_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
      const tokenHash = Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('')
      const { error } = await supabase().from('integration_tokens').insert({
        user_id: userId,
        label: tokenLabel.trim() || 'iPhone',
        token_hash: tokenHash,
      })
      if (error) {
        toast.error('Não foi possível gerar o token', { description: integrationHint(error) })
        return
      }
      setCreatedToken(token)
      setTokenLabel('iPhone')
      toast.success('Token gerado')
      await refreshStatus()
    } finally {
      setTokenBusy(false)
    }
  }

  const deleteToken = async (id: string) => {
    const { data, error } = await supabase()
      .from('integration_tokens')
      .delete()
      .eq('id', id)
      .select('id')
    if (error) {
      toast.error('Não foi possível apagar', { description: integrationHint(error) })
      return
    }
    if (!data || data.length === 0) {
      toast.error('Não foi possível apagar', { description: 'Token não encontrado.' })
      return
    }
    toast.success('Token apagado')
    await refreshStatus()
  }

  const copyToken = async () => {
    if (!createdToken) return
    await navigator.clipboard.writeText(createdToken)
    toast.success('Token copiado')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `cofre-orcamento-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('Dados exportados')
  }

  const importData = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as AppState
      if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.categories)) {
        throw new Error('formato inválido')
      }
      dispatch({ type: 'state/import', state: parsed })
      toast.success('Dados importados', { description: `${parsed.transactions.length} transações` })
    } catch {
      toast.error('Não foi possível importar', { description: 'Arquivo inválido ou corrompido.' })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-overline">Preferências</p>
        <h1 className="text-section">Configurações</h1>
        <p className="max-w-2xl text-[15px] text-muted-foreground">
          Ajuste a aparência, os dados e a privacidade do seu orçamento.
        </p>
      </header>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="gap-0">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
              Aparência
            </CardTitle>
            <CardDescription>O tema é aplicado imediatamente em toda a interface.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <SegmentedControl<ThemeValue>
              label="Tema da interface"
              value={(theme as ThemeValue) ?? 'system'}
              onChange={setTheme}
              options={themeOptions.map((option) => ({
                value: option.value,
                label: option.label,
                icon: option.icon,
              }))}
            />

            <div className="mt-5 flex flex-col gap-3">
              <p className="text-overline">Cores do sistema</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {palette.map((token) => (
                  <div
                    key={token.name}
                    className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2"
                  >
                    <span
                      className="size-4 shrink-0 rounded-[4px] border border-border"
                      style={{ backgroundColor: token.value }}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {token.name}
                    </span>
                    <span className="font-mono text-[10px] text-neutral uppercase">
                      {token.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
              Privacidade
            </CardTitle>
            <CardDescription>Controle como os valores aparecem na tela.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-5">
            <PreferenceRow
              id="privacy"
              checked={state.settings.privacyMode}
              onCheckedChange={(checked) =>
                dispatch({ type: 'settings/update', settings: { privacyMode: checked === true } })
              }
              label="Ocultar valores sensíveis"
              description="Substitui todos os valores por pontos na interface."
              icon={state.settings.privacyMode ? <EyeOff /> : <Eye />}
            />
            <PreferenceRow
              id="compact"
              checked={state.settings.compactValues ?? false}
              onCheckedChange={(checked) =>
                dispatch({ type: 'settings/update', settings: { compactValues: checked === true } })
              }
              label="Valores compactos nos indicadores"
              description="Mostra grandes montantes no formato R$ 12,3 mil."
              icon={<Download />}
            />
            <Separator />
            <p className="text-xs text-muted-foreground">
              Os dados ficam salvos na sua conta no Supabase e sincronizam entre dispositivos.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="gap-0">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
            Dados
          </CardTitle>
          <CardDescription>
            Exporte um backup, restaure um arquivo ou redefina os dados da conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={exportData}>
              <Download />
              Exportar JSON
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload />
              Importar JSON
            </Button>
            <Button variant="destructive" onClick={() => setResetOpen(true)}>
              <RotateCcw />
              Redefinir dados
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void importData(file)
                event.target.value = ''
              }}
            />
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <DataPoint label="Transações" value={String(state.transactions.length)} />
            <DataPoint label="Categorias" value={String(state.categories.length)} />
            <DataPoint label="Orçamentos ativos" value={String(Object.keys(state.budgets).length)} />
          </dl>
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
            Acesso rápido (iPhone)
          </CardTitle>
          <CardDescription>
            Gere tokens para o Atalho do iPhone registrar gastos direto na sua conta, sem senha.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-5">
          {createdToken ? (
            <div className="rounded-md border border-border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                Novo token (exibido apenas uma vez — guarde-o agora):
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate font-mono text-sm">{createdToken}</code>
                <Button variant="outline" size="sm" onClick={() => void copyToken()}>
                  <Copy />
                  Copiar
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="token-label">Nome</Label>
              <Input
                id="token-label"
                value={tokenLabel}
                onChange={(event) => setTokenLabel(event.target.value)}
                placeholder="iPhone"
                className="h-9 w-44"
              />
            </div>
            <Button onClick={() => void generateToken()} disabled={tokenBusy}>
              <KeyRound />
              Gerar token
            </Button>
          </div>

          {tokens.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum token gerado ainda.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {tokens.map((token) => (
                <li key={token.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{token.label}</span>
                    <span className="text-xs text-muted-foreground">
                      Criado {formatTokenDate(token.created_at)} ·{' '}
                      {token.last_used_at
                        ? `último uso ${formatTokenDate(token.last_used_at)}`
                        : 'nunca usado'}
                    </span>
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void deleteToken(token.id)}
                  >
                    <Trash2 />
                    Apagar
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-muted-foreground">
            O token aparece só no momento da criação — apenas o hash dele fica salvo no banco.
          </p>
        </CardContent>
      </Card>

      <Card className="gap-0">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
            Sobre
          </CardTitle>
          <CardDescription>Interface construída sobre o sistema de design Genesis.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 pt-5 text-sm text-muted-foreground">
          <Badge variant="outline">Cofre 1.0</Badge>
          <Badge variant="outline">React + shadcn/ui</Badge>
          <Badge variant="outline">General Sans · DM Sans · JetBrains Mono</Badge>
          <Badge variant="outline">Dark mode</Badge>
        </CardContent>
      </Card>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
              Redefinir todos os dados?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Todas as transações, categorias e limites serão apagados e apenas as categorias padrão
              serão recriadas. Exporte um backup antes de continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                reset()
                toast.success('Dados redefinidos')
              }}
            >
              Redefinir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface PreferenceRowProps {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  description: string
  icon: ReactNode
}

function PreferenceRow({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  icon,
}: PreferenceRowProps) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="min-w-0 flex-1">
          <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="shrink-0 text-neutral [&_svg]:size-4">{icon}</span>
      </div>
    </div>
  )
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/50 px-3 py-2">
      <dt className="text-overline">{label}</dt>
      <dd className="mt-0.5 font-display text-xl font-bold tracking-[-0.03em] tabular-nums">
        {value}
      </dd>
    </div>
  )
}

interface IntegrationToken {
  id: string
  label: string
  created_at: string
  last_used_at: string | null
}

function integrationHint(error: { code?: string | null; message: string }): string {
  if (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /integration_tokens|schema cache/i.test(error.message)
  ) {
    return 'Rode supabase/integration.sql no SQL Editor do Supabase e tente novamente.'
  }
  return error.message
}

function formatTokenDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
