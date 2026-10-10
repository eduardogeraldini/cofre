import { useMemo, useState } from 'react'
import { Plus, Shapes, Target } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { BudgetRow } from '@/components/budget-row'
import { CategoryFormDialog } from '@/components/category-form-dialog'
import { EmptyState } from '@/components/empty-state'
import { Money } from '@/components/money'
import { PageHeader } from '@/components/page-header'
import { budgetUsage, categorySummaries } from '@/lib/selectors'
import { monthKeyOf } from '@/lib/format'
import { useBudget } from '@/store/budget-context'
import type { Category } from '@/types'

const GRID_COLS =
  'hidden sm:grid sm:grid-cols-[minmax(0,1fr)_150px_110px_120px_72px] sm:gap-x-4 sm:items-center'

export function BudgetsPage() {
  const { state, dispatch } = useBudget()
  const [current] = useState(() => monthKeyOf(new Date()))

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [categoryTarget, setCategoryTarget] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

  const summaries = categorySummaries(state, current)
  const incomeCategories = state.categories.filter((category) => category.type === 'income')
  const usage = budgetUsage(state, current)
  const withLimit = summaries.filter((item) => item.limit > 0).length

  const usageTone =
    usage.ratio >= 100 ? 'bg-destructive' : usage.ratio >= 80 ? 'bg-warning' : 'bg-success'

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of state.transactions) {
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + 1)
    }
    return map
  }, [state.transactions])

  const openNewCategory = () => {
    setCategoryTarget(null)
    setCategoryDialogOpen(true)
  }

  const removeCategory = () => {
    if (!categoryToDelete) return
    dispatch({ type: 'category/delete', id: categoryToDelete.id })
    setCategoryToDelete(null)
  }

  const goToLimits = () => {
    document.getElementById('lista-limites')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => {
      document
        .querySelector<HTMLInputElement>('#lista-limites input')
        ?.focus({ preventScroll: true })
    }, 500)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        overline="Planejamento"
        title="Orçamentos"
        description="Quanto cada categoria pode gastar no mês."
        actions={
          <Button onClick={openNewCategory}>
            <Plus />
            Nova categoria
          </Button>
        }
      />

      <Card className="gap-0">
        <CardContent className="pt-6 pb-6">
          {usage.limit > 0 ? (
            <>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-overline">Limite disponível</p>
                  <Money
                    value={usage.remaining}
                    className="mt-2 block font-display text-headline font-bold tracking-[-0.04em]"
                  />
                  <p className="mt-2 text-sm text-muted-foreground">
                    <Money value={usage.spent} /> gastos de <Money value={usage.limit} />{' '}
                    planejados
                  </p>
                </div>

                <div>
                  <p className="text-overline">Com limite</p>
                  <p className="mt-1 font-display text-2xl font-bold tracking-[-0.03em] tabular-nums">
                    {withLimit}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      de {summaries.length}
                    </span>
                  </p>
                </div>
              </div>

              <Progress
                value={Math.min(usage.ratio, 100)}
                className="mt-6 h-2.5"
                indicatorClassName={usageTone}
              />
            </>
          ) : (
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="text-overline">Resumo do mês</p>
                <p className="mt-2 text-section">Nenhum limite definido</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Defina limites nas categorias abaixo para acompanhar os gastos do mês.
                </p>
              </div>
              <Button onClick={goToLimits} className="shrink-0">
                <Target />
                Definir limites
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <section id="lista-limites" className="flex flex-col gap-4 scroll-mt-24">
        <h2 className="text-subhead">Categorias</h2>

        {summaries.length + incomeCategories.length === 0 ? (
          <EmptyState
            icon={<Shapes className="size-6" />}
            title="Nenhuma categoria"
            description="Crie categorias para começar a definir limites."
            action={
              <Button onClick={openNewCategory}>
                <Plus />
                Nova categoria
              </Button>
            }
          />
        ) : (
          <Card className="gap-0">
            <CardContent className="px-0">
              <div className={`${GRID_COLS} px-5 pt-5 pb-2 text-overline`}>
                <span>Categoria</span>
                <span>Limite mensal</span>
                <span className="text-right">Gasto</span>
                <span className="text-right">Restante</span>
                <span className="sr-only">Ações</span>
              </div>

              <ul className="divide-y divide-border">
                {summaries.map((summary) => (
                  <BudgetRow
                    key={summary.category.id}
                    category={summary.category}
                    count={counts.get(summary.category.id) ?? 0}
                    summary={summary}
                    onCommitLimit={(limit) =>
                      dispatch({ type: 'budget/set', categoryId: summary.category.id, limit })
                    }
                    onEdit={() => {
                      setCategoryTarget(summary.category)
                      setCategoryDialogOpen(true)
                    }}
                    onDelete={() => setCategoryToDelete(summary.category)}
                  />
                ))}
                {incomeCategories.map((category) => (
                  <BudgetRow
                    key={category.id}
                    category={category}
                    count={counts.get(category.id) ?? 0}
                    summary={null}
                    onCommitLimit={() => undefined}
                    onEdit={() => {
                      setCategoryTarget(category)
                      setCategoryDialogOpen(true)
                    }}
                    onDelete={() => setCategoryToDelete(category)}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      <CategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={categoryTarget}
      />

      <AlertDialog
        open={Boolean(categoryToDelete)}
        onOpenChange={(open) => {
          if (!open) setCategoryToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              “{categoryToDelete?.name}” e todas as transações vinculadas serão removidas. Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={removeCategory}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
