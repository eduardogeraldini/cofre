import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { CommandPalette, CommandProvider } from '@/components/command-palette'
import { TopNav } from '@/components/top-nav'
import { Toaster } from '@/components/ui/sonner'
import { BudgetsPage } from '@/pages/budgets'
import { DashboardPage } from '@/pages/dashboard'
import { LoginPage } from '@/pages/login'
import { ReportsPage } from '@/pages/reports'
import { SettingsPage } from '@/pages/settings'
import { SignupPage } from '@/pages/signup'
import { TransactionsPage } from '@/pages/transactions'
import { BudgetProvider } from '@/store/budget-store'
import { AuthProvider, useAuth } from '@/store/auth-store'

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-border bg-card/60">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>Cofre — controle de orçamentos pessoais.</span>
          <span>Sistema de design Genesis · dados sincronizados na nuvem</span>
        </div>
      </footer>

      <CommandPalette />
    </div>
  )
}

function RequireAuth() {
  const { session, ready } = useAuth()
  if (!ready) return null
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

function GuestOnly() {
  const { session, ready } = useAuth()
  if (!ready) return null
  if (session) return <Navigate to="/" replace />
  return <Outlet />
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <BudgetProvider>
          <CommandProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<GuestOnly />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/cadastro" element={<SignupPage />} />
                </Route>

                <Route element={<RequireAuth />}>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/transacoes" element={<TransactionsPage />} />
                    <Route path="/orcamentos" element={<BudgetsPage />} />
                    <Route path="/relatorios" element={<ReportsPage />} />
                    <Route path="/configuracoes" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Route>
              </Routes>
            </BrowserRouter>
            <Toaster position="top-right" />
          </CommandProvider>
        </BudgetProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
