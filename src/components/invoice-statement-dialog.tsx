import { ArrowLeftRight, ReceiptText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Money } from '@/components/money'
import { formatDate } from '@/lib/format'
import { invoiceCutoff, invoicePaymentRows, invoicePurchases, openInvoice } from '@/lib/selectors'
import { useBudget } from '@/store/budget-context'
import type { Wallet } from '@/types'

interface InvoiceStatementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet | null
  onPay: (wallet: Wallet) => void
}

export function InvoiceStatementDialog({
  open,
  onOpenChange,
  wallet,
  onPay,
}: InvoiceStatementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && wallet ? (
        <InvoiceStatementContent
          wallet={wallet}
          onOpenChange={onOpenChange}
          onPay={onPay}
        />
      ) : null}
    </Dialog>
  )
}

function InvoiceStatementContent({
  wallet,
  onOpenChange,
  onPay,
}: {
  wallet: Wallet
  onOpenChange: (open: boolean) => void
  onPay: (wallet: Wallet) => void
}) {
  const { state } = useBudget()
  const cutoff = invoiceCutoff(state, wallet.id)
  const purchases = invoicePurchases(state, wallet.id)
  const payments = invoicePaymentRows(state, wallet.id)
  const invoice = openInvoice(state, wallet.id)
  const subtotal = purchases.reduce((total, tx) => total + tx.amount, 0)
  const paidTotal = payments.reduce((total, transfer) => total + transfer.amount, 0)

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display text-[19px] tracking-[-0.03em]">
          Fatura — {wallet.name}
        </DialogTitle>
        <DialogDescription>
          {cutoff ? `Compras desde ${formatDate(cutoff)}` : 'Compras em aberto no cartão.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col">
        {purchases.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <ReceiptText className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Sem compras no período.</p>
          </div>
        ) : (
          <ul className="max-h-72 divide-y divide-border overflow-y-auto">
            {purchases.map((tx) => {
              const category = state.categories.find((item) => item.id === tx.categoryId)
              return (
                <li key={tx.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {tx.note || category?.name || 'Compra'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {category?.name && tx.note ? `${category.name} · ` : ''}
                      {formatDate(tx.date)}
                    </p>
                  </div>
                  <Money value={tx.amount} className="shrink-0 text-right text-sm font-medium" />
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Compras no período</span>
          <Money value={subtotal} className="font-semibold" />
        </div>

        {payments.length > 0 ? (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-overline">Pagamentos</p>
            <ul className="mt-1 divide-y divide-border">
              {payments.map((transfer) => {
                const origin = state.wallets.find((item) => item.id === transfer.fromWalletId)
                return (
                  <li key={transfer.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <ArrowLeftRight className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {transfer.note || 'Pagamento'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {origin ? `${origin.name} · ` : ''}
                        {formatDate(transfer.date)}
                      </p>
                    </div>
                    <Money
                      value={transfer.amount}
                      className="shrink-0 text-right text-sm font-medium"
                    />
                  </li>
                )
              })}
            </ul>
            <div className="flex items-center justify-between pt-1 text-sm">
              <span className="text-muted-foreground">Total pago</span>
              <Money value={paidTotal} className="font-semibold" />
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Fatura aberta</span>
          <Money value={invoice} className="font-semibold" />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Fechar
        </Button>
        <Button type="button" disabled={invoice <= 0} onClick={() => onPay(wallet)}>
          Pagar fatura
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
