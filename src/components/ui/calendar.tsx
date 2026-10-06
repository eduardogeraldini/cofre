import * as React from "react"
import { ptBR } from "date-fns/locale"
import { cn } from "cn"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: cn("relative flex flex-col", defaultClassNames.months),
        month_caption: cn(
          "flex h-9 items-center justify-center",
          defaultClassNames.month_caption,
        ),
        caption_label: cn("text-sm font-medium", defaultClassNames.caption_label),
        nav: cn(
          "absolute inset-x-0 top-0 flex items-center justify-between px-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          "flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-opacity hover:bg-muted hover:opacity-100 disabled:opacity-30",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          "flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-opacity hover:bg-muted hover:opacity-100 disabled:opacity-30",
          defaultClassNames.button_next,
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex size-9 items-center justify-center text-xs font-normal text-muted-foreground",
          defaultClassNames.weekday,
        ),
        week: cn("mt-1 flex w-full", defaultClassNames.week),
        day: cn("relative size-9 p-0 text-center", defaultClassNames.day),
        day_button: cn(
          "flex size-9 items-center justify-center rounded-md text-sm font-normal outline-none",
          defaultClassNames.day_button,
        ),
        outside: cn("text-muted-foreground opacity-50", defaultClassNames.outside),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{ DayButton: CalendarDayButton }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const isSelected = modifiers.selected
  const isToday = modifiers.today

  return (
    <DayButton
      day={day}
      modifiers={modifiers}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "size-9 p-0 font-normal",
        isSelected &&
          "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:bg-primary-hover",
        !isSelected && isToday && "bg-accent text-accent-foreground",
        !isSelected && !isToday && "hover:bg-muted",
        className,
      )}
      {...props}
    />
  )
}

export { Calendar }
