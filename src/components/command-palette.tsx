import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Moon,
  PieChart,
  Plus,
  Receipt,
  Settings,
  Sun,
  Wallet,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { CategoryIcon } from '@/components/category-icon'
import { formatCurrency, relativeDay } from '@/lib/format'
import { searchTransactions } from '@/lib/selectors'
import { useBudget } from '@/store/budget-store'
import { useAuth } from '@/store/auth-store'

interface CommandContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const CommandContext = createContext<CommandContextValue | null>(null)

const navItems = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/transacoes', label: 'Transações', icon: Receipt },
  { to: '/orcamentos', label: 'Orçamentos', icon: Wallet },
  { to: '/relatorios', label: 'Relatórios', icon: PieChart },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function CommandProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = useMemo(() => ({ open, setOpen }), [open])

  return <CommandContext.Provider value={value}>{children}</CommandContext.Provider>
}

export function useCommand(): CommandContextValue {
  const context = useContext(CommandContext)
  if (!context) throw new Error('useCommand must be used within CommandProvider')
  return context
}

export function CommandPalette() {
  const { open, setOpen } = useCommand()
  const { state, dispatch } = useBudget()
  const { signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const go = useCallback(
    (to: string) => {
      setOpen(false)
      setQuery('')
      navigate(to)
    },
    [navigate, setOpen],
  )

  const results = searchTransactions(state.transactions, query)
  const categories = new Map(state.categories.map((category) => [category.id, category]))

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
      title="Busca global"
      description="Navegue pelas páginas, encontre transações e execute ações rápidas."
      className="sm:max-w-xl"
    >
      <Command shouldFilter>
        <CommandInput
          placeholder="Buscar transações, páginas e ações…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          <CommandGroup heading="Navegar">
            {navItems.map((item) => (
              <CommandItem key={item.to} value={`nav ${item.label}`} onSelect={() => go(item.to)}>
                <item.icon />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Ações">
            <CommandItem
              value="acao nova transacao"
              onSelect={() => go('/transacoes?new=1')}
            >
              <Plus />
              <span>Nova transação</span>
            </CommandItem>
            <CommandItem
              value="acao alternar tema"
              onSelect={() => {
                setTheme(theme === 'dark' ? 'light' : 'dark')
                setOpen(false)
              }}
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
              <span>Alternar tema</span>
            </CommandItem>
            <CommandItem
              value="acao modo privado"
              onSelect={() => {
                dispatch({
                  type: 'settings/update',
                  settings: { privacyMode: !state.settings.privacyMode },
                })
                setOpen(false)
              }}
            >
              {state.settings.privacyMode ? <Eye /> : <EyeOff />}
              <span>{state.settings.privacyMode ? 'Mostrar valores' : 'Ocultar valores'}</span>
            </CommandItem>
            <CommandItem
              value="acao sair da conta"
              onSelect={() => {
                signOut()
                setOpen(false)
                navigate('/login')
              }}
            >
              <LogOut />
              <span>Sair da conta</span>
            </CommandItem>
          </CommandGroup>

          {results.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Transações">
                {results.map((tx) => {
                  const category = categories.get(tx.categoryId)
                  return (
                    <CommandItem
                      key={tx.id}
                      value={`tx ${tx.note} ${category?.name ?? ''}`}
                      onSelect={() => go(`/transacoes?q=${encodeURIComponent(tx.note)}`)}
                    >
                      <CategoryIcon name={category?.icon ?? 'shapes'} />
                      <span className="truncate">{tx.note}</span>
                      <span className="ml-auto pr-1 text-xs text-muted-foreground">
                        {tx.type === 'income' ? '+' : '−'}{' '}
                        {formatCurrency(tx.amount, state.settings.privacyMode)}
                      </span>
                      <span className="hidden text-xs text-neutral xs:inline">
                        {relativeDay(tx.date)}
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
