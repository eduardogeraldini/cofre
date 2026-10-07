export interface WalletColor {
  key: string
  label: string
  dot: string
}

export const WALLET_COLORS: WalletColor[] = [
  { key: 'indigo', label: 'Índigo', dot: 'bg-indigo-500' },
  { key: 'emerald', label: 'Esmeralda', dot: 'bg-emerald-500' },
  { key: 'amber', label: 'Âmbar', dot: 'bg-amber-500' },
  { key: 'rose', label: 'Rosa', dot: 'bg-rose-500' },
  { key: 'sky', label: 'Azul', dot: 'bg-sky-500' },
  { key: 'violet', label: 'Violeta', dot: 'bg-violet-500' },
]

export function walletDotClass(color: string): string {
  return WALLET_COLORS.find((item) => item.key === color)?.dot ?? 'bg-indigo-500'
}
