import { useState } from 'react'
import {
  ArrowLeftRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  WalletCards,
} from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/empty-state'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { TransferFormDialog } from '@/components/transfer-form-dialog'
import { WalletFormDialog } from '@/components/wallet-form-dialog'
import { monthKeyOf, relativeDay } from '@/lib/format'
import { totalWealth, walletBalance, walletMonthFlow } from '@/lib/selectors'
import { walletDotClass } from '@/lib/wallet-colors'
import { useBudget } from '@/store/budget-context'
import type { AppState, Wallet } from '@/types'

const CURRENT_MONTH = monthKeyOf(new Date())

function lastMovement(state: AppState, walletId: string): string | null {
  let latest: string | null = null
  for (const tx of state.transactions) {
    if (tx.walletId === walletId && (!latest || tx.date > latest)) latest = tx.date
  }
  for (const transfer of state.transfers) {
    if (
      (transfer.fromWalletId === walletId || transfer.toWalletId === walletId) &&
      (!latest || transfer.date > latest)
    ) {
      latest = transfer.date
    }
  }
  return latest
}

function WalletCard({
  wallet,
  onEdit,
}: {
  wallet: Wallet
  onEdit: (wallet: Wallet) => void
}) {
  const { state, dispatch } = useBudget()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const balance = walletBalance(state, wallet.id)
  const flow = walletMonthFlow(state, wallet.id, CURRENT_MONTH)
  const last = lastMovement(state, wallet.id)

  const remove = () => {
    dispatch({ type: 'wallet/delete', id: wallet.id })
    setConfirmOpen(false)
  }

  return (
    <Card className="gap-0">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={`size-3 shrink-0 rounded-full ${walletDotClass(wallet.color)}`} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{wallet.name}</p>
              <p className="text-xs text-muted-foreground">
                {last ? `Última movimentação ${relativeDay(last)}` : 'Sem movimentação'}
              </p>
            </div>
          </div>

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Ações da carteira ${wallet.name}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onSelect={() => {
                  setMenuOpen(false)
                  onEdit(wallet)
                }}
              >
                <Pencil />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={(event) => {
                  event.preventDefault()
                  setConfirmOpen(true)
                }}
              >
                <Trash2 />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <Money value={balance} className="font-display text-2xl font-bold tracking-[-0.03em]" />
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              No mês: <Money value={flow.income} className="inline text-success" /> entrada ·{' '}
              <Money value={flow.expense} className="inline" /> saída
            </span>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir carteira?</AlertDialogTitle>
            <AlertDialogDescription>
              “{wallet.name}” será removida. Transferências ligadas a ela também saem e as
              transações ficam sem carteira. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

export function WalletsPage() {
  const { state, dispatch } = useBudget()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Wallet | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferConfirm, setTransferConfirm] = useState<string | null>(null)

  const wealth = totalWealth(state)
  const recentTransfers = [...state.transfers]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 5)

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (wallet: Wallet) => {
    setEditing(wallet)
    setFormOpen(true)
  }

  const walletName = (id: string) => state.wallets.find((wallet) => wallet.id === id)?.name ?? '—'

  const removeTransfer = (id: string) => {
    dispatch({ type: 'transfer/delete', id })
    setTransferConfirm(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline="Contas"
        title="Carteiras"
        description="Saldos por conta e dinheiro físico, com transferências entre carteiras."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight />
              Transferir
            </Button>
            <Button onClick={openNew}>
              <Plus />
              Nova carteira
            </Button>
          </div>
        }
      />

      <Card className="gap-0">
        <CardContent className="flex flex-wrap items-baseline justify-between gap-3 p-5">
          <div>
            <p className="text-overline">Patrimônio</p>
            <Money value={wealth} className="font-display text-3xl font-bold tracking-[-0.03em]" />
          </div>
          <p className="text-sm text-muted-foreground">
            {state.wallets.length} {state.wallets.length === 1 ? 'carteira' : 'carteiras'}
            {state.transfers.length > 0 ? ` · ${state.transfers.length} transferências` : ''}
          </p>
        </CardContent>
      </Card>

      {state.wallets.length === 0 ? (
        <Card className="gap-0">
          <CardContent className="p-5">
            <EmptyState
              icon={<WalletCards className="size-6" />}
              title="Nenhuma carteira ainda"
              description="Crie carteiras para saber de onde cada gasto sai: Nubank, dinheiro e mais."
              action={
                <Button onClick={openNew}>
                  <Plus />
                  Nova carteira
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.wallets.map((wallet) => (
            <WalletCard key={wallet.id} wallet={wallet} onEdit={openEdit} />
          ))}
        </div>
      )}

      {recentTransfers.length > 0 ? (
        <Card className="gap-0">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-base font-bold tracking-[-0.03em]">
              Transferências recentes
            </CardTitle>
            <CardDescription>Movimentos entre carteiras não afetam receitas e despesas.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y divide-border">
              {recentTransfers.map((transfer) => (
                <li
                  key={transfer.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <ArrowLeftRight className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {walletName(transfer.fromWalletId)} → {walletName(transfer.toWalletId)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {transfer.note ? `${transfer.note} · ` : ''}
                      {relativeDay(transfer.date)}
                    </p>
                  </div>
                  <Money value={transfer.amount} className="w-28 shrink-0 text-right text-sm font-medium" />
                  <div className="flex w-8 shrink-0 justify-end">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Excluir transferência"
                      onClick={() => setTransferConfirm(transfer.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <WalletFormDialog open={formOpen} onOpenChange={setFormOpen} wallet={editing} />
      <TransferFormDialog open={transferOpen} onOpenChange={setTransferOpen} />

      <AlertDialog open={transferConfirm !== null} onOpenChange={(open) => !open && setTransferConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transferência?</AlertDialogTitle>
            <AlertDialogDescription>
              O valor volta para a carteira de origem. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => transferConfirm && removeTransfer(transferConfirm)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
