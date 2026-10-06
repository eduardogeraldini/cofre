export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, '')
  if (!cleaned) return 0
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned
  const value = Number(normalized)
  return Number.isFinite(value) ? value : 0
}

export function toAmountInput(value: number): string {
  return value.toFixed(2).replace('.', ',')
}
