import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toISODate } from '@/lib/format'
import { parseAmount } from '@/lib/money'
import { useBudget } from '@/store/budget-store'
import type { Transfer } from '@/types'

const TODAY = toISODate(new Date())

interface TransferFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransferFormDialog({ open, onOpenChange }: TransferFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <TransferFormContent onOpenChange={onOpenChange} /> : null}
    </Dialog>
  )
}

function TransferFormContent({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const { state, dispatch } = useBudget()
  const wallets = state.wallets

  const [from, setFrom] = useState(wallets[0]?.id ?? '')
  const [to, setTo] = useState(wallets[1]?.id ?? wallets[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(TODAY)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const save = () => {
    if (!from || !to) {
      setError('Selecione as duas carteiras')
      return
    }
    if (from === to) {
      setError('Origem e destino precisam ser diferentes')
      return
    }
    const value = parseAmount(amount)
    if (!(value > 0)) {
      setError('Informe um valor maior que zero')
      return
    }

    const payload: Transfer = {
      id: crypto.randomUUID(),
      fromWalletId: from,
      toWalletId: to,
      amount: Math.round(value * 100) / 100,
      date,
      note: note.trim(),
    }

    dispatch({ type: 'transfer/add', transfer: payload })
    toast.success('Transferência registrada', {
      description: `${state.wallets.find((w) => w.id === from)?.name ?? '?'} → ${
        state.wallets.find((w) => w.id === to)?.name ?? '?'
      }`,
    })
    onOpenChange(false)
  }

  const walletSelect = (value: string, onChange: (id: string) => void, label: string) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue placeholder="Carteira" />
      </SelectTrigger>
      <SelectContent>
        {wallets.map((wallet) => (
          <SelectItem key={wallet.id} value={wallet.id}>
            {wallet.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display text-[19px] tracking-[-0.03em]">
          Transferir entre carteiras
        </DialogTitle>
        <DialogDescription>
          Move valores de uma conta para outra sem afetar receitas, despesas ou orçamentos.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div className="flex flex-col gap-2">
            <Label>De</Label>
            {walletSelect(from, setFrom, 'Carteira de origem')}
          </div>
          <span className="hidden size-[38px] items-center justify-center text-muted-foreground sm:flex">
            <ArrowRight />
          </span>
          <div className="flex flex-col gap-2">
            <Label>Para</Label>
            {walletSelect(to, setTo, 'Carteira de destino')}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="transfer-amount">Valor</Label>
            <Input
              id="transfer-amount"
              inputMode="decimal"
              placeholder="0,00"
              className="font-mono"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value)
                setError('')
              }}
              aria-invalid={Boolean(error)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="transfer-date">Data</Label>
            <DatePicker
              id="transfer-date"
              value={parseISO(date)}
              onChange={(next) => {
                if (next) setDate(toISODate(next))
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="transfer-note">Descrição</Label>
          <Input
            id="transfer-note"
            placeholder="Ex.: Pix para a poupança"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" onClick={save}>
          Transferir
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
