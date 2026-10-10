import { useMemo, useState } from 'react'
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
import { CategoryIcon } from '@/components/category-icon'
import { categoryIconKeys } from '@/components/category-icons'
import { SegmentedControl } from '@/components/segmented-control'
import { useBudget } from '@/store/budget-context'
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <CategoryFormFields
          key={category?.id ?? 'new'}
          category={category}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  )
}

function CategoryFormFields({
  category,
  onOpenChange,
}: {
  category?: Category | null
  onOpenChange: (open: boolean) => void
}) {
  const { state, dispatch } = useBudget()
  const isEditing = Boolean(category)

  const [name, setName] = useState(category?.name ?? '')
  const [type, setType] = useState<TxType>(category?.type ?? 'expense')
  const [icon, setIcon] = useState(category?.icon ?? 'shapes')
  const [error, setError] = useState('')

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
    <>
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
    </>
  )
}
