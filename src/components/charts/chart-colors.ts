export function rampColor(index: number, total: number): string {
  const t = total <= 1 ? 1 : index / (total - 1)
  const mix = Math.round(96 - t * 64)
  return `color-mix(in oklch, var(--foreground) ${mix}%, var(--background))`
}
