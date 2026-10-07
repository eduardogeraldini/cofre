import type { AppState, Category, TxType } from '@/types'

interface CategorySeed {
  name: string
  type: TxType
  icon: string
}

const expenseSeeds: CategorySeed[] = [
  { name: 'Moradia', type: 'expense', icon: 'house' },
  { name: 'Alimentação', type: 'expense', icon: 'shopping-cart' },
  { name: 'Transporte', type: 'expense', icon: 'car' },
  { name: 'Saúde', type: 'expense', icon: 'heart-pulse' },
  { name: 'Lazer', type: 'expense', icon: 'ticket' },
  { name: 'Educação', type: 'expense', icon: 'graduation-cap' },
  { name: 'Assinaturas', type: 'expense', icon: 'monitor-play' },
  { name: 'Compras', type: 'expense', icon: 'package' },
  { name: 'Outros', type: 'expense', icon: 'shapes' },
]

const incomeSeeds: CategorySeed[] = [
  { name: 'Salário', type: 'income', icon: 'briefcase' },
  { name: 'Freelance', type: 'income', icon: 'laptop' },
  { name: 'Investimentos', type: 'income', icon: 'trending-up' },
]

export function defaultCategories(): Category[] {
  return [...expenseSeeds, ...incomeSeeds].map((seed) => ({
    id: crypto.randomUUID(),
    name: seed.name,
    type: seed.type,
    icon: seed.icon,
  }))
}

export function createOnboardingState(): AppState {
  return {
    version: 1,
    categories: defaultCategories(),
    wallets: [{ id: crypto.randomUUID(), name: 'Caixa', color: 'indigo', initialBalance: 0 }],
    transfers: [],
    transactions: [],
    budgets: {},
    settings: {
      privacyMode: false,
      compactValues: true,
    },
  }
}
