import type { Category, Transaction, TxType } from '@/types'

export interface OfxEntry {
  date: string
  amount: number
  type: TxType
  note: string
  fitid: string
}

export function decodeOfx(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('windows-1252').decode(buffer)
  }
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}>([^<]*)`, 'i'))
  return match ? match[1].trim() : ''
}

function parseDate(raw: string): string | null {
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!match) return null
  const [, year, month, day] = match
  const iso = `${year}-${month}-${day}`
  const probe = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(probe.getTime())) return null
  return iso
}

export function parseOfx(text: string): OfxEntry[] {
  const clean = text.replace(/^\uFEFF/, '')
  if (!/<STMTTRN/i.test(clean)) return []

  const entries: OfxEntry[] = []
  const blockRe = /<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|<\/STMTRS>|$)/gi
  let match: RegExpExecArray | null

  while ((match = blockRe.exec(clean)) !== null) {
    const block = match[1]
    const date = parseDate(tag(block, 'DTPOSTED'))
    const value = Number(tag(block, 'TRNAMT'))
    if (!date || !Number.isFinite(value) || value === 0) continue

    const name = tag(block, 'NAME')
    const memo = tag(block, 'MEMO')
    let note = name || memo || 'Lançamento'
    if (name && memo && !memo.includes(name)) note = `${name} · ${memo}`

    entries.push({
      date,
      amount: Math.round(Math.abs(value) * 100) / 100,
      type: value < 0 ? 'expense' : 'income',
      note: note.slice(0, 80),
      fitid: tag(block, 'FITID'),
    })
  }

  return entries
}

export function guessCategory(
  description: string,
  categories: Category[],
): string | null {
  const haystack = description.toLowerCase()
  for (const category of categories) {
    const needle = category.name.trim().toLowerCase()
    if (needle.length >= 3 && haystack.includes(needle)) return category.id
  }
  return null
}

export function isDuplicateOfExisting(entry: OfxEntry, existing: Transaction[]): boolean {
  const note = entry.note.trim().toLowerCase()
  return existing.some(
    (tx) =>
      tx.date === entry.date &&
      tx.amount === entry.amount &&
      tx.type === entry.type &&
      tx.note.trim().toLowerCase() === note,
  )
}
