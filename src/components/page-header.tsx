import type { ReactNode } from 'react'

interface PageHeaderProps {
  overline?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ overline, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        {overline ? <p className="text-overline">{overline}</p> : null}
        <h1 className="text-section">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-[15px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
