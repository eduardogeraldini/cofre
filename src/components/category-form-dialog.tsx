import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CategoryIcon, categoryIconKeys } from '@/components/category-icon'
import { SegmentedControl } from '@/components/segmented-control'
import { useBudget } from '@/store/budget-store'
import type { Category, TxType } from '@/types'

const iconKeys = categoryIconKeys()

const iconLabel = (key: string) =>
  key
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category | null
}

export function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  const { state, dispatch } = useBudget()
  const isEditing = Boolean(category)

  const [name, setName] = useState('')
  const [type, setType] = useState<TxType>('expense')
  const [icon, setIcon] = useState(iconKeys[0])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(category?.name ?? '')
    setType(category?.type ?? 'expense')
    setIcon(category?.icon ?? 'shapes')
    setError('')
  }, [open, category])

  const existingCount = useMemo(
    () => state.categories.filter((item) => item.type === type).length,
    [state.categories, type],
  )

  const save = () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Informe um nome com pelo menos 2 caracteres')
      return
    }

    const payload: Category = {
      id: category?.id ?? crypto.randomUUID(),
      name: trimmed,
      type,
      icon,
    }

    dispatch({
      type: isEditing ? 'category/update' : 'category/add',
      category: payload,
    })

    toast.success(isEditing ? 'Categoria atualizada' : 'Categoria criada', {
      description: payload.name,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-[19px] tracking-[-0.03em]">
            {isEditing ? 'Editar categoria' : 'Nova categoria'}
          </DialogTitle>
          <DialogDescription>
            Categorias organizam suas transações e sustentam os limites do orçamento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <SegmentedControl<TxType>
              label="Tipo da categoria"
              value={type}
              onChange={setType}
              options={[
                { value: 'expense', label: 'Despesa', icon: ArrowDownRight },
                { value: 'income', label: 'Receita', icon: ArrowUpRight },
              ]}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category-name">Nome</Label>
            <Input
              id="category-name"
              placeholder="Ex.: Pets"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError('')
              }}
              aria-invalid={Boolean(error)}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Ícone</Label>
            <div className="flex items-center gap-2">
              <span className="flex size-[38px] shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                <CategoryIcon name={icon} className="size-4" />
              </span>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha um ícone" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {iconKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      {iconLabel(key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {existingCount} {type === 'expense' ? 'categorias de despesa' : 'categorias de receita'}{' '}
              neste orçamento.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={save}>
            {isEditing ? 'Salvar alterações' : 'Criar categoria'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
