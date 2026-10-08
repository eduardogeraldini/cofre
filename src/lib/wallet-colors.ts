export interface WalletColor {
  key: string
  label: string
  dot: string
  hex: string
}

export const WALLET_COLORS: WalletColor[] = [
  { key: 'indigo', label: 'Índigo', dot: 'bg-indigo-500', hex: '#6366f1' },
  { key: 'emerald', label: 'Esmeralda', dot: 'bg-emerald-500', hex: '#10b981' },
  { key: 'amber', label: 'Âmbar', dot: 'bg-amber-500', hex: '#f59e0b' },
  { key: 'rose', label: 'Rosa', dot: 'bg-rose-500', hex: '#f43f5e' },
  { key: 'sky', label: 'Azul', dot: 'bg-sky-500', hex: '#0ea5e9' },
  { key: 'violet', label: 'Violeta', dot: 'bg-violet-500', hex: '#8b5cf6' },
]

export function walletDotClass(color: string): string {
  return WALLET_COLORS.find((item) => item.key === color)?.dot ?? 'bg-indigo-500'
}

export function walletHex(color: string): string {
  return WALLET_COLORS.find((item) => item.key === color)?.hex ?? '#6366f1'
}
