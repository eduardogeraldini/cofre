import { useEffect, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SegmentedControl } from '@/components/segmented-control'
import { parseAmount, toAmountInput } from '@/lib/money'
import { toISODate } from '@/lib/format'
import { useBudget } from '@/store/budget-store'
import type { Transaction, TxType } from '@/types'

const schema = z
  .object({
    type: z.enum(['income', 'expense']),
    amount: z.string().min(1, 'Informe o valor'),
    categoryId: z.string().min(1, 'Selecione uma categoria'),
    date: z.string().min(1, 'Selecione a data'),
    note: z.string().max(80, 'Máximo de 80 caracteres'),
  })
  .superRefine((values, context) => {
    if (parseAmount(values.amount) <= 0) {
      context.addIssue({
        code: 'custom',
        path: ['amount'],
        message: 'Informe um valor maior que zero',
      })
    }
  })

type FormValues = z.infer<typeof schema>

interface TransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: Transaction | null
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionFormDialogProps) {
  const { state, dispatch } = useBudget()
  const isEditing = Boolean(transaction)

  const categories = useMemo(
    () => state.categories.filter((category) => category.type === 'expense'),
    [state.categories],
  )

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'expense',
      amount: '',
      categoryId: categories[0]?.id ?? '',
      date: toISODate(new Date()),
      note: '',
    },
  })

  const type = watch('type')
  const options = useMemo(
    () => state.categories.filter((category) => category.type === type),
    [state.categories, type],
  )

  useEffect(() => {
    if (!open) return
    reset(
      transaction
        ? {
            type: transaction.type,
            amount: toAmountInput(transaction.amount),
            categoryId: transaction.categoryId,
            date: transaction.date,
            note: transaction.note,
          }
        : {
            type: 'expense',
            amount: '',
            categoryId: categories[0]?.id ?? '',
            date: toISODate(new Date()),
            note: '',
          },
    )
  }, [open, transaction, reset, categories])

  const onSubmit = (values: FormValues) => {
    const payload: Transaction = {
      id: transaction?.id ?? crypto.randomUUID(),
      type: values.type,
      amount: Math.round(parseAmount(values.amount) * 100) / 100,
      categoryId: values.categoryId,
      date: values.date,
      note: values.note.trim(),
    }

    dispatch({
      type: isEditing ? 'transaction/update' : 'transaction/add',
      transaction: payload,
    })

    toast.success(isEditing ? 'Transação atualizada' : 'Transação registrada', {
      description: payload.note || 'Sem descrição',
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-[19px] tracking-[-0.03em]">
            {isEditing ? 'Editar transação' : 'Nova transação'}
          </DialogTitle>
          <DialogDescription>
            Registre uma entrada ou saída para manter o orçamento em dia.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <SegmentedControl<TxType>
                  label="Tipo da transação"
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value)
                    const first = state.categories.find((category) => category.type === value)
                    if (first) {
                      reset({ ...watch(), categoryId: first.id, type: value })
                    }
                  }}
                  options={[
                    { value: 'expense', label: 'Despesa', icon: ArrowDownRight },
                    { value: 'income', label: 'Receita', icon: ArrowUpRight },
                  ]}
                />
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Valor</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <Input
                    id="amount"
                    inputMode="decimal"
                    placeholder="0,00"
                    className="font-mono"
                    aria-invalid={Boolean(errors.amount)}
                    {...field}
                  />
                )}
              />
              {errors.amount ? (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Data</Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <Input id="date" type="date" aria-invalid={Boolean(errors.date)} {...field} />
                )}
              />
              {errors.date ? (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Categoria</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId ? (
              <p className="text-xs text-destructive">{errors.categoryId.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Descrição</Label>
            <Controller
              control={control}
              name="note"
              render={({ field }) => (
                <Input
                  id="note"
                  placeholder="Ex.: Supermercado da semana"
                  aria-invalid={Boolean(errors.note)}
                  {...field}
                />
              )}
            />
            {errors.note ? <p className="text-xs text-destructive">{errors.note.message}</p> : null}
          </div>

          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEditing ? 'Salvar alterações' : 'Adicionar transação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
