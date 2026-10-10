import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/format'
import { decodeOfx, guessCategory, isDuplicateOfExisting, parseOfx } from '@/lib/ofx'
import type { OfxEntry } from '@/lib/ofx'
import { useBudget } from '@/store/budget-context'
import type { Transaction } from '@/types'

interface ReviewRow {
  entry: OfxEntry
  selected: boolean
  categoryId: string
  duplicate: boolean
}

const NONE = 'none'

interface OfxImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OfxImportDialog({ open, onOpenChange }: OfxImportDialogProps) {
  const { state, dispatch } = useBudget()
  const [step, setStep] = useState<'file' | 'review'>('file')
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [walletId, setWalletId] = useState(NONE)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const reset = () => {
    setStep('file')
    setRows([])
    setFileName('')
    setError(null)
    setWalletId(NONE)
    setDragging(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)

    let entries: OfxEntry[] = []
    try {
      entries = parseOfx(decodeOfx(await file.arrayBuffer()))
    } catch {
      setError('Não foi possível ler o arquivo.')
      return
    }

    if (entries.length === 0) {
      setError('Nenhum lançamento encontrado. Escolha um arquivo OFX válido.')
      return
    }

    const next: ReviewRow[] = entries.map((entry) => {
      const options = state.categories.filter((category) => category.type === entry.type)
      const duplicate = isDuplicateOfExisting(entry, state.transactions)
      const guessed = guessCategory(entry.note, options)
      return {
        entry,
        categoryId: guessed ?? options[0]?.id ?? '',
        selected: !duplicate,
        duplicate,
      }
    })

    setFileName(file.name)
    setRows(next)
    setWalletId(state.wallets[0]?.id ?? NONE)
    setStep('review')
  }

  const toggleRow = (index: number) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, selected: !row.selected } : row)),
    )
  }

  const toggleAll = () => {
    setRows((prev) => {
      const all = prev.every((row) => row.selected)
      return prev.map((row) => ({ ...row, selected: !all }))
    })
  }

  const setRowCategory = (index: number, categoryId: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, categoryId } : row)))
  }

  const selectedRows = rows.filter((row) => row.selected)
  const allSelected = rows.length > 0 && rows.every((row) => row.selected)
  const canImport =
    selectedRows.length > 0 && selectedRows.every((row) => row.categoryId !== '')
  const incomeTotal = selectedRows
    .filter((row) => row.entry.type === 'income')
    .reduce((sum, row) => sum + row.entry.amount, 0)
  const expenseTotal = selectedRows
    .filter((row) => row.entry.type === 'expense')
    .reduce((sum, row) => sum + row.entry.amount, 0)

  const handleImport = () => {
    const payload: Transaction[] = selectedRows.map((row) => ({
      id: crypto.randomUUID(),
      type: row.entry.type,
      amount: row.entry.amount,
      categoryId: row.categoryId,
      walletId: walletId === NONE ? null : walletId,
      date: row.entry.date,
      note: row.entry.note,
    }))

    dispatch({ type: 'transaction/import', transactions: payload })

    const skipped = rows.length - payload.length
    toast.success(
      payload.length === 1 ? '1 transação importada' : `${payload.length} transações importadas`,
      { description: skipped > 0 ? `${skipped} ignoradas` : fileName },
    )
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-[19px] tracking-[-0.03em]">
            Importar OFX
          </DialogTitle>
          <DialogDescription>
            {step === 'file'
              ? 'Escolha o arquivo exportado pelo seu banco. Nada é enviado para fora do navegador.'
              : `${fileName} · ${rows.length} lançamentos`}
          </DialogDescription>
        </DialogHeader>

        {step === 'file' ? (
          <div className="flex min-w-0 flex-col gap-3">
            <div
              className={`flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center transition-colors ${
                dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/40'
              }`}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                setDragging(false)
              }}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                void handleFile(event.dataTransfer.files?.[0])
              }}
            >
              <FileUp className="size-6 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">
                  {dragging ? 'Solte o arquivo aqui' : 'Arraste o arquivo ou clique para escolher'}
                </p>
                <p className="text-xs text-muted-foreground">Arquivos .ofx ou .qfx</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".ofx,.qfx"
                className="sr-only"
                aria-label="Arquivo OFX"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                Escolher arquivo
              </Button>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Selecionar todas"
                />
                <span className="text-sm">
                  {selectedRows.length} de {rows.length} selecionados
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="ofx-wallet" className="text-sm text-muted-foreground">
                  Carteira
                </Label>
                <Select value={walletId} onValueChange={setWalletId}>
                  <SelectTrigger id="ofx-wallet" className="w-44" aria-label="Carteira da importação">
                    <SelectValue placeholder="Selecionar carteira" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem carteira</SelectItem>
                    {state.wallets.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-border">
              <ul className="divide-y divide-border">
                {rows.map((row, index) => (
                  <li
                    key={`${row.entry.date}-${index}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5"
                  >
                    <Checkbox
                      checked={row.selected}
                      onCheckedChange={() => toggleRow(index)}
                      aria-label={`Selecionar ${row.entry.note}`}
                      className="shrink-0"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">{row.entry.note}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {formatDate(row.entry.date)}
                        {row.duplicate ? (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 text-[10px] text-amber-600"
                          >
                            Duplicata
                          </Badge>
                        ) : null}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 text-sm tabular-nums ${
                        row.entry.type === 'income' ? 'text-emerald-600' : ''
                      }`}
                    >
                      {row.entry.type === 'income' ? '+' : '−'}
                      {formatCurrency(row.entry.amount)}
                    </span>
                    <Select
                      value={row.categoryId}
                      onValueChange={(value) => setRowCategory(index, value)}
                    >
                      <SelectTrigger
                        className="ml-7 w-[calc(100%-1.75rem)] sm:ml-0 sm:w-32 sm:shrink-0"
                        aria-label={`Categoria de ${row.entry.note}`}
                      >
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {state.categories
                          .filter((category) => category.type === row.entry.type)
                          .map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              {formatCurrency(incomeTotal)} em entradas · {formatCurrency(expenseTotal)} em saídas
            </p>
          </div>
        )}

        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {step === 'review' ? 'Cancelar' : 'Fechar'}
          </Button>
          {step === 'review' ? (
            <Button type="button" onClick={handleImport} disabled={!canImport}>
              Importar {selectedRows.length}{' '}
              {selectedRows.length === 1 ? 'transação' : 'transações'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
