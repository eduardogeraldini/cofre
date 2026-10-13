import { useState } from 'react'
import { CreditCard, Landmark } from 'lucide-react'
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
import { SegmentedControl } from '@/components/segmented-control'
import { parseAmount, toAmountInput } from '@/lib/money'
import { WALLET_COLORS, walletDotClass } from '@/lib/wallet-colors'
import { useBudget } from '@/store/budget-context'
import type { Wallet, WalletKind } from '@/types'

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
  const [kind, setKind] = useState<WalletKind>(wallet?.kind ?? 'account')
  const [color, setColor] = useState(wallet?.color ?? WALLET_COLORS[0].key)
  const [balance, setBalance] = useState(wallet ? toAmountInput(wallet.initialBalance) : '')
  const [closingDay, setClosingDay] = useState(
    wallet?.closingDay != null ? String(wallet.closingDay) : '',
  )
  const [dueDay, setDueDay] = useState(wallet?.dueDay != null ? String(wallet.dueDay) : '')
  const [nameError, setNameError] = useState('')
  const [balanceError, setBalanceError] = useState('')
  const [closingError, setClosingError] = useState('')
  const [dueError, setDueError] = useState('')

  const parseDay = (raw: string): number | null | undefined => {
    const trimmed = raw.trim()
    if (trimmed === '') return null
    const value = Number(trimmed)
    if (!Number.isInteger(value) || value < 1 || value > 28) return undefined
    return value
  }

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
    const closing = kind === 'card' ? parseDay(closingDay) : null
    if (closing === undefined) {
      setClosingError('Use um dia de 1 a 28, ou deixe em branco')
      return
    }
    const due = kind === 'card' ? parseDay(dueDay) : null
    if (due === undefined) {
      setDueError('Use um dia de 1 a 28, ou deixe em branco')
      return
    }

    const payload: Wallet = {
      id: wallet?.id ?? crypto.randomUUID(),
      name: trimmed,
      kind,
      color,
      closingDay: closing ?? null,
      dueDay: due ?? null,
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
          Contas e dinheiro físico, ou cartões de crédito com fatura.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Tipo</Label>
          <SegmentedControl
            label="Tipo de carteira"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'account', label: 'Conta', icon: Landmark },
              { value: 'card', label: 'Cartão de Crédito', icon: CreditCard },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            {kind === 'card'
              ? 'Compras no cartão viram fatura em aberto até o pagamento.'
              : 'Dinheiro que sai na hora: banco, Pix e caixa.'}
          </p>
        </div>

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
            Saldo de quando a carteira foi criada. Negativo representa uma dívida em aberto.
          </p>
        </div>

        {kind === 'card' ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wallet-closing">Dia do fechamento</Label>
              <Input
                id="wallet-closing"
                inputMode="numeric"
                placeholder="—"
                className="font-mono"
                value={closingDay}
                onChange={(event) => {
                  setClosingDay(event.target.value)
                  setClosingError('')
                }}
                aria-invalid={Boolean(closingError)}
              />
              {closingError ? <p className="text-xs text-destructive">{closingError}</p> : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wallet-due">Dia do vencimento</Label>
              <Input
                id="wallet-due"
                inputMode="numeric"
                placeholder="—"
                className="font-mono"
                value={dueDay}
                onChange={(event) => {
                  setDueDay(event.target.value)
                  setDueError('')
                }}
                aria-invalid={Boolean(dueError)}
              />
              {dueError ? <p className="text-xs text-destructive">{dueError}</p> : null}
            </div>
            <p className="col-span-2 text-xs text-muted-foreground">
              De 1 a 28, opcionais. Definem o período da fatura e mostram quando ela vence.
            </p>
          </div>
        ) : null}
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
