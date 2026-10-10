import { createContext, useContext } from 'react'

export interface CommandContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

export const CommandContext = createContext<CommandContextValue | null>(null)

export function useCommand(): CommandContextValue {
  const context = useContext(CommandContext)
  if (!context) throw new Error('useCommand must be used within CommandProvider')
  return context
}
