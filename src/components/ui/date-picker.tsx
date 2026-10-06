import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "cn"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  className?: string
  id?: string
  "aria-invalid"?: boolean
}

function DatePicker({ value, onChange, className, id, ...props }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          aria-invalid={props["aria-invalid"]}
          className={cn(
            "h-[38px] w-full justify-start gap-2 px-3.5 font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon />
          {value ? format(value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date)
            if (date) setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
