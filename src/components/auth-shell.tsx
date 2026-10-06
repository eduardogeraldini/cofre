import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Moon, ShieldCheck, Sparkles, Sun, Wallet } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

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

const highlights = [
  {
    icon: Wallet,
    title: 'Orçamentos por categoria',
    description: 'Defina limites mensais e acompanhe quanto já foi usado em cada área.',
  },
  {
    icon: Sparkles,
    title: 'Relatórios claros',
    description: 'Fluxo de caixa, evolução do saldo e despesas por categoria em um só lugar.',
  },
  {
    icon: ShieldCheck,
    title: 'Sincronizado na nuvem',
    description: 'Transações e orçamentos ficam salvos na sua conta, de qualquer dispositivo.',
  },
]

interface AuthShellProps {
  overline: string
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}

export function AuthShell({ overline, title, description, children, footer }: AuthShellProps) {
  const { theme, setTheme } = useTheme()

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <aside className="hidden flex-col justify-between bg-foreground p-10 text-background lg:flex">
        <Link to="/login" className="flex items-center gap-2.5" aria-label="Cofre — entrar">
          <span className="flex size-7 items-center justify-center rounded-[6px] bg-background">
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
              <rect x="2" y="8" width="3" height="6" rx="1" fill="var(--foreground)" />
              <rect
                x="6.5"
                y="5"
                width="3"
                height="9"
                rx="1"
                fill="var(--foreground)"
                opacity="0.75"
              />
              <rect
                x="11"
                y="2"
                width="3"
                height="12"
                rx="1"
                fill="var(--foreground)"
                opacity="0.5"
              />
            </svg>
          </span>
          <span className="font-display text-[17px] leading-none font-bold tracking-[-0.04em]">
            Cofre
          </span>
        </Link>

        <div className="max-w-md">
          <p className="text-overline text-background/50">Controle de orçamentos</p>
          <h1 className="font-display text-[38px] leading-[1.05] font-bold tracking-[-0.04em] text-background">
            Seu dinheiro, organizado sem planilhas.
          </h1>
          <ul className="mt-8 flex flex-col gap-5">
            {highlights.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-background/10">
                  <item.icon className="size-4" />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">{item.title}</span>
                  <span className="text-sm text-background/60">{item.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-background/40">
          Sistema de design Genesis · dados sincronizados na nuvem
        </p>
      </aside>

      <main className="flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Link to="/login" className="flex items-center gap-2.5 lg:hidden" aria-label="Cofre">
            <LogoMark />
            <span className="font-display text-[17px] leading-none font-bold tracking-[-0.04em]">
              Cofre
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Alternar tema"
            title="Alternar tema"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px]">
            <p className="text-overline text-muted-foreground">{overline}</p>
            <h2 className="font-display mt-2 text-[30px] leading-none font-bold tracking-[-0.035em]">
              {title}
            </h2>
            <p className="mt-2.5 text-sm text-muted-foreground">{description}</p>

            <div className="mt-7">{children}</div>

            <div className="mt-7 border-t border-border pt-5 text-sm text-muted-foreground">
              {footer}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
