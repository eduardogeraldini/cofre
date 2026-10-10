import { useEffect, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { parseISO } from 'date-fns'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
    walletId: z.string(),
    projectId: z.string(),
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

  const walletOptions = useMemo(() => state.wallets, [state.wallets])
  const projects = useMemo(() => state.projects, [state.projects])

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
      walletId: transaction?.walletId ?? walletOptions[0]?.id ?? '',
      projectId: transaction?.projectId ?? '',
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
            walletId: transaction.walletId ?? '',
            projectId: transaction.projectId ?? '',
            date: transaction.date,
            note: transaction.note,
          }
        : {
            type: 'expense',
            amount: '',
            categoryId: categories[0]?.id ?? '',
            walletId: walletOptions[0]?.id ?? '',
            projectId: '',
            date: toISODate(new Date()),
            note: '',
          },
    )
  }, [open, transaction, reset, categories, walletOptions])

  const onSubmit = (values: FormValues) => {
    const payload: Transaction = {
      id: transaction?.id ?? crypto.randomUUID(),
      type: values.type,
      amount: Math.round(parseAmount(values.amount) * 100) / 100,
      categoryId: values.categoryId,
      walletId: values.walletId || null,
      projectId: values.projectId || null,
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
                  <DatePicker
                    id="date"
                    value={field.value ? parseISO(field.value) : undefined}
                    onChange={(date) => {
                      if (date) field.onChange(toISODate(date))
                    }}
                    aria-invalid={Boolean(errors.date)}
                  />
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
            <Label>Carteira</Label>
            <Controller
              control={control}
              name="walletId"
              render={({ field }) => (
                <Select
                  value={field.value || 'none'}
                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                >
                  <SelectTrigger className="w-full" aria-label="Carteira">
                    <SelectValue placeholder="Carteira" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem carteira</SelectItem>
                    {walletOptions.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
            {errors.note ? (
              <p className="text-xs text-destructive">{errors.note.message}</p>
            ) : null}
          </div>

          <div
            className={`-mx-4 -mb-4 flex flex-col gap-2 rounded-b-lg border-t bg-muted/50 p-4 sm:flex-row sm:flex-wrap sm:items-center ${
              projects.length > 0 ? 'sm:justify-between' : 'sm:justify-end'
            }`}
          >
            {projects.length > 0 ? (
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  >
                    <SelectTrigger
                      size="sm"
                      className={
                        field.value
                          ? 'w-full justify-start font-normal sm:w-44'
                          : 'w-full justify-start border-dashed font-normal text-muted-foreground sm:w-44'
                      }
                      aria-label="Projeto"
                    >
                      <SelectValue placeholder="Vincular a projeto…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum projeto</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            ) : null}
            <div className="flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isEditing ? 'Salvar alterações' : 'Adicionar transação'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
