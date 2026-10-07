import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { parseAmount, toAmountInput } from '@/lib/money'
import { WALLET_COLORS, walletDotClass } from '@/lib/wallet-colors'
import { useBudget } from '@/store/budget-store'
import type { Wallet } from '@/types'

interface WalletFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet?: Wallet | null
}

export function WalletFormDialog({ open, onOpenChange, wallet }: WalletFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <WalletFormContent wallet={wallet} onOpenChange={onOpenChange} /> : null}
    </Dialog>
  )
}

function WalletFormContent({
  wallet,
  onOpenChange,
}: {
  wallet?: Wallet | null
  onOpenChange: (open: boolean) => void
}) {
  const isEditing = Boolean(wallet)
  const { dispatch } = useBudget()

  const [name, setName] = useState(wallet?.name ?? '')
  const [color, setColor] = useState(wallet?.color ?? WALLET_COLORS[0].key)
  const [balance, setBalance] = useState(wallet ? toAmountInput(wallet.initialBalance) : '')
  const [nameError, setNameError] = useState('')
  const [balanceError, setBalanceError] = useState('')

  const save = () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setNameError('Informe um nome com pelo menos 2 caracteres')
      return
    }
    const initialBalance = balance.trim() === '' ? 0 : parseAmount(balance)
    if (!Number.isFinite(initialBalance)) {
      setBalanceError('Saldo inicial inválido')
      return
    }
    if (initialBalance < 0) {
      setBalanceError('Saldo inicial não pode ser negativo')
      return
    }

    const payload: Wallet = {
      id: wallet?.id ?? crypto.randomUUID(),
      name: trimmed,
      color,
      initialBalance,
    }

    dispatch({ type: isEditing ? 'wallet/update' : 'wallet/add', wallet: payload })
    toast.success(isEditing ? 'Carteira atualizada' : 'Carteira criada', {
      description: payload.name,
    })
    onOpenChange(false)
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display text-[19px] tracking-[-0.03em]">
          {isEditing ? 'Editar carteira' : 'Nova carteira'}
        </DialogTitle>
        <DialogDescription>
          Carteiras separam de onde o dinheiro sai: contas e dinheiro.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="wallet-name">Nome</Label>
          <Input
            id="wallet-name"
            placeholder="Ex.: Nubank"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setNameError('')
            }}
            aria-invalid={Boolean(nameError)}
          />
          {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Cor</Label>
          <div className="flex flex-wrap gap-2">
            {WALLET_COLORS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-label={`Cor ${item.label}`}
                aria-pressed={color === item.key}
                onClick={() => setColor(item.key)}
                className={`flex size-[38px] items-center justify-center rounded-md border transition-colors ${
                  color === item.key
                    ? 'border-foreground'
                    : 'border-border hover:border-foreground/40'
                }`}
              >
                <span className={`size-4 rounded-full ${walletDotClass(item.key)}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="wallet-balance">Saldo inicial</Label>
          <Input
            id="wallet-balance"
            inputMode="decimal"
            placeholder="0,00"
            className="font-mono"
            value={balance}
            onChange={(event) => {
              setBalance(event.target.value)
              setBalanceError('')
            }}
            aria-invalid={Boolean(balanceError)}
          />
          {balanceError ? <p className="text-xs text-destructive">{balanceError}</p> : null}
          <p className="text-xs text-muted-foreground">
            Saldo de quando a carteira foi criada.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" onClick={save}>
          {isEditing ? 'Salvar alterações' : 'Criar carteira'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
