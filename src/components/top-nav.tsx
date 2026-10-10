import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Check,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PieChart,
  Receipt,
  Search,
  Settings,
  Sun,
  Wallet,
  WalletCards,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useCommand } from '@/components/command-context'
import { useBudget } from '@/store/budget-context'
import { useAuth } from '@/store/auth-context'
import { initials } from '@/lib/auth'

const navItems = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/transacoes', label: 'Transações', icon: Receipt, end: false },
  { to: '/carteiras', label: 'Carteiras', icon: WalletCards, end: false },
  { to: '/orcamentos', label: 'Orçamentos', icon: Wallet, end: false },
  { to: '/relatorios', label: 'Relatórios', icon: PieChart, end: false },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, end: false },
]

function LogoMark() {
  return (
    <span className="flex size-7 items-center justify-center rounded-[6px] bg-foreground">
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
        <rect x="2" y="8" width="3" height="6" rx="1" fill="var(--background)" />
        <rect x="6.5" y="5" width="3" height="9" rx="1" fill="var(--background)" opacity="0.75" />
        <rect x="11" y="2" width="3" height="12" rx="1" fill="var(--background)" opacity="0.5" />
      </svg>
    </span>
  )
}

const HOTKEY =
  typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform)
    ? '⌘K'
    : 'Ctrl K'

export function TopNav() {
  const { setOpen } = useCommand()
  const { state, dispatch } = useBudget()
  const { session, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const userName = session?.name ?? 'Conta'
  const userInitials = initials(userName)

  const togglePrivacy = () =>
    dispatch({
      type: 'settings/update',
      settings: { privacyMode: !state.settings.privacyMode },
    })

  const handleSignOut = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Cofre — início">
          <LogoMark />
          <span className="font-display text-[17px] leading-none font-bold tracking-[-0.04em]">
            Cofre
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="hidden h-9 w-56 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:flex"
          >
            <Search className="size-4" />
            <span>Buscar</span>
            <kbd className="ml-auto rounded-[4px] border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] leading-none text-neutral">
              {HOTKEY}
            </kbd>
          </button>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Alternar tema"
            title="Alternar tema"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Menu da conta">
                <Avatar className="size-7">
                  <AvatarFallback className="rounded-full bg-muted text-xs font-semibold text-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{userName}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {session?.email ?? 'Não conectado'}
                  </span>
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/configuracoes">
                  <Settings />
                  Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={togglePrivacy}>
                {state.settings.privacyMode ? <Eye /> : <EyeOff />}
                {state.settings.privacyMode ? 'Mostrar valores' : 'Ocultar valores'}
                {state.settings.privacyMode ? <Check className="ml-auto" /> : null}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setOpen(true)}>
                <Search />
                Busca global
                <span className="ml-auto font-mono text-[11px] text-neutral">{HOTKEY}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
                <LogOut />
                Sair da conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" className="md:hidden" aria-label="Abrir menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-72 flex-col gap-6">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5">
                  <LogoMark />
                  <span className="font-display text-[17px] tracking-[-0.04em]">Cofre</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMenuOpen(false)
                    setOpen(true)
                  }}
                >
                  <Search />
                  Buscar
                  <span className="ml-auto font-mono text-[11px] text-neutral">{HOTKEY}</span>
                </Button>
                <Button variant="ghost" onClick={togglePrivacy}>
                  {state.settings.privacyMode ? <Eye /> : <EyeOff />}
                  {state.settings.privacyMode ? 'Mostrar valores' : 'Ocultar valores'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMenuOpen(false)
                    handleSignOut()
                  }}
                >
                  <LogOut />
                  Sair da conta
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
