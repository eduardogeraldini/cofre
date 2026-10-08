import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CategoryIcon } from '@/components/category-icon'
import { Money } from '@/components/money'
import { relativeDay } from '@/lib/format'
import { walletDotClass } from '@/lib/wallet-colors'
import { useBudget } from '@/store/budget-store'
import type { Transaction } from '@/types'

interface TransactionRowProps {
  transaction: Transaction
  onEdit?: (transaction: Transaction) => void
  percent?: number
}

export function TransactionRow({ transaction, onEdit, percent }: TransactionRowProps) {
  const { state, dispatch } = useBudget()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const category = state.categories.find((item) => item.id === transaction.categoryId)
  const wallet = state.wallets.find((item) => item.id === transaction.walletId)
  const isIncome = transaction.type === 'income'

  const remove = () => {
    dispatch({ type: 'transaction/delete', id: transaction.id })
    setConfirmOpen(false)
  }

  return (
    <li className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CategoryIcon name={category?.icon ?? 'shapes'} className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {transaction.note || category?.name || 'Sem descrição'}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          <span className="md:hidden">
            {category?.name ?? '—'}
            {wallet ? ` · ${wallet.name}` : ''} ·{' '}
          </span>
          {relativeDay(transaction.date)}
        </p>
      </div>

      <span className="hidden w-28 shrink-0 truncate text-xs text-muted-foreground md:block">
        {category?.name ?? '—'}
      </span>

      <span className="hidden w-28 shrink-0 items-center gap-1.5 text-xs text-muted-foreground md:flex">
        {wallet ? (
          <>
            <span
              className={`size-2.5 shrink-0 rounded-full ${walletDotClass(wallet.color)}`}
            />
            <span className="truncate">{wallet.name}</span>
          </>
        ) : (
          '—'
        )}
      </span>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <Money
          value={transaction.amount}
          className={
            isIncome
              ? 'w-28 text-right text-sm font-medium text-success'
              : 'w-28 text-right text-sm font-medium text-foreground'
          }
        />
        {percent !== undefined ? (
          <span className="w-28 text-right text-xs text-neutral tabular-nums">
            {percent.toFixed(0)}%
          </span>
        ) : null}
      </div>

      <div className="flex w-8 shrink-0 justify-end">
        {onEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Ações da transação"
                className="opacity-60 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 sm:opacity-0"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => onEdit(transaction)}>
                <Pencil />
                Editar
              </DropdownMenuItem>
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(event) => event.preventDefault()}
                  >
                    <Trash2 />
                    Excluir
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
                    <AlertDialogDescription>
                      “{transaction.note || 'Sem descrição'}” será removida permanentemente. Esta
                      ação não pode ser desfeita.
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
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </li>
  )
}
