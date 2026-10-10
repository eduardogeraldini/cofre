import type { AppState } from '@/types'

const SNAPSHOT_KEY = 'cofre:state-snapshot'

export function readStateSnapshot(): AppState | null {
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AppState> | null
    if (
      !parsed ||
      !Array.isArray(parsed.categories) ||
      !Array.isArray(parsed.transactions) ||
      typeof parsed.budgets !== 'object' ||
      parsed.budgets === null
    ) {
      return null
    }
    return {
      ...parsed,
      wallets: Array.isArray(parsed.wallets) ? parsed.wallets : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      transfers: Array.isArray(parsed.transfers) ? parsed.transfers : [],
    } as AppState
  } catch {
    return null
  }
}

export function writeStateSnapshot(state: AppState): void {
  try {
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(state))
  } catch {
    // modo privado / cota cheia — segue sem snapshot
  }
}
